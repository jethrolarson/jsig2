'use strict';

var assert = require('assert');
var util = require('util');

var JsigAST = require('../ast/');
var cloneAST = require('./lib/clone-ast.js');

var moduleType = JsigAST.object({
    exports: JsigAST.literal('%Any%%ModuleExports', true)
});
moduleType.isNodeModuleToken = true;

module.exports = {
    GlobalScope: GlobalScope,
    FileScope: FileScope,
    FunctionScope: FunctionScope,
    BranchScope: BranchScope
};

function BaseScope(parent) {
    this.parent = parent;
    this.type = 'base';

    this.identifiers = Object.create(null);
    this.unknownIdentifiers = Object.create(null);
    this.typeRestrictions = Object.create(null);
    this.functionScopes = Object.create(null);
    this.currentAssignmentType = null;
    this.writableTokenLookup = false;
}

BaseScope.prototype.addVar =
function addVar(id, typeDefn) {
    assert(!this.identifiers[id], 'identifier must not exist');
    assert(typeDefn, 'addVar() must have typeDefn');
    assert(!typeDefn.optional, 'cannot add optional type');

    var token = {
        type: 'variable',
        defn: typeDefn
    };
    this.identifiers[id] = token;
    return token;
};

BaseScope.prototype.getVar = function getVar(id) {
    // console.log('getVar(', id, ',', this.writableTokenLookup, ')');
    if (this.writableTokenLookup) {
        return this.identifiers[id] || this.parent.getVar(id);
    }

    return this.typeRestrictions[id] || this.identifiers[id] ||
        this.parent.getVar(id);
};

BaseScope.prototype.enterAssignment =
function enterAssignment(leftType) {
    this.currentAssignmentType = leftType;
};

BaseScope.prototype.getAssignmentType =
function getAssignmentType() {
    return this.currentAssignmentType;
};

BaseScope.prototype.exitAssignment =
function exitAssignment() {
    this.currentAssignmentType = null;
};

BaseScope.prototype.getFunctionScope =
function getFunctionScope() {
    return null;
};

BaseScope.prototype.setWritableTokenLookup =
function setWritableTokenLookup() {
    this.writableTokenLookup = true;
};

BaseScope.prototype.unsetWritableTokenLookup =
function unsetWritableTokenLookup() {
    this.writableTokenLookup = false;
};

BaseScope.prototype.addUnknownVar =
function addUnknownVar(id) {
    var token = {
        type: 'unknown-variable'
    };
    this.unknownIdentifiers[id] = token;
    return token;
};

BaseScope.prototype.getUnknownVar =
function getUnknownVar(id) {
    return this.unknownIdentifiers[id];
};

BaseScope.prototype.forceUpdateVar =
function forceUpdateVar(id, typeDefn) {
    assert(this.identifiers[id], 'identifier must already exist');
    assert(typeDefn, 'cannot force update to null');

    var token = {
        type: 'variable',
        defn: typeDefn
    };
    this.identifiers[id] = token;
    return token;
};

BaseScope.prototype.updateRestriction =
function updateRestriction() {
};

BaseScope.prototype.getGlobalType =
function getGlobalType() {
    return this.parent.getGlobalType();
};

function GlobalScope() {
    this.type = 'global';

    this.identifiers = Object.create(null);
    this.operators = Object.create(null);
    this.virtualTypes = Object.create(null);
}

GlobalScope.prototype.getVar = function getVar(id) {
    return this.identifiers[id];
};

GlobalScope.prototype.getOperator = function getOperator(id) {
    return this.operators[id];
};

GlobalScope.prototype.getVirtualType = function getVirtualType(id) {
    return this.virtualTypes[id];
};

GlobalScope.prototype._addVar = function _addVar(id, typeDefn) {
    this.identifiers[id] = {
        type: 'variable',
        defn: typeDefn
    };
};
GlobalScope.prototype._addOperator = function _addOperator(id, typeDefn) {
    this.operators[id] = {
        type: 'operator',
        defn: typeDefn
    };
};
GlobalScope.prototype._addVirtualType = function _addVirtualType(id, typeDefn) {
    this.virtualTypes[id] = {
        type: 'virtual-type',
        defn: typeDefn
    };
};

GlobalScope.prototype.getGlobalType =
function getGlobalType() {
    var props = Object.keys(this.identifiers);
    var keyValues = {};

    for (var i = 0; i < props.length; i++) {
        keyValues[props[i]] = this.identifiers[props[i]].defn;
    }

    // console.log('?', keyValues);

    return JsigAST.object(keyValues);
};

GlobalScope.prototype.loadLanguageIdentifiers =
function loadLanguageIdentifiers() {
    this._addVar('Object', JsigAST.object({
        'create': JsigAST.functionType({
            args: [JsigAST.value('null')],
            result: JsigAST.literal('%Object%%Empty', true)
        }),
        'keys': JsigAST.functionType({
            args: [JsigAST.generic(
                JsigAST.literal('Object'),
                [JsigAST.literal('K'), JsigAST.literal('V')]
            )],
            result: JsigAST.generic(
                JsigAST.literal('Array'),
                [JsigAST.literal('String')]
            ),
            generics: [
                JsigAST.locationLiteral('K', ['args', 0, 'generics', 0]),
                JsigAST.locationLiteral('V', ['args', 0, 'generics', 1])
            ]
        })
    }));

    this._addVirtualType('TArray', JsigAST.object({
        'length': JsigAST.literal('Number'),
        'push': JsigAST.functionType({
            thisArg: JsigAST.generic(
                JsigAST.literal('Array'),
                [JsigAST.literal('T')]
            ),
            args: [JsigAST.literal('T')],
            result: JsigAST.literal('Number'),
            generics: [
                JsigAST.locationLiteral('T', ['thisArg', 'generics', 0]),
                JsigAST.locationLiteral('T', ['args', 0])
            ]
        }),
        'slice': JsigAST.functionType({
            thisArg: JsigAST.generic(
                JsigAST.literal('Array'),
                [JsigAST.literal('T')]
            ),
            args: [
                JsigAST.literal('Number'),
                JsigAST.literal('Number')
            ],
            result: JsigAST.generic(
                JsigAST.literal('Array'),
                [JsigAST.literal('T')]
            ),
            generics: [
                JsigAST.locationLiteral('T', ['thisArg', 'generics', 0]),
                JsigAST.locationLiteral('T', ['result', 'generics', 0])
            ]
        })
    }));
};

function FileScope(parent) {
    BaseScope.call(this, parent);
    this.type = 'file';

    this.untypedFunctions = Object.create(null);
    this.prototypes = Object.create(null);
}
util.inherits(FileScope, BaseScope);

FileScope.prototype.loadModuleTokens =
function loadModuleTokens() {
    this.addVar('module', moduleType);
    this.addVar('__dirname', JsigAST.literal('String'));
};

FileScope.prototype.addFunction =
function addFunction(id, node) {
    assert(!this.identifiers[id], 'cannot shadow identifier');

    this.untypedFunctions[id] = {
        type: 'untyped-function',
        node: node,
        currentScope: this
    };
};

FileScope.prototype.getFunction =
function getFunction(id) {
    return this.untypedFunctions[id] || null;
};

FileScope.prototype.updateFunction =
function updateFunction(id, typeDefn) {
    assert(this.untypedFunctions[id], 'function must exist already');
    this.untypedFunctions[id] = null;
    return this.addVar(id, typeDefn);
};

FileScope.prototype.addPrototypeField =
function addPrototypeField(id, fieldName, typeDefn) {
    if (!this.prototypes[id]) {
        this.prototypes[id] = {
            type: 'prototype',
            fields: {}
        };
    }

    this.prototypes[id].fields[fieldName] = typeDefn;
};

FileScope.prototype.addFunctionScope =
function addFunctionScope(funcScope) {
    assert(!this.functionScopes[funcScope.funcName],
        'cannot add function twice: ' + funcScope.funcName);

    this.functionScopes[funcScope.funcName] = {
        funcScope: funcScope,
        currentScope: this
    };
};

FileScope.prototype.getKnownFunctionInfo =
function getKnownFunctionInfo(funcName) {
    return this.functionScopes[funcName];
};

function FunctionScope(parent, funcName, funcNode) {
    BaseScope.call(this, parent);
    this.type = 'function';

    this.untypedFunctions = Object.create(null);

    this.funcName = funcName;
    this.returnValueType = null;
    this._thisValueType = null;
    this.funcType = null;
    this.isConstructor = /[A-Z]/.test(funcName[0]);

    this.knownFields = [];
    this.knownReturnType = null;
    this.returnStatementASTNode = null;
    this.funcASTNode = funcNode;
    this.writableTokenLookup = false;

    this.returnExpressionType = null;
}
util.inherits(FunctionScope, BaseScope);

FunctionScope.prototype.loadTypes =
function loadTypes(funcNode, typeDefn) {
    var len = Math.min(typeDefn.args.length, funcNode.params.length);

    for (var i = 0; i < len; i++) {
        var param = funcNode.params[i];
        var argType = typeDefn.args[i];

        if (argType.optional) {
            argType = cloneAST(argType);
            argType.optional = false;
            if (argType.label) {
                argType.label = argType.label.substr(0, argType.label - 1);
            }

            argType = JsigAST.union([
                argType, JsigAST.value('undefined')
            ]);
        }

        this.addVar(param.name, argType);
    }

    this._thisValueType = typeDefn.thisArg;
    this.returnValueType = typeDefn.result;
    this.funcType = typeDefn;
};

FunctionScope.prototype.getThisType =
function getThisType() {
    return this._thisValueType;
};

FunctionScope.prototype.addFunction = function addFunction(id, node) {
    assert(!this.identifiers[id], 'cannot shadow identifier');

    this.untypedFunctions[id] = {
        type: 'untyped-function',
        node: node,
        currentScope: this
    };
};

FunctionScope.prototype.getFunction = function getFunction(id) {
    return this.untypedFunctions[id] || this.parent.getFunction(id);
};

FunctionScope.prototype.updateFunction = function updateFunction(id, type) {
    var func = this.untypedFunctions[id];
    if (func) {
        this.untypedFunctions[id] = null;
        return this.addVar(id, type);
    }

    return this.parent.updateFunction(id, type);
};

FunctionScope.prototype.getPrototypeFields =
function getPrototypeFields() {
    var parent = this.parent;
    while (parent.type === 'function') {
        parent = parent.parent;
    }

    var p = parent.prototypes[this.funcName];
    if (!p) {
        return null;
    }

    return p.fields;
};

FunctionScope.prototype.addKnownField =
function addKnownField(fieldName) {
    if (this.knownFields.indexOf(fieldName) === -1) {
        this.knownFields.push(fieldName);
    }
};

FunctionScope.prototype.markReturnType =
function markReturnType(defn, node) {
    this.knownReturnType = defn;
    this.returnStatementASTNode = node;
};

FunctionScope.prototype.getFunctionScope =
function getFunctionScope() {
    return this;
};

FunctionScope.prototype.restrictType = function restrictType(id, type) {
    // TODO: gaurd against weird restrictions? ...
    assert(!this.typeRestrictions[id], 'cannot double restrict type: ' + id);
    assert(id !== 'this', 'cannot restrict this');
    assert(type, 'cannot restrictType to null');

    this.typeRestrictions[id] = {
        type: 'restriction',
        defn: type
    };
};

FunctionScope.prototype.enterReturnStatement =
function enterReturnStatement(type) {
    this.returnExpressionType = type;
};

FunctionScope.prototype.getReturnExpressionType =
function getReturnExpressionType() {
    return this.returnExpressionType;
};

FunctionScope.prototype.exitReturnStatement =
function exitReturnStatement() {
    this.returnExpressionType = null;
};

FunctionScope.prototype.addFunctionScope =
function addFunctionScope(funcScope) {
    assert(!this.functionScopes[funcScope.funcName],
        'cannot add function twice: ' + funcScope.funcName);

    this.functionScopes[funcScope.funcName] = {
        funcScope: funcScope,
        currentScope: this
    };
};

FunctionScope.prototype.getKnownFunctionInfo =
function getKnownFunctionInfo(funcName) {
    return this.functionScopes[funcName] ||
        this.parent.getKnownFunctionInfo(funcName);
};

function BranchScope(parent) {
    BaseScope.call(this, parent);
    this.type = 'branch';

    this._restrictedThisValueType = null;
}
util.inherits(BranchScope, BaseScope);

BranchScope.prototype.getThisType =
function getThisType() {
    return this._restrictedThisValueType || this.parent.getThisType();
};

BranchScope.prototype.getFunctionScope =
function getFunctionScope() {
    var parent = this.parent;
    while (parent && parent.type !== 'function') {
        parent = parent.parent;
    }

    return parent;
};

BranchScope.prototype.updateRestriction =
function updateRestriction(id, typeDefn) {
    var restriction = this.typeRestrictions[id];
    if (!restriction) {
        return;
    }

    this.typeRestrictions[id] = {
        type: 'restriction',
        defn: typeDefn
    };
};

BranchScope.prototype.getFunction =
function getFunction(id) {
    return this.parent.getFunction(id);
};

BranchScope.prototype.updateFunction =
function updateFunction(id, defn) {
    return this.parent.updateFunction(id, defn);
};

BranchScope.prototype.restrictType = function restrictType(id, type) {
    // TODO: gaurd against weird restrictions? ...
    // assert(!this.typeRestrictions[id], 'cannot double restrict type: ' + id);

    assert(type, 'cannot restrict to null');
    if (id === 'this') {
        this._restrictedThisValueType = type;
        return;
    }

    this.typeRestrictions[id] = {
        type: 'restriction',
        defn: type
    };
};

BranchScope.prototype.enterReturnStatement =
function enterReturnStatement(type) {
    return this.parent.enterReturnStatement(type);
};

BranchScope.prototype.getReturnExpressionType =
function getReturnExpressionType() {
    return this.parent.getReturnExpressionType();
};

BranchScope.prototype.exitReturnStatement =
function exitReturnStatement() {
    this.parent.exitReturnStatement();
};

BranchScope.prototype.getKnownFunctionInfo =
function getKnownFunctionInfo(funcName) {
    return this.parent.getKnownFunctionInfo(funcName);
};
