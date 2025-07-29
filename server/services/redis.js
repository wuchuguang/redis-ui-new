const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

// 存储Redis连接实例
const redisConnections = new Map();

// 创建Redis连接
const createRedisConnection = async (connectionConfig) => {
  const { host, port, password, database = 0 } = connectionConfig;
  
  const redisClient = createClient({
    socket: {
      host,
      port: parseInt(port)
    },
    password: password || undefined,
    database: parseInt(database)
  });

  // 连接Redis
  await redisClient.connect();
  
  // 测试连接
  await redisClient.ping();
  
  return redisClient;
};

// 添加连接
const addConnection = async (connectionConfig) => {
  const connectionId = uuidv4();
  const config = {
    id: connectionId,
    ...connectionConfig,
    status: 'connecting'
  };

  try {
    const redisClient = await createRedisConnection(connectionConfig);
    
    config.status = 'connected';
    redisConnections.set(connectionId, {
      client: redisClient,
      config
    });

    console.log(`Redis连接成功: ${config.name} (${config.host}:${config.port})`);
    
    return config;
  } catch (error) {
    console.error('Redis连接失败:', error.message);
    throw error;
  }
};

// 添加临时连接（不保存到配置文件）
const addTempConnection = async (connectionConfig) => {
  // 所有ID都由后端分配，使用标准UUID
  const connectionId = uuidv4();
  const config = {
    id: connectionId,
    ...connectionConfig,
    status: 'connecting',
    isTemp: true
  };

  try {
    const redisClient = await createRedisConnection(connectionConfig);
    
    config.status = 'connected';
    redisConnections.set(connectionId, {
      client: redisClient,
      config
    });

    console.log(`临时Redis连接成功: ${config.name} (${config.host}:${config.port}) - ID: ${connectionId}`);
    
    return config;
  } catch (error) {
    console.error('临时Redis连接失败:', error.message);
    throw error;
  }
};

// 将临时连接转换为正式连接
const convertTempToFormalConnection = async (tempConnectionId, newConnectionConfig) => {
  const tempConnection = redisConnections.get(tempConnectionId);
  if (!tempConnection) {
    throw new Error('临时连接不存在');
  }

  // 直接更新连接配置，保持相同ID
  const formalConfig = {
    id: tempConnectionId,
    ...newConnectionConfig,
    status: 'connected',
    isTemp: false
  };

  // 更新连接配置
  redisConnections.set(tempConnectionId, {
    client: tempConnection.client,
    config: formalConfig
  });

  console.log(`临时连接已转换为正式连接: ${tempConnectionId}`);
  console.log('新连接配置:', formalConfig);
  console.log('Redis连接映射:', {
    id: tempConnectionId,
    host: formalConfig.host,
    port: formalConfig.port,
    database: formalConfig.database
  });
  
  return formalConfig;
};

// 更新连接
const updateConnection = async (id, connectionConfig) => {
  // 检查连接是否存在
  const existingConnection = redisConnections.get(id);
  if (!existingConnection) {
    throw new Error('连接不存在');
  }

  // 如果连接正在使用，先断开
  if (existingConnection.client && existingConnection.client.isReady) {
    await existingConnection.client.disconnect();
    redisConnections.delete(id);
  }

  const updatedConfig = {
    id,
    ...connectionConfig,
    status: 'connecting'
  };

  try {
    const redisClient = await createRedisConnection(connectionConfig);
    
    updatedConfig.status = 'connected';
    redisConnections.set(id, {
      client: redisClient,
      config: updatedConfig
    });

    console.log(`Redis连接更新成功: ${updatedConfig.name} (${updatedConfig.host}:${updatedConfig.port})`);
    
    return updatedConfig;
  } catch (error) {
    console.error('Redis连接更新失败:', error.message);
    throw error;
  }
};

// 获取连接
const getConnection = (id) => {
  return redisConnections.get(id);
};

// 根据ID获取连接
const getConnectionById = (connectionId) => {
  const connection = redisConnections.get(connectionId);
  if (!connection) {
    return null;
  }
  return connection;
};

// 获取所有连接
const getAllConnections = () => {
  return Array.from(redisConnections.values()).map(conn => conn.config);
};

// 获取用户的所有连接（包括未打开的）
const getUserAllConnections = (username) => {
  const userService = require('./user');
  
  try {
    // 获取用户存储的连接配置
    const userConnections = userService.getUserConnections(username);
    
    // 获取当前打开的连接
    const openConnections = Array.from(redisConnections.values()).map(conn => conn.config);
    
    // 合并连接列表，优先使用打开连接的状态
    const mergedConnections = userConnections.map(userConn => {
      // 查找是否有对应的打开连接
      const openConn = openConnections.find(open => open.id === userConn.id);
      if (openConn) {
        // 检查连接是否真正可用
        const connection = redisConnections.get(userConn.id);
        let status = openConn.status;
        
        if (connection && connection.client && connection.client.isReady) {
          // 尝试ping连接来验证状态
          try {
            // 这里不实际ping，只是检查连接状态
            status = 'connected';
          } catch (error) {
            status = 'disconnected';
          }
        } else {
          status = 'disconnected';
        }
        
        return {
          ...userConn,
          status: status
        };
      } else {
        // 使用用户存储的状态，但标记为未连接
        return {
          ...userConn,
          status: 'disconnected'
        };
      }
    });
    
    return mergedConnections;
  } catch (error) {
    console.error('获取用户连接失败:', error);
    return [];
  }
};

// 删除连接
const deleteConnection = async (id) => {
  const connection = redisConnections.get(id);
  
  if (connection) {
    // 关闭Redis连接
    await connection.client.quit();
    redisConnections.delete(id);
  }
  
  console.log(`Redis连接已删除: ${id}`);
  return true;
};

// 重新连接
const reconnectConnection = async (id, savedConfig) => {
  // 如果连接正在使用，先断开
  const activeConnection = redisConnections.get(id);
  if (activeConnection && activeConnection.client.isReady) {
    await activeConnection.client.disconnect();
    redisConnections.delete(id);
  }

  console.log(`尝试重新连接: ${savedConfig.name} (${savedConfig.host}:${savedConfig.port})`);

  try {
    const redisClient = await createRedisConnection(savedConfig);
    
    const updatedConfig = {
      ...savedConfig,
      status: 'connected'
    };

    redisConnections.set(id, {
      client: redisClient,
      config: updatedConfig
    });

    console.log(`✅ 重新连接成功: ${savedConfig.name}`);
    
    return updatedConfig;
  } catch (error) {
    console.error('重新连接失败:', error.message);
    throw error;
  }
};

// 测试连接
const testConnection = async (connectionConfig) => {
  const { host, port, password, database = 0 } = connectionConfig;
  
  const testClient = createClient({
    socket: {
      host,
      port: parseInt(port)
    },
    password: password || undefined,
    database: parseInt(database)
  });

  try {
    await testClient.connect();
    await testClient.ping();
    await testClient.quit();
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Ping连接
const pingConnection = async (connectionId) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  try {
    const result = await connection.client.ping();
    console.log(`Ping连接成功: ${connectionId}, 结果: ${result}`);
    return { pong: result };
  } catch (error) {
    console.error(`Ping连接失败: ${connectionId}`, error.message);
    throw new Error(`Ping失败: ${error.message}`);
  }
};

// 关闭连接
const closeConnection = async (connectionId) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  try {
    await connection.client.quit();
    redisConnections.delete(connectionId);
    
    console.log(`Redis连接已关闭: ${connectionId}`);
    return { closed: true, connectionId };
  } catch (error) {
    console.error(`关闭Redis连接失败: ${connectionId}`, error.message);
    throw new Error(`关闭连接失败: ${error.message}`);
  }
};

// 获取键列表
const getKeys = async (connectionId, database, pattern = '*', prefix, offset = 0, limit = 100) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));

  // 构建搜索模式
  let searchPattern = pattern;
  if (prefix) {
    searchPattern = `${prefix}:*`;
  }

  // 获取所有键
  const keys = await connection.client.keys(searchPattern);
  
  // 如果指定了前缀，直接返回该前缀的键列表（用于加载更多）
  if (prefix) {
    // 直接使用前缀模式获取键，这样更准确
    const prefixPattern = `${prefix}:*`;
    const prefixKeys = await connection.client.keys(prefixPattern);
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedKeys = prefixKeys.slice(startIndex, endIndex);
    
    console.log(`加载更多键 - 前缀: ${prefix}, 偏移: ${startIndex}, 限制: ${limit}, 总数: ${prefixKeys.length}, 返回: ${paginatedKeys.length}, 还有更多: ${endIndex < prefixKeys.length}`);
    
    return {
      keys: paginatedKeys.map(key => ({
        name: key,
        type: 'unknown'
      })),
      totalKeys: prefixKeys.length,
      hasMore: endIndex < prefixKeys.length,
      offset: startIndex,
      limit: parseInt(limit)
    };
  }
  
  // 按前缀分组
  const keyGroups = {};
  for (const key of keys) {
    const parts = key.split(':');
    const prefix = parts[0];
    
    if (!keyGroups[prefix]) {
      keyGroups[prefix] = [];
    }
    
    keyGroups[prefix].push({
      name: key,
      type: 'unknown' // 这里可以进一步获取键的类型
    });
  }

  // 转换为数组格式
  const groups = Object.entries(keyGroups).map(([prefix, keys]) => ({
    prefix,
    keys: keys.slice(0, parseInt(limit)), // 限制每组显示的键数
    count: keys.length,
    hasMore: keys.length > parseInt(limit)
  }));

  return {
    groups,
    totalKeys: keys.length
  };
};

// 获取键值
const getKeyValue = async (connectionId, database, keyName) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));

  // 检查键是否存在
  const exists = await connection.client.exists(keyName);
  if (!exists) {
    throw new Error('键不存在');
  }

  // 获取键的类型
  const type = await connection.client.type(keyName);
  
  // 根据类型获取值
  let value = null;
  let ttl = -1;
  
  try {
    ttl = await connection.client.ttl(keyName);
  } catch (error) {
    // TTL获取失败，使用默认值
  }

  switch (type) {
    case 'string':
      value = await connection.client.get(keyName);
      break;
    case 'hash':
      value = await connection.client.hGetAll(keyName);
      break;
    case 'list':
      value = await connection.client.lRange(keyName, 0, -1);
      break;
    case 'set':
      value = await connection.client.sMembers(keyName);
      break;
    case 'zset':
      value = await connection.client.zRangeWithScores(keyName, 0, -1);
      break;
    default:
      value = null;
  }

  return {
    key: keyName,
    type,
    value,
    ttl,
    size: type === 'string' ? (value ? value.length : 0) : 
          type === 'hash' ? Object.keys(value || {}).length :
          type === 'list' ? (value ? value.length : 0) :
          type === 'set' ? (value ? value.length : 0) :
          type === 'zset' ? (value ? value.length : 0) : 0
  };
};

// 重命名键
const renameKey = async (connectionId, database, oldKeyName, newKeyName) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));

  // 检查旧键是否存在
  const exists = await connection.client.exists(oldKeyName);
  if (!exists) {
    throw new Error('键不存在');
  }

  // 检查新键名是否已存在
  const newKeyExists = await connection.client.exists(newKeyName);
  if (newKeyExists) {
    throw new Error('新键名已存在');
  }

  // 重命名键
  await connection.client.rename(oldKeyName, newKeyName);

  console.log(`键重命名成功: ${oldKeyName} → ${newKeyName}`);
  
  return {
    oldKey: oldKeyName,
    newKey: newKeyName
  };
};

// 更新Hash字段
const updateHashField = async (connectionId, database, keyName, oldField, newField, value) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));
  
  // 如果字段名改变了，先删除原字段
  if (oldField !== newField) {
    await connection.client.hDel(keyName, oldField);
  }
  
  // 设置新字段
  await connection.client.hSet(keyName, newField, value);
  
  console.log(`Hash字段更新成功: ${keyName}.${newField}`);
  
  return true;
};

// 更新String值
const updateStringValue = async (connectionId, database, keyName, value) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));
  
  // 设置String值
  await connection.client.set(keyName, value);
  
  console.log(`String值更新成功: ${keyName}`);
  
  return true;
};

// 删除Hash字段
const deleteHashField = async (connectionId, database, keyName, field) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));
  
  // 删除字段
  const deleted = await connection.client.hDel(keyName, field);
  
  if (deleted === 0) {
    throw new Error('字段不存在');
  }
  
  console.log(`Hash字段删除成功: ${keyName}.${field}`);
  
  return true;
};

// 批量删除Hash字段
const batchDeleteHashFields = async (connectionId, database, keyName, fields) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));
  
  // 批量删除字段
  const deleted = await connection.client.hDel(keyName, ...fields);
  
  console.log(`批量删除Hash字段成功: ${keyName}, 删除 ${deleted} 个字段`);
  
  return deleted;
};

// 删除键组
const deleteKeyGroup = async (connectionId, database, prefix) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 切换到指定数据库
  await connection.client.select(parseInt(database));

  // 获取该前缀的所有键
  const keys = await connection.client.keys(`${prefix}:*`);
  
  if (keys.length === 0) {
    throw new Error('键组不存在');
  }

  // 删除所有键
  const pipeline = connection.client.multi();
  for (const key of keys) {
    pipeline.del(key);
  }
  await pipeline.exec();

  console.log(`删除键组: ${prefix} (${keys.length} 个键)`);
  
  return { deletedCount: keys.length };
};

// 获取Redis服务器信息
const getRedisInfo = async (connectionId) => {
  const connection = redisConnections.get(connectionId);
  if (!connection || !connection.client) {
    throw new Error('连接不存在或未连接');
  }

  // 获取Redis INFO命令的原始数据
  const infoRaw = await connection.client.info();
  
  // 解析INFO数据为结构化对象
  const infoObj = {};
  const lines = infoRaw.split('\r\n');
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value !== undefined) {
        infoObj[key] = value;
      }
    }
  }

  // 获取当前数据库的键数量
  const currentDbSize = await connection.client.dbSize();
  
  // 获取所有数据库的统计信息
  const dbStats = [];
  for (let i = 0; i <= 15; i++) {
    try {
      // 切换到指定数据库
      await connection.client.select(i);
      const dbSize = await connection.client.dbSize();
      
      // 获取数据库的过期键信息
      const info = await connection.client.info('keyspace');
      const keyspaceInfo = {};
      const keyspaceLines = info.split('\r\n');
      for (const line of keyspaceLines) {
        if (line.startsWith(`db${i}:`)) {
          const match = line.match(/keys=(\d+),expires=(\d+),avg_ttl=(\d+)/);
          if (match) {
            keyspaceInfo.keys = parseInt(match[1]);
            keyspaceInfo.expires = parseInt(match[2]);
            keyspaceInfo.avgTtl = parseInt(match[3]);
          }
        }
      }
      
      dbStats.push({
        db: `db${i}`,
        keys: keyspaceInfo.keys || dbSize,
        expires: keyspaceInfo.expires || 0,
        avgTtl: keyspaceInfo.avgTtl || 0
      });
    } catch (error) {
      // 如果某个数据库访问失败，仍然添加但键数为0
      dbStats.push({
        db: `db${i}`,
        keys: 0,
        expires: 0,
        avgTtl: 0
      });
    }
  }
  
  // 切换回原始数据库
  await connection.client.select(connection.config.database);
  
  return {
    redisInfo: infoObj,
    currentDbSize,
    dbStats,
    status: connection.client && connection.client.isReady ? 'connected' : 'disconnected'
  };
};

// 恢复保存的连接
const restoreConnections = async (savedConnections) => {
  console.log(`发现 ${savedConnections.length} 个保存的连接`);
  
  for (const savedConn of savedConnections) {
    try {
      console.log(`尝试恢复连接: ${savedConn.name} (${savedConn.host}:${savedConn.port})`);
      
      const redisClient = await createRedisConnection(savedConn);

      // 设置连接超时
      redisClient.on('error', (err) => {
        console.log(`Redis连接错误: ${savedConn.name} - ${err.message}`);
      });

      redisConnections.set(savedConn.id, {
        client: redisClient,
        config: { ...savedConn, status: 'connected' }
      });
      
      console.log(`✅ 连接恢复成功: ${savedConn.name}`);
    } catch (error) {
      console.log(`❌ 连接恢复失败: ${savedConn.name} - ${error.message}`);
      // 连接失败时，不保存到 redisConnections Map 中
      // 这样在获取连接列表时会正确显示为 disconnected
    }
  }
  
  console.log(`连接恢复完成，成功恢复 ${redisConnections.size} 个连接`);
};

// 关闭所有连接
const closeAllConnections = async () => {
  console.log('正在关闭Redis连接...');
  
  for (const [id, connection] of redisConnections) {
    try {
      await connection.client.quit();
      console.log(`已关闭连接: ${connection.config.name}`);
    } catch (error) {
      console.error(`关闭连接失败: ${connection.config.name}`, error.message);
    }
  }
};

module.exports = {
  redisConnections,
  addConnection,
  addTempConnection,
  convertTempToFormalConnection,
  updateConnection,
  getConnection,
  getConnectionById,
  getAllConnections,
  getUserAllConnections,
  deleteConnection,
  reconnectConnection,
  testConnection,
  pingConnection,
  closeConnection,
  getKeys,
  getKeyValue,
  renameKey,
  updateHashField,
  updateStringValue,
  deleteHashField,
  batchDeleteHashFields,
  deleteKeyGroup,
  getRedisInfo,
  restoreConnections,
  closeAllConnections
}; 