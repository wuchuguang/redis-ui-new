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

const app = express();
const PORT = process.env.PORT || DEFAULT_CONFIG.PORT;



// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/connections', keyRoutes); // 键值操作也挂载在connections下
app.use('/api/locks', lockRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/tools/batch', batchRoutes);
app.use('/api/tools/converter', converterRoutes);
app.use('/api/tools/backup', backupRoutes);

// 处理前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
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