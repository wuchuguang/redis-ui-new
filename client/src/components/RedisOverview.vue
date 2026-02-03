<template>
  <div class="redis-overview">
    <!-- 顶部工具栏 -->
    <div class="overview-toolbar">
      <div class="toolbar-left">
        <h2 class="overview-title">Redis服务器信息</h2>
      </div>
      <div class="toolbar-right">
        <el-button 
          type="primary" 
          size="small" 
          @click="refreshInfo"
          :loading="loading"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="!props.connection" class="no-data">
      <el-empty description="暂无Redis信息，请先建立连接">
        <template #extra>
          <div class="quick-connect-actions">
            <el-button type="primary" @click="quickConnectLast" :loading="quickConnectLoading">
              <el-icon><Connection /></el-icon>
              {{ props.lastConnectionName ? `快速连接 ${props.lastConnectionName}` : '快速连接最近使用' }}
            </el-button>
            <el-button type="success" @click="restoreLastConnection" :loading="restoreLoading">
              <el-icon><RefreshLeft /></el-icon>
              恢复上次连接
            </el-button>
            <el-button @click="openConnectionManager">
              <el-icon><Setting /></el-icon>
              连接管理
            </el-button>
          </div>
        </template>
      </el-empty>
    </div>
    
    <div v-else-if="!redisInfo && !loading" class="no-data">
      <el-empty description="正在获取Redis信息..." />
    </div>
    
    <div v-else-if="loading" class="loading-content">
      <el-skeleton :rows="10" animated />
    </div>
    
    <div v-else>
      <!-- 信息面板 -->
      <div class="info-panels">
        <!-- 服务器信息 -->
        <div class="info-panel">
          <h3 class="panel-title">服务器</h3>
          <div class="panel-content">
            <div class="info-item">
              <span class="info-label">Redis版本:</span>
              <span class="info-value">{{ redisInfo?.redisInfo?.redis_version || '未知' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">OS:</span>
              <span class="info-value">{{ redisInfo?.redisInfo?.os || '未知' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">进程ID:</span>
              <span class="info-value">{{ redisInfo?.redisInfo?.process_id || '未知' }}</span>
            </div>
          </div>
        </div>

        <!-- 内存信息 -->
        <div class="info-panel">
          <h3 class="panel-title">内存</h3>
          <div class="panel-content">
            <div class="info-item">
              <span class="info-label">已用内存:</span>
              <span class="info-value">{{ formatMemory(redisInfo?.redisInfo?.used_memory_human) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">内存占用峰值:</span>
              <span class="info-value">{{ formatMemory(redisInfo?.redisInfo?.used_memory_peak_human) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Lua占用内存:</span>
              <span class="info-value">{{ formatMemory(redisInfo?.redisInfo?.used_memory_lua_human) }}</span>
            </div>
          </div>
        </div>

        <!-- 状态信息 -->
        <div class="info-panel">
          <h3 class="panel-title">状态</h3>
          <div class="panel-content">
            <div class="info-item">
              <span class="info-label">客户端连接数:</span>
              <span class="info-value">{{ redisInfo?.redisInfo?.connected_clients || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">历史连接数:</span>
              <span class="info-value">{{ formatNumber(redisInfo?.redisInfo?.total_connections_received) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">历史命令数:</span>
              <span class="info-value">{{ formatNumber(redisInfo?.redisInfo?.total_commands_processed) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 键值统计 -->
    <div class="keys-stats-panel">
      <div class="db-stats-container">
        <!-- 左侧：db0-db7 -->
        <div class="db-stats-left">
          <el-table
            :data="leftDbStats"
            class="theme-table"
            style="width: 100%"
          >
            <el-table-column prop="db" label="DB" width="60" />
            <el-table-column prop="keys" label="Keys" width="120" />
            <el-table-column prop="expires" label="Expires" width="120" />
            <el-table-column label="Avg TTL" min-width="120">
              <template #default="{ row }">
                {{ formatAvgTtl(row.avgTtl) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 右侧：db8-db15 -->
        <div class="db-stats-right">
          <el-table
            :data="rightDbStats"
            class="theme-table"
            style="width: 100%"
          >
            <el-table-column prop="db" label="DB" width="60" />
            <el-table-column prop="keys" label="Keys" width="120" />
            <el-table-column prop="expires" label="Expires" width="120" />
            <el-table-column label="Avg TTL" min-width="120">
              <template #default="{ row }">
                {{ formatAvgTtl(row.avgTtl) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- Redis信息全集 -->
    <div class="redis-info-panel">
      <div class="panel-header">
        <h3 class="panel-title">Redis信息全集</h3>
        <el-input
          v-model="searchTerm"
          placeholder="搜索信息"
          style="width: 200px"
          clearable
        >
          <template #suffix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      
      <el-table
        :data="filteredRedisInfo"
        class="theme-table"
        style="width: 100%"
        max-height="300"
      >
        <el-table-column prop="key" label="Key" width="200" />
        <el-table-column prop="value" label="Value" />
      </el-table>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Search, Refresh, Connection, RefreshLeft } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'

// Props
const props = defineProps({
  connection: {
    type: Object,
    default: null
  },
  redisInfo: {
    type: Object,
    default: null
  },
  lastConnectionName: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['refresh', 'quick-connect-last', 'open-connection-manager', 'restore-last-connection'])

const connectionStore = useConnectionStore()

// 响应式数据
const searchTerm = ref('')
const loading = ref(false)
const quickConnectLoading = ref(false)
const restoreLoading = ref(false)

// 键值统计数据
const keysStats = ref([])

// 计算属性
const filteredRedisInfo = computed(() => {
  if (!props.redisInfo?.redisInfo) return []
  
  const infoArray = Object.entries(props.redisInfo.redisInfo).map(([key, value]) => ({
    key,
    value: String(value)
  }))
  
  if (!searchTerm.value) {
    return infoArray
  }
  
  return infoArray.filter(item => 
    item.key.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    item.value.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

// 左侧数据库统计 (db0-db7)
const leftDbStats = computed(() => {
  if (!props.redisInfo?.dbStats) return []
  return props.redisInfo.dbStats.slice(0, 8)
})

// 右侧数据库统计 (db8-db15)
const rightDbStats = computed(() => {
  if (!props.redisInfo?.dbStats) return []
  return props.redisInfo.dbStats.slice(8, 16)
})

// 方法
const formatMemory = (memoryStr) => {
  if (!memoryStr) return '未知'
  return memoryStr
}

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '0'
  // 确保num是数字类型
  const number = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(number)) return '0'
  return number.toLocaleString()
}

const formatAvgTtl = (ttl) => {
  if (ttl === null || ttl === undefined || ttl === '' || ttl === 0) return '0'
  // 确保ttl是数字类型
  const number = typeof ttl === 'string' ? parseFloat(ttl) : ttl
  if (isNaN(number) || number === 0) return '0'
  if (number < 1000) return `${number}ms`
  if (number < 60000) return `${Math.round(number / 1000)}s`
  if (number < 3600000) return `${Math.round(number / 60000)}m`
  if (number < 86400000) return `${Math.round(number / 3600000)}h`
  return `${Math.round(number / 86400000)}d`
}

const refreshInfo = async () => {
  if (!props.connection) return
  
  loading.value = true
  try {
    await emit('refresh')
  } catch (error) {
    console.error('刷新Redis信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 快速连接最后一次连接
const quickConnectLast = async () => {
  quickConnectLoading.value = true
  try {
    // 触发父组件的快速连接方法
    emit('quick-connect-last')
  } catch (error) {
    console.error('快速连接失败:', error)
  } finally {
    quickConnectLoading.value = false
  }
}

// 恢复上次连接
const restoreLastConnection = async () => {
  restoreLoading.value = true
  try {
    // 触发父组件的恢复上次连接方法
    emit('restore-last-connection')
  } catch (error) {
    console.error('恢复上次连接失败:', error)
  } finally {
    restoreLoading.value = false
  }
}

// 打开连接管理
const openConnectionManager = () => {
  emit('open-connection-manager')
}

// 监听连接变化，有连接但无 Redis 信息时触发首次获取
watch(() => props.connection, (newConnection) => {
  if (newConnection && !props.redisInfo && !loading.value) {
    refreshInfo()
  }
}, { immediate: true })

// 监听Redis信息变化，当有连接但没有Redis信息时自动获取
watch(() => props.redisInfo, (newRedisInfo) => {
  if (props.connection && !newRedisInfo && !loading.value) {
    // 延迟一下避免频繁请求
    setTimeout(() => {
      if (props.connection && !props.redisInfo && !loading.value) {
        refreshInfo()
      }
    }, 1000)
  }
}, { immediate: true })

// 处理连接合并事件
const handleConnectionMerged = async (event) => {
  console.log('RedisOverview - 收到连接合并事件:', event.detail)
  
  const { oldConnections, newConnections } = event.detail
  
  // 检查当前连接是否在合并的连接中
  const currentConn = props.connection
  if (!currentConn) return
  
  const wasMerged = oldConnections.some(oldConn => 
    oldConn.host === currentConn.host && 
    oldConn.port === currentConn.port &&
    oldConn.database === currentConn.database
  )
  
  if (wasMerged) {
    console.log('RedisOverview - 当前连接已被合并，重新获取Redis信息...')
    
    // 找到对应的新连接
    const newConn = newConnections.find(conn => 
      conn.host === currentConn.host && 
      conn.port === currentConn.port &&
      conn.database === currentConn.database
    )
    
    if (newConn) {
      console.log('RedisOverview - 找到新连接:', {
        id: newConn.id,
        isTemp: newConn.isTemp
      })
      
      // 更新当前连接为新连接
      connectionStore.setCurrentConnection(newConn)
    }
    
    // 等待一下让连接状态更新
    setTimeout(async () => {
      try {
        // 重新获取Redis信息
        await refreshInfo()
        ElMessage.success('连接已更新，Redis信息已重新加载')
      } catch (error) {
        console.error('RedisOverview - 重新获取Redis信息失败:', error)
        ElMessage.error('重新获取Redis信息失败')
      }
    }, 500)
  }
}

// 组件挂载和卸载
onMounted(() => {
  // 监听连接合并事件
  window.addEventListener('connection-merged', handleConnectionMerged)
})

onUnmounted(() => {
  // 移除连接合并事件监听
  window.removeEventListener('connection-merged', handleConnectionMerged)
})
</script>

<style scoped>
.redis-overview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.overview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 15px;
  border-bottom: 1px solid var(--el-border-color);
}

.overview-title {
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.auto-refresh-switch {
  margin-left: 8px;
}

.no-data,
.loading-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 20px;
}

.quick-connect-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.info-panels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 15px;
  margin-bottom: 10px;
}

.info-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--el-border-color);
}

.panel-title {
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color);
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.info-value {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 500;
}

.keys-stats-panel,
.redis-info-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--el-border-color);
  width: 100%;
  margin: 0 15px;
  margin-bottom: 10px;
}

.db-stats-container {
  display: flex;
  gap: 8px;
}

.db-stats-left,
.db-stats-right {
  flex: 1;
}

.db-section-title {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color);
}

.panel-header .panel-title {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

/* 表格随主题 */
:deep(.theme-table th.el-table__cell),
:deep(.theme-table .el-table__header th) {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
}

:deep(.theme-table td.el-table__cell),
:deep(.theme-table .el-table__body td) {
  background-color: var(--el-bg-color) !important;
  color: var(--el-text-color-primary) !important;
}

</style> 