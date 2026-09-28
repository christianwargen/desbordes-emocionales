'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var subasta = require('../js/subasta.js');
var mercadoMod = require('../js/mercado.js');
var repartoMod = require('../js/reparto.js');
var rngMod = require('../js/rng.js');
var jugadores = require('../js/jugadores.js');

var POR_ID = {};
jugadores.forEach(function (j) { POR_ID[j.id] = j; });
var CAMPO = jugadores.filter(function (j) { return j.posicion !== 'POR'; });

function managers() {
  return [{ id: 0, nombre: 'Ana', color: '#38BDF8' }, { id: 1, nombre: 'Juan', color: '#FB923C' }];
}

// Partido donde Ana ya tiene `idsAna` y Juan `idsJuan` (listo para el reparto).
function partidoCon(idsAna, idsJuan, seed) {
  var p = subasta.crearPartido({ numero: 1, managers: managers(), abrePrimero: 0, seed: seed, mazo: mercadoMod.generarMazo(seed) });
  p.managers[0].plantel = idsAna.slice();
  p.managers[1].plantel = idsJuan.slice();
  return p;
}

function fuerzaDe(ids) { return repartoMod.fuerza(ids.map(function (id) { return POR_ID[id]; })); }

function repartirVarios(cuantosTieneJuan, casos) {
  var dentro = 0;
  var sumaDif = 0;
  for (var s = 0; s < casos; s++) {
    var seed = 'parejo-' + cuantosTieneJuan + '-' + s;
    var mezcla = rngMod.mezclar(rngMod.crearRng(seed), CAMPO);
    var ana = mezcla.slice(0, 4).map(function (j) { return j.id; });
    var juan = mezcla.slice(4, 4 + cuantosTieneJuan).map(function (j) { return j.id; });
    var p = repartoMod.completarPartido(partidoCon(ana, juan, seed), seed + ':reparto');
    assert.equal(p.managers[1].plantel.length, 4);
    assert.deepEqual(p.managers[1].plantel.slice(0, juan.length), juan, 'se conservan los que ya tenia');
    var dif = Math.abs(fuerzaDe(p.managers[1].plantel) - fuerzaDe(ana));
    sumaDif += dif;
    if (dif <= 2) dentro++;
  }
  return { dentro: dentro / casos, promedio: sumaDif / casos };
}

test('si no compro a nadie, recibe 4 al azar parejos con el equipo del rival', function () {
  var r = repartirVarios(0, 300);
  assert.ok(r.dentro >= 0.97, (r.dentro * 100).toFixed(1) + '% dentro de la tolerancia');
  assert.ok(r.promedio < 1.5, 'diferencia promedio ' + r.promedio.toFixed(2));
});

test('si ya tenia algunos, se completa lo mas parejo posible', function () {
  [1, 2, 3].forEach(function (n) {
    var r = repartirVarios(n, 150);
    assert.ok(r.promedio < 3, 'con ' + n + ' comprados, diferencia promedio ' + r.promedio.toFixed(2));
  });
});

test('el reparto es deterministico dado el seed y no repite jugadores', function () {
  var ana = CAMPO.slice(0, 4).map(function (j) { return j.id; });
  var a = repartoMod.completarPartido(partidoCon(ana, [], 'det'), 'det:reparto');
  var b = repartoMod.completarPartido(partidoCon(ana, [], 'det'), 'det:reparto');
  assert.deepEqual(a.managers[1].plantel, b.managers[1].plantel);
  assert.equal(new Set(a.managers[0].plantel.concat(a.managers[1].plantel)).size, 8);
});

test('si se acaba el mazo con los dos incompletos, se completan los dos', function () {
  var p = partidoCon([], [], 'sin-mazo');
  p.mazoPos = p.mazo.length;
  assert.equal(subasta.estadoSubasta(p), 'reparto');
  p = repartoMod.completarPartido(p, 'sin-mazo:reparto');
  assert.equal(subasta.estadoSubasta(p), 'terminada');
});

test('con 4 jugadores, al ultimo se le reparte parejo con el promedio de los otros 3', function () {
  var mezcla = rngMod.mezclar(rngMod.crearRng('cuatro'), CAMPO);
  var equipos = [0, 1, 2].map(function (k) { return mezcla.slice(k * 4, k * 4 + 4).map(function (j) { return j.id; }); });
  var p = subasta.crearPartido({
    numero: 1, abrePrimero: 0, seed: 'cuatro', mazo: mercadoMod.generarMazo('cuatro'),
    managers: ['Ana', 'Juan', 'Sol', 'Leo'].map(function (n, i) { return { id: i, nombre: n, color: '#fff' }; }),
  });
  equipos.forEach(function (ids, i) { p.managers[i].plantel = ids; });
  var objetivo = repartoMod.fuerzaPromedioCompletos(p);
  p = repartoMod.completarPartido(p, 'cuatro:reparto');
  assert.equal(p.managers[3].plantel.length, 4);
  assert.ok(Math.abs(fuerzaDe(p.managers[3].plantel) - objetivo) <= 2);
});
