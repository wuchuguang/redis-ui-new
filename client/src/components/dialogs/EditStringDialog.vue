<template>
  <el-dialog
    v-model="visible"
    title="编辑String值"
    width="800px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="editForm"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="值" prop="value">
        <div class="string-edit-container">
          <div class="edit-toolbar">
            <el-button 
              type="text" 
              size="small"
              @click="formatJson"
              :disabled="!isValidJson"
              title="格式化JSON"
            >
              <el-icon><Setting /></el-icon>
              格式化JSON
            </el-button>
            <el-button 
              type="text" 
              size="small"
              @click="validateJson"
              :disabled="!editForm.value"
              title="验证JSON"
            >
              <el-icon><Check /></el-icon>
              验证JSON
            </el-button>
            <el-button 
              type="text" 
              size="small"
              @click="minifyJson"
              :disabled="!isValidJson"
              title="压缩JSON"
            >
              <el-icon><DocumentCopy /></el-icon>
              压缩JSON
            </el-button>
            <el-button 
              type="text" 
              size="small"
              @click="clearValue"
              title="清空内容"
            >
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
          </div>
          <el-input 
            v-model="editForm.value" 
            type="textarea"
            :rows="12"
            placeholder="请输入String值，支持JSON格式"
            @keyup.enter="handleSave"
            class="string-edit-input"
          />

          <div v-if="isValidJson" class="json-info">
            <el-icon><SuccessFilled /></el-icon>
            <span>有效的JSON格式</span>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSave"
          :loading="loading"
        >
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
  value: {
    type: String,
    default: ''
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
const formRef = ref(null)

const editForm = reactive({
  value: ''
})

const rules = {
  value: [
    { required: true, message: '请输入String值', trigger: 'blur' }
  ]
}

// JSON处理相关状态
const jsonError = ref('')
const isValidJson = ref(false)

// 监听器
watch(() => visible.value, (newVal) => {
  if (newVal) {
    editForm.value = props.value || ''
  }
})

watch(() => editForm.value, () => {
  validateJsonInput()
}, { immediate: false })

// 方法
const handleSave = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    emit('save', editForm.value)
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}

// JSON处理相关方法
const validateJsonInput = () => {
  if (!editForm.value || !editForm.value.trim()) {
    jsonError.value = ''
    isValidJson.value = false
    return
  }
  
  try {
    JSON.parse(editForm.value)
    jsonError.value = ''
    isValidJson.value = true
  } catch (error) {
    jsonError.value = ''
    isValidJson.value = false
  }
}

const formatJson = () => {
  if (!isValidJson.value) return
  
  try {
    const parsed = JSON.parse(editForm.value)
    editForm.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON格式化完成')
  } catch (error) {
    ElMessage.error('JSON格式化失败')
  }
}

const validateJson = () => {
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

const minifyJson = () => {
  if (!isValidJson.value) return
  
  try {
    const parsed = JSON.parse(editForm.value)
    editForm.value = JSON.stringify(parsed)
    ElMessage.success('JSON压缩完成')
  } catch (error) {
    ElMessage.error('JSON压缩失败')
  }
}

const clearValue = () => {
  editForm.value = ''
  jsonError.value = ''
  isValidJson.value = false
}
</script>

<style scoped>
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