require("steal-qunit");

var set = require('./set-core');

var ignoreProp = function(){ return true; };

QUnit.module("can-set core");

QUnit.test('set.equal', function(assert) {
	var res,
		now;

	res = set.equal(
		{ type: 'FOLDER' },
		{ type: 'FOLDER', count: 5 },
		{ count: ignoreProp }
	);
	assert.ok(res, 'count ignored');

	res = set.equal(
		{ type: 'folder' },
		{ type: 'FOLDER' },
		{
			type: function (a, b) {
				return ('' + a)
					.toLowerCase() === ('' + b)
					.toLowerCase();
			}
		}
	);
	assert.ok(res, 'folder case ignored');

	// Issue #773
	res = set.equal(
		{foo: null},
		{foo: new Date()}
	);
	assert.ok(!res, 'nulls and Dates are not considered the same. (#773)');

	res = set.equal(
		{foo: null},
		{foo: {}}
	);
	assert.ok(!res, 'nulls and empty objects are not considered the same. (#773)');

	// Issue #35
	now = new Date();
	res = set.equal(
		{foo: now},
		{foo: new Date(now.getTime())}
	);
	assert.ok(res, 'date objects with same time values are considered the same. (#35)');

});

QUnit.test('set.subset', function(assert) {
	var res;

	res = set.subset({ type: 'FOLDER' }, { type: 'FOLDER' });
	assert.ok(res, 'equal sets');

	res = set.subset({ type: 'FOLDER', parentId: 5 }, { type: 'FOLDER' });
	assert.ok(res, 'sub set');

	res = set.subset({ type: 'FOLDER' }, { type: 'FOLDER', parentId: 5 });
	assert.ok(!res, 'wrong way');

	res = set.subset(
		{ type: 'FOLDER', parentId: 7 },
		{ type: 'FOLDER', parentId: 5 }
	);
	assert.ok(!res, 'different values');

	res = set.subset(
		{ type: 'FOLDER', count: 5 },
		{ type: 'FOLDER' },
		{ count: ignoreProp }
	);
	assert.ok(res, 'count ignored');

	res = set.subset(
		{ type: 'FOLDER', kind: 'tree' },
		{ type: 'FOLDER', foo: true, bar: true },
		{ foo: ignoreProp, bar: ignoreProp }
	);
	assert.ok(res, 'understands a subset');

	res = set.subset(
		{ type: 'FOLDER', foo: true, bar: true },
		{ type: 'FOLDER', kind: 'tree' },
		{ foo: ignoreProp, bar: ignoreProp, kind: ignoreProp }
	);
 	assert.ok(res,	'ignores nulls');

});

QUnit.test('set.properSubset', function(assert) {
	assert.equal( set.properSubset({foo: "bar"},{}), true );
	assert.equal( set.properSubset({},{}), false );
	assert.equal( set.properSubset({},{foo: "bar"}), false );
});

QUnit.test('set.difference', function(assert) {

	var res = set.difference({}, { completed: true });
	assert.ok(res === true, "diff should be true");


	res = set.difference({ completed: true }, { completed: true });
	assert.equal(res, false);

	res = set.difference({ completed: true }, {});
	assert.equal(res, false);

	res = set.difference({ completed: true }, { userId: 5 });
	assert.equal(res, false); // TODO: probably should be undefined
});

QUnit.test('set.difference({ function })', function(assert) {
	var res = set.difference({ colors: ['red','blue'] }, { colors: ['blue'] }, {
		colors: function() {
			return {
				// can’t always be privided … but COULD if we were gods
				difference: ['red' ],
				intersection: ['blue']
			};
		}
	});

	assert.deepEqual(res, { colors: [ 'red' ] });
});

QUnit.test('set.union', function(assert) {
	// set / subset
	var res = set.union({}, { completed: true });
	assert.deepEqual(res , {}, "set / subset");

	res = set.union({ completed: true }, {});
	assert.deepEqual(res , {}, "subset / set");

	res = set.union({foo: "bar"},{foo: "bar"});
	assert.deepEqual(res, {foo: "bar"}, "equal");

	res = set.union({foo: "bar"},{foo: "zed"});
	assert.ok(!res, "values not equal");

	res = set.union({foo: "bar"},{name: "A"});
	assert.ok(!res, "values not equal");

	res = set.union(
		{sort: {name: {first: 'Rick', last: 'Flair'}, type: 'split'}},
		{sort: {name: {first: 'Rick', last: 'Flair'}, type: 'split'}}
	);

	assert.deepEqual(
		res,
		{sort: {name: {first: 'Rick', last: 'Flair'}, type: 'split'}},
		'correctly unifies nested objects'
	);
});

QUnit.test('set.union Array', function(assert) {

	// set / subset
	var res = set.union({foo: ["a","b"]}, { foo: ["a","c"] });
	assert.deepEqual(res , {foo: ["a","b","c"]}, "set / subset");

});

QUnit.test('set.count', function(assert) {
	assert.ok( set.count({}) === Infinity, "defaults to infinity");
	assert.ok( set.count({foo: "bar"},{}) === Infinity, "defaults to infinity");

	assert.equal( set.count({foo: "bar"}, {
		foo: function(){
			return {
				count: 100
			};
		}
	}), 100,  "works with a single value"  );
});

QUnit.test('set.intersection', function(assert) {
	var res = set.intersection({}, { completed: true });
	assert.deepEqual(res , { completed: true }, "set / subset");

	res = set.intersection({ completed: true }, {});
	assert.deepEqual(res , { completed: true }, "subset / set");

	res = set.intersection({foo: "bar"},{foo: "bar"});
	assert.deepEqual(res, {foo: "bar"}, "equal");

	res = set.intersection({foo: "bar"},{foo: "zed"});
	assert.ok(!res, "values not equal");

	res = set.intersection({foo: 'bar'}, {completed: true});
	assert.deepEqual(res, {foo: 'bar', completed: true}, 'intersection should combine definitions');

	res = set.intersection(
		{name: {title: 'Ravishing', last: 'Rude'}, type: 'split'},
		{name: {first: 'Rick'}}
	);
	assert.deepEqual(
		res,
		{name: {title: 'Ravishing', first: 'Rick', last: 'Rude'}, type: 'split'},
		'intersects nested objects'
	);
});

QUnit.test('set.intersection Array', function(assert) {

	// set / subset
	var res = set.intersection({foo: ["a","b"]}, { foo: ["a","c"] });
	assert.deepEqual(res , {foo: ["a"]}, "intersection");

});

QUnit.test('set.has', function(assert) {
	var res;

	res = set.has({ type: 'FOLDER' }, { type: 'FOLDER' });
	assert.ok(res, 'equal sets');

	res = set.has({ type: 'FOLDER' }, { type: 'FOLDER', parentId: 5 });
	assert.ok(res, 'sub set');

	res = set.has( { type: 'FOLDER', parentId: 5 }, { type: 'FOLDER' });
	assert.ok(!res, 'wrong way');

	res = set.has(
		{ type: 'FOLDER', parentId: 7 },
		{ type: 'FOLDER', parentId: 5 }
	);
	assert.ok(!res, 'different values');

	res = set.has(
		{ type: 'FOLDER' },
		{ type: 'FOLDER', count: 5 },
		{ count: ignoreProp }
	);
	assert.ok(res, 'count ignored');

	res = set.has(
		{ type: 'FOLDER', foo: true, bar: true },
		{ type: 'FOLDER', kind: 'tree' },
		{ foo: ignoreProp, bar: ignoreProp }
	);
	assert.ok(res, 'understands a subset');

	res = set.has(
		{ type: 'FOLDER', kind: 'tree' },
		{ type: 'FOLDER', foo: true, bar: true },
		{ foo: ignoreProp, bar: ignoreProp, kind: ignoreProp }
	);
	assert.ok(res,	'ignores nulls');

	var algebra = new set.Algebra(set.props.id('invoice_number'), set.props.id('product_code'));
	res = algebra.has(
		{invoice_number: 5},
		{invoice_number: 6, product_code: 10, product_name: 'Soap'}
	);
	assert.ok(res === false, 'understands compound ids subset exclusion');

	res = algebra.has(
		{invoice_number: 5},
		{invoice_number: 5, product_code: 10, product_name: 'Soap'}
	);
	assert.ok(res, 'understands compound id subset inclusion');
});

QUnit.test('set.index', function(assert) {
	var index = set.index(
		{sort: "name"},
		[{id: 1, name:"g"}, {id: 2, name:"j"}, {id: 3, name:"m"}, {id: 4, name:"s"}],
		{name: "k"});

	assert.equal(index, undefined, "no value if nothing is set");

	var algebra = new set.Algebra(set.props.id("id"));

	index = algebra.index(
		{sort: "name"},
		[{id: 1, name:"g"}, {id: 2, name:"j"}, {id: 3, name:"m"}, {id: 4, name:"s"}],
		{id: 0, name: "k"});

	assert.equal(index, 0);
});

QUnit.test('algebra.id', function(assert) {
	var algebra = new set.Algebra(set.props.id("_id"));
	assert.equal(algebra.id({_id: 5}), 5, "only one id, returns value");

	algebra = new set.Algebra(set.props.id("studentId"), set.props.id("classId"));
	assert.equal(algebra.id({studentId: 6, classId: "7", foo: "bar"}), JSON.stringify({studentId: 6, classId: "7"}), "only one id, returns set as JSON");

});

QUnit.test('set.has algebra with pagination', function(assert) {
	var algebra = new set.Algebra(set.props.offsetLimit('$skip', '$limit'));
	var setA = {$limit: 5, $skip: 0};
	var props = {name: 'My Portfolio'};
	assert.ok(algebra.has(setA, props));
});
