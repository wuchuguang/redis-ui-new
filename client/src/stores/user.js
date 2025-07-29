import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref(null)
  const token = ref(localStorage.getItem('userToken') || null)
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
      // 设置axios默认headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      
      try {
        const response = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token.value}` }
        })
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
        logout()
      }
    } else {
      console.log('📝 未找到登录token')
    }
  }

  // 用户登录
  const login = async (credentials) => {
    loading.value = true
    try {
      const response = await axios.post('/api/auth/login', credentials)
      if (response.data.success) {
        const { user, token: userToken } = response.data.data
        currentUser.value = user
        token.value = userToken
        localStorage.setItem('userToken', userToken)
        
        // 设置axios默认headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
        
        return true
      } else {
        ElMessage.error(response.data.message || '登录失败')
        return false
      }
    } catch (error) {
      console.error('登录失败:', error)
      ElMessage.error(error.response?.data?.message || '登录失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户注册
  const register = async (userData) => {
    loading.value = true
    try {
      const response = await axios.post('/api/auth/register', userData)
      if (response.data.success) {
        // 注册成功后自动登录
        const { user, token: userToken } = response.data.data
        currentUser.value = user
        token.value = userToken
        localStorage.setItem('userToken', userToken)
        
        // 设置axios默认headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
        
        ElMessage.success('注册成功并自动登录')
        return true
      } else {
        ElMessage.error(response.data.message || '注册失败')
        return false
      }
    } catch (error) {
      console.error('注册失败:', error)
      ElMessage.error(error.response?.data?.message || '注册失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户登出
  const logout = () => {
    currentUser.value = null
    token.value = null
    localStorage.removeItem('userToken')
    delete axios.defaults.headers.common['Authorization']
  }

  // 更新用户资料
  const updateProfile = async (profileData) => {
    loading.value = true
    try {
      const response = await axios.put('/api/auth/profile', profileData, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (response.data.success) {
        currentUser.value = { ...currentUser.value, ...response.data.data }
        ElMessage.success('个人资料更新成功')
        return true
      } else {
        ElMessage.error(response.data.message || '更新失败')
        return false
      }
    } catch (error) {
      console.error('更新个人资料失败:', error)
      ElMessage.error(error.response?.data?.message || '更新失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  const changePassword = async (passwordData) => {
    loading.value = true
    try {
      const response = await axios.put('/api/auth/password', passwordData, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (response.data.success) {
        ElMessage.success('密码修改成功')
        return true
      } else {
        ElMessage.error(response.data.message || '密码修改失败')
        return false
      }
    } catch (error) {
      console.error('密码修改失败:', error)
      ElMessage.error(error.response?.data?.message || '密码修改失败')
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
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token.value}` }
      })
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
      const response = await axios.put(`/api/admin/users/${userId}/role`, { role }, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (response.data.success) {
        ElMessage.success('用户角色更新成功')
        return true
      } else {
        ElMessage.error(response.data.message || '更新失败')
        return false
      }
    } catch (error) {
      console.error('更新用户角色失败:', error)
      ElMessage.error(error.response?.data?.message || '更新失败')
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
      const response = await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (response.data.success) {
        ElMessage.success('用户删除成功')
        return true
      } else {
        ElMessage.error(response.data.message || '删除失败')
        return false
      }
    } catch (error) {
      console.error('删除用户失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
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