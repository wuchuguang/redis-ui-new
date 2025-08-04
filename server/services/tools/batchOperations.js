const redis = require('redis')
const { promisify } = require('util')

class BatchOperationsService {
  constructor() {
    this.logger = console
  }

  // 解析脚本命令
  parseScript(script) {
    const commands = []
    const lines = script.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 跳过空行和注释
      if (!line || line.startsWith('#')) {
        continue
      }
      
      // 解析命令
      const parts = line.split(/\s+/)
      const command = parts[0].toLowerCase()
      
      switch (command) {
        case 'del':
          if (parts.length < 2) {
            throw new Error(`第${i + 1}行: del命令需要指定键名或模式`)
          }
          commands.push({
            type: 'del',
            target: parts[1],
            line: i + 1,
            original: line
          })
          break
          
        case 'expire':
          if (parts.length < 3) {
            throw new Error(`第${i + 1}行: expire命令需要指定键名和过期时间`)
          }
          const ttl = parseInt(parts[2])
          if (isNaN(ttl) || ttl < 0) {
            throw new Error(`第${i + 1}行: 过期时间必须是正整数`)
          }
          commands.push({
            type: 'expire',
            target: parts[1],
            ttl: ttl,
            line: i + 1,
            original: line
          })
          break
          
        case 'rename':
          if (parts.length < 3) {
            throw new Error(`第${i + 1}行: rename命令需要指定原键名和新键名`)
          }
          commands.push({
            type: 'rename',
            target: parts[1],
            newKey: parts[2],
            line: i + 1,
            original: line
          })
          break
          
        case 'move':
          if (parts.length < 3) {
            throw new Error(`第${i + 1}行: move命令需要指定键名和目标数据库`)
          }
          const db = parseInt(parts[2])
          if (isNaN(db) || db < 0 || db > 15) {
            throw new Error(`第${i + 1}行: 数据库编号必须是0-15之间的整数`)
          }
          commands.push({
            type: 'move',
            target: parts[1],
            targetDb: db,
            line: i + 1,
            original: line
          })
          break
          
        case 'type':
          if (parts.length < 2) {
            throw new Error(`第${i + 1}行: type命令需要指定键名`)
          }
          commands.push({
            type: 'type',
            target: parts[1],
            line: i + 1,
            original: line
          })
          break
          
        case 'ttl':
          if (parts.length < 2) {
            throw new Error(`第${i + 1}行: ttl命令需要指定键名`)
          }
          commands.push({
            type: 'ttl',
            target: parts[1],
            line: i + 1,
            original: line
          })
          break
          
        default:
          throw new Error(`第${i + 1}行: 不支持的命令 '${command}'`)
      }
    }
    
    return commands
  }

  // 执行批量操作
  async executeBatchOperation(connectionConfig, operationConfig) {
    const client = await this.createRedisClient(connectionConfig)
    
    try {
      const { script, mode } = operationConfig
      
      // 解析脚本
      const commands = this.parseScript(script)
      
      const results = {
        total: commands.length,
        processed: 0,
        success: 0,
        failed: 0,
        commands: []
      }

      // 执行每个命令
      for (const command of commands) {
        try {
          const result = await this.executeCommand(client, command, mode)
          results.commands.push({
            command: command.original,
            target: command.target,
            status: 'success',
            result: result,
            message: '执行成功'
          })
          results.success++
        } catch (error) {
          results.commands.push({
            command: command.original,
            target: command.target,
            status: 'failed',
            result: null,
            message: error.message
          })
          results.failed++
        }
        results.processed++
      }

      return results
    } finally {
      await client.quit()
    }
  }

  // 执行单个命令
  async executeCommand(client, command, mode) {
    // 如果是预览模式，只返回模拟结果
    if (mode === 'preview') {
      return this.previewCommand(command)
    }
    
    // 如果是试运行模式，检查命令是否有效但不实际执行
    if (mode === 'dry-run') {
      return await this.validateCommand(client, command)
    }
    
    // 实际执行模式
    switch (command.type) {
      case 'del':
        return await this.executeDel(client, command)
      case 'expire':
        return await this.executeExpire(client, command)
      case 'rename':
        return await this.executeRename(client, command)
      case 'move':
        return await this.executeMove(client, command)
      case 'type':
        return await this.executeType(client, command)
      case 'ttl':
        return await this.executeTtl(client, command)
      default:
        throw new Error(`不支持的命令类型: ${command.type}`)
    }
  }

  // 预览命令
  previewCommand(command) {
    switch (command.type) {
      case 'del':
        return `将删除键: ${command.target}`
      case 'expire':
        return `将设置键 ${command.target} 的过期时间为 ${command.ttl} 秒`
      case 'rename':
        return `将重命名键 ${command.target} 为 ${command.newKey}`
      case 'move':
        return `将移动键 ${command.target} 到数据库 ${command.targetDb}`
      case 'type':
        return `将获取键 ${command.target} 的类型`
      case 'ttl':
        return `将获取键 ${command.target} 的过期时间`
      default:
        return '未知命令'
    }
  }

  // 验证命令
  async validateCommand(client, command) {
    switch (command.type) {
      case 'del':
      case 'expire':
      case 'rename':
      case 'move':
      case 'type':
      case 'ttl':
        // 检查键是否存在
        const exists = await promisify(client.exists).bind(client)(command.target)
        if (!exists) {
          throw new Error(`键不存在: ${command.target}`)
        }
        return `验证通过: ${command.target} 存在`
      default:
        throw new Error(`不支持的命令类型: ${command.type}`)
    }
  }

  // 执行删除命令
  async executeDel(client, command) {
    if (command.target.includes('*')) {
      // 模式匹配，需要扫描键
      const keys = await this.scanKeys(client, command.target)
      const deletedCount = 0
      
      for (const key of keys) {
        await promisify(client.del).bind(client)(key)
        deletedCount++
      }
      
      return `删除了 ${deletedCount} 个匹配的键`
    } else {
      // 单个键
      const result = await promisify(client.del).bind(client)(command.target)
      return result > 0 ? '删除成功' : '键不存在'
    }
  }

  // 执行过期时间命令
  async executeExpire(client, command) {
    const result = await promisify(client.expire).bind(client)(command.target, command.ttl)
    return result > 0 ? `设置过期时间成功: ${command.ttl}秒` : '键不存在'
  }

  // 执行重命名命令
  async executeRename(client, command) {
    await promisify(client.rename).bind(client)(command.target, command.newKey)
    return `重命名为: ${command.newKey}`
  }

  // 执行移动命令
  async executeMove(client, command) {
    const result = await promisify(client.move).bind(client)(command.target, command.targetDb)
    return result > 0 ? `移动到数据库 ${command.targetDb} 成功` : '移动失败'
  }

  // 执行类型命令
  async executeType(client, command) {
    const type = await promisify(client.type).bind(client)(command.target)
    return `类型: ${type}`
  }

  // 执行TTL命令
  async executeTtl(client, command) {
    const ttl = await promisify(client.ttl).bind(client)(command.target)
    if (ttl === -1) {
      return '永不过期'
    } else if (ttl === -2) {
      return '键不存在'
    } else {
      return `剩余时间: ${ttl}秒`
    }
  }

  // 扫描键（用于模式匹配）
  async scanKeys(client, pattern) {
    const keys = []
    let cursor = 0
    
    do {
      const result = await promisify(client.scan).bind(client)(cursor, 'MATCH', pattern, 'COUNT', 1000)
      cursor = parseInt(result[0])
      keys.push(...result[1])
    } while (cursor !== 0)
    
    return keys
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

module.exports = new BatchOperationsService() 