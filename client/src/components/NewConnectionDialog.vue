<template>
  <el-dialog
    v-model="dialogVisible"
    title="新建Redis连接"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
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

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="testConnection" :loading="testing">
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

const testConnection = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      testing.value = true
      try {
        const success = await connectionStore.testConnection(form)
        if (success) {
          ElMessage.success('连接测试成功')
        }
      } finally {
        testing.value = false
      }
    }
  })
}

const handleCreate = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      creating.value = true
      try {
        const newConnection = await connectionStore.createConnection({ ...form })
        if (newConnection) {
          ElMessage.success('连接创建成功')
          emit('connection-created', newConnection)
          handleClose()
        }
      } finally {
        creating.value = false
      }
    }
  })
}

const resetForm = () => {
  form.name = ''
  form.host = 'localhost'
  form.port = 6379
  form.password = ''
  form.database = 0
  formRef.value?.resetFields()
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
</style> 