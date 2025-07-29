const express = require('express');
const router = express.Router();
const redisService = require('../services/redis');

// 获取Redis键列表
router.get('/:id/:db/keys', async (req, res) => {
  try {
    const { id, db } = req.params;
    const { pattern = '*', prefix, offset = 0, limit = 100 } = req.query;
    
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

// 获取键的值和类型
router.get('/:id/:db/key/*', async (req, res) => {
  try {
    const { id, db } = req.params;
    const keyName = req.params[0]; // 获取通配符匹配的完整路径
    
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

// 重命名键
router.put('/:id/:db/key/:oldKeyName/rename', async (req, res) => {
  try {
    const { id, db, oldKeyName } = req.params;
    const { newKeyName } = req.body;
    
    if (!newKeyName || newKeyName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '新键名不能为空'
      });
    }

    const result = await redisService.renameKey(id, db, oldKeyName, newKeyName);
    
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
router.put('/:connectionId/:database/hash/:keyName/field', async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { oldField, newField, value } = req.body;
    
    await redisService.updateHashField(connectionId, database, keyName, oldField, newField, value);
    
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
router.put('/:connectionId/:database/string/:keyName', async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { value } = req.body;
    
    await redisService.updateStringValue(connectionId, database, keyName, value);
    
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
router.delete('/:connectionId/:database/hash/:keyName/field', async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { field } = req.body;
    
    await redisService.deleteHashField(connectionId, database, keyName, field);
    
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
router.delete('/:connectionId/:database/hash/:keyName/fields', async (req, res) => {
  try {
    const { connectionId, database, keyName } = req.params;
    const { fields } = req.body;
    
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '字段列表不能为空'
      });
    }
    
    const deleted = await redisService.batchDeleteHashFields(connectionId, database, keyName, fields);
    
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

// 删除键组
router.delete('/:id/:db/keys/group/:prefix', async (req, res) => {
  try {
    const { id, db, prefix } = req.params;
    
    const result = await redisService.deleteKeyGroup(id, db, prefix);
    
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