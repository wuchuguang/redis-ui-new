<template>
  <div class="operation-rollback">
    <!-- 操作历史按钮 -->
    <el-button
      v-if="showHistoryButton"
      type="info"
      size="small"
      @click="showHistoryDialog = true"
      :icon="Clock"
    >
      操作历史
    </el-button>

    <!-- 操作历史对话框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="操作历史"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="history-toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索操作..."
          style="width: 200px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="filterType" placeholder="操作类型" style="width: 150px" clearable>
          <el-option label="全部" value="" />
          <el-option label="添加" value="add" />
          <el-option label="编辑" value="edit" />
          <el-option label="删除" value="delete" />
          <el-option label="重命名" value="rename" />
        </el-select>
        
        <el-button type="primary" @click="refreshHistory" :loading="loading">
          刷新
        </el-button>
      </div>

      <el-table
        :data="filteredHistory"
        style="width: 100%"
        max-height="400"
        v-loading="loading"
      >
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="target" label="操作对象" min-width="150">
          <template #default="{ row }">
            <span class="target-text">{{ row.target }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="userName" label="操作者" width="100">
          <template #default="{ row }">
            <el-avatar :size="24" :src="row.userAvatar">
              {{ row.userName?.charAt(0)?.toUpperCase() }}
            </el-avatar>
            <span style="margin-left: 8px">{{ row.userName }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="canRollback" label="可回滚" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.canRollback" type="success" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.canRollback"
              type="warning"
              size="small"
              @click="handleRollback(row)"
              :loading="row.rollbackLoading"
            >
              回滚
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="showDetails(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="history-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-dialog>

    <!-- 操作详情对话框 -->
    <el-dialog
      v-model="showDetailsDialog"
      title="操作详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedOperation" class="operation-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getTypeTagType(selectedOperation.type)">
              {{ getTypeLabel(selectedOperation.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">
            {{ formatTime(selectedOperation.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="操作者">
            {{ selectedOperation.userName }}
          </el-descriptions-item>
          <el-descriptions-item label="操作对象">
            {{ selectedOperation.target }}
          </el-descriptions-item>
          <el-descriptions-item label="可回滚" :span="2">
            <el-tag v-if="selectedOperation.canRollback" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="details-section">
          <h4>操作前数据</h4>
          <el-input
            v-model="selectedOperation.beforeData"
            type="textarea"
            :rows="4"
            readonly
            placeholder="无数据"
          />
        </div>

        <div class="details-section">
          <h4>操作后数据</h4>
          <el-input
            v-model="selectedOperation.afterData"
            type="textarea"
            :rows="4"
            readonly
            placeholder="无数据"
          />
        </div>

        <div class="details-section">
          <h4>备注</h4>
          <el-input
            v-model="selectedOperation.remark"
            type="textarea"
            :rows="2"
            readonly
            placeholder="无备注"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 回滚确认对话框 -->
    <el-dialog
      v-model="showRollbackDialog"
      title="确认回滚"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="rollback-confirm">
        <el-icon class="rollback-icon"><Warning /></el-icon>
        <div class="rollback-message">
          <h4>确定要回滚此操作吗？</h4>
          <p>回滚操作将撤销当前操作，恢复到操作前的状态。此操作不可逆。</p>
          <div class="rollback-details">
            <p><strong>操作类型：</strong>{{ getTypeLabel(rollbackOperation?.type) }}</p>
            <p><strong>操作对象：</strong>{{ rollbackOperation?.target }}</p>
            <p><strong>操作时间：</strong>{{ formatTime(rollbackOperation?.timestamp) }}</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRollbackDialog = false">取消</el-button>
          <el-button
            type="warning"
            @click="confirmRollback"
            :loading="rollbackLoading"
          >
            确认回滚
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Search, Warning } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useOperationHistoryStore } from '../stores/operationHistory'

const userStore = useUserStore()
const operationHistoryStore = useOperationHistoryStore()

// Props
const props = defineProps({
  showHistoryButton: {
    type: Boolean,
    default: true
  },
  target: {
    type: String,
    default: ''
  }
})

// 响应式数据
const showHistoryDialog = ref(false)
const showDetailsDialog = ref(false)
const showRollbackDialog = ref(false)
const loading = ref(false)
const rollbackLoading = ref(false)
const searchKeyword = ref('')
const filterType = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const selectedOperation = ref(null)
const rollbackOperation = ref(null)

// 计算属性
const total = computed(() => operationHistoryStore.total)
const filteredHistory = computed(() => {
  let history = operationHistoryStore.history

  // 按目标过滤
  if (props.target) {
    history = history.filter(item => item.target === props.target)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    history = history.filter(item => 
      item.target.toLowerCase().includes(keyword) ||
      item.userName.toLowerCase().includes(keyword) ||
      getTypeLabel(item.type).toLowerCase().includes(keyword)
    )
  }

  // 按类型过滤
  if (filterType.value) {
    history = history.filter(item => item.type === filterType.value)
  }

  return history
})

// 方法
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const getTypeLabel = (type) => {
  const typeMap = {
    'add': '添加',
    'edit': '编辑',
    'delete': '删除',
    'rename': '重命名',
    'connect': '连接',
    'disconnect': '断开连接'
  }
  return typeMap[type] || type
}

const getTypeTagType = (type) => {
  const typeMap = {
    'add': 'success',
    'edit': 'primary',
    'delete': 'danger',
    'rename': 'warning',
    'connect': 'info',
    'disconnect': 'info'
  }
  return typeMap[type] || 'info'
}

const refreshHistory = async () => {
  loading.value = true
  try {
    await operationHistoryStore.fetchHistory({
      page: currentPage.value,
      pageSize: pageSize.value,
      target: props.target
    })
  } catch (error) {
    console.error('获取操作历史失败:', error)
    ElMessage.error('获取操作历史失败')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  refreshHistory()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  refreshHistory()
}

const showDetails = (operation) => {
  selectedOperation.value = operation
  showDetailsDialog.value = true
}

const handleRollback = (operation) => {
  rollbackOperation.value = operation
  showRollbackDialog.value = true
}

const confirmRollback = async () => {
  if (!rollbackOperation.value) return

  rollbackLoading.value = true
  try {
    const success = await operationHistoryStore.rollbackOperation(rollbackOperation.value.id)
    if (success) {
      ElMessage.success('操作回滚成功')
      showRollbackDialog.value = false
      refreshHistory()
    }
  } catch (error) {
    console.error('操作回滚失败:', error)
    ElMessage.error('操作回滚失败: ' + error.message)
  } finally {
    rollbackLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  refreshHistory()
})

// 暴露方法
defineExpose({
  refreshHistory,
  showHistoryDialog: () => showHistoryDialog.value = true
})
</script>

<style scoped>
.operation-rollback {
  display: inline-block;
}

.history-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.target-text {
  font-family: monospace;
  color: var(--el-text-color-primary);
}

.history-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.operation-details {
  max-height: 500px;
  overflow-y: auto;
}

.details-section {
  margin-top: 20px;
}

.details-section h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.rollback-confirm {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.rollback-icon {
  font-size: 24px;
  color: var(--el-color-warning);
  margin-top: 4px;
}

.rollback-message {
  flex: 1;
}

.rollback-message h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.rollback-message p {
  margin: 0 0 16px 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.rollback-details {
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.rollback-details p {
  margin: 4px 0;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 