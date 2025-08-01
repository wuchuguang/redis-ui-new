<template>
  <el-dialog
    v-model="dialogVisible"
    title="权限管理"
    width="800px"
    :close-on-click-modal="false"
  >
    <div v-if="connection" class="permission-manager">
      <!-- 连接信息 -->
      <div class="connection-info">
        <h4>连接: {{ connection.redis.name }}</h4>
        <p>分享码: <span class="share-code">{{ connection.shareCode }}</span></p>
      </div>

      <!-- 参与者列表 -->
      <div class="participants-section">
        <div class="section-header">
          <h5>参与者列表</h5>
          <el-button type="primary" size="small" @click="showAddParticipant = true">
            <el-icon><Plus /></el-icon>
            添加参与者
          </el-button>
        </div>
        
        <el-table :data="participants" empty-text="暂无参与者">
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="joinedAt" label="加入时间" />
          <el-table-column label="权限" width="200">
            <template #default="{ row }">
              <el-select 
                v-model="row.permissions" 
                size="small"
                @change="updatePermissions(row)"
              >
                <el-option label="只读" value="readonly" />
                <el-option label="读写" value="readwrite" />
                <el-option label="管理员" value="admin" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button 
                type="danger" 
                size="small"
                @click="removeParticipant(row)"
              >
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 权限说明 -->
      <div class="permissions-help">
        <h5>权限说明</h5>
        <ul>
          <li><strong>只读:</strong> 只能查看数据，不能修改</li>
          <li><strong>读写:</strong> 可以查看和修改数据</li>
          <li><strong>管理员:</strong> 可以管理连接和权限</li>
        </ul>
      </div>
    </div>

    <!-- 添加参与者对话框 -->
    <el-dialog
      v-model="showAddParticipant"
      title="添加参与者"
      width="400px"
      append-to-body
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="addForm.username" 
            placeholder="请输入用户名"
            @keyup.enter="addParticipant"
          />
        </el-form-item>
        <el-form-item label="权限" prop="permissions">
          <el-select v-model="addForm.permissions" placeholder="选择权限">
            <el-option label="只读" value="readonly" />
            <el-option label="读写" value="readwrite" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddParticipant = false">取消</el-button>
        <el-button type="primary" @click="addParticipant" :loading="adding">添加</el-button>
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useConnectionStore } from '../../stores/connection'
import { operationLogger } from '../../utils/operationLogger'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'permissions-updated'])

const connectionStore = useConnectionStore()

// 响应式数据
const showAddParticipant = ref(false)
const adding = ref(false)

const addForm = reactive({
  username: '',
  permissions: 'readonly'
})

const addRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  permissions: [
    { required: true, message: '请选择权限', trigger: 'change' }
  ]
}

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const participants = computed(() => {
  if (!props.connection) return []
  
  // 过滤掉连接的所有者，只显示真正的参与者
  const realParticipants = (props.connection.participants || []).filter(username => 
    username !== props.connection.owner
  )
  
  // 这里应该从后端获取详细的参与者信息
  // 暂时使用简单的数据结构
  return realParticipants.map(username => ({
    username,
    joinedAt: new Date().toLocaleString(),
    permissions: 'readonly'
  }))
})

// 方法
const addParticipant = async () => {
  const addFormRef = ref()
  
  try {
    await addFormRef.value.validate()
    adding.value = true
    
    const success = await connectionStore.addParticipant(props.connection.id, addForm.username, addForm.permissions)
    if (success) {
      ElMessage.success(`已添加参与者: ${addForm.username}`)
      showAddParticipant.value = false
      addForm.username = ''
      addForm.permissions = 'readonly'
      emit('permissions-updated')
    }
  } catch (error) {
    console.error('添加参与者失败:', error)
    ElMessage.error('添加参与者失败')
  } finally {
    adding.value = false
  }
}

const removeParticipant = async (participant) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除参与者 "${participant.username}" 吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await connectionStore.removeParticipant(props.connection.id, participant.username)
    if (success) {
      ElMessage.success(`已移除参与者: ${participant.username}`)
      emit('permissions-updated')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除参与者失败:', error)
      ElMessage.error('移除参与者失败')
    }
  }
}

const updatePermissions = async (participant) => {
  try {
    const success = await connectionStore.updateParticipantPermissions(
      props.connection.id, 
      participant.username, 
      participant.permissions
    )
    if (success) {
      ElMessage.success(`已更新 ${participant.username} 的权限`)
      emit('permissions-updated')
    }
  } catch (error) {
    console.error('更新权限失败:', error)
    ElMessage.error('更新权限失败')
  }
}
</script>

<style scoped>
.permission-manager {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.connection-info {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.connection-info h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.connection-info p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.share-code {
  font-family: monospace;
  font-weight: bold;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  padding: 2px 6px;
  border-radius: 4px;
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h5 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.permissions-help {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.permissions-help h5 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

.permissions-help ul {
  margin: 0;
  padding-left: 20px;
  color: var(--el-text-color-secondary);
}

.permissions-help li {
  margin-bottom: 4px;
}
</style> 