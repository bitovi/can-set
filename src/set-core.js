var h = require("./helpers");
var clause = require("./clause");
var compare = require("./compare");

var Algebra = function(){
	var clauses = this.clauses = { where: {}, order: {}, paginate: {} };

	h.each(arguments, function(arg) {
		if(arg) {
			h.extend(clauses[arg.constructor.type || 'where'], arg);
		}
	});
};

Algebra.make = function(compare, count){
	if(compare instanceof Algebra) {
		return compare;
	} else {
		return new Algebra(compare, count);
	}
};

h.extend(Algebra.prototype, {
	getClauseProperties: function(set, options) {
		options = options || {};

		var setClone = h.extend({}, set);
    var clauses = this.clauses;
		var checkClauses = ['order', 'paginate'];
		var clauseProps = {
			enabled: {
				where: true,
				order: false,
				paginate: false
			}
		};

		if(options.omitClauses) {
			checkClauses = h.arrayUnionIntersectionDifference(
				checkClauses, options.omitClauses).difference;
		}

		h.each(checkClauses, function(clauseName) {
			var valuesForClause = {};
			var prop;

			for(prop in clauses[clauseName]) {
				if(prop in setClone) {
					valuesForClause[prop] = setClone[prop];
					delete setClone[prop];
				}
			}

			clauseProps[clauseName] = valuesForClause;
			clauseProps.enabled[clauseName] = !h.isEmptyObject(valuesForClause);
		});

		clauseProps.where = setClone;

		return clauseProps;
	},
	getDifferentClauseTypes: function(aClauses, bClauses) {
		var self = this;
		var differentTypes = [];

		h.each(clause.TYPES, function(type) {
			if(!self.equal(aClauses[type], bClauses[type])) {
				differentTypes.push(type);
			}
		});

		return differentTypes;
	},
	evaluateOperator: function(operator, a, b) {
		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);

		var result = operator(aClauseProps.where, bClauseProps.where,
			undefined, undefined, undefined, this.clauses.where, {});

		if(result && (aClauseProps.enabled.paginate || bClauseProps.enabled.paginate)) {
			if(aClauseProps.enabled.order || bClauseProps.enabled.order) {
				result = operator(aClauseProps.order, bClauseProps.order, undefined,
					undefined, undefined, this.clauses.order, {});
			}

			if(result) {
				result = operator(aClauseProps.paginate, bClauseProps.paginate,
					undefined, undefined, undefined, this.clauses.paginate, {});
			}
		}

		return result;
	},
	equal: function(a, b) {
		return this.evaluateOperator(compare.equal, a, b);
	},
	subset: function(a, b) {
		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);
		var compatibleSort = true;
		var result;

		if((aClauseProps.enabled.paginate || bClauseProps.enabled.paginate) &&
			(aClauseProps.enabled.order || bClauseProps.enabled.order)) {
			// compare order clauses without any special comparators
			compatibleSort = compare.equal(aClauseProps.order, bClauseProps.order,
				undefined, undefined, undefined, {}, {});
		}

		if(!compatibleSort) {
			result = false;
		}
		else {
			result = this.evaluateOperator(compare.subset, a, b);
		}

		return result;
	},
	properSubset: function(a, b){
		return this.subset(a, b) && !this.equal(a, b);
	},
	// what a has that b doesn't
	/**
	 * // A has all of B
	 * set.difference( {} , {completed: true}, set.boolean("completed") ) //-> {completed: false}
	 *
	 * // A has all of B, but we can't figure out how to create a set object
	 * set.difference( {} , {completed: true} ) //-> false
	 *
	 * // A is totally inside B
	 * set.difference( {completed: true}, {} ) //-> undefined
	 * @param {Object} a
	 * @param {Object} b
	 */
	difference: function(a, b) {
		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);
		var differentClauses = this.getDifferentClauseTypes(aClauseProps,
			bClauseProps);
		var result; // if too many clauses are different, then we won't be able
								// to determine the difference

		switch(differentClauses.length) {
			case 0 : {
				// if all the clauses are the same, then there can't be a difference
				result = false;
				break;
			}
			case 1 : {
				// if there's only one clause to evaluate, then we can try to determine
				// the difference set
				result = compare.difference(aClauseProps[differentClauses[0]],
					bClauseProps[differentClauses[0]], undefined, undefined, undefined,
					this.clauses[differentClauses[0]], {});
				break;
			}
		}

		return result;
	},
	union: function(a, b){
		// if everything is equal or has a difference
		return this.evaluateOperator(compare.union, a, b);
	},
	intersection: function(a, b){
		// if everything is equal or has a difference
		return this.evaluateOperator(compare.intersection, a, b);
	},
	count: function(a){
		return this.evaluateOperator(compare.count, a, {});
	}

});

module.exports = {
	Algebra : Algebra,
	difference: function(a, b, config) {
		return Algebra.make(config).difference(a, b);
	},
	equal: function(a, b, config) {
		return Algebra.make(config).equal(a, b);
	},
	subset: function(a, b, config) {
		return Algebra.make(config).subset(a, b);
	},
	properSubset: function(a, b, config) {
		return Algebra.make(config).properSubset(a, b);
	},
	union: function(a, b, config) {
		return Algebra.make(config).union(a, b);
	},
	intersection: function(a, b, config){
		return Algebra.make(config).intersection(a, b);
	},
	count: function(a, config){
		return Algebra.make(config).count(a);
	}
};
