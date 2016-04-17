'use strict';

var builtinTypes = require('./parser/builtin-types.js');

module.exports = {
    program: program,
    typeDeclaration: typeDeclaration,
    assignment: assignment,
    importStatement: importStatement,
    object: object,
    union: union,
    intersection: intersection,
    literal: literal,
    keyValue: keyValue,
    value: value,
    functionType: functionType,
    generic: generic,
    tuple: tuple,
    renamedLiteral: renamedLiteral,
    comment: comment
};

function program(statements) {
    return {
        type: 'program',
        statements: statements,
        _raw: null
    };
}

function typeDeclaration(identifier, typeExpression, generics) {
    return {
        type: 'typeDeclaration',
        identifier: identifier,
        typeExpression: typeExpression,
        generics: generics || [],
        _raw: null
    };
}

function assignment(identifier, typeExpression) {
    return {
        type: 'assignment',
        identifier: identifier,
        typeExpression: typeExpression,
        _raw: null
    };
}

function importStatement(dependency, types) {
    return {
        type: 'import',
        dependency: dependency,
        types: types,
        _raw: null
    };
}

function object(keyValues, label, opts) {
    opts = opts || {};
    if (!Array.isArray(keyValues)) {
        keyValues = Object.keys(keyValues)
            .reduce(function buildPairs(acc, key) {
                acc.push(keyValue(key, keyValues[key]));
                return acc;
            }, []);
    }

    return {
        type: 'object',
        keyValues: keyValues,
        label: label || null,
        optional: opts.optional || false,
        open: opts.open || false,
        brand: opts.brand || 'Object',
        _raw: null
    };
}

function union(unions, label, opts) {
    opts = opts || {};

    return {
        type: 'unionType',
        unions: unions,
        label: label || null,
        optional: opts.optional || false,
        _raw: null
    };
}

function intersection(intersections, label, opts) {
    opts = opts || {};

    return {
        type: 'intersectionType',
        intersections: intersections,
        label: label || null,
        optional: opts.optional || false,
        _raw: null
    };
}

function literal(name, builtin, opts) {
    opts = opts || {};
    if (typeof builtin === 'string') {
        opts.label = builtin;
        builtin = undefined;
    }

    if (name === 'Void') {
        name = 'void';
    }

    return {
        type: 'typeLiteral',
        name: name,
        builtin: builtin !== undefined ?
            builtin :
            Boolean(builtinTypes.indexOf(name) !== -1),
        label: opts.label || null,
        optional: opts.optional || false,
        _raw: null
    };
}

function keyValue(key, $value, opts) {
    opts = opts || {};
    return {
        type: 'keyValue',
        key: key,
        value: $value,
        optional: opts.optional || false,
        _raw: null
    };
}

function value(_value, name, label) {
    name = name ? name :
        _value === 'null' ? 'null' :
        _value === 'undefined' ? 'undefined' :
        /*istanbul ignore next */ 'unknown';

    return {
        type: 'valueLiteral',
        value: _value,
        name: name,
        label: label || null,
        optional: false,
        _raw: null
    };
}

function functionType(opts) {
    return {
        type: 'function',
        args: opts.args || [],
        result: opts.result,
        thisArg: opts.thisArg || null,
        label: opts.label || null,
        optional: opts.optional || false,
        generics: opts.generics || [],
        brand: opts.brand || 'Object',
        _raw: null
    };
}

function generic(astValue, generics, label) {
    return {
        type: 'genericLiteral',
        value: astValue,
        generics: generics,
        label: label || null,
        optional: false,
        _raw: null
    };
}

function tuple(values, label, opts) {
    opts = opts || {};
    return {
        type: 'tuple',
        values: values,
        label: label || null,
        optional: opts.optional || false,
        _raw: null
    };
}

function renamedLiteral(token, original, opts) {
    opts = opts || {};

    if (typeof token === 'string') {
        token = literal(token, false, opts);
    }

    if (typeof original === 'string') {
        original = literal(original);
    }

    return {
        type: 'renamedLiteral',
        name: token.name,
        builtin: token.builtin,
        optional: token.optional,
        label: token.label,
        original: original,
        _raw: null
    };
}

function comment(text) {
    return {
        type: 'comment',
        text: text,
        _raw: null
    };
}
