<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="admin-title">管理后台</h1>
    </div>

    <!-- 未登录或非管理员：只显示提示，不跳转 -->
    <div v-if="!userStore.isLoggedIn" class="admin-tip">
      <el-empty description="请使用管理员账号登录">
        <template #description>
          <p>请使用右上角登录管理员账号后刷新本页</p>
        </template>
      </el-empty>
    </div>
    <div v-else-if="!userStore.isAdmin" class="admin-tip">
      <el-empty description="需要管理员权限">
        <template #description>
          <p>当前账号无管理员权限，请使用管理员账号登录</p>
        </template>
      </el-empty>
    </div>

    <!-- 管理员：用户管理 + Redis 连接管理 -->
    <el-tabs v-else v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="用户管理" name="users">
        <div class="tab-header">
          <el-button type="primary" @click="loadUsers" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="users"
          stripe
          style="width: 100%"
          class="data-table"
        >
          <el-table-column prop="username" label="用户名" min-width="120" />
          <el-table-column prop="role" label="角色" width="120">
            <template #default="{ row }">
              <el-select
                v-model="row.role"
                size="small"
                :disabled="row.id === currentUserId"
                @change="(val) => handleRoleChange(row, val)"
              >
                <el-option label="管理员" value="admin" />
                <el-option label="普通用户" value="user" />
                <el-option label="访客" value="guest" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="id" label="用户 ID" min-width="280" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button
                type="danger"
                size="small"
                :disabled="row.id === currentUserId"
                @click="handleDeleteUser(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="Redis 连接管理" name="connections">
        <div class="tab-header">
          <el-button type="primary" @click="loadConnections" :loading="connectionsLoading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <el-table
          v-loading="connectionsLoading"
          :data="connections"
          stripe
          style="width: 100%"
          class="data-table"
        >
          <el-table-column prop="name" label="连接名称" min-width="120" />
          <el-table-column prop="host" label="主机" min-width="140" />
          <el-table-column prop="port" label="端口" width="80" />
          <el-table-column prop="database" label="DB" width="60" />
          <el-table-column prop="owner" label="所有者" min-width="100" />
          <el-table-column label="参与者" min-width="120">
            <template #default="{ row }">
              {{ (row.participants || []).join(', ') || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="密码" width="70">
            <template #default="{ row }">
              {{ row.hasPassword ? '已设置' : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" size="small" @click="handleDeleteConnection(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import request from '../utils/http.js'

const userStore = useUserStore()

const activeTab = ref('users')
const users = ref([])
const loading = ref(false)
const connections = ref([])
const connectionsLoading = ref(false)

const currentUserId = computed(() => userStore.currentUser?.id ?? null)

const loadUsers = async () => {
  if (!userStore.isAdmin) {
    ElMessage.error('需要管理员权限')
    return
  }
  loading.value = true
  try {
    const list = await userStore.getUsers()
    users.value = list ?? []
  } finally {
    loading.value = false
  }
}

const loadConnections = async () => {
  if (!userStore.isAdmin) return
  connectionsLoading.value = true
  try {
    const res = await request.get('/admin/connections')
    if (res.data?.success) {
      connections.value = res.data.data ?? []
    } else {
      connections.value = []
    }
  } catch (err) {
    connections.value = []
  } finally {
    connectionsLoading.value = false
  }
}

const handleRoleChange = async (row, newRole) => {
  const ok = await userStore.updateUserRole(row.id, newRole)
  if (ok) {
    ElMessage.success('角色已更新')
  } else {
    ElMessage.error('更新失败')
    await loadUsers()
  }
}

const handleDeleteUser = async (row) => {
  if (row.id === currentUserId.value) {
    ElMessage.warning('不能删除自己')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${row.username}」吗？此操作不可恢复。`,
      '删除用户',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  const ok = await userStore.deleteUser(row.id)
  if (ok) {
    ElMessage.success('用户已删除')
    await loadUsers()
  } else {
    ElMessage.error('删除失败')
  }
}

const handleDeleteConnection = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除连接「${row.name}」（${row.host}:${row.port}）吗？此操作不可恢复。`,
      '删除连接',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  try {
    const res = await request.delete(`/admin/connections/${row.id}`)
    if (res.data?.success) {
      ElMessage.success('连接已删除')
      await loadConnections()
    } else {
      ElMessage.error(res.data?.message || '删除失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}

onMounted(async () => {
  if (userStore.isAdmin) {
    await loadUsers()
  }
})
</script>

<style scoped>
.admin-page {
  padding: 24px;
  background-color: var(--app-bg);
  color: var(--app-text);
  min-height: calc(100vh - 56px);
}
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.admin-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.admin-tabs {
  margin-top: 8px;
}
.tab-header {
  margin-bottom: 16px;
}
.data-table {
  background-color: var(--el-bg-color-overlay);
}
.admin-tip {
  padding: 48px 24px;
  text-align: center;
}
.admin-tip p {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
}
</style>
