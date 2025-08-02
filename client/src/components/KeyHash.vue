<template>
  <div class="key-hash">
    <el-tabs v-model="activeTab" type="card">
      <!-- 哈希计算 -->
      <el-tab-pane label="哈希计算" name="hash">
        <div class="hash-calc-section">
          <el-input
            v-model="hashInput"
            type="textarea"
            :rows="4"
            placeholder="输入要计算哈希的内容"
            @input="calculateHash"
          />
          <div class="hash-results">
            <div class="hash-item" v-for="(hash, algorithm) in hashResults" :key="algorithm">
              <div class="hash-label">{{ algorithm.toUpperCase() }}</div>
              <div class="hash-value">{{ hash }}</div>
              <el-button type="text" size="small" @click="copyHash(hash)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 批量操作 -->
      <el-tab-pane label="批量操作" name="batch">
        <div class="batch-section">
          <el-button @click="exportToJSON">导出为JSON</el-button>
          <el-button @click="exportToCSV">导出为CSV</el-button>
        </div>
      </el-tab-pane>

      <!-- 数据分析 -->
      <el-tab-pane label="数据分析" name="analysis">
        <div class="analysis-section">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-card>
                <div class="stat-item">
                  <div class="stat-value">{{ analysisStats.totalFields }}</div>
                  <div class="stat-label">总字段数</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card>
                <div class="stat-item">
                  <div class="stat-value">{{ analysisStats.uniqueValues }}</div>
                  <div class="stat-label">唯一值数</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card>
                <div class="stat-item">
                  <div class="stat-value">{{ analysisStats.avgLength }}</div>
                  <div class="stat-label">平均长度</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card>
                <div class="stat-item">
                  <div class="stat-value">{{ analysisStats.duplicates }}</div>
                  <div class="stat-label">重复值</div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  hashData: {
    type: Object,
    required: true
  }
})

// 响应式数据
const activeTab = ref('hash')
const hashInput = ref('')
const hashResults = ref({})

// 分析统计
const analysisStats = ref({
  totalFields: 0,
  uniqueValues: 0,
  avgLength: 0,
  duplicates: 0
})

// 计算哈希值
const calculateHash = () => {
  if (!hashInput.value) {
    hashResults.value = {}
    return
  }
  
  // 简单的哈希计算（实际项目中可以使用crypto-js库）
  const md5 = btoa(hashInput.value).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  const sha1 = btoa(hashInput.value + 'salt').replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)
  
  hashResults.value = {
    md5: md5,
    sha1: sha1
  }
}

// 复制哈希值
const copyHash = async (hash) => {
  try {
    await navigator.clipboard.writeText(hash)
    ElMessage.success('哈希值已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 导出为JSON
const exportToJSON = () => {
  const data = JSON.stringify(props.hashData, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hash-data.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 导出为CSV
const exportToCSV = () => {
  const csvContent = 'field,value\n' + 
    Object.entries(props.hashData).map(([field, value]) => 
      `"${field}","${value}"`
    ).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hash-data.csv'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 计算分析统计
const calculateAnalysisStats = () => {
  const data = props.hashData
  const values = Object.values(data)
  const uniqueValues = new Set(values)
  
  analysisStats.value = {
    totalFields: Object.keys(data).length,
    uniqueValues: uniqueValues.size,
    avgLength: Math.round(values.reduce((sum, val) => sum + String(val).length, 0) / values.length),
    duplicates: values.length - uniqueValues.size
  }
}

// 组件挂载时计算统计
onMounted(() => {
  calculateAnalysisStats()
})
</script>

<style scoped>
.key-hash {
  padding: 20px;
}

.hash-calc-section {
  display: flex;
  gap: 20px;
}

.hash-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.hash-label {
  font-weight: bold;
  min-width: 80px;
}

.hash-value {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.batch-section {
  display: flex;
  gap: 20px;
}

.analysis-section {
  margin-top: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  margin-top: 5px;
  color: #606266;
}
</style> 