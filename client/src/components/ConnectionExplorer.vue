<template>
  <div class="connection-explorer">
    <!-- 当前连接标题 -->
    <div class="current-connection-header" v-if="currentConnection">
      <h3 class="connection-title">{{ currentConnection.name }}</h3>
      <div class="connection-status">
        <el-tag 
          :type="currentConnection.status === 'connected' ? 'success' : 'danger'"
          size="small"
        >
          {{ currentConnection.status === 'connected' ? '已连接' : '未连接' }}
        </el-tag>
      </div>
      <div class="connection-actions">
        <el-button type="text" size="small" @click="refreshKeys">
          <el-icon><House /></el-icon>
        </el-button>
        <el-button type="text" size="small" @click="refreshKeys">
          <el-icon><Folder /></el-icon>
        </el-button>
        <el-button type="text" size="small" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button type="text" size="small" @click="goUp">
          <el-icon><ArrowUp /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 数据库选择器 -->
    <div class="database-selector">
      <el-select 
        v-model="selectedDatabase" 
        placeholder="选择数据库"
        @change="handleDatabaseChange"
        class="database-select"
        :disabled="!connection"
      >
        <el-option
          v-for="db in databases"
          :key="db.id"
          :label="`DB${db.id} (${db.keys})`"
          :value="db.id"
        >
          <span>DB{{ db.id }}</span>
          <span class="db-keys-count">({{ db.keys }})</span>
        </el-option>
      </el-select>
    </div>

    <!-- 搜索框 -->
    <div class="search-section">
      <div class="search-container">
        <el-input
          v-model="searchTerm"
          placeholder="搜索键... (回车或延时1秒自动搜索)"
          clearable
          @input="handleSearchInput"
          @keyup.enter="handleSearchEnter"
          @focus="showSearchHistory = true"
          class="search-input"
          :disabled="!connection"
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
        <span class="keys-title">键列表</span>
        <span class="keys-count">({{ filteredKeys.length }})</span>
      </div>
      <div class="keys-header-right">
        <el-button 
          type="primary" 
          size="small" 
          @click="showAddKeyDialog = true"
          :disabled="!connection"
          class="add-key-btn"
        >
          <el-icon><Plus /></el-icon>
          新增Key
        </el-button>
        <el-button 
          type="default" 
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
            <el-empty description="当前数据库暂无键" />
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

    <!-- 添加键对话框 -->
    <el-dialog
      v-model="showAddKeyDialog"
      title="新增Key"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addKeyFormRef"
        :model="addKeyForm"
        :rules="addKeyRules"
        label-width="100px"
      >
        <el-form-item label="Key名称" prop="name">
          <el-input v-model="addKeyForm.name" placeholder="请输入Key名称" />
        </el-form-item>
        
        <el-form-item label="数据类型" prop="type">
          <el-select v-model="addKeyForm.type" placeholder="选择数据类型">
            <el-option label="String" value="string" />
            <el-option label="Hash" value="hash" />
            <el-option label="List" value="list" />
            <el-option label="Set" value="set" />
            <el-option label="ZSet" value="zset" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="TTL(秒)" prop="ttl">
          <el-input-number v-model="addKeyForm.ttl" :min="-1" placeholder="-1表示永不过期" />
        </el-form-item>
        
        <el-form-item label="值" prop="value" v-if="addKeyForm.type === 'string'">
          <el-input
            v-model="addKeyForm.value"
            type="textarea"
            :rows="3"
            placeholder="请输入值"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="showAddKeyDialog = false">取消</el-button>
          <el-button type="primary" @click="handleAddKey">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { House, Folder, Refresh, ArrowUp, ArrowRight, ArrowLeft, Plus, Search, Document, Delete, List, Setting, Loading } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'

// Props
const props = defineProps({
  connection: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['select-database', 'add-key', 'search-keys', 'select-key'])

const connectionStore = useConnectionStore()

// 计算属性
const currentConnection = computed(() => props.connection)

// 过滤搜索历史
const filteredSearchHistory = computed(() => {
  if (!searchTerm.value) {
    return searchHistory.value
  }
  return searchHistory.value.filter(item => 
    item.value.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

// 响应式数据
const selectedDatabase = ref(0)
const searchTerm = ref('')
const showAddKeyDialog = ref(false)
const showConfigDialog = ref(false)
const expandedGroups = ref([])
const selectedKey = ref(null)

const searchTimer = ref(null)
const maxKeysPerGroup = ref(100)
const currentListMode = ref(false)
const currentListPrefix = ref('')
const loadingMoreKeys = ref({}) // 记录每个组的加载状态
const loadedKeyCounts = ref({}) // 记录每个组已加载的键数

// 搜索历史相关
const searchHistory = ref([]) // 搜索历史记录
const maxSearchHistory = 20 // 最大历史记录数
const showSearchHistory = ref(false) // 是否显示搜索历史

// 响应式数据
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

const addKeyForm = reactive({
  name: '',
  type: 'string',
  ttl: -1,
  value: ''
})

const addKeyRules = {
  name: [
    { required: true, message: '请输入Key名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ]
}

// 计算属性
const filteredKeys = computed(() => {
  // 直接返回后端过滤后的数据
  return keysData.value || []
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
      pattern = `*${searchTerm.value.trim()}*`
    }
    
    const data = await connectionStore.getKeys(props.connection.id, selectedDatabase.value, pattern, maxKeysPerGroup.value)
    if (data) {
      keysData.value = data.groups
      // 初始化已加载的键数
      for (const group of data.groups) {
        loadedKeyCounts.value[group.prefix] = group.keys.length
      }
    }
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

const refreshListModeData = async (isConverting = false) => {
  if (!props.connection || !currentListPrefix.value) return
  
  keysLoading.value = true
  try {
    // 构建搜索模式，包含搜索词
    let pattern = `${currentListPrefix.value}:*`
    if (searchTerm.value && searchTerm.value.trim()) {
      pattern = `${currentListPrefix.value}:*${searchTerm.value.trim()}*`
    }
    
    const data = await connectionStore.getKeys(props.connection.id, selectedDatabase.value, pattern)
    if (data && data.groups && data.groups.length > 0) {
      // 将单个组的数据设置为当前显示
      keysData.value = data.groups
      // 重置已加载的键数
      for (const group of data.groups) {
        loadedKeyCounts.value[group.prefix] = group.keys.length
      }
    }
    // 只有在非转换模式下才显示成功消息
    if (!isConverting) {
      ElMessage.success(`已刷新 ${currentListPrefix.value} 的列表数据`)
    }
  } catch (error) {
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

const refreshDatabases = async () => {
  if (!props.connection) return
  
  try {
    const dbList = []
    for (let i = 0; i <= 15; i++) {
      try {
        const data = await connectionStore.getKeys(props.connection.id, i, '*')
        dbList.push({
          id: i,
          keys: data ? data.totalKeys : 0
        })
      } catch (error) {
        // 如果某个数据库访问失败，仍然添加但键数为0
        dbList.push({
          id: i,
          keys: 0
        })
      }
    }
    databases.value = dbList
  } catch (error) {
    console.error('获取数据库列表失败:', error)
    // 如果完全失败，至少显示所有数据库选项
    databases.value = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      keys: 0
    }))
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  autoRefreshTimer.value = setInterval(async () => {
    await refreshDatabases()
    if (props.connection) {
      // 如果当前是列表模式，刷新当前key下的数据
      if (currentListMode.value && currentListPrefix.value) {
        await refreshListModeData(false)
      } else {
        await refreshKeys(false)
      }
    }
  }, 10000) // 10秒
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
  
  // 添加到搜索历史
  addToSearchHistory(searchTerm.value)
  
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
  } catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

const loadSearchHistory = () => {
  try {
    const saved = localStorage.getItem('redis-search-history')
    if (saved) {
      searchHistory.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
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

const handleAddKey = () => {
  console.log('添加键:', addKeyForm)
  showAddKeyDialog.value = false
  emit('add-key', { ...addKeyForm })
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
  if (newConnection) {
    await refreshDatabases()
    await refreshKeys(true)
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}, { immediate: true })

// 组件初始化时加载搜索历史
onMounted(() => {
  loadSearchHistory()
  
  // 添加点击外部关闭搜索历史的事件监听
  document.addEventListener('click', handleClickOutside)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 点击外部关闭搜索历史
const handleClickOutside = (event) => {
  const searchContainer = document.querySelector('.search-container')
  if (searchContainer && !searchContainer.contains(event.target)) {
    showSearchHistory.value = false
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
  border-bottom: 1px solid #404040;
}

.connection-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
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
  background-color: #404040;
}

.database-selector {
  margin-bottom: 10px;
}

.database-select {
  width: 100%;
}

.db-keys-count {
  color: #909399;
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
  border-bottom: 1px solid #404040;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.keys-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.keys-title {
  font-weight: bold;
  font-size: 15px;
  color: #fff;
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
  color: #909399;
  font-size: 12px;
}

.keys-tree {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.key-group {
  border: 1px solid #404040;
  border-radius: 4px;
}

.key-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #2d2d2d;
  border-radius: 4px 4px 0 0;
}

.key-group-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex: 1;
}

.key-group-info:hover {
  background-color: #404040;
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
  background-color: #404040;
}

.key-group-actions .delete-btn:hover {
  background-color: #f56c6c;
  color: #ffffff;
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
  color: #ffffff;
  font-weight: 500;
}

.key-count {
  color: #909399;
  font-size: 12px;
}

.key-list {
  background-color: #1e1e1e;
  border-radius: 0 0 4px 4px;
  padding: 8px 0;
}

.key-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
  padding: 0 12px;
}

.key-list-footer {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
  padding: 4px 12px;
  border-top: 1px solid #404040;
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
  color: #909399;
  cursor: not-allowed;
}

.remaining-keys-text.loading:hover {
  color: #909399;
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
  border-bottom: 1px solid #2d2d2d;
}

.key-item:last-child {
  border-bottom: none;
}

.key-item:hover {
  background-color: #2d2d2d;
}

.key-item.active {
  background-color: #409eff;
  color: #ffffff;
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
  color: #909399;
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
  background-color: #2d2d2d;
  border-radius: 4px;
}

.back-btn {
  color: #409eff;
}

.list-mode-title {
  font-weight: 600;
  color: #ffffff;
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
  margin-left: 8px;
  min-width: auto;
  height: auto;
}

.delete-history-btn:hover {
  opacity: 1;
  color: var(--el-color-danger);
  background-color: var(--el-fill-color);
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
  color: #ffffff !important;
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

/* 数据库选择器样式 */
.database-select {
  width: 100%;
}

:deep(.database-select .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.database-select .el-input__wrapper) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

/* 搜索框样式 */
.search-input {
  width: 100%;
}

:deep(.search-input .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.search-input .el-input__wrapper) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

/* 数据库选项样式 */
:deep(.el-select-dropdown .el-select-dropdown__item) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
}

:deep(.el-select-dropdown .el-select-dropdown__item:hover) {
  background-color: var(--el-fill-color) !important;
}

:deep(.el-select-dropdown .el-select-dropdown__item.selected) {
  background-color: var(--el-color-primary) !important;
  color: #ffffff !important;
}

/* 确保所有输入框都有正确的样式 */
:deep(.el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-input__wrapper) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-input__inner::placeholder) {
  color: #909399 !important;
}

/* 强制覆盖所有选择框样式 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-select .el-input__inner) {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.el-select .el-input__wrapper) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

/* 确保选择框的图标也是可见的 */
:deep(.el-select .el-input__suffix) {
  color: #ffffff !important;
}

:deep(.el-select .el-input__suffix .el-icon) {
  color: #ffffff !important;
}

/* 强制覆盖所有下拉菜单样式 */
:deep(.el-select-dropdown) {
  background-color: #2d2d2d !important;
  border-color: #404040 !important;
}

:deep(.el-select-dropdown__item) {
  color: #ffffff !important;
  background-color: #2d2d2d !important;
}

:deep(.el-select-dropdown__item:hover) {
  background-color: #404040 !important;
}

:deep(.el-select-dropdown__item.selected) {
  background-color: #409eff !important;
  color: #ffffff !important;
}

/* 数据库选项内部样式 */
.db-keys-count {
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}

/* 键列表区域滚动条样式 */
.keys-tree {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

.keys-tree::-webkit-scrollbar {
  width: 2px;
}

.keys-tree::-webkit-scrollbar-track {
  background: transparent;
}

.keys-tree::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 1px;
}

.keys-tree::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

/* 搜索历史下拉菜单滚动条 */
.search-history-list {
  scrollbar-width: thin;
  scrollbar-color: #606266 transparent;
}

.search-history-list::-webkit-scrollbar {
  width: 2px;
}

.search-history-list::-webkit-scrollbar-track {
  background: transparent;
}

.search-history-list::-webkit-scrollbar-thumb {
  background: #606266;
  border-radius: 1px;
}

.search-history-list::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
</style> 