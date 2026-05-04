# sourcey-godoc

Native Go documentation extractor for Sourcey.

`sourcey-godoc` reads a Go module with the Go toolchain (`go list`, `go/parser`,
`go/doc`) and emits Sourcey's portable `sourcey-godoc` JSON snapshot. Sourcey's
main CLI uses the same extractor internally for live-mode Go docs builds.

## Install

```bash
go install github.com/sourcey/sourcey/go/sourcey-godoc/cmd/sourcey-godoc@latest
```

The same extractor is also available through the main Sourcey npm package:

```bash
npm install -g sourcey
sourcey godoc --module . --packages ./... --out godoc.json
```

Native binaries are published as GitHub release assets for
`go/sourcey-godoc/v*` tags. Package-manager manifests such as Homebrew, Scoop,
and WinGet should consume those assets and their published checksums.

## Usage

```bash
sourcey-godoc --module . --packages ./... --out godoc.json
```

Common options:

- `--packages ./internal/...` selects package patterns passed to `go list`.
- `--exclude ./vendor/...` removes import-path prefixes after expansion.
- `--include-tests=false` skips examples from `*_test.go`.
- `--include-unexported` includes unexported symbols.

The emitted JSON is intended for Sourcey's `godoc` snapshot mode:

```ts
export default {
  navigation: {
    tabs: [
      {
        tab: "Go API",
        godoc: {
          mode: "snapshot",
          snapshot: "./docs/godoc.json",
        },
      },
    ],
  },
};
```
