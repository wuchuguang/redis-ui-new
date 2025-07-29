# Redis Web管理工具

一个现代化的Redis数据库管理工具，基于Vue 3 + Element Plus构建，提供直观的Web界面来管理Redis连接、键值对、数据类型转换等功能。

## ✨ 主要特性

### 🔗 连接管理
- **多连接支持**：同时管理多个Redis连接
- **连接状态监控**：实时显示连接状态
- **自动重连**：页面刷新后自动恢复连接
- **连接持久化**：连接配置自动保存

### 📊 数据管理
- **多数据类型支持**：String、Hash、List、Set、ZSet
- **键值浏览**：分组显示和列表显示模式
- **实时搜索**：支持键名搜索，带搜索历史
- **批量操作**：支持批量删除Hash字段
- **数据编辑**：支持编辑String值和Hash字段

### 🎨 用户体验
- **深色主题**：现代化的深色界面设计
- **响应式布局**：适配不同屏幕尺寸
- **操作历史**：记录所有操作日志，支持过滤和导出
- **状态恢复**：页面刷新后自动恢复工作状态

### 🔧 高级功能
- **数据转换**：支持Unix时间戳、JSON、Base64等格式转换
- **转换规则引擎**：支持基于键模式的自动转换规则
- **分页加载**：大数据量时的分页显示
- **缓存机制**：智能缓存提升性能

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

### 连接管理

1. **创建连接**
   - 点击"新建连接"按钮
   - 填写连接信息（主机、端口、密码等）
   - 点击"连接"测试连接

2. **管理连接**
   - 点击"连接管理"查看所有连接
   - 支持编辑、删除、重连操作
   - 连接状态实时更新

### 数据浏览

1. **选择数据库**
   - 在左侧边栏选择Redis数据库（DB0-DB15）
   - 显示每个数据库的键数量

2. **浏览键值**
   - 键按前缀分组显示
   - 支持展开/折叠分组
   - 点击键名查看详细信息

3. **搜索功能**
   - 在搜索框输入键名模式
   - 支持通配符搜索
   - 搜索历史自动保存

### 数据操作

1. **编辑String值**
   - 选择String类型的键
   - 点击"编辑"按钮
   - 修改值后保存

2. **编辑Hash字段**
   - 选择Hash类型的键
   - 点击字段行的"编辑"按钮
   - 修改字段名或值

3. **删除操作**
   - 支持删除单个键
   - 支持删除Hash字段
   - 支持批量删除Hash字段

### 数据转换

1. **手动转换**
   - 在值显示区域选择转换格式
   - 支持Unix时间戳、JSON、Base64等

2. **自动转换规则**
   - 点击左上角设置图标打开规则管理器
   - 创建基于键模式的转换规则
   - 支持通配符匹配

### 操作历史

1. **查看历史**
   - 点击顶部时钟图标
   - 查看所有操作记录
   - 支持按类型和级别过滤

2. **导出历史**
   - 点击"导出历史"按钮
   - 下载CSV格式的操作记录

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - Vue 3组件库
- **Pinia** - 状态管理
- **Vite** - 构建工具

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web框架
- **Redis** - 数据库客户端
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
│   │   ├── stores/         # Pinia状态管理
│   │   ├── utils/          # 工具函数
│   │   └── App.vue         # 主应用组件
│   ├── package.json
│   └── vite.config.js
├── server/                 # 后端代码
│   ├── index.js           # 主服务器文件

├── package.json
└── README.md
```

## 🔧 配置说明

### 环境变量
```bash
# 服务器端口
PORT=3000

# Redis连接配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 配置文件
- 连接配置自动保存在本地
- 操作历史保存在localStorage
- 转换规则保存在localStorage

## 🐛 常见问题

### 连接问题
**Q: 无法连接到Redis服务器**
A: 检查Redis服务器是否启动，确认主机地址和端口正确

**Q: 连接后立即断开**
A: 检查Redis密码是否正确，确认网络连接稳定

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

## 📞 联系方式

- 项目地址：[https://github.com/wuchuguang/redis-ui-new](https://github.com/wuchuguang/redis-ui-new)
- 问题反馈：[Issues](https://github.com/wuchuguang/redis-ui-new/issues)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！ 