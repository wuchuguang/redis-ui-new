<template>
  <el-dialog
    v-model="dialogVisible"
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
        <el-input 
          v-model="addKeyForm.name" 
          placeholder="请输入Key名称"
          @keyup.enter="handleAddKey"
        />
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
        <el-input-number 
          v-model="addKeyForm.ttl" 
          :min="-1" 
          placeholder="-1表示永不过期"
          @keyup.enter="handleAddKey"
        />
      </el-form-item>
      
      <!-- String类型的值输入 -->
      <el-form-item label="值" prop="value" v-if="addKeyForm.type === 'string'">
        <el-input
          v-model="addKeyForm.value"
          type="textarea"
          :rows="3"
          placeholder="请输入值"
          @keyup.enter="handleAddKey"
        />
      </el-form-item>
      
      <!-- Hash类型的字段管理 -->
      <el-form-item label="字段" v-if="addKeyForm.type === 'hash'">
        <div class="hash-fields-container">
          <div class="hash-fields-header">
            <span>Hash字段列表</span>
            <div class="header-actions">
              <small class="tab-hint">💡 填写字段名后按Tab→填写字段值后按Tab→自动添加新字段</small>
              <el-button type="primary" size="small" @click="addHashField">
                <el-icon><Plus /></el-icon>
                添加字段
              </el-button>
            </div>
          </div>
          
          <div class="hash-fields-list">
            <div 
              v-for="(field, index) in addKeyForm.hashFields" 
              :key="index" 
              class="hash-field-item"
            >
              <el-input
                v-model="field.name"
                placeholder="字段名"
                size="small"
                class="field-name"
                @keydown.tab="handleHashFieldTab($event, index, 'name')"
              />
              <el-input
                v-model="field.value"
                placeholder="字段值"
                size="small"
                class="field-value"
                @keydown.tab="handleHashFieldTab($event, index, 'value')"
              />
              <el-button 
                type="danger" 
                size="small" 
                @click="removeHashField(index)"
                class="field-remove"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            

          </div>
        </div>
      </el-form-item>
      
      <!-- List类型的值管理 -->
      <el-form-item label="元素" v-if="addKeyForm.type === 'list'">
        <div class="list-items-container">
          <div class="list-items-header">
            <span>List元素列表</span>
            <div class="header-actions">
              <small class="tab-hint">💡 填写后按Tab键自动添加新元素</small>
              <el-button type="primary" size="small" @click="addListItem">
                <el-icon><Plus /></el-icon>
                添加元素
              </el-button>
            </div>
          </div>
          
          <div class="list-items-list">
            <div 
              v-for="(item, index) in addKeyForm.listItems" 
              :key="index" 
              class="list-item"
            >
              <el-input
                v-model="item.value"
                placeholder="元素值"
                size="small"
                class="item-value"
                @keydown.tab="handleListItemTab($event, index)"
              />
              <el-button 
                type="danger" 
                size="small" 
                @click="removeListItem(index)"
                class="item-remove"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            

          </div>
        </div>
      </el-form-item>
      
      <!-- Set类型的值管理 -->
      <el-form-item label="成员" v-if="addKeyForm.type === 'set'">
        <div class="set-members-container">
          <div class="set-members-header">
            <span>Set成员列表</span>
            <div class="header-actions">
              <small class="tab-hint">💡 填写后按Tab键自动添加新成员</small>
              <el-button type="primary" size="small" @click="addSetMember">
                <el-icon><Plus /></el-icon>
                添加成员
              </el-button>
            </div>
          </div>
          
          <div class="set-members-list">
            <div 
              v-for="(member, index) in addKeyForm.setMembers" 
              :key="index" 
              class="set-member"
            >
              <el-input
                v-model="member.value"
                placeholder="成员值"
                size="small"
                class="member-value"
                @keydown.tab="handleSetMemberTab($event, index)"
              />
              <el-button 
                type="danger" 
                size="small" 
                @click="removeSetMember(index)"
                class="member-remove"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            

          </div>
        </div>
      </el-form-item>
      
      <!-- ZSet类型的值管理 -->
      <el-form-item label="成员" v-if="addKeyForm.type === 'zset'">
        <div class="zset-members-container">
          <div class="zset-members-header">
            <span>ZSet成员列表</span>
            <div class="header-actions">
              <small class="tab-hint">💡 填写成员值后按Tab→填写分数后按Tab→自动添加新成员</small>
              <el-button type="primary" size="small" @click="addZSetMember">
                <el-icon><Plus /></el-icon>
                添加成员
              </el-button>
            </div>
          </div>
          
          <div class="zset-members-list">
            <div 
              v-for="(member, index) in addKeyForm.zsetMembers" 
              :key="index" 
              class="zset-member"
            >
              <el-input
                v-model="member.value"
                placeholder="成员值"
                size="small"
                class="member-value"
                @keydown.tab="handleZSetMemberTab($event, index, 'value')"
              />
              <div class="score-input-group">
                <el-input-number
                  v-model="member.score"
                  placeholder="分数"
                  size="small"
                  class="member-score"
                  :precision="0"
                  :min="-999999999999"
                  :max="999999999999"
                  @keydown.tab="handleZSetMemberTab($event, index, 'score')"
                />
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="setCurrentTimestamp(index)"
                  class="timestamp-btn"
                  title="使用当前Unix时间戳"
                >
                  时间戳
                </el-button>
              </div>
              <el-button 
                type="danger" 
                size="small" 
                @click="removeZSetMember(index)"
                class="member-remove"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            

          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleAddKey">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'add-key'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const addKeyFormRef = ref(null)

const addKeyForm = reactive({
  name: '',
  type: 'string',
  ttl: -1,
  value: '',
  // Hash字段
  hashFields: [],
  // List元素
  listItems: [],
  // Set成员
  setMembers: [],
  // ZSet成员
  zsetMembers: []
})

const addKeyRules = {
  name: [
    { required: true, message: '请输入Key名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ],
  value: [
    { 
      required: true, 
      message: '请输入值', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (addKeyForm.type === 'string' && (!value || !value.trim())) {
          callback(new Error('请输入值'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 添加Hash字段
const addHashField = () => {
  addKeyForm.hashFields.push({ name: '', value: '' })
}

// 删除Hash字段
const removeHashField = (index) => {
  addKeyForm.hashFields.splice(index, 1)
}

// 处理Hash字段Tab键事件
const handleHashFieldTab = (event, index, fieldType) => {
  // 阻止默认的Tab键行为
  event.preventDefault()
  
  const currentField = addKeyForm.hashFields[index]
  
  if (fieldType === 'name') {
    // 在name字段按Tab
    if (currentField.name && currentField.name.trim()) {
      // 如果name有值，聚焦到当前字段的value输入框
      nextTick(() => {
        const valueInput = document.querySelector(`.hash-field-item:nth-child(${index + 1}) .field-value input`)
        if (valueInput) {
          valueInput.focus()
        }
      })
    }
  } else if (fieldType === 'value') {
    // 在value字段按Tab
    if (currentField.name && currentField.name.trim() && 
        currentField.value && currentField.value.trim()) {
      // 如果name和value都有值，添加新字段并聚焦到新字段的name输入框
      addKeyForm.hashFields.push({ name: '', value: '' })
      
      nextTick(() => {
        const newIndex = addKeyForm.hashFields.length - 1
        const newFieldNameInput = document.querySelector(`.hash-field-item:nth-child(${newIndex + 1}) .field-name input`)
        if (newFieldNameInput) {
          newFieldNameInput.focus()
        }
      })
    }
  }
}

// 添加List元素
const addListItem = () => {
  addKeyForm.listItems.push({ value: '' })
}

// 删除List元素
const removeListItem = (index) => {
  addKeyForm.listItems.splice(index, 1)
}

// 处理List元素Tab键事件
const handleListItemTab = (event, index) => {
  // 阻止默认的Tab键行为
  event.preventDefault()
  
  const currentItem = addKeyForm.listItems[index]
  
  // 如果当前元素有值，则添加新元素
  if (currentItem.value && currentItem.value.trim()) {
    addKeyForm.listItems.push({ value: '' })
    
    nextTick(() => {
      const newIndex = addKeyForm.listItems.length - 1
      const newItemInput = document.querySelector(`.list-item:nth-child(${newIndex + 1}) .item-value input`)
      if (newItemInput) {
        newItemInput.focus()
      }
    })
  }
}

// 添加Set成员
const addSetMember = () => {
  addKeyForm.setMembers.push({ value: '' })
}

// 删除Set成员
const removeSetMember = (index) => {
  addKeyForm.setMembers.splice(index, 1)
}

// 处理Set成员Tab键事件
const handleSetMemberTab = (event, index) => {
  // 阻止默认的Tab键行为
  event.preventDefault()
  
  const currentMember = addKeyForm.setMembers[index]
  
  // 如果当前成员有值，则添加新成员
  if (currentMember.value && currentMember.value.trim()) {
    addKeyForm.setMembers.push({ value: '' })
    
    nextTick(() => {
      const newIndex = addKeyForm.setMembers.length - 1
      const newMemberInput = document.querySelector(`.set-member:nth-child(${newIndex + 1}) .member-value input`)
      if (newMemberInput) {
        newMemberInput.focus()
      }
    })
  }
}

// 添加ZSet成员
const addZSetMember = () => {
  addKeyForm.zsetMembers.push({ value: '', score: 0 })
}

// 删除ZSet成员
const removeZSetMember = (index) => {
  addKeyForm.zsetMembers.splice(index, 1)
}

// 设置当前Unix时间戳
const setCurrentTimestamp = (index) => {
  const timestamp = Math.floor(Date.now() / 1000) // 获取当前Unix时间戳（秒）
  addKeyForm.zsetMembers[index].score = timestamp
}

// 处理ZSet成员Tab键事件
const handleZSetMemberTab = (event, index, fieldType) => {
  // 阻止默认的Tab键行为
  event.preventDefault()
  
  const currentMember = addKeyForm.zsetMembers[index]
  
  if (fieldType === 'value') {
    // 在value字段按Tab
    if (currentMember.value && currentMember.value.trim()) {
      // 如果value有值，聚焦到当前成员的score输入框
      nextTick(() => {
        const scoreInput = document.querySelector(`.zset-member:nth-child(${index + 1}) .member-score input`)
        if (scoreInput) {
          scoreInput.focus()
        }
      })
    }
  } else if (fieldType === 'score') {
    // 在score字段按Tab
    if (currentMember.value && currentMember.value.trim() && 
        currentMember.score !== undefined && currentMember.score !== null) {
      // 如果value和score都有值，添加新成员并聚焦到新成员的value输入框
      addKeyForm.zsetMembers.push({ value: '', score: 0 })
      
      nextTick(() => {
        const newIndex = addKeyForm.zsetMembers.length - 1
        const newMemberInput = document.querySelector(`.zset-member:nth-child(${newIndex + 1}) .member-value input`)
        if (newMemberInput) {
          newMemberInput.focus()
        }
      })
    }
  }
}

// 重置表单
const resetAddKeyForm = () => {
  addKeyForm.name = ''
  addKeyForm.type = 'string'
  addKeyForm.ttl = -1
  addKeyForm.value = ''
  addKeyForm.hashFields = []
  addKeyForm.listItems = []
  addKeyForm.setMembers = []
  addKeyForm.zsetMembers = []
  addKeyFormRef.value?.resetFields()
}

// 验证表单数据
const validateAddKeyForm = () => {
  // 验证基本字段
  if (!addKeyForm.name || !addKeyForm.name.trim()) {
    ElMessage.error('请输入Key名称')
    return false
  }
  
  if (!addKeyForm.type) {
    ElMessage.error('请选择数据类型')
    return false
  }
  
  // 根据数据类型验证具体内容
  switch (addKeyForm.type) {
    case 'string':
      if (!addKeyForm.value || !addKeyForm.value.trim()) {
        ElMessage.error('请输入值')
        return false
      }
      break
    case 'hash':
      // 验证字段名和值 - 过滤掉空值
      const validHashFields = addKeyForm.hashFields.filter(field => 
        field.name && field.name.trim() && field.value && field.value.trim()
      )
      if (validHashFields.length === 0) {
        ElMessage.error('Hash类型必须包含至少一个有效字段')
        return false
      }
      break
    case 'list':
      // 验证元素值 - 过滤掉空值
      const validListItems = addKeyForm.listItems.filter(item => item.value && item.value.trim())
      if (validListItems.length === 0) {
        ElMessage.error('List类型必须包含至少一个有效元素')
        return false
      }
      break
    case 'set':
      // 验证成员值 - 过滤掉空值
      const validSetMembers = addKeyForm.setMembers.filter(member => member.value && member.value.trim())
      if (validSetMembers.length === 0) {
        ElMessage.error('Set类型必须包含至少一个有效成员')
        return false
      }
      break
    case 'zset':
      // 验证成员值和分数 - 过滤掉空值
      const validZSetMembers = addKeyForm.zsetMembers.filter(member => 
        member.value && member.value.trim() && member.score !== undefined && member.score !== null
      )
      if (validZSetMembers.length === 0) {
        ElMessage.error('ZSet类型必须包含至少一个有效成员')
        return false
      }
      break
  }
  
  return true
}

const handleAddKey = async () => {
  if (!validateAddKeyForm()) {
    return
  }
  
  try {
    // 构建要发送的数据
    const keyData = {
      name: addKeyForm.name.trim(),
      type: addKeyForm.type,
      ttl: addKeyForm.ttl
    }
    
    // 根据数据类型添加相应的数据
    switch (addKeyForm.type) {
      case 'string':
        keyData.value = addKeyForm.value.trim()
        break
      case 'hash':
        keyData.fields = addKeyForm.hashFields
          .filter(field => field.name && field.name.trim() && field.value && field.value.trim())
          .map(field => ({
            name: field.name.trim(),
            value: field.value.trim()
          }))
        break
      case 'list':
        keyData.items = addKeyForm.listItems
          .filter(item => item.value && item.value.trim())
          .map(item => item.value.trim())
        break
      case 'set':
        keyData.members = addKeyForm.setMembers
          .filter(member => member.value && member.value.trim())
          .map(member => member.value.trim())
        break
      case 'zset':
        keyData.members = addKeyForm.zsetMembers
          .filter(member => member.value && member.value.trim() && member.score !== undefined && member.score !== null)
          .map(member => ({
            value: member.value.trim(),
            score: member.score
          }))
        break
    }
    
    console.log('添加键:', keyData)
    dialogVisible.value = false
    emit('add-key', keyData)
    
    // 重置表单
    resetAddKeyForm()
    
  } catch (error) {
    console.error('添加键失败:', error)
    ElMessage.error('添加键失败')
  }
}

const handleCancel = () => {
  dialogVisible.value = false
  resetAddKeyForm()
}

// 监听数据类型变化，重置相应的表单数据
watch(() => addKeyForm.type, (newType) => {
  // 清空其他类型的数据
  addKeyForm.value = ''
  addKeyForm.hashFields = []
  addKeyForm.listItems = []
  addKeyForm.setMembers = []
  addKeyForm.zsetMembers = []
  
  // 当选择Hash类型时，自动添加第一个字段
  if (newType === 'hash') {
    addKeyForm.hashFields.push({ name: '', value: '' })
  }
  
  // 当选择List类型时，自动添加第一个元素
  if (newType === 'list') {
    addKeyForm.listItems.push({ value: '' })
  }
  
  // 当选择Set类型时，自动添加第一个成员
  if (newType === 'set') {
    addKeyForm.setMembers.push({ value: '' })
  }
  
  // 当选择ZSet类型时，自动添加第一个成员
  if (newType === 'zset') {
    addKeyForm.zsetMembers.push({ value: '', score: 0 })
  }
})
</script>

<style scoped>
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

.score-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.member-score {
  width: 120px;
}

.timestamp-btn {
  flex-shrink: 0;
  padding: 0 8px;
  font-size: 12px;
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
  color: #ffffff !important;
}
</style> 