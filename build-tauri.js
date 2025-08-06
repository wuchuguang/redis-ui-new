const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始构建 Tauri 桌面应用...')

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

// 检查 Rust 环境
function checkRustEnvironment() {
  console.log('🔧 检查 Rust 环境...')
  
  try {
    execSync('rustc --version', { stdio: 'pipe' })
    console.log('✅ Rust 环境检查通过')
  } catch (error) {
    console.error('❌ 未找到 Rust 环境，请先安装 Rust')
    console.log('💡 安装命令: curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh')
    process.exit(1)
  }
}

// 检查 Tauri CLI
function checkTauriCLI() {
  console.log('📦 检查 Tauri CLI...')
  
  try {
    execSync('tauri --version', { stdio: 'pipe' })
    console.log('✅ Tauri CLI 检查通过')
  } catch (error) {
    console.log('📦 安装 Tauri CLI...')
    try {
      execSync('npm install -g @tauri-apps/cli', { stdio: 'inherit' })
      console.log('✅ Tauri CLI 安装完成')
    } catch (installError) {
      console.error('❌ Tauri CLI 安装失败:', installError.message)
      process.exit(1)
    }
  }
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
  
  const distPath = path.join(__dirname, 'client/dist')
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

// 显示构建结果
function showBuildResult() {
  console.log('\n🎉 Tauri 桌面应用构建完成！')
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
    checkRustEnvironment()
    checkTauriCLI()
    buildFrontend()
    checkClientBuild()
    buildTauriApp()
    showBuildResult()
  } catch (error) {
    console.error('❌ 构建过程中发生错误:', error.message)
    process.exit(1)
  }
}

// 运行主函数
main() 