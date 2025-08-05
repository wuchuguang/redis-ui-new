<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑连接"
    width="500px"
    :close-on-click-modal="false"
    class="edit-connection-dialog"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="connection-form"
    >
      <el-form-item label="连接名称" prop="name">
        <el-input 
          v-model="form.name" 
          placeholder="请输入连接名称"
          @keyup.enter="handleUpdate"
        />
      </el-form-item>
      
      <el-form-item label="主机地址" prop="host">
        <el-input 
          v-model="form.host" 
          placeholder="请输入主机地址"
          @keyup.enter="handleUpdate"
        />
      </el-form-item>
      
      <el-form-item label="端口" prop="port">
        <el-input-number 
          v-model="form.port" 
          :min="1" 
          :max="65535"
          @keyup.enter="handleUpdate"
          controls-position="right"
        />
      </el-form-item>
      
      <el-form-item label="密码" prop="password">
        <el-input 
          v-model="form.password" 
          type="password" 
          placeholder="请输入密码（可选）"
          show-password
          @keyup.enter="handleUpdate"
        />
      </el-form-item>
      
      <el-form-item label="数据库" prop="database">
        <el-input-number 
          v-model="form.database" 
          :min="0" 
          :max="15"
          @keyup.enter="handleUpdate"
          controls-position="right"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="updating">
          {{ updating ? '保存中...' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { useConnectionStore } from '../../stores/connection'
import { operationLogger } from '../../utils/operationLogger'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'connection-updated'])

const connectionStore = useConnectionStore()

// 响应式数据
const updating = ref(false)
const formRef = ref()

const form = reactive({
  id: '',
  name: '',
  host: '',
  port: 6379,
  password: '',
  database: 0
})

const rules = {
  name: [
    { required: true, message: '请输入连接名称', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口', trigger: 'blur' }
  ]
}

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 监听连接变化，更新表单
watch(() => props.connection, (newConnection) => {
  if (newConnection) {
    Object.assign(form, {
      id: newConnection.id,
      name: newConnection.redis.name,
      host: newConnection.redis.host,
      port: newConnection.redis.port,
      password: newConnection.redis.password || '',
      database: newConnection.redis.database || 0
    })
  }
}, { immediate: true })

// 方法
const handleUpdate = async () => {
  try {
    await formRef.value.validate()
    updating.value = true
    
    const success = await connectionStore.updateConnection(form)
    if (success) {
      ElMessage.success('连接更新成功')
      operationLogger.logConnectionUpdated(form)
      dialogVisible.value = false
      emit('connection-updated', form)
    }
  } catch (error) {
    console.error('更新连接失败:', error)
    ElMessage.error('更新连接失败')
  } finally {
    updating.value = false
  }
}
</script>

<style scoped>
/* 对话框样式 */
.edit-connection-dialog :deep(.el-dialog) {
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.edit-connection-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 20px 24px 16px;
}

.edit-connection-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.edit-connection-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.edit-connection-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid var(--el-border-color-light);
  padding: 16px 24px;
}

/* 表单样式 */
.connection-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.connection-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.connection-form :deep(.el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.connection-form :deep(.el-input__wrapper:hover) {
  border-color: var(--el-color-primary);
}

.connection-form :deep(.el-input-number__wrapper) {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.connection-form :deep(.el-input-number__wrapper:hover) {
  border-color: var(--el-color-primary);
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-footer .el-button {
  border-radius: 6px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.dialog-footer .el-button:hover {
  transform: translateY(-1px);
}

.dialog-footer .el-button--primary:hover {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}
</style> 