const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const operationHistory = require('../services/operationHistory')
const connectionService = require('../services/connection')

// 校验是否为连接所有者（仅所有者可清空历史）
const ensureOwner = async (connectionId, username) => {
  const connectionInfo = await connectionService.getConnectionInfo(connectionId)
  if (connectionInfo.owner !== username) {
    throw new Error('只有所有者才能清空操作历史')
  }
}

// 获取有历史记录的日期列表
router.get('/:connectionId/history/dates', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params
    const dates = await operationHistory.listConnectionHistoryDates(connectionId)
    res.json({
      success: true,
      data: dates
    })
  } catch (error) {
    console.error('获取历史日期列表失败:', error.message)
    res.status(500).json({
      success: false,
      message: '获取历史日期列表失败'
    })
  }
})

// 获取连接的操作历史（支持 ?date=YYYY-MM-DD 按天加载）
router.get('/:connectionId/history', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params
    const { limit = 5000, date } = req.query
    const dateParam = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
    const history = await operationHistory.getConnectionHistory(
      connectionId,
      parseInt(limit, 10) || 5000,
      dateParam
    )
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

// 清空指定日期的操作历史（仅所有者）
router.delete('/:connectionId/history/:date', authenticateToken, async (req, res) => {
  try {
    const { connectionId, date } = req.params
    const { username } = req.user
    await ensureOwner(connectionId, username)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: '日期格式无效，请使用 YYYY-MM-DD'
      })
    }
    const success = await operationHistory.clearConnectionHistory(connectionId, date)
    if (success) {
      res.json({
        success: true,
        message: `已清空 ${date} 的操作历史`
      })
    } else {
      res.status(500).json({
        success: false,
        message: '清空操作历史失败'
      })
    }
  } catch (error) {
    if (error.message === '只有所有者才能清空操作历史') {
      return res.status(403).json({ success: false, message: error.message })
    }
    console.error('清空操作历史失败:', error.message)
    res.status(500).json({
      success: false,
      message: '清空操作历史失败'
    })
  }
})

// 清空全部操作历史（仅所有者）
router.delete('/:connectionId/history', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params
    const { username } = req.user
    await ensureOwner(connectionId, username)
    const success = await operationHistory.clearConnectionHistory(connectionId)
    if (success) {
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
    if (error.message === '只有所有者才能清空操作历史') {
      return res.status(403).json({ success: false, message: error.message })
    }
    console.error('清空操作历史失败:', error.message)
    res.status(500).json({
      success: false,
      message: '清空操作历史失败'
    })
  }
})

module.exports = router 