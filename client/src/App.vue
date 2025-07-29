<template>
  <div id="app" class="app-container">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" class="connection-manager-btn" @click="openConnectionManagerDialog">
          <el-icon><Setting /></el-icon>
          连接管理
        </el-button>
        <el-button type="success" class="new-connection-btn" @click="openNewConnectionDialog">
          <el-icon><Plus /></el-icon>
          新建连接
        </el-button>
        <el-button type="text" class="toolbar-btn" @click="openOperationHistory">
          <el-icon><Clock /></el-icon>
        </el-button>
      </div>
      
      <div class="toolbar-center">
        <div class="connection-tab" v-if="currentConnection">
          <span>{{ currentConnection.name }}</span>
          <el-icon class="close-icon" @click="closeConnection">
            <Close />
          </el-icon>
        </div>
      </div>
      
      <div class="toolbar-right">
        <el-button type="text" class="toolbar-btn" @click="refreshData">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text=""
          class="auto-refresh-switch"
        />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧边栏 -->
      <div class="left-sidebar">
        <ConnectionExplorer 
          :connection="currentConnection"
          @select-database="handleDatabaseSelect"
          @add-key="handleAddKey"
          @search-keys="handleSearchKeys"
          @select-connection="handleSelectConnection"
          @select-key="handleSelectKey"
          @open-conversion-rules="handleOpenConversionRules"
        />
      </div>

      <!-- 右侧主内容区 -->
      <div class="right-content">
        <RedisOverview 
          v-if="!selectedKey"
          :connection="currentConnection"
          :redis-info="redisInfo"
          @refresh="refreshData"
        />
        <KeyValueDisplay 
          v-else
          :connection="currentConnection"
          :selected-key="selectedKey"
          :database="currentDatabase"
          @key-deleted="handleKeyDeleted"
          @key-updated="handleKeyUpdated"
          @go-back="handleGoBack"
        />
      </div>
    </div>

    <!-- 新建连接对话框 -->
    <NewConnectionDialog 
      v-model="showNewConnectionDialog"
      @connection-created="handleConnectionCreated"
    />

    <!-- 连接管理对话框 -->
    <ConnectionManagerDialog 
      v-model="showConnectionManagerDialog"
      @connection-selected="handleConnectionSelected"
      @connection-deleted="handleConnectionDeleted"
      @connection-updated="handleConnectionUpdated"
    />

    <!-- 转换规则管理器 -->
    <ConversionRulesManager 
      v-model="showConversionRulesManager"
      @rules-changed="handleRulesChanged"
    />

    <!-- 操作历史 -->
    <OperationHistory 
      v-model="showOperationHistory"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { Plus, Setting, Clock, Close, Refresh } from '@element-plus/icons-vue'
import { useConnectionStore } from './stores/connection'
import { operationLogger } from './utils/operationLogger'
import ConnectionExplorer from './components/ConnectionExplorer.vue'
import RedisOverview from './components/RedisOverview.vue'
import NewConnectionDialog from './components/NewConnectionDialog.vue'
import KeyValueDisplay from './components/KeyValueDisplay.vue'
import ConnectionManagerDialog from './components/ConnectionManagerDialog.vue'
import ConversionRulesManager from './components/ConversionRulesManager.vue'
import OperationHistory from './components/OperationHistory.vue'

const connectionStore = useConnectionStore()

// 响应式数据
const showNewConnectionDialog = ref(false)
const showConnectionManagerDialog = ref(false)
const showConversionRulesManager = ref(false)
const showOperationHistory = ref(false)
const autoRefresh = ref(true)
const currentConnection = ref(null)
const redisInfo = ref(null)
const selectedKey = ref(null)
const currentDatabase = ref(0)

// 方法
const openNewConnectionDialog = () => {
  showNewConnectionDialog.value = true
}

const openConnectionManagerDialog = () => {
  showConnectionManagerDialog.value = true
}

const openOperationHistory = () => {
  showOperationHistory.value = true
}

const closeConnection = () => {
  currentConnection.value = null
  redisInfo.value = null
  selectedKey.value = null
  // 清除保存的状态
  localStorage.removeItem('redisManagerState')
}

const refreshData = async () => {
  if (currentConnection.value) {
    try {
      redisInfo.value = await connectionStore.getConnectionInfo(currentConnection.value.id)
    } catch (error) {
      console.error('刷新Redis信息失败:', error)
    }
  }
}

const handleConnectionCreated = (connection) => {
  // 新创建的连接会自动成为当前连接
  currentConnection.value = connection
  refreshData()
  // 保存当前状态到localStorage
  saveCurrentState()
  // 记录操作日志
  operationLogger.logConnectionCreated(connection)
}

const handleConnectionSelected = (connection) => {
  currentConnection.value = connection
  refreshData()
  // 保存当前状态到localStorage
  saveCurrentState()
  // 记录操作日志
  operationLogger.logConnectionSelected(connection)
}

const handleConnectionDeleted = (connectionId) => {
  // 如果删除的是当前连接，清空当前连接
  if (currentConnection.value && currentConnection.value.id === connectionId) {
    const connectionName = currentConnection.value.name
    currentConnection.value = null
    redisInfo.value = null
    selectedKey.value = null
    // 清除保存的状态
    localStorage.removeItem('redisManagerState')
    // 记录操作日志
    operationLogger.logConnectionDeleted(connectionId, connectionName)
  }
}

const handleConnectionUpdated = (connection) => {
  // 如果更新的是当前连接，更新当前连接
  if (currentConnection.value && currentConnection.value.id === connection.id) {
    currentConnection.value = connection
  }
}

const handleDatabaseSelect = (database) => {
  currentDatabase.value = database
  selectedKey.value = null // 切换数据库时清空选中的键
  console.log('选择数据库:', database)
  // 保存当前状态到localStorage
  saveCurrentState()
  // 记录操作日志
  operationLogger.logDatabaseSelected(database, currentConnection.value)
}

const handleAddKey = () => {
  console.log('添加新键')
}

const handleSearchKeys = (searchTerm) => {
  console.log('搜索键:', searchTerm)
}

const handleSelectKey = async (key) => {
  console.log('选择键:', key)
  // 使用 nextTick 确保 DOM 更新完成
  await nextTick()
  // 确保 key 对象是响应式的
  selectedKey.value = { ...key }
  
  // 保存当前状态到localStorage
  saveCurrentState()
  // 记录操作日志
  operationLogger.logKeySelected(key, currentConnection.value)
}

const handleGoBack = () => {
  selectedKey.value = null
  // 保存当前状态到localStorage
  saveCurrentState()
}

const handleKeyDeleted = (keyName) => {
  selectedKey.value = null
  // 保存当前状态到localStorage
  saveCurrentState()
  // 记录操作日志
  operationLogger.logKeyDeleted(keyName, currentConnection.value)
  // 这里可以刷新键列表
  console.log('键已删除:', keyName)
}

const handleKeyUpdated = (updateInfo) => {
  // 更新选中的键名
  if (selectedKey.value && selectedKey.value.name === updateInfo.oldKey) {
    // 创建新的对象来触发响应式更新
    selectedKey.value = {
      ...selectedKey.value,
      name: updateInfo.newKey
    }
    // 保存当前状态到localStorage
    saveCurrentState()
    // 记录操作日志
    operationLogger.logKeyRenamed(updateInfo.oldKey, updateInfo.newKey, currentConnection.value)
  }
  console.log('键已更新:', updateInfo)
}

const handleSelectConnection = (connection) => {
  currentConnection.value = connection
  if (connection) {
    refreshData()
  } else {
    redisInfo.value = null
  }
}

const handleOpenConversionRules = () => {
  showConversionRulesManager.value = true
}

// 保存当前状态到localStorage
const saveCurrentState = () => {
  const state = {
    currentConnectionId: currentConnection.value?.id,
    currentDatabase: currentDatabase.value,
    selectedKey: selectedKey.value
  }
  localStorage.setItem('redisManagerState', JSON.stringify(state))
  console.log('保存当前状态:', state)
}

// 从localStorage恢复状态
const restoreCurrentState = () => {
  try {
    const savedState = localStorage.getItem('redisManagerState')
    if (savedState) {
      const state = JSON.parse(savedState)
      console.log('恢复保存的状态:', state)
      
      // 恢复数据库选择
      if (state.currentDatabase !== undefined) {
        currentDatabase.value = state.currentDatabase
      }
      
      return state
    }
  } catch (error) {
    console.error('恢复状态失败:', error)
  }
  return null
}

const handleRulesChanged = (rules) => {
  // 保存规则到本地存储
  localStorage.setItem('conversionRules', JSON.stringify(rules))
  console.log('转换规则已更新:', rules)
  
  // 通知所有组件规则已更新
  // 这里可以触发全局事件或更新全局状态
}

// 生命周期
onMounted(async () => {
  // 初始化连接状态 - 页面刷新后自动恢复
  const selectedConnection = await connectionStore.initializeConnections()
  if (selectedConnection) {
    currentConnection.value = selectedConnection
    await refreshData()
    
    // 恢复保存的状态
    const savedState = restoreCurrentState()
    if (savedState && savedState.currentConnectionId === selectedConnection.id) {
      // 如果保存的状态与当前连接匹配，恢复选中的key
      if (savedState.selectedKey) {
        // 验证key是否仍然存在
        try {
          const keyValue = await connectionStore.getKeyValue(
            selectedConnection.id, 
            savedState.currentDatabase || 0, 
            savedState.selectedKey.name
          )
          if (keyValue) {
            selectedKey.value = savedState.selectedKey
            console.log('✅ 成功恢复选中的key:', savedState.selectedKey.name)
          } else {
            console.log('❌ 保存的key已不存在:', savedState.selectedKey.name)
          }
        } catch (error) {
          console.log('❌ 恢复key失败:', error.message)
        }
      }
    }
  }
  
  // 定期刷新连接状态（每30秒）
  const statusInterval = setInterval(async () => {
    await connectionStore.refreshConnectionStatus()
  }, 30000)
  
  // 组件卸载时清理定时器
  onUnmounted(() => {
    clearInterval(statusInterval)
  })
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
}

#app {
  height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

/* 全局深色主题样式 */
:root {
  --el-color-primary: #409eff;
  --el-color-success: #67c23a;
  --el-color-warning: #e6a23c;
  --el-color-danger: #f56c6c;
  --el-color-info: #909399;
  
  --el-bg-color: #1e1e1e;
  --el-bg-color-page: #1e1e1e;
  --el-bg-color-overlay: #2d2d2d;
  
  --el-text-color-primary: #ffffff;
  --el-text-color-regular: #ffffff;
  --el-text-color-secondary: #909399;
  --el-text-color-placeholder: #606266;
  
  --el-border-color: #404040;
  --el-border-color-light: #404040;
  --el-border-color-lighter: #404040;
  --el-border-color-extra-light: #404040;
  
  --el-fill-color: #2d2d2d;
  --el-fill-color-light: #2d2d2d;
  --el-fill-color-lighter: #2d2d2d;
  --el-fill-color-extra-light: #2d2d2d;
  --el-fill-color-dark: #1e1e1e;
  --el-fill-color-darker: #1e1e1e;
  
  /* 输入框专用变量 */
  --el-input-bg-color: #2d2d2d;
  --el-input-border-color: #404040;
  --el-input-text-color: hwb(245 2% 66% / 0.4);
  --el-input-placeholder-color: #909399;
  
  /* 对话框专用变量 */
  --el-dialog-text-color: #ffffff;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 2px;
  transition: background-color 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* Firefox 滚动条样式 */
* {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

/* Element Plus 组件深色主题覆盖 */
.el-button {
  color: var(--el-text-color-primary) !important;
}

.el-button--text {
  color: var(--el-text-color-primary) !important;
}

.el-button--text:hover {
  background-color: var(--el-fill-color) !important;
}

/* 移除强制覆盖，使用Element Plus默认深色主题 */

/* 强制覆盖所有输入框样式 - 最高优先级 */
.el-input__inner,
.el-textarea__inner,
.el-input-number .el-input__inner,
.el-select .el-input__inner,
.el-autocomplete .el-input__inner,
.el-cascader .el-input__inner,
.el-date-editor .el-input__inner,
.el-time-picker .el-input__inner,
.el-color-picker .el-input__inner {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
  color: #ffffff !important;
}

/* 强制覆盖所有输入框占位符 */
.el-input__inner::placeholder,
.el-textarea__inner::placeholder {
  color: #909399 !important;
}

/* 强制覆盖所有输入框包装器 */
.el-input__wrapper,
.el-textarea__wrapper {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
}

/* 强制覆盖所有select组件 */
.el-select .el-input__inner,
.el-select .el-input__wrapper {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
  color: #ffffff !important;
}

/* 强制覆盖所有数字输入框 */
.el-input-number .el-input__inner,
.el-input-number .el-input__wrapper {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
  color: #ffffff !important;
}

/* 强制覆盖对话框中的所有输入框 */
.el-dialog .el-input__inner,
.el-dialog .el-textarea__inner,
.el-dialog .el-input-number .el-input__inner,
.el-dialog .el-select .el-input__inner,
.el-dialog .el-autocomplete .el-input__inner {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
  color: #ffffff !important;
}

.el-dialog .el-input__inner::placeholder,
.el-dialog .el-textarea__inner::placeholder {
  color: #909399 !important;
}

/* 强制覆盖所有可能的输入框场景 */
input[type="text"],
input[type="number"],
input[type="password"],
input[type="email"],
input[type="search"],
input[type="tel"],
input[type="url"] {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
  color: #ffffff !important;
}

/* 强制覆盖所有输入框聚焦状态 */
.el-input__inner:focus,
.el-textarea__inner:focus,
.el-input-number .el-input__inner:focus,
.el-select .el-input__inner:focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
}

/* 强制覆盖所有输入框悬停状态 */
.el-input__wrapper:hover,
.el-textarea__wrapper:hover {
  border-color: #606266 !important;
}

/* 强制覆盖下拉菜单样式 */
.el-select-dropdown {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
}

.el-select-dropdown__item {
  color: #ffffff !important;
  background-color: #2d2d2d !important;
}

.el-select-dropdown__item:hover {
  background-color: #404040 !important;
}

.el-select-dropdown__item.selected {
  background-color: #409eff !important;
  color: #ffffff !important;
}

/* 强制覆盖数字输入框的按钮 */
.el-input-number .el-input-number__decrease,
.el-input-number .el-input-number__increase {
  background-color: #404040 !important;
  border-color: #404040 !important;
  color: #ffffff !important;
}

.el-input-number .el-input-number__decrease:hover,
.el-input-number .el-input-number__increase:hover {
  background-color: #606266 !important;
}

/* 确保下拉选择框正确显示 */
.el-select-dropdown {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
}

.el-select-dropdown__item {
  color: #ffffff !important;
}

.el-select-dropdown__item:hover {
  background-color: #404040 !important;
}

.el-select-dropdown__item.selected {
  background-color: #409eff !important;
  color: #ffffff !important;
}

/* 数字输入框按钮样式已由上面的强制覆盖处理 */

.el-table {
  background-color: transparent !important;
  color: var(--el-text-color-primary) !important;
}

.el-table th {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
  border-color: var(--el-border-color) !important;
}

.el-table td {
  background-color: var(--el-bg-color) !important;
  color: var(--el-text-color-primary) !important;
  border-color: var(--el-border-color) !important;
}

.el-table--striped .el-table__body tr.el-table__row--striped td {
  background-color: var(--el-fill-color) !important;
}

.el-table__body tr:hover > td {
  background-color: var(--el-fill-color) !important;
}

.el-tag {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-tag--success {
  background-color: var(--el-color-success) !important;
  border-color: var(--el-color-success) !important;
  color: #ffffff !important;
}

.el-tag--danger {
  background-color: var(--el-color-danger) !important;
  border-color: var(--el-color-danger) !important;
  color: #ffffff !important;
}

.el-dialog {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-dialog__header {
  background-color: var(--el-bg-color-overlay) !important;
  border-bottom-color: var(--el-border-color) !important;
}

.el-dialog__title {
  color: var(--el-text-color-primary) !important;
}

.el-dialog__body {
  color: var(--el-dialog-text-color) !important;
}

.el-dialog__footer {
  border-top-color: var(--el-border-color) !important;
}

.el-form-item__label {
  color: var(--el-text-color-primary) !important;
}

.el-empty__description {
  color: var(--el-text-color-secondary) !important;
}

.el-message {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-message-box__header {
  background-color: var(--el-bg-color-overlay) !important;
  border-bottom-color: var(--el-border-color) !important;
}

.el-message-box__title {
  color: var(--el-text-color-primary) !important;
}

.el-message-box__content {
  color: var(--el-text-color-primary) !important;
}

.el-message-box__footer {
  border-top-color: var(--el-border-color) !important;
}

.el-loading-mask {
  background-color: rgba(30, 30, 30, 0.8) !important;
}

.el-skeleton__item {
  background-color: var(--el-fill-color) !important;
}

.el-skeleton__text {
  background-color: var(--el-fill-color) !important;
}

.el-result__title {
  color: var(--el-text-color-primary) !important;
}

.el-result__subtitle {
  color: var(--el-text-color-secondary) !important;
}

.el-alert {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-alert__title {
  color: var(--el-text-color-primary) !important;
}

.el-alert__description {
  color: var(--el-text-color-secondary) !important;
}

/* 自动完成下拉框 */
.el-autocomplete-suggestion {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
}

.el-autocomplete-suggestion__list {
  background-color: #2d2d2d !important;
}

.el-autocomplete-suggestion__list li {
  color: #ffffff !important;
  background-color: #2d2d2d !important;
}

.el-autocomplete-suggestion__list li:hover {
  background-color: #404040 !important;
}

.el-autocomplete-suggestion__list li.highlighted {
  background-color: #409eff !important;
  color: #ffffff !important;
}

.el-switch__label {
  color: var(--el-text-color-primary) !important;
}

.el-switch__core {
  border-color: var(--el-border-color) !important;
}

.el-switch.is-checked .el-switch__core {
  background-color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary) !important;
}

.el-loading-spinner .el-loading-text {
  color: var(--el-text-color-primary) !important;
}

.el-loading-spinner .path {
  stroke: var(--el-color-primary) !important;
}

/* 确保下拉菜单中的文字清晰可见 */
.el-dropdown-menu {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-dropdown-menu__item {
  color: var(--el-text-color-primary) !important;
}

.el-dropdown-menu__item:hover {
  background-color: var(--el-fill-color) !important;
}

/* 确保分页组件文字清晰可见 */
.el-pagination {
  color: var(--el-text-color-primary) !important;
}

.el-pagination .el-pager li {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
  border-color: var(--el-border-color) !important;
}

.el-pagination .el-pager li:hover {
  background-color: var(--el-fill-color) !important;
}

.el-pagination .el-pager li.is-active {
  background-color: var(--el-color-primary) !important;
  color: #ffffff !important;
}

/* 确保工具提示文字清晰可见 */
.el-tooltip__popper {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 确保选择器组件文字清晰可见 */
.el-cascader {
  color: var(--el-text-color-primary) !important;
}

.el-cascader .el-input__inner {
  color: var(--el-text-color-primary) !important;
}

.el-cascader__dropdown {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-cascader-node {
  color: var(--el-text-color-primary) !important;
}

.el-cascader-node:hover {
  background-color: var(--el-fill-color) !important;
}

.el-cascader-node.is-active {
  background-color: var(--el-color-primary) !important;
  color: #ffffff !important;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-toolbar {
  height: 60px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #404040;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-manager-btn {
  background-color: #409eff;
  border-color: #409eff;
  color: white;
}

.connection-manager-btn:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.new-connection-btn {
  background-color: #67c23a;
  border-color: #67c23a;
  color: white;
}

.new-connection-btn:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

.toolbar-btn {
  color: #ffffff;
  background: transparent;
  border: none;
}

.toolbar-btn:hover {
  background-color: #404040;
}

.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.connection-tab {
  background-color: #404040;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.close-icon {
  cursor: pointer;
  font-size: 12px;
}

.close-icon:hover {
  color: #f56c6c;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.auto-refresh-switch {
  --el-switch-on-color: #67c23a;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.left-sidebar {
  width: 300px;
  background-color: #2d2d2d;
  border-right: 1px solid #404040;
  overflow: hidden;
  min-width: 300px;
  max-width: 300px;
}

.right-content {
  flex: 1;
  background-color: #1e1e1e;
  overflow: hidden;
  padding: 0;
}

.no-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style> 