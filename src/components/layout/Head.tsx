import { useContext } from "preact/hooks";
import { SpecContext, OptionsContext, PageContext, NavigationContext } from "../../renderer/context.js";

export function Head() {
  const spec = useContext(SpecContext);
  const options = useContext(OptionsContext);
  const page = useContext(PageContext);
  const nav = useContext(NavigationContext);

  // Page title: use markdown page title, or spec title
  const siteName = spec.info.title || "";
  const pageTitle = page?.kind === "markdown"
    ? (siteName ? `${page.markdown!.title} — ${siteName}` : page.markdown!.title)
    : `${siteName} — API Reference`;

  const pageDescription = page?.kind === "markdown"
    ? page.markdown!.description || pageTitle
    : spec.info.description ?? `${siteName} API Documentation`;

  // In multi-page mode, include a meta tag so search.js knows to load the JSON index
  const hasSearchIndex = nav !== null;

  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {hasSearchIndex && <meta name="spectacle-search" content={`${options.assetBase}search-index.json`} />}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
      <link rel="stylesheet" href={`${options.assetBase}spectacle.css`} />
      {spec.info.favicon && <link rel="icon" href={spec.info.favicon} />}
    </head>
  );
}
