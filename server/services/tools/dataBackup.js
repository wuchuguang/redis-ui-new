const redis = require('redis')
const { promisify } = require('util')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

class DataBackupService {
  constructor() {
    this.logger = console
    this.backupDir = path.join(__dirname, '../../connections')
    this.ensureBackupDir()
  }

  // 确保备份目录存在
  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir)
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true })
    }
  }

  // 确保连接特定的备份目录存在
  async ensureConnectionBackupDir(connectionBackupDir) {
    try {
      await fs.access(connectionBackupDir)
    } catch {
      await fs.mkdir(connectionBackupDir, { recursive: true })
    }
  }

  // 开始备份
  async startBackup(connectionConfig, backupConfig) {
    // 根据备份范围确定数据库编号
    let dbNumber = 0
    if (backupConfig.scope === 'specific') {
      dbNumber = backupConfig.dbNumber || 0
    } else if (backupConfig.scope === 'current') {
      dbNumber = connectionConfig.db || 0
    }
    
    const backupId = this.generateBackupId(dbNumber)
    
    // 创建连接特定的备份目录
    const connectionBackupDir = path.join(this.backupDir, connectionConfig.id, 'backups')
    await this.ensureConnectionBackupDir(connectionBackupDir)
    
    const backupPath = path.join(connectionBackupDir, `${backupId}.json`)
    
    // 创建备份记录
    const backupRecord = {
      id: backupId,
      connectionId: connectionConfig.id,
      dbNumber: dbNumber,
      type: backupConfig.type,
      scope: backupConfig.scope,
      pattern: backupConfig.pattern,
      format: backupConfig.format,
      compress: backupConfig.compress,
      encrypt: backupConfig.encrypt,
      status: 'processing',
      createdAt: new Date().toISOString(),
      startTime: Date.now()
    }

    // 立即保存备份记录，这样前端就能立即查询到
    await this.saveBackupRecord(backupRecord)

    // 异步执行备份，不等待完成
    setImmediate(() => {
      this.executeBackup(connectionConfig, backupConfig, backupPath, backupRecord)
        .catch(error => {
          this.logger.error(`备份执行失败: ${backupId}`, error)
        })
    })
    
    return { backupId }
  }

  // 执行备份
  async executeBackup(connectionConfig, backupConfig, backupPath, backupRecord) {
    let client
    try {
      this.logger.log(`开始备份: ${backupRecord.id}`)
      
      // 创建独立的Redis客户端用于备份
      client = await this.createBackupRedisClient(connectionConfig)
      this.logger.log(`备份Redis连接成功: ${backupRecord.id}`)
      
      // 获取要备份的键
      this.logger.log(`开始扫描键: ${backupRecord.id}`)
      const keys = await this.getKeysToBackup(client, backupConfig)
      this.logger.log(`扫描完成，共找到 ${keys.length} 个键: ${backupRecord.id}`)
      
      // 更新备份记录，设置总键数
      backupRecord.totalKeys = keys.length
      await this.saveBackupRecord(backupRecord)
      this.logger.log(`更新备份记录: ${backupRecord.id}`)
      
      // 备份数据
      this.logger.log(`开始备份数据: ${backupRecord.id}`)
      const backupResult = await this.backupData(client, keys, backupConfig)
      this.logger.log(`数据备份完成: ${backupRecord.id}`)
      
      // 保存备份文件
      this.logger.log(`开始保存文件: ${backupRecord.id}`)
      await this.saveBackupFile(backupPath, backupResult.backupData, backupConfig)
      this.logger.log(`文件保存完成: ${backupRecord.id}`)
      
      // 更新备份记录
      backupRecord.status = 'completed'
      backupRecord.endTime = Date.now()
      backupRecord.duration = Math.floor((backupRecord.endTime - backupRecord.startTime) / 1000)
      backupRecord.size = await this.getFileSize(backupPath)
      backupRecord.backupKeys = backupResult.backupKeys
      backupRecord.failedKeys = backupResult.failedKeys
      
      await this.saveBackupRecord(backupRecord)
      
      this.logger.log(`备份完成: ${backupRecord.id}, 共备份 ${backupResult.backupKeys} 个键，失败 ${backupResult.failedKeys} 个键`)
      
    } catch (error) {
      this.logger.error(`备份失败: ${backupRecord.id}`, error)
      
      // 更新备份记录
      backupRecord.status = 'failed'
      backupRecord.error = error.message
      backupRecord.endTime = Date.now()
      backupRecord.duration = Math.floor((backupRecord.endTime - backupRecord.startTime) / 1000)
      
      await this.saveBackupRecord(backupRecord)
    } finally {
      if (client) {
        try {
          await client.quit()
          this.logger.log(`备份Redis连接已关闭: ${backupRecord.id}`)
        } catch (error) {
          this.logger.error(`关闭备份Redis连接失败: ${backupRecord.id}`, error)
        }
      }
    }
  }

  // 获取要备份的键
  async getKeysToBackup(client, backupConfig) {
    const { scope, pattern } = backupConfig
    
    if (scope === 'all') {
      return await this.scanAllKeys(client)
    } else if (scope === 'current') {
      return await this.scanCurrentDbKeys(client)
    } else if (scope === 'specific') {
      // 切换到指定数据库
      await client.select(backupConfig.dbNumber || 0)
      return await this.scanCurrentDbKeys(client)
    } else if (pattern && pattern.trim()) {
      return await this.scanKeysByPattern(client, pattern)
    }
    
    // 默认扫描当前数据库
    return await this.scanCurrentDbKeys(client)
  }

  // 扫描所有键
  async scanAllKeys(client) {
    const keys = []
    
    // 扫描所有数据库（0-15）
    for (let db = 0; db <= 15; db++) {
      try {
        await client.select(db)
        let cursor = 0
        
        do {
          const result = await client.scan(cursor, { COUNT: 1000 })
          cursor = result.cursor
          keys.push(...result.keys)
        } while (cursor !== 0)
      } catch (error) {
        this.logger.warn(`扫描数据库 ${db} 失败:`, error.message)
      }
    }
    
    // 切换回数据库0
    await client.select(0)
    
    return keys
  }

  // 扫描当前数据库的键
  async scanCurrentDbKeys(client) {
    const keys = []
    let cursor = 0
    
    do {
      const result = await client.scan(cursor, { COUNT: 1000 })
      cursor = result.cursor
      keys.push(...result.keys)
    } while (cursor !== 0)
    
    return keys
  }

  // 按模式扫描键
  async scanKeysByPattern(client, pattern) {
    const keys = []
    let cursor = 0
    
    do {
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: 1000 })
      cursor = result.cursor
      keys.push(...result.keys)
    } while (cursor !== 0)
    
    return keys
  }

  // 备份数据
  async backupData(client, keys, backupConfig) {
    const backupData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        totalKeys: keys.length,
        format: backupConfig.format
      },
      data: {}
    }

    let backupKeys = 0
    let failedKeys = 0

    for (const key of keys) {
      try {
        const keyData = await this.backupKey(client, key)
        backupData.data[key] = keyData
        backupKeys++
      } catch (error) {
        this.logger.error(`备份键失败: ${key}`, error)
        backupData.data[key] = {
          error: error.message,
          status: 'failed'
        }
        failedKeys++
      }
    }

    // 返回备份统计信息
    return {
      backupData,
      backupKeys,
      failedKeys
    }
  }

  // 备份单个键
  async backupKey(client, key) {
    const type = await client.type(key)
    const ttl = await client.ttl(key)
    
    let value
    switch (type) {
      case 'string':
        value = await client.get(key)
        break
      case 'hash':
        value = await client.hGetAll(key)
        break
      case 'list':
        value = await client.lRange(key, 0, -1)
        break
      case 'set':
        value = await client.sMembers(key)
        break
      case 'zset':
        value = await client.zRange(key, 0, -1, { WITHSCORES: true })
        break
      default:
        throw new Error(`不支持的数据类型: ${type}`)
    }

    return {
      type: type,
      value: value,
      ttl: ttl > 0 ? ttl : null,
      status: 'success'
    }
  }

  // 保存备份文件
  async saveBackupFile(backupPath, backupData, backupConfig) {
    let data = JSON.stringify(backupData, null, 2)
    
    // 压缩
    if (backupConfig.compress) {
      const zlib = require('zlib')
      data = await promisify(zlib.gzip)(data)
    }
    
    // 加密
    if (backupConfig.encrypt && backupConfig.password) {
      const salt = crypto.randomBytes(16)
      const key = crypto.scryptSync(backupConfig.password, salt, 32)
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      
      const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
      data = Buffer.concat([salt, iv, encrypted])
    }
    
    await fs.writeFile(backupPath, data)
  }

  // 获取备份进度
  async getBackupProgress(backupId) {
    const backupRecord = await this.getBackupRecord(backupId)
    
    if (!backupRecord) {
      throw new Error('备份记录不存在')
    }
    
    let progress = 0
    if (backupRecord.status === 'completed') {
      progress = 100
    } else if (backupRecord.status === 'failed') {
      progress = 0
    } else if (backupRecord.status === 'processing') {
      // 如果正在处理，根据时间估算进度
      const elapsed = Math.floor((Date.now() - backupRecord.startTime) / 1000)
      progress = Math.min(Math.floor(elapsed / 10), 90) // 最多90%，留10%给完成阶段
    }
    
    return {
      status: backupRecord.status,
      progress: progress,
      currentStep: this.getCurrentStep(backupRecord.status),
      processed: backupRecord.totalKeys || 0,
      total: backupRecord.totalKeys || 0,
      duration: backupRecord.duration || 0,
      estimatedTime: this.getEstimatedTime(backupRecord),
      backupKeys: backupRecord.backupKeys || 0, // 实际备份的键数量
      failedKeys: backupRecord.failedKeys || 0  // 备份失败的键数量
    }
  }

  // 获取当前步骤
  getCurrentStep(status) {
    const stepMap = {
      'pending': '等待中',
      'processing': '备份中',
      'completed': '已完成',
      'failed': '失败'
    }
    return stepMap[status] || '未知'
  }

  // 获取预计时间
  getEstimatedTime(backupRecord) {
    if (backupRecord.status === 'completed' || backupRecord.status === 'failed') {
      return '0秒'
    }
    
    if (backupRecord.duration) {
      const remaining = Math.max(0, backupRecord.duration * 2 - backupRecord.duration)
      return `${remaining}秒`
    }
    
    return '计算中...'
  }

  // 获取备份历史
  async getBackupHistory(connectionId) {
    const backupRecords = await this.getAllBackupRecords()
    const filteredRecords = backupRecords.filter(record => record.connectionId === connectionId)
    
    // 确保返回的数据包含所有必要字段
    return filteredRecords.map(record => ({
      id: record.id,
      type: record.type,
      format: record.format,
      size: record.size || 0,
      status: record.status,
      createdAt: record.createdAt,
      duration: record.duration || 0,
      totalKeys: record.totalKeys || 0,
      backupKeys: record.backupKeys || 0,
      failedKeys: record.failedKeys || 0,
      dbNumber: record.dbNumber || 0
    }))
  }

  // 下载备份
  async downloadBackup(backupId) {
    const backupRecord = await this.getBackupRecord(backupId)
    
    if (!backupRecord) {
      throw new Error('备份记录不存在')
    }
    
    const connectionBackupDir = path.join(this.backupDir, backupRecord.connectionId, 'backups')
    const backupPath = path.join(connectionBackupDir, `${backupId}.json`)
    
    try {
      await fs.access(backupPath)
    } catch {
      throw new Error('备份文件不存在')
    }
    
    return {
      path: backupPath,
      filename: `${backupId}.${backupRecord.format}`,
      size: await this.getFileSize(backupPath)
    }
  }

  // 恢复备份
  async restoreBackup(connectionConfig, backupId, restoreConfig) {
    let client
    try {
      this.logger.log(`开始恢复备份: ${backupId}`)
      
      // 创建独立的Redis客户端用于恢复
      client = await this.createBackupRedisClient(connectionConfig)
      this.logger.log(`恢复Redis连接成功: ${backupId}`)
      
      const backupData = await this.loadBackupData(backupId)
      
      if (restoreConfig.mode === 'overwrite') {
        await this.restoreOverwrite(client, backupData, restoreConfig)
      } else if (restoreConfig.mode === 'merge') {
        await this.restoreMerge(client, backupData, restoreConfig)
      }
      
      this.logger.log(`恢复完成: ${backupId}`)
      
    } catch (error) {
      this.logger.error(`恢复备份失败: ${backupId}`, error)
      throw error
    } finally {
      if (client) {
        try {
          await client.quit()
          this.logger.log(`恢复Redis连接已关闭: ${backupId}`)
        } catch (error) {
          this.logger.error(`关闭恢复Redis连接失败: ${backupId}`, error)
        }
      }
    }
  }

  // 覆盖恢复
  async restoreOverwrite(client, backupData, restoreConfig) {
    for (const [key, keyData] of Object.entries(backupData.data)) {
      if (keyData.status === 'success') {
        await this.restoreKey(client, key, keyData)
      }
    }
  }

  // 合并恢复
  async restoreMerge(client, backupData, restoreConfig) {
    for (const [key, keyData] of Object.entries(backupData.data)) {
      if (keyData.status === 'success') {
        const exists = await promisify(client.exists).bind(client)(key)
        
        if (exists && restoreConfig.conflictResolution === 'skip') {
          continue
        } else if (exists && restoreConfig.conflictResolution === 'rename') {
          const newKey = `${key}_backup_${Date.now()}`
          await this.restoreKey(client, newKey, keyData)
        } else {
          await this.restoreKey(client, key, keyData)
        }
      }
    }
  }

  // 恢复单个键
  async restoreKey(client, key, keyData) {
    const { type, value, ttl } = keyData
    
    // 删除现有键
    await client.del(key)
    
    // 设置值
    switch (type) {
      case 'string':
        await client.set(key, value)
        break
      case 'hash':
        if (Object.keys(value).length > 0) {
          await client.hSet(key, value)
        }
        break
      case 'list':
        if (value.length > 0) {
          await client.rPush(key, value)
        }
        break
      case 'set':
        if (value.length > 0) {
          await client.sAdd(key, value)
        }
        break
      case 'zset':
        if (value.length > 0) {
          const zsetData = []
          for (let i = 0; i < value.length; i += 2) {
            zsetData.push({ score: value[i + 1], value: value[i] })
          }
          await client.zAdd(key, zsetData)
        }
        break
    }
    
    // 设置过期时间
    if (ttl) {
      await client.expire(key, ttl)
    }
  }

  // 加载备份数据
  async loadBackupData(backupId) {
    const backupRecord = await this.getBackupRecord(backupId)
    
    if (!backupRecord) {
      throw new Error('备份记录不存在')
    }
    
    const connectionBackupDir = path.join(this.backupDir, backupRecord.connectionId, 'backups')
    const backupPath = path.join(connectionBackupDir, `${backupId}.json`)
    
    let data = await fs.readFile(backupPath)
    
    // 解密
    if (backupRecord.encrypt && backupRecord.password) {
      const salt = data.slice(0, 16)
      const iv = data.slice(16, 32)
      const encrypted = data.slice(32)
      
      const key = crypto.scryptSync(backupRecord.password, salt, 32)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      
      data = Buffer.concat([decipher.update(encrypted), decipher.final()])
    }
    
    // 解压
    if (backupRecord.compress) {
      const zlib = require('zlib')
      data = await promisify(zlib.gunzip)(data)
    }
    
    return JSON.parse(data.toString('utf8'))
  }

  // 删除备份
  async deleteBackup(backupId) {
    const backupRecord = await this.getBackupRecord(backupId)
    
    if (!backupRecord) {
      throw new Error('备份记录不存在')
    }
    
    const connectionBackupDir = path.join(this.backupDir, backupRecord.connectionId, 'backups')
    const backupPath = path.join(connectionBackupDir, `${backupId}.json`)
    
    try {
      await fs.unlink(backupPath)
      await this.deleteBackupRecord(backupId)
      return true
    } catch (error) {
      this.logger.error(`删除备份失败: ${backupId}`, error)
      return false
    }
  }

  // 工具方法
  generateBackupId(dbNumber = 0) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    
    return `db${dbNumber}-${year}-${month}-${day}-${hour}`
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch {
      return 0
    }
  }

  async saveBackupRecord(backupRecord) {
    // 为每个连接创建独立的记录文件
    const connectionRecordsPath = path.join(this.backupDir, backupRecord.connectionId, 'backup-records.json')
    let records = []
    
    try {
      const data = await fs.readFile(connectionRecordsPath, 'utf8')
      records = JSON.parse(data)
    } catch {
      // 文件不存在，使用空数组
    }
    
    const index = records.findIndex(r => r.id === backupRecord.id)
    if (index >= 0) {
      records[index] = backupRecord
    } else {
      records.push(backupRecord)
    }
    
    await fs.writeFile(connectionRecordsPath, JSON.stringify(records, null, 2))
  }

  async getBackupRecord(backupId) {
    const records = await this.getAllBackupRecords()
    return records.find(r => r.id === backupId)
  }

  async getAllBackupRecords() {
    const allRecords = []
    
    try {
      // 扫描所有连接目录
      const connectionDirs = await fs.readdir(this.backupDir)
      
      for (const connectionId of connectionDirs) {
        const connectionRecordsPath = path.join(this.backupDir, connectionId, 'backup-records.json')
        
        try {
          const data = await fs.readFile(connectionRecordsPath, 'utf8')
          const records = JSON.parse(data)
          allRecords.push(...records)
        } catch {
          // 文件不存在，跳过
        }
      }
    } catch {
      // 目录不存在，返回空数组
    }
    
    return allRecords
  }

  async deleteBackupRecord(backupId) {
    const backupRecord = await this.getBackupRecord(backupId)
    
    if (!backupRecord) {
      return
    }
    
    const connectionRecordsPath = path.join(this.backupDir, backupRecord.connectionId, 'backup-records.json')
    let records = []
    
    try {
      const data = await fs.readFile(connectionRecordsPath, 'utf8')
      records = JSON.parse(data)
    } catch {
      return
    }
    
    records = records.filter(r => r.id !== backupId)
    await fs.writeFile(connectionRecordsPath, JSON.stringify(records, null, 2))
  }

  // 创建Redis客户端
  async createRedisClient(connectionConfig) {
    const client = redis.createClient({
      host: connectionConfig.host,
      port: connectionConfig.port,
      password: connectionConfig.password || undefined,
      db: connectionConfig.db || 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          this.logger.error('Redis服务器拒绝连接')
          return new Error('Redis服务器拒绝连接')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          this.logger.error('重试时间超过1小时')
          return new Error('重试时间超过1小时')
        }
        if (options.attempt > 10) {
          this.logger.error('重试次数超过10次')
          return new Error('重试次数超过10次')
        }
        return Math.min(options.attempt * 100, 3000)
      }
    })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis连接超时'))
      }, 10000)

      client.on('ready', () => {
        clearTimeout(timeout)
        this.logger.log('Redis客户端连接成功')
        resolve(client)
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        this.logger.error('Redis客户端连接错误:', err)
        reject(err)
      })

      client.on('connect', () => {
        this.logger.log('正在连接Redis服务器...')
      })

      client.connect()
    })
  }

  // 创建备份专用的Redis客户端
  async createBackupRedisClient(connectionConfig) {
    const client = redis.createClient({
      host: connectionConfig.host,
      port: connectionConfig.port,
      password: connectionConfig.password || undefined,
      db: connectionConfig.db || 0,
      // 备份连接使用更长的超时时间
      socket: {
        connectTimeout: 30000, // 30秒连接超时
        commandTimeout: 60000, // 60秒命令超时
      },
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          this.logger.error('备份Redis服务器拒绝连接')
          return new Error('备份Redis服务器拒绝连接')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          this.logger.error('备份重试时间超过1小时')
          return new Error('备份重试时间超过1小时')
        }
        if (options.attempt > 10) {
          this.logger.error('备份重试次数超过10次')
          return new Error('备份重试次数超过10次')
        }
        return Math.min(options.attempt * 100, 3000)
      }
    })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('备份Redis连接超时'))
      }, 30000) // 备份连接使用30秒超时

      client.on('ready', () => {
        clearTimeout(timeout)
        this.logger.log('备份Redis客户端连接成功')
        resolve(client)
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        this.logger.error('备份Redis客户端连接错误:', err)
        reject(err)
      })

      client.on('connect', () => {
        this.logger.log('正在连接备份Redis服务器...')
      })

      client.connect()
    })
  }

  // 预览备份
  async previewBackup(connectionConfig, backupConfig) {
    let client
    try {
      this.logger.log('开始预览备份')
      
      // 创建独立的Redis客户端用于预览
      client = await this.createBackupRedisClient(connectionConfig)
      this.logger.log('预览Redis连接成功')
      
      const keys = await this.getKeysToBackup(client, backupConfig)
      
      // 估算备份大小
      let estimatedSize = 0
      for (const key of keys.slice(0, 100)) { // 只检查前100个键来估算
        try {
          const keyData = await this.backupKey(client, key)
          estimatedSize += JSON.stringify(keyData).length
        } catch (error) {
          // 忽略单个键的错误
        }
      }
      
      // 根据样本估算总大小
      if (keys.length > 100) {
        estimatedSize = Math.floor(estimatedSize * keys.length / 100)
      }
      
      this.logger.log(`预览完成，共找到 ${keys.length} 个键，估算大小 ${estimatedSize} 字节`)
      
      return {
        totalKeys: keys.length,
        estimatedSize: estimatedSize,
        sampleKeys: keys.slice(0, 10) // 返回前10个键作为样本
      }
    } catch (error) {
      this.logger.error('预览备份失败:', error)
      throw error
    } finally {
      if (client) {
        try {
          await client.quit()
          this.logger.log('预览Redis连接已关闭')
        } catch (error) {
          this.logger.error('关闭预览Redis连接失败:', error)
        }
      }
    }
  }
}

module.exports = new DataBackupService() 