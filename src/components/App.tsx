import type { NormalizedSpec } from "../core/types.js";
import { SpecContext, OptionsContext } from "../renderer/context.js";
import type { RenderOptions } from "../renderer/context.js";
import { Head } from "./layout/Head.js";
import { Page } from "./layout/Page.js";

interface AppProps {
  spec: NormalizedSpec;
  options: RenderOptions;
}

/**
 * Root component. Renders a complete HTML document (or embeddable fragment).
 */
export function App({ spec, options }: AppProps) {
  const content = (
    <SpecContext.Provider value={spec}>
      <OptionsContext.Provider value={options}>
        {options.embeddable ? (
          <Page />
        ) : (
          <html lang="en">
            <Head />
            <body id="spectacle">
              <Page />
              <script src={`${options.assetBase}spectacle.js`} defer />
            </body>
          </html>
        )}
      </OptionsContext.Provider>
    </SpecContext.Provider>
  );

  return content;
}
