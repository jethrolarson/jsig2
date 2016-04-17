'use strict';

var Parsimmon = require('parsimmon');

var lexemes = require('./lexemes.js');
var AST = require('../ast.js');
var typeDefinition = require('./type-definition.js');
var typeLiteral = require('./type-literal.js');
var typeDeclaration = require('./type-declaration.js');
var join = require('./lib/join.js');
var typeFunction = require('./type-function.js');

var renamedLiteral = typeLiteral
    .chain(function captureOriginal(original) {
        return lexemes.asWord
            .then(typeLiteral)
            .map(function toRenamedLiteral(literal) {
                return AST.renamedLiteral(literal, original);
            });
    });

var importStatement = lexemes.importWord
    .then(lexemes.openCurlyBrace)
    .then(join(Parsimmon.alt(
        renamedLiteral,
        typeLiteral
    ), lexemes.comma))
    .chain(function captureLiteral(importLiterals) {
        return lexemes.closeCurlyBrace
            .then(lexemes.fromWord)
            .then(lexemes.quote)
            .then(lexemes.moduleName)
            .skip(lexemes.quote)
            .map(function toImport(identifier) {
                return AST.importStatement(identifier,
                    importLiterals);
            });
    });

var assignment = lexemes.assignmentIdentifier
    .chain(function captureIdentifier(identifier) {
        identifier = identifier.replace(/\\\-/g, '-');

        return lexemes.labelSeperator
            .then(typeDefinition)
            .map(function toAssignment(type) {
                return AST.assignment(identifier, type);
            });
    });

var commentStatement = lexemes.commentStart
    .then(lexemes.nonNewLine.many())
    .map(function comment(text) {
        return AST.comment('--' + text.join(''));
    });

var functionDeclaration = Parsimmon.seq(
    lexemes.identifier,
    typeFunction
).map(function createType(list) {
    var name = list[0];
    var type = list[1];

    return AST.typeDeclaration(name, type, []);
});

var statement = Parsimmon.alt(
    importStatement,
    assignment,
    typeDeclaration,
    functionDeclaration,
    commentStatement
);

module.exports = statement;
