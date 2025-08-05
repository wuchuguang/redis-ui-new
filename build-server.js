const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

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

// 复制前端文件
function copyFrontendFiles() {
  const clientBuildPath = path.join(__dirname, 'client/build/web');
  const targetPath = path.join(__dirname, 'build/web');

  if (fs.existsSync(clientBuildPath)) {
    console.log('正在复制前端文件...');
    
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
    console.log('前端文件复制完成');
  } else {
    console.log('前端构建文件不存在，跳过复制');
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
    console.log('生产环境 package.json 已生成');
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
    console.log('已修复构建后的路径配置和语法错误');
  }
}

// 主构建函数
async function build() {
  try {
    console.log('开始构建服务端代码...');
    
    // 执行 esbuild 构建
    console.log('正在压缩和混淆代码...');
    await esbuild.build(buildConfig);
    
    // 复制前端文件
    copyFrontendFiles();
    
    // 生成生产环境 package.json
    generatePackageJson();
    
    // 修复构建后的路径
    fixBuildPaths();
    
    console.log('✅ 服务端构建完成！');
    console.log('📁 构建输出目录: build/');
    console.log('🚀 启动命令: cd build && npm install && npm start');
    
  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

// 执行构建
build(); 