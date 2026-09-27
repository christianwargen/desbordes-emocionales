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

function managers() {
  return [
    { id: 0, nombre: 'Ana', color: '#38BDF8' },
    { id: 1, nombre: 'Juan', color: '#FB923C' },
  ];
}

function partidoNuevo(seed) {
  var mazo = mercadoMod.generarMazo(seed || 'partido-test');
  return subasta.crearPartido({ numero: 1, managers: managers(), abrePrimero: 0, seed: seed || 'partido-test', mazo: mazo });
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

test('pujas de a $0,50: 1 -> 1,50 -> 2 y el que pasa pierde', function () {
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

test('si los dos pasan sin pujar, el jugador se descarta', function () {
  var p = subasta.abrirLote(partidoNuevo());
  var jugadorId = p.lote.jugadorId;
  p = subasta.pasar(p, 0);
  assert.equal(p.lote.turno, 1);
  p = subasta.pasar(p, 1);
  assert.equal(p.lote, null);
  assert.deepEqual(p.descartados, [jugadorId]);
  assert.equal(p.managers[0].plantel.length + p.managers[1].plantel.length, 0);
  assert.equal(subasta.estadoSubasta(p), 'esperandoLote');
});

test('si el primero pasa y el segundo puja, se lo lleva al toque', function () {
  var p = subasta.abrirLote(partidoNuevo());
  var jugadorId = p.lote.jugadorId;
  p = subasta.pasar(p, 0);
  p = subasta.pujar(p, 1, 100);
  assert.equal(p.lote, null);
  assert.deepEqual(p.managers[1].plantel, [jugadorId]);
  assert.equal(p.managers[1].presupuesto, 1900);
});

test('todos los casos ilegales tiran error', function () {
  var p0 = partidoNuevo();
  assert.throws(function () { subasta.pujar(p0, 0, 100); }, /No hay ningun lote/);
  var p = subasta.abrirLote(p0);
  assert.throws(function () { subasta.abrirLote(p); }, /No se puede sacar/);
  assert.throws(function () { subasta.pujar(p, 1, 100); }, /No es el turno/);
  assert.throws(function () { subasta.pasar(p, 1); }, /No es el turno/);
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
    else { p = subasta.pasar(p, 1); p = subasta.pujar(p, 0, 100); }
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

test('deshacer revierte la ultima puja o el ultimo paso', function () {
  var p = subasta.abrirLote(partidoNuevo());
  p = subasta.pujar(p, 0, 100);
  p = subasta.pujar(p, 1, 150);
  var d = subasta.deshacer(p);
  assert.equal(d.lote.precio, 100);
  assert.equal(d.lote.lider, 0);
  assert.equal(d.lote.turno, 1);
  var q = subasta.pasar(subasta.abrirLote(partidoNuevo()), 0);
  var dq = subasta.deshacer(q);
  assert.equal(dq.lote.turno, 0);
  assert.deepEqual(dq.lote.pasaron, []);
});

test('propiedad: 2000 subastas con acciones legales al azar terminan siempre en 4 y 4', function () {
  for (var s = 0; s < 2000; s++) {
    var rng = rngMod.crearRng('prop-' + s);
    var p = partidoNuevo('prop-' + s);
    var pasos = 0;
    while (subasta.estadoSubasta(p) !== 'terminada') {
      assert.ok(pasos++ < 2000, 'seed prop-' + s + ': la subasta no termina');
      var estado = subasta.estadoSubasta(p);
      if (estado === 'esperandoLote') p = subasta.abrirLote(p);
      else if (estado === 'reparto') p = repartoMod.completarPartido(p, 'prop-' + s + ':reparto');
      else {
        var turno = p.lote.turno;
        var minimo = subasta.montoMinimo(p);
        var max = subasta.pujaMaxima(p, turno);
        var opciones = [minimo, minimo + 50, minimo + 150, max].filter(function (m) { return m >= minimo && m <= max; });
        if (opciones.length === 0 || rng() < 0.45) p = subasta.pasar(p, turno);
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
    assert.equal(new Set(todos).size, 8);
    assert.ok(todos.every(function (id) { return POR_ID[id].posicion !== 'POR'; }));
  }
});
