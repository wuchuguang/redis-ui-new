<template>
  <div class="operation-lock">
    <!-- 操作锁定状态显示 -->
    <div v-if="lockedOperations.length > 0" class="lock-status">
      <el-alert
        title="当前有操作正在进行中"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          <div class="lock-list">
            <div
              v-for="lock in lockedOperations"
              :key="lock.id"
              class="lock-item"
            >
              <el-icon class="lock-icon"><Lock /></el-icon>
              <span class="lock-info">
                <span class="lock-user">{{ lock.userName }}</span>
                正在
                <span class="lock-action">{{ getActionLabel(lock.action) }}</span>
                <span class="lock-target">{{ lock.target }}</span>
              </span>
              <span class="lock-time">{{ formatTime(lock.startTime) }}</span>
            </div>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 操作确认对话框 -->
    <el-dialog
      v-model="showConfirmDialog"
      title="操作确认"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="confirm-content">
        <el-icon class="confirm-icon" :class="confirmType"><Warning /></el-icon>
        <div class="confirm-message">
          <h4>{{ confirmTitle }}</h4>
          <p>{{ confirmMessage }}</p>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleConfirmCancel">取消</el-button>
          <el-button
            :type="confirmType === 'danger' ? 'danger' : 'primary'"
            @click="handleConfirmOk"
            :loading="confirmLoading"
          >
            {{ confirmButtonText }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 操作冲突对话框 -->
    <el-dialog
      v-model="showConflictDialog"
      title="操作冲突"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="conflict-content">
        <el-icon class="conflict-icon"><Warning /></el-icon>
        <div class="conflict-message">
          <h4>检测到操作冲突</h4>
          <p>{{ conflictMessage }}</p>
          <div class="conflict-details">
            <p><strong>冲突操作：</strong>{{ conflictDetails.action }}</p>
            <p><strong>操作者：</strong>{{ conflictDetails.userName }}</p>
            <p><strong>开始时间：</strong>{{ formatTime(conflictDetails.startTime) }}</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleConflictCancel">取消</el-button>
          <el-button type="warning" @click="handleConflictForce">
            强制操作
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, Warning } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useOperationLockStore } from '../stores/operationLock'

const userStore = useUserStore()
const operationLockStore = useOperationLockStore()

// 响应式数据
const showConfirmDialog = ref(false)
const showConflictDialog = ref(false)
const confirmLoading = ref(false)

// 确认对话框数据
const confirmData = ref({
  title: '',
  message: '',
  type: 'info',
  buttonText: '确定',
  onConfirm: null,
  onCancel: null
})

// 冲突对话框数据
const conflictData = ref({
  message: '',
  details: {},
  onForce: null,
  onCancel: null
})

// 计算属性
const lockedOperations = computed(() => operationLockStore.lockedOperations)
const confirmTitle = computed(() => confirmData.value.title)
const confirmMessage = computed(() => confirmData.value.message)
const confirmType = computed(() => confirmData.value.type)
const confirmButtonText = computed(() => confirmData.value.buttonText)
const conflictMessage = computed(() => conflictData.value.message)
const conflictDetails = computed(() => conflictData.value.details)

// 方法
const getActionLabel = (action) => {
  const actionMap = {
    'read': '查看',
    'write': '编辑',
    'delete': '删除',
    'add': '添加',
    'update': '更新',
    'rename': '重命名',
    'connect': '连接',
    'disconnect': '断开连接'
  }
  return actionMap[action] || action
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 检查操作权限
const checkPermission = (action, target) => {
  const permissions = {
    'read': userStore.canRead,
    'write': userStore.canWrite,
    'delete': userStore.canDelete,
    'add': userStore.canWrite,
    'update': userStore.canWrite,
    'rename': userStore.canWrite,
    'connect': userStore.canRead,
    'disconnect': userStore.canRead
  }
  
  return permissions[action] || false
}

// 检查操作冲突
const checkConflict = (action, target) => {
  return operationLockStore.checkConflict(action, target)
}

// 获取操作锁
const acquireLock = async (action, target, timeout = 30000) => {
  if (!userStore.isLoggedIn) {
    ElMessage.error('请先登录')
    return false
  }

  if (!checkPermission(action, target)) {
    ElMessage.error('权限不足')
    return false
  }

  const conflict = checkConflict(action, target)
  if (conflict) {
    showConflictDialog.value = true
    conflictData.value = {
      message: `当前有其他用户正在操作 "${target}"，请稍后再试或选择强制操作。`,
      details: conflict,
      onForce: () => forceAcquireLock(action, target, timeout),
      onCancel: () => {
        showConflictDialog.value = false
        return false
      }
    }
    return false
  }

  return await operationLockStore.acquireLock(action, target, timeout)
}

// 强制获取锁
const forceAcquireLock = async (action, target, timeout) => {
  showConflictDialog.value = false
  const success = await operationLockStore.forceAcquireLock(action, target, timeout)
  if (success) {
    ElMessage.warning('已强制获取操作锁，请注意数据一致性')
  }
  return success
}

// 释放操作锁
const releaseLock = (lockId) => {
  return operationLockStore.releaseLock(lockId)
}

// 显示确认对话框
const showConfirm = (title, message, type = 'info', buttonText = '确定') => {
  return new Promise((resolve) => {
    confirmData.value = {
      title,
      message,
      type,
      buttonText,
      onConfirm: () => {
        showConfirmDialog.value = false
        resolve(true)
      },
      onCancel: () => {
        showConfirmDialog.value = false
        resolve(false)
      }
    }
    showConfirmDialog.value = true
  })
}

// 处理确认对话框
const handleConfirmOk = async () => {
  confirmLoading.value = true
  try {
    if (confirmData.value.onConfirm) {
      await confirmData.value.onConfirm()
    }
  } finally {
    confirmLoading.value = false
  }
}

const handleConfirmCancel = () => {
  if (confirmData.value.onCancel) {
    confirmData.value.onCancel()
  }
}

// 处理冲突对话框
const handleConflictForce = async () => {
  if (conflictData.value.onForce) {
    await conflictData.value.onForce()
  }
}

const handleConflictCancel = () => {
  if (conflictData.value.onCancel) {
    conflictData.value.onCancel()
  }
}

// 执行受保护的操作
const executeProtectedOperation = async (action, target, operation, options = {}) => {
  const {
    confirmTitle = '确认操作',
    confirmMessage = '确定要执行此操作吗？',
    confirmType = 'warning',
    confirmButtonText = '确定',
    timeout = 30000,
    requireConfirm = true
  } = options

  try {
    // 获取操作锁
    const lockId = await acquireLock(action, target, timeout)
    if (!lockId) {
      return false
    }

    // 确认操作
    if (requireConfirm) {
      const confirmed = await showConfirm(confirmTitle, confirmMessage, confirmType, confirmButtonText)
      if (!confirmed) {
        releaseLock(lockId)
        return false
      }
    }

    // 执行操作
    const result = await operation()

    // 释放锁
    releaseLock(lockId)

    return result
  } catch (error) {
    console.error('执行受保护操作失败:', error)
    ElMessage.error('操作失败: ' + error.message)
    return false
  }
}

// 生命周期
onMounted(() => {
  operationLockStore.startPolling()
})

onUnmounted(() => {
  operationLockStore.stopPolling()
})

// 暴露方法
defineExpose({
  acquireLock,
  releaseLock,
  showConfirm,
  executeProtectedOperation,
  checkPermission,
  checkConflict
})
</script>

<style scoped>
.operation-lock {
  width: 100%;
}

.lock-status {
  margin-bottom: 16px;
}

.lock-list {
  margin-top: 8px;
}

.lock-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.lock-item:last-child {
  border-bottom: none;
}

.lock-icon {
  color: var(--el-color-warning);
  font-size: 16px;
}

.lock-info {
  flex: 1;
  font-size: 14px;
}

.lock-user {
  font-weight: bold;
  color: var(--el-color-primary);
}

.lock-action {
  color: var(--el-color-warning);
  font-weight: bold;
}

.lock-target {
  color: var(--el-color-info);
  font-family: monospace;
}

.lock-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.confirm-content,
.conflict-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.confirm-icon,
.conflict-icon {
  font-size: 24px;
  margin-top: 4px;
}

.confirm-icon.info {
  color: var(--el-color-info);
}

.confirm-icon.warning {
  color: var(--el-color-warning);
}

.confirm-icon.danger {
  color: var(--el-color-danger);
}

.conflict-icon {
  color: var(--el-color-warning);
}

.confirm-message,
.conflict-message {
  flex: 1;
}

.confirm-message h4,
.conflict-message h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.confirm-message p,
.conflict-message p {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.conflict-details {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.conflict-details p {
  margin: 4px 0;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 