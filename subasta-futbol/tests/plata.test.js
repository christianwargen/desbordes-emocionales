'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var config = require('../js/config.js');

test('formatearPlata formatea en pesos es-AR', function () {
  assert.equal(config.formatearPlata(100), '$1');
  assert.equal(config.formatearPlata(150), '$1,50');
  assert.equal(config.formatearPlata(1250), '$12,50');
  assert.equal(config.formatearPlata(2000), '$20');
  assert.equal(config.formatearPlata(0), '$0');
  assert.equal(config.formatearPlata(50), '$0,50');
});

test('CONFIG trae las constantes de plata en centavos', function () {
  assert.equal(config.CONFIG.PRESUPUESTO, 2000);
  assert.equal(config.CONFIG.PRECIO_INICIAL, 100);
  assert.equal(config.CONFIG.INCREMENTO, 50);
  assert.equal(config.CONFIG.TAMANO_PLANTEL, 4);
});
