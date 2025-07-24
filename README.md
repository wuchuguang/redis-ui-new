# Redis管理工具

基于Node.js和Vue3开发的Redis管理工具，提供直观的Web界面来管理Redis连接和数据。

## 功能特性

- 🔗 **连接管理**: 支持多个Redis连接的管理
- 📊 **连接状态**: 实时显示连接状态和统计信息
- 🧪 **连接测试**: 在创建连接前进行连接测试
- 📋 **服务器信息**: 查看Redis服务器详细信息
- 🎨 **现代化UI**: 基于Element Plus的美观界面

## 技术栈

### 后端
- Node.js
- Express.js
- Redis (node-redis)
- CORS

### 前端
- Vue 3
- Vue Router
- Pinia (状态管理)
- Element Plus (UI组件库)
- Vite (构建工具)

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖（后端 + 前端）
npm run install-all

# 或者分别安装
npm install
cd client && npm install
```

### 2. 启动开发服务器

```bash
# 同时启动后端和前端
npm run dev

# 或者分别启动
npm run server    # 后端服务器 (端口 3000)
npm run client    # 前端开发服务器 (端口 5173)
```

### 3. 访问应用

打开浏览器访问: http://localhost:3000

## 项目结构

```
node-redis-web/
├── server/                 # 后端代码
│   └── index.js           # Express服务器
├── client/                # 前端代码
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── stores/        # Pinia状态管理
│   │   ├── router/        # 路由配置
│   │   ├── App.vue        # 根组件
│   │   └── main.js        # 应用入口
│   ├── index.html         # HTML模板
│   ├── package.json       # 前端依赖
│   └── vite.config.js     # Vite配置
├── package.json           # 后端依赖
└── README.md             # 项目说明
```

## API接口

### 连接管理

- `POST /api/connections` - 创建新连接
- `GET /api/connections` - 获取所有连接
- `DELETE /api/connections/:id` - 删除连接
- `POST /api/connections/test` - 测试连接
- `GET /api/connections/:id/info` - 获取连接信息

## 开发说明

### 后端开发
- 使用Express.js框架
- Redis连接使用node-redis库
- 支持多连接管理
- 优雅关闭处理

### 前端开发
- 使用Vue 3 Composition API
- Pinia进行状态管理
- Element Plus提供UI组件
- 响应式设计

## 注意事项

1. 确保Redis服务器正在运行
2. 默认连接配置：localhost:6379
3. 支持密码认证和数据库选择
4. 连接信息仅存储在内存中，重启后需要重新创建

## 许可证

MIT License 