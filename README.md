# RyanZhang307.github.io

这是 Ruiyuan Zhang 的 GitHub Pages 学术主页，集中展示研究方向、论文、经历、项目和学习笔记。

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

## 信息论文章源文件

信息论 Markdown 原稿不进入公开仓库，默认保存在仓库同级目录：

```text
../private-content/information-theory/
```

生成后的 HTML 仍在 `blog/information-theory/` 中公开访问。更新原稿后运行：

```bash
npm run build:information-theory
```

也可以通过 `INFORMATION_THEORY_SOURCE_DIR` 指定其他本地私有目录。

## 文件结构

- `index.html`：学术主页、研究方向、论文与项目入口
- `resume.html`：完整在线学术简历，可打印为 PDF
- `blog/index.html`：博客列表
- `blog/first-note.html`：第一篇文章
- `assets/styles.css`：整体视觉样式
- `assets/main.js`：年份、导航阴影和浅/深色切换
- `assets/research/`：论文与研究项目配图
- `tools/dev-server.mjs`：本地预览服务器
- `tools/check-site.mjs`：本地链接检查

如果以后绑定独立域名，再添加 `CNAME` 文件即可。
