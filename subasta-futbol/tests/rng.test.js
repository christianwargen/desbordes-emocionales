'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var rng = require('../js/rng.js');

test('mismo seed produce la misma secuencia', function () {
  var a = rng.crearRng('semilla-1');
  var b = rng.crearRng('semilla-1');
  var valoresA = [a(), a(), a()];
  var valoresB = [b(), b(), b()];
  assert.deepEqual(valoresA, valoresB);
});

test('seeds distintas producen secuencias distintas', function () {
  var a = rng.crearRng('semilla-1');
  var b = rng.crearRng('semilla-2');
  assert.notEqual(a(), b());
});

test('crearRng acepta numero o string', function () {
  var a = rng.crearRng(42);
  assert.equal(typeof a(), 'number');
});

test('valores en [0, 1)', function () {
  var r = rng.crearRng('rango');
  for (var i = 0; i < 1000; i++) {
    var v = r();
    assert.ok(v >= 0 && v < 1, 'fuera de rango: ' + v);
  }
});

test('entero respeta el rango inclusive', function () {
  var r = rng.crearRng('entero');
  for (var i = 0; i < 500; i++) {
    var v = rng.entero(r, 1, 90);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 90);
  }
});

test('mezclar no pierde ni repite elementos', function () {
  var r = rng.crearRng('mezcla');
  var lista = [1, 2, 3, 4, 5, 6, 7, 8];
  var mezclada = rng.mezclar(r, lista);
  assert.deepEqual(mezclada.slice().sort(), lista.slice().sort());
});

test('ponderado favorece a los elementos de mayor peso', function () {
  var r = rng.crearRng('ponderado');
  var lista = [{ k: 'raro', p: 1 }, { k: 'comun', p: 99 }];
  var conteo = { raro: 0, comun: 0 };
  for (var i = 0; i < 2000; i++) {
    conteo[rng.ponderado(r, lista, function (x) { return x.p; }).k]++;
  }
  assert.ok(conteo.comun > conteo.raro * 10);
});
