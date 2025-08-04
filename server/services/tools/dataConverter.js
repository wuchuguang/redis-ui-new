const redis = require('redis')
const { promisify } = require('util')

class DataConverterService {
  constructor() {
    this.logger = console
  }

  // 批量转换数据
  async batchConvert(connectionConfig, convertConfig) {
    const client = await this.createRedisClient(connectionConfig)
    
    try {
      const { keys, convertType } = convertConfig
      const results = []

      for (const key of keys) {
        try {
          const result = await this.convertKey(client, key, convertType)
          results.push({
            key: key,
            originalType: result.originalType,
            status: 'success',
            message: result.message
          })
        } catch (error) {
          results.push({
            key: key,
            originalType: 'unknown',
            status: 'failed',
            message: `转换失败: ${error.message}`
          })
        }
      }

      return { results }
    } finally {
      await client.quit()
    }
  }

  // 转换单个键
  async convertKey(client, key, convertType) {
    const type = await promisify(client.type).bind(client)(key)
    let value

    // 获取键的值
    switch (type) {
      case 'string':
        value = await promisify(client.get).bind(client)(key)
        break
      case 'hash':
        value = await promisify(client.hgetall).bind(client)(key)
        break
      case 'list':
        value = await promisify(client.lrange).bind(client)(key, 0, -1)
        break
      case 'set':
        value = await promisify(client.smembers).bind(client)(key)
        break
      case 'zset':
        value = await promisify(client.zrange).bind(client)(key, 0, -1, 'WITHSCORES')
        break
      default:
        throw new Error(`不支持的数据类型: ${type}`)
    }

    // 根据转换类型进行转换
    let convertedValue
    let message

    switch (convertType) {
      case 'json-format':
        convertedValue = this.formatJson(value)
        message = 'JSON格式化完成'
        break
      case 'base64-decode':
        convertedValue = this.decodeBase64(value)
        message = 'Base64解码完成'
        break
      case 'timestamp-convert':
        convertedValue = this.convertTimestamp(value)
        message = '时间戳转换完成'
        break
      default:
        throw new Error(`不支持的转换类型: ${convertType}`)
    }

    // 更新键的值
    await this.updateKeyValue(client, key, type, convertedValue)

    return {
      originalType: type,
      message: message
    }
  }

  // JSON格式化
  formatJson(value) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        // 如果不是JSON，尝试转换为JSON字符串
        return JSON.stringify(value)
      }
    } else {
      return JSON.stringify(value, null, 2)
    }
  }

  // Base64解码
  decodeBase64(value) {
    if (typeof value === 'string') {
      try {
        return Buffer.from(value, 'base64').toString('utf8')
      } catch {
        throw new Error('无效的Base64编码')
      }
    } else {
      throw new Error('只能对字符串进行Base64解码')
    }
  }

  // 时间戳转换
  convertTimestamp(value) {
    if (typeof value === 'string') {
      const timestamp = parseInt(value)
      if (isNaN(timestamp)) {
        throw new Error('无效的时间戳')
      }
      return new Date(timestamp).toISOString()
    } else {
      throw new Error('只能对字符串进行时间戳转换')
    }
  }

  // 更新键的值
  async updateKeyValue(client, key, type, value) {
    switch (type) {
      case 'string':
        await promisify(client.set).bind(client)(key, value)
        break
      case 'hash':
        // 对于Hash类型，尝试解析JSON并设置字段
        try {
          const hashData = JSON.parse(value)
          if (typeof hashData === 'object' && hashData !== null) {
            await promisify(client.del).bind(client)(key)
            if (Object.keys(hashData).length > 0) {
              await promisify(client.hmset).bind(client)(key, hashData)
            }
          }
        } catch {
          // 如果不是JSON，直接设置整个值
          await promisify(client.del).bind(client)(key)
          await promisify(client.hset).bind(client)(key, 'value', value)
        }
        break
      case 'list':
        // 对于List类型，尝试解析JSON数组
        try {
          const listData = JSON.parse(value)
          if (Array.isArray(listData)) {
            await promisify(client.del).bind(client)(key)
            if (listData.length > 0) {
              await promisify(client.rpush).bind(client)(key, listData)
            }
          }
        } catch {
          // 如果不是JSON数组，将值作为单个元素
          await promisify(client.del).bind(client)(key)
          await promisify(client.rpush).bind(client)(key, value)
        }
        break
      case 'set':
        // 对于Set类型，尝试解析JSON数组
        try {
          const setData = JSON.parse(value)
          if (Array.isArray(setData)) {
            await promisify(client.del).bind(client)(key)
            if (setData.length > 0) {
              await promisify(client.sadd).bind(client)(key, setData)
            }
          }
        } catch {
          // 如果不是JSON数组，将值作为单个元素
          await promisify(client.del).bind(client)(key)
          await promisify(client.sadd).bind(client)(key, value)
        }
        break
      case 'zset':
        // 对于ZSet类型，保持原有结构
        this.logger.warn('ZSet类型暂不支持自动转换，保持原有值')
        break
    }
  }

  // 创建Redis客户端
  async createRedisClient(connectionConfig) {
    const client = redis.createClient({
      host: connectionConfig.host,
      port: connectionConfig.port,
      password: connectionConfig.password,
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
      client.on('ready', () => {
        this.logger.log('Redis客户端连接成功')
        resolve(client)
      })

      client.on('error', (err) => {
        this.logger.error('Redis客户端连接错误:', err)
        reject(err)
      })

      client.on('connect', () => {
        this.logger.log('正在连接Redis服务器...')
      })
    })
  }
}

module.exports = new DataConverterService() 