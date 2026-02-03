<template>
  <div id="app" class="app-container">
    <!-- 仅 /web/admin 入口显示：独立管理后台顶栏（返回首页 + 主题 + 用户） -->
    <div v-if="isAdminRoute" class="top-toolbar top-toolbar-global">
      <div class="toolbar-left">
        <router-link to="/" class="nav-link">
          <el-icon><ArrowLeft /></el-icon>
          返回首页
        </router-link>
      </div>
      <div class="toolbar-right">
        <el-tooltip :content="themeStore.isDark ? '切换为浅色' : '切换为深色'" placement="bottom">
          <el-button type="text" class="toolbar-btn theme-toggle" @click="themeStore.toggleTheme">
            <el-icon v-if="themeStore.isDark"><Sunny /></el-icon>
            <el-icon v-else><Moon /></el-icon>
            <span class="theme-label">{{ themeStore.isDark ? '浅色' : '深色' }}</span>
          </el-button>
        </el-tooltip>
        <UserManager />
      </div>
    </div>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Sunny, Moon, ArrowLeft } from '@element-plus/icons-vue'
import { useThemeStore } from './stores/theme'
import UserManager from './components/UserManager.vue'

const route = useRoute()
const themeStore = useThemeStore()

const isAdminRoute = computed(() => route.path === '/admin')
</script>

<style>
* {
  margin: 0;
  padding: 0;
}

/* 主题变量由 src/assets/styles/theme.css 根据 data-theme 提供 */

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-bg);
  color: var(--app-text);
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.top-toolbar-global {
  flex-shrink: 0;
}

.nav-link {
  color: var(--el-text-color-primary);
  text-decoration: none;
  margin-right: 16px;
  font-size: 14px;
}
.nav-link:hover {
  color: var(--el-color-primary);
}
.nav-link.router-link-active {
  color: var(--el-color-primary);
  font-weight: 500;
}
.nav-link .el-icon {
  margin-right: 4px;
  vertical-align: middle;
}

/* 自定义滚动条（随主题变化） */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar-thumb);
  border-radius: 2px;
  transition: background-color 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--app-scrollbar-thumb-hover);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--app-scrollbar-thumb) transparent;
}

/* 防止滚动抖动 */
html, body {
  /* 防止页面整体滚动抖动 */
  overscroll-behavior: none;
  /* 确保滚动行为平滑 */
  scroll-behavior: smooth;
  /* 防止页面整体滚动 */
  overflow-x: hidden;
}

/* 防止容器滚动抖动 */
.app-container,
.main-content,
.left-sidebar,
.right-content,
.keys-tree,
.key-content,
.el-table__body-wrapper,
.el-dialog__body {
  /* 防止过度滚动 */
  overscroll-behavior: contain;
  /* 确保滚动行为平滑 */
  scroll-behavior: smooth;
}

/* 防止滚动条到达底部时的抖动 */
.overflow-y-auto,
[style*="overflow-y: auto"] {
  overscroll-behavior-y: contain;
}

/* 防止水平滚动抖动 */
.overflow-x-auto,
[style*="overflow-x: auto"] {
  overscroll-behavior-x: contain;
}

/* 针对特定组件的滚动优化 */
.keys-tree {
  /* 防止键列表滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

.key-content {
  /* 防止键内容区域滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* 对话框内容滚动优化 */
.el-dialog__body {
  /* 防止对话框内容滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* 搜索历史列表滚动优化 */
.search-history-list {
  /* 防止搜索历史滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* 连接列表滚动优化 */
.connection-list {
  /* 防止连接列表滚动抖动 */
  overscroll-behavior: contain;
  /* 确保滚动位置稳定 */
  scroll-behavior: smooth;
}

/* Element Plus 组件深色主题覆盖 */
.el-button {
  color: var(--el-text-color-primary) !important;
}

.el-button--text {
  color: var(--el-text-color-primary) !important;
}

.el-button--text:hover {
  background-color: var(--el-fill-color) !important;
}

/* 深色主题下的按钮样式覆盖 */
.el-button--info {
  background-color: var(--el-fill-color-dark) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--info:hover {
  background-color: #737373 !important;
  border-color: #737373 !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--info:active {
  background-color: var(--el-fill-color-dark) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--info.is-disabled {
  background-color: var(--el-border-color) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-secondary) !important;
}

/* 确保所有按钮类型在深色主题下都有良好的对比度 */
.el-button--default {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--default:hover {
  background-color: var(--el-border-color) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--default:active {
  background-color: var(--el-bg-color) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--default.is-disabled {
  background-color: var(--el-bg-color) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-secondary) !important;
}

/* 其他按钮类型的深色主题覆盖 */
.el-button--warning {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--warning:hover {
  background-color: #ebb563 !important;
  border-color: #ebb563 !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--warning:active {
  background-color: #cf9236 !important;
  border-color: #cf9236 !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--danger {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--danger:hover {
  background-color: #f78989 !important;
  border-color: #f78989 !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--danger:active {
  background-color: #dd6161 !important;
  border-color: #dd6161 !important;
  color: var(--el-text-color-primary) !important;
}

/* 确保成功和主要按钮类型也有良好的对比度 */
.el-button--success {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--success:hover {
  background-color: #85ce61 !important;
  border-color: #85ce61 !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--primary {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: var(--el-text-color-primary) !important;
}

.el-button--primary:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
  color: #fff !important;
}

/* 有背景色的按钮保持白色文字，两种主题下均可读 */
.el-button--primary,
.el-button--primary:hover,
.el-button--primary:active,
.el-button--success,
.el-button--success:hover,
.el-button--success:active,
.el-button--danger,
.el-button--danger:hover,
.el-button--danger:active,
.el-button--warning,
.el-button--warning:hover,
.el-button--warning:active,
.el-button--info,
.el-button--info:hover,
.el-button--info:active,
.el-select-dropdown__item.selected {
  color: #fff !important;
}

/* 移除强制覆盖，使用主题变量 */

/* 强制覆盖所有输入框样式 - 最高优先级 */
.el-input__inner,
.el-textarea__inner,
.el-input-number .el-input__inner,
.el-select .el-input__inner,
.el-autocomplete .el-input__inner,
.el-cascader .el-input__inner,
.el-date-editor .el-input__inner,
.el-time-picker .el-input__inner,
.el-color-picker .el-input__inner {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 强制覆盖所有输入框占位符 */
.el-input__inner::placeholder,
.el-textarea__inner::placeholder {
  color: var(--el-text-color-secondary) !important;
}

/* 强制覆盖所有输入框包装器 */
.el-input__wrapper,
.el-textarea__wrapper {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

/* 强制覆盖所有select组件 */
.el-select .el-input__inner,
.el-select .el-input__wrapper {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 强制覆盖所有数字输入框 */
.el-input-number .el-input__inner,
.el-input-number .el-input__wrapper {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 强制覆盖对话框中的所有输入框 */
.el-dialog .el-input__inner,
.el-dialog .el-textarea__inner,
.el-dialog .el-input-number .el-input__inner,
.el-dialog .el-select .el-input__inner,
.el-dialog .el-autocomplete .el-input__inner {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-input__inner::placeholder,
.el-dialog .el-textarea__inner::placeholder {
  color: var(--el-text-color-secondary) !important;
}

/* 强制覆盖所有可能的输入框场景 */
input[type="text"],
input[type="number"],
input[type="password"],
input[type="email"],
input[type="search"],
input[type="tel"],
input[type="url"] {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 强制覆盖所有输入框聚焦状态 */
.el-input__inner:focus,
.el-textarea__inner:focus,
.el-input-number .el-input__inner:focus,
.el-select .el-input__inner:focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
}

/* 强制覆盖所有输入框悬停状态 */
.el-input__wrapper:hover,
.el-textarea__wrapper:hover {
  border-color: var(--el-fill-color-dark) !important;
}

/* 强制覆盖下拉菜单样式 */
.el-select-dropdown {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-select-dropdown__item {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
}

.el-select-dropdown__item:hover {
  background-color: var(--el-border-color) !important;
}

.el-select-dropdown__item.selected {
  background-color: #409eff !important;
  color: var(--el-text-color-primary) !important;
}

/* 强制覆盖数字输入框的按钮 */
.el-input-number .el-input-number__decrease,
.el-input-number .el-input-number__increase {
  background-color: var(--el-border-color) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-input-number .el-input-number__decrease:hover,
.el-input-number .el-input-number__increase:hover {
  background-color: var(--el-fill-color-dark) !important;
}

/* 确保下拉选择框正确显示 */
.el-select-dropdown {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-select-dropdown__item {
  color: var(--el-text-color-primary) !important;
}

.el-select-dropdown__item:hover {
  background-color: var(--el-border-color) !important;
}

.el-select-dropdown__item.selected {
  background-color: #409eff !important;
  color: var(--el-text-color-primary) !important;
}

/* 数字输入框按钮样式已由上面的强制覆盖处理 */

.el-table {
  background-color: transparent !important;
  color: var(--el-text-color-primary) !important;
}

.el-table th {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
  border-color: var(--el-border-color) !important;
}

.el-table td {
  background-color: var(--el-bg-color) !important;
  color: var(--el-text-color-primary) !important;
  border-color: var(--el-border-color) !important;
}

.el-table--striped .el-table__body tr.el-table__row--striped td {
  background-color: var(--el-fill-color) !important;
}

.el-table__body tr:hover > td {
  background-color: var(--el-fill-color) !important;
}

.el-tag {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-tag--success {
  background-color: var(--el-color-success) !important;
  border-color: var(--el-color-success) !important;
  color: var(--el-text-color-primary) !important;
}

.el-tag--danger {
  background-color: var(--el-color-danger) !important;
  border-color: var(--el-color-danger) !important;
  color: var(--el-text-color-primary) !important;
}

.el-tag--info {
  background-color: var(--el-fill-color-dark) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-tag--warning {
  background-color: var(--el-color-warning) !important;
  border-color: var(--el-color-warning) !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-dialog__header {
  background-color: var(--el-bg-color-overlay) !important;
  border-bottom-color: var(--el-border-color) !important;
}

.el-dialog__title {
  color: var(--el-text-color-primary) !important;
}

.el-dialog__body {
  color: var(--el-dialog-text-color) !important;
}

.el-dialog__footer {
  border-top-color: var(--el-border-color) !important;
}

/* 对话框按钮的深色主题覆盖 */
.el-dialog .el-button {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button:hover {
  background-color: var(--el-border-color) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--primary {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--primary:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--success {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--success:hover {
  background-color: #85ce61 !important;
  border-color: #85ce61 !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--warning {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--warning:hover {
  background-color: #ebb563 !important;
  border-color: #ebb563 !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--danger {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--danger:hover {
  background-color: #f78989 !important;
  border-color: #f78989 !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--info {
  background-color: var(--el-fill-color-dark) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-dialog .el-button--info:hover {
  background-color: #737373 !important;
  border-color: #737373 !important;
  color: var(--el-text-color-primary) !important;
}

.el-form-item__label {
  color: var(--el-text-color-primary) !important;
}

.el-empty__description {
  color: var(--el-text-color-secondary) !important;
}

.el-message {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-message-box__header {
  background-color: var(--el-bg-color-overlay) !important;
  border-bottom-color: var(--el-border-color) !important;
}

.el-message-box__title {
  color: var(--el-text-color-primary) !important;
}

.el-message-box__content {
  color: var(--el-text-color-primary) !important;
}

.el-message-box__footer {
  border-top-color: var(--el-border-color) !important;
}

/* 消息框按钮的深色主题覆盖 */
.el-message-box .el-button {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button:hover {
  background-color: var(--el-border-color) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--primary {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--primary:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--success {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--success:hover {
  background-color: #85ce61 !important;
  border-color: #85ce61 !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--warning {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--warning:hover {
  background-color: #ebb563 !important;
  border-color: #ebb563 !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--danger {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--danger:hover {
  background-color: #f78989 !important;
  border-color: #f78989 !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--info {
  background-color: var(--el-fill-color-dark) !important;
  border-color: var(--el-fill-color-dark) !important;
  color: var(--el-text-color-primary) !important;
}

.el-message-box .el-button--info:hover {
  background-color: #737373 !important;
  border-color: #737373 !important;
  color: var(--el-text-color-primary) !important;
}

.el-loading-mask {
  background-color: var(--app-mask-bg) !important;
}

.el-skeleton__item {
  background-color: var(--el-fill-color) !important;
}

.el-skeleton__text {
  background-color: var(--el-fill-color) !important;
}

.el-result__title {
  color: var(--el-text-color-primary) !important;
}

.el-result__subtitle {
  color: var(--el-text-color-secondary) !important;
}

.el-alert {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

.el-alert__title {
  color: var(--el-text-color-primary) !important;
}

.el-alert__description {
  color: var(--el-text-color-secondary) !important;
}

/* 自动完成下拉框 */
.el-autocomplete-suggestion {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-autocomplete-suggestion__list {
  background-color: var(--el-bg-color-overlay) !important;
}

.el-autocomplete-suggestion__list li {
  color: var(--el-text-color-primary) !important;
  background-color: var(--el-bg-color-overlay) !important;
}

.el-autocomplete-suggestion__list li:hover {
  background-color: var(--el-border-color) !important;
}

.el-autocomplete-suggestion__list li.highlighted {
  background-color: #409eff !important;
  color: var(--el-text-color-primary) !important;
}

.el-switch__label {
  color: var(--el-text-color-primary) !important;
}

.el-switch__core {
  border-color: var(--el-border-color) !important;
}

.el-switch.is-checked .el-switch__core {
  background-color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary) !important;
}

.el-loading-spinner .el-loading-text {
  color: var(--el-text-color-primary) !important;
}

.el-loading-spinner .path {
  stroke: var(--el-color-primary) !important;
}

/* 确保下拉菜单中的文字清晰可见 */
.el-dropdown-menu {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-dropdown-menu__item {
  color: var(--el-text-color-primary) !important;
}

.el-dropdown-menu__item:hover {
  background-color: var(--el-fill-color) !important;
}

/* 确保分页组件文字清晰可见 */
.el-pagination {
  color: var(--el-text-color-primary) !important;
}

.el-pagination .el-pager li {
  background-color: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
  border-color: var(--el-border-color) !important;
}

.el-pagination .el-pager li:hover {
  background-color: var(--el-fill-color) !important;
}

.el-pagination .el-pager li.is-active {
  background-color: var(--el-color-primary) !important;
  color: var(--el-text-color-primary) !important;
}

/* 确保工具提示文字清晰可见 */
.el-tooltip__popper {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
  color: var(--el-text-color-primary) !important;
}

/* 确保选择器组件文字清晰可见 */
.el-cascader {
  color: var(--el-text-color-primary) !important;
}

.el-cascader .el-input__inner {
  color: var(--el-text-color-primary) !important;
}

.el-cascader__dropdown {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

.el-cascader-node {
  color: var(--el-text-color-primary) !important;
}

.el-cascader-node:hover {
  background-color: var(--el-fill-color) !important;
}

.el-cascader-node.is-active {
  background-color: var(--el-color-primary) !important;
  color: var(--el-text-color-primary) !important;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-toolbar {
  height: 60px;
  background-color: var(--app-toolbar-bg);
  border-bottom: 1px solid var(--app-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-manager-btn {
  background-color: #409eff;
  border-color: #409eff;
  color: white;
}

.connection-manager-btn:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.new-connection-btn {
  background-color: #67c23a;
  border-color: #67c23a;
  color: white;
}

.new-connection-btn:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

.toolbar-btn {
  color: var(--el-text-color-primary);
  background: transparent;
  border: none;
}

.toolbar-btn:hover {
  background-color: var(--app-fill-hover);
}

.theme-toggle .theme-label {
  margin-left: 4px;
}

.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.connection-tab {
  background-color: var(--app-tab-bg);
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.close-icon {
  cursor: pointer;
  font-size: 12px;
}

.close-icon:hover {
  color: #f56c6c;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.auto-refresh-switch {
  --el-switch-on-color: #67c23a;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.left-sidebar {
  width: 300px;
  background-color: var(--app-sidebar-bg);
  border-right: 1px solid var(--app-border);
  overflow: hidden;
  min-width: 300px;
  max-width: 300px;
}

.right-content {
  flex: 1;
  background-color: var(--app-content-bg);
  overflow: hidden;
  padding: 0;
}

.no-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.no-connection-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}
</style> 