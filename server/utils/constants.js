// 常量定义
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 用户角色
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
};

// 操作类型
const OPERATION_TYPES = {
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'delete',
  RENAME: 'rename',
  CONNECT: 'connect',
  QUERY: 'query',
  EXPORT: 'export',
  IMPORT: 'import',
  ERROR: 'error',
  WARNING: 'warning',
  REFRESH: 'refresh',
  COPY: 'copy'
};

// 默认配置
const DEFAULT_CONFIG = {
  PORT: 3000,
  LOCK_TIMEOUT: 30000,
  MAX_HISTORY: 1000,
  MAX_DB_COUNT: 16
};

module.exports = {
  JWT_SECRET,
  USER_ROLES,
  OPERATION_TYPES,
  DEFAULT_CONFIG
}; 