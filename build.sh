#!/bin/bash

echo "开始构建前端项目..."

# 进入client目录
cd client

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 构建项目
echo "构建项目..."
npm run build

# 检查构建结果
if [ -f "dist/index.html" ]; then
    echo "✅ 前端构建成功！"
    echo "构建文件位置: client/dist/"
else
    echo "❌ 前端构建失败！"
    exit 1
fi

echo "构建完成！" 