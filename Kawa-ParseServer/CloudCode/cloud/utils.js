var _ = require('underscore');

module.exports.isNew = function(object){
	var createdAt = object.get("createdAt");
	var updatedAt = object.get("updatedAt");
	return (createdAt.getTime() === updatedAt.getTime());
}

module.exports.nFormatter = function(num) {
	if (num >= 1000000000) {
		return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
	}
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
	}
	return num;
}