package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteSiteGeneratesBrowsableDocsAndAgentSurfaces(t *testing.T) {
	out := t.TempDir()
	snap := &snapshot{
		SchemaVersion: schemaVersion,
		Source:        source,
		ModulePath:    "example.com/project",
		Packages: []pkgOut{{
			ImportPath: "example.com/project/internal/core",
			Name:       "core",
			Synopsis:   "Package core owns the contract.",
			Doc:        "Package core owns the contract.\n\nIt has a second paragraph.",
			Dir:        "internal/core",
			Files:      []string{"core.go"},
			Funcs: []funcOut{{
				Name:      "Run",
				Doc:       "Run executes the plan.",
				Signature: "func Run() error",
			}},
			Types: []typeOut{{
				Name:        "Plan",
				Doc:         "Plan describes work.",
				Declaration: "type Plan struct {\n\tName string `json:\"name\"`\n}",
				Kind:        "struct",
				Fields: []fieldOut{{
					Name: "Name",
					Doc:  "Name is the plan name.",
					Type: "string",
					Tag:  `json:"name"`,
				}},
			}},
		}},
	}

	if err := writeSite(&config{out: out, title: "Project Go API"}, snap); err != nil {
		t.Fatalf("writeSite failed: %v", err)
	}

	for _, rel := range []string{
		"index.html",
		"pkg-internal-core.html",
		"sourcey-godoc.css",
		"sourcey-godoc.json",
		"llms.txt",
		"llms-full.txt",
	} {
		if _, err := os.Stat(filepath.Join(out, rel)); err != nil {
			t.Fatalf("expected %s: %v", rel, err)
		}
	}

	pkgHTML := readTestFile(t, filepath.Join(out, "pkg-internal-core.html"))
	for _, want := range []string{
		"func Run() error",
		"type Plan",
		"Name is the plan name.",
		"It has a second paragraph.",
	} {
		if !strings.Contains(pkgHTML, want) {
			t.Fatalf("package page missing %q\n%s", want, pkgHTML)
		}
	}

	llms := readTestFile(t, filepath.Join(out, "llms.txt"))
	if !strings.Contains(llms, "pkg-internal-core.html") {
		t.Fatalf("llms.txt does not link package page:\n%s", llms)
	}
	llmsFull := readTestFile(t, filepath.Join(out, "llms-full.txt"))
	if !strings.Contains(llmsFull, "func Run() error") {
		t.Fatalf("llms-full.txt missing declaration:\n%s", llmsFull)
	}
}

func readTestFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}
