// Serves the static export (`out/`) for Playwright: `node e2e/serve-static.mjs [port]`.
// Independent of `next dev`, which allows one instance per project folder.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3100);
// Loopback only: the test server is never reachable from the network.
const HOST = "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon",
};

const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

/** `/` → index.html; `/a` → a, a.html or a/index.html. Never leaves ROOT. */
async function resolveFile(urlPath) {
  // Without a trailing separator, so `/` and `/a/` compare equal to ROOT and ROOT/a.
  const base = normalize(join(ROOT, urlPath)).replace(/[\\/]+$/, "");
  if (base !== ROOT && !base.startsWith(ROOT + sep)) return null;
  // `/` has no "out.html" sibling to try: only ROOT/index.html.
  const candidates = base === ROOT ? [join(base, "index.html")] : [base, `${base}.html`, join(base, "index.html")];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

createServer(async (req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }
  const file = await resolveFile(urlPath);
  if (!file) {
    res.writeHead(404, { "content-type": TYPES[".txt"] }).end("not found");
    return;
  }
  let body;
  try {
    body = await readFile(file);
  } catch (err) {
    // Gone between the stat and the read, or unreadable: answer instead of crashing the server.
    const missing = err?.code === "ENOENT" || err?.code === "EISDIR";
    res.writeHead(missing ? 404 : 500, { "content-type": TYPES[".txt"] }).end(missing ? "not found" : "server error");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(req.method === "HEAD" ? undefined : body);
}).listen(PORT, HOST, () => console.log(`serving ${ROOT} on http://${HOST}:${PORT}`));
