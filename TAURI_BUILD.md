# Tauri 桌面应用构建指南

本项目使用 Tauri + Node.js Express 构建高性能桌面应用，支持 Windows、macOS 和 Linux 平台。

## 架构说明

- **Tauri**: 提供桌面应用外壳，使用 Rust 编写，性能优秀
- **Node.js Express**: 后端服务，处理 Redis 连接和业务逻辑
- **Vue3 + Element Plus**: 前端界面，保持不变

## 环境要求

### 必需环境
- Node.js 16+
- Rust 1.70+ (用于 Tauri)
- 系统依赖 (见下方)

### 系统依赖

#### Windows
- Microsoft Visual Studio C++ Build Tools
- WebView2

#### macOS
- Xcode Command Line Tools
- WebKit

#### Linux
- 基础开发工具
- WebKit2GTK

## 安装步骤

### 1. 安装 Rust
```bash
# 安装 Rust
curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 重新加载环境变量
source ~/.bashrc  # 或 source ~/.zshrc

# 验证安装
rustc --version
cargo --version
```

### 2. 安装 Tauri CLI
```bash
npm install -g @tauri-apps/cli

# 验证安装
tauri --version
```

### 3. 安装项目依赖
```bash
npm run install-all
```

## 开发模式

### 启动开发环境
```bash
# 启动前端开发服务器
npm run client

# 在另一个终端启动后端服务器
npm run server

# 在第三个终端启动 Tauri 开发模式
npm run tauri:dev
```

### 或者使用一键启动
```bash
npm run tauri:dev
```

## 构建命令

### 构建所有平台
```bash
npm run tauri:build
```

### 构建特定平台
```bash
# Windows
npm run tauri:build:win

# macOS
npm run tauri:build:mac

# Linux
npm run tauri:build:linux
```

### 使用自定义构建脚本
```bash
# 构建所有平台
node build-tauri.js

# 构建特定平台
node build-tauri.js win
node build-tauri.js mac
node build-tauri.js linux
```

## 构建过程

构建过程包括以下步骤：

1. **环境检查** - 验证 Rust 和 Tauri CLI
2. **前端构建** - 使用 Vite 构建 Vue 应用
3. **后端集成** - 确保 Node.js 服务器配置正确
4. **Tauri 构建** - 使用 Rust 编译桌面应用
5. **打包优化** - 生成最终的可执行文件

## 输出文件

构建完成后，生成的文件位于 `src-tauri/target/release/` 目录：

- **Windows**: `redis-manager.exe`
- **macOS**: `redis-manager.app`
- **Linux**: `redis-manager` (可执行文件)

## 应用特性

### 性能优势
- ⚡ **极快启动** - Rust 编译，启动速度快
- 💾 **内存占用小** - 比 Electron 小很多
- 🔒 **安全性高** - 默认安全配置
- 📦 **包体积小** - 最终文件大小小

### 功能特性
- 🖥️ **原生桌面体验** - 真正的桌面应用
- 🚀 **自动后端启动** - 应用启动时自动启动 Node.js 服务器
- 📱 **响应式界面** - 支持窗口大小调整
- 🎨 **深色主题** - 完整的深色主题支持
- 🔒 **安全认证** - 用户登录和权限管理

### 开发体验
- 🔄 **热重载** - 开发时支持热重载
- 🛠️ **调试友好** - 支持开发者工具
- 📝 **类型安全** - Rust 提供类型安全
- 🎯 **跨平台** - 一套代码，多平台运行

## 配置说明

### Tauri 配置 (`src-tauri/tauri.conf.json`)
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../client/dist"
  },
  "tauri": {
    "allowlist": {
      "http": {
        "all": true,
        "request": true,
        "scope": ["http://localhost:*", "https://*"]
      }
    }
  }
}
```

### Rust 配置 (`src-tauri/Cargo.toml`)
```toml
[dependencies]
tauri = { version = "1.5", features = ["api-all"] }
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }
```

## 故障排除

### 常见问题

1. **Rust 环境问题**
   ```bash
   # 更新 Rust
   rustup update
   
   # 检查工具链
   rustup show
   ```

2. **构建失败**
   ```bash
   # 清理构建缓存
   cargo clean
   
   # 重新构建
   npm run tauri:build
   ```

3. **依赖问题**
   ```bash
   # 更新依赖
   npm update
   cargo update
   ```

4. **权限问题 (Linux)**
   ```bash
   # 安装系统依赖
   sudo apt update
   sudo apt install libwebkit2gtk-4.0-dev
   ```

### 调试技巧

1. **查看构建日志**
   ```bash
   npm run tauri:build 2>&1 | tee build.log
   ```

2. **启用详细输出**
   ```bash
   RUST_LOG=debug npm run tauri:build
   ```

3. **检查系统依赖**
   ```bash
   # Linux
   ldd src-tauri/target/release/redis-manager
   
   # macOS
   otool -L src-tauri/target/release/redis-manager
   ```

## 发布说明

### Windows 发布
- 生成 `.exe` 可执行文件
- 支持 Windows 7+ (需要 WebView2)
- 可创建安装程序

### macOS 发布
- 生成 `.app` 应用包
- 支持 macOS 10.13+
- 可签名和公证

### Linux 发布
- 生成可执行文件
- 支持主流 Linux 发行版
- 可打包为 AppImage

## 性能对比

| 特性 | Tauri | Electron |
|------|-------|----------|
| 启动时间 | ~1s | ~3-5s |
| 内存占用 | ~50MB | ~150MB |
| 包大小 | ~10MB | ~100MB |
| 安全性 | 高 | 中等 |

## 更新日志

- **v1.0.0** - 初始版本，支持基本的桌面应用功能
- Tauri 1.5 集成
- Node.js Express 后端集成
- 深色主题支持
- 自动服务器启动 