var chai = require("chai");
var should = chai.should();

var urls = require("../app/lib/urls");

describe("urls.js", function() {

  describe("absoluteURL()", function() {

    describe("success cases", function() {
      [
        "http://example.com",
        "http://www.example.com",
        "http://example.com/",
        "https://example.com",
        "sftp://example.com",
        "http://example.com/test/",
      ].forEach(function(str) {
        it("finds "+str, function() {
          urls.absoluteURL(str).should.equal(true);
        });
      });
    });

    describe("failure cases", function() {
      [
        "test",
        "example.com",
        "www.example.com",
        "example.com/",
        "example.com/test/",
        "/test/",
      ].forEach(function(str) {
        it("rejects "+str, function() {
          urls.absoluteURL(str).should.equal(false);
        });
      });
    });

  });

  describe("urlBasename()", function() {

    var replacements = {
      "http://example.com/": "http://example.com/",
      "http://example.com": "http://example.com",
      "http://example.com/test/": "http://example.com/",
      "sftp://example.com/": "sftp://example.com/",
      "http://www.example.com/": "http://www.example.com/",
    }
    for(var from in replacements) {
      var to = replacements[from];
      (function(from, to) {
        it("converts "+from+" to "+to, function() {
          urls.urlBasename(from).should.equal(to);
        });
      })(from, to);
    }

  });

  describe("join()", function() {

    [
      {from: ["/home/", "foo"], to: "/home/foo"},
      {from: ["/home/", "foo/"], to: "/home/foo/"},
      {from: ["/home/", "foo", "bar"], to: "/home/foo/bar"},
      {from: ["/home/foo/", "bar"], to: "/home/foo/bar"},
      {from: ["/home/", "http://example.com"], to: "http://example.com/"},
      {from: ["http://example.com/foo/", "/bar/"], to: "http://example.com/bar/"},
      {from: ["http://example.com/foo/", "bar"], to: "http://example.com/foo/bar"},
      {from: ["http://example.com/foo/", "../bar/"], to: "http://example.com/bar/"},
      {from: ["/home/", "foo", "../bar"], to: "/home/bar"},
    ].forEach(function(data) {
      it("(\""+data.from.join("\", \"")+"\") becomes "+data.to, function() {
        urls.join.bind(urls, data.from)().should.equal(data.to);
      });
    });

  });

  describe("relative()", function() {

    var situations = {
      "Joining Local Paths": [
        {from: "/home/foo/bar/", to: "/home/baz/foobar/", out: "../../baz/foobar"},
        {from: "foo/bar/", to: "baz/foobar/", out: "../../baz/foobar"},
        {from: "file.json", to: "baz/foobar/", out: "../baz/foobar"},
      ],
      "Joining URLs": [
        {from: "http://example.com/foo/bar/", to: "http://example.com/baz/foobar/", out: "../../baz/foobar"},
        {from: "http://example.com/foo/", to: "http://example.com/bar/", out: "../bar"},
      ],
      "File System to URL": [
        {from: "/home/", to: "http://example.com", out: "http://example.com"},
        {from: "./", to: "http://example.com", out: "http://example.com"},
        {from: "./file.json", to: "http://example.com", out: "http://example.com"},
        {from: "file.json", to: "sftp://example.com", out: "sftp://example.com"},
      ],
      "Given Different URLs": [
        {from: "http://example.com/", to: "http://one.example.com/", out: "http://one.example.com/"},
      ],
    };

    for(var situation in situations) {
      var tests = situations[situation];
      describe(situation, (function(situation, tests) {
        return function() {
          tests.forEach(function(details) {
            it("relative(\""+details.from+"\", \""+details.to+"\") should produce "+details.out, function() {
              urls.relative(details.from, details.to).should.equal(details.out);
            });
          });
        };
      })(situation, tests));
    }

  });

});
