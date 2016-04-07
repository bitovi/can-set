/*src/clause*/
var h = require('./helpers.js');
var clause = {};
module.exports = clause;
clause.TYPES = [
    'where',
    'order',
    'paginate',
    'id'
];
h.each(clause.TYPES, function (type) {
    var className = type.charAt(0).toUpperCase() + type.substr(1);
    clause[className] = function (compare) {
        h.extend(this, compare);
    };
    clause[className].type = type;
});