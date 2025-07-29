// 操作日志管理器
class OperationLogger {
  constructor() {
    this.maxHistorySize = 1000 // 最大历史记录数
  }

  // 记录操作日志
  log(type, message, level = 'info', details = null, connection = null) {
    const logEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      message,
      level,
      details,
      connection
    }

    this.addToHistory(logEntry)
    console.log(`[操作日志] ${type}: ${message}`, logEntry)
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 添加到历史记录
  addToHistory(logEntry) {
    try {
      const history = this.getHistory()
      history.unshift(logEntry) // 添加到开头

      // 限制历史记录数量
      if (history.length > this.maxHistorySize) {
        history.splice(this.maxHistorySize)
      }

      localStorage.setItem('operationHistory', JSON.stringify(history))
    } catch (error) {
      console.error('保存操作历史失败:', error)
    }
  }

  // 获取历史记录
  getHistory() {
    try {
      const saved = localStorage.getItem('operationHistory')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('获取操作历史失败:', error)
      return []
    }
  }

  // 清空历史记录
  clearHistory() {
    try {
      localStorage.removeItem('operationHistory')
    } catch (error) {
      console.error('清空操作历史失败:', error)
    }
  }

  // 连接相关操作
  logConnectionCreated(connection) {
    this.log('connect', `创建Redis连接: ${connection.name} (${connection.host}:${connection.port})`, 'info', connection)
  }

  logConnectionUpdated(connection) {
    this.log('edit', `更新Redis连接: ${connection.name}`, 'info', connection)
  }

  logConnectionDeleted(connectionId, connectionName) {
    this.log('delete', `删除Redis连接: ${connectionName}`, 'warning', { connectionId })
  }

  logConnectionSelected(connection) {
    this.log('connect', `选择Redis连接: ${connection.name}`, 'info', { connectionId: connection.id })
  }

  logConnectionReconnected(connection) {
    this.log('connect', `重新连接Redis: ${connection.name}`, 'info', { connectionId: connection.id })
  }

  logConnectionClosed(connection) {
    this.log('connect', `关闭Redis连接: ${connection.name}`, 'info', { connectionId: connection.id })
  }

  logConnectionShared(connection) {
    this.log('share', `分享Redis连接: ${connection.name}`, 'info', { connectionId: connection.id })
  }

  logConnectionJoined(connection) {
    this.log('join', `加入分享连接: ${connection.name}`, 'info', { connectionId: connection.id, owner: connection.owner })
  }

  // Key相关操作
  logKeySelected(key, connection) {
    this.log('query', `选择Key: ${key.name}`, 'info', { key, connection: connection?.name })
  }

  logKeyDeleted(keyName, connection) {
    this.log('delete', `删除Key: ${keyName}`, 'warning', { keyName, connection: connection?.name })
  }

  logKeyRenamed(oldKey, newKey, connection) {
    this.log('edit', `重命名Key: ${oldKey} → ${newKey}`, 'info', { oldKey, newKey, connection: connection?.name })
  }

  logKeyAdded(keyName, connection) {
    this.log('add', `添加Key: ${keyName}`, 'info', { keyName, connection: connection?.name })
  }

  // Hash字段操作
  logHashFieldAdded(keyName, field, connection) {
    this.log('add', `添加Hash字段: ${keyName}.${field}`, 'info', { keyName, field, connection: connection?.name })
  }

  logHashFieldEdited(keyName, field, connection) {
    this.log('edit', `编辑Hash字段: ${keyName}.${field}`, 'info', { keyName, field, connection: connection?.name })
  }

  logHashFieldDeleted(keyName, field, connection) {
    this.log('delete', `删除Hash字段: ${keyName}.${field}`, 'warning', { keyName, field, connection: connection?.name })
  }

  logHashFieldsBatchDeleted(keyName, fields, connection) {
    this.log('delete', `批量删除Hash字段: ${keyName} (${fields.length}个字段)`, 'warning', { keyName, fields, connection: connection?.name })
  }

  // String值操作
  logStringValueEdited(keyName, connection) {
    this.log('edit', `编辑String值: ${keyName}`, 'info', { keyName, connection: connection?.name })
  }

  // 数据库操作
  logDatabaseSelected(database, connection) {
    this.log('query', `切换数据库: DB${database}`, 'info', { database, connection: connection?.name })
  }

  // 搜索操作
  logKeySearch(searchTerm, connection) {
    this.log('query', `搜索Key: ${searchTerm}`, 'info', { searchTerm, connection: connection?.name })
  }

  logFieldSearch(keyName, searchTerm, connection) {
    this.log('query', `搜索字段: ${keyName} - ${searchTerm}`, 'info', { keyName, searchTerm, connection: connection?.name })
  }

  // 转换规则操作
  logConversionRuleAdded(ruleName) {
    this.log('add', `添加转换规则: ${ruleName}`, 'info', { ruleName })
  }

  logConversionRuleEdited(ruleName) {
    this.log('edit', `编辑转换规则: ${ruleName}`, 'info', { ruleName })
  }

  logConversionRuleDeleted(ruleName) {
    this.log('delete', `删除转换规则: ${ruleName}`, 'warning', { ruleName })
  }

  // 导出导入操作
  logDataExported(type, filename) {
    this.log('export', `导出${type}: ${filename}`, 'info', { type, filename })
  }

  logDataImported(type, filename) {
    this.log('import', `导入${type}: ${filename}`, 'info', { type, filename })
  }

  // 错误操作
  logError(operation, error, connection = null) {
    this.log('error', `操作失败: ${operation}`, 'error', { error: error.message, operation, connection: connection?.name })
  }

  // 警告操作
  logWarning(operation, message, connection = null) {
    this.log('warning', `操作警告: ${operation} - ${message}`, 'warning', { operation, message, connection: connection?.name })
  }

  // 刷新操作
  logRefresh(type, connection = null) {
    this.log('query', `刷新${type}`, 'info', { type, connection: connection?.name })
  }

  // 复制操作
  logCopy(type, content, connection = null) {
    this.log('query', `复制${type}`, 'info', { type, contentLength: content?.length, connection: connection?.name })
  }
}

// 创建全局实例
export const operationLogger = new OperationLogger()

// 导出默认实例
export default operationLogger 