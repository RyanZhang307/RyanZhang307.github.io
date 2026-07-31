# RyanZhang307.github.io

这是 Ryan Zhang 的 GitHub Pages 个人主页。当前视觉方向参考 Fuwari：个人侧栏、文章信息流、柔和卡片和浅/深色切换。

线上地址：

```text
https://ryanzhang307.github.io
```

## 本地编辑和预览

推荐使用 VS Code。

方式一：使用 VS Code Live Preview

1. 用 VS Code 打开这个仓库文件夹
2. 安装推荐插件 `Live Preview`
3. 打开 `index.html`
4. 点击编辑器右上角的预览按钮，或在命令面板运行 `Live Preview: Show Preview`
5. 把预览标签页拖到右侧，就可以左边写代码、右边看网页

方式二：使用 VS Code Live Server

1. 安装推荐插件 `Live Server`
2. 右键 `index.html`
3. 选择 `Open with Live Server`
4. 修改文件并保存，浏览器会自动刷新

方式三：使用内置预览脚本

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

- `index.html`：Fuwari 风格首页、个人侧栏、文章入口、项目入口
- `resume.html`：简历内容
- `blog/index.html`：博客列表
- `blog/first-note.html`：第一篇文章
- `assets/styles.css`：整体视觉样式
- `assets/main.js`：年份、导航阴影和浅/深色切换
- `assets/hero-notes.svg`：首页视觉图
- `tools/dev-server.mjs`：本地预览服务器
- `tools/check-site.mjs`：本地链接检查

如果以后绑定独立域名，再添加 `CNAME` 文件即可。
