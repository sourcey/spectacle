// Package basic exercises every Go documentation surface the introspector
// must capture: package comments, exported consts, vars, funcs, struct and
// interface types, methods, fields with tags, and constants grouped under a
// type.
package basic

import "errors"

// DefaultName is the placeholder name used when none is supplied.
const DefaultName = "widget"

// Status describes a Widget's current lifecycle state.
type Status int

// Widget lifecycle states. The const block is grouped under [Status] so
// godoc renders them under the type.
const (
	// StatusDraft means the widget has not been finalised.
	StatusDraft Status = iota
	// StatusPublished means the widget is visible to users.
	StatusPublished
	// StatusArchived means the widget has been retired.
	StatusArchived
)

// ErrNotFound is returned when a widget cannot be located.
var ErrNotFound = errors.New("widget not found")

// Widget represents a configurable UI element.
type Widget struct {
	// Name uniquely identifies the widget.
	Name string `json:"name"`
	// Status tracks the lifecycle state.
	Status Status `json:"status"`
	// internalID is unexported and only visible with --include-unexported.
	internalID string
}

// Greeter is implemented by anything that can greet a name.
type Greeter interface {
	// Greet returns a salutation for the given name.
	Greet(name string) string
}

// New constructs a Widget with the given name and a default Status of
// [StatusDraft].
func New(name string) *Widget {
	if name == "" {
		name = DefaultName
	}
	return &Widget{Name: name, Status: StatusDraft}
}

// Publish moves the widget into the published state.
func (w *Widget) Publish() {
	w.Status = StatusPublished
}

// Archive moves the widget into the archived state and reports whether the
// status changed.
func (w *Widget) Archive() bool {
	if w.Status == StatusArchived {
		return false
	}
	w.Status = StatusArchived
	return true
}
