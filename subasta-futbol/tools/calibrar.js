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

function jugadorMasCercanoOvr(lista, ovrObjetivo, evitarId) {
  var mejor = null, mejorDist = Infinity;
  lista.forEach(function (j) {
    if (j.id === evitarId) return;
    var dist = Math.abs(j.ovr - ovrObjetivo);
    if (dist < mejorDist) { mejorDist = dist; mejor = j; }
  });
  return mejor;
}

// Arma dos equipos (1 POR + 1 DEF + 1 MED + 1 DEL cada uno): el equipo A
// sale de un ranking medio por posicion, y para el equipo B se busca, en
// cada posicion, al jugador cuyo OVR esta mas cerca de (OVR de A - target).
function armarParPorDiferencia(targetDiff, rankBaseA) {
  var posiciones = ['POR', 'DEF', 'MED', 'DEL'];
  var listas = {};
  posiciones.forEach(function (p) { listas[p] = porPosicionOrdenado(p); });

  var equipoA = posiciones.map(function (p) { return listas[p][rankBaseA]; });
  var equipoB = posiciones.map(function (p, i) {
    return jugadorMasCercanoOvr(listas[p], equipoA[i].ovr - targetDiff, equipoA[i].id);
  });
  var diffReal = (equipoA.reduce(function (s, j) { return s + j.ovr; }, 0) -
    equipoB.reduce(function (s, j) { return s + j.ovr; }, 0)) / posiciones.length;
  return { equipoA: equipoA, equipoB: equipoB, diffReal: diffReal };
}

function correrDraftsAleatorios(n, seed) {
  var random = rngMod.crearRng(seed);
  var porteros = porPosicionOrdenado('POR');
  var campoTodos = jugadores.filter(function (j) { return j.posicion !== 'POR'; });

  var totalGoles = 0;
  var aPenales = 0;
  for (var i = 0; i < n; i++) {
    var porA = rngMod.elegir(random, porteros);
    var campoA = rngMod.mezclar(random, campoTodos).slice(0, 3);
    var porB = rngMod.elegir(random, porteros);
    var campoB = rngMod.mezclar(random, campoTodos).slice(0, 3);
    var equipoA = [porA].concat(campoA);
    var equipoB = [porB].concat(campoB);

    var rngPartido = rngMod.crearRng(seed + ':partido:' + i);
    var res = sim.simularPartido(equipoA, equipoB, rngPartido);
    totalGoles += res.goles[0] + res.goles[1];
    if (res.penales) aPenales++;
  }
  return { golesPromedio: totalGoles / n, pctPenales: aPenales / n };
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
  var equipoA = [porNombreCarta('Kroos'), porNombreCarta('Ferdinand'), porNombreCarta('Griezmann'), porNombreCarta('Oblak')];
  var equipoB = equipoA.map(function (j) { return Object.assign({}, j, { id: j.id + 100000 }); });
  var probs = sim.probabilidadVictoria(equipoA, equipoB, N, 'calib:identicos');
  var ok = probs[0] >= 0.48 && probs[0] <= 0.52;
  agregarFila('Dos equipos identicos', 'gana A ' + pct(probs[0]), '48%-52%', ok);
})();

// 2) Drafts aleatorios (1 POR + 3 de campo de todo el pool)
(function () {
  var r = correrDraftsAleatorios(N, 'calib:drafts');
  var okGoles = r.golesPromedio >= 2.8 && r.golesPromedio <= 4.2;
  var okPenales = r.pctPenales >= 0.15 && r.pctPenales <= 0.28;
  agregarFila('Drafts aleatorios: goles/partido', r.golesPromedio.toFixed(2), '2.8-4.2', okGoles);
  agregarFila('Drafts aleatorios: % a penales', pct(r.pctPenales), '15%-28%', okPenales);
})();

// 3) Diferencia de OVR promedio ~3
(function () {
  var par = armarParPorDiferencia(3, 2);
  var probs = sim.probabilidadVictoria(par.equipoA, par.equipoB, N, 'calib:diff3');
  var ok = probs[0] >= 0.57 && probs[0] <= 0.67;
  agregarFila('Diferencia de OVR ~3 (real ' + par.diffReal.toFixed(1) + ')', 'gana el mejor ' + pct(probs[0]), '57%-67%', ok);
})();

// 4) Diferencia de OVR promedio ~6
(function () {
  var par = armarParPorDiferencia(6, 2);
  var probs = sim.probabilidadVictoria(par.equipoA, par.equipoB, N, 'calib:diff6');
  var ok = probs[0] >= 0.68 && probs[0] <= 0.80;
  agregarFila('Diferencia de OVR ~6 (real ' + par.diffReal.toFixed(1) + ')', 'gana el mejor ' + pct(probs[0]), '68%-80%', ok);
})();

// 5) Diferencia de OVR promedio ~10
(function () {
  var par = armarParPorDiferencia(10, 2);
  var probs = sim.probabilidadVictoria(par.equipoA, par.equipoB, N, 'calib:diff10');
  var ok = probs[0] >= 0.82 && probs[0] <= 0.92;
  agregarFila('Diferencia de OVR ~10 (real ' + par.diffReal.toFixed(1) + ')', 'gana el mejor ' + pct(probs[0]), '82%-92%', ok);
})();

// 6) Equipo de leyendas vs equipo modesto
(function () {
  var equipoA = [porNombreCarta('Yashin'), porNombreCarta('Beckenbauer'), porNombreCarta('Maradona'), porNombreCarta('Messi')];
  var equipoB = [porNombreCarta('Zenga'), porNombreCarta('Ayala'), porNombreCarta('Bochini'), porNombreCarta('Caniggia')];
  var probs = sim.probabilidadVictoria(equipoA, equipoB, N, 'calib:leyendas');
  var ok = probs[0] >= 0.88 && probs[0] <= 0.95;
  agregarFila('Yashin+Beckenbauer+Maradona+Messi vs Zenga+Ayala+Bochini+Caniggia', 'gana A ' + pct(probs[0]), '88%-95%', ok);
})();

// 7) Con arquero vs sin arquero
(function () {
  var conArquero = [porNombreCarta('Yashin'), porNombreCarta('Messi'), porNombreCarta('Pelé'), porNombreCarta('Maradona')];
  var sinArquero = [porNombreCarta('Cruyff'), porNombreCarta('Messi'), porNombreCarta('Pelé'), porNombreCarta('Maradona')];
  var probs = sim.probabilidadVictoria(conArquero, sinArquero, N, 'calib:sinarquero');
  var ok = probs[0] >= 0.80;
  agregarFila('Con arquero (Yashin) vs sin arquero (Cruyff de campo)', 'gana con arquero ' + pct(probs[0]), '>=80%', ok);
})();

// 8) Equilibrado vs todo ataque
(function () {
  var equilibrado = [porNombreCarta('Kahn'), porNombreCarta('Puyol'), porNombreCarta('Gerrard'), porNombreCarta('Raúl')];
  var todoAtaque = [porNombreCarta('Kahn'), porNombreCarta('Raúl'), porNombreCarta('Totti'), porNombreCarta('Del Piero')];
  var probs = sim.probabilidadVictoria(equilibrado, todoAtaque, N, 'calib:equilibrado');
  var ok = probs[0] >= 0.52 && probs[0] <= 0.68;
  agregarFila('Equilibrado (Kahn,Puyol,Gerrard,Raúl) vs todo ataque (Kahn,Raúl,Totti,Del Piero)', 'gana equilibrado ' + pct(probs[0]), '52%-68%', ok);
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
