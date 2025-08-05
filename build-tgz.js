const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取当前日期
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 构建配置
const buildConfig = {
  entryPoints: ['server/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outdir: 'build',
  minify: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  sourcemap: false,
  // 移除 external 配置，让 esbuild 打包所有依赖到单个文件中
  // external: [
  //   // 外部依赖，不打包进bundle
  //   'express',
  //   'cors',
  //   'bcryptjs',
  //   'jsonwebtoken',
  //   'redis',
  //   'uuid',
  //   'dotenv'
  // ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  banner: {
    js: '#!/usr/bin/env node\n'
  },
  // 增强混淆配置
  mangleProps: /^_/, // 混淆以下划线开头的属性
  keepNames: false, // 不保留函数名
  // drop: ['console', 'debugger'], // 保留调试代码用于测试
  // pure: ['console.log', 'console.error', 'console.warn'], // 保留日志
  legalComments: 'none' // 移除所有注释
};

// 构建前端
function buildFrontend() {
  console.log('🔨 开始构建前端...');
  try {
    execSync('cd client && npm run build', { stdio: 'inherit' });
    console.log('✅ 前端构建完成');
  } catch (error) {
    console.error('❌ 前端构建失败:', error.message);
    process.exit(1);
  }
}

// 复制前端文件
function copyFrontendFiles() {
  const clientBuildPath = path.join(__dirname, 'client/build/web');
  const targetPath = path.join(__dirname, 'build/web');

  if (fs.existsSync(clientBuildPath)) {
    console.log('📁 正在复制前端文件...');
    
    // 创建目标目录
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    // 复制文件
    const copyRecursive = (src, dest) => {
      const stats = fs.statSync(src);
      if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const files = fs.readdirSync(src);
        for (const file of files) {
          copyRecursive(path.join(src, file), path.join(dest, file));
        }
      } else {
        fs.copyFileSync(src, dest);
        console.log(`复制文件: ${src} -> ${dest}`);
      }
    };

    copyRecursive(clientBuildPath, targetPath);
    console.log('✅ 前端文件复制完成');
  } else {
    console.log('⚠️ 前端构建文件不存在，跳过复制');
  }
}

// 生成生产环境 package.json
function generatePackageJson() {
  const packagePath = path.join(__dirname, 'package.json');
  const buildPackagePath = path.join(__dirname, 'build/package.json');
  
  if (fs.existsSync(packagePath)) {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // 所有依赖都已打包进 index.js，不需要外部依赖
    const buildPackage = {
      name: packageData.name,
      version: packageData.version,
      description: packageData.description,
      main: 'index.js',
      scripts: {
        start: 'node index.js'
      },
      // 不需要 dependencies，因为所有依赖都已打包
      engines: {
        node: '>=16.0.0'
      }
    };

    fs.writeFileSync(buildPackagePath, JSON.stringify(buildPackage, null, 2));
    console.log('📦 生产环境 package.json 已生成');
  }
}

// 修复构建后的路径
function fixBuildPaths() {
  const indexPath = path.join(__dirname, 'build/index.js');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // 替换路径从 ../client/build/web 改为 ./web
    content = content.replace(/\.\.\/client\/build\/web/g, './web');
    
    // 修复可能的语法错误
    content = content.replace(/return\s*,\s*([^;]+);/g, 'return $1;');
    content = content.replace(/,\s*,/g, ',');
    
    fs.writeFileSync(indexPath, content);
    console.log('🔧 已修复构建后的路径配置和语法错误');
  }
}

// 构建服务端
async function buildBackend() {
  console.log('🔨 开始构建服务端...');
  try {
    console.log('正在压缩和混淆代码...');
    await esbuild.build(buildConfig);
    console.log('✅ 服务端构建完成');
  } catch (error) {
    console.error('❌ 服务端构建失败:', error);
    process.exit(1);
  }
}

// 创建 tgz 文件
function createTgzFile() {
  const date = getCurrentDate();
  const tgzFileName = `build-${date}.tgz`;
  
  console.log(`📦 正在创建 tgz 文件: ${tgzFileName}`);
  
  try {
    // 确保 build 目录存在
    if (!fs.existsSync('build')) {
      console.error('❌ build 目录不存在');
      process.exit(1);
    }
    
    // 创建 tgz 文件
    execSync(`tar -czf ${tgzFileName} build/`, { stdio: 'inherit' });
    
    // 获取文件大小
    const stats = fs.statSync(tgzFileName);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ tgz 文件创建成功: ${tgzFileName} (${fileSizeInMB} MB)`);
    
    // 显示文件信息
    console.log('\n📋 构建产物信息:');
    console.log(`📁 构建目录: build/`);
    console.log(`📦 压缩文件: ${tgzFileName}`);
    console.log(`📏 文件大小: ${fileSizeInMB} MB`);
    console.log(`🚀 启动命令: tar -xzf ${tgzFileName} && cd build && node index.js`);
    
    return tgzFileName;
  } catch (error) {
    console.error('❌ 创建 tgz 文件失败:', error.message);
    process.exit(1);
  }
}

// 清理旧的构建文件
function cleanupOldBuilds() {
  console.log('🧹 清理旧的构建文件...');
  
  // 删除旧的 build 目录
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true, force: true });
    console.log('已删除旧的 build 目录');
  }
  
  // 删除旧的 tgz 文件（保留最近3个）
  const tgzFiles = fs.readdirSync('.').filter(file => file.startsWith('build-') && file.endsWith('.tgz'));
  if (tgzFiles.length > 3) {
    // 按修改时间排序，删除最旧的文件
    const sortedFiles = tgzFiles.map(file => ({
      name: file,
      mtime: fs.statSync(file).mtime
    })).sort((a, b) => a.mtime - b.mtime);
    
    const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 3);
    for (const file of filesToDelete) {
      fs.unlinkSync(file.name);
      console.log(`已删除旧文件: ${file.name}`);
    }
  }
}

// 主构建函数
async function buildAll() {
  try {
    console.log('🚀 开始完整构建流程...\n');
    
    // 1. 清理旧的构建文件
    cleanupOldBuilds();
    
    // 2. 构建前端
    buildFrontend();
    
    // 3. 构建服务端
    await buildBackend();
    
    // 4. 复制前端文件
    copyFrontendFiles();
    
    // 5. 生成生产环境 package.json
    generatePackageJson();
    
    // 6. 修复构建后的路径
    fixBuildPaths();
    
    // 7. 创建 tgz 文件
    const tgzFileName = createTgzFile();
    
    console.log('\n🎉 完整构建流程完成！');
    console.log(`📦 最终产物: ${tgzFileName}`);
    console.log('📋 部署说明:');
    console.log(`   1. 解压: tar -xzf ${tgzFileName}`);
    console.log('   2. 进入: cd build');
    console.log('   3. 启动: node index.js');
    console.log('   4. 访问: http://localhost:3000/web');
    
  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

// 执行构建
buildAll(); 