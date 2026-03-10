import { highlightCode } from "../../utils/highlighter.js";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

/**
 * Renders a syntax-highlighted code block using Shiki (build-time).
 */
export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const html = highlightCode(code, language);
  return (
    <section>
      {title && <h5>{title}</h5>}
      <div class="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
