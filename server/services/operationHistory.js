const fs = require('fs').promises
const path = require('path')
const connectionService = require('./connection')

// 操作历史存储
const operationHistory = new Map()

// 注意：操作历史现在使用连接服务来记录，每个连接有自己的历史目录

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
    // 使用连接服务记录操作历史
    await connectionService.logOperation(connectionId, operation)
    
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

const buildValueSummary = (value) => {
  if (value === undefined) {
    return {}
  }
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value)
    const preview = raw.length > 200 ? `${raw.slice(0, 200)}...` : raw
    return {
      valuePreview: preview,
      valueSize: raw.length
    }
  } catch (error) {
    return {
      valuePreview: '无法生成值预览',
      valueSize: 0
    }
  }
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

const logHashFieldEdited = async (connectionId, operator, keyName, field, newValue) => {
  await logOperation(connectionId, {
    type: 'hash_field_edited',
    operator,
    details: {
      keyName,
      field,
      ...buildValueSummary(newValue),
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
const logStringValueEdited = async (connectionId, operator, keyName, newValue) => {
  await logOperation(connectionId, {
    type: 'string_value_edited',
    operator,
    details: {
      keyName,
      ...buildValueSummary(newValue),
      action: '编辑String值'
    }
  })
}

// 通用键值更新（用于 list/set/zset/hash 等类型）
const logKeyValueUpdated = async (connectionId, operator, keyName, valueType, newValue) => {
  await logOperation(connectionId, {
    type: 'key_value_updated',
    operator,
    details: {
      keyName,
      valueType,
      ...buildValueSummary(newValue),
      action: '更新键值'
    }
  })
}

// 批量删除Key
const logKeysBatchDeleted = async (connectionId, operator, keysCount) => {
  await logOperation(connectionId, {
    type: 'keys_batch_deleted',
    operator,
    details: {
      keysCount,
      action: '批量删除Key'
    }
  })
}

// TTL操作
const logKeyTTLUpdated = async (connectionId, operator, keyName, ttl, action) => {
  await logOperation(connectionId, {
    type: 'key_ttl_updated',
    operator,
    details: {
      keyName,
      ttl,
      action
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

// 获取连接的操作历史（支持按日期）
const getConnectionHistory = async (connectionId, limit = 5000, date = null) => {
  try {
    const history = await connectionService.getOperationHistory(connectionId, date)
    return history.slice(0, limit)
  } catch (error) {
    console.error('获取操作历史失败:', error)
    return []
  }
}

// 列出有历史记录的日期
const listConnectionHistoryDates = async (connectionId) => {
  try {
    return await connectionService.listHistoryDates(connectionId)
  } catch (error) {
    console.error('列出历史日期失败:', error)
    return []
  }
}

// 清空连接的操作历史：date 为空则清空全部
const clearConnectionHistory = async (connectionId, date = null) => {
  return await connectionService.clearOperationHistory(connectionId, date)
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
  logKeyValueUpdated,
  logKeysBatchDeleted,
  logKeyTTLUpdated,
  logDatabaseSelected,
  logKeySearch,
  logFieldSearch,
  getConnectionHistory,
  listConnectionHistoryDates,
  clearConnectionHistory
} 