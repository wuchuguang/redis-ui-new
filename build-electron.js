const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始构建 Electron 应用...')

// 检查必要的文件是否存在
function checkFiles() {
  console.log('📋 检查必要文件...')
  
  const requiredFiles = [
    'electron/main.js',
    'electron/about.html',
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

// 构建 Electron 应用
function buildElectron() {
  console.log('⚡ 构建 Electron 应用...')
  
  const platform = process.argv[2] || 'win'
  
  try {
    let command = 'npx electron-builder'
    
    switch (platform) {
      case 'win':
        command += ' --win'
        break
      case 'mac':
        command += ' --mac'
        break
      case 'linux':
        command += ' --linux'
        break
      default:
        console.log('⚠️ 未知平台，使用默认构建')
    }
    
    console.log(`执行命令: ${command}`)
    execSync(command, { stdio: 'inherit' })
    console.log('✅ Electron 应用构建完成')
  } catch (error) {
    console.error('❌ Electron 构建失败:', error.message)
    process.exit(1)
  }
}

// 显示构建结果
function showBuildResult() {
  console.log('\n🎉 构建完成！')
  console.log('📦 构建文件位置: dist-electron/')
  
  const distPath = path.join(__dirname, 'dist-electron')
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath)
    console.log('📋 生成的文件:')
    files.forEach(file => {
      console.log(`  - ${file}`)
    })
  }
  
  console.log('\n💡 提示:')
  console.log('  - Windows: 运行 .exe 安装文件')
  console.log('  - macOS: 运行 .dmg 安装文件')
  console.log('  - Linux: 运行 .AppImage 文件')
}

// 主函数
async function main() {
  try {
    checkFiles()
    buildFrontend()
    checkClientBuild()
    buildElectron()
    showBuildResult()
  } catch (error) {
    console.error('❌ 构建过程中发生错误:', error.message)
    process.exit(1)
  }
}

// 运行主函数
main() 