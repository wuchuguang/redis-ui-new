<template>
  <el-dialog
    v-model="dialogVisible"
    title="分享连接"
    width="500px"
    :close-on-click-modal="false"
  >
    <div v-if="connection" class="share-info">
      <div class="connection-details">
        <h4>{{ connection.redis.name }}</h4>
        <p>{{ connection.redis.host }}:{{ connection.redis.port }}</p>
      </div>
      
      <div class="share-code-section">
        <h5>分享码</h5>
        <div class="share-code-display">
          <span class="share-code">{{ shareCode || '生成中...' }}</span>
          <el-button 
            type="primary" 
            size="small"
            @click="copyShareCode"
            :disabled="!shareCode"
          >
            复制
          </el-button>
        </div>
        <p class="share-tip">将此分享码发送给其他用户，他们可以使用"加入分享"功能来添加此连接。</p>
      </div>
      
      <div class="share-options">
        <h5>分享选项</h5>
        <el-form :model="shareOptions" label-width="100px">
          <el-form-item label="默认权限">
            <el-select v-model="shareOptions.defaultPermission">
              <el-option label="只读" value="readonly" />
              <el-option label="读写" value="readwrite" />
              <el-option label="管理员" value="admin" />
            </el-select>
          </el-form-item>
          <el-form-item label="过期时间">
            <el-select v-model="shareOptions.expireTime">
              <el-option label="永不过期" value="never" />
              <el-option label="1天" value="1d" />
              <el-option label="7天" value="7d" />
              <el-option label="30天" value="30d" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="regenerateShareCode" :loading="generating">
          重新生成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
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
const emit = defineEmits(['update:modelValue', 'share-created'])

const connectionStore = useConnectionStore()

// 响应式数据
const shareCode = ref('')
const generating = ref(false)

const shareOptions = reactive({
  defaultPermission: 'readonly',
  expireTime: 'never'
})

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 监听对话框打开，自动生成分享码
watch(dialogVisible, async (visible) => {
  if (visible && props.connection) {
    await generateShareCode()
  }
})

// 方法
const generateShareCode = async () => {
  if (!props.connection) return
  
  try {
    generating.value = true
    const response = await connectionStore.shareConnection(props.connection.id, shareOptions)
    if (response.success) {
      shareCode.value = response.data.joinCode
      ElMessage.success('分享码生成成功')
      emit('share-created', response.data)
    }
  } catch (error) {
    console.error('生成分享码失败:', error)
    ElMessage.error('生成分享码失败')
  } finally {
    generating.value = false
  }
}

const regenerateShareCode = async () => {
  await generateShareCode()
}

const copyShareCode = async () => {
  if (!shareCode.value) return
  
  try {
    await navigator.clipboard.writeText(shareCode.value)
    ElMessage.success('分享码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.share-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.connection-details {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.connection-details h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.connection-details p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.share-code-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-code-section h5 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.share-code-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-code {
  font-family: monospace;
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  padding: 8px 12px;
  border-radius: 6px;
  letter-spacing: 2px;
  flex: 1;
}

.share-tip {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.share-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-options h5 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 