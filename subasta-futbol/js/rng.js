(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SC = root.SC || {};
    root.SC.rng = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Hash de una cadena a un entero de 32 bits (para derivar seeds numéricas).
  function hashSeed(texto) {
    var str = String(texto);
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // mulberry32: PRNG determinístico y rápido, devuelve un generador `rng()` -> [0, 1).
  function crearRng(seed) {
    var a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
    return function rng() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Entero al azar entre min y max, ambos inclusive.
  function entero(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  // Elige un elemento al azar de un array.
  function elegir(rng, lista) {
    return lista[Math.floor(rng() * lista.length)];
  }

  // Devuelve una copia mezclada del array (Fisher-Yates).
  function mezclar(rng, lista) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = copia[i];
      copia[i] = copia[j];
      copia[j] = tmp;
    }
    return copia;
  }

  // Elige un elemento al azar ponderado. `pesoDe` recibe cada elemento y devuelve su peso (>0).
  function ponderado(rng, lista, pesoDe) {
    var total = 0;
    for (var i = 0; i < lista.length; i++) total += pesoDe(lista[i]);
    var objetivo = rng() * total;
    var acumulado = 0;
    for (var j = 0; j < lista.length; j++) {
      acumulado += pesoDe(lista[j]);
      if (objetivo < acumulado) return lista[j];
    }
    return lista[lista.length - 1];
  }

  return {
    hashSeed: hashSeed,
    crearRng: crearRng,
    entero: entero,
    elegir: elegir,
    mezclar: mezclar,
    ponderado: ponderado,
  };
});
