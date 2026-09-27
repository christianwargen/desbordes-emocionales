'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var subasta = require('../js/subasta.js');
var mercadoMod = require('../js/mercado.js');
var rngMod = require('../js/rng.js');
var configMod = require('../js/config.js');

var CONFIG = configMod.CONFIG;

function managers() {
  return [
    { id: 0, nombre: 'Ana', color: '#38BDF8' },
    { id: 1, nombre: 'Juan', color: '#FB923C' },
  ];
}

function partidoNuevo(seed) {
  var ids = mercadoMod.generarMercado(seed || 'partido-test');
  return subasta.crearPartido({ numero: 1, managers: managers(), nominaPrimero: 0, seed: seed || 'partido-test', mercado: ids });
}

test('crearPartido arranca con $20, plantel vacio y el mercado dado', function () {
  var p = partidoNuevo();
  assert.equal(p.managers.length, 2);
  p.managers.forEach(function (m) {
    assert.equal(m.presupuesto, CONFIG.PRESUPUESTO);
    assert.deepEqual(m.plantel, []);
  });
  assert.equal(p.mercado.length, 24);
  assert.equal(subasta.estadoSubasta(p), 'nominando');
});

test('pujaMaxima: ejemplos de la seccion 2.2', function () {
  var p = partidoNuevo();
  // $9 y 3 lugares libres -> puja maxima $7
  p.managers[0].presupuesto = 900;
  p.managers[0].plantel = ['x']; // 3 lugares libres
  assert.equal(subasta.pujaMaxima(p, 0), 700);
  // $8,50 y 2 lugares libres -> puja maxima $7,50
  p.managers[0].presupuesto = 850;
  p.managers[0].plantel = ['x', 'y']; // 2 lugares libres
  assert.equal(subasta.pujaMaxima(p, 0), 750);
  // $4 y 4 lugares libres -> puja maxima $1 (puede nominar, nunca superar)
  p.managers[0].presupuesto = 400;
  p.managers[0].plantel = [];
  assert.equal(subasta.pujaMaxima(p, 0), 100);
  // plantel completo -> puja maxima 0
  p.managers[0].plantel = ['a', 'b', 'c', 'd'];
  assert.equal(subasta.pujaMaxima(p, 0), 0);
});

test('nominar abre el lote en $1 con el nominador como lider', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  var p2 = subasta.nominar(p, 0, jugadorId);
  assert.equal(subasta.estadoSubasta(p2), 'pujando');
  assert.equal(p2.lote.jugadorId, jugadorId);
  assert.equal(p2.lote.precio, 100);
  assert.equal(p2.lote.lider, 0);
  assert.equal(p2.lote.turno, 1);
  assert.deepEqual(p2.lote.pujas, [{ manager: 0, monto: 100 }]);
});

test('subir de a $0,50 funciona: 1 -> 1,50 -> 2', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  p = subasta.nominar(p, 0, jugadorId);
  p = subasta.pujar(p, 1, 150);
  assert.equal(p.lote.precio, 150);
  assert.equal(p.lote.lider, 1);
  p = subasta.pujar(p, 0, 200);
  assert.equal(p.lote.precio, 200);
  assert.equal(p.lote.lider, 0);
  assert.equal(p.lote.pujas.length, 3);
});

test('nominar, pujar y pasar felices adjudican correctamente', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  p = subasta.nominar(p, 0, jugadorId);
  p = subasta.pujar(p, 1, 150);
  p = subasta.pasar(p, 0);
  assert.equal(p.lote, null);
  assert.equal(p.managers[1].plantel.indexOf(jugadorId) !== -1, true);
  assert.equal(p.managers[1].presupuesto, CONFIG.PRESUPUESTO - 150);
  assert.equal(p.mercado.indexOf(jugadorId), -1);
  assert.equal(p.lotes.length, 1);
  assert.deepEqual(p.lotes[0], { jugadorId: jugadorId, ganador: 1, precio: 150, pujas: [{ manager: 0, monto: 100 }, { manager: 1, monto: 150 }] });
});

test('todos los casos ilegales tiran error', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  var otroJugadorId = p.mercado[1];

  // nominar fuera de turno
  assert.throws(function () { subasta.nominar(p, 1, jugadorId); });
  // nominar un jugador que no esta en el mercado
  assert.throws(function () { subasta.nominar(p, 0, 999999); });

  var p2 = subasta.nominar(p, 0, jugadorId);

  // pujar fuera de turno
  assert.throws(function () { subasta.pujar(p2, 0, 150); });
  // monto no multiplo de 50
  assert.throws(function () { subasta.pujar(p2, 1, 175); });
  // monto <= precio actual
  assert.throws(function () { subasta.pujar(p2, 1, 100); });
  assert.throws(function () { subasta.pujar(p2, 1, 50); });
  // monto por encima de la puja maxima
  assert.throws(function () { subasta.pujar(p2, 1, 999999); });
  // pasar fuera de turno
  assert.throws(function () { subasta.pasar(p2, 0); });
  // nominar mientras hay un lote en curso
  assert.throws(function () { subasta.nominar(p2, 1, otroJugadorId); });
  // ficharDirecto fuera de modo compra directa
  assert.throws(function () { subasta.ficharDirecto(p2, 1, otroJugadorId); });
});

test('cierre automatico: al rival no le alcanza para superar', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  // Ana nomina; Juan casi sin plata, no puede subir
  p.managers[1].presupuesto = 100; // $1, con 4 libres pujaMaxima=100, no supera 100+50
  var p2 = subasta.nominar(p, 0, jugadorId);
  // el cierre automatico deberia haber ocurrido de una: no hay lote, Ana se lo lleva a $1
  assert.equal(p2.lote, null);
  assert.equal(p2.managers[0].plantel.indexOf(jugadorId) !== -1, true);
  assert.equal(p2.managers[0].presupuesto, CONFIG.PRESUPUESTO - 100);
});

test('cierre automatico: el rival ya completo su plantel', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  var otro = p.mercado[1];
  p.managers[1].plantel = [p.mercado[10], p.mercado[11], p.mercado[12]]; // 1 lugar libre
  p.managers[1].presupuesto = 100;
  var p2 = subasta.nominar(p, 0, jugadorId);
  assert.equal(p2.lote, null);
  assert.equal(p2.managers[0].plantel.indexOf(jugadorId) !== -1, true);
});

test('alternancia de nominacion: nomina el que no nomino el lote anterior', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  p = subasta.nominar(p, 0, jugadorId);
  p = subasta.pasar(p, 1); // Ana nomino y se lo queda a $1, Juan paso
  assert.equal(p.nominaProximo, 1);
});

test('compra directa: cuando un manager completa, el otro ficha a $1', function () {
  var p = partidoNuevo();
  p.managers[0].plantel = [p.mercado[0], p.mercado[1], p.mercado[2], p.mercado[3]];
  p.managers[0].presupuesto = 0;
  assert.equal(subasta.estadoSubasta(p), 'compraDirecta');
  var libreId = p.mercado[4];
  var p2 = subasta.ficharDirecto(p, 1, libreId);
  assert.equal(p2.managers[1].plantel.indexOf(libreId) !== -1, true);
  assert.equal(p2.managers[1].presupuesto, CONFIG.PRESUPUESTO - 100);
  assert.throws(function () { subasta.ficharDirecto(p2, 0, p.mercado[5]); }); // manager 0 ya completo
});

test('subasta terminada cuando ambos completan plantel', function () {
  var p = partidoNuevo();
  p.managers[0].plantel = [p.mercado[0], p.mercado[1], p.mercado[2], p.mercado[3]];
  p.managers[1].plantel = [p.mercado[4], p.mercado[5], p.mercado[6], p.mercado[7]];
  assert.equal(subasta.estadoSubasta(p), 'terminada');
});

test('deshacer revierte la ultima puja', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  p = subasta.nominar(p, 0, jugadorId);
  p = subasta.pujar(p, 1, 150);
  var deshecho = subasta.deshacer(p);
  assert.equal(deshecho.lote.precio, 100);
  assert.equal(deshecho.lote.lider, 0);
  assert.equal(deshecho.lote.turno, 1);
});

test('deshacer sobre la nominacion la anula por completo', function () {
  var p = partidoNuevo();
  var jugadorId = p.mercado[0];
  p = subasta.nominar(p, 0, jugadorId);
  var deshecho = subasta.deshacer(p);
  assert.equal(deshecho.lote, null);
});

test('propiedad: 2000 subastas con acciones legales al azar terminan siempre en 4 y 4', function () {
  for (var s = 0; s < 2000; s++) {
    var seed = 'prop-' + s;
    var random = rngMod.crearRng(seed);
    var ids = mercadoMod.generarMercado(seed);
    var p = subasta.crearPartido({ numero: 1, managers: managers(), nominaPrimero: rngMod.entero(random, 0, 1), seed: seed, mercado: ids });

    var pasosMax = 500;
    while (subasta.estadoSubasta(p) !== 'terminada' && pasosMax-- > 0) {
      var estado = subasta.estadoSubasta(p);
      if (estado === 'nominando') {
        var m = p.nominaProximo;
        var jugadorId = rngMod.elegir(random, p.mercado);
        p = subasta.nominar(p, m, jugadorId);
      } else if (estado === 'compraDirecta') {
        var conLibres = p.managers.filter(function (mm) { return subasta.lugaresLibres(p, mm.id) > 0; })[0];
        var jugadorId2 = rngMod.elegir(random, p.mercado);
        p = subasta.ficharDirecto(p, conLibres.id, jugadorId2);
      } else if (estado === 'pujando') {
        var turno = p.lote.turno;
        var max = subasta.pujaMaxima(p, turno);
        var precio = p.lote.precio;
        var opciones = ['pasar'];
        [precio + 50, precio + 100, precio + 200, max].forEach(function (monto) {
          if (monto > precio && monto <= max && monto % 50 === 0) opciones.push(monto);
        });
        var accion = rngMod.elegir(random, opciones);
        p = accion === 'pasar' ? subasta.pasar(p, turno) : subasta.pujar(p, turno, accion);
      }

      // invariantes despues de cada accion
      p.managers.forEach(function (mm) {
        assert.ok(mm.presupuesto >= 0, 'seed ' + seed + ': presupuesto negativo');
        assert.equal(mm.presupuesto % 50, 0, 'seed ' + seed + ': presupuesto no multiplo de 50');
        var libres = subasta.lugaresLibres(p, mm.id);
        assert.ok(mm.presupuesto >= libres * CONFIG.PRECIO_INICIAL, 'seed ' + seed + ': invariante de presupuesto minimo roto');
      });
    }

    assert.ok(pasosMax > 0, 'seed ' + seed + ': no termino en el limite de pasos');
    assert.equal(subasta.estadoSubasta(p), 'terminada');
    p.managers.forEach(function (mm) {
      assert.equal(mm.plantel.length, 4, 'seed ' + seed + ': plantel final distinto de 4');
      assert.equal(mm.presupuesto, CONFIG.PRESUPUESTO - (CONFIG.PRESUPUESTO - mm.presupuesto), 'trivial');
    });
    var gastoTotal = p.lotes.reduce(function (acc, l) { return acc + l.precio; }, 0);
    var gastoManagers = p.managers.reduce(function (acc, mm) { return acc + (CONFIG.PRESUPUESTO - mm.presupuesto); }, 0);
    assert.equal(gastoTotal, gastoManagers, 'seed ' + seed + ': el gasto de los lotes no coincide con lo pagado');
  }
});
