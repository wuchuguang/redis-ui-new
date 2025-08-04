# 二次确认对话框功能总结

## 概述
为了防止用户误操作，系统为重要的危险操作都添加了二次确认对话框。这些操作包括删除、清除TTL等不可恢复的操作。

## 已实现的二次确认功能

### 1. 清除TTL操作
**位置**：`KeyValueDisplay.vue` - `clearTTL`方法

**触发条件**：点击"清除"按钮（当键有过期时间时）

**确认对话框内容**：
- **标题**：确认清除TTL
- **内容**：确定要清除键 "键名" 的过期时间吗？清除后该键将永不过期。
- **按钮**：确定清除 / 取消
- **类型**：warning

**技术实现**：
```javascript
await ElMessageBox.confirm(
  `确定要清除键 "${keyData.value.key}" 的过期时间吗？\n\n清除后该键将永不过期。`,
  '确认清除TTL',
  {
    confirmButtonText: '确定清除',
    cancelButtonText: '取消',
    type: 'warning',
    dangerouslyUseHTMLString: false
  }
)
```

### 2. 删除键操作
**位置**：`KeyValueDisplay.vue` - `deleteKey`方法

**触发条件**：点击"删除键"按钮

**确认对话框内容**：
- **标题**：确认删除
- **内容**：确定要删除键 "键名" 吗？此操作不可恢复！
- **按钮**：删除 / 取消
- **类型**：danger

**技术实现**：使用操作锁定组件（OperationLock）实现

### 3. 删除Hash字段操作
**位置**：`KeyValueDisplay.vue` - `deleteHashField`方法

**触发条件**：点击Hash字段的"删除"按钮

**确认对话框内容**：
- **标题**：确认删除
- **内容**：确定要删除字段 "字段名" 吗？此操作不可恢复！
- **按钮**：确定 / 取消
- **类型**：warning

### 4. 批量删除Hash字段操作
**位置**：`KeyValueDisplay.vue` - `batchDeleteHashFields`方法

**触发条件**：点击"批量删除"按钮（在Hash筛选模式下）

**确认对话框内容**：
- **标题**：确认批量删除
- **内容**：确定要删除 X 个字段吗？此操作不可恢复！字段列表：字段1, 字段2, ...
- **按钮**：确定 / 取消
- **类型**：warning

## 设计原则

### 1. 一致性原则
- 所有危险操作都使用二次确认
- 确认对话框的样式和交互保持一致
- 按钮文本和类型统一

### 2. 信息充分原则
- 明确说明要操作的对象（键名、字段名等）
- 清楚说明操作的后果
- 提醒用户操作不可恢复

### 3. 用户体验原则
- 提供取消选项
- 使用适当的图标和颜色
- 支持键盘操作（ESC取消）

### 4. 安全性原则
- 防止误操作
- 区分用户取消和系统错误
- 使用纯文本避免HTML注入

## 错误处理

### 用户取消处理
```javascript
catch (error) {
  if (error === 'cancel') {
    // 用户取消操作，不需要处理
    return
  }
  // 处理实际错误
  console.error('操作失败:', error)
}
```

### 操作锁定
对于特别重要的操作（如删除键），使用操作锁定组件：
- 防止重复操作
- 提供更详细的确认信息
- 支持操作撤销

## 最佳实践

### 1. 确认对话框配置
```javascript
await ElMessageBox.confirm(
  message,           // 确认消息
  title,             // 对话框标题
  {
    confirmButtonText: '确认按钮文本',
    cancelButtonText: '取消按钮文本',
    type: 'warning',  // 或 'danger'
    dangerouslyUseHTMLString: false  // 安全考虑
  }
)
```

### 2. 消息内容规范
- 包含操作对象的具体信息
- 说明操作的后果
- 提醒操作不可恢复
- 使用中文，符合用户习惯

### 3. 按钮文本规范
- 确认按钮：使用具体的动作（如"删除"、"清除"）
- 取消按钮：统一使用"取消"
- 避免使用"确定"等模糊词汇

## 扩展指南

### 添加新的二次确认操作

1. **确定是否需要二次确认**
   - 操作是否不可恢复？
   - 操作是否影响重要数据？
   - 操作是否容易误触发？

2. **实现确认对话框**
   ```javascript
   const performDangerousOperation = async () => {
     try {
       await ElMessageBox.confirm(
         '确认消息',
         '确认标题',
         {
           confirmButtonText: '确认',
           cancelButtonText: '取消',
           type: 'warning'
         }
       )
       
       // 执行实际操作
       await actualOperation()
       
     } catch (error) {
       if (error === 'cancel') return
       // 处理错误
     }
   }
   ```

3. **添加操作日志**
   ```javascript
   operationLogger.logOperation('操作类型', '操作对象', connection)
   ```

## 注意事项

1. **不要过度使用**：不是所有操作都需要二次确认
2. **保持一致性**：确认对话框的样式和交互要统一
3. **提供足够信息**：让用户清楚知道要做什么
4. **支持取消**：用户应该能够轻松取消操作
5. **错误处理**：区分用户取消和系统错误 