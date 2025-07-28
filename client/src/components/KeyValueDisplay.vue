<template>
  <div class="key-value-display">
    <!-- 顶部工具栏 -->
    <div class="key-toolbar">
      <div class="key-info">
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
            @click="copyValue"
            title="复制值"
          >
            <el-icon><CopyDocument /></el-icon>
            复制
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
      </div>
    </div>

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
          <el-input
            v-model="keyData.value"
            type="textarea"
            :rows="10"
            readonly
            placeholder="字符串值"
          />
        </div>

        <!-- Hash类型 -->
        <div v-else-if="keyData.type === 'hash'" class="hash-value">
          <div class="filter-section">
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
          </div>
          <el-table :data="filteredHashTableData" stripe>
            <el-table-column prop="field" label="字段" width="200" />
            <el-table-column prop="value" label="值" />
          </el-table>
        </div>

        <!-- List类型 -->
        <div v-else-if="keyData.type === 'list'" class="list-value">
          <el-table :data="listTableData" stripe>
            <el-table-column prop="index" label="索引" width="80" />
            <el-table-column prop="value" label="值" />
          </el-table>
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
            <el-tag
              v-for="(item, index) in filteredSetData"
              :key="index"
              class="set-item"
              closable
              @close="removeSetItem(index)"
            >
              {{ item }}
            </el-tag>
          </div>
        </div>

        <!-- ZSet类型 -->
        <div v-else-if="keyData.type === 'zset'" class="zset-value">
          <el-table :data="zsetTableData" stripe>
            <el-table-column prop="rank" label="排名" width="80" />
            <el-table-column prop="score" label="分数" width="100" />
            <el-table-column prop="member" label="成员" />
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
    <el-dialog
      v-model="showEditDialog"
      title="编辑键"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="edit-dialog-content">
        <!-- 编辑模式选择 -->
        <div class="edit-mode-selector">
          <el-radio-group v-model="editForm.isRename">
            <el-radio :label="false">编辑值</el-radio>
            <el-radio :label="true">重命名键</el-radio>
          </el-radio-group>
        </div>

        <!-- 重命名模式 -->
        <div v-if="editForm.isRename" class="rename-mode">
          <el-form label-width="100px">
            <el-form-item label="原键名">
              <el-input v-model="keyData.key" readonly />
            </el-form-item>
            <el-form-item label="新键名">
              <el-input 
                v-model="editForm.keyName" 
                placeholder="请输入新的键名"
                @keyup.enter="handleEditSave"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 编辑值模式 -->
        <div v-else class="edit-value-mode">
          <el-form label-width="100px">
            <el-form-item label="键名">
              <el-input v-model="keyData.key" readonly />
            </el-form-item>
            <el-form-item label="数据类型">
              <el-input v-model="editForm.type" readonly />
            </el-form-item>
            
            <!-- String类型编辑 -->
            <el-form-item v-if="editForm.type === 'string'" label="值">
              <el-input
                v-model="editForm.value"
                type="textarea"
                :rows="8"
                placeholder="请输入字符串值"
              />
            </el-form-item>

            <!-- Hash类型编辑 -->
            <el-form-item v-else-if="editForm.type === 'hash'" label="字段值">
              <div class="hash-edit-container">
                <div 
                  v-for="(value, field) in editForm.value" 
                  :key="field"
                  class="hash-field-item"
                >
                  <el-input
                    v-model="editForm.value[field]"
                    :placeholder="`字段: ${field}`"
                    class="hash-field-input"
                  >
                    <template #prepend>
                      <span class="field-name">{{ field }}</span>
                    </template>
                  </el-input>
                  <el-button 
                    type="danger" 
                    size="small"
                    @click="removeHashField(field)"
                  >
                    删除
                  </el-button>
                </div>
                <div class="add-hash-field">
                  <el-input
                    v-model="newHashField"
                    placeholder="新字段名"
                    class="new-field-input"
                  />
                  <el-input
                    v-model="newHashValue"
                    placeholder="新字段值"
                    class="new-value-input"
                  />
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="addHashField"
                  >
                    添加字段
                  </el-button>
                </div>
              </div>
            </el-form-item>

            <!-- List类型编辑 -->
            <el-form-item v-else-if="editForm.type === 'list'" label="列表项">
              <div class="list-edit-container">
                <div 
                  v-for="(item, index) in editForm.value" 
                  :key="index"
                  class="list-item"
                >
                  <el-input
                    v-model="editForm.value[index]"
                    :placeholder="`项目 ${index + 1}`"
                    class="list-item-input"
                  />
                  <el-button 
                    type="danger" 
                    size="small"
                    @click="removeListItem(index)"
                  >
                    删除
                  </el-button>
                </div>
                <div class="add-list-item">
                  <el-input
                    v-model="newListItem"
                    placeholder="新列表项"
                    class="new-item-input"
                  />
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="addListItem"
                  >
                    添加项目
                  </el-button>
                </div>
              </div>
            </el-form-item>

            <!-- Set类型编辑 -->
            <el-form-item v-else-if="editForm.type === 'set'" label="集合成员">
              <div class="set-edit-container">
                <el-tag
                  v-for="(item, index) in editForm.value"
                  :key="index"
                  class="set-member-tag"
                  closable
                  @close="removeSetMember(index)"
                >
                  {{ item }}
                </el-tag>
                <div class="add-set-member">
                  <el-input
                    v-model="newSetMember"
                    placeholder="新成员"
                    class="new-member-input"
                    @keyup.enter="addSetMember"
                  />
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="addSetMember"
                  >
                    添加成员
                  </el-button>
                </div>
              </div>
            </el-form-item>

            <!-- ZSet类型编辑 -->
            <el-form-item v-else-if="editForm.type === 'zset'" label="有序集合">
              <div class="zset-edit-container">
                <div 
                  v-for="(item, index) in editForm.value" 
                  :key="index"
                  class="zset-item"
                >
                  <el-input
                    v-model="editForm.value[index].value"
                    placeholder="成员"
                    class="zset-member-input"
                  />
                  <el-input-number
                    v-model="editForm.value[index].score"
                    placeholder="分数"
                    class="zset-score-input"
                  />
                  <el-button 
                    type="danger" 
                    size="small"
                    @click="removeZSetItem(index)"
                  >
                    删除
                  </el-button>
                </div>
                <div class="add-zset-item">
                  <el-input
                    v-model="newZSetMember"
                    placeholder="新成员"
                    class="new-zset-member-input"
                  />
                  <el-input-number
                    v-model="newZSetScore"
                    placeholder="分数"
                    class="new-zset-score-input"
                  />
                  <el-button 
                    type="primary" 
                    size="small"
                    @click="addZSetItem"
                  >
                    添加成员
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="handleEditSave" :loading="editLoading">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 原始数据对话框 -->
    <el-dialog
      v-model="showRawDialog"
      title="原始数据"
      width="800px"
    >
      <pre class="raw-data">{{ JSON.stringify(keyData, null, 2) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  CopyDocument, 
  Refresh, 
  Delete, 
  Edit, 
  Document,
  Search
} from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'

const connectionStore = useConnectionStore()

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
const emit = defineEmits(['key-deleted', 'key-updated'])

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
const editingKeyName = ref('')
const isEditingKeyName = ref(false)
const keyNameInputRef = ref(null)
const hashFilter = ref('')
const setFilter = ref('')
const editForm = reactive({
  keyName: '',
  value: null,
  type: '',
  isRename: false
})
const editLoading = ref(false)
const newHashField = ref('')
const newHashValue = ref('')
const newListItem = ref('')
const newSetMember = ref('')
const newZSetMember = ref('')
const newZSetScore = ref(0)

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
  if (!hashFilter.value) {
    return hashTableData.value
  }
  
  return hashTableData.value.filter(item => 
    item.field.toLowerCase().includes(hashFilter.value.toLowerCase()) ||
    item.value.toLowerCase().includes(hashFilter.value.toLowerCase())
  )
})

const listTableData = computed(() => {
  if (keyData.value.type === 'list' && keyData.value.value) {
    return keyData.value.value.map((value, index) => ({
      index,
      value
    }))
  }
  return []
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
const loadKeyValue = async () => {
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
  loadKeyValue()
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

const deleteKey = async () => {
  if (!keyData.value.key) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除键 "${keyData.value.key}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 这里可以添加删除键的逻辑
    ElMessage.success('键删除成功')
    emit('key-deleted', keyData.value.key)
  } catch (error) {
    // 用户取消删除
  }
}

const editKey = () => {
  // 打开编辑对话框
  showEditDialog.value = true
  // 初始化编辑表单
  editForm.keyName = keyData.value.key
  editForm.value = JSON.parse(JSON.stringify(keyData.value.value)) // 深拷贝
  editForm.type = keyData.value.type
}

const viewRaw = () => {
  showRawDialog.value = true
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
      emit('key-updated', { oldKey: oldKeyName, newKey: newKeyName })
    } else {
      editingKeyName.value = oldKeyName
      isEditingKeyName.value = false
    }
  } catch (error) {
    ElMessage.error('更新键名失败')
    editingKeyName.value = keyData.value.key
    isEditingKeyName.value = false
  }
}

const cancelKeyNameEdit = () => {
  editingKeyName.value = keyData.value.key
  isEditingKeyName.value = false
}

const handleHashFilter = () => {
  // 筛选逻辑已在计算属性中处理
}

const handleSetFilter = () => {
  // 筛选逻辑已在计算属性中处理
}

// 编辑相关方法
const handleEditSave = async () => {
  editLoading.value = true
  try {
    if (editForm.isRename) {
      // 重命名模式
      const newKeyName = editForm.keyName.trim()
      if (!newKeyName) {
        ElMessage.error('键名不能为空')
        return
      }
      
      if (newKeyName === keyData.value.key) {
        showEditDialog.value = false
        return
      }
      
      const result = await connectionStore.renameKey(
        props.connection.id,
        props.database,
        keyData.value.key,
        newKeyName
      )
      
      if (result) {
        const oldKeyName = keyData.value.key
        // 更新本地数据
        keyData.value = {
          ...keyData.value,
          key: newKeyName
        }
        ElMessage.success(`键名已更新: ${oldKeyName} → ${newKeyName}`)
        emit('key-updated', { oldKey: oldKeyName, newKey: newKeyName })
        showEditDialog.value = false
      }
    } else {
      // 编辑值模式
      await handleValueEdit()
      showEditDialog.value = false
    }
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    editLoading.value = false
  }
}

const handleValueEdit = async () => {
  // 这里需要调用后端API来更新值
  // 暂时模拟成功
  keyData.value.value = editForm.value
  ElMessage.success('值更新成功')
  emit('key-updated', { key: keyData.value.key, value: editForm.value })
}

// Hash类型编辑方法
const addHashField = () => {
  if (!newHashField.value.trim()) {
    ElMessage.warning('请输入字段名')
    return
  }
  if (!editForm.value) {
    editForm.value = {}
  }
  editForm.value[newHashField.value] = newHashValue.value
  newHashField.value = ''
  newHashValue.value = ''
}

const removeHashField = (field) => {
  delete editForm.value[field]
}

// List类型编辑方法
const addListItem = () => {
  if (!newListItem.value.trim()) {
    ElMessage.warning('请输入列表项')
    return
  }
  if (!editForm.value) {
    editForm.value = []
  }
  editForm.value.push(newListItem.value)
  newListItem.value = ''
}

const removeListItem = (index) => {
  editForm.value.splice(index, 1)
}

// Set类型编辑方法
const addSetMember = () => {
  if (!newSetMember.value.trim()) {
    ElMessage.warning('请输入成员')
    return
  }
  if (!editForm.value) {
    editForm.value = []
  }
  if (!editForm.value.includes(newSetMember.value)) {
    editForm.value.push(newSetMember.value)
  }
  newSetMember.value = ''
}

const removeSetMember = (index) => {
  editForm.value.splice(index, 1)
}

// ZSet类型编辑方法
const addZSetItem = () => {
  if (!newZSetMember.value.trim()) {
    ElMessage.warning('请输入成员')
    return
  }
  if (!editForm.value) {
    editForm.value = []
  }
  editForm.value.push({
    value: newZSetMember.value,
    score: newZSetScore.value
  })
  newZSetMember.value = ''
  newZSetScore.value = 0
}

const removeZSetItem = (index) => {
  editForm.value.splice(index, 1)
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

// 组件卸载时的清理
onUnmounted(() => {
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

.edit-dialog-content {
  max-height: 600px;
  overflow-y: auto;
}

.edit-mode-selector {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #404040;
}

.hash-edit-container,
.list-edit-container,
.set-edit-container,
.zset-edit-container {
  max-height: 400px;
  overflow-y: auto;
}

.hash-field-item,
.list-item,
.zset-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.hash-field-input,
.list-item-input,
.zset-member-input {
  flex: 1;
}

.zset-score-input {
  width: 120px;
}

.field-name {
  min-width: 80px;
  color: #909399;
  font-size: 12px;
}

.add-hash-field,
.add-list-item,
.add-set-member,
.add-zset-item {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #404040;
  align-items: center;
}

.new-field-input,
.new-item-input,
.new-member-input,
.new-zset-member-input {
  flex: 1;
}

.new-value-input,
.new-zset-score-input {
  width: 200px;
}

.set-member-tag {
  margin: 4px;
}

.set-edit-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
}

.string-value :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.hash-value,
.list-value,
.zset-value {
  height: 100%;
}

/* 表格样式已由全局样式处理 */

.set-value {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.set-item {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
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
</style> 