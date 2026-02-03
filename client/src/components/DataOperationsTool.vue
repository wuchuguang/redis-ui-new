<template>
  <el-dialog
    v-model="visible"
    width="1600px"
    :close-on-click-modal="false"
    class="data-operations-dialog"
    top="3vh"
    :show-close="false"
  >
    <!-- 自定义头部 -->
    <template #header>
      <div class="dialog-header">
        <div class="header-right">
          <el-button
            type="text"
            @click="handleClose"
            class="close-btn"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
    </template>

    <!-- 主要内容 -->
    <div class="dialog-content">
      <!-- 标签页导航 -->
      <div class="tab-navigation">
        <div
          v-for="tab in tabs"
          :key="tab.name"
          :class="['tab-item', { active: activeTab === tab.name }]"
          @click="activeTab = tab.name"
        >
          <el-icon class="tab-icon"><component :is="tab.icon" /></el-icon>
          <span class="tab-label">{{ tab.label }}</span>
        </div>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 批量操作 -->
        <div v-show="activeTab === 'batch'" class="tab-pane">
          <BatchOperations
            :connection="connection"
            @operation-complete="handleOperationComplete"
          />
        </div>

        <!-- 数据备份 -->
        <div v-show="activeTab === 'backup'" class="tab-pane">
          <DataBackup
            :connection="connection"
            @backup-complete="handleBackupComplete"
          />
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Operation, 
  Download, 
  Close, 
  VideoPlay, 
  DataAnalysis 
} from '@element-plus/icons-vue'
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

// 标签页配置
const tabs = [
  {
    name: 'batch',
    label: '批量操作',
    icon: 'VideoPlay'
  },
  {
    name: 'backup',
    label: '数据备份',
    icon: 'DataAnalysis'
  }
]

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
.data-operations-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: none;
  }

  :deep(.el-dialog__header) {
    padding: 0;
    border-bottom: none;
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }

  :deep(.el-dialog__footer) {
    display: none;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.dialog-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.header-content {
  .dialog-title {
    margin: 0 0 4px 0;
    font-size: 24px;
    font-weight: 700;
    color: white;
  }

  .dialog-subtitle {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 400;
  }
}

.header-right {
  position: relative;
  z-index: 1;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .el-icon {
    font-size: 18px;
  }
}

.dialog-content {
  background: #1a1a1a;
  min-height: 600px;
}

.tab-navigation {
  display: flex;
  background: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0 32px;
  gap: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  cursor: pointer;
  border-radius: 12px 12px 0 0;
  transition: all 0.3s ease;
  position: relative;
  font-weight: 500;
  color: #a0a0a0;

  &:hover {
    background: var(--el-fill-color);
    color: var(--el-text-color-primary);
  }

  &.active {
    background: #667eea;
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

    &::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: #667eea;
    }
  }

  .tab-icon {
    font-size: 18px;
  }

  .tab-label {
    font-size: 14px;
    font-weight: 600;
  }
}

.tab-content {
  padding: 32px;
  background: var(--el-bg-color-overlay);
  border-radius: 0 0 16px 16px;
}

.tab-pane {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .data-operations-dialog {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 2vh auto;
    }
  }

  .dialog-header {
    padding: 20px 24px;
  }

  .header-content .dialog-title {
    font-size: 20px;
  }

  .tab-navigation {
    padding: 0 24px;
  }

  .tab-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .dialog-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-left {
    flex-direction: column;
    gap: 12px;
  }

  .tab-navigation {
    flex-direction: column;
    gap: 0;
  }

  .tab-item {
    border-radius: 0;
    justify-content: center;
  }
}
</style>

<style scoped>
.data-operations-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.data-operations-tabs {
  :deep(.el-tabs__content) {
    padding: 20px;
  }
}

.dialog-footer {
  text-align: right;
}
</style> 