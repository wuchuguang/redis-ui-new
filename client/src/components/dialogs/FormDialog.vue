<template>
  <BaseDialog
    v-model="visible"
    :title="title"
    :width="width"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :draggable="draggable"
    @close="handleClose"
    @open="handleOpen"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-width="labelWidth"
      :label-position="labelPosition"
    >
      <slot />
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel" :disabled="loading">
          {{ cancelText }}
        </el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm" 
          :loading="loading"
          :disabled="loading"
        >
          {{ confirmText }}
        </el-button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseDialog from './BaseDialog.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '表单对话框'
  },
  width: {
    type: String,
    default: '500px'
  },
  closeOnClickModal: {
    type: Boolean,
    default: false
  },
  closeOnPressEscape: {
    type: Boolean,
    default: true
  },
  showClose: {
    type: Boolean,
    default: true
  },
  draggable: {
    type: Boolean,
    default: false
  },
  formData: {
    type: Object,
    required: true
  },
  rules: {
    type: Object,
    default: () => ({})
  },
  labelWidth: {
    type: String,
    default: '100px'
  },
  labelPosition: {
    type: String,
    default: 'right'
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'close', 'open', 'confirm', 'cancel'])

// 响应式数据
const visible = ref(false)
const formRef = ref(null)

// 监听modelValue变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

// 监听visible变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 处理关闭
const handleClose = () => {
  visible.value = false
  emit('close')
}

// 处理打开
const handleOpen = () => {
  emit('open')
}

// 处理确认
const handleConfirm = async () => {
  try {
    if (formRef.value) {
      await formRef.value.validate()
    }
    emit('confirm')
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 处理取消
const handleCancel = () => {
  visible.value = false
  emit('cancel')
}

// 暴露方法
defineExpose({
  formRef,
  validate: () => formRef.value?.validate(),
  resetFields: () => formRef.value?.resetFields(),
  clearValidate: (props) => formRef.value?.clearValidate(props)
})
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 