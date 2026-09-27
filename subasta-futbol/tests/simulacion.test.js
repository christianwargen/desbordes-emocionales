'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var sim = require('../js/simulacion.js');
var rngMod = require('../js/rng.js');
var jugadores = require('../js/jugadores.js');

function porNombreCarta(nombre) {
  var j = jugadores.filter(function (x) { return x.nombreCarta === nombre; })[0];
  if (!j) throw new Error('no existe ' + nombre);
  return j;
}

function jugadorSintetico(id, over) {
  return Object.assign({ id: id, ovr: 75, ata: 75, cre: 75, def: 75, arq: 10, posicion: 'DEL' }, over);
}

function equipoA() {
  return [
    jugadorSintetico(1, { ovr: 90, ata: 90, cre: 70, def: 60, posicion: 'DEL' }),
    jugadorSintetico(2, { ovr: 85, ata: 60, cre: 85, def: 65, posicion: 'MED' }),
    jugadorSintetico(3, { ovr: 80, ata: 50, cre: 60, def: 85, posicion: 'DEF' }),
    jugadorSintetico(4, { ovr: 88, ata: 70, cre: 88, def: 70, posicion: 'MED' }),
  ];
}

function equipoB() {
  return [
    jugadorSintetico(5, { ovr: 78, ata: 72, cre: 60, def: 55, posicion: 'DEL' }),
    jugadorSintetico(6, { ovr: 76, ata: 55, cre: 72, def: 58, posicion: 'MED' }),
    jugadorSintetico(7, { ovr: 74, ata: 45, cre: 55, def: 78, posicion: 'DEF' }),
    jugadorSintetico(8, { ovr: 80, ata: 60, cre: 78, def: 62, posicion: 'MED' }),
  ];
}

function equiposIguales() {
  return [equipoA(), equipoA().map(function (j) { return Object.assign({}, j, { id: j.id + 100 }); })];
}

test('el resultado es deterministico dado el mismo seed', function () {
  var resA = sim.simularPartido(equipoA(), equipoB(), rngMod.crearRng('mismo-seed'));
  var resB = sim.simularPartido(equipoA(), equipoB(), rngMod.crearRng('mismo-seed'));
  assert.deepEqual(resA, resB);
});

test('goles coincide con la cantidad de eventos de gol de cada equipo', function () {
  for (var s = 0; s < 100; s++) {
    var res = sim.simularPartido(equipoA(), equipoB(), rngMod.crearRng('goles-' + s));
    var contados = [0, 0];
    res.eventos.forEach(function (e) { if (e.tipo === 'gol') contados[e.equipo]++; });
    assert.deepEqual(contados, res.goles, 'seed goles-' + s);
  }
});

test('con empate en los 90 hay alargue con gol de oro y, si nadie convierte, penales', function () {
  var huboAlargue = false;
  var huboPenales = false;
  for (var s = 0; s < 1500; s++) {
    var eq = equiposIguales();
    var res = sim.simularPartido(eq[0], eq[1], rngMod.crearRng('empate-' + s));
    assert.ok(res.ganador === 0 || res.ganador === 1);
    var golesNoventa = [0, 0];
    res.eventos.forEach(function (e) { if (e.tipo === 'gol' && !e.alargue) golesNoventa[e.equipo]++; });
    if (golesNoventa[0] !== golesNoventa[1]) {
      assert.equal(res.alargue, null, 'seed empate-' + s + ': no deberia haber alargue');
      assert.equal(res.penales, null);
      continue;
    }
    huboAlargue = true;
    assert.notEqual(res.alargue, null, 'seed empate-' + s + ': deberia haber alargue');
    var golesAlargue = res.eventos.filter(function (e) { return e.tipo === 'gol' && e.alargue; });
    assert.ok(golesAlargue.length <= 1, 'gol de oro: el alargue termina con el primer gol');
    res.eventos.forEach(function (e) { if (e.alargue) assert.ok(e.minuto >= 91 && e.minuto <= 120); });
    if (golesAlargue.length === 1) {
      assert.equal(res.alargue.golDeOro, golesAlargue[0].minuto);
      assert.equal(res.ganador, golesAlargue[0].equipo);
      assert.equal(res.penales, null);
    } else {
      huboPenales = true;
      assert.notEqual(res.penales, null, 'seed empate-' + s + ': sin gol de oro deberia haber penales');
      assert.notEqual(res.penales.resultado[0], res.penales.resultado[1]);
      assert.equal(res.ganador, res.penales.resultado[0] > res.penales.resultado[1] ? 0 : 1);
    }
  }
  assert.ok(huboAlargue, 'deberia haber habido al menos un alargue');
  assert.ok(huboPenales, 'deberia haber habido al menos una definicion por penales');
});

test('el arquero es el mismo para los dos equipos y los 4 juegan de campo', function () {
  var mA = sim.metricasEquipo(equipoA());
  var mB = sim.metricasEquipo(equipoB());
  assert.equal(mA.ARQ, sim.CONFIG_SIM.arqueroEstandar);
  assert.equal(mB.ARQ, sim.CONFIG_SIM.arqueroEstandar);
  assert.equal(mA.campo.length, 4);
});

test('los penales son pocos: menos del 8% de los partidos con equipos armados al azar', function () {
  var campo = jugadores.filter(function (j) { return j.posicion !== 'POR'; });
  var random = rngMod.crearRng('drafts-penales');
  var penales = 0;
  for (var s = 0; s < 3000; s++) {
    var mezcla = rngMod.mezclar(random, campo);
    var res = sim.simularPartido(mezcla.slice(0, 4), mezcla.slice(4, 8), rngMod.crearRng('pocos-penales-' + s));
    if (res.penales) penales++;
  }
  assert.ok(penales / 3000 < 0.08, (penales / 30).toFixed(1) + '% de penales');
});

test('probabilidadVictoria devuelve probabilidades que suman 1', function () {
  var probs = sim.probabilidadVictoria(equipoA(), equipoB(), 500, 'prob-test');
  assert.ok(Math.abs(probs[0] + probs[1] - 1) < 1e-9);
  assert.ok(probs[0] > probs[1], 'el equipo A es mejor, deberia ganar mas seguido');
});
