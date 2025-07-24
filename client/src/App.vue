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
        <el-button type="text" class="toolbar-btn">
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
        />
      </div>

      <!-- 右侧主内容区 -->
      <div class="right-content">
        <KeyValueDisplay 
          :connection="currentConnection"
          :selected-key="selectedKey"
          :database="currentDatabase"
          @key-deleted="handleKeyDeleted"
          @key-updated="handleKeyUpdated"
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { Plus, Setting, Clock, Close, Refresh } from '@element-plus/icons-vue'
import { useConnectionStore } from './stores/connection'
import ConnectionExplorer from './components/ConnectionExplorer.vue'
import RedisOverview from './components/RedisOverview.vue'
import NewConnectionDialog from './components/NewConnectionDialog.vue'
import KeyValueDisplay from './components/KeyValueDisplay.vue'
import ConnectionManagerDialog from './components/ConnectionManagerDialog.vue'

const connectionStore = useConnectionStore()

// 响应式数据
const showNewConnectionDialog = ref(false)
const showConnectionManagerDialog = ref(false)
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

const closeConnection = () => {
  currentConnection.value = null
  redisInfo.value = null
}

const refreshData = async () => {
  if (currentConnection.value) {
    redisInfo.value = await connectionStore.getConnectionInfo(currentConnection.value.id)
  }
}

const handleConnectionCreated = (connection) => {
  // 新创建的连接会自动成为当前连接
  currentConnection.value = connection
  refreshData()
}

const handleConnectionSelected = (connection) => {
  currentConnection.value = connection
  refreshData()
}

const handleConnectionDeleted = (connectionId) => {
  // 如果删除的是当前连接，清空当前连接
  if (currentConnection.value && currentConnection.value.id === connectionId) {
    currentConnection.value = null
    redisInfo.value = null
    selectedKey.value = null
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
}

const handleKeyDeleted = (keyName) => {
  selectedKey.value = null
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

// 生命周期
onMounted(async () => {
  await connectionStore.fetchConnections()
  
  // 自动选择连接
  const selectedConnection = connectionStore.autoSelectConnection()
  if (selectedConnection) {
    await refreshData()
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
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
}

.left-sidebar {
  width: 300px;
  background-color: #2d2d2d;
  border-right: 1px solid #404040;
  overflow-y: auto;
}

.right-content {
  flex: 1;
  background-color: #1e1e1e;
  overflow-y: auto;
  padding: 20px;
}

.no-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style> 