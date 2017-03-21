var fs = require("fs");
var path = require("path");
var yaml = require("js-yaml");
var request = require("request-sync");
var pathUtils = require("./urls");
var contexts = require("./reference-contexts");
var resolveLocal = require("./json-reference").resolveLocal;
var jsonSearch = require("./json-reference").jsonSearch;
var LocalRefError = require("./errors").LocalRefError;
var TreeWalkError = require("./errors").TreeWalkError;

/**
 * Utilities for the preprocessor that can resolve external references.
*/

/**
 * Determines if a reference is relative to the current file.
 * @param {string} ref The file path or URL referenced.
 * @return {boolean} `true` if the reference points to the current file.
*/
function localReference(ref) {
  return (typeof ref.trim === "function" && ref.trim().indexOf("#") === 0) ||
         (typeof ref.indexOf === "function" && ref.indexOf("#") === 0);
}

/**
 * Fetches a section of an external file.
 * @param {string} ref The file path or URL referenced.
 * @return {object} The section requested.
 * @throws {LocalRefError} if 'ref' points to a local definition (starts with `#`)
 * @todo Improve YAML detection
 * @todo Cache file/HTTP reads for preformance.
 * @todo If fetched reference itself references another file (as the entire output), return that one instead.
 * @todo Test failure
*/
function fetchReference(ref) {

  if(localReference(ref)) {
    throw new LocalRefError("fetchReference('"+ref+"') given a reference to the current file.");
  }

  var file = ref.split("#", 1)[0];
  var path = ref.substr(file.length + 1);

  var src = null;

  if(pathUtils.absoluteURL(file)) {
    src = request(file).body;
  }
  else {
    src = fs.readFileSync(file, "utf8");
  }
  if(file.indexOf(".yml") > -1 || file.indexOf(".yaml") > -1) {
    src = yaml.safeLoad(src);
  }
  else {
    src = JSON.parse(src);
  }

  if(path.length > 0) {
    return jsonSearch(path, src);
  }
  else {
    return src;
  }
}

/**
 * Replace external references in a specification with the contents.  Mutates the given objects.
 * Mutually recursive with `replaceRefs`.
 * @param {string} cwd The path to the file containing a reference.
 * @param {object} top The top-level specification file.
 * @param {object} obj The object referencing an external file.
 * @param {string} context The current reference path, e.g. `"#/paths/%2F/"`
 * @todo test failure
*/
function replaceReference(cwd, top, obj, context) {
  var ref = pathUtils.join(cwd, obj.$ref);
  var external = pathUtils.relative(path.dirname(top["x-spec-path"]), ref);
  var referenced = module.exports.fetchReference(ref);
  resolveLocal(referenced, referenced, "#/");
  referenced["x-external"] = external;
  if(typeof referenced === "object") {
    module.exports.replaceRefs(path.dirname(ref), top, referenced, context);
  }
  if(contexts.definition(context)) {
    if(!top.definitions) { top.definitions = {}; }
    if(!top.definitions[external]) { top.definitions[external] = referenced; }
    Object.assign(obj, { "$ref": "#/definitions/"+external.replace("/", "%2F") });
  }
  else {
    Object.assign(obj, referenced);
    delete obj.$ref;
  }
}

/**
 * Walk an given Swagger tree, and replace all JSON references in the form of `{"$ref": "<path>"}` with the proper
 * contents.
 * Recursive, as well as being mutually recursive with `replaceReference`.
 * @param {string} cwd The path of the current file
 * @param {object} top The top-level specification file.
 * @param {object} obj The Swagger tree to evaluate.
 * @param {string} context The current reference path, e.g. `"#/paths/%2F/"`
 * @throws {TreeWalkError} if `obj` itself is a reference.
 * @todo Test failure
 * @todo Test edge cases (remote relative ref, etc.)
*/
function replaceRefs(cwd, top, obj, context) {

  if(typeof cwd !== "string" || cwd.length < 1) {
    throw new Error("replaceRefs must be given a 'cwd'.  Given '"+cwd+"'");
  }
  if(typeof obj !== "object") {
    console.warn("[WARN] replaceRefs() must be given an object for 'obj'.  Given "+typeof obj+" ("+obj+")");
    return; }

  if(obj.$ref) {
    throw new TreeWalkError("Walked too deep in the tree looking for references.  Can't resolve reference " +
      obj.$ref + " in "+cwd+".");
  }

  for(var k in obj) {
    var val = obj[k];
    if(typeof val !== "object") { continue; }

    if(val.$ref) {

      if(localReference(val.$ref)) {
        if((cwd === top["x-spec-path"]) || (cwd === path.dirname(top["x-spec-path"]))) { continue; }
        throw new Error(
          "Can't deal with internal references in external files yet.  Got: '"+val.$ref+"'.");
      }

      try {
        module.exports.replaceReference(cwd, top, val, context + k + "/");
      }
      catch (e) {
        console.error("Couldn't replace reference to '"+val.$ref+"' from '"+cwd+"'.  Reference path: #/"+context);
        throw e;
      }

      continue;
    }

    replaceRefs(cwd, top, val, context + k + "/");
  }

}

module.exports = {
  localReference: localReference,
  fetchReference: fetchReference,
  replaceReference: replaceReference,
  replaceRefs: replaceRefs,
}
