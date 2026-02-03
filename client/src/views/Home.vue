<template>
  <div class="home-view">
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
        <el-tooltip :content="themeStore.isDark ? '切换为浅色' : '切换为深色'" placement="bottom">
          <el-button type="text" class="toolbar-btn theme-toggle" @click="themeStore.toggleTheme">
            <el-icon v-if="themeStore.isDark"><Sunny /></el-icon>
            <el-icon v-else><Moon /></el-icon>
            <span class="theme-label">{{ themeStore.isDark ? '浅色' : '深色' }}</span>
          </el-button>
        </el-tooltip>
        <UserManager />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
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

    <NewConnectionDialog
      v-model="showNewConnectionDialog"
      @connection-created="handleConnectionCreated"
    />

    <ConnectionManagerDialog
      v-model="showConnectionManagerDialog"
      @connection-selected="handleConnectionSelected"
      @connection-deleted="handleConnectionDeleted"
      @connection-updated="handleConnectionUpdated"
    />

    <ConversionRulesManager
      v-model="showConversionRulesManager"
      @rules-changed="handleRulesChanged"
    />

    <DataOperationsTool
      v-model="showDataOperationsTool"
      :connection="currentConnection"
    />

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
        :is-owner="currentConnection.owner === userStore.currentUser?.username"
        ref="operationHistoryRef"
      />
      <div v-else class="no-connection-tip">
        <el-empty description="请先选择一个连接" />
      </div>
    </el-dialog>

    <ConversionRulesManager
      v-model="showConversionRulesManager"
      :connection-id="currentConnection?.id"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Setting, Clock, Close, Refresh, Operation, Sunny, Moon } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'
import { operationLogger } from '../utils/operationLogger'
import ConnectionExplorer from '../components/ConnectionExplorer.vue'
import RedisOverview from '../components/RedisOverview.vue'
import NewConnectionDialog from '../components/NewConnectionDialog.vue'
import KeyValueDisplay from '../components/KeyValueDisplay.vue'
import ConnectionManagerDialog from '../components/ConnectionManagerDialog.vue'
import ConversionRulesManager from '../components/ConversionRulesManager.vue'
import DataOperationsTool from '../components/DataOperationsTool.vue'
import OperationHistory from '../components/OperationHistory.vue'
import UserManager from '../components/UserManager.vue'

const connectionStore = useConnectionStore()
const userStore = useUserStore()
const themeStore = useThemeStore()

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
  currentConnection.value = null
  redisInfo.value = null
  selectedKey.value = null
  currentDatabase.value = 0
  localStorage.removeItem('redisManagerState')
}

const refreshData = async () => {
  if (currentConnection.value) {
    const closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
    if (closedIds.includes(currentConnection.value.id)) return
    try {
      redisInfo.value = await connectionStore.getConnectionInfo(currentConnection.value.id)
    } catch (error) {
      console.error('刷新Redis信息失败:', error)
      redisInfo.value = null
    }
  }
}

const handleConnectionSelected = (connection) => {
  selectedKey.value = null
  redisInfo.value = null
  currentDatabase.value = 0
  currentConnection.value = connection
  if (connection.status === 'connected') {
    refreshData()
  } else {
    setTimeout(() => refreshData(), 500)
  }
  saveCurrentState()
  operationLogger.logConnectionSelected(connection)
}

const handleConnectionDeleted = (connectionId) => {
  if (currentConnection.value && currentConnection.value.id === connectionId) {
    const connectionName = currentConnection.value.name
    currentConnection.value = null
    redisInfo.value = null
    selectedKey.value = null
    currentDatabase.value = 0
    localStorage.removeItem('redisManagerState')
    operationLogger.logConnectionDeleted(connectionId, connectionName)
  }
}

const handleConnectionUpdated = (connection) => {
  if (currentConnection.value && currentConnection.value.id === connection.id) {
    currentConnection.value = connection
  }
}

const handleConnectionCreated = async () => {
  await connectionStore.fetchConnections()
}

const handleDatabaseSelect = (database) => {
  currentDatabase.value = database
  selectedKey.value = null
  saveCurrentState()
  operationLogger.logDatabaseSelected(database, currentConnection.value)
}

const handleAddKey = async (keyData) => {
  if (!currentConnection.value) {
    ElMessage.error('请先选择一个连接')
    return
  }
  try {
    const result = await connectionStore.createKey(
      currentConnection.value.id,
      currentDatabase.value,
      keyData
    )
    if (result) {
      ElMessage.success('Key创建成功')
      if (connectionExplorerRef.value) {
        await connectionExplorerRef.value.refreshKeys(true)
      }
    }
  } catch (error) {
    console.error('创建Key失败:', error)
    ElMessage.error('创建Key失败')
  }
}

const handleSearchKeys = () => {}

const handleSelectKey = async (key) => {
  await nextTick()
  selectedKey.value = { ...key }
  saveCurrentState()
  operationLogger.logKeySelected(key, currentConnection.value)
}

const handleGoBack = () => {
  selectedKey.value = null
  saveCurrentState()
}

const handleKeyDeleted = (keyName) => {
  selectedKey.value = null
  saveCurrentState()
  operationLogger.logKeyDeleted(keyName, currentConnection.value)
}

const handleKeyUpdated = (updateInfo) => {
  if (selectedKey.value && selectedKey.value.name === updateInfo.oldKey) {
    selectedKey.value = { ...selectedKey.value, name: updateInfo.newKey }
    saveCurrentState()
    operationLogger.logKeyRenamed(updateInfo.oldKey, updateInfo.newKey, currentConnection.value)
  }
}

const handleSelectConnection = (connection) => {
  currentConnection.value = connection
  if (connection) refreshData()
  else redisInfo.value = null
}

const handleOpenConversionRules = () => {
  showConversionRulesManager.value = true
}

const handleOpenRedisInfo = () => {
  selectedKey.value = null
  if (currentConnection.value) refreshData()
}

const saveCurrentState = () => {
  const state = {
    currentConnectionId: currentConnection.value?.id,
    currentDatabase: currentDatabase.value,
    selectedKey: selectedKey.value
  }
  localStorage.setItem('redisManagerState', JSON.stringify(state))
}

const restoreCurrentState = () => {
  try {
    const savedState = localStorage.getItem('redisManagerState')
    if (savedState) {
      const state = JSON.parse(savedState)
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

const tryRestoreLastConnection = async () => {
  try {
    const savedState = localStorage.getItem('redisManagerState')
    if (!savedState || !JSON.parse(savedState).currentConnectionId) return false
    const state = JSON.parse(savedState)
    const allConnections = connectionStore.getAllConnections
    const savedConnection = allConnections.find(conn => conn.id === state.currentConnectionId)
    if (!savedConnection) return false
    const connectionName = savedConnection.redis?.name || savedConnection.name || savedConnection.host || '未知连接'
    try {
      await ElMessageBox.confirm(
        `是否要恢复上次的连接 "${connectionName}"？`,
        '恢复上次连接',
        { confirmButtonText: '恢复', cancelButtonText: '稍后', type: 'primary' }
      )
    } catch {
      return false
    }
    const success = await connectionStore.connectToRedis(savedConnection)
    if (success) {
      handleConnectionSelected(savedConnection)
      if (state.selectedKey) selectedKey.value = state.selectedKey
      return true
    }
    return false
  } catch (error) {
    console.error('恢复上次连接失败:', error)
    return false
  }
}

const getLastUsedConnection = () => connectionStore.getLastUsedConnection()

const getLastConnectionName = () => {
  const lastConnection = getLastUsedConnection()
  if (!lastConnection) return ''
  return lastConnection.redis?.name || lastConnection.name || lastConnection.host || '未知连接'
}

const quickConnectLastConnection = async () => {
  const lastConnection = getLastUsedConnection()
  if (!lastConnection) {
    ElMessage.warning('没有找到最近使用的连接记录')
    return
  }
  try {
    const success = await connectionStore.connectToRedis(lastConnection)
    if (success) {
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
  localStorage.setItem('conversionRules', JSON.stringify(rules))
}

let autoRefreshInterval = null

const startAutoRefresh = () => {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval)
  if (autoRefresh.value && currentConnection.value) {
    const closedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
    if (closedIds.includes(currentConnection.value.id)) return
    autoRefreshInterval = setInterval(async () => {
      if (currentConnection.value && currentConnection.value.status === 'connected') {
        const currentClosedIds = JSON.parse(localStorage.getItem('closedConnectionIds') || '[]')
        if (currentClosedIds.includes(currentConnection.value.id)) {
          stopAutoRefresh()
          return
        }
        try {
          await refreshData()
        } catch (error) {
          // 静默
        }
      }
    }, 10000)
  }
}

const stopAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
}

watch(autoRefresh, (newValue) => {
  if (newValue) startAutoRefresh()
  else stopAutoRefresh()
})

watch(currentConnection, (newConnection) => {
  if (autoRefresh.value) {
    if (newConnection) startAutoRefresh()
    else stopAutoRefresh()
  }
})

const preventScrollBounce = () => {
  document.addEventListener('wheel', (e) => {
    const target = e.target
    const scrollableElement = target.closest('.overflow-y-auto, [style*="overflow-y: auto"]')
    if (scrollableElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement
      if (scrollTop <= 0 && e.deltaY < 0) e.preventDefault()
      if (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0) e.preventDefault()
    }
  }, { passive: false })
  document.addEventListener('touchmove', (e) => {
    const target = e.target
    const scrollableElement = target.closest('.overflow-y-auto, [style*="overflow-y: auto"]')
    if (scrollableElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement
      if ((scrollTop <= 0 && e.touches[0].clientY > e.touches[0].clientY) ||
          (scrollTop + clientHeight >= scrollHeight && e.touches[0].clientY < e.touches[0].clientY)) {
        e.preventDefault()
      }
    }
  }, { passive: false })
}

let statusInterval = null
let pingInterval = null

onMounted(async () => {
  await userStore.initializeUser()
  await connectionStore.initializeConnections()
  await tryRestoreLastConnection()
  preventScrollBounce()
  if (autoRefresh.value) startAutoRefresh()
  statusInterval = setInterval(async () => {
    try {
      await connectionStore.refreshConnectionStatus()
    } catch (error) {
      // 静默
    }
  }, 30000)
  pingInterval = setInterval(async () => {
    if (currentConnection.value && currentConnection.value.status === 'connected') {
      try {
        await connectionStore.pingConnection(currentConnection.value.id)
      } catch (error) {
        // 静默
      }
    }
  }, 20000)
})

onUnmounted(() => {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval)
  if (pingInterval) clearInterval(pingInterval)
  if (statusInterval) clearInterval(statusInterval)
})
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.home-view .main-content {
  flex: 1;
  min-height: 0;
}
</style>
