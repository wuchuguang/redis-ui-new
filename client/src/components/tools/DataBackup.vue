<template>
  <div class="data-backup">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>备份配置</span>
          </template>

          <el-form :model="backupConfig" label-width="100px">
            <el-form-item label="备份类型">
              <el-select v-model="backupConfig.type" placeholder="选择备份类型">
                <el-option label="全量备份" value="full" />
                <el-option label="增量备份" value="incremental" />
                <el-option label="选择性备份" value="selective" />
              </el-select>
            </el-form-item>

            <el-form-item label="备份范围">
              <el-select v-model="backupConfig.scope" placeholder="选择备份范围">
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
              />
            </el-form-item>

            <el-form-item label="键模式">
              <el-input
                v-model="backupConfig.pattern"
                placeholder="例如: user:*, temp:* (留空表示所有键)"
                clearable
              />
            </el-form-item>

            <el-form-item label="输出格式">
              <el-select v-model="backupConfig.format" placeholder="选择输出格式">
                <el-option label="JSON" value="json" />
                <el-option label="CSV" value="csv" />
                <el-option label="Redis RDB" value="rdb" />
                <el-option label="Redis AOF" value="aof" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="backupConfig.compress">
                压缩备份文件
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="backupConfig.encrypt">
                加密备份文件
              </el-checkbox>
            </el-form-item>

            <el-form-item v-if="backupConfig.encrypt" label="加密密码">
              <el-input
                v-model="backupConfig.password"
                type="password"
                placeholder="输入加密密码"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :disabled="!canStartBackup"
                @click="handleStartBackup"
              >
                开始备份
              </el-button>
              <el-button
                type="warning"
                :disabled="!currentBackup.processing"
                @click="handleStopBackup"
              >
                停止备份
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>备份状态</span>
              <el-button
                type="text"
                size="small"
                @click="handleRefreshStatus"
              >
                刷新
              </el-button>
            </div>
          </template>

          <div v-if="currentBackup.processing" class="backup-progress">
            <el-progress
              :percentage="currentBackup.progress"
              :status="currentBackup.progress === 100 ? 'success' : ''"
            />
            <div class="progress-info">
              <p>备份ID: {{ currentBackup.id }}</p>
              <p>已处理: {{ currentBackup.processed }}/{{ currentBackup.total }}</p>
              <p>开始时间: {{ formatTime(currentBackup.startTime) }}</p>
            </div>
          </div>

          <div v-else class="backup-status">
            <el-empty description="暂无备份任务" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 备份历史 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>备份历史</span>
              <el-button
                type="primary"
                size="small"
                @click="handleRefreshHistory"
              >
                刷新
              </el-button>
            </div>
          </template>

          <el-table :data="backupHistory" height="300">
            <el-table-column prop="id" label="备份ID" width="120" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getBackupTypeColor(row.type)" size="small">
                  {{ getBackupTypeName(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="format" label="格式" width="80" />
            <el-table-column prop="size" label="大小" width="100">
              <template #default="{ row }">
                {{ formatFileSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'"
                  size="small"
                >
                  {{ getStatusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100">
              <template #default="{ row }">
                {{ formatDuration(row.duration) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'completed'"
                  type="text"
                  size="small"
                  @click="handleDownload(row)"
                >
                  下载
                </el-button>
                <el-button
                  v-if="row.status === 'completed'"
                  type="text"
                  size="small"
                  @click="handleRestore(row)"
                >
                  恢复
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
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
import axios from 'axios'

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
    const response = await axios.post('/api/tools/backup/start', {
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
        startTime: new Date(),
        duration: 0
      }
      
      // 开始轮询进度
      pollBackupProgress()
      
      ElMessage.success('备份任务已启动')
    }
  } catch (error) {
    console.error('启动备份失败:', error)
    ElMessage.error('启动备份失败')
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

    const response = await axios.post('/api/tools/backup/stop', {
      connectionId: props.connection.id,
      backupId: currentBackup.value.id
    })

    if (response.data.success) {
      currentBackup.value.processing = false
      ElMessage.success('备份任务已停止')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('停止备份失败:', error)
      ElMessage.error('停止备份失败')
    }
  }
}

// 轮询备份进度
const pollBackupProgress = async () => {
  if (!currentBackup.value.processing) return

  try {
    const response = await axios.get(`/api/tools/backup/progress/${currentBackup.value.id}`)
    
    if (response.data.success) {
      const progress = response.data.data
      currentBackup.value = {
        ...currentBackup.value,
        ...progress
      }

      if (progress.status === 'completed' || progress.status === 'failed') {
        currentBackup.value.processing = false
        await loadBackupHistory()
        emit('backup-complete', {
          type: currentBackup.value.type,
          status: progress.status,
          backupId: currentBackup.value.id
        })
      } else {
        // 继续轮询
        setTimeout(pollBackupProgress, 2000)
      }
    }
  } catch (error) {
    console.error('获取备份进度失败:', error)
  }
}

// 刷新状态
const handleRefreshStatus = async () => {
  if (currentBackup.value.processing) {
    await pollBackupProgress()
  }
}

// 加载备份历史
const loadBackupHistory = async () => {
  try {
    const response = await axios.get('/api/tools/backup/history')
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
    const response = await axios.get(`/api/tools/backup/download/${backup.id}`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `backup-${backup.id}.${backup.format}`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('备份文件下载成功')
  } catch (error) {
    console.error('下载备份失败:', error)
    ElMessage.error('下载备份失败')
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
    const response = await axios.post('/api/tools/backup/restore', {
      connectionId: props.connection.id,
      backupId: restoreDialog.value.backupId,
      ...restoreDialog.value.config
    })

    if (response.data.success) {
      restoreDialog.value.visible = false
      ElMessage.success('备份恢复任务已启动')
    }
  } catch (error) {
    console.error('恢复备份失败:', error)
    ElMessage.error('恢复备份失败')
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

    const response = await axios.delete(`/api/tools/backup/${backup.id}`)
    
    if (response.data.success) {
      await loadBackupHistory()
      ElMessage.success('备份删除成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除备份失败:', error)
      ElMessage.error('删除备份失败')
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
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .backup-progress {
    .progress-info {
      margin-top: 15px;
      
      p {
        margin: 5px 0;
        color: #606266;
      }
    }
  }

  .backup-status {
    text-align: center;
    padding: 40px 0;
  }
}
</style>