var chai = require("chai");
var should = chai.should();

var res = require("../app/lib/resolve-references");
var minimal = require("./minimal");

function quoted(str) {
  return '"' + str + '"';
}

var networkDescribe = process.env.OFFLINE ? describe.skip : describe;
var networkIt = process.env.OFFLINE ? it.skip : it;

/**
 * Using a simple Gist (served via RawGit) for many of the remote spec tests.
 * The Gist can be cloned to another account if large changes to the existing documents are needed,
 * or a different Gist/URL could be used for additional tests that aren't possible with the existing files.
 * See https://gist.github.com/CodeLenny/5a7a82357a07b09f8d6d2b05a764f2fe
*/
var gist = "CodeLenny/5a7a82357a07b09f8d6d2b05a764f2fe";
var commit = "386e93ad1f26c1e33c1d77b73bda0cc3a56657f4";
var rawgit = "https://cdn.rawgit.com/"+gist+"/raw/"+commit+"/";

describe("resolve-references.js", function() {

  describe("localReference()", function() {

    describe("Recognizes Local References", function() {

      ["#", "#/", "#/definitions/", "#/definitions/test"].forEach(function(ref) {
        it("should recognize "+quoted(ref), function() {
          res.localReference(ref).should.equal(true);
        });
      });

    });

    describe("Rejects Non-Local References", function() {

      [1, "", "test.json", "/home/foo/bar", "foo/bar", "http://example.com", "http://example.com/foo/bar"]
        .forEach(function(ref) {
          it("should not recognize "+quoted(ref), function() {
            res.localReference(ref).should.equal(false);
          });
        });

    });

  });

  describe("fetchReference()", function() {

    describe("Processes Files", function() {

      it("should read JSON files", function() {
        var out = res.fetchReference(__dirname+"/fixtures/document.json");
        out.should.be.an('object');
        out.should.have.property("foo", 1);
      });

      it("should read YAML files", function() {
        var out = res.fetchReference(__dirname+"/fixtures/document.yml");
        out.should.be.an('object');
        out.should.have.property("foo", 1);
      });

      it("should return a requested key", function() {
        var out = res.fetchReference(__dirname+"/fixtures/document.json#foo");
        out.should.equal(1);
      });

    });

    networkDescribe("Fetches Remote Documents", function() {

      function remote(type, url) {
        it("can fetch "+type, function() {
          var out = res.fetchReference(url);
          out.should.be.an('object');
          out.should.have.property("foo", 1);
        });
      }

      remote("JSON", rawgit+"simple.json");
      remote("YAML", rawgit+"simple.yml");

    });

  });

  describe("replaceReference()", function() {

    /**
     * A few unit tests that only cover the functionality in 'replaceReference'.
     * The functions that 'replaceReference' calls are shimmed to prevent side-effects.
    */
    describe("Unit Tests", function() {

      var top = null;
      var cwd = null;
      var _fetchReference = res.fetchReference;
      var _replaceRefs = res.replaceRefs;

      beforeEach(function() {
        cwd = __dirname+"/fixtures";
        var file = cwd + "/document.json";
        top = Object.create(require(file));
        top["x-spec-path"] = file;
        res.fetchReference = function() { return {}; };
        res.replaceRefs = function() {};
      });

      afterEach(function() {
        res.fetchReference = _fetchReference;
        res.replaceRefs = _replaceRefs;
      });

      it("should call fetchReference()", function() {
        var called = false;
        res.fetchReference = function(ref) {
          ref.should.equal(__dirname + "/fixtures/other-document.json");
          called = true;
          return {};
        };
        top.ref = { "$ref": "other-document.json" };
        res.replaceReference(cwd, top, top.ref, "");
        called.should.equal(true);
      });

      it("should set 'x-external'", function() {
        top.ref = { "$ref": "other-document.json" };
        res.replaceReference(cwd, top, top.ref, "");
        top.ref["x-external"].should.equal("other-document.json");
      });

      it("should remove '$ref'", function() {
        top.ref = { "$ref": "other-document.json" };
        res.replaceReference(cwd, top, top.ref, "");
        top.ref.should.not.have.property("$ref");
      });

      it("should call replaceRefs()", function() {
        var called = false;
        res.replaceRefs = function(_cwd, _top, _obj, _context) {
          _cwd.should.equal(cwd);
          _top.should.equal(top);
          _obj.should.deep.equal({"x-external": "other-document.json"});
          _context.should.equal("");
          called = true;
        };
        top.ref = { "$ref": "other-document.json" };
        res.replaceReference(cwd, top, top.ref, "");
        called.should.equal(true);
      });

    });

    describe("Usage", function() {

      var top = null;
      var cwd = __dirname;

      it("should insert contents from a local file", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.info = {"$ref": "fixtures/document.json"};
        res.replaceReference(cwd, top, top.info, "info");
        top.info.should.have.property("foo", 1);
        top.info.should.have.property("x-external", "fixtures/document.json");
      });

      networkIt("should insert contents from a remote file", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.info = {"$ref": rawgit+"document.json"};
        res.replaceReference(cwd, top, top.info, "info");
        top.info.should.have.property("foo", 1);
        top.info.should.have.property("bar");
        top.info.bar.should.deep.equal({baz: 5});
        top.info.should.have.property("x-external", rawgit+"document.json");
      });

      networkIt("should insert contents from a remote YAML file", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.info = {"$ref": rawgit+"document.yml"};
        res.replaceReference(cwd, top, top.info, "info");
        top.info.should.have.property("foo", 1);
        top.info.should.have.property("bar");
        top.info.bar.should.deep.equal({baz: 5});
        top.info.should.have.property("x-external", rawgit+"document.yml");
      });

      networkIt("should resolve nested references", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.info = {"$ref": rawgit+"reference.json"};
        res.replaceReference(cwd, top, top.info, "info");
        top.info.should.not.have.property("$ref");
        top.info.should.have.property("foo", 1);
      });

      it.skip("should resolve local references in referenced files", function() {
        should.fail();
      });

      networkIt("should resolve deep references", function() {
        this.timeout(4000);
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.info = {"$ref": rawgit+"deep-reference.json"};
        res.replaceReference(cwd, top, top.info, "info");
        top.info.should.not.have.property("$ref");
        top.info.should.have.property("document");
        top.info.document.should.be.an('object');
        top.info.document.should.have.property("foo", 1);
      });

      it("inserts definitions in the global object", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.paths = { "/": { get: {
          description: "Returns the current user.",
          responses: { "200": {
            description: "Current user",
            schema: {
              "$ref": "fixtures/User.yml"
            }
          }
        }}}};
        res.replaceReference(cwd, top, top.paths["/"].get.responses["200"].schema, "paths///get/responses/200/schema/");
        top.should.have.property("definitions");
        top.definitions.should.have.property("fixtures/User.yml");
      });

      it("adds tags when given a remote path", function() {
        top = Object.create(minimal);
        top.paths = {
          "/": { "$ref": "fixtures/basic-path.yaml" },
        };
        top["x-spec-path"] = cwd + "/test.json";
        res.replaceReference(cwd, top, top.paths["/"], "paths/%2F/");
        top.should.have.property("tags");
        top.tags.should.be.an('array');
        top.tags.length.should.equal(1);
        var tag = top.tags[0];
        tag.should.have.property("name", "default");
        tag.should.have.property("operations");
        tag.operations.should.be.an('array');
        tag.operations.should.include(top.paths["/"].get);
        tag.operations.should.include(top.paths["/"].post);
      });

    });

  });

  describe("replaceRefs()", function() {

    describe("Unit Tests", function() {

      it.skip("should be tested", function() {
        should.fail();
      });

    });

    describe("Usage", function() {

      var top = null;
      var cwd = __dirname;

      networkIt("resolves deep references", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.info = {"$ref": rawgit+"deep-reference.json"};
        res.replaceRefs(cwd, top, top, "");
        top.info.should.not.have.property("$ref");
        top.info.should.have.property("document");
        top.info.document.should.be.an('object');
        top.info.document.should.have.property("foo", 1);
      });

      it("inserts definitions into the global object", function() {
        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.paths = { "/": { get: {
          description: "Returns the current user.",
          responses: { "200": {
            description: "Current user",
            schema: {
              "$ref": "fixtures/User.yml"
            }
          }
        }}}};
        res.replaceRefs(cwd, top, top, "");
        top.should.have.property("definitions");
        top.definitions.should.have.property("fixtures/User.yml");
      });

      it("should not error on null ref", function() {

        top = Object.create(minimal);
        top["x-spec-path"] = cwd + "/test.json";
        top.paths = { "/": { get: {
          description: "",
          responses: { "200": {
            description: "",
            schema: {
              "$ref": "fixtures/NullExample.yml"
            }
          }
          }}}};

        res.replaceRefs(cwd, top, top, "");
        top.should.have.property("definitions");
        top.definitions.should.have.property("fixtures/NullExample.yml");
      });

    });

  });

});
