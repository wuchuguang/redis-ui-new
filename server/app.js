const express = require('express');
const cors = require('cors');
const path = require('path');
const userService = require('./services/user');
const redisService = require('./services/redis');
const { DEFAULT_CONFIG } = require('./utils/constants');

// 导入路由
const authRoutes = require('./routes/auth');
const connectionRoutes = require('./routes/connections');
const keyRoutes = require('./routes/keys');
const lockRoutes = require('./routes/locks');
const operationRoutes = require('./routes/operations');
const batchRoutes = require('./routes/tools/batch');
const converterRoutes = require('./routes/tools/converter');
const backupRoutes = require('./routes/tools/backup');
const conversionRulesRoutes = require('./routes/conversionRules');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || DEFAULT_CONFIG.PORT;

// 中间件
app.use(cors());
app.use(express.json());

// 注册API路由
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/connections', keyRoutes); // 键值操作也挂载在connections下
app.use('/api/locks', lockRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/tools/batch', batchRoutes);
app.use('/api/tools/converter', converterRoutes);
app.use('/api/tools/backup', backupRoutes);
app.use('/api/conversion-rules', conversionRulesRoutes);
app.use('/api/admin', adminRoutes);

// 前端静态文件服务 - /web 路由
const clientDistPath = path.join(__dirname, '../client/build/web');
const clientAssetsPath = path.join(clientDistPath, 'assets');

// 服务 /web 路由下的静态资源
app.use('/web/assets', express.static(clientAssetsPath));

// 服务 /web 路由下的 index.html
app.get('/web', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 处理 /web 路由下的前端路由（SPA路由）
app.get('/web/*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 保持原有的根路径静态文件服务（向后兼容）
app.use(express.static(clientDistPath));

// 处理根路径的前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`Redis管理工具服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  
  // 加载用户数据
  await userService.loadUsersFromFile();
  
  // 初始化默认管理员用户
  await userService.initializeDefaultAdmin();
  
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭Redis连接...');
  
  await redisService.closeAllConnections();
  
  process.exit(0);
});

module.exports = app; 