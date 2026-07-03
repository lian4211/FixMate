# FixMate 🎯

错题整理与学习助手 — 拍照识别错题，AI 智能解析，高效复习。

> 📱 移动端优先 · 纯前端 · PWA 离线可用

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 📷 **拍照录入** | 手机拍照错题，直接上传 |
| 🤖 **AI 智能解析** | 调用 DeepSeek Flash API 识别图片文字 + 分析解题思路 |
| 🏷️ **自动分类** | 数学（高数/线代/概统）、408 计算机专业（数据结构/计组/OS/网络） |
| 💡 **思路 + 步骤 + 答案** | 结构化展示：解题思路 → 分步流程 → 最终答案 |
| 📚 **错题库管理** | 分类筛选、关键词搜索、详情展开 |
| 💾 **本地存储** | IndexedDB 存储，数据不丢失，支持导入导出 |
| 📦 **PWA 支持** | 可添加到手机桌面，离线可用 |

---

## 🚀 快速开始

### 1. 获取 API Key

前往 [DeepSeek 官网](https://platform.deepseek.com/) 注册并获取 API Key。

### 2. 使用

- **方式一**：直接访问在线版（待部署后更新链接）
- **方式二**：本地运行

```bash
# 克隆项目
git clone https://github.com/你的用户名/FixMate.git
cd FixMate

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. 在手机端使用

1. 打开浏览器访问 FixMate
2. 点击底部「设置」，填入 DeepSeek API Key
3. 回到首页，点击拍照/选图
4. 选择错题照片，点击「开始识别」
5. 查看 AI 分析结果，点击「存入错题本」

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + Vite | 前端框架 + 构建工具 |
| Vue Router | 单页面路由 |
| Dexie.js | IndexedDB 封装 |
| DeepSeek API | 图片识别 + 题目分析 |
| PWA (vite-plugin-pwa) | 离线缓存 + 可安装 |
| 纯手写 CSS | 移动端适配 + 毛玻璃设计 |

---

## 📁 项目结构

```
FixMate/
├── src/
│   ├── config/           # 配置（学科分类、提示词模板）
│   ├── composables/      # 组合式逻辑（API/DB/图片/设置）
│   ├── components/       # UI 组件
│   ├── views/            # 页面（首页/错题库/设置）
│   ├── stores/           # 全局状态
│   ├── styles/           # 全局样式
│   ├── router/           # 路由配置
│   ├── App.vue           # 主组件
│   └── main.js           # 入口
├── public/
├── deploy.sh             # GitHub Pages 部署脚本
└── package.json
```

---

## 📦 部署到 GitHub Pages

```bash
# 1. 先在 GitHub 创建仓库 FixMate

# 2. 修改 deploy.sh 中的用户名

# 3. 运行部署脚本
bash deploy.sh

# 或者手动部署：
npm run build
# 将 dist/ 目录推送到 gh-pages 分支
```

---

## 🔧 自定义配置

### 添加学科分类

编辑 `src/config/subjects.js`：

```js
export const SUBJECTS = {
  '数学': ['高等数学', '线性代数', '概率论与数理统计', '其他'],
  '408-数据结构': [],
  // 在这里添加新学科...
}
```

### 修改提示词

编辑 `src/config/prompts.js` 中的 `PROMPT_VERSIONS`。

---

## ⚠️ 注意事项

- API Key 仅存于浏览器 localStorage，不会上传到任何服务器
- 上传图片会自动压缩至 1920px 以内
- DeepSeek Flash 价格极低（约 ¥0.5/百万 token）
- 所有数据存在本地，清除浏览器数据会丢失

---

## 许可证

MIT
