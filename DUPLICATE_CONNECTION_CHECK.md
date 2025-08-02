# 重复连接检查功能

## 功能概述

为了防止用户添加重复的Redis连接，系统现在会在创建连接时检查是否已存在相同的Redis服务器连接（相同的主机、端口和数据库）。

## 检查规则

### 默认重复连接检查
- **主机地址相同** (`host`)
- **端口号相同** (`port`) 
- **数据库编号相同** (`database`)

### 自定义检查选项
- 可以通过 `options.checkDatabase` 参数控制是否检查数据库
- `checkDatabase: true` - 检查数据库（默认，推荐）
- `checkDatabase: false` - 不检查数据库

### 不检查的字段
- **连接名称** (`name`) - 允许使用不同的名称
- **密码** (`password`) - 允许使用不同的密码

## 功能特性

### 1. 登录用户连接检查
- 在创建新连接时，检查用户账户中是否已存在相同的Redis连接
- 如果存在重复连接，返回错误信息并显示现有连接的名称
- 错误信息格式：`已存在相同的Redis连接: [现有连接名称]`

### 2. 临时连接检查
- 未登录用户创建临时连接时，检查本地临时连接列表中是否有重复
- 如果存在重复，显示错误信息并阻止创建

### 3. 连接合并检查
- 用户登录后，合并临时连接到正式账户时，检查是否与现有连接重复
- 重复的连接会被跳过，不会创建新的连接配置
- 显示合并统计信息：成功合并数量和跳过数量

## 技术实现

### 后端实现

#### 连接服务 (`server/services/connection.js`)
```javascript
// 检查用户是否已有相同的Redis连接
const checkDuplicateConnection = async (username, connectionData) => {
  try {
    const userConnections = await getUserConnections(username);
    
    // 检查是否存在相同的Redis服务器连接（主机、端口、数据库相同）
    const duplicateConnection = userConnections.find(conn => 
      conn.redis.host === connectionData.host &&
      conn.redis.port === connectionData.port &&
      conn.redis.database === (connectionData.database || 0)
    );
    
    return duplicateConnection || null;
  } catch (error) {
    throw new Error(`检查重复连接失败: ${error.message}`);
  }
};
```

#### 连接路由 (`server/routes/connections.js`)
```javascript
// 检查是否已存在相同的Redis连接
const duplicateConnection = await connectionService.checkDuplicateConnection(username, connectionConfig);
if (duplicateConnection) {
  return res.status(400).json({
    success: false,
    message: `已存在相同的Redis连接: ${duplicateConnection.redis.name}`,
    data: {
      existingConnection: {
        id: duplicateConnection.id,
        name: duplicateConnection.redis.name,
        host: duplicateConnection.redis.host,
        port: duplicateConnection.redis.port,
        database: duplicateConnection.redis.database
      }
    }
  });
}
```

### 前端实现

#### 连接Store (`client/src/stores/connection.js`)
```javascript
// 处理重复连接错误
if (error.response?.status === 400 && error.response?.data?.message?.includes('已存在相同的Redis连接')) {
  const existingConnection = error.response.data.data?.existingConnection
  if (existingConnection) {
    ElMessage.error(`已存在相同的Redis连接: ${existingConnection.name}`)
  } else {
    ElMessage.error(error.response.data.message)
  }
} else {
  ElMessage.error(error.response?.data?.message || '创建连接配置失败')
}
```

#### 临时连接检查
```javascript
// 检查是否已存在相同的临时连接
const existingTempConnection = tempConnections.value.find(conn => 
  conn.host === connectionData.host &&
  conn.port === connectionData.port &&
  conn.database === connectionData.database
)

if (existingTempConnection) {
  ElMessage.error(`已存在相同的临时连接: ${existingTempConnection.name}`)
  return false
}
```

## 错误处理

### 错误响应格式
```json
{
  "success": false,
  "message": "已存在相同的Redis连接: 本地Redis",
  "data": {
    "existingConnection": {
      "id": "connection-id",
      "name": "本地Redis",
      "host": "localhost",
      "port": 6379,
      "database": 0
    }
  }
}
```

### 错误消息示例
- `已存在相同的Redis连接: 本地Redis`
- `已存在相同的Redis服务器连接: 本地Redis (数据库 0)`
- `已存在相同的临时连接: 测试连接`
- `成功合并 2 个临时连接，跳过 1 个重复连接`

## 使用场景

### 1. 防止重复添加
- 用户尝试添加已存在的Redis服务器连接
- 系统提示现有连接名称，避免重复创建

### 2. 临时连接管理
- 未登录用户创建临时连接时防止重复
- 登录后合并临时连接时智能处理重复

### 3. 多数据库支持
- 同一Redis服务器的不同数据库可以分别添加
- 例如：localhost:6379:0 和 localhost:6379:1 是不同的连接

## 用户体验

### 1. 清晰的错误提示
- 显示现有连接的名称
- 明确说明重复的原因

### 2. 智能合并处理
- 自动跳过重复的临时连接
- 显示详细的合并统计信息

### 3. 保持数据一致性
- 防止同一Redis服务器被重复添加
- 确保连接列表的整洁性

## 注意事项

1. **密码不参与重复检查** - 同一Redis服务器可以使用不同的密码
2. **连接名称可以不同** - 允许使用不同的名称引用同一服务器
3. **数据库编号参与检查** - 不同数据库被视为不同的连接
4. **临时连接和正式连接分别检查** - 临时连接不会与正式连接冲突

## 未来扩展

1. **连接别名支持** - 允许为同一连接创建多个别名
2. **连接分组** - 将相关连接组织到分组中
3. **连接模板** - 提供常用的连接配置模板
4. **批量导入检查** - 批量导入连接时的重复检查 