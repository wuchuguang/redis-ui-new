# List编辑功能修复测试

## 问题描述
List类型的键在编辑时，添加新的项目后刷新还是原来的内容，说明编辑功能没有正确保存到后端。

## 问题原因
`handleValueEdit`方法只是模拟了成功，没有真正调用后端API来更新值。

## 修复内容

### 1. 前端修复
- 在`connection.js`中添加了`updateKeyValue`方法
- 修改`handleValueEdit`方法，真正调用后端API
- 添加了操作日志记录

### 2. 后端修复
- 在`redis.js`中添加了`updateKeyValue`方法
- 在`keys.js`中添加了PUT `/api/connections/:id/:db/keys/:keyName/value`路由
- 支持所有数据类型的值更新

## 测试步骤

### 1. List编辑功能测试
- [ ] 选择一个List类型的键
- [ ] 点击"编辑"按钮打开编辑对话框
- [ ] 在"新列表项"输入框中输入新项目
- [ ] 点击"添加项目"按钮
- [ ] 验证新项目出现在列表中
- [ ] 点击"保存"按钮
- [ ] 验证对话框关闭
- [ ] 刷新页面或重新加载键值
- [ ] 验证新项目仍然存在

### 2. List项目删除测试
- [ ] 在编辑对话框中点击某个项目的"删除"按钮
- [ ] 验证项目从列表中移除
- [ ] 点击"保存"按钮
- [ ] 刷新页面验证项目确实被删除

### 3. 其他数据类型测试
- [ ] 测试String类型的值更新
- [ ] 测试Set类型的值更新
- [ ] 测试ZSet类型的值更新
- [ ] 测试Hash类型的值更新

## 技术实现

### 前端API调用
```javascript
const result = await connectionStore.updateKeyValue(
  props.connection.id,
  props.database,
  keyData.value.key,
  keyData.value.type,
  editForm.value
)
```

### 后端更新逻辑
```javascript
case 'list':
  // 删除原键并重新创建
  await client.del(keyName);
  if (Array.isArray(value) && value.length > 0) {
    await client.rPush(keyName, value);
  }
  break;
```

### API路由
```
PUT /api/connections/:id/:db/keys/:keyName/value
```

## 验证要点

1. **数据持久化**：编辑后的数据能正确保存到Redis
2. **数据一致性**：前端显示与后端存储保持一致
3. **错误处理**：网络错误或权限错误能正确处理
4. **操作日志**：编辑操作能正确记录到日志
5. **用户体验**：编辑过程流畅，有适当的加载状态

## 注意事项

- List类型的更新采用删除重建的方式，确保数据完整性
- 支持空List（删除所有项目）
- 保持原有的TTL设置
- 操作日志记录包含数据类型信息 