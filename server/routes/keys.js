const express = require('express');
const router = express.Router();
const redisService = require('../services/redis');
const userService = require('../services/user');
const connectionService = require('../services/connection');
const operationHistory = require('../services/operationHistory');
const { authenticateToken } = require('../middleware/auth');

// 验证用户是否有权限访问指定连接
const validateConnectionPermission = async (username, connectionId) => {
  try {
    const userConnections = await connectionService.getUserConnections(username);
    return userConnections.some(conn => conn.id === connectionId);
  } catch (error) {
    console.error('验证连接权限失败:', error);
    return false;
  }
};

/**
 * @apiDefine KeyError
 * @apiError {Object} 400 请求参数错误
 * @apiError {Object} 401 认证失败
 * @apiError {Object} 404 键不存在
 * @apiError {Object} 500 服务器内部错误
 */

/**
 * @apiDefine KeySuccess
 * @apiSuccess {Boolean} success 操作是否成功
 * @apiSuccess {String} message 操作结果消息
 * @apiSuccess {Object} data 键数据
 * @apiSuccess {String} data.key 键名
 * @apiSuccess {String} data.type 键类型（string/hash/list/set/zset）
 * @apiSuccess {*} data.value 键值
 * @apiSuccess {Number} data.ttl 过期时间（秒，-1表示永不过期）
 */

/**
 * @api {get} /api/connections/:id/:db/keys 获取键列表
 * @apiName GetKeys
 * @apiGroup Keys
 * @apiVersion 1.0.0
 * 
 * @apiDescription 获取指定数据库中的键列表
 * 
 * @apiParam {String} id 连接ID
 * @apiParam {Number} db 数据库编号（0-15）
 * @apiParam {String} [pattern=*] 键模式匹配（支持通配符）
 * @apiParam {String} [prefix] 键前缀过滤
 * @apiParam {Number} [offset=0] 偏移量
 * @apiParam {Number} [limit=100] 返回数量限制
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X GET "http://localhost:3000/api/connections/123456/0/keys?pattern=user*&limit=50"
 * 
 * @apiSuccess {Boolean} success=true 获取成功
 * @apiSuccess {Object} data 键列表数据
 * @apiSuccess {Array} data.keys 键列表
 * @apiSuccess {String} data.keys[].key 键名
 * @apiSuccess {String} data.keys[].type 键类型
 * @apiSuccess {Number} data.keys[].ttl 过期时间
 * @apiSuccess {Number} data.total 总键数
 * @apiSuccess {Number} data.offset 当前偏移量
 * @apiSuccess {Number} data.limit 返回数量限制
 * 
 * @apiUse KeyError
 */
router.get('/:id/:db/keys', authenticateToken, async (req, res) => {
  try {
    const { id, db } = req.params;
    const { pattern = '*', prefix, offset = 0, limit = 100 } = req.query;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!(await validateConnectionPermission(username, id))) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    const result = await redisService.getKeys(id, db, pattern, prefix, offset, limit);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取键列表失败:', req.params, req.query, error.message);
    res.status(500).json({
      success: false,
      message: `获取键列表失败: ${error.message}`
    });
  }
});

/**
 * @api {get} /api/connections/:id/:db/key/:keyName 获取键值
 * @apiName GetKeyValue
 * @apiGroup Keys
 * @apiVersion 1.0.0
 * 
 * @apiDescription 获取指定键的值和类型信息
 * 
 * @apiParam {String} id 连接ID
 * @apiParam {Number} db 数据库编号（0-15）
 * @apiParam {String} keyName 键名
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X GET "http://localhost:3000/api/connections/123456/0/key/user:123"
 * 
 * @apiSuccess {Boolean} success=true 获取成功
 * @apiSuccess {Object} data 键值数据
 * @apiSuccess {String} data.key 键名
 * @apiSuccess {String} data.type 键类型（string/hash/list/set/zset）
 * @apiSuccess {*} data.value 键值
 * @apiSuccess {Number} data.ttl 过期时间（秒，-1表示永不过期）
 * @apiSuccess {Number} data.size 值大小（字节）
 * 
 * @apiUse KeyError
 * 
 * @apiError {Object} 404 键不存在
 * @apiError {String} 404.message 错误消息
 */
router.get('/:id/:db/key/*', authenticateToken, async (req, res) => {
  try {
    const { id, db } = req.params;
    const keyName = req.params[0]; // 获取通配符匹配的完整路径
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!(await validateConnectionPermission(username, id))) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    const result = await redisService.getKeyValue(id, db, keyName);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取键值失败:', error.message);
    res.status(500).json({
      success: false,
      message: `获取键值失败: ${error.message}`
    });
  }
});

/**
 * @api {put} /api/connections/:id/:db/key/:oldKeyName/rename 重命名键
 * @apiName RenameKey
 * @apiGroup Keys
 * @apiVersion 1.0.0
 * 
 * @apiDescription 重命名Redis键
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} id 连接ID
 * @apiParam {Number} db 数据库编号（0-15）
 * @apiParam {String} oldKeyName 原键名
 * @apiParam {String} newKeyName 新键名
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X PUT "http://localhost:3000/api/connections/123456/0/key/oldkey/rename" \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "newKeyName": "newkey"
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 重命名成功
 * @apiSuccess {String} message="键重命名成功" 成功消息
 * @apiSuccess {Object} data 重命名结果
 * 
 * @apiUse KeyError
 * 
 * @apiError {Object} 400 参数错误
 * @apiError {String} 400.message 错误消息（新键名不能为空等）
 * @apiError {Object} 404 原键不存在
 * @apiError {String} 404.message 错误消息
 */
router.put('/:id/:db/key/:oldKeyName/rename', authenticateToken, async (req, res) => {
  try {
    const { id, db, oldKeyName } = req.params;
    const { newKeyName } = req.body;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!(await validateConnectionPermission(username, id))) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    if (!newKeyName || newKeyName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '新键名不能为空'
      });
    }

    const result = await redisService.renameKey(id, db, oldKeyName, newKeyName);
    
    // 记录操作历史
    await operationHistory.logKeyRenamed(id, username, oldKeyName, newKeyName);
    
    res.json({
      success: true,
      message: '键重命名成功',
      data: result
    });

  } catch (error) {
    console.error('重命名键失败:', error.message);
    res.status(500).json({
      success: false,
      message: `重命名键失败: ${error.message}`
    });
  }
});

// 更新Hash字段
router.put('/:connectionId/:database/hash/:keyName/field', authenticateToken, async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { oldField, newField, value } = req.body;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!await validateConnectionPermission(username, connectionId)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    await redisService.updateHashField(connectionId, database, keyName, oldField, newField, value);
    
    // 记录操作历史
    await operationHistory.logHashFieldEdited(connectionId, username, keyName, newField || oldField);
    
    res.json({
      success: true,
      message: 'Hash字段更新成功'
    });

  } catch (error) {
    console.error('更新Hash字段失败:', error.message);
    res.status(500).json({
      success: false,
      message: `更新失败: ${error.message}`
    });
  }
});

// 更新String值
router.put('/:connectionId/:database/string/:keyName', authenticateToken, async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { value } = req.body;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!await validateConnectionPermission(username, connectionId)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    await redisService.updateStringValue(connectionId, database, keyName, value);
    
    // 记录操作历史
    await operationHistory.logStringValueEdited(connectionId, username, keyName);
    
    res.json({
      success: true,
      message: 'String值更新成功'
    });

  } catch (error) {
    console.error('更新String值失败:', error.message);
    res.status(500).json({
      success: false,
      message: `更新失败: ${error.message}`
    });
  }
});

// 删除Hash字段
router.delete('/:connectionId/:database/hash/:keyName/field', authenticateToken, async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { field } = req.body;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!await validateConnectionPermission(username, connectionId)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    await redisService.deleteHashField(connectionId, database, keyName, field);
    
    // 记录操作历史
    await operationHistory.logHashFieldDeleted(connectionId, username, keyName, field);
    
    res.json({
      success: true,
      message: 'Hash字段删除成功'
    });

  } catch (error) {
    console.error('删除Hash字段失败:', error.message);
    res.status(500).json({
      success: false,
      message: `删除失败: ${error.message}`
    });
  }
});

// 批量删除Hash字段
router.delete('/:connectionId/:database/hash/:keyName/fields', authenticateToken, async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { fields } = req.body;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!await validateConnectionPermission(username, connectionId)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '字段列表不能为空'
      });
    }
    
    const deleted = await redisService.batchDeleteHashFields(connectionId, database, keyName, fields);
    
    // 记录操作历史
    await operationHistory.logHashFieldsBatchDeleted(connectionId, username, keyName, fields.length);
    
    res.json({
      success: true,
      message: `批量删除成功，删除了 ${deleted} 个字段`
    });

  } catch (error) {
    console.error('批量删除Hash字段失败:', error.message);
    res.status(500).json({
      success: false,
      message: `批量删除失败: ${error.message}`
    });
  }
});

/**
 * @api {delete} /api/connections/:id/:db/keys 删除键
 * @apiName DeleteKey
 * @apiGroup Keys
 * @apiVersion 1.0.0
 * 
 * @apiDescription 删除指定的键
 * 
 * @apiParam {String} id 连接ID
 * @apiParam {Number} db 数据库编号（0-15）
 * @apiParam {String} pattern 键模式（支持通配符）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X DELETE "http://localhost:3000/api/connections/123456/0/keys?pattern=user:123"
 * 
 * @apiSuccess {Boolean} success=true 删除成功
 * @apiSuccess {String} message 删除结果消息
 * 
 * @apiUse KeyError
 */
router.delete('/:id/:db/keys', authenticateToken, async (req, res) => {
  try {
    const { id, db } = req.params;
    const { pattern } = req.query;
    const { username } = req.user;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: '缺少pattern参数'
      });
    }
    
    // 验证用户是否有权限访问这个连接
    if (!(await validateConnectionPermission(username, id))) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    const result = await redisService.deleteKeys(id, db, pattern);
    
    res.json({
      success: true,
      message: `成功删除 ${result} 个键`,
      data: { deletedCount: result }
    });

  } catch (error) {
    console.error('删除键失败:', req.params, req.query, error.message);
    res.status(500).json({
      success: false,
      message: `删除键失败: ${error.message}`
    });
  }
});

/**
 * @api {delete} /api/connections/:id/:db/keys/group/:prefix 删除键组
 * @apiName DeleteKeyGroup
 * @apiGroup Keys
 * @apiVersion 1.0.0
 * 
 * @apiDescription 删除指定前缀的键组
 * 
 * @apiParam {String} id 连接ID
 * @apiParam {Number} db 数据库编号（0-15）
 * @apiParam {String} prefix 键前缀
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X DELETE "http://localhost:3000/api/connections/123456/0/keys/group/user:"
 * 
 * @apiSuccess {Boolean} success=true 删除成功
 * @apiSuccess {String} message 删除结果消息
 * 
 * @apiUse KeyError
 */
router.delete('/:id/:db/keys/group/:prefix', authenticateToken, async (req, res) => {
  try {
    const { id, db, prefix } = req.params;
    const { username } = req.user;
    
    // 验证用户是否有权限访问这个连接
    if (!await validateConnectionPermission(username, id)) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此连接'
      });
    }
    
    const result = await redisService.deleteKeyGroup(id, db, prefix);
    
    // 记录操作历史
    await operationHistory.logKeyDeleted(id, username, prefix);
    
    res.json({
      success: true,
      message: `成功删除键组 ${prefix} (${result.deletedCount} 个键)`,
      data: result
    });

  } catch (error) {
    console.error('删除键组失败:', error.message);
    res.status(500).json({
      success: false,
      message: `删除键组失败: ${error.message}`
    });
  }
});

module.exports = router; 