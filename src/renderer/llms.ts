import type { SiteNavigation } from "../core/navigation.js";
import type { NormalizedOperation, NormalizedResponse, NormalizedSchema, NormalizedSpec } from "../core/types.js";
import { htmlId } from "../utils/html-id.js";
import type { SiteConfig } from "./context.js";
import type { SitePage } from "./html-builder.js";

export function generateLlmsTxt(
  pages: SitePage[],
  navigation: SiteNavigation,
  site: SiteConfig,
): string {
  const lines: string[] = [];
  const title = resolveSiteTitle(pages, site);
  const summary = resolveSiteSummary(pages, site);

  lines.push(`# ${title}`);
  lines.push("");

  if (summary) {
    lines.push(`> ${firstLine(summary)}`);
    lines.push("");
  }

  for (const tab of navigation.tabs) {
    const tabPages = pages.filter((page) => page.tabSlug === tab.slug);
    if (!tabPages.length) continue;

    lines.push(`## ${tab.label}`);
    lines.push("");

    for (const page of tabPages) {
      if (page.currentPage.kind === "markdown" && page.currentPage.markdown) {
        const doc = page.currentPage.markdown;
        const desc = doc.description || excerpt(stripHtml(doc.html));
        lines.push(`- [${doc.title}](${page.outputPath})${desc ? `: ${desc}` : ""}`);
        continue;
      }

      const spec = page.currentPage.spec ?? page.spec;
      const overview = spec.info.description ? firstLine(spec.info.description) : `${spec.operations.length} documented operations`;
      lines.push(`- [${spec.info.title}](${page.outputPath})${overview ? `: ${overview}` : ""}`);

      for (const op of spec.operations) {
        if (op.hidden) continue;
        const opLabel = op.summary ?? operationDisplayName(op);
        const opSummary = [operationKind(op), firstLine(op.description)].filter(Boolean).join(" — ");
        lines.push(`- [${opLabel}](${page.outputPath}#${operationAnchor(op)})${opSummary ? `: ${opSummary}` : ""}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function generateLlmsFullTxt(
  pages: SitePage[],
  navigation: SiteNavigation,
  site: SiteConfig,
): string {
  const lines: string[] = [];
  const title = resolveSiteTitle(pages, site);
  const summary = resolveSiteSummary(pages, site);

  lines.push(`# ${title}`);
  lines.push("");

  if (summary) {
    lines.push(summary);
    lines.push("");
  }

  for (const tab of navigation.tabs) {
    const tabPages = pages.filter((page) => page.tabSlug === tab.slug);
    if (!tabPages.length) continue;

    lines.push(`## ${tab.label}`);
    lines.push("");

    for (const page of tabPages) {
      if (page.currentPage.kind === "markdown" && page.currentPage.markdown) {
        appendMarkdownPage(lines, page);
      } else {
        appendSpecPage(lines, page);
      }
    }
  }

  return lines.join("\n");
}

function appendMarkdownPage(lines: string[], page: SitePage): void {
  const doc = page.currentPage.markdown!;
  lines.push(`### ${doc.title}`);
  lines.push("");
  lines.push(`Path: \`${page.outputPath}\``);
  lines.push("");

  if (doc.description) {
    lines.push(doc.description);
    lines.push("");
  }

  const body = stripHtml(doc.html);
  if (body) {
    lines.push(body);
    lines.push("");
  }
}

function appendSpecPage(lines: string[], page: SitePage): void {
  const spec = page.currentPage.spec ?? page.spec;

  lines.push(`### ${spec.info.title}`);
  lines.push("");
  lines.push(`Path: \`${page.outputPath}\``);
  if (spec.info.version) {
    lines.push(`Version: ${spec.info.version}`);
  }
  lines.push("");

  if (spec.info.description) {
    lines.push(spec.info.description);
    lines.push("");
  }

  if (spec.operations.length) {
    lines.push("#### Operations");
    lines.push("");
    for (const op of spec.operations) {
      if (op.hidden) continue;
      appendOperation(lines, op);
    }
  }

  const schemas = Object.entries(spec.schemas);
  if (schemas.length) {
    lines.push("#### Models");
    lines.push("");
    for (const [name, schema] of schemas) {
      const desc = schema.description ? `: ${schema.description}` : "";
      lines.push(`- ${name}${desc}`);
    }
    lines.push("");
  }
}

function appendOperation(lines: string[], op: NormalizedOperation): void {
  lines.push(`##### ${operationDisplayName(op)}`);
  lines.push("");

  if (op.summary && op.summary !== operationDisplayName(op)) {
    lines.push(`Summary: ${op.summary}`);
    lines.push("");
  }

  if (op.description) {
    lines.push(op.description);
    lines.push("");
  }

  if (op.parameters.length) {
    lines.push("Parameters:");
    for (const param of op.parameters) {
      const req = param.required ? "required" : "optional";
      const type = param.schema ? formatSchemaType(param.schema) : "unknown";
      const desc = param.description ? ` — ${firstLine(param.description)}` : "";
      lines.push(`- \`${param.name}\` (${param.in}, ${type}, ${req})${desc}`);
    }
    lines.push("");
  }

  if (op.requestBody) {
    const mediaTypes = Object.keys(op.requestBody.content);
    if (mediaTypes.length) {
      lines.push(`Request body: ${mediaTypes.join(", ")}`);
      lines.push("");
    }
  }

  if (op.mcpExtras?.outputSchema) {
    lines.push("Returns:");
    lines.push("```json");
    lines.push(JSON.stringify(op.mcpExtras.outputSchema, null, 2));
    lines.push("```");
    lines.push("");
  } else if (op.responses.length) {
    lines.push("Responses:");
    for (const response of op.responses) {
      lines.push(`- ${formatResponse(response)}`);
    }
    lines.push("");
  }
}

function resolveSiteTitle(pages: SitePage[], site: SiteConfig): string {
  if (site.name && site.name !== "API Reference") return site.name;

  const specPages = pages.filter((page) => page.currentPage.kind === "spec");
  if (specPages.length === 1) {
    const spec = specPages[0].currentPage.spec ?? specPages[0].spec;
    if (spec.info.title) return spec.info.title;
  }

  const firstMarkdown = pages.find((page) => page.currentPage.kind === "markdown" && page.currentPage.markdown);
  if (firstMarkdown?.currentPage.markdown?.title) return firstMarkdown.currentPage.markdown.title;

  return site.name || "Documentation";
}

function resolveSiteSummary(pages: SitePage[], site: SiteConfig): string | undefined {
  const firstMarkdown = pages.find((page) => page.currentPage.kind === "markdown" && page.currentPage.markdown?.description);
  if (firstMarkdown?.currentPage.markdown?.description) return firstMarkdown.currentPage.markdown.description;

  const firstSpec = pages.find((page) => page.currentPage.kind === "spec");
  const spec = firstSpec ? (firstSpec.currentPage.spec ?? firstSpec.spec) : undefined;
  if (spec?.info.description) return spec.info.description;

  return site.name ? `${site.name} documentation generated by Sourcey.` : undefined;
}

function operationDisplayName(op: NormalizedOperation): string {
  if (op.mcpExtras?.type === "tool") return `TOOL ${op.path}`;
  if (op.mcpExtras?.type === "resource") return `RESOURCE ${op.path}`;
  if (op.mcpExtras?.type === "prompt") return `PROMPT ${op.path}`;
  return `${op.method.toUpperCase()} ${op.path}`;
}

function operationKind(op: NormalizedOperation): string {
  if (op.mcpExtras?.type === "tool") return "tool";
  if (op.mcpExtras?.type === "resource") return "resource";
  if (op.mcpExtras?.type === "prompt") return "prompt";
  return `${op.method.toUpperCase()} ${op.path}`;
}

function operationAnchor(op: NormalizedOperation): string {
  return `operation-${htmlId(op.path)}-${htmlId(op.method)}`;
}

function formatResponse(response: NormalizedResponse): string {
  const desc = response.description ? firstLine(response.description) : "";
  return desc ? `${response.statusCode}: ${desc}` : response.statusCode;
}

function formatSchemaType(schema: NormalizedSchema): string {
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  if (schema.type) return schema.type;
  if (schema.oneOf?.length) return schema.oneOf.map(formatSchemaType).join(" | ");
  if (schema.anyOf?.length) return schema.anyOf.map(formatSchemaType).join(" | ");
  if (schema.allOf?.length) return "object";
  if (schema.properties) return "object";
  return "unknown";
}

function stripHtml(html: string): string {
  return decodeEntities(html)
    .replace(/<pre[\s\S]*?<\/pre>/gi, (match) => match.replace(/<[^>]+>/g, " "))
    .replace(/<code[\s\S]*?<\/code>/gi, (match) => match.replace(/<[^>]+>/g, " "))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function excerpt(text: string, max = 140): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function firstLine(text?: string): string {
  return text?.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}
