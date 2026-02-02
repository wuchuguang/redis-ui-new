const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const userService = require('../services/user');
const { JWT_SECRET } = require('../utils/constants');

/**
 * @apiDefine AuthError
 * @apiError {Object} 400 请求参数错误
 * @apiError {Object} 401 认证失败
 * @apiError {Object} 500 服务器内部错误
 */

/**
 * @apiDefine UserSuccess
 * @apiSuccess {Boolean} success 操作是否成功
 * @apiSuccess {String} message 操作结果消息
 * @apiSuccess {Object} data 用户数据
 * @apiSuccess {String} data.id 用户ID
 * @apiSuccess {String} data.username 用户名
 * @apiSuccess {String} data.email 邮箱
 * @apiSuccess {String} data.role 用户角色
 * @apiSuccess {String} data.nickname 昵称
 * @apiSuccess {String} data.avatar 头像
 * @apiSuccess {String} data.createdAt 创建时间
 */

/**
 * @api {post} /api/auth/register 用户注册
 * @apiName RegisterUser
 * @apiGroup Auth
 * @apiVersion 1.0.0
 * 
 * @apiDescription 注册新用户账户，注册成功后自动登录
 * 
 * @apiParam {String} username 用户名（3-20个字符）
 * @apiParam {String} email 邮箱地址
 * @apiParam {String} password 密码（最少6个字符）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3333/api/auth/register \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "username": "testuser",
 *         "email": "test@example.com",
 *         "password": "123456"
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 注册成功
 * @apiSuccess {String} message="注册成功并自动登录" 成功消息
 * @apiSuccess {Object} data 用户信息和token
 * @apiSuccess {Object} data.user 用户信息
 * @apiSuccess {String} data.token JWT访问令牌
 * 
 * @apiUse UserSuccess
 * @apiUse AuthError
 * 
 * @apiError {Object} 400 注册失败
 * @apiError {String} 400.message 错误消息（用户名已存在、邮箱已被使用等）
 */
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

/**
 * @api {post} /api/auth/login 用户登录
 * @apiName LoginUser
 * @apiGroup Auth
 * @apiVersion 1.0.0
 * 
 * @apiDescription 用户登录验证，成功后返回JWT令牌
 * 
 * @apiParam {String} username 用户名
 * @apiParam {String} password 密码
 * @apiParam {Boolean} [rememberPassword=false] 是否记住密码
 * @apiParam {Boolean} [rememberLogin=false] 是否记住登录状态
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3333/api/auth/login \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "username": "admin",
 *         "password": "admin123",
 *         "rememberPassword": false,
 *         "rememberLogin": true
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 登录成功
 * @apiSuccess {String} message="登录成功" 成功消息
 * @apiSuccess {Object} data 用户信息和token
 * @apiSuccess {Object} data.user 用户信息
 * @apiSuccess {String} data.token JWT访问令牌（7天有效期）
 * 
 * @apiUse UserSuccess
 * @apiUse AuthError
 * 
 * @apiError {Object} 401 登录失败
 * @apiError {String} 401.message 错误消息（用户名或密码错误）
 */
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

/**
 * @api {get} /api/auth/profile 获取用户资料
 * @apiName GetUserProfile
 * @apiGroup Auth
 * @apiVersion 1.0.0
 * 
 * @apiDescription 获取当前登录用户的详细资料
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X GET http://localhost:3333/api/auth/profile \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 获取成功
 * @apiSuccess {Object} data 用户资料
 * @apiSuccess {String} data.id 用户ID
 * @apiSuccess {String} data.username 用户名
 * @apiSuccess {String} data.email 邮箱
 * @apiSuccess {String} data.role 用户角色（admin/user/guest）
 * @apiSuccess {String} data.nickname 昵称
 * @apiSuccess {String} data.avatar 头像URL
 * @apiSuccess {String} data.createdAt 创建时间
 * 
 * @apiUse AuthError
 * 
 * @apiError {Object} 404 用户不存在
 * @apiError {String} 404.message 错误消息
 */
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

/**
 * @api {put} /api/auth/profile 更新用户资料
 * @apiName UpdateUserProfile
 * @apiGroup Auth
 * @apiVersion 1.0.0
 * 
 * @apiDescription 更新当前登录用户的资料信息
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} [email] 新邮箱地址
 * @apiParam {String} [nickname] 新昵称（最多20个字符）
 * @apiParam {String} [avatar] 新头像URL
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X PUT http://localhost:3333/api/auth/profile \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "email": "newemail@example.com",
 *         "nickname": "新昵称"
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 更新成功
 * @apiSuccess {String} message="用户资料更新成功" 成功消息
 * @apiSuccess {Object} data 更新后的用户资料
 * 
 * @apiUse UserSuccess
 * @apiUse AuthError
 * 
 * @apiError {Object} 400 参数错误
 * @apiError {String} 400.message 错误消息（邮箱格式错误等）
 */
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

/**
 * @api {put} /api/auth/password 修改密码
 * @apiName ChangePassword
 * @apiGroup Auth
 * @apiVersion 1.0.0
 * 
 * @apiDescription 修改当前登录用户的密码
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiParam {String} oldPassword 旧密码
 * @apiParam {String} newPassword 新密码（最少6个字符）
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X PUT http://localhost:3333/api/auth/password \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "oldPassword": "oldpassword123",
 *         "newPassword": "newpassword123"
 *       }'
 * 
 * @apiSuccess {Boolean} success=true 修改成功
 * @apiSuccess {String} message="密码修改成功" 成功消息
 * 
 * @apiUse AuthError
 * 
 * @apiError {Object} 400 参数错误
 * @apiError {String} 400.message 错误消息（旧密码错误、新密码格式错误等）
 */
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

/**
 * @api {post} /api/auth/refresh-token 刷新访问令牌
 * @apiName RefreshToken
 * @apiGroup Auth
 * @apiVersion 1.0.0
 * 
 * @apiDescription 使用当前有效的JWT令牌刷新获取新的访问令牌
 * 
 * @apiHeader {String} Authorization Bearer JWT令牌
 * 
 * @apiExample {curl} 请求示例:
 *     curl -X POST http://localhost:3333/api/auth/refresh-token \
 *       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 * @apiSuccess {Boolean} success=true 刷新成功
 * @apiSuccess {String} message="Token刷新成功" 成功消息
 * @apiSuccess {Object} data 新令牌信息
 * @apiSuccess {String} data.token 新的JWT访问令牌（7天有效期）
 * 
 * @apiUse AuthError
 * 
 * @apiError {Object} 404 用户不存在
 * @apiError {String} 404.message 错误消息
 */
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const user = userService.getUserProfile(req.user.username);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 生成新的token
    const newToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken
      }
    });
    
  } catch (error) {
    console.error('刷新token失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 