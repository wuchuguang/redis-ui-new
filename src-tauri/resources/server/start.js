#!/usr/bin/env node

/**
 * Redis管理工具服务器启动脚本
 * 
 * 使用方法:
 *   node start.js          # 开发模式启动
 *   NODE_ENV=production node start.js  # 生产模式启动
 */

require('dotenv').config();

// 检查环境变量
const NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`启动模式: ${NODE_ENV}`);

// 启动应用
require('./app'); 