(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.simulacion = factory(root.SC.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (rngMod) {
  'use strict';

  var CONFIG_SIM = {
    jugadas: 18,
    expPosesion: 3, posesionMin: 0.30, posesionMax: 0.70,
    baseRemate: 0.42, pendienteRemate: 90, remateMin: 0.12, remateMax: 0.85,
    baseGol: 0.36, pendienteGol: 85, golMin: 0.08, golMax: 0.80,
    penalBase: 0.75, penalPendiente: 200, penalMin: 0.55, penalMax: 0.92,
  };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function promedio(lista) { return lista.reduce(function (a, b) { return a + b; }, 0) / lista.length; }

  // El arquero es el del plantel con mayor `arq` (desempate: mayor OVR).
  function elegirArquero(equipo) {
    var ordenado = equipo.slice().sort(function (a, b) {
      if (b.arq !== a.arq) return b.arq - a.arq;
      return b.ovr - a.ovr;
    });
    return ordenado[0];
  }

  function metricasEquipo(equipo) {
    var arquero = elegirArquero(equipo);
    var campo = equipo.filter(function (j) { return j !== arquero; });
    var atas = campo.map(function (j) { return j.ata; });
    var cres = campo.map(function (j) { return j.cre; });
    var defs = campo.map(function (j) { return j.def; });
    return {
      ATQ: 0.5 * Math.max.apply(null, atas) + 0.5 * promedio(atas),
      CRE: 0.5 * Math.max.apply(null, cres) + 0.5 * promedio(cres),
      DEF: 0.3 * Math.max.apply(null, defs) + 0.7 * promedio(defs),
      ARQ: arquero.arq,
      arquero: arquero,
      campo: campo,
    };
  }

  function elegirPonderadoAta2(rng, lista) {
    return rngMod.ponderado(rng, lista, function (j) { return j.ata * j.ata; });
  }

  function jugarNoventaMinutos(rng, metricas) {
    var posesionA = clamp(
      Math.pow(metricas[0].CRE, CONFIG_SIM.expPosesion) /
        (Math.pow(metricas[0].CRE, CONFIG_SIM.expPosesion) + Math.pow(metricas[1].CRE, CONFIG_SIM.expPosesion)),
      CONFIG_SIM.posesionMin, CONFIG_SIM.posesionMax
    );

    var minutos = [];
    for (var i = 0; i < CONFIG_SIM.jugadas; i++) minutos.push(rngMod.entero(rng, 1, 90));
    minutos.sort(function (a, b) { return a - b; });

    var goles = [0, 0];
    var remates = [0, 0];
    var posesionCuenta = [0, 0];
    var eventos = [];

    minutos.forEach(function (minuto) {
      var atacante = rng() < posesionA ? 0 : 1;
      var defensor = 1 - atacante;
      posesionCuenta[atacante]++;

      var pRemate = clamp(
        CONFIG_SIM.baseRemate + (metricas[atacante].ATQ - metricas[defensor].DEF) / CONFIG_SIM.pendienteRemate,
        CONFIG_SIM.remateMin, CONFIG_SIM.remateMax
      );
      if (rng() >= pRemate) return;
      remates[atacante]++;

      var pGol = clamp(
        CONFIG_SIM.baseGol + (metricas[atacante].ATQ - metricas[defensor].ARQ) / CONFIG_SIM.pendienteGol,
        CONFIG_SIM.golMin, CONFIG_SIM.golMax
      );
      var campoAtacante = metricas[atacante].campo;
      if (rng() < pGol) {
        goles[atacante]++;
        var autor = elegirPonderadoAta2(rng, campoAtacante);
        var evento = { minuto: minuto, tipo: 'gol', equipo: atacante, autor: autor.id };
        if (rng() < 0.70) {
          var candidatosAsis = campoAtacante.filter(function (j) { return j.id !== autor.id; });
          var asistente = rngMod.ponderado(rng, candidatosAsis, function (j) { return j.cre; });
          evento.asistencia = asistente.id;
        }
        eventos.push(evento);
      } else {
        var pateador = elegirPonderadoAta2(rng, campoAtacante);
        eventos.push({
          minuto: minuto, tipo: 'atajada', equipo: defensor,
          arquero: metricas[defensor].arquero.id, pateador: pateador.id,
        });
      }
    });

    var totalPosesion = posesionCuenta[0] + posesionCuenta[1];
    var posesionPorc0 = totalPosesion === 0 ? 50 : Math.round((posesionCuenta[0] / totalPosesion) * 100);
    return {
      goles: goles,
      eventos: eventos,
      estadisticas: { posesion: [posesionPorc0, 100 - posesionPorc0], remates: remates },
    };
  }

  // Orden de pateadores: los 3 de campo por `ata` descendente, el arquero
  // patea siempre ultimo. Ciclico si hace falta patear una 5ta vez.
  function ordenPenales(metricasEq) {
    var campoOrdenado = metricasEq.campo.slice().sort(function (a, b) { return b.ata - a.ata; });
    return campoOrdenado.concat([metricasEq.arquero]);
  }

  function simularPenales(rng, metricas) {
    var ordenes = [ordenPenales(metricas[0]), ordenPenales(metricas[1])];
    var kicksTaken = [0, 0];
    var goles = [0, 0];
    var tiros = [];

    function definido() {
      if (kicksTaken[0] < 5 || kicksTaken[1] < 5) {
        var restA = Math.max(0, 5 - kicksTaken[0]);
        var restB = Math.max(0, 5 - kicksTaken[1]);
        if (goles[0] > goles[1] + restB) return true;
        if (goles[1] > goles[0] + restA) return true;
        return false;
      }
      return goles[0] !== goles[1];
    }

    function tirar(eq) {
      var rival = 1 - eq;
      var kicker = ordenes[eq][kicksTaken[eq] % ordenes[eq].length];
      var p = clamp(
        CONFIG_SIM.penalBase + (kicker.ata - metricas[rival].arquero.arq) / CONFIG_SIM.penalPendiente,
        CONFIG_SIM.penalMin, CONFIG_SIM.penalMax
      );
      var convertido = rng() < p;
      kicksTaken[eq]++;
      if (convertido) goles[eq]++;
      tiros.push({ equipo: eq, pateador: kicker.id, convertido: convertido });
    }

    while ((kicksTaken[0] < 5 || kicksTaken[1] < 5) && !definido()) {
      if (kicksTaken[0] < 5) tirar(0);
      if (definido()) break;
      if (kicksTaken[1] < 5) tirar(1);
    }

    while (goles[0] === goles[1]) {
      tirar(0);
      tirar(1);
    }

    return { tiros: tiros, resultado: goles };
  }

  function calcularFigura(metricas, eventos, ganador) {
    var golesPorJugador = {};
    var asisPorJugador = {};
    var totalGoles = 0;
    eventos.forEach(function (e) {
      if (e.tipo !== 'gol') return;
      totalGoles++;
      golesPorJugador[e.autor] = (golesPorJugador[e.autor] || 0) + 1;
      if (e.asistencia) asisPorJugador[e.asistencia] = (asisPorJugador[e.asistencia] || 0) + 1;
    });

    if (totalGoles === 0) return metricas[ganador].arquero.id;

    var candidatos = [];
    [0, 1].forEach(function (eq) {
      metricas[eq].campo.concat([metricas[eq].arquero]).forEach(function (j) {
        candidatos.push({
          id: j.id, ovr: j.ovr, equipo: eq,
          goles: golesPorJugador[j.id] || 0,
          asistencias: asisPorJugador[j.id] || 0,
        });
      });
    });
    candidatos.sort(function (a, b) {
      if (b.goles !== a.goles) return b.goles - a.goles;
      if (b.asistencias !== a.asistencias) return b.asistencias - a.asistencias;
      if (b.ovr !== a.ovr) return b.ovr - a.ovr;
      if (a.equipo === ganador && b.equipo !== ganador) return -1;
      if (b.equipo === ganador && a.equipo !== ganador) return 1;
      return 0;
    });
    return candidatos[0].id;
  }

  // simularPartido(equipoA, equipoB, rng): equipoA/equipoB son arrays de 4
  // jugadores (objetos con id, ovr, ata, cre, def, arq). Toda la
  // aleatoriedad sale de `rng` (rng.crearRng(seed)).
  function simularPartido(equipoA, equipoB, rng) {
    var metricas = [metricasEquipo(equipoA), metricasEquipo(equipoB)];
    var partido90 = jugarNoventaMinutos(rng, metricas);
    var goles = partido90.goles;
    var eventos = partido90.eventos;
    var penales = null;

    var ganador;
    if (goles[0] === goles[1]) {
      penales = simularPenales(rng, metricas);
      ganador = penales.resultado[0] > penales.resultado[1] ? 0 : 1;
    } else {
      ganador = goles[0] > goles[1] ? 0 : 1;
    }

    var figura = calcularFigura(metricas, eventos, ganador);

    return {
      goles: goles,
      eventos: eventos,
      penales: penales,
      estadisticas: partido90.estadisticas,
      metricas: metricas.map(function (m) {
        return { ATQ: m.ATQ, CRE: m.CRE, DEF: m.DEF, ARQ: m.ARQ, arquero: m.arquero.id, sinArquero: m.arquero.posicion !== 'POR' };
      }),
      ganador: ganador,
      figura: figura,
    };
  }

  // probabilidadVictoria(equipoA, equipoB, n, seed) -> [pA, pB], con un RNG
  // propio (no consume el rng del partido real).
  function probabilidadVictoria(equipoA, equipoB, n, seed) {
    n = n || 2000;
    var rng = rngMod.crearRng(seed);
    var victoriasA = 0;
    for (var i = 0; i < n; i++) {
      var resultado = simularPartido(equipoA, equipoB, rng);
      if (resultado.ganador === 0) victoriasA++;
    }
    var pA = victoriasA / n;
    return [pA, 1 - pA];
  }

  return {
    CONFIG_SIM: CONFIG_SIM,
    metricasEquipo: metricasEquipo,
    simularPartido: simularPartido,
    probabilidadVictoria: probabilidadVictoria,
  };
});
