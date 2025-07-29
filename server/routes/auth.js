const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userService = require('../services/user');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const userInfo = await userService.registerUser(req.body);
    
    // 注册成功后自动登录
    const loginResult = await userService.loginUser({
      username: req.body.username,
      password: req.body.password
    });
    
    res.json({
      success: true,
      message: '注册成功并自动登录',
      data: {
        user: userInfo,
        token: loginResult.token
      }
    });
    
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const result = await userService.loginUser(req.body);
    
    res.json({
      success: true,
      message: '登录成功',
      data: result
    });
    
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// 获取用户资料
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const userInfo = userService.getUserProfile(req.user.username);
    
    res.json({
      success: true,
      data: userInfo
    });
    
  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

// 更新用户资料
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userInfo = await userService.updateUserProfile(req.user.username, req.body);
    
    res.json({
      success: true,
      message: '用户资料更新成功',
      data: userInfo
    });
    
  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '旧密码和新密码都是必填项'
      });
    }
    
    await userService.changePassword(req.user.username, oldPassword, newPassword);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 