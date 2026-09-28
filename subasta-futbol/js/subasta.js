(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./config.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.subasta = factory(root.SC.config);
  }
})(typeof self !== 'undefined' ? self : this, function (configMod) {
  'use strict';

  // Subasta al azar para 2 a 6 managers. Los jugadores salen de a uno desde
  // un mazo mezclado. El lote arranca en $1 sin dueño y el turno va rotando:
  // cada uno puja o pasa. Pasar cuando nadie pujo gasta uno de los pases del
  // partido (CONFIG.PASES_POR_PARTIDO); pasar cuando ya hay alguien ganando es
  // libre (es no subir). El que pasa queda afuera de ese lote. Si nadie puja,
  // el jugador se descarta. Cuando queda un solo manager con lugares libres,
  // se le completa el plantel al azar con un equipo parejo (js/reparto.js,
  // aplicado con completarPlantel).

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

  // ---------------------------------------------------------------------
  // crearPartido({ numero, managers, abrePrimero, seed, mazo })
  // managers: [{ id, nombre, color }, ...] (2 a 6), en orden de ronda
  // mazo: ids en el orden en que salen a subasta (mercado.generarMazo)
  // ---------------------------------------------------------------------
  function crearPartido(opts) {
    if (opts.managers.length < 2) throw new Error('Se necesitan al menos 2 managers');
    return {
      numero: opts.numero,
      seed: opts.seed,
      managers: opts.managers.map(function (m) {
        return {
          id: m.id, nombre: m.nombre, color: m.color,
          presupuesto: CONFIG.PRESUPUESTO, plantel: [], pases: CONFIG.PASES_POR_PARTIDO,
        };
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

  function idsConLugar(partido) {
    return partido.managers
      .filter(function (m) { return m.plantel.length < CONFIG.TAMANO_PLANTEL; })
      .map(function (m) { return m.id; });
  }

  // El siguiente de `candidatos` despues de `desdeId`, en el orden de la ronda.
  function siguienteEnRonda(partido, desdeId, candidatos) {
    var orden = partido.managers.map(function (m) { return m.id; });
    var i = orden.indexOf(desdeId);
    for (var k = 1; k <= orden.length; k++) {
      var id = orden[(i + k) % orden.length];
      if (candidatos.indexOf(id) !== -1) return id;
    }
    return null;
  }

  // 'pujando' | 'esperandoLote' | 'reparto' | 'terminada'
  function estadoSubasta(partido) {
    if (partido.lote) return 'pujando';
    var conLugar = idsConLugar(partido);
    if (conLugar.length === 0) return 'terminada';
    if (conLugar.length === 1) return 'reparto';
    if (partido.mazoPos >= partido.mazo.length) return 'reparto'; // no quedan cartas (rarisimo)
    return 'esperandoLote';
  }

  // Monto minimo para la proxima puja del lote en curso.
  function montoMinimo(partido) {
    var lote = partido.lote;
    if (!lote) return 0;
    return lote.lider === null ? CONFIG.PRECIO_INICIAL : lote.precio + CONFIG.INCREMENTO;
  }

  // Managers que todavia pueden actuar en el lote: con lugar, que no pasaron,
  // que no son el lider y a los que les alcanza para superar el precio.
  function activosLote(partido) {
    var lote = partido.lote;
    var minimo = montoMinimo(partido);
    return idsConLugar(partido).filter(function (id) {
      return lote.fuera.indexOf(id) === -1 && id !== lote.lider && pujaMaxima(partido, id) >= minimo;
    });
  }

  // Pases que le quedan a un manager en este partido.
  function pasesRestantes(partido, managerId) {
    return managerPorId(partido, managerId).pases;
  }

  // Si el manager de turno puede pasar ahora (cuando nadie pujo, cuesta un pase).
  function puedePasar(partido, managerId) {
    var lote = partido.lote;
    if (!lote || lote.turno !== managerId) return false;
    return lote.lider !== null || pasesRestantes(partido, managerId) > 0;
  }

  // Saca el proximo jugador del mazo y lo pone en subasta.
  function abrirLote(partido) {
    if (estadoSubasta(partido) !== 'esperandoLote') throw new Error('No se puede sacar un jugador en este momento');
    var nuevo = clonar(partido);
    var conLugar = idsConLugar(nuevo);
    var abre = conLugar.indexOf(nuevo.abreProximo) !== -1 ? nuevo.abreProximo : siguienteEnRonda(nuevo, nuevo.abreProximo, conLugar);
    nuevo.lote = {
      jugadorId: nuevo.mazo[nuevo.mazoPos],
      abre: abre,
      precio: 0,
      lider: null,
      turno: abre,
      fuera: [],
      pujas: [],
      pila: [],
    };
    nuevo.mazoPos++;
    return nuevo;
  }

  function cerrarLote(nuevo) {
    var abre = nuevo.lote.abre;
    nuevo.lote = null;
    var conLugar = idsConLugar(nuevo);
    nuevo.abreProximo = conLugar.length ? siguienteEnRonda(nuevo, abre, conLugar) : abre;
    return nuevo;
  }

  // Adjudica el lote en curso al lider actual (uso interno, muta `nuevo`).
  function adjudicar(nuevo) {
    var lote = nuevo.lote;
    var m = managerPorId(nuevo, lote.lider);
    m.plantel.push(lote.jugadorId);
    m.presupuesto -= lote.precio;
    nuevo.lotes.push({ jugadorId: lote.jugadorId, ganador: lote.lider, precio: lote.precio, pujas: lote.pujas });
    return cerrarLote(nuevo);
  }

  // Nadie lo quiso: queda afuera de este partido (uso interno, muta `nuevo`).
  function descartar(nuevo) {
    nuevo.descartados.push(nuevo.lote.jugadorId);
    return cerrarLote(nuevo);
  }

  // Despues de una accion: le toca al siguiente activo, o se cierra el lote.
  function avanzar(nuevo, desdeId) {
    var activos = activosLote(nuevo);
    if (activos.length === 0) return nuevo.lote.lider === null ? descartar(nuevo) : adjudicar(nuevo);
    nuevo.lote.turno = siguienteEnRonda(nuevo, desdeId, activos);
    return nuevo;
  }

  // Guarda el estado previo del lote (y los pases) para poder deshacer.
  function foto(partido) {
    var lote = clonar(partido.lote);
    delete lote.pila;
    return { lote: lote, pases: partido.managers.map(function (m) { return m.pases; }) };
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
    nuevo.lote.pila.push(foto(partido));
    nuevo.lote.precio = montoCentavos;
    nuevo.lote.lider = managerId;
    nuevo.lote.pujas.push({ manager: managerId, monto: montoCentavos });
    return avanzar(nuevo, managerId);
  }

  function pasar(partido, managerId) {
    var lote = partido.lote;
    if (!lote) throw new Error('No hay ningun lote en curso');
    if (lote.turno !== managerId) throw new Error('No es el turno de ' + managerId + ' para pasar');
    if (!puedePasar(partido, managerId)) throw new Error('No te quedan pases: tenés que pujar');

    var nuevo = clonar(partido);
    nuevo.lote.pila.push(foto(partido));
    if (lote.lider === null) managerPorId(nuevo, managerId).pases--;
    nuevo.lote.fuera.push(managerId);
    return avanzar(nuevo, managerId);
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

  // Deshace la ultima accion (puja o paso) del lote en curso, devolviendo el
  // pase si lo habia gastado. No deshace lotes ya cerrados.
  function deshacer(partido) {
    var lote = partido.lote;
    if (!lote || lote.pila.length === 0) throw new Error('No hay ninguna accion para deshacer');
    var nuevo = clonar(partido);
    var anterior = nuevo.lote.pila.pop();
    var pila = nuevo.lote.pila;
    nuevo.lote = anterior.lote;
    nuevo.lote.pila = pila;
    nuevo.managers.forEach(function (m, i) { m.pases = anterior.pases[i]; });
    return nuevo;
  }

  return {
    crearPartido: crearPartido,
    lugaresLibres: lugaresLibres,
    pujaMaxima: pujaMaxima,
    idsConLugar: idsConLugar,
    estadoSubasta: estadoSubasta,
    montoMinimo: montoMinimo,
    pasesRestantes: pasesRestantes,
    puedePasar: puedePasar,
    abrirLote: abrirLote,
    pujar: pujar,
    pasar: pasar,
    completarPlantel: completarPlantel,
    deshacer: deshacer,
  };
});
