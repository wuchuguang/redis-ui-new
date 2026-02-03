const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DIST_DIR = path.join(__dirname, 'dist')
const SERVER_BUNDLE = path.join(DIST_DIR, 'server', 'index.js')

// 1. 构建前端
function buildFrontend() {
  console.log('🔨 构建前端...')
  execSync('cd client && npm run build', { stdio: 'inherit' })
  console.log('✅ 前端构建完成')
}

// 2. 清理并创建 dist 目录
function prepareDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(path.join(DIST_DIR, 'server'), { recursive: true })
  fs.mkdirSync(path.join(DIST_DIR, 'users'), { recursive: true })
  fs.mkdirSync(path.join(DIST_DIR, 'connections'), { recursive: true })
  fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true })
  console.log('📁 已创建 dist 目录结构')
}

// 3. esbuild 打包服务端（压缩）
async function buildBackend() {
  console.log('⚡ 使用 esbuild 打包服务端（压缩）...')
  await esbuild.build({
    entryPoints: ['server/index.js'],
    bundle: true,
    platform: 'node',
    target: 'node16',
    outfile: SERVER_BUNDLE,
    minify: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    sourcemap: false,
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    banner: {
      js: '#!/usr/bin/env node\n'
    },
    mangleProps: /^_/,
    keepNames: false,
    legalComments: 'none'
  })
  console.log('✅ 服务端打包完成')
}

// 4. 混淆加密（使用保守配置，兼容 Node.js）
function obfuscateBundle() {
  try {
    const obfuscator = require('javascript-obfuscator')
    console.log('🔐 混淆加密中...')
    const code = fs.readFileSync(SERVER_BUNDLE, 'utf8')
    const obfuscated = obfuscator.obfuscate(code, {
      target: 'node',
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: false,
      stringArray: true,
      stringArrayEncoding: [],
      stringArrayThreshold: 0.5,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      legalComments: 'none'
    })
    fs.writeFileSync(SERVER_BUNDLE, obfuscated.getObfuscatedCode(), 'utf8')
    console.log('✅ 混淆加密完成')
  } catch (err) {
    console.warn('⚠️ 混淆失败，使用未混淆版本:', err.message)
  }
}

// 5. 复制前端到 dist/server/web
function copyFrontend() {
  const src = path.join(__dirname, 'client', 'build', 'web')
  const dest = path.join(DIST_DIR, 'server', 'web')
  if (!fs.existsSync(src)) {
    console.error('❌ 前端构建产物不存在: client/build/web')
    process.exit(1)
  }
  copyRecursive(src, dest)
  console.log('✅ 前端文件已复制到 dist/server/web')
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src)
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

// 6. 复制 data 初始文件
function copyDataFiles() {
  const dataSrc = path.join(__dirname, 'server', 'data')
  const dataDest = path.join(DIST_DIR, 'data')
  fs.mkdirSync(dataDest, { recursive: true })
  if (fs.existsSync(dataSrc)) {
    copyRecursive(dataSrc, dataDest)
  }
}

// 7. 生成使用说明
function generateUsageDoc() {
  const src = path.join(__dirname, 'doc', 'dist-使用说明.md')
  const dest = path.join(DIST_DIR, '使用说明.md')
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    console.log('✅ 已生成 dist/使用说明.md')
  }
}

// 8. 生成 dist/package.json
function generatePackageJson() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
  const distPkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    main: 'server/index.js',
    scripts: {
      start: 'node server/index.js'
    },
    engines: {
      node: '>=16.0.0'
    }
  }
  fs.writeFileSync(path.join(DIST_DIR, 'package.json'), JSON.stringify(distPkg, null, 2))
  console.log('✅ 已生成 dist/package.json')
}

async function main() {
  console.log('🚀 开始构建 dist 包...\n')
  buildFrontend()
  prepareDist()
  await buildBackend()
  obfuscateBundle()
  copyFrontend()
  copyDataFiles()
  generateUsageDoc()
  generatePackageJson()
  console.log('\n🎉 构建完成！')
  console.log('📁 输出目录: dist/')
  console.log('🚀 启动方式: cd dist && npm i && npm run start')
}

main().catch((err) => {
  console.error('❌ 构建失败:', err)
  process.exit(1)
})
