const fs = require('fs').promises
const path = require('path')

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, 'redis-config.json')
    this.config = {
      connections: []
    }
  }

  // 加载配置文件
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8')
      this.config = JSON.parse(data)
      console.log('Redis配置加载成功')
      return this.config
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，创建默认配置
        console.log('Redis配置文件不存在，创建默认配置')
        await this.saveConfig()
        return this.config
      }
      console.error('加载Redis配置失败:', error.message)
      throw error
    }
  }

  // 保存配置文件
  async saveConfig() {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
      console.log('Redis配置保存成功')
    } catch (error) {
      console.error('保存Redis配置失败:', error.message)
      throw error
    }
  }

  // 获取所有连接
  getConnections() {
    return this.config.connections
  }

  // 添加连接
  async addConnection(connection) {
    // 检查连接名称是否已存在
    const existingIndex = this.config.connections.findIndex(conn => conn.name === connection.name)
    
    if (existingIndex > -1) {
      // 更新现有连接
      this.config.connections[existingIndex] = {
        ...this.config.connections[existingIndex],
        ...connection,
        updatedAt: new Date().toISOString()
      }
      console.log(`更新Redis连接: ${connection.name}`)
    } else {
      // 添加新连接
      this.config.connections.push({
        ...connection,
        id: connection.id || this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      console.log(`添加Redis连接: ${connection.name}`)
    }
    
    await this.saveConfig()
    return this.config.connections
  }

  // 删除连接
  async removeConnection(connectionId) {
    const index = this.config.connections.findIndex(conn => conn.id === connectionId)
    
    if (index > -1) {
      const connection = this.config.connections[index]
      this.config.connections.splice(index, 1)
      await this.saveConfig()
      console.log(`删除Redis连接: ${connection.name}`)
      return true
    }
    
    return false
  }

  // 更新连接
  async updateConnection(connectionId, updates) {
    const index = this.config.connections.findIndex(conn => conn.id === connectionId)
    
    if (index > -1) {
      this.config.connections[index] = {
        ...this.config.connections[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      await this.saveConfig()
      console.log(`更新Redis连接: ${this.config.connections[index].name}`)
      return this.config.connections[index]
    }
    
    return null
  }

  // 根据ID获取连接
  getConnectionById(connectionId) {
    return this.config.connections.find(conn => conn.id === connectionId)
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 验证连接配置
  validateConnection(connection) {
    const errors = []
    
    if (!connection.name || connection.name.trim() === '') {
      errors.push('连接名称不能为空')
    }
    
    if (!connection.host || connection.host.trim() === '') {
      errors.push('主机地址不能为空')
    }
    
    if (!connection.port || connection.port < 1 || connection.port > 65535) {
      errors.push('端口号必须在1-65535之间')
    }
    
    if (connection.database < 0 || connection.database > 15) {
      errors.push('数据库编号必须在0-15之间')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = ConfigManager 