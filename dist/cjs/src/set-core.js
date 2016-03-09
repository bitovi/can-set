/*src/set-core*/
var h = require('./helpers.js');
var clause = require('./clause.js');
var compare = require('./compare.js');
function Translate(clause, options) {
    if (typeof options === 'string') {
        var path = options;
        options = {
            fromSet: function (set, setRemainder) {
                return set[path] || {};
            },
            toSet: function (set, wheres) {
                set[path] = wheres;
                return set;
            }
        };
    }
    this.clause = clause;
    h.extend(this, options);
}
var Algebra = function () {
    var clauses = this.clauses = {
            where: {},
            order: {},
            paginate: {}
        };
    this.translators = {
        where: new Translate('where', {
            fromSet: function (set, setRemainder) {
                return setRemainder;
            },
            toSet: function (set, wheres) {
                return h.extend(set, wheres);
            }
        })
    };
    var self = this;
    h.each(arguments, function (arg) {
        if (arg) {
            if (arg instanceof Translate) {
                self.translators[arg.clause] = arg;
            } else {
                h.extend(clauses[arg.constructor.type || 'where'], arg);
            }
        }
    });
};
Algebra.make = function (compare, count) {
    if (compare instanceof Algebra) {
        return compare;
    } else {
        return new Algebra(compare, count);
    }
};
h.extend(Algebra.prototype, {
    getClauseProperties: function (set, options) {
        options = options || {};
        var setClone = h.extend({}, set);
        var clauses = this.clauses;
        var checkClauses = [
                'order',
                'paginate'
            ];
        var clauseProps = {
                enabled: {
                    where: true,
                    order: false,
                    paginate: false
                }
            };
        if (options.omitClauses) {
            checkClauses = h.arrayUnionIntersectionDifference(checkClauses, options.omitClauses).difference;
        }
        h.each(checkClauses, function (clauseName) {
            var valuesForClause = {};
            var prop;
            for (prop in clauses[clauseName]) {
                if (prop in setClone) {
                    valuesForClause[prop] = setClone[prop];
                    delete setClone[prop];
                }
            }
            clauseProps[clauseName] = valuesForClause;
            clauseProps.enabled[clauseName] = !h.isEmptyObject(valuesForClause);
        });
        clauseProps.where = options.isProperties ? setClone : this.translators.where.fromSet(set, setClone);
        return clauseProps;
    },
    getDifferentClauseTypes: function (aClauses, bClauses) {
        var self = this;
        var differentTypes = [];
        h.each(clause.TYPES, function (type) {
            if (!self.evaluateOperator(compare.equal, aClauses[type], bClauses[type], { isProperties: true }, { isProperties: true })) {
                differentTypes.push(type);
            }
        });
        return differentTypes;
    },
    updateSet: function (set, clause, result, useSet) {
        if (result && typeof result === 'object' && useSet !== false) {
            if (this.translators[clause]) {
                set = this.translators.where.toSet(set, result);
            } else {
                set = h.extend(set, result);
            }
            return true;
        } else if (result) {
            return useSet === undefined ? undefined : false;
        } else {
            return false;
        }
    },
    evaluateOperator: function (operator, a, b, aOptions, bOptions) {
        aOptions = aOptions || {};
        bOptions = bOptions || {};
        var aClauseProps = this.getClauseProperties(a, aOptions), bClauseProps = this.getClauseProperties(b, bOptions), set = {}, useSet;
        var result = operator(aClauseProps.where, bClauseProps.where, undefined, undefined, undefined, this.clauses.where, {});
        useSet = this.updateSet(set, 'where', result, useSet);
        if (result && (aClauseProps.enabled.paginate || bClauseProps.enabled.paginate)) {
            if (aClauseProps.enabled.order || bClauseProps.enabled.order) {
                result = operator(aClauseProps.order, bClauseProps.order, undefined, undefined, undefined, this.clauses.order, {});
                useSet = this.updateSet(set, 'order', result, useSet);
            }
            if (result) {
                result = operator(aClauseProps.paginate, bClauseProps.paginate, undefined, undefined, undefined, this.clauses.paginate, {});
                useSet = this.updateSet(set, 'paginate', result, useSet);
            }
        }
        return result && useSet ? set : result;
    },
    equal: function (a, b) {
        return this.evaluateOperator(compare.equal, a, b);
    },
    subset: function (a, b) {
        var aClauseProps = this.getClauseProperties(a);
        var bClauseProps = this.getClauseProperties(b);
        var compatibleSort = true;
        var result;
        if ((aClauseProps.enabled.paginate || bClauseProps.enabled.paginate) && (aClauseProps.enabled.order || bClauseProps.enabled.order)) {
            compatibleSort = compare.equal(aClauseProps.order, bClauseProps.order, undefined, undefined, undefined, {}, {});
        }
        if (!compatibleSort) {
            result = false;
        } else {
            result = this.evaluateOperator(compare.subset, a, b);
        }
        return result;
    },
    properSubset: function (a, b) {
        return this.subset(a, b) && !this.equal(a, b);
    },
    difference: function (a, b) {
        var aClauseProps = this.getClauseProperties(a);
        var bClauseProps = this.getClauseProperties(b);
        var differentClauses = this.getDifferentClauseTypes(aClauseProps, bClauseProps);
        var result;
        switch (differentClauses.length) {
        case 0: {
                result = false;
                break;
            }
        case 1: {
                var clause = differentClauses[0];
                result = compare.difference(aClauseProps[clause], bClauseProps[clause], undefined, undefined, undefined, this.clauses[clause], {});
                if (this.translators[clause] && typeof result === 'object') {
                    result = this.translators[clause].toSet({}, result);
                }
                break;
            }
        }
        return result;
    },
    union: function (a, b) {
        return this.evaluateOperator(compare.union, a, b);
    },
    intersection: function (a, b) {
        return this.evaluateOperator(compare.intersection, a, b);
    },
    count: function (a) {
        return this.evaluateOperator(compare.count, a, {});
    },
    has: function (set, props) {
        var aClauseProps = this.getClauseProperties(set);
        var propsClauseProps = this.getClauseProperties(props, { isProperties: true });
        var compatibleSort = true;
        var result;
        if ((propsClauseProps.enabled.paginate || aClauseProps.enabled.paginate) && (propsClauseProps.enabled.order || aClauseProps.enabled.order)) {
            compatibleSort = compare.equal(propsClauseProps.order, aClauseProps.order, undefined, undefined, undefined, {}, {});
        }
        if (!compatibleSort) {
            result = false;
        } else {
            result = this.evaluateOperator(compare.subset, props, set, { isProperties: true }, undefined);
        }
        return result;
    }
});
module.exports = {
    Algebra: Algebra,
    Translate: Translate,
    difference: function (a, b, config) {
        return Algebra.make(config).difference(a, b);
    },
    equal: function (a, b, config) {
        return Algebra.make(config).equal(a, b);
    },
    subset: function (a, b, config) {
        return Algebra.make(config).subset(a, b);
    },
    properSubset: function (a, b, config) {
        return Algebra.make(config).properSubset(a, b);
    },
    union: function (a, b, config) {
        return Algebra.make(config).union(a, b);
    },
    intersection: function (a, b, config) {
        return Algebra.make(config).intersection(a, b);
    },
    count: function (a, config) {
        return Algebra.make(config).count(a);
    },
    has: function (set, props, config) {
        return Algebra.make(config).has(set, props);
    }
};