#!/usr/bin/env node
/**
 * 重置指定用户密码（用于忘记管理员密码时设置新密码）
 * 用法：node scripts/set-admin-password.js <用户名> <新密码>
 * 示例：node scripts/set-admin-password.js admin myNewPassword123
 */

const path = require('path')

// 从项目根目录加载 server 模块
const serverUserPath = path.join(__dirname, '..', 'server', 'services', 'user.js')
const userService = require(serverUserPath)
const bcrypt = require('bcryptjs')

const args = process.argv.slice(2)
const username = args[0]
const newPassword = args[1]

if (!username || !newPassword) {
  console.error('用法: node scripts/set-admin-password.js <用户名> <新密码>')
  console.error('示例: node scripts/set-admin-password.js admin myNewPassword123')
  process.exit(1)
}

async function main() {
  try {
    await userService.loadUsersFromFile()
    const user = userService.users.get(username)
    if (!user) {
      console.error(`用户「${username}」不存在。当前用户列表：${[...userService.users.keys()].join(', ')}`)
      process.exit(1)
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10)
    user.password = hashedPassword
    await userService.saveUserToFile(username)
    console.log(`用户「${username}」密码已更新成功。`)
  } catch (err) {
    console.error('设置密码失败:', err.message)
    process.exit(1)
  }
}

main()
