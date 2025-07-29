# 用户数据存储结构

## 概述

为了提高数据安全性和可维护性，用户数据现在采用每个用户独立文件的方式存储，而不是将所有用户数据集中在一个文件中。

## 目录结构

```
server/
├── users/                    # 用户数据目录
│   ├── admin.json           # 管理员用户数据
│   ├── user1.json           # 用户1数据
│   ├── user2.json           # 用户2数据
│   └── ...                  # 其他用户数据
└── migrate-users.js         # 数据迁移脚本
```

## 文件格式

每个用户文件都是加密的JSON格式，包含以下信息：

```json
{
  "iv": "加密向量",
  "data": "加密后的用户数据"
}
```

## 用户数据结构

解密后的用户数据包含：

```json
{
  "id": "用户唯一ID",
  "username": "用户名",
  "email": "邮箱",
  "password": "加密密码",
  "role": "用户角色",
  "nickname": "昵称",
  "avatar": "头像",
  "connections": [
    {
      "id": "连接ID",
      "name": "连接名称",
      "host": "主机地址",
      "port": 6379,
      "password": "密码",
      "database": 0,
      "status": "connected"
    }
  ],
  "createdAt": "创建时间"
}
```

## 优势

### 1. 数据隔离
- 每个用户的数据独立存储，互不影响
- 单个用户文件损坏不会影响其他用户

### 2. 安全性
- 所有用户数据都经过AES-256-CBC加密
- 每个用户文件使用独立的加密向量

### 3. 可维护性
- 可以单独备份、恢复或删除特定用户数据
- 便于用户数据迁移和管理

### 4. 性能
- 只加载需要的用户数据到内存
- 减少文件读写冲突

## 迁移说明

如果你有旧的 `auth.json` 文件，请运行迁移脚本：

```bash
cd server
node migrate-users.js
```

迁移脚本会：
1. 读取旧的 `auth.json` 文件
2. 为每个用户创建独立的加密文件
3. 备份原始文件
4. 在新目录中创建用户数据

## 注意事项

1. **备份重要**：迁移前请备份原始数据
2. **权限设置**：确保 `users/` 目录有适当的读写权限
3. **加密密钥**：确保 `ENCRYPTION_KEY` 环境变量设置正确
4. **文件权限**：用户文件应该只有应用程序可以访问

## 故障排除

### 文件权限问题
```bash
chmod 600 server/users/*.json
chmod 700 server/users/
```

### 加密密钥问题
确保环境变量设置正确：
```bash
export ENCRYPTION_KEY="your-32-character-encryption-key"
```

### 数据恢复
如果某个用户文件损坏，可以从备份恢复：
```bash
cp server/users/username.json.backup server/users/username.json
``` 