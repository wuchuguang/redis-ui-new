# 连接状态修复测试

## 问题描述

用户反馈："连接时ConnectionExplorer.vue组件没有更新还是啥,都不能选db和key列表了"，指的是在连接Redis后，ConnectionExplorer组件没有正确更新状态，导致无法选择数据库和键列表。

## 问题分析

### 1. 根本原因
- 数据库选择器和搜索框的禁用状态使用了错误的变量
- `refreshDatabases`方法中的变量作用域问题
- 连接变化时状态重置不完整

### 2. 具体问题
- 数据库选择器使用`:disabled="!connection"`而不是`:disabled="!props.connection"`
- 搜索框使用`:disabled="!connection"`而不是`:disabled="!props.connection"`
- 按钮使用`:disabled="!connection"`而不是`:disabled="!props.connection"`
- `refreshDatabases`方法中的`dbList`变量作用域问题
- 连接变化时没有完整重置组件状态

## 修复方案

### 1. 修复禁用状态
- 将所有`:disabled="!connection"`改为`:disabled="!props.connection"`
- 确保在没有连接时正确禁用所有交互元素

### 2. 修复数据库刷新逻辑
- 修复`refreshDatabases`方法中的变量作用域问题
- 使用正确的数组索引操作
- 添加更详细的错误日志

### 3. 完善连接状态监听
- 在连接变化时完整重置组件状态
- 添加详细的日志输出
- 确保状态清理和重新加载的正确顺序

## 修复内容

### 1. 修复禁用状态
```vue
<!-- 数据库选择器 -->
<el-select 
  v-model="selectedDatabase" 
  placeholder="选择数据库"
  @change="handleDatabaseChange"
  class="database-select"
  :disabled="!props.connection"  <!-- 修复前: !connection -->
>

<!-- 搜索框 -->
<el-input
  v-model="searchTerm"
  :placeholder="getSearchPlaceholder()"
  clearable
  @input="handleSearchInput"
  @keyup.enter="handleSearchEnter"
  @focus="showSearchHistory = true"
  class="search-input"
  :disabled="!props.connection"  <!-- 修复前: !connection -->
>

<!-- 新增Key按钮 -->
<el-button 
  type="primary" 
  size="small" 
  @click="showAddKeyDialog = true"
  :disabled="!props.connection"  <!-- 修复前: !connection -->
  class="add-key-btn"
>

<!-- 批量删除按钮 -->
<el-button 
  type="danger" 
  size="small" 
  @click="showBatchDeleteDialog = true"
  :disabled="!props.connection || getTotalKeysCount() === 0"  <!-- 修复前: !connection -->
  class="batch-delete-btn"
  title="批量删除"
>
```

### 2. 修复数据库刷新逻辑
```javascript
const refreshDatabases = async (interval) => {
  if (!props.connection) return
  
  try {
    // 创建新的数据库列表
    const dbList = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      keys: 0
    }))
    
    for (let i = 0; i <= 16; i++) {
      try {
        if(nextRefreshTime[i] && nextRefreshTime[i] > Date.now()){
          console.log(`数据库${i}在${nextRefreshTime[i]}后刷新`)
          continue;
        }
        const data = await connectionStore.getKeys(props.connection.id, i, '*')
        dbList[i] = {  // 修复前: dbList.splice(i, 1, {...})
          id: i,
          keys: data ? data.totalKeys : 0
        }
        if(data && data.totalKeys > 0){
          nextRefreshTime[i] = Date.now() + interval;
        }else{
          nextRefreshTime[i] = Date.now() + 600000;
        }
      } catch (error) {
        console.error(`获取数据库${i}信息失败:`, error)
        dbList[i] = {  // 修复前: dbList.splice(i, 1, {...})
          id: i,
          keys: 'error'
        }
      }
    }
    databases.value = dbList
    console.log('数据库列表已更新:', dbList)
  } catch (error) {
    console.error('获取数据库列表失败:', error)
    databases.value = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      keys: 0
    }))
  }
}
```

### 3. 完善连接状态监听
```javascript
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
  } else {
    // 清理状态
    stopAutoRefresh()
    selectedDatabase.value = 0
    searchTerm.value = ''
    keysData.value = []
    databases.value = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      keys: 0
    }))
    
    console.log('连接已断开，状态已清理')
  }
}, { immediate: true })
```

### 4. 恢复getTotalKeysCount方法
```javascript
// 获取总键数
const getTotalKeysCount = () => {
  let total = 0;
  for (const group of keysData.value) {
    total += group.keys.length;
  }
  return total;
}
```

## 测试步骤

### 1. 连接状态测试
- [ ] 创建新的Redis连接
- [ ] 验证数据库选择器变为可用状态
- [ ] 验证搜索框变为可用状态
- [ ] 验证新增Key按钮变为可用状态
- [ ] 验证批量删除按钮状态正确

### 2. 数据库选择测试
- [ ] 点击数据库选择器
- [ ] 验证显示所有数据库选项
- [ ] 验证数据库键数显示正确
- [ ] 选择不同的数据库
- [ ] 验证键列表正确更新

### 3. 键列表显示测试
- [ ] 验证键列表正确加载
- [ ] 验证分组显示正确
- [ ] 验证键数量统计正确
- [ ] 验证搜索功能正常

### 4. 断开连接测试
- [ ] 断开Redis连接
- [ ] 验证所有交互元素变为禁用状态
- [ ] 验证状态正确清理
- [ ] 验证自动刷新停止

### 5. 重新连接测试
- [ ] 重新连接Redis
- [ ] 验证状态正确重置
- [ ] 验证数据重新加载
- [ ] 验证所有功能恢复正常

## 验证要点

### 1. 状态同步
- [ ] 连接状态与UI状态同步
- [ ] 数据库选择器状态正确
- [ ] 搜索框状态正确
- [ ] 按钮状态正确

### 2. 数据加载
- [ ] 数据库列表正确加载
- [ ] 键列表正确加载
- [ ] 错误处理正确
- [ ] 加载状态显示正确

### 3. 交互功能
- [ ] 数据库切换功能正常
- [ ] 搜索功能正常
- [ ] 新增Key功能正常
- [ ] 批量删除功能正常

### 4. 错误处理
- [ ] 网络错误正确处理
- [ ] 连接失败正确处理
- [ ] 权限错误正确处理
- [ ] 用户反馈正确

## 技术细节

### 1. 状态管理
- **连接状态**：通过props.connection判断
- **数据库状态**：通过databases.value管理
- **键列表状态**：通过keysData.value管理
- **UI状态**：通过各种ref变量管理

### 2. 数据流
- **连接变化** → **状态重置** → **数据重新加载** → **UI更新**
- **数据库选择** → **键列表刷新** → **UI更新**
- **搜索输入** → **键列表过滤** → **UI更新**

### 3. 错误处理
- **网络错误**：显示错误消息，保持当前状态
- **连接错误**：清理状态，禁用交互元素
- **权限错误**：显示错误消息，限制操作

## 预期效果

### 修复前
- 连接后无法选择数据库
- 连接后无法使用搜索功能
- 连接后按钮状态不正确
- 数据库列表不更新

### 修复后
- 连接后所有功能正常可用
- 数据库选择器正确显示和更新
- 搜索功能正常工作
- 按钮状态正确反映连接状态
- 数据加载和错误处理正确

## 注意事项

1. **状态同步**：确保连接状态与UI状态完全同步
2. **错误处理**：提供清晰的错误反馈
3. **性能优化**：避免不必要的重复请求
4. **用户体验**：提供加载状态和操作反馈
5. **数据一致性**：确保数据更新时UI正确反映 