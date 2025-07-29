# Redis Web管理工具

一个现代化的Redis数据库管理工具，基于Vue 3 + Element Plus构建，提供直观的Web界面来管理Redis连接、键值对、数据类型转换等功能。支持多用户协作、操作锁定、连接保活等企业级功能。

## ✨ 主要特性

### 👥 用户系统
- **多用户支持**：支持多用户同时操作
- **用户认证**：JWT token认证，密码加密存储
- **权限管理**：支持管理员和普通用户角色
- **数据隔离**：每个用户的连接配置独立存储
- **自动登录**：注册后自动登录，页面刷新保持登录状态

### 🔗 连接管理
- **多连接支持**：同时管理多个Redis连接
- **连接状态监控**：实时显示连接状态
- **自动重连**：页面刷新后自动恢复连接
- **连接保活**：每20秒自动ping保持连接活跃
- **临时连接**：未登录用户可创建临时连接，登录后可合并到账户
- **连接持久化**：连接配置自动保存到用户账户

### 📊 数据管理
- **多数据类型支持**：String、Hash、List、Set、ZSet
- **键值浏览**：分组显示和列表显示模式
- **实时搜索**：支持键名搜索，带搜索历史
- **批量操作**：支持批量删除Hash字段
- **数据编辑**：支持编辑String值和Hash字段
- **分页加载**：大数据量时的分页显示，支持"全部"按钮

### 🎨 用户体验
- **深色主题**：现代化的深色界面设计
- **响应式布局**：适配不同屏幕尺寸
- **操作历史**：记录所有操作日志，支持过滤和导出
- **状态恢复**：页面刷新后自动恢复工作状态
- **搜索历史**：键搜索历史记录，支持手动删除

### 🔧 高级功能
- **数据转换**：支持Unix时间戳、JSON、Base64等格式转换
- **转换规则引擎**：支持基于键模式的自动转换规则
- **缓存机制**：智能缓存提升性能
- **操作锁定**：防止并发操作冲突
- **操作回滚**：支持操作回滚功能
- **操作确认**：重要操作需要确认

### 🤝 协作功能
- **多用户协作**：支持多用户同时操作
- **操作锁定**：防止并发操作冲突
- **操作回滚**：支持操作回滚功能
- **操作确认**：重要操作需要确认
- **连接分享**：连接配置可在用户间分享

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- Redis服务器

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/wuchuguang/redis-ui-new.git
   cd redis-ui-new
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   打开浏览器访问 `http://localhost:3000`

### 生产部署

1. **构建项目**
   ```bash
   npm run build
   ```

2. **启动生产服务器**
   ```bash
   npm start
   ```

## 📖 使用指南

### 用户管理

1. **注册账户**
   - 点击右上角头像图标
   - 选择"注册"选项
   - 填写用户名和密码
   - 注册成功后自动登录

2. **登录系统**
   - 点击右上角头像图标
   - 选择"登录"选项
   - 输入用户名和密码
   - 登录后可使用所有功能

3. **合并临时连接**
   - 未登录时创建的连接为临时连接
   - 登录后系统会提示是否合并临时连接
   - 确认后临时连接将保存到用户账户

### 连接管理

1. **创建连接**
   - 点击"新建连接"按钮
   - 支持表单模式和JSON模式
   - JSON模式支持JavaScript对象格式（带注释）
   - 填写连接信息（主机、端口、密码等）
   - 点击"连接"测试连接

2. **管理连接**
   - 点击"连接管理"查看所有连接
   - 支持编辑、删除、重连操作
   - 连接状态实时更新
   - 连接保活机制自动维护连接

### 数据浏览

1. **选择数据库**
   - 在左侧边栏选择Redis数据库（DB0-DB15）
   - 显示每个数据库的键数量和过期时间统计
   - 数据库统计分为两列显示（0-7和8-15）

2. **浏览键值**
   - 键按前缀分组显示
   - 单键组直接显示为单个键
   - 支持展开/折叠分组
   - 点击键名查看详细信息
   - 支持列表模式和分组模式切换

3. **搜索功能**
   - 在搜索框输入键名模式
   - 支持通配符搜索
   - 搜索历史自动保存
   - 支持手动删除搜索历史

### 数据操作

1. **编辑String值**
   - 选择String类型的键
   - 点击"编辑"按钮
   - 修改值后保存
   - 支持格式转换功能

2. **编辑Hash字段**
   - 选择Hash类型的键
   - 点击字段行的"编辑"按钮
   - 修改字段名或值
   - 支持批量删除字段

3. **删除操作**
   - 支持删除单个键
   - 支持删除Hash字段
   - 支持批量删除Hash字段
   - 重要操作需要确认

### 数据转换

1. **手动转换**
   - 在值显示区域选择转换格式
   - 支持Unix时间戳、JSON、Base64等
   - 支持复制转换后的值

2. **自动转换规则**
   - 点击左上角规则图标打开规则管理器
   - 创建基于键模式的转换规则
   - 支持通配符匹配（使用{*}）
   - 支持多种数据类型（string、hash、sets、lists、zsets）

### 操作历史

1. **查看历史**
   - 点击顶部时钟图标
   - 查看所有操作记录
   - 支持按类型和级别过滤
   - 显示操作时间、用户、操作类型等信息

2. **导出历史**
   - 点击"导出历史"按钮
   - 下载CSV格式的操作记录

### 协作功能

1. **操作锁定**
   - 重要操作自动获取锁
   - 防止其他用户同时操作
   - 锁超时自动释放

2. **操作回滚**
   - 支持撤销最近的操作
   - 操作历史记录详细
   - 回滚操作需要确认

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - Vue 3组件库
- **Pinia** - 状态管理
- **Vite** - 构建工具
- **Axios** - HTTP客户端

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web框架
- **Redis** - 数据库客户端
- **JWT** - 用户认证
- **bcryptjs** - 密码加密
- **crypto** - 数据加密
- **UUID** - 唯一标识符生成

### 开发工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Git** - 版本控制

## 📁 项目结构

```
node-redis-web/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # Vue组件
│   │   │   ├── ConnectionExplorer.vue      # 连接浏览器
│   │   │   ├── ConnectionManagerDialog.vue # 连接管理对话框
│   │   │   ├── KeyValueDisplay.vue         # 键值显示组件
│   │   │   ├── NewConnectionDialog.vue     # 新建连接对话框
│   │   │   ├── RedisOverview.vue           # Redis概览
│   │   │   ├── UserManager.vue             # 用户管理
│   │   │   ├── OperationLock.vue           # 操作锁定
│   │   │   └── OperationRollback.vue       # 操作回滚
│   │   ├── stores/         # Pinia状态管理
│   │   │   ├── connection.js               # 连接状态管理
│   │   │   ├── user.js                     # 用户状态管理
│   │   │   ├── operationHistory.js         # 操作历史
│   │   │   └── operationLock.js            # 操作锁定
│   │   ├── utils/          # 工具函数
│   │   └── App.vue         # 主应用组件
│   ├── package.json
│   └── vite.config.js
├── server/                 # 后端代码
│   ├── app.js             # 主应用文件
│   ├── index.js           # 入口文件
│   ├── start.js           # 启动脚本
│   ├── routes/            # 路由模块
│   │   ├── auth.js        # 用户认证路由
│   │   ├── connections.js # 连接管理路由
│   │   ├── keys.js        # 键值操作路由
│   │   ├── locks.js       # 操作锁定路由
│   │   └── operations.js  # 操作历史路由
│   ├── services/          # 服务模块
│   │   ├── user.js        # 用户服务
│   │   └── redis.js       # Redis服务
│   ├── middleware/        # 中间件
│   │   └── auth.js        # 认证中间件
│   ├── utils/             # 工具模块
│   │   └── constants.js   # 常量定义
│   ├── users/             # 用户数据目录
│   │   └── *.json         # 用户配置文件（加密）
│   └── README.md          # 后端文档
├── package.json
├── build.sh               # 构建脚本
└── README.md
```

## 🔧 配置说明

### 环境变量
```bash
# 服务器端口
PORT=3000

# JWT密钥
JWT_SECRET=your-secret-key

# Redis连接配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 数据存储
- **用户数据**：加密存储在`server/users/`目录
- **临时连接**：未登录用户连接存储在localStorage
- **操作历史**：保存在localStorage
- **转换规则**：保存在localStorage
- **搜索历史**：保存在localStorage

### 连接保活
- **Ping频率**：每20秒自动ping一次
- **状态检查**：每30秒刷新连接状态
- **自动重连**：ping失败时自动尝试重连
- **超时处理**：连接超时自动标记为断开

## 🐛 常见问题

### 用户认证问题
**Q: 页面刷新后退出登录**
A: 检查JWT token是否正确保存，确认Authorization header设置

**Q: 无法注册或登录**
A: 检查用户数据文件权限，确认加密密钥配置正确

### 连接问题
**Q: 无法连接到Redis服务器**
A: 检查Redis服务器是否启动，确认主机地址和端口正确

**Q: 连接后立即断开**
A: 检查Redis密码是否正确，确认网络连接稳定

**Q: 连接经常断开**
A: 系统已实现连接保活机制，每20秒自动ping保持连接

### 性能问题
**Q: 大数据量时加载缓慢**
A: 使用分页加载功能，或调整每页显示数量

**Q: 页面响应慢**
A: 检查网络连接，或重启应用

### 功能问题
**Q: 操作历史不显示**
A: 检查浏览器localStorage是否被禁用

**Q: 转换规则不生效**
A: 确认规则配置正确，检查键名模式匹配

**Q: 临时连接无法合并**
A: 确认已登录，检查连接配置是否冲突

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue 3组件库
- [Redis](https://redis.io/) - 内存数据结构存储
- [Express.js](https://expressjs.com/) - Web应用框架
- [JWT](https://jwt.io/) - JSON Web Token认证

## 📞 联系方式

- 项目地址：[https://github.com/wuchuguang/redis-ui-new](https://github.com/wuchuguang/redis-ui-new)
- 问题反馈：[Issues](https://github.com/wuchuguang/redis-ui-new/issues)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！ 