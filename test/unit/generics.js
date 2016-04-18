'use strict';

var JSIGSnippet = require('../lib/jsig-snippet.js');

JSIGSnippet.test('allow untyped arrays', function m() {/*
    var foo = ["foo"];
    foo.push("bar");

    var isStr = "";
    isStr = foo[0];
*/}, function t(snippet, assert) {
    snippet.compileAndCheck(assert);
    assert.end();
});

JSIGSnippet.test('generics disallow multiple types', function m() {/*
    var foo = [];

    foo.push("bar");
    foo.push(4)
*/}, function t(snippet, assert) {
    var meta = snippet.compile();
    assert.equal(meta.errors.length, 1, 'expected one error');

    var err = meta.errors[0];
    assert.equal(err.type, 'jsig.sub-type.type-class-mismatch');
    assert.equal(err.line, 4);
    assert.equal(err.expected, 'String');
    assert.equal(err.actual, 'Number');

    assert.end();
});

    // console.log('wat', snippet.programMeta.errors);
