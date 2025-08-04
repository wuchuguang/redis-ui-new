// 对话框组件导出
export { default as BaseDialog } from './BaseDialog.vue'
export { default as FormDialog } from './FormDialog.vue'
export { default as SetTTLDialog } from '../SetTTLDialog.vue'
export { default as BatchDeleteDialog } from '../BatchDeleteDialog.vue'

// 对话框组件列表
export const dialogComponents = {
  BaseDialog: () => import('./BaseDialog.vue'),
  FormDialog: () => import('./FormDialog.vue'),
  SetTTLDialog: () => import('../SetTTLDialog.vue'),
  BatchDeleteDialog: () => import('../BatchDeleteDialog.vue')
} 