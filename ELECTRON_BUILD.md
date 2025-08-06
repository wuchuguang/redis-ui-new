# Electron 桌面应用构建指南

本项目支持将 Redis 管理工具打包成桌面应用，支持 Windows、macOS 和 Linux 平台。

## 环境要求

- Node.js 16+ 
- npm 或 yarn
- Windows 构建需要 Windows 系统
- macOS 构建需要 macOS 系统
- Linux 构建需要 Linux 系统

## 安装依赖

```bash
# 安装所有依赖（包括 Electron）
npm run install-all
```

## 构建命令

### 构建 Windows 应用
```bash
npm run build:electron:win
```

### 构建 macOS 应用
```bash
npm run build:electron:mac
```

### 构建 Linux 应用
```bash
npm run build:electron:linux
```

### 构建当前平台应用
```bash
npm run build:electron
```

## 构建过程

构建过程包括以下步骤：

1. **检查必要文件** - 验证所有必需的文件是否存在
2. **构建前端** - 使用 Vite 构建 Vue 应用
3. **检查构建结果** - 验证前端构建是否成功
4. **构建 Electron 应用** - 使用 electron-builder 打包桌面应用
5. **显示结果** - 显示生成的文件位置

## 输出文件

构建完成后，生成的文件位于 `dist-electron/` 目录：

- **Windows**: `.exe` 安装文件
- **macOS**: `.dmg` 安装文件  
- **Linux**: `.AppImage` 文件

## 应用特性

### 桌面应用功能
- 🖥️ 原生桌面应用体验
- 🚀 自动启动后端服务器
- 📱 响应式界面设计
- 🔒 安全的进程隔离
- 🎨 深色主题支持

### 菜单功能
- **文件** - 退出应用
- **编辑** - 复制、粘贴等编辑操作
- **视图** - 重新加载、开发者工具、缩放等
- **帮助** - 关于页面

### 安全特性
- 禁用 Node.js 集成
- 启用上下文隔离
- 禁用远程模块
- 启用 Web 安全

## 开发模式

要在开发模式下运行 Electron 应用：

```bash
# 启动开发服务器
npm run dev

# 在另一个终端启动 Electron
npx electron electron/main.js
```

## 自定义配置

### 修改应用信息
编辑 `package.json` 中的 `build` 配置：

```json
{
  "build": {
    "appId": "com.redis.web",
    "productName": "Redis管理工具",
    "directories": {
      "output": "dist-electron"
    }
  }
}
```

### 修改窗口配置
编辑 `electron/main.js` 中的 `createWindow` 函数：

```javascript
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    // 其他配置...
  })
}
```

### 添加应用图标
1. 准备 256x256 像素的 PNG 图标
2. 替换 `electron/assets/icon.png`
3. 对于 Windows，还需要 `.ico` 格式的图标

## 故障排除

### 常见问题

1. **构建失败**
   - 确保所有依赖已正确安装
   - 检查 Node.js 版本是否兼容
   - 查看错误日志获取详细信息

2. **应用无法启动**
   - 检查后端服务器是否正常启动
   - 查看控制台错误信息
   - 验证端口是否被占用

3. **图标不显示**
   - 确保图标文件格式正确
   - 检查图标文件路径
   - 重新构建应用

### 调试技巧

1. **启用开发者工具**
   - 在开发模式下自动启用
   - 生产模式下可通过菜单启用

2. **查看日志**
   - 应用启动时会显示服务器日志
   - 错误信息会输出到控制台

3. **重新构建**
   - 删除 `dist-electron/` 目录
   - 重新运行构建命令

## 发布说明

### Windows 发布
- 生成 `.exe` 安装文件
- 支持自定义安装目录
- 创建桌面和开始菜单快捷方式

### macOS 发布
- 生成 `.dmg` 安装文件
- 支持拖拽安装
- 符合 macOS 应用规范

### Linux 发布
- 生成 `.AppImage` 文件
- 无需安装，直接运行
- 支持多种 Linux 发行版

## 更新日志

- **v1.0.0** - 初始版本，支持基本的桌面应用功能
- 深色主题支持
- 自动服务器启动
- 完整的菜单系统 