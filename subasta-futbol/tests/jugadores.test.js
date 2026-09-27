'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var jugadores = require('../js/jugadores.js');

var POS_DETALLE_VALIDAS = {
  POR: ['POR'],
  DEF: ['DFC', 'LD', 'LI'],
  MED: ['MCD', 'MC', 'MCO', 'MD', 'MI'],
  DEL: ['DC', 'SD', 'ED', 'EI'],
};

function categoriaPorOvr(ovr) {
  if (ovr >= 95) return 'Leyenda';
  if (ovr >= 92) return 'Crack';
  if (ovr >= 89) return 'Estrella';
  return 'Figura';
}

function principal(j) {
  if (j.posicion === 'POR') return j.arq;
  if (j.posicion === 'DEF') return j.def;
  if (j.posicion === 'MED') return Math.max(j.cre, j.def);
  return j.ata;
}

test('hay exactamente 200 jugadores', function () {
  assert.equal(jugadores.length, 200);
});

test('ids, nombres y nombreCarta son unicos', function () {
  var ids = new Set();
  var nombres = new Set();
  var nombresCarta = new Set();
  jugadores.forEach(function (j) {
    assert.equal(ids.has(j.id), false, 'id repetido: ' + j.id);
    ids.add(j.id);
    assert.equal(nombresCarta.has(j.nombreCarta), false, 'nombreCarta repetido: ' + j.nombreCarta);
    nombresCarta.add(j.nombreCarta);
    nombres.add(j.nombre);
  });
  assert.equal(nombres.size, 200);
});

test('nombreCarta tiene 12 caracteres o menos', function () {
  jugadores.forEach(function (j) {
    assert.ok(j.nombreCarta.length <= 12, j.nombreCarta + ' tiene ' + j.nombreCarta.length + ' caracteres');
  });
});

test('20 arqueros (POR)', function () {
  var cantidad = jugadores.filter(function (j) { return j.posicion === 'POR'; }).length;
  assert.equal(cantidad, 20);
});

test('categorias respetan la tabla de OVR (18 Leyenda, 24 Crack, 100 Estrella, 58 Figura)', function () {
  var conteo = { Leyenda: 0, Crack: 0, Estrella: 0, Figura: 0 };
  jugadores.forEach(function (j) {
    assert.equal(j.categoria, categoriaPorOvr(j.ovr), j.nombreCarta + ' categoria incorrecta');
    conteo[j.categoria]++;
  });
  assert.deepEqual(conteo, { Leyenda: 18, Crack: 24, Estrella: 100, Figura: 58 });
});

test('posDetalle es compatible con la posicion', function () {
  jugadores.forEach(function (j) {
    var validas = POS_DETALLE_VALIDAS[j.posicion];
    assert.ok(validas, 'posicion desconocida: ' + j.posicion);
    assert.ok(validas.indexOf(j.posDetalle) !== -1, j.nombreCarta + ': posDetalle ' + j.posDetalle + ' invalido para ' + j.posicion);
  });
});

test('las 6 estadisticas de carta estan entre 20 y 99', function () {
  jugadores.forEach(function (j) {
    var claves = j.posicion === 'POR' ? ['est', 'par', 'saq', 'ref', 'vel', 'col'] : ['rit', 'tir', 'pas', 'reg', 'def', 'fis'];
    claves.forEach(function (k) {
      var v = j.carta[k];
      assert.equal(typeof v, 'number', j.nombreCarta + '.' + k + ' no es numero');
      assert.ok(v >= 20 && v <= 99, j.nombreCarta + '.' + k + ' = ' + v + ' fuera de [20,99]');
      assert.equal(Number.isInteger(v), true, j.nombreCarta + '.' + k + ' no es entero');
    });
  });
});

test('el atributo principal derivado queda a +-2 del OVR del CSV', function () {
  jugadores.forEach(function (j) {
    var diff = Math.abs(principal(j) - j.ovr);
    assert.ok(diff <= 2, j.nombreCarta + ' (' + j.posicion + ') principal=' + principal(j) + ' ovr=' + j.ovr + ' diff=' + diff);
  });
});

test('los atributos derivados coinciden con las formulas de la seccion 3.2', function () {
  jugadores.forEach(function (j) {
    var c = j.carta;
    if (j.posicion === 'POR') {
      assert.equal(j.arq, Math.round((c.est + c.par + c.ref + c.col) / 4), j.nombreCarta + ' arq');
      assert.equal(j.ata, Math.round(0.35 * c.saq), j.nombreCarta + ' ata');
      assert.equal(j.cre, Math.round(0.6 * c.saq), j.nombreCarta + ' cre');
      assert.equal(j.def, Math.round(0.5 * c.col), j.nombreCarta + ' def');
    } else {
      assert.equal(j.ata, Math.round(0.5 * c.tir + 0.3 * c.reg + 0.2 * c.rit), j.nombreCarta + ' ata');
      assert.equal(j.cre, Math.round(0.6 * c.pas + 0.4 * c.reg), j.nombreCarta + ' cre');
      assert.equal(j.def, Math.round(0.75 * c.def + 0.25 * c.fis), j.nombreCarta + ' def');
      assert.equal(j.arq, 10, j.nombreCarta + ' arq');
    }
  });
});

test('las 5 anclas de la seccion 3.2 quedan tal cual', function () {
  var anclas = {
    130: { nombreCarta: 'Messi', posDetalle: 'DC', carta: { rit: 94, tir: 99, pas: 92, reg: 99, def: 38, fis: 68 } },
    23: { nombreCarta: 'Baresi', posDetalle: 'DFC', carta: { rit: 80, tir: 55, pas: 82, reg: 80, def: 96, fis: 88 } },
    102: { nombreCarta: 'Riquelme', posDetalle: 'MCO', carta: { rit: 66, tir: 84, pas: 90, reg: 88, def: 42, fis: 75 } },
    200: { nombreCarta: 'Caniggia', posDetalle: 'DC', carta: { rit: 97, tir: 84, pas: 72, reg: 88, def: 35, fis: 70 } },
    1: { nombreCarta: 'Yashin', posDetalle: 'POR', carta: { est: 96, par: 93, saq: 80, ref: 97, vel: 68, col: 94 } },
  };
  Object.keys(anclas).forEach(function (id) {
    var esperado = anclas[id];
    var j = jugadores.find(function (x) { return x.id === Number(id); });
    assert.ok(j, 'no se encontro el jugador id ' + id);
    assert.equal(j.nombreCarta, esperado.nombreCarta);
    assert.equal(j.posDetalle, esperado.posDetalle);
    assert.deepEqual(j.carta, esperado.carta);
  });
});

test('siglaClub tiene 3 letras y bandera no esta vacia', function () {
  jugadores.forEach(function (j) {
    assert.equal(j.siglaClub.length, 3, j.nombreCarta + ' siglaClub invalida: ' + j.siglaClub);
    assert.ok(j.bandera && j.bandera.length > 0, j.nombreCarta + ' sin bandera');
  });
});

test('no hay dos cartas identicas', function () {
  var vistas = {};
  jugadores.forEach(function (j) {
    var clave = JSON.stringify(j.carta);
    assert.ok(!vistas[clave], j.nombreCarta + ' tiene la misma carta que ' + vistas[clave]);
    vistas[clave] = j.nombreCarta;
  });
});

test('los perfiles por posicion son realistas (sin estadisticas infladas)', function () {
  function promedio(pos, clave) {
    var lista = jugadores.filter(function (j) { return j.posicion === pos; });
    return lista.reduce(function (s, j) { return s + j.carta[clave]; }, 0) / lista.length;
  }
  assert.ok(promedio('DEF', 'tir') < 65, 'los defensores tiran demasiado bien');
  assert.ok(promedio('DEF', 'pas') < 78, 'los defensores pasan demasiado bien');
  assert.ok(promedio('DEL', 'def') < 50, 'los delanteros defienden demasiado bien');
  assert.ok(promedio('MED', 'def') < 65, 'los volantes defienden demasiado bien');
  var fisicoAlto = jugadores.filter(function (j) { return j.posicion !== 'POR' && j.carta.fis >= 95; });
  assert.ok(fisicoAlto.length <= 10, fisicoAlto.length + ' jugadores con FIS >= 95');
});
