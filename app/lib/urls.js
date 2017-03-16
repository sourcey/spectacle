var path = require("path");

/**
 * Utilities for managing both URL and file paths.
*/

/**
 * Determines if the given string is an absolute URL.
 * @param {string} str the string to check.
 * @return {boolean} `true` if the string is a URL.
*/
function absoluteURL(str) {
  return /^.*\:\/\/[^\/]+\/?/.test(str);
}

/**
 * Returns the base-part of a URL - returns `"http://example.com/"` when given `"http://example.com/test/"`.
 * @param {string} url an absolute URL to split
 * @return {string} the base-part of the given URL
*/
function urlBasename(url) {
  return /^(.*\:\/\/[^\/]+\/?)/.exec(url)[1];
}

/**
 * `path.join()` that works with either file paths or URLs.
 * @param {...string} paths Paths to join, left to right
 * @return {string} the joined path.
*/
function join(paths) {
  args = [].concat.apply([], arguments);
  return args.slice(1).reduce(function(url, val) {
    if(absoluteURL(url) || absoluteURL(val)) {
      return require("url").resolve(url, val);
    }
    return path.join(url, val);
  }, args[0]);
}

module.exports = {
  absoluteURL: absoluteURL,
  urlBasename: urlBasename,
  join: join,
}
