require("steal-qunit");

var set = require('./set');

QUnit.module("can-set");

QUnit.test('set.Algebra constructors', function(assert) {
	var algebra = new set.Algebra(
		set.props.rangeInclusive("start", "end"),
		set.props.boolean('completed'),
		set.props["enum"]('type',['new','prep','deliver','delivered'])
	);

	var res = algebra.subset({ type: ['new'] },{type: ['new','prep']});
	assert.deepEqual(res, true, "enum");
});

QUnit.test('set.clause', function(assert) {
	assert.ok(set.clause);
});
