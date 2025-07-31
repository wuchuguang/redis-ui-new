const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const operationHistory = require('../services/operationHistory')

// 获取连接的操作历史
router.get('/:connectionId/history', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params
    const { limit = 100 } = req.query
    
    const history = await operationHistory.getConnectionHistory(connectionId, parseInt(limit))
    
    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('获取操作历史失败:', error.message)
    res.status(500).json({
      success: false,
      message: '获取操作历史失败'
    })
  }
})

// 清空连接的操作历史
router.delete('/:connectionId/history', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params
    const { username } = req.user
    
    const success = await operationHistory.clearConnectionHistory(connectionId)
    
    if (success) {
      // 记录清空操作
      await operationHistory.logOperation(connectionId, {
        type: 'history_cleared',
        operator: username,
        details: {
          action: '清空操作历史'
        }
      })
      
      res.json({
        success: true,
        message: '操作历史已清空'
      })
    } else {
      res.status(500).json({
        success: false,
        message: '清空操作历史失败'
      })
    }
  } catch (error) {
    console.error('清空操作历史失败:', error.message)
    res.status(500).json({
      success: false,
      message: '清空操作历史失败'
    })
  }
})

module.exports = router 