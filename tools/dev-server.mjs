import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, watch } from "node:fs";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const preferredPort = Number(process.env.PORT || process.argv[2] || 5500);
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function isInsideRoot(filePath) {
  const rel = relative(root, filePath);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep));
}

function resolveFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  let filePath = normalize(join(root, decodedPath));

  if (!isInsideRoot(filePath)) return null;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  if (!extname(filePath) && existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }
  if (!existsSync(filePath)) {
    filePath = join(root, "404.html");
  }

  return filePath;
}

function injectLiveReload(html) {
  const script = `<script>
new EventSource("/__live-reload").onmessage = function () {
  window.location.reload();
};
</script>`;
  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : `${html}${script}`;
}

function createApp() {
  return createServer((request, response) => {
    if (request.url === "/__live-reload") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      response.write("\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    const filePath = resolveFile(request.url || "/");
    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const type = mimeTypes[extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });

    if (type.startsWith("text/html")) {
      const chunks = [];
      createReadStream(filePath)
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", () => response.end(injectLiveReload(Buffer.concat(chunks).toString("utf8"))))
        .on("error", () => {
          response.writeHead(500);
          response.end("Unable to read file");
        });
      return;
    }

    createReadStream(filePath)
      .on("error", () => {
        response.writeHead(500);
        response.end("Unable to read file");
      })
      .pipe(response);
  });
}

function broadcastReload() {
  for (const client of clients) {
    client.write(`data: reload ${Date.now()}\n\n`);
  }
}

watch(root, { recursive: true }, (_event, filename) => {
  if (!filename || String(filename).includes("node_modules")) return;
  clearTimeout(globalThis.reloadTimer);
  globalThis.reloadTimer = setTimeout(broadcastReload, 120);
});

function listen(port) {
  const server = createApp();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < preferredPort + 20) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Preview running at http://127.0.0.1:${port}/`);
    console.log("Edit files and save. The browser refreshes automatically.");
  });
}

listen(preferredPort);
