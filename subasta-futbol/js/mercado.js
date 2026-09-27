(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./config.js'), require('./jugadores.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.mercado = factory(root.SC.rng, root.SC.config, root.SC.jugadores);
  }
})(typeof self !== 'undefined' ? self : this, function (rngMod, configMod, jugadores) {
  'use strict';

  var CONFIG = configMod.CONFIG;
  var CATEGORIAS = ['Leyenda', 'Crack', 'Estrella', 'Figura'];
  // Al mercado solo salen jugadores de campo: el arquero es el mismo para los dos equipos.
  var jugadoresCampo = jugadores.filter(function (j) { return j.posicion !== 'POR'; });

  function agruparPorCategoria(lista) {
    var grupos = { Leyenda: [], Crack: [], Estrella: [], Figura: [] };
    lista.forEach(function (j) { grupos[j.categoria].push(j); });
    return grupos;
  }

  function contarPosicion(lista, pos) {
    var n = 0;
    for (var i = 0; i < lista.length; i++) if (lista[i].posicion === pos) n++;
    return n;
  }

  // Intenta reemplazar, al azar, un jugador "sobrante" (de una posicion que
  // no bajaria de su minimo si se va) por uno de `posFaltante`. Primero
  // intenta que el nuevo sea de la misma categoria que el que sale; si no
  // hay ninguno disponible en ninguna categoria "misma", devuelve false para
  // que el llamador reintente sin esa restriccion.
  function intentarReemplazo(elegidos, posFaltante, porCategoria, todos, random, mismaCategoria) {
    var minimos = CONFIG.MERCADO.minPorPosicion;
    var candidatosIdx = [];
    for (var i = 0; i < elegidos.length; i++) {
      var j = elegidos[i];
      if (j.posicion === posFaltante) continue;
      var minimoDeEsaPos = minimos[j.posicion] || 0;
      if (contarPosicion(elegidos, j.posicion) - 1 < minimoDeEsaPos) continue;
      candidatosIdx.push(i);
    }
    candidatosIdx = rngMod.mezclar(random, candidatosIdx);

    for (var k = 0; k < candidatosIdx.length; k++) {
      var idx = candidatosIdx[k];
      var saliente = elegidos[idx];
      var poolBase = mismaCategoria ? porCategoria[saliente.categoria] : todos;
      var disponibles = poolBase.filter(function (cand) {
        return cand.posicion === posFaltante && elegidos.indexOf(cand) === -1;
      });
      if (disponibles.length === 0) continue;
      var nuevo = rngMod.elegir(random, disponibles);
      elegidos[idx] = nuevo;
      return true;
    }
    return false;
  }

  // generarMercado(seed) -> array de 24 ids de jugadores (sin repetir),
  // mismo seed siempre da el mismo mercado.
  function generarMercado(seed) {
    var random = rngMod.crearRng(seed);
    var porCategoria = agruparPorCategoria(jugadoresCampo);

    var elegidos = [];
    CATEGORIAS.forEach(function (cat) {
      var cantidad = CONFIG.MERCADO.porCategoria[cat];
      var mezclado = rngMod.mezclar(random, porCategoria[cat]);
      elegidos = elegidos.concat(mezclado.slice(0, cantidad));
    });

    var minimos = CONFIG.MERCADO.minPorPosicion;
    var intentosMax = 500; // cota de seguridad, no deberia hacer falta
    Object.keys(minimos).forEach(function (posFaltante) {
      var intentos = 0;
      while (contarPosicion(elegidos, posFaltante) < minimos[posFaltante] && intentos < intentosMax) {
        intentos++;
        var ok = intentarReemplazo(elegidos, posFaltante, porCategoria, jugadoresCampo, random, true);
        if (!ok) intentarReemplazo(elegidos, posFaltante, porCategoria, jugadoresCampo, random, false);
      }
    });

    elegidos = rngMod.mezclar(random, elegidos);
    return elegidos.map(function (j) { return j.id; });
  }

  return { generarMercado: generarMercado };
});
