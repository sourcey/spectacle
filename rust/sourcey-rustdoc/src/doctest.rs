use pulldown_cmark::{CodeBlockKind, Event, Parser, Tag, TagEnd};

use crate::spec::Doctest;

/// Tokens that explicitly mark a fence as non-rust. Anything else is treated
/// as a rust doctest with the tokens collected as fence attributes,
/// matching rustdoc's own behavior.
const NON_RUST_LANGS: &[&str] = &[
    "text",
    "ignore-but-not-rust",
    "json",
    "toml",
    "yaml",
    "html",
    "bash",
    "sh",
    "shell",
    "console",
    "diff",
    "ini",
    "markdown",
    "md",
];

/// Tokens that are recognised by rustdoc as fence attributes (kept as
/// attributes, not consumed as a language identifier).
const KNOWN_FENCE_ATTRS: &[&str] = &[
    "ignore",
    "no_run",
    "should_panic",
    "compile_fail",
    "allow_fail",
    "standalone_crate",
    "edition2015",
    "edition2018",
    "edition2021",
    "edition2024",
];

/// Parse the docstring markdown and return every code fence as a Doctest.
/// Doctests in rustdoc are any ` ``` ` fence whose language token is empty, `rust`,
/// or starts with `rust,`. We also surface non-rust fences so the renderer can
/// label them; the caller filters on `lang`/`fence_attributes`.
pub fn extract_doctests(docs_markdown: &str) -> Vec<Doctest> {
    let mut out = Vec::new();
    let parser = Parser::new(docs_markdown);
    let mut active: Option<ActiveFence> = None;
    let mut ordinal: u32 = 0;
    for ev in parser {
        match ev {
            Event::Start(Tag::CodeBlock(CodeBlockKind::Fenced(info))) => {
                let info = info.into_string();
                active = Some(ActiveFence::new(&info));
            }
            Event::Start(Tag::CodeBlock(CodeBlockKind::Indented)) => {
                active = Some(ActiveFence::default_rust());
            }
            Event::Text(text) => {
                if let Some(fence) = active.as_mut() {
                    fence.body.push_str(&text);
                }
            }
            Event::End(TagEnd::CodeBlock) => {
                if let Some(fence) = active.take() {
                    if let Some(doctest) = fence.into_doctest(ordinal) {
                        out.push(doctest);
                        ordinal += 1;
                    }
                }
            }
            _ => {}
        }
    }
    out
}

struct ActiveFence {
    lang: String,
    fence_attributes: Vec<String>,
    body: String,
    is_rust: bool,
}

impl ActiveFence {
    fn new(info: &str) -> Self {
        let parts: Vec<String> = info
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        if parts.is_empty() {
            return Self {
                lang: "rust".to_string(),
                fence_attributes: Vec::new(),
                body: String::new(),
                is_rust: true,
            };
        }
        let first = &parts[0];
        let first_lc = first.to_lowercase();
        // Explicit non-rust language: not a doctest.
        if NON_RUST_LANGS.contains(&first_lc.as_str()) {
            return Self {
                lang: first.clone(),
                fence_attributes: parts[1..].to_vec(),
                body: String::new(),
                is_rust: false,
            };
        }
        // Explicit `rust` lang: drop it, keep the rest as attributes.
        if first_lc == "rust" {
            return Self {
                lang: "rust".to_string(),
                fence_attributes: parts[1..].to_vec(),
                body: String::new(),
                is_rust: true,
            };
        }
        // First token is a known rust attribute (e.g. `no_run`): all tokens
        // are attributes; implicit rust lang.
        if KNOWN_FENCE_ATTRS.contains(&first_lc.as_str()) {
            return Self {
                lang: "rust".to_string(),
                fence_attributes: parts.clone(),
                body: String::new(),
                is_rust: true,
            };
        }
        // Unknown first token (e.g. `mermaid`): treat as a foreign language,
        // not a doctest.
        Self {
            lang: first.clone(),
            fence_attributes: parts[1..].to_vec(),
            body: String::new(),
            is_rust: false,
        }
    }

    fn default_rust() -> Self {
        Self {
            lang: "rust".to_string(),
            fence_attributes: Vec::new(),
            body: String::new(),
            is_rust: true,
        }
    }

    fn into_doctest(self, ordinal: u32) -> Option<Doctest> {
        if !self.is_rust {
            return None;
        }
        let (display_code, executable_code) = split_hidden_lines(&self.body);
        let implicit_main_wrap = !contains_top_level_main(&executable_code);
        Some(Doctest {
            lang: self.lang,
            fence_attributes: self.fence_attributes,
            display_code,
            executable_code,
            implicit_main_wrap,
            source: None,
            ordinal,
        })
    }
}

fn split_hidden_lines(body: &str) -> (String, String) {
    let mut display = String::new();
    let mut executable = String::new();
    for line in body.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("# ") {
            let indent_len = line.len() - trimmed.len();
            executable.push_str(&line[..indent_len]);
            executable.push_str(rest);
            executable.push('\n');
            continue;
        }
        if trimmed == "#" {
            executable.push('\n');
            continue;
        }
        if let Some(rest) = trimmed.strip_prefix("##") {
            let indent_len = line.len() - trimmed.len();
            display.push_str(&line[..indent_len]);
            display.push('#');
            display.push_str(rest);
            display.push('\n');
            executable.push_str(&line[..indent_len]);
            executable.push('#');
            executable.push_str(rest);
            executable.push('\n');
            continue;
        }
        display.push_str(line);
        display.push('\n');
        executable.push_str(line);
        executable.push('\n');
    }
    (display, executable)
}

fn contains_top_level_main(code: &str) -> bool {
    let mut depth: i32 = 0;
    for line in code.lines() {
        let trimmed = line.trim_start();
        if depth == 0 && (trimmed.starts_with("fn main(") || trimmed.starts_with("fn main ")) {
            return true;
        }
        for ch in line.chars() {
            match ch {
                '{' => depth += 1,
                '}' => depth -= 1,
                _ => {}
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_rust_fences() {
        let docs = "Example\n\n```\nlet x = 1;\n```\n";
        let doctests = extract_doctests(docs);
        assert_eq!(doctests.len(), 1);
        assert!(doctests[0].display_code.contains("let x = 1;"));
    }

    #[test]
    fn skips_text_fences() {
        let docs = "```text\nnot rust\n```\n";
        assert!(extract_doctests(docs).is_empty());
    }

    #[test]
    fn captures_fence_attributes() {
        let docs = "```rust,no_run,should_panic\nlet x = 1;\n```\n";
        let doctests = extract_doctests(docs);
        assert_eq!(doctests[0].fence_attributes, vec!["no_run", "should_panic"]);
    }

    #[test]
    fn strips_hidden_lines_from_display() {
        let docs = "```\n# use foo::Bar;\nlet x = Bar::new();\n```\n";
        let doctests = extract_doctests(docs);
        assert!(!doctests[0].display_code.contains("# use foo::Bar"));
        assert!(doctests[0].display_code.contains("let x = Bar::new();"));
        assert!(doctests[0].executable_code.contains("use foo::Bar;"));
    }

    #[test]
    fn detects_explicit_main() {
        let docs = "```\nfn main() {\n    let _ = 1;\n}\n```\n";
        let doctests = extract_doctests(docs);
        assert!(!doctests[0].implicit_main_wrap);
    }

    #[test]
    fn detects_implicit_main() {
        let docs = "```\nlet x = 1;\nassert_eq!(x, 1);\n```\n";
        let doctests = extract_doctests(docs);
        assert!(doctests[0].implicit_main_wrap);
    }
}
