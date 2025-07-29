# JWT配置说明

## 问题描述

当服务端重启时，前端登录状态可能失效，这是因为JWT配置不当导致的。

## 解决方案

### 1. 设置环境变量

在生产环境中，请设置以下环境变量：

```bash
# JWT密钥 - 必须设置一个强密钥
JWT_SECRET=your-super-secret-jwt-key-here

# 数据加密密钥 - 必须设置一个32字符的密钥
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### 2. 创建.env文件

在项目根目录创建`.env`文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here

# 数据加密密钥
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### 3. 密钥生成建议

#### JWT_SECRET
- 长度：至少32字符
- 复杂度：包含大小写字母、数字、特殊字符
- 示例：`MySuperSecretJWTKey2024!@#$%^&*()`

#### ENCRYPTION_KEY
- 长度：必须是32字符
- 复杂度：包含大小写字母、数字、特殊字符
- 示例：`My32CharEncryptionKey2024!@#$`

### 4. 验证配置

启动服务后，查看控制台输出：

```
JWT密钥状态: 已配置
JWT密钥长度: 32
```

### 5. 注意事项

- **不要使用默认密钥**：默认密钥仅用于开发环境
- **密钥保密**：不要将密钥提交到版本控制系统
- **定期更换**：建议定期更换密钥
- **备份密钥**：密钥丢失将导致所有用户需要重新登录

## 开发环境

开发环境可以使用默认密钥，但建议设置环境变量：

```bash
# 开发环境
JWT_SECRET=dev-jwt-secret-key-2024
ENCRYPTION_KEY=dev-32-char-encryption-key
```

## 生产环境

生产环境必须设置强密钥：

```bash
# 生产环境
JWT_SECRET=prod-super-secret-jwt-key-2024!@#$%^&*()
ENCRYPTION_KEY=prod-32-char-encryption-key-2024
``` 