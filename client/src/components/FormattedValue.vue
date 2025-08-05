<template>
  <div class="formatted-value">
    <span class="value-text">
      <HighlightText 
        :text="displayValue" 
        :search-pattern="searchPattern"
        highlight-class="value-highlight"
      />
    </span>
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
import { conversionEngine } from '../utils/conversionEngine'
import HighlightText from './HighlightText.vue'

// Props
const props = defineProps({
  value: {
    type: String,
    required: true
  },
  rowKey: {
    type: String,
    required: true
  },
  keyName: {
    type: String,
    default: ''
  },
  dataType: {
    type: String,
    default: 'string'
  },
  fieldName: {
    type: String,
    default: ''
  },
  searchPattern: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['formatted'])

// 复制功能
const handleCopy = async () => {
  // 复制当前显示的值（可能是转换后的值）
  const textToCopy = displayValue.value
  
  try {
    await navigator.clipboard.writeText(textToCopy)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    // 如果clipboard API不可用，使用传统方法
    try {
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
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
const conversionResult = ref(null)

// 计算属性
const displayValue = computed(() => {
  // 如果有用户选择的格式化，优先显示格式化后的值
  if (formattedValue.value) {
    return formattedValue.value
  }
  // 如果有转换规则，应用转换规则
  if (conversionResult.value && conversionResult.value.rule) {
    return applyConversionRule(conversionResult.value.rule)
  }
  // 否则显示原始值
  return props.value
})

// 检测方法 - 始终基于原始值进行检测
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

// 应用转换规则
const applyConversionRules = () => {
  if (!props.keyName || !props.value) return
  
  try {
    conversionResult.value = conversionEngine.convert(
      props.keyName,
      props.dataType,
      props.value,
      props.fieldName
    )
  } catch (error) {
    console.error('应用转换规则失败:', error)
    conversionResult.value = null
  }
}

// 应用转换规则到值
const applyConversionRule = (rule) => {
  if (!rule || !props.value) return props.value
  
  try {
    switch (rule.convertType) {
      case 'unix_timestamp_seconds':
        const timestamp = parseInt(props.value)
        if (!isNaN(timestamp)) {
          const date = new Date(timestamp * 1000)
          return date.toLocaleString('zh-CN')
        }
        break
      case 'unix_timestamp_milliseconds':
        const timestampMs = parseInt(props.value)
        if (!isNaN(timestampMs)) {
          const date = new Date(timestampMs)
          return date.toLocaleString('zh-CN')
        }
        break
      case 'large_number':
        const num = parseInt(props.value)
        if (!isNaN(num)) {
          if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
          if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
          if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
          return num.toString()
        }
        break
      case 'hex_to_text':
        try {
          const hex = props.value.replace(/\s/g, '')
          return String.fromCharCode(...hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
        } catch {
          return props.value
        }
      case 'base64_decode':
        try {
          return atob(props.value)
        } catch {
          return props.value
        }
      case 'json_format':
        try {
          const parsed = JSON.parse(props.value)
          return JSON.stringify(parsed, null, 2)
        } catch {
          return props.value
        }
      case 'status_mapping':
        const statusMap = {
          '1': '在线',
          '0': '离线',
          '2': '忙碌',
          'active': '活跃',
          'inactive': '非活跃'
        }
        return statusMap[props.value] || props.value
      case 'custom_mapping':
        if (rule.mappingConfig) {
          try {
            const mapping = typeof rule.mappingConfig === 'string' 
              ? JSON.parse(rule.mappingConfig) 
              : rule.mappingConfig
            return mapping[props.value] || props.value
          } catch {
            return props.value
          }
        }
        break
    }
  } catch (error) {
    console.error('应用转换规则失败:', error)
  }
  
  return props.value
}

// 格式化方法
const handleFormat = (command) => {
  // 始终基于原始值进行格式化
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

// 监听keyName、dataType、fieldName变化，应用转换规则
watch([() => props.keyName, () => props.dataType, () => props.fieldName, () => props.value], () => {
  applyConversionRules()
}, { immediate: true })
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
  min-height: 60px; /* 设置最小高度 */
  max-height: 200px; /* 增加最大高度 */
  overflow-y: auto;
  padding: 8px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
  min-width: 0; /* 确保flex项目可以收缩 */
  width: 100%; /* 确保占满可用宽度 */
}

.value-text::-webkit-scrollbar {
  width: 2px;
}

.value-text::-webkit-scrollbar-track {
  background: transparent;
}

.value-text::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 1px;
}

.value-text::-webkit-scrollbar-thumb:hover {
  background: #909399;
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

/* 值高亮样式 */
:deep(.value-highlight) {
  background-color: #ffeb3b;
  color: #000;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
}
</style> 