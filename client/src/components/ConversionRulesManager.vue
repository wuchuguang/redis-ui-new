<template>
  <el-dialog
    v-model="visible"
    title="转换规则管理"
    width="800px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="conversion-rules-manager">
      <!-- 规则列表 -->
      <div class="rules-header">
        <h3>转换规则列表</h3>
        <el-button type="primary" @click="addRule" size="small">
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
      </div>

      <div class="rules-list">
        <el-table :data="rules" stripe>
          <el-table-column prop="name" label="规则名称" width="150" />
          <el-table-column prop="pattern" label="键模式" width="200" />
          <el-table-column prop="dataType" label="数据类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getDataTypeTagType(row.dataType)">
                {{ row.dataType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="convertType" label="转换类型" width="150" />
          <el-table-column prop="priority" label="优先级" width="80" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-switch
                v-model="row.enabled"
                @change="updateRule(row)"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row, $index }">
              <el-button type="primary" size="small" @click="editRule(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" size="small" @click="deleteRule($index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 规则编辑对话框 -->
      <el-dialog
        v-model="showRuleDialog"
        :title="editingRule.id ? '编辑规则' : '添加规则'"
        width="600px"
        :close-on-click-modal="false"
      >
        <el-form
          ref="ruleFormRef"
          :model="editingRule"
          :rules="ruleRules"
          label-width="120px"
        >
          <el-form-item label="规则名称" prop="name">
            <el-input v-model="editingRule.name" placeholder="请输入规则名称" />
          </el-form-item>
          
          <el-form-item label="键模式" prop="pattern">
            <el-input 
              v-model="editingRule.pattern" 
              placeholder="例如: user:* 或 {*}user"
            />
            <div class="pattern-help">
              支持通配符: * 匹配任意字符, {*} 匹配任意非冒号字符
            </div>
          </el-form-item>
          
          <el-form-item label="数据类型" prop="dataType">
            <el-select v-model="editingRule.dataType" placeholder="选择数据类型">
              <el-option label="String" value="string" />
              <el-option label="Hash" value="hash" />
              <el-option label="List" value="list" />
              <el-option label="Set" value="set" />
              <el-option label="ZSet" value="zset" />
            </el-select>
          </el-form-item>
          
          <el-form-item 
            v-if="editingRule.dataType === 'hash'" 
            label="字段模式" 
            prop="fieldPattern"
          >
            <el-input 
              v-model="editingRule.fieldPattern" 
              placeholder="例如: name 或 user*"
            />
            <div class="pattern-help">
              留空表示匹配所有字段，支持通配符 *
            </div>
          </el-form-item>
          
          <el-form-item label="转换类型" prop="convertType">
            <el-select v-model="editingRule.convertType" placeholder="选择转换类型">
              <el-option label="Unix时间戳(秒)" value="unix_timestamp_seconds" />
              <el-option label="Unix时间戳(毫秒)" value="unix_timestamp_milliseconds" />
              <el-option label="大数字格式化" value="large_number" />
              <el-option label="十六进制转文本" value="hex_to_text" />
              <el-option label="Base64解码" value="base64_decode" />
              <el-option label="URL解码" value="url_decode" />
              <el-option label="JSON格式化" value="json_format" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="优先级" prop="priority">
            <el-input-number 
              v-model="editingRule.priority" 
              :min="1" 
              :max="100"
              placeholder="数字越小优先级越高"
            />
          </el-form-item>
          
          <el-form-item label="启用状态">
            <el-switch v-model="editingRule.enabled" />
          </el-form-item>
        </el-form>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showRuleDialog = false">取消</el-button>
            <el-button type="primary" @click="saveRule" :loading="saving">
              保存
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { conversionEngine } from '../utils/conversionEngine'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  connectionId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const rules = ref([])
const showRuleDialog = ref(false)
const saving = ref(false)
const ruleFormRef = ref(null)

// 编辑中的规则
const editingRule = reactive({
  id: '',
  name: '',
  pattern: '',
  dataType: 'string',
  fieldPattern: '',
  convertType: 'unix_timestamp_seconds',
  priority: 10,
  enabled: true
})

// 表单验证规则
const ruleRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' }
  ],
  pattern: [
    { required: true, message: '请输入键模式', trigger: 'blur' }
  ],
  dataType: [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ],
  convertType: [
    { required: true, message: '请选择转换类型', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请输入优先级', trigger: 'blur' }
  ]
}

// 监听连接ID变化，加载规则
watch(() => props.connectionId, async (newConnectionId) => {
  if (newConnectionId) {
    conversionEngine.setConnectionId(newConnectionId)
    await loadRules()
  }
}, { immediate: true })

// 加载规则
const loadRules = async () => {
  await conversionEngine.loadRules()
  rules.value = [...conversionEngine.rules]
}

// 获取数据类型标签类型
const getDataTypeTagType = (dataType) => {
  const types = {
    string: 'success',
    hash: 'warning',
    list: 'info',
    set: 'danger',
    zset: 'primary'
  }
  return types[dataType] || 'info'
}

// 添加规则
const addRule = () => {
  Object.assign(editingRule, {
    id: '',
    name: '',
    pattern: '',
    dataType: 'string',
    fieldPattern: '',
    convertType: 'unix_timestamp_seconds',
    priority: 10,
    enabled: true
  })
  showRuleDialog.value = true
}

// 编辑规则
const editRule = (rule) => {
  Object.assign(editingRule, { ...rule })
  showRuleDialog.value = true
}

// 保存规则
const saveRule = async () => {
  if (!ruleFormRef.value) return
  
  try {
    await ruleFormRef.value.validate()
    saving.value = true
    
    if (editingRule.id) {
      // 编辑现有规则
      const { id, ...updateData } = editingRule
      await conversionEngine.updateRule(id, updateData)
      ElMessage.success('规则更新成功')
    } else {
      // 添加新规则
      const { id, ...newRule } = editingRule
      await conversionEngine.addRule(newRule)
      ElMessage.success('规则添加成功')
    }
    
    // 重新加载规则列表
    await loadRules()
    showRuleDialog.value = false
  } catch (error) {
    console.error('保存规则失败:', error)
    ElMessage.error('保存规则失败')
  } finally {
    saving.value = false
  }
}

// 更新规则状态
const updateRule = async (rule) => {
  try {
    await conversionEngine.toggleRule(rule.id)
    ElMessage.success(`规则${rule.enabled ? '禁用' : '启用'}成功`)
    // 重新加载规则列表
    await loadRules()
  } catch (error) {
    console.error('更新规则失败:', error)
    ElMessage.error('更新规则失败')
    // 恢复原状态
    rule.enabled = !rule.enabled
  }
}

// 删除规则
const deleteRule = async (index) => {
  try {
    const rule = rules.value[index]
    await conversionEngine.deleteRule(rule.id)
    ElMessage.success('规则删除成功')
    // 重新加载规则列表
    await loadRules()
  } catch (error) {
    console.error('删除规则失败:', error)
    ElMessage.error('删除规则失败')
  }
}
</script>

<style scoped>
.conversion-rules-manager {
  padding: 20px;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.rules-header h3 {
  margin: 0;
  color: #303133;
}

.rules-list {
  margin-bottom: 20px;
}

.pattern-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 