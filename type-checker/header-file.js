'use strict';

var assert = require('assert');
var path = require('path');
var TypedError = require('error/typed');

var JsigASTReplacer = require('./lib/jsig-ast-replacer.js');
var cloneJSIG = require('./lib/clone-ast.js');

var UnknownLiteralError = TypedError({
    type: 'jsig.header-file.unknown-literal',
    message: 'Could not resolve {literal}',
    literal: null
});

module.exports = HeaderFile;

function HeaderFile(checker, jsigAst, fileName) {
    this.checker = checker;
    this.fileName = fileName;
    this.folderName = path.dirname(fileName);
    this.rawJsigAst = jsigAst;
    this.resolvedJsigAst = null;

    this.indexTable = Object.create(null);
    this.errors = [];
    this.astReplacer = new JsigASTReplacer(this);
}

HeaderFile.prototype.replace = function replace(ast, rawAst) {
    if (ast.type === 'typeLiteral') {
        return this.replaceTypeLiteral(ast, rawAst);
    } else if (ast.type === 'import') {
        return this.replaceImport(ast, rawAst);
    } else if (ast.type === 'genericLiteral') {
        return this.replaceGenericLiteral(ast, rawAst);
    } else {
        assert(false, 'unexpected ast.type: ' + ast.type);
    }
};

HeaderFile.prototype.getToken =
function getToken(name) {
    return this.indexTable[name];
};

/*eslint dot-notation: 0*/
HeaderFile.prototype.replaceTypeLiteral =
function replaceTypeLiteral(ast, rawAst) {
    var name = ast.name;

    if (name === 'Error' && !this.indexTable['Error']) {
        this.checker.loadJavaScriptIntoIndexTable(this.indexTable);
    }

    var typeDefn = this.indexTable[name];
    if (!typeDefn) {
        this.errors.push(UnknownLiteralError({
            literal: name
        }));
        return null;
    }
    typeDefn = cloneJSIG(typeDefn);

    typeDefn.label = ast.label;
    typeDefn.optional = ast.optional;
    typeDefn._raw = rawAst;

    return typeDefn;
};

HeaderFile.prototype.replaceGenericLiteral =
function replaceGenericLiteral(ast, rawAst) {
    var name = ast.value.name;

    var typeDefn = this.indexTable[name];
    if (!typeDefn) {
        this.errors.push(UnknownLiteralError({
            literal: name
        }));
        return null;
    }
    typeDefn = cloneJSIG(typeDefn);

    typeDefn.label = ast.label;
    typeDefn.optional = ast.optional;
    typeDefn._raw = rawAst;

    return typeDefn;
};

HeaderFile.prototype.replaceImport =
function replaceImport(ast, rawAst) {
    var depPath = ast.dependency;
    var fileName = resolvePath(depPath, this.folderName);

    var otherHeader = this.checker.getOrCreateHeaderFile(fileName);
    if (!otherHeader) {
        return ast;
    }

    for (var i = 0; i < ast.types.length; i++) {
        var t = ast.types[i];
        assert(t.type === 'typeLiteral', 'expected typeLiteral');

        assert(otherHeader.indexTable[t.name],
            'expected token to be defined in other header');

        this.addToken(t.name, otherHeader.indexTable[t.name]);
    }

    return ast;
    // Find another HeaderFile instance for filePath
    // Then reach into indexTable and grab tokens
    // Copy tokens into local index table
};

function resolvePath(possiblePath, dirname) {
    if (possiblePath[0] === path.sep) {
        // is absolute path
        return possiblePath;
    } else if (possiblePath[0] === '.') {
        // is relative path
        return path.resolve(dirname, possiblePath);
    } else {
        // require lookup semantics...
        assert(false, 'node_modules lookup not implemented');
    }
}

HeaderFile.prototype.addToken =
function addToken(token, defn) {
    assert(!this.indexTable[token], 'cannot double add token');
    this.indexTable[token] = defn;
};

HeaderFile.prototype.resolveReferences =
function resolveReferences() {
    if (this.resolvedJsigAst) {
        return;
    }

    var ast = this.rawJsigAst;
    var copyAst = JSON.parse(JSON.stringify(ast));

    for (var i = 0; i < copyAst.statements.length; i++) {
        var line = copyAst.statements[i];

        if (line.type === 'typeDeclaration') {
            this.addToken(line.identifier, line.typeExpression);
        }
    }

    copyAst = this.astReplacer.inlineReferences(copyAst, ast);

    this.resolvedJsigAst = copyAst;
};

HeaderFile.prototype.getResolvedAssignments =
function getResolvedAssignments() {
    this.resolveReferences();

    if (!this.resolvedJsigAst) {
        return null;
    }

    var statements = [];
    for (var i = 0; i < this.resolvedJsigAst.statements.length; i++) {
        if (this.resolvedJsigAst.statements[i].type === 'assignment') {
            statements.push(this.resolvedJsigAst.statements[i]);
        }
    }

    return statements;
};
