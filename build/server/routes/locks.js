const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, isExpired } = require('../middleware/auth');

// 内存存储操作锁
const operationLocks = new Map();

// 获取所有操作锁
router.get('/', (req, res) => {
  try {
    const locks = Array.from(operationLocks.values());
    res.json({
      success: true,
      data: locks
    });
  } catch (error) {
    console.error('获取操作锁失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作锁失败'
    });
  }
});

// 获取我的操作锁
router.get('/my', authenticateToken, (req, res) => {
  try {
    const myLocks = Array.from(operationLocks.values())
      .filter(lock => lock.userId === req.user.userId);
    
    res.json({
      success: true,
      data: myLocks
    });
  } catch (error) {
    console.error('获取我的操作锁失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的操作锁失败'
    });
  }
});

// 获取操作锁
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { action, target, timeout = 30000 } = req.body;
    const { userId, username } = req.user;
    
    // 检查是否已有冲突的锁
    const existingLock = Array.from(operationLocks.values())
      .find(lock => lock.target === target && !isExpired(lock));
    
    if (existingLock && existingLock.userId !== userId) {
      return res.status(409).json({
        success: false,
        message: '操作冲突，当前有其他用户正在操作此对象'
      });
    }
    
    // 创建新锁
    const lockId = uuidv4();
    const lock = {
      id: lockId,
      userId,
      userName: username,
      action,
      target,
      timeout,
      startTime: new Date().toISOString()
    };
    
    operationLocks.set(lockId, lock);
    
    console.log(`获取操作锁: ${username} - ${action} ${target}`);
    
    res.json({
      success: true,
      data: lock
    });
    
  } catch (error) {
    console.error('获取操作锁失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作锁失败'
    });
  }
});

// 强制获取操作锁
router.post('/force', authenticateToken, async (req, res) => {
  try {
    const { action, target, timeout = 30000 } = req.body;
    const { userId, username } = req.user;
    
    // 删除现有的冲突锁
    for (const [lockId, lock] of operationLocks.entries()) {
      if (lock.target === target && lock.userId !== userId) {
        operationLocks.delete(lockId);
      }
    }
    
    // 创建新锁
    const lockId = uuidv4();
    const lock = {
      id: lockId,
      userId,
      userName: username,
      action,
      target,
      timeout,
      startTime: new Date().toISOString()
    };
    
    operationLocks.set(lockId, lock);
    
    console.log(`强制获取操作锁: ${username} - ${action} ${target}`);
    
    res.json({
      success: true,
      data: lock
    });
    
  } catch (error) {
    console.error('强制获取操作锁失败:', error);
    res.status(500).json({
      success: false,
      message: '强制获取操作锁失败'
    });
  }
});

// 释放操作锁
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    
    const lock = operationLocks.get(id);
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: '操作锁不存在'
      });
    }
    
    if (lock.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权释放此操作锁'
      });
    }
    
    operationLocks.delete(id);
    
    console.log(`释放操作锁: ${lock.userName} - ${lock.action} ${lock.target}`);
    
    res.json({
      success: true,
      message: '操作锁释放成功'
    });
    
  } catch (error) {
    console.error('释放操作锁失败:', error);
    res.status(500).json({
      success: false,
      message: '释放操作锁失败'
    });
  }
});

// 释放所有我的操作锁
router.delete('/my/all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    let deletedCount = 0;
    for (const [lockId, lock] of operationLocks.entries()) {
      if (lock.userId === userId) {
        operationLocks.delete(lockId);
        deletedCount++;
      }
    }
    
    console.log(`释放所有操作锁: ${deletedCount} 个`);
    
    res.json({
      success: true,
      message: `成功释放 ${deletedCount} 个操作锁`
    });
    
  } catch (error) {
    console.error('释放所有操作锁失败:', error);
    res.status(500).json({
      success: false,
      message: '释放所有操作锁失败'
    });
  }
});

module.exports = router; 