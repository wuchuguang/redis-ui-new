<template>
  <div class="operation-history">
    <div class="history-header">
      <h3>操作历史</h3>
      <div class="header-actions">
        <el-button 
          type="primary" 
          size="small" 
          @click="refreshHistory"
          :loading="loading"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button 
          type="danger" 
          size="small" 
          @click="clearHistory"
          :disabled="!hasHistory"
        >
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>

    <div class="history-content">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="!hasHistory" class="empty-container">
        <el-empty description="暂无操作历史" />
      </div>
      
      <div v-else class="history-list">
        <div 
          v-for="operation in history" 
          :key="operation.id" 
          class="history-item"
        >
          <div class="operation-header">
            <div class="operation-type">
              <el-tag 
                :type="getOperationTypeColor(operation.type)"
                size="small"
              >
                {{ getOperationTypeText(operation.type) }}
              </el-tag>
            </div>
            <div class="operation-time">
              {{ formatTime(operation.timestamp) }}
            </div>
          </div>
          
          <div class="operation-details">
            <div class="operator">
              操作者: {{ operation.operator }}
            </div>
            <div class="action">
              {{ operation.details?.action || '未知操作' }}
            </div>
            <div v-if="operation.details" class="details">
              <div v-if="operation.details.connectionName" class="detail-item">
                连接: {{ operation.details.connectionName }}
              </div>
              <div v-if="operation.details.keyName" class="detail-item">
                Key: {{ operation.details.keyName }}
              </div>
              <div v-if="operation.details.field" class="detail-item">
                字段: {{ operation.details.field }}
              </div>
              <div v-if="operation.details.oldKey && operation.details.newKey" class="detail-item">
                重命名: {{ operation.details.oldKey }} → {{ operation.details.newKey }}
              </div>
              <div v-if="operation.details.searchTerm" class="detail-item">
                搜索: {{ operation.details.searchTerm }}
              </div>
              <div v-if="operation.details.database !== undefined" class="detail-item">
                数据库: DB{{ operation.details.database }}
              </div>
              <div v-if="operation.details.fieldsCount" class="detail-item">
                字段数: {{ operation.details.fieldsCount }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete } from '@element-plus/icons-vue'
import request from '../utils/http.js'

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const history = ref([])
const loading = ref(false)

const hasHistory = computed(() => history.value.length > 0)

// 获取操作历史
const fetchHistory = async () => {
  if (!props.connectionId) return
  
  loading.value = true
  try {
    const response = await request.get(`/operations/${props.connectionId}/history`)
    if (response.data.success) {
      history.value = response.data.data
    }
  } catch (error) {
    console.error('获取操作历史失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新历史
const refreshHistory = () => {
  fetchHistory()
}

// 清空历史
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有操作历史吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await request.delete(`/operations/${props.connectionId}/history`)
    if (response.data.success) {
      history.value = []
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空操作历史失败:', error)
    }
  }
}

// 获取操作类型颜色
const getOperationTypeColor = (type) => {
  const colorMap = {
    connection_created: 'success',
    connection_updated: 'warning',
    connection_deleted: 'danger',
    connection_connected: 'success',
    connection_disconnected: 'info',
    connection_reconnected: 'success',
    connection_shared: 'primary',
    key_selected: 'info',
    key_deleted: 'danger',
    key_renamed: 'warning',
    key_added: 'success',
    hash_field_added: 'success',
    hash_field_edited: 'warning',
    hash_field_deleted: 'danger',
    hash_fields_batch_deleted: 'danger',
    string_value_edited: 'warning',
    database_selected: 'info',
    key_search: 'info',
    field_search: 'info',
    history_cleared: 'danger'
  }
  return colorMap[type] || 'info'
}

// 获取操作类型文本
const getOperationTypeText = (type) => {
  const textMap = {
    connection_created: '创建连接',
    connection_updated: '更新连接',
    connection_deleted: '删除连接',
    connection_connected: '连接',
    connection_disconnected: '断开',
    connection_reconnected: '重连',
    connection_shared: '分享',
    key_selected: '选择Key',
    key_deleted: '删除Key',
    key_renamed: '重命名Key',
    key_added: '添加Key',
    hash_field_added: '添加字段',
    hash_field_edited: '编辑字段',
    hash_field_deleted: '删除字段',
    hash_fields_batch_deleted: '批量删除',
    string_value_edited: '编辑值',
    database_selected: '切换数据库',
    key_search: '搜索Key',
    field_search: '搜索字段',
    history_cleared: '清空历史'
  }
  return textMap[type] || '未知操作'
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听连接ID变化
onMounted(() => {
  fetchHistory()
})

// 暴露方法给父组件
defineExpose({
  refreshHistory
})

// 监听连接ID变化，重新获取历史
watch(() => props.connectionId, (newId) => {
  if (newId) {
    fetchHistory()
  }
})
</script>

<style scoped>
.operation-history {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  max-height: 400px;
}

.loading-container {
  padding: 20px;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background-color: #fafafa;
}

.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.operation-time {
  font-size: 12px;
  color: #909399;
}

.operation-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.operator {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.action {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.detail-item {
  font-size: 12px;
  color: #606266;
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-right: 8px;
  margin-bottom: 2px;
}
</style> 