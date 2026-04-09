import { useContext } from "preact/hooks";
import { SpecContext, OptionsContext, PageContext, SiteContext, NavigationContext } from "../../renderer/context.js";
import { langIconCSS } from "../../utils/lang-icons.js";
import pkg from "../../../package.json" with { type: "json" };

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
  // Desktop: h-16 row + h-12 tabs (when multi-tab) = 7rem, or h-16 alone = 4rem.
  // Mobile: h-16 row + h-14 breadcrumb = 7.5rem (always).
  const headerHeight = nav.tabs.length > 1 ? "7rem" : "4rem";
  const headerHeightMobile = "7.5rem";
  const showLangIconCSS = page.kind === "spec" && site.codeSamples.length > 0;

  const themeCSS = `
    :root {
      --color-primary: ${colors.primary};
      --color-primary-light: ${colors.light};
      --color-primary-dark: ${colors.dark};
      --color-primary-ink: ${colors.dark};
      --color-background-light: 255 255 255;
      --color-background-dark: 11 12 16;
      --font-sans: ${fonts.sans};
      --font-mono: ${fonts.mono};
      --sidebar-width: ${layout.sidebar};
      --toc-width: ${layout.toc};
      --content-max-width: ${layout.content};
      --header-height: ${headerHeightMobile};
    }
    html { scroll-padding-top: var(--header-height); }
    @media (min-width: 1024px) {
      :root { --header-height: ${headerHeight}; }
    }
    body { margin: 0; background: rgb(var(--color-background-light)); }
    .dark body { background: rgb(var(--color-background-dark)); }
  `;

  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="generator" content={`Sourcey ${pkg.version}`} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      {siteName && <meta property="og:site_name" content={siteName} />}
      {options.ogImagePath && <meta property="og:image" content={options.ogImagePath} />}
      {options.ogImagePath && <meta property="og:image:width" content="1200" />}
      {options.ogImagePath && <meta property="og:image:height" content="630" />}
      {options.ogImagePath && <meta property="og:image:type" content="image/png" />}
      <meta name="twitter:card" content={options.ogImagePath ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {options.ogImagePath && <meta name="twitter:image" content={options.ogImagePath} />}
      <meta name="sourcey-search" content={`${options.assetBase}search-index.json`} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts.googleFont)}:wght@100..900&display=swap`} />
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      {showLangIconCSS && <style dangerouslySetInnerHTML={{ __html: langIconCSS() }} />}
      {site.customCSS && <style dangerouslySetInnerHTML={{ __html: site.customCSS }} />}
      <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('sourcey-theme');if(t==='dark')document.documentElement.classList.add('dark')})()` }} />
      <link rel="stylesheet" href={`${options.assetBase}sourcey.css`} />
      {site.favicon && <link rel="icon" href={site.favicon} />}
    </head>
  );
}
