const express = require('express');
const router = express.Router();
const redisService = require('../services/redis');
const userService = require('../services/user');
const { authenticateToken } = require('../middleware/auth');
const operationHistory = require('../services/operationHistory');

/**
 * @apiDefine ConnectionError
 * @apiError {Object} 400 请求参数错误
 * @apiError {Object} 401 认证失败
 * @apiError {Object} 404 连接不存在
 * @apiError {Object} 500 服务器内部错误
 */

/**
 * @apiDefine ConnectionSuccess
 * @apiSuccess {Boolean} success 操作是否成功
 * @apiSuccess {String} message 操作结果消息
 * @apiSuccess {Object} data 连接数据
 * @apiSuccess {String} data.id 连接ID
 * @apiSuccess {String} data.name 连接名称
 * @apiSuccess {String} data.host 主机地址
 * @apiSuccess {Number} data.port 端口号
 * @apiSuccess {String} data.password 密码（可选）
 * @apiSuccess {Number} data.database 数据库编号
 * @apiSuccess {String} data.status 连接状态（connected/disconnected）
 * @apiSuccess {Boolean} data.isOwner 是否为连接所有者
 * @apiSuccess {Boolean} data.canEdit 是否可以编辑
 * @apiSuccess {Boolean} data.canDelete 是否可以删除
 * @apiSuccess {String} data.owner 连接所有者（共享连接时）
 */

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

/**
 * @api {post} /api/connections 创建Redis连接
 * @apiName CreateConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 创建新的Redis连接并保存到用户账户
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} name 连接名称
 * @apiParam {String} host 主机地址
 * @apiParam {Number} port 端口号（1-65535）
 * @apiParam {String} [password] 密码（可选）
 * @apiParam {Number} [database=0] 数据库编号（0-15）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "name": "本地Redis",
 *         "host": "localhost",
 *         "port": 6379,
 *         "password": "",
 *         "database": 0
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 创建成功
 * @apiSuccess {String} message="Redis连接创建成功" 成功消息
 * @apiSuccess {Object} data 连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 400 参数验证失败
 * @apiError {String} 400.message 错误消息（连接名称不能为空、端口号无效等）
 * @apiError {Object} 500 连接失败
 * @apiError {String} 500.message 连接错误消息
 */
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

    // 保存到用户账户（不包含状态信息）
    const userConnections = userService.getUserConnections(username);
    const connectionToSave = {
      id: config.id,
      name: config.name,
      host: config.host,
      port: config.port,
      password: config.password,
      database: config.database
    };
    userConnections.push(connectionToSave);
    await userService.saveUserConnections(username, userConnections);

    // 记录操作历史
    await operationHistory.logConnectionCreated(config.id, username, config.name);

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

/**
 * @api {post} /api/connections/temp 创建临时连接
 * @apiName CreateTempConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 创建临时Redis连接（无需登录，用于测试连接）
 * 
 * @apiParam {String} name 连接名称
 * @apiParam {String} host 主机地址
 * @apiParam {Number} port 端口号（1-65535）
 * @apiParam {String} [password] 密码（可选）
 * @apiParam {Number} [database=0] 数据库编号（0-15）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/temp \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "name": "测试连接",
 *         "host": "localhost",
 *         "port": 6379,
 *         "password": "",
 *         "database": 0
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 创建成功
 * @apiSuccess {String} message="临时Redis连接创建成功" 成功消息
 * @apiSuccess {Object} data 连接信息
 * @apiSuccess {String} data.id 连接ID
 * @apiSuccess {String} data.name 连接名称
 * @apiSuccess {String} data.host 主机地址
 * @apiSuccess {Number} data.port 端口号
 * @apiSuccess {String} data.password 密码（可选）
 * @apiSuccess {Number} data.database 数据库编号
 * @apiSuccess {Boolean} data.isTemp 是否为临时连接
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 400 参数验证失败
 * @apiError {String} 400.message 错误消息
 * @apiError {Object} 500 连接失败
 * @apiError {String} 500.message 连接错误消息
 */
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

/**
 * @api {put} /api/connections/:id 更新连接
 * @apiName UpdateConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 更新指定Redis连接的配置信息
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * @apiParam {String} name 连接名称
 * @apiParam {String} host 主机地址
 * @apiParam {Number} port 端口号（1-65535）
 * @apiParam {String} [password] 密码（可选）
 * @apiParam {Number} [database=0] 数据库编号（0-15）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X PUT http://localhost:3000/api/connections/123456 \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "name": "更新后的连接",
 *         "host": "localhost",
 *         "port": 6379,
 *         "password": "",
 *         "database": 0
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 更新成功
 * @apiSuccess {String} message="Redis连接更新成功" 成功消息
 * @apiSuccess {Object} data 更新后的连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 400 参数验证失败
 * @apiError {String} 400.message 错误消息
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 */
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

    // 记录操作历史
    await operationHistory.logConnectionUpdated(id, username, updatedConfig.name);

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

/**
 * @api {get} /api/connections 获取连接列表
 * @apiName GetConnections
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 获取当前用户的所有Redis连接（包括自己的和共享的）
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X GET http://localhost:3000/api/connections \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 获取成功
 * @apiSuccess {Array} data 连接列表
 * @apiSuccess {String} data[].id 连接ID
 * @apiSuccess {String} data[].name 连接名称
 * @apiSuccess {String} data[].host 主机地址
 * @apiSuccess {Number} data[].port 端口号
 * @apiSuccess {String} data[].password 密码（可选）
 * @apiSuccess {Number} data[].database 数据库编号
 * @apiSuccess {String} data[].status 连接状态（connected/disconnected）
 * @apiSuccess {Boolean} data[].isOwner 是否为连接所有者
 * @apiSuccess {Boolean} data[].canEdit 是否可以编辑
 * @apiSuccess {Boolean} data[].canDelete 是否可以删除
 * @apiSuccess {String} data[].owner 连接所有者（共享连接时）
 * 
 * @apiUse ConnectionError
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;
    const connectionsWithStatus = redisService.getUserAllConnections(username);
    
    res.json({
      success: true,
      data: connectionsWithStatus
    });
  } catch (error) {
    console.error('获取连接列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取连接列表失败'
    });
  }
});

/**
 * @api {delete} /api/connections/:id 删除连接
 * @apiName DeleteConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 删除指定的Redis连接
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X DELETE http://localhost:3000/api/connections/123456 \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 删除成功
 * @apiSuccess {String} message="连接删除成功" 成功消息
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;
    
    await redisService.deleteConnection(id);

    // 获取连接信息用于记录历史
    const userConnections = userService.getUserConnections(username);
    const connectionToDelete = userConnections.find(conn => conn.id === id);
    
    // 从用户自己的连接中删除
    const updatedConnections = userConnections.filter(conn => conn.id !== id);
    await userService.saveUserConnections(username, updatedConnections);
    
    // 记录操作历史
    if (connectionToDelete) {
      await operationHistory.logConnectionDeleted(id, username, connectionToDelete.name);
    }
    
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

/**
 * @api {post} /api/connections/:id/reconnect 重新连接
 * @apiName ReconnectConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 重新建立Redis连接
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/123456/reconnect \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 重连成功
 * @apiSuccess {String} message="重新连接成功" 成功消息
 * @apiSuccess {Object} data 连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 * @apiError {Object} 500 重连失败
 * @apiError {String} 500.message 连接错误消息
 */
router.post('/:id/reconnect', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;
    
    const userConnections = userService.getUserAllConnections(username);
    const existingConnection = userConnections.find(conn => conn.id === id);
    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const updatedConfig = await redisService.reconnectConnection(id, existingConnection);

    // 记录操作历史
    await operationHistory.logConnectionReconnected(id, username, existingConnection.name);

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

/**
 * @api {post} /api/connections/test 测试连接
 * @apiName TestConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 测试Redis连接是否可用（无需登录）
 * 
 * @apiParam {String} host 主机地址
 * @apiParam {Number} port 端口号
 * @apiParam {String} [password] 密码（可选）
 * @apiParam {Number} [database=0] 数据库编号（0-15）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/test \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "host": "localhost",
 *         "port": 6379,
 *         "password": "",
 *         "database": 0
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 测试成功
 * @apiSuccess {String} message="连接测试成功" 成功消息
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 400 参数错误
 * @apiError {String} 400.message 错误消息
 * @apiError {Object} 500 连接失败
 * @apiError {String} 500.message 连接错误消息
 */
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

/**
 * @api {get} /api/connections/:id/info 获取Redis服务器信息
 * @apiName GetRedisInfo
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 获取Redis服务器的详细信息
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X GET http://localhost:3000/api/connections/123456/info
 * 
 * @apiSuccess {Boolean} success=true 获取成功
 * @apiSuccess {Object} data Redis服务器信息
 * @apiSuccess {String} data.version Redis版本
 * @apiSuccess {String} data.uptime 运行时间
 * @apiSuccess {Number} data.connected_clients 连接客户端数
 * @apiSuccess {Number} data.used_memory 已使用内存
 * @apiSuccess {Number} data.total_keys 总键数
 * @apiSuccess {Array} data.databases 数据库信息
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 * @apiError {Object} 500 获取信息失败
 * @apiError {String} 500.message 错误消息
 */
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

/**
 * @api {post} /api/connections/:id/ping Ping连接
 * @apiName PingConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 测试Redis连接是否响应
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/123456/ping
 * 
 * @apiSuccess {Boolean} success=true Ping成功
 * @apiSuccess {Object} data Ping结果
 * @apiSuccess {String} data.response PONG响应
 * @apiSuccess {Number} data.latency 延迟时间（毫秒）
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 * @apiError {Object} 500 Ping失败
 * @apiError {String} 500.message 错误消息
 */
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

/**
 * @api {post} /api/connections/establish 建立连接（未登录用户）
 * @apiName EstablishConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 建立Redis连接（未登录用户使用，发送完整配置）
 * 
 * @apiParam {String} name 连接名称
 * @apiParam {String} host 主机地址
 * @apiParam {Number} port 端口号（1-65535）
 * @apiParam {String} [password] 密码（可选）
 * @apiParam {Number} [database=0] 数据库编号（0-15）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/establish \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "name": "本地Redis",
 *         "host": "localhost",
 *         "port": 6379,
 *         "password": "",
 *         "database": 0
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 连接建立成功
 * @apiSuccess {String} message="Redis连接建立成功" 成功消息
 * @apiSuccess {Object} data 连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 */
router.post('/establish', async (req, res) => {
  try {
    const { name, host, port, password, database = 0 } = req.body;
    
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

    const config = await redisService.establishConnection(connectionConfig);

    res.json({
      success: true,
      message: 'Redis连接建立成功',
      data: config
    });

  } catch (error) {
    console.error('建立连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @api {post} /api/connections/:id/connect 建立已保存的连接（登录用户）
 * @apiName ConnectSavedConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 建立已保存的Redis连接（登录用户使用，只需连接ID）
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/123456/connect \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 连接建立成功
 * @apiSuccess {String} message="Redis连接建立成功" 成功消息
 * @apiSuccess {Object} data 连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 */
router.post('/:id/connect', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;

    const config = await redisService.establishSavedConnection(id, username);

    res.json({
      success: true,
      message: 'Redis连接建立成功',
      data: config
    });

  } catch (error) {
    console.error('建立已保存连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @api {post} /api/connections/:id/connect-shared 建立分享的连接
 * @apiName ConnectSharedConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 建立分享的Redis连接（需要权限验证）
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/123456/connect-shared \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 连接建立成功
 * @apiSuccess {String} message="分享连接建立成功" 成功消息
 * @apiSuccess {Object} data 连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 */
router.post('/:id/connect-shared', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;

    const config = await redisService.establishSharedConnection(id, username);

    res.json({
      success: true,
      message: '分享连接建立成功',
      data: config
    });

  } catch (error) {
    console.error('建立分享连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @api {post} /api/connections/:id/close 关闭连接
 * @apiName CloseConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 关闭指定的Redis连接
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/123456/close
 * 
 * @apiSuccess {Boolean} success=true 关闭成功
 * @apiSuccess {String} message="连接已关闭" 成功消息
 * @apiSuccess {Object} data 关闭结果
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 * @apiError {Object} 500 关闭失败
 * @apiError {String} 500.message 错误消息
 */
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await redisService.closeConnection(id);
    
    res.json({
      success: true,
      message: '连接已关闭',
      data: result
    });

  } catch (error) {
    console.error('关闭连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `关闭连接失败: ${error.message}`
    });
  }
});

/**
 * @api {post} /api/connections/:id/share 分享连接
 * @apiName ShareConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 生成连接分享码，供其他用户加入
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/123456/share \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 分享成功
 * @apiSuccess {String} message="连接分享成功" 成功消息
 * @apiSuccess {Object} data 分享信息
 * @apiSuccess {String} data.joinCode 8位分享码
 * @apiSuccess {String} data.connectionName 连接名称
 * 
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 404 连接不存在
 * @apiError {String} 404.message 错误消息
 * @apiError {Object} 403 权限不足
 * @apiError {String} 403.message 错误消息
 */
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user;
    
    // 获取连接信息用于记录历史
    const userConnections = userService.getUserConnections(username);
    const connection = userConnections.find(conn => conn.id === id);
    
    const result = await userService.shareConnection(username, id);
    
    // 记录操作历史
    if (connection) {
      await operationHistory.logConnectionShared(id, username, connection.name);
    }
    
    res.json({
      success: true,
      message: '连接分享成功',
      data: result
    });

  } catch (error) {
    console.error('分享连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `分享连接失败: ${error.message}`
    });
  }
});

/**
 * @api {post} /api/connections/join 加入分享连接
 * @apiName JoinSharedConnection
 * @apiGroup Connections
 * @apiVersion 1.0.0
 * 
 * @apiDescription 使用分享码加入其他用户分享的Redis连接
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} joinCode 8位分享码
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3000/api/connections/join \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "joinCode": "ABC12345"
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 加入成功
 * @apiSuccess {String} message="成功加入分享连接" 成功消息
 * @apiSuccess {Object} data 连接信息
 * 
 * @apiUse ConnectionSuccess
 * @apiUse ConnectionError
 * 
 * @apiError {Object} 400 分享码无效
 * @apiError {String} 400.message 错误消息
 * @apiError {Object} 404 分享连接不存在
 * @apiError {String} 404.message 错误消息
 */
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const { username } = req.user;
    
    if (!joinCode) {
      return res.status(400).json({
        success: false,
        message: '分享码不能为空'
      });
    }
    
    const result = await userService.joinSharedConnection(username, joinCode);
    
    res.json({
      success: true,
      message: '成功加入分享的连接',
      data: result
    });

  } catch (error) {
    console.error('加入分享连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: `加入分享连接失败: ${error.message}`
    });
  }
});

module.exports = router; 