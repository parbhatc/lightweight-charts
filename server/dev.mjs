import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TESTING = path.join(ROOT, "testing_web", "frontend");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 3470;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safeRoot(base, relPath) {
  const rel = path.normalize(decodeURIComponent(relPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep) && full !== base) {return null;}
  return full;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const isCode = ext === ".mjs" || ext === ".js" || ext === ".css";
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": isCode ? "no-store" : "public, max-age=60",
  });
  fs.createReadStream(filePath).pipe(res);
}

function resolveFile(pathname) {
  if (pathname === "/" || pathname === "/testing" || pathname === "/testing/") {
    return path.join(TESTING, "index.html");
  }
  if (pathname.startsWith("/testing/")) {
    const rel = pathname.slice("/testing".length) || "/index.html";
    return safeRoot(TESTING, rel.startsWith("/") ? rel.slice(1) : rel);
  }
  if (pathname.startsWith("/dist/")) {
    return safeRoot(DIST, pathname.slice("/dist/".length));
  }
  const fromTesting = safeRoot(TESTING, pathname.startsWith("/") ? pathname.slice(1) : pathname);
  if (fromTesting && fs.existsSync(fromTesting) && fs.statSync(fromTesting).isFile()) {
    return fromTesting;
  }
  return null;
}

function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const filePath = resolveFile(url.pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  serveFile(res, filePath);
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`LWC testing:  http://127.0.0.1:${PORT}/testing/`);
  console.log(`Dist bundle:  http://127.0.0.1:${PORT}/dist/lightweight-charts.standalone.development.mjs`);
  console.log(`Debug:        ?debug=1  |  __LWC_DEBUG__.enable()`);
});
