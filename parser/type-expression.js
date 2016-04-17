'use strict';

var Parsimmon = require('parsimmon');

var lexemes = require('./lexemes.js');
var typeLiteral = require('./type-literal.js');
var typeGeneric = require('./type-generic.js');
var AST = require('../ast.js');
var valueLiteral = require('./value-literal.js');

var arrayType = Parsimmon.seq(
    typeLiteral,
    lexemes.openSquareBrace,
    lexemes.closeSquareBrace
).map(function buildArrayType(list) {
    var type = list[0];

    return AST.generic(AST.literal('Array'), [type]);
});

var typeOrValueLiteral = Parsimmon.alt(
    valueLiteral,
    arrayType,
    typeGeneric
);

module.exports = typeOrValueLiteral;
