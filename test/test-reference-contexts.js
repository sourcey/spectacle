var chai = require("chai");
var should = chai.should();

var contexts = require("../app/lib/reference-contexts.js");

/**
 * Check that a context function passes one or more paths.
 * @param {String} fn the name of a context function.
 * @param {Array<String>} paths the paths to check.
*/
function success(fn, paths) {
  describe("should match", function() {
    paths.forEach(function(ref) {
      it(ref, function() {
        contexts[fn](ref).should.equal(true, "should have matched "+ref);
      });
    });
  });
}

/**
 * Check that a context function doesn't pass one or more paths.
 * @param {String} fn the name of a context function.
 * @param {Array<String>} paths the paths to check.
*/
function failure(fn, paths) {
  describe("shouldn't match", function() {
    paths.forEach(function(ref) {
      it(ref, function() {
        contexts[fn](ref).should.equal(false, "shouldn't have matched "+ref);
      });
    });
  });
}

describe("reference-contexts.js", function() {

  describe("responseSchemaDefinition()", function() {

    success("responseSchemaDefinition", [
      "paths/index.html/responses/200/schema/",
    ]);

    failure("responseSchemaDefinition", [
      "paths/index.html/schema/",
      "paths/index.html/responses/200/test/",
      "paths/index.html/responses/",
      "definitions/Pet/",
    ]);

  });

  describe("propertyArrayDefinition()", function() {

    success("propertyArrayDefinition", [
      "definitions/Pet/properties/tags/items/",
    ]);

    failure("propertyArrayDefinition", [
      "definitions/Pet/",
      "definitions/Pet/properties/",
      "definitions/Pet/properties/tags/items/$ref/",
    ]);

  });

  describe("definition()", function() {

    success("definition", [
      "paths/index.html/responses/200/schema/",
    ]);

    failure("definition", [
      "definitions/Pet/",
    ]);

  });

  describe("path()", function() {

    success("path", [
      "paths/index.html/",
      "paths/{part}/",
      "paths/{a}-{b}-{c}/",
    ]);

    failure("path", [
      "paths/index.html",
      "paths/",
      "paths",
      "paths/index.html/responses/",
    ]);

  });

});
