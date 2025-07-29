<template>
  <el-dialog
    v-model="dialogVisible"
    title="新建Redis连接"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="表单模式" name="form">
        <div class="form-section">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="100px"
            class="connection-form"
          >
            <el-form-item label="连接名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入连接名称" />
            </el-form-item>
            
            <el-form-item label="主机地址" prop="host">
              <el-input v-model="form.host" placeholder="localhost" />
            </el-form-item>
            
            <el-form-item label="端口" prop="port">
              <el-input-number
                v-model="form.port"
                :min="1"
                :max="65535"
                placeholder="6379"
                style="width: 100%"
              />
            </el-form-item>
            
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="可选，留空表示无密码"
                show-password
              />
            </el-form-item>
            
            <el-form-item label="数据库" prop="database">
              <el-input-number
                v-model="form.database"
                :min="0"
                :max="15"
                placeholder="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="JSON模式" name="json">
        <div style="padding: 20px;">
          <textarea
            v-model="jsonConfig"
            placeholder="输入连接配置（支持JavaScript对象格式），例如：
{
  port: 6379, // Redis port
  host: '172.20.100.141', // Redis host
  password: '2341a3FDEWE41dfaEFAA',
  db: 0,
}"
            style="width: 100%; height: 300px; padding: 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-family: monospace; font-size: 13px; resize: vertical;"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleClose">取消</el-button>
        <el-button type="primary" @click="testConnection" :loading="testing">
          测试连接
        </el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">
          创建连接
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useConnectionStore } from '../stores/connection'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'connection-created'])

const connectionStore = useConnectionStore()

// 响应式数据
const testing = ref(false)
const creating = ref(false)
const formRef = ref()
const activeTab = ref('form') // 当前激活的tab
const jsonConfig = ref('') // JSON配置文本

const form = reactive({
  name: '',
  host: 'localhost',
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
    { required: true, message: '请输入端口号', trigger: 'blur' }
  ]
}

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const handleClose = () => {
  resetForm()
  dialogVisible.value = false
}

function convertToJson(str) {
    // 移除行注释和块注释
    const removeComments = str
        .replace(/\/\/.*$/gm, '') // 移除单行注释
        .replace(/\/\*[\s\S]*?\*\//g, ''); // 移除多行注释
    
    // 处理不规范的键名（添加双引号）
    const addQuotesToKeys = removeComments
        .replace(/([\{\s,])([a-zA-Z_$][a-zA-Z_$0-9]*)(\s*:)/g, '$1"$2"$3');
    
    try {
        // 解析处理后的字符串
        return JSON.parse(addQuotesToKeys);
    } catch (error) {
        console.error('第一次解析失败，尝试宽松模式:', error);
        
        // 宽松模式：尝试修复更多不规范格式
        const jstring = addQuotesToKeys
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // 处理单引号或无引号的键
            .replace(/:\s*'([^']*)'/g, ':"$1"') // 处理单引号值
            .replace(/,\s*([}\]])/g, '$1'); // 移除尾随逗号
        
        try {
            return JSON.parse(jstring);
        } catch (error) {
            console.error('宽松模式解析失败:', error);
            return null;
        }
    }
}
const testConnection = async () => {
  testing.value = true
  try {
    let connectionData
    
    if (activeTab.value === 'json') {
      // JSON模式：直接解析JSON配置
      if (!jsonConfig.value.trim()) {
        ElMessage.warning('请输入连接配置JSON')
        return
      }
      
      try {
        // 直接使用eval解析JavaScript对象
        connectionData = convertToJson(jsonConfig.value)
        
        // 验证必要字段
        if (!connectionData.host) {
          ElMessage.error('缺少host字段')
          return
        }
        if (!connectionData.port) {
          ElMessage.error('缺少port字段')
          return
        }
        
      } catch (error) {
        console.error('解析错误:', error) // 调试用
        ElMessage.error('JSON格式错误，请检查配置')
        return
      }
    } else {
      // 表单模式：使用表单数据
      if (!formRef.value) return
      
      const valid = await formRef.value.validate()
      if (!valid) return
      
      connectionData = { ...form }
    }
    
    const success = await connectionStore.testConnection(connectionData)
    if (success) {
      ElMessage.success('连接测试成功')
    }
  } finally {
    testing.value = false
  }
}

const handleCreate = async () => {
  creating.value = true
  try {
    let connectionData
    
    if (activeTab.value === 'json') {
      // JSON模式：直接解析JSON配置
      if (!jsonConfig.value.trim()) {
        ElMessage.warning('请输入连接配置JSON')
        return
      }
      
      try {
        // 使用convertToJson函数解析JavaScript对象
        connectionData = convertToJson(jsonConfig.value)
        
        if (!connectionData) {
          ElMessage.error('JSON格式错误，请检查配置')
          return
        }
        
        // 验证必要字段
        if (!connectionData.host) {
          ElMessage.error('缺少host字段')
          return
        }
        if (!connectionData.port) {
          ElMessage.error('缺少port字段')
          return
        }
        
        // 添加连接名称
        if (!connectionData.name) {
          connectionData.name = `${connectionData.host}:${connectionData.port}`
        }
        
      } catch (error) {
        ElMessage.error('JSON格式错误，请检查配置')
        return
      }
    } else {
      // 表单模式：使用表单数据
      if (!formRef.value) return
      
      const valid = await formRef.value.validate()
      if (!valid) return
      
      connectionData = { ...form }
    }
    
    const newConnection = await connectionStore.createConnection(connectionData)
    if (newConnection) {
      ElMessage.success('连接创建成功')
      emit('connection-created', newConnection)
      handleClose()
    }
  } finally {
    creating.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.host = 'localhost'
  form.port = 6379
  form.password = ''
  form.database = 0
  activeTab.value = 'form'
  jsonConfig.value = ''
  formRef.value?.resetFields()
}

// 清空JSON配置
const clearJsonConfig = () => {
  jsonConfig.value = ''
}

// 监听对话框打开
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}

.form-section {
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.connection-form {
  margin: 0;
}

.json-config-section {
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.config-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.config-actions {
  display: flex;
  gap: 8px;
}

/* 确保textarea在JSON模式下正常显示 */
:deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* 优化tab样式 */
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  border-radius: 6px 6px 0 0;
  transition: all 0.3s ease;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

/* 优化表单样式 */
:deep(.el-form-item__label) {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

:deep(.el-input__inner),
:deep(.el-input-number .el-input__inner) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.el-input__inner):focus,
:deep(.el-input-number .el-input__inner):focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}
</style> 