import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export const useConnectionStore = defineStore('connection', () => {
  const connections = ref([])
  const loading = ref(false)
  const currentConnection = ref(null)

  // 计算属性
  const connectedCount = computed(() => {
    return connections.value.filter(conn => conn.status === 'connected').length
  })

  const totalCount = computed(() => connections.value.length)

  // 获取所有连接
  const fetchConnections = async () => {
    loading.value = true
    try {
      const response = await axios.get('/api/connections')
      if (response.data.success) {
        connections.value = response.data.data
      }
    } catch (error) {
      console.error('获取连接列表失败:', error)
      ElMessage.error('获取连接列表失败')
    } finally {
      loading.value = false
    }
  }

  // 创建新连接
  const createConnection = async (connectionData) => {
    loading.value = true
    try {
      const response = await axios.post('/api/connections', connectionData)
      if (response.data.success) {
        const newConnection = response.data.data
        connections.value.push(newConnection)
        
        // 自动设置为当前连接
        currentConnection.value = newConnection
        
        ElMessage.success('连接创建成功')
        return newConnection
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
        // 更新连接列表，保持当前选中的连接
        const currentConnId = currentConnection.value?.id
        connections.value = response.data.data
        
        // 如果当前有选中的连接，更新其状态
        if (currentConnId) {
          const updatedConn = connections.value.find(conn => conn.id === currentConnId)
          if (updatedConn) {
            currentConnection.value = updatedConn
          }
        }
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

  // 设置当前连接
  const setCurrentConnection = (connection) => {
    currentConnection.value = connection
  }

  // 获取当前连接
  const getCurrentConnection = () => {
    return currentConnection.value
  }

  // 自动选择连接
  const autoSelectConnection = () => {
    if (connections.value.length > 0) {
      // 优先选择已连接的
      const connectedConnection = connections.value.find(conn => conn.status === 'connected')
      if (connectedConnection) {
        currentConnection.value = connectedConnection
        return connectedConnection
      }
      // 如果没有已连接的，选择第一个
      currentConnection.value = connections.value[0]
      return connections.value[0]
    }
    return null
  }

  return {
    connections,
    loading,
    currentConnection,
    connectedCount,
    totalCount,
    fetchConnections,
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
    setCurrentConnection,
    getCurrentConnection,
    autoSelectConnection
  }
}) 