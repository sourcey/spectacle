import { useContext } from "preact/hooks";
import { SpecContext } from "../../renderer/context.js";
import { OptionsContext } from "../../renderer/context.js";

export function Head() {
  const spec = useContext(SpecContext);
  const options = useContext(OptionsContext);

  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{spec.info.title} — API Reference</title>
      <meta name="description" content={spec.info.description ?? `${spec.info.title} API Documentation`} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
      <link rel="stylesheet" href={`${options.assetBase}spectacle.css`} />
      {spec.info.favicon && <link rel="icon" href={spec.info.favicon} />}
    </head>
  );
}
