(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.simulacion = factory(root.SC.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (rngMod) {
  'use strict';

  // Constantes del simulador (calibradas con tools/calibrar.js, ver README).
  // El arquero es el mismo para los dos equipos (arqueroEstandar): los 4
  // comprados juegan de campo y el partido lo define su destreza.
  // Si empatan en los 90': alargue de 30' con gol de oro (una jugada cada 3');
  // si nadie convierte, penales contra el mismo arquero.
  var CONFIG_SIM = {
    jugadas: 16,
    expPosesion: 3, posesionMin: 0.30, posesionMax: 0.70,
    baseRemate: 0.42, pendienteRemate: 75, remateMin: 0.12, remateMax: 0.92,
    baseGol: 0.36, pendienteGol: 130, golMin: 0.08, golMax: 0.80,
    arqueroEstandar: 90,
    jugadasAlargue: 10, minutosPorJugadaAlargue: 3,
    penalBase: 0.75, penalPendiente: 200, penalMin: 0.55, penalMax: 0.92,
  };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function promedio(lista) { return lista.reduce(function (a, b) { return a + b; }, 0) / lista.length; }

  // Los 4 del plantel juegan de campo; el arquero es el estandar para los dos.
  function metricasEquipo(equipo) {
    var campo = equipo.slice();
    var atas = campo.map(function (j) { return j.ata; });
    var cres = campo.map(function (j) { return j.cre; });
    var defs = campo.map(function (j) { return j.def; });
    return {
      ATQ: 0.5 * Math.max.apply(null, atas) + 0.5 * promedio(atas),
      CRE: 0.5 * Math.max.apply(null, cres) + 0.5 * promedio(cres),
      DEF: 0.3 * Math.max.apply(null, defs) + 0.7 * promedio(defs),
      ARQ: CONFIG_SIM.arqueroEstandar,
      campo: campo,
    };
  }

  function elegirPonderadoAta2(rng, lista) {
    return rngMod.ponderado(rng, lista, function (j) { return j.ata * j.ata; });
  }

  function calcularPosesionA(metricas) {
    var a = Math.pow(metricas[0].CRE, CONFIG_SIM.expPosesion);
    var b = Math.pow(metricas[1].CRE, CONFIG_SIM.expPosesion);
    return clamp(a / (a + b), CONFIG_SIM.posesionMin, CONFIG_SIM.posesionMax);
  }

  // Una jugada: ataca uno segun la posesion; puede haber remate y gol.
  function jugarJugada(rng, metricas, posesionA, minuto, enAlargue, estado) {
    var atacante = rng() < posesionA ? 0 : 1;
    var defensor = 1 - atacante;
    estado.posesion[atacante]++;

    var pRemate = clamp(
      CONFIG_SIM.baseRemate + (metricas[atacante].ATQ - metricas[defensor].DEF) / CONFIG_SIM.pendienteRemate,
      CONFIG_SIM.remateMin, CONFIG_SIM.remateMax
    );
    if (rng() >= pRemate) return;
    estado.remates[atacante]++;

    var pGol = clamp(
      CONFIG_SIM.baseGol + (metricas[atacante].ATQ - metricas[defensor].ARQ) / CONFIG_SIM.pendienteGol,
      CONFIG_SIM.golMin, CONFIG_SIM.golMax
    );
    var campoAtacante = metricas[atacante].campo;
    var evento;
    if (rng() < pGol) {
      estado.goles[atacante]++;
      var autor = elegirPonderadoAta2(rng, campoAtacante);
      evento = { minuto: minuto, tipo: 'gol', equipo: atacante, autor: autor.id };
      if (rng() < 0.70) {
        var candidatosAsis = campoAtacante.filter(function (j) { return j.id !== autor.id; });
        var asistente = rngMod.ponderado(rng, candidatosAsis, function (j) { return j.cre; });
        evento.asistencia = asistente.id;
      }
    } else {
      var pateador = elegirPonderadoAta2(rng, campoAtacante);
      evento = { minuto: minuto, tipo: 'atajada', equipo: defensor, pateador: pateador.id };
    }
    if (enAlargue) evento.alargue = true;
    estado.eventos.push(evento);
  }

  // Penales: patean los 4 en orden de `ata` descendente (ciclico), siempre
  // contra el arquero estandar. 5 por lado, cortando si ya esta definido;
  // despues, muerte subita.
  function simularPenales(rng, metricas) {
    var ordenes = metricas.map(function (m) {
      return m.campo.slice().sort(function (a, b) { return b.ata - a.ata; });
    });
    var pateados = [0, 0];
    var goles = [0, 0];
    var tiros = [];

    function definido() {
      if (pateados[0] < 5 || pateados[1] < 5) {
        var restanA = Math.max(0, 5 - pateados[0]);
        var restanB = Math.max(0, 5 - pateados[1]);
        return goles[0] > goles[1] + restanB || goles[1] > goles[0] + restanA;
      }
      return goles[0] !== goles[1];
    }

    function patear(eq) {
      var pateador = ordenes[eq][pateados[eq] % ordenes[eq].length];
      var p = clamp(
        CONFIG_SIM.penalBase + (pateador.ata - CONFIG_SIM.arqueroEstandar) / CONFIG_SIM.penalPendiente,
        CONFIG_SIM.penalMin, CONFIG_SIM.penalMax
      );
      var convertido = rng() < p;
      pateados[eq]++;
      if (convertido) goles[eq]++;
      tiros.push({ equipo: eq, pateador: pateador.id, convertido: convertido });
    }

    while ((pateados[0] < 5 || pateados[1] < 5) && !definido()) {
      if (pateados[0] < 5) patear(0);
      if (definido()) break;
      if (pateados[1] < 5) patear(1);
    }
    while (goles[0] === goles[1]) {
      patear(0);
      patear(1);
    }
    return { tiros: tiros, resultado: goles };
  }

  function calcularFigura(metricas, eventos, ganador) {
    var golesPorJugador = {};
    var asisPorJugador = {};
    eventos.forEach(function (e) {
      if (e.tipo !== 'gol') return;
      golesPorJugador[e.autor] = (golesPorJugador[e.autor] || 0) + 1;
      if (e.asistencia) asisPorJugador[e.asistencia] = (asisPorJugador[e.asistencia] || 0) + 1;
    });

    var candidatos = [];
    [0, 1].forEach(function (eq) {
      metricas[eq].campo.forEach(function (j) {
        candidatos.push({
          id: j.id, ovr: j.ovr, equipo: eq,
          goles: golesPorJugador[j.id] || 0,
          asistencias: asisPorJugador[j.id] || 0,
        });
      });
    });
    // Mas goles, despues mas asistencias, despues el equipo ganador, despues mayor OVR.
    candidatos.sort(function (a, b) {
      if (b.goles !== a.goles) return b.goles - a.goles;
      if (b.asistencias !== a.asistencias) return b.asistencias - a.asistencias;
      if ((a.equipo === ganador) !== (b.equipo === ganador)) return a.equipo === ganador ? -1 : 1;
      return b.ovr - a.ovr;
    });
    return candidatos[0].id;
  }

  // simularPartido(equipoA, equipoB, rng): equipoA/equipoB son arrays de 4
  // jugadores (objetos con id, ovr, ata, cre, def). Toda la aleatoriedad sale
  // de `rng` (rng.crearRng(seed)).
  function simularPartido(equipoA, equipoB, rng) {
    var metricas = [metricasEquipo(equipoA), metricasEquipo(equipoB)];
    var posesionA = calcularPosesionA(metricas);
    var estado = { goles: [0, 0], remates: [0, 0], posesion: [0, 0], eventos: [] };

    var minutos = [];
    for (var i = 0; i < CONFIG_SIM.jugadas; i++) minutos.push(rngMod.entero(rng, 1, 90));
    minutos.sort(function (a, b) { return a - b; });
    minutos.forEach(function (minuto) { jugarJugada(rng, metricas, posesionA, minuto, false, estado); });

    var alargue = null;
    var penales = null;
    if (estado.goles[0] === estado.goles[1]) {
      alargue = { golDeOro: null };
      for (var k = 0; k < CONFIG_SIM.jugadasAlargue && estado.goles[0] === estado.goles[1]; k++) {
        var minutoAlargue = 91 + k * CONFIG_SIM.minutosPorJugadaAlargue;
        jugarJugada(rng, metricas, posesionA, minutoAlargue, true, estado);
        if (estado.goles[0] !== estado.goles[1]) alargue.golDeOro = minutoAlargue;
      }
      if (estado.goles[0] === estado.goles[1]) penales = simularPenales(rng, metricas);
    }

    var ganador;
    if (penales) ganador = penales.resultado[0] > penales.resultado[1] ? 0 : 1;
    else ganador = estado.goles[0] > estado.goles[1] ? 0 : 1;

    var totalPosesion = estado.posesion[0] + estado.posesion[1];
    var posesionPorc0 = totalPosesion === 0 ? 50 : Math.round((estado.posesion[0] / totalPosesion) * 100);

    return {
      goles: estado.goles,
      eventos: estado.eventos,
      alargue: alargue,
      penales: penales,
      estadisticas: { posesion: [posesionPorc0, 100 - posesionPorc0], remates: estado.remates },
      metricas: metricas.map(function (m) { return { ATQ: m.ATQ, CRE: m.CRE, DEF: m.DEF, ARQ: m.ARQ }; }),
      ganador: ganador,
      figura: calcularFigura(metricas, estado.eventos, ganador),
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
