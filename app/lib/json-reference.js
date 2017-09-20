var path = require("path")

/**
 * Applies a single JSON reference lookup to an object.  Does not resolve references in the returned document.
 * @param {string} ref the JSON reference to search for - e.g. `"#/foo/bar"`
 * @param {object} obj the object to find the referenced field in - e.g. `{"foo": {"bar": 5}}`
 * @throws {ReferenceError} if the reference can't be followed.
 * @return {*} The referenced element in the given object.
*/
function jsonSearch(ref, obj) {
  var current = obj;
  refs = ref.replace(/^#?\/?/, "").split("/").forEach(function(section) {
    if(section.trim().length < 1) {
      return;
    }
    if(current[section]) {
      current = current[section];
    }
    else {
      throw new ReferenceError("Couldn't evaluate JSON reference '"+ref+"': Couldn't find key "+section)
    }
  })
  return current;
}

/**
 * Resolve all local JSON references in a single document.  Resolves absolute references (`#/test/`) and relative paths
 * (`../test`), but does not change any references to remote files.
 * Mutates the given object with resolved references.
 * @param {Object} doc the root JSON document that references are being resolved in.
 * @param {Object} obj a section of the JSON document that is being evaluated.
 * @param {String} ref the path to the current object inside the JSON document, as a JSON reference.
*/
function resolveLocal(doc, obj, ref) {
  if(typeof obj !== "object") {
    throw new TypeError("resolveLocal() must be given an object.  Given "+typeof obj+" ("+obj+")")
  }
  for(var k in obj) {
    var val = obj[k];
    if(typeof val !== "object" || val === null) { continue; }
    if(val.$ref) {
      var $ref = val.$ref;
      if($ref.indexOf("./") === 0 || $ref.indexOf("../") === 0) {
        $ref = path.join(ref, k, $ref)
      }
      if($ref.indexOf("#/") === 0) {
        Object.assign(val, jsonSearch($ref, doc))
        delete val.$ref;
      }
    }
    else {
      resolveLocal(doc, val, path.join(ref, k))
    }
  }
}

module.exports = {
  jsonSearch: jsonSearch,
  resolveLocal: resolveLocal,
};
