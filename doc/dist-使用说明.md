# Redis 管理工具 - 使用说明

## 快速启动

### 环境要求
- Node.js >= 16.0.0
- Redis 服务器（用于管理目标）

### 启动步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动服务**
   ```bash
   npm run start
   ```

3. **访问应用**
   打开浏览器访问：`http://localhost:3333/web`

### 默认管理员
- 用户名：`admin`
- 密码：`admin123`
- 首次启动会自动创建，建议登录后立即修改密码

---

## 目录结构

```
dist/
├── package.json       # 项目配置
├── 使用说明.md        # 本文件
├── server/
│   ├── index.js       # 服务端主程序
│   └── web/           # 前端静态资源
├── users/             # 用户数据（运行时生成）
├── connections/       # 连接配置（运行时生成）
└── data/              # 权限等配置（运行时生成）
```

---

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3333 |
| HOST | 监听地址 | 0.0.0.0 |
| BASE_URL | 对外访问地址（用于日志展示） | - |

**HOST 说明**：
- `0.0.0.0`（默认）：监听所有网卡，支持本机、局域网 IP、域名访问
- `127.0.0.1`：仅本机访问
- 指定 IP：如 `192.168.1.10` 绑定到该网卡

**示例**：
```bash
# 使用端口 8080
PORT=8080 npm run start

# 仅本机访问
HOST=127.0.0.1 npm run start

# 绑定指定 IP
HOST=192.168.1.100 npm run start

# 域名访问（通过反向代理）时，可设置 BASE_URL 便于查看
BASE_URL=https://redis.example.com npm run start
```

**IP / 域名访问**：
- 默认监听 `0.0.0.0`，启动后会输出局域网 IP 地址
- 可直接用 `http://你的IP:3333/web` 或 `http://域名:3333/web` 访问
- 使用域名时，通常配合 Nginx 反向代理，将 `https://redis.example.com` 代理到 `http://127.0.0.1:3333`

**Nginx 反向代理示例**（域名 + HTTPS）：
```nginx
server {
    listen 443 ssl;
    server_name redis.example.com;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 数据存储
- **users/**：用户账户数据（加密存储）
- **connections/**：Redis 连接配置
- **data/**：权限配置等

---

## 主要功能

### 用户与连接
- 注册/登录、多用户支持
- 新建连接、连接管理、连接分享
- 支持多 Redis 实例管理

### 数据操作
- 浏览键值（String、Hash、List、Set、ZSet）
- 编辑、删除、批量操作
- 搜索、分页加载
- 数据转换（时间戳、JSON、Base64 等）

### 高级功能
- 转换规则引擎（基于键模式自动转换）
- 操作历史与导出
- 数据备份与恢复
- 批量操作工具

---

## 常见问题

**Q: 无法连接 Redis**
A: 确认 Redis 服务已启动，检查主机、端口、密码是否正确。

**Q: 如何修改管理员密码**
A: 登录后，管理员可在「用户管理」中修改其他用户密码；修改自己的密码请通过管理后台或联系部署方。

**Q: 端口被占用**
A: 设置环境变量 `PORT=其他端口` 后启动。

---

## 技术栈
- 后端：Node.js + Express
- 前端：Vue 3 + Element Plus
- 认证：JWT
