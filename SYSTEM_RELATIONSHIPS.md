# Redis Web 管理系统 - 组件关联关系文档

## 📋 目录
1. [系统架构概览](#系统架构概览)
2. [用户管理模块](#用户管理模块)
3. [连接管理模块](#连接管理模块)
4. [数据操作模块](#数据操作模块)
5. [分享功能模块](#分享功能模块)
6. [权限控制模块](#权限控制模块)
7. [状态管理模块](#状态管理模块)
8. [数据流转关系](#数据流转关系)
9. [API接口关系](#api接口关系)

---

## 🏗️ 系统架构概览

### 整体架构
```
前端 (Vue 3 + Element Plus)
    ↓ HTTP/WebSocket
后端 (Node.js + Express)
    ↓ Redis Client
Redis 数据库
```

### 核心组件关系
```
用户管理 ←→ 连接管理 ←→ Redis操作
    ↓           ↓           ↓
权限验证 ←→ 状态同步 ←→ 数据展示
```

---

## 👤 用户管理模块

### 用户数据结构
```javascript
用户 {
  username: String,           // 用户名（唯一标识）
  password: String,           // 加密密码
  role: String,              // 角色：admin/user/guest
  connections: Array,         // 用户私有连接配置
  shareConnections: Array,    // 分享给其他用户的连接
  friendConnections: Array,   // 从其他用户接收的分享连接
  createdAt: Date,           // 创建时间
  lastLogin: Date            // 最后登录时间
}
```

### 用户状态管理
- **前端状态** (`client/src/stores/user.js`)
  - `currentUser`: 当前登录用户信息
  - `token`: JWT认证令牌
  - `isLoggedIn`: 登录状态
  - `userRole`: 用户角色

- **后端状态** (`server/services/user.js`)
  - `users`: 内存中的用户数据Map
  - 文件持久化：`server/users/*.json`

### 用户操作流程
1. **注册** → 创建用户文件 → 加密存储
2. **登录** → 验证密码 → 生成JWT → 返回用户信息
3. **权限验证** → 中间件检查JWT → 获取用户信息
4. **角色管理** → admin可管理其他用户

### 登录状态持久化
- **记住密码**: 存储在 `localStorage`
- **记住登录状态**: JWT令牌存储在 `localStorage`
- **自动刷新**: Axios拦截器自动刷新过期令牌 

### 连接配置与连接实例分离
- **连接配置**: 保存的连接参数，不包含实际连接状态
- **连接实例**: 实际的Redis客户端连接，包含实时状态
- **分离好处**: 配置可以持久化，连接状态实时更新

---

## 📊 数据操作模块

### Redis操作分类

#### 1. 连接级操作
- **获取连接信息**: `getConnectionInfo()`
- **测试连接**: `testConnection()`
- **关闭连接**: `closeConnection()`
- **重连**: `reconnectConnection()`

#### 2. 键值操作
- **获取键列表**: `getKeys()`
- **获取键值**: `getKeyValue()`
- **重命名键**: `renameKey()`
- **删除键组**: `deleteKeyGroup()`

#### 3. Hash操作
- **更新字段**: `updateHashField()`
- **删除字段**: `deleteHashField()`
- **批量删除**: `batchDeleteHashFields()`

#### 4. String操作
- **更新值**: `updateStringValue()`

### 操作权限验证
```javascript
// 每次操作前验证
validateConnectionPermission(username, connectionId) {
  const userConnections = userService.getUserAllConnections(username);
  return userConnections.some(conn => conn.id === connectionId);
}
```

### 操作历史记录
```javascript
操作记录 {
  id: String,                // 操作ID
  connectionId: String,      // 连接ID
  operator: String,          // 操作者用户名
  operation: String,         // 操作类型
  target: String,            // 操作目标（键名等）
  details: Object,           // 操作详情
  timestamp: Date,           // 操作时间
  result: String             // 操作结果
}
```

### 数据操作流程
```
1. 前端选择连接和操作
2. 后端验证用户权限
3. 执行Redis操作
4. 记录操作历史
5. 返回操作结果
6. 更新前端UI
```

---

## 🔄 分享功能模块

### 分享机制

#### 1. 分享流程
```
所有者选择连接 → 生成分享码 → 保存分享记录 → 返回分享码
```

#### 2. 加入分享
```
用户输入分享码 → 验证分享码 → 添加到friendConnections → 返回连接信息
```

#### 3. 分享数据结构
```javascript
分享记录 {
  connectionId: String,      // 被分享的连接ID
  shareCode: String,         // 分享码
  owner: String,             // 分享者
  sharedAt: Date,           // 分享时间
  expiresAt: Date           // 过期时间（可选）
}
```

### 分享权限控制
- **分享者权限**: 可以取消分享、修改分享设置
- **接收者权限**: 只读操作，不能修改连接配置
- **数据隔离**: 接收者只能看到被分享的连接

### 分享状态显示
- **私有连接**: 显示"编辑"、"分享"、"删除"按钮
- **分享连接**: 显示"来自: xxx"标签，只读操作
- **分享出去的连接**: 显示"已分享"状态

---

## 🔐 权限控制模块

### 角色权限矩阵

| 操作 | Guest | User | Admin |
|------|-------|------|-------|
| 查看连接 | ✅ | ✅ | ✅ |
| 创建临时连接 | ✅ | ✅ | ✅ |
| 保存连接配置 | ❌ | ✅ | ✅ |
| 分享连接 | ❌ | ✅ | ✅ |
| 管理用户 | ❌ | ❌ | ✅ |
| 系统设置 | ❌ | ❌ | ✅ |

### 连接权限验证
```javascript
// 连接操作权限检查
function checkConnectionPermission(user, connectionId) {
  // 1. 检查是否为私有连接
  if (user.connections.some(c => c.id === connectionId)) {
    return { canEdit: true, canDelete: true, canShare: true };
  }
  
  // 2. 检查是否为分享连接
  if (user.friendConnections.some(c => c.id === connectionId)) {
    return { canEdit: false, canDelete: false, canShare: false };
  }
  
  // 3. 检查是否为分享出去的连接
  if (user.shareConnections.some(c => c.id === connectionId)) {
    return { canEdit: true, canDelete: true, canShare: true };
  }
  
  return { canEdit: false, canDelete: false, canShare: false };
}
```

### API权限验证
```javascript
// 中间件验证
authenticateToken(req, res, next) {
  // 验证JWT令牌
  // 设置req.user
}

// 连接权限验证
validateConnectionPermission(username, connectionId) {
  // 检查用户是否有权限操作该连接
}
```

---

## 📱 状态管理模块

### 前端状态同步

#### 1. 连接状态同步
```javascript
// 自动刷新机制
watch(autoRefresh, (newValue) => {
  if (newValue && currentConnection.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

// 连接变化监听
watch(currentConnection, (newConnection) => {
  if (newConnection) {
    refreshData();
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});
```

#### 2. 用户状态同步
```javascript
// 登录状态变化
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    fetchConnections();  // 获取用户连接
    mergeTempConnections(); // 合并临时连接
  } else {
    clearConnections();  // 清除连接
  }
});
```

### 后端状态管理

#### 1. Redis连接池管理
```javascript
// 连接实例管理
const redisConnections = new Map();
// key: connectionId
// value: { client: RedisClient, config: ConnectionConfig }

// 连接生命周期
createConnection() → establishConnection() → manageConnection() → closeConnection()
```

#### 2. 用户会话管理
```javascript
// JWT令牌管理
{
  token: String,           // JWT令牌
  expiresAt: Date,         // 过期时间
  refreshToken: String     // 刷新令牌
}
```

### 状态同步机制
- **实时状态**: 通过轮询获取连接状态
- **事件驱动**: 连接状态变化时更新UI
- **自动重连**: 连接断开时自动尝试重连
- **状态持久化**: 重要状态保存到localStorage 

---

## 🔄 数据流转关系

### 1. 用户登录流程
```
前端登录表单 → 后端验证 → 生成JWT → 返回用户信息 → 前端存储状态 → 获取用户连接
```

### 2. 连接创建流程
```
前端输入配置 → 后端保存配置 → 返回连接ID → 前端更新连接列表 → 可选择建立连接
```

### 3. 数据操作流程
```
前端选择连接 → 验证权限 → 执行Redis操作 → 记录操作历史 → 返回结果 → 更新UI
```

### 4. 分享操作流程
```
所有者分享连接 → 生成分享码 → 保存分享记录 → 接收者输入分享码 → 验证并添加连接
```

### 5. 状态同步流程
```
后端状态变化 → 前端轮询检测 → 更新连接状态 → 刷新UI显示 → 触发相关操作
```

---

## 🌐 API接口关系

### 认证相关API
```
POST /api/auth/login          - 用户登录
POST /api/auth/register       - 用户注册
POST /api/auth/refresh-token  - 刷新令牌
GET  /api/auth/profile        - 获取用户信息
```

### 连接管理API
```
GET    /api/connections           - 获取连接列表
POST   /api/connections           - 创建连接配置
POST   /api/connections/establish - 建立连接（未登录）
POST   /api/connections/:id/connect - 建立连接（已登录）
POST   /api/connections/:id/connect-shared - 建立分享连接
PUT    /api/connections/:id       - 更新连接配置
DELETE /api/connections/:id       - 删除连接配置
POST   /api/connections/:id/share - 分享连接
POST   /api/connections/join      - 加入分享连接
```

### Redis操作API
```
GET    /api/keys/:id/:db/keys           - 获取键列表
GET    /api/keys/:id/:db/key/*          - 获取键值
PUT    /api/keys/:id/:db/key/:oldKeyName/rename - 重命名键
PUT    /api/keys/:id/:db/hash/:keyName/field - 更新Hash字段
PUT    /api/keys/:id/:db/string/:keyName - 更新String值
DELETE /api/keys/:id/:db/hash/:keyName/field - 删除Hash字段
DELETE /api/keys/:id/:db/hash/:keyName/fields - 批量删除Hash字段
DELETE /api/keys/:id/:db/keys/group/:prefix - 删除键组
```

### 分享功能API
```
POST /api/connections/:id/share - 分享连接
POST /api/connections/join      - 加入分享连接
```

### 操作历史API
```
GET /api/operations/:connectionId - 获取操作历史
POST /api/operations             - 记录操作
```

### 用户管理API
```
GET    /api/users                - 获取用户列表（管理员）
PUT    /api/users/:username/role - 更新用户角色
DELETE /api/users/:username      - 删除用户
```

---

## 🔧 关键依赖关系

### 前端依赖
- **Vue 3**: 响应式框架
- **Pinia**: 状态管理
- **Element Plus**: UI组件库
- **Axios**: HTTP客户端

### 后端依赖
- **Express**: Web框架
- **Redis**: 数据库客户端
- **JWT**: 身份认证
- **bcrypt**: 密码加密
- **crypto**: 数据加密

### 数据存储
- **用户数据**: JSON文件 + 加密
- **连接配置**: 用户数据文件中
- **操作历史**: 文件系统
- **临时数据**: localStorage

---

## 🚀 扩展性设计

### 1. 多用户支持
- 后端支持多用户同时操作同一连接
- 权限验证确保数据安全
- 操作历史记录操作者信息

### 2. 连接共享
- 灵活的分享机制
- 权限隔离
- 分享码管理

### 3. 状态同步
- 实时状态更新
- 自动重连机制
- 错误处理

### 4. 安全性
- JWT认证
- 数据加密
- 权限验证
- 操作审计

### 5. 组件联动
- 连接状态变化自动更新UI
- 操作历史实时记录
- 权限变化即时生效
- 分享状态实时同步

---

## 📋 组件交互总结

### 核心交互关系
1. **用户 ↔ 连接**: 用户创建、管理、分享连接
2. **连接 ↔ Redis**: 连接实例操作Redis数据库
3. **权限 ↔ 操作**: 权限验证控制所有操作
4. **状态 ↔ UI**: 状态变化驱动UI更新
5. **分享 ↔ 权限**: 分享机制影响权限控制

### 数据流向
```
用户操作 → 权限验证 → 业务逻辑 → 数据存储 → 状态更新 → UI刷新
```

### 关键联动点
- 登录状态变化 → 连接列表更新
- 连接状态变化 → UI状态同步
- 权限变化 → 操作按钮显示/隐藏
- 分享操作 → 连接列表刷新
- 操作执行 → 历史记录更新

---

*本文档描述了Redis Web管理系统中各个组件之间的关联关系和交互流程，为系统维护和功能扩展提供参考。* 

---

## 🔄 独立连接存储结构（新增）

### 存储架构改进

#### 1. 连接信息独立存储
```
/server/connections/
├── {connectionId}/
│   ├── info.json          # 连接基本信息
│   └── history/
│       ├── 2024-01-15.json # 操作历史（按日期）
│       ├── 2024-01-16.json
│       └── ...
```

#### 2. 连接信息文件结构
```json
{
  "id": "uuid-connection-id",
  "owner": "username",
  "participants": ["user1", "user2", "user3"],
  "shareCode": "ABC12345",
  "redis": {
    "name": "连接名称",
    "host": "localhost",
    "port": 6379,
    "password": "encrypted-password",
    "database": 0
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### 3. 操作历史文件结构
```json
[
  {
    "id": "uuid-operation-id",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "operator": "username",
    "operation": "connection_created",
    "target": "连接名称",
    "details": {
      "action": "创建Redis连接"
    },
    "result": "success"
  }
]
```

### 优势

#### 1. 数据隔离
- **连接信息独立**: 每个连接有自己的目录和文件
- **历史记录分离**: 按日期分文件存储，便于管理
- **权限控制**: 基于文件系统的权限管理

#### 2. 扩展性
- **多用户支持**: 参与者列表支持多用户访问
- **分享机制**: 分享码独立管理
- **历史追踪**: 详细的操作历史记录

#### 3. 性能优化
- **按需加载**: 只加载需要的连接信息
- **历史分页**: 按日期分文件，便于分页查询
- **缓存友好**: 文件结构便于缓存

### 迁移策略

#### 1. 数据迁移
```bash
# 执行迁移
node server/migrate-connections.js migrate

# 验证迁移结果
node server/migrate-connections.js verify

# 执行迁移并验证
node server/migrate-connections.js all
```

#### 2. 迁移内容
- **私有连接**: 迁移到独立文件，设置所有者
- **分享连接**: 迁移分享码和参与者信息
- **好友连接**: 迁移参与者关系
- **操作历史**: 迁移到新的历史文件结构

#### 3. 清理旧数据
- 从用户数据文件中移除连接相关字段
- 保持用户基本信息和认证数据
- 确保数据一致性

### 新的服务架构

#### 1. 连接服务 (`server/services/connection.js`)
```javascript
// 核心功能
- createConnectionInfo()     // 创建连接信息
- getConnectionInfo()        // 获取连接信息
- updateConnectionInfo()     // 更新连接信息
- deleteConnectionInfo()     // 删除连接信息
- addParticipant()          // 添加参与者
- removeParticipant()       // 移除参与者
- setShareCode()            // 设置分享码
- findConnectionByShareCode() // 根据分享码查找
- getUserConnections()      // 获取用户连接
- logOperation()            // 记录操作
- getOperationHistory()     // 获取操作历史
```

#### 2. 数据加密
- **连接信息加密**: 使用AES-256-CBC加密
- **密码保护**: Redis密码单独加密存储
- **向后兼容**: 支持旧格式数据解密

#### 3. 权限验证
```javascript
// 权限检查逻辑
function checkConnectionPermission(user, connectionId) {
  // 1. 检查是否为所有者
  if (connection.owner === user.username) {
    return { canEdit: true, canDelete: true, canShare: true };
  }
  
  // 2. 检查是否为参与者
  if (connection.participants.includes(user.username)) {
    return { canEdit: false, canDelete: false, canShare: false };
  }
  
  return { canEdit: false, canDelete: false, canShare: false };
}
```

### 文件系统结构

```
server/
├── connections/           # 连接数据目录
│   ├── {uuid1}/
│   │   ├── info.json
│   │   └── history/
│   │       ├── 2024-01-15.json
│   │       └── 2024-01-16.json
│   └── {uuid2}/
│       ├── info.json
│       └── history/
│           └── 2024-01-15.json
├── users/                # 用户数据目录
│   ├── admin.json
│   └── user1.json
└── services/
    ├── connection.js     # 连接服务
    ├── user.js          # 用户服务
    └── redis.js         # Redis服务
```

### 数据一致性

#### 1. 事务处理
- **原子操作**: 连接创建和参与者添加的原子性
- **回滚机制**: 失败时的数据回滚
- **状态同步**: 前后端状态一致性

#### 2. 错误处理
- **文件不存在**: 优雅处理缺失文件
- **权限错误**: 详细的权限错误信息
- **加密错误**: 向后兼容的加密处理

#### 3. 监控和日志
- **操作日志**: 详细的操作记录
- **错误监控**: 系统错误监控
- **性能指标**: 文件操作性能统计

---

*这个新的存储架构提供了更好的数据组织、扩展性和维护性，为系统的长期发展奠定了坚实的基础。* 