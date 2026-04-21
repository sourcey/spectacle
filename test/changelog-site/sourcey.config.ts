import { defineConfig } from "sourcey";

export default defineConfig({
  name: "Changelog Test",
  siteUrl: "https://docs.example.com",
  baseUrl: "/reference",
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
