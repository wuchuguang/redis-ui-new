import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: 'Redis 管理' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { title: '用户管理', requireAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory('/web/'),
  routes
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title + ' - Redis 管理工具'
  }
  // 访问管理后台时先恢复用户状态，权限判断在 Admin.vue 内做，不再在此重定向
  if (to.meta.requireAdmin) {
    const userStore = useUserStore()
    await userStore.initializeUser()
  }
  next()
})

export default router
