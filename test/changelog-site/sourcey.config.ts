import { defineConfig } from "sourcey";

export default defineConfig({
  name: "Changelog Test",
  changelog: {
    feed: true,
    permalinks: true,
    ogImages: true,
  },
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        slug: "",
        groups: [
          {
            group: "Guides",
            pages: ["introduction", "CHANGELOG"],
          },
        ],
      },
    ],
  },
});
