'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var mercadoMod = require('../js/mercado.js');
var jugadores = require('../js/jugadores.js');

var byId = new Map(jugadores.map(function (j) { return [j.id, j]; }));

test('el mercado tiene 24 jugadores sin repetidos', function () {
  var ids = mercadoMod.generarMercado('m1');
  assert.equal(ids.length, 24);
  assert.equal(new Set(ids).size, 24);
});

test('composicion por categoria: 3 Leyenda, 4 Crack, 10 Estrella, 7 Figura', function () {
  for (var s = 0; s < 200; s++) {
    var ids = mercadoMod.generarMercado('cat-' + s);
    var conteo = { Leyenda: 0, Crack: 0, Estrella: 0, Figura: 0 };
    ids.forEach(function (id) { conteo[byId.get(id).categoria]++; });
    assert.deepEqual(conteo, { Leyenda: 3, Crack: 4, Estrella: 10, Figura: 7 }, 'seed cat-' + s);
  }
});

test('sin arqueros y con minimos por posicion: 4 DEF, 4 MED, 4 DEL', function () {
  for (var s = 0; s < 200; s++) {
    var ids = mercadoMod.generarMercado('pos-' + s);
    var conteo = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
    ids.forEach(function (id) { conteo[byId.get(id).posicion]++; });
    assert.equal(conteo.POR, 0, 'seed pos-' + s + ' no deberia haber arqueros en el mercado');
    assert.ok(conteo.DEF >= 4, 'seed pos-' + s + ' DEF=' + conteo.DEF);
    assert.ok(conteo.MED >= 4, 'seed pos-' + s + ' MED=' + conteo.MED);
    assert.ok(conteo.DEL >= 4, 'seed pos-' + s + ' DEL=' + conteo.DEL);
  }
});

test('mismo seed da el mismo mercado', function () {
  var a = mercadoMod.generarMercado('igual');
  var b = mercadoMod.generarMercado('igual');
  assert.deepEqual(a, b);
});

test('seeds distintas dan mercados distintos', function () {
  var a = mercadoMod.generarMercado('distinto-1');
  var b = mercadoMod.generarMercado('distinto-2');
  assert.notDeepEqual(a, b);
});
