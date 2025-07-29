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
      // 只有登录用户才从后端获取连接
      if (userStore.isLoggedIn) {
        const response = await axios.get('/api/connections')
        if (response.data.success) {
          connections.value = response.data.data
          
          // 恢复用户连接状态
          for (const conn of connections.value) {
            if (conn.status === 'disconnected') {
              try {
                await reconnect(conn.id)
              } catch (error) {
                console.error(`恢复连接失败: ${conn.name}`, error)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('获取连接列表失败:', error)
      ElMessage.error('获取连接列表失败')
    } finally {
      loading.value = false
    }
  }

  // 加载临时连接
  const loadTempConnections = () => {
    try {
      const saved = localStorage.getItem('tempConnections')
      if (saved) {
        tempConnections.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载临时连接失败:', error)
    }
  }

  // 保存临时连接
  const saveTempConnections = () => {
    try {
      // 保存完整的连接信息，包括认证信息
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
      console.error('保存临时连接失败:', error)
    }
  }

  // 合并临时连接到用户账户
  const mergeTempConnections = async () => {
    if (tempConnections.value.length === 0) return
    
    loading.value = true
    try {
      // 保存旧的临时连接信息，用于事件通知
      const oldTempConnections = [...tempConnections.value]
      
      const mergePromises = tempConnections.value.map(async (tempConn) => {
        const connectionData = {
          name: tempConn.name,
          host: tempConn.host,
          port: tempConn.port,
          password: tempConn.password, // 确保密码信息传递
          database: tempConn.database
        }
        
        const response = await axios.post('/api/connections', connectionData)
        if (response.data.success) {
          return response.data.data
        }
        return null
      })
      
      const mergedConnections = await Promise.all(mergePromises)
      const successfulMerges = mergedConnections.filter(conn => conn !== null)
      
      // 将成功合并的连接添加到正式连接列表，避免重复
      for (const mergedConn of successfulMerges) {
        const existingIndex = connections.value.findIndex(conn => 
          conn.host === mergedConn.host && 
          conn.port === mergedConn.port &&
          conn.database === mergedConn.database
        )
        
        if (existingIndex >= 0) {
          // 更新现有连接
          connections.value[existingIndex] = mergedConn
        } else {
          // 添加新连接
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
      
      ElMessage.success(`成功合并 ${successfulMerges.length} 个临时连接`)
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
    loading.value = true
    try {
      if (userStore.isLoggedIn) {
        // 登录用户：保存到后端
        const response = await axios.post('/api/connections', connectionData)
        if (response.data.success) {
          const newConnection = response.data.data
          connections.value.push(newConnection)
          
          // 自动设置为当前连接
          currentConnection.value = newConnection
          
          ElMessage.success('连接创建成功')
          return newConnection
        }
      } else {
        // 未登录用户：使用临时连接API
        const response = await axios.post('/api/connections/temp', connectionData)
        if (response.data.success) {
          const tempConnection = {
            ...response.data.data,
            isTemp: true
          }
          
          tempConnections.value.push(tempConnection)
          saveTempConnections()
          
          // 自动设置为当前连接
          currentConnection.value = tempConnection
          
          ElMessage.success('临时连接创建成功')
          return tempConnection
        }
      }
    } catch (error) {
      console.error('创建连接失败:', error)
      ElMessage.error(error.response?.data?.message || '创建连接失败')
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
        ElMessage.success('连接更新成功')
        return updatedConnection
      }
    } catch (error) {
      console.error('更新连接失败:', error)
      ElMessage.error(error.response?.data?.message || '更新连接失败')
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
        ElMessage.success('连接删除成功')
        return true
      }
    } catch (error) {
      console.error('删除连接失败:', error)
      ElMessage.error(error.response?.data?.message || '删除连接失败')
      return false
    }
  }

  // 测试连接
  const testConnection = async (connectionData) => {
    try {
      const response = await axios.post('/api/connections/test', connectionData)
      if (response.data.success) {
        ElMessage.success('连接测试成功')
        return true
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      ElMessage.error(error.response?.data?.message || '连接测试失败')
      return false
    }
  }

  // 重新连接
  const reconnect = async (connectionId) => {
    try {
      const response = await axios.post(`/api/connections/${connectionId}/reconnect`)
      if (response.data.success) {
        // 更新连接状态
        const index = connections.value.findIndex(conn => conn.id === connectionId)
        if (index > -1) {
          connections.value[index] = response.data.data
        }
        ElMessage.success('重新连接成功')
        return true
      }
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
        if (currentConnKey) {
          const updatedConn = connections.value.find(conn => 
            `${conn.host}:${conn.port}:${conn.database}` === currentConnKey
          )
          if (updatedConn) {
            console.log('更新当前连接:', {
              old: currentConnection.value?.id,
              new: updatedConn.id,
              status: updatedConn.status
            })
            currentConnection.value = updatedConn
            
            // 如果连接状态显示为已连接，进行ping检查
            if (updatedConn.status === 'connected') {
              try {
                const pingResult = await pingConnection(updatedConn.id)
                if (!pingResult) {
                  console.log('⚠️ 连接状态检查：Ping失败，连接可能已断开')
                  // 更新连接状态为断开
                  const index = connections.value.findIndex(conn => conn.id === updatedConn.id)
                  if (index >= 0) {
                    connections.value[index].status = 'disconnected'
                    currentConnection.value.status = 'disconnected'
                  }
                }
              } catch (error) {
                console.error('Ping检查失败:', error)
              }
            }
          }
        }
        
        console.log('连接状态刷新完成，连接数:', connections.value.length)
        console.log('连接状态:', connections.value.map(conn => ({
          id: conn.id,
          name: conn.name,
          status: conn.status,
          host: conn.host,
          port: conn.port
        })))
      }
    } catch (error) {
      console.error('刷新连接状态失败:', error)
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
      ElMessage.error(error.response?.data?.message || '获取键列表失败')
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
      ElMessage.error(error.response?.data?.message || '加载更多键失败')
      return null
    }
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
      ElMessage.error(error.response?.data?.message || '获取键值失败')
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
      ElMessage.error(error.response?.data?.message || '重命名键失败')
      return null
    }
  }

  // 删除键组
  const deleteKeyGroup = async (connectionId, database = 0, prefix) => {
    try {
      const response = await axios.delete(`/api/connections/${connectionId}/${database}/keys/group/${prefix}`)
      if (response.data.success) {
        ElMessage.success(response.data.message)
        return true
      }
    } catch (error) {
      console.error('删除键组失败:', error)
      ElMessage.error(error.response?.data?.message || '删除键组失败')
      return false
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
      // 如果没有已连接的，选择第一个
      currentConnection.value = allConnections[0]
      return allConnections[0]
    }
    return null
  }

  // 初始化连接状态 - 页面刷新后自动恢复
  const initializeConnections = async () => {
    try {
      // 加载临时连接
      loadTempConnections()
      
      // 只有登录用户才获取后端连接
      if (userStore.isLoggedIn) {
        await fetchConnections()
      }
      
      // 尝试从localStorage恢复当前连接
      const savedCurrentConnection = localStorage.getItem('currentConnection')
      if (savedCurrentConnection) {
        try {
          const savedConn = JSON.parse(savedCurrentConnection)
          const allConnections = getAllConnections.value
          
          // 查找匹配的连接（通过主机、端口、数据库匹配）
          const matchedConnection = allConnections.find(conn => 
            conn.host === savedConn.host && 
            conn.port === savedConn.port &&
            conn.database === savedConn.database
          )
          
          if (matchedConnection) {
            currentConnection.value = matchedConnection
            console.log(`从localStorage恢复当前连接: ${matchedConnection.name}`)
            return matchedConnection
          } else {
            console.log('保存的连接已不存在，清除localStorage')
            localStorage.removeItem('currentConnection')
          }
        } catch (error) {
          console.error('解析保存的连接失败:', error)
          localStorage.removeItem('currentConnection')
        }
      }
      
      // 自动选择连接
      const selectedConnection = autoSelectConnection()
      
      if (selectedConnection) {
        console.log(`页面刷新后自动选择连接: ${selectedConnection.name}`)
        // 保存当前连接到localStorage
        localStorage.setItem('currentConnection', JSON.stringify(selectedConnection))
      }
      
      return selectedConnection
    } catch (error) {
      console.error('初始化连接状态失败:', error)
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
    deleteHashField,
    batchDeleteHashFields,
    updateHashField,
    updateStringValue,
    getConnectionInfo,
    pingConnection,
    setCurrentConnection,
    getCurrentConnection,
    autoSelectConnection,
    initializeConnections
  }
}) 