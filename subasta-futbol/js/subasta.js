(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./config.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.subasta = factory(root.SC.config);
  }
})(typeof self !== 'undefined' ? self : this, function (configMod) {
  'use strict';

  // Subasta al azar: los jugadores salen de a uno desde un mazo mezclado. El
  // lote arranca en $1 sin dueño; al que le toca puede pujar o pasar. Si los
  // dos pasan sin que nadie puje, el jugador se descarta. Cuando uno completa
  // sus 4, al otro se le completa el plantel al azar con un equipo parejo
  // (eso lo decide js/reparto.js y se aplica con completarPlantel).

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
  // crearPartido({ numero, managers, abrePrimero, seed, mazo })
  // managers: [{ id, nombre, color }, ...] (2 elementos)
  // mazo: ids en el orden en que salen a subasta (mercado.generarMazo)
  // ---------------------------------------------------------------------
  function crearPartido(opts) {
    return {
      numero: opts.numero,
      seed: opts.seed,
      managers: opts.managers.map(function (m) {
        return { id: m.id, nombre: m.nombre, color: m.color, presupuesto: CONFIG.PRESUPUESTO, plantel: [] };
      }),
      mazo: opts.mazo.slice(),
      mazoPos: 0,
      abreProximo: opts.abrePrimero,
      lote: null,
      lotes: [],
      descartados: [],
      reparto: [],
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

  // 'pujando' | 'esperandoLote' | 'reparto' | 'terminada'
  function estadoSubasta(partido) {
    if (partido.lote) return 'pujando';
    var completos = partido.managers.filter(function (m) { return lugaresLibres(partido, m.id) === 0; });
    if (completos.length === partido.managers.length) return 'terminada';
    if (completos.length > 0) return 'reparto';
    if (partido.mazoPos >= partido.mazo.length) return 'reparto'; // no quedan cartas (rarisimo)
    return 'esperandoLote';
  }

  // Monto minimo para la proxima puja del lote en curso.
  function montoMinimo(partido) {
    var lote = partido.lote;
    if (!lote) return 0;
    return lote.lider === null ? CONFIG.PRECIO_INICIAL : lote.precio + CONFIG.INCREMENTO;
  }

  // Saca el proximo jugador del mazo y lo pone en subasta.
  function abrirLote(partido) {
    if (estadoSubasta(partido) !== 'esperandoLote') throw new Error('No se puede sacar un jugador en este momento');
    var nuevo = clonar(partido);
    nuevo.lote = {
      jugadorId: nuevo.mazo[nuevo.mazoPos],
      abre: nuevo.abreProximo,
      precio: 0,
      lider: null,
      turno: nuevo.abreProximo,
      pasaron: [],
      pujas: [],
    };
    nuevo.mazoPos++;
    return nuevo;
  }

  function cerrarLote(nuevo) {
    nuevo.abreProximo = otroManagerId(nuevo, nuevo.lote.abre);
    nuevo.lote = null;
    return nuevo;
  }

  // Adjudica el lote en curso al lider actual (uso interno).
  function adjudicar(partido) {
    var nuevo = clonar(partido);
    var lote = nuevo.lote;
    var m = managerPorId(nuevo, lote.lider);
    m.plantel.push(lote.jugadorId);
    m.presupuesto -= lote.precio;
    nuevo.lotes.push({ jugadorId: lote.jugadorId, ganador: lote.lider, precio: lote.precio, pujas: lote.pujas });
    return cerrarLote(nuevo);
  }

  // Nadie lo quiso: el jugador queda afuera de este partido (uso interno).
  function descartar(partido) {
    var nuevo = clonar(partido);
    nuevo.descartados.push(nuevo.lote.jugadorId);
    return cerrarLote(nuevo);
  }

  // Si al que le toca responder no le alcanza para superar, ya completo su
  // plantel o ya paso en este lote, el lote se cierra a favor del lider.
  function resolverCierreSiCorresponde(partido) {
    var lote = partido.lote;
    if (!lote || lote.lider === null) return partido;
    var turno = lote.turno;
    if (lote.pasaron.indexOf(turno) !== -1) return adjudicar(partido);
    if (lugaresLibres(partido, turno) <= 0) return adjudicar(partido);
    if (pujaMaxima(partido, turno) < lote.precio + CONFIG.INCREMENTO) return adjudicar(partido);
    return partido;
  }

  function pujar(partido, managerId, montoCentavos) {
    var lote = partido.lote;
    if (!lote) throw new Error('No hay ningun lote en curso');
    if (lote.turno !== managerId) throw new Error('No es el turno de ' + managerId + ' para pujar');
    if (montoCentavos % CONFIG.INCREMENTO !== 0) throw new Error('El monto debe ser multiplo de ' + CONFIG.INCREMENTO);
    if (montoCentavos < montoMinimo(partido)) throw new Error('El monto tiene que ser de al menos ' + montoMinimo(partido));
    var max = pujaMaxima(partido, managerId);
    if (montoCentavos > max) throw new Error('El monto supera la puja maxima (' + max + ') de ' + managerId);

    var nuevo = clonar(partido);
    nuevo.lote.precio = montoCentavos;
    nuevo.lote.lider = managerId;
    nuevo.lote.turno = otroManagerId(partido, managerId);
    nuevo.lote.pujas.push({ manager: managerId, monto: montoCentavos });
    return resolverCierreSiCorresponde(nuevo);
  }

  function pasar(partido, managerId) {
    var lote = partido.lote;
    if (!lote) throw new Error('No hay ningun lote en curso');
    if (lote.turno !== managerId) throw new Error('No es el turno de ' + managerId + ' para pasar');
    if (lote.lider !== null) return adjudicar(partido);

    var otro = otroManagerId(partido, managerId);
    if (lote.pasaron.indexOf(otro) !== -1) return descartar(partido);
    var nuevo = clonar(partido);
    nuevo.lote.pasaron.push(managerId);
    nuevo.lote.turno = otro;
    return nuevo;
  }

  // Completa el plantel de un manager con los ids dados (reparto al azar),
  // a $1 cada uno. Solo en estado 'reparto'.
  function completarPlantel(partido, managerId, ids) {
    if (estadoSubasta(partido) !== 'reparto') throw new Error('No estamos en el reparto al azar');
    if (ids.length !== lugaresLibres(partido, managerId)) throw new Error('Hay que completar exactamente los lugares libres');
    var ocupados = [];
    partido.managers.forEach(function (m) { ocupados = ocupados.concat(m.plantel); });
    ids.forEach(function (id) {
      if (ocupados.indexOf(id) !== -1) throw new Error('El jugador ' + id + ' ya esta en un plantel');
    });

    var nuevo = clonar(partido);
    var m = managerPorId(nuevo, managerId);
    ids.forEach(function (id) {
      m.plantel.push(id);
      m.presupuesto -= CONFIG.PRECIO_INICIAL;
      nuevo.lotes.push({ jugadorId: id, ganador: managerId, precio: CONFIG.PRECIO_INICIAL, pujas: [], asignado: true });
    });
    nuevo.reparto.push({ manager: managerId, ids: ids.slice() });
    return nuevo;
  }

  // Deshace la ultima accion del lote en curso (una puja o un "paso").
  // No deshace lotes ya cerrados. (P2)
  function deshacer(partido) {
    var lote = partido.lote;
    if (!lote) throw new Error('No hay ninguna accion para deshacer');
    var nuevo = clonar(partido);
    var l = nuevo.lote;
    if (l.pujas.length > 0) {
      var deshecha = l.pujas.pop();
      var anterior = l.pujas[l.pujas.length - 1];
      l.precio = anterior ? anterior.monto : 0;
      l.lider = anterior ? anterior.manager : null;
      l.turno = deshecha.manager;
      return nuevo;
    }
    if (l.pasaron.length > 0) {
      l.turno = l.pasaron.pop();
      return nuevo;
    }
    throw new Error('No hay ninguna accion para deshacer');
  }

  return {
    crearPartido: crearPartido,
    lugaresLibres: lugaresLibres,
    pujaMaxima: pujaMaxima,
    estadoSubasta: estadoSubasta,
    montoMinimo: montoMinimo,
    abrirLote: abrirLote,
    pujar: pujar,
    pasar: pasar,
    completarPlantel: completarPlantel,
    deshacer: deshacer,
  };
});
