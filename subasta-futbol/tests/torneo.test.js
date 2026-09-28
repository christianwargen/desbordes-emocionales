'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var torneoMod = require('../js/torneo.js');

var NOMBRES = ['Ana', 'Juan', 'Sol', 'Leo', 'Mica', 'Tomi'];

function managers(n) {
  return NOMBRES.slice(0, n || 2).map(function (nombre, i) { return { id: i, nombre: nombre, color: '#fff' }; });
}

function puntos(t, id) { return t.managers.filter(function (m) { return m.id === id; })[0].puntos; }

// Juega una fecha entera: `gana(a, b)` decide el ganador (id) de cada cruce.
function jugarFecha(torneo, gana) {
  var t = torneoMod.prepararSiguientePartido(torneo);
  var resultados = torneoMod.crucesDeLaFecha(t).map(function (c) {
    var ganador = gana(c[0], c[1]);
    return { a: c[0], b: c[1], resultado: { ganador: ganador === c[0] ? 0 : 1, goles: ganador === c[0] ? [2, 1] : [1, 2] } };
  });
  return torneoMod.registrarFecha(t, resultados);
}

function siempreGana(id) {
  return function (a, b) { return a === id || b === id ? id : Math.min(a, b); };
}

test('cada victoria suma 10 puntos y se lleva la tabla', function () {
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 5, managers: managers(2), seed: 'suma' });
  t = jugarFecha(t, siempreGana(0));
  assert.equal(puntos(t, 0), 10);
  assert.equal(puntos(t, 1), 0);
  var ana = t.managers[0];
  assert.deepEqual([ana.pj, ana.pg, ana.gf, ana.gc], [1, 1, 2, 1]);
});

test('con 4 jugadores cada fecha es todos contra todos (6 partidos)', function () {
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 3, managers: managers(4), seed: 'rr' });
  t = torneoMod.prepararSiguientePartido(t);
  assert.equal(t.partidoActual.managers.length, 4);
  assert.equal(torneoMod.crucesDeLaFecha(t).length, 6);
  assert.deepEqual(torneoMod.cruces([0, 1, 2]), [[0, 1], [0, 2], [1, 2]]);
});

test('se puede elegir la cantidad de fechas: gana el de mas puntos al final', function () {
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 3, managers: managers(3), seed: 'tres' });
  for (var i = 0; i < 3; i++) {
    assert.equal(t.terminado, false);
    t = jugarFecha(t, siempreGana(2));
  }
  assert.equal(t.historial.length, 3);
  assert.equal(t.terminado, true);
  assert.equal(t.campeon, 2);
});

test('"Primero a 100": termina en la fecha en que alguien llega a 100', function () {
  var t = torneoMod.crearTorneo({ modo: 'primeroA100', managers: managers(2), seed: 'a100' });
  for (var i = 0; i < 9; i++) {
    t = jugarFecha(t, siempreGana(0));
    assert.equal(t.terminado, false, 'no deberia terminar en la fecha ' + (i + 1));
  }
  t = jugarFecha(t, siempreGana(0));
  assert.equal(t.terminado, true);
  assert.equal(t.campeon, 0);
});

test('empate arriba al final: fecha de desempate solo entre los empatados', function () {
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 2, managers: managers(3), seed: 'desempate' });
  // Fecha 1: gana todo 0 (y 1 le gana a 2). Fecha 2: gana todo 1 (y 0 le gana a 2). Quedan 0 y 1 con 30.
  t = jugarFecha(t, siempreGana(0));
  t = jugarFecha(t, siempreGana(1));
  assert.equal(t.terminado, false);
  assert.deepEqual(t.desempate, [0, 1]);
  t = torneoMod.prepararSiguientePartido(t);
  assert.deepEqual(t.partidoActual.managers.map(function (m) { return m.id; }), [0, 1], 'el desempate es solo entre los empatados');
  t = torneoMod.registrarFecha(t, [{ a: 0, b: 1, resultado: { ganador: 1, goles: [0, 1] } }]);
  assert.equal(t.terminado, true);
  assert.equal(t.campeon, 1);
  assert.equal(t.historial[2].desempate, true);
});

test('abre el primer lote el ultimo de la tabla', function () {
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 5, managers: managers(3), seed: 'abre' });
  t = jugarFecha(t, siempreGana(0)); // 0: 20 pts, 1: 10 pts (le gana a 2), 2: 0 pts
  t = torneoMod.prepararSiguientePartido(t);
  assert.equal(t.partidoActual.abreProximo, 2);
});

test('la cantidad de jugadores va de 2 a 6', function () {
  assert.throws(function () { torneoMod.crearTorneo({ modo: 'fechas', fechas: 3, managers: managers(1), seed: 'x' }); });
  assert.throws(function () {
    torneoMod.crearTorneo({ modo: 'fechas', fechas: 3, managers: managers(6).concat([{ id: 6, nombre: 'Z', color: '#fff' }]), seed: 'x' });
  });
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 3, managers: managers(6), seed: 'seis' });
  t = torneoMod.prepararSiguientePartido(t);
  assert.equal(torneoMod.crucesDeLaFecha(t).length, 15);
});

test('serializar y deserializar devuelve el mismo estado', function () {
  var t = torneoMod.crearTorneo({ modo: 'fechas', fechas: 4, managers: managers(3), seed: 'serial' });
  t = jugarFecha(t, siempreGana(1));
  var ida = JSON.parse(JSON.stringify(t));
  assert.deepEqual(ida, t);
});
