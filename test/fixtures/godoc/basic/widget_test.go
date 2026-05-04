package basic_test

import (
	"fmt"

	"example.com/basic"
)

// ExampleNew shows the most common usage of basic.New.
func ExampleNew() {
	w := basic.New("hero-banner")
	fmt.Println(w.Name)
	// Output: hero-banner
}

func ExampleWidget_Publish() {
	w := basic.New("cta")
	w.Publish()
	fmt.Println(w.Status == basic.StatusPublished)
	// Output: true
}
