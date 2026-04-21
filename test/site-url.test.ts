import { describe, expect, it } from "vitest";
import { normalizeBaseUrl, normalizeSiteUrl, stripBaseUrl, toPublicPath, toPublicUrl } from "../src/site-url.js";

describe("site-url helpers", () => {
  it("normalizes public base paths consistently", () => {
    expect(normalizeBaseUrl(undefined)).toBe("");
    expect(normalizeBaseUrl("/")).toBe("");
    expect(normalizeBaseUrl("reference")).toBe("/reference/");
    expect(normalizeBaseUrl("/reference/")).toBe("/reference/");
  });

  it("builds public paths and absolute URLs with a baseUrl", () => {
    expect(toPublicPath("changelog.html", "/reference/")).toBe("/reference/changelog.html");
    expect(toPublicPath("changelog/1-2-0/index.html", "/reference/")).toBe("/reference/changelog/1-2-0/");
    expect(toPublicUrl("feed.xml", "https://docs.example.com", "/reference/")).toBe("https://docs.example.com/reference/feed.xml");
  });

  it("strips the configured baseUrl for dev routing", () => {
    expect(stripBaseUrl("/reference", "/reference/")).toBe("/");
    expect(stripBaseUrl("/reference/changelog.html", "/reference/")).toBe("/changelog.html");
    expect(stripBaseUrl("/changelog.html", "/reference/")).toBe("/changelog.html");
  });

  it("requires siteUrl to be an origin and not a path-prefixed URL", () => {
    expect(normalizeSiteUrl("https://docs.example.com/")).toBe("https://docs.example.com");
    expect(() => normalizeSiteUrl("https://docs.example.com/reference")).toThrow(/baseUrl/);
    expect(() => normalizeSiteUrl("/reference")).toThrow(/absolute http\(s\) URL/);
  });
});
