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
        <el-button type="success" @click="showJoinDialog = true">
          <el-icon><Share /></el-icon>
          加入分享
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
                <el-tag 
                  v-if="!row.isOwner" 
                  type="info" 
                  size="small"
                >
                  来自: {{ row.owner }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="host" label="主机" min-width="120" />
          <el-table-column prop="port" label="端口" width="80" />
          <el-table-column prop="database" label="数据库" width="80" />
          <el-table-column label="操作" width="350" fixed="right">
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
                type="success" 
                size="small" 
                @click="reconnectConnection(row)"
                :disabled="row.status === 'connected'"
              >
                重连
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click="closeConnection(row)"
                :disabled="row.status !== 'connected'"
              >
                关闭
              </el-button>
              <el-button 
                v-if="row.isOwner"
                type="warning" 
                size="small" 
                @click="editConnection(row)"
              >
                编辑
              </el-button>
              <el-button 
                v-if="row.isOwner"
                type="primary" 
                size="small" 
                @click="shareConnection(row)"
              >
                分享
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
          <el-input 
            v-model="form.name" 
            placeholder="请输入连接名称"
            @keyup.enter="saveConnection"
          />
        </el-form-item>
        <el-form-item label="主机地址" prop="host">
          <el-input 
            v-model="form.host" 
            placeholder="请输入主机地址"
            @keyup.enter="saveConnection"
          />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number 
            v-model="form.port" 
            :min="1" 
            :max="65535"
            @keyup.enter="saveConnection"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码（可选）"
            show-password
            @keyup.enter="saveConnection"
          />
        </el-form-item>
        <el-form-item label="数据库" prop="database">
          <el-input-number 
            v-model="form.database" 
            :min="0" 
            :max="15"
            @keyup.enter="saveConnection"
          />
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

    <!-- 分享连接对话框 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享连接"
      width="400px"
      append-to-body
    >
      <div v-if="shareInfo" class="share-info">
        <p><strong>连接名称:</strong> {{ shareInfo.connection.name }}</p>
        <p><strong>分享码:</strong> <span class="join-code">{{ shareInfo.joinCode }}</span></p>
        <p class="share-tip">将此分享码发送给其他用户，他们可以使用"加入分享"功能来添加此连接。</p>
      </div>
      <template #footer>
        <el-button @click="showShareDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyJoinCode">复制分享码</el-button>
      </template>
    </el-dialog>

    <!-- 加入分享连接对话框 -->
    <el-dialog
      v-model="showJoinDialog"
      title="加入分享连接"
      width="400px"
      append-to-body
    >
      <el-form
        ref="joinFormRef"
        :model="joinForm"
        :rules="joinRules"
        label-width="100px"
      >
        <el-form-item label="分享码" prop="joinCode">
          <el-input 
            v-model="joinForm.joinCode" 
            placeholder="请输入分享码"
            style="text-transform: uppercase;"
            @keyup.enter="joinSharedConnection"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">取消</el-button>
        <el-button type="primary" @click="joinSharedConnection" :loading="joining">加入</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh, Share } from '@element-plus/icons-vue'
import { useConnectionStore } from '../stores/connection'
import { operationLogger } from '../utils/operationLogger'

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
const showShareDialog = ref(false)
const showJoinDialog = ref(false)
const shareInfo = ref(null)
const joining = ref(false)

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

const joinForm = reactive({
  joinCode: ''
})

const joinRules = {
  joinCode: [
    { required: true, message: '请输入分享码', trigger: 'blur' },
    { min: 8, max: 8, message: '分享码长度为8位', trigger: 'blur' }
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

const shareConnection = async (connection) => {
  try {
    const response = await connectionStore.shareConnection(connection.id)
    if (response.success) {
      shareInfo.value = response.data
      showShareDialog.value = true
      ElMessage.success('连接分享成功')
      // 记录操作日志
      operationLogger.logConnectionShared(connection)
    }
  } catch (error) {
    console.error('分享连接失败:', error)
    ElMessage.error('分享连接失败')
  }
}

const copyJoinCode = async () => {
  if (shareInfo.value?.joinCode) {
    try {
      await navigator.clipboard.writeText(shareInfo.value.joinCode)
      ElMessage.success('分享码已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('复制失败')
    }
  }
}

const joinSharedConnection = async () => {
  const joinFormRef = ref()
  
  try {
    await joinFormRef.value.validate()
    joining.value = true
    
    const response = await connectionStore.joinSharedConnection(joinForm.joinCode.toUpperCase())
    if (response.success) {
      ElMessage.success('成功加入分享的连接')
      showJoinDialog.value = false
      joinForm.joinCode = ''
      await refreshConnections()
      // 记录操作日志
      operationLogger.logConnectionJoined(response.data.connection)
    }
  } catch (error) {
    console.error('加入分享连接失败:', error)
    ElMessage.error(error.response?.data?.message || '加入分享连接失败')
  } finally {
    joining.value = false
  }
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

const reconnectConnection = async (connection) => {
  try {
    const success = await connectionStore.reconnect(connection.id)
    if (success) {
      ElMessage.success(`重新连接成功: ${connection.name}`)
      // 记录操作日志
      operationLogger.logConnectionReconnected(connection)
      // 刷新连接列表
      await refreshConnections()
    }
  } catch (error) {
    console.error('重新连接失败:', error)
    // 记录错误日志
    operationLogger.logError('重新连接', error, connection)
  }
}

const closeConnection = async (connection) => {
  try {
    await ElMessageBox.confirm(
      `确定要关闭连接 "${connection.name}" 吗？`,
      '确认关闭',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await connectionStore.closeConnection(connection.id)
    if (success) {
      ElMessage.success(`连接已关闭: ${connection.name}`)
      // 记录操作日志
      operationLogger.logConnectionClosed(connection)
      // 刷新连接列表
      await refreshConnections()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('关闭连接失败:', error)
      ElMessage.error('关闭连接失败')
    }
  }
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
        // 记录操作日志
        operationLogger.logConnectionUpdated(form)
        showEditDialog.value = false
      }
    } else {
      // 添加连接
      const success = await connectionStore.createConnection(form)
      if (success) {
        ElMessage.success('连接添加成功')
        // 记录操作日志
        operationLogger.logConnectionCreated(form)
        showEditDialog.value = false
      }
    }
  } catch (error) {
    console.error('保存连接失败:', error)
    // 记录错误日志
    operationLogger.logError('保存连接', error)
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
  flex-wrap: wrap;
}

.connection-list {
  max-height: 400px;
  overflow-y: auto;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-name span {
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.share-info {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.share-info p {
  margin: 8px 0;
}

.join-code {
  font-family: monospace;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  background-color: #ecf5ff;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
}

.share-tip {
  color: #909399;
  font-size: 14px;
  margin-top: 16px;
}
</style> 