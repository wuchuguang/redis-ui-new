import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '../utils/http.js'
import { ElMessage } from 'element-plus'

export const useOperationHistoryStore = defineStore('operationHistory', () => {
  const history = ref([])
  const total = ref(0)
  const loading = ref(false)
  const rollbackLoading = ref(false)

  // 计算属性
  const hasHistory = computed(() => history.value.length > 0)
  const recentHistory = computed(() => history.value.slice(0, 10))

  // 获取操作历史
  const fetchHistory = async (params = {}) => {
    loading.value = true
    try {
      const response = await request.get('/operations/history', params)
      if (response.data.success) {
        history.value = response.data.data.list
        total.value = response.data.data.total
      }
    } catch (error) {
      console.error('获取操作历史失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 添加操作记录
  const addOperation = async (operationData) => {
    try {
      const response = await request.post('/operations', operationData)
      if (response.data.success) {
        // 刷新历史记录
        await fetchHistory()
        return true
      }
      return false
    } catch (error) {
      console.error('添加操作记录失败:', error)
      return false
    }
  }

  // 回滚操作
  const rollbackOperation = async (operationId) => {
    rollbackLoading.value = true
    try {
      const response = await request.post(`/operations/${operationId}/rollback`)
      if (response.data.success) {
        // 刷新历史记录
        await fetchHistory()
        return true
      }
      return false
    } catch (error) {
      console.error('操作回滚失败:', error)
      return false
    } finally {
      rollbackLoading.value = false
    }
  }

  // 获取操作详情
  const getOperationDetails = async (operationId) => {
    try {
      const response = await request.get(`/operations/${operationId}`)
      if (response.data.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('获取操作详情失败:', error)
      return null
    }
  }

  // 删除操作记录
  const deleteOperation = async (operationId) => {
    try {
      const response = await request.delete(`/operations/${operationId}`)
      if (response.data.success) {
        // 刷新历史记录
        await fetchHistory()
        return true
      }
      return false
    } catch (error) {
      console.error('删除操作记录失败:', error)
      return false
    }
  }

  // 批量删除操作记录
  const batchDeleteOperations = async (operationIds) => {
    try {
      const response = await request.delete('/operations/batch', { operationIds })
      if (response.data.success) {
        // 刷新历史记录
        await fetchHistory()
        return true
      }
      return false
    } catch (error) {
      console.error('批量删除操作记录失败:', error)
      return false
    }
  }

  // 清空操作历史
  const clearHistory = async () => {
    try {
      const response = await request.delete('/operations/clear')
      if (response.data.success) {
        history.value = []
        total.value = 0
        return true
      }
      return false
    } catch (error) {
      console.error('清空操作历史失败:', error)
      return false
    }
  }

  // 导出操作历史
  const exportHistory = async (format = 'json') => {
    try {
      const response = await request.get('/operations/export', { format }, { responseType: 'blob' })
      
      // 创建下载链接
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `operation_history_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('导出操作历史成功')
      return true
    } catch (error) {
      console.error('导出操作历史失败:', error)
      ElMessage.error('导出操作历史失败')
      return false
    }
  }

  // 导入操作历史
  const importHistory = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await request.post('/operations/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (response.data.success) {
        ElMessage.success('导入操作历史成功')
        // 刷新历史记录
        await fetchHistory()
        return true
      } else {
        ElMessage.error(response.data.message || '导入操作历史失败')
        return false
      }
    } catch (error) {
      console.error('导入操作历史失败:', error)
      ElMessage.error(error.response?.data?.message || '导入操作历史失败')
      return false
    }
  }

  // 搜索操作历史
  const searchHistory = async (searchParams) => {
    loading.value = true
    try {
      const response = await request.get('/operations/search', searchParams)
      if (response.data.success) {
        history.value = response.data.data.list
        total.value = response.data.data.total
      }
    } catch (error) {
      console.error('搜索操作历史失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取操作统计
  const getOperationStats = async () => {
    try {
      const response = await request.get('/operations/stats')
      if (response.data.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('获取操作统计失败:', error)
      return null
    }
  }

  // 检查操作是否可回滚
  const checkRollbackable = (operation) => {
    // 检查操作类型是否支持回滚
    const rollbackableTypes = ['add', 'edit', 'delete', 'rename']
    if (!rollbackableTypes.includes(operation.type)) {
      return false
    }
    
    // 检查是否有操作前数据
    if (!operation.beforeData) {
      return false
    }
    
    // 检查操作时间是否在可回滚范围内（比如7天内）
    const operationTime = new Date(operation.timestamp).getTime()
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    
    return (now - operationTime) <= sevenDays
  }

  // 初始化
  const initialize = async () => {
    await fetchHistory()
  }

  return {
    // 状态
    history,
    total,
    loading,
    rollbackLoading,
    
    // 计算属性
    hasHistory,
    recentHistory,
    
    // 方法
    fetchHistory,
    addOperation,
    rollbackOperation,
    getOperationDetails,
    deleteOperation,
    batchDeleteOperations,
    clearHistory,
    exportHistory,
    importHistory,
    searchHistory,
    getOperationStats,
    checkRollbackable,
    initialize
  }
}) 