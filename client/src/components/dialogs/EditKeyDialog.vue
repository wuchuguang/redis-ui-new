<template>
  <el-dialog
    v-model="visible"
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
        <el-form label-width="80px">
          <el-form-item label="原键名">
            <el-input v-model="keyData.key" readonly />
          </el-form-item>
          <el-form-item label="新键名">
            <el-input 
              v-model="editForm.keyName" 
              placeholder="请输入新的键名"
              @keyup.enter="handleSave"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 编辑值模式 -->
      <div v-else class="edit-value-mode">
        <el-form label-width="80px">
          <el-form-item label="键名">
            <el-input v-model="keyData.key" readonly />
          </el-form-item>
          <el-form-item label="数据类型">
            <el-input v-model="editForm.type" readonly />
          </el-form-item>
          
          <!-- String类型编辑 -->
          <el-form-item v-if="editForm.type === 'string'" label="值">
            <div class="string-edit-container">
              <div class="edit-toolbar">
                <el-button 
                  type="text" 
                  size="small"
                  @click="formatMainJson"
                  :disabled="!isValidMainJson"
                  title="格式化JSON"
                >
                  <el-icon><Setting /></el-icon>
                  格式化JSON
                </el-button>
                <el-button 
                  type="text" 
                  size="small"
                  @click="validateMainJson"
                  :disabled="!editForm.value"
                  title="验证JSON"
                >
                  <el-icon><Check /></el-icon>
                  验证JSON
                </el-button>
                <el-button 
                  type="text" 
                  size="small"
                  @click="minifyMainJson"
                  :disabled="!isValidMainJson"
                  title="压缩JSON"
                >
                  <el-icon><DocumentCopy /></el-icon>
                  压缩JSON
                </el-button>
                <el-button 
                  type="text" 
                  size="small"
                  @click="clearMainValue"
                  title="清空内容"
                >
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
              </div>
              <el-input
                v-model="editForm.value"
                type="textarea"
                :rows="10"
                placeholder="请输入字符串值，支持JSON格式"
                @keyup.enter="handleSave"
                class="string-edit-input"
              />
              
              <div v-if="isValidMainJson" class="json-info">
                <el-icon><SuccessFilled /></el-icon>
                <span>有效的JSON格式</span>
              </div>
            </div>
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
                  @keyup.enter="addHashField"
                />
                <el-input
                  v-model="newHashValue"
                  placeholder="新字段值"
                  class="new-value-input"
                  @keyup.enter="addHashField"
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
                  @keyup.enter="addListItem"
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
                  @keyup.enter="addZSetItem"
                />
                <el-input-number
                  v-model="newZSetScore"
                  placeholder="分数"
                  class="new-zset-score-input"
                  @keyup.enter="addZSetItem"
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
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="loading">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Setting,
  Check,
  DocumentCopy,
  Delete,
  SuccessFilled
} from '@element-plus/icons-vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  keyData: {
    type: Object,
    required: true
  },
  connection: {
    type: Object,
    required: true
  },
  database: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const editForm = reactive({
  keyName: '',
  value: null,
  type: '',
  isRename: false
})

// 新增字段相关
const newHashField = ref('')
const newHashValue = ref('')
const newListItem = ref('')
const newSetMember = ref('')
const newZSetMember = ref('')
const newZSetScore = ref(0)

// JSON处理相关状态
const mainJsonError = ref('')

// 计算属性
const isValidMainJson = computed(() => {
  if (!editForm.value || !editForm.value.trim()) {
    return false
  }
  try {
    JSON.parse(editForm.value)
    return true
  } catch (error) {
    return false
  }
})

// 监听器
watch(() => visible.value, (newVal) => {
  if (newVal) {
    // 初始化编辑表单
    editForm.keyName = props.keyData.key
    editForm.value = JSON.parse(JSON.stringify(props.keyData.value)) // 深拷贝
    editForm.type = props.keyData.type
    editForm.isRename = false
    
    // 清空新增字段
    newHashField.value = ''
    newHashValue.value = ''
    newListItem.value = ''
    newSetMember.value = ''
    newZSetMember.value = ''
    newZSetScore.value = 0
  }
})

watch(() => editForm.value, () => {
  if (editForm.type === 'string') {
    validateMainJsonInput()
  }
}, { immediate: false })

watch(() => editForm.type, () => {
  if (editForm.type === 'string') {
    validateMainJsonInput()
  }
}, { immediate: false })

// 方法
const handleSave = async () => {
  loading.value = true
  try {
    if (editForm.isRename) {
      // 重命名模式
      const newKeyName = editForm.keyName.trim()
      if (!newKeyName) {
        ElMessage.error('键名不能为空')
        return
      }
      
      if (newKeyName === props.keyData.key) {
        visible.value = false
        return
      }
      
      emit('save', {
        type: 'rename',
        oldKeyName: props.keyData.key,
        newKeyName: newKeyName
      })
    } else {
      // 编辑值模式
      emit('save', {
        type: 'edit',
        value: editForm.value
      })
    }
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}

// JSON处理相关方法
const validateMainJsonInput = () => {
  // 计算属性会自动更新，不需要手动设置
  if (!editForm.value || !editForm.value.trim()) {
    mainJsonError.value = ''
    return
  }
  
  try {
    JSON.parse(editForm.value)
    mainJsonError.value = ''
  } catch (error) {
    mainJsonError.value = ''
  }
}

const formatMainJson = () => {
  if (!isValidMainJson.value) return
  
  try {
    const parsed = JSON.parse(editForm.value)
    editForm.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON格式化完成')
  } catch (error) {
    ElMessage.error('JSON格式化失败')
  }
}

const validateMainJson = () => {
  if (!editForm.value || !editForm.value.trim()) {
    ElMessage.warning('请输入要验证的内容')
    return
  }
  
  try {
    JSON.parse(editForm.value)
    ElMessage.success('JSON格式验证通过')
  } catch (error) {
    ElMessage.error(`JSON格式验证失败: ${error.message}`)
  }
}

const minifyMainJson = () => {
  if (!isValidMainJson.value) return
  
  try {
    const parsed = JSON.parse(editForm.value)
    editForm.value = JSON.stringify(parsed)
    ElMessage.success('JSON压缩完成')
  } catch (error) {
    ElMessage.error('JSON压缩失败')
  }
}

const clearMainValue = () => {
  editForm.value = ''
  mainJsonError.value = ''
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
</script>

<style scoped>
.edit-dialog-content {
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
}

.edit-mode-selector {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #404040;
}

.rename-mode,
.edit-value-mode {
  width: 100%;
  overflow-x: hidden;
}

.rename-mode :deep(.el-form-item__content),
.edit-value-mode :deep(.el-form-item__content) {
  width: 100%;
}

.hash-edit-container,
.list-edit-container,
.set-edit-container,
.zset-edit-container {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
}

.hash-field-item,
.list-item,
.zset-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

.hash-field-input,
.list-item-input,
.zset-member-input {
  flex: 1;
  min-width: 200px;
}

.zset-score-input {
  flex: 1;
  min-width: 200px;
}

.field-name {
  min-width: 80px;
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
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
  flex-wrap: wrap;
  width: 100%;
}

.new-field-input,
.new-item-input,
.new-member-input,
.new-zset-member-input {
  flex: 1;
  min-width: 200px;
}

.new-value-input,
.new-zset-score-input {
  flex: 1;
  min-width: 200px;
}

.set-member-tag {
  margin: 4px;
}

.set-edit-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* String编辑相关样式 */
.string-edit-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
}

.edit-toolbar .el-button {
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.edit-toolbar .el-button:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color);
}

.edit-toolbar .el-button:disabled {
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

.string-edit-input {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.json-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-success);
  font-size: 12px;
  padding: 4px 8px;
  background-color: var(--el-color-success-light-9);
  border-radius: 4px;
  border: 1px solid var(--el-color-success-light-7);
}
</style> 