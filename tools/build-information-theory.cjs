const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { marked, Renderer } = require("marked");

const root = resolve(__dirname, "..");
const sourceDir = join(root, "content", "information-theory");
const outputDir = join(root, "blog", "information-theory");
const publishedDate = "2026-08-11";

const chapters = [
  {
    number: "00",
    file: "第 0 章：绪论.md",
    slug: "chapter-0-introduction.html",
    title: "绪论",
    english: "Information Theory: A Tutorial Introduction",
    description: "全书结构、前言与信息论学习路线概览。",
  },
  {
    number: "01",
    file: "第 1 章：什么是信息.md",
    slug: "chapter-1-what-is-information.html",
    title: "什么是信息",
    english: "What Is Information?",
    description: "从眼睛、路线选择和二十问出发，建立信息、比特与二进制表示的直觉。",
  },
  {
    number: "02",
    file: "第 2 章：离散变量的熵.md",
    slug: "chapter-2-discrete-entropy.html",
    title: "离散变量的熵",
    english: "Entropy of Discrete Variables",
    description: "用惊异度、概率分布与期望值理解离散熵及其基本性质。",
  },
  {
    number: "03",
    file: "第 3 章：信源编码定理（无噪声编码定理）.md",
    slug: "chapter-3-source-coding-theorem.html",
    title: "信源编码定理",
    english: "The Source Coding Theorem",
    description: "无噪信道容量、霍夫曼编码、数据压缩和典型序列。",
  },
  {
    number: "04",
    file: "第 4 章：有噪声信道编码定理 （香农第二定理）.md",
    slug: "chapter-4-noisy-channel-coding.html",
    title: "有噪声信道编码定理",
    english: "The Noisy Channel Coding Theorem",
    description: "联合分布、互信息、信道容量以及可靠通信为何可能。",
  },
  {
    number: "05",
    file: "第 5 章：连续随机变量的熵.md",
    slug: "chapter-5-continuous-entropy.html",
    title: "连续随机变量的熵",
    english: "Entropy of Continuous Variables",
    description: "从离散化极限到微分熵，以及坐标变换和最大熵分布。",
  },
  {
    number: "06",
    file: "第 6 章：互信息 （连续）.md",
    slug: "chapter-6-continuous-mutual-information.html",
    title: "连续互信息",
    english: "Mutual Information: Continuous",
    description: "用联合密度、条件密度和散度刻画连续变量之间的依赖。",
  },
  {
    number: "07",
    file: "第 7 章：信道容量 （连续）.md",
    slug: "chapter-7-continuous-channel-capacity.html",
    title: "连续信道容量",
    english: "Channel Capacity: Continuous",
    description: "高斯信道、信噪比、Shannon–Hartley 定理和固定范围信道。",
  },
  {
    number: "08",
    file: "第 8 章：热力学熵和信息.md",
    slug: "chapter-8-thermodynamic-entropy.html",
    title: "热力学熵和信息",
    english: "Thermodynamic Entropy and Information",
    description: "连接 Shannon 熵、Boltzmann 熵、Maxwell 妖与 Landauer 原理。",
  },
  {
    number: "09",
    file: "第 9 章：信息即大自然的货币.md",
    slug: "chapter-9-information-as-currency.html",
    title: "信息即大自然的货币",
    english: "Information as Nature’s Currency",
    description: "信息论在压缩、进化、基因组、神经系统与感知中的应用。",
  },
  {
    number: "10",
    file: "第10章：拓展阅读.md",
    slug: "chapter-10-further-reading.html",
    title: "拓展阅读与附录",
    english: "Appendices A–H",
    description: "术语表、概率、对数、矩阵、微积分与习题补充材料。",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plainText(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\\([\\{}])/g, "$1")
    .trim();
}

function slugBase(value) {
  const slug = plainText(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function stripDocumentHeading(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  let cursor = 0;
  while (cursor < lines.length && (lines[cursor].trim() === "" || /^#\s+/.test(lines[cursor]))) {
    cursor += 1;
  }
  return lines.slice(cursor).join("\n");
}

function stripEmbeddedContents(markdown) {
  const lines = markdown.split("\n");
  const output = [];
  let skipping = false;

  for (const line of lines) {
    if (/^##\s+Contents\s*\/\s*目录\s*$/i.test(line.trim())) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (line.trim() === "" || /^\s*[-*+]\s+/.test(line) || /^\s+[-*+]\s+/.test(line)) continue;
      skipping = false;
    }
    output.push(line);
  }

  return output.join("\n").replace(/^\s+/, "");
}

function headingData(markdown) {
  const counts = new Map();
  const headings = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const base = slugBase(match[2]);
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    headings.push({
      depth: match[1].length,
      raw: match[2],
      text: plainText(match[2]),
      id: count ? `${base}-${count + 1}` : base,
    });
  }
  return headings;
}

function renderMarkdown(markdown, headings) {
  let headingIndex = 0;
  const renderer = new Renderer();
  const defaultTableRenderer = renderer.table;
  renderer.heading = function heading(token) {
    const heading = headings[headingIndex++];
    const id = heading?.id || slugBase(token.text || "section");
    const inner = this.parser.parseInline(token.tokens);
    return `<h${token.depth} id="${escapeHtml(id)}">${inner}<a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="链接到本节">#</a></h${token.depth}>\n`;
  };
  renderer.link = function link(token) {
    const href = token.href || "";
    const isExternal = /^https?:\/\//i.test(href);
    const attrs = isExternal ? ' target="_blank" rel="noreferrer"' : "";
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    return `<a href="${escapeHtml(href)}"${title}${attrs}>${this.parser.parseInline(token.tokens)}</a>`;
  };
  renderer.table = function table(token) {
    return `<div class="table-scroll">${defaultTableRenderer.call(this, token)}</div>`;
  };

  return marked.parse(markdown, {
    renderer,
    gfm: true,
    breaks: false,
  });
}

function tocMarkup(headings) {
  if (!headings.length) return "";
  return `<ol class="chapter-toc-list">${headings
    .map(
      (heading) =>
        `<li class="toc-depth-${heading.depth}"><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a></li>`,
    )
    .join("")}</ol>`;
}

function siteHeader(current = "blog") {
  return `<header class="site-header" data-header>
      <a class="brand" href="../../index.html" aria-label="Ryan Zhang 首页">
        <span class="brand-mark">RZ</span>
        <span>Ryan Zhang</span>
      </a>
      <nav class="nav-links" aria-label="主要导航">
        <a href="../../index.html">首页</a>
        <a href="../index.html"${current === "blog" ? ' aria-current="page"' : ""}>文章</a>
        <a href="../../resume.html">简历</a>
        <a href="../../index.html#projects">项目</a>
      </nav>
      <button class="theme-switch" type="button" data-theme-toggle aria-label="切换深色模式">
        <span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-knob"></span></span>
      </button>
    </header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
      <span>© <span data-year></span> Ryan Zhang</span>
      <a href="index.html">返回信息论专题</a>
    </footer>`;
}

function documentShell({ title, description, body, math = false }) {
  const mathScripts = math
    ? `<script>
      window.MathJax = {
        tex: { inlineMath: [["\\\\(", "\\\\)"], ["$", "$"]], displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]], processEscapes: true },
        options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"] }
      };
    </script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>`
    : "";
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Ryan Zhang</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="../../assets/styles.css">${mathScripts ? `\n    ${mathScripts}` : ""}
  </head>
  <body>
    ${siteHeader()}
    ${body}
    ${siteFooter()}
    <script src="../../assets/main.js"></script>
  </body>
</html>
`;
}

function readingMinutes(markdown) {
  return Math.max(1, Math.ceil(plainText(markdown).replace(/\s/g, "").length / 900));
}

function chapterNavigation(index) {
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  return `<nav class="chapter-pagination" aria-label="章节导航">
      ${previous ? `<a href="${previous.slug}" rel="prev"><span>上一篇</span><strong>${escapeHtml(previous.title)}</strong></a>` : "<span></span>"}
      ${next ? `<a href="${next.slug}" rel="next"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>` : "<span></span>"}
    </nav>`;
}

function buildChapter(chapter, index) {
  const raw = readFileSync(join(sourceDir, chapter.file), "utf8");
  const markdown = stripEmbeddedContents(stripDocumentHeading(raw));
  const headings = headingData(markdown);
  const articleHtml = renderMarkdown(markdown, headings);
  const minutes = readingMinutes(markdown);
  const body = `<main class="chapter-shell">
      <aside class="chapter-toc card">
        <a class="back-link" href="index.html">← 信息论专题</a>
        <p class="eyebrow">On this page</p>
        <h2>本章目录</h2>
        ${tocMarkup(headings)}
      </aside>
      <div class="chapter-flow">
        <article class="article chapter-article card">
          <div class="post-meta">
            <time datetime="${publishedDate}">2026.08.11</time>
            <span>信息论</span>
            <span>约 ${minutes} 分钟</span>
          </div>
          <p class="chapter-number">Chapter ${chapter.number}</p>
          <h1>${escapeHtml(chapter.title)}</h1>
          <p class="article-subtitle">${escapeHtml(chapter.english)}</p>
          <p class="lead">${escapeHtml(chapter.description)}</p>
          <div class="article-content">${articleHtml}</div>
        </article>
        ${chapterNavigation(index)}
      </div>
    </main>`;
  writeFileSync(
    join(outputDir, chapter.slug),
    documentShell({ title: `${chapter.title}｜${chapter.english}`, description: chapter.description, body, math: true }),
  );
}

function buildSeriesIndex() {
  const cards = chapters
    .map((chapter) => {
      const raw = readFileSync(join(sourceDir, chapter.file), "utf8");
      return `<a class="series-card card" href="${chapter.slug}">
          <span class="series-number">${chapter.number}</span>
          <div>
            <h2>${escapeHtml(chapter.title)}</h2>
            <p class="series-english">${escapeHtml(chapter.english)}</p>
            <p>${escapeHtml(chapter.description)}</p>
            <span class="series-reading-time">约 ${readingMinutes(raw)} 分钟</span>
          </div>
          <span class="post-arrow" aria-hidden="true">→</span>
        </a>`;
    })
    .join("\n");

  const body = `<main class="page-shell series-page">
      <section class="page-hero card series-hero">
        <a class="back-link" href="../index.html">← 返回文章列表</a>
        <p class="eyebrow">Information Theory</p>
        <h1>信息论：教程式导论</h1>
        <p>基于 James V. Stone 的 <em>Information Theory: A Tutorial Introduction</em> 整理的中英双语学习笔记，涵盖信息、熵、编码定理、连续信道以及信息在物理与生命系统中的应用。</p>
        <div class="series-facts" aria-label="专题信息">
          <span>11 篇</span><span>中英双语</span><span>公式与术语表</span>
        </div>
      </section>
      <section class="series-index" aria-labelledby="series-title">
        <div class="section-heading">
          <p class="eyebrow">Chapters</p>
          <h2 id="series-title">章节目录</h2>
        </div>
        <div class="series-list">${cards}</div>
      </section>
    </main>`;

  writeFileSync(
    join(outputDir, "index.html"),
    documentShell({
      title: "信息论：教程式导论",
      description: "信息、熵、编码、信道容量与信息应用的中英双语学习笔记。",
      body,
    }),
  );
}

mkdirSync(outputDir, { recursive: true });
chapters.forEach(buildChapter);
buildSeriesIndex();
console.log(`Generated ${chapters.length + 1} information theory pages.`);
