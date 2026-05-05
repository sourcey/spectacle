/**
 * Pretty-URL emission style. See `ResolvedConfig.prettyUrls`.
 */
export type PrettyUrls = false | "slash" | "strip";

export function isAbsoluteHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function normalizeBaseUrl(baseUrl?: string): string {
  const raw = baseUrl?.trim();
  if (!raw || raw === "/") return "";

  const cleaned = raw.replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}/` : "";
}

export function normalizeSiteUrl(siteUrl?: string): string | undefined {
  const raw = siteUrl?.trim();
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid siteUrl "${siteUrl}". Expected an absolute http(s) URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid siteUrl "${siteUrl}". Expected an absolute http(s) URL.`);
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`Invalid siteUrl "${siteUrl}". Use siteUrl for the origin and baseUrl for any path prefix.`);
  }

  return url.origin;
}

export function toPublicPath(outputPath: string, baseUrl = "", prettyUrls: PrettyUrls = false): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const prefix = normalizedBase || "/";
  const cleanOutputPath = outputPath.replace(/^\/+/, "");

  if (!cleanOutputPath || cleanOutputPath === "index.html") {
    if (prettyUrls === "strip" && normalizedBase) {
      return normalizedBase.slice(0, -1);
    }
    return prefix;
  }

  if (cleanOutputPath.endsWith("/index.html")) {
    const withSlash = cleanOutputPath.slice(0, -("index.html".length));
    if (prettyUrls === "strip") {
      return `${prefix}${withSlash.slice(0, -1)}`;
    }
    return `${prefix}${withSlash}`;
  }

  if (prettyUrls === "strip" && cleanOutputPath.endsWith(".html")) {
    return `${prefix}${cleanOutputPath.slice(0, -(".html".length))}`;
  }

  return `${prefix}${cleanOutputPath}`;
}

export function toAbsoluteUrl(publicPath: string, siteUrl?: string): string {
  if (!siteUrl) return publicPath;

  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  return new URL(publicPath.replace(/^\/+/, ""), base).toString();
}

export function toPublicUrl(
  outputPath: string,
  siteUrl?: string,
  baseUrl = "",
  prettyUrls: PrettyUrls = false,
): string {
  return toAbsoluteUrl(toPublicPath(outputPath, baseUrl, prettyUrls), siteUrl);
}

export function stripBaseUrl(pathname: string, baseUrl = ""): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (!normalizedBase) return pathname;

  const bareBase = normalizedBase.slice(0, -1);
  if (pathname === bareBase || pathname === normalizedBase) {
    return "/";
  }

  if (pathname.startsWith(normalizedBase)) {
    return `/${pathname.slice(normalizedBase.length)}`;
  }

  return pathname;
}
