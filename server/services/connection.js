const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { permissionManager } = require('./permission');

// 连接数据目录
const CONNECTIONS_DIR = path.join(__dirname, '../connections');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!!';

// 加密数据
const encryptData = (data) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encrypted
  };
};

// 解密数据
const decryptData = (encryptedData) => {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`解密失败: ${error.message}`);
  }
};

// 确保连接目录存在
const ensureConnectionsDir = async () => {
  try {
    await fs.access(CONNECTIONS_DIR);
  } catch (error) {
    await fs.mkdir(CONNECTIONS_DIR, { recursive: true });
    console.log('创建连接数据目录:', CONNECTIONS_DIR);
  }
};

// 获取连接信息文件路径
const getConnectionInfoPath = (connectionId) => {
  return path.join(CONNECTIONS_DIR, connectionId, 'info.json');
};

// 获取操作历史目录路径
const getConnectionHistoryDir = (connectionId) => {
  return path.join(CONNECTIONS_DIR, connectionId, 'history');
};

// 获取操作历史文件路径
const getHistoryFilePath = (connectionId, date) => {
  const historyDir = getConnectionHistoryDir(connectionId);
  return path.join(historyDir, `${date}.json`);
};

// 创建连接信息
const createConnectionInfo = async (connectionData, owner) => {
  await ensureConnectionsDir();
  
  const connectionId = uuidv4();
  const connectionDir = path.join(CONNECTIONS_DIR, connectionId);
  await fs.mkdir(connectionDir, { recursive: true });
  
  const connectionInfo = {
    id: connectionId,
    owner: owner,
    participants: [],
    shareCode: null,
    redis: {
      name: connectionData.name,
      host: connectionData.host,
      port: connectionData.port,
      password: connectionData.password,
      database: connectionData.database || 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const encryptedData = encryptData(connectionInfo);
  const infoPath = getConnectionInfoPath(connectionId);
  await fs.writeFile(infoPath, JSON.stringify(encryptedData, null, 2));
  
  // 创建权限配置
  await permissionManager.createConnectionPermissions(connectionId, owner);
  
  console.log(`连接信息已创建: ${connectionId}`);
  return connectionInfo;
};

// 获取连接信息
const getConnectionInfo = async (connectionId) => {
  try {
    const infoPath = getConnectionInfoPath(connectionId);
    const encryptedData = JSON.parse(await fs.readFile(infoPath, 'utf8'));
    return decryptData(encryptedData);
  } catch (error) {
    throw new Error(`获取连接信息失败: ${error.message}`);
  }
};

// 更新连接信息
const updateConnectionInfo = async (connectionId, updateData) => {
  try {
    const connectionInfo = await getConnectionInfo(connectionId);
    const updatedInfo = {
      ...connectionInfo,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    const encryptedData = encryptData(updatedInfo);
    const infoPath = getConnectionInfoPath(connectionId);
    await fs.writeFile(infoPath, JSON.stringify(encryptedData, null, 2));
    
    console.log(`连接信息已更新: ${connectionId}`);
    return updatedInfo;
  } catch (error) {
    throw new Error(`更新连接信息失败: ${error.message}`);
  }
};

// 删除连接信息
const deleteConnectionInfo = async (connectionId) => {
  try {
    const connectionDir = path.join(CONNECTIONS_DIR, connectionId);
    await fs.rm(connectionDir, { recursive: true, force: true });
    console.log(`连接信息已删除: ${connectionId}`);
  } catch (error) {
    throw new Error(`删除连接信息失败: ${error.message}`);
  }
};

// 添加参与者
const addParticipant = async (connectionId, username) => {
  try {
    const connectionInfo = await getConnectionInfo(connectionId);
    
    // 检查是否为连接所有者，如果是则不允许添加为参与者
    if (connectionInfo.owner === username) {
      throw new Error('连接所有者不能作为参与者添加');
    }
    
    if (!connectionInfo.participants.includes(username)) {
      connectionInfo.participants.push(username);
      await updateConnectionInfo(connectionId, { participants: connectionInfo.participants });
    }
    return connectionInfo;
  } catch (error) {
    throw new Error(`添加参与者失败: ${error.message}`);
  }
};

// 移除参与者
const removeParticipant = async (connectionId, username) => {
  try {
    const connectionInfo = await getConnectionInfo(connectionId);
    connectionInfo.participants = connectionInfo.participants.filter(p => p !== username);
    await updateConnectionInfo(connectionId, { participants: connectionInfo.participants });
    return connectionInfo;
  } catch (error) {
    throw new Error(`移除参与者失败: ${error.message}`);
  }
};

// 设置分享码
const setShareCode = async (connectionId, shareCode) => {
  try {
    await updateConnectionInfo(connectionId, { shareCode });
    return true;
  } catch (error) {
    throw new Error(`设置分享码失败: ${error.message}`);
  }
};

// 根据分享码查找连接
const findConnectionByShareCode = async (shareCode) => {
  try {
    // 确保连接目录存在
    await ensureConnectionsDir();
    
    const connections = await fs.readdir(CONNECTIONS_DIR);
    
    for (const connectionId of connections) {
      try {
        const connectionInfo = await getConnectionInfo(connectionId);
        if (connectionInfo.shareCode === shareCode) {
          return connectionInfo;
        }
      } catch (error) {
        // 跳过无效的连接目录
        continue;
      }
    }
    
    return null;
  } catch (error) {
    throw new Error(`查找分享连接失败: ${error.message}`);
  }
};

// 检查用户是否已有相同的Redis连接
const checkDuplicateConnection = async (username, connectionData, options = {}) => {
  try {
    const userConnections = await getUserConnections(username);
    
    // 默认检查选项：主机、端口、数据库
    const checkDatabase = options.checkDatabase !== false; // 默认检查数据库
    
    // 检查是否存在相同的Redis服务器连接
    const duplicateConnection = userConnections.find(conn => {
      const hostMatch = conn.redis.host === connectionData.host;
      const portMatch = conn.redis.port === connectionData.port;
      const databaseMatch = checkDatabase ? 
        (conn.redis.database === (connectionData.database || 0)) : true;
      
      return hostMatch && portMatch && databaseMatch;
    });
    
    return duplicateConnection || null;
  } catch (error) {
    throw new Error(`检查重复连接失败: ${error.message}`);
  }
};

// 获取用户的所有连接
const getUserConnections = async (username) => {
  try {
    // 确保连接目录存在
    await ensureConnectionsDir();
    
    const connections = await fs.readdir(CONNECTIONS_DIR);
    const userConnections = [];
    
    for (const connectionId of connections) {
      try {
        const connectionInfo = await getConnectionInfo(connectionId);
        if (connectionInfo.owner === username || connectionInfo.participants.includes(username)) {
          userConnections.push(connectionInfo);
        }
      } catch (error) {
        // 跳过无效的连接目录
        continue;
      }
    }
    
    return userConnections;
  } catch (error) {
    throw new Error(`获取用户连接失败: ${error.message}`);
  }
};

// 记录操作历史
const logOperation = async (connectionId, operationData) => {
  try {
    const historyDir = getConnectionHistoryDir(connectionId);
    await fs.mkdir(historyDir, { recursive: true });
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const historyPath = getHistoryFilePath(connectionId, today);
    
    let historyData = [];
    try {
      const existingData = await fs.readFile(historyPath, 'utf8');
      historyData = JSON.parse(existingData);
    } catch (error) {
      // 文件不存在，使用空数组
    }
    
    const operation = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...operationData
    };
    
    // 使用unshift将新操作添加到数组开头，这样最新的操作会显示在前面
    historyData.unshift(operation);
    
    // 限制历史记录数量，避免文件过大
    if (historyData.length > 5000) {
      historyData = historyData.slice(0, 5000);
    }
    
    await fs.writeFile(historyPath, JSON.stringify(historyData, null, 2));
    
    console.log(`操作已记录: ${connectionId} - ${operationData.type || operationData.operation}`);
    return operation;
  } catch (error) {
    throw new Error(`记录操作失败: ${error.message}`);
  }
};

// 获取操作历史
const getOperationHistory = async (connectionId, date = null) => {
  try {
    if (!date) {
      date = new Date().toISOString().split('T')[0]; // 今天
    }
    
    const historyPath = getHistoryFilePath(connectionId, date);
    const historyData = JSON.parse(await fs.readFile(historyPath, 'utf8'));
    return historyData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // 文件不存在，返回空数组
    }
    throw new Error(`获取操作历史失败: ${error.message}`);
  }
};

// 获取指定日期范围的操作历史
const getOperationHistoryRange = async (connectionId, startDate, endDate) => {
  try {
    const allHistory = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      try {
        const dayHistory = await getOperationHistory(connectionId, dateStr);
        allHistory.push(...dayHistory);
      } catch (error) {
        // 跳过不存在的日期文件
        continue;
      }
    }
    
    // 按时间倒序排列，最新的操作在前面
    return allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    throw new Error(`获取操作历史范围失败: ${error.message}`);
  }
};

module.exports = {
  createConnectionInfo,
  getConnectionInfo,
  updateConnectionInfo,
  deleteConnectionInfo,
  addParticipant,
  removeParticipant,
  setShareCode,
  findConnectionByShareCode,
  checkDuplicateConnection,
  getUserConnections,
  logOperation,
  getOperationHistory,
  getOperationHistoryRange
}; 