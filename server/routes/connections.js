const express = require('express');
const router = express.Router();
const redisService = require('../services/redis');
const userService = require('../services/user');
const { authenticateToken } = require('../middleware/auth');

// 验证连接配置
const validateConnection = (connection) => {
  const errors = [];
  
  if (!connection.name || connection.name.trim() === '') {
    errors.push('连接名称不能为空');
  }
  
  if (!connection.host || connection.host.trim() === '') {
    errors.push('主机地址不能为空');
  }
  
  if (!connection.port || connection.port < 1 || connection.port > 65535) {
    errors.push('端口号必须在1-65535之间');
  }
  
  if (connection.database < 0 || connection.database > 15) {
    errors.push('数据库编号必须在0-15之间');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 创建连接（需要登录）
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, host, port, password, database = 0 } = req.body;
    const { username } = req.user;
    
    // 验证连接配置
    const validation = validateConnection({ name, host, port, database });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    const connectionConfig = {
      name,
      host,
      port: parseInt(port),
      password: password || null,
      database: parseInt(database)
    };

    // 检查是否有对应的临时连接
    const allConnections = redisService.getAllConnections();
    const tempConnection = allConnections.find(conn => 
      conn.isTemp && 
      conn.host === host && 
      conn.port === parseInt(port) &&
      conn.database === parseInt(database)
    );

    const config = tempConnection 
      ? await redisService.convertTempToFormalConnection(tempConnection.id, connectionConfig)
      : await redisService.addConnection(connectionConfig);

    // 保存到用户账户
    const userConnections = userService.getUserConnections(username);
    userConnections.push(config);
    await userService.saveUserConnections(username, userConnections);

    res.json({
      success: true,
      message: 'Redis连接创建成功',
      data: config
    });

  } catch (error) {
    console.error('Redis连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `连接失败: ${error.message}`
    });
  }
});

// 临时连接操作
router.post('/temp', async (req, res) => {
  try {
    const { name, host, port, password, database = 0 } = req.body;
    
    const validation = validateConnection({ name, host, port, database });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    const connectionConfig = {
      name,
      host,
      port: parseInt(port),
      password: password || null,
      database: parseInt(database)
    };

    const config = await redisService.addTempConnection(connectionConfig);

    res.json({
      success: true,
      message: '临时Redis连接创建成功',
      data: config
    });

  } catch (error) {
    console.error('临时Redis连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `临时连接失败: ${error.message}`
    });
  }
});

// 更新连接
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, host, port, password, database = 0 } = req.body;
    const { username } = req.user;
    
    const validation = validateConnection({ name, host, port, database });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    const userConnections = userService.getUserConnections(username);
    const existingConnection = userConnections.find(conn => conn.id === id);
    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const connectionConfig = {
      name,
      host,
      port: parseInt(port),
      password: password || null,
      database: parseInt(database)
    };

    const updatedConfig = await redisService.updateConnection(id, connectionConfig);

    const updatedConnections = userConnections.map(conn => 
      conn.id === id ? updatedConfig : conn
    );
    await userService.saveUserConnections(username, updatedConnections);

    res.json({
      success: true,
      message: 'Redis连接更新成功',
      data: updatedConfig
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;
    const userConnections = redisService.getUserAllConnections(username);
    
    res.json({
      success: true,
      data: userConnections
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
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;
    
    await redisService.deleteConnection(id);

    const userConnections = userService.getUserConnections(username);
    const updatedConnections = userConnections.filter(conn => conn.id !== id);
    await userService.saveUserConnections(username, updatedConnections);
    
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

// 重新连接
router.post('/:id/reconnect', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;
    
    const userConnections = userService.getUserConnections(username);
    const existingConnection = userConnections.find(conn => conn.id === id);
    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const updatedConfig = await redisService.reconnectConnection(id, existingConnection);

    res.json({
      success: true,
      message: '重新连接成功',
      data: updatedConfig
    });

  } catch (error) {
    console.error('重新连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `重新连接失败: ${error.message}`
    });
  }
});

// 测试连接
router.post('/test', async (req, res) => {
  try {
    const { host, port, password, database = 0 } = req.body;
    
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        message: '主机地址和端口为必填项'
      });
    }

    const connectionConfig = {
      host,
      port: parseInt(port),
      password: password || null,
      database: parseInt(database)
    };

    await redisService.testConnection(connectionConfig);
    
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

// 获取Redis服务器信息
router.get('/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    const info = await redisService.getRedisInfo(id);
    
    res.json({
      success: true,
      data: info
    });

  } catch (error) {
    console.error('获取Redis信息失败:', error.message);
    res.status(500).json({
      success: false,
      message: `获取信息失败: ${error.message}`
    });
  }
});

// Ping Redis连接
router.post('/:id/ping', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await redisService.pingConnection(id);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Ping连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `Ping失败: ${error.message}`
    });
  }
});

module.exports = router; 