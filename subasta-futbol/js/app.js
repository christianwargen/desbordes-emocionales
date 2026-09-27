(function () {
  'use strict';

  var CONFIG = SC.config.CONFIG;
  var formatearPlata = SC.config.formatearPlata;
  var rngMod = SC.rng;
  var JUGADORES = SC.jugadores;
  var mercadoMod = SC.mercado;
  var subastaMod = SC.subasta;
  var simMod = SC.simulacion;
  var torneoMod = SC.torneo;

  var CLAVE_STORAGE = 'subasta-cracks:v1';

  var JUGADOR_POR_ID = {};
  JUGADORES.forEach(function (j) { JUGADOR_POR_ID[j.id] = j; });
  function idAJugador(id) { return JUGADOR_POR_ID[id]; }

  var Estado = { torneo: null, pantalla: 'inicio' };
  var UI = { filtroPos: 'Todos', jugadorSeleccionado: null };
  var animacion = { resultado: null, partido: null, saltado: false, timers: [] };

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------

  function escapeHtml(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function nombreManager(id) {
    var m = Estado.torneo.managers.filter(function (x) { return x.id === id; })[0];
    return m ? m.nombre : '';
  }

  function guardarEstado() {
    try {
      if (!Estado.torneo) { localStorage.removeItem(CLAVE_STORAGE); return; }
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify({ v: 1, torneo: Estado.torneo, pantalla: Estado.pantalla }));
    } catch (e) { /* sin almacenamiento disponible: seguimos sin persistir */ }
  }

  function cargarEstadoGuardado() {
    try {
      var raw = localStorage.getItem(CLAVE_STORAGE);
      if (!raw) return null;
      var datos = JSON.parse(raw);
      if (!datos || datos.v !== 1 || !datos.torneo) return null;
      return datos;
    } catch (e) {
      return null;
    }
  }

  function borrarEstadoGuardado() {
    try { localStorage.removeItem(CLAVE_STORAGE); } catch (e) { /* nada que hacer */ }
  }

  // Confirmación en dos toques, dentro de la página (sin window.confirm, que en
  // algunos visores embebidos no se muestra y devuelve siempre "no").
  function confirmarConDobleToque(boton, textoConfirmacion, accion) {
    if (boton.dataset.armado === '1') {
      clearTimeout(Number(boton.dataset.timer));
      accion();
      return;
    }
    var textoOriginal = boton.textContent;
    boton.dataset.armado = '1';
    boton.textContent = textoConfirmacion;
    boton.dataset.timer = String(setTimeout(function () {
      boton.dataset.armado = '';
      boton.textContent = textoOriginal;
    }, 4000));
  }

  function mostrarToast(texto) {
    var cont = document.getElementById('toast-cont');
    if (!cont) return;
    var el = document.createElement('div');
    el.className = 'toast-adjudicacion';
    el.textContent = texto;
    cont.appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  // ------------------------------------------------------------------
  // Carta de jugador (SESION.md 6.2)
  // ------------------------------------------------------------------

  function renderCarta(jugador, opts) {
    opts = opts || {};
    var tamano = opts.tamano || 'grande';
    var claseCategoria = 'carta--' + jugador.categoria.toLowerCase();
    var claseTamano = tamano === 'mini' ? ' carta--mini' : '';
    var ariaLabel = jugador.nombre + ', ' + jugador.ovr + ', ' + jugador.posDetalle;
    var estilo = opts.ancho ? ' style="--w:' + opts.ancho + '"' : '';

    var html = '<article class="carta ' + claseCategoria + claseTamano + '"' + estilo + ' aria-label="' + escapeHtml(ariaLabel) + '">';
    html += '<div class="carta__relleno"></div>';
    html += '<div class="carta__izq">';
    html += '<span class="carta__ovr">' + jugador.ovr + '</span><span class="carta__pos">' + jugador.posDetalle + '</span>';
    if (tamano !== 'mini') {
      html += '<span class="carta__sep"></span><span class="carta__bandera">' + jugador.bandera + '</span>';
      html += '<span class="carta__sep"></span><span class="carta__club">' + jugador.siglaClub + '</span>';
    }
    html += '</div>';
    html += '<svg class="carta__silueta" aria-hidden="true"><use href="#silueta"/></svg>';
    var claseLargo = jugador.nombreCarta.length > 9 ? ' carta__nombre--largo' : '';
    html += '<div class="carta__nombre' + claseLargo + '">' + escapeHtml(jugador.nombreCarta) + '</div>';
    if (tamano !== 'mini') {
      var esPor = jugador.posicion === 'POR';
      var colA = esPor ? [['est', 'EST'], ['par', 'PAR'], ['saq', 'SAQ']] : [['rit', 'RIT'], ['tir', 'TIR'], ['pas', 'PAS']];
      var colB = esPor ? [['ref', 'REF'], ['vel', 'VEL'], ['col', 'COL']] : [['reg', 'REG'], ['def', 'DEF'], ['fis', 'FÍS']];
      html += '<div class="carta__stats"><div class="carta__col">';
      colA.forEach(function (c) { html += '<div class="carta__stat"><b>' + jugador.carta[c[0]] + '</b><span>' + c[1] + '</span></div>'; });
      html += '</div><div class="carta__col">';
      colB.forEach(function (c) { html += '<div class="carta__stat"><b>' + jugador.carta[c[0]] + '</b><span>' + c[1] + '</span></div>'; });
      html += '</div></div>';
      html += '<div class="carta__pie">' + jugador.pico + ' · ' + escapeHtml(jugador.club.toUpperCase()) + '</div>';
    }
    html += '</article>';
    return html;
  }

  function cartaVacia() { return '<div class="carta-vacia">Vacío</div>'; }

  function renderMetricas(plantelJugadores) {
    if (plantelJugadores.length < CONFIG.TAMANO_PLANTEL) {
      return '<div class="metricas" style="opacity:.5">Completá el plantel para ver las métricas</div>';
    }
    var m = simMod.metricasEquipo(plantelJugadores);
    function barra(etq, val) {
      var pct = Math.max(0, Math.min(100, val));
      return '<div class="metrica"><span class="metrica__etiqueta">' + etq + '</span>' +
        '<div class="metrica__barra"><div class="metrica__relleno" style="width:' + pct + '%"></div></div>' +
        '<span class="metrica__valor">' + Math.round(val) + '</span></div>';
    }
    return '<div class="metricas">' + barra('ATQ', m.ATQ) + barra('CRE', m.CRE) + barra('DEF', m.DEF) + '</div>';
  }

  // ------------------------------------------------------------------
  // Navegacion
  // ------------------------------------------------------------------

  function irA(pantalla) {
    Estado.pantalla = pantalla;
    document.querySelectorAll('.pantalla').forEach(function (el) {
      el.classList.toggle('activa', el.getAttribute('data-pantalla') === pantalla);
    });
    guardarEstado();
    renderPantallaActual();
    actualizarBotonHistorialGlobal();
    window.scrollTo(0, 0);
  }

  function renderPantallaActual() {
    if (Estado.pantalla === 'inicio') renderInicio();
    else if (Estado.pantalla === 'subasta') renderSubasta();
    else if (Estado.pantalla === 'previa') renderPrevia();
    else if (Estado.pantalla === 'partido') iniciarPantallaPartido();
    else if (Estado.pantalla === 'resultado') renderResultado();
    else if (Estado.pantalla === 'campeon') renderCampeon();
  }

  function actualizarBotonHistorialGlobal() {
    var btn = document.getElementById('btn-historial-global');
    if (!btn) return;
    btn.style.display = (Estado.torneo && Estado.pantalla !== 'inicio') ? '' : 'none';
  }

  // ------------------------------------------------------------------
  // Pantalla 1: Inicio
  // ------------------------------------------------------------------

  function renderInicio() {
    var cont = document.getElementById('torneo-guardado-cont');
    var guardado = cargarEstadoGuardado();
    if (guardado && guardado.torneo) {
      var t = guardado.torneo;
      var texto = 'Continuar torneo (Partido ' + t.numeroPartido + ' · ' + t.managers[0].nombre + ' ' +
        t.managers[0].puntos + ' – ' + t.managers[1].nombre + ' ' + t.managers[1].puntos + ')';
      cont.innerHTML =
        '<div class="torneo-guardado"><span>' + escapeHtml(texto) + '</span>' +
        '<div class="fila-botones">' +
        '<button type="button" class="btn btn--principal btn--chico" id="btn-continuar-torneo">Continuar torneo</button>' +
        '<button type="button" class="btn btn--fantasma btn--chico" id="btn-descartar-torneo">Nuevo torneo</button>' +
        '</div></div>';
      document.getElementById('btn-continuar-torneo').addEventListener('click', function () {
        Estado.torneo = t;
        irA(guardado.pantalla || 'subasta');
      });
      document.getElementById('btn-descartar-torneo').addEventListener('click', function () {
        confirmarConDobleToque(this, 'Tocá de nuevo para borrar el guardado', function () {
          borrarEstadoGuardado();
          cont.innerHTML = '';
        });
      });
    } else {
      cont.innerHTML = '';
    }
  }

  function iniciarNuevoTorneo() {
    var nombre1 = document.getElementById('nombre-m1').value.trim() || 'Jugador 1';
    var nombre2 = document.getElementById('nombre-m2').value.trim() || 'Jugador 2';
    var modo = document.querySelector('input[name="modo"]:checked').value;
    var seed = 'torneo-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
    var managers = [
      { id: 0, nombre: nombre1, color: CONFIG.COLORES.manager1 },
      { id: 1, nombre: nombre2, color: CONFIG.COLORES.manager2 },
    ];
    var torneo = torneoMod.crearTorneo({ modo: modo, managers: managers, seed: seed });
    torneo = torneoMod.prepararSiguientePartido(torneo);
    Estado.torneo = torneo;
    irA('subasta');
  }

  // ------------------------------------------------------------------
  // Pantalla 2: Subasta
  // ------------------------------------------------------------------

  function renderEncabezado(torneo) {
    var modo = torneo.config.modo;
    var html = '<div><div class="encabezado__numero">Partido ' + torneo.numeroPartido + '</div>';
    html += '<div class="encabezado__marcador">';
    torneo.managers.forEach(function (m) {
      html += '<span class="encabezado__punto"><span class="pastilla" style="background:' + m.color + '"></span>' +
        escapeHtml(m.nombre) + ' ' + m.puntos + '</span>';
    });
    html += '</div></div>';
    html += '<div class="progreso">';
    torneo.managers.forEach(function (m) {
      var valor, max;
      if (modo === 'primeroA100') { valor = m.puntos; max = torneo.config.puntosObjetivo; }
      else { valor = torneo.historial.filter(function (h) { return h.ganador === m.id; }).length; max = torneo.config.partidosFijos; }
      var pct = Math.max(0, Math.min(100, (valor / max) * 100));
      html += '<div class="progreso__barra"><div class="progreso__relleno" style="width:' + pct + '%;background:' + m.color + '"></div></div>';
    });
    var textoProgreso = modo === 'primeroA100' ? 'hasta 100 puntos' : ('partido ' + Math.min(torneo.historial.length + 1, torneo.config.partidosFijos) + '/' + torneo.config.partidosFijos);
    html += '<div class="progreso__texto">' + textoProgreso + '</div></div>';
    document.getElementById('encabezado-subasta').innerHTML = html;
  }

  function renderPanelManager(partido, managerId) {
    var m = partido.managers[managerId];
    var pujaMax = subastaMod.pujaMaxima(partido, managerId);
    var esTurno = partido.lote ? partido.lote.turno === managerId :
      (subastaMod.estadoSubasta(partido) === 'nominando' && partido.nominaProximo === managerId) ||
      (subastaMod.estadoSubasta(partido) === 'compraDirecta' && subastaMod.lugaresLibres(partido, managerId) > 0);

    var html = '<div class="panel-manager__nombre">' + escapeHtml(m.nombre) + '</div>';
    html += '<div class="panel-manager__presupuesto">' + formatearPlata(m.presupuesto) + '</div>';
    html += '<div class="panel-manager__pujamax">Puja máx. ' + formatearPlata(pujaMax) + '</div>';
    html += '<div class="plantel">';
    for (var i = 0; i < CONFIG.TAMANO_PLANTEL; i++) {
      html += m.plantel[i] != null ? renderCarta(idAJugador(m.plantel[i]), { tamano: 'mini' }) : cartaVacia();
    }
    html += '</div>';
    html += renderMetricas(m.plantel.map(idAJugador));

    var panelEl = document.getElementById('panel-manager-' + managerId);
    panelEl.innerHTML = html;
    panelEl.classList.toggle('turno', !!esTurno);
  }

  function mensajeAdjudicacion(loteInfo, motivoNoAlcanza, managerQueNoAlcanza) {
    var j = idAJugador(loteInfo.jugadorId);
    var ganador = nombreManager(loteInfo.ganador);
    var precio = formatearPlata(loteInfo.precio);
    if (motivoNoAlcanza) {
      return 'A ' + nombreManager(managerQueNoAlcanza) + ' no le alcanza — ' + j.nombreCarta + ' es de ' + ganador + ' por ' + precio;
    }
    return '¡' + j.nombreCarta + ' es de ' + ganador + ' por ' + precio + '!';
  }

  function ejecutarAccionSubasta(accionFn, tipoAccion) {
    var partido = Estado.torneo.partidoActual;
    var lotesAntes = partido.lotes.length;
    var nuevo;
    try {
      nuevo = accionFn(partido);
    } catch (e) {
      mostrarToast(e.message);
      return;
    }
    Estado.torneo.partidoActual = nuevo;
    if (nuevo.lotes.length > lotesAntes) {
      var loteInfo = nuevo.lotes[nuevo.lotes.length - 1];
      var motivoNoAlcanza = tipoAccion !== 'pasar';
      var otro = nuevo.managers.filter(function (m) { return m.id !== loteInfo.ganador; })[0].id;
      mostrarToast(mensajeAdjudicacion(loteInfo, motivoNoAlcanza, otro));
    }
    guardarEstado();
    renderSubasta();
  }

  // Revelacion de la carta al nominar (P1): bandera -> posicion -> club ->
  // carta entera con destello. Dura <=1.5s, se saltea con un toque y se
  // omite si el sistema pide prefers-reduced-motion.
  function mostrarRevelacion(jugador, cb) {
    var reducida = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducida) { cb(); return; }

    var overlay = document.createElement('div');
    overlay.className = 'revelacion';
    var destello = jugador.categoria === 'Leyenda' ? '<div class="revelacion__destello" id="rev-destello"></div>' : '';
    overlay.innerHTML =
      '<div class="revelacion__contenido">' +
      '<div class="revelacion__paso revelacion__bandera" id="rev-bandera">' + jugador.bandera + '</div>' +
      '<div class="revelacion__paso revelacion__posicion" id="rev-posicion">' + jugador.posDetalle + '</div>' +
      '<div class="revelacion__paso revelacion__club" id="rev-club">' + escapeHtml(jugador.club) + '</div>' +
      '<div class="revelacion__paso revelacion__carta" id="rev-carta">' + renderCarta(jugador, { tamano: 'grande' }) + destello + '</div>' +
      '<div class="revelacion__toque">Tocá para saltear</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var pasos = ['rev-bandera', 'rev-posicion', 'rev-club', 'rev-carta'];
    var timers = [];
    var terminado = false;

    function mostrarPaso(idActivo) {
      pasos.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('activo', id === idActivo);
      });
      if (idActivo === 'rev-carta') {
        var d = document.getElementById('rev-destello');
        if (d) d.classList.add('activo');
      }
    }

    function finalizar() {
      if (terminado) return;
      terminado = true;
      timers.forEach(function (t) { clearTimeout(t); });
      overlay.remove();
      cb();
    }

    overlay.addEventListener('click', finalizar);
    timers.push(setTimeout(function () { mostrarPaso('rev-bandera'); }, 10));
    timers.push(setTimeout(function () { mostrarPaso('rev-posicion'); }, 320));
    timers.push(setTimeout(function () { mostrarPaso('rev-club'); }, 620));
    timers.push(setTimeout(function () { mostrarPaso('rev-carta'); }, 900));
    timers.push(setTimeout(finalizar, 1450));
  }

  function nominarConRevelacion(managerId, jugadorId) {
    var partido = Estado.torneo.partidoActual;
    var jugador = idAJugador(jugadorId);
    var lotesAntes = partido.lotes.length;
    var nuevo;
    try {
      nuevo = subastaMod.nominar(partido, managerId, jugadorId);
    } catch (e) {
      mostrarToast(e.message);
      return;
    }
    if (nuevo.lotes.length > lotesAntes) {
      // se cerro solo (al rival no le alcanzaba ni para el $1 inicial)
      Estado.torneo.partidoActual = nuevo;
      var loteInfo = nuevo.lotes[nuevo.lotes.length - 1];
      var otro = nuevo.managers.filter(function (m) { return m.id !== loteInfo.ganador; })[0].id;
      mostrarToast(mensajeAdjudicacion(loteInfo, true, otro));
      guardarEstado();
      renderSubasta();
      return;
    }
    mostrarRevelacion(jugador, function () {
      Estado.torneo.partidoActual = nuevo;
      guardarEstado();
      renderSubasta();
    });
  }

  function botonPuja(monto, max, precioActual, etiqueta, claseExtra) {
    var deshabilitado = monto > max || monto <= precioActual || monto % CONFIG.INCREMENTO !== 0;
    return '<button type="button" class="btn ' + claseExtra + '" data-puja-monto="' + monto + '"' + (deshabilitado ? ' disabled' : '') + '>' + etiqueta + '</button>';
  }

  function renderCentroNominando(partido) {
    var turno = partido.nominaProximo;
    var jugadoresMercado = partido.mercado.map(idAJugador);

    var html = '<div class="mercado__nominacion">Nomina: <strong class="m' + (turno + 1) + '">' + escapeHtml(nombreManager(turno)) + '</strong></div>';

    if (UI.jugadorSeleccionado != null && jugadoresMercado.some(function (j) { return j.id === UI.jugadorSeleccionado; })) {
      var jSel = idAJugador(UI.jugadorSeleccionado);
      html += '<div class="seleccion-jugador">' + renderCarta(jSel, { tamano: 'grande' }) +
        '<div class="fila-botones">' +
        '<button type="button" class="btn btn--principal btn--grande" id="btn-sacar-subasta">Sacar a subasta por $1</button>' +
        '<button type="button" class="btn btn--fantasma" id="btn-cancelar-seleccion">Volver al mercado</button>' +
        '</div></div>';
      document.getElementById('centro-subasta').innerHTML = html;
      document.getElementById('btn-sacar-subasta').addEventListener('click', function () {
        var jugadorId = UI.jugadorSeleccionado;
        UI.jugadorSeleccionado = null;
        nominarConRevelacion(turno, jugadorId);
      });
      document.getElementById('btn-cancelar-seleccion').addEventListener('click', function () {
        UI.jugadorSeleccionado = null;
        renderCentroNominando(Estado.torneo.partidoActual);
      });
      return;
    }

    var filtrados = (UI.filtroPos === 'Todos' ? jugadoresMercado : jugadoresMercado.filter(function (j) { return j.posicion === UI.filtroPos; }))
      .slice().sort(function (a, b) { return b.ovr - a.ovr; });

    html += '<div class="mercado__filtros"><div class="mercado__filtros-pos">';
    ['Todos', 'POR', 'DEF', 'MED', 'DEL'].forEach(function (p) {
      html += '<button type="button" class="chip' + (UI.filtroPos === p ? ' activo' : '') + '" data-filtro-pos="' + p + '">' + p + '</button>';
    });
    html += '</div><button type="button" class="btn btn--chico" id="btn-azar">🎲 Al azar</button></div>';

    html += '<div class="mercado__grid">';
    filtrados.forEach(function (j) {
      html += '<button type="button" class="mercado__jugador" data-jugador-id="' + j.id + '">' + renderCarta(j, { tamano: 'mini' }) + '</button>';
    });
    html += '</div>';

    document.getElementById('centro-subasta').innerHTML = html;

    document.querySelectorAll('[data-filtro-pos]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.filtroPos = btn.getAttribute('data-filtro-pos');
        renderCentroNominando(Estado.torneo.partidoActual);
      });
    });
    document.getElementById('btn-azar').addEventListener('click', function () {
      var elegido = partido.mercado[Math.floor(Math.random() * partido.mercado.length)];
      nominarConRevelacion(turno, elegido);
    });
    document.querySelectorAll('[data-jugador-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.jugadorSeleccionado = Number(btn.getAttribute('data-jugador-id'));
        renderCentroNominando(Estado.torneo.partidoActual);
      });
    });
  }

  function renderCentroLote(partido) {
    var lote = partido.lote;
    var jugador = idAJugador(lote.jugadorId);
    var turno = lote.turno;
    var pujaMax = subastaMod.pujaMaxima(partido, turno);
    var opcionMedio = lote.precio + CONFIG.INCREMENTO;
    var opcionUno = lote.precio + 100;
    var opcionDos = lote.precio + 200;

    var html = '<section class="lote">';
    html += renderCarta(jugador, { tamano: 'grande', ancho: '230px' });
    html += '<div>';
    html += '<div class="lote__precio">' + formatearPlata(lote.precio) + '</div>';
    html += '<div class="lote__estado"><span>Va ganando: <strong class="m' + (lote.lider + 1) + '">' + escapeHtml(nombreManager(lote.lider)) + '</strong></span>';
    html += '<span>Le toca a: <strong class="m' + (turno + 1) + '">' + escapeHtml(nombreManager(turno)) + '</strong> (puja máx. ' + formatearPlata(pujaMax) + ')</span></div>';
    html += '<div class="fila-botones">';
    var etiquetaPrincipal = opcionMedio <= pujaMax ? '+$0,50 → ' + formatearPlata(opcionMedio) : '+$0,50';
    html += botonPuja(opcionMedio, pujaMax, lote.precio, etiquetaPrincipal, 'btn--principal');
    html += botonPuja(opcionUno, pujaMax, lote.precio, '+$1', '');
    html += botonPuja(opcionDos, pujaMax, lote.precio, '+$2', '');
    html += botonPuja(pujaMax, pujaMax, lote.precio, 'Todo (' + formatearPlata(pujaMax) + ')', '');
    html += '<button type="button" class="btn btn--pasar" id="btn-pasar">Pasar</button>';
    html += '</div>';
    html += '<div class="cadena">' + lote.pujas.map(function (p) {
      return '<span class="m' + (p.manager + 1) + '">' + escapeHtml(nombreManager(p.manager)) + ' ' + formatearPlata(p.monto) + '</span>';
    }).join(' → ') + '</div>';
    if (lote.pujas.length > 0) {
      html += '<button type="button" class="btn btn--fantasma btn--chico btn-deshacer" id="btn-deshacer">↩ Deshacer</button>';
    }
    html += '</div></section>';

    document.getElementById('centro-subasta').innerHTML = html;

    document.querySelectorAll('[data-puja-monto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var monto = Number(btn.getAttribute('data-puja-monto'));
        ejecutarAccionSubasta(function (p) { return subastaMod.pujar(p, turno, monto); }, 'pujar');
      });
    });
    var btnPasar = document.getElementById('btn-pasar');
    if (btnPasar) btnPasar.addEventListener('click', function () {
      ejecutarAccionSubasta(function (p) { return subastaMod.pasar(p, turno); }, 'pasar');
    });
    var btnDeshacer = document.getElementById('btn-deshacer');
    if (btnDeshacer) btnDeshacer.addEventListener('click', function () {
      try {
        Estado.torneo.partidoActual = subastaMod.deshacer(Estado.torneo.partidoActual);
        guardarEstado();
        renderSubasta();
      } catch (e) {
        mostrarToast(e.message);
      }
    });
  }

  function renderCentroCompraDirecta(partido) {
    var completo = partido.managers.filter(function (m) { return subastaMod.lugaresLibres(partido, m.id) === 0; })[0];
    var conLibres = partido.managers.filter(function (m) { return subastaMod.lugaresLibres(partido, m.id) > 0; })[0];
    var jugadoresMercado = partido.mercado.map(idAJugador).slice().sort(function (a, b) { return b.ovr - a.ovr; });

    var html = '<div class="compra-directa__banner">' + escapeHtml(nombreManager(completo.id)) + ' ya completó. ' +
      escapeHtml(nombreManager(conLibres.id)) + ' elige ' + subastaMod.lugaresLibres(partido, conLibres.id) + ' más a $1 cada uno.</div>';
    html += '<div class="mercado__grid">';
    jugadoresMercado.forEach(function (j) {
      html += '<button type="button" class="mercado__jugador" data-fichar-id="' + j.id + '">' + renderCarta(j, { tamano: 'mini' }) + '</button>';
    });
    html += '</div>';
    document.getElementById('centro-subasta').innerHTML = html;

    document.querySelectorAll('[data-fichar-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.getAttribute('data-fichar-id'));
        try {
          Estado.torneo.partidoActual = subastaMod.ficharDirecto(Estado.torneo.partidoActual, conLibres.id, id);
          guardarEstado();
          renderSubasta();
        } catch (e) {
          mostrarToast(e.message);
        }
      });
    });
  }

  function renderCentroTerminada() {
    document.getElementById('centro-subasta').innerHTML =
      '<div style="text-align:center;padding:40px 0"><p>¡Los dos equipos están completos!</p>' +
      '<button type="button" class="btn btn--principal btn--grande" id="btn-ir-partido">Ir al partido ⚽</button></div>';
    document.getElementById('btn-ir-partido').addEventListener('click', function () { irA('previa'); });
  }

  function renderSubasta() {
    var torneo = Estado.torneo;
    var partido = torneo.partidoActual;
    renderEncabezado(torneo);
    renderPanelManager(partido, 0);
    renderPanelManager(partido, 1);
    var estado = subastaMod.estadoSubasta(partido);
    if (estado === 'nominando') renderCentroNominando(partido);
    else if (estado === 'pujando') renderCentroLote(partido);
    else if (estado === 'compraDirecta') renderCentroCompraDirecta(partido);
    else renderCentroTerminada(partido);
  }

  // ------------------------------------------------------------------
  // Pantalla 3: Previa
  // ------------------------------------------------------------------

  function renderPrevia() {
    var torneo = Estado.torneo;
    var partido = torneo.partidoActual;
    var equipos = partido.managers.map(function (m) { return m.plantel.map(idAJugador); });
    var metricas = [simMod.metricasEquipo(equipos[0]), simMod.metricasEquipo(equipos[1])];
    var probs = simMod.probabilidadVictoria(equipos[0], equipos[1], 2000, partido.seed + ':previa');

    var html = '<div class="previa-layout">';
    [0, 1].forEach(function (i) {
      var m = partido.managers[i];
      html += '<div class="previa-equipo" data-manager="' + i + '"><div class="previa-equipo__nombre">' + escapeHtml(m.nombre) + '</div>';
      html += '<div class="previa-formacion">';
      equipos[i].forEach(function (j) {
        html += '<div style="text-align:center">' + renderCarta(j, { tamano: 'mini' }) + '</div>';
      });
      html += '</div>';
      html += renderMetricas(equipos[i]);
      html += '</div>';
    });
    html += '</div>';

    var pA = Math.round(probs[0] * 100);
    var pB = 100 - pA;
    html += '<div class="probabilidad-barra">' +
      '<div class="probabilidad-barra__lado" style="width:' + pA + '%;background:' + partido.managers[0].color + '">' + escapeHtml(partido.managers[0].nombre) + ' ' + pA + '%</div>' +
      '<div class="probabilidad-barra__lado" style="width:' + pB + '%;background:' + partido.managers[1].color + '">' + escapeHtml(partido.managers[1].nombre) + ' ' + pB + '%</div>' +
      '</div>';

    html += '<p class="previa-nota">🧤 Los dos equipos le patean al mismo arquero (nivel ' + metricas[0].ARQ + '). ' +
      'Si empatan: alargue con gol de oro y, si nadie la mete, penales.</p>';

    document.getElementById('previa-contenido').innerHTML = html;
  }

  // ------------------------------------------------------------------
  // Pantalla 4: Partido (relato animado)
  // ------------------------------------------------------------------

  var FRASES_GOL = [
    '¡GOOOL de {jugador}! La clavó en un ángulo.',
    '¡GOL de {jugador}! Se la pica al arquero.',
    '¡Grito de gol de {jugador}! Remate cruzado, imposible.',
    '¡GOOOL! {jugador} la empuja adentro del área.',
    '¡La rompe {jugador}! Golazo desde afuera.',
    '¡GOL, GOL, GOL! {jugador} no perdona.',
  ];
  var FRASES_ATAJADA = [
    'Remate de {pateador}... el arquero vuela y la saca. ¡Qué atajada!',
    'El arquero le dice que no a {pateador}.',
    '{pateador} le pega fuerte y el arquero manda al córner.',
    'Tiro de {pateador}... y el arquero responde presente.',
    '{pateador} se la quiere picar, pero el arquero la agarra.',
  ];

  function plantilla(texto, reemplazos) {
    Object.keys(reemplazos).forEach(function (k) { texto = texto.split('{' + k + '}').join(reemplazos[k]); });
    return texto;
  }

  function textoEvento(ev) {
    if (ev.tipo === 'gol') {
      var autor = idAJugador(ev.autor);
      var idx = (ev.minuto + ev.autor) % FRASES_GOL.length;
      var texto = plantilla(FRASES_GOL[idx], { jugador: autor.nombreCarta });
      if (ev.alargue) texto = '¡GOL DE ORO! ' + texto;
      if (ev.asistencia) texto += ' Asistencia de ' + idAJugador(ev.asistencia).nombreCarta + '.';
      return texto;
    }
    var pateador = idAJugador(ev.pateador);
    var idx2 = (ev.minuto + ev.pateador) % FRASES_ATAJADA.length;
    return plantilla(FRASES_ATAJADA[idx2], { pateador: pateador.nombreCarta });
  }

  function agregarEventoDom(ev) {
    var lista = document.getElementById('eventos-lista');
    if (!lista) return;
    var div = document.createElement('div');
    div.className = 'evento-item';
    div.innerHTML = '<span class="evento-item__minuto">' + ev.minuto + "'</span><span>" + escapeHtml(textoEvento(ev)) + '</span>';
    lista.appendChild(div);
    lista.scrollTop = lista.scrollHeight;
  }

  function pintarMarcador(goles) {
    var elA = document.getElementById('marcador-a'); if (elA) elA.textContent = goles[0];
    var elB = document.getElementById('marcador-b'); if (elB) elB.textContent = goles[1];
  }

  function pintarReloj(min) {
    var el = document.getElementById('reloj');
    if (el) el.textContent = min + "'";
  }

  function iniciarPantallaPartido() {
    var partido = Estado.torneo.partidoActual;
    var equipos = partido.managers.map(function (m) { return m.plantel.map(idAJugador); });
    var resultado = simMod.simularPartido(equipos[0], equipos[1], rngMod.crearRng(partido.seed + ':simulacion'));

    animacion.resultado = resultado;
    animacion.partido = partido;
    animacion.saltado = false;
    animacion.timers.forEach(function (t) { clearTimeout(t); });
    animacion.timers = [];

    var cont = document.getElementById('partido-contenido');
    cont.innerHTML =
      '<div class="marcador-grande"><span id="marcador-a">0</span><span>-</span><span id="marcador-b">0</span></div>' +
      '<div class="marcador-grande__reloj" id="reloj">0\'</div>' +
      '<div class="eventos-lista" id="eventos-lista"></div>' +
      '<div id="penales-cont"></div>';

    animarNoventaMinutos(resultado, partido);
  }

  // Minuto en que termina el partido: 90, el del gol de oro o 120 si hubo alargue sin goles.
  function minutoFinal(resultado) {
    if (!resultado.alargue) return 90;
    return resultado.alargue.golDeOro || 120;
  }

  function agregarAvisoAlargueDom() {
    var lista = document.getElementById('eventos-lista');
    if (!lista) return;
    var div = document.createElement('div');
    div.className = 'evento-item evento-item--aviso';
    div.textContent = 'Terminan los 90 empatados. ¡Alargue con gol de oro!';
    lista.appendChild(div);
  }

  function animarNoventaMinutos(resultado, partido) {
    var msPorMinuto = 6000 / 90;
    var fin = minutoFinal(resultado);
    var eventosOrdenados = resultado.eventos.slice().sort(function (a, b) { return a.minuto - b.minuto; });
    var goles = [0, 0];

    eventosOrdenados.forEach(function (ev) {
      animacion.timers.push(setTimeout(function () {
        if (animacion.saltado) return;
        pintarReloj(ev.minuto);
        agregarEventoDom(ev);
        if (ev.tipo === 'gol') { goles[ev.equipo]++; pintarMarcador(goles); }
      }, ev.minuto * msPorMinuto));
    });

    if (resultado.alargue) {
      animacion.timers.push(setTimeout(function () { if (!animacion.saltado) agregarAvisoAlargueDom(); }, 90.5 * msPorMinuto));
    }

    for (var min = 0; min <= fin; min += 5) {
      (function (m) {
        animacion.timers.push(setTimeout(function () { if (!animacion.saltado) pintarReloj(m); }, m * msPorMinuto));
      })(min);
    }

    animacion.timers.push(setTimeout(function () {
      if (animacion.saltado) return;
      pintarReloj(fin);
      pintarMarcador(resultado.goles);
      continuarConPenalesOFinal(resultado, partido);
    }, fin * msPorMinuto + 200));
  }

  function continuarConPenalesOFinal(resultado, partido) {
    if (!resultado.penales) { finalizarPartido(resultado); return; }
    animarPenales(resultado, function () { finalizarPartido(resultado); });
  }

  function animarPenales(resultado, cb) {
    var cont = document.getElementById('penales-cont');
    if (!cont) { cb(); return; }
    cont.innerHTML = '<div class="penales-tanda" id="penales-tanda"></div>';
    var tanda = document.getElementById('penales-tanda');
    resultado.penales.tiros.forEach(function () {
      var span = document.createElement('span');
      span.className = 'penales-tiro pendiente';
      tanda.appendChild(span);
    });

    var i = 0;
    function siguiente() {
      if (animacion.saltado) { pintarPenalesInstantaneo(resultado); cb(); return; }
      if (i >= resultado.penales.tiros.length) { cb(); return; }
      var t = resultado.penales.tiros[i];
      var span = tanda.children[i];
      span.classList.remove('pendiente');
      span.classList.add(t.convertido ? 'convertido' : 'errado');
      span.textContent = t.convertido ? '✅' : '❌';
      i++;
      animacion.timers.push(setTimeout(siguiente, 450));
    }
    siguiente();
  }

  function pintarPenalesInstantaneo(resultado) {
    var cont = document.getElementById('penales-cont');
    if (!cont || !resultado.penales) return;
    var html = '<div class="penales-tanda">';
    resultado.penales.tiros.forEach(function (t) {
      html += '<span class="penales-tiro ' + (t.convertido ? 'convertido' : 'errado') + '">' + (t.convertido ? '✅' : '❌') + '</span>';
    });
    html += '</div>';
    cont.innerHTML = html;
  }

  function saltarAnimacion() {
    if (animacion.saltado || !animacion.resultado) return;
    animacion.saltado = true;
    animacion.timers.forEach(function (t) { clearTimeout(t); });
    animacion.timers = [];

    var resultado = animacion.resultado;
    var lista = document.getElementById('eventos-lista');
    if (lista) {
      lista.innerHTML = '';
      var avisoPuesto = false;
      resultado.eventos.slice().sort(function (a, b) { return a.minuto - b.minuto; }).forEach(function (ev) {
        if (ev.alargue && !avisoPuesto) { agregarAvisoAlargueDom(); avisoPuesto = true; }
        agregarEventoDom(ev);
      });
      if (resultado.alargue && !avisoPuesto) agregarAvisoAlargueDom();
    }
    pintarReloj(minutoFinal(resultado));
    pintarMarcador(resultado.goles);
    pintarPenalesInstantaneo(resultado);
    finalizarPartido(resultado);
  }

  function finalizarPartido(resultado) {
    if (Estado.pantalla !== 'partido') return; // ya se proceso (evita doble llamada)
    Estado.torneo = torneoMod.registrarResultado(Estado.torneo, resultado);
    irA('resultado');
  }

  // ------------------------------------------------------------------
  // Pantalla 5: Resultado
  // ------------------------------------------------------------------

  function renderTablaTorneo(torneo) {
    var html = '<table class="tabla-torneo"><thead><tr><th>Manager</th><th>Puntos</th><th>Partidos ganados</th></tr></thead><tbody>';
    torneo.managers.forEach(function (m) {
      var victorias = torneo.historial.filter(function (h) { return h.ganador === m.id; }).length;
      html += '<tr><td style="color:' + m.color + '">' + escapeHtml(m.nombre) + '</td><td>' + m.puntos + '</td><td>' + victorias + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function renderResultado() {
    var torneo = Estado.torneo;
    var ultimo = torneo.historial[torneo.historial.length - 1];
    var resultado = ultimo.resultado;

    var html = '<div class="resultado-cabecera">';
    html += '<div class="resultado-marcador">' + resultado.goles[0] + ' - ' + resultado.goles[1];
    if (resultado.penales) {
      html += ' <small style="font-size:1.1rem;color:var(--texto-suave)">(pen. ' + resultado.penales.resultado[0] + '-' + resultado.penales.resultado[1] + ')</small>';
    } else if (resultado.alargue && resultado.alargue.golDeOro) {
      html += ' <small style="font-size:1.1rem;color:var(--texto-suave)">(gol de oro, ' + resultado.alargue.golDeOro + "')</small>";
    }
    html += '</div>';
    html += '<div class="resultado-ganador">Ganó ' + escapeHtml(nombreManager(ultimo.ganador)) + ' (+' + torneo.config.puntosPorVictoria + ')</div>';
    html += '</div>';

    html += '<div class="resultado-grid">';
    [0, 1].forEach(function (i) {
      html += '<div><h3 style="color:' + torneo.managers[i].color + '">' + escapeHtml(nombreManager(torneo.managers[i].id)) + '</h3><ul class="resultado-goles">';
      var goles = resultado.eventos.filter(function (e) { return e.tipo === 'gol' && e.equipo === i; });
      if (goles.length === 0) html += '<li style="color:var(--texto-suave)">Sin goles</li>';
      goles.forEach(function (e) {
        html += '<li>⚽ ' + e.minuto + "' " + (e.alargue ? '(gol de oro) ' : '') + escapeHtml(idAJugador(e.autor).nombreCarta) +
          (e.asistencia ? ' (asist. ' + escapeHtml(idAJugador(e.asistencia).nombreCarta) + ')' : '') + '</li>';
      });
      html += '</ul></div>';
    });
    html += '</div>';

    html += '<p style="text-align:center;margin-top:14px">Posesión ' + resultado.estadisticas.posesion[0] + '% - ' + resultado.estadisticas.posesion[1] +
      '% · Remates ' + resultado.estadisticas.remates[0] + ' - ' + resultado.estadisticas.remates[1] + '</p>';

    var figura = idAJugador(resultado.figura);
    html += '<div class="figura-partido">' + renderCarta(figura, { tamano: 'mini' }) +
      '<div><div style="color:var(--texto-suave);font-size:.85rem">Figura del partido</div>' +
      '<div style="font-family:var(--fuente-num);font-size:1.3rem">' + escapeHtml(figura.nombre) + '</div></div></div>';

    html += renderTablaTorneo(torneo);

    document.getElementById('resultado-contenido').innerHTML = html;

    var btnSiguiente = document.getElementById('btn-siguiente-partido');
    btnSiguiente.textContent = torneo.terminado ? 'Ver campeón »' : 'Siguiente partido »';
  }

  // ------------------------------------------------------------------
  // Pantalla 6: Campeon
  // ------------------------------------------------------------------

  function calcularResumenTorneo(torneo) {
    var golesPorJugador = {};
    var masCaro = null;
    var todosLosFichajes = [];
    torneo.historial.forEach(function (h) {
      h.resultado.eventos.forEach(function (e) {
        if (e.tipo === 'gol') golesPorJugador[e.autor] = (golesPorJugador[e.autor] || 0) + 1;
      });
      h.lotes.forEach(function (l) {
        todosLosFichajes.push(l);
        if (!masCaro || l.precio > masCaro.precio) masCaro = l;
      });
    });

    var goleador = null;
    Object.keys(golesPorJugador).forEach(function (id) {
      var goles = golesPorJugador[id];
      if (!goleador || goles > goleador.goles) goleador = { id: Number(id), goles: goles };
    });

    var ganga = null;
    todosLosFichajes.forEach(function (l) {
      var goles = golesPorJugador[l.jugadorId] || 0;
      if (goles === 0) return;
      var golesPorDolar = goles / (l.precio / 100);
      if (!ganga || golesPorDolar > ganga.golesPorDolar) ganga = { jugadorId: l.jugadorId, precio: l.precio, golesPorDolar: golesPorDolar };
    });

    return { goleador: goleador, masCaro: masCaro, ganga: ganga };
  }

  function datoResumen(etiqueta, valor) {
    return '<div class="campeon-dato"><div class="campeon-dato__etiqueta">' + escapeHtml(etiqueta) + '</div>' +
      '<div class="campeon-dato__valor">' + escapeHtml(String(valor)) + '</div></div>';
  }

  function renderCampeon() {
    var torneo = Estado.torneo;
    var stats = calcularResumenTorneo(torneo);

    var colorCampeon = torneo.managers.filter(function (m) { return m.id === torneo.campeon; })[0].color;
    var html = '<div class="campeon-trofeo">🏆</div><div class="campeon-nombre" style="color:' + colorCampeon + '">' + escapeHtml(nombreManager(torneo.campeon)) + '</div>';
    html += '<div class="campeon-resumen">';
    html += datoResumen('Partidos jugados', torneo.historial.length);
    torneo.managers.forEach(function (m) {
      var victorias = torneo.historial.filter(function (h) { return h.ganador === m.id; }).length;
      html += datoResumen('Victorias de ' + m.nombre, victorias);
    });
    html += datoResumen('Goleador del torneo', stats.goleador ? idAJugador(stats.goleador.id).nombreCarta + ' (' + stats.goleador.goles + ')' : '—');
    html += datoResumen('Fichaje más caro', stats.masCaro ? idAJugador(stats.masCaro.jugadorId).nombreCarta + ' · ' + formatearPlata(stats.masCaro.precio) : '—');
    html += datoResumen('Ganga del torneo', stats.ganga ? idAJugador(stats.ganga.jugadorId).nombreCarta + ' (' + stats.ganga.golesPorDolar.toFixed(2) + ' goles/$)' : '—');
    html += '</div>';

    document.getElementById('campeon-contenido').innerHTML = html;
  }

  // ------------------------------------------------------------------
  // Historial (accesible desde cualquier pantalla)
  // ------------------------------------------------------------------

  function cerrarHistorial() {
    var cont = document.getElementById('historial-cont');
    if (cont) cont.innerHTML = '';
  }

  function abrirHistorial() {
    var cont = document.getElementById('historial-cont');
    if (!Estado.torneo) return;
    var html = '<div class="historial-fondo" id="historial-fondo"><div class="historial-panel">' +
      '<div class="historial-panel__cabecera"><h2 style="font-size:1.3rem">Historial</h2>' +
      '<button type="button" class="btn btn--chico" id="btn-cerrar-historial">Cerrar ✕</button></div>';
    if (Estado.torneo.historial.length === 0) html += '<p>Todavía no se jugó ningún partido.</p>';
    Estado.torneo.historial.slice().reverse().forEach(function (h) {
      html += '<div class="historial-item"><div class="historial-item__cabecera"><span>Partido ' + h.numero + '</span>' +
        '<span>' + h.resultado.goles[0] + '-' + h.resultado.goles[1] + '</span></div>';
      html += '<div class="historial-item__detalle">Ganó ' + escapeHtml(nombreManager(h.ganador)) + '</div>';
      html += '<ul class="historial-item__fichajes">';
      h.lotes.forEach(function (l) {
        html += '<li><span>' + escapeHtml(idAJugador(l.jugadorId).nombreCarta) + ' (' + escapeHtml(nombreManager(l.ganador)) + ')</span>' +
          '<span>' + formatearPlata(l.precio) + '</span></li>';
      });
      html += '</ul></div>';
    });
    html += '</div></div>';
    cont.innerHTML = html;
    document.getElementById('historial-fondo').addEventListener('click', function (e) {
      if (e.target.id === 'historial-fondo') cerrarHistorial();
    });
    document.getElementById('btn-cerrar-historial').addEventListener('click', cerrarHistorial);
  }

  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------

  function wireBotonesGlobales() {
    document.getElementById('btn-jugar-partido').addEventListener('click', function () { irA('partido'); });
    document.getElementById('btn-saltar-partido').addEventListener('click', saltarAnimacion);
    document.getElementById('btn-siguiente-partido').addEventListener('click', function () {
      if (Estado.torneo.terminado) { irA('campeon'); return; }
      Estado.torneo = torneoMod.prepararSiguientePartido(Estado.torneo);
      irA('subasta');
    });
    document.getElementById('btn-nuevo-torneo-campeon').addEventListener('click', function () {
      var boton = this;
      confirmarConDobleToque(boton, 'Tocá de nuevo para empezar otro', function () {
        boton.dataset.armado = '';
        boton.textContent = 'Nuevo torneo';
        borrarEstadoGuardado();
        Estado.torneo = null;
        irA('inicio');
      });
    });
    document.getElementById('btn-historial-global').addEventListener('click', abrirHistorial);
    document.getElementById('form-inicio').addEventListener('submit', function (e) {
      e.preventDefault();
      iniciarNuevoTorneo();
    });
    document.querySelectorAll('.modo-opcion').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.modo-opcion').forEach(function (o) { o.classList.remove('seleccionada'); });
        el.classList.add('seleccionada');
      });
    });
  }

  // Atajos de teclado (P2): manager 1 Q/W/E/A, manager 2 P/O/I/L. Solo
  // responden las teclas del manager al que le toca pujar.
  document.addEventListener('keydown', function (e) {
    if (Estado.pantalla !== 'subasta' || !Estado.torneo) return;
    var partido = Estado.torneo.partidoActual;
    if (!partido || !partido.lote) return;
    var turno = partido.lote.turno;
    var mapa = turno === 0 ? { q: 'medio', w: 'uno', e: 'dos', a: 'pasar' } : { p: 'medio', o: 'uno', i: 'dos', l: 'pasar' };
    var accion = mapa[e.key.toLowerCase()];
    if (!accion) return;
    e.preventDefault();
    if (accion === 'pasar') {
      ejecutarAccionSubasta(function (p) { return subastaMod.pasar(p, turno); }, 'pasar');
      return;
    }
    var lote = partido.lote;
    var monto = accion === 'medio' ? lote.precio + CONFIG.INCREMENTO : accion === 'uno' ? lote.precio + 100 : lote.precio + 200;
    ejecutarAccionSubasta(function (p) { return subastaMod.pujar(p, turno, monto); }, 'pujar');
  });

  function arrancar() {
    var guardado = cargarEstadoGuardado();
    if (guardado && guardado.torneo) {
      Estado.torneo = guardado.torneo;
      Estado.pantalla = guardado.pantalla || 'inicio';
    }
    wireBotonesGlobales();
    irA(Estado.pantalla);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
