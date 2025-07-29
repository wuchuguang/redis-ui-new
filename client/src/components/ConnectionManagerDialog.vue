<template>
  <el-dialog
    v-model="dialogVisible"
    title="连接管理"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="connection-manager">
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="primary" @click="addConnection">
          <el-icon><Plus /></el-icon>
          添加连接
        </el-button>
        <el-button type="danger" @click="deleteSelectedConnections" :disabled="!hasSelectedConnections">
          <el-icon><Delete /></el-icon>
          删除选中
        </el-button>
        <el-button type="primary" @click="refreshConnections">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="info" @click="refreshConnectionStatus">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
      </div>

      <!-- 连接列表 -->
      <div class="connection-list">
        <el-table
          :data="connections"
          @selection-change="handleSelectionChange"
          v-loading="loading"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="连接名称" min-width="150">
            <template #default="{ row }">
              <div class="connection-name">
                <span>{{ row.name }}</span>
                <el-tag 
                  :type="row.status === 'connected' ? 'success' : 'danger'" 
                  size="small"
                >
                  {{ row.status === 'connected' ? '已连接' : '未连接' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="host" label="主机" min-width="120" />
          <el-table-column prop="port" label="端口" width="80" />
          <el-table-column prop="database" label="数据库" width="80" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                size="small" 
                @click="selectConnection(row)"
                :disabled="row.status !== 'connected'"
              >
                选择
              </el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="editConnection(row)"
              >
                编辑
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteConnection(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 添加/编辑连接对话框 -->
    <el-dialog
      v-model="showEditDialog"
      :title="isEditing ? '编辑连接' : '添加连接'"
      width="500px"
      append-to-body
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入连接名称" />
        </el-form-item>
        <el-form-item label="主机地址" prop="host">
          <el-input v-model="form.host" placeholder="请输入主机地址" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="form.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码（可选）"
            show-password
          />
        </el-form-item>
        <el-form-item label="数据库" prop="database">
          <el-input-number v-model="form.database" :min="0" :max="15" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="saveConnection" :loading="saving">
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
import { Plus, Delete, Refresh } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'connection-selected', 'connection-deleted', 'connection-updated'])

const connectionStore = useConnectionStore()

// 响应式数据
const loading = ref(false)
const showEditDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const selectedConnections = ref([])

const form = reactive({
  id: '',
  name: '',
  host: '',
  port: 6379,
  password: '',
  database: 0
})

const rules = {
  name: [
    { required: true, message: '请输入连接名称', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口', trigger: 'blur' }
  ]
}

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const connections = computed(() => connectionStore.connections)

const hasSelectedConnections = computed(() => selectedConnections.value.length > 0)

// 方法
const refreshConnections = async () => {
  loading.value = true
  try {
    await connectionStore.fetchConnections()
  } catch (error) {
    console.error('刷新连接列表失败:', error)
  } finally {
    loading.value = false
  }
}

const refreshConnectionStatus = async () => {
  try {
    await connectionStore.refreshConnectionStatus()
    ElMessage.success('连接状态已刷新')
  } catch (error) {
    console.error('刷新连接状态失败:', error)
    ElMessage.error('刷新连接状态失败')
  }
}

const addConnection = () => {
  isEditing.value = false
  resetForm()
  showEditDialog.value = true
}

const editConnection = (connection) => {
  isEditing.value = true
  Object.assign(form, connection)
  showEditDialog.value = true
}

const deleteConnection = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除连接 "${connection.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await connectionStore.deleteConnection(connection.id)
    if (success) {
      emit('connection-deleted', connection.id)
      ElMessage.success('连接删除成功')
    }
  } catch (error) {
    // 用户取消删除
  }
}

const deleteSelectedConnections = async () => {
  if (selectedConnections.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedConnections.value.length} 个连接吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    for (const connection of selectedConnections.value) {
      await connectionStore.deleteConnection(connection.id)
      emit('connection-deleted', connection.id)
    }
    
    ElMessage.success('连接删除成功')
    selectedConnections.value = []
  } catch (error) {
    // 用户取消删除
  }
}

const selectConnection = (connection) => {
  emit('connection-selected', connection)
  dialogVisible.value = false
  ElMessage.success(`已选择连接: ${connection.name}`)
}

const saveConnection = async () => {
  saving.value = true
  try {
    if (isEditing.value) {
      // 编辑连接
      const success = await connectionStore.updateConnection(form)
      if (success) {
        emit('connection-updated', form)
        ElMessage.success('连接更新成功')
        showEditDialog.value = false
      }
    } else {
      // 添加连接
      const success = await connectionStore.createConnection(form)
      if (success) {
        ElMessage.success('连接添加成功')
        showEditDialog.value = false
      }
    }
  } catch (error) {
    console.error('保存连接失败:', error)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    id: '',
    name: '',
    host: '',
    port: 6379,
    password: '',
    database: 0
  })
}

const handleSelectionChange = (selection) => {
  selectedConnections.value = selection
}

// 监听对话框打开
watch(dialogVisible, (visible) => {
  if (visible) {
    refreshConnections()
  }
})
</script>

<style scoped>
.connection-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 8px;
}

.connection-list {
  max-height: 400px;
  overflow-y: auto;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}


</style> 