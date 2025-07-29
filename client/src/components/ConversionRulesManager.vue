<template>
  <el-dialog
    v-model="dialogVisible"
    title="转换规则管理"
    width="900px"
    :close-on-click-modal="false"
  >
    <div class="conversion-rules-manager">
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="primary" @click="addRule">
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
        <el-button type="success" @click="importRules">
          <el-icon><Upload /></el-icon>
          导入规则
        </el-button>
        <el-button type="warning" @click="exportRules">
          <el-icon><Download /></el-icon>
          导出规则
        </el-button>
      </div>

      <!-- 规则列表 -->
      <div class="rules-list">
        <el-table :data="rules" stripe v-loading="loading">
          <el-table-column label="规则名称" prop="name" min-width="150" />
          <el-table-column label="数据类型" prop="dataType" width="100">
            <template #default="{ row }">
              <el-tag :type="getDataTypeTagType(row.dataType)" size="small">
                {{ getDataTypeLabel(row.dataType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="匹配模式" prop="pattern" min-width="150">
            <template #default="{ row }">
              <span class="pattern-text">{{ row.pattern }}</span>
            </template>
          </el-table-column>
          <el-table-column label="字段名" prop="fieldPattern" width="100">
            <template #default="{ row }">
              <span v-if="row.dataType === 'hash'">{{ row.fieldPattern }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="转换类型" prop="convertType" width="120">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ getConvertTypeLabel(row.convertType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" @change="toggleRule(row)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="editRule(row)">
                <el-icon><Edit type="primary"/></el-icon>
              </el-button>
              <el-button size="small" type="danger" @click="deleteRule(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加/编辑规则对话框 -->
    <el-dialog
      v-model="showRuleDialog"
      :title="isEditing ? '编辑规则' : '添加规则'"
      width="600px"
      append-to-body
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleFormRef" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        
        <el-form-item label="数据类型" prop="dataType">
          <el-select v-model="ruleForm.dataType" placeholder="选择数据类型" @change="handleDataTypeChange">
            <el-option label="String" value="string" />
            <el-option label="Hash" value="hash" />
            <el-option label="Set" value="set" />
            <el-option label="List" value="list" />
            <el-option label="ZSet" value="zset" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="匹配模式" prop="pattern">
          <el-input 
            v-model="ruleForm.pattern" 
            :placeholder="getPatternPlaceholder(ruleForm.dataType)"
          />
          <div class="pattern-help">
            <small>使用 {*} 作为通配符，例如：hash:{*}:limit</small>
          </div>
        </el-form-item>
        
        <el-form-item 
          label="字段名" 
          prop="fieldPattern" 
          v-if="ruleForm.dataType === 'hash'"
        >
          <el-input 
            v-model="ruleForm.fieldPattern" 
            placeholder="例如：time, status"
          />
          <div class="pattern-help">
            <small>支持通配符 *，例如：*_time</small>
          </div>
        </el-form-item>
        
        <el-form-item label="转换类型" prop="convertType">
          <el-select v-model="ruleForm.convertType" placeholder="选择转换类型">
            <el-option label="Unix秒转时间" value="unix_timestamp_seconds" />
            <el-option label="Unix毫秒转时间" value="unix_timestamp_milliseconds" />
            <el-option label="大数字格式化" value="large_number" />
            <el-option label="十六进制转文本" value="hex_to_text" />
            <el-option label="Base64解码" value="base64_decode" />
            <el-option label="JSON格式化" value="json_format" />
            <el-option label="状态映射" value="status_mapping" />
            <el-option label="自定义映射" value="custom_mapping" />
          </el-select>
        </el-form-item>
        
        <el-form-item 
          label="映射配置" 
          prop="mappingConfig" 
          v-if="ruleForm.convertType === 'custom_mapping'"
        >
          <el-input
            v-model="ruleForm.mappingConfig"
            type="textarea"
            :rows="4"
            placeholder="输入JSON格式的映射配置，例如：{'1':'在线','0':'离线'}"
          />
        </el-form-item>
        
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="ruleForm.priority" :min="1" :max="100" />
          <div class="pattern-help">
            <small>数字越小优先级越高</small>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="showRuleDialog = false">取消</el-button>
          <el-button type="primary" @click="saveRule" :loading="saving">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Upload, Download, Setting } from '@element-plus/icons-vue'
import { conversionEngine } from '../utils/conversionEngine'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'rules-changed'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const saving = ref(false)
const showRuleDialog = ref(false)
const isEditing = ref(false)
const ruleFormRef = ref()

// 规则列表
const rules = ref([])

// 从转换引擎加载规则
const loadRules = () => {
  rules.value = [...conversionEngine.rules]
}

// 初始化时加载规则
loadRules()

// 表单数据
const ruleForm = reactive({
  id: '',
  name: '',
  dataType: 'string',
  pattern: '',
  fieldPattern: '',
  convertType: 'unix_timestamp_seconds',
  priority: 10,
  enabled: true,
  mappingConfig: ''
})

// 表单验证规则
const ruleFormRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' }
  ],
  dataType: [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ],
  pattern: [
    { required: true, message: '请输入匹配模式', trigger: 'blur' }
  ],
  convertType: [
    { required: true, message: '请选择转换类型', trigger: 'change' }
  ]
}

// 方法
const getDataTypeLabel = (dataType) => {
  const labels = {
    string: 'String',
    hash: 'Hash',
    set: 'Set',
    list: 'List',
    zset: 'ZSet'
  }
  return labels[dataType] || dataType
}

const getDataTypeTagType = (dataType) => {
  const types = {
    string: 'primary',
    hash: 'success',
    set: 'warning',
    list: 'info',
    zset: 'danger'
  }
  return types[dataType] || 'info'
}

const getConvertTypeLabel = (convertType) => {
  const labels = {
    unix_timestamp_seconds: 'Unix秒转时间',
    unix_timestamp_milliseconds: 'Unix毫秒转时间',
    large_number: '大数字格式化',
    hex_to_text: '十六进制转文本',
    base64_decode: 'Base64解码',
    json_format: 'JSON格式化',
    status_mapping: '状态映射',
    custom_mapping: '自定义映射'
  }
  return labels[convertType] || convertType
}

const getPatternPlaceholder = (dataType) => {
  const placeholders = {
    string: '例如：time:{*}, user:{*}:name',
    hash: '例如：hash:{*}:limit, user:{*}:info',
    set: '例如：status:{*}, tags:{*}',
    list: '例如：queue:{*}, logs:{*}',
    zset: '例如：score:{*}, rank:{*}'
  }
  return placeholders[dataType] || '请输入匹配模式'
}

const handleDataTypeChange = () => {
  // 清空字段模式（如果不是Hash类型）
  if (ruleForm.dataType !== 'hash') {
    ruleForm.fieldPattern = ''
  }
}

const addRule = () => {
  isEditing.value = false
  resetForm()
  showRuleDialog.value = true
}

const editRule = (rule) => {
  isEditing.value = true
  Object.assign(ruleForm, rule)
  showRuleDialog.value = true
}

const deleteRule = async (rule) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除规则 "${rule.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const index = rules.value.findIndex(r => r.id === rule.id)
    if (index > -1) {
      rules.value.splice(index, 1)
      ElMessage.success('规则删除成功')
      // 更新转换引擎中的规则
      conversionEngine.updateRules(rules.value)
      emit('rules-changed', rules.value)
    }
  } catch (error) {
    // 用户取消删除
  }
}

const toggleRule = (rule) => {
  ElMessage.success(`规则 "${rule.name}" ${rule.enabled ? '已启用' : '已禁用'}`)
  // 更新转换引擎中的规则
  conversionEngine.updateRules(rules.value)
  emit('rules-changed', rules.value)
}

const saveRule = async () => {
  if (!ruleFormRef.value) return
  
  await ruleFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        if (isEditing.value) {
          // 编辑规则
          const index = rules.value.findIndex(r => r.id === ruleForm.id)
          if (index > -1) {
            rules.value[index] = { ...ruleForm }
          }
          ElMessage.success('规则更新成功')
        } else {
          // 添加规则
          const newRule = {
            ...ruleForm,
            id: Date.now().toString()
          }
          rules.value.push(newRule)
          ElMessage.success('规则添加成功')
        }
        
        showRuleDialog.value = false
        // 更新转换引擎中的规则
        conversionEngine.updateRules(rules.value)
        emit('rules-changed', rules.value)
      } finally {
        saving.value = false
      }
    }
  })
}

const resetForm = () => {
  Object.assign(ruleForm, {
    id: '',
    name: '',
    dataType: 'string',
    pattern: '',
    fieldPattern: '',
    convertType: 'unix_timestamp_seconds',
    priority: 10,
    enabled: true,
    mappingConfig: ''
  })
  ruleFormRef.value?.resetFields()
}

const importRules = () => {
  // TODO: 实现规则导入功能
  ElMessage.info('规则导入功能开发中')
}

const exportRules = () => {
  // TODO: 实现规则导出功能
  ElMessage.info('规则导出功能开发中')
}

// 监听对话框打开
watch(dialogVisible, (visible) => {
  if (visible) {
    // 对话框打开时的初始化逻辑
  }
})
</script>

<style scoped>
.conversion-rules-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 8px;
}

.rules-list {
  max-height: 500px;
  overflow-y: auto;
}

.pattern-text {
  font-family: monospace;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.pattern-help {
  margin-top: 4px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 输入框样式已由全局样式处理 */
</style> 