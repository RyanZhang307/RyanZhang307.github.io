import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const htmlFiles = [];
const errors = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (extname(fullPath) === ".html") {
      htmlFiles.push(fullPath);
    }
  }
}

function isExternal(ref) {
  return /^(https?:|mailto:|tel:|#)/i.test(ref);
}

function localTarget(fromFile, ref) {
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return null;

  let target = resolve(dirname(fromFile), clean);
  if (clean.endsWith("/")) target = join(target, "index.html");
  if (!extname(target) && existsSync(`${target}.html`)) target = `${target}.html`;
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  return target;
}

walk(root);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const refs = html.matchAll(/(?:href|src)="([^"]+)"/g);
  for (const match of refs) {
    const ref = match[1];
    if (isExternal(ref)) continue;
    const target = localTarget(file, ref);
    if (target && !existsSync(target)) {
      errors.push(`${file.replace(root, ".")} -> ${ref}`);
    }
  }
}

if (errors.length) {
  console.error("Missing local references:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML files. All local references resolve.`);
