import axios from 'axios'
import { ElMessage } from 'element-plus'

// 开发环境直接请求后端 server（默认 3333），生产环境用相对路径 /api
const apiBaseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE
    : typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? 'http://localhost:3333/api'
      : '/api'

const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 开发环境支持测试用户
    if (process.env.NODE_ENV !== 'production') {
      const testUser = localStorage.getItem('testUser')
      if (testUser) {
        config.params = { ...config.params, test_user: testUser }
      }
    }
    
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    // 处理成功响应
    if (response.data && response.data.success && response.data.message) {
      ElMessage.success(response.data.message)
    }
    return response
  },
  (error) => {
    console.error('响应拦截器错误:', error)
    
    // 处理不同类型的错误
    if (error.response) {
      const { status, data } = error.response
      
      // 优先使用后端返回的错误消息
      if (data && data.message) {
        // 未登录时的 401 使用友好提示，避免重复弹出「访问令牌缺失」
        const isTokenMissing = status === 401 && (data.message === '访问令牌缺失' || data.message === '需要登录')
        ElMessage.error(isTokenMissing ? '请先登录' : data.message)
        if (status === 401) {
          localStorage.removeItem('userToken')
          sessionStorage.removeItem('userToken')
        }
      } else {
        // 如果没有具体消息，使用通用错误
        switch (status) {
          case 401:
            ElMessage.error('请先登录')
            localStorage.removeItem('userToken')
            sessionStorage.removeItem('userToken')
            const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/'
            if (window.location.pathname !== base && window.location.pathname !== base.replace(/\/$/, '')) {
              window.location.href = base
            }
            break
          case 403:
            ElMessage.error('权限不足')
            break
          case 404:
            ElMessage.error('请求的资源不存在')
            break
          case 500:
            ElMessage.error('服务器内部错误')
            break
          default:
            ElMessage.error('请求失败')
        }
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

// 封装常用请求方法
export const request = {
  // GET请求
  get(url, params = {}, config = {}) {
    return http.get(url, { params, ...config })
  },
  
  // POST请求
  post(url, data = {}, config = {}) {
    return http.post(url, data, config)
  },
  
  // PUT请求
  put(url, data = {}, config = {}) {
    return http.put(url, data, config)
  },
  
  // DELETE请求
  delete(url, data = {}, config = {}) {
    return http.delete(url, { data, ...config })
  },
  
  // PATCH请求
  patch(url, data = {}, config = {}) {
    return http.patch(url, data, config)
  }
}

// 导出axios实例供特殊需求使用
export { http }

// 默认导出request对象
export default request 