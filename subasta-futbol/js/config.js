(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SC = root.SC || {};
    root.SC.config = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAMANO_PLANTEL = 4;

  var CONFIG = {
    PRESUPUESTO: 2000, // $20 en centavos
    PRECIO_INICIAL: 100, // $1
    INCREMENTO: 50, // $0,50
    TAMANO_PLANTEL: TAMANO_PLANTEL,
    PUNTOS_POR_VICTORIA: 10,
    PUNTOS_OBJETIVO: 100,
    // Cantidad de fechas (subasta + partido/s) que se elige al empezar.
    FECHAS_POR_DEFECTO: 10, FECHAS_MIN: 1, FECHAS_MAX: 30,
    MANAGERS_MIN: 2, MANAGERS_MAX: 6,
    MERCADO: {
      tamano: 24,
      porCategoria: { Leyenda: 3, Crack: 4, Estrella: 10, Figura: 7 },
      // Sin arqueros: el arquero es el mismo para los dos equipos (ver simulacion.js).
      minPorPosicion: { DEF: 4, MED: 4, DEL: 4 },
    },
    // Un color por manager, en orden (hasta 6).
    COLORES: ['#38BDF8', '#FB923C', '#4ADE80', '#C084FC', '#FACC15', '#F472B6'],
  };

  // Tabla de categorías por OVR (sección 2.3 / 3.2)
  function categoriaPorOvr(ovr) {
    if (ovr >= 95) return 'Leyenda';
    if (ovr >= 92) return 'Crack';
    if (ovr >= 89) return 'Estrella';
    return 'Figura';
  }

  // Formatea centavos como plata en formato es-AR: sin decimales si es entero, con coma si no.
  function formatearPlata(centavos) {
    var negativo = centavos < 0;
    var valor = Math.abs(centavos);
    var pesos = Math.floor(valor / 100);
    var resto = valor % 100;
    var texto;
    if (resto === 0) {
      texto = '$' + pesos;
    } else {
      var centavosTexto = resto === 50 ? '50' : String(resto).padStart(2, '0');
      texto = '$' + pesos + ',' + centavosTexto;
    }
    return (negativo ? '-' : '') + texto;
  }

  return {
    CONFIG: CONFIG,
    categoriaPorOvr: categoriaPorOvr,
    formatearPlata: formatearPlata,
  };
});
