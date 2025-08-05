<template>
  <div class="key-value-display">
        <!-- 顶部工具栏 -->
    <div class="key-toolbar">
      <div class="key-info">
        <el-button 
          type="text" 
          size="small" 
          @click="goBack"
          title="返回服务器信息"
          class="back-btn"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="key-type-selector">
          <el-select v-model="keyData.type" placeholder="数据类型" disabled>
            <el-option label="String" value="string" />
            <el-option label="Hash" value="hash" />
            <el-option label="List" value="list" />
            <el-option label="Set" value="set" />
            <el-option label="ZSet" value="zset" />
            <el-option label="Unknown" value="unknown" />
            <el-option label="Error" value="error" />
          </el-select>
        </div>
        <div class="key-name-editor">
          <el-input
            v-model="editingKeyName"
            placeholder="键名"
            @keyup.enter="handleKeyNameChange"
            @blur="handleKeyNameChange"
            @keyup.esc="cancelKeyNameEdit"
            @dblclick="startKeyNameEdit"
            ref="keyNameInputRef"
            :class="{ 'editing': isEditingKeyName }"
            readonly
          >
            <template #prepend>
              <span class="key-label">Key:</span>
            </template>
          </el-input>
        </div>
        <div class="key-size">
          <span>Size: {{ formatSize(keyData.size) }}</span>
          <el-button 
            type="text" 
            size="small" 
            @click="copyKeyName"
            title="复制键名"
          >
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
        </div>
        <div class="key-ttl">
          <span>TTL: {{ formatTTL(keyData.ttl) }}</span>
          <el-button 
            v-if="keyData.ttl > 0"
            type="text" 
            size="small" 
            @click="clearTTL"
            title="清除过期时间"
          >
            <el-icon><Clock /></el-icon>
            清除
          </el-button>
          <el-button 
            v-if="keyData.ttl === -1"
            type="text" 
            size="small" 
            @click="openSetTTLDialog"
            title="设置过期时间"
          >
            <el-icon><Clock /></el-icon>
            设置
          </el-button>
        </div>
      </div>
      <div class="key-actions">
        <el-button 
          type="text" 
          size="small" 
          @click="refreshValue"
          :loading="loading"
          title="刷新"
        >
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button 
          type="text" 
          size="small" 
          @click="deleteKey"
          title="删除键"
          class="delete-btn"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
        <el-button 
          type="text" 
          size="small" 
          @click="editKey"
          title="编辑"
        >
          <el-icon><Edit /></el-icon>
        </el-button>
        <el-button 
          type="text" 
          size="small" 
          @click="viewRaw"
          title="查看原始数据"
        >
          <el-icon><Document /></el-icon>
        </el-button>
        <el-button 
          v-if="keyData.type === 'hash'"
          type="text" 
          size="small" 
          @click="showKeyHash"
          title="KeyHash工具"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
        
      </div>
    </div>

    <!-- 操作锁定组件 -->
    <OperationLock ref="operationLockRef" />

    <!-- 键值内容 -->
    <div class="key-content">
      <div v-if="!props.connection" class="no-connection">
        <el-empty description="请选择连接来查看详细信息" />
      </div>
      <div v-else-if="!props.selectedKey" class="no-key-selected">
        <el-empty description="请选择一个键来查看其值" />
      </div>
      
      <div v-else-if="loading" class="loading-content">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="keyData.type === 'error'" class="error-content">
        <el-result
          icon="error"
          title="加载失败"
          sub-title="无法加载键值，请检查连接状态或重试"
        >
          <template #extra>
            <el-button type="primary" @click="loadKeyValue">重试</el-button>
          </template>
        </el-result>
      </div>
      
      <div v-else class="value-content">
        <!-- 调试信息 -->
        <div v-if="keyData.type === 'unknown'" class="debug-info">
          <p>调试信息:</p>
          <p>keyData: {{ JSON.stringify(keyData, null, 2) }}</p>
          <p>props.selectedKey: {{ JSON.stringify(props.selectedKey, null, 2) }}</p>
          <p>props.connection: {{ props.connection ? '已连接' : '未连接' }}</p>
        </div>
        <!-- String类型 -->
        <div v-if="keyData.type === 'string'" class="string-value">
                      <el-table :data="[{ value: keyData.value }]" stripe>
              <el-table-column label="值" min-width="300">
                <template #default="{ row }">
                  <FormattedValue 
                    :value="row.value" 
                    :row-key="'string_value'"
                    :key-name="keyData.key"
                    :data-type="'string'"
                    @formatted="handleFormatted"
                  />
                </template>
              </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default>
                <el-button 
                  type="primary" 
                  size="small"
                  @click="editStringValue"
                  title="编辑值"
                  class="edit-field-btn"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Hash类型 -->
        <div v-else-if="keyData.type === 'hash'" class="hash-value">
          <div class="filter-section">
            <div class="filter-row">
              <el-input
                v-model="hashFilter"
                placeholder="输入关键字搜索字段或值"
                clearable
                @input="handleHashFilter"
                class="filter-input"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button 
                v-if="hashFilter && filteredHashTableData.length > 0"
                type="danger" 
                size="small"
                @click="batchDeleteHashFields"
                :loading="hashBatchDeleting"
                class="batch-delete-btn"
              >
                <el-icon><Delete /></el-icon>
                批量删除 ({{ filteredHashTableData.length }})
              </el-button>
            </div>
          </div>
          <el-table 
            :data="filteredHashTableData" 
            stripe
            :max-height="400"
            v-loading="hashLoading"
          >
            <el-table-column prop="field" label="字段" width="200" />
            <el-table-column label="值" min-width="300">
              <template #default="{ row }">
                <FormattedValue 
                  :value="row.value" 
                  :row-key="`${row.field}`"
                  :key-name="keyData.key"
                  :data-type="'hash'"
                  :field-name="row.field"
                  @formatted="handleFormatted"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small"
                  @click="editHashField(row.field, row.value)"
                  title="编辑字段"
                  class="edit-field-btn"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button 
                  type="danger" 
                  size="small"
                  @click="deleteHashField(row.field)"
                  title="删除字段"
                  class="delete-field-btn"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="hashHasMore" class="load-more-section">
            <el-button 
              type="text" 
              @click="loadMoreHashData"
              :loading="hashLoadingMore"
            >
              加载更多 ({{ hashLoadedCount }}/{{ hashTotalCount }})
            </el-button>
            <el-button 
              type="primary" 
              size="small"
              @click="loadAllHashData"
              :loading="hashLoadingAll"
            >
              显示全部
            </el-button>
          </div>
        </div>

        <!-- List类型 -->
        <div v-else-if="keyData.type === 'list'" class="list-value">
          <el-table 
            :data="listTableData" 
            stripe
            :max-height="400"
            v-loading="listLoading"
          >
            <el-table-column prop="index" label="索引" width="80" />
            <el-table-column label="值" min-width="300">
              <template #default="{ row }">
                <FormattedValue 
                  :value="row.value" 
                  :row-key="`${row.index}`"
                  :key-name="keyData.key"
                  :data-type="'list'"
                  @formatted="handleFormatted"
                />
              </template>
            </el-table-column>
          </el-table>
          <div v-if="listHasMore" class="load-more-section">
            <el-button 
              type="text" 
              @click="loadMoreListData"
              :loading="listLoadingMore"
            >
              加载更多 ({{ listLoadedCount }}/{{ listTotalCount }})
            </el-button>
            <el-button 
              type="primary" 
              size="small"
              @click="loadAllListData"
              :loading="listLoadingAll"
            >
              显示全部
            </el-button>
          </div>
        </div>

        <!-- Set类型 -->
        <div v-else-if="keyData.type === 'set'" class="set-value">
          <div class="filter-section">
            <el-input
              v-model="setFilter"
              placeholder="输入关键字搜索成员"
              clearable
              @input="handleSetFilter"
              class="filter-input"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="set-items">
            <div
              v-for="(item, index) in filteredSetData"
              :key="index"
              class="set-item-container"
            >
              <FormattedValue 
                :value="item" 
                :row-key="`set_${index}`"
                :key-name="keyData.key"
                :data-type="'set'"
                @formatted="handleFormatted"
              />
              <el-button 
                type="danger" 
                size="small" 
                @click="removeSetItem(index)"
                class="remove-btn"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- ZSet类型 -->
        <div v-else-if="keyData.type === 'zset'" class="zset-value">
          <el-table :data="zsetTableData" stripe>
            <el-table-column prop="rank" label="排名" width="80" />
            <el-table-column prop="score" label="分数" width="100" />
            <el-table-column label="成员" min-width="300">
              <template #default="{ row }">
                <FormattedValue 
                  :value="row.member" 
                  :row-key="`${row.rank}`"
                  :key-name="keyData.key"
                  :data-type="'zset'"
                  @formatted="handleFormatted"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 未知类型 -->
        <div v-else class="unknown-value">
          <el-alert
            title="未知数据类型"
            type="warning"
            :closable="false"
          />
        </div>
      </div>
    </div>

    <!-- 编辑键对话框 -->
    <EditKeyDialog
      v-model="showEditDialog"
      :key-data="keyData"
      :connection="props.connection"
      :database="props.database"
      @save="handleEditKeySave"
      @cancel="showEditDialog = false"
    />

    <!-- 原始数据对话框 -->
    <RawDataDialog
      v-model="showRawDialog"
      :key-data="keyData"
    />

    <!-- 编辑Hash字段对话框 -->
    <EditHashFieldDialog
      v-model="showEditHashFieldDialog"
      :field="editHashFieldForm.field"
      :value="editHashFieldForm.value"
      :is-edit-field="editHashFieldForm.isEditField"
      @save="handleEditHashFieldSave"
      @cancel="showEditHashFieldDialog = false"
    />

    <!-- 编辑String值对话框 -->
    <EditStringDialog
      v-model="showEditStringDialog"
      :value="editStringForm.value"
      @save="handleEditStringSave"
      @cancel="showEditStringDialog = false"
    />

        <!-- KeyHash工具对话框 -->
    <el-dialog
      v-model="showKeyHashDialog"
      title="KeyHash工具"
      width="1000px"
      :close-on-click-modal="false"
    >
      <KeyHash
        v-if="showKeyHashDialog && keyData.type === 'hash'"
        :hash-data="keyData.value"
      />
    </el-dialog>

    <!-- TTL设置对话框组件 -->
    <SetTTLDialog
      v-model="showSetTTLDialog"
      :connection="props.connection"
      :database="props.database"
      :key-name="keyData.key"
      @success="handleTTLSetSuccess"
    />

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  CopyDocument, 
  Refresh, 
  Delete, 
  Edit, 
  Document,
  Search,
  ArrowLeft,
  Clock
} from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'
import { useUserStore } from '../stores/user'
import { operationLogger } from '../utils/operationLogger'
import FormattedValue from './FormattedValue.vue'
import OperationLock from './OperationLock.vue'
import KeyHash from './KeyHash.vue'
import SetTTLDialog from './SetTTLDialog.vue'
import EditKeyDialog from './dialogs/EditKeyDialog.vue'
import RawDataDialog from './dialogs/RawDataDialog.vue'
import EditHashFieldDialog from './dialogs/EditHashFieldDialog.vue'
import EditStringDialog from './dialogs/EditStringDialog.vue'


const connectionStore = useConnectionStore()
const userStore = useUserStore()

// Props
const props = defineProps({
  connection: {
    type: Object,
    default: null
  },
  selectedKey: {
    type: Object,
    default: null
  },
  database: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits(['key-deleted', 'key-updated', 'go-back'])

// 响应式数据
const keyData = ref({
  key: '',
  type: 'unknown',
  value: null,
  ttl: -1,
  size: 0
})
const loading = ref(false)
const showRawDialog = ref(false)
const showEditDialog = ref(false)
const showEditHashFieldDialog = ref(false)
const showEditStringDialog = ref(false)
const showKeyHashDialog = ref(false)
const showSetTTLDialog = ref(false)

const editingKeyName = ref('')
const isEditingKeyName = ref(false)
const keyNameInputRef = ref(null)
const operationLockRef = ref(null)
const hashFilter = ref('')
const setFilter = ref('')

// 分页加载相关状态
const hashLoading = ref(false)
const hashLoadingMore = ref(false)
const hashLoadingAll = ref(false)
const hashBatchDeleting = ref(false)
const hashLoadedCount = ref(0)
const hashTotalCount = ref(0)
const hashPageSize = ref(100)
const hashCurrentPage = ref(0)

const listLoading = ref(false)
const listLoadingMore = ref(false)
const listLoadingAll = ref(false)
const listLoadedCount = ref(0)
const listTotalCount = ref(0)
const listPageSize = ref(100)
const listCurrentPage = ref(0)

// 缓存机制
const keyValueCache = ref(new Map())
const cacheTimeout = 5 * 60 * 1000 // 5分钟缓存
// 编辑Hash字段表单
const editHashFieldForm = reactive({
  field: '',
  value: '',
  isEditField: false, // 是否编辑字段名（false表示新增，true表示编辑）
  originalField: '' // 原始字段名，用于编辑时判断是否修改了字段名
})

// 编辑String值表单
const editStringForm = reactive({
  value: ''
})

// 格式化事件处理
const handleFormatted = (data) => {
  console.log('格式化完成:', data)
}

// 计算属性
const hashTableData = computed(() => {
  if (keyData.value.type === 'hash' && keyData.value.value) {
    return Object.entries(keyData.value.value).map(([field, value]) => ({
      field,
      value
    }))
  }
  return []
})

const filteredHashTableData = computed(() => {
  let data = hashTableData.value
  
  // 应用过滤器
  if (hashFilter.value) {
    data = data.filter(item => 
      item.field.toLowerCase().includes(hashFilter.value.toLowerCase()) ||
      item.value.toLowerCase().includes(hashFilter.value.toLowerCase())
    )
  }
  
  // 应用分页
  const start = 0
  const end = hashLoadedCount.value
  return data.slice(start, end)
})

const hashHasMore = computed(() => {
  if (keyData.value.type !== 'hash' || !keyData.value.value) return false
  const totalItems = Object.keys(keyData.value.value).length
  return hashLoadedCount.value < totalItems
})

const listTableData = computed(() => {
  if (keyData.value.type === 'list' && keyData.value.value) {
    const data = keyData.value.value.map((value, index) => ({
      index,
      value
    }))
    // 应用分页
    return data.slice(0, listLoadedCount.value)
  }
  return []
})

const listHasMore = computed(() => {
  if (keyData.value.type !== 'list' || !keyData.value.value) return false
  return listLoadedCount.value < keyData.value.value.length
})

const zsetTableData = computed(() => {
  if (keyData.value.type === 'zset' && keyData.value.value) {
    return keyData.value.value.map((item, index) => ({
      rank: index + 1,
      score: item.score,
      member: item.value
    }))
  }
  return []
})

const filteredSetData = computed(() => {
  if (!setFilter.value || !keyData.value.value) {
    return keyData.value.value || []
  }
  
  return keyData.value.value.filter(item => 
    item.toLowerCase().includes(setFilter.value.toLowerCase())
  )
})

// 方法
const loadKeyValue = async (forceRefresh = false) => {
  console.log('loadKeyValue called:', { 
    connection: props.connection?.id, 
    selectedKey: props.selectedKey?.name,
    database: props.database 
  })
  
  if (!props.connection || !props.selectedKey) {
    console.log('loadKeyValue - missing connection or selectedKey')
    keyData.value = { key: '', type: 'unknown', value: null, ttl: -1, size: 0 }
    return
  }

  // 检查缓存
  const cacheKey = `${props.connection.id}:${props.database}:${props.selectedKey.name}`
  const cachedData = keyValueCache.value.get(cacheKey)
  
  if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < cacheTimeout) {
    console.log('使用缓存数据:', cachedData.data)
    keyData.value = { ...cachedData.data }
    
    // 初始化分页状态
    if (cachedData.data.type === 'hash' && cachedData.data.value) {
      hashTotalCount.value = Object.keys(cachedData.data.value).length
      hashLoadedCount.value = Math.min(hashPageSize.value, hashTotalCount.value)
    } else if (cachedData.data.type === 'list' && cachedData.data.value) {
      listTotalCount.value = cachedData.data.value.length
      listLoadedCount.value = Math.min(listPageSize.value, listTotalCount.value)
    }
    
    if (!isEditingKeyName.value) {
      editingKeyName.value = cachedData.data.key
    }
    return
  }

  loading.value = true
  try {
    const data = await connectionStore.getKeyValue(
      props.connection.id,
      props.database,
      props.selectedKey.name
    )
    
    console.log('loadKeyValue - received data:', data)
    
    if (data) {
      console.log('KeyValueDisplay - setting keyData to:', data)
      keyData.value = { ...data }
      
      // 缓存数据
      keyValueCache.value.set(cacheKey, {
        data: { ...data },
        timestamp: Date.now()
      })
      
      // 初始化分页状态
      if (data.type === 'hash' && data.value) {
        hashTotalCount.value = Object.keys(data.value).length
        hashLoadedCount.value = Math.min(hashPageSize.value, hashTotalCount.value)
      } else if (data.type === 'list' && data.value) {
        listTotalCount.value = data.value.length
        listLoadedCount.value = Math.min(listPageSize.value, listTotalCount.value)
      }
      
      // 确保 editingKeyName 也更新
      if (!isEditingKeyName.value) {
        editingKeyName.value = data.key
      }
    } else {
      // 如果没有数据，设置默认值
      const defaultData = { 
        key: props.selectedKey.name, 
        type: 'unknown', 
        value: null, 
        ttl: -1, 
        size: 0 
      }
      console.log('KeyValueDisplay - setting default keyData to:', defaultData)
      keyData.value = defaultData
      // 确保 editingKeyName 也更新
      if (!isEditingKeyName.value) {
        editingKeyName.value = defaultData.key
      }
    }
  } catch (error) {
    console.error('加载键值失败:', error)
    // 设置错误状态
    const errorData = { 
      key: props.selectedKey.name, 
      type: 'error', 
      value: null, 
      ttl: -1, 
      size: 0 
    }
    console.log('KeyValueDisplay - setting error keyData to:', errorData)
    keyData.value = errorData
          // 确保 editingKeyName 也更新
      if (!isEditingKeyName.value) {
        editingKeyName.value = errorData.key
      }
  } finally {
    loading.value = false
  }
}

const refreshValue = () => {
  loadKeyValue(true) // 强制刷新，不使用缓存
}

// 分页加载方法
const loadMoreHashData = async () => {
  if (hashLoadingMore.value) return
  
  hashLoadingMore.value = true
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const totalItems = Object.keys(keyData.value.value || {}).length
    const nextCount = Math.min(hashLoadedCount.value + hashPageSize.value, totalItems)
    hashLoadedCount.value = nextCount
  } finally {
    hashLoadingMore.value = false
  }
}

const loadMoreListData = async () => {
  if (listLoadingMore.value) return
  
  listLoadingMore.value = true
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const totalItems = keyData.value.value?.length || 0
    const nextCount = Math.min(listLoadedCount.value + listPageSize.value, totalItems)
    listLoadedCount.value = nextCount
  } finally {
    listLoadingMore.value = false
  }
}

const loadAllHashData = async () => {
  if (hashLoadingAll.value) return
  
  hashLoadingAll.value = true
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const totalItems = Object.keys(keyData.value.value || {}).length
    hashLoadedCount.value = totalItems
  } finally {
    hashLoadingAll.value = false
  }
}

const loadAllListData = async () => {
  if (listLoadingAll.value) return
  
  listLoadingAll.value = true
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const totalItems = keyData.value.value?.length || 0
    listLoadedCount.value = totalItems
  } finally {
    listLoadingAll.value = false
  }
}

// Hash字段删除方法
const deleteHashField = async (field) => {
  if (!props.connection || !keyData.value.key) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除字段 "${field}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用后端API删除字段
    const success = await connectionStore.deleteHashField(
      props.connection.id,
      props.database,
      keyData.value.key,
      field
    )
    
    if (success) {
      // 从本地数据中移除字段
      if (keyData.value.value && keyData.value.value[field]) {
        delete keyData.value.value[field]
        // 更新总数
        hashTotalCount.value = Object.keys(keyData.value.value).length
        // 调整已加载数量
        hashLoadedCount.value = Math.min(hashLoadedCount.value, hashTotalCount.value)
        
        ElMessage.success(`字段 "${field}" 删除成功`)
        // 记录操作日志
        operationLogger.logHashFieldDeleted(keyData.value.key, field, props.connection)
      }
    } else {
      ElMessage.error('删除字段失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除字段失败')
    }
  }
}

const batchDeleteHashFields = async () => {
  if (!props.connection || !keyData.value.key || !hashFilter.value) return
  
  const fieldsToDelete = filteredHashTableData.value.map(item => item.field)
  if (fieldsToDelete.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${fieldsToDelete.length} 个字段吗？此操作不可恢复！\n\n字段列表：${fieldsToDelete.slice(0, 5).join(', ')}${fieldsToDelete.length > 5 ? '...' : ''}`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    hashBatchDeleting.value = true
    
    // 调用后端API批量删除字段
    const success = await connectionStore.batchDeleteHashFields(
      props.connection.id,
      props.database,
      keyData.value.key,
      fieldsToDelete
    )
    
    if (success) {
      // 从本地数据中移除字段
      for (const field of fieldsToDelete) {
        if (keyData.value.value && keyData.value.value[field]) {
          delete keyData.value.value[field]
        }
      }
      
      // 更新总数
      hashTotalCount.value = Object.keys(keyData.value.value).length
      // 调整已加载数量
      hashLoadedCount.value = Math.min(hashLoadedCount.value, hashTotalCount.value)
      
      // 清空搜索条件
      hashFilter.value = ''
      
      ElMessage.success(`成功删除 ${fieldsToDelete.length} 个字段`)
      // 记录操作日志
      operationLogger.logHashFieldsBatchDeleted(keyData.value.key, fieldsToDelete, props.connection)
    } else {
      ElMessage.error('批量删除字段失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除字段失败')
    }
  } finally {
    hashBatchDeleting.value = false
  }
}

// 编辑Hash字段方法
const editHashField = (field, value) => {
  editHashFieldForm.field = field
  editHashFieldForm.value = value
  editHashFieldForm.isEditField = true
  editHashFieldForm.originalField = field
  showEditHashFieldDialog.value = true
}

// 编辑String值方法
const editStringValue = () => {
  editStringForm.value = keyData.value.value || ''
  showEditStringDialog.value = true
}

const copyValue = () => {
  if (!keyData.value.value) return
  
  let textToCopy = ''
  if (keyData.value.type === 'string') {
    textToCopy = keyData.value.value
  } else {
    textToCopy = JSON.stringify(keyData.value.value, null, 2)
  }
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const copyKeyName = () => {
  if (!keyData.value.key) return
  
  navigator.clipboard.writeText(keyData.value.key).then(() => {
    ElMessage.success('键名已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const deleteKey = async () => {
  if (!keyData.value.key) return
  
  // 使用操作锁定执行删除操作
  const success = await operationLockRef.value.executeProtectedOperation(
    'delete',
    keyData.value.key,
    async () => {
      try {
        const result = await connectionStore.deleteKey(
          props.connection.id,
          props.database,
          keyData.value.key
        )
        
        if (result) {
          ElMessage.success('键删除成功')
          // 记录操作日志
          operationLogger.logKeyDeleted(keyData.value.key, props.connection)
          emit('key-deleted', keyData.value.key)
          return true
        } else {
          ElMessage.error('键删除失败')
          return false
        }
      } catch (error) {
        console.error('删除键失败:', error)
        ElMessage.error('删除键失败: ' + error.message)
        return false
      }
    },
    {
      confirmTitle: '确认删除',
      confirmMessage: `确定要删除键 "${keyData.value.key}" 吗？此操作不可恢复！`,
      confirmType: 'danger',
      confirmButtonText: '删除',
      requireConfirm: true
    }
  )
}

const editKey = () => {
  // 打开编辑对话框
  showEditDialog.value = true
}

// 处理编辑键保存
const handleEditKeySave = async (data) => {
  try {
    if (data.type === 'rename') {
      // 重命名模式
      const result = await connectionStore.renameKey(
        props.connection.id,
        props.database,
        keyData.value.key,
        data.newKeyName
      )
      
      if (result) {
        const oldKeyName = keyData.value.key
        // 更新本地数据
        keyData.value = {
          ...keyData.value,
          key: data.newKeyName
        }
        ElMessage.success(`键名已更新: ${oldKeyName} → ${data.newKeyName}`)
        emit('key-updated', { oldKey: oldKeyName, newKey: data.newKeyName })
        showEditDialog.value = false
      }
    } else {
      // 编辑值模式
      if (keyData.value.type === 'hash' && data.changes) {
        // 对于Hash类型，处理变化的部分
        const changes = data.changes
        let success = true
        let errorMessage = ''
        
        // 处理删除的字段
        for (const field of changes.deleted) {
          try {
            const deleteResult = await connectionStore.deleteHashField(
              props.connection.id,
              props.database,
              keyData.value.key,
              field
            )
            if (!deleteResult) {
              success = false
              errorMessage = `删除字段 "${field}" 失败`
              break
            }
          } catch (error) {
            success = false
            errorMessage = `删除字段 "${field}" 失败: ${error.message}`
            break
          }
        }
        
        // 处理新增和修改的字段
        if (success) {
          const allFields = { ...changes.added, ...changes.modified }
          for (const [field, value] of Object.entries(allFields)) {
            try {
              const updateResult = await connectionStore.updateHashField(
                props.connection.id,
                props.database,
                keyData.value.key,
                field,
                field,
                value
              )
              if (!updateResult) {
                success = false
                errorMessage = `更新字段 "${field}" 失败`
                break
              }
            } catch (error) {
              success = false
              errorMessage = `更新字段 "${field}" 失败: ${error.message}`
              break
            }
          }
        }
        
        if (success) {
          // 更新本地数据
          keyData.value.value = data.value
          
          // 记录操作日志
          const changeSummary = []
          if (changes.added && Object.keys(changes.added).length > 0) {
            changeSummary.push(`新增 ${Object.keys(changes.added).length} 个字段`)
          }
          if (changes.modified && Object.keys(changes.modified).length > 0) {
            changeSummary.push(`修改 ${Object.keys(changes.modified).length} 个字段`)
          }
          if (changes.deleted && changes.deleted.length > 0) {
            changeSummary.push(`删除 ${changes.deleted.length} 个字段`)
          }
          
          ElMessage.success(`Hash更新成功: ${changeSummary.join(', ')}`)
          operationLogger.logKeyValueUpdated(keyData.value.key, keyData.value.type, props.connection)
          emit('key-updated', { key: keyData.value.key, value: data.value })
          showEditDialog.value = false
        } else {
          ElMessage.error(errorMessage)
        }
      } else {
        // 对于其他类型，使用原有的更新方式
        const result = await connectionStore.updateKeyValue(
          props.connection.id,
          props.database,
          keyData.value.key,
          keyData.value.type,
          data.value
        )
        
        if (result) {
          // 更新本地数据
          keyData.value.value = data.value
          // 记录操作日志
          operationLogger.logKeyValueUpdated(keyData.value.key, keyData.value.type, props.connection)
          emit('key-updated', { key: keyData.value.key, value: data.value })
          showEditDialog.value = false
        }
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 处理编辑Hash字段保存
const handleEditHashFieldSave = async (data) => {
  try {
    // 调用后端API保存字段
    const success = await connectionStore.updateHashField(
      props.connection.id,
      props.database,
      keyData.value.key,
      data.originalField,
      data.field,
      data.value
    )
    
    if (success) {
      // 更新本地数据
      if (keyData.value.value) {
        // 如果字段名改变了，先删除原字段
        if (data.originalField !== data.field) {
          delete keyData.value.value[data.originalField]
        }
        // 设置新字段
        keyData.value.value[data.field] = data.value
      }
      
      showEditHashFieldDialog.value = false
      ElMessage.success('字段保存成功')
      // 记录操作日志
      operationLogger.logHashFieldEdited(keyData.value.key, data.field, props.connection)
    } else {
      ElMessage.error('保存字段失败')
    }
  } catch (error) {
    ElMessage.error('保存字段失败')
  }
}

// 处理编辑String保存
const handleEditStringSave = async (value) => {
  try {
    // 调用后端API保存String值
    const success = await connectionStore.updateStringValue(
      props.connection.id,
      props.database,
      keyData.value.key,
      value
    )
    
    if (success) {
      // 更新本地数据
      keyData.value.value = value
      
      showEditStringDialog.value = false
      ElMessage.success('String值保存成功')
      // 记录操作日志
      operationLogger.logStringValueEdited(keyData.value.key, props.connection)
    } else {
      ElMessage.error('保存String值失败')
    }
  } catch (error) {
    ElMessage.error('保存String值失败')
  }
}

const viewRaw = () => {
  showRawDialog.value = true
}

const showKeyHash = () => {
  showKeyHashDialog.value = true
}



const removeSetItem = (filteredIndex) => {
  if (keyData.value.type === 'set' && keyData.value.value) {
    // 找到原始数据中的索引
    const filteredItem = filteredSetData.value[filteredIndex]
    const originalIndex = keyData.value.value.findIndex(item => item === filteredItem)
    
    if (originalIndex > -1) {
      keyData.value.value.splice(originalIndex, 1)
      keyData.value.size = keyData.value.value.length
      ElMessage.success('成员已删除')
    }
  }
}

const formatSize = (size) => {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

const formatTTL = (ttl) => {
  if (ttl === -1) return '永不过期'
  if (ttl === -2) return '键不存在'
  if (ttl < 0) return '未知'
  
  // 格式化剩余时间
  const days = Math.floor(ttl / 86400)
  const hours = Math.floor((ttl % 86400) / 3600)
  const minutes = Math.floor((ttl % 3600) / 60)
  const seconds = ttl % 60
  
  if (days > 0) {
    return `${days}天${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}

const startKeyNameEdit = () => {
  isEditingKeyName.value = true
  editingKeyName.value = keyData.value.key
  // 聚焦到输入框
  nextTick(() => {
    if (keyNameInputRef.value) {
      keyNameInputRef.value.focus()
      keyNameInputRef.value.select()
    }
  })
}

const handleKeyNameChange = async () => {
  if (!isEditingKeyName.value) return
  
  const newKeyName = editingKeyName.value.trim()
  if (!newKeyName) {
    ElMessage.error('键名不能为空')
    editingKeyName.value = keyData.value.key
    isEditingKeyName.value = false
    return
  }
  
  if (newKeyName === keyData.value.key) {
    isEditingKeyName.value = false
    return
  }
  
  // 使用操作锁定执行重命名操作
  const success = await operationLockRef.value.executeProtectedOperation(
    'rename',
    keyData.value.key,
    async () => {
      try {
        const oldKeyName = keyData.value.key
        const result = await connectionStore.renameKey(
          props.connection.id,
          props.database,
          oldKeyName,
          newKeyName
        )
        
        if (result) {
          keyData.value.key = newKeyName
          isEditingKeyName.value = false
          ElMessage.success(`键名已更新: ${oldKeyName} → ${newKeyName}`)
          // 记录操作日志
          operationLogger.logKeyRenamed(oldKeyName, newKeyName, props.connection)
          emit('key-updated', { oldKey: oldKeyName, newKey: newKeyName })
          return true
        } else {
          editingKeyName.value = oldKeyName
          isEditingKeyName.value = false
          return false
        }
      } catch (error) {
        ElMessage.error('更新键名失败')
        editingKeyName.value = keyData.value.key
        isEditingKeyName.value = false
        return false
      }
    },
    {
      confirmTitle: '确认重命名',
      confirmMessage: `确定要将键名从 "${keyData.value.key}" 重命名为 "${newKeyName}" 吗？`,
      confirmType: 'warning',
      confirmButtonText: '重命名',
      requireConfirm: true
    }
  )
}

const cancelKeyNameEdit = () => {
  editingKeyName.value = keyData.value.key
  isEditingKeyName.value = false
}

// TTL相关方法
const clearTTL = async () => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      `确定要清除键 "${keyData.value.key}" 的过期时间吗？\n\n清除后该键将永不过期。`,
      '确认清除TTL',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    
    const result = await connectionStore.clearKeyTTL(
      props.connection.id,
      props.database,
      keyData.value.key
    )
    
    if (result) {
      keyData.value.ttl = -1
      // 记录操作日志
      operationLogger.logTTLCleared(keyData.value.key, props.connection)
    }
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消操作，不需要处理
      return
    }
    console.error('清除TTL失败:', error)
  }
}

const openSetTTLDialog = () => {
  showSetTTLDialog.value = true
}

const handleTTLSetSuccess = (result) => {
  // 更新本地TTL数据
  keyData.value.ttl = result.ttl
}

const handleHashFilter = () => {
  // 筛选逻辑已在计算属性中处理
}

const handleSetFilter = () => {
  // 筛选逻辑已在计算属性中处理
}



// 监听选中键的变化
watch(() => props.selectedKey, async (newKey, oldKey) => {
  console.log('KeyValueDisplay - selectedKey changed:', { newKey, oldKey })
  try {
    if (newKey && props.connection) {
      console.log('KeyValueDisplay - calling loadKeyValue')
      await loadKeyValue()
      console.log('KeyValueDisplay - loadKeyValue completed, keyData:', keyData.value)
    } else {
      console.log('KeyValueDisplay - resetting keyData to unknown')
      keyData.value = { key: '', type: 'unknown', value: null, ttl: -1, size: 0 }
      editingKeyName.value = ''
    }
    // 重置编辑状态和筛选状态
    isEditingKeyName.value = false
    hashFilter.value = ''
    setFilter.value = ''
  } catch (error) {
    console.error('KeyValueDisplay - watch error:', error)
  }
}, { immediate: true })

// 监听连接变化
watch(() => props.connection, async (newConnection, oldConnection) => {
  console.log('KeyValueDisplay - connection changed:', { newConnection, oldConnection })
  try {
    if (!newConnection) {
      keyData.value = { key: '', type: 'unknown', value: null, ttl: -1, size: 0 }
      editingKeyName.value = ''
    } else if (props.selectedKey) {
      await loadKeyValue()
    }
  } catch (error) {
    console.error('KeyValueDisplay - connection watch error:', error)
  }
}, { immediate: true })

// 返回服务器信息视图
const goBack = () => {
  emit('go-back')
}

// 处理连接合并事件
const handleConnectionMerged = async (event) => {
  console.log('KeyValueDisplay - 收到连接合并事件:', event.detail)
  
  const { oldConnections, newConnections } = event.detail
  
  // 检查当前连接是否在合并的连接中
  const currentConn = props.connection
  if (!currentConn) return
  
  const wasMerged = oldConnections.some(oldConn => 
    oldConn.host === currentConn.host && 
    oldConn.port === currentConn.port &&
    oldConn.database === currentConn.database
  )
  
  if (wasMerged && props.selectedKey) {
    console.log('KeyValueDisplay - 当前连接已被合并，重新获取键值...')
    
    // 找到对应的新连接
    const newConn = newConnections.find(conn => 
      conn.host === currentConn.host && 
      conn.port === currentConn.port &&
      conn.database === currentConn.database
    )
    
    if (newConn) {
      console.log('KeyValueDisplay - 找到新连接:', {
        id: newConn.id,
        isTemp: newConn.isTemp
      })
      
      // 更新当前连接为新连接
      connectionStore.setCurrentConnection(newConn)
    }
    
    // 等待一下让连接状态更新
    setTimeout(async () => {
      try {
        // 重新获取键值
        await loadKeyValue()
        ElMessage.success('连接已更新，键值已重新加载')
      } catch (error) {
        console.error('KeyValueDisplay - 重新获取键值失败:', error)
        ElMessage.error('重新获取键值失败')
      }
    }, 500)
  }
}

// 组件初始化时添加事件监听
onMounted(() => {
  // 监听连接合并事件
  window.addEventListener('connection-merged', handleConnectionMerged)
})

// 组件卸载时的清理
onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('connection-merged', handleConnectionMerged)
  
  // 清理所有响应式数据
  keyData.value = { key: '', type: 'unknown', value: null, ttl: -1, size: 0 }
  loading.value = false
  showRawDialog.value = false
  showEditDialog.value = false
  editingKeyName.value = ''
  isEditingKeyName.value = false
  hashFilter.value = ''
  setFilter.value = ''
})

// 监听键数据变化
watch(() => keyData.value.key, (newKey) => {
  console.log('KeyValueDisplay - keyData.key changed:', newKey)
  if (!isEditingKeyName.value && newKey) {
    editingKeyName.value = newKey
  }
})

// 监听数据库变化
watch(() => props.database, async () => {
  if (props.selectedKey) {
    try {
      await loadKeyValue()
    } catch (error) {
      console.error('KeyValueDisplay - database watch error:', error)
    }
  }
})


</script>

<style scoped>
.key-value-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
}

.key-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  background-color: #2d2d2d;
}

.key-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.key-name-editor {
  min-width: 300px;
}

.key-name-editor :deep(.el-input__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.key-name-editor :deep(.el-input__inner:read-only) {
  cursor: pointer;
}

.key-name-editor :deep(.el-input__inner:read-only:hover) {
  background-color: #404040;
}

.key-name-editor.editing :deep(.el-input__wrapper) {
  border-color: #409eff;
  box-shadow: 0 0 0 1px #409eff;
}

.key-label {
  color: #909399;
  font-size: 12px;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-input {
  width: 100%;
}

/* 筛选输入框样式已由全局样式处理 */



.set-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}



.key-type-selector {
  min-width: 120px;
}

.key-size {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 12px;
}

.key-ttl {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 12px;
  margin-left: 16px;
}

.key-actions {
  display: flex;
  gap: 4px;
}

.key-actions .el-button {
  color: #ffffff;
}

.key-actions .delete-btn:hover {
  color: #f56c6c;
}

.back-btn {
  color: #409eff;
  margin-right: 12px;
}

.back-btn:hover {
  color: #66b1ff;
  background-color: #2d2d2d;
}

.key-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.no-key-selected,
.loading-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.value-content {
  height: 100%;
}

.string-value {
  height: 100%;
  padding: 16px;
}

.string-value-container {
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 16px;
  min-height: 200px;
}

.hash-value,
.list-value,
.zset-value {
  height: 100%;
}

/* 表格样式已由全局样式处理 */

.set-value {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.set-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.set-item-container {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.set-item-container .formatted-value {
  flex: 1;
}

.remove-btn {
  flex-shrink: 0;
  margin-top: 4px;
}

.unknown-value {
  padding: 20px;
}

.raw-data {
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

/* 值单元格样式已移至FormattedValue组件 */

/* 滚动条样式 */
.key-content {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

.key-content::-webkit-scrollbar {
  width: 2px;
}

.key-content::-webkit-scrollbar-track {
  background: transparent;
}

.key-content::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 1px;
}

.key-content::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

.raw-data {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

.raw-data::-webkit-scrollbar {
  width: 2px;
}

.raw-data::-webkit-scrollbar-track {
  background: transparent;
}

.raw-data::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 1px;
}

.raw-data::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

/* 表格滚动条 */
:deep(.el-table__body-wrapper) {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 2px;
  height: 2px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: #606266;
  border-radius: 1px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
  background: #909399;
}

/* 加载更多按钮样式 */
.load-more-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 10px 0;
  border-top: 1px solid #404040;
  margin-top: 10px;
}

.load-more-section .el-button {
  color: #409eff;
  font-size: 14px;
}

.load-more-section .el-button:hover {
  color: #66b1ff;
}

.load-more-section .el-button--primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.load-more-section .el-button--primary:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
  color: #ffffff;
}

/* Hash字段删除相关样式 */
.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-input {
  flex: 1;
}

.batch-delete-btn {
  flex-shrink: 0;
}

.edit-field-btn {
  padding: 4px 8px;
  min-width: auto;
  margin-right: 5px;
}

.edit-field-btn:hover {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.delete-field-btn {
  padding: 4px 8px;
  min-width: auto;
}

.delete-field-btn:hover {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #ffffff;
}



</style> 