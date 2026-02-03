<template>
  <div class="operation-history">
    <div class="history-toolbar">
      <el-select
        v-model="selectedDate"
        placeholder="选择日期"
        size="small"
        style="width: 150px"
        :loading="datesLoading"
        :disabled="datesList.length === 0"
        @change="onDateChange"
      >
        <el-option
          v-for="d in datesList"
          :key="d"
          :label="formatDateLabel(d)"
          :value="d"
        />
      </el-select>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索操作者、Key、动作..."
        clearable
        size="small"
        class="search-input"
        style="width: 200px"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="small" @click="refreshHistory" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <el-button
        type="danger"
        size="small"
        @click="clearCurrentDate"
        :disabled="!props.isOwner || !selectedDate || !hasHistory"
      >
        <el-icon><Delete /></el-icon>
        清空当日
      </el-button>
      <el-button
        type="danger"
        size="small"
        plain
        @click="clearAllHistory"
        :disabled="!props.isOwner || datesList.length === 0"
      >
        清空全部
      </el-button>
    </div>
    <div class="history-content">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="datesList.length === 0" class="empty-container">
        <el-empty description="暂无历史日期" />
      </div>
      <div v-else-if="!hasHistory" class="empty-container">
        <el-empty description="该日期暂无操作历史" />
      </div>
      
      <div v-else class="history-table-wrap">
        <div v-if="filteredHistory.length === 0" class="empty-search">
          <el-empty description="无匹配的操作记录" :image-size="60" />
        </div>
        <el-table
          v-else
          :data="filteredHistory"
          stripe
          size="small"
          max-height="380"
          class="history-table"
        >
          <el-table-column prop="timestamp" label="时间" width="165" sortable>
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="110">
            <template #default="{ row }">
              <el-tag :type="getOperationTypeColor(row.type)" size="small">
                {{ getOperationTypeText(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operator" label="操作者" width="90" />
          <el-table-column prop="details" label="详情" min-width="180">
            <template #default="{ row }">
              <span class="detail-action">{{ row.details?.action || '未知操作' }}</span>
              <span v-if="row.details" class="detail-extras">
                <template v-if="row.details.connectionName">连接:{{ row.details.connectionName }} </template>
                <template v-if="row.details.keyName">Key:{{ row.details.keyName }} </template>
                <template v-if="row.details.field">字段:{{ row.details.field }} </template>
                <template v-if="row.details.oldKey && row.details.newKey">
                  {{ row.details.oldKey }}→{{ row.details.newKey }}
                </template>
                <template v-if="row.details.searchTerm">搜索:{{ row.details.searchTerm }} </template>
                <template v-if="row.details.database !== undefined">DB{{ row.details.database }} </template>
                <template v-if="row.details.fieldsCount">字段数:{{ row.details.fieldsCount }} </template>
                <template v-if="row.details.keysCount">键数:{{ row.details.keysCount }} </template>
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete, Search } from '@element-plus/icons-vue'
import request from '../utils/http.js'

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  },
  isOwner: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const history = ref([])
const datesList = ref([])
const selectedDate = ref(null)
const loading = ref(false)
const datesLoading = ref(false)
const searchKeyword = ref('')

const hasHistory = computed(() => history.value.length > 0)

// 格式化日期显示
const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  return isToday ? `${dateStr} (今天)` : dateStr
}

// 将操作转为可搜索文本（需在 getOperationTypeText 之后定义，这里用内联映射）
const operationToSearchText = (op) => {
  const typeText = getOperationTypeText(op.type)
  const parts = [
    typeText,
    op.operator || '',
    op.details?.action || '',
    op.details?.connectionName || '',
    op.details?.keyName || '',
    op.details?.field || '',
    op.details?.oldKey || '',
    op.details?.newKey || '',
    op.details?.searchTerm || '',
    op.details?.name || '',
    op.details?.keysCount != null ? String(op.details.keysCount) : '',
    op.details?.fieldsCount != null ? String(op.details.fieldsCount) : '',
    (op.details?.valuePreview && String(op.details.valuePreview).slice(0, 100)) || ''
  ]
  return parts.join(' ').toLowerCase()
}

// 根据关键词过滤
const filteredHistory = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return history.value
  return history.value.filter((op) => operationToSearchText(op).includes(kw))
})

// 获取日期列表
const fetchDates = async () => {
  if (!props.connectionId) return
  datesLoading.value = true
  try {
    const response = await request.get(`/operations/${props.connectionId}/history/dates`)
    if (response.data.success) {
      datesList.value = response.data.data || []
      if (datesList.value.length > 0 && !selectedDate.value) {
        selectedDate.value = datesList.value[0]
      }
    }
  } catch (error) {
    console.error('获取历史日期列表失败:', error)
  } finally {
    datesLoading.value = false
  }
}

// 获取操作历史（按所选日期）
const fetchHistory = async () => {
  if (!props.connectionId) return
  loading.value = true
  try {
    const url = selectedDate.value
      ? `/operations/${props.connectionId}/history?date=${selectedDate.value}`
      : `/operations/${props.connectionId}/history`
    const response = await request.get(url)
    if (response.data.success) {
      history.value = response.data.data || []
    }
  } catch (error) {
    console.error('获取操作历史失败:', error)
  } finally {
    loading.value = false
  }
}

const onDateChange = () => {
  fetchHistory()
}

// 刷新历史（同时刷新日期列表）
const refreshHistory = async () => {
  await fetchDates()
  await fetchHistory()
}

// 清空当日历史
const clearCurrentDate = async () => {
  if (!selectedDate.value) return
  try {
    await ElMessageBox.confirm(
      `确定要清空 ${selectedDate.value} 的操作历史吗？此操作不可恢复。`,
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const response = await request.delete(
      `/operations/${props.connectionId}/history/${selectedDate.value}`
    )
    if (response.data.success) {
      history.value = []
      await fetchDates()
      if (datesList.value.length > 0) {
        selectedDate.value = datesList.value[0]
        await fetchHistory()
      } else {
        selectedDate.value = null
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空操作历史失败:', error)
    }
  }
}

// 清空全部历史
const clearAllHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日期的操作历史吗？此操作不可恢复。',
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
      datesList.value = []
      selectedDate.value = null
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
    key_value_updated: 'warning',
    keys_batch_deleted: 'danger',
    key_ttl_updated: 'info',
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
    key_value_updated: '更新键值',
    keys_batch_deleted: '批量删除Key',
    key_ttl_updated: 'TTL',
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
  refreshHistory()
})

// 暴露方法给父组件
defineExpose({
  refreshHistory
})

// 监听连接ID变化，重新获取
watch(() => props.connectionId, (newId) => {
  if (newId) {
    selectedDate.value = null
    refreshHistory()
  }
})
</script>

<style scoped>
.operation-history {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.history-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  margin-right: 4px;
}

.empty-search {
  padding: 40px 0;
}

.history-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
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

.history-table-wrap {
  height: 100%;
}

.empty-search {
  padding: 40px 0;
}

.history-table {
  width: 100%;
}

.detail-action {
  font-weight: 500;
  margin-right: 6px;
}

.detail-extras {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style> 