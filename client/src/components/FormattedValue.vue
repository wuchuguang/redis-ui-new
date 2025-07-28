<template>
  <div class="formatted-value">
    <span class="value-text">{{ displayValue }}</span>
    <div class="action-buttons">
      <el-button 
        type="text" 
        size="small" 
        class="copy-btn"
        @click="handleCopy"
        title="复制值"
      >
        <el-icon><CopyDocument /></el-icon>
      </el-button>
      <el-dropdown @command="(command) => handleFormat(command)" trigger="click">
        <el-button type="text" size="small" class="format-btn" title="格式化">
          <el-icon><Setting /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="original">原始值</el-dropdown-item>
            <el-dropdown-item command="unix_timestamp" v-if="isUnixTimestamp">Unix秒转成时间</el-dropdown-item>
            <el-dropdown-item command="unix_timestamp_ms" v-if="isUnixTimestampMs">Unix毫秒转成时间</el-dropdown-item>
            <el-dropdown-item command="json" v-if="isJson">JSON格式化</el-dropdown-item>
            <el-dropdown-item command="base64" v-if="isBase64">Base64解码</el-dropdown-item>
            <el-dropdown-item command="url_decode" v-if="isUrlEncoded">URL解码</el-dropdown-item>
            <el-dropdown-item command="hex_decode" v-if="isHex">十六进制解码</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, CopyDocument } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  value: {
    type: String,
    required: true
  },
  rowKey: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['formatted'])

// 复制功能
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(displayValue.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    // 如果clipboard API不可用，使用传统方法
    try {
      const textArea = document.createElement('textarea')
      textArea.value = displayValue.value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('已复制到剪贴板')
    } catch (fallbackError) {
      ElMessage.error('复制失败')
    }
  }
}

// 响应式数据
const formattedValue = ref(null)
const currentFormat = ref('original')

// 计算属性
const displayValue = computed(() => {
  return formattedValue.value || props.value
})

// 检测方法
const isUnixTimestamp = computed(() => {
  if (!props.value || typeof props.value !== 'string') return false
  const num = parseInt(props.value)
  return !isNaN(num) && num > 1000000000 && num < 9999999999
})

const isUnixTimestampMs = computed(() => {
  if (!props.value || typeof props.value !== 'string') return false
  const num = parseInt(props.value)
  return !isNaN(num) && num > 1000000000000 && num < 9999999999999
})

const isJson = computed(() => {
  if (!props.value || typeof props.value !== 'string') return false
  try {
    JSON.parse(props.value)
    return true
  } catch {
    return false
  }
})

const isBase64 = computed(() => {
  if (!props.value || typeof props.value !== 'string') return false
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  return base64Regex.test(props.value) && props.value.length % 4 === 0
})

const isUrlEncoded = computed(() => {
  if (!props.value || typeof props.value !== 'string') return false
  return /%[0-9A-Fa-f]{2}/.test(props.value)
})

const isHex = computed(() => {
  if (!props.value || typeof props.value !== 'string') return false
  return /^[0-9A-Fa-f]+$/.test(props.value) && props.value.length % 2 === 0
})

// 格式化方法
const handleFormat = (command) => {
  let result = props.value
  
  try {
    switch (command) {
      case 'original':
        result = props.value
        break
      case 'unix_timestamp':
        const timestamp = parseInt(props.value)
        if (!isNaN(timestamp)) {
          const date = new Date(timestamp * 1000)
          result = `${date.toLocaleString('zh-CN')} (${timestamp})`
        }
        break
      case 'unix_timestamp_ms':
        const timestampMs = parseInt(props.value)
        if (!isNaN(timestampMs)) {
          const date = new Date(timestampMs)
          result = `${date.toLocaleString('zh-CN')} (${timestampMs})`
        }
        break
      case 'json':
        const jsonObj = JSON.parse(props.value)
        result = JSON.stringify(jsonObj, null, 2)
        break
      case 'base64':
        try {
          const decoded = atob(props.value)
          result = `解码: ${decoded}`
        } catch {
          result = 'Base64解码失败'
        }
        break
      case 'url_decode':
        const decoded = decodeURIComponent(props.value)
        result = `解码: ${decoded}`
        break
      case 'hex_decode':
        try {
          const hexString = props.value.replace(/\s/g, '')
          const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
          const decoder = new TextDecoder('utf-8')
          const decoded = decoder.decode(bytes)
          result = `解码: ${decoded}`
        } catch {
          result = '十六进制解码失败'
        }
        break
      default:
        result = props.value
    }
    
    formattedValue.value = result
    currentFormat.value = command
    
    // 根据格式化类型显示不同的成功消息
    let successMessage = '格式化完成'
    switch (command) {
      case 'unix_timestamp':
        successMessage = 'Unix秒已转换为时间格式'
        break
      case 'unix_timestamp_ms':
        successMessage = 'Unix毫秒已转换为时间格式'
        break
      case 'json':
        successMessage = 'JSON格式化完成'
        break
      case 'base64':
        successMessage = 'Base64解码完成'
        break
      case 'url_decode':
        successMessage = 'URL解码完成'
        break
      case 'hex_decode':
        successMessage = '十六进制解码完成'
        break
      case 'original':
        successMessage = '已恢复原始值'
        break
    }
    
    ElMessage.success(successMessage)
    
    // 通知父组件格式化完成
    emit('formatted', {
      rowKey: props.rowKey,
      originalValue: props.value,
      formattedValue: result,
      formatType: command
    })
  } catch (error) {
    ElMessage.error('格式化失败: ' + error.message)
  }
}

// 监听值变化，重置格式化状态
watch(() => props.value, () => {
  formattedValue.value = null
  currentFormat.value = 'original'
})
</script>

<style scoped>
.formatted-value {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.value-text {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.formatted-value:hover .action-buttons {
  opacity: 1;
}

.copy-btn,
.format-btn {
  padding: 4px;
  min-width: auto;
}

.copy-btn:hover,
.format-btn:hover {
  background-color: var(--el-fill-color);
}
</style> 