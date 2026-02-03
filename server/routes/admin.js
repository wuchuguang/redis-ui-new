const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const userService = require('../services/user');
const connectionService = require('../services/connection');
const { USER_ROLES } = require('../utils/constants');

/**
 * 管理员：获取所有用户列表
 * GET /api/admin/users
 */
router.get('/users', authenticateToken, requireRole([USER_ROLES.ADMIN]), (req, res) => {
  try {
    const list = userService.getAllUsers();
    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    console.error('获取用户列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * 管理员：更新用户角色
 * PUT /api/admin/users/:id/role
 * body: { role: 'admin' | 'user' | 'guest' }
 */
router.put('/users/:id/role', authenticateToken, requireRole([USER_ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const username = userService.getUsernameById(id);
    if (!username) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色'
      });
    }
    if (username === req.user.username) {
      return res.status(400).json({
        success: false,
        message: '不能修改自己的角色'
      });
    }
    const updated = await userService.updateUserRole(username, role);
    res.json({
      success: true,
      message: '角色已更新',
      data: updated
    });
  } catch (error) {
    console.error('更新用户角色失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || '更新用户角色失败'
    });
  }
});

/**
 * 管理员：删除用户
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', authenticateToken, requireRole([USER_ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const username = userService.getUsernameById(id);
    if (!username) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    if (username === req.user.username) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己'
      });
    }
    await userService.deleteUser(username);
    res.json({
      success: true,
      message: '用户已删除'
    });
  } catch (error) {
    console.error('删除用户失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || '删除用户失败'
    });
  }
});

/**
 * 管理员：获取所有 Redis 连接列表
 * GET /api/admin/connections
 */
router.get('/connections', authenticateToken, requireRole([USER_ROLES.ADMIN]), async (req, res) => {
  try {
    const list = await connectionService.getAllConnectionsForAdmin();
    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    console.error('获取连接列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取连接列表失败'
    });
  }
});

/**
 * 管理员：删除指定 Redis 连接
 * DELETE /api/admin/connections/:id
 */
router.delete('/connections/:id', authenticateToken, requireRole([USER_ROLES.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    await connectionService.deleteConnectionInfo(id);
    res.json({
      success: true,
      message: '连接已删除'
    });
  } catch (error) {
    console.error('删除连接失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || '删除连接失败'
    });
  }
});

module.exports = router;
