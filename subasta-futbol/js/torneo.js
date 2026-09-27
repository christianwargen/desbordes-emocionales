(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./config.js'), require('./mercado.js'), require('./subasta.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.torneo = factory(root.SC.rng, root.SC.config, root.SC.mercado, root.SC.subasta);
  }
})(typeof self !== 'undefined' ? self : this, function (rngMod, configMod, mercadoMod, subastaMod) {
  'use strict';

  var CONFIG = configMod.CONFIG;

  // ---------------------------------------------------------------------
  // crearTorneo({ modo: 'primeroA100' | 'diezPartidos', managers: [{id,nombre,color}], seed })
  // ---------------------------------------------------------------------
  function crearTorneo(opts) {
    return {
      config: {
        modo: opts.modo || 'primeroA100',
        puntosPorVictoria: CONFIG.PUNTOS_POR_VICTORIA,
        puntosObjetivo: CONFIG.PUNTOS_OBJETIVO,
        partidosFijos: CONFIG.PARTIDOS_FIJOS,
      },
      seed: opts.seed,
      managers: opts.managers.map(function (m) {
        return { id: m.id, nombre: m.nombre, color: m.color, puntos: 0 };
      }),
      numeroPartido: 1,
      partidoActual: null,
      historial: [],
      desempatePendiente: false,
      terminado: false,
      campeon: null,
    };
  }

  function otroManagerId(torneo, managerId) {
    var otro = torneo.managers.filter(function (m) { return m.id !== managerId; })[0];
    return otro.id;
  }

  function seedPartido(torneo, numero, sufijo) {
    return torneo.seed + '#' + numero + (sufijo ? ':' + sufijo : '');
  }

  function decidirNominaPrimero(torneo) {
    if (torneo.numeroPartido === 1) {
      var rngSorteo = rngMod.crearRng(seedPartido(torneo, 1, 'sorteo'));
      return rngMod.elegir(rngSorteo, torneo.managers.map(function (m) { return m.id; }));
    }
    var ultimo = torneo.historial[torneo.historial.length - 1];
    return ultimo.perdedor;
  }

  // Arma el mercado y el estado de subasta del proximo partido a jugar.
  function prepararSiguientePartido(torneo) {
    if (torneo.terminado) throw new Error('El torneo ya termino');
    var numero = torneo.numeroPartido;
    var seedMercado = seedPartido(torneo, numero, 'mercado');
    var idsMercado = mercadoMod.generarMercado(seedMercado);
    var nominaPrimero = decidirNominaPrimero(torneo);

    var partido = subastaMod.crearPartido({
      numero: numero,
      managers: torneo.managers.map(function (m) { return { id: m.id, nombre: m.nombre, color: m.color }; }),
      nominaPrimero: nominaPrimero,
      seed: seedPartido(torneo, numero, 'partido'),
      mercado: idsMercado,
    });

    var nuevo = JSON.parse(JSON.stringify(torneo));
    nuevo.partidoActual = partido;
    return nuevo;
  }

  function evaluarFin(torneo) {
    var nuevo = JSON.parse(JSON.stringify(torneo));
    var puntos = nuevo.managers.map(function (m) { return m.puntos; });

    if (nuevo.config.modo === 'primeroA100') {
      var ganador = nuevo.managers.filter(function (m) { return m.puntos >= nuevo.config.puntosObjetivo; })[0];
      if (ganador) {
        nuevo.terminado = true;
        nuevo.campeon = ganador.id;
      }
      return nuevo;
    }

    // modo 'diezPartidos'
    var partidosJugados = nuevo.historial.length;
    if (nuevo.desempatePendiente) {
      // el ultimo partido jugado fue el de desempate: define campeon si o si
      var ultimo = nuevo.historial[nuevo.historial.length - 1];
      nuevo.terminado = true;
      nuevo.campeon = ultimo.ganador;
      return nuevo;
    }
    if (partidosJugados >= nuevo.config.partidosFijos) {
      if (puntos[0] === puntos[1]) {
        nuevo.desempatePendiente = true;
        nuevo.terminado = false;
      } else {
        nuevo.terminado = true;
        nuevo.campeon = nuevo.managers.reduce(function (mejor, m) { return m.puntos > mejor.puntos ? m : mejor; }).id;
      }
    }
    return nuevo;
  }

  // Registra el resultado (salida de simularPartido) del partido en curso:
  // suma puntos, guarda el historial y evalua si el torneo termino.
  function registrarResultado(torneo, resultadoSimulacion) {
    if (!torneo.partidoActual) throw new Error('No hay partido en curso');
    var partido = torneo.partidoActual;
    var ganadorId = partido.managers[resultadoSimulacion.ganador].id;
    var perdedorId = otroManagerId(torneo, ganadorId);

    var nuevo = JSON.parse(JSON.stringify(torneo));
    var mgr = nuevo.managers.filter(function (m) { return m.id === ganadorId; })[0];
    mgr.puntos += nuevo.config.puntosPorVictoria;

    nuevo.historial.push({
      numero: partido.numero,
      ganador: ganadorId,
      perdedor: perdedorId,
      lotes: partido.lotes,
      resultado: resultadoSimulacion,
      puntosDespues: nuevo.managers.map(function (m) { return { id: m.id, puntos: m.puntos }; }),
    });
    nuevo.numeroPartido = nuevo.numeroPartido + 1;
    nuevo.partidoActual = null;

    return evaluarFin(nuevo);
  }

  return {
    crearTorneo: crearTorneo,
    prepararSiguientePartido: prepararSiguientePartido,
    registrarResultado: registrarResultado,
    decidirNominaPrimero: decidirNominaPrimero,
  };
});
