// Package sourceygodoc documents the Sourcey Go documentation extractor module.
//
// The module's primary surface is the sourcey-godoc CLI:
//
//	go install github.com/sourcey/sourcey/go/sourcey-godoc/cmd/sourcey-godoc@latest
//
// The CLI reads a Go module through the Go toolchain and emits Sourcey's
// portable godoc snapshot format. Sourcey's TypeScript CLI embeds this same
// module for live-mode docs builds, so the standalone CLI and Sourcey runtime
// share one implementation.
package sourceygodoc
