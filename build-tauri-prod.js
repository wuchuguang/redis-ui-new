const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始构建 Tauri 生产版本...')

// 检查必要的文件是否存在
function checkFiles() {
  console.log('📋 检查必要文件...')
  
  const requiredFiles = [
    'src-tauri/Cargo.toml',
    'src-tauri/tauri.conf.json',
    'src-tauri/src/main.rs',
    'server/index.js',
    'package.json'
  ]
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ 缺少必要文件: ${file}`)
      process.exit(1)
    }
  }
  
  console.log('✅ 所有必要文件检查通过')
}

// 构建前端
function buildFrontend() {
  console.log('🔨 构建前端应用...')
  
  try {
    execSync('cd client && npm run build', { stdio: 'inherit' })
    console.log('✅ 前端构建完成')
  } catch (error) {
    console.error('❌ 前端构建失败:', error.message)
    process.exit(1)
  }
}

// 检查客户端构建结果
function checkClientBuild() {
  console.log('📁 检查客户端构建结果...')
  
  const distPath = path.join(__dirname, 'client/build/web')
  if (!fs.existsSync(distPath)) {
    console.error('❌ 客户端构建目录不存在')
    process.exit(1)
  }
  
  const indexHtml = path.join(distPath, 'index.html')
  if (!fs.existsSync(indexHtml)) {
    console.error('❌ 客户端构建文件不完整')
    process.exit(1)
  }
  
  console.log('✅ 客户端构建结果检查通过')
}

// 创建服务器文件包
function createServerBundle() {
  console.log('📦 创建服务器文件包...')
  
  const serverBundleDir = path.join(__dirname, 'src-tauri/server-bundle')
  
  // 清理并创建目录
  if (fs.existsSync(serverBundleDir)) {
    fs.rmSync(serverBundleDir, { recursive: true, force: true })
  }
  fs.mkdirSync(serverBundleDir, { recursive: true })
  
  // 复制服务器文件
  const serverDir = path.join(__dirname, 'server')
  const copyRecursive = (src, dest) => {
    if (fs.statSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }
      fs.readdirSync(src).forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file))
      })
    } else {
      fs.copyFileSync(src, dest)
    }
  }
  
  copyRecursive(serverDir, path.join(serverBundleDir, 'server'))
  
  // 复制 package.json
  fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(serverBundleDir, 'package.json'))
  
  console.log('✅ 服务器文件包创建完成')
}

// 构建 Tauri 应用
function buildTauriApp() {
  console.log('⚡ 构建 Tauri 应用...')
  
  const platform = process.argv[2] || 'all'
  
  try {
    let command = 'tauri build'
    
    switch (platform) {
      case 'win':
        command = 'tauri build --target x86_64-pc-windows-msvc'
        break
      case 'mac':
        command = 'tauri build --target x86_64-apple-darwin'
        break
      case 'linux':
        command = 'tauri build --target x86_64-unknown-linux-gnu'
        break
      default:
        console.log('🔨 构建所有平台...')
    }
    
    console.log(`执行命令: ${command}`)
    execSync(command, { stdio: 'inherit' })
    console.log('✅ Tauri 应用构建完成')
  } catch (error) {
    console.error('❌ Tauri 构建失败:', error.message)
    process.exit(1)
  }
}

// 复制服务器文件到应用包
function copyServerToApp() {
  console.log('📋 复制服务器文件到应用包...')
  
  const platform = process.argv[2] || 'mac'
  let appPath = ''
  
  switch (platform) {
    case 'win':
      appPath = path.join(__dirname, 'src-tauri/target/release/bundle/msi/Redis管理工具.exe')
      break
    case 'mac':
      appPath = path.join(__dirname, 'src-tauri/target/release/bundle/macos/Redis管理工具.app/Contents/Resources')
      break
    case 'linux':
      appPath = path.join(__dirname, 'src-tauri/target/release/bundle/appimage/redis-manager.AppDir/usr/bin')
      break
    default:
      appPath = path.join(__dirname, 'src-tauri/target/release/bundle/macos/Redis管理工具.app/Contents/Resources')
  }
  
  if (fs.existsSync(appPath)) {
    const serverBundleDir = path.join(__dirname, 'src-tauri/server-bundle')
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true })
        }
        fs.readdirSync(src).forEach(file => {
          copyRecursive(path.join(src, file), path.join(dest, file))
        })
      } else {
        fs.copyFileSync(src, dest)
      }
    }
    
    copyRecursive(serverBundleDir, appPath)
    console.log('✅ 服务器文件复制完成')
  } else {
    console.warn('⚠️ 应用包路径不存在，跳过服务器文件复制')
  }
}

// 显示构建结果
function showBuildResult() {
  console.log('\n🎉 Tauri 生产版本构建完成！')
  console.log('📦 构建文件位置: src-tauri/target/release/')
  
  const targetPath = path.join(__dirname, 'src-tauri/target/release')
  if (fs.existsSync(targetPath)) {
    const files = fs.readdirSync(targetPath)
    console.log('📋 生成的文件:')
    files.forEach(file => {
      if (file.includes('redis-manager')) {
        console.log(`  - ${file}`)
      }
    })
  }
  
  console.log('\n💡 提示:')
  console.log('  - Windows: 运行 .exe 文件')
  console.log('  - macOS: 运行 .app 文件')
  console.log('  - Linux: 运行可执行文件')
  console.log('  - 应用会自动启动 Node.js 后端服务器')
}

// 主函数
async function main() {
  try {
    checkFiles()
    buildFrontend()
    checkClientBuild()
    createServerBundle()
    buildTauriApp()
    copyServerToApp()
    showBuildResult()
  } catch (error) {
    console.error('❌ 构建过程中发生错误:', error.message)
    process.exit(1)
  }
}

// 运行主函数
main() 