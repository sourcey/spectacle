import { describe, expect, it } from "vitest";

import {
  encodeGenericSegment,
  encodeImplAnchor,
  itemAnchor,
  renderDoctestBadges,
  renderItemHtml,
  renderModulePage,
  renderSignature,
  resolveIntraDocLinks,
  __internals,
} from "../../src/core/rustdoc-render.js";
import type { CrateSpec, Item, Signature } from "../../src/core/rustdoc-types.js";

const baseCtx = () => ({
  crate: {
    name: "basic",
    version: "0.1.0",
    root_module_id: "0",
    modules: [],
    items: [],
    external_crates: [],
    diagnostics: [],
  } satisfies CrateSpec,
  itemsById: new Map<string, Item>(),
  externalCrates: new Map(),
  tabSlug: "rust-api",
  sourceLinks: {},
  diagnostics: [],
});

function dummySig(opts: { name: string; long?: boolean }): Signature {
  const inputs = opts.long
    ? Array.from({ length: 8 }, (_, i) => ({
        name: `arg${i}`,
        type_display: `SomeReallyLongType<u32, ${i}>`,
      }))
    : [{ name: "x", type_display: "i32" }];
  const tokens = [
    { kind: "keyword" as const, text: "pub" },
    { kind: "whitespace" as const },
    { kind: "keyword" as const, text: "fn" },
    { kind: "whitespace" as const },
    { kind: "type" as const, text: opts.name, target: null },
    { kind: "punct" as const, text: "(" },
    ...inputs.flatMap((inp, idx) => {
      const tail =
        idx === inputs.length - 1
          ? []
          : [{ kind: "punct" as const, text: "," }, { kind: "whitespace" as const }];
      return [
        { kind: "punct" as const, text: inp.name },
        { kind: "punct" as const, text: ":" },
        { kind: "whitespace" as const },
        { kind: "type" as const, text: inp.type_display, target: null },
        ...tail,
      ];
    }),
    { kind: "punct" as const, text: ")" },
    { kind: "whitespace" as const },
    { kind: "punct" as const, text: "->" },
    { kind: "whitespace" as const },
    { kind: "type" as const, text: "String", target: null },
  ];
  const display = tokens
    .map((t) => {
      switch (t.kind) {
        case "keyword":
        case "punct":
          return t.text;
        case "type":
          return t.text;
        case "whitespace":
          return " ";
        default:
          return "";
      }
    })
    .join("");
  return {
    display,
    tokens,
    inputs: inputs.map((i) => ({ name: i.name, type_display: i.type_display })),
    output_display: "String",
    is_c_variadic: false,
  };
}

describe("anchor encoder", () => {
  it("URL-encodes parametric impl anchors in rustdoc form", () => {
    const anchor = encodeImplAnchor("Clone", "HashMap<K, V, S, A>");
    expect(anchor).toBe("impl-Clone-for-HashMap%3CK,+V,+S,+A%3E");
  });

  it("escapes lone generics inside a segment", () => {
    expect(encodeGenericSegment("Option<T>")).toBe("Option%3CT%3E");
  });

  it("derives item anchors from kind and name", () => {
    const fn: Item = {
      id: "fn-greet",
      name: "greet",
      path: ["basic", "greet"],
      visibility: { kind: "public" },
      source: null,
      docs_markdown: null,
      doc_aliases: [],
      deprecation: null,
      stability: null,
      feature_gates: [],
      attrs_structured: [],
      inner: {
        kind: "function",
        signature: dummySig({ name: "greet" }),
        generics: { params: [], where_predicates: [] },
        is_const: false,
        is_async: false,
        is_unsafe: false,
        has_body: true,
      },
      doctests: [],
    };
    expect(itemAnchor(fn)).toBe("fn.greet");
  });
});

describe("item and module rendering", () => {
  it("emits each item anchor id once", () => {
    const item: Item = {
      id: "fn-greet",
      name: "greet",
      path: ["basic", "greet"],
      visibility: { kind: "public" },
      source: null,
      docs_markdown: null,
      doc_aliases: [],
      deprecation: null,
      stability: null,
      feature_gates: [],
      attrs_structured: [],
      links: {},
      inner: {
        kind: "function",
        signature: dummySig({ name: "greet" }),
        generics: { params: [], where_predicates: [] },
        is_const: false,
        is_async: false,
        is_unsafe: false,
        has_body: true,
      },
      doctests: [],
    };

    const html = renderItemHtml(item, baseCtx());
    expect(html.match(/id="fn\.greet"/g)).toHaveLength(1);
  });

  it("renders module docs as markdown", () => {
    const { html } = renderModulePage(
      {
        id: "mod-basic",
        path: ["basic"],
        docs_markdown: "# Crate docs\n\nUses **markdown**.",
        doc_aliases: [],
        item_ids: [],
        sub_module_paths: [],
        source: null,
      },
      [],
      baseCtx(),
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<strong>markdown</strong>");
    expect(html).not.toContain("# Crate docs");
  });
});

describe("signature formatter", () => {
  it("renders short signatures inline with code-header class", () => {
    const html = renderSignature(dummySig({ name: "greet" }), baseCtx());
    expect(html).toContain('class="code-header rust-signature"');
    expect(html).not.toContain("\n    ");
  });

  it("breaks long signatures with each input on its own line", () => {
    const html = renderSignature(dummySig({ name: "wide", long: true }), baseCtx());
    expect(html).toContain("\n    ");
    expect(html).toContain("arg0");
    expect(html).toContain("arg7");
  });

  it("emits per-token classes for keyword and type tokens", () => {
    const html = renderSignature(dummySig({ name: "greet" }), baseCtx());
    expect(html).toMatch(/class="kw">fn/);
    expect(html).toMatch(/class="ident">String/);
  });
});

describe("intra-doc link resolver", () => {
  it("rewrites known labels and surfaces unresolved ones", () => {
    const ctx = baseCtx();
    const item: Item = {
      id: "id-1",
      name: "Widget",
      path: ["basic", "Widget"],
      visibility: { kind: "public" },
      source: null,
      docs_markdown: null,
      doc_aliases: [],
      deprecation: null,
      stability: null,
      feature_gates: [],
      attrs_structured: [],
      inner: {
        kind: "struct",
        struct_kind: "plain",
        generics: { params: [], where_predicates: [] },
        fields: [],
        has_stripped_fields: false,
        impls: [],
      },
      doctests: [],
    };
    ctx.itemsById.set(item.id, item);
    const md = "See [`Widget`] and also [`Missing`].";
    const { html, unresolved } = resolveIntraDocLinks(
      md,
      { Widget: { kind: "internal", id: item.id } },
      ctx,
    );
    expect(html).toContain("struct.Widget");
    expect(html).toContain("rust-api/");
    expect(html).toContain('title="unresolved intra-doc link"');
    expect(unresolved).toEqual(["Missing"]);
  });
});

describe("doctest badges", () => {
  it("renders one badge per fence attribute with tooltip titles", () => {
    const html = renderDoctestBadges({
      lang: "rust",
      fence_attributes: ["ignore", "no_run", "should_panic"],
      display_code: "",
      executable_code: "",
      implicit_main_wrap: true,
      source: null,
      ordinal: 0,
    });
    expect(html).toContain("rust-doctest-badge-ignore");
    expect(html).toContain("rust-doctest-badge-no_run");
    expect(html).toContain("rust-doctest-badge-should_panic");
    expect(html).toMatch(/title="[^"]*panic/);
  });

  it("picks the most explicit edition attribute via __internals", () => {
    expect(__internals.pickEdition(["edition2021"])).toBe("2021");
    expect(__internals.pickEdition([])).toBe("2024");
  });
});
