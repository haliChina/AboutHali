# About Hali · 个人主页

> Code is like humor. When you have to explain it, it's bad.

一个零依赖、纯前端、面向个人展示的霓虹风格主页。围绕 macOS 风格的 **Dynamic Island** 导航展开，搭配 WebGL 樱花着色器背景、内嵌音乐卡片与可点击的社交入口。

🌐 线上地址：[https://userhali.com](https://userhali.com)

---

## ✨ 特性

- **零构建工具链** — 没有 npm / Webpack / Vite，直接 `index.html` + 原生 `JS / CSS`，开箱即用
- **樱花着色器背景** — `shader.js` 实时渲染 GPU 粒子（sakura petal / wind drift）
- **Dynamic Island 导航** — 折叠态 / 音乐条 / 展开 pill-nav 三态切换，滚动联动高亮
- **入场动画** — `intro-lock` 锁屏式欢迎页，点击任意处跳过
- **PWA** — `manifest.json` 提供可安装图标、主题色、启动方式
- **音频卡片** — `audio/` 目录内嵌 4 首本地音乐，含可拖拽播放条
- **社交入口** — 一键跳转 GitHub / X / Discord / QQ / QQ 音乐 / Bilibili / 邮箱
- **安全 & 性能 Header** — `vercel.json` 内置 HSTS / CSP-friendly 头、长缓存、音视频 Range
- **完整 SEO** — OG / Twitter Card / `robots.txt` / `manifest.json` 一应俱全

---

## 🧱 技术栈

| 类别 | 选型 |
| --- | --- |
| 页面 | 原生 HTML5 |
| 样式 | 原生 CSS3（CSS 变量 + 动画 / 渐变 / backdrop-filter） |
| 脚本 | 原生 ES6+，无任何 npm 依赖 |
| 图形 | WebGL Fragment Shader（樱花粒子） |
| 部署 | Vercel（也兼容 Netlify / Cloudflare Pages / 任意静态托管） |
| PWA | Web App Manifest |

---

## 📁 目录结构

```
AboutHali/
├── index.html            # 单页入口（含 OG / PWA / 字体预连接）
├── 404.html              # 自定义 404
├── style.css             # 全局样式（Dynamic Island / 卡片 / 动画）
├── animations.js         # 通用动画工具
├── shader.js             # WebGL 樱花着色器
├── manifest.json         # PWA 配置
├── robots.txt            # 搜索引擎规则
├── vercel.json           # Vercel 路由 / 缓存 / 安全头
├── audio/                # 内嵌音乐（4 首 mp3）
└── icons/
    ├── icon_yr1u7cll74f/ # 预留图标位
    └── contact/          # 社交入口 SVG（GitHub / X / Discord / QQ / Bili / 邮箱）
```

---

## 🚀 本地预览

不需要任何依赖，任意一种方式都可以：

```bash
# 方式 1：Python 内置服务器
python3 -m http.server 8080

# 方式 2：Node 一键起服务
npx serve .

# 方式 3：直接双击 index.html
```

> ⚠️ 出于浏览器安全策略，部分功能（如 PWA 安装、Service Worker、跨域字体）在 `file://` 协议下可能不可用，**强烈建议用 HTTP 服务访问**。

打开 <http://localhost:8000> 即可。

---

## ☁️ 部署

### Vercel（推荐）

仓库已包含 `vercel.json`，直接 Import 即可：

1. Vercel → **Add New → Project** → 选 `haliChina/AboutHali`
2. Framework Preset 选择 **Other**
3. 点击 Deploy

### Cloudflare Pages

```bash
wrangler pages deploy . --project-name abouthali
```

### Netlify

直接拖拽项目根目录到 Netlify Drop，或：

```bash
netlify deploy --dir=. --prod
```

---

## 🛠️ 自定义指南

| 想改什么 | 看哪里 |
| --- | --- |
| 标题 / 描述 / OG 信息 | `index.html` 顶部 `<head>` |
| 主题色 / 全局色板 | `style.css` 顶部的 `:root` 变量 |
| 樱花浓度 / 飘落速度 | `shader.js` 中的 uniform 参数 |
| 导航项顺序 | `index.html` 的 `.pill-nav` |
| 音乐列表 | `index.html` 中的 `audio-card` + `audio/` 文件夹 |
| 社交入口 | `icons/contact/` 增删 SVG，并在 `index.html` 修改对应 `<a>` |
| 自定义 404 | `404.html` |
| 安全 / 缓存 Header | `vercel.json`（迁移到其他平台时请同步这些规则） |

---

## 🔐 隐私 & 合规

- 不收集任何用户数据，没有埋点 / 分析 / Cookie
- `robots.txt` 允许全站抓取并指向 `https://userhali.com/sitemap.xml`
- 第三方资源（Google Fonts / jsDelivr / GitHub API）仅在用户访问时按需加载

---

## 📄 License

GPL v3

如果对你有启发，欢迎点个 ⭐️ → [haliChina/AboutHali](https://github.com/haliChina/AboutHali)

---

## 📬 Contact

- Website: [userhali.com](https://userhali.com)
- GitHub: [@haliChina](https://github.com/haliChina)
  
