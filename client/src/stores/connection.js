import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from './user'

export const useConnectionStore = defineStore('connection', () => {
  const connections = ref([])
  const tempConnections = ref([]) // 临时连接（未登录用户的连接）
  const loading = ref(false)
  const currentConnection = ref(null)
  const userStore = useUserStore()

  // 计算属性
  const connectedCount = computed(() => {
    const allConnections = [...connections.value, ...tempConnections.value]
    return allConnections.filter(conn => conn.status === 'connected').length
  })

  const totalCount = computed(() => connections.value.length + tempConnections.value.length)

  // 获取所有连接（包括临时连接）
  const getAllConnections = computed(() => {
    return [...connections.value, ...tempConnections.value]
  })

  // 检查是否有临时连接
  const hasTempConnections = computed(() => tempConnections.value.length > 0)

  // 获取所有连接
  const fetchConnections = async () => {
    loading.value = true
    try {
      // 只有登录用户才从后端获取连接配置
      if (userStore.isLoggedIn) {
        const response = await axios.get('/api/connections')
        if (response.data.success) {
          connections.value = response.data.data
        }
      }
    } catch (error) {
      console.error('获取连接配置列表失败:', error)
      ElMessage.error('获取连接配置列表失败')
    } finally {
      loading.value = false
    }
  }

  // 加载临时连接配置
  const loadTempConnections = () => {
    try {
      const saved = localStorage.getItem('tempConnections')
      if (saved) {
        tempConnections.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载临时连接配置失败:', error)
    }
  }

  // 保存临时连接配置
  const saveTempConnections = () => {
    try {
      // 保存完整的连接配置信息，包括认证信息
      const tempConnectionsData = tempConnections.value.map(conn => ({
        id: conn.id,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        password: conn.password, // 保存密码
        database: conn.database,
        status: conn.status,
        isTemp: true
      }))
      localStorage.setItem('tempConnections', JSON.stringify(tempConnectionsData))
    } catch (error) {
      console.error('保存临时连接配置失败:', error)
    }
  }

  // 合并临时连接配置到用户账户
  const mergeTempConnections = async () => {
    if (tempConnections.value.length === 0) return
    
    loading.value = true
    try {
      // 保存旧的临时连接配置信息，用于事件通知
      const oldTempConnections = [...tempConnections.value]
      
      const mergePromises = tempConnections.value.map(async (tempConn) => {
        const connectionData = {
          name: tempConn.name,
          host: tempConn.host,
          port: tempConn.port,
          password: tempConn.password, // 确保密码信息传递
          database: tempConn.database
        }
        
        try {
          const response = await axios.post('/api/connections', connectionData)
          if (response.data.success) {
            return response.data.data
          }
          return null
        } catch (error) {
          // 处理重复连接错误
          if (error.response?.status === 400 && 
              (error.response?.data?.message?.includes('已存在相同的Redis连接') || 
               error.response?.data?.message?.includes('已存在相同的Redis服务器连接'))) {
            const existingConnection = error.response.data.data?.existingConnection
            if (existingConnection) {
              console.log(`临时连接 ${tempConn.name} 与现有连接 ${existingConnection.name} 重复，跳过合并`)
              // 返回现有连接信息，以便后续处理
              return {
                ...existingConnection,
                isMerged: false, // 标记为未合并（因为已存在）
                originalTempConnection: tempConn
              }
            }
          }
          console.error(`合并临时连接 ${tempConn.name} 失败:`, error.response?.data?.message || error.message)
          return null
        }
      })
      
      const mergedConnections = await Promise.all(mergePromises)
      const successfulMerges = mergedConnections.filter(conn => conn !== null)
      const duplicateConnections = mergedConnections.filter(conn => conn && conn.isMerged === false)
      
      // 将成功合并的连接配置添加到正式连接配置列表，避免重复
      for (const mergedConn of successfulMerges) {
        if (mergedConn.isMerged === false) {
          // 这是重复连接，不需要添加到列表中
          continue
        }
        
        const existingIndex = connections.value.findIndex(conn => 
          conn.host === mergedConn.host && 
          conn.port === mergedConn.port &&
          conn.database === mergedConn.database
        )
        
        if (existingIndex >= 0) {
          // 更新现有连接配置
          connections.value[existingIndex] = mergedConn
        } else {
          // 添加新连接配置
          connections.value.push(mergedConn)
        }
      }
      
      // 如果当前连接是临时连接，更新为对应的正式连接
      if (currentConnection.value && currentConnection.value.isTemp) {
        const mergedConn = successfulMerges.find(conn => 
          conn.host === currentConnection.value.host && 
          conn.port === currentConnection.value.port &&
          conn.database === currentConnection.value.database
        )
        if (mergedConn) {
          console.log('合并时更新当前连接:', {
            id: mergedConn.id,
            host: mergedConn.host,
            port: mergedConn.port,
            database: mergedConn.database,
            isTemp: mergedConn.isTemp
          })
          currentConnection.value = mergedConn
          
          // 立即更新localStorage中的当前连接
          localStorage.setItem('currentConnection', JSON.stringify(mergedConn))
        }
      }
      
      // 清空临时连接
      tempConnections.value = []
      saveTempConnections()
      
      // 延迟刷新连接状态，确保后端处理完成
      setTimeout(async () => {
        await refreshConnectionStatus()
        
        // 通知其他组件连接已更新，需要重新获取数据
        console.log('连接合并完成，通知重新获取数据')
        // 这里可以触发一个全局事件，让其他组件知道需要重新连接
        window.dispatchEvent(new CustomEvent('connection-merged', {
          detail: {
            oldConnections: oldTempConnections,
            newConnections: successfulMerges
          }
        }))
      }, 1000)
      
      const actualMergedCount = successfulMerges.filter(conn => conn.isMerged !== false).length
      const skippedCount = duplicateConnections.length
      
      if (skippedCount > 0) {
        ElMessage.success(`成功合并 ${actualMergedCount} 个临时连接，跳过 ${skippedCount} 个重复连接`)
      } else {
        ElMessage.success(`成功合并 ${actualMergedCount} 个临时连接`)
      }
      
      return successfulMerges
    } catch (error) {
      console.error('合并临时连接失败:', error)
      ElMessage.error('合并临时连接失败')
      return []
    } finally {
      loading.value = false
    }
  }

  // 清空临时连接
  const clearTempConnections = () => {
    tempConnections.value = []
    saveTempConnections()
    ElMessage.success('临时连接已清空')
  }

  // 创建新连接
  const createConnection = async (connectionData) => {
    // 防止重复调用
    if (loading.value) {
      console.log('连接创建操作正在进行中，忽略重复调用')
      return false
    }
    
    loading.value = true
    
    try {
      // 验证连接数据
      if (!connectionData || !connectionData.name || !connectionData.host || !connectionData.port) {
        ElMessage.error('连接配置信息不完整')
        return false
      }
      
      // 根据用户登录状态选择不同的处理逻辑
      if (userStore.isLoggedIn) {
        return await createLoggedInUserConnection(connectionData)
      } else {
        return await createTempConnection(connectionData)
      }
      
          } catch (error) {
        console.error('创建连接配置失败:', error)
        return false
      } finally {
      loading.value = false
    }
  }

  // 登录用户创建连接
  const createLoggedInUserConnection = async (connectionData) => {
    try {
      const response = await axios.post('/api/connections', connectionData)
      
      if (response.data.success) {
        const newConnection = response.data.data
        connections.value.push(newConnection)
        return newConnection
      } else {
        return false
      }
    } catch (error) {
      throw error // 重新抛出错误，由上层处理
    }
  }

    // 未登录用户创建临时连接
  const createTempConnection = async (connectionData) => {
    // 检查是否已存在相同的临时连接
    const existingTempConnection = tempConnections.value.find(conn => 
      conn.host === connectionData.host &&
      conn.port === connectionData.port &&
      conn.database === (connectionData.database || 0)
    )
    
    if (existingTempConnection) {
      // 临时连接重复检查，这里需要显示消息（因为不涉及API调用）
      ElMessage.error(`已存在相同的临时连接: ${existingTempConnection.name}`)
      return false
    }
    
    // 创建临时连接对象
    const tempConnection = {
      ...connectionData,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 更安全的ID生成
      isTemp: true,
      status: 'disconnected',
      createdAt: new Date().toISOString()
    }
    
    // 添加到临时连接列表
    tempConnections.value.push(tempConnection)
    saveTempConnections()
    
    // 临时连接成功，这里需要显示消息（因为不涉及API调用）
    ElMessage.success('临时连接配置保存成功')
    return tempConnection
  }

  // 处理创建连接错误
  const handleCreateConnectionError = (error) => {
    // 处理重复连接错误
    if (error.response?.status === 400) {
      const errorMessage = error.response.data.message
      
      if (errorMessage?.includes('已存在相同的Redis连接') || 
          errorMessage?.includes('已存在相同的Redis服务器连接')) {
        
        const existingConnection = error.response.data.data?.existingConnection
        if (existingConnection) {
          ElMessage.error(`已存在相同的连接: ${existingConnection.name}`)
        } else {
          ElMessage.error(errorMessage)
        }
        return
      }
      
      // 其他400错误
      ElMessage.error(errorMessage || '连接配置无效')
      return
    }
    
    // 处理网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      ElMessage.error('无法连接到服务器，请检查网络连接')
      return
    }
    
    // 处理超时错误
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
      return
    }
    
    // 处理服务器错误
    if (error.response?.status >= 500) {
      ElMessage.error('服务器内部错误，请稍后重试')
      return
    }
    
    // 处理认证错误
    if (error.response?.status === 401) {
      ElMessage.error('用户认证失败，请重新登录')
      // 可以在这里触发重新登录逻辑
      return
    }
    
    // 处理权限错误
    if (error.response?.status === 403) {
      ElMessage.error('权限不足，无法创建连接')
      return
    }
    
    // 默认错误处理
    ElMessage.error(error.response?.data?.message || '创建连接配置失败')
  }
  
    // 建立连接
  const connectToRedis = async (connection) => {
    // 防抖机制：如果正在连接中，直接返回
    if (loading.value) {
      console.log('连接操作正在进行中，忽略重复调用')
      return false
    }
    
    loading.value = true
    try {
      console.log('开始建立Redis连接:', connection.redis?.name || connection.name)
      
      let response
      
      if (connection.isTemp) {
        // 临时连接：发送完整配置
        response = await axios.post('/api/connections/establish', {
          name: connection.name,
          host: connection.host,
          port: connection.port,
          password: connection.password,
          database: connection.database
        })
      } else if (connection.isShared) {
        // 分享连接：使用分享连接API
        response = await axios.post(`/api/connections/${connection.id}/connect-shared`)
      } else {
        // 已保存连接：只发送连接ID
        response = await axios.post(`/api/connections/${connection.id}/connect`)
      }
      
      if (response.data.success) {
        const connectedConnection = response.data.data
        
        // 移除关闭标记
        let closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
        if (closedIds.includes(connection.id)) {
          closedIds = closedIds.filter(id => id !== connection.id)
          localStorage.setItem('closedConnectionIds', JSON.stringify(closedIds))
          console.log(`移除连接 ${connection.id} 的关闭标记`)
        }
        
        // 更新连接状态
        if (connection.isTemp) {
          const index = tempConnections.value.findIndex(conn => conn.id === connection.id)
          if (index > -1) {
            tempConnections.value[index] = { ...connection, status: 'connected' }
          }
        } else {
          const index = connections.value.findIndex(conn => conn.id === connection.id)
          if (index > -1) {
            connections.value[index] = { ...connection, status: 'connected' }
          }
        }
        
        // 设置为当前连接
        currentConnection.value = { ...connection, status: 'connected' }
        
        return connectedConnection
      }
    } catch (error) {
      console.error('建立Redis连接失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新连接
  const updateConnection = async (connectionData) => {
    loading.value = true
    try {
      const response = await axios.put(`/api/connections/${connectionData.id}`, connectionData)
      if (response.data.success) {
        const updatedConnection = response.data.data
        const index = connections.value.findIndex(conn => conn.id === connectionData.id)
        if (index > -1) {
          connections.value[index] = updatedConnection
        }
        return updatedConnection
      }
    } catch (error) {
      console.error('更新连接失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 删除连接
  const deleteConnection = async (connectionId) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}`)
      if (response.data.success) {
        const index = connections.value.findIndex(conn => conn.id === connectionId)
        if (index > -1) {
          connections.value.splice(index, 1)
        }
        return true
      }
    } catch (error) {
      console.error('删除连接失败:', error)
      return false
    }
  }

  // 测试连接
  const testConnection = async (connectionData) => {
    try {
      const response = await axios.post('/api/connections/test', connectionData)
      if (response.data.success) {
        return true
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      ElMessage.error(error.response?.data?.message || '连接测试失败')
      return false
    }
  }

  // 检查是否是连接错误
  const isConnectionError = (error) => {
    // 检查是否是连接相关的错误
    const isConnectionNotFound = error.response?.status === 500 && 
                                error.response?.data?.message?.includes('连接不存在或未连接')
    
    // 检查是否是网络连接错误（后端重启等）
    const isNetworkError = error.code === 'ECONNREFUSED' || 
                          error.code === 'ENOTFOUND' ||
                          error.message?.includes('socket hang up') ||
                          error.message?.includes('connect ECONNREFUSED')
    
    // 检查是否是超时错误
    const isTimeoutError = error.code === 'ECONNABORTED' ||
                          error.message?.includes('timeout')
    
    return isConnectionNotFound || isNetworkError || isTimeoutError
  }

  // 自动重连（静默重连，不显示错误信息）
  const autoReconnect = async (connectionId) => {
    try {
      console.log('开始自动重连:', connectionId)
      
      // 查找连接配置
      const connection = connections.value.find(conn => conn.id === connectionId)
      if (!connection) {
        console.error('找不到连接配置:', connectionId)
        return false
      }
      
      // 使用新的连接建立逻辑
      const success = await connectToRedis(connection)
      if (success) {
        console.log('自动重连成功:', connectionId)
        return true
      }
      return false
    } catch (error) {
      console.error('自动重连失败:', connectionId, error.message)
      return false
    }
  }

  // 处理连接错误的通用函数
  const handleConnectionError = async (connectionId, operation, retryFunction) => {
    console.log(`检测到连接断开，尝试自动重连... (操作: ${operation})`)
    const success = await autoReconnect(connectionId)
    if (success) {
      console.log(`重连成功，重新执行操作: ${operation}`)
      return await retryFunction()
    } else {
      console.log('重连失败，停止自动重试')
      return null
    }
  }

  // 手动重新连接（显示错误信息）
  const reconnect = async (connectionId) => {
    try {
      // 查找连接配置
      const connection = connections.value.find(conn => conn.id === connectionId)
      if (!connection) {
        ElMessage.error('找不到连接配置')
        return false
      }
      
      // 使用新的连接建立逻辑
      const success = await connectToRedis(connection)
      if (success) {
        return true
      }
      return false
    } catch (error) {
      console.error('重新连接失败:', error)
      ElMessage.error(error.response?.data?.message || '重新连接失败')
      return false
    }
  }

  // 刷新连接状态
  const refreshConnectionStatus = async () => {
    try {
      const response = await axios.get('/api/connections')
      if (response.data.success) {
        // 保存当前连接的关键信息
        const currentConn = currentConnection.value
        const currentConnKey = currentConn ? `${currentConn.host}:${currentConn.port}:${currentConn.database}` : null
        
        // 更新连接列表
        connections.value = response.data.data
        
        // 如果当前有选中的连接，通过主机、端口、数据库匹配来更新
        if (currentConn) {
          const updatedConn = connections.value.find(conn => 
            conn.host === currentConn.host && 
            conn.port === currentConn.port && 
            conn.database === currentConn.database
          )
          if (updatedConn) {
            console.log('更新当前连接配置:', {
              old: currentConnection.value?.id,
              new: updatedConn.id,
              status: updatedConn.status
            })
            currentConnection.value = updatedConn
          }
        }
        
        console.log('连接配置状态刷新完成，连接数:', connections.value.length)
        console.log('连接配置状态:', connections.value.map(conn => ({
          id: conn.id,
          name: conn.name,
          status: conn.status,
          host: conn.host,
          port: conn.port
        })))
      }
    } catch (error) {
      console.error('刷新连接配置状态失败:', error)
    }
  }

  // 获取键列表
  const getKeys = async (connectionId, database = 0, pattern = '*', limit = 100) => {
    try {
      const response = await axios.get(`/api/connections/${connectionId}/${database}/keys`, {
        params: { pattern, limit }
      })
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('获取键列表失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return null
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        return await handleConnectionError(connectionId, '获取键列表', () => 
          getKeys(connectionId, database, pattern, limit)
        )
      }
      
      // 其他错误不显示给用户，静默处理
      return null
    }
  }

  // 加载更多键
  const loadMoreKeys = async (connectionId, database = 0, prefix, offset = 0, limit = 100) => {
    try {
      const response = await axios.get(`/api/connections/${connectionId}/${database}/keys`, {
        params: { prefix, offset, limit }
      })
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('加载更多键失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return null
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        return await handleConnectionError(connectionId, '加载更多键', () => 
          loadMoreKeys(connectionId, database, prefix, offset, limit)
        )
      }
      
      // 其他错误不显示给用户，静默处理
      return null
    }
  }

  // 检查连接是否已被用户关闭
  const isConnectionClosedByUser = (connectionId) => {
    let closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
    return closedIds.includes(connectionId)
  }

  // 获取键值
  const getKeyValue = async (connectionId, database = 0, keyName) => {
    try {
      const encodedKeyName = encodeURIComponent(keyName)
      const response = await axios.get(`/api/connections/${connectionId}/${database}/key/${encodedKeyName}`)
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('获取键值失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return null
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        return await handleConnectionError(connectionId, '获取键值', () => 
          getKeyValue(connectionId, database, keyName)
        )
      }
      
      // 其他错误不显示给用户，静默处理
      return null
    }
  }

  // 重命名键
  const renameKey = async (connectionId, database = 0, oldKeyName, newKeyName) => {
    try {
      const encodedOldKeyName = encodeURIComponent(oldKeyName)
      const response = await axios.put(`/api/connections/${connectionId}/${database}/key/${encodedOldKeyName}/rename`, {
        newKeyName
      })
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('重命名键失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return null
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        return await handleConnectionError(connectionId, '重命名键', () => 
          renameKey(connectionId, database, oldKeyName, newKeyName)
        )
      }
      
      ElMessage.error(error.response?.data?.message || '重命名键失败')
      return null
    }
  }

  // 删除键组
  const deleteKeyGroup = async (connectionId, database = 0, prefix) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}/${database}/keys`, {
        params: {
          pattern: `${prefix}*`
        }
      })
      
      if (response.data.success) {
        ElMessage.success(`键组 "${prefix}" 删除成功`)
        return true
      }
    } catch (error) {
      console.error('删除键组失败:', error)
      ElMessage.error(error.response?.data?.message || '删除键组失败')
      return false
    }
  }

  // 删除单个键
  const deleteKey = async (connectionId, database = 0, keyName) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}/${database}/keys`, {
        params: {
          pattern: keyName
        }
      })
      
      if (response.data.success) {
        return true
      }
    } catch (error) {
      console.error(`删除键 ${keyName} 失败:`, error)
      return false
    }
  }

  // 创建新的Key
  const createKey = async (connectionId, database = 0, keyData) => {
    try {
      const response = await axios.post(`/api/connections/${connectionId}/${database}/keys`, keyData)
      if (response.data.success) {
        console.log('Key创建成功:', keyData.name)
        return true
      } else {
        console.error('Key创建失败:', response.data.message)
        return false
      }
    } catch (error) {
      console.error('创建Key失败:', error)
      throw error
    }
  }

  // 清除Key的TTL
  const clearKeyTTL = async (connectionId, database = 0, keyName) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}/${database}/keys/${encodeURIComponent(keyName)}/ttl`)
      if (response.data.success) {
        console.log('TTL清除成功:', keyName)
        return true
      } else {
        console.error('TTL清除失败:', response.data.message)
        return false
      }
    } catch (error) {
      console.error('清除TTL失败:', error)
      throw error
    }
  }

  // 设置Key的TTL
  const setKeyTTL = async (connectionId, database = 0, keyName, ttl) => {
    try {
      const response = await axios.put(`/api/connections/${connectionId}/${database}/keys/${encodeURIComponent(keyName)}/ttl`, { ttl })
      if (response.data.success) {
        console.log('TTL设置成功:', keyName, 'TTL:', ttl)
        return true
      } else {
        console.error('TTL设置失败:', response.data.message)
        return false
      }
    } catch (error) {
      console.error('设置TTL失败:', error)
      throw error
    }
  }

  // 删除Hash字段
  const deleteHashField = async (connectionId, database = 0, keyName, field) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}/${database}/hash/${encodeURIComponent(keyName)}/field`, {
        data: { field }
      })
      if (response.data.success) {
        return true
      }
    } catch (error) {
      console.error('删除Hash字段失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return false
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        const result = await handleConnectionError(connectionId, '删除Hash字段', () => 
          deleteHashField(connectionId, database, keyName, field)
        )
        return result !== null
      }
      
      ElMessage.error(error.response?.data?.message || '删除Hash字段失败')
      return false
    }
  }

  // 批量删除Hash字段
  const batchDeleteHashFields = async (connectionId, database = 0, keyName, fields) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}/${database}/hash/${encodeURIComponent(keyName)}/fields`, {
        data: { fields }
      })
      if (response.data.success) {
        return true
      }
    } catch (error) {
      console.error('批量删除Hash字段失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return false
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        const result = await handleConnectionError(connectionId, '批量删除Hash字段', () => 
          batchDeleteHashFields(connectionId, database, keyName, fields)
        )
        return result !== null
      }
      
      ElMessage.error(error.response?.data?.message || '批量删除Hash字段失败')
      return false
    }
  }

  // 更新Hash字段
  const updateHashField = async (connectionId, database = 0, keyName, oldField, newField, value) => {
    try {
      const response = await axios.put(`/api/connections/${connectionId}/${database}/hash/${encodeURIComponent(keyName)}/field`, {
        oldField,
        newField,
        value
      })
      if (response.data.success) {
        return true
      }
    } catch (error) {
      console.error('更新Hash字段失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return false
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        const result = await handleConnectionError(connectionId, '更新Hash字段', () => 
          updateHashField(connectionId, database, keyName, oldField, newField, value)
        )
        return result !== null
      }
      
      ElMessage.error(error.response?.data?.message || '更新Hash字段失败')
      return false
    }
  }

  // 更新String值
  const updateStringValue = async (connectionId, database = 0, keyName, value) => {
    try {
      const response = await axios.put(`/api/connections/${connectionId}/${database}/string/${encodeURIComponent(keyName)}`, {
        value
      })
      if (response.data.success) {
        return true
      }
    } catch (error) {
      console.error('更新String值失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return false
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        const result = await handleConnectionError(connectionId, '更新String值', () => 
          updateStringValue(connectionId, database, keyName, value)
        )
        return result !== null
      }
      
      ElMessage.error(error.response?.data?.message || '更新String值失败')
      return false
    }
  }

  // 获取连接信息
  const getConnectionInfo = async (connectionId) => {
    try {
      const response = await axios.get(`/api/connections/${connectionId}/info`)
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('获取连接信息失败:', error)
      
      // 检查连接是否已被用户关闭
      if (isConnectionClosedByUser(connectionId)) {
        console.log(`连接 ${connectionId} 已被用户关闭，不进行自动重连`)
        return null
      }
      
      // 检查是否是连接问题
      if (isConnectionError(error)) {
        return await handleConnectionError(connectionId, '获取连接信息', () => 
          getConnectionInfo(connectionId)
        )
      }
      
      ElMessage.error('获取连接信息失败')
      return null
    }
  }

  // Ping连接
  const pingConnection = async (connectionId) => {
    try {
      const response = await axios.post(`/api/connections/${connectionId}/ping`)
      if (response.data.success) {
        return response.data.data
      }
    } catch (error) {
      console.error('Ping连接失败:', error)
      return null
    }
  }

  // 用户断开连接（不关闭Redis连接，除非没有其他用户）
  const closeConnection = async (connectionId) => {
    try {
      const response = await axios.post(`/api/connections/${connectionId}/disconnect`)
      if (response.data.success) {
        console.log('用户已断开连接:', connectionId)
        
        // 立即更新前端连接状态
        const connection = connections.value.find(conn => conn.id === connectionId)
        if (connection) {
          connection.status = 'disconnected'
          console.log(`更新连接 ${connectionId} 状态为 disconnected`)
        }
        
        // 记录到localStorage
        let closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
        if (!closedIds.includes(connectionId)) {
          closedIds.push(connectionId)
          localStorage.setItem('closedConnectionIds', JSON.stringify(closedIds))
        }
        
        // 如果当前连接就是被关闭的，清除currentConnection
        if (currentConnection.value && currentConnection.value.id === connectionId) {
          currentConnection.value = null
          localStorage.removeItem('currentConnection')
        }
        
        return true
      }
    } catch (error) {
      console.error('断开连接失败:', error)
      return false
    }
  }

  // 分享连接
  const shareConnection = async (connectionId) => {
    try {
      const response = await axios.post(`/api/connections/${connectionId}/share`)
      return response.data
    } catch (error) {
      console.error('分享连接失败:', error)
      throw error
    }
  }

  // 加入分享的连接
  const joinSharedConnection = async (joinCode) => {
    try {
      const response = await axios.post('/api/connections/join', { joinCode })
      return response.data
    } catch (error) {
      console.error('加入分享连接失败:', error)
      throw error
    }
  }

  // 设置当前连接
  const setCurrentConnection = (connection) => {
    currentConnection.value = connection
    // 同时更新localStorage
    if (connection) {
      localStorage.setItem('currentConnection', JSON.stringify(connection))
    } else {
      localStorage.removeItem('currentConnection')
    }
  }

  // 获取当前连接
  const getCurrentConnection = () => {
    return currentConnection.value
  }

  // 自动选择连接
  const autoSelectConnection = () => {
    const allConnections = getAllConnections.value
    
    if (allConnections.length > 0) {
      // 优先选择已连接的
      const connectedConnection = allConnections.find(conn => conn.status === 'connected')
      if (connectedConnection) {
        currentConnection.value = connectedConnection
        return connectedConnection
      }
      // 如果没有已连接的，选择第一个（但不会自动建立连接）
      currentConnection.value = allConnections[0]
      return allConnections[0]
    }
    return null
  }

  // 初始化连接时，跳过已关闭的连接
  const initializeConnections = async () => {
    try {
      loadTempConnections()
      if (userStore.isLoggedIn) {
        await fetchConnections()
      }
      // 获取关闭ID列表
      let closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
      
      // 恢复当前连接
      const savedCurrentConnection = localStorage.getItem('currentConnection')
      if (savedCurrentConnection) {
        try {
          const savedConn = JSON.parse(savedCurrentConnection)
          const allConnections = getAllConnections.value
          // 跳过已关闭的连接
          const matchedConnection = allConnections.find(conn =>
            conn.redis.host === savedConn.host &&
            conn.redis.port === savedConn.port &&
            conn.redis.database === savedConn.database &&
            !closedIds.includes(conn.id)
          )
          if (matchedConnection) {
            currentConnection.value = matchedConnection
            console.log(`从localStorage恢复当前连接配置: ${matchedConnection.redis.name}`)
            return matchedConnection
          } else {
            console.log('保存的连接配置已不存在或已被关闭，清除localStorage')
            localStorage.removeItem('currentConnection')
            currentConnection.value = null
          }
        } catch (error) {
          console.error('解析保存的连接失败:', error)
          localStorage.removeItem('currentConnection')
          currentConnection.value = null
        }
      }
      
      // 不自动选择连接，让用户手动选择
      // 这样可以避免自动连接已关闭的连接
      console.log('页面刷新完成，等待用户手动选择连接')
      return null
    } catch (error) {
      console.error('初始化连接配置状态失败:', error)
      return null
    }
  }

  return {
    connections,
    tempConnections,
    loading,
    currentConnection,
    connectedCount,
    totalCount,
    getAllConnections,
    hasTempConnections,
    fetchConnections,
    loadTempConnections,
    saveTempConnections,
    mergeTempConnections,
    clearTempConnections,
    createConnection,
    connectToRedis,
    updateConnection,
    deleteConnection,
    testConnection,
    reconnect,
    refreshConnectionStatus,
    getKeys,
    loadMoreKeys,
    getKeyValue,
    renameKey,
    deleteKeyGroup,
    deleteKey,
    createKey,
    clearKeyTTL,
    setKeyTTL,
    deleteHashField,
    batchDeleteHashFields,
    updateHashField,
    updateStringValue,
    getConnectionInfo,
    pingConnection,
    closeConnection,
    shareConnection,
    joinSharedConnection,
    setCurrentConnection,
    getCurrentConnection,
    autoSelectConnection,
    initializeConnections,
    autoReconnect
  }
}) 