const fs = require('fs').promises
const path = require('path')

// 操作历史存储
const operationHistory = new Map()

// 确保操作历史目录存在
const ensureHistoryDir = async () => {
  const historyDir = path.join(__dirname, '../data/operation-history')
  try {
    await fs.access(historyDir)
  } catch (error) {
    await fs.mkdir(historyDir, { recursive: true })
    console.log('操作历史目录已创建:', historyDir)
  }
  return historyDir
}

// 获取操作历史文件路径
const getHistoryFilePath = (connectionId) => {
  return path.join(__dirname, '../data/operation-history', `${connectionId}.json`)
}

// 加载连接的操作历史
const loadConnectionHistory = async (connectionId) => {
  try {
    const historyPath = getHistoryFilePath(connectionId)
    const data = await fs.readFile(historyPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // 文件不存在或读取失败，返回空数组
    return []
  }
}

// 保存连接的操作历史
const saveConnectionHistory = async (connectionId, history) => {
  try {
    await ensureHistoryDir()
    const historyPath = getHistoryFilePath(connectionId)
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8')
  } catch (error) {
    console.error('保存操作历史失败:', error)
  }
}

// 记录操作历史
const logOperation = async (connectionId, operation) => {
  try {
    const history = await loadConnectionHistory(connectionId)
    
    const logEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...operation
    }
    
    // 添加到历史记录开头
    history.unshift(logEntry)
    
    // 限制历史记录数量（最多1000条）
    if (history.length > 1000) {
      history.splice(1000)
    }
    
    await saveConnectionHistory(connectionId, history)
    
    console.log(`操作历史已记录: ${connectionId} - ${operation.type} - ${operation.operator}`)
  } catch (error) {
    console.error('记录操作历史失败:', error)
  }
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 连接相关操作
const logConnectionCreated = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_created',
    operator,
    details: {
      connectionName,
      action: '创建Redis连接'
    }
  })
}

const logConnectionUpdated = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_updated',
    operator,
    details: {
      connectionName,
      action: '更新Redis连接'
    }
  })
}

const logConnectionDeleted = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_deleted',
    operator,
    details: {
      connectionName,
      action: '删除Redis连接'
    }
  })
}

const logConnectionConnected = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_connected',
    operator,
    details: {
      connectionName,
      action: '连接Redis'
    }
  })
}

const logConnectionDisconnected = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_disconnected',
    operator,
    details: {
      connectionName,
      action: '断开Redis连接'
    }
  })
}

const logConnectionReconnected = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_reconnected',
    operator,
    details: {
      connectionName,
      action: '重新连接Redis'
    }
  })
}

const logConnectionShared = async (connectionId, operator, connectionName) => {
  await logOperation(connectionId, {
    type: 'connection_shared',
    operator,
    details: {
      connectionName,
      action: '分享Redis连接'
    }
  })
}

// Key相关操作
const logKeySelected = async (connectionId, operator, keyName) => {
  await logOperation(connectionId, {
    type: 'key_selected',
    operator,
    details: {
      keyName,
      action: '选择Key'
    }
  })
}

const logKeyDeleted = async (connectionId, operator, keyName) => {
  await logOperation(connectionId, {
    type: 'key_deleted',
    operator,
    details: {
      keyName,
      action: '删除Key'
    }
  })
}

const logKeyRenamed = async (connectionId, operator, oldKey, newKey) => {
  await logOperation(connectionId, {
    type: 'key_renamed',
    operator,
    details: {
      oldKey,
      newKey,
      action: '重命名Key'
    }
  })
}

const logKeyAdded = async (connectionId, operator, keyName) => {
  await logOperation(connectionId, {
    type: 'key_added',
    operator,
    details: {
      keyName,
      action: '添加Key'
    }
  })
}

// Hash字段操作
const logHashFieldAdded = async (connectionId, operator, keyName, field) => {
  await logOperation(connectionId, {
    type: 'hash_field_added',
    operator,
    details: {
      keyName,
      field,
      action: '添加Hash字段'
    }
  })
}

const logHashFieldEdited = async (connectionId, operator, keyName, field) => {
  await logOperation(connectionId, {
    type: 'hash_field_edited',
    operator,
    details: {
      keyName,
      field,
      action: '编辑Hash字段'
    }
  })
}

const logHashFieldDeleted = async (connectionId, operator, keyName, field) => {
  await logOperation(connectionId, {
    type: 'hash_field_deleted',
    operator,
    details: {
      keyName,
      field,
      action: '删除Hash字段'
    }
  })
}

const logHashFieldsBatchDeleted = async (connectionId, operator, keyName, fieldsCount) => {
  await logOperation(connectionId, {
    type: 'hash_fields_batch_deleted',
    operator,
    details: {
      keyName,
      fieldsCount,
      action: '批量删除Hash字段'
    }
  })
}

// String值操作
const logStringValueEdited = async (connectionId, operator, keyName) => {
  await logOperation(connectionId, {
    type: 'string_value_edited',
    operator,
    details: {
      keyName,
      action: '编辑String值'
    }
  })
}

// 数据库操作
const logDatabaseSelected = async (connectionId, operator, database) => {
  await logOperation(connectionId, {
    type: 'database_selected',
    operator,
    details: {
      database,
      action: '切换数据库'
    }
  })
}

// 搜索操作
const logKeySearch = async (connectionId, operator, searchTerm) => {
  await logOperation(connectionId, {
    type: 'key_search',
    operator,
    details: {
      searchTerm,
      action: '搜索Key'
    }
  })
}

const logFieldSearch = async (connectionId, operator, keyName, searchTerm) => {
  await logOperation(connectionId, {
    type: 'field_search',
    operator,
    details: {
      keyName,
      searchTerm,
      action: '搜索字段'
    }
  })
}

// 获取连接的操作历史
const getConnectionHistory = async (connectionId, limit = 100) => {
  try {
    const history = await loadConnectionHistory(connectionId)
    return history.slice(0, limit)
  } catch (error) {
    console.error('获取操作历史失败:', error)
    return []
  }
}

// 清空连接的操作历史
const clearConnectionHistory = async (connectionId) => {
  try {
    const historyPath = getHistoryFilePath(connectionId)
    await fs.unlink(historyPath)
    console.log(`操作历史已清空: ${connectionId}`)
    return true
  } catch (error) {
    console.error('清空操作历史失败:', error)
    return false
  }
}

module.exports = {
  logOperation,
  logConnectionCreated,
  logConnectionUpdated,
  logConnectionDeleted,
  logConnectionConnected,
  logConnectionDisconnected,
  logConnectionReconnected,
  logConnectionShared,
  logKeySelected,
  logKeyDeleted,
  logKeyRenamed,
  logKeyAdded,
  logHashFieldAdded,
  logHashFieldEdited,
  logHashFieldDeleted,
  logHashFieldsBatchDeleted,
  logStringValueEdited,
  logDatabaseSelected,
  logKeySearch,
  logFieldSearch,
  getConnectionHistory,
  clearConnectionHistory
} 