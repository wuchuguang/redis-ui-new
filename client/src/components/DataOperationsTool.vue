<template>
  <el-dialog
    v-model="visible"
    title="数据操作工具"
    width="1000px"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab" type="card">
      <!-- 批量操作 -->
      <el-tab-pane label="批量操作" name="batch">
        <BatchOperations
          v-if="activeTab === 'batch'"
          :connection="connection"
          @operation-complete="handleOperationComplete"
        />
      </el-tab-pane>

      <!-- 数据备份 -->
      <el-tab-pane label="数据备份" name="backup">
        <DataBackup
          v-if="activeTab === 'backup'"
          :connection="connection"
          @backup-complete="handleBackupComplete"
        />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'
import BatchOperations from './tools/BatchOperations.vue'
import DataBackup from './tools/DataBackup.vue'
import { operationLogger } from '../utils/operationLogger'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 响应式数据
const visible = ref(false)
const activeTab = ref('batch')

// 监听 modelValue 变化
import { watch } from 'vue'
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal) {
    activeTab.value = 'batch'
  }
})

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 处理操作完成
const handleOperationComplete = (result) => {
  operationLogger.logDataOperation('批量操作', result)
  ElMessage.success('批量操作执行完成')
}

// 处理备份完成
const handleBackupComplete = (result) => {
  operationLogger.logDataOperation('数据备份', result)
  ElMessage.success('数据备份完成')
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
/* 简化样式，无需复杂装饰 */
</style>