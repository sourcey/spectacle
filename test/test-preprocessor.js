var chai = require("chai");
var should = chai.should();

var preprocessor = require("../app/lib/preprocessor");

var minimal = require("./minimal").minimal;

describe("preprocessor", function() {

  var spec = null;
  var processed = null;

  beforeEach(function() {
    spec = Object.assign({}, minimal);
    processed = preprocessor({
      specFile: __dirname + "/spec.json"
    }, spec);
  });

  describe("with minimal spec", function() {

    it("should retain initial values", function() {
      Object.assign({}, processed, minimal).should.deep.equal(processed);
    });

    it("should add 'tags'", function() {
      processed.should.have.property("tags");
      processed.tags.should.deep.equal([]);
    });

    it("should add 'showTagSummary'", function() {
      processed.should.have.property("showTagSummary", false);
    });

  });

});
