(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./jugadores.js'), require('./simulacion.js'), require('./subasta.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.reparto = factory(root.SC.rng, root.SC.jugadores, root.SC.simulacion, root.SC.subasta);
  }
})(typeof self !== 'undefined' ? self : this, function (rngMod, jugadores, simMod, subastaMod) {
  'use strict';

  // Reparto al azar parejo: cuando un manager completa sus 4, al otro se le
  // completan los lugares libres con jugadores sorteados, buscando que su
  // equipo quede igual de fuerte que el del rival. "Fuerza" = ATQ + CRE + DEF
  // del simulador, que es lo que realmente decide el partido.

  var INTENTOS = 600;
  var TOLERANCIA = 2; // puntos de fuerza de diferencia aceptables

  var POR_ID = {};
  jugadores.forEach(function (j) { POR_ID[j.id] = j; });
  var CAMPO = jugadores.filter(function (j) { return j.posicion !== 'POR'; });

  function fuerza(equipo) {
    var m = simMod.metricasEquipo(equipo);
    return m.ATQ + m.CRE + m.DEF;
  }

  function idsOcupados(partido) {
    var ocupados = [];
    partido.managers.forEach(function (m) { ocupados = ocupados.concat(m.plantel); });
    return ocupados;
  }

  // Elige los ids que completan el plantel de `managerId`. Si se pasa
  // `equipoObjetivo` (ids), el resultado queda parejo con ese equipo; si no,
  // es un sorteo simple.
  function elegirParaCompletar(partido, managerId, equipoObjetivo, rng) {
    var manager = partido.managers.filter(function (m) { return m.id === managerId; })[0];
    var propios = manager.plantel.map(function (id) { return POR_ID[id]; });
    var faltan = subastaMod.lugaresLibres(partido, managerId);
    var ocupados = idsOcupados(partido);
    var pool = CAMPO.filter(function (j) { return ocupados.indexOf(j.id) === -1; });

    if (!equipoObjetivo) {
      return rngMod.mezclar(rng, pool).slice(0, faltan).map(function (j) { return j.id; });
    }

    var objetivo = fuerza(equipoObjetivo.map(function (id) { return POR_ID[id]; }));
    var buenos = [];
    var mejor = null;
    function evaluar(sorteo) {
      var diferencia = Math.abs(fuerza(propios.concat(sorteo)) - objetivo);
      if (diferencia <= TOLERANCIA) buenos.push(sorteo);
      if (!mejor || diferencia < mejor.diferencia) mejor = { sorteo: sorteo, diferencia: diferencia };
    }
    // Con un solo lugar libre se prueban todos los candidatos; si no, sorteos al azar.
    if (faltan === 1) pool.forEach(function (j) { evaluar([j]); });
    else for (var i = 0; i < INTENTOS; i++) evaluar(rngMod.mezclar(rng, pool).slice(0, faltan));
    var elegido = buenos.length > 0 ? rngMod.elegir(rng, buenos) : mejor.sorteo;
    return elegido.map(function (j) { return j.id; });
  }

  // Completa el partido en estado 'reparto'. Caso normal: uno ya tiene 4 y al
  // otro se le completa parejo. Si se acabara el mazo con los dos incompletos
  // (rarisimo), el primero se completa al azar y el segundo parejo con el primero.
  function completarPartido(partido, seed) {
    if (subastaMod.estadoSubasta(partido) !== 'reparto') throw new Error('No estamos en el reparto al azar');
    var rng = rngMod.crearRng(seed);
    var nuevo = partido;
    var completo = nuevo.managers.filter(function (m) { return subastaMod.lugaresLibres(nuevo, m.id) === 0; })[0];
    if (!completo) {
      var primero = nuevo.managers[0];
      nuevo = subastaMod.completarPlantel(nuevo, primero.id, elegirParaCompletar(nuevo, primero.id, null, rng));
      completo = nuevo.managers[0];
    }
    nuevo.managers.forEach(function (m) {
      if (subastaMod.lugaresLibres(nuevo, m.id) > 0) {
        var objetivo = nuevo.managers.filter(function (x) { return x.id === completo.id; })[0].plantel;
        nuevo = subastaMod.completarPlantel(nuevo, m.id, elegirParaCompletar(nuevo, m.id, objetivo, rng));
      }
    });
    return nuevo;
  }

  return { fuerza: fuerza, elegirParaCompletar: elegirParaCompletar, completarPartido: completarPartido };
});
