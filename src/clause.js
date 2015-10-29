var h = require("./helpers");

var clause = {};

clause.TYPES = [
	'where',
	'order',
	'paginate'
];

// define clause type classes
h.each(clause.TYPES, function(type) {
	var className = type.charAt(0).toUpperCase() + type.substr(1);

	clause[className] = function(compare) {
		h.extend(this, compare);
	};

	clause[className].type = type;
});

module.exports = clause;
