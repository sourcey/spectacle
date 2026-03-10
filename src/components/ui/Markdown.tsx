import { renderMarkdown, renderMarkdownInline } from "../../utils/markdown.js";

interface MarkdownProps {
  content?: string;
  inline?: boolean;
  class?: string;
}

export function Markdown({ content, inline, class: className }: MarkdownProps) {
  if (!content) return null;

  const html = inline ? renderMarkdownInline(content) : renderMarkdown(content);

  if (inline) {
    return <span class={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div class={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
