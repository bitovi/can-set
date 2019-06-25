var QUnit = require("steal-qunit");

var set = require("../set-core"),
  props = require("../props");

QUnit.module("can-set props.id");

QUnit.test("id set.difference", function(assert) {

  var idProps = props.id("color");
  var res;

  res = set.difference({ color: "red" }, { color: "blue" }, idProps);
  assert.deepEqual(res, false, "id changes always false");

  res = set.difference({ color: "red" }, { }, idProps);
  assert.deepEqual(res, false, "id removal always false");

  res = set.difference({ }, { color: "blue" }, idProps);
  assert.deepEqual(res, true, "id addition always true");

});

QUnit.test("id set.difference with where", function(assert) {
  var algebra = new set.Algebra(
    props.id("color"),
    props.enum("type", ["light", "dark"])
  );
  var res;

  res = set.difference({ color: "red", type: ["light", "dark"] }, { color: "blue", type: "light" }, algebra);
  assert.deepEqual(res, false, "id changes always false");

  res = set.difference({ color: "red", type: ["light", "dark"] }, { type: "light" }, algebra);
  assert.deepEqual(res, false, "id removal always false");

  res = set.difference({ type: ["light", "dark"] }, {  type: "light", color: "blue" }, algebra);
  assert.deepEqual(res, true, "id addition always true");

  res = set.difference({ type: ["light", "dark"] }, {  type: "light" }, algebra);
  assert.deepEqual(res, { type: "dark" }, "no id clause, fall back to where");

  res = set.difference({ color: "red", type: ["light", "dark"] }, { color: "red", type: "light" }, algebra);
  assert.deepEqual(res, { color: "red", type: "dark" }, "no id change, fall back to where");

});
