import { describe, expect, it } from "vitest";
import { sourceyPlugin } from "../src/vite-plugin.js";

describe("sourceyPlugin", () => {
  it("serves generated extra files under the configured base URL", async () => {
    const handlers: Array<(req: unknown, res: FakeResponse, next: () => void) => Promise<void>> = [];
    const plugin = sourceyPlugin({
      watchPaths: [],
      baseUrl: () => "/docs",
      render: async () => null,
      extraFile: async (outputPath) =>
        outputPath === "assets/logo.svg" ? '<svg viewBox="0 0 1 1"></svg>' : undefined,
    });

    (plugin.configureServer as (server: unknown) => void)({
      watcher: {
        add() {},
        on() {},
      },
      middlewares: {
        use(handler: (req: unknown, res: FakeResponse, next: () => void) => Promise<void>) {
          handlers.push(handler);
        },
      },
      moduleGraph: {
        invalidateAll() {},
      },
      ws: {
        send() {},
      },
      transformIndexHtml: async (_url: string, html: string) => html,
      ssrFixStacktrace() {},
    });

    const res = new FakeResponse();
    let nextCalled = false;
    await handlers[0]({ url: "/docs/assets/logo.svg" }, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/svg+xml");
    expect(res.body).toBe('<svg viewBox="0 0 1 1"></svg>');
  });
});

class FakeResponse {
  statusCode = 0;
  headers: Record<string, string> = {};
  body = "";

  writeHead(statusCode: number, headers: Record<string, string>) {
    this.statusCode = statusCode;
    this.headers = headers;
    return this;
  }

  end(data?: string | Buffer) {
    this.body = Buffer.isBuffer(data) ? data.toString("utf-8") : (data ?? "");
  }
}
