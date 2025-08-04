# TTL对话框标识符重复声明修复

## 问题描述
在KeyValueDisplay.vue中，`showSetTTLDialog`既被声明为响应式变量，又被声明为函数，导致标识符重复声明错误。

## 错误信息
```
[plugin:vite:vue] [vue/compiler-sfc] Identifier 'showSetTTLDialog' has already been declared. (1007:6)
```

## 修复方案
将函数名从`showSetTTLDialog`重命名为`openSetTTLDialog`，避免与响应式变量名冲突。

## 修复内容

### 1. 函数重命名
```javascript
// 修复前
const showSetTTLDialog = () => {
  showSetTTLDialog.value = true
}

// 修复后
const openSetTTLDialog = () => {
  showSetTTLDialog.value = true
}
```

### 2. 模板更新
```vue
<!-- 修复前 -->
<el-button @click="showSetTTLDialog">

<!-- 修复后 -->
<el-button @click="openSetTTLDialog">
```

## 验证步骤
1. [ ] 编译无错误
2. [ ] TTL设置按钮正常工作
3. [ ] 对话框可以正常打开和关闭
4. [ ] TTL设置功能完整可用

## 命名规范
- 响应式变量：`showSetTTLDialog`（表示状态）
- 函数：`openSetTTLDialog`（表示动作）

## 注意事项
- 避免变量名和函数名重复
- 使用语义化的命名区分状态和动作
- 保持代码的一致性和可读性 