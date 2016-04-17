'use strict';

var assert = require('assert');
var Parsimmon = require('parsimmon');

var lexemes = require('./lexemes.js');
var AST = require('../ast.js');
var typeFunction = require('./type-function.js');

var constrFunction = lexemes.newWord
    .then(typeFunction)
    .map(function fixUpFunction(func) {
        var thisArg = func.result;

        assert(!func.thisArg, 'duplicate this arg');
        func.result = AST.literal('void');
        func.thisArg = thisArg;

        return func;
    });

module.exports = Parsimmon.alt(
    typeFunction,
    constrFunction
);
