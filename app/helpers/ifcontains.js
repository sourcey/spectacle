module.exports = function(array, object, options) {
	if (array && array.indexOf(object) >= 0) {
	  return options.fn(this)
	}
	return options.inverse(this)
};
