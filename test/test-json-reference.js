var chai = require("chai");
var should = chai.should();

var json = require("../app/lib/json-reference");

describe("json-reference.js", function() {

  describe("jsonSearch()", function() {

    it("should preform basic searches", function() {
      json.jsonSearch("a", {a: 1, b: 2}).should.equal(1);
    });

    it("should resolve nested objects", function() {
      json.jsonSearch("a/b", {a: {b: 1, c: 2}}).should.equal(1);
    });

    describe("Requesting Top-Level", function() {

      var obj = {a: 1, b: 2};

      ["", "#", "#/"].forEach(function(ref) {
        it("should work when given '"+ref+"'", function() {
          json.jsonSearch(ref, obj).should.deep.equal(obj);
        });
      });

    });

    describe("Ignores Prefix", function() {

      it("should search without a prefix", function() {
        json.jsonSearch("a", {a: 1, b: 2}).should.equal(1);
      });

      it("should search with a leading '/'", function() {
        json.jsonSearch("/a", {a: 1, b: 2}).should.equal(1);
      });

      it("should search with a leading '#/'", function() {
        json.jsonSearch("#/a", {a: 1, b: 2}).should.equal(1);
      });

    });

  });

});
