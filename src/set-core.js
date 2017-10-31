var h = require("./helpers");
var clause = require("./clause");
var compare = require("./compare");
var get = require("./get");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var makeArray = require("can-util/js/make-array/make-array");
var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");

/**
 * @function can-set.Translate Translate
 * @parent can-set.properties
 * @signature `new set.Translate(clauseType, propertyName)`
 *
 * Localizes a clause's properties within another nested property.
 *
 * ```js
 * var algebra = new set.Algebra(
 *   new set.Translate("where","$where")
 * );
 * algebra.has(
 *   {$where: {complete: true}},
 *   {id: 5, complete: true}
 * ) //-> true
 * ```
 *
 * This is useful when filters (which are `where` clauses) are
 * within a nested object.
 *
 *   @param {String} clause A clause type.  One of `'where'`, `'order'`, `'paginate'`, `'id'`.
 *   @param {String|Object} propertyName The property name which contains the clauses's properties.
 *   @return {can-set.compares} A set compares object that can do the translation.
 */
function Translate(clause, options){
	if(typeof options === "string") {
		var path = options;
		options = {
			fromSet: function(set, setRemainder){
				return set[path] || {};
			},
			toSet: function(set, wheres){
				set[path] = wheres;
				return set;
			}
		};
	}
	this.clause = clause;
	assign(this, options);
}
/**
 * An `Algebra` internally keeps different properties organized by clause type.
 * If an object comes in that isn't a clause type, it's assuemd to be a where.
 *
 * new set.Algebra(Where(),Paginate(),Sort())
 *
 * @hide
 */
var Algebra = function(){
	var clauses = this.clauses = {
		where: {},
		order: {},
		paginate: {},
		id: {}
	};
	this.translators = {
		where: new Translate("where", {
			fromSet: function(set, setRemainder){
				return setRemainder;
			},
			toSet: function(set, wheres){
				return assign(set, wheres);
			}
		})
	};
	var self = this;
	each(arguments, function(arg) {

		if(arg) {
			if(arg instanceof Translate) {
				self.translators[arg.clause] = arg;
			} else {
				assign(clauses[arg.constructor.type || 'where'], arg);
			}
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

assign(Algebra.prototype, {

	// Breakup `set`'s properties by clauses in the algebra.
	// options:
  //  - omitClauses - clauses that should not be pulled out
	//
	// returns:
	//   - enabled - an object of which clauses are actually being used by this set. Where is true no matter what.
	//   - [clauseType] -  each clause type has the sets for that object
	getClauseProperties: function(set, options) {

		// Go through non-where clauses in algebra, remove those properties from a set clone.

		options = options || {};

		var setClone = assign({}, set);

		var clauses = this.clauses;
		var checkClauses = ['order', 'paginate', 'id'];

		var clauseProps = {
			enabled: {
				where: true,
				order: false,
				paginate: false,
				id: false
			}
		};

		if(options.omitClauses) {
			checkClauses = h.arrayUnionIntersectionDifference(checkClauses, options.omitClauses).difference;
		}

		each(checkClauses, function(clauseName) {
			var valuesForClause = {};
			var prop;

			// Go through the defined properties in this clauses
			for(prop in clauses[clauseName]) {
				// if it exists in the set, add it as a value for that clause
				if(prop in setClone) {
					valuesForClause[prop] = setClone[prop];

					// id clause properties are also where clause properties, so leave them to be added to where clause
					if (clauseName !== 'id') {
						delete setClone[prop];
					}
				}
			}

			clauseProps[clauseName] = valuesForClause;

			// if there are properties set for this clause
			clauseProps.enabled[clauseName] = !isEmptyObject(valuesForClause);
		});

		// everything left is where
		clauseProps.where = options.isProperties? setClone : this.translators.where.fromSet(set, setClone);

		return clauseProps;
	},
	// Given the broken out clause properties of `getClauseProperties`
	// returns the names of the clauses that aren't exactly equal.
	getDifferentClauseTypes: function(aClauses, bClauses) {
		var self = this;
		var differentTypes = [];

		each(clause.TYPES, function(type) {
			if( !self.evaluateOperator(compare.equal, aClauses[type], bClauses[type], {isProperties: true},{isProperties:true}) ) {
				differentTypes.push(type);
			}
		});

		return differentTypes;
	},
	// updates the set data with a result.
	// - `set` - the current set
	// - `clause` - which clause this is on
	// - `result` - a boolean or set data
	// - `useSet` - indicates to use the set or a boolean response
	updateSet: function(set, clause, result, useSet) {
		if(result && typeof result === "object" && useSet !== false) {
			if( this.translators[clause] ) {
				set = this.translators.where.toSet(set, result);
			} else {
				set = assign(set, result);
			}
			return true;
		}
		else if(result) {
			return useSet === undefined ? undefined : false;
		}
		else {
			return false;
		}
	},
	// calls the operator method on different parts of the set.
	evaluateOperator: function(operator, a, b, aOptions, bOptions, evaluateOptions) {
		aOptions = aOptions || {};
		bOptions = bOptions || {};
		evaluateOptions = assign({
			evaluateWhere: operator,
			evaluatePaginate: operator,
			evaluateOrder: operator,

			shouldEvaluatePaginate: function(aClauseProps, bClauseProps) {
				return aClauseProps.enabled.paginate || bClauseProps.enabled.paginate;
			},
			shouldEvaluateOrder: function(aClauseProps, bClauseProps) {
				return aClauseProps.enabled.order && compare.equal(aClauseProps.order, bClauseProps.order, undefined, undefined, undefined,{},{});
			}
			/* aClauseProps.enabled.order || bClauseProps.enabled.order */
		}, evaluateOptions||{});

		var aClauseProps = this.getClauseProperties(a, aOptions),
			bClauseProps = this.getClauseProperties(b, bOptions),
			set = {},
			useSet;

		var result = evaluateOptions.evaluateWhere(aClauseProps.where, bClauseProps.where,
			undefined, undefined, undefined, this.clauses.where, {});

		useSet = this.updateSet(set, "where", result, useSet);

		// if success, and either has paginate props
		if(result && evaluateOptions.shouldEvaluatePaginate(aClauseProps,bClauseProps) ) {

			// if they have an order, it has to be true for paginate to be valid
			// this isn't true if a < b, a is paginated, and b is not.
			if( evaluateOptions.shouldEvaluateOrder(aClauseProps,bClauseProps)) {
				result = evaluateOptions.evaluateOrder(aClauseProps.order, bClauseProps.order, undefined,
					undefined, undefined, {}, {});

				useSet = this.updateSet(set, "order", result, useSet);
			}

			if(result) {
				result = evaluateOptions.evaluatePaginate(aClauseProps.paginate, bClauseProps.paginate,
					undefined, undefined, undefined, this.clauses.paginate, {});

				useSet = this.updateSet(set, "paginate", result, useSet);
			}
		}
		// if orders are the same keep order!
		else if( result && evaluateOptions.shouldEvaluateOrder(aClauseProps,bClauseProps) ) {

			result = operator(aClauseProps.order, bClauseProps.order, undefined,
				undefined, undefined, {}, {});

			useSet = this.updateSet(set, "order", result, useSet);
		}

		// not checking order here makes it mean that different orders represent the same set?

		return result && useSet ? set : result;
	},
	/**
	 * @function can-set.Algebra.prototype.equal equal
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.equal(a, b)`
	 *
	 *   Returns true if the two sets the exact same.
	 *
	 *   ```js
	 *   algebra.equal({type: "critical"}, {type: "critical"}) //-> true
	 *   ```
	 *
	 * @param  {can-set/Set} a A set.
	 * @param  {can-set/Set} b A set.
	 * @return {Boolean} True if the two sets are equal.
	 */
	equal: function(a, b) {
		return this.evaluateOperator(compare.equal, a, b);
	},
	/**
	 * @function can-set.Algebra.prototype.subset subset
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.subset(a, b)`
	 *
	 * Returns true if _A_ is a subset of _B_ or _A_ is equal to _B_ (_A_ ⊆ _B_).
	 *
	 * ```js
	 * algebra.subset({type: "critical"}, {}) //-> true
	 * algebra.subset({}, {}) //-> true
	 * ```
	 *
	 * @param  {can-set/Set} a A set.
	 * @param  {can-set/Set} b A set.
	 * @return {Boolean} `true` if `a` is a subset of `b`.
	 */
	subset: function(a, b) {
		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);
		var compatibleSort = true;
		var result;

		// if both have a paginate, make sure order is the same.
		if( bClauseProps.enabled.paginate &&
			(aClauseProps.enabled.order || bClauseProps.enabled.order)) {
			// compare order clauses without any special props
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
	/**
	 * @function can-set.Algebra.prototype.properSubset properSubset
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.properSubset(a, b)`
	 *
	 * Returns true if _A_ is a strict subset of _B_ (_A_ ⊂ _B_).
	 *
	 * ```js
	 * algebra.properSubset({type: "critical"}, {}) //-> true
	 * algebra.properSubset({}, {}) //-> false
	 * ```
	 *
	 *   @param  {can-set/Set} a A set.
	 *   @param  {can-set/Set} b A set.
	 *   @return {Boolean} `true` if `a` is a subset of `b` and not equal to `b`.
	 */
	properSubset: function(a, b){
		return this.subset(a, b) && !this.equal(a, b);
	},
	/**
	 * @function can-set.Algebra.prototype.difference difference
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.difference(a, b)`
	 *
	 * Returns a set that represents the difference of sets _A_ and _B_ (_A_ \ _B_), or
	 * returns if a difference exists.
	 *
	 * ```js
	 * algebra1 = new set.Algebra(set.props.boolean("completed"));
	 * algebra2 = new set.Algebra();
	 *
	 * // A has all of B
	 * algebra1.difference( {} , {completed: true} ) //-> {completed: false}
	 *
	 * // A has all of B, but we can't figure out how to create a set object
	 * algebra2.difference( {} , {completed: true} ) //-> true
	 *
	 * // A is totally inside B
	 * algebra2.difference( {completed: true}, {} )  //-> false
	 * ```
	 *
	 *   @param  {can-set/Set} a A set.
	 *   @param  {can-set/Set} b A set.
	 *   @return {can-set/Set|Boolean} If an object is returned, it is difference of sets _A_ and _B_ (_A_ \ _B_).
	 *
	 *   If `true` is returned, that means that _B_ is a subset of _A_, but no set object
	 *   can be returned that represents that set.
	 *
	 *   If `false` is returned, that means there is no difference or the sets are not comparable.
	 */
	difference: function(a, b) {
		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);

		var differentClauses = this.getDifferentClauseTypes(aClauseProps, bClauseProps);

		var result; // if too many clauses are different, then we won't be able
					// to determine the difference

		switch(differentClauses.length) {
			case 0 : {
				// if all the clauses are the same, then there can't be a difference
				result = false;
				break;
			}
			case 1 : {
				var clause = differentClauses[0];
				// if there's only one clause to evaluate, then we can try to determine
				// the difference set
				result = compare.difference(aClauseProps[clause],
					bClauseProps[clause], undefined, undefined, undefined,
					this.clauses[clause], {});

				if(this.translators[clause] && typeof result === "object") {
					result = this.translators[clause].toSet({}, result);
				}
				break;
			}
		}

		return result;
	},
	/**
	 * @function can-set.Algebra.prototype.union union
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.union(a, b)`
	 *
	 * Returns a set that represents the union of _A_ and _B_ (_A_ ∪ _B_).
	 *
	 * ```js
	 * algebra.union(
	 *   {start: 0, end: 99},
	 *   {start: 100, end: 199},
	 * ) //-> {start: 0, end: 199}
	 * ```
	 *
	 *   @param  {can-set/Set} a A set.
	 *   @param  {can-set/Set} b A set.
	 *   @return {can-set/Set|undefined} If an object is returned, it is the union of _A_ and _B_ (_A_ ∪ _B_).
	 *
	 *   If `undefined` is returned, it means a union can't be created.
	 */
	union: function(a, b){
		// if everything is equal or has a difference
		return this.evaluateOperator(compare.union, a, b);
	},
	/**
	 * @function can-set.Algebra.prototype.intersection intersection
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.intersection(a, b)`
	 *
	 * Returns a set that represents the intersection of sets _A_ and _B_ (_A_ ∩ _B_).
	 *
	 * ```js
	 * algebra.intersection(
	 *   {completed: true, due: "tomorrow"},
	 *   {completed: true, type: "critical"},
	 * ) //-> {completed: true, due: "tomorrow", type: "critical"}
	 * ```
	 *
	 *   @param  {[type]} a A set.
	 *   @param  {[type]} b A set.
	 *   @return {can-set/Set|Boolean} If an object is returned, it
	 *   represents the intersection of sets _A_ and _B_ (_A_ ∩ _B_).
	 *
	 *   If `true` is returned, that means that an intersection exists, but no set object
	 *   can be returned that represents that set.
	 *
	 *   If `false` is returned, that means there is intersection.
	 */
	intersection: function(a, b){
		// if everything is equal or has a difference
		return this.evaluateOperator(compare.intersection, a, b);
	},
	/**
	 * @function can-set.Algebra.prototype.count count
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.count(set)`
	 *
	 * Returns the number of items that might be loaded by the `set`. This makes use of set.Algebra's
	 * By default, this returns Infinity.
	 *
	 * ```js
	 * var algebra =  new set.Algebra({
	 *   set.props.rangeInclusive("start", "end")
	 * });
	 * algebra.count({start: 10, end: 19}) //-> 10
	 * algebra.count({}) //-> Infinity
	 * ```
	 *
	 *   @param  {can-set/Set} set [description]
	 *   @return {Number} The number of items in the set if known, `Infinity`
	 *   if unknown.
	 */
	count: function(set){
		return this.evaluateOperator(compare.count, set, {});
	},
	/**
	 * @function can-set.Algebra.prototype.has has
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.has(set, props)`
	 *
	 * Used to tell if the `set` contains the instance object `props`.
	 *
	 * ```
	 * var algebra = new set.Algebra(
	 *   new set.Translate("where","$where")
	 * );
	 * algebra.has(
	 *   {"$where": {playerId: 5}},
	 *   {id: 5, type: "3pt", playerId: 5, gameId: 7}
	 * ) //-> true
	 * ```
	 *
	 *   @param  {can-set/Set} set A set.
	 *   @param  {Object} props An instance's raw data.
	 *   @return {Boolean} Returns `true` if `props` belongs in `set` and
	 *   `false` it not.
	 */
	has: function(set, props){
		// there is a `this.where`, `this.paginate`, etc clause on this object
		// if where is shifted ... we need to restore it later.

		// the rest is subset code
		var aClauseProps = this.getClauseProperties(set);
		var propsClauseProps = this.getClauseProperties(props,{isProperties: true});
		var compatibleSort = true;
		var result;

		// if there is a paginate and an order, order has to be the same first.
		if((propsClauseProps.enabled.paginate || aClauseProps.enabled.paginate) &&
			(propsClauseProps.enabled.order || aClauseProps.enabled.order)) {
			// compare order clauses without any special props
			compatibleSort = compare.equal(propsClauseProps.order, aClauseProps.order,
				undefined, undefined, undefined, {}, {});
		}

		if(!compatibleSort) {
			result = false;
		}
		else {
			result = this.evaluateOperator(compare.subset, props, set, {isProperties: true}, undefined, {
				shouldEvaluatePaginate: function () {
					return false;
				}
			});
		}

		return result;
	},
	/**
	 * @function can-set.Algebra.prototype.index index
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.index(set, items, item)`
	 *
	 * Returns where `item` should be inserted into `items` which is represented by `set`.
	 *
	 * ```js
	 * algebra = new set.Algebra(
	 *   set.props.sort("orderBy")
	 * );
	 * algebra.index(
	 *   {orderBy: "age"},
	 *   [{id: 1, age: 3},{id: 2, age: 5},{id: 3, age: 8},{id: 4, age: 10}],
	 *   {id: 6, age: 3}
	 * )  //-> 2
	 * ```
	 *
	 * The default sort property is what is specified by
	 * [can-set.props.id]. This means if that if the sort property
	 * is not specified, it will assume the set is sorted by the specified
	 * id property.
	 *
	 *   @param  {can-set/Set} set The `set` that describes `items`.
	 *   @param  {Array<Object>} items An array of data objects.
	 *   @param  {Object} item The data object to be inserted.
	 *   @return {Number} The position to insert `item`.
	 */
	index: function(set, items, item){
		var aClauseProps = this.getClauseProperties(set);
		var propName = h.firstProp(aClauseProps.order),
			compare,
			orderValue;
		if(propName) {
			compare = this.clauses.order[propName];
			orderValue = set[propName];

			return h.index(function(itemA, itemB){
				return compare(orderValue, itemA, itemB);
			},items, item);
		}
		propName = h.firstProp(this.clauses.id);
		if(propName) {
			compare = h.defaultSort;
			orderValue = propName;
			return h.index(function(itemA, itemB){
				return compare(orderValue, itemA, itemB);
			},items, item);
		}
		// undefined so the behavior can be figured out by the behavior
		return;
	},
	/**
	 * @function can-set.Algebra.prototype.getSubset getSubset
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.getSubset(a, b, bData)`
	 *
	 * Gets `a` set's items given a super set `b` and its items.
	 *
	 * ```js
	 * algebra.getSubset(
	 *   {type: "dog"},
	 *   {},
	 *   [{id: 1, type:"cat"},
	 *    {id: 2, type: "dog"},
	 *    {id: 3, type: "dog"},
	 *    {id: 4, type: "zebra"}]
	 * ) //-> [{id: 2, type: "dog"},{id: 3, type: "dog"}]
	 * ```
	 *
	 *   @param  {can-set/Set} a The set whose data will be returned.
	 *   @param  {can-set/Set} b A superset of set `a`.
	 *   @param  {Array<Object>} bData The data in set `b`.
	 *   @return {Array<Object>} The data in set `a`.
	 */
	getSubset: function(a, b, bData) {

		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);

		// ignoring ordering, can we reduce set b into set a?
		var isSubset = this.subset(
			assign({}, aClauseProps.where, aClauseProps.paginate),
			assign({}, bClauseProps.where, bClauseProps.paginate)
		);

		if(isSubset) {
			return get.subsetData(a, b, bData, this);
		}
	},
	// given two sets and their data, make a union of their data
	/**
	 * @function can-set.Algebra.prototype.getUnion getUnion
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.getUnion(a, b, aItems, bItems)`
	 *
	 * Unifies items from set A and setB into a single array of items.
	 *
	 * ```js
	 * algebra = new set.Algebra(
	 *   set.props.rangeInclusive("start","end")
	 * );
	 * algebra.getUnion(
	 *   {start: 1,end: 2},
	 *   {start: 2,end: 4},
	 *   [{id: 1},{id: 2}],
	 *   [{id: 2},{id: 3},{id: 4}]);
	 *   //-> [{id: 1},{id: 2},{id: 3},{id: 4}]
	 * ```
	 *
	 *   @param  {can-set/Set} a A set.
	 *   @param  {can-set/Set} b A set.
	 *   @param  {Array<Object>} aItems Set `a`'s items.
	 *   @param  {Array<Object>} bItems Set `b`'s items.
	 *   @return {Array<Object>} Returns items in both set `a` and set `b`.
	 */
	getUnion: function(a,b,aItems, bItems){

		var aClauseProps = this.getClauseProperties(a);
		var bClauseProps = this.getClauseProperties(b);
		var algebra = this;
		var options;

		if(this.subset(a, b)) {
			return bItems;
		} else if(this.subset(b, a)) {
			return aItems;
		}
		// neither is a subset of the other
		var combined;
		// if either has paginate available, try that
		if(aClauseProps.enabled.paginate || bClauseProps.enabled.paginate) {
			options = {};
			var isUnion = compare.union(aClauseProps.paginate, bClauseProps.paginate, undefined, undefined, undefined,
				this.clauses.paginate, options);

			// If there isn't a union, return `undefined`.
			if(!isUnion) {
				return;
			}
			else {
				each(options.getUnions, function(filter){
					var items = filter(a,b, aItems, bItems, algebra, options);
					aItems = items[0];
					bItems = items[1];
				});
				combined = aItems.concat(bItems);
			}
		} else {
			combined = aItems.concat(bItems);
		}

		// If sorting is the same, sort the result.
		if( combined.length && aClauseProps.enabled.order && compare.equal(aClauseProps.order, bClauseProps.order, undefined, undefined, undefined,{},{}) ) {
			options = {};
			var propName = h.firstProp(aClauseProps.order),
				compareOrder = algebra.clauses.order[propName];
			combined = combined.sort(function(aItem, bItem){
				return compareOrder(a[propName], aItem, bItem);
			});
		}

		return combined;
	},
	/**
	 * @function can-set.Algebra.prototype.id id
	 * @parent can-set.Algebra.prototype
	 *
	 * @signature `algebra.id(props)`
	 *
	 * Returns the configured `id` property value from `props`.  If there are
	 * multiple ids, a `JSON.stringify`-ed JSON object is returned with each
	 * [can-set.props.id] value is returned.
	 *
	 * ```js
	 * var algebra1 = new set.Algebra(set.props.id("_id"));
	 * algebra1.id({_id: 5}) //-> 5
	 *
	 * var algebra2 = new set.Algebra(
	 *   set.props.id("studentId"),
	 *   set.props.id("classId")
	 * );
	 *
	 * algebra2.id({studentId: 6, classId: "7", foo: "bar"})
	 *     //-> '{"studentId": 6, "classId": "7"}'
	 * ```
	 *
	 *   @param  {Object} obj An instance's raw data.
	 *   @return {*|String} If a single [can-set.props.id] is configured, it's value will be returned.
	 *   If multiple [can-set.props.id] properties are configured a `JSON.stringify`-ed object is returned.
	 */
	id: function(props){
		var keys = Object.keys(this.clauses.id);
		if(keys.length === 1) {
			return props[keys[0]];
		} else {
			var id = {};
			keys.forEach(function(key){
				id[key] = props[key];
			});
			return JSON.stringify(id);
		}
	}
});

var callOnAlgebra = function(methodName, algebraArgNumber) {
	return function(){
		var args = makeArray(arguments).slice(0, algebraArgNumber);
		var algebra = Algebra.make(arguments[algebraArgNumber]);
		return algebra[methodName].apply(algebra, args);
	};
};

module.exports = {
	Algebra : Algebra,
	Translate: Translate,
	difference: callOnAlgebra("difference",2),
	equal: callOnAlgebra("equal",2),
	subset: callOnAlgebra("subset",2),
	properSubset: callOnAlgebra("properSubset",2),
	union: callOnAlgebra("union",2),
	intersection: callOnAlgebra("intersection",2),
	count: callOnAlgebra("count",1),
	has: callOnAlgebra("has",2),
	index: callOnAlgebra("index",3),
	getSubset: callOnAlgebra("getSubset",3),
	getUnion: callOnAlgebra("getUnion",4)
};
