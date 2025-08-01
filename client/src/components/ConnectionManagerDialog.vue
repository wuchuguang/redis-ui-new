<template>
  <el-dialog
    v-model="dialogVisible"
    title="连接管理"
    width="1000px"
    :close-on-click-modal="false"
  >
    <div class="connection-manager">
      <!-- Tab导航 -->
      <el-tabs v-model="activeTab" class="connection-tabs">
        <el-tab-pane label="我的连接" name="my">
          <MyConnections 
            :connections="myConnections"
            :loading="loading"
            @refresh="refreshConnections"
            @connect="handleConnect"
            @edit="handleEdit"
            @delete="handleDelete"
            @share="handleShare"
            @new-connection="showNewConnectionDialog = true"
          />
        </el-tab-pane>
        
        <el-tab-pane label="参与的连接" name="participated">
          <ParticipatedConnections 
            :connections="participatedConnections"
            :loading="loading"
            @refresh="refreshConnections"
            @connect="handleConnect"
          />
        </el-tab-pane>
        
        <el-tab-pane label="分享管理" name="shared">
          <SharedConnections 
            :connections="sharedConnections"
            :loading="loading"
            @refresh="refreshConnections"
            @manage-permissions="handleManagePermissions"
            @revoke-access="handleRevokeAccess"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 新建连接对话框 -->
    <NewConnectionDialog 
      v-model="showNewConnectionDialog"
      @connection-created="handleConnectionCreated"
    />

    <!-- 编辑连接对话框 -->
    <EditConnectionDialog 
      v-model="showEditDialog"
      :connection="editingConnection"
      @connection-updated="handleConnectionUpdated"
    />

    <!-- 分享连接对话框 -->
    <ShareConnectionDialog 
      v-model="showShareDialog"
      :connection="sharingConnection"
      @share-created="handleShareCreated"
    />

    <!-- 权限管理对话框 -->
    <PermissionManagerDialog 
      v-model="showPermissionDialog"
      :connection="permissionConnection"
      @permissions-updated="handlePermissionsUpdated"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useConnectionStore } from '../stores/connection'
import { useUserStore } from '../stores/user'
import { operationLogger } from '../utils/operationLogger'
import MyConnections from './connection/MyConnections.vue'
import ParticipatedConnections from './connection/ParticipatedConnections.vue'
import SharedConnections from './connection/SharedConnections.vue'
import NewConnectionDialog from './connection/NewConnectionDialog.vue'
import EditConnectionDialog from './connection/EditConnectionDialog.vue'
import ShareConnectionDialog from './connection/ShareConnectionDialog.vue'
import PermissionManagerDialog from './connection/PermissionManagerDialog.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'connection-selected', 'connection-deleted', 'connection-updated'])

const connectionStore = useConnectionStore()
const userStore = useUserStore()

// 响应式数据
const activeTab = ref('my')
const loading = ref(false)
const connections = ref([])

// 对话框状态
const showNewConnectionDialog = ref(false)
const showEditDialog = ref(false)
const showShareDialog = ref(false)
const showPermissionDialog = ref(false)

// 当前操作的连接
const editingConnection = ref(null)
const sharingConnection = ref(null)
const permissionConnection = ref(null)

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 按类型分类的连接
const myConnections = computed(() => {
  return connections.value.filter(conn => conn.owner === userStore.currentUser?.username)
})

const participatedConnections = computed(() => {
  return connections.value.filter(conn => conn.owner !== userStore.currentUser?.username && conn.participants?.includes(userStore.currentUser?.username))
})

const sharedConnections = computed(() => {
  return connections.value.filter(conn => conn.owner === userStore.currentUser?.username && conn.participants?.length > 0)
})

// 方法
const refreshConnections = async () => {
  loading.value = true
  try {
    await connectionStore.fetchConnections()
    connections.value = connectionStore.connections
  } catch (error) {
    console.error('刷新连接列表失败:', error)
    ElMessage.error('刷新连接列表失败')
  } finally {
    loading.value = false
  }
}

const handleConnect = async (connection) => {
  try {
    const success = await connectionStore.connectToRedis(connection)
    if (success) {
      ElMessage.success(`连接建立成功: ${connection.redis.name}`)
      emit('connection-selected', connection)
      dialogVisible.value = false
    }
  } catch (error) {
    console.error('建立连接失败:', error)
    ElMessage.error('建立连接失败')
  }
}

const handleEdit = (connection) => {
  editingConnection.value = connection
  showEditDialog.value = true
}

const handleDelete = async (connection) => {
  try {
    const success = await connectionStore.deleteConnection(connection.id)
    if (success) {
      ElMessage.success('连接删除成功')
      emit('connection-deleted', connection.id)
      await refreshConnections()
    }
  } catch (error) {
    console.error('删除连接失败:', error)
    ElMessage.error('删除连接失败')
  }
}

const handleShare = (connection) => {
  sharingConnection.value = connection
  showShareDialog.value = true
}

const handleManagePermissions = (connection) => {
  permissionConnection.value = connection
  showPermissionDialog.value = true
}

const handleRevokeAccess = async (connection, username) => {
  try {
    const success = await connectionStore.removeParticipant(connection.id, username)
    if (success) {
      ElMessage.success(`已移除用户 ${username} 的访问权限`)
      await refreshConnections()
    }
  } catch (error) {
    console.error('移除用户权限失败:', error)
    ElMessage.error('移除用户权限失败')
  }
}

const handleConnectionCreated = async (connection) => {
  ElMessage.success('连接创建成功')
  await refreshConnections()
}

const handleConnectionUpdated = async (connection) => {
  ElMessage.success('连接更新成功')
  emit('connection-updated', connection)
  await refreshConnections()
}

const handleShareCreated = async (shareInfo) => {
  ElMessage.success('分享创建成功')
  await refreshConnections()
}

const handlePermissionsUpdated = async (permissions) => {
  ElMessage.success('权限更新成功')
  await refreshConnections()
}

// 监听对话框打开
watch(dialogVisible, (visible) => {
  if (visible) {
    refreshConnections()
  }
})
</script>

<style scoped>
.connection-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.connection-tabs {
  min-height: 400px;
}

:deep(.el-tabs__content) {
  padding: 16px 0;
}

:deep(.el-tab-pane) {
  min-height: 350px;
}
</style> 