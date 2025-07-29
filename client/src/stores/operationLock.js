import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export const useOperationLockStore = defineStore('operationLock', () => {
  const lockedOperations = ref([])
  const myLocks = ref([])
  const pollingInterval = ref(null)
  const loading = ref(false)

  // 计算属性
  const hasActiveLocks = computed(() => lockedOperations.value.length > 0)
  const myActiveLocks = computed(() => myLocks.value.length > 0)

  // 开始轮询
  const startPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
    }
    
    // 立即获取一次
    fetchLocks()
    
    // 每5秒轮询一次
    pollingInterval.value = setInterval(() => {
      fetchLocks()
    }, 5000)
  }

  // 停止轮询
  const stopPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }

  // 获取所有锁
  const fetchLocks = async () => {
    try {
      const response = await axios.get('/api/locks')
      if (response.data.success) {
        lockedOperations.value = response.data.data
      }
    } catch (error) {
      console.error('获取操作锁失败:', error)
    }
  }

  // 获取我的锁
  const fetchMyLocks = async () => {
    try {
      const response = await axios.get('/api/locks/my')
      if (response.data.success) {
        myLocks.value = response.data.data
      }
    } catch (error) {
      console.error('获取我的操作锁失败:', error)
    }
  }

  // 检查冲突
  const checkConflict = (action, target) => {
    const conflict = lockedOperations.value.find(lock => 
      lock.target === target && 
      lock.action !== action &&
      !isExpired(lock)
    )
    return conflict || null
  }

  // 检查是否过期
  const isExpired = (lock) => {
    const now = Date.now()
    const lockTime = new Date(lock.startTime).getTime()
    return (now - lockTime) > lock.timeout
  }

  // 获取操作锁
  const acquireLock = async (action, target, timeout = 30000) => {
    loading.value = true
    try {
      const response = await axios.post('/api/locks', {
        action,
        target,
        timeout
      })
      
      if (response.data.success) {
        const lock = response.data.data
        // 添加到我的锁列表
        myLocks.value.push(lock)
        // 刷新所有锁
        await fetchLocks()
        return lock.id
      } else {
        ElMessage.error(response.data.message || '获取操作锁失败')
        return false
      }
    } catch (error) {
      console.error('获取操作锁失败:', error)
      ElMessage.error(error.response?.data?.message || '获取操作锁失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 强制获取锁
  const forceAcquireLock = async (action, target, timeout = 30000) => {
    loading.value = true
    try {
      const response = await axios.post('/api/locks/force', {
        action,
        target,
        timeout
      })
      
      if (response.data.success) {
        const lock = response.data.data
        // 添加到我的锁列表
        myLocks.value.push(lock)
        // 刷新所有锁
        await fetchLocks()
        return lock.id
      } else {
        ElMessage.error(response.data.message || '强制获取操作锁失败')
        return false
      }
    } catch (error) {
      console.error('强制获取操作锁失败:', error)
      ElMessage.error(error.response?.data?.message || '强制获取操作锁失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 释放操作锁
  const releaseLock = async (lockId) => {
    try {
      const response = await axios.delete(`/api/locks/${lockId}`)
      if (response.data.success) {
        // 从我的锁列表中移除
        const index = myLocks.value.findIndex(lock => lock.id === lockId)
        if (index > -1) {
          myLocks.value.splice(index, 1)
        }
        // 刷新所有锁
        await fetchLocks()
        return true
      } else {
        ElMessage.error(response.data.message || '释放操作锁失败')
        return false
      }
    } catch (error) {
      console.error('释放操作锁失败:', error)
      ElMessage.error(error.response?.data?.message || '释放操作锁失败')
      return false
    }
  }

  // 释放所有我的锁
  const releaseAllMyLocks = async () => {
    try {
      const response = await axios.delete('/api/locks/my/all')
      if (response.data.success) {
        myLocks.value = []
        await fetchLocks()
        return true
      } else {
        ElMessage.error(response.data.message || '释放所有操作锁失败')
        return false
      }
    } catch (error) {
      console.error('释放所有操作锁失败:', error)
      ElMessage.error(error.response?.data?.message || '释放所有操作锁失败')
      return false
    }
  }

  // 延长锁时间
  const extendLock = async (lockId, timeout) => {
    try {
      const response = await axios.put(`/api/locks/${lockId}/extend`, { timeout })
      if (response.data.success) {
        // 更新我的锁列表
        const lock = myLocks.value.find(l => l.id === lockId)
        if (lock) {
          lock.timeout = timeout
        }
        // 刷新所有锁
        await fetchLocks()
        return true
      } else {
        ElMessage.error(response.data.message || '延长操作锁失败')
        return false
      }
    } catch (error) {
      console.error('延长操作锁失败:', error)
      ElMessage.error(error.response?.data?.message || '延长操作锁失败')
      return false
    }
  }

  // 清理过期锁
  const cleanupExpiredLocks = async () => {
    try {
      const response = await axios.post('/api/locks/cleanup')
      if (response.data.success) {
        await fetchLocks()
        return true
      }
      return false
    } catch (error) {
      console.error('清理过期锁失败:', error)
      return false
    }
  }

  // 获取锁统计信息
  const getLockStats = async () => {
    try {
      const response = await axios.get('/api/locks/stats')
      if (response.data.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('获取锁统计信息失败:', error)
      return null
    }
  }

  // 监听锁变化
  const watchLock = (lockId, callback) => {
    const checkLock = () => {
      const lock = lockedOperations.value.find(l => l.id === lockId)
      if (!lock || isExpired(lock)) {
        callback(null)
        return
      }
      callback(lock)
    }
    
    // 立即检查一次
    checkLock()
    
    // 设置定时检查
    const interval = setInterval(checkLock, 1000)
    
    // 返回清理函数
    return () => {
      clearInterval(interval)
    }
  }

  // 初始化
  const initialize = async () => {
    await fetchLocks()
    await fetchMyLocks()
    startPolling()
  }

  // 清理
  const cleanup = () => {
    stopPolling()
    releaseAllMyLocks()
  }

  return {
    // 状态
    lockedOperations,
    myLocks,
    loading,
    
    // 计算属性
    hasActiveLocks,
    myActiveLocks,
    
    // 方法
    startPolling,
    stopPolling,
    fetchLocks,
    fetchMyLocks,
    checkConflict,
    isExpired,
    acquireLock,
    forceAcquireLock,
    releaseLock,
    releaseAllMyLocks,
    extendLock,
    cleanupExpiredLocks,
    getLockStats,
    watchLock,
    initialize,
    cleanup
  }
}) 