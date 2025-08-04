<template>
  <div class="batch-operations">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>操作配置</span>
          </template>

          <el-form :model="config" label-width="100px">
            <el-form-item label="操作类型">
              <el-select v-model="config.type" placeholder="选择操作类型">
                <el-option label="批量删除" value="delete" />
                <el-option label="修改过期时间" value="expire" />
                <el-option label="批量重命名" value="rename" />
                <el-option label="数据迁移" value="migrate" />
              </el-select>
            </el-form-item>

            <el-form-item label="键模式">
              <el-input
                v-model="config.pattern"
                type="textarea"
                :rows="4"
                placeholder="请输入键模式，每行一个&#10;例如:&#10;user:*&#10;temp:*&#10;config:*"
                clearable
              />
            </el-form-item>

            <el-form-item label="数据类型">
              <el-select v-model="config.dataType" placeholder="选择数据类型" clearable>
                <el-option label="String" value="string" />
                <el-option label="Hash" value="hash" />
                <el-option label="List" value="list" />
                <el-option label="Set" value="set" />
                <el-option label="ZSet" value="zset" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="config.type === 'expire'" label="过期时间">
              <el-input-number
                v-model="config.ttl"
                :min="1"
                :max="31536000"
                placeholder="秒"
              />
            </el-form-item>

            <el-form-item v-if="config.type === 'rename'" label="新前缀">
              <el-input
                v-model="config.newPrefix"
                placeholder="例如: new:"
                clearable
              />
            </el-form-item>

            <el-form-item v-if="config.type === 'migrate'" label="目标数据库">
              <el-input-number
                v-model="config.targetDb"
                :min="0"
                :max="15"
                placeholder="数据库编号"
              />
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="config.confirm">
                确认执行此操作
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :disabled="!canExecute"
                @click="handlePreview"
              >
                预览操作
              </el-button>
              <el-button
                type="success"
                :disabled="!canExecute || !config.confirm"
                @click="handleExecute"
              >
                执行操作
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>操作结果</span>
              <el-button
                v-if="result.keys.length > 0"
                type="text"
                size="small"
                @click="handleClearResult"
              >
                清空结果
              </el-button>
            </div>
          </template>

          <div v-if="result.keys.length > 0" class="result-stats">
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ result.total }}</div>
                  <div class="stat-label">总键数</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ result.processed }}</div>
                  <div class="stat-label">已处理</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ result.success }}</div>
                  <div class="stat-label">成功</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item">
                  <div class="stat-value">{{ result.failed }}</div>
                  <div class="stat-label">失败</div>
                </div>
              </el-col>
            </el-row>
          </div>

          <div v-if="result.processing" class="progress-section">
            <el-progress
              :percentage="result.progress"
              :status="result.progress === 100 ? 'success' : ''"
            />
            <div class="progress-text">
              正在处理: {{ result.processed }}/{{ result.total }}
            </div>
          </div>

          <div v-if="result.keys.length === 0 && !result.processing" class="empty-state">
            <el-empty description="暂无操作结果" />
          </div>

          <div v-if="result.keys.length > 0" class="keys-list">
            <el-table
              :data="result.keys"
              height="400"
              style="width: 100%"
            >
              <el-table-column prop="key" label="键名" width="200" />
              <el-table-column prop="type" label="类型" width="80" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'success' ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ row.status === 'success' ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="message" label="消息" />
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const props = defineProps({
  connection: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['operation-complete'])

const config = ref({
  type: 'delete',
  pattern: '',
  dataType: '',
  ttl: 3600,
  newPrefix: '',
  targetDb: 0,
  confirm: false
})

const result = ref({
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  progress: 0,
  processing: false,
  keys: []
})

const canExecute = computed(() => {
  const patterns = config.value.pattern.split('\n').map(p => p.trim()).filter(p => p)
  return patterns.length > 0
})

const handlePreview = async () => {
  if (!canExecute.value) {
    ElMessage.warning('请填写键模式')
    return
  }

  try {
    const response = await axios.post('/api/tools/batch/preview', {
      connectionId: props.connection.id,
      ...config.value
    })

    if (response.data.success) {
      const patterns = config.value.pattern.split('\n').map(p => p.trim()).filter(p => p)
      result.value = {
        ...result.value,
        total: response.data.data.total,
        keys: response.data.data.keys.map(key => ({
          key: key,
          type: 'unknown',
          status: 'pending',
          message: '待处理'
        }))
      }
      ElMessage.success(`使用 ${patterns.length} 个模式找到 ${response.data.data.total} 个匹配的键`)
    }
  } catch (error) {
    console.error('预览操作失败:', error)
    ElMessage.error('预览操作失败')
  }
}

const handleExecute = async () => {
  if (!config.value.confirm) {
    ElMessage.warning('请确认操作')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要执行 ${getOperationName()} 操作吗？此操作不可撤销。`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    result.value.processing = true
    result.value.progress = 0

    const response = await axios.post('/api/tools/batch/execute', {
      connectionId: props.connection.id,
      ...config.value
    })

    if (response.data.success) {
      result.value = {
        ...result.value,
        ...response.data.data,
        processing: false,
        progress: 100
      }
      
      emit('operation-complete', {
        type: config.value.type,
        total: result.value.total,
        success: result.value.success,
        failed: result.value.failed
      })
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('执行操作失败:', error)
      ElMessage.error('执行操作失败')
    }
    result.value.processing = false
  }
}

const handleClearResult = () => {
  result.value = {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    progress: 0,
    processing: false,
    keys: []
  }
}

const getOperationName = () => {
  const typeMap = {
    delete: '批量删除',
    expire: '修改过期时间',
    rename: '批量重命名',
    migrate: '数据迁移'
  }
  return typeMap[config.value.type] || '批量操作'
}
</script>

<style scoped>
.batch-operations {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .result-stats {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 4px;

    .stat-item {
      text-align: center;

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #409eff;
      }

      .stat-label {
        font-size: 12px;
        color: #909399;
        margin-top: 5px;
      }
    }
  }

  .progress-section {
    margin-bottom: 20px;

    .progress-text {
      text-align: center;
      margin-top: 10px;
      color: #606266;
    }
  }

  .empty-state {
    text-align: center;
    padding: 40px 0;
  }
}
</style>