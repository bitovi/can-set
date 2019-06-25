var set = require("./set");
var QUnit = require("steal-qunit");
var props = require("./props");
var h = require("./helpers");
var assign = require("can-assign");

QUnit.module("can-set get");

var getId = function(d){ return d.id; };

var items = [
	{ id: 0, note: 'C', type: 'eh' },
	{ id: 1, note: 'D', type: 'critical' },
	{ id: 2, note: 'E', type: 'critical' },
	{ id: 3, note: 'F', type: 'eh' },
	{ id: 4, note: 'G', type: 'critical' },
	{ id: 5, note: 'A' },
	{ id: 6, note: 'B', type: 'critical' },
	{ id: 7, note: 'C', type: 'critical' }
];

QUnit.test("getSubset against non ranged set", function(assert) {
	/*
	 * 1. set b = {} evaluates to all available entities -- the univeral set
	 * 2. set a = { type: 'critical', start: 1, end: 3 } evaluates to entities
	 * 		in set b that have a type property of 'critical'
	 *		e.g. [
	 *			{ id: 1, type: 'critical' },
	 *			{ id: 2, type: 'critical' }, // index 1
	 *			{ id: 4, type: 'critical' }, // index 2
	 *			{ id: 6, type: 'critical' }, // index 3
	 *			{ id: 7, type: 'critical' }
	 *		]
	 * 3. set a is further reduced to the entities at indices 1 through 3
	 *		e.g. [
	 *			{ id: 2, type: 'critical' },
	 *			{ id: 4, type: 'critical' },
	 *			{ id: 6, type: 'critical' }
	 *		]
	 */
	var res = set.getSubset({ type: 'critical', start: 1, end: 3 }, {}, items,
		props.rangeInclusive("start", "end"));

	assert.deepEqual(res && h.map.call(res, getId), [2,4,6]);
});

QUnit.test("getSubset ordered ascending and paginated", function(assert) {
	/*
	 * 1. set b = {} evaluates to all available entities -- the univeral set
	 * 2. set a = { type: 'critical', sort: 'note ASC', start: 1, end: 3 }
	 * 		evaluates to entities in set b that have a type property of 'critical'
	 * 		sorted by the note property
	 *		e.g. [
	 *			{ id: 6, note: 'B', type: 'critical' },
	 *			{ id: 7, note: 'C', type: 'critical' }, // index 1
	 *			{ id: 1, note: 'D', type: 'critical' }, // index 2
	 *			{ id: 2, note: 'E', type: 'critical' }, // index 3
	 *			{ id: 4, note: 'G', type: 'critical' }
	 *		]
	 * 3. set a is further reduced to the entities at indices 1 through 3
	 *		e.g. [
	 *			{ id: 7, note: 'C', type: 'critical' },
	 *			{ id: 1, note: 'D', type: 'critical' },
	 *			{ id: 2, note: 'E', type: 'critical' },
	 *		]
	 */
	var algebra = new set.Algebra(
		props.sort('sort'),
		props.rangeInclusive('start','end')
	);

	var res = set.getSubset(
		{ type: 'critical', start: 1, end: 3, sort: 'note AsC' },
		{}, items, algebra
	);

	assert.deepEqual(res && h.map.call(res, getId), [7,1,2]);
});

QUnit.test("getSubset ordered descending and paginated", function(assert) {
	/*
	 * 1. set b = {} evaluates to all available entities -- the univeral set
	 * 2. set a = { type: 'critical', sort: 'note DESC', start: 1, end: 3 }
	 * 		evaluates to entities in set b that have a type property of 'critical'
	 * 		sorted by the note property
	 *		e.g. [
	 *			{ id: 4, note: 'G', type: 'critical' },
	 *			{ id: 2, note: 'E', type: 'critical' }, // index 1
	 *			{ id: 1, note: 'D', type: 'critical' }, // index 2
	 *			{ id: 7, note: 'C', type: 'critical' }, // index 3
	 *			{ id: 6, note: 'B', type: 'critical' },
	 *		]
	 * 3. set a is further reduced to the entities at indices 1 through 3
	 */
	var algebra = new set.Algebra(
		props.sort('sort'),
		props.rangeInclusive('start','end')
	);

	var res = set.getSubset(
		{ type: 'critical', start: 1, end: 3, sort: 'note deSc' },
		{}, items, algebra
	);

	assert.deepEqual(res && h.map.call(res, getId), [2,1,7]);
});

QUnit.test("getSubset against paginated set", function(assert) {
	var res = set.getSubset(
		{type: 'critical', start: 21, end: 23},
		{type: 'critical', start: 20, end: 27},
		items,
		props.rangeInclusive("start","end") );

	assert.deepEqual(res && h.map.call(res, getId), [2,4,6]);
});

QUnit.test("getSubset returns undefined against incompatible set", function(assert) {
	var res = set.getSubset(
		{ note: 'C' },
		{ type: 'critical' },
		items
	);

	assert.strictEqual(res, undefined);
});

QUnit.test("getUnion basics", function(assert) {
	var union = set.getUnion({}, { foo: "bar" }, items, items.slice(0, 3));
	assert.deepEqual(union, items);
});

QUnit.test("getUnion against ranged sets", function(assert) {
	var union = set.getUnion({start: 10, end: 13},{start: 14, end: 17},items.slice(0,4), items.slice(4,8), props.rangeInclusive("start","end"));
	assert.deepEqual(union, items);

	union = set.getUnion({start: 14, end: 17}, {start: 10, end: 13}, items.slice(4,8),items.slice(0,4), props.rangeInclusive("start","end"));
	assert.deepEqual(union, items, "disjoint after");
});

QUnit.test("getUnion against overlapping ranged sets", function(assert) {
	var union = set.getUnion(
		{start: 10, end: 14},
		{start: 13, end: 17},
		items.slice(0,5),
		items.slice(3,8),
		props.rangeInclusive("start","end"));

	assert.deepEqual(union, items);

	union = set.getUnion(
		{start: 10, end: 11},
		{start: 11, end: 17},
		items.slice(0,2),
		items.slice(1,8),
		props.rangeInclusive("start","end"));

	assert.deepEqual(union, items);

	union = set.getUnion(
		{start: 11, end: 17},
		{start: 10, end: 11},
		items.slice(1,8),
		items.slice(0,2),
		props.rangeInclusive("start","end"));

	assert.deepEqual(union, items);
});

QUnit.test("getUnion filters for uniqueness", function(assert) {
	var aItems = items.filter(function(a) {
		return a.type === "critical";
	});
	var bItems = items.filter(function(b) {
		return b.note === "C";
	});
	var unionItems = aItems.concat([bItems[0]]); // bItems[1] is already in aItems

	var union = set.getUnion({type: "critical"},{note: "C"}, aItems, bItems, props.id("id"));
	assert.deepEqual(union, unionItems);

	// case with no ID in set algebra, but some same items.
	union = set.getUnion({type: "critical"},{note: "C"}, aItems, bItems, {});
	assert.deepEqual(union, unionItems);

	// Case with not-same items with same ID
	bItems = bItems.map(function(b) {
		return assign({}, b);
	});
	union = set.getUnion({type: "critical"},{note: "C"}, aItems, bItems, props.id("id"));
	assert.deepEqual(union, unionItems);

});

QUnit.test("getSubset passed same object works (#3)", function(assert) {
	var algebra = new set.Algebra(props.rangeInclusive("start","end"));
	var setObj = {start: 1, end: 2};
	var items = algebra.getSubset(setObj, setObj, [{id: 1}]);
	assert.deepEqual(items, [{id: 1}]);
});
