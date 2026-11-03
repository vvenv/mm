<div align="center">

# mm

**把 Markdown 大纲变成可交互思维导图。**

本地优先 · 可离线 · 无账号 · 纯静态托管

[![demo](https://img.shields.io/badge/demo-mm.wenfu.dev-111111?style=flat-square)](https://mm.wenfu.dev/)
[![test](https://github.com/vvenv/mm/actions/workflows/test.yml/badge.svg)](https://github.com/vvenv/mm/actions/workflows/test.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

在线试用：**<https://mm.wenfu.dev/>**

## 特性

- **Markdown 即大纲**：`#` 标题作中心节点，列表作分支；缩进段落 → 副标题，`>` 引用 → 备注
- **画布上直接改**：单击改标题 / 副标题，点前导 emoji 换图标，右键或长按打开菜单
- **只读 / 编辑**：工具栏一键切换；编辑模式支持 Tab 子节点、Enter 同级、撤销重做
- **导入导出**：拖放或工具栏导入 `.md`；导出 Markdown · XMind · 交互 HTML · OPML · JSON
- **链接分享**：菜单「分享」生成 `#v1=…` 长链；优先经 [s.wenfu.dev](https://s.wenfu.dev/)（仓库 [vvenv/short](https://github.com/vvenv/short)）建短链，失败再试 is.gd / v.gd
- **剪贴板**：复制 / 剪切 / 粘贴大纲文本，可把 Markdown 列表粘成树状分支
- **本地自动保存**：内容与偏好（主题、字体、模式）写在浏览器 `localStorage`，不上传服务器
- **PWA 离线**：首次打开后可安装到主屏幕，断网也能用
- **主题与字体**：浅色 / 深色 / 跟随系统；宋体、黑体、楷体等全局字体预设

## 使用

打开页面即可。没有文档时会显示内置示例；导入自己的 Markdown，或在编辑模式下从中心节点开始搭树。

### 分享

菜单 → **分享** 会生成可打开的链接：

- **长链**：`https://mm.wenfu.dev/#v1=…`，载荷在 URL hash 里（deflate 压缩）；hash 不进 nginx 访问日志
- **短链（优先）**：`https://s.wenfu.dev/<id>` → 302 到 `mm.wenfu.dev/?s=<id>`，再由前端拉取载荷；服务端实现见独立仓库 [vvenv/short](https://github.com/vvenv/short)
- **短链（备选）**：第一方不可用且长链不太长时，再试 is.gd / v.gd
- 对方打开后为只读，不写入其 `localStorage`；工具栏隐藏只读/编辑切换，需点「保存副本」后才会存到本机并可切换模式

隐私：长链内容在 URL 里；第一方短链的压缩载荷存在 `s.wenfu.dev` 服务器磁盘；外部短链提供商会看到完整目标 URL。

### Markdown 约定

```md
# 🗺️ 中心主题

## 可选副标题

- 一级节点
  副标题写在列表项下一行缩进段落
  > 备注用引用块
  - 子节点 🎨
  - 另一个子节点
- 同级节点
```

- 一级 `#` 标题 → 中心节点（可带前导 emoji）
- `##` 在列表出现前 → 中心节点副标题
- `-` / `*` / `+` 列表 → 分支；缩进决定层级
- 列表项下的缩进段落 → 副标题；`>` → 备注

### 常用操作

| 操作 | 说明 |
| --- | --- |
| 单击标题 / 副标题 | 行内编辑 |
| Tab / Enter | 添加子节点 / 同级节点 |
| ⌘/Ctrl + Z · ⌘/Ctrl + ⇧Z | 撤销 · 重做 |
| ⌘/Ctrl + C / X / V | 复制 · 剪切 · 粘贴大纲 |
| 拖动画布 · ⌘/Ctrl + 滚轮 | 平移 · 缩放 |
| ⌘/Ctrl + 0 | 适应画布 |
| 双指捏合 | 手机缩放 |

## 本地运行

纯静态站点，无需构建。任意静态服务器指向 `public/` 即可：

```sh
pnpm dlx serve public
# 或
python3 -m http.server -d public 4173
```

浏览器打开提示的本地地址。部分能力（剪贴板、Service Worker）在 `file://` 下不可用，请用 HTTP 打开。

### 开发依赖

日常预览不需要安装依赖。只有跑测试或重新生成 emoji 数据时需要：

```sh
pnpm install
pnpm test          # Node 内置测试跑 mm-core
pnpm emoji:gen     # 从 emojibase-data 重写 public/emoji-data.js
```

## 目录

```
public/                 # 可直接托管的站点
  index.html            # 页面与交互
  mm-core.js            # 解析 / 导出 / 存储等纯逻辑（可单测）
  emoji-data.js         # 图标选择器数据
  sw.js                 # Service Worker
  manifest.webmanifest
scripts/
  deploy.sh             # 同步到生产机并配置 nginx / 证书
  generate-emoji-data.mjs
deploy/nginx/           # mm.wenfu.dev 站点配置
test/                   # mm-core 单元测试
```

## 自行部署

把 `public/` 同步到任意静态托管（Nginx、Caddy、GitHub Pages、对象存储 CDN 等）即可。

本仓库自带的 `pnpm deploy` 面向 [mm.wenfu.dev](https://mm.wenfu.dev/)：通过 SSH 同步文件、安装 nginx 配置，必要时用 certbot 申请证书。

```sh
cp scripts/env.production.example .env.production
# 填写 DEPLOY_HOST / DEPLOY_SSH_USER 等
pnpm deploy
```

`.env.production` 含服务器信息，已在 `.gitignore` 中忽略，请勿提交。

## 许可

[MIT](LICENSE)
