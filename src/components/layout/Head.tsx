import { useContext } from "preact/hooks";
import { SpecContext, OptionsContext, PageContext, SiteContext, NavigationContext } from "../../renderer/context.js";
import { langIconCSS } from "../../utils/lang-icons.js";

export function Head() {
  const site = useContext(SiteContext);
  const spec = useContext(SpecContext);
  const options = useContext(OptionsContext);
  const page = useContext(PageContext);

  const siteName = site.name || spec.info.title || "";
  const pageTitle = page.kind === "markdown"
    ? (siteName ? `${page.markdown!.title} — ${siteName}` : page.markdown!.title)
    : `${siteName} — API Reference`;

  const pageDescription = page.kind === "markdown"
    ? page.markdown!.description || pageTitle
    : spec.info.description ?? `${siteName} API Documentation`;

  const nav = useContext(NavigationContext);
  const { colors, fonts, layout } = site.theme;
  const headerHeight = nav.tabs.length > 1 ? "7rem" : "4rem";

  // Extract font family names for Google Fonts loading
  const systemFonts = new Set(["system-ui", "sans-serif", "serif", "monospace", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Consolas", "SF Mono", "Fira Code", "Cascadia Code"]);
  function extractFontName(stack: string): string | null {
    const m = stack.match(/^'([^']+)'/);
    return m && !systemFonts.has(m[1]) ? m[1] : null;
  }
  const googleFonts = [extractFontName(fonts.sans), extractFontName(fonts.mono)].filter(Boolean) as string[];
  const googleFontsUrl = googleFonts.length
    ? "https://fonts.googleapis.com/css2?" + googleFonts.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`).join("&") + "&display=swap"
    : null;

  const themeCSS = `
    :root {
      --color-primary: ${colors.primary};
      --color-primary-light: ${colors.light};
      --color-primary-dark: ${colors.dark};
      --color-background-light: 255 255 255;
      --color-background-dark: 11 12 16;
      --font-sans: ${fonts.sans};
      --font-mono: ${fonts.mono};
      --sidebar-width: ${layout.sidebar};
      --toc-width: ${layout.toc};
      --content-max-width: ${layout.content};
      --header-height: ${headerHeight};
    }
    html { scroll-padding-top: ${headerHeight}; }
    body { margin: 0; background: rgb(var(--color-background-light)); }
    .dark body { background: rgb(var(--color-background-dark)); }
  `;

  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="sourcey-search" content={`${options.assetBase}search-index.json`} />
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <style dangerouslySetInnerHTML={{ __html: langIconCSS() }} />
      {site.customCSS && <style dangerouslySetInnerHTML={{ __html: site.customCSS }} />}
      <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('sourcey-theme');if(t==='dark')document.documentElement.classList.add('dark')})()` }} />
      {googleFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={googleFontsUrl} />
        </>
      )}
      <link rel="stylesheet" href={`${options.assetBase}sourcey.css`} />
      {site.favicon && <link rel="icon" href={site.favicon} />}
    </head>
  );
}
