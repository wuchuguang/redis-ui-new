# Redis Value JSON编辑功能

## 功能概述

为Redis value的编辑框添加了完整的JSON支持，包括格式化、验证、压缩等功能。

## 支持的数据类型

### 1. String类型值编辑（专用对话框）
- 在String值的专用编辑对话框中添加了JSON工具栏
- 支持JSON格式化和验证
- 实时JSON语法检查

### 2. Hash字段值编辑
- 在Hash字段的编辑对话框中添加了JSON工具栏
- 支持JSON格式化和验证
- 实时JSON语法检查

### 3. 主编辑对话框String类型
- 在主编辑对话框的String类型编辑中也添加了JSON工具栏
- 支持JSON格式化和验证
- 实时JSON语法检查

## 功能特性

### JSON工具栏功能

#### 1. 格式化JSON
- 将JSON字符串格式化为易读的格式
- 自动添加适当的缩进和换行
- 仅在JSON格式有效时可用

#### 2. 验证JSON
- 检查JSON格式是否正确
- 显示详细的错误信息
- 实时验证输入内容

#### 3. 压缩JSON
- 将格式化的JSON压缩为单行
- 减少存储空间
- 仅在JSON格式有效时可用

#### 4. 清空内容
- 快速清空编辑框内容
- 重置验证状态

### 智能验证

- 自动检测JSON格式，但不主动显示错误信息
- 只在用户主动点击"验证JSON"按钮时才显示详细错误信息
- 有效JSON时显示绿色成功提示
- 避免对非JSON内容的干扰

### 用户体验

- 使用等宽字体（Monaco/Menlo）显示JSON
- 更大的编辑框（12行）提供更好的编辑体验
- 工具栏按钮状态根据JSON有效性动态变化
- 中文提示信息，符合用户习惯

## 技术实现

### 组件修改
- `KeyValueDisplay.vue`: 主要编辑组件
- 添加了JSON处理相关的响应式数据
- 实现了JSON验证和格式化方法
- 添加了相应的CSS样式

### 功能方法

#### JSON验证
```javascript
const validateJsonInput = () => {
  if (!editStringForm.value || !editStringForm.value.trim()) {
    jsonError.value = ''
    isValidJson.value = false
    return
  }
  
  try {
    JSON.parse(editStringForm.value)
    jsonError.value = ''
    isValidJson.value = true
  } catch (error) {
    jsonError.value = `JSON格式错误: ${error.message}`
    isValidJson.value = false
  }
}
```

#### JSON格式化
```javascript
const formatJson = () => {
  if (!isValidJson.value) return
  
  try {
    const parsed = JSON.parse(editStringForm.value)
    editStringForm.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON格式化完成')
  } catch (error) {
    ElMessage.error('JSON格式化失败')
  }
}
```

### 样式特性

- 工具栏使用浅色背景，与编辑框分离
- 成功状态显示绿色提示信息
- 按钮状态根据功能可用性动态变化
- 避免对普通字符串内容的视觉干扰

## 使用场景

1. **存储JSON配置数据**: 在Redis中存储应用配置信息
2. **API响应缓存**: 缓存API返回的JSON数据
3. **用户偏好设置**: 存储用户个性化设置
4. **数据结构存储**: 存储复杂的数据结构

## 注意事项

- JSON验证基于JavaScript的`JSON.parse()`方法
- 格式化使用2个空格缩进
- 错误信息使用中文显示
- 所有操作都有相应的成功/失败提示

## 未来扩展

- 支持JSON Schema验证
- 添加JSON路径查询功能
- 支持JSON差异比较
- 添加JSON模板功能 