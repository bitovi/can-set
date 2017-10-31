var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var clause = {};


/**
 * Exports a clause constructor functions like:
 *
 * new clause.Where()
 *
 * This is so we can tell what type of clause some properties are for.
 * @hide
 */
module.exports = clause;

clause.TYPES = [
	'where',
	'order',
	'paginate',
	'id'
];

// define clause type classes
each(clause.TYPES, function(type) {
	var className = type.charAt(0).toUpperCase()+type.substr(1);

	clause[className] = function(compare) {
		assign(this, compare);
	};

	clause[className].type = type;
});
