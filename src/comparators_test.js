var QUnit = require("steal-qunit");

var set = require('./set-core'),
	comparators = require("./comparators");
	
QUnit.module("comparators");

test('rangeInclusive set.equal', function(){
	
	ok( 
		set.equal( 
			{start: 0, end: 100},
			{start: 0, end: 100},
			comparators.rangeInclusive("start", "end")),
		"they are equal" );
		
	ok( 
		!set.equal( 
			{start: 0, end: 100},
			{start: 0, end: 101},
			comparators.rangeInclusive("start", "end")),
		"they are not equal" );	
	
	ok( 
		!set.equal( 
			{start: 0, end: 100},
			{start: 1, end: 100},
			comparators.rangeInclusive("start", "end")),
		"they are not equal" );	
});

test('rangeInclusive set.subset', function(){
	
	ok( 
		set.subset( 
			{start: 0, end: 100},
			{start: 0, end: 100},
			comparators.rangeInclusive("start", "end")),
		"self is a subset" );

	ok( 
		set.subset( 
			{start: 0, end: 100},
			{start: 0, end: 101},
			comparators.rangeInclusive("start", "end")),
		"end extends past subset" );	

	ok( 
		set.subset( 
			{start: 1, end: 100},
			{start: 0, end: 100},
			comparators.rangeInclusive("start", "end")),
		"start extends before subset" );	
});


test('rangeInclusive set.difference', function() {
	var comparator = comparators.rangeInclusive('start', 'end');
	var res = set.difference({ start: 0, end: 99 }, { start: 50, end: 101 }, comparator);
	deepEqual(res, { start: 0, end: 49 }, "got a diff");
	
	res = set.difference({}, { start: 0, end: 10 }, comparator);
	equal(res, true);
});

test('rangeInclusive set.union', function() {
	var comparator = comparators.rangeInclusive('start', 'end');
	var res = set.union({ start: 0, end: 99 }, { start: 50, end: 101 }, comparator);
	deepEqual(res, { start: 0, end: 101 }, "got a diff");
	
	//res = set.difference({}, { start: 0, end: 10 }, comparator);
	//equal(res, true);
});

test('boolean set.difference', function() {
	var comparator = comparators.boolean('completed');
	
	var res = set.difference({} , { completed: true }, comparator);
	deepEqual(res, { completed: false }, "inverse to false");

	//res = set.difference({}, { completed: false }, comparator);
	//deepEqual(res, { completed: true }, "inverse to true");
});


test('boolean set.union', function(){
	var comparator = comparators.boolean('completed');
	var res = set.union({completed: false} , { completed: true }, comparator);
	deepEqual(res, { }, "union has everything");
});
