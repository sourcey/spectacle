// Package main is Sourcey's native Go documentation introspector.
//
// It reads a Go module via the toolchain (`go list -json`) and emits a
// `GodocSnapshot` JSON document on stdout (or `--out`). The output mirrors
// the TypeScript types in `src/core/godoc-types.ts`.
//
// The helper depends only on the Go standard library, builds against the
// host toolchain via `go run`, and never shells out to `go doc`.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"go/ast"
	"go/doc"
	"go/parser"
	"go/printer"
	"go/token"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime/debug"
	"sort"
	"strings"
	"time"
)

const (
	schemaVersion = 1
	source        = "sourcey-godoc"
)

var version = "dev"

type snapshot struct {
	SchemaVersion int          `json:"schema_version"`
	Source        string       `json:"source"`
	ModulePath    string       `json:"module_path"`
	GeneratedAt   string       `json:"generated_at,omitempty"`
	Packages      []pkgOut     `json:"packages"`
	Diagnostics   []diagnostic `json:"diagnostics,omitempty"`
}

type pkgOut struct {
	ImportPath string     `json:"importPath"`
	Name       string     `json:"name"`
	Synopsis   string     `json:"synopsis"`
	Doc        string     `json:"doc"`
	Dir        string     `json:"dir"`
	Files      []string   `json:"files"`
	Consts     []valueOut `json:"consts"`
	Vars       []valueOut `json:"vars"`
	Funcs      []funcOut  `json:"funcs"`
	Types      []typeOut  `json:"types"`
	Examples   []exOut    `json:"examples"`
}

type valueOut struct {
	Name        string       `json:"name"`
	Doc         string       `json:"doc"`
	Declaration string       `json:"declaration"`
	Position    *positionOut `json:"position,omitempty"`
}

type funcOut struct {
	Name      string       `json:"name"`
	Doc       string       `json:"doc"`
	Signature string       `json:"signature"`
	Position  *positionOut `json:"position,omitempty"`
	Examples  []exOut      `json:"examples"`
}

type typeOut struct {
	Name        string       `json:"name"`
	Doc         string       `json:"doc"`
	Declaration string       `json:"declaration"`
	Kind        string       `json:"kind"`
	Position    *positionOut `json:"position,omitempty"`
	Fields      []fieldOut   `json:"fields"`
	Methods     []funcOut    `json:"methods"`
	Examples    []exOut      `json:"examples"`
}

type fieldOut struct {
	Name     string `json:"name"`
	Doc      string `json:"doc"`
	Type     string `json:"type"`
	Tag      string `json:"tag,omitempty"`
	Embedded bool   `json:"embedded,omitempty"`
}

type exOut struct {
	Name   string `json:"name"`
	Suffix string `json:"suffix"`
	Doc    string `json:"doc"`
	Code   string `json:"code"`
	Output string `json:"output,omitempty"`
}

type positionOut struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

type diagnostic struct {
	Severity string `json:"severity"`
	Code     string `json:"code"`
	Message  string `json:"message"`
	Package  string `json:"package,omitempty"`
	File     string `json:"file,omitempty"`
	Line     int    `json:"line,omitempty"`
}

type stringSliceFlag []string

func (s *stringSliceFlag) String() string { return strings.Join(*s, ",") }
func (s *stringSliceFlag) Set(v string) error {
	for _, part := range strings.Split(v, ",") {
		if part = strings.TrimSpace(part); part != "" {
			*s = append(*s, part)
		}
	}
	return nil
}

type goListPackage struct {
	Dir            string
	ImportPath     string
	Name           string
	Doc            string
	Module         *struct{ Path string }
	GoFiles        []string
	TestGoFiles    []string
	XTestGoFiles   []string
	IgnoredGoFiles []string
	Error          *struct {
		Err string
	}
}

type config struct {
	command           string
	moduleDir         string
	patterns          []string
	excludes          []string
	includeTests      bool
	includeUnexported bool
	out               string
	title             string
}

func main() {
	cfg, err := parseFlags()
	if err != nil {
		fail(err)
	}

	snap, err := build(cfg)
	if err != nil {
		fail(err)
	}

	if cfg.command == "generate" {
		if err := writeSite(cfg, snap); err != nil {
			fail(err)
		}
	} else {
		if err := writeSnapshot(cfg.out, snap); err != nil {
			fail(err)
		}
	}

	if hasErrorDiagnostic(snap.Diagnostics) {
		os.Exit(1)
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "sourcey-godoc:", err)
	os.Exit(2)
}

func parseFlags() (*config, error) {
	args := os.Args[1:]
	command := "snapshot"
	if len(args) > 0 {
		switch args[0] {
		case "snapshot", "generate":
			command = args[0]
			args = args[1:]
		}
	}

	defaultOut := ""
	if command == "generate" {
		defaultOut = "site"
	}

	fs := flag.NewFlagSet("sourcey-godoc "+command, flag.ContinueOnError)
	module := fs.String("module", ".", "Go module directory")
	includeTests := fs.Bool("include-tests", true, "include examples from *_test.go")
	includeUnexported := fs.Bool("include-unexported", false, "include unexported symbols")
	out := fs.String("out", defaultOut, "output file for snapshot mode; output directory for generate mode")
	title := fs.String("title", "", "site title for generate mode")
	showVersion := fs.Bool("version", false, "print version and exit")
	var patterns stringSliceFlag
	var excludes stringSliceFlag
	fs.Var(&patterns, "packages", "package patterns (repeatable; comma-separated allowed)")
	fs.Var(&excludes, "exclude", "package import-path prefixes to exclude (repeatable)")
	if err := fs.Parse(args); err != nil {
		return nil, err
	}

	if *showVersion {
		fmt.Println(versionString())
		os.Exit(0)
	}
	if fs.NArg() > 0 {
		return nil, fmt.Errorf("unexpected arguments: %s", strings.Join(fs.Args(), " "))
	}

	abs, err := filepath.Abs(*module)
	if err != nil {
		return nil, fmt.Errorf("resolve --module: %w", err)
	}
	if info, err := os.Stat(abs); err != nil || !info.IsDir() {
		return nil, fmt.Errorf("--module %q is not a directory", abs)
	}
	if len(patterns) == 0 {
		patterns = []string{"./..."}
	}

	return &config{
		command:           command,
		moduleDir:         abs,
		patterns:          patterns,
		excludes:          excludes,
		includeTests:      *includeTests,
		includeUnexported: *includeUnexported,
		out:               *out,
		title:             *title,
	}, nil
}

func writeSnapshot(out string, snap *snapshot) error {
	payload, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}
	payload = append(payload, '\n')
	if out == "" {
		_, err = os.Stdout.Write(payload)
		return err
	}
	if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
		return err
	}
	return os.WriteFile(out, payload, 0o644)
}

func versionString() string {
	if version != "" && version != "dev" {
		return version
	}
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return version
	}
	if info.Main.Version == "" || info.Main.Version == "(devel)" {
		return version
	}
	return strings.TrimPrefix(info.Main.Version, "v")
}

func build(cfg *config) (*snapshot, error) {
	pkgs, err := goList(cfg.moduleDir, cfg.patterns)
	if err != nil {
		return nil, err
	}

	modulePath := ""
	if len(pkgs) > 0 && pkgs[0].Module != nil {
		modulePath = pkgs[0].Module.Path
	}

	snap := &snapshot{
		SchemaVersion: schemaVersion,
		Source:        source,
		ModulePath:    modulePath,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		Packages:      []pkgOut{},
		Diagnostics:   []diagnostic{},
	}

	matched := 0
	for _, p := range pkgs {
		if p.Error != nil {
			snap.Diagnostics = append(snap.Diagnostics, diagnostic{
				Severity: "error",
				Code:     "GODOC_PACKAGE_LIST_FAILED",
				Message:  p.Error.Err,
				Package:  p.ImportPath,
			})
			continue
		}
		if isExcluded(p.ImportPath, cfg.excludes) {
			continue
		}
		matched++
		out, perPkgDiags := parsePackage(p, cfg)
		snap.Diagnostics = append(snap.Diagnostics, perPkgDiags...)
		if out != nil {
			snap.Packages = append(snap.Packages, *out)
		}
	}

	if matched == 0 {
		snap.Diagnostics = append(snap.Diagnostics, diagnostic{
			Severity: "warning",
			Code:     "GODOC_NO_PACKAGES_MATCHED",
			Message:  fmt.Sprintf("no packages matched patterns %v", cfg.patterns),
		})
	}

	sort.Slice(snap.Packages, func(i, j int) bool {
		return snap.Packages[i].ImportPath < snap.Packages[j].ImportPath
	})

	return snap, nil
}

func goList(moduleDir string, patterns []string) ([]goListPackage, error) {
	args := append([]string{"list", "-json", "-e"}, patterns...)
	cmd := exec.Command("go", args...)
	cmd.Dir = moduleDir
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("go list failed: %v\n%s", err, strings.TrimSpace(stderr.String()))
	}

	var pkgs []goListPackage
	dec := json.NewDecoder(&stdout)
	for {
		var p goListPackage
		if err := dec.Decode(&p); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, fmt.Errorf("decode go list output: %w", err)
		}
		pkgs = append(pkgs, p)
	}
	return pkgs, nil
}

func isExcluded(importPath string, excludes []string) bool {
	for _, e := range excludes {
		e = strings.TrimSuffix(strings.TrimSuffix(e, "/..."), "/")
		if e == "" {
			continue
		}
		if importPath == e || strings.HasPrefix(importPath, e+"/") {
			return true
		}
	}
	return false
}

func parsePackage(p goListPackage, cfg *config) (*pkgOut, []diagnostic) {
	if len(p.GoFiles) == 0 && len(p.TestGoFiles) == 0 {
		return nil, []diagnostic{{
			Severity: "info",
			Code:     "GODOC_PACKAGE_EMPTY",
			Message:  "package has no Go files",
			Package:  p.ImportPath,
		}}
	}

	fset := token.NewFileSet()
	parseErrors := []diagnostic{}
	packageFiles := []*ast.File{}
	exampleFiles := []*ast.File{}

	collect := func(files []string, severity string, code string, target *[]*ast.File) {
		for _, name := range files {
			path := filepath.Join(p.Dir, name)
			file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
			if err != nil {
				parseErrors = append(parseErrors, diagnostic{
					Severity: severity,
					Code:     code,
					Message:  err.Error(),
					Package:  p.ImportPath,
					File:     name,
				})
				continue
			}
			*target = append(*target, file)
		}
	}

	collect(p.GoFiles, "error", "GODOC_PACKAGE_PARSE_FAILED", &packageFiles)
	if cfg.includeTests {
		collect(p.TestGoFiles, "warning", "GODOC_TEST_PARSE_FAILED", &exampleFiles)
		collect(p.XTestGoFiles, "warning", "GODOC_TEST_PARSE_FAILED", &exampleFiles)
	}

	if len(packageFiles) == 0 {
		return nil, parseErrors
	}

	docMode := doc.Mode(0)
	if cfg.includeUnexported {
		docMode |= doc.AllDecls
	}
	d, err := doc.NewFromFiles(fset, packageFiles, p.ImportPath, docMode)
	if err != nil {
		parseErrors = append(parseErrors, diagnostic{
			Severity: "error",
			Code:     "GODOC_PACKAGE_DOC_FAILED",
			Message:  err.Error(),
			Package:  p.ImportPath,
		})
		return nil, parseErrors
	}

	moduleDir := cfg.moduleDir
	files := relPaths(moduleDir, p.GoFiles, p.Dir)

	out := &pkgOut{
		ImportPath: p.ImportPath,
		Name:       d.Name,
		Doc:        strings.TrimSpace(d.Doc),
		Synopsis:   doc.Synopsis(d.Doc),
		Dir:        relPath(moduleDir, p.Dir),
		Files:      files,
		Consts:     []valueOut{},
		Vars:       []valueOut{},
		Funcs:      []funcOut{},
		Types:      []typeOut{},
		Examples:   []exOut{},
	}

	allConsts := append([]*doc.Value{}, d.Consts...)
	allVars := append([]*doc.Value{}, d.Vars...)
	for _, t := range d.Types {
		allConsts = append(allConsts, t.Consts...)
		allVars = append(allVars, t.Vars...)
	}
	for _, c := range allConsts {
		out.Consts = append(out.Consts, extractValues(fset, moduleDir, c)...)
	}
	for _, v := range allVars {
		out.Vars = append(out.Vars, extractValues(fset, moduleDir, v)...)
	}
	for _, f := range d.Funcs {
		out.Funcs = append(out.Funcs, extractFunc(fset, moduleDir, f))
	}
	for _, t := range d.Types {
		out.Types = append(out.Types, extractType(fset, moduleDir, t))
		// Factory functions returning t (e.g. `func New() *Widget`) live
		// under the type in go/doc; hoist them to package-level so
		// renderers can list them in the Functions section.
		for _, f := range t.Funcs {
			out.Funcs = append(out.Funcs, extractFunc(fset, moduleDir, f))
		}
	}
	sort.Slice(out.Funcs, func(i, j int) bool { return out.Funcs[i].Name < out.Funcs[j].Name })

	examples := doc.Examples(exampleFiles...)
	out.Examples = convertExamples(fset, packageExamples(examples))
	for i := range out.Funcs {
		if attached := functionExamples(examples, out.Funcs[i].Name); len(attached) > 0 {
			out.Funcs[i].Examples = convertExamples(fset, attached)
		}
	}
	for i := range out.Types {
		out.Types[i].Examples = convertExamples(fset, typeExamples(examples, out.Types[i].Name))
		for j := range out.Types[i].Methods {
			out.Types[i].Methods[j].Examples = convertExamples(fset, methodExamples(examples, out.Types[i].Name, out.Types[i].Methods[j].Name))
		}
	}

	return out, parseErrors
}

func convertExamples(fset *token.FileSet, examples []*doc.Example) []exOut {
	out := make([]exOut, 0, len(examples))
	for _, ex := range examples {
		out = append(out, exOut{
			Name:   ex.Name,
			Suffix: ex.Suffix,
			Doc:    strings.TrimSpace(ex.Doc),
			Code:   printNode(fset, ex.Code),
			Output: strings.TrimSpace(ex.Output),
		})
	}
	return out
}

func packageExamples(examples []*doc.Example) []*doc.Example {
	return matchingExamples(examples, func(ex *doc.Example) bool { return ex.Name == "" })
}

func functionExamples(examples []*doc.Example, name string) []*doc.Example {
	return matchingExamples(examples, func(ex *doc.Example) bool { return ex.Name == name })
}

func typeExamples(examples []*doc.Example, typeName string) []*doc.Example {
	return matchingExamples(examples, func(ex *doc.Example) bool { return ex.Name == typeName })
}

func methodExamples(examples []*doc.Example, typeName string, methodName string) []*doc.Example {
	want := typeName + "_" + methodName
	return matchingExamples(examples, func(ex *doc.Example) bool { return ex.Name == want })
}

func matchingExamples(examples []*doc.Example, keep func(*doc.Example) bool) []*doc.Example {
	out := []*doc.Example{}
	for _, ex := range examples {
		if keep(ex) {
			out = append(out, ex)
		}
	}
	return out
}

func extractValues(fset *token.FileSet, moduleDir string, v *doc.Value) []valueOut {
	out := []valueOut{}
	groupDecl := printNode(fset, v.Decl)
	groupDoc := strings.TrimSpace(v.Doc)
	for _, spec := range v.Decl.Specs {
		vs, ok := spec.(*ast.ValueSpec)
		if !ok {
			continue
		}
		for _, name := range vs.Names {
			out = append(out, valueOut{
				Name:        name.Name,
				Doc:         groupDoc,
				Declaration: groupDecl,
				Position:    relPosition(fset, moduleDir, name.Pos()),
			})
		}
	}
	return out
}

func extractFunc(fset *token.FileSet, moduleDir string, f *doc.Func) funcOut {
	signature := "func " + f.Name + signatureSuffix(fset, f.Decl)
	if f.Recv != "" {
		recv := strings.TrimSpace(printNode(fset, f.Decl.Recv))
		signature = "func " + recv + " " + f.Name + signatureSuffix(fset, f.Decl)
	}
	return funcOut{
		Name:      f.Name,
		Doc:       strings.TrimSpace(f.Doc),
		Signature: signature,
		Position:  relPosition(fset, moduleDir, f.Decl.Pos()),
		Examples:  []exOut{},
	}
}

func signatureSuffix(fset *token.FileSet, decl *ast.FuncDecl) string {
	clone := *decl
	clone.Body = nil
	clone.Doc = nil
	rendered := printNode(fset, &clone)
	if i := strings.Index(rendered, decl.Name.Name); i >= 0 {
		rendered = rendered[i+len(decl.Name.Name):]
	}
	return rendered
}

func extractType(fset *token.FileSet, moduleDir string, t *doc.Type) typeOut {
	declaration := printNode(fset, t.Decl)
	kind := "defined"
	fields := []fieldOut{}

	for _, spec := range t.Decl.Specs {
		ts, ok := spec.(*ast.TypeSpec)
		if !ok {
			continue
		}
		switch typed := ts.Type.(type) {
		case *ast.StructType:
			kind = "struct"
			fields = extractFields(fset, typed.Fields)
		case *ast.InterfaceType:
			kind = "interface"
			fields = extractInterfaceMembers(fset, typed)
		default:
			if ts.Assign.IsValid() {
				kind = "alias"
			}
		}
	}

	out := typeOut{
		Name:        t.Name,
		Doc:         strings.TrimSpace(t.Doc),
		Declaration: declaration,
		Kind:        kind,
		Position:    relPosition(fset, moduleDir, t.Decl.Pos()),
		Fields:      fields,
		Methods:     []funcOut{},
		Examples:    []exOut{},
	}

	for _, m := range t.Methods {
		out.Methods = append(out.Methods, extractFunc(fset, moduleDir, m))
	}

	return out
}

func extractFields(fset *token.FileSet, list *ast.FieldList) []fieldOut {
	out := []fieldOut{}
	if list == nil {
		return out
	}
	for _, field := range list.List {
		fieldType := strings.TrimSpace(printNode(fset, field.Type))
		tag := ""
		if field.Tag != nil {
			tag = strings.Trim(field.Tag.Value, "`")
		}
		docComment := strings.TrimSpace(commentText(field.Doc, field.Comment))
		if len(field.Names) == 0 {
			out = append(out, fieldOut{
				Name:     fieldType,
				Doc:      docComment,
				Type:     fieldType,
				Tag:      tag,
				Embedded: true,
			})
			continue
		}
		for _, name := range field.Names {
			out = append(out, fieldOut{
				Name: name.Name,
				Doc:  docComment,
				Type: fieldType,
				Tag:  tag,
			})
		}
	}
	return out
}

func extractInterfaceMembers(fset *token.FileSet, iface *ast.InterfaceType) []fieldOut {
	out := []fieldOut{}
	if iface.Methods == nil {
		return out
	}
	for _, method := range iface.Methods.List {
		typeStr := strings.TrimSpace(printNode(fset, method.Type))
		docComment := strings.TrimSpace(commentText(method.Doc, method.Comment))
		if len(method.Names) == 0 {
			out = append(out, fieldOut{
				Name:     typeStr,
				Doc:      docComment,
				Type:     typeStr,
				Embedded: true,
			})
			continue
		}
		for _, name := range method.Names {
			out = append(out, fieldOut{
				Name: name.Name,
				Doc:  docComment,
				Type: typeStr,
			})
		}
	}
	return out
}

func printNode(fset *token.FileSet, node any) string {
	var buf bytes.Buffer
	cfg := printer.Config{Mode: printer.UseSpaces | printer.TabIndent, Tabwidth: 4}
	if err := cfg.Fprint(&buf, fset, node); err != nil {
		return ""
	}
	return buf.String()
}

func relPath(moduleDir, target string) string {
	if rel, err := filepath.Rel(moduleDir, target); err == nil {
		return filepath.ToSlash(rel)
	}
	return filepath.ToSlash(target)
}

func relPaths(moduleDir string, names []string, baseDir string) []string {
	out := make([]string, 0, len(names))
	for _, n := range names {
		out = append(out, relPath(moduleDir, filepath.Join(baseDir, n)))
	}
	sort.Strings(out)
	return out
}

func relPosition(fset *token.FileSet, moduleDir string, p token.Pos) *positionOut {
	if !p.IsValid() {
		return nil
	}
	pos := fset.Position(p)
	return &positionOut{File: relPath(moduleDir, pos.Filename), Line: pos.Line}
}

func commentText(groups ...*ast.CommentGroup) string {
	parts := []string{}
	for _, g := range groups {
		if g == nil {
			continue
		}
		parts = append(parts, g.Text())
	}
	return strings.Join(parts, "\n")
}

func hasErrorDiagnostic(diags []diagnostic) bool {
	for _, d := range diags {
		if d.Severity == "error" {
			return true
		}
	}
	return false
}
