<template>
  <FormDialog
    v-model="visible"
    title="批量删除键"
    width="600px"
    :form-data="deleteForm"
    :rules="deleteRules"
    :loading="loading"
    confirm-text="确认删除"
    cancel-text="取消"
    @confirm="handleConfirm"
    @close="handleClose"
  >
    <!-- 警告信息 -->
    <div class="warning-section">
      <el-alert
        title="危险操作"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          批量删除操作不可恢复，请谨慎操作！
        </template>
      </el-alert>
    </div>

    <!-- 删除选项 -->
    <el-form-item label="删除选项" prop="deleteMode">
      <el-radio-group v-model="deleteForm.deleteMode" @change="handleModeChange">
        <el-radio value="visible">
          删除所有可见的键({{ visibleKeysCount }}个)
        </el-radio>
        <el-radio value="search" :disabled="!hasSearchResults">
          仅删除搜索结果中的键({{ searchResultsCount }}个)
        </el-radio>
        <el-radio value="custom">
          自定义删除模式
        </el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 自定义模式 -->
    <el-form-item v-if="deleteForm.deleteMode === 'custom'" label="删除模式" prop="customPattern">
      <el-input
        v-model="deleteForm.customPattern"
        placeholder="输入键名模式，如: user:*"
        @input="handleCustomPatternChange"
      />
      <div class="pattern-help">
        支持通配符：* 匹配任意字符，? 匹配单个字符
      </div>
    </el-form-item>

    <!-- 预览区域 -->
    <el-form-item label="预览将被删除的键:">
      <div class="preview-section">
        <div class="preview-header">
          <span>共 {{ previewKeys.length }} 个键</span>
          <el-button 
            type="text" 
            size="small" 
            @click="selectAllKeys"
            :disabled="previewKeys.length === 0"
          >
            全选
          </el-button>
          <el-button 
            type="text" 
            size="small" 
            @click="clearSelection"
            :disabled="selectedKeys.length === 0"
          >
            清空
          </el-button>
        </div>
        <div v-if="previewKeys.length === 0" class="no-keys">
          没有匹配的键
        </div>
        <div v-else class="keys-list">
          <div
            v-for="key in previewKeys"
            :key="key"
            class="key-item"
            :class="{ 'excluded': excludedKeys.includes(key) }"
          >
            <el-checkbox
              v-model="selectedKeys"
              :value="key"
              :disabled="excludedKeys.includes(key)"
              @change="handleKeySelection"
            />
            <el-icon><Document /></el-icon>
            <span class="key-name">{{ key }}</span>
            <el-button
              type="text"
              size="small"
              class="exclude-btn"
              @click="toggleExcludeKey(key)"
              :title="excludedKeys.includes(key) ? '取消排除' : '排除此键'"
            >
              <el-icon>
                <Close v-if="!excludedKeys.includes(key)" />
                <Check v-else />
              </el-icon>
            </el-button>
          </div>
        </div>
        <div v-if="previewKeys.length > maxPreviewCount" class="more-keys">
          还有 {{ previewKeys.length - maxPreviewCount }} 个键...
        </div>
        <div class="selection-summary">
          <span>已选择: {{ selectedKeys.length }} 个键</span>
          <span v-if="excludedKeys.length > 0" class="excluded-count">
            已排除: {{ excludedKeys.length }} 个键
          </span>
        </div>
      </div>
    </el-form-item>

    <!-- 确认信息 -->
    <el-form-item v-if="previewKeys.length > 0">
      <el-alert
        :title="`即将删除 ${previewKeys.length} 个键`"
        type="error"
        :closable="false"
        show-icon
      />
    </el-form-item>
  </FormDialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { Document, Close, Check } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'
import { operationLogger } from '../utils/operationLogger'
import FormDialog from './dialogs/FormDialog.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    required: true
  },
  database: {
    type: Number,
    default: 0
  },
  visibleKeys: {
    type: Array,
    default: () => []
  },
  searchResults: {
    type: Array,
    default: () => []
  },
  hasSearchResults: {
    type: Boolean,
    default: false
  },
  groupedKeys: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(false)
const loading = ref(false)
const maxPreviewCount = 50
const selectedKeys = ref([]) // 用户选择的要删除的键
const excludedKeys = ref([]) // 用户排除的键

// 删除表单
const deleteForm = reactive({
  deleteMode: 'visible',
  customPattern: ''
})

const deleteRules = {
  deleteMode: [
    { required: true, message: '请选择删除模式', trigger: 'change' }
  ],
  customPattern: [
    { 
      required: true, 
      message: '请输入删除模式', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (deleteForm.deleteMode === 'custom' && !value.trim()) {
          callback(new Error('请输入删除模式'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 计算属性
const visibleKeysCount = computed(() => props.visibleKeys.length)
const searchResultsCount = computed(() => props.searchResults.length)

const previewKeys = computed(() => {
  // 合并所有键（可见键 + 分组键）
  const allKeys = [...props.visibleKeys, ...props.groupedKeys]
  
  switch (deleteForm.deleteMode) {
    case 'visible':
      return allKeys.slice(0, maxPreviewCount)
    case 'search':
      return props.searchResults.slice(0, maxPreviewCount)
    case 'custom':
      // 根据自定义模式过滤键
      return allKeys.filter(key => 
        key.includes(deleteForm.customPattern.replace('*', ''))
      ).slice(0, maxPreviewCount)
    default:
      return []
  }
})

// 监听modelValue变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 重置表单
    deleteForm.deleteMode = 'visible'
    deleteForm.customPattern = ''
    // 重置选择状态
    selectedKeys.value = []
    excludedKeys.value = []
  }
})

// 监听visible变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 处理模式变化
const handleModeChange = () => {
  // 模式变化时重新计算预览
}

// 处理自定义模式变化
const handleCustomPatternChange = () => {
  // 自定义模式变化时重新计算预览
}

// 全选所有键
const selectAllKeys = () => {
  selectedKeys.value = [...previewKeys.value]
}

// 清空选择
const clearSelection = () => {
  selectedKeys.value = []
}

// 处理键选择
const handleKeySelection = () => {
  // 选择变化时的处理逻辑
}

// 切换排除键
const toggleExcludeKey = (key) => {
  const index = excludedKeys.value.indexOf(key)
  if (index > -1) {
    // 取消排除
    excludedKeys.value.splice(index, 1)
    // 从排除列表中移除时，自动选中
    if (!selectedKeys.value.includes(key)) {
      selectedKeys.value.push(key)
    }
  } else {
    // 排除键
    excludedKeys.value.push(key)
    // 排除时自动取消选择
    const selectedIndex = selectedKeys.value.indexOf(key)
    if (selectedIndex > -1) {
      selectedKeys.value.splice(selectedIndex, 1)
    }
  }
}

// 处理确认删除
const handleConfirm = async () => {
  try {
    loading.value = true
    
    const connectionStore = useConnectionStore()
    
    // 使用用户选择的键，如果没有选择则使用预览中的所有键
    let keysToDelete = selectedKeys.value.length > 0 ? selectedKeys.value : previewKeys.value
    
    if (keysToDelete.length === 0) {
      return
    }
    
    // 执行批量删除
    const result = await connectionStore.batchDeleteKeys(
      props.connection.id,
      props.database,
      keysToDelete
    )
    
    if (result) {
      // 记录操作日志
      operationLogger.logBatchDeleteKeys(keysToDelete.length, props.connection)
      
      // 发出成功事件
      emit('success', {
        deletedKeys: keysToDelete,
        count: keysToDelete.length
      })
      
      // 关闭对话框
      handleClose()
    }
  } catch (error) {
    console.error('批量删除失败:', error)
  } finally {
    loading.value = false
  }
}

// 处理关闭
const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.warning-section {
  margin-bottom: 20px;
}

.pattern-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.preview-section {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 8px;
  background-color: var(--el-fill-color-light);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 8px;
}

.preview-header span {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.no-keys {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px;
}

.keys-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  transition: all 0.2s;
}

.key-item:hover {
  background-color: var(--el-fill-color);
}

.key-item.excluded {
  opacity: 0.5;
  background-color: var(--el-fill-color-light);
}

.key-item .exclude-btn {
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.2s;
}

.key-item:hover .exclude-btn {
  opacity: 1;
}

.key-item .el-icon {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.key-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.more-keys {
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  padding: 8px;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: 8px;
}

.selection-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.excluded-count {
  color: var(--el-color-warning);
}
</style> 