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
    jugadorSintetico(4, { ovr: 88, ata: 10, cre: 20, def: 20, arq: 88, posicion: 'POR' }),
  ];
}

function equipoB() {
  return [
    jugadorSintetico(5, { ovr: 78, ata: 72, cre: 60, def: 55, posicion: 'DEL' }),
    jugadorSintetico(6, { ovr: 76, ata: 55, cre: 72, def: 58, posicion: 'MED' }),
    jugadorSintetico(7, { ovr: 74, ata: 45, cre: 55, def: 78, posicion: 'DEF' }),
    jugadorSintetico(8, { ovr: 80, ata: 10, cre: 20, def: 20, arq: 80, posicion: 'POR' }),
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

test('con empate en los 90 siempre hay penales y un ganador', function () {
  var huboPenales = false;
  for (var s = 0; s < 400; s++) {
    var eq = equiposIguales();
    var res = sim.simularPartido(eq[0], eq[1], rngMod.crearRng('empate-' + s));
    assert.ok(res.ganador === 0 || res.ganador === 1);
    if (res.goles[0] === res.goles[1]) {
      huboPenales = true;
      assert.notEqual(res.penales, null, 'seed empate-' + s + ': deberia haber penales');
      assert.notEqual(res.penales.resultado[0], res.penales.resultado[1]);
      var golesPenal = res.ganador === 0 ? res.penales.resultado[0] > res.penales.resultado[1] : res.penales.resultado[1] > res.penales.resultado[0];
      assert.ok(golesPenal);
    } else {
      assert.equal(res.penales, null, 'seed empate-' + s + ': no deberia haber penales');
    }
  }
  assert.ok(huboPenales, 'en 400 partidos entre equipos iguales deberia haber habido al menos un empate');
});

test('un equipo sin arquero pierde claramente contra el mismo equipo con arquero (>=75% en 2000)', function () {
  var conArquero = [porNombreCarta('Yashin'), porNombreCarta('Messi'), porNombreCarta('Pelé'), porNombreCarta('Maradona')];
  var sinArquero = [porNombreCarta('Cruyff'), porNombreCarta('Messi'), porNombreCarta('Pelé'), porNombreCarta('Maradona')];
  var probs = sim.probabilidadVictoria(conArquero, sinArquero, 2000, 'sin-arquero-test');
  assert.ok(probs[0] >= 0.75, 'el equipo con arquero gano ' + (probs[0] * 100).toFixed(1) + '%, se esperaba >=75%');
});

test('metricasEquipo elige arquero por mayor arq (desempate menor ovr)', function () {
  var equipo = equipoA();
  var m = sim.metricasEquipo(equipo);
  assert.equal(m.arquero.id, 4);
  assert.equal(m.campo.length, 3);
});

test('sin arquero, ataja el de campo de menor OVR (el crack sigue jugando)', function () {
  var jugadores = require('../js/jugadores.js');
  var porNombre = function (n) { return jugadores.filter(function (j) { return j.nombreCarta === n; })[0]; };
  var equipo = [porNombre('Messi'), porNombre('Maradona'), porNombre('Pelé'), porNombre('Caniggia')];
  var m = sim.metricasEquipo(equipo);
  assert.equal(m.arquero.nombreCarta, 'Caniggia');
  assert.ok(m.campo.some(function (j) { return j.nombreCarta === 'Messi'; }));
});

test('probabilidadVictoria devuelve probabilidades que suman 1', function () {
  var probs = sim.probabilidadVictoria(equipoA(), equipoB(), 500, 'prob-test');
  assert.ok(Math.abs(probs[0] + probs[1] - 1) < 1e-9);
  assert.ok(probs[0] > probs[1], 'el equipo A es mejor, deberia ganar mas seguido');
});
