#!/usr/bin/env node
'use strict';

// Corre los escenarios de calibracion de SESION.md 5.5 con 20.000 partidos
// cada uno (seed fija, reproducible) e imprime una tabla escenario/resultado/
// objetivo/OK-FALLA. Si algo falla hay que ajustar CONFIG_SIM (js/simulacion.js),
// nunca las formulas.

var path = require('path');
var jugadores = require(path.join(__dirname, '..', 'js', 'jugadores.js'));
var rngMod = require(path.join(__dirname, '..', 'js', 'rng.js'));
var sim = require(path.join(__dirname, '..', 'js', 'simulacion.js'));

var N = 20000;

function porNombreCarta(nombre) {
  var j = jugadores.filter(function (x) { return x.nombreCarta === nombre; })[0];
  if (!j) throw new Error('No existe el jugador "' + nombre + '"');
  return j;
}

function porPosicionOrdenado(pos) {
  return jugadores.filter(function (j) { return j.posicion === pos; }).sort(function (a, b) { return b.ovr - a.ovr; });
}

function jugadorMasCercanoOvr(lista, ovrObjetivo, evitarIds) {
  var mejor = null, mejorDist = Infinity;
  lista.forEach(function (j) {
    if (evitarIds.indexOf(j.id) !== -1) return;
    var dist = Math.abs(j.ovr - ovrObjetivo);
    if (dist < mejorDist) { mejorDist = dist; mejor = j; }
  });
  return mejor;
}

// Arma dos equipos de 4 de campo (DEF + MED + DEL + DEL; el arquero es el
// estandar para los dos): el equipo A sale de un ranking por posicion (el
// segundo DEL, 12 puestos mas abajo), y para el equipo B se busca, en cada
// lugar, al jugador cuyo OVR esta mas cerca de (OVR de A - target).
function armarParPorDiferencia(targetDiff, rankBaseA) {
  var lugares = [['DEF', 0], ['MED', 0], ['DEL', 0], ['DEL', 12]];
  var listas = { DEF: porPosicionOrdenado('DEF'), MED: porPosicionOrdenado('MED'), DEL: porPosicionOrdenado('DEL') };

  var equipoA = lugares.map(function (l) { return listas[l[0]][rankBaseA + l[1]]; });
  var usados = equipoA.map(function (j) { return j.id; });
  var equipoB = lugares.map(function (l, i) {
    var elegido = jugadorMasCercanoOvr(listas[l[0]], equipoA[i].ovr - targetDiff, usados);
    usados.push(elegido.id);
    return elegido;
  });
  var diffReal = (equipoA.reduce(function (s, j) { return s + j.ovr; }, 0) -
    equipoB.reduce(function (s, j) { return s + j.ovr; }, 0)) / lugares.length;
  return { equipoA: equipoA, equipoB: equipoB, diffReal: diffReal };
}

// Promedia varios cruces (equipo A tomado de rankings 0..9 por posicion) para que
// el escenario mida "una diferencia de OVR" en general y no un cruce puntual.
function escenarioDiferencia(targetDiff, etiqueta) {
  var CRUCES = 10;
  var sumaProb = 0;
  var sumaDiff = 0;
  for (var r = 0; r < CRUCES; r++) {
    var par = armarParPorDiferencia(targetDiff, r);
    sumaProb += sim.probabilidadVictoria(par.equipoA, par.equipoB, Math.round(N / CRUCES), etiqueta + ':' + r)[0];
    sumaDiff += par.diffReal;
  }
  return { prob: sumaProb / CRUCES, diffReal: sumaDiff / CRUCES };
}

function correrDraftsAleatorios(n, seed) {
  var random = rngMod.crearRng(seed);
  var campoTodos = jugadores.filter(function (j) { return j.posicion !== 'POR'; });

  var totalGoles = 0;
  var aAlargue = 0;
  var aPenales = 0;
  for (var i = 0; i < n; i++) {
    var mezcla = rngMod.mezclar(random, campoTodos);
    var rngPartido = rngMod.crearRng(seed + ':partido:' + i);
    var res = sim.simularPartido(mezcla.slice(0, 4), mezcla.slice(4, 8), rngPartido);
    totalGoles += res.goles[0] + res.goles[1];
    if (res.alargue) aAlargue++;
    if (res.penales) aPenales++;
  }
  return { golesPromedio: totalGoles / n, pctAlargue: aAlargue / n, pctPenales: aPenales / n };
}

function pct(x) { return (x * 100).toFixed(1) + '%'; }

var filas = [];
var todoOk = true;

function agregarFila(nombre, valorTexto, objetivoTexto, ok) {
  filas.push({ nombre: nombre, valor: valorTexto, objetivo: objetivoTexto, ok: ok });
  if (!ok) todoOk = false;
}

// 1) Dos equipos identicos
(function () {
  var equipoA = [porNombreCarta('Kroos'), porNombreCarta('Ferdinand'), porNombreCarta('Griezmann'), porNombreCarta('Hazard')];
  var equipoB = equipoA.map(function (j) { return Object.assign({}, j, { id: j.id + 100000 }); });
  var probs = sim.probabilidadVictoria(equipoA, equipoB, N, 'calib:identicos');
  var ok = probs[0] >= 0.48 && probs[0] <= 0.52;
  agregarFila('Dos equipos identicos', 'gana A ' + pct(probs[0]), '48%-52%', ok);
})();

// 2) Drafts aleatorios (4 de campo de todo el pool)
(function () {
  var r = correrDraftsAleatorios(N, 'calib:drafts');
  var okGoles = r.golesPromedio >= 2.8 && r.golesPromedio <= 4.2;
  var okAlargue = r.pctAlargue >= 0.12 && r.pctAlargue <= 0.28;
  var okPenales = r.pctPenales <= 0.06;
  agregarFila('Drafts aleatorios: goles/partido (90\' + alargue)', r.golesPromedio.toFixed(2), '2.8-4.2', okGoles);
  agregarFila('Drafts aleatorios: % que van al alargue', pct(r.pctAlargue), '12%-28%', okAlargue);
  agregarFila('Drafts aleatorios: % que llegan a penales', pct(r.pctPenales), '<=6%', okPenales);
})();

// 3) Diferencia de OVR promedio ~3
(function () {
  var par = escenarioDiferencia(3, 'calib:diff3');
  var probs = [par.prob];
  var ok = probs[0] >= 0.57 && probs[0] <= 0.67;
  agregarFila('Diferencia de OVR ~3 (real ' + par.diffReal.toFixed(1) + ')', 'gana el mejor ' + pct(probs[0]), '57%-67%', ok);
})();

// 4) Diferencia de OVR promedio ~6
(function () {
  var par = escenarioDiferencia(6, 'calib:diff6');
  var probs = [par.prob];
  var ok = probs[0] >= 0.68 && probs[0] <= 0.80;
  agregarFila('Diferencia de OVR ~6 (real ' + par.diffReal.toFixed(1) + ')', 'gana el mejor ' + pct(probs[0]), '68%-80%', ok);
})();

// 5) Diferencia de OVR promedio ~10
(function () {
  var par = escenarioDiferencia(10, 'calib:diff10');
  var probs = [par.prob];
  var ok = probs[0] >= 0.82 && probs[0] <= 0.92;
  agregarFila('Diferencia de OVR ~10 (real ' + par.diffReal.toFixed(1) + ')', 'gana el mejor ' + pct(probs[0]), '82%-92%', ok);
})();

// 6) Equipo de leyendas vs equipo modesto
(function () {
  var equipoA = [porNombreCarta('Beckenbauer'), porNombreCarta('Maradona'), porNombreCarta('Messi'), porNombreCarta('Pelé')];
  var equipoB = [porNombreCarta('Ruggeri'), porNombreCarta('Ayala'), porNombreCarta('Bochini'), porNombreCarta('Caniggia')];
  var probs = sim.probabilidadVictoria(equipoA, equipoB, N, 'calib:leyendas');
  var ok = probs[0] >= 0.88 && probs[0] <= 0.96;
  agregarFila('Beckenbauer+Maradona+Messi+Pelé vs Ruggeri+Ayala+Bochini+Caniggia', 'gana A ' + pct(probs[0]), '88%-96%', ok);
})();

// 7) Equilibrado vs todo ataque (mismo OVR promedio, 90)
(function () {
  var equilibrado = [porNombreCarta('Nesta'), porNombreCarta('Puyol'), porNombreCarta('Gerrard'), porNombreCarta('Raúl')];
  var todoAtaque = [porNombreCarta('Totti'), porNombreCarta('Del Piero'), porNombreCarta('Tostão'), porNombreCarta('Bergkamp')];
  var probs = sim.probabilidadVictoria(equilibrado, todoAtaque, N, 'calib:equilibrado');
  var ok = probs[0] >= 0.50 && probs[0] <= 0.66;
  agregarFila('Equilibrado (Nesta,Puyol,Gerrard,Raúl) vs todo ataque (Totti,Del Piero,Tostão,Bergkamp)', 'gana equilibrado ' + pct(probs[0]), '50%-66%', ok);
})();

var anchoNombre = filas.reduce(function (m, f) { return Math.max(m, f.nombre.length); }, 'Escenario'.length);
var anchoValor = filas.reduce(function (m, f) { return Math.max(m, f.valor.length); }, 'Resultado'.length);
var anchoObjetivo = filas.reduce(function (m, f) { return Math.max(m, f.objetivo.length); }, 'Objetivo'.length);

function fila(a, b, c, d) {
  return '| ' + a.padEnd(anchoNombre) + ' | ' + b.padEnd(anchoValor) + ' | ' + c.padEnd(anchoObjetivo) + ' | ' + d + ' |';
}

console.log('Calibracion del simulador (' + N + ' partidos por escenario)\n');
console.log(fila('Escenario', 'Resultado', 'Objetivo', 'OK/FALLA'));
console.log(fila('-'.repeat(anchoNombre), '-'.repeat(anchoValor), '-'.repeat(anchoObjetivo), '--------'));
filas.forEach(function (f) {
  console.log(fila(f.nombre, f.valor, f.objetivo, f.ok ? 'OK' : 'FALLA'));
});

console.log('\nCONFIG_SIM actual:');
console.log(JSON.stringify(sim.CONFIG_SIM, null, 2));

if (!todoOk) {
  console.error('\nHay escenarios fuera de rango. Ajustar CONFIG_SIM y volver a correr.');
  process.exit(1);
} else {
  console.log('\nTodos los escenarios OK.');
}
