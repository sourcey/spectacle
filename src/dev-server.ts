import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { buildDocs } from "./index.js";

export interface DevServerOptions {
  specSource: string;
  outputDir: string;
  port: number;
  logo?: string;
  favicon?: string;
  themeOverrides?: Record<string, string>;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// SSE script injected into HTML for live reload
const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  var es = new EventSource('/__spectacle_reload');
  es.onmessage = function() { window.location.reload(); };
  es.onerror = function() {
    es.close();
    setTimeout(function() { window.location.reload(); }, 2000);
  };
})();
</script>
</body>`;

export async function startDevServer(options: DevServerOptions): Promise<void> {
  const { specSource, outputDir, port, logo, favicon, themeOverrides } = options;
  const resolvedOutput = resolve(outputDir);
  const resolvedSpec = resolve(specSource);

  // Track SSE clients for live reload
  const clients: Set<ServerResponse> = new Set();

  // Initial build
  await rebuild();

  async function rebuild(): Promise<boolean> {
    try {
      await buildDocs({
        specSource: resolvedSpec,
        outputDir: resolvedOutput,
        logo,
        favicon,
        themeOverrides,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  Rebuild failed: ${message}`);
      return false;
    }
  }

  function notifyClients() {
    for (const client of clients) {
      client.write("data: reload\n\n");
    }
  }

  // Watch spec file for changes
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(resolvedSpec, { persistent: true }, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`  [${timestamp}] Spec changed, rebuilding…`);
      const ok = await rebuild();
      if (ok) {
        console.log(`  [${timestamp}] Rebuilt successfully`);
        notifyClients();
      }
    }, 200);
  });

  // HTTP server
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "/";

    // SSE endpoint for live reload
    if (url === "/__spectacle_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("data: connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    // Serve static files from output dir
    let filePath = join(resolvedOutput, url === "/" ? "index.html" : url);

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = join(filePath, "index.html");
      }
    } catch {
      // File doesn't exist — fall through to 404
    }

    try {
      let content = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

      // Inject live reload script into HTML
      if (ext === ".html") {
        const html = content.toString("utf-8");
        const injected = html.replace("</body>", LIVE_RELOAD_SCRIPT);
        content = Buffer.from(injected, "utf-8");
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });

  server.listen(port, () => {
    console.log(`\n  Spectacle dev server running at http://localhost:${port}`);
    console.log(`  Watching: ${resolvedSpec}`);
    console.log(`  Press Ctrl+C to stop\n`);
  });

  // Keep process alive
  await new Promise(() => {});
}
