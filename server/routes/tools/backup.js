const express = require('express')
const router = express.Router()
const dataBackupService = require('../../services/tools/dataBackup')
const connectionService = require('../../services/connection')
const { authenticateToken: auth } = require('../../middleware/auth')
const path = require('path')

// 开始备份
router.post('/start', auth, async (req, res) => {
  try {
    const { connectionId, ...backupConfig } = req.body
    
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

    // 开始备份
    const result = await dataBackupService.startBackup(connection, backupConfig)
    
    res.json({
      success: true,
      message: '备份任务已启动',
      data: result
    })
  } catch (error) {
    console.error('启动备份失败:', error)
    res.status(500).json({
      success: false,
      message: '启动备份失败: ' + error.message
    })
  }
})

// 获取备份进度
router.get('/progress/:backupId', auth, async (req, res) => {
  try {
    const { backupId } = req.params
    
    // 获取备份进度
    const progress = await dataBackupService.getBackupProgress(backupId)
    
    res.json({
      success: true,
      data: progress
    })
  } catch (error) {
    console.error('获取备份进度失败:', error)
    res.status(500).json({
      success: false,
      message: '获取备份进度失败: ' + error.message
    })
  }
})

// 预览备份
router.post('/preview', auth, async (req, res) => {
  try {
    const { connectionId, ...backupConfig } = req.body
    
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

    // 使用独立的Redis连接进行预览
    const preview = await dataBackupService.previewBackup(connection, backupConfig)
    
    res.json({
      success: true,
      message: '预览完成',
      data: preview
    })
  } catch (error) {
    console.error('预览备份失败:', error)
    res.status(500).json({
      success: false,
      message: '预览备份失败: ' + error.message
    })
  }
})

// 获取备份历史
router.get('/history', auth, async (req, res) => {
  try {
    const { connectionId } = req.query
    
    if (!connectionId) {
      return res.status(400).json({
        success: false,
        message: '缺少连接ID参数'
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

    // 获取备份历史
    const history = await dataBackupService.getBackupHistory(connectionId)
    
    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('获取备份历史失败:', error)
    res.status(500).json({
      success: false,
      message: '获取备份历史失败: ' + error.message
    })
  }
})

// 下载备份
router.get('/download/:backupId', auth, async (req, res) => {
  try {
    const { backupId } = req.params
    
    // 获取备份信息
    const backupInfo = await dataBackupService.downloadBackup(backupId)
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${backupInfo.filename}"`)
    res.setHeader('Content-Length', backupInfo.size)
    
    // 发送文件
    res.sendFile(backupInfo.path)
  } catch (error) {
    console.error('下载备份失败:', error)
    res.status(500).json({
      success: false,
      message: '下载备份失败: ' + error.message
    })
  }
})

// 恢复备份
router.post('/restore', auth, async (req, res) => {
  try {
    const { connectionId, backupId, ...restoreConfig } = req.body
    
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

    // 恢复备份
    await dataBackupService.restoreBackup(connection, backupId, restoreConfig)
    
    res.json({
      success: true,
      message: '数据恢复完成'
    })
  } catch (error) {
    console.error('恢复备份失败:', error)
    res.status(500).json({
      success: false,
      message: '恢复备份失败: ' + error.message
    })
  }
})

// 删除备份
router.delete('/:backupId', auth, async (req, res) => {
  try {
    const { backupId } = req.params
    
    // 删除备份
    const result = await dataBackupService.deleteBackup(backupId)
    
    if (result) {
      res.json({
        success: true,
        message: '备份文件已删除'
      })
    } else {
      res.status(500).json({
        success: false,
        message: '删除备份失败'
      })
    }
  } catch (error) {
    console.error('删除备份失败:', error)
    res.status(500).json({
      success: false,
      message: '删除备份失败: ' + error.message
    })
  }
})

module.exports = router 