const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 权限管理服务
class PermissionManager {
  constructor() {
    this.permissions = new Map(); // 内存中的权限缓存
    this.permissionFile = path.join(require('../utils/paths').DATA_DIR, 'permissions.json');
  }

  // 权限类型定义
  static PERMISSION_TYPES = {
    // 连接级权限
    CONNECTION_VIEW: 'connection_view',           // 查看连接
    CONNECTION_EDIT: 'connection_edit',           // 编辑连接配置
    CONNECTION_DELETE: 'connection_delete',       // 删除连接
    CONNECTION_SHARE: 'connection_share',         // 分享连接
    
    // 数据操作权限
    DATA_READ: 'data_read',                       // 读取数据
    DATA_WRITE: 'data_write',                     // 写入数据
    DATA_DELETE: 'data_delete',                   // 删除数据
    DATA_RENAME: 'data_rename',                   // 重命名数据
    
    // 键操作权限
    KEY_VIEW: 'key_view',                         // 查看键列表
    KEY_READ: 'key_read',                         // 读取键值
    KEY_WRITE: 'key_write',                       // 写入键值
    KEY_DELETE: 'key_delete',                     // 删除键
    KEY_RENAME: 'key_rename',                     // 重命名键
    
    // Hash操作权限
    HASH_VIEW: 'hash_view',                       // 查看Hash字段
    HASH_READ: 'hash_read',                       // 读取Hash字段
    HASH_WRITE: 'hash_write',                     // 写入Hash字段
    HASH_DELETE: 'hash_delete',                   // 删除Hash字段
    
    // 数据库操作权限
    DB_SELECT: 'db_select',                       // 切换数据库
    DB_INFO: 'db_info',                           // 查看数据库信息
    DB_FLUSH: 'db_flush',                         // 清空数据库
    
    // 系统操作权限
    SYSTEM_INFO: 'system_info',                   // 查看系统信息
    SYSTEM_CONFIG: 'system_config',               // 系统配置
    SYSTEM_MONITOR: 'system_monitor'              // 系统监控
  };

  // 权限级别定义
  static PERMISSION_LEVELS = {
    NONE: 0,        // 无权限
    READ: 1,        // 只读权限
    WRITE: 2,       // 读写权限
    ADMIN: 3        // 管理员权限
  };

  // 默认权限模板
  static DEFAULT_PERMISSIONS = {
    owner: {
      // 连接级权限
      connection_view: true,
      connection_edit: true,
      connection_delete: true,
      connection_share: true,
      
      // 数据操作权限
      data_read: true,
      data_write: true,
      data_delete: true,
      data_rename: true,
      
      // 键操作权限
      key_view: true,
      key_read: true,
      key_write: true,
      key_delete: true,
      key_rename: true,
      
      // Hash操作权限
      hash_view: true,
      hash_read: true,
      hash_write: true,
      hash_delete: true,
      
      // 数据库操作权限
      db_select: true,
      db_info: true,
      db_flush: true,
      
      // 系统操作权限
      system_info: true,
      system_config: true,
      system_monitor: true
    },
    
    participant: {
      // 连接级权限
      connection_view: true,
      connection_edit: false,
      connection_delete: false,
      connection_share: false,
      
      // 数据操作权限
      data_read: true,
      data_write: true,
      data_delete: false,
      data_rename: false,
      
      // 键操作权限
      key_view: true,
      key_read: true,
      key_write: true,
      key_delete: false,
      key_rename: false,
      
      // Hash操作权限
      hash_view: true,
      hash_read: true,
      hash_write: true,
      hash_delete: false,
      
      // 数据库操作权限
      db_select: true,
      db_info: true,
      db_flush: false,
      
      // 系统操作权限
      system_info: true,
      system_config: false,
      system_monitor: false
    },
    
    guest: {
      // 连接级权限
      connection_view: true,
      connection_edit: false,
      connection_delete: false,
      connection_share: false,
      
      // 数据操作权限
      data_read: true,
      data_write: false,
      data_delete: false,
      data_rename: false,
      
      // 键操作权限
      key_view: true,
      key_read: true,
      key_write: false,
      key_delete: false,
      key_rename: false,
      
      // Hash操作权限
      hash_view: true,
      hash_read: true,
      hash_write: false,
      hash_delete: false,
      
      // 数据库操作权限
      db_select: true,
      db_info: true,
      db_flush: false,
      
      // 系统操作权限
      system_info: false,
      system_config: false,
      system_monitor: false
    }
  };

  // 初始化权限管理器
  async initialize() {
    try {
      await this.loadPermissions();
      console.log('权限管理器初始化完成');
    } catch (error) {
      console.log('权限管理器初始化失败，使用默认配置:', error.message);
    }
  }

  // 加载权限配置
  async loadPermissions() {
    try {
      const data = await fs.readFile(this.permissionFile, 'utf8');
      const permissions = JSON.parse(data);
      this.permissions = new Map(Object.entries(permissions));
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，创建默认权限配置
        await this.savePermissions();
      } else {
        throw error;
      }
    }
  }

  // 保存权限配置
  async savePermissions() {
    try {
      const dataDir = path.dirname(this.permissionFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      const permissionsObj = Object.fromEntries(this.permissions);
      await fs.writeFile(this.permissionFile, JSON.stringify(permissionsObj, null, 2));
    } catch (error) {
      console.error('保存权限配置失败:', error);
    }
  }

  // 为连接创建权限配置
  async createConnectionPermissions(connectionId, owner, participants = []) {
    const permissions = {
      connectionId,
      owner,
      participants,
      rules: {
        [owner]: { ...PermissionManager.DEFAULT_PERMISSIONS.owner },
        ...participants.reduce((acc, participant) => {
          acc[participant] = { ...PermissionManager.DEFAULT_PERMISSIONS.participant };
          return acc;
        }, {})
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.permissions.set(connectionId, permissions);
    await this.savePermissions();
    
    console.log(`连接权限配置已创建: ${connectionId}`);
    return permissions;
  }

  // 获取用户对连接的权限
  async getUserPermissions(connectionId, username) {
    const connectionPermissions = this.permissions.get(connectionId);
    if (!connectionPermissions) {
      return null;
    }

    const userRules = connectionPermissions.rules[username];
    if (!userRules) {
      return null;
    }

    return {
      connectionId,
      username,
      permissions: userRules,
      role: connectionPermissions.owner === username ? 'owner' : 'participant'
    };
  }

  // 检查用户是否有特定权限
  async hasPermission(connectionId, username, permission) {
    const userPermissions = await this.getUserPermissions(connectionId, username);
    if (!userPermissions) {
      return false;
    }

    return userPermissions.permissions[permission] === true;
  }

  // 检查用户是否有多个权限（全部满足）
  async hasAllPermissions(connectionId, username, permissions) {
    for (const permission of permissions) {
      if (!(await this.hasPermission(connectionId, username, permission))) {
        return false;
      }
    }
    return true;
  }

  // 检查用户是否有多个权限（满足任一）
  async hasAnyPermission(connectionId, username, permissions) {
    for (const permission of permissions) {
      if (await this.hasPermission(connectionId, username, permission)) {
        return true;
      }
    }
    return false;
  }

  // 添加参与者
  async addParticipant(connectionId, username) {
    const connectionPermissions = this.permissions.get(connectionId);
    if (!connectionPermissions) {
      throw new Error('连接权限配置不存在');
    }

    if (!connectionPermissions.participants.includes(username)) {
      connectionPermissions.participants.push(username);
      connectionPermissions.rules[username] = { ...PermissionManager.DEFAULT_PERMISSIONS.participant };
      connectionPermissions.updatedAt = new Date().toISOString();
      
      this.permissions.set(connectionId, connectionPermissions);
      await this.savePermissions();
      
      console.log(`参与者已添加: ${connectionId} -> ${username}`);
    }

    return connectionPermissions;
  }

  // 移除参与者
  async removeParticipant(connectionId, username) {
    const connectionPermissions = this.permissions.get(connectionId);
    if (!connectionPermissions) {
      throw new Error('连接权限配置不存在');
    }

    if (connectionPermissions.owner === username) {
      throw new Error('不能移除连接所有者');
    }

    const index = connectionPermissions.participants.indexOf(username);
    if (index > -1) {
      connectionPermissions.participants.splice(index, 1);
      delete connectionPermissions.rules[username];
      connectionPermissions.updatedAt = new Date().toISOString();
      
      this.permissions.set(connectionId, connectionPermissions);
      await this.savePermissions();
      
      console.log(`参与者已移除: ${connectionId} -> ${username}`);
    }

    return connectionPermissions;
  }

  // 更新用户权限
  async updateUserPermissions(connectionId, username, permissions, updatedBy) {
    const connectionPermissions = this.permissions.get(connectionId);
    if (!connectionPermissions) {
      throw new Error('连接权限配置不存在');
    }

    // 检查更新者是否有权限
    if (!(await this.hasPermission(connectionId, updatedBy, 'connection_edit'))) {
      throw new Error('无权限修改用户权限');
    }

    // 不能修改所有者的权限
    if (connectionPermissions.owner === username) {
      throw new Error('不能修改连接所有者的权限');
    }

    // 更新权限
    connectionPermissions.rules[username] = {
      ...connectionPermissions.rules[username],
      ...permissions
    };
    connectionPermissions.updatedAt = new Date().toISOString();
    
    this.permissions.set(connectionId, connectionPermissions);
    await this.savePermissions();
    
    console.log(`用户权限已更新: ${connectionId} -> ${username}`);
    return connectionPermissions;
  }

  // 删除连接权限配置
  async deleteConnectionPermissions(connectionId) {
    if (this.permissions.has(connectionId)) {
      this.permissions.delete(connectionId);
      await this.savePermissions();
      console.log(`连接权限配置已删除: ${connectionId}`);
    }
  }

  // 获取连接的所有权限信息
  async getConnectionPermissions(connectionId) {
    return this.permissions.get(connectionId);
  }

  // 获取用户参与的所有连接
  async getUserConnections(username) {
    const userConnections = [];
    
    for (const [connectionId, permissions] of this.permissions.entries()) {
      if (permissions.owner === username || permissions.participants.includes(username)) {
        userConnections.push({
          connectionId,
          role: permissions.owner === username ? 'owner' : 'participant',
          permissions: permissions.rules[username]
        });
      }
    }
    
    return userConnections;
  }

  // 验证操作权限
  async validateOperation(connectionId, username, operation, resource = null) {
    const permissionMap = {
      // 连接操作
      'connection.view': 'connection_view',
      'connection.edit': 'connection_edit',
      'connection.delete': 'connection_delete',
      'connection.share': 'connection_share',
      
      // 数据操作
      'data.read': 'data_read',
      'data.write': 'data_write',
      'data.delete': 'data_delete',
      'data.rename': 'data_rename',
      
      // 键操作
      'key.view': 'key_view',
      'key.read': 'key_read',
      'key.write': 'key_write',
      'key.delete': 'key_delete',
      'key.rename': 'key_rename',
      
      // Hash操作
      'hash.view': 'hash_view',
      'hash.read': 'hash_read',
      'hash.write': 'hash_write',
      'hash.delete': 'hash_delete',
      
      // 数据库操作
      'db.select': 'db_select',
      'db.info': 'db_info',
      'db.flush': 'db_flush',
      
      // 系统操作
      'system.info': 'system_info',
      'system.config': 'system_config',
      'system.monitor': 'system_monitor'
    };

    const requiredPermission = permissionMap[operation];
    if (!requiredPermission) {
      throw new Error(`未知的操作类型: ${operation}`);
    }

    const hasPermission = await this.hasPermission(connectionId, username, requiredPermission);
    if (!hasPermission) {
      throw new Error(`用户 ${username} 没有执行操作 ${operation} 的权限`);
    }

    return true;
  }

  // 获取权限统计信息
  async getPermissionStats() {
    const stats = {
      totalConnections: this.permissions.size,
      totalUsers: new Set(),
      totalParticipants: 0,
      permissionTypes: Object.keys(PermissionManager.PERMISSION_TYPES).length
    };

    for (const [connectionId, permissions] of this.permissions.entries()) {
      stats.totalUsers.add(permissions.owner);
      stats.totalParticipants += permissions.participants.length;
      permissions.participants.forEach(p => stats.totalUsers.add(p));
    }

    stats.totalUsers = stats.totalUsers.size;
    return stats;
  }
}

// 创建全局权限管理器实例
const permissionManager = new PermissionManager();

module.exports = {
  PermissionManager,
  permissionManager
}; 