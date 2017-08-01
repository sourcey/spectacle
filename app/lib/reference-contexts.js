/**
 * Methods that can recognize the current "context" of a `$ref` reference.
 * This allows sections to be included differently; for instance a reference for `/responses/500/schema` could be
 * inserted into the global definitions, instead of being included multiple times in the document.
*/

/**
 * Recognizes 'schema' elements in 'responses' to be definitions.
 * @param {String} ref the JSON reference
 * @return {Boolean} `true` if the current path is to a response schema.
*/
function responseSchemaDefinition(ref) {
  var parts = ref.split("/")
  return parts.length > 4 && parts.indexOf("schema") === parts.length - 2 &&
    parts.indexOf("responses") === parts.length - 4;
}

/**
 * Recognize items in property arrays.
 * @param {String} ref the JSON reference.
 * @return {Boolean} `true` if the current path is to an array inside a property.
*/
function propertyArrayDefinition(ref) {
  var parts = ref.split("/")
  return parts.length > 2 && parts.lastIndexOf("items") === parts.length - 2;
}

/**
 * Recognizes different types of definitions that could be moved to the global 'definitions'.
 * @param {String} ref the JSON reference
 * @return {Boolean} `true` if the current path is an OpenAPI `definition`.
*/
function definition(ref) {
  return responseSchemaDefinition(ref) || propertyArrayDefinition(ref)
}

/**
 * Recognize URL paths.
 * @param {String} ref the JSON reference.
 * @return {Boolean} `true` if the current path is an OpenAPI `path`.
*/
function path(ref) {
  var parts = ref.split("/")
  return parts.length === 3 && parts.lastIndexOf("paths") === parts.length - 3 && parts[1].length > 0;
}

module.exports = {
  responseSchemaDefinition: responseSchemaDefinition,
  propertyArrayDefinition: propertyArrayDefinition,
  definition: definition,
  path: path,
};
