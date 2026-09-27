'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var torneoMod = require('../js/torneo.js');

function managers() {
  return [
    { id: 0, nombre: 'Ana', color: '#38BDF8' },
    { id: 1, nombre: 'Juan', color: '#FB923C' },
  ];
}

function jugarPartido(torneo, ganadorIdx) {
  var t = torneoMod.prepararSiguientePartido(torneo);
  return torneoMod.registrarResultado(t, { ganador: ganadorIdx, goles: [1, 0] });
}

test('el ganador suma 10 puntos', function () {
  var t = torneoMod.crearTorneo({ modo: 'primeroA100', managers: managers(), seed: 'suma' });
  t = jugarPartido(t, 0);
  assert.equal(t.managers.filter(function (m) { return m.id === 0; })[0].puntos, 10);
  assert.equal(t.managers.filter(function (m) { return m.id === 1; })[0].puntos, 0);
});

test('fin de torneo "Primero a 100": termina cuando alguien llega a 100', function () {
  var t = torneoMod.crearTorneo({ modo: 'primeroA100', managers: managers(), seed: 'a100' });
  for (var i = 0; i < 9; i++) {
    t = jugarPartido(t, 0);
    assert.equal(t.terminado, false, 'no deberia terminar en el partido ' + (i + 1));
  }
  t = jugarPartido(t, 0); // partido 10: 100 puntos
  assert.equal(t.terminado, true);
  assert.equal(t.campeon, 0);
});

test('fin de torneo "10 partidos": gana quien tenga mas puntos', function () {
  var t = torneoMod.crearTorneo({ modo: 'diezPartidos', managers: managers(), seed: 'diez' });
  for (var i = 0; i < 6; i++) t = jugarPartido(t, 0);
  for (var j = 0; j < 4; j++) t = jugarPartido(t, 1);
  assert.equal(t.historial.length, 10);
  assert.equal(t.terminado, true);
  assert.equal(t.campeon, 0);
});

test('fin de torneo "10 partidos": desempate 50-50 juega un partido extra', function () {
  var t = torneoMod.crearTorneo({ modo: 'diezPartidos', managers: managers(), seed: 'empate50' });
  for (var i = 0; i < 5; i++) t = jugarPartido(t, 0);
  for (var j = 0; j < 5; j++) t = jugarPartido(t, 1);
  assert.equal(t.historial.length, 10);
  assert.equal(t.terminado, false);
  assert.equal(t.desempatePendiente, true);
  // partido de desempate: gane quien gane, define campeon
  t = jugarPartido(t, 1);
  assert.equal(t.terminado, true);
  assert.equal(t.campeon, 1);
});

test('abre el primer lote el que perdio el partido anterior', function () {
  var t = torneoMod.crearTorneo({ modo: 'primeroA100', managers: managers(), seed: 'abre' });
  t = torneoMod.prepararSiguientePartido(t);
  var primeroEnAbrir = t.partidoActual.abreProximo;
  t = torneoMod.registrarResultado(t, { ganador: primeroEnAbrir === 0 ? 1 : 0, goles: [1, 0] });
  // el perdedor del partido 1 es quien abrio, entonces abre de nuevo en el 2
  t = torneoMod.prepararSiguientePartido(t);
  assert.equal(t.partidoActual.abreProximo, primeroEnAbrir);
});

test('serializar y deserializar devuelve el mismo estado', function () {
  var t = torneoMod.crearTorneo({ modo: 'primeroA100', managers: managers(), seed: 'serial' });
  t = torneoMod.prepararSiguientePartido(t);
  t = torneoMod.registrarResultado(t, { ganador: 0, goles: [2, 1] });
  var ida = JSON.parse(JSON.stringify(t));
  assert.deepEqual(ida, t);
});
