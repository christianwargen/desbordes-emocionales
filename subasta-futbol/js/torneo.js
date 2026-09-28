(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./config.js'), require('./mercado.js'), require('./subasta.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.torneo = factory(root.SC.rng, root.SC.config, root.SC.mercado, root.SC.subasta);
  }
})(typeof self !== 'undefined' ? self : this, function (rngMod, configMod, mercadoMod, subastaMod) {
  'use strict';

  // Torneo de 2 a 6 managers. Cada fecha: subasta nueva entre todos y despues
  // todos contra todos con los equipos armados (con 2 managers, un partido).
  // Cada victoria suma 10 puntos. Modos:
  //  - 'fechas': se juega la cantidad de fechas elegida; gana el de mas puntos.
  //  - 'primeroA100': termina en la fecha en que alguien llega a 100.
  // Si arriba quedan empatados en puntos, se juega una fecha de desempate
  // solo entre ellos (y otra, si siguen empatados).

  var CONFIG = configMod.CONFIG;

  function clonar(valor) { return JSON.parse(JSON.stringify(valor)); }

  // ---------------------------------------------------------------------
  // crearTorneo({ modo: 'fechas' | 'primeroA100', fechas, managers: [{id,nombre,color}], seed })
  // ---------------------------------------------------------------------
  function crearTorneo(opts) {
    var n = opts.managers.length;
    if (n < CONFIG.MANAGERS_MIN || n > CONFIG.MANAGERS_MAX) {
      throw new Error('El torneo es de ' + CONFIG.MANAGERS_MIN + ' a ' + CONFIG.MANAGERS_MAX + ' jugadores');
    }
    var fechas = Math.max(CONFIG.FECHAS_MIN, Math.min(CONFIG.FECHAS_MAX, opts.fechas || CONFIG.FECHAS_POR_DEFECTO));
    return {
      config: {
        modo: opts.modo === 'primeroA100' ? 'primeroA100' : 'fechas',
        fechas: fechas,
        puntosPorVictoria: CONFIG.PUNTOS_POR_VICTORIA,
        puntosObjetivo: CONFIG.PUNTOS_OBJETIVO,
      },
      seed: opts.seed,
      managers: opts.managers.map(function (m) {
        return { id: m.id, nombre: m.nombre, color: m.color, puntos: 0, pj: 0, pg: 0, gf: 0, gc: 0 };
      }),
      numeroFecha: 1,
      fechasRegulares: 0,
      desempate: null, // ids de los empatados que juegan la proxima fecha de desempate
      partidoActual: null,
      historial: [],
      terminado: false,
      campeon: null,
    };
  }

  function managerPorId(torneo, id) {
    return torneo.managers.filter(function (m) { return m.id === id; })[0];
  }

  function participantes(torneo) {
    return torneo.desempate ? torneo.desempate.slice() : torneo.managers.map(function (m) { return m.id; });
  }

  // Todos contra todos: [[a, b], ...] con a antes que b en el orden de la ronda.
  function cruces(ids) {
    var lista = [];
    for (var i = 0; i < ids.length; i++) {
      for (var j = i + 1; j < ids.length; j++) lista.push([ids[i], ids[j]]);
    }
    return lista;
  }

  function seedFecha(torneo, numero, sufijo) {
    return torneo.seed + '#' + numero + (sufijo ? ':' + sufijo : '');
  }

  // Abre el primer lote: en la fecha 1 se sortea; despues, el ultimo de la
  // tabla entre los que juegan (si hay empate abajo, se sortea entre ellos).
  function decidirQuienAbre(torneo) {
    var ids = participantes(torneo);
    var rng = rngMod.crearRng(seedFecha(torneo, torneo.numeroFecha, 'abre'));
    if (torneo.historial.length === 0) return rngMod.elegir(rng, ids);
    var minimo = Math.min.apply(null, ids.map(function (id) { return managerPorId(torneo, id).puntos; }));
    return rngMod.elegir(rng, ids.filter(function (id) { return managerPorId(torneo, id).puntos === minimo; }));
  }

  // Arma la subasta de la proxima fecha (mazo al azar, pases recargados).
  function prepararSiguientePartido(torneo) {
    if (torneo.terminado) throw new Error('El torneo ya termino');
    var numero = torneo.numeroFecha;
    var ids = participantes(torneo);
    var partido = subastaMod.crearPartido({
      numero: numero,
      managers: ids.map(function (id) {
        var m = managerPorId(torneo, id);
        return { id: m.id, nombre: m.nombre, color: m.color };
      }),
      abrePrimero: decidirQuienAbre(torneo),
      seed: seedFecha(torneo, numero, 'partido'),
      mazo: mercadoMod.generarMazo(seedFecha(torneo, numero, 'mercado')),
    });
    var nuevo = clonar(torneo);
    nuevo.partidoActual = partido;
    return nuevo;
  }

  // Los cruces de la fecha en curso, con los ids de cada equipo.
  function crucesDeLaFecha(torneo) {
    return cruces(torneo.partidoActual.managers.map(function (m) { return m.id; }));
  }

  // Lideres (mayor puntaje) entre `ids`.
  function lideres(torneo, ids) {
    var max = Math.max.apply(null, ids.map(function (id) { return managerPorId(torneo, id).puntos; }));
    return ids.filter(function (id) { return managerPorId(torneo, id).puntos === max; });
  }

  function evaluarFin(nuevo, eraDesempate, idsFecha) {
    var todos = nuevo.managers.map(function (m) { return m.id; });
    var candidatos = null;
    if (eraDesempate) {
      candidatos = lideres(nuevo, idsFecha);
    } else if (nuevo.config.modo === 'fechas') {
      if (nuevo.fechasRegulares >= nuevo.config.fechas) candidatos = lideres(nuevo, todos);
    } else {
      var llegaron = todos.filter(function (id) { return managerPorId(nuevo, id).puntos >= nuevo.config.puntosObjetivo; });
      if (llegaron.length) candidatos = lideres(nuevo, llegaron);
    }
    if (!candidatos) return nuevo;
    if (candidatos.length === 1) {
      nuevo.terminado = true;
      nuevo.campeon = candidatos[0];
      nuevo.desempate = null;
    } else {
      nuevo.desempate = candidatos;
    }
    return nuevo;
  }

  // Registra los resultados de la fecha en curso. `resultados`: un elemento
  // por cruce de crucesDeLaFecha, en el mismo orden: { a, b, resultado } donde
  // resultado es la salida de simularPartido(equipoDeA, equipoDeB, rng).
  function registrarFecha(torneo, resultados) {
    if (!torneo.partidoActual) throw new Error('No hay fecha en curso');
    var partido = torneo.partidoActual;
    var eraDesempate = !!torneo.desempate;
    var idsFecha = partido.managers.map(function (m) { return m.id; });
    var nuevo = clonar(torneo);

    var partidos = resultados.map(function (r) {
      var ganadorId = r.resultado.ganador === 0 ? r.a : r.b;
      var perdedorId = ganadorId === r.a ? r.b : r.a;
      var ma = managerPorId(nuevo, r.a);
      var mb = managerPorId(nuevo, r.b);
      var goles = r.resultado.goles || [0, 0];
      ma.pj++; mb.pj++;
      ma.gf += goles[0]; ma.gc += goles[1];
      mb.gf += goles[1]; mb.gc += goles[0];
      var mg = managerPorId(nuevo, ganadorId);
      mg.pg++;
      mg.puntos += nuevo.config.puntosPorVictoria;
      return { a: r.a, b: r.b, ganador: ganadorId, perdedor: perdedorId, resultado: r.resultado };
    });

    var planteles = {};
    partido.managers.forEach(function (m) { planteles[m.id] = m.plantel.slice(); });
    nuevo.historial.push({
      numero: partido.numero,
      desempate: eraDesempate,
      participantes: idsFecha,
      lotes: partido.lotes,
      planteles: planteles,
      reparto: partido.reparto,
      partidos: partidos,
      puntosDespues: nuevo.managers.map(function (m) { return { id: m.id, puntos: m.puntos }; }),
    });
    if (!eraDesempate) nuevo.fechasRegulares++;
    nuevo.numeroFecha++;
    nuevo.partidoActual = null;
    nuevo.desempate = null;
    return evaluarFin(nuevo, eraDesempate, idsFecha);
  }

  // Tabla ordenada: puntos, diferencia de gol, goles a favor.
  function tabla(torneo) {
    return torneo.managers.slice().sort(function (x, y) {
      if (y.puntos !== x.puntos) return y.puntos - x.puntos;
      if ((y.gf - y.gc) !== (x.gf - x.gc)) return (y.gf - y.gc) - (x.gf - x.gc);
      return y.gf - x.gf;
    });
  }

  return {
    crearTorneo: crearTorneo,
    prepararSiguientePartido: prepararSiguientePartido,
    crucesDeLaFecha: crucesDeLaFecha,
    registrarFecha: registrarFecha,
    decidirQuienAbre: decidirQuienAbre,
    tabla: tabla,
    cruces: cruces,
  };
});
