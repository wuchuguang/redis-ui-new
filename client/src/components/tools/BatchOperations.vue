<template>
  <div class="batch-operations">
    <el-row :gutter="24">
      <!-- 操作配置 -->
      <el-col :span="8">
        <el-card class="config-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Setting /></el-icon>
              <span>操作配置</span>
            </div>
          </template>

          <el-form :model="config" label-width="100px" class="config-form">
            <el-form-item label="操作脚本">
              <el-input
                v-model="config.script"
                type="textarea"
                :rows="8"
                placeholder="请输入批量操作脚本，每行一个命令&#10;&#10;支持的命令格式:&#10;del key1:xxxx          # 删除指定键&#10;del user:*            # 删除匹配模式的键&#10;expire key1:xxxx 3600 # 设置过期时间&#10;rename old:key new:key # 重命名键&#10;move key1:xxxx 1      # 移动到指定数据库&#10;type key1:xxxx        # 获取键类型&#10;ttl key1:xxxx         # 获取过期时间&#10;&#10;示例:&#10;del temp:*&#10;expire user:123 7200&#10;rename old:config new:config"
                clearable
                size="large"
                class="full-width"
              >
                <template #prefix>
                  <el-icon><Edit /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="执行模式">
              <el-radio-group v-model="config.mode" class="mode-group">
                <el-radio label="preview">预览模式</el-radio>
                <el-radio label="dry-run">试运行</el-radio>
                <el-radio label="execute">实际执行</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="config.mode === 'execute'">
              <el-checkbox v-model="config.confirm" class="confirm-checkbox">
                <span class="checkbox-text">确认执行此操作（不可撤销）</span>
              </el-checkbox>
            </el-form-item>

            <el-form-item class="action-buttons">
              <el-button
                type="primary"
                :disabled="!canExecute"
                @click="handleExecute"
                size="large"
                class="action-btn"
              >
                <el-icon><VideoPlay /></el-icon>
                {{ getActionButtonText() }}
              </el-button>
              <el-button
                type="info"
                @click="handleClearScript"
                size="large"
                class="action-btn"
              >
                <el-icon><Refresh /></el-icon>
                清空脚本
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 操作结果 -->
      <el-col :span="16">
        <el-card class="result-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><DataAnalysis /></el-icon>
              <span>操作结果</span>
              
            </div>
          </template>

          <div v-if="result.commands && result.commands.length > 0" class="result-stats">
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="stat-item total">
                  <div class="stat-icon">
                    <el-icon><DataBoard /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ result.total }}</div>
                    <div class="stat-label">总命令数</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item processed">
                  <div class="stat-icon">
                    <el-icon><Loading /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ result.processed }}</div>
                    <div class="stat-label">已处理</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item success">
                  <div class="stat-icon">
                    <el-icon><CircleCheck /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ result.success }}</div>
                    <div class="stat-label">成功</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item failed">
                  <div class="stat-icon">
                    <el-icon><CircleClose /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ result.failed }}</div>
                    <div class="stat-label">失败</div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>

          <div v-if="result.processing" class="progress-section">
            <el-progress
              :percentage="result.progress"
              :status="result.progress === 100 ? 'success' : ''"
              :stroke-width="8"
              class="progress-bar"
            />
            <div class="progress-text">
              <el-icon><Loading /></el-icon>
              正在处理: {{ result.processed }}/{{ result.total }}
            </div>
          </div>

          <div v-if="!result.processing && (!result.commands || result.commands.length === 0)" class="empty-state">
            <el-empty description="暂无操作结果" :image-size="120">
              <template #image>
                <el-icon class="empty-icon"><DataAnalysis /></el-icon>
              </template>
            </el-empty>
          </div>

          <div v-if="result.commands && result.commands.length > 0" class="commands-list">
            <el-table 
              :data="result.commands" 
              height="400"
              style="width: 100%"
              class="result-table"
            >
              <el-table-column prop="command" label="命令" width="200" />
              <el-table-column prop="target" label="目标" width="150" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'"
                    size="small"
                    effect="dark"
                  >
                    <el-icon v-if="row.status === 'success'"><CircleCheck /></el-icon>
                    <el-icon v-else-if="row.status === 'failed'"><CircleClose /></el-icon>
                    <el-icon v-else><Loading /></el-icon>
                    {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : '待处理' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="result" label="结果" width="100" />
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
import { 
  Setting, Edit, VideoPlay, Refresh, Delete,
  DataAnalysis, DataBoard, Loading, CircleCheck, CircleClose
} from '@element-plus/icons-vue'
import axios from 'axios'

const props = defineProps({
  connection: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['operation-complete'])

const config = ref({
  script: '',
  mode: 'preview',
  confirm: false
})

const result = ref({
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  progress: 0,
  processing: false,
  commands: []
})

const canExecute = computed(() => {
  const commands = config.value.script.split('\n').map(c => c.trim()).filter(c => c && !c.startsWith('#'))
  return commands.length > 0
})

const handleExecute = async () => {
  if (!canExecute.value) {
    ElMessage.warning('请填写操作脚本')
    return
  }

  if (config.value.mode === 'execute' && !config.value.confirm) {
    ElMessage.warning('请确认执行操作')
    return
  }

  try {
    if (config.value.mode === 'execute') {
      await ElMessageBox.confirm(
        '确定要执行此操作吗？此操作不可撤销。',
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }

    result.value.processing = true
    result.value.progress = 0

    const response = await axios.post('/api/tools/batch/execute', {
      connectionId: props.connection.id,
      ...config.value
    })

    if (response.data.success) {
      result.value = {
        ...response.data.data,
        processing: false,
        progress: 100
      }
      
      const modeText = {
        preview: '预览',
        'dry-run': '试运行',
        execute: '执行'
      }[config.value.mode]
      
      ElMessage.success(`${modeText}完成！总命令数: ${result.value.total}, 成功: ${result.value.success}, 失败: ${result.value.failed}`)
      
      emit('operation-complete', {
        mode: config.value.mode,
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

const handleClearScript = () => {
  config.value.script = ''
  ElMessage.success('脚本已清空')
}

const getActionButtonText = () => {
  const modeMap = {
    preview: '预览操作',
    'dry-run': '试运行',
    execute: '执行操作'
  }
  return modeMap[config.value.mode] || '执行操作'
}

const handleClearResult = () => {
  result.value = {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    progress: 0,
    processing: false,
    commands: []
  }
}


</script>

<style scoped>
.batch-operations {
  .config-card,
  .result-card {
    border-radius: 16px;
    border: none;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    overflow: hidden;
    background: #2d2d2d;
    border: 1px solid #404040;
  }

  .config-card:hover,
  .result-card:hover {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
    border-color: #667eea;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #ffffff;
    padding: 16px 24px;
    background: #2d2d2d;
    border-bottom: 1px solid #404040;
  }

  .header-icon {
    color: #667eea;
    font-size: 18px;
  }

  .clear-btn {
    margin-left: auto;
    color: #6b7280;
  }

  .config-form {
    padding: 24px;
    
    .full-width {
      width: 100%;
    }

    :deep(.el-input__inner),
    :deep(.el-textarea__inner) {
      background-color: #1a1a1a !important;
      color: #ffffff !important;
      border: 2px solid #404040;
      border-radius: 12px;
      transition: all 0.3s ease;
      font-size: 14px;
      
      &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        background-color: #2d2d2d !important;
      }
      
      &:hover {
        border-color: #667eea;
      }
    }

    :deep(.el-select .el-input__inner) {
      background-color: #1a1a1a !important;
      color: #ffffff !important;
      border: 2px solid #404040;
      border-radius: 12px;
      
      &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        background-color: #2d2d2d !important;
      }
    }

    .mode-group {
      display: flex;
      gap: 16px;
      
      :deep(.el-radio) {
        margin-right: 0;
        
        .el-radio__label {
          font-weight: 500;
          color: #ffffff;
        }
        
        .el-radio__input.is-checked .el-radio__label {
          color: #667eea;
        }
      }
    }

    .confirm-checkbox {
      margin-top: 16px;
      
      .checkbox-text {
        font-weight: 500;
        color: #ffffff;
        font-size: 14px;
      }
    }

    .action-buttons {
      margin-top: 32px;
      text-align: center;
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    .action-btn {
      border-radius: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 14px;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }
    }
  }

  .option-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .result-stats {
    margin-bottom: 24px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      border-radius: 16px;
      background: linear-gradient(135deg, #404040 0%, #2d2d2d 100%);
      border: 1px solid #404040;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      }

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        border-color: #667eea;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
      }

      .stat-content {
        flex: 1;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 4px;
        color: #ffffff;
      }

      .stat-label {
        font-size: 12px;
        color: #a0a0a0;
        font-weight: 500;
      }

      &.total .stat-icon {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.processed .stat-icon {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      &.success .stat-icon {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      &.failed .stat-icon {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      }
    }
  }

  .progress-section {
    margin-bottom: 24px;
    text-align: center;

    .progress-bar {
      margin-bottom: 12px;
    }

    .progress-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #a0a0a0;
      font-weight: 500;
    }
  }

  .empty-state {
    text-align: center;
    padding: 40px 0;

    .empty-icon {
      font-size: 80px;
      color: #404040;
    }
  }

  .result-table {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    
    :deep(.el-table__header) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    :deep(.el-table__header th) {
      background: transparent;
      color: white;
      font-weight: 600;
      border-bottom: none;
      padding: 16px 12px;
    }

    :deep(.el-table__row) {
      transition: all 0.3s ease;
      background: #2d2d2d;
      color: #ffffff;
      
      &:hover {
        background: #404040;
        transform: scale(1.01);
      }
    }
    
    :deep(.el-table__cell) {
      padding: 12px;
      border-bottom: 1px solid #404040;
      color: #ffffff;
    }
    
    :deep(.el-table) {
      background: #2d2d2d;
      color: #ffffff;
    }
  }
}
</style> 