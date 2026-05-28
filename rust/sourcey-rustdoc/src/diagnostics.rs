use crate::spec::{Diagnostic, DiagnosticSeverity};

pub mod codes {
    pub const FORMAT_VERSION_MISMATCH: &str = "RUSTDOC_FORMAT_VERSION_MISMATCH";
    pub const INTRA_DOC_LINK_UNRESOLVED: &str = "RUSTDOC_INTRA_DOC_LINK_UNRESOLVED";
    pub const MISSING_HTML_ROOT_URL: &str = "RUSTDOC_MISSING_HTML_ROOT_URL";
    pub const CARGO_FAILED: &str = "RUSTDOC_CARGO_FAILED";
    pub const INVALID_SNAPSHOT_SCHEMA: &str = "RUSTDOC_INVALID_SNAPSHOT_SCHEMA";
}

pub fn error(code: &str, message: impl Into<String>) -> Diagnostic {
    Diagnostic {
        severity: DiagnosticSeverity::Error,
        code: code.to_string(),
        message: message.into(),
        crate_name: None,
        file: None,
        line: None,
    }
}

pub fn warning(code: &str, message: impl Into<String>) -> Diagnostic {
    Diagnostic {
        severity: DiagnosticSeverity::Warning,
        code: code.to_string(),
        message: message.into(),
        crate_name: None,
        file: None,
        line: None,
    }
}

pub fn info(code: &str, message: impl Into<String>) -> Diagnostic {
    Diagnostic {
        severity: DiagnosticSeverity::Info,
        code: code.to_string(),
        message: message.into(),
        crate_name: None,
        file: None,
        line: None,
    }
}
