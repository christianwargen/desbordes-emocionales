(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./config.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.subasta = factory(root.SC.config);
  }
})(typeof self !== 'undefined' ? self : this, function (configMod) {
  'use strict';

  var CONFIG = configMod.CONFIG;

  function clonar(valor) {
    if (typeof structuredClone === 'function') return structuredClone(valor);
    return JSON.parse(JSON.stringify(valor));
  }

  function managerPorId(partido, managerId) {
    var m = partido.managers.filter(function (x) { return x.id === managerId; })[0];
    if (!m) throw new Error('No existe el manager ' + managerId);
    return m;
  }

  function otroManagerId(partido, managerId) {
    var otro = partido.managers.filter(function (x) { return x.id !== managerId; })[0];
    if (!otro) throw new Error('Se necesitan exactamente 2 managers');
    return otro.id;
  }

  // ---------------------------------------------------------------------
  // crearPartido({ numero, managers, nominaPrimero, seed, mercado })
  // managers: [{ id, nombre, color }, ...] (2 elementos)
  // ---------------------------------------------------------------------
  function crearPartido(opts) {
    return {
      numero: opts.numero,
      seed: opts.seed,
      managers: opts.managers.map(function (m) {
        return {
          id: m.id,
          nombre: m.nombre,
          color: m.color,
          presupuesto: CONFIG.PRESUPUESTO,
          plantel: [],
        };
      }),
      mercado: opts.mercado.slice(),
      nominaProximo: opts.nominaPrimero,
      lote: null,
      lotes: [],
    };
  }

  function lugaresLibres(partido, managerId) {
    return CONFIG.TAMANO_PLANTEL - managerPorId(partido, managerId).plantel.length;
  }

  function pujaMaxima(partido, managerId) {
    var libres = lugaresLibres(partido, managerId);
    if (libres <= 0) return 0;
    var m = managerPorId(partido, managerId);
    return m.presupuesto - (libres - 1) * CONFIG.PRECIO_INICIAL;
  }

  function estadoSubasta(partido) {
    if (partido.lote) return 'pujando';
    var completos = partido.managers.filter(function (m) { return lugaresLibres(partido, m.id) === 0; });
    if (completos.length === partido.managers.length) return 'terminada';
    if (completos.length === 1) return 'compraDirecta';
    return 'nominando';
  }

  // Adjudica el lote en curso al lider actual (uso interno).
  function adjudicar(partido) {
    var lote = partido.lote;
    var nuevo = clonar(partido);
    var m = managerPorId(nuevo, lote.lider);
    m.plantel.push(lote.jugadorId);
    m.presupuesto -= lote.precio;
    nuevo.mercado = nuevo.mercado.filter(function (id) { return id !== lote.jugadorId; });
    nuevo.lotes = nuevo.lotes.concat([{
      jugadorId: lote.jugadorId,
      ganador: lote.lider,
      precio: lote.precio,
      pujas: lote.pujas,
    }]);
    nuevo.lote = null;

    var noNomino = otroManagerId(nuevo, lote.nominador);
    nuevo.nominaProximo = lugaresLibres(nuevo, noNomino) > 0 ? noNomino : lote.nominador;
    return nuevo;
  }

  // Si al manager de turno no le alcanza para superar el precio actual, o ya
  // completo su plantel, el lote se cierra solo a favor del lider.
  function resolverCierreSiCorresponde(partido) {
    if (!partido.lote) return partido;
    var turno = partido.lote.turno;
    if (lugaresLibres(partido, turno) <= 0) return adjudicar(partido);
    if (pujaMaxima(partido, turno) < partido.lote.precio + CONFIG.INCREMENTO) return adjudicar(partido);
    return partido;
  }

  function nominar(partido, managerId, jugadorId) {
    if (estadoSubasta(partido) !== 'nominando') throw new Error('No se puede nominar en este momento');
    if (partido.nominaProximo !== managerId) throw new Error('No es el turno de ' + managerId + ' para nominar');
    if (lugaresLibres(partido, managerId) <= 0) throw new Error('El manager ya completo su plantel');
    if (partido.mercado.indexOf(jugadorId) === -1) throw new Error('El jugador ' + jugadorId + ' no esta disponible en el mercado');

    var nuevo = clonar(partido);
    nuevo.lote = {
      jugadorId: jugadorId,
      nominador: managerId,
      precio: CONFIG.PRECIO_INICIAL,
      lider: managerId,
      turno: otroManagerId(partido, managerId),
      pujas: [{ manager: managerId, monto: CONFIG.PRECIO_INICIAL }],
    };
    return resolverCierreSiCorresponde(nuevo);
  }

  function pujar(partido, managerId, montoCentavos) {
    if (!partido.lote) throw new Error('No hay ningun lote en curso');
    if (partido.lote.turno !== managerId) throw new Error('No es el turno de ' + managerId + ' para pujar');
    if (montoCentavos % CONFIG.INCREMENTO !== 0) throw new Error('El monto debe ser multiplo de ' + CONFIG.INCREMENTO);
    if (montoCentavos <= partido.lote.precio) throw new Error('El monto debe superar el precio actual');
    var max = pujaMaxima(partido, managerId);
    if (montoCentavos > max) throw new Error('El monto supera la puja maxima (' + max + ') de ' + managerId);

    var nuevo = clonar(partido);
    nuevo.lote.precio = montoCentavos;
    nuevo.lote.lider = managerId;
    nuevo.lote.turno = otroManagerId(partido, managerId);
    nuevo.lote.pujas = nuevo.lote.pujas.concat([{ manager: managerId, monto: montoCentavos }]);
    return resolverCierreSiCorresponde(nuevo);
  }

  function pasar(partido, managerId) {
    if (!partido.lote) throw new Error('No hay ningun lote en curso');
    if (partido.lote.turno !== managerId) throw new Error('No es el turno de ' + managerId + ' para pasar');
    return adjudicar(partido);
  }

  function ficharDirecto(partido, managerId, jugadorId) {
    if (estadoSubasta(partido) !== 'compraDirecta') throw new Error('No estamos en modo de compra directa');
    if (lugaresLibres(partido, managerId) <= 0) throw new Error('El manager ya completo su plantel');
    if (partido.mercado.indexOf(jugadorId) === -1) throw new Error('El jugador ' + jugadorId + ' no esta disponible en el mercado');

    var nuevo = clonar(partido);
    var m = managerPorId(nuevo, managerId);
    m.plantel.push(jugadorId);
    m.presupuesto -= CONFIG.PRECIO_INICIAL;
    nuevo.mercado = nuevo.mercado.filter(function (id) { return id !== jugadorId; });
    nuevo.lotes = nuevo.lotes.concat([{
      jugadorId: jugadorId,
      ganador: managerId,
      precio: CONFIG.PRECIO_INICIAL,
      pujas: [{ manager: managerId, monto: CONFIG.PRECIO_INICIAL }],
    }]);
    return nuevo;
  }

  // Deshace la ultima accion del lote en curso (una puja, o la nominacion si
  // todavia no se pujo). No deshace lotes ya adjudicados. (P2)
  function deshacer(partido) {
    if (!partido.lote) throw new Error('No hay ninguna accion para deshacer');
    var nuevo = clonar(partido);
    var lote = nuevo.lote;
    if (lote.pujas.length <= 1) {
      nuevo.lote = null;
      return nuevo;
    }
    var deshecha = lote.pujas.pop();
    var anterior = lote.pujas[lote.pujas.length - 1];
    lote.precio = anterior.monto;
    lote.lider = anterior.manager;
    lote.turno = deshecha.manager;
    return nuevo;
  }

  return {
    crearPartido: crearPartido,
    lugaresLibres: lugaresLibres,
    pujaMaxima: pujaMaxima,
    estadoSubasta: estadoSubasta,
    nominar: nominar,
    pujar: pujar,
    pasar: pasar,
    ficharDirecto: ficharDirecto,
    deshacer: deshacer,
  };
});
