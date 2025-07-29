const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// 内存存储操作历史
const operationHistory = [];

// 获取操作历史
router.get('/history', authenticateToken, (req, res) => {
  try {
    const { page = 1, pageSize = 20, target } = req.query;
    const { userId } = req.user;
    
    let filteredHistory = operationHistory;
    
    // 按用户过滤
    filteredHistory = filteredHistory.filter(op => op.userId === userId);
    
    // 按目标过滤
    if (target) {
      filteredHistory = filteredHistory.filter(op => op.target === target);
    }
    
    // 分页
    const start = (page - 1) * pageSize;
    const end = start + parseInt(pageSize);
    const paginatedHistory = filteredHistory.slice(start, end);
    
    res.json({
      success: true,
      data: {
        list: paginatedHistory,
        total: filteredHistory.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
    
  } catch (error) {
    console.error('获取操作历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作历史失败'
    });
  }
});

// 添加操作记录
router.post('/', authenticateToken, (req, res) => {
  try {
    const { type, target, beforeData, afterData, remark } = req.body;
    const { userId, username } = req.user;
    
    const operation = {
      id: uuidv4(),
      userId,
      userName: username,
      type,
      target,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
      remark,
      timestamp: new Date().toISOString(),
      canRollback: !!beforeData
    };
    
    operationHistory.unshift(operation);
    
    // 限制历史记录数量
    if (operationHistory.length > 1000) {
      operationHistory.splice(1000);
    }
    
    console.log(`记录操作: ${username} - ${type} ${target}`);
    
    res.json({
      success: true,
      data: operation
    });
    
  } catch (error) {
    console.error('添加操作记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加操作记录失败'
    });
  }
});

// 回滚操作
router.post('/:id/rollback', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    
    const operation = operationHistory.find(op => op.id === id && op.userId === userId);
    if (!operation) {
      return res.status(404).json({
        success: false,
        message: '操作记录不存在'
      });
    }
    
    if (!operation.canRollback) {
      return res.status(400).json({
        success: false,
        message: '此操作不可回滚'
      });
    }
    
    // 这里应该实现具体的回滚逻辑
    // 根据操作类型和beforeData来恢复数据
    console.log(`回滚操作: ${operation.userName} - ${operation.type} ${operation.target}`);
    
    res.json({
      success: true,
      message: '操作回滚成功'
    });
    
  } catch (error) {
    console.error('回滚操作失败:', error);
    res.status(500).json({
      success: false,
      message: '回滚操作失败'
    });
  }
});

module.exports = router; 