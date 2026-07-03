#!/usr/bin/env bash
# GitHub Pages 部署脚本
set -e

echo "🏗️  Building FixMate..."
npm run build

echo "🚀  Deploying to GitHub Pages..."
cd dist

# 创建 .nojekyll 防止 GitHub Pages 忽略下划线开头的文件
touch .nojekyll

# 初始化 git 并推送
git init
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到 gh-pages 分支
# 如果还没有配置远程仓库，先执行:
# git remote add origin https://github.com/你的用户名/FixMate.git
git push -f https://github.com/lian4211/FixMate.git main:gh-pages

echo "✅  Deployed! 访问地址:"
echo "   https://lian4211.github.io/FixMate"
