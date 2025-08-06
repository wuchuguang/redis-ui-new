const express = require('express')
const router = express.Router()
const dataConverterService = require('../../services/tools/dataConverter')
const connectionService = require('../../services/connection')
const { authenticateToken: auth } = require('../../middleware/auth')

// 批量转换数据
router.post('/batch', auth, async (req, res) => {
  try {
    const { connectionId, keys, convertType } = req.body
    
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

    // 验证参数
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要转换的键'
      })
    }

    if (!convertType) {
      return res.status(400).json({
        success: false,
        message: '请选择转换类型'
      })
    }

    // 执行批量转换
    const result = await dataConverterService.batchConvert(connection, {
      keys,
      convertType
    })
    
    res.json({
      success: true,
      message: '批量转换完成',
      data: result
    })
  } catch (error) {
    console.error('批量转换失败:', error)
    res.status(500).json({
      success: false,
      message: '批量转换失败: ' + error.message
    })
  }
})

module.exports = router 