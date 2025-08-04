const express = require('express')
const router = express.Router()
const batchOperationsService = require('../../services/tools/batchOperations')
const connectionService = require('../../services/connection')
const { authenticateToken: auth } = require('../../middleware/auth')

// 执行批量操作脚本
router.post('/execute', auth, async (req, res) => {
  try {
    const { connectionId, script, mode } = req.body
    
    if (!script || !script.trim()) {
      return res.status(400).json({
        success: false,
        message: '操作脚本不能为空'
      })
    }
    
    // 获取连接配置
    const connection = await connectionService.getConnectionById(connectionId)
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: '连接配置不存在'
      })
    }

    // 验证用户权限
    if (connection.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '权限不足，无法访问此连接'
      })
    }

    // 执行批量操作脚本
    const result = await batchOperationsService.executeBatchOperation(connection, { script, mode })
    
    const modeText = {
      preview: '预览',
      'dry-run': '试运行',
      execute: '执行'
    }[mode] || '执行'
    
    res.json({
      success: true,
      message: `${modeText}完成`,
      data: result
    })
  } catch (error) {
    console.error('执行批量操作脚本失败:', error)
    res.status(500).json({
      success: false,
      message: '执行批量操作脚本失败: ' + error.message
    })
  }
})

module.exports = router 