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
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text=""
          class="auto-refresh-switch"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="!redisInfo && !loading" class="no-data">
      <el-empty description="暂无Redis信息，请先建立连接" />
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
            style="width: 100%"
            :header-cell-style="{ backgroundColor: '#2d2d2d', color: '#ffffff' }"
            :cell-style="{ backgroundColor: '#1e1e1e', color: '#ffffff' }"
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
            style="width: 100%"
            :header-cell-style="{ backgroundColor: '#2d2d2d', color: '#ffffff' }"
            :cell-style="{ backgroundColor: '#1e1e1e', color: '#ffffff' }"
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
        style="width: 100%"
        :header-cell-style="{ backgroundColor: '#2d2d2d', color: '#ffffff' }"
        :cell-style="{ backgroundColor: '#1e1e1e', color: '#ffffff' }"
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
import { Search, Refresh } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'

// Props
const props = defineProps({
  connection: {
    type: Object,
    required: true
  },
  redisInfo: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['refresh'])

const connectionStore = useConnectionStore()

// 响应式数据
const searchTerm = ref('')
const loading = ref(false)
const autoRefresh = ref(true)
const autoRefreshTimer = ref(null)

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
  if (!num) return '0'
  return num.toLocaleString()
}

const formatAvgTtl = (ttl) => {
  if (!ttl || ttl === 0) return '0'
  if (ttl < 1000) return `${ttl}ms`
  if (ttl < 60000) return `${Math.round(ttl / 1000)}s`
  if (ttl < 3600000) return `${Math.round(ttl / 60000)}m`
  if (ttl < 86400000) return `${Math.round(ttl / 3600000)}h`
  return `${Math.round(ttl / 86400000)}d`
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

const startAutoRefresh = () => {
  stopAutoRefresh()
  if (autoRefresh.value) {
    autoRefreshTimer.value = setInterval(() => {
      refreshInfo()
    }, 10000) // 10秒
  }
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 监听自动刷新开关
watch(autoRefresh, (newValue) => {
  if (newValue) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

// 监听连接变化
watch(() => props.connection, (newConnection) => {
  if (newConnection) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}, { immediate: true })

// 组件挂载和卸载
onMounted(() => {
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
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
  border-bottom: 1px solid #404040;
}

.overview-title {
  color: #ffffff;
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

.info-panels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 15px;
  margin-bottom: 10px;
}

.info-panel {
  background-color: #2d2d2d;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #404040;
}

.panel-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #404040;
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
  color: #909399;
  font-size: 14px;
}

.info-value {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}



.keys-stats-panel,
.redis-info-panel {
  background-color: #2d2d2d;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #404040;
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
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #404040;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #404040;
}

.panel-header .panel-title {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

/* 表格样式已由全局样式处理 */


</style> 