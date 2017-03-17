/**
 * Methods that can recognize the current "context" of a `$ref` reference.
 * This allows sections to be included differently; for instance a reference for `/responses/500/schema` could be
 * inserted into the global definitions, instead of being included multiple times in the document.
*/


/**
 * Recognizes 'schema' elements in 'responses' to be definitions.
*/
function responseSchemaDefinition(ref) {
  var parts = ref.split("/");
  return parts.indexOf("schema") === parts.length - 2 && parts.indexOf("responses") === parts.length - 4;
}

/**
 * Recognizes different types of definitions that could be moved to the global 'definitions'.
*/
function definition(ref) {
  return responseSchemaDefinition(ref);
}

module.exports = {
  responseSchemaDefinition: responseSchemaDefinition,
  definition: definition,
};
