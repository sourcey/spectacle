import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: ["dist/", "node_modules/", "test/fixtures/", "test/mcp-test/dist/"],
  },
  {
    files: ["src/client/**/*.js"],
    languageOptions: {
      globals: {
        clearTimeout: "readonly",
        document: "readonly",
        fetch: "readonly",
        history: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        URLSearchParams: "readonly",
        window: "readonly",
      },
    },
  },
);
