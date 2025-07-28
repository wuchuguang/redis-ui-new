<template>
  <div class="redis-overview">
    <!-- 信息面板 -->
    <div class="info-panels">
      <!-- 服务器信息 -->
      <div class="info-panel">
        <h3 class="panel-title">服务器</h3>
        <div class="panel-content">
          <div class="info-item">
            <span class="info-label">Redis版本:</span>
            <span class="info-value">{{ redisInfo?.redis_version || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">OS:</span>
            <span class="info-value">{{ redisInfo?.os || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">进程ID:</span>
            <span class="info-value">{{ redisInfo?.process_id || '未知' }}</span>
          </div>
        </div>
      </div>

      <!-- 内存信息 -->
      <div class="info-panel">
        <h3 class="panel-title">内存</h3>
        <div class="panel-content">
          <div class="info-item">
            <span class="info-label">已用内存:</span>
            <span class="info-value">{{ formatMemory(redisInfo?.used_memory_human) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">内存占用峰值:</span>
            <span class="info-value">{{ formatMemory(redisInfo?.used_memory_peak_human) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Lua占用内存:</span>
            <span class="info-value">{{ formatMemory(redisInfo?.used_memory_lua_human) }}</span>
          </div>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="info-panel">
        <h3 class="panel-title">状态</h3>
        <div class="panel-content">
          <div class="info-item">
            <span class="info-label">客户端连接数:</span>
            <span class="info-value">{{ redisInfo?.connected_clients || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">历史连接数:</span>
            <span class="info-value">{{ formatNumber(redisInfo?.total_connections_received) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">历史命令数:</span>
            <span class="info-value">{{ formatNumber(redisInfo?.total_commands_processed) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 键值统计 -->
    <div class="keys-stats-panel">
      <h3 class="panel-title">键值统计</h3>
      <el-table
        :data="keysStats"
        style="width: 100%"
        :header-cell-style="{ backgroundColor: '#2d2d2d', color: '#ffffff' }"
        :cell-style="{ backgroundColor: '#1e1e1e', color: '#ffffff' }"
      >
        <el-table-column prop="db" label="DB" width="80" />
        <el-table-column prop="keys" label="Keys" width="120" />
        <el-table-column prop="expires" label="Expires" width="120" />
        <el-table-column prop="avgTtl" label="Avg TTL" />
      </el-table>
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
        max-height="400"
      >
        <el-table-column prop="key" label="Key" width="200" />
        <el-table-column prop="value" label="Value" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

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

// 响应式数据
const searchTerm = ref('')

// 模拟键值统计数据
const keysStats = ref([
  { db: 'db0', keys: 21875, expires: 89, avgTtl: '104,535,202' },
  { db: 'db3', keys: 32373, expires: 6, avgTtl: '18,182' }
])

// 计算属性
const filteredRedisInfo = computed(() => {
  if (!props.redisInfo) return []
  
  const infoArray = Object.entries(props.redisInfo).map(([key, value]) => ({
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

// 方法
const formatMemory = (memoryStr) => {
  if (!memoryStr) return '未知'
  return memoryStr
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}
</script>

<style scoped>
.redis-overview {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-panels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.info-panel {
  background-color: #2d2d2d;
  border-radius: 8px;
  padding: 20px;
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
  padding: 20px;
  border: 1px solid #404040;
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