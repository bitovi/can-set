QUnit.module("can/set core - nested");


require("steal-qunit");

var set = require('./set-core');

var ignoreProp = function(){ return true; };

QUnit.module("can-set core - nested where");

QUnit.test('set.equal', function(assert) {

	var algebra = new set.Algebra(
		new set.Translate("where","$where"),
		{
			count: ignoreProp,
			type: function (a, b) {
				return ('' + a)
					.toLowerCase() === ('' + b)
					.toLowerCase();
			}
		}
	);

	var res;

	res = algebra.equal(
		{$where: {type: 'FOLDER' } },
		{$where: { type: 'FOLDER', count: 5 }}
	);
	assert.ok(res, 'count ignored');

	res = algebra.equal(
		{$where: { type: 'folder' }},
		{$where: { type: 'FOLDER' }}
	);

	assert.ok(res, 'folder case ignored');

});


QUnit.test('set.subset', function(assert) {

	var algebra = new set.Algebra(
		new set.Translate("where","$where"),
		{
			count: ignoreProp,
			type: function (a, b) {
				return ('' + a)
					.toLowerCase() === ('' + b)
					.toLowerCase();
			},
			foo: ignoreProp, bar: ignoreProp, kind: ignoreProp
		}
	);

	var res;

	res = algebra.subset({$where:{ type: 'FOLDER' }}, {$where:{ type: 'FOLDER' }});
	assert.ok(res, 'equal sets');

	res = algebra.subset({$where:{ type: 'FOLDER', parentId: 5 }}, {$where:{ type: 'FOLDER' }});
	assert.ok(res, 'sub set');

	res = algebra.subset({$where:{ type: 'FOLDER' }}, {$where:{ type: 'FOLDER', parentId: 5 }});
	assert.ok(!res, 'wrong way');

	res = algebra.subset(
		{$where:{ type: 'FOLDER', parentId: 7 }},
		{$where:{ type: 'FOLDER', parentId: 5 }}
	);
	assert.ok(!res, 'different values');

	res = algebra.subset(
		{$where:{ type: 'FOLDER', count: 5 }},
		{$where:{ type: 'FOLDER' }}
	);
	assert.ok(res, 'count ignored');

	res = algebra.subset(
		{$where:{ type: 'FOLDER', category: 'tree' }},
		{$where:{ type: 'FOLDER', foo: true, bar: true }}
	);
	assert.ok(res, 'understands a subset');

	res = algebra.subset(
		{$where:{ type: 'FOLDER', foo: true, bar: true }},
		{$where:{ type: 'FOLDER', kind: 'tree' }}
	);
	assert.ok(res,	'ignores nulls');

});

QUnit.test('set.properSubset', function(assert) {
	var algebra = new set.Algebra(
		new set.Translate("where","$where")
	);

	assert.equal( algebra.properSubset( {$where:{foo: "bar"}}, {$where:{}}), true );
	assert.equal( algebra.properSubset({$where:{}},{$where:{}}), false );
	assert.equal( algebra.properSubset({$where:{}},{$where:{foo: "bar"}}), false );
});


QUnit.test('set.difference', function(assert) {

	var algebra = new set.Algebra(
		new set.Translate("where","$where")
	);

	var res = algebra.difference({$where:{}}, {$where:{ completed: true }});
	assert.ok(res === true, "diff should be true");


	res = algebra.difference({$where:{ completed: true }}, {$where:{ completed: true }});
	assert.equal(res, false);

	res = algebra.difference({$where:{ completed: true }}, {$where:{}});
	assert.equal(res, false);

	res = algebra.difference({$where:{ completed: true }}, {$where:{ userId: 5 }});
	assert.equal(res, false); // TODO: probably should be undefined

});

QUnit.test('set.difference({ function })', function(assert) {
	var algebra = new set.Algebra(
		new set.Translate("where","$where"),
		{
			colors: function() {
				return {
					// can’t always be privided … but COULD if we were gods
					difference: ['red' ],
					intersection: ['blue']
				};
			}
		});

	var res = algebra.difference({$where:{ colors: ['red','blue'] }}, {$where:{ colors: ['blue'] }});

	assert.deepEqual(res, {$where:{ colors: [ 'red' ] }});
});

QUnit.test('set.union', function(assert) {

	var algebra = new set.Algebra( new set.Translate("where","$where") );

	// set / subset
	var res = algebra.union({$where:{}}, {$where:{ completed: true }});
	assert.deepEqual(res , {$where:{}}, "set / subset");

	res = algebra.union({$where:{ completed: true }}, {$where:{}});
	assert.deepEqual(res , {$where:{}}, "subset / set");

	res = algebra.union({$where:{foo: "bar"}},{$where:{foo: "bar"}});
	assert.deepEqual(res, {$where:{foo: "bar"}}, "equal");

	res = algebra.union({$where:{foo: "bar"}},{$where:{foo: "zed"}});
	assert.ok(!res, "values not equal");

	res = algebra.union({$where:{foo: "bar"}},{$where:{name: "A"}});
	assert.ok(!res, "values not equal");
});

QUnit.test('set.union Array', function(assert) {
	var algebra = new set.Algebra( new set.Translate("where","$where") );

	// set / subset
	var res = algebra.union({$where:{foo: ["a","b"]}}, {$where:{ foo: ["a","c"] }});
	assert.deepEqual(res , {$where:{foo: ["a","b","c"]}}, "set / subset");

});

QUnit.test('set.count', function(assert) {
	var algebra = new set.Algebra(
		new set.Translate("where","$where"),
		{
			foo: function(){
				return {
					count: 100
				};
			}
		});

	assert.ok( algebra.count({$where:{}}) === Infinity, "defaults to infinity");
	assert.ok( algebra.count({$where:{bar: "foo"}}) === Infinity, "defaults to infinity");

	assert.equal( algebra.count({$where:{foo: "bar"}}), 100,  "works with a single value"  );
});

QUnit.test('set.intersection', function(assert) {
	var algebra = new set.Algebra(
		new set.Translate("where","$where"));

	var res = algebra.intersection({$where:{}}, {$where:{ completed: true }});
	assert.deepEqual(res , {$where:{ completed: true }}, "set / subset");

	res = algebra.intersection({$where:{ completed: true }}, {$where:{}});
	assert.deepEqual(res , {$where:{ completed: true }}, "subset / set");

	res = algebra.intersection({$where:{foo: "bar"}},{$where:{foo: "bar"}});
	assert.deepEqual(res, {$where:{foo: "bar"}}, "equal");

	res = algebra.intersection({$where:{foo: "bar"}},{$where:{foo: "zed"}});
	assert.ok(!res, "values not equal");

	res = algebra.intersection({$where:{foo: 'bar'}},{$where:{completed: true}});
	assert.deepEqual(res, {$where:{foo: 'bar', completed: true}}, 'intersection should combine definitions');
});


QUnit.test('set.intersection Array', function(assert) {

	var algebra = new set.Algebra(
		new set.Translate("where","$where"));

	// set / subset
	var res = algebra.intersection({$where:{foo: ["a","b"]}}, {$where:{ foo: ["a","c"] }});
	assert.deepEqual(res , {$where:{foo: ["a"]}}, "intersection");

});


QUnit.test('set.has', function(assert) {

	var algebra = new set.Algebra(
		new set.Translate("where","$where"),
		{
			count: ignoreProp,
			type: function (a, b) {
				return ('' + a)
					.toLowerCase() === ('' + b)
					.toLowerCase();
			},
			foo: ignoreProp, bar: ignoreProp, kind: ignoreProp
		}
	);

	assert.ok( algebra.has({$where: {someId: 5}}, {someId: 5, name: "foo"}), 'contains');

	var res;

	res = algebra.has({$where:{ type: 'FOLDER' }}, { type: 'FOLDER' });
	assert.ok(res, 'equal sets');

	res = algebra.has({$where:{ type: 'FOLDER', parentId: 5 }}, { type: 'FOLDER' });
	assert.equal(res, false, 'doesnt match');

	res = algebra.has({$where:{ type: 'FOLDER' }}, { type: 'FOLDER', parentId: 5 });
	assert.ok(true, 'is a subset');

	res = algebra.has(
		{$where:{ type: 'FOLDER', parentId: 7 }},
		{ type: 'FOLDER', parentId: 5 }
	);
	assert.ok(!res, 'different values');

	res = algebra.has(
		{$where:{ type: 'FOLDER', count: 5 }},
		{ type: 'FOLDER' },
		{ count: ignoreProp }
	);
	assert.ok(res, 'count ignored');

	res = algebra.has(
		{$where:{ type: 'FOLDER', kind: 'tree' }},
		{ type: 'FOLDER', foo: true, bar: true }
	);
	assert.ok(res, 'understands a subset');

	res = algebra.has(
		{$where:{ type: 'FOLDER', foo: true, bar: true }},
		{ type: 'FOLDER', kind: 'tree' }
	);
	assert.ok(res,	'ignores nulls');
});
