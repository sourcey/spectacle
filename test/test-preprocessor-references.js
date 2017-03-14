var chai = require("chai");
var should = chai.should();

var preprocessor = require("../app/lib/preprocessor");

var minimal = require("./minimal").minimal;

describe("preprocessor referencing", function() {

  var spec = null;
  var processed = null;

  beforeEach(function() {
    spec = Object.assign({}, minimal);
  });

  describe("local documents", function() {

    describe("for paths", function() {

      beforeEach(function() {
        spec = Object.assign({}, spec, {
          paths: {
            "/": {
              "$ref": "./fixtures/basic-path.yaml",
            },
          },
        });
        processed = preprocessor({}, spec);
      });

      it("should include the path section", function() {
        processed.paths.should.have.key("/");
        processed.paths["/"].should.be.an.object;
      });

      it.skip("should include the imported paths", function() {
        processed.paths["/"].should.have.key("get");
        processed.paths["/"].should.have.key("post");
      });

      it.skip("should include the reference path ('/' path)", function() {
        processed.paths["/"].should.have.property("x-external", "./fixtures/basic-path.yaml");
      });

      it.skip("should include the reference path ('get', 'post')", function() {
        processed.paths["/"].get.should.have.property("x-external", "./fixtures/basic-path.yaml#get");
        processed.paths["/"].post.should.have.property("x-external", "./fixtures/basic-path.yaml#post");
      });

    });

    describe("for schema", function() {

      var response;

      beforeEach(function() {
        spec = Object.assign({}, spec, { paths: { "/": { get: {
          description: "Returns the current user.",
          produces: ["application/json"],
          responses: { "200": {
            description: "Current user",
            schema: {
              "$ref": "fixtures/User.yaml"
            }
          }
        }}}}});
        processed = preprocessor({}, spec);
        response = processed.paths["/"].get.responses["200"];
      });

      it("should include path", function() {
        processed.paths.should.have.property("/");
        processed.paths["/"].should.have.property("get");
        processed.paths["/"].get.should.have.property("responses");
        processed.paths["/"].get.responses.should.have.property("200");
        processed.paths["/"].get.responses["200"].should.have.property("schema");
      });

      it.skip("should update '$ref'", function() {
        response.schema.should.have.key("$ref", "#/definitions/.%2Ffixtures%2FUser.yaml");
      });

      it.skip("should include the definition globally", function() {
        processed.definitions.should.be.an.object;
        processed.definitions.should.have.property("./fixtures/User.yaml");
        var schema = processed.definitions["./fixtures/User.yaml"];
        schema.should.have.property("x-external", "./fixtures/User.yaml");
        schema.should.have.property("type", "object");
        schema.should.have.property("properties");
        schema.properties.should.have.property("name");
        schema.properties.name.should.deep.equal({ type: "string" });
      });

    });

  });

});
