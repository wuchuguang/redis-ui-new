<template>
  <div class="my-connections">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="showNewConnection">
        <el-icon><Plus /></el-icon>
        新建连接
      </el-button>
      <el-button type="success" @click="showJoinDialog = true">
        <el-icon><Share /></el-icon>
        加入分享
      </el-button>
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
                  empty-text="暂无连接，点击新建连接开始使用"
      >
        <el-table-column prop="name" label="连接名称" min-width="150">
          <template #default="{ row }">
            <div class="connection-name">
              <span>{{ row.redis.name }}</span>
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
        <el-table-column label="操作" width="280" fixed="right">
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
              type="warning" 
              size="small" 
              @click="$emit('edit', row)"
            >
              编辑
            </el-button>
            <el-button 
              type="primary" 
              size="small" 
              @click="$emit('share', row)"
            >
              分享
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 加入分享对话框 -->
    <el-dialog
      v-model="showJoinDialog"
      title="加入分享连接"
      width="400px"
      append-to-body
    >
      <el-form
        ref="joinFormRef"
        :model="joinForm"
        :rules="joinRules"
        label-width="100px"
      >
        <el-form-item label="分享码" prop="joinCode">
          <el-input 
            v-model="joinForm.joinCode" 
            placeholder="请输入分享码"
            style="text-transform: uppercase;"
            @keyup.enter="joinSharedConnection"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">取消</el-button>
        <el-button type="primary" @click="joinSharedConnection" :loading="joining">加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Share, Refresh, CircleCheck, CircleClose, Setting } from '@element-plus/icons-vue'
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
const emit = defineEmits(['refresh', 'connect', 'edit', 'delete', 'share', 'new-connection'])

const connectionStore = useConnectionStore()

// 响应式数据
const showJoinDialog = ref(false)
const joining = ref(false)

const joinForm = reactive({
  joinCode: ''
})

const joinRules = {
  joinCode: [
    { required: true, message: '请输入分享码', trigger: 'blur' },
    { min: 8, max: 8, message: '分享码长度为8位', trigger: 'blur' }
  ]
}

// 方法
const showNewConnection = () => {
  // 触发父组件显示新建连接对话框
  emit('new-connection')
}

const handleConnectionAction = async (connection) => {
  await connectConnection(connection)
}

const connectConnection = async (connection) => {
  try {
    connection.connecting = true
    connection.status = 'connecting'
    
    // 只通过事件通知父组件处理连接，避免重复调用
    emit('connect', connection)
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

const handleDelete = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除连接 "${connection.redis.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    emit('delete', connection)
  } catch (error) {
    // 用户取消删除
  }
}

const joinSharedConnection = async () => {
  const joinFormRef = ref()
  
  try {
    await joinFormRef.value.validate()
    joining.value = true
    
    const response = await connectionStore.joinSharedConnection(joinForm.joinCode.toUpperCase())
    if (response.success) {
      ElMessage.success('成功加入分享的连接')
      showJoinDialog.value = false
      joinForm.joinCode = ''
      emit('refresh')
      operationLogger.logConnectionJoined(response.data.connection)
      emit('connect', response.data.connection)
    }
  } catch (error) {
    console.error('加入分享连接失败:', error)
    ElMessage.error(error.response?.data?.message || '加入分享连接失败')
  } finally {
    joining.value = false
  }
}

// 获取状态标签类型
const getStatusTagType = (connection) => {
  return 'info'
}

// 获取状态文本
const getStatusText = (connection) => {
  return '已配置'
}

// 获取连接按钮文本
const getConnectionButtonText = (connection) => {
  return '连接'
}

// 获取连接按钮类型
const getConnectionButtonType = (connection) => {
  return 'success'
}
</script>

<style scoped>
.my-connections {
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