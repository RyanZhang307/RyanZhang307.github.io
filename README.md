# RyanZhang307.github.io

这是 Ryan Zhang 的 GitHub Pages 个人主页。

线上地址：

```text
https://ryanzhang307.github.io
```

## 本地编辑和预览

推荐使用 VS Code。

方式一：使用 VS Code Live Server

1. 用 VS Code 打开这个仓库文件夹
2. 安装推荐插件 `Live Server`
3. 右键 `index.html`
4. 选择 `Open with Live Server`
5. 修改文件并保存，浏览器会自动刷新

方式二：使用内置预览脚本

```powershell
.\preview.ps1
```

或者：

```bash
npm run dev
```

打开终端输出里的本地地址，通常是：

```text
http://127.0.0.1:5500/
```

## 发布更改

1. 本地修改并预览
2. 运行检查：

```bash
npm run check
```

3. 用 GitHub Desktop 提交：
   - Summary 写本次改动，例如 `Update homepage design`
   - 点击 `Commit to main`
   - 点击 `Push origin`

GitHub Pages 会自动更新：

```text
https://ryanzhang307.github.io
```

## 文件结构

- `index.html`：首页介绍、项目、联系方式
- `resume.html`：简历内容
- `blog/index.html`：博客列表
- `blog/first-note.html`：第一篇文章
- `assets/styles.css`：整体视觉样式
- `assets/hero-notes.svg`：首页首屏视觉图
- `tools/dev-server.mjs`：本地预览服务器
- `tools/check-site.mjs`：本地链接检查

如果以后绑定独立域名，再添加 `CNAME` 文件即可。
