'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var subasta = require('../js/subasta.js');
var mercadoMod = require('../js/mercado.js');
var repartoMod = require('../js/reparto.js');
var rngMod = require('../js/rng.js');
var configMod = require('../js/config.js');
var jugadores = require('../js/jugadores.js');

var CONFIG = configMod.CONFIG;
var POR_ID = {};
jugadores.forEach(function (j) { POR_ID[j.id] = j; });

var NOMBRES = ['Ana', 'Juan', 'Sol', 'Leo', 'Mica', 'Tomi'];

function managers(n) {
  return NOMBRES.slice(0, n || 2).map(function (nombre, i) { return { id: i, nombre: nombre, color: '#fff' }; });
}

function partidoNuevo(seed, n) {
  var mazo = mercadoMod.generarMazo(seed || 'partido-test');
  return subasta.crearPartido({ numero: 1, managers: managers(n), abrePrimero: 0, seed: seed || 'partido-test', mazo: mazo });
}

test('crearPartido arranca con $20, plantel vacio y un mazo de 200 jugadores de campo', function () {
  var p = partidoNuevo();
  assert.equal(p.managers.length, 2);
  p.managers.forEach(function (m) {
    assert.equal(m.presupuesto, CONFIG.PRESUPUESTO);
    assert.deepEqual(m.plantel, []);
  });
  assert.equal(p.mazo.length, 200);
  assert.equal(new Set(p.mazo).size, 200);
  assert.ok(p.mazo.every(function (id) { return POR_ID[id].posicion !== 'POR'; }));
  assert.equal(subasta.estadoSubasta(p), 'esperandoLote');
});

test('pujaMaxima: ejemplos de la seccion 2.2', function () {
  var p = partidoNuevo();
  p.managers[0].presupuesto = 900;
  p.managers[0].plantel = ['x']; // 3 lugares libres
  assert.equal(subasta.pujaMaxima(p, 0), 700);
  p.managers[0].presupuesto = 850;
  p.managers[0].plantel = ['x', 'y']; // 2 lugares libres
  assert.equal(subasta.pujaMaxima(p, 0), 750);
  p.managers[0].presupuesto = 400;
  p.managers[0].plantel = [];
  assert.equal(subasta.pujaMaxima(p, 0), 100);
  p.managers[0].plantel = ['a', 'b', 'c', 'd'];
  assert.equal(subasta.pujaMaxima(p, 0), 0);
});

test('abrirLote saca al azar el proximo del mazo, sin dueño y arrancando en $1', function () {
  var p = subasta.abrirLote(partidoNuevo());
  assert.equal(subasta.estadoSubasta(p), 'pujando');
  assert.equal(p.lote.jugadorId, p.mazo[0]);
  assert.equal(p.lote.lider, null);
  assert.equal(p.lote.turno, 0);
  assert.equal(subasta.montoMinimo(p), 100);
  assert.equal(p.mazoPos, 1);
});

test('pujas de a $0,50: 1 -> 1,50 -> 2 y el que no sube pierde', function () {
  var p = subasta.abrirLote(partidoNuevo());
  var jugadorId = p.lote.jugadorId;
  p = subasta.pujar(p, 0, 100);
  assert.equal(p.lote.lider, 0);
  assert.equal(subasta.montoMinimo(p), 150);
  p = subasta.pujar(p, 1, 150);
  p = subasta.pujar(p, 0, 200);
  p = subasta.pasar(p, 1);
  assert.equal(p.lote, null);
  assert.deepEqual(p.managers[0].plantel, [jugadorId]);
  assert.equal(p.managers[0].presupuesto, 1800);
  assert.equal(p.lotes[0].precio, 200);
  assert.equal(p.abreProximo, 1, 'el proximo lote lo abre el otro');
});

test('no se puede pasar: el que abre tiene que pujar y todo jugador que sale se vende', function () {
  var p = subasta.abrirLote(partidoNuevo());
  assert.equal(subasta.puedePasar(p, 0), false);
  assert.throws(function () { subasta.pasar(p, 0); }, /tenés que abrir/);
  p = subasta.pujar(p, 0, 100);
  assert.equal(subasta.puedePasar(p, 1), true, 'con alguien ganando se puede no subir');
  p = subasta.pasar(p, 1);
  assert.equal(p.lotes.length, 1);
});

test('todos los casos ilegales tiran error', function () {
  var p0 = partidoNuevo();
  assert.throws(function () { subasta.pujar(p0, 0, 100); }, /No hay ningun lote/);
  var p = subasta.abrirLote(p0);
  assert.throws(function () { subasta.abrirLote(p); }, /No se puede sacar/);
  assert.throws(function () { subasta.pujar(p, 1, 100); }, /No es el turno/);
  assert.throws(function () { subasta.pasar(p, 1); }, /No es el turno/);
  assert.throws(function () { subasta.pasar(p, 0); }, /tenés que abrir/);
  assert.throws(function () { subasta.pujar(p, 0, 50); }, /al menos/);
  assert.throws(function () { subasta.pujar(p, 0, 120); }, /multiplo/);
  assert.throws(function () { subasta.pujar(p, 0, 1750); }, /puja maxima/);
  p = subasta.pujar(p, 0, 100);
  assert.throws(function () { subasta.pujar(p, 1, 100); }, /al menos/);
});

test('cierre automatico: al rival no le alcanza para superar', function () {
  var p = partidoNuevo();
  p.managers[1].presupuesto = 400; // 4 lugares libres -> puja maxima $1
  p = subasta.abrirLote(p);
  p = subasta.pujar(p, 0, 100);
  assert.equal(p.lote, null, 'Juan no puede superar $1, el lote se cierra solo');
  assert.equal(p.managers[0].plantel.length, 1);
});

test('cuando uno completa sus 4, el otro recibe un equipo parejo al azar', function () {
  var p = partidoNuevo('reparto-flujo');
  for (var i = 0; i < 4; i++) {
    p = subasta.abrirLote(p);
    if (p.lote.turno === 0) { p = subasta.pujar(p, 0, 100); p = subasta.pasar(p, 1); }
    else { p = subasta.pujar(p, 1, 100); p = subasta.pujar(p, 0, 150); p = subasta.pasar(p, 1); }
  }
  assert.equal(p.managers[0].plantel.length, 4);
  assert.equal(subasta.estadoSubasta(p), 'reparto');
  p = repartoMod.completarPartido(p, 'reparto-flujo:reparto');
  assert.equal(subasta.estadoSubasta(p), 'terminada');
  assert.equal(p.managers[1].plantel.length, 4);
  assert.equal(p.reparto.length, 1);
  assert.equal(p.reparto[0].manager, 1);
  assert.equal(p.managers[1].presupuesto, 1600, 'los asignados cuestan $1 cada uno');
  var todos = p.managers[0].plantel.concat(p.managers[1].plantel);
  assert.equal(new Set(todos).size, 8, 'nadie repetido');
});

test('deshacer revierte la ultima puja o el ultimo "no subo"', function () {
  var p = subasta.abrirLote(partidoNuevo());
  p = subasta.pujar(p, 0, 100);
  p = subasta.pujar(p, 1, 150);
  var d = subasta.deshacer(p);
  assert.equal(d.lote.precio, 100);
  assert.equal(d.lote.lider, 0);
  assert.equal(d.lote.turno, 1);
  // Con 3: Ana abre $1, Juan no sube, deshacer -> le vuelve a tocar a Juan
  var q = subasta.pujar(subasta.abrirLote(partidoNuevo('deshacer-3', 3)), 0, 100);
  q = subasta.pasar(q, 1);
  assert.equal(q.lote.turno, 2);
  var dq = subasta.deshacer(q);
  assert.equal(dq.lote.turno, 1);
  assert.deepEqual(dq.lote.fuera, []);
});

test('con 3 jugadores el turno rota y el que no sube queda afuera del lote', function () {
  var p = subasta.abrirLote(partidoNuevo('tres', 3));
  var jugadorId = p.lote.jugadorId;
  p = subasta.pujar(p, 0, 100);       // Ana abre $1
  assert.equal(p.lote.turno, 1);
  p = subasta.pasar(p, 1);            // Juan no sube
  assert.equal(p.lote.turno, 2);
  p = subasta.pujar(p, 2, 150);       // Sol $1,50
  assert.equal(p.lote.turno, 0, 'le toca a Ana, Juan ya quedo afuera');
  p = subasta.pasar(p, 0);            // Ana no sube
  assert.equal(p.lote, null);
  assert.deepEqual(p.managers[2].plantel, [jugadorId]);
  assert.equal(p.abreProximo, 1, 'el proximo lote lo abre el siguiente en la ronda');
});

test('con 3 jugadores: cuando uno completa, siguen los otros dos; al ultimo se le reparte', function () {
  var p = partidoNuevo('tres-reparto', 3);
  // Ana compra todo lo que puede hasta completar; los demas pasan si pueden.
  function jugarLote(quienCompra) {
    p = subasta.abrirLote(p);
    while (p.lote) {
      var t = p.lote.turno;
      if (t === quienCompra || !subasta.puedePasar(p, t)) p = subasta.pujar(p, t, subasta.montoMinimo(p));
      else p = subasta.pasar(p, t);
    }
  }
  while (p.managers[0].plantel.length < 4) jugarLote(0);
  assert.equal(subasta.estadoSubasta(p), 'esperandoLote', 'Juan y Sol siguen subastando');
  while (subasta.estadoSubasta(p) === 'esperandoLote') {
    var antes = p.managers[0].plantel.length;
    jugarLote(1);
    assert.equal(p.managers[0].plantel.length, antes, 'Ana ya completo, no juega mas lotes');
  }
  assert.equal(subasta.estadoSubasta(p), 'reparto');
  p = repartoMod.completarPartido(p, 'tres-reparto:reparto');
  assert.equal(p.reparto.length, 1);
  assert.equal(subasta.estadoSubasta(p), 'terminada');
  p.managers.forEach(function (m) { assert.equal(m.plantel.length, 4); });
});

test('propiedad: 2000 subastas al azar de 2 a 6 jugadores terminan siempre con todos en 4', function () {
  for (var s = 0; s < 2000; s++) {
    var rng = rngMod.crearRng('prop-' + s);
    var n = 2 + (s % 5);
    var p = partidoNuevo('prop-' + s, n);
    var pasos = 0;
    while (subasta.estadoSubasta(p) !== 'terminada') {
      assert.ok(pasos++ < 3000, 'seed prop-' + s + ': la subasta no termina');
      var estado = subasta.estadoSubasta(p);
      if (estado === 'esperandoLote') p = subasta.abrirLote(p);
      else if (estado === 'reparto') p = repartoMod.completarPartido(p, 'prop-' + s + ':reparto');
      else {
        var turno = p.lote.turno;
        var minimo = subasta.montoMinimo(p);
        var max = subasta.pujaMaxima(p, turno);
        var opciones = [minimo, minimo + 50, minimo + 150, max].filter(function (m) { return m >= minimo && m <= max; });
        var quierePasar = opciones.length === 0 || rng() < 0.5;
        if (quierePasar && subasta.puedePasar(p, turno)) p = subasta.pasar(p, turno);
        else if (!subasta.puedePasar(p, turno) && p.lote.lider !== null) throw new Error('deberia poder no subir');
        else p = subasta.pujar(p, turno, opciones[Math.floor(rng() * opciones.length)]);
      }
      p.managers.forEach(function (m) {
        var libres = CONFIG.TAMANO_PLANTEL - m.plantel.length;
        assert.ok(m.presupuesto % 50 === 0, 'presupuesto no multiplo de 50');
        assert.ok(m.presupuesto >= libres * CONFIG.PRECIO_INICIAL, 'invariante roto en seed prop-' + s);
      });
    }
    var todos = [];
    p.managers.forEach(function (m) {
      assert.equal(m.plantel.length, 4);
      var pagado = p.lotes.filter(function (l) { return l.ganador === m.id; }).reduce(function (a, l) { return a + l.precio; }, 0);
      assert.equal(pagado, CONFIG.PRESUPUESTO - m.presupuesto);
      todos = todos.concat(m.plantel);
    });
    assert.equal(new Set(todos).size, 4 * n);
    assert.ok(todos.every(function (id) { return POR_ID[id].posicion !== 'POR'; }));
  }
});
