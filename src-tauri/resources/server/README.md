# Redis管理工具 - 服务器端

## 项目结构

```
server/
├── app.js                 # 主应用文件
├── index.js              # 入口文件（简化版）
├── start.js              # 启动脚本

├── README.md             # 本文档
├── utils/                # 工具模块
│   └── constants.js      # 常量定义
├── middleware/           # 中间件
│   └── auth.js          # 认证中间件
├── services/            # 服务层
│   ├── redis.js         # Redis服务
│   └── user.js          # 用户服务
└── routes/              # 路由模块
    ├── auth.js          # 用户认证路由
    ├── connections.js   # 连接管理路由
    ├── keys.js          # 键值操作路由
    ├── locks.js         # 操作锁定路由
    └── operations.js    # 操作历史路由
```

## 模块说明

### 1. 工具模块 (utils/)

#### `constants.js`
- 定义全局常量
- JWT密钥配置
- 用户角色定义
- 操作类型定义
- 默认配置参数

### 2. 中间件 (middleware/)

#### `auth.js`
- JWT认证中间件
- 权限检查中间件
- 锁过期检查工具函数

### 3. 服务层 (services/)

#### `redis.js`
- Redis连接管理
- 键值操作
- 服务器信息获取
- 连接恢复和关闭

#### `user.js`
- 用户注册和登录
- 用户资料管理
- 角色权限管理
- 默认管理员初始化

### 4. 路由模块 (routes/)

#### `auth.js`
- 用户注册: `POST /api/auth/register`
- 用户登录: `POST /api/auth/login`
- 获取用户资料: `GET /api/auth/profile`
- 更新用户资料: `PUT /api/auth/profile`

#### `connections.js`
- 创建连接: `POST /api/connections`
- 更新连接: `PUT /api/connections/:id`
- 获取连接列表: `GET /api/connections`
- 删除连接: `DELETE /api/connections/:id`
- 重新连接: `POST /api/connections/:id/reconnect`
- 测试连接: `POST /api/connections/test`
- 获取服务器信息: `GET /api/connections/:id/info`

#### `keys.js`
- 获取键列表: `GET /api/connections/:id/:db/keys`
- 获取键值: `GET /api/connections/:id/:db/key/*`
- 重命名键: `PUT /api/connections/:id/:db/key/:oldKeyName/rename`
- 更新Hash字段: `PUT /api/connections/:connectionId/:database/hash/:keyName/field`
- 更新String值: `PUT /api/connections/:connectionId/:database/string/:keyName`
- 删除Hash字段: `DELETE /api/connections/:connectionId/:database/hash/:keyName/field`
- 批量删除Hash字段: `DELETE /api/connections/:connectionId/:database/hash/:keyName/fields`
- 删除键组: `DELETE /api/connections/:id/:db/keys/group/:prefix`

#### `locks.js`
- 获取所有锁: `GET /api/locks`
- 获取我的锁: `GET /api/locks/my`
- 获取操作锁: `POST /api/locks`
- 强制获取锁: `POST /api/locks/force`
- 释放锁: `DELETE /api/locks/:id`
- 释放所有我的锁: `DELETE /api/locks/my/all`

#### `operations.js`
- 获取操作历史: `GET /api/operations/history`
- 添加操作记录: `POST /api/operations`
- 回滚操作: `POST /api/operations/:id/rollback`

## 启动方式

### 开发模式
```bash
node server/start.js
# 或者
node server/index.js
```

### 生产模式
```bash
NODE_ENV=production node server/start.js
```

### 使用PM2
```bash
pm2 start server/start.js --name redis-manager
```

## 环境变量

创建 `.env` 文件配置以下环境变量：

```env
# 服务器端口
PORT=3000

# JWT密钥（生产环境必须修改）
JWT_SECRET=your-secret-key-change-in-production

# 数据加密密钥（32位字符，生产环境必须修改）
ENCRYPTION_KEY=your-encryption-key-32-chars-long!!

# 环境模式
NODE_ENV=development
```

## 默认用户

系统启动时会自动创建默认管理员用户：
- 用户名: `admin`
- 密码: `admin123`
- 角色: `admin`

## 功能特性

### 1. 连接管理
- 支持多个Redis连接
- 连接配置持久化
- 自动重连机制
- 连接状态监控

### 2. 键值操作
- 支持所有Redis数据类型
- 键分组显示
- 分页加载
- 实时搜索

### 3. 用户管理
- JWT认证
- 角色权限控制
- 用户资料管理
- 用户数据加密存储（auth.json）

### 4. 协作功能
- 操作锁定机制
- 并发冲突检测
- 操作历史记录
- 操作回滚支持

### 5. 数据安全
- 密码加密存储
- 访问令牌验证
- 操作权限控制
- 用户数据文件加密存储

## 开发说明

### 添加新路由
1. 在 `routes/` 目录下创建新的路由文件
2. 在 `app.js` 中注册路由
3. 更新本文档

### 添加新服务
1. 在 `services/` 目录下创建新的服务文件
2. 在路由中引用服务
3. 更新本文档

### 添加新中间件
1. 在 `middleware/` 目录下创建新的中间件文件
2. 在需要的地方引用中间件
3. 更新本文档 