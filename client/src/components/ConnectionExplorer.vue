<template>
  <div class="connection-explorer">
    <!-- 当前连接标题 -->
    <div class="current-connection-header" v-if="currentConnection">
      <h3 class="connection-title">{{ currentConnection.redis.name }}</h3>
      <div class="connection-actions">
        <el-button type="text" size="small" @click="openRedisInfo" title="Redis服务信息">
          <el-icon><InfoFilled /></el-icon>
        </el-button>
        <el-button type="text" size="small" @click="openConversionRules" title="转换规则管理">
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-button type="text" size="small" @click="handleRefresh" title="刷新连接状态">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button type="text" size="small" @click="goUp" title="返回上级">
          <el-icon><ArrowUp /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 数据库选择器 -->
    <div class="database-selector">
      <el-select 
        v-model="selectedDatabase" 
        :placeholder="!props.connection ? '请先选择连接' : '选择数据库'"
        @change="handleDatabaseChange"
        class="database-select"
        :disabled="!props.connection || databases.length === 0"
      >
        <el-option
          v-for="db in databases"
          :key="db.id"
          :label="`DB${db.id} (${db.keys})`"
          :value="db.id"
          :class="{ 'db-with-data': db.keys > 0 }"
        >
          <span class="db-name">DB{{ db.id }}</span>
          <span class="db-keys-count" :class="{ 'has-data': db.keys > 0 }">({{ db.keys }})</span>
        </el-option>
      </el-select>
    </div>

    <!-- 搜索框 -->
    <div class="search-section">
      <div class="search-container">
        <el-input
          v-model="searchTerm"
          :placeholder="getSearchPlaceholder()"
          clearable
          @input="handleSearchInput"
          @keyup.enter="handleSearchEnter"
          @focus="showSearchHistory = true"
          class="search-input"
          :disabled="!props.connection"
        >
          <template #suffix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <!-- 搜索历史下拉菜单 -->
        <div v-if="showSearchHistory && searchHistory.length > 0" class="search-history-dropdown">
          <div class="search-history-header">
            <span>搜索历史</span>
            <el-button 
              type="text" 
              size="small" 
              @click="clearAllSearchHistory"
              title="清空所有历史"
            >
              清空
            </el-button>
          </div>
          <div class="search-history-list">
            <div
              v-for="(item, index) in filteredSearchHistory"
              :key="index"
              class="search-history-item"
              @click="selectSearchHistory(item.value)"
            >
              <span class="history-text">{{ item.value }}</span>
              <el-button 
                type="text" 
                size="small" 
                class="delete-history-btn"
                @click.stop="deleteSearchHistory(item.value)"
                title="删除此搜索历史"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 键列表标题 -->
    <div class="keys-header">
      <div class="keys-header-left">
        <span class="keys-title">{{ getKeysTitle() }}</span>
        <span v-if="searchTerm && searchTerm.trim()" class="search-result-count">
          ({{ getTotalKeysCount() }}个键)
        </span>
      </div>
      <div class="keys-header-right">
        <el-button 
          type="primary" 
          size="small" 
          @click="showAddKeyDialog = true"
          :disabled="!props.connection"
          class="add-key-btn"
        >
          <el-icon><Plus /></el-icon>
          新增Key
        </el-button>
        <el-button 
          type="danger" 
          size="small" 
          @click="showBatchDeleteDialog = true"
          :disabled="!props.connection || getTotalKeysCount() === 0"
          class="batch-delete-btn"
          title="批量删除"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
        <el-button 
          type="primary" 
          size="small" 
          @click="showConfigDialog = true"
          title="显示配置"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 键列表 -->
    <div class="keys-section">
      <div class="keys-tree">
          <div v-if="!connection" class="no-connection-tip">
            <el-empty description="请先创建Redis连接" />
          </div>
          <div v-else-if="filteredKeys.length === 0" class="no-keys-tip">
            <el-empty 
              :description="getNoKeysMessage()" 
              :image="getNoKeysImage()"
            />
          </div>
          <div v-else-if="isListMode" class="list-mode">
            <div class="list-mode-header">
              <el-button 
                type="text" 
                size="small" 
                @click="backToGroups"
                class="back-btn"
              >
                <el-icon><ArrowLeft /></el-icon>
                返回分组
              </el-button>
              <span class="list-mode-title">{{ currentListPrefix }}</span>
            </div>
            <div class="list-mode-keys">
              <div
                v-for="key in filteredKeys[0]?.keys || []"
                :key="key.name"
                class="key-item"
                @click="selectKey(key)"
                :class="{ active: selectedKey?.name === key.name }"
              >
                <el-icon class="key-icon"><Document /></el-icon>
                <span class="key-name">{{ key.name }}</span>
              </div>
            </div>
          </div>
          <div v-else>
            <div
              v-for="keyGroup in filteredKeys"
              :key="keyGroup.prefix"
            >
              <!-- 如果组内只有一个键，直接显示为单个键项 -->
              <div v-if="keyGroup.count === 1" class="key-item" @click="selectKey(keyGroup.keys[0])" :class="{ active: selectedKey?.name === keyGroup.keys[0].name }">
                <el-icon class="key-icon"><Document /></el-icon>
                <span class="key-name">{{ keyGroup.keys[0].name }}</span>
              </div>
              
              <!-- 如果组内有多个键，显示为可展开的组 -->
              <div v-else class="key-group">
                <div class="key-group-header">
                  <div class="key-group-info" @click="toggleKeyGroup(keyGroup.prefix)">
                    <el-icon class="expand-icon" :class="{ expanded: expandedGroups.includes(keyGroup.prefix) }">
                      <ArrowRight />
                    </el-icon>
                    <span class="key-prefix">{{ keyGroup.prefix }}</span>
                    <span class="key-count">({{ keyGroup.count }})</span>
                  </div>
                  <div class="key-group-actions">
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="refreshKeyGroup(keyGroup.prefix)"
                      title="刷新组"
                    >
                      <el-icon><Refresh /></el-icon>
                    </el-button>
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="convertToList(keyGroup.prefix)"
                      title="转成列表"
                    >
                      <el-icon><List /></el-icon>
                    </el-button>
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="deleteKeyGroup(keyGroup.prefix)"
                      title="删除组"
                      class="delete-btn"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div v-if="expandedGroups.includes(keyGroup.prefix)" class="key-list">
                  <div class="key-list-header">
                    <span>显示前 {{ loadedKeyCounts[keyGroup.prefix] || keyGroup.keys.length }} 条键</span>
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="loadMoreKeys(keyGroup.prefix)"
                      :loading="loadingMoreKeys[keyGroup.prefix]"
                      v-if="keyGroup.hasMore"
                    >
                      加载更多
                    </el-button>
                  </div>
                  <div
                    v-for="key in keyGroup.keys"
                    :key="key.name"
                    class="key-item"
                    @click="selectKey(key)"
                    :class="{ active: selectedKey?.name === key.name }"
                  >
                    <el-icon class="key-icon"><Document /></el-icon>
                    <span class="key-name">{{ key.name }}</span>
                  </div>
                  <div v-if="keyGroup.hasMore" class="key-list-footer">
                    <span 
                      class="remaining-keys-text"
                      :class="{ 'loading': loadingMoreKeys[keyGroup.prefix] }"
                      @click="loadMoreKeys(keyGroup.prefix)"
                    >
                      <el-icon v-if="loadingMoreKeys[keyGroup.prefix]" class="loading-icon">
                        <Loading />
                      </el-icon>
                      还有 {{ keyGroup.count - (loadedKeyCounts[keyGroup.prefix] || keyGroup.keys.length) }} 条键未显示
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- 配置对话框 -->
    <el-dialog
      v-model="showConfigDialog"
      title="显示配置"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="configFormRef"
        :model="configForm"
        label-width="120px"
      >
        <el-form-item label="每组显示键数" prop="maxKeysPerGroup">
          <el-input-number 
            v-model="configForm.maxKeysPerGroup" 
            :min="10" 
            :max="1000"
            :step="10"
            @keyup.enter="handleConfigSave"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="showConfigDialog = false">取消</el-button>
          <el-button type="primary" @click="handleConfigSave">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量删除对话框 -->
    <BatchDeleteDialog
      v-model="showBatchDeleteDialog"
      :connection="connection"
      :database="selectedDatabase"
      :visible-keys="visibleKeys"
      :grouped-keys="groupedKeys"
      :search-results="searchResults"
      :has-search-results="hasSearchResults"
      @success="handleBatchDeleteSuccess"
    />

    <!-- 添加键对话框 -->
    <NewKeyDialog 
      v-model="showAddKeyDialog"
      @add-key="handleAddKeyFromDialog"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { House, Folder, Refresh, ArrowUp, ArrowRight, ArrowLeft, Plus, Search, Document, Delete, List, Setting, Loading, CircleCheck, CircleClose, InfoFilled } from '@element-plus/icons-vue'
import NewKeyDialog from './NewKeyDialog.vue'
import BatchDeleteDialog from './BatchDeleteDialog.vue'
import { useConnectionStore } from '../stores/connection'
import { operationLogger } from '../utils/operationLogger'

// Props
const props = defineProps({
  connection: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['select-database', 'add-key', 'search-keys', 'select-key', 'open-conversion-rules', 'open-redis-info'])

const connectionStore = useConnectionStore()

// 计算属性
const currentConnection = computed(() => props.connection)

// 过滤搜索历史
const filteredSearchHistory = computed(() => {
  if (!searchTerm.value || !searchTerm.value.trim()) {
    return searchHistory.value
  }
  const searchLower = searchTerm.value.toLowerCase().trim()
  return searchHistory.value.filter(item => 
    item.value.toLowerCase().includes(searchLower)
  )
})

// 响应式数据
const selectedDatabase = ref(0)
const searchTerm = ref('')
const showAddKeyDialog = ref(false)
const showConfigDialog = ref(false)
const showBatchDeleteDialog = ref(false)
const expandedGroups = ref([])
const selectedKey = ref(null)

const searchTimer = ref(null)
const maxKeysPerGroup = ref(100)
const currentListMode = ref(false)
const currentListPrefix = ref('')
const loadingMoreKeys = ref({}) // 记录每个组的加载状态
const loadedKeyCounts = ref({}) // 记录每个组已加载的键数

// 批量删除相关 - 已移除，使用BatchDeleteDialog组件

// 搜索历史相关
const searchHistory = ref([]) // 搜索历史记录
const maxSearchHistory = 20 // 最大历史记录数
const showSearchHistory = ref(false) // 是否显示搜索历史

// 数据库和键列表相关
const databases = ref(Array.from({ length: 16 }, (_, i) => ({
  id: i,
  keys: 0
})))
const keysData = ref([])
const keysLoading = ref(false)
const autoRefreshTimer = ref(null)

// 表单数据
const configForm = reactive({
  maxKeysPerGroup: 100
})

// 初始化配置表单
configForm.maxKeysPerGroup = maxKeysPerGroup.value



// 计算属性
const filteredKeys = computed(() => {
  // 直接返回后端过滤后的数据
  return keysData.value || []
})

// 获取所有可见的键
const visibleKeys = computed(() => {
  const keys = []
  for (const group of keysData.value) {
    if (expandedGroups.value.includes(group.prefix) || group.count === 1) {
      keys.push(...group.keys.map(k => k.name))
    }
  }
  return keys
})

// 获取分组中的键（未展开的分组）
const groupedKeys = computed(() => {
  const keys = []
  for (const group of keysData.value) {
    if (!expandedGroups.value.includes(group.prefix) && group.count > 1) {
      // 对于未展开的分组，我们需要获取该分组下的所有键
      // 这里我们返回该分组下已加载的键，以及分组前缀本身
      keys.push(group.prefix) // 分组前缀
      // 如果该分组有已加载的键，也包含它们
      if (group.keys && group.keys.length > 0) {
        keys.push(...group.keys.map(k => k.name))
      }
    }
  }
  return keys
})

// 获取搜索结果
const searchResults = computed(() => {
  if (!searchTerm.value || !searchTerm.value.trim()) {
    return []
  }
  return visibleKeys.value
})

// 是否有搜索结果
const hasSearchResults = computed(() => {
  return searchTerm.value && searchTerm.value.trim() && searchResults.value.length > 0
})

// 计算当前显示模式
const isListMode = computed(() => currentListMode.value && currentListPrefix.value)

// 方法
const refreshKeys = async (showLoading = false) => {
  if (!props.connection) return
  
  if (showLoading) {
    keysLoading.value = true
  }
  try {
    // 构建搜索模式
    let pattern = '*'
    if (searchTerm.value && searchTerm.value.trim()) {
      // 如果搜索词不为空，使用搜索词作为模式
      const searchValue = searchTerm.value.trim()
      // 如果搜索词包含通配符，直接使用；否则添加通配符
      if (searchValue.includes('*') || searchValue.includes('?')) {
        pattern = searchValue
      } else {
        pattern = `*${searchValue}*`
      }
    }
    
    console.log('搜索模式:', pattern)
    
    // 计算请求的键数：使用已加载的最大键数，但不少于默认值
    let requestLimit = maxKeysPerGroup.value
    for (const [prefix, count] of Object.entries(loadedKeyCounts.value)) {
      if (count > requestLimit) {
        requestLimit = count
      }
    }
    
    const data = await connectionStore.getKeys(props.connection.id, selectedDatabase.value, pattern, requestLimit)
    if (data) {
      keysData.value = data.groups
      console.log('键数据已更新:', {
        groupsCount: data.groups.length,
        totalKeys: data.totalKeys,
        selectedDatabase: selectedDatabase.value
      })
      // 全量列表时同步更新当前库在 select 中的键数，保证下拉显示正确
      if (pattern === '*' && typeof data.totalKeys === 'number') {
        const dbId = selectedDatabase.value
        const next = [...databases.value]
        if (next[dbId]) {
          next[dbId] = { id: dbId, keys: data.totalKeys }
          databases.value = next
        }
      }
      // 更新已加载的键数，保持用户已加载的数量
      for (const group of data.groups) {
        const existingCount = loadedKeyCounts.value[group.prefix] || 0
        loadedKeyCounts.value[group.prefix] = Math.max(existingCount, group.keys.length)
      }
    }
  } catch (error) {
    console.error('搜索键失败:', error)
    ElMessage.error('搜索键失败')
  } finally {
    if (showLoading) {
      keysLoading.value = false
    }
  }
}

const handleRefresh = async () => {
  if (!props.connection) return
  
  // 如果当前是列表模式，刷新当前key下的数据
  if (currentListMode.value && currentListPrefix.value) {
    await refreshListModeData(false)
  } else {
    // 否则刷新分组数据，不显示加载状态
    await refreshKeys(false)
  }
}

const openConversionRules = () => {
  emit('open-conversion-rules')
}

const openRedisInfo = () => {
  emit('open-redis-info')
}

const refreshListModeData = async (isConverting = false) => {
  if (!props.connection || !currentListPrefix.value) return
  
  keysLoading.value = true
  try {
    // 构建搜索模式，包含搜索词
    let pattern = `${currentListPrefix.value}:*`
    if (searchTerm.value && searchTerm.value.trim()) {
      const searchValue = searchTerm.value.trim()
      // 如果搜索词包含通配符，直接使用；否则添加通配符
      if (searchValue.includes('*') || searchValue.includes('?')) {
        pattern = `${currentListPrefix.value}:${searchValue}`
      } else {
        pattern = `${currentListPrefix.value}:*${searchValue}*`
      }
    }
    
    console.log('列表模式搜索模式:', pattern)
    
    // 使用已加载的键数作为请求参数
    const existingCount = loadedKeyCounts.value[currentListPrefix.value] || maxKeysPerGroup.value
    const requestLimit = Math.max(existingCount, maxKeysPerGroup.value)
    
    const data = await connectionStore.getKeys(props.connection.id, selectedDatabase.value, pattern, requestLimit)
    if (data && data.groups && data.groups.length > 0) {
      // 将单个组的数据设置为当前显示
      keysData.value = data.groups
      // 保持已加载的键数
      for (const group of data.groups) {
        const currentCount = loadedKeyCounts.value[group.prefix] || 0
        loadedKeyCounts.value[group.prefix] = Math.max(currentCount, group.keys.length)
      }
    }
    // 只有在非转换模式下才显示成功消息
    if (!isConverting) {
      ElMessage.success(`已刷新 ${currentListPrefix.value} 的列表数据`)
    }
  } catch (error) {
    console.error('刷新列表数据失败:', error)
    ElMessage.error('刷新列表数据失败')
    // 如果是转换模式失败，退出列表模式
    if (isConverting) {
      currentListMode.value = false
      currentListPrefix.value = ''
    }
  } finally {
    keysLoading.value = false
  }
}

const nextRefreshTime = {};

const refreshDatabases = async (interval) => {
  if (!props.connection || !props.connection.id) {
    console.log('连接无效，跳过数据库刷新')
    return
  }
  
  try {
    // 创建新的数据库列表
    const dbList = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      keys: 0
    }))
    
    for (let i = 0; i < 16; i++) {
      try {
        if(nextRefreshTime[i] && nextRefreshTime[i] > Date.now()){
          console.log(`数据库${i}在${nextRefreshTime[i]}后刷新`)
          continue;
        }
        const data = await connectionStore.getKeys(props.connection.id, i, '*')
        dbList[i] = {
          id: i,
          keys: data ? data.totalKeys : 0
        }
        if (data && data.totalKeys > 0) {
          nextRefreshTime[i] = Date.now() + interval // 10秒
        } else {
          nextRefreshTime[i] = Date.now() + 30000 // 空库 30 秒后再刷新，避免长期显示 0
        }
      } catch (error) {
        console.error(`获取数据库${i}信息失败:`, error)
        // 如果某个数据库访问失败，仍然添加但键数为0
        dbList[i] = {
          id: i,
          keys: 'error'
        }
      }
    }
    databases.value = dbList
    console.log('数据库列表已更新:', dbList)
  } catch (error) {
    console.error('获取数据库列表失败:', error)
    // 如果完全失败，至少显示所有数据库选项
    databases.value = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      keys: 0
    }))
  }
}
let interval = 10000;
const startAutoRefresh = () => {
  stopAutoRefresh()
  autoRefreshTimer.value = setInterval(async () => {
    await refreshDatabases(interval)
    if (props.connection) {
      // 如果当前是列表模式，刷新当前key下的数据
      if (currentListMode.value && currentListPrefix.value) {
        await refreshListModeData(false)
      } else {
        await refreshKeys(false)
      }
    }
  }, interval) // 10秒
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}



const goUp = () => {
  console.log('返回上级')
}

const handleDatabaseChange = async (dbId) => {
  if (!props.connection || databases.value.length === 0) {
    console.log('连接无效或数据库列表为空，跳过数据库切换')
    return
  }
  
  selectedDatabase.value = dbId
  emit('select-database', dbId)
  await refreshKeys(true)
}

const handleSearchInput = () => {
  // 清除之前的定时器
  if (searchTimer.value) {
    clearTimeout(searchTimer.value)
  }
  
  // 如果当前是列表模式，退出列表模式
  if (currentListMode.value) {
    currentListMode.value = false
    currentListPrefix.value = ''
  }
  
  // 设置1秒延时搜索
  searchTimer.value = setTimeout(() => {
    console.log('延时搜索:', searchTerm.value)
    refreshKeys(false)
  }, 1000)
}

const handleSearchEnter = () => {
  // 清除定时器，立即搜索
  if (searchTimer.value) {
    clearTimeout(searchTimer.value)
    searchTimer.value = null
  }
  
  // 如果当前是列表模式，退出列表模式
  if (currentListMode.value) {
    currentListMode.value = false
    currentListPrefix.value = ''
  }
  
  console.log('回车搜索:', searchTerm.value)
  
  // 添加到搜索历史
  if (searchTerm.value && searchTerm.value.trim()) {
    addToSearchHistory(searchTerm.value)
  }
  
  refreshKeys(false)
}

// 搜索历史相关方法
const addToSearchHistory = (searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return
  
  const term = searchTerm.trim()
  
  // 移除已存在的相同搜索词
  const index = searchHistory.value.findIndex(item => item.value === term)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  
  // 添加到开头
  searchHistory.value.unshift({
    value: term,
    timestamp: Date.now()
  })
  
  // 限制历史记录数量
  if (searchHistory.value.length > maxSearchHistory) {
    searchHistory.value = searchHistory.value.slice(0, maxSearchHistory)
  }
  
  // 保存到本地存储
  saveSearchHistory()
}

const selectSearchHistory = (value) => {
  searchTerm.value = value
  showSearchHistory.value = false
  
  console.log('选择搜索历史:', value)
  
  // 添加到搜索历史
  addToSearchHistory(value)
  // 立即搜索
  refreshKeys(false)
}

const clearAllSearchHistory = () => {
  searchHistory.value = []
  saveSearchHistory()
  ElMessage.success('已清空所有搜索历史')
}

const saveSearchHistory = () => {
  try {
    localStorage.setItem('redis-search-history', JSON.stringify(searchHistory.value))
    console.log('保存搜索历史:', searchHistory.value.length, '条')
  } catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

const loadSearchHistory = () => {
  try {
    const saved = localStorage.getItem('redis-search-history')
    if (saved) {
      searchHistory.value = JSON.parse(saved)
      console.log('加载搜索历史:', searchHistory.value.length, '条')
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
    // 如果加载失败，清空搜索历史
    searchHistory.value = []
  }
}

const deleteSearchHistory = (searchTerm) => {
  // 从历史记录中移除
  const index = searchHistory.value.findIndex(item => item.value === searchTerm)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
    // 保存到本地存储
    saveSearchHistory()
    ElMessage.success('已删除搜索历史')
  }
}

const handleSearch = async (value) => {
  emit('search-keys', value)
  // 记录操作日志
  operationLogger.logKeySearch(value, props.connection)
  await refreshKeys(false)
}

const toggleKeyGroup = (prefix) => {
  const index = expandedGroups.value.indexOf(prefix)
  if (index > -1) {
    expandedGroups.value.splice(index, 1)
  } else {
    expandedGroups.value.push(prefix)
  }
}

const selectKey = (key) => {
  selectedKey.value = key
  emit('select-key', key)
}

const refreshKeyGroup = async (prefix) => {
  // 如果当前是列表模式且是当前key，刷新列表数据
  if (currentListMode.value && currentListPrefix.value === prefix) {
    await refreshListModeData(false)
  } else {
    await refreshKeys(false)
  }
}

const deleteKeyGroup = async (prefix) => {
  if (!props.connection) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除键组 "${prefix}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await connectionStore.deleteKeyGroup(props.connection.id, selectedDatabase.value, prefix)
    if (success) {
      await refreshKeys(false)
    }
  } catch (error) {
    // 用户取消删除
  }
}

// 处理从NewKeyDialog组件传来的添加Key事件
const handleAddKeyFromDialog = (keyData) => {
  console.log('从NewKeyDialog接收到的Key数据:', keyData)
  emit('add-key', keyData)
}

// 处理批量删除成功
const handleBatchDeleteSuccess = async (result) => {
  console.log('批量删除成功:', result)
  // 刷新键列表
  await refreshKeys(true)
}

const handleConfigSave = async () => {
  maxKeysPerGroup.value = configForm.maxKeysPerGroup
  showConfigDialog.value = false
  
  // 重新加载数据以应用新的配置
  await refreshKeys(false)
  ElMessage.success('配置已保存')
}

const convertToList = async (prefix) => {
  if (!props.connection) return
  
  currentListMode.value = true
  currentListPrefix.value = prefix
  
  // 加载该组的所有键
  await refreshListModeData(true)
  ElMessage.success(`已切换到 ${prefix} 的列表模式`)
}

const loadMoreKeys = async (prefix) => {
  if (!props.connection) return
  
  // 如果正在加载，直接返回
  if (loadingMoreKeys.value[prefix]) {
    return
  }
  
  // 设置加载状态
  loadingMoreKeys.value[prefix] = true
  
  try {
    // 找到对应的组
    const groupIndex = keysData.value.findIndex(group => group.prefix === prefix)
    if (groupIndex === -1) {
      ElMessage.error('找不到对应的键组')
      return
    }
    
    const currentGroup = keysData.value[groupIndex]
    const currentOffset = currentGroup.keys.length // 使用当前组已显示的键数作为offset
    
    console.log(`前端请求加载更多 - 前缀: ${prefix}, 当前偏移: ${currentOffset}, 限制: ${maxKeysPerGroup.value}`)
    
    const data = await connectionStore.loadMoreKeys(
      props.connection.id, 
      selectedDatabase.value, 
      prefix, 
      currentOffset, 
      maxKeysPerGroup.value
    )
    
    if (data && data.keys) {
      console.log(`后端返回数据 - 键数: ${data.keys.length}, 总数: ${data.totalKeys}, 还有更多: ${data.hasMore}`)
      
      // 添加新键到现有组
      currentGroup.keys.push(...data.keys)
      loadedKeyCounts.value[prefix] = currentGroup.keys.length
      
      // 更新hasMore状态
      currentGroup.hasMore = data.hasMore
      
      ElMessage.success(`已加载 ${data.keys.length} 条键`)
    }
  } catch (error) {
    console.error('加载更多键失败:', error)
    ElMessage.error('加载更多键失败')
  } finally {
    loadingMoreKeys.value[prefix] = false
  }
}

const backToGroups = async () => {
  currentListMode.value = false
  currentListPrefix.value = ''
  
  // 重新加载分组数据
  await refreshKeys(true)
  ElMessage.success('已返回分组模式')
}

// 监听连接变化
watch(() => props.connection, async (newConnection) => {
  console.log('连接变化:', newConnection)
  
  if (newConnection) {
    // 重置状态
    selectedDatabase.value = 0
    searchTerm.value = ''
    keysData.value = []
    expandedGroups.value = []
    selectedKey.value = null
    currentListMode.value = false
    currentListPrefix.value = ''
    
    // 重新获取数据
    await refreshDatabases()
    await refreshKeys(true)
    startAutoRefresh()
    
    console.log('连接数据已重新加载')
    console.log('当前状态:', {
      selectedDatabase: selectedDatabase.value,
      databasesCount: databases.value.length,
      keysDataCount: keysData.value.length,
      connection: props.connection
    })
  } else {
    // 清理状态
    stopAutoRefresh()
    selectedDatabase.value = 0
    searchTerm.value = ''
    keysData.value = []
    expandedGroups.value = []
    selectedKey.value = null
    currentListMode.value = false
    currentListPrefix.value = ''
    
    // 清空数据库列表
    databases.value = []
    
    // 清空数据库刷新时间缓存
    Object.keys(nextRefreshTime).forEach(key => {
      delete nextRefreshTime[key]
    })
    
    console.log('连接已断开，状态已清理')
  }
}, { immediate: true })

// 组件初始化时加载搜索历史
onMounted(() => {
  loadSearchHistory()
  
  // 添加点击外部关闭搜索历史的事件监听
  document.addEventListener('click', handleClickOutside)
  
  // 监听连接合并事件
  window.addEventListener('connection-merged', handleConnectionMerged)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('connection-merged', handleConnectionMerged)
})

// 点击外部关闭搜索历史
const handleClickOutside = (event) => {
  const searchContainer = document.querySelector('.search-container')
  if (searchContainer && !searchContainer.contains(event.target)) {
    showSearchHistory.value = false
  }
}

// 处理连接合并事件
const handleConnectionMerged = async (event) => {
  console.log('收到连接合并事件:', event.detail)
  
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
    console.log('当前连接已被合并，重新获取数据...')
    
    // 找到对应的新连接
    const newConn = newConnections.find(conn => 
      conn.host === currentConn.host && 
      conn.port === currentConn.port &&
      conn.database === currentConn.database
    )
    
    if (newConn) {
      console.log('找到新连接:', {
        id: newConn.id,
        isTemp: newConn.isTemp
      })
      
      // 更新当前连接为新连接
      connectionStore.setCurrentConnection(newConn)
    }
    
    // 等待一下让连接状态更新
    setTimeout(async () => {
      try {
        // 重新获取数据库信息
        await refreshDatabases()
        
        // 重新获取键列表
        await refreshKeys(true)
        
        ElMessage.success('连接已更新，数据已重新加载')
      } catch (error) {
        console.error('重新获取数据失败:', error)
        ElMessage.error('重新获取数据失败')
      }
    }, 500)
  }
}



// 监听配置变化
watch(() => maxKeysPerGroup.value, (newValue) => {
  configForm.maxKeysPerGroup = newValue
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopAutoRefresh()
  if (searchTimer.value) {
    clearTimeout(searchTimer.value)
  }
})

// 获取无键时的提示信息
const getNoKeysMessage = () => {
  if (!props.connection) {
    return '请先创建Redis连接'
  }
  
  if (searchTerm.value && searchTerm.value.trim()) {
    return `未找到匹配 "${searchTerm.value.trim()}" 的键`
  }
  
  if (currentListMode.value && currentListPrefix.value) {
    return `在 ${currentListPrefix.value} 组中未找到键`
  }
  
  return '当前数据库暂无键'
}

// 获取无键时的图标
const getNoKeysImage = () => {
  if (searchTerm.value && searchTerm.value.trim()) {
    return 'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg'
  }
  return 'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg'
}

// 获取搜索框占位符文本
const getSearchPlaceholder = () => {
  if (searchTerm.value && searchTerm.value.trim()) {
    return `搜索 "${searchTerm.value.trim()}" 的键...`
  }
  if (currentListMode.value && currentListPrefix.value) {
    return `搜索 ${currentListPrefix.value} 组中的键...`
  }
  return '搜索键...'
}

// 获取搜索状态文本
const getSearchStatusText = () => {
  if (searchTerm.value && searchTerm.value.trim()) {
    return `搜索 "${searchTerm.value.trim()}"`
  }
  return '搜索'
}

// 获取搜索状态类型
const getSearchStatusType = () => {
  if (searchTerm.value && searchTerm.value.trim()) {
    return 'success'
  }
  return 'info'
}

// 获取键列表标题文本
const getKeysTitle = () => {
  if (searchTerm.value && searchTerm.value.trim()) {
    return '搜索结果'
  }
  if (currentListMode.value && currentListPrefix.value) {
    return `${currentListPrefix.value} 组`
  }
  return '键列表'
}

// 获取总键数
const getTotalKeysCount = () => {
  let total = 0;
  for (const group of keysData.value) {
    total += group.keys.length;
  }
  return total;
}

// 根据名称删除键
const deleteKeysByName = async (keyNames) => {
  if (!props.connection) return
  
  for (const keyName of keyNames) {
    try {
      await connectionStore.deleteKey(props.connection.id, selectedDatabase.value, keyName)
    } catch (error) {
      console.error(`删除键 ${keyName} 失败:`, error)
    }
  }
}

// 根据模式删除键
const deleteKeysByPattern = async (pattern) => {
  if (!props.connection) return
  
  const keysToDelete = getKeysByPattern(pattern)
  await deleteKeysByName(keysToDelete)
}

// 暴露方法给父组件
defineExpose({
  refreshKeys,
  refreshDatabases
})
</script>

<style scoped>
.connection-explorer {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px;
  overflow: hidden;
}



.status-tag {
  margin-left: 8px;
}

.connection-actions {
  display: flex;
  gap: 8px;
}

.current-connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color);
}

.connection-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  flex: 1;
}

.connection-status {
  margin: 0 10px;
}

.connection-actions {
  display: flex;
  gap: 5px;
}

.connection-actions .el-button {
  background: transparent;
  border: none;
  padding: 4px;
}

.connection-actions .el-button:hover {
  background-color: var(--el-fill-color);
}

.database-selector {
  margin-bottom: 10px;
}

.database-select {
  width: 100%;
}

.db-keys-count {
  color: var(--el-text-color-secondary);
  margin-left: 5px;
}

.add-key-section {
  margin-bottom: 15px;
}

.add-key-section .el-button {
  width: 100%;
}

.search-section {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
}

.keys-section {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.keys-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 8px 0;
  border-bottom: 1px solid var(--el-border-color);
  margin-bottom: 6px;
  flex-shrink: 0;
}
.keys-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.keys-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.search-result-count {
  font-size: 12px;
  color: var(--el-color-primary);
  margin-left: 8px;
  font-weight: 500;
}
.keys-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.add-key-btn {
  font-weight: 500;
  letter-spacing: 1px;
  min-width: 90px;
}

.keys-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.keys-tree {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.key-group {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.key-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px 4px 0 0;
}

.key-group-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex: 1;
}

.key-group-info:hover {
  background-color: var(--el-fill-color);
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
}

.key-group-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.key-group:hover .key-group-actions {
  opacity: 1;
}

.key-group-actions .el-button {
  background: transparent;
  border: none;
  padding: 4px;
}

.key-group-actions .el-button:hover {
  background-color: var(--el-fill-color);
}

.key-group-actions .delete-btn:hover {
  background-color: var(--el-color-danger);
  color: var(--el-text-color-primary);
}

.expand-icon {
  margin-right: 8px;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.key-prefix {
  flex: 1;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.key-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.key-list {
  background-color: var(--el-bg-color);
  border-radius: 0 0 4px 4px;
  padding: 8px 0;
}

.key-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 0 12px;
}

.key-list-footer {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 4px 12px;
  border-top: 1px solid var(--el-border-color);
}

.remaining-keys-text {
  cursor: pointer;
  color: #409eff;
  transition: color 0.2s;
}

.remaining-keys-text:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.remaining-keys-text.loading {
  color: var(--el-text-color-secondary);
  cursor: not-allowed;
}

.remaining-keys-text.loading:hover {
  color: var(--el-text-color-secondary);
  text-decoration: none;
}

.loading-icon {
  margin-right: 4px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.key-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color);
}

.key-item:last-child {
  border-bottom: none;
}

.key-item:hover {
  background-color: var(--el-fill-color);
}

.key-item.active {
  background-color: var(--el-color-primary);
  color: var(--el-text-color-primary);
}

.key-icon {
  margin-right: 8px;
  font-size: 14px;
}

.key-name {
  flex: 1;
  font-size: 13px;
  word-break: break-all;
}

.dialog-footer {
  text-align: right;
}

.no-connection-tip,
.no-keys-tip {
  padding: 40px 20px;
  text-align: center;
}

.no-connection-tip :deep(.el-empty__description),
.no-keys-tip :deep(.el-empty__description) {
  color: var(--el-text-color-secondary);
}

.list-mode {
  display: flex;
  flex-direction: column;
}

.list-mode-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
}

.back-btn {
  color: var(--el-color-primary);
}

.list-mode-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.list-mode-keys {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 搜索容器样式 */
.search-container {
  position: relative;
  width: 100%;
}

/* 搜索状态指示器样式 */
.search-status {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  padding: 0 12px;
  margin-top: 4px;
  z-index: 10;
}

.search-status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* 搜索历史下拉菜单样式 */
.search-history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 2000;
  max-height: 300px;
  overflow-y: auto;
}

.search-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.search-history-list {
  max-height: 250px;
  overflow-y: auto;
}

.search-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color);
  transition: background-color 0.2s;
}

.search-history-item:last-child {
  border-bottom: none;
}

.search-history-item:hover {
  background-color: var(--el-fill-color);
}

.history-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.delete-history-btn {
  opacity: 0.6;
  transition: opacity 0.2s;
  color: var(--el-text-color-secondary);
  padding: 2px;
}

/* 添加Key对话框样式 */
.hash-fields-container,
.list-items-container,
.set-members-container,
.zset-members-container {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  overflow: hidden;
}

.hash-fields-header,
.list-items-header,
.set-members-header,
.zset-members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--el-fill-color);
  border-bottom: 1px solid var(--el-border-color);
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.hash-fields-list,
.list-items-list,
.set-members-list,
.zset-members-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.hash-field-item,
.list-item,
.set-member,
.zset-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  transition: all 0.2s;
}

.hash-field-item:hover,
.list-item:hover,
.set-member:hover,
.zset-member:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.field-name,
.item-value,
.member-value {
  flex: 1;
  min-width: 0;
}

.field-value {
  flex: 2;
  min-width: 0;
}

.member-score {
  width: 120px;
}

.field-remove,
.item-remove,
.member-remove {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
}

.empty-fields,
.empty-items,
.empty-members {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.delete-history-btn:hover {
  opacity: 1;
  color: var(--el-color-danger);
  background-color: var(--el-fill-color);
}

/* 添加Key对话框样式 */
.hash-fields-container,
.list-items-container,
.set-members-container,
.zset-members-container {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  overflow: hidden;
}

.hash-fields-header,
.list-items-header,
.set-members-header,
.zset-members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--el-fill-color);
  border-bottom: 1px solid var(--el-border-color);
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.hash-fields-list,
.list-items-list,
.set-members-list,
.zset-members-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.hash-field-item,
.list-item,
.set-member,
.zset-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  transition: all 0.2s;
}

.hash-field-item:hover,
.list-item:hover,
.set-member:hover,
.zset-member:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.field-name,
.item-value,
.member-value {
  flex: 1;
  min-width: 0;
}

.field-value {
  flex: 2;
  min-width: 0;
}

.member-score {
  width: 120px;
}

.field-remove,
.item-remove,
.member-remove {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
}

.empty-fields,
.empty-items,
.empty-members {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

/* 对话框输入框样式修复 */
:deep(.el-dialog .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-dialog .el-input__wrapper) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-dialog .el-textarea__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-dialog .el-input-number .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-dialog .el-select .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-dialog .el-form-item__label) {
  color: var(--el-text-color-primary) !important;
}

:deep(.el-dialog .el-input__inner::placeholder) {
  color: var(--el-text-color-placeholder) !important;
}

:deep(.el-dialog .el-textarea__inner::placeholder) {
  color: var(--el-text-color-placeholder) !important;
}

/* 对话框整体样式 */
:deep(.el-dialog) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-dialog__header) {
  background-color: var(--el-bg-color-overlay) !important;
  border-bottom-color: var(--el-border-color) !important;
}

:deep(.el-dialog__title) {
  color: var(--el-text-color-primary) !important;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: var(--el-text-color-primary) !important;
}

:deep(.el-dialog__body) {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
}

:deep(.el-dialog__footer) {
  background-color: var(--el-bg-color-overlay) !important;
  border-top-color: var(--el-border-color) !important;
}

/* 下拉选择框样式 */
:deep(.el-select-dropdown) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-select-dropdown__item) {
  color: var(--el-text-color-primary) !important;
}

:deep(.el-select-dropdown__item:hover) {
  background-color: var(--el-fill-color) !important;
}

:deep(.el-select-dropdown__item.selected) {
  background-color: var(--el-color-primary) !important;
  color: var(--el-text-color-primary) !important;
}

/* 数字输入框样式 */
:deep(.el-input-number .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-input-number .el-input-number__decrease),
:deep(.el-input-number .el-input-number__increase) {
  background-color: var(--el-fill-color) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

:deep(.el-input-number .el-input-number__decrease:hover),
:deep(.el-input-number .el-input-number__increase:hover) {
  background-color: var(--el-fill-color-light) !important;
}

/* 数据库选择器样式 - 确保选中值在明暗主题下均可见 */
.database-select {
  width: 100%;
}

.database-select :deep(.el-input__wrapper),
.database-select :deep(.el-input__inner) {
  background-color: var(--el-fill-color-blank, var(--el-input-bg-color, var(--el-fill-color))) !important;
}

.database-select :deep(.el-input__wrapper),
.database-select :deep(.el-input__wrapper input),
.database-select :deep(.el-input__inner),
.database-select :deep(.el-select__selected-item) {
  color: var(--el-text-color-primary) !important;
}

/* 数据库选项样式 - 有数据时高亮和字体放大 */
:deep(.el-select-dropdown__item.db-with-data) {
  background-color: var(--el-color-primary) !important;
  color: var(--el-text-color-primary) !important;
  font-weight: 600;
}

:deep(.el-select-dropdown__item.db-with-data:hover) {
  background-color: var(--el-color-primary) !important;
  opacity: 0.9;
}

:deep(.el-select-dropdown__item.db-with-data.selected) {
  background-color: var(--el-color-primary) !important;
  color: var(--el-text-color-primary) !important;
}

:deep(.el-select-dropdown__item.db-with-data .db-name) {
  font-size: 1.5em;
  font-weight: bold;
}

:deep(.el-select-dropdown__item.db-with-data .db-keys-count.has-data) {
  font-size: 1.2em;
  font-weight: bold;
  color: var(--el-text-color-primary) !important;
}

/* 无数据的数据库选项保持默认样式 */
:deep(.el-select-dropdown__item:not(.db-with-data)) {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
}

:deep(.el-select-dropdown__item:not(.db-with-data):hover) {
  background-color: var(--el-fill-color) !important;
}

:deep(.el-select-dropdown__item:not(.db-with-data) .db-name) {
  font-size: 1em;
  font-weight: normal;
}

:deep(.el-select-dropdown__item:not(.db-with-data) .db-keys-count) {
  font-size: 1em;
  font-weight: normal;
  color: var(--el-text-color-secondary) !important;
}

/* 数据库选项内部样式 */
.db-keys-count {
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}

.db-keys-count.has-data {
  color: #67c23a;
  font-weight: 600;
}

/* 连接状态样式 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.connection-info {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-family: monospace;
}

.connection-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.connection-actions .el-button {
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.connection-actions .el-button:hover {
  background-color: var(--el-fill-color-light);
  transform: scale(1.05);
}

/* 键列表区域滚动条（随主题） */
.keys-tree {
  scrollbar-width: thin;
  scrollbar-color: var(--app-scrollbar-thumb) transparent;
}

.keys-tree::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar-thumb);
}

.keys-tree::-webkit-scrollbar-thumb:hover {
  background: var(--app-scrollbar-thumb-hover);
}

/* 搜索历史下拉菜单滚动条 */
.search-history-list {
  scrollbar-width: thin;
  scrollbar-color: var(--app-scrollbar-thumb) transparent;
}

.search-history-list::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar-thumb);
}

.search-history-list::-webkit-scrollbar-thumb:hover {
  background: var(--app-scrollbar-thumb-hover);
}

.batch-delete-btn {
  margin-right: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tab-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}
</style> 