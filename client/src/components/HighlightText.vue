<template>
  <span v-html="highlightedText"></span>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  text: {
    type: String,
    required: true
  },
  searchPattern: {
    type: String,
    default: ''
  },
  highlightClass: {
    type: String,
    default: 'highlight-match'
  }
})

// 高亮文本计算属性
const highlightedText = computed(() => {
  if (!props.searchPattern || !props.text) {
    return escapeHtml(props.text || '')
  }
  
  // 将搜索模式按分号分割成多个条件
  const patterns = props.searchPattern.split(';').map(p => p.trim()).filter(p => p)
  
  let result = escapeHtml(props.text)
  
  // 为每个模式添加高亮
  for (const pattern of patterns) {
    result = highlightPattern(result, pattern)
  }
  
  return result
})

// 转义HTML字符
const escapeHtml = (text) => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 高亮单个模式
const highlightPattern = (text, pattern) => {
  if (!pattern) return text
  
  // 如果模式包含通配符，需要特殊处理
  if (pattern.includes('*') || pattern.includes('?')) {
    return highlightWildcardPattern(text, pattern)
  }
  
  // 普通文本模式
  const regex = new RegExp(`(${escapeRegex(pattern)})`, 'gi')
  return text.replace(regex, `<span class="${props.highlightClass}">$1</span>`)
}

// 高亮通配符模式
const highlightWildcardPattern = (text, pattern) => {
  // 将通配符模式转换为正则表达式
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义正则特殊字符
    .replace(/\\\*/g, '.*') // * 匹配任意字符
    .replace(/\\\?/g, '.')  // ? 匹配单个字符
  
  try {
    const regex = new RegExp(`(${regexPattern})`, 'gi')
    return text.replace(regex, `<span class="${props.highlightClass}">$1</span>`)
  } catch (error) {
    console.error('通配符高亮错误:', error)
    // 如果正则表达式无效，回退到普通包含匹配
    const escapedPattern = escapeRegex(pattern)
    const regex = new RegExp(`(${escapedPattern})`, 'gi')
    return text.replace(regex, `<span class="${props.highlightClass}">$1</span>`)
  }
}

// 转义正则表达式特殊字符
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
/* 高亮样式 */
:deep(.highlight-match) {
  background-color: #ffeb3b;
  color: #000;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
}
</style> 