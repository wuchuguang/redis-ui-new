import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '../utils/http.js'
import { ElMessage } from 'element-plus'



export const useUserStore = defineStore('user', () => {
  const currentUser = ref(null)
  const token = ref(sessionStorage.getItem('userToken') || localStorage.getItem('userToken') || null)
  const loading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!currentUser.value && !!token.value)
  const userRole = computed(() => currentUser.value?.role || 'guest')
  const isAdmin = computed(() => userRole.value === 'admin')
  const isUser = computed(() => userRole.value === 'user')
  const isGuest = computed(() => userRole.value === 'guest')

  // 权限检查
  const hasPermission = (permission) => {
    if (!currentUser.value) return false
    
    const permissions = {
      'admin': ['read', 'write', 'delete', 'manage_users', 'manage_connections'],
      'user': ['read', 'write', 'delete'],
      'guest': ['read']
    }
    
    return permissions[userRole.value]?.includes(permission) || false
  }

  // 检查操作权限
  const canRead = computed(() => hasPermission('read'))
  const canWrite = computed(() => hasPermission('write'))
  const canDelete = computed(() => hasPermission('delete'))
  const canManageUsers = computed(() => hasPermission('manage_users'))
  const canManageConnections = computed(() => hasPermission('manage_connections'))

  // 初始化用户状态
  const initializeUser = async () => {
    if (token.value) {
      try {
        const response = await request.get('/auth/profile')
        if (response.data.success) {
          currentUser.value = response.data.data
          console.log('✅ 用户状态恢复成功:', currentUser.value.username)
        } else {
          // Token无效，清除本地存储
          console.log('❌ Token无效，清除登录状态')
          logout()
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        
        // 根据错误类型决定是否清除token
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('⚠️ Token可能已过期，尝试刷新...')
          // 尝试刷新token
          const refreshSuccess = await refreshToken()
          if (refreshSuccess) {
            // 刷新成功，重新获取用户信息
            try {
              const retryResponse = await request.get('/auth/profile')
              if (retryResponse.data.success) {
                currentUser.value = retryResponse.data.data
                console.log('✅ Token刷新后用户状态恢复成功:', currentUser.value.username)
                return
              }
            } catch (retryError) {
              console.error('Token刷新后获取用户信息失败:', retryError)
            }
          }
          // 刷新失败，清除登录状态
          console.log('❌ Token刷新失败，清除登录状态')
          logout()
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
          console.log('⚠️ 网络连接失败，保留token等待重连')
          // 网络错误时不清除token，等待重连
        } else {
          console.log('❌ 其他错误，清除登录状态')
          logout()
        }
      }
    } else {
      console.log('📝 未找到登录token')
    }
  }

  // 用户登录
  const login = async (credentials) => {
    loading.value = true
    try {
      const response = await request.post('/auth/login', credentials)
      if (response.data.success) {
        const { user, token: userToken } = response.data.data
        currentUser.value = user
        token.value = userToken
        
        // 根据记住登录状态设置token存储
        if (credentials.rememberLogin) {
          // 记住登录状态：token存localStorage
          localStorage.setItem('userToken', userToken)
          sessionStorage.removeItem('userToken')
        } else {
          // 不记住登录状态：token存sessionStorage
          sessionStorage.setItem('userToken', userToken)
          localStorage.removeItem('userToken')
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('登录失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户注册
  const register = async (userData) => {
    loading.value = true
    try {
      const response = await request.post('/auth/register', userData)
      if (response.data.success) {
        // 注册成功后自动登录
        const { user, token: userToken } = response.data.data
        currentUser.value = user
        token.value = userToken
        
        // 注册后默认使用持久化存储（记住登录状态）
        localStorage.setItem('userToken', userToken)
        sessionStorage.removeItem('userToken')
        
        return true
      }
      return false
    } catch (error) {
      console.error('注册失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 刷新token
  const refreshToken = async () => {
    if (!token.value) return false
    
    try {
      const response = await request.post('/auth/refresh-token')
      
      if (response.data.success) {
        const newToken = response.data.data.token
        token.value = newToken
        
        // 更新存储中的token
        if (sessionStorage.getItem('userToken')) {
          sessionStorage.setItem('userToken', newToken)
        } else if (localStorage.getItem('userToken')) {
          localStorage.setItem('userToken', newToken)
        }
        
        console.log('✅ Token刷新成功')
        return true
      }
    } catch (error) {
      console.error('Token刷新失败:', error)
      // 刷新失败，清除登录状态
      logout()
      return false
    }
    
    return false
  }

  // 用户登出
  const logout = () => {
    currentUser.value = null
    token.value = null
    localStorage.removeItem('userToken')
    sessionStorage.removeItem('userToken')
  }

  // 更新用户资料
  const updateProfile = async (profileData) => {
    loading.value = true
    try {
      const response = await request.put('/auth/profile', profileData)
      if (response.data.success) {
        currentUser.value = { ...currentUser.value, ...response.data.data }
        return true
      }
      return false
    } catch (error) {
      console.error('更新个人资料失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  const changePassword = async (passwordData) => {
    loading.value = true
    try {
      const response = await request.put('/auth/password', passwordData)
      if (response.data.success) {
        return true
      }
      return false
    } catch (error) {
      console.error('密码修改失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取用户列表（管理员功能）
  const getUsers = async () => {
    if (!canManageUsers.value) {
      ElMessage.error('权限不足')
      return []
    }
    
    try {
      const response = await request.get('/admin/users')
      if (response.data.success) {
        return response.data.data
      }
      return []
    } catch (error) {
      console.error('获取用户列表失败:', error)
      return []
    }
  }

  // 更新用户角色（管理员功能）
  const updateUserRole = async (userId, role) => {
    if (!canManageUsers.value) {
      ElMessage.error('权限不足')
      return false
    }
    
    try {
      const response = await request.put(`/admin/users/${userId}/role`, { role })
      if (response.data.success) {
        return true
      }
      return false
    } catch (error) {
      console.error('更新用户角色失败:', error)
      return false
    }
  }

  // 删除用户（管理员功能）
  const deleteUser = async (userId) => {
    if (!canManageUsers.value) {
      ElMessage.error('权限不足')
      return false
    }
    
    try {
      const response = await request.delete(`/admin/users/${userId}`)
      if (response.data.success) {
        return true
      }
      return false
    } catch (error) {
      console.error('删除用户失败:', error)
      return false
    }
  }

  return {
    // 状态
    currentUser,
    token,
    loading,
    
    // 计算属性
    isLoggedIn,
    userRole,
    isAdmin,
    isUser,
    isGuest,
    canRead,
    canWrite,
    canDelete,
    canManageUsers,
    canManageConnections,
    
    // 方法
    initializeUser,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasPermission,
    getUsers,
    updateUserRole,
    deleteUser
  }
}) 