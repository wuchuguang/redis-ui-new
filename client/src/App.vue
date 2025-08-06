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
          <span>{{ currentConnection.redis.name }}</span>
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
        <el-button type="text" class="toolbar-btn" @click="openDataOperationsTool">
          <el-icon><Operation /></el-icon>
        </el-button>
        <el-button type="text" class="toolbar-btn" @click="openConversionRulesManager">
          <el-icon><Setting /></el-icon>
        </el-button>
        <UserManager />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧边栏 -->
      <div class="left-sidebar">
        <ConnectionExplorer 
          ref="connectionExplorerRef"
          :connection="currentConnection"
          @select-database="handleDatabaseSelect"
          @add-key="handleAddKey"
          @search-keys="handleSearchKeys"
          @select-connection="handleSelectConnection"
          @select-key="handleSelectKey"
          @open-conversion-rules="handleOpenConversionRules"
          @open-redis-info="handleOpenRedisInfo"
        />
      </div>

      <!-- 右侧主内容区 -->
      <div class="right-content">
        <RedisOverview 
          v-if="!selectedKey"
          :connection="currentConnection"
          :redis-info="redisInfo"
          :last-connection-name="getLastConnectionName()"
          @refresh="refreshData"
          @quick-connect-last="quickConnectLastConnection"
          @restore-last-connection="tryRestoreLastConnection"
          @open-connection-manager="openConnectionManagerDialog"
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

    <!-- 数据操作工具对话框 -->
    <DataOperationsTool 
      v-model="showDataOperationsTool"
      :connection="currentConnection"
    />

    <!-- 操作历史对话框 -->
    <el-dialog
      v-model="showOperationHistory"
      title="操作历史"
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <OperationHistory 
        v-if="currentConnection"
        :connection-id="currentConnection.id"
        ref="operationHistoryRef"
      />
      <div v-else class="no-connection-tip">
        <el-empty description="请先选择一个连接" />
      </div>
    </el-dialog>

    <!-- 转换规则管理对话框 -->
    <ConversionRulesManager
      v-model="showConversionRulesManager"
      :connection-id="currentConnection?.id"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Setting, Clock, Close, Refresh, Operation } from '@element-plus/icons-vue'
import { useConnectionStore } from './stores/connection'
import { useUserStore } from './stores/user'
import { operationLogger } from './utils/operationLogger'
import ConnectionExplorer from './components/ConnectionExplorer.vue'
import RedisOverview from './components/RedisOverview.vue'
import NewConnectionDialog from './components/NewConnectionDialog.vue'
import KeyValueDisplay from './components/KeyValueDisplay.vue'
import ConnectionManagerDialog from './components/ConnectionManagerDialog.vue'
import ConversionRulesManager from './components/ConversionRulesManager.vue'
import DataOperationsTool from './components/DataOperationsTool.vue'
import OperationHistory from './components/OperationHistory.vue'
import UserManager from './components/UserManager.vue'

const connectionStore = useConnectionStore()
const userStore = useUserStore()

// 响应式数据
const showNewConnectionDialog = ref(false)
const showConnectionManagerDialog = ref(false)
const showConversionRulesManager = ref(false)
const showDataOperationsTool = ref(false)
const showOperationHistory = ref(false)
const operationHistoryRef = ref(null)
const connectionExplorerRef = ref(null)
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
  if (!currentConnection.value) {
    ElMessage.warning('请先选择一个连接')
    return
  }
  showOperationHistory.value = true
}

const openDataOperationsTool = () => {
  if (!currentConnection.value) {
    ElMessage.warning('请先选择一个连接')
    return
  }
  showDataOperationsTool.value = true
}

const openConversionRulesManager = () => {
  if (!currentConnection.value) {
    ElMessage.warning('请先选择一个连接')
    return
  }
  showConversionRulesManager.value = true
}

const closeConnection = () => {
  // 清空所有连接相关数据
  currentConnection.value = null
  redisInfo.value = null
  selectedKey.value = null
  currentDatabase.value = 0
  
  // 清除保存的状态
  localStorage.removeItem('redisManagerState')
}

const refreshData = async () => {
  console.log('refreshData 被调用，当前连接:', currentConnection.value)
  
  if (currentConnection.value) {
    // 检查连接是否已被用户关闭
    let closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
    if (closedIds.includes(currentConnection.value.id)) {
      console.log(`连接 ${currentConnection.value.id} 已被用户关闭，跳过刷新`)
      return
    }
    
    // 尝试获取Redis信息，不管连接状态如何
    try {
      console.log(`尝试获取连接 ${currentConnection.value.id} 的Redis信息，连接状态:`, currentConnection.value.status)
      redisInfo.value = await connectionStore.getConnectionInfo(currentConnection.value.id)
      console.log('Redis信息获取成功:', redisInfo.value)
    } catch (error) {
      console.error('刷新Redis信息失败:', error)
      // 如果获取失败，清空Redis信息
      redisInfo.value = null
    }
  } else {
    console.log('没有当前连接，跳过刷新')
  }
}


const handleConnectionSelected = (connection) => {
  console.log('handleConnectionSelected 被调用，连接:', connection)
  
  // 清空旧连接的所有数据
  selectedKey.value = null
  redisInfo.value = null
  currentDatabase.value = 0
  
  // 设置新连接
  currentConnection.value = connection
  
  // 如果连接状态是connected，立即获取Redis信息
  if (connection.status === 'connected') {
    console.log('连接状态为connected，立即获取Redis信息')
    refreshData()
  } else {
    console.log('连接状态不是connected，延迟500ms后获取Redis信息')
    // 延迟调用refreshData，避免在连接刚建立后立即检查连接状态
    setTimeout(() => {
      refreshData()
    }, 500)
  }
  
  // 保存当前状态到localStorage
  saveCurrentState()
  
  // 记录操作日志
  operationLogger.logConnectionSelected(connection)
}

const handleConnectionDeleted = (connectionId) => {
  // 如果删除的是当前连接，清空当前连接
  if (currentConnection.value && currentConnection.value.id === connectionId) {
    const connectionName = currentConnection.value.name
    // 清空所有连接相关数据
    currentConnection.value = null
    redisInfo.value = null
    selectedKey.value = null
    currentDatabase.value = 0
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

const handleConnectionCreated = (connection) => {
  // 连接创建成功消息已在 createConnection 方法中显示
  // 这里只记录操作日志，不显示额外消息
  operationLogger.logConnectionCreated(connection)
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

const handleAddKey = async (keyData) => {
  console.log('添加新键:', keyData)
  
  if (!currentConnection.value) {
    ElMessage.error('请先选择一个连接')
    return
  }
  
  try {
    // 调用后端API创建Key
    const result = await connectionStore.createKey(
      currentConnection.value.id,
      currentDatabase.value,
      keyData
    )
    
    if (result) {
      ElMessage.success('Key创建成功')
      // 刷新键列表
      if (connectionExplorerRef.value) {
        await connectionExplorerRef.value.refreshKeys(true)
      }
    }
  } catch (error) {
    console.error('创建Key失败:', error)
    ElMessage.error('创建Key失败')
  }
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

const handleOpenRedisInfo = () => {
  console.log('handleOpenRedisInfo 被调用，当前连接:', currentConnection.value)
  
  // 切换到Redis服务信息视图（清空选中的键，显示RedisOverview）
  selectedKey.value = null
  // 立即刷新Redis信息
  if (currentConnection.value) {
    console.log('有当前连接，立即刷新Redis信息')
    refreshData()
  } else {
    console.log('没有当前连接')
  }
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

// 尝试恢复上一次连接
const tryRestoreLastConnection = async () => {
  try {
    const savedState = localStorage.getItem('redisManagerState')
    if (!savedState) {
      console.log('没有找到保存的连接状态')
      return false
    }
    
    const state = JSON.parse(savedState)
    if (!state.currentConnectionId) {
      console.log('保存的状态中没有连接ID')
      return false
    }
    
    console.log('发现上次连接记录，连接ID:', state.currentConnectionId)
    
    // 获取用户的所有连接列表
    const allConnections = connectionStore.getAllConnections
    console.log('用户连接列表:', allConnections)
    
    // 查找保存的连接是否在用户的连接列表中
    const savedConnection = allConnections.find(conn => conn.id === state.currentConnectionId)
    
    if (!savedConnection) {
      console.log('保存的连接不在用户连接列表中，跳过恢复')
      return false
    }
    
    // 调试：输出连接对象的完整结构
    console.log('找到匹配的连接对象:', savedConnection)
    console.log('连接对象属性:', {
      id: savedConnection.id,
      name: savedConnection.name,
      'redis.name': savedConnection.redis?.name,
      host: savedConnection.host,
      port: savedConnection.port
    })
    
    // 获取连接名称，优先使用 redis.name
    const connectionName = savedConnection.redis?.name || savedConnection.name || savedConnection.host || '未知连接'
    console.log('找到匹配的连接:', connectionName)
    
    // 询问用户是否要恢复上次连接
    try {
      await ElMessageBox.confirm(
        `是否要恢复上次的连接 "${connectionName}"？`,
        '恢复上次连接',
        {
          confirmButtonText: '恢复',
          cancelButtonText: '稍后',
          type: 'info'
        }
      )
      
      // 用户确认恢复，尝试连接
      console.log('用户确认恢复连接，开始连接...')
      const success = await connectionStore.connectToRedis(savedConnection)
      
      if (success) {
        // 连接成功，设置为当前连接
        handleConnectionSelected(savedConnection)
        
        // 恢复选中的键（如果存在）
        if (state.selectedKey) {
          selectedKey.value = state.selectedKey
          console.log('恢复选中的键:', state.selectedKey.name)
        }
        
        return true
      } else {
        return false
      }
    } catch (error) {
      // 用户取消操作
      console.log('用户取消恢复连接')
      return false
    }
  } catch (error) {
    console.error('恢复上次连接失败:', error)
    return false
  }
}

// 获取最近使用的连接
const getLastUsedConnection = () => {
  return connectionStore.getLastUsedConnection()
}

// 获取最近使用的连接名称
const getLastConnectionName = () => {
  const lastConnection = getLastUsedConnection()
  if (!lastConnection) return ''
  
  // 优先使用 redis.name
  return lastConnection.redis?.name || lastConnection.name || lastConnection.host || '未知连接'
}

// 快速连接最近使用的连接
const quickConnectLastConnection = async () => {
  const lastConnection = getLastUsedConnection()
  if (!lastConnection) {
    ElMessage.warning('没有找到最近使用的连接记录')
    return
  }
  
  try {
    // 尝试连接
    const success = await connectionStore.connectToRedis(lastConnection)
    if (success) {
      // 连接成功，设置为当前连接
      handleConnectionSelected(lastConnection)
      ElMessage.success(`已快速连接到 ${lastConnection.name}`)
    } else {
      ElMessage.error('连接失败，请检查连接配置')
    }
  } catch (error) {
    console.error('快速连接失败:', error)
    ElMessage.error('快速连接失败')
  }
}

const handleRulesChanged = (rules) => {
  // 保存规则到本地存储
  localStorage.setItem('conversionRules', JSON.stringify(rules))
  console.log('转换规则已更新:', rules)
  
  // 通知所有组件规则已更新
  // 这里可以触发全局事件或更新全局状态
}

// 自动刷新定时器
let autoRefreshInterval = null

// 启动自动刷新
const startAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
  }
  
  if (autoRefresh.value && currentConnection.value) {
    // 检查连接是否已被用户关闭
    let closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
    if (closedIds.includes(currentConnection.value.id)) {
      console.log(`连接 ${currentConnection.value.id} 已被用户关闭，不启动自动刷新`)
      return
    }
    
    autoRefreshInterval = setInterval(async () => {
      if (currentConnection.value && currentConnection.value.status === 'connected') {
        // 再次检查连接是否已被关闭
        let currentClosedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
        if (currentClosedIds.includes(currentConnection.value.id)) {
          console.log(`连接 ${currentConnection.value.id} 已被用户关闭，停止自动刷新`)
          stopAutoRefresh()
          return
        }
        
        try {
          await refreshData()
          console.log('🔄 自动刷新数据完成')
        } catch (error) {
          console.log('自动刷新失败，静默处理:', error.message)
          // 不显示错误消息，避免干扰用户
        }
      }
    }, 10000) // 每10秒自动刷新一次
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
}

// 监听自动刷新开关变化
watch(autoRefresh, (newValue) => {
  if (newValue) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

// 监听当前连接变化
watch(currentConnection, (newConnection) => {
  if (autoRefresh.value) {
    if (newConnection) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }
})

// 生命周期
onMounted(async () => {
  // 初始化用户状态
  await userStore.initializeUser()
  
  // 初始化连接列表，但不自动连接
  await connectionStore.initializeConnections()
  
  // 尝试恢复上一次连接
  await tryRestoreLastConnection()
  
  // 启动防滚动抖动
  preventScrollBounce()
  
  // 启动自动刷新
  if (autoRefresh.value) {
    startAutoRefresh()
  }
  
  // 定期刷新连接状态（每30秒）
  const statusInterval = setInterval(async () => {
    try {
      await connectionStore.refreshConnectionStatus()
    } catch (error) {
      console.log('刷新连接状态失败，静默处理:', error.message)
      // 不显示错误消息，避免干扰用户
    }
  }, 30000)
  
  // 定期ping当前连接（每20秒）- 只有当用户选择了连接时才ping
  const pingInterval = setInterval(async () => {
    if (currentConnection.value && currentConnection.value.status === 'connected') {
      try {
        const result = await connectionStore.pingConnection(currentConnection.value.id)
        if (!result) {
          console.log('⚠️ Ping失败，连接可能已断开')
          // 不自动重连，让用户手动处理
          console.log('连接已断开，请用户手动重新连接')
        } else {
          console.log('✅ Ping成功，连接正常')
        }
      } catch (error) {
        console.log('Ping连接出错，静默处理:', error.message)
        // 不显示错误消息，避免干扰用户
      }
    }
  }, 20000)
  
  // 组件卸载时清理
  onUnmounted(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
    }
    if (pingInterval) {
      clearInterval(pingInterval)
    }
    if (statusInterval) {
      clearInterval(statusInterval)
    }
  })
})

// 防止滚动抖动的处理
const preventScrollBounce = () => {
  // 防止页面整体滚动抖动
  document.addEventListener('wheel', (e) => {
    const target = e.target
    const scrollableElement = target.closest('.overflow-y-auto, [style*="overflow-y: auto"]')
    
    if (scrollableElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement
      
      // 如果滚动到顶部，阻止向上滚动
      if (scrollTop <= 0 && e.deltaY < 0) {
        e.preventDefault()
      }
      
      // 如果滚动到底部，阻止向下滚动
      if (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0) {
        e.preventDefault()
      }
    }
  }, { passive: false })
  
  // 防止触摸设备的滚动抖动
  document.addEventListener('touchmove', (e) => {
    const target = e.target
    const scrollableElement = target.closest('.overflow-y-auto, [style*="overflow-y: auto"]')
    
    if (scrollableElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement
      
      // 如果滚动到顶部或底部，阻止继续滚动
      if ((scrollTop <= 0 && e.touches[0].clientY > e.touches[0].clientY) ||
          (scrollTop + clientHeight >= scrollHeight && e.touches[0].clientY < e.touches[0].clientY)) {
        e.preventDefault()
      }
    }
  }, { passive: false })
}
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

/* 防止滚动抖动 */
html, body {
  /* 防止页面整体滚动抖动 */
  overscroll-behavior: none;
  /* 确保滚动行为平滑 */
  scroll-behavior: smooth;
  /* 防止页面整体滚动 */
  overflow-x: hidden;
}

/* 防止容器滚动抖动 */
.app-container,
.main-content,
.left-sidebar,
.right-content,
.keys-tree,
.key-content,
.el-table__body-wrapper,
.el-dialog__body {
  /* 防止过度滚动 */
  overscroll-behavior: contain;
  /* 确保滚动行为平滑 */
  scroll-behavior: smooth;
}

/* 防止滚动条到达底部时的抖动 */
.overflow-y-auto,
[style*="overflow-y: auto"] {
  overscroll-behavior-y: contain;
}

/* 防止水平滚动抖动 */
.overflow-x-auto,
[style*="overflow-x: auto"] {
  overscroll-behavior-x: contain;
}

/* 针对特定组件的滚动优化 */
.keys-tree {
  /* 防止键列表滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

.key-content {
  /* 防止键内容区域滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* 对话框内容滚动优化 */
.el-dialog__body {
  /* 防止对话框内容滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* 搜索历史列表滚动优化 */
.search-history-list {
  /* 防止搜索历史滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* 连接列表滚动优化 */
.connection-list {
  /* 防止连接列表滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
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

.no-connection-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}
</style> 