# 对话框组件架构

## 概述
为了遵循模块化设计原则，所有对话框功能都使用独立的组件来开发。这样可以提高代码的可维护性、可复用性和可测试性。

## 组件架构

### 1. BaseDialog.vue
**基础对话框组件**
- 提供基础的对话框功能
- 支持所有Element Plus Dialog的属性和事件
- 统一的样式和交互行为
- 可扩展的基础组件

**特性：**
- 支持v-model双向绑定
- 统一的样式（圆角、边框等）
- 支持拖拽（可选）
- 支持键盘事件
- 统一的事件处理

### 2. FormDialog.vue
**表单对话框组件**
- 基于BaseDialog构建
- 专门用于表单操作的对话框
- 内置表单验证和提交逻辑
- 统一的按钮布局和交互

**特性：**
- 自动表单验证
- 内置确认/取消按钮
- 支持loading状态
- 暴露表单方法（validate、resetFields等）
- 统一的事件处理

### 3. SetTTLDialog.vue
**TTL设置对话框组件**
- 基于FormDialog构建
- 专门用于设置Redis键的TTL
- 包含时间单位转换和预览功能

**特性：**
- 多种时间单位支持（秒、分钟、小时、天）
- 实时TTL预览
- 表单验证
- 操作日志记录
- 成功事件回调

## 使用方式

### 基础对话框
```vue
<template>
  <BaseDialog
    v-model="showDialog"
    title="基础对话框"
    width="500px"
  >
    <div>对话框内容</div>
  </BaseDialog>
</template>
```

### 表单对话框
```vue
<template>
  <FormDialog
    v-model="showFormDialog"
    title="表单对话框"
    :form-data="formData"
    :rules="formRules"
    :loading="loading"
    @confirm="handleConfirm"
  >
    <el-form-item label="名称" prop="name">
      <el-input v-model="formData.name" />
    </el-form-item>
  </FormDialog>
</template>
```

### TTL设置对话框
```vue
<template>
  <SetTTLDialog
    v-model="showTTLDialog"
    :connection="connection"
    :database="database"
    :key-name="keyName"
    @success="handleTTLSetSuccess"
  />
</template>
```

## 组件层次结构

```
BaseDialog.vue (基础对话框)
├── FormDialog.vue (表单对话框)
│   └── SetTTLDialog.vue (TTL设置对话框)
└── 其他专用对话框组件
```

## 设计原则

### 1. 单一职责原则
- 每个组件只负责一个特定的功能
- BaseDialog负责基础对话框功能
- FormDialog负责表单对话框功能
- SetTTLDialog负责TTL设置功能

### 2. 开闭原则
- 对扩展开放，对修改封闭
- 可以通过继承BaseDialog创建新的对话框类型
- 可以通过继承FormDialog创建新的表单对话框

### 3. 依赖倒置原则
- 高层组件不依赖低层组件
- 都依赖抽象（接口）
- 通过props和events进行通信

### 4. 接口隔离原则
- 组件只暴露必要的方法和属性
- 通过defineExpose控制对外接口
- 通过props和emits定义清晰的契约

## 扩展指南

### 创建新的对话框组件

1. **继承BaseDialog**（如果需要基础对话框功能）
```vue
<template>
  <BaseDialog
    v-model="visible"
    title="自定义对话框"
    width="600px"
  >
    <!-- 自定义内容 -->
  </BaseDialog>
</template>
```

2. **继承FormDialog**（如果需要表单功能）
```vue
<template>
  <FormDialog
    v-model="visible"
    title="自定义表单对话框"
    :form-data="formData"
    :rules="rules"
    @confirm="handleConfirm"
  >
    <!-- 表单字段 -->
  </FormDialog>
</template>
```

### 最佳实践

1. **组件命名**：使用功能名+Dialog的命名方式
2. **Props设计**：只传递必要的props，避免过度耦合
3. **事件设计**：使用语义化的事件名（如success、error、cancel等）
4. **样式隔离**：使用scoped样式，避免样式污染
5. **文档化**：为每个组件编写使用文档和示例

## 文件结构

```
client/src/components/
├── dialogs/
│   ├── index.js          # 组件导出
│   ├── BaseDialog.vue    # 基础对话框
│   └── FormDialog.vue    # 表单对话框
├── SetTTLDialog.vue      # TTL设置对话框
└── 其他对话框组件...
```

## 优势

1. **可维护性**：每个组件职责单一，易于维护
2. **可复用性**：基础组件可以在多个地方复用
3. **可测试性**：组件独立，便于单元测试
4. **可扩展性**：基于基础组件可以快速创建新的对话框
5. **一致性**：统一的交互和样式体验
6. **性能**：按需加载，减少不必要的代码

## 注意事项

1. **避免过度抽象**：不要为了抽象而抽象
2. **保持简单**：优先使用简单直接的解决方案
3. **向后兼容**：修改组件时保持向后兼容
4. **性能考虑**：合理使用v-model和watch
5. **错误处理**：提供完善的错误处理机制 