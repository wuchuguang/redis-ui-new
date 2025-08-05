<template>
  <el-dialog
    v-model="visible"
    title="原始数据"
    width="800px"
  >
    <pre class="raw-data">{{ JSON.stringify(keyData, null, 2) }}</pre>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  keyData: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
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

.raw-data {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

.raw-data::-webkit-scrollbar {
  width: 2px;
}

.raw-data::-webkit-scrollbar-track {
  background: transparent;
}

.raw-data::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 1px;
}

.raw-data::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
</style> 