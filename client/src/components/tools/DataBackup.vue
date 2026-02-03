<template>
  <div class="data-backup">
    <el-row :gutter="24">
      <!-- 备份配置 -->
      <el-col :span="8">
        <el-card class="config-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Setting /></el-icon>
              <span>备份配置</span>
            </div>
          </template>

          <el-form :model="backupConfig" label-width="100px" class="backup-form">
            <el-form-item label="备份类型">
              <el-select 
                v-model="backupConfig.type" 
                placeholder="选择备份类型"
                class="full-width"
                size="large"
              >
                <el-option label="全量备份" value="full">
                  <div class="option-content">
                    <el-icon><Download /></el-icon>
                    <span>全量备份</span>
                  </div>
                </el-option>
                <el-option label="增量备份" value="incremental">
                  <div class="option-content">
                    <el-icon><Refresh /></el-icon>
                    <span>增量备份</span>
                  </div>
                </el-option>
                <el-option label="选择性备份" value="selective">
                  <div class="option-content">
                    <el-icon><Select /></el-icon>
                    <span>选择性备份</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="备份范围">
              <el-select 
                v-model="backupConfig.scope" 
                placeholder="选择备份范围"
                class="full-width"
                size="large"
              >
                <el-option label="当前数据库" value="current" />
                <el-option label="所有数据库" value="all" />
                <el-option label="指定数据库" value="specific" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="backupConfig.scope === 'specific'" label="数据库编号">
              <el-input-number
                v-model="backupConfig.dbNumber"
                :min="0"
                :max="15"
                placeholder="数据库编号"
                size="large"
                class="full-width"
              />
            </el-form-item>

            <el-form-item label="键模式">
              <el-input
                v-model="backupConfig.pattern"
                placeholder="例如: user:*, temp:* (留空表示所有键)"
                clearable
                size="large"
                class="full-width"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="输出格式">
              <el-select 
                v-model="backupConfig.format" 
                placeholder="选择输出格式"
                class="full-width"
                size="large"
              >
                <el-option label="JSON" value="json" />
                <el-option label="CSV" value="csv" />
                <el-option label="Redis RDB" value="rdb" />
                <el-option label="Redis AOF" value="aof" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="backupConfig.compress" class="config-checkbox">
                <span class="checkbox-text">压缩备份文件</span>
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="backupConfig.encrypt" class="config-checkbox">
                <span class="checkbox-text">加密备份文件</span>
              </el-checkbox>
            </el-form-item>

            <el-form-item v-if="backupConfig.encrypt" label="加密密码">
              <el-input
                v-model="backupConfig.password"
                type="password"
                placeholder="输入加密密码"
                show-password
                size="large"
                class="full-width"
              />
            </el-form-item>

            <el-form-item class="action-buttons">
              <el-button
                type="primary"
                :disabled="!canStartBackup"
                @click="handleStartBackup"
                size="large"
                class="action-btn"
              >
                <el-icon><VideoPlay /></el-icon>
                开始备份
              </el-button>
              <el-button
                type="warning"
                :disabled="!currentBackup.processing"
                @click="handleStopBackup"
                size="large"
                class="action-btn"
              >
                <el-icon><VideoPause /></el-icon>
                停止备份
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 当前备份任务 -->
      <el-col :span="8">
        <el-card class="current-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Loading /></el-icon>
              <span>当前备份任务</span>
              <el-button
                type="text"
                size="small"
                @click="handleRefreshCurrent"
                class="refresh-btn"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <div v-if="currentBackup.processing" class="current-backup">
            <div class="backup-info">
              <div class="backup-id">
                <el-icon><Document /></el-icon>
                <span>备份ID: {{ currentBackup.id }}</span>
              </div>
              <div class="backup-type">
                <el-tag :type="getBackupTypeColor(currentBackup.type)" size="small">
                  {{ getBackupTypeName(currentBackup.type) }}
                </el-tag>
              </div>
            </div>

            <div class="backup-progress">
              <el-progress
                :percentage="currentBackup.progress"
                :status="currentBackup.progress === 100 ? 'success' : ''"
                :stroke-width="8"
                class="progress-bar"
              />
              <div class="progress-text">
                <el-icon><Loading /></el-icon>
                正在备份: {{ currentBackup.processed }}/{{ currentBackup.total }}
              </div>
            </div>

            <div class="backup-stats">
              <el-row :gutter="16">
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-label">进度</div>
                    <div class="stat-value">{{ currentBackup.progress }}%</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-label">已处理</div>
                    <div class="stat-value">{{ currentBackup.processed }}</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-label">备份成功</div>
                    <div class="stat-value">{{ currentBackup.backupKeys || 0 }}</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-label">备份失败</div>
                    <div class="stat-value">{{ currentBackup.failedKeys || 0 }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <div class="backup-time">
              <div class="time-item">
                <el-icon><Clock /></el-icon>
                <span>开始时间: {{ formatTime(currentBackup.startTime) }}</span>
              </div>
              <div class="time-item">
                <el-icon><Timer /></el-icon>
                <span>已耗时: {{ formatDuration(currentBackup.duration) }}</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-current">
            <el-empty description="暂无备份任务" :image-size="120">
              <template #image>
                <el-icon class="empty-icon"><Loading /></el-icon>
              </template>
            </el-empty>
          </div>
        </el-card>
      </el-col>

      <!-- 备份历史 -->
      <el-col :span="8">
        <el-card class="history-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><DocumentCopy /></el-icon>
              <span>备份历史</span>
              <el-button
                type="text"
                size="small"
                @click="handleRefreshHistory"
                class="refresh-btn"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <div v-if="backupHistory.length > 0" class="backup-history">
            <el-table :data="backupHistory" height="400" class="history-table">
              <el-table-column prop="id" label="备份ID" width="140" />
              <el-table-column prop="dbNumber" label="数据库" width="80">
                <template #default="{ row }">
                  <el-tag size="small" type="info">DB {{ row.dbNumber }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="80">
                <template #default="{ row }">
                  <el-tag :type="getBackupTypeColor(row.type)" size="small">
                    {{ getBackupTypeName(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="format" label="格式" width="80" />
              <el-table-column prop="backupKeys" label="备份键数" width="100">
                <template #default="{ row }">
                  <el-tag 
                    :type="row.backupKeys > 0 ? 'success' : 'info'" 
                    size="small"
                  >
                    {{ row.backupKeys || 0 }}
                  </el-tag>
                  <el-tag 
                    v-if="row.failedKeys > 0" 
                    type="danger" 
                    size="small" 
                    style="margin-left: 4px;"
                  >
                    {{ row.failedKeys }} 失败
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="size" label="大小" width="100">
                <template #default="{ row }">
                  {{ formatFileSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'"
                    size="small"
                    effect="dark"
                  >
                    <el-icon v-if="row.status === 'completed'"><CircleCheck /></el-icon>
                    <el-icon v-else-if="row.status === 'failed'"><CircleClose /></el-icon>
                    <el-icon v-else><Loading /></el-icon>
                    {{ getStatusName(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" width="90">
                <template #default="{ row }">
                  {{ formatTime(row.createdAt) }}
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="耗时" width="70">
                <template #default="{ row }">
                  {{ formatDuration(row.duration) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="90">
                <template #default="{ row }">
                  <el-dropdown>
                    <el-button type="text" size="small">
                      <el-icon><More /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="handleDownload(row)">
                          <el-icon><Download /></el-icon>
                          下载
                        </el-dropdown-item>
                        <el-dropdown-item @click="handleRestore(row)">
                          <el-icon><RefreshLeft /></el-icon>
                          恢复
                        </el-dropdown-item>
                        <el-dropdown-item @click="handleDelete(row)" divided>
                          <el-icon><Delete /></el-icon>
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-else class="empty-history">
            <el-empty description="暂无备份历史" :image-size="120">
              <template #image>
                <el-icon class="empty-icon"><DocumentCopy /></el-icon>
              </template>
            </el-empty>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 恢复对话框 -->
    <el-dialog
      v-model="restoreDialog.visible"
      title="恢复备份"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="restoreDialog.config" label-width="100px">
        <el-form-item label="恢复模式">
          <el-radio-group v-model="restoreDialog.config.mode">
            <el-radio label="overwrite">覆盖现有数据</el-radio>
            <el-radio label="merge">合并数据</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标数据库">
          <el-input-number
            v-model="restoreDialog.config.targetDb"
            :min="0"
            :max="15"
            placeholder="数据库编号"
          />
        </el-form-item>
        <el-form-item v-if="restoreDialog.config.mode === 'merge'" label="冲突处理">
          <el-select v-model="restoreDialog.config.conflictStrategy">
            <el-option label="跳过冲突键" value="skip" />
            <el-option label="覆盖冲突键" value="overwrite" />
            <el-option label="重命名冲突键" value="rename" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restoreDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmRestore">确认恢复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Setting, Download, Refresh, Select, Search, VideoPlay, VideoPause,
  Loading, Document, DocumentCopy, CircleCheck, CircleClose, More,
  RefreshLeft, Delete, Clock, Timer
} from '@element-plus/icons-vue'
import request from '../../utils/http.js'

const props = defineProps({
  connection: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['backup-complete'])

// 备份配置
const backupConfig = ref({
  type: 'full',
  scope: 'current',
  dbNumber: 0,
  pattern: '',
  format: 'json',
  compress: true,
  encrypt: false,
  password: ''
})

// 当前备份
const currentBackup = ref({
  processing: false,
  id: '',
  type: '',
  progress: 0,
  processed: 0,
  total: 0,
  startTime: null,
  duration: 0
})

// 备份历史
const backupHistory = ref([])

// 恢复对话框
const restoreDialog = ref({
  visible: false,
  backupId: '',
  config: {
    mode: 'overwrite',
    targetDb: 0,
    conflictStrategy: 'skip'
  }
})

// 计算属性
const canStartBackup = computed(() => {
  return !currentBackup.value.processing && backupConfig.value.type
})

// 开始备份
const handleStartBackup = async () => {
  try {
    const response = await request.post('/tools/backup/start', {
      connectionId: props.connection.id,
      ...backupConfig.value
    })

    if (response.data.success) {
      currentBackup.value = {
        processing: true,
        id: response.data.data.backupId,
        type: backupConfig.value.type,
        progress: 0,
        processed: 0,
        total: 0,
        backupKeys: 0,
        failedKeys: 0,
        startTime: new Date(),
        duration: 0
      }
      
      // 开始轮询进度
      setTimeout(pollBackupProgress, 1000) // 延迟1秒开始轮询
    }
  } catch (error) {
    console.error('启动备份失败:', error)
  }
}

// 停止备份
const handleStopBackup = async () => {
  try {
    await ElMessageBox.confirm('确定要停止当前备份任务吗？', '确认停止', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await request.post('/tools/backup/stop', {
      connectionId: props.connection.id,
      backupId: currentBackup.value.id
    })

    if (response.data.success) {
      currentBackup.value.processing = false
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('停止备份失败:', error)
    }
  }
}

// 轮询备份进度
const pollBackupProgress = async () => {
  if (!currentBackup.value.processing) return

  try {
    const response = await request.get(`/tools/backup/progress/${currentBackup.value.id}`)
    
    if (response.data.success) {
      const progress = response.data.data
      currentBackup.value = {
        ...currentBackup.value,
        progress: progress.progress,
        processed: progress.processed,
        total: progress.total,
        duration: progress.duration,
        backupKeys: progress.backupKeys,
        failedKeys: progress.failedKeys
      }

      if (progress.status === 'completed' || progress.status === 'failed') {
        currentBackup.value.processing = false
        await loadBackupHistory()
        
        emit('backup-complete', {
          type: currentBackup.value.type,
          status: progress.status,
          backupId: currentBackup.value.id,
          backupKeys: progress.backupKeys,
          failedKeys: progress.failedKeys
        })
      } else {
        // 继续轮询
        setTimeout(pollBackupProgress, 2000)
      }
    }
  } catch (error) {
    console.error('获取备份进度失败:', error)
    
    // 如果备份记录不存在，停止轮询
    if (error.response && error.response.status === 500 && 
        error.response.data.message && error.response.data.message.includes('备份记录不存在')) {
      currentBackup.value.processing = false
      return
    }
    
    // 其他错误，继续轮询但增加间隔
    setTimeout(pollBackupProgress, 5000)
  }
}

// 刷新当前备份
const handleRefreshCurrent = async () => {
  if (currentBackup.value.processing) {
    await pollBackupProgress()
  }
}

// 加载备份历史
const loadBackupHistory = async () => {
  try {
    const response = await request.get(`/tools/backup/history?connectionId=${props.connection.id}`)
    if (response.data.success) {
      backupHistory.value = response.data.data
    }
  } catch (error) {
    console.error('加载备份历史失败:', error)
  }
}

// 刷新历史
const handleRefreshHistory = async () => {
  await loadBackupHistory()
}

// 下载备份
const handleDownload = async (backup) => {
  try {
    const response = await request.get(`/tools/backup/download/${backup.id}`, {}, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `${backup.id}.${backup.format}`
    link.click()
    window.URL.revokeObjectURL(url)
    

  } catch (error) {
    console.error('下载备份失败:', error)
  }
}

// 恢复备份
const handleRestore = (backup) => {
  restoreDialog.value = {
    visible: true,
    backupId: backup.id,
    config: {
      mode: 'overwrite',
      targetDb: 0,
      conflictStrategy: 'skip'
    }
  }
}

// 确认恢复
const handleConfirmRestore = async () => {
  try {
    const response = await request.post('/tools/backup/restore', {
      connectionId: props.connection.id,
      backupId: restoreDialog.value.backupId,
      ...restoreDialog.value.config
    })

    if (response.data.success) {
      restoreDialog.value.visible = false
    }
  } catch (error) {
    console.error('恢复备份失败:', error)
  }
}

// 删除备份
const handleDelete = async (backup) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份 ${backup.id} 吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await request.delete(`/tools/backup/${backup.id}`)
    
    if (response.data.success) {
      await loadBackupHistory()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除备份失败:', error)
    }
  }
}

// 工具函数
const getBackupTypeColor = (type) => {
  const colorMap = {
    full: 'primary',
    incremental: 'success',
    selective: 'warning'
  }
  return colorMap[type] || 'info'
}

const getBackupTypeName = (type) => {
  const nameMap = {
    full: '全量',
    incremental: '增量',
    selective: '选择性'
  }
  return nameMap[type] || type
}

const getStatusName = (status) => {
  const statusMap = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const formatDuration = (duration) => {
  if (!duration) return '-'
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}分${seconds}秒`
}

const formatFileSize = (size) => {
  if (!size) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let fileSize = size
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`
}

// 组件挂载时加载数据
onMounted(() => {
  loadBackupHistory()
})
</script>

<style scoped>
.data-backup {
  .config-card,
  .current-card,
  .history-card {
    border-radius: 16px;
    border: none;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    overflow: hidden;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
  }

  .config-card:hover,
  .current-card:hover,
  .history-card:hover {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
    border-color: #667eea;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    padding: 16px 24px;
    background: var(--el-bg-color-overlay);
    border-bottom: 1px solid var(--el-border-color);
  }

  .header-icon {
    color: #667eea;
    font-size: 18px;
  }

  .refresh-btn {
    margin-left: auto;
    color: #6b7280;
  }

  .backup-form {
    padding: 24px;
    
    .full-width {
      width: 100%;
    }

    :deep(.el-input__inner),
    :deep(.el-textarea__inner) {
      background-color: #1a1a1a !important;
      color: var(--el-text-color-primary) !important;
      border: 2px solid var(--el-border-color);
      border-radius: 12px;
      transition: all 0.3s ease;
      font-size: 14px;
      
      &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        background-color: var(--el-bg-color-overlay) !important;
      }
      
      &:hover {
        border-color: #667eea;
      }
    }

    :deep(.el-select .el-input__inner) {
      background-color: #1a1a1a !important;
      color: var(--el-text-color-primary) !important;
      border: 2px solid var(--el-border-color);
      border-radius: 12px;
      
      &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        background-color: var(--el-bg-color-overlay) !important;
      }
    }

    .config-checkbox {
      .checkbox-text {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
    }

    .action-buttons {
      margin-top: 24px;
      text-align: center;
    }

    .action-btn {
      margin: 0 8px;
      border-radius: 8px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }

  .option-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .current-backup {
    .backup-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 16px;
      background: var(--el-border-color);
      border-radius: 8px;
      border: 1px solid var(--el-border-color);

      .backup-id {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
    }

    .backup-progress {
      margin-bottom: 20px;

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

    .backup-stats {
      margin-bottom: 20px;

      .stat-item {
        text-align: center;
        padding: 12px;
        background: var(--el-border-color);
        border-radius: 8px;
        border: 1px solid var(--el-border-color);

        .stat-label {
          font-size: 12px;
          color: #a0a0a0;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--el-text-color-primary);
        }
      }
    }

    .backup-time {
      .time-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        color: #a0a0a0;
        font-size: 14px;
      }
    }
  }

  .empty-current,
  .empty-history {
    text-align: center;
    padding: 40px 0;

    .empty-icon {
      font-size: 80px;
      color: var(--el-border-color);
    }
  }

  .history-table {
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
      background: var(--el-bg-color-overlay);
      color: var(--el-text-color-primary);
      
      &:hover {
        background: var(--el-border-color);
        transform: scale(1.01);
      }
    }
    
    :deep(.el-table__cell) {
      padding: 12px;
      border-bottom: 1px solid var(--el-border-color);
      color: var(--el-text-color-primary);
    }
    
    :deep(.el-table) {
      background: var(--el-bg-color-overlay);
      color: var(--el-text-color-primary);
    }
  }
}
</style>
