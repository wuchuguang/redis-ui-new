<template>
  <div class="shared-connections">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="$emit('refresh')">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 连接列表 -->
    <div class="connection-list">
      <el-table
        :data="connections"
        v-loading="loading"
        empty-text="暂无分享的连接"
      >
        <el-table-column prop="name" label="连接名称" min-width="150">
          <template #default="{ row }">
            <div class="connection-name">
              <span>{{ row.redis.name }}</span>
              <el-tag type="success" size="small">
                已分享
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="host" label="主机" min-width="120">
          <template #default="{ row }">
            {{ row.redis.host }}
          </template>
        </el-table-column>
        <el-table-column prop="port" label="端口" width="80">
          <template #default="{ row }">
            {{ row.redis.port }}
          </template>
        </el-table-column>
        <el-table-column prop="database" label="数据库" width="80">
          <template #default="{ row }">
            {{ row.redis.database }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="150">
          <template #default="{ row }">
            <div class="status-cell">
              <el-tag 
                :type="getStatusTagType(row)"
                size="small"
                class="status-tag"
              >
                <el-icon v-if="row.status === 'connected'"><CircleCheck /></el-icon>
                <el-icon v-else><CircleClose /></el-icon>
                {{ getStatusText(row) }}
              </el-tag>
              <div v-if="row.status === 'connected'" class="connection-details">
                <span class="detail-text">活跃</span>
              </div>
              <div v-else class="connection-details">
                <span class="detail-text">离线</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="参与者" width="120">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.participants?.length || 0 }} 人
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分享码" width="120">
          <template #default="{ row }">
            <el-button 
              type="text" 
              size="small"
              @click="copyShareCode(row)"
            >
              {{ row.shareCode || '生成分享码' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="$emit('manage-permissions', row)"
            >
              权限管理
            </el-button>
            <el-button 
              type="warning" 
              size="small" 
              @click="handleRegenerateShareCode(row)"
            >
              重新生成
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleCancelShare(row)"
            >
              取消分享
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 参与者列表对话框 -->
    <el-dialog
      v-model="showParticipantsDialog"
      title="参与者列表"
      width="600px"
      append-to-body
    >
      <div v-if="currentConnection">
        <div class="participants-header">
          <h4>连接: {{ currentConnection.redis.name }}</h4>
          <p>分享码: <span class="share-code">{{ currentConnection.shareCode }}</span></p>
        </div>
        
        <el-table :data="currentConnection.participants || []" empty-text="暂无参与者">
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="joinedAt" label="加入时间" />
          <el-table-column prop="permissions" label="权限" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button 
                type="danger" 
                size="small"
                @click="handleRevokeAccess(currentConnection, row.username)"
              >
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { useConnectionStore } from '../../stores/connection'
import { operationLogger } from '../../utils/operationLogger'

// Props
const props = defineProps({
  connections: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['refresh', 'manage-permissions', 'revoke-access'])

const connectionStore = useConnectionStore()

// 响应式数据
const showParticipantsDialog = ref(false)
const currentConnection = ref(null)

// 方法
const copyShareCode = async (connection) => {
  if (!connection.shareCode) {
    // 如果没有分享码，先生成一个
    await generateShareCode(connection)
  }
  
  try {
    await navigator.clipboard.writeText(connection.shareCode)
    ElMessage.success('分享码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const generateShareCode = async (connection) => {
  try {
    const response = await connectionStore.shareConnection(connection.id)
    if (response.success) {
      connection.shareCode = response.data.joinCode
      ElMessage.success('分享码生成成功')
    }
  } catch (error) {
    console.error('生成分享码失败:', error)
    ElMessage.error('生成分享码失败')
  }
}

const handleRegenerateShareCode = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新生成连接 "${connection.redis.name}" 的分享码吗？旧的分享码将失效。`,
      '确认重新生成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await generateShareCode(connection)
    emit('refresh')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新生成分享码失败:', error)
      ElMessage.error('重新生成分享码失败')
    }
  }
}

const handleCancelShare = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消分享连接 "${connection.redis.name}" 吗？所有参与者将失去访问权限。`,
      '确认取消分享',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await connectionStore.cancelShare(connection.id)
    if (success) {
      ElMessage.success('已取消分享')
      operationLogger.logShareCancelled(connection)
      emit('refresh')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消分享失败:', error)
      ElMessage.error('取消分享失败')
    }
  }
}

const handleRevokeAccess = async (connection, username) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除用户 "${username}" 的访问权限吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    emit('revoke-access', connection, username)
  } catch (error) {
    // 用户取消操作
  }
}

// 获取状态标签类型
const getStatusTagType = (connection) => {
  if (connection.status === 'connected') {
    return 'success'
  } else if (connection.status === 'connecting') {
    return 'warning'
  } else if (connection.status === 'reconnecting') {
    return 'warning'
  } else {
    return 'danger'
  }
}

// 获取状态文本
const getStatusText = (connection) => {
  if (connection.status === 'connected') {
    return '已连接'
  } else if (connection.status === 'connecting') {
    return '连接中...'
  } else if (connection.status === 'reconnecting') {
    return '重连中...'
  } else {
    return '未连接'
  }
}
</script>

<style scoped>
.shared-connections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-list {
  max-height: 400px;
  overflow-y: auto;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-name span {
  font-weight: 500;
}

/* 状态显示样式 */
.status-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.connection-details {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.participants-header {
  margin-bottom: 16px;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.participants-header h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.participants-header p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.share-code {
  font-family: monospace;
  font-weight: bold;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  padding: 2px 6px;
  border-radius: 4px;
}
</style> 