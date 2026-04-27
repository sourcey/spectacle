import { defineConfig } from "sourcey";

export default defineConfig({
  name: "Sourcey",
  theme: {
    preset: "default",
    colors: {
      primary: "#0f766e",
    },
  },
  navigation: {
    tabs: [
      {
        tab: "Docs",
        slug: "",
        groups: [
          {
            group: "Start Here",
            pages: ["introduction", "install", "configuration"],
          },
          {
            group: "Project",
            pages: ["roadmap", "changelog"],
          },
        ],
      },
    ],
  },
  navbar: {
    links: [
      { type: "github", href: "https://github.com/sourcey/sourcey" },
    ],
    primary: {
      type: "button",
      label: "Documentation",
      href: "https://sourcey.com/docs",
    },
  },
  footer: {
    socials: {
      github: "https://github.com/sourcey/sourcey",
    },
  },
});
