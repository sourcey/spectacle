import type { ComponentChildren } from "preact";
import type { NormalizedSpec } from "../core/types.js";
import type { SiteNavigation } from "../core/navigation.js";
import {
  SpecContext,
  OptionsContext,
  NavigationContext,
  PageContext,
} from "../renderer/context.js";
import type { RenderOptions, CurrentPage } from "../renderer/context.js";
import { Head } from "./layout/Head.js";
import { Page } from "./layout/Page.js";

export interface AppProps {
  spec: NormalizedSpec;
  options: RenderOptions;
  /** Site navigation (multi-page mode only) */
  navigation?: SiteNavigation;
  /** Current page being rendered (multi-page mode only) */
  currentPage?: CurrentPage;
}

/**
 * Root component. Renders a complete HTML document (or embeddable fragment).
 *
 * In legacy mode (no navigation/currentPage), behaviour is identical to v1.
 * In multi-page mode, wraps children with NavigationContext and PageContext.
 */
export function App({ spec, options, navigation, currentPage }: AppProps) {
  // Build the content tree. In multi-page mode, wrap in additional context providers.
  // These must wrap BOTH Head and Page so all components access the same contexts.
  let content: ComponentChildren = options.embeddable ? (
    <Page />
  ) : (
    <html lang="en">
      <Head />
      <body id="spectacle">
        <Page />
        <script src={`${options.assetBase}spectacle.js`} defer />
      </body>
    </html>
  );

  // Multi-page mode: wrap in additional context providers
  if (currentPage) {
    content = <PageContext.Provider value={currentPage}>{content}</PageContext.Provider>;
  }
  if (navigation) {
    content = <NavigationContext.Provider value={navigation}>{content}</NavigationContext.Provider>;
  }

  return (
    <SpecContext.Provider value={spec}>
      <OptionsContext.Provider value={options}>
        {content}
      </OptionsContext.Provider>
    </SpecContext.Provider>
  );
}
