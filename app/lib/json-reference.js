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
      throw new ReferenceError("Couldn't evaluate JSON reference '"+ref+"': Couldn't find key "+section);
    }
  });
  return current;
}

module.exports = {
  jsonSearch: jsonSearch,
};
