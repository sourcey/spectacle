exports.LocalRefError = LocalRefError = function LocalRefError(message) {
  this.name = "LocalRefError";
  this.message = message || "Local Reference Error";
  this.stack = (new Error()).stack;
}

LocalRefError.prototype = Object.create(Error.prototype)
LocalRefError.prototype.constructor = LocalRefError;

/**
 * Used when the spec tree is improperly walked, and gets into an unrecoverable spot.
*/
exports.TreeWalkError = TreeWalkError = function TreeWalkError(message) {
  this.name = "TreeWalkError";
  this.message = message || "Error Walking Tree";
  this.stack = (new Error()).stack;
}

TreeWalkError.prototype = Object.create(Error.prototype)
TreeWalkError.prototype.constructor = TreeWalkError;
