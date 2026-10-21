// Serves the static export (`out/`) for Playwright: `node e2e/serve-static.mjs [port]`.
// Independent of `next dev`, which allows one instance per project folder.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

/** `/` → index.html; `/a` → a, a.html or a/index.html. Never leaves ROOT. */
async function resolveFile(urlPath) {
  const base = normalize(join(ROOT, urlPath));
  if (base !== ROOT && !base.startsWith(ROOT + sep)) return null;
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
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
  const body = await readFile(file);
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(req.method === "HEAD" ? undefined : body);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
