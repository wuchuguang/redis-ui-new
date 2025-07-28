const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ConfigManager = require('./config-manager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化配置管理器
const configManager = new ConfigManager();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// 存储Redis连接实例
const redisConnections = new Map();

// 连接管理API
app.post('/api/connections', async (req, res) => {
  try {
    const { name, host, port, password, database = 0 } = req.body;
    
    // 验证连接配置
    const validation = configManager.validateConnection({ name, host, port, database });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    const connectionId = uuidv4();
    const connectionConfig = {
      id: connectionId,
      name,
      host,
      port: parseInt(port),
      password: password || null,
      database: parseInt(database),
      status: 'connecting'
    };

    // 创建Redis客户端
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
    
    connectionConfig.status = 'connected';
    redisConnections.set(connectionId, {
      client: redisClient,
      config: connectionConfig
    });

    // 保存到配置文件
    await configManager.addConnection(connectionConfig);

    console.log(`Redis连接成功: ${name} (${host}:${port})`);
    
    res.json({
      success: true,
      message: 'Redis连接创建成功',
      data: connectionConfig
    });

  } catch (error) {
    console.error('Redis连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `连接失败: ${error.message}`
    });
  }
});

// 更新连接
app.put('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, host, port, password, database = 0 } = req.body;
    
    // 验证连接配置
    const validation = configManager.validateConnection({ name, host, port, database });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    // 检查连接是否存在
    const existingConnection = configManager.getConnectionById(id);
    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    // 如果连接正在使用，先断开
    const activeConnection = redisConnections.get(id);
    if (activeConnection && activeConnection.client.isReady) {
      await activeConnection.client.disconnect();
      redisConnections.delete(id);
    }

    const updatedConnectionConfig = {
      id,
      name,
      host,
      port: parseInt(port),
      password: password || null,
      database: parseInt(database),
      status: 'connecting'
    };

    // 创建新的Redis客户端
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
    
    updatedConnectionConfig.status = 'connected';
    redisConnections.set(id, {
      client: redisClient,
      config: updatedConnectionConfig
    });

    // 更新配置文件
    await configManager.updateConnection(id, updatedConnectionConfig);

    console.log(`Redis连接更新成功: ${name} (${host}:${port})`);
    
    res.json({
      success: true,
      message: 'Redis连接更新成功',
      data: updatedConnectionConfig
    });

  } catch (error) {
    console.error('Redis连接更新失败:', error.message);
    res.status(500).json({
      success: false,
      message: `连接更新失败: ${error.message}`
    });
  }
});

// 获取所有连接
app.get('/api/connections', async (req, res) => {
  try {
    // 从配置文件加载连接
    const savedConnections = configManager.getConnections();
    
    // 合并内存中的连接状态
    const connections = savedConnections.map(savedConn => {
      const activeConnection = redisConnections.get(savedConn.id);
      return {
        ...savedConn,
        status: activeConnection && activeConnection.client.isReady ? 'connected' : 'disconnected'
      };
    });
    
    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('获取连接列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取连接列表失败'
    });
  }
});

// 删除连接
app.delete('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = redisConnections.get(id);
    
    if (connection) {
      // 关闭Redis连接
      await connection.client.quit();
      redisConnections.delete(id);
    }

    // 从配置文件中删除
    const removed = await configManager.removeConnection(id);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }
    
    console.log(`Redis连接已删除: ${id}`);
    
    res.json({
      success: true,
      message: '连接删除成功'
    });

  } catch (error) {
    console.error('删除连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `删除失败: ${error.message}`
    });
  }
});

// 测试连接
app.post('/api/connections/test', async (req, res) => {
  try {
    const { host, port, password, database = 0 } = req.body;
    
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        message: '主机地址和端口为必填项'
      });
    }

    const testClient = createClient({
      socket: {
        host,
        port: parseInt(port)
      },
      password: password || undefined,
      database: parseInt(database)
    });

    await testClient.connect();
    await testClient.ping();
    await testClient.quit();
    
    res.json({
      success: true,
      message: '连接测试成功'
    });

  } catch (error) {
    console.error('连接测试失败:', error.message);
    res.status(500).json({
      success: false,
      message: `连接测试失败: ${error.message}`
    });
  }
});

// 重新连接
app.post('/api/connections/:id/reconnect', async (req, res) => {
  try {
    const { id } = req.params;
    const savedConn = configManager.getConnectionById(id);
    
    if (!savedConn) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    // 关闭现有连接
    const existingConnection = redisConnections.get(id);
    if (existingConnection && existingConnection.client) {
      await existingConnection.client.quit();
    }

    // 创建新连接
    const redisClient = createClient({
      socket: {
        host: savedConn.host,
        port: savedConn.port
      },
      password: savedConn.password || undefined,
      database: savedConn.database
    });

    await redisClient.connect();
    await redisClient.ping();
    
    redisConnections.set(id, {
      client: redisClient,
      config: { ...savedConn, status: 'connected' }
    });

    console.log(`重新连接成功: ${savedConn.name}`);
    
    res.json({
      success: true,
      message: '重新连接成功',
      data: { ...savedConn, status: 'connected' }
    });

  } catch (error) {
    console.error('重新连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `重新连接失败: ${error.message}`
    });
  }
});

// 获取Redis键列表
app.get('/api/connections/:id/:db/keys', async (req, res) => {
  try {
    const { id, db } = req.params;
    const { pattern = '*', prefix, offset = 0, limit = 100 } = req.query;
    const connection = redisConnections.get(id);
    
    if (!connection || !connection.client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在或未连接'
      });
    }

    // 切换到指定数据库
    const database = parseInt(db);
    await connection.client.select(database);

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
      
      return res.json({
        success: true,
        data: {
          keys: paginatedKeys.map(key => ({
            name: key,
            type: 'unknown'
          })),
          totalKeys: prefixKeys.length,
          hasMore: endIndex < prefixKeys.length,
          offset: startIndex,
          limit: parseInt(limit)
        }
      });
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

    res.json({
      success: true,
      data: {
        groups,
        totalKeys: keys.length
      }
    });

  } catch (error) {
    console.error('获取键列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: `获取键列表失败: ${error.message}`
    });
  }
});

// 获取键的值和类型
app.get('/api/connections/:id/:db/key/*', async (req, res) => {
  try {
    const { id, db } = req.params;
    const keyName = req.params[0]; // 获取通配符匹配的完整路径
    const connection = redisConnections.get(id);
    
    if (!connection || !connection.client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在或未连接'
      });
    }

    // 切换到指定数据库
    const database = parseInt(db);
    await connection.client.select(database);

    // 检查键是否存在
    const exists = await connection.client.exists(keyName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: '键不存在'
      });
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

    res.json({
      success: true,
      data: {
        key: keyName,
        type,
        value,
        ttl,
        size: type === 'string' ? (value ? value.length : 0) : 
              type === 'hash' ? Object.keys(value || {}).length :
              type === 'list' ? (value ? value.length : 0) :
              type === 'set' ? (value ? value.length : 0) :
              type === 'zset' ? (value ? value.length : 0) : 0
      }
    });

  } catch (error) {
    console.error('获取键值失败:', error.message);
    res.status(500).json({
      success: false,
      message: `获取键值失败: ${error.message}`
    });
  }
});

// 重命名键
app.put('/api/connections/:id/:db/key/:oldKeyName/rename', async (req, res) => {
  try {
    const { id, db, oldKeyName } = req.params;
    const { newKeyName } = req.body;
    const connection = redisConnections.get(id);
    
    if (!connection || !connection.client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在或未连接'
      });
    }

    if (!newKeyName || newKeyName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '新键名不能为空'
      });
    }

    // 切换到指定数据库
    const database = parseInt(db);
    await connection.client.select(database);

    // 检查旧键是否存在
    const exists = await connection.client.exists(oldKeyName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: '键不存在'
      });
    }

    // 检查新键名是否已存在
    const newKeyExists = await connection.client.exists(newKeyName);
    if (newKeyExists) {
      return res.status(409).json({
        success: false,
        message: '新键名已存在'
      });
    }

    // 重命名键
    await connection.client.rename(oldKeyName, newKeyName);

    console.log(`键重命名成功: ${oldKeyName} → ${newKeyName}`);
    
    res.json({
      success: true,
      message: '键重命名成功',
      data: {
        oldKey: oldKeyName,
        newKey: newKeyName
      }
    });

  } catch (error) {
    console.error('重命名键失败:', error.message);
    res.status(500).json({
      success: false,
      message: `重命名键失败: ${error.message}`
    });
  }
});

// 删除键组
app.delete('/api/connections/:id/:db/keys/group/:prefix', async (req, res) => {
  try {
    const { id, db, prefix } = req.params;
    const connection = redisConnections.get(id);
    
    if (!connection || !connection.client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在或未连接'
      });
    }

    // 切换到指定数据库
    const database = parseInt(db);
    await connection.client.select(database);

    // 获取该前缀的所有键
    const keys = await connection.client.keys(`${prefix}:*`);
    
    if (keys.length === 0) {
      return res.status(404).json({
        success: false,
        message: '键组不存在'
      });
    }

    // 删除所有键
    const pipeline = connection.client.multi();
    for (const key of keys) {
      pipeline.del(key);
    }
    await pipeline.exec();

    console.log(`删除键组: ${prefix} (${keys.length} 个键)`);
    
    res.json({
      success: true,
      message: `成功删除键组 ${prefix} (${keys.length} 个键)`,
      data: { deletedCount: keys.length }
    });

  } catch (error) {
    console.error('删除键组失败:', error.message);
    res.status(500).json({
      success: false,
      message: `删除键组失败: ${error.message}`
    });
  }
});

// 获取Redis服务器信息
app.get('/api/connections/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = redisConnections.get(id);
    
    if (!connection || !connection.client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在或未连接'
      });
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
    
    res.json({
      success: true,
      data: {
        redisInfo: infoObj,
        currentDbSize,
        dbStats,
        status: connection.client.isReady ? 'connected' : 'disconnected'
      }
    });

  } catch (error) {
    console.error('获取Redis信息失败:', error.message);
    res.status(500).json({
      success: false,
      message: `获取信息失败: ${error.message}`
    });
  }
});

// 处理前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// 恢复保存的连接
async function restoreConnections() {
  try {
    await configManager.loadConfig();
    const savedConnections = configManager.getConnections();
    
    console.log(`发现 ${savedConnections.length} 个保存的连接`);
    
    for (const savedConn of savedConnections) {
      try {
        console.log(`尝试恢复连接: ${savedConn.name}`);
        
        const redisClient = createClient({
          socket: {
            host: savedConn.host,
            port: savedConn.port
          },
          password: savedConn.password || undefined,
          database: savedConn.database
        });

        await redisClient.connect();
        await redisClient.ping();
        
        redisConnections.set(savedConn.id, {
          client: redisClient,
          config: { ...savedConn, status: 'connected' }
        });
        
        console.log(`连接恢复成功: ${savedConn.name}`);
      } catch (error) {
        console.log(`连接恢复失败: ${savedConn.name} - ${error.message}`);
        // 连接失败时，仍然保存配置但标记为未连接
        redisConnections.set(savedConn.id, {
          client: null,
          config: { ...savedConn, status: 'disconnected' }
        });
      }
    }
  } catch (error) {
    console.error('恢复连接失败:', error.message);
  }
}

// 启动服务器
app.listen(PORT, async () => {
  console.log(`Redis管理工具服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  
  // 恢复保存的连接
  await restoreConnections();
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭Redis连接...');
  
  for (const [id, connection] of redisConnections) {
    try {
      await connection.client.quit();
      console.log(`已关闭连接: ${connection.config.name}`);
    } catch (error) {
      console.error(`关闭连接失败: ${connection.config.name}`, error.message);
    }
  }
  
  process.exit(0);
}); 