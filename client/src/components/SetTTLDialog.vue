<template>
  <FormDialog
    v-model="visible"
    title="设置过期时间"
    width="500px"
    :form-data="ttlForm"
    :rules="ttlRules"
    :loading="loading"
    @confirm="handleConfirm"
    @close="handleClose"
  >
    <el-form-item label="TTL值" prop="ttl">
      <el-input-number
        v-model="ttlForm.ttl"
        :min="0"
        :max="999999999"
        placeholder="请输入TTL值"
        style="width: 200px"
      />
    </el-form-item>
    <el-form-item label="时间单位">
      <el-select v-model="ttlForm.unit" style="width: 200px">
        <el-option label="秒" value="seconds" />
        <el-option label="分钟" value="minutes" />
        <el-option label="小时" value="hours" />
        <el-option label="天" value="days" />
      </el-select>
    </el-form-item>
    <el-form-item label="预览">
      <span class="ttl-preview">
        {{ formatTTLPreview() }}
      </span>
    </el-form-item>
  </FormDialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
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
  keyName: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(false)
const loading = ref(false)

// TTL设置表单
const ttlForm = reactive({
  ttl: 3600, // 默认1小时
  unit: 'seconds' // 时间单位：seconds, minutes, hours, days
})

const ttlRules = {
  ttl: [
    { required: true, message: '请输入TTL值', trigger: 'blur' },
    { type: 'number', min: 0, message: 'TTL值必须大于等于0', trigger: 'blur' }
  ]
}

// 监听modelValue变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 重置表单
    ttlForm.ttl = 3600
    ttlForm.unit = 'seconds'
  }
})

// 监听visible变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 格式化TTL预览
const formatTTLPreview = () => {
  let ttlInSeconds = ttlForm.ttl
  switch (ttlForm.unit) {
    case 'minutes':
      ttlInSeconds = ttlForm.ttl * 60
      break
    case 'hours':
      ttlInSeconds = ttlForm.ttl * 3600
      break
    case 'days':
      ttlInSeconds = ttlForm.ttl * 86400
      break
  }
  
  return formatTTL(ttlInSeconds)
}

// 格式化TTL显示
const formatTTL = (ttl) => {
  if (ttl === -1) return '永不过期'
  if (ttl === -2) return '键不存在'
  if (ttl < 0) return '未知'
  
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

// 处理确认
const handleConfirm = async () => {
  try {
    loading.value = true
    
    // 根据时间单位计算秒数
    let ttlInSeconds = ttlForm.ttl
    switch (ttlForm.unit) {
      case 'minutes':
        ttlInSeconds = ttlForm.ttl * 60
        break
      case 'hours':
        ttlInSeconds = ttlForm.ttl * 3600
        break
      case 'days':
        ttlInSeconds = ttlForm.ttl * 86400
        break
    }
    
    const connectionStore = useConnectionStore()
    const result = await connectionStore.setKeyTTL(
      props.connection.id,
      props.database,
      props.keyName,
      ttlInSeconds
    )
    
    if (result) {
      // 记录操作日志
      operationLogger.logTTLSet(props.keyName, ttlInSeconds, props.connection)
      
      // 发出成功事件
      emit('success', {
        keyName: props.keyName,
        ttl: ttlInSeconds,
        formattedTTL: formatTTL(ttlInSeconds)
      })
      
      // 关闭对话框
      handleClose()
    }
  } catch (error) {
    console.error('设置TTL失败:', error)
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
.ttl-preview {
  color: var(--el-text-color-regular);
  font-size: 14px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  display: inline-block;
  min-width: 200px;
}

</style> 