<template>
  <el-dialog
    v-model="dialogVisible"
    title="操作历史"
    width="900px"
    :close-on-click-modal="false"
    class="operation-history-dialog"
  >
    <div class="operation-history">
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="danger" @click="clearHistory" :disabled="!hasHistory">
          <el-icon><Delete /></el-icon>
          清空历史
        </el-button>
        <el-button type="primary" @click="exportHistory" :disabled="!hasHistory">
          <el-icon><Download /></el-icon>
          导出历史
        </el-button>
        <el-button type="info" @click="refreshHistory">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <div class="filter-section">
          <el-select v-model="filterType" placeholder="操作类型" clearable style="width: 120px;">
            <el-option label="全部" value="" />
            <el-option label="添加" value="add" />
            <el-option label="编辑" value="edit" />
            <el-option label="删除" value="delete" />
            <el-option label="连接" value="connect" />
            <el-option label="查询" value="query" />
          </el-select>
          <el-select v-model="filterLevel" placeholder="日志级别" clearable style="width: 120px;">
            <el-option label="全部" value="" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
          </el-select>
        </div>
      </div>

      <!-- 操作历史列表 -->
      <div class="history-list">
        <el-table
          :data="filteredHistory"
          v-loading="loading"
          max-height="500"
          :empty-text="emptyText"
        >
          <el-table-column prop="timestamp" label="时间" width="180" sortable>
            <template #default="{ row }">
              <span class="timestamp">{{ formatTime(row.timestamp) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag 
                :type="getTypeTagType(row.type)" 
                size="small"
              >
                {{ getTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="level" label="级别" width="80">
            <template #default="{ row }">
              <el-tag 
                :type="getLevelTagType(row.level)" 
                size="small"
              >
                {{ getLevelLabel(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="message" label="操作描述" min-width="300">
            <template #default="{ row }">
              <div class="message-content">
                <span class="message-text">{{ row.message }}</span>
                <div v-if="row.details" class="message-details">
                  <el-button 
                    type="text" 
                    size="small" 
                    @click="toggleDetails(row)"
                  >
                    {{ row.showDetails ? '隐藏详情' : '查看详情' }}
                  </el-button>
                  <div v-if="row.showDetails" class="details-content">
                    <pre>{{ JSON.stringify(row.details, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="connection" label="连接" width="120">
            <template #default="{ row }">
              <span v-if="row.connection" class="connection-name">
                {{ row.connection }}
              </span>
              <span v-else class="no-connection">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Download, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 响应式数据
const loading = ref(false)
const filterType = ref('')
const filterLevel = ref('')
const operationHistory = ref([])

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasHistory = computed(() => operationHistory.value.length > 0)

const filteredHistory = computed(() => {
  let filtered = operationHistory.value

  if (filterType.value) {
    filtered = filtered.filter(item => item.type === filterType.value)
  }

  if (filterLevel.value) {
    filtered = filtered.filter(item => item.level === filterLevel.value)
  }

  return filtered
})

const emptyText = computed(() => {
  if (operationHistory.value.length === 0) {
    return '暂无操作历史'
  }
  if (filteredHistory.value.length === 0) {
    return '没有匹配的操作记录'
  }
  return '暂无数据'
})

// 方法
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

const getTypeLabel = (type) => {
  const typeMap = {
    'add': '添加',
    'edit': '编辑',
    'delete': '删除',
    'connect': '连接',
    'query': '查询',
    'export': '导出',
    'import': '导入'
  }
  return typeMap[type] || type
}

const getTypeTagType = (type) => {
  const typeMap = {
    'add': 'success',
    'edit': 'warning',
    'delete': 'danger',
    'connect': 'primary',
    'query': 'info',
    'export': 'success',
    'import': 'info'
  }
  return typeMap[type] || 'info'
}

const getLevelLabel = (level) => {
  const levelMap = {
    'info': '信息',
    'warning': '警告',
    'error': '错误'
  }
  return levelMap[level] || level
}

const getLevelTagType = (level) => {
  const levelMap = {
    'info': 'info',
    'warning': 'warning',
    'error': 'danger'
  }
  return levelMap[level] || 'info'
}

const toggleDetails = (row) => {
  row.showDetails = !row.showDetails
}

const loadHistory = () => {
  try {
    const savedHistory = localStorage.getItem('operationHistory')
    if (savedHistory) {
      operationHistory.value = JSON.parse(savedHistory)
    }
  } catch (error) {
    console.error('加载操作历史失败:', error)
    operationHistory.value = []
  }
}

const saveHistory = () => {
  try {
    localStorage.setItem('operationHistory', JSON.stringify(operationHistory.value))
  } catch (error) {
    console.error('保存操作历史失败:', error)
  }
}

const refreshHistory = () => {
  loading.value = true
  setTimeout(() => {
    loadHistory()
    loading.value = false
  }, 300)
}

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
    
    operationHistory.value = []
    saveHistory()
    ElMessage.success('操作历史已清空')
  } catch (error) {
    // 用户取消操作
  }
}

const exportHistory = () => {
  try {
    const data = filteredHistory.value.map(item => ({
      时间: formatTime(item.timestamp),
      类型: getTypeLabel(item.type),
      级别: getLevelLabel(item.level),
      操作描述: item.message,
      连接: item.connection || '-',
      详情: item.details ? JSON.stringify(item.details, null, 2) : ''
    }))

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `操作历史_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success('操作历史已导出')
  } catch (error) {
    console.error('导出操作历史失败:', error)
    ElMessage.error('导出失败')
  }
}

// 监听对话框打开
watch(dialogVisible, (visible) => {
  if (visible) {
    loadHistory()
  }
})
</script>

<style scoped>
.operation-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.filter-section {
  display: flex;
  gap: 8px;
}

.history-list {
  max-height: 500px;
  overflow-y: auto;
}

.timestamp {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  word-break: break-all;
}

.message-details {
  margin-top: 4px;
}

.details-content {
  margin-top: 8px;
  padding: 8px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.connection-name {
  color: var(--el-color-primary);
  font-weight: 500;
}

.no-connection {
  color: var(--el-text-color-placeholder);
}

:deep(.el-table) {
  background-color: transparent;
}

:deep(.el-table th) {
  background-color: var(--el-bg-color-overlay);
}

:deep(.el-table td) {
  background-color: var(--el-bg-color);
}
</style> 