//! Basic fixture crate used by the sourcey-rustdoc adapter tests.
//!
//! Exercises the minimum surface Phase 1 needs: a free function, a struct
//! with an inherent impl, a trait with one method, a trait impl on the
//! struct, and two doctests (one with hidden setup lines and an explicit
//! `main` wrapper, one plain).

/// Returns a greeting for the given name.
///
/// # Examples
///
/// ```
/// use basic::greet;
///
/// assert_eq!(greet("Ada"), "hello, Ada");
/// ```
pub fn greet(name: &str) -> String {
    format!("hello, {}", name)
}

/// A widget that can be published.
///
/// # Examples
///
/// ```
/// # use basic::Widget;
/// # fn main() {
/// let mut w = Widget::new("hero");
/// w.publish();
/// assert!(w.is_published());
/// # }
/// ```
pub struct Widget {
    name: String,
    published: bool,
}

impl Widget {
    /// Construct a new widget with the given name.
    ///
    /// # Examples
    ///
    /// ```
    /// use basic::Widget;
    ///
    /// let w = Widget::new("alpha");
    /// assert!(!w.is_published());
    /// ```
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            published: false,
        }
    }

    /// Mark the widget as published.
    ///
    /// # Examples
    ///
    /// ```
    /// use basic::Widget;
    ///
    /// let mut w = Widget::new("beta");
    /// w.publish();
    /// assert!(w.is_published());
    /// ```
    pub fn publish(&mut self) {
        self.published = true;
    }

    /// Returns true if `publish` has been called.
    pub fn is_published(&self) -> bool {
        self.published
    }
}

/// Anything that can introduce itself in one short sentence.
///
/// # Examples
///
/// ```no_run
/// use basic::{Introducer, Widget};
///
/// let w = Widget::new("gamma");
/// println!("{}", w.introduce());
/// ```
pub trait Introducer {
    /// Produce the introduction line.
    fn introduce(&self) -> String;
}

impl Introducer for Widget {
    fn introduce(&self) -> String {
        format!("widget {}", self.name)
    }
}

/// Status that a widget can be in.
#[non_exhaustive]
pub enum Status {
    /// Created but not yet published.
    Draft,
    /// Visible to the public.
    Published,
    /// Removed from active view.
    Archived,
}

/// Greeting macro: expands to a hello string.
///
/// # Examples
///
/// ```ignore
/// let s = basic::hello!("world");
/// assert_eq!(s, "hello, world");
/// ```
#[macro_export]
macro_rules! hello {
    ($name:expr) => {
        format!("hello, {}", $name)
    };
}

/// An old wrapper that has been replaced by [`Widget`].
///
/// # Examples
///
/// ```should_panic
/// // Forces a panic at runtime for documentation purposes.
/// let _w: basic::LegacyWidget = panic!("legacy");
/// ```
#[deprecated(since = "0.0.2", note = "use Widget instead")]
pub struct LegacyWidget;

/// Inspect a widget's display string.
///
/// # Examples
///
/// ```compile_fail
/// let _w = basic::Widget::new("delta");
/// let _d: i32 = _w; // type mismatch on purpose
/// ```
#[must_use = "the description is only useful if you do something with it"]
pub fn describe(w: &Widget) -> String {
    format!("widget '{}' (published={})", w.name, w.published)
}

/// A module gated behind the `extra` Cargo feature. Demonstrates `#[cfg(feature)]`.
#[cfg(feature = "extra")]
pub mod extras {
    //! Extra utilities only available under `--features extra`.

    /// Returns the literal string `"extra"`.
    pub fn marker() -> &'static str {
        "extra"
    }
}

#[doc(hidden)]
#[allow(dead_code)]
pub fn internal_helper() -> u32 {
    42
}
