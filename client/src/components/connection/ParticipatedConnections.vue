<template>
  <div class="participated-connections">
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
        empty-text="暂无参与的连接"
      >
        <el-table-column prop="name" label="连接名称" min-width="150">
          <template #default="{ row }">
            <div class="connection-name">
              <span>{{ row.redis.name }}</span>
              <el-tag type="info" size="small">
                来自: {{ row.owner }}
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
                type="info"
                size="small"
                class="status-tag"
              >
                <el-icon><Setting /></el-icon>
                已配置
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权限" width="120">
          <template #default="{ row }">
            <el-tag 
              :type="getPermissionTagType(row)"
              size="small"
            >
              {{ getPermissionText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="success" 
              size="small" 
              @click="handleConnectionAction(row)"
              :loading="row.connecting"
            >
              连接
            </el-button>

            <el-button 
              type="danger" 
              size="small" 
              @click="handleLeave(row)"
            >
              退出
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, CircleCheck, CircleClose, Setting } from '@element-plus/icons-vue'
import { useConnectionStore } from '../../stores/connection'
import { useUserStore } from '../../stores/user'
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
const emit = defineEmits(['refresh', 'connect'])

const connectionStore = useConnectionStore()
const userStore = useUserStore()

// 方法
const handleConnectionAction = async (connection) => {
  await connectConnection(connection)
}

const connectConnection = async (connection) => {
  try {
    connection.connecting = true
    connection.status = 'connecting'
    
    const success = await connectionStore.connectToRedis(connection)
    if (success) {
      ElMessage.success(`连接建立成功: ${connection.redis.name}`)
      operationLogger.logConnectionConnected(connection)
      emit('connect', connection)
    }
  } catch (error) {
    console.error('建立连接失败:', error)
    ElMessage.error('建立连接失败')
  } finally {
    connection.connecting = false
  }
}

const closeConnection = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要关闭连接 "${connection.redis.name}" 吗？`,
      '确认关闭',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    connection.connecting = true
    
    const success = await connectionStore.closeConnection(connection.id)
    if (success) {
      ElMessage.success(`连接已关闭: ${connection.redis.name}`)
      operationLogger.logConnectionClosed(connection)
      emit('refresh')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('关闭连接失败:', error)
      ElMessage.error('关闭连接失败')
    }
  } finally {
    connection.connecting = false
  }
}

const handleLeave = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要退出连接 "${connection.redis.name}" 吗？退出后将无法再访问此连接。`,
      '确认退出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await connectionStore.removeParticipant(connection.id, userStore.currentUser?.username)
    if (success) {
      ElMessage.success('已退出连接')
      operationLogger.logConnectionLeft(connection)
      emit('refresh')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出连接失败:', error)
      ElMessage.error('退出连接失败')
    }
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

// 获取权限标签类型
const getPermissionTagType = (connection) => {
  // 这里可以根据实际权限级别返回不同的类型
  return 'info'
}

// 获取权限文本
const getPermissionText = (connection) => {
  // 这里可以根据实际权限返回不同的文本
  return '只读'
}

// 获取连接按钮文本
const getConnectionButtonText = (connection) => {
  if (connection.status === 'connected') {
    return '关闭'
  } else {
    return '连接'
  }
}

// 获取连接按钮类型
const getConnectionButtonType = (connection) => {
  if (connection.status === 'connected') {
    return 'info'
  } else {
    return 'success'
  }
}
</script>

<style scoped>
.participated-connections {
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
</style> 