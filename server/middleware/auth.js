const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  // 测试模式：允许通过 query/header 传 test_user，仅开发环境生效
  const testUser = req.query.test_user || req.headers['x-test-user'];
  if (process.env.NODE_ENV !== 'production' && testUser) {
    console.log(`[测试模式] 以用户 ${testUser} 进行API测试`);
    req.user = { username: testUser, isTest: true };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '访问令牌无效'
      });
    }
    req.user = user;
    next();
  });
};

// 权限检查中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
};

// 检查锁是否过期
const isExpired = (lock) => {
  const now = Date.now();
  const lockTime = new Date(lock.startTime).getTime();
  return (now - lockTime) > lock.timeout;
};

module.exports = {
  authenticateToken,
  requireRole,
  isExpired
}; 