(function () {
  'use strict';

  var CONFIG = SC.config.CONFIG;
  var formatearPlata = SC.config.formatearPlata;
  var rngMod = SC.rng;
  var JUGADORES = SC.jugadores;
  var subastaMod = SC.subasta;
  var simMod = SC.simulacion;
  var torneoMod = SC.torneo;
  var repartoMod = SC.reparto;

  // v3: torneo de 2 a 6 jugadores (cambió el formato; los guardados anteriores se ignoran).
  var CLAVE_STORAGE = 'subasta-cracks:v3';

  var JUGADOR_POR_ID = {};
  JUGADORES.forEach(function (j) { JUGADOR_POR_ID[j.id] = j; });
  function idAJugador(id) { return JUGADOR_POR_ID[id]; }

  var Estado = { torneo: null, pantalla: 'inicio' };
  // Formulario de inicio: un nombre por jugador (2 a 6).
  var FormInicio = { nombres: ['', ''] };
  var animacion = { resultado: null, partido: null, saltado: false, timers: [] };

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------

  function escapeHtml(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function managerDelTorneo(id) {
    return Estado.torneo.managers.filter(function (x) { return x.id === id; })[0];
  }
  function nombreManager(id) { var m = managerDelTorneo(id); return m ? m.nombre : ''; }
  function colorManager(id) { var m = managerDelTorneo(id); return m ? m.color : 'inherit'; }
  function nombreConColor(id) {
    return '<strong style="color:' + colorManager(id) + '">' + escapeHtml(nombreManager(id)) + '</strong>';
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
    var barra = document.getElementById('barra-global');
    if (!barra) return;
    barra.style.display = (Estado.torneo && Estado.pantalla !== 'inicio') ? '' : 'none';
  }

  // Vuelve todo a cero: borra el torneo guardado y lleva a la pantalla de nombres.
  function reiniciarTodo() {
    animacion.saltado = true;
    animacion.timers.forEach(function (t) { clearTimeout(t); });
    animacion.timers = [];
    document.querySelectorAll('.revelacion').forEach(function (el) { el.remove(); });
    abriendoLote = false;
    cerrarHistorial();
    borrarEstadoGuardado();
    Estado.torneo = null;
    irA('inicio');
  }

  // ------------------------------------------------------------------
  // Pantalla 1: Inicio
  // ------------------------------------------------------------------

  function renderInicio() {
    var cont = document.getElementById('torneo-guardado-cont');
    var guardado = cargarEstadoGuardado();
    if (guardado && guardado.torneo) {
      var t = guardado.torneo;
      var texto = 'Torneo guardado · Fecha ' + t.numeroFecha + ' · ' +
        t.managers.map(function (m) { return m.nombre + ' ' + m.puntos; }).join(' · ');
      cont.innerHTML =
        '<div class="torneo-guardado"><span>' + escapeHtml(texto) + '</span>' +
        '<div class="fila-botones">' +
        '<button type="button" class="btn btn--principal btn--chico" id="btn-continuar-torneo">Continuar torneo</button>' +
        '<button type="button" class="btn btn--fantasma btn--chico" id="btn-descartar-torneo">Nuevo torneo</button>' +
        '</div></div>';
      document.getElementById('btn-continuar-torneo').addEventListener('click', function () {
        Estado.torneo = t;
        irA(guardado.pantalla && guardado.pantalla !== 'inicio' ? guardado.pantalla : 'subasta');
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
    renderListaManagers();
  }

  function renderListaManagers() {
    var cont = document.getElementById('lista-managers');
    var n = FormInicio.nombres.length;
    cont.innerHTML = FormInicio.nombres.map(function (nombre, i) {
      return '<div class="fila-manager">' +
        '<span class="pastilla" style="background:' + CONFIG.COLORES[i] + '"></span>' +
        '<input type="text" id="nombre-m' + (i + 1) + '" maxlength="16" placeholder="Jugador ' + (i + 1) + '" autocomplete="off"' +
        ' value="' + escapeHtml(nombre) + '" aria-label="Nombre del jugador ' + (i + 1) + '" />' +
        (n > CONFIG.MANAGERS_MIN
          ? '<button type="button" class="btn btn--chico btn--fantasma" data-quitar-manager="' + i + '" aria-label="Quitar al jugador ' + (i + 1) + '">✕</button>'
          : '') +
        '</div>';
    }).join('');
    cont.querySelectorAll('input').forEach(function (input, i) {
      input.addEventListener('input', function () { FormInicio.nombres[i] = input.value; });
    });
    cont.querySelectorAll('[data-quitar-manager]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FormInicio.nombres.splice(Number(btn.getAttribute('data-quitar-manager')), 1);
        renderListaManagers();
      });
    });
    document.getElementById('btn-agregar-manager').hidden = n >= CONFIG.MANAGERS_MAX;
  }

  function cantidadFechas() {
    var v = Math.round(Number(document.getElementById('cant-fechas').value));
    if (!isFinite(v) || v === 0) v = CONFIG.FECHAS_POR_DEFECTO;
    return Math.max(CONFIG.FECHAS_MIN, Math.min(CONFIG.FECHAS_MAX, v));
  }

  function iniciarNuevoTorneo() {
    var managers = FormInicio.nombres.map(function (nombre, i) {
      return { id: i, nombre: nombre.trim() || ('Jugador ' + (i + 1)), color: CONFIG.COLORES[i] };
    });
    var modo = document.querySelector('input[name="modo"]:checked').value;
    var seed = 'torneo-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
    var torneo = torneoMod.crearTorneo({ modo: modo, fechas: cantidadFechas(), managers: managers, seed: seed });
    Estado.torneo = torneoMod.prepararSiguientePartido(torneo);
    irA('subasta');
  }

  // ------------------------------------------------------------------
  // Pantalla 2: Subasta
  // ------------------------------------------------------------------

  function textoFecha(torneo) {
    var n = torneo.numeroFecha;
    if (torneo.desempate) return 'Fecha ' + n + ' · desempate';
    if (torneo.config.modo === 'fechas') return 'Fecha ' + n + ' de ' + torneo.config.fechas;
    return 'Fecha ' + n + ' · hasta 100 puntos';
  }

  function renderEncabezado(torneo) {
    var html = '<div class="encabezado__numero">' + textoFecha(torneo) + '</div>';
    html += '<div class="encabezado__marcador">';
    torneoMod.tabla(torneo).forEach(function (m) {
      html += '<span class="encabezado__punto"><span class="pastilla" style="background:' + m.color + '"></span>' +
        escapeHtml(m.nombre) + ' <b>' + m.puntos + '</b></span>';
    });
    html += '</div>';
    document.getElementById('encabezado-subasta').innerHTML = html;
  }

  function htmlPases(n) {
    var total = CONFIG.PASES_POR_PARTIDO;
    var puntos = '';
    for (var i = 0; i < total; i++) puntos += i < n ? '●' : '○';
    return '<span class="pases" title="Pases que le quedan en esta fecha" aria-label="' + n + ' pases">' + puntos + '</span>';
  }

  function htmlPanelManager(partido, m) {
    var esTurno = !!(partido.lote && partido.lote.turno === m.id);
    var completo = m.plantel.length >= CONFIG.TAMANO_PLANTEL;
    var html = '<div class="panel-manager' + (esTurno ? ' turno' : '') + '" style="--c:' + m.color + '">';
    html += '<div class="panel-manager__nombre">' + escapeHtml(m.nombre) + '</div>';
    html += '<div class="panel-manager__presupuesto">' + formatearPlata(m.presupuesto) + '</div>';
    html += '<div class="panel-manager__pujamax">' +
      (completo ? 'Equipo completo' : 'Puja máx. ' + formatearPlata(subastaMod.pujaMaxima(partido, m.id))) + '</div>';
    html += '<div class="panel-manager__pases">Pases ' + htmlPases(m.pases) + '</div>';
    html += '<div class="plantel">';
    for (var i = 0; i < CONFIG.TAMANO_PLANTEL; i++) {
      html += m.plantel[i] != null ? renderCarta(idAJugador(m.plantel[i]), { tamano: 'mini' }) : cartaVacia();
    }
    html += '</div>';
    html += renderMetricas(m.plantel.map(idAJugador));
    html += '</div>';
    return html;
  }

  function ejecutarAccionSubasta(accionFn) {
    var partido = Estado.torneo.partidoActual;
    var loteAntes = partido.lote;
    var lotesAntes = partido.lotes.length;
    var descartadosAntes = partido.descartados.length;
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
      mostrarToast('¡' + idAJugador(loteInfo.jugadorId).nombreCarta + ' es de ' + nombreManager(loteInfo.ganador) +
        ' por ' + formatearPlata(loteInfo.precio) + '!');
    } else if (nuevo.descartados.length > descartadosAntes) {
      mostrarToast('Nadie quiso a ' + idAJugador(loteAntes.jugadorId).nombreCarta + ': queda afuera');
    }
    guardarEstado();
    renderSubasta();
  }

  // Revelacion de la carta al salir a subasta: bandera -> posicion -> club ->
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

  // Saca al azar el proximo jugador del mazo y lo muestra con la revelacion.
  var abriendoLote = false;
  function abrirSiguienteLote() {
    if (abriendoLote || !Estado.torneo || Estado.pantalla !== 'subasta') return;
    var partido = Estado.torneo.partidoActual;
    if (subastaMod.estadoSubasta(partido) !== 'esperandoLote') return;
    abriendoLote = true;
    var nuevo = subastaMod.abrirLote(partido);
    Estado.torneo.partidoActual = nuevo;
    guardarEstado();
    mostrarRevelacion(idAJugador(nuevo.lote.jugadorId), function () {
      abriendoLote = false;
      if (Estado.torneo && Estado.pantalla === 'subasta') renderSubasta();
    });
  }

  // Botones de puja del lote en curso: [principal, segundo, tercero, todo].
  function opcionesPuja(partido) {
    var lote = partido.lote;
    var max = subastaMod.pujaMaxima(partido, lote.turno);
    var min = subastaMod.montoMinimo(partido);
    var ops = lote.lider === null
      ? [{ monto: 100, etiqueta: 'Pujar $1' }, { monto: 150, etiqueta: '$1,50' }, { monto: 200, etiqueta: '$2' }]
      : [{ monto: lote.precio + 50, etiqueta: '+$0,50 → ' + formatearPlata(lote.precio + 50) },
        { monto: lote.precio + 100, etiqueta: '+$1' }, { monto: lote.precio + 200, etiqueta: '+$2' }];
    ops.push({ monto: max, etiqueta: 'Todo (' + formatearPlata(max) + ')' });
    ops.forEach(function (o) { o.habilitado = o.monto >= min && o.monto <= max && o.monto % CONFIG.INCREMENTO === 0; });
    return ops;
  }

  function renderCentroEsperando() {
    document.getElementById('centro-subasta').innerHTML =
      '<div class="lote-esperando">Sale el próximo jugador…</div>';
    setTimeout(abrirSiguienteLote, 250);
  }

  function renderCentroLote(partido) {
    var lote = partido.lote;
    var jugador = idAJugador(lote.jugadorId);
    var turno = lote.turno;
    var pujaMax = subastaMod.pujaMaxima(partido, turno);
    var sinDueno = lote.lider === null;

    var html = '<section class="lote">';
    html += renderCarta(jugador, { tamano: 'grande', ancho: '230px' });
    html += '<div>';
    html += sinDueno
      ? '<div class="lote__arranca">Arranca en</div><div class="lote__precio">$1</div>'
      : '<div class="lote__precio">' + formatearPlata(lote.precio) + '</div>';
    html += '<div class="lote__estado">';
    html += sinDueno ? '<span>Nadie pujó todavía</span>' : '<span>Va ganando: ' + nombreConColor(lote.lider) + '</span>';
    if (lote.fuera.length) html += '<span>Pasaron: ' + lote.fuera.map(nombreConColor).join(', ') + '</span>';
    html += '<span>Le toca a: ' + nombreConColor(turno) + ' (puja máx. ' + formatearPlata(pujaMax) + ')</span></div>';
    html += '<div class="fila-botones">';
    opcionesPuja(partido).forEach(function (o, i) {
      html += '<button type="button" class="btn' + (i === 0 ? ' btn--principal' : '') + '" data-puja-monto="' + o.monto + '"' +
        (o.habilitado ? '' : ' disabled') + '>' + o.etiqueta + '</button>';
    });
    var puedePasar = subastaMod.puedePasar(partido, turno);
    var pases = subastaMod.pasesRestantes(partido, turno);
    var textoPasar = !sinDueno ? 'Pasar' : puedePasar
      ? 'Pasar (' + (pases === 1 ? 'te queda 1 pase' : 'te quedan ' + pases + ' pases') + ')'
      : 'Sin pases: tenés que pujar';
    html += '<button type="button" class="btn btn--pasar" id="btn-pasar"' + (puedePasar ? '' : ' disabled') + '>' + textoPasar + '</button>';
    html += '</div>';
    if (lote.pujas.length) {
      html += '<div class="cadena">' + lote.pujas.map(function (pj) {
        return '<span style="color:' + colorManager(pj.manager) + '">' + escapeHtml(nombreManager(pj.manager)) + ' ' + formatearPlata(pj.monto) + '</span>';
      }).join(' → ') + '</div>';
    }
    if (lote.pila.length > 0) {
      html += '<button type="button" class="btn btn--fantasma btn--chico btn-deshacer" id="btn-deshacer">↩ Deshacer</button>';
    }
    html += '</div></section>';

    document.getElementById('centro-subasta').innerHTML = html;

    document.querySelectorAll('[data-puja-monto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var monto = Number(btn.getAttribute('data-puja-monto'));
        ejecutarAccionSubasta(function (p) { return subastaMod.pujar(p, turno, monto); });
      });
    });
    document.getElementById('btn-pasar').addEventListener('click', function () {
      ejecutarAccionSubasta(function (p) { return subastaMod.pasar(p, turno); });
    });
    var btnDeshacer = document.getElementById('btn-deshacer');
    if (btnDeshacer) btnDeshacer.addEventListener('click', function () {
      ejecutarAccionSubasta(function (p) { return subastaMod.deshacer(p); });
    });
  }

  // Queda uno solo sin completar: se le completa al azar, parejo (js/reparto.js).
  function aplicarReparto() {
    var partido = Estado.torneo.partidoActual;
    Estado.torneo.partidoActual = repartoMod.completarPartido(partido, partido.seed + ':reparto');
    guardarEstado();
    renderSubasta();
  }

  function renderCentroTerminada(partido) {
    var dos = partido.managers.length === 2;
    var html = '<div class="subasta-terminada">';
    if (partido.reparto.length > 0) {
      partido.reparto.forEach(function (r) {
        var cuantos = r.ids.length === 1 ? 'tocó 1 jugador' : 'tocaron ' + r.ids.length + ' jugadores';
        if (dos) {
          var rival = partido.managers.filter(function (m) { return m.id !== r.manager; })[0];
          html += '<div class="reparto__titulo">' + nombreConColor(rival.id) + ' completó su equipo. A ' + nombreConColor(r.manager) +
            ' le ' + cuantos + ' al azar, parejos con el equipo de ' + escapeHtml(rival.nombre) + ':</div>';
        } else {
          html += '<div class="reparto__titulo">' + nombreConColor(r.manager) + ' quedó último sin completar: le ' + cuantos +
            ' al azar, parejos con los demás equipos:</div>';
        }
        html += '<div class="reparto__cartas">' + r.ids.map(function (id) { return renderCarta(idAJugador(id), { tamano: 'grande', ancho: '150px' }); }).join('') + '</div>';
      });
    } else {
      html += '<p>¡Los equipos están completos!</p>';
    }
    html += '<button type="button" class="btn btn--principal btn--grande" id="btn-ir-partido">' + (dos ? 'Ir al partido ⚽' : 'Ir a la fecha ⚽') + '</button></div>';
    document.getElementById('centro-subasta').innerHTML = html;
    document.getElementById('btn-ir-partido').addEventListener('click', function () { irA('previa'); });
  }

  function renderSubasta() {
    var torneo = Estado.torneo;
    var partido = torneo.partidoActual;
    var estado = subastaMod.estadoSubasta(partido);
    if (estado === 'reparto') { aplicarReparto(); return; }
    renderEncabezado(torneo);
    var paneles = document.getElementById('paneles-managers');
    paneles.innerHTML = partido.managers.map(function (m) { return htmlPanelManager(partido, m); }).join('');
    paneles.classList.toggle('paneles--muchos', partido.managers.length > 2);
    if (estado === 'esperandoLote') renderCentroEsperando();
    else if (estado === 'pujando') renderCentroLote(partido);
    else renderCentroTerminada(partido);
  }

  // ------------------------------------------------------------------
  // Pantalla 3: Previa
  // ------------------------------------------------------------------

  function equipoDe(partido, id) {
    return partido.managers.filter(function (m) { return m.id === id; })[0].plantel.map(idAJugador);
  }

  function renderPrevia() {
    var torneo = Estado.torneo;
    var partido = torneo.partidoActual;
    var dos = partido.managers.length === 2;
    document.getElementById('titulo-previa').textContent = dos ? 'Previa del partido' : (torneo.desempate ? 'Previa del desempate' : 'Previa de la fecha');
    document.getElementById('btn-jugar-partido').textContent = dos ? 'Jugar partido ⚽' : 'Jugar la fecha ⚽';

    var html = '<div class="previa-layout' + (dos ? '' : ' previa-layout--muchos') + '">';
    partido.managers.forEach(function (m) {
      html += '<div class="previa-equipo" style="--c:' + m.color + '"><div class="previa-equipo__nombre">' + escapeHtml(m.nombre) + '</div>';
      html += '<div class="previa-formacion">' + m.plantel.map(function (id) { return renderCarta(idAJugador(id), { tamano: 'mini' }); }).join('') + '</div>';
      html += renderMetricas(m.plantel.map(idAJugador)) + '</div>';
    });
    html += '</div>';

    if (dos) {
      var a = partido.managers[0], b = partido.managers[1];
      var probs = simMod.probabilidadVictoria(equipoDe(partido, a.id), equipoDe(partido, b.id), 2000, partido.seed + ':previa');
      var pA = Math.round(probs[0] * 100);
      html += '<div class="probabilidad-barra">' +
        '<div class="probabilidad-barra__lado" style="width:' + pA + '%;background:' + a.color + '">' + escapeHtml(a.nombre) + ' ' + pA + '%</div>' +
        '<div class="probabilidad-barra__lado" style="width:' + (100 - pA) + '%;background:' + b.color + '">' + escapeHtml(b.nombre) + ' ' + (100 - pA) + '%</div>' +
        '</div>';
    } else {
      var cruces = torneoMod.crucesDeLaFecha(torneo);
      html += '<div class="fixture"><h3>Todos contra todos · ' + cruces.length + ' partidos</h3><ul>' +
        cruces.map(function (c) { return '<li>' + nombreConColor(c[0]) + ' <span>vs</span> ' + nombreConColor(c[1]) + '</li>'; }).join('') +
        '</ul></div>';
    }
    html += '<p class="previa-nota">🧤 Todos le patean al mismo arquero (nivel ' + simMod.CONFIG_SIM.arqueroEstandar + '). ' +
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

  // Simula todos los cruces de la fecha (deterministico dado el seed).
  function simularFecha(torneo) {
    var partido = torneo.partidoActual;
    return torneoMod.crucesDeLaFecha(torneo).map(function (c) {
      var rng = rngMod.crearRng(partido.seed + ':simulacion:' + c[0] + '-' + c[1]);
      return { a: c[0], b: c[1], resultado: simMod.simularPartido(equipoDe(partido, c[0]), equipoDe(partido, c[1]), rng) };
    });
  }

  function htmlFilaResultado(a, b, res) {
    var extra = res.penales
      ? ' <small>(pen. ' + res.penales.resultado[0] + '-' + res.penales.resultado[1] + ')</small>'
      : (res.alargue && res.alargue.golDeOro ? ' <small>(gol de oro ' + res.alargue.golDeOro + "')</small>" : '');
    return '<li class="fila-resultado">' +
      '<span class="fila-resultado__equipo' + (res.ganador === 0 ? ' gano' : '') + '">' + nombreConColor(a) + '</span>' +
      '<span class="fila-resultado__marcador">' + res.goles[0] + ' - ' + res.goles[1] + extra + '</span>' +
      '<span class="fila-resultado__equipo fila-resultado__equipo--der' + (res.ganador === 1 ? ' gano' : '') + '">' + nombreConColor(b) + '</span></li>';
  }

  function iniciarPantallaPartido() {
    var torneo = Estado.torneo;
    var partido = torneo.partidoActual;
    var resultados = simularFecha(torneo);

    animacion.resultados = resultados;
    animacion.saltado = false;
    animacion.timers.forEach(function (t) { clearTimeout(t); });
    animacion.timers = [];

    var cont = document.getElementById('partido-contenido');
    if (resultados.length === 1) {
      var r = resultados[0];
      animacion.resultado = r.resultado;
      cont.innerHTML =
        '<div class="marcador-nombres">' + nombreConColor(r.a) + '<span>vs</span>' + nombreConColor(r.b) + '</div>' +
        '<div class="marcador-grande"><span id="marcador-a">0</span><span>-</span><span id="marcador-b">0</span></div>' +
        '<div class="marcador-grande__reloj" id="reloj">0\'</div>' +
        '<div class="eventos-lista" id="eventos-lista"></div>' +
        '<div id="penales-cont"></div>';
      animarNoventaMinutos(r.resultado, partido);
    } else {
      animacion.resultado = null;
      cont.innerHTML = '<h2 class="pantalla__titulo" style="text-align:center">' +
        (torneo.desempate ? 'Desempate' : 'Fecha ' + torneo.numeroFecha) + '</h2>' +
        '<ul class="fecha-resultados" id="fecha-resultados"></ul>';
      resultados.forEach(function (res, i) {
        animacion.timers.push(setTimeout(function () {
          if (animacion.saltado) return;
          document.getElementById('fecha-resultados').insertAdjacentHTML('beforeend', htmlFilaResultado(res.a, res.b, res.resultado));
        }, 400 + i * 650));
      });
      animacion.timers.push(setTimeout(function () { if (!animacion.saltado) finalizarFecha(); }, 400 + resultados.length * 650 + 700));
    }
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
    if (!resultado.penales) { finalizarFecha(); return; }
    animarPenales(resultado, function () { finalizarFecha(); });
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
    if (animacion.saltado || !animacion.resultados) return;
    animacion.saltado = true;
    animacion.timers.forEach(function (t) { clearTimeout(t); });
    animacion.timers = [];

    var resultado = animacion.resultado;
    if (!resultado) {
      var lista = document.getElementById('fecha-resultados');
      if (lista) lista.innerHTML = animacion.resultados.map(function (r) { return htmlFilaResultado(r.a, r.b, r.resultado); }).join('');
      finalizarFecha();
      return;
    }
    var eventos = document.getElementById('eventos-lista');
    if (eventos) {
      eventos.innerHTML = '';
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
    finalizarFecha();
  }

  function finalizarFecha() {
    if (Estado.pantalla !== 'partido' || !animacion.resultados) return; // evita doble registro
    var resultados = animacion.resultados;
    animacion.resultados = null;
    Estado.torneo = torneoMod.registrarFecha(Estado.torneo, resultados);
    irA('resultado');
  }

  // ------------------------------------------------------------------
  // Pantalla 5: Resultado
  // ------------------------------------------------------------------

  function renderTablaTorneo(torneo) {
    var html = '<div class="tabla-scroll"><table class="tabla-torneo"><thead><tr>' +
      '<th>#</th><th>Jugador</th><th>Pts</th><th>PJ</th><th>PG</th><th>GF</th><th>GC</th><th>DG</th></tr></thead><tbody>';
    torneoMod.tabla(torneo).forEach(function (m, i) {
      var dg = m.gf - m.gc;
      html += '<tr><td>' + (i + 1) + '</td><td style="color:' + m.color + '">' + escapeHtml(m.nombre) + '</td><td><b>' + m.puntos + '</b></td>' +
        '<td>' + m.pj + '</td><td>' + m.pg + '</td><td>' + m.gf + '</td><td>' + m.gc + '</td><td>' + (dg > 0 ? '+' : '') + dg + '</td></tr>';
    });
    return html + '</tbody></table></div>';
  }

  function htmlGoles(resultado, equipo) {
    var goles = resultado.eventos.filter(function (e) { return e.tipo === 'gol' && e.equipo === equipo; });
    if (goles.length === 0) return '<li style="color:var(--texto-suave)">Sin goles</li>';
    return goles.map(function (e) {
      return '<li>⚽ ' + e.minuto + "' " + (e.alargue ? '(gol de oro) ' : '') + escapeHtml(idAJugador(e.autor).nombreCarta) +
        (e.asistencia ? ' (asist. ' + escapeHtml(idAJugador(e.asistencia).nombreCarta) + ')' : '') + '</li>';
    }).join('');
  }

  // Figura: el que mas goles hizo en la fecha (desempate: mayor OVR).
  function figuraDeLaFecha(partidos) {
    var goles = {};
    partidos.forEach(function (p) {
      p.resultado.eventos.forEach(function (e) { if (e.tipo === 'gol') goles[e.autor] = (goles[e.autor] || 0) + 1; });
    });
    var ids = Object.keys(goles).map(Number);
    if (ids.length === 0) return partidos[0].resultado.figura;
    ids.sort(function (x, y) { return (goles[y] - goles[x]) || (idAJugador(y).ovr - idAJugador(x).ovr); });
    return ids[0];
  }

  function renderResultado() {
    var torneo = Estado.torneo;
    var ultimo = torneo.historial[torneo.historial.length - 1];
    var html = '';

    if (ultimo.partidos.length === 1) {
      var p = ultimo.partidos[0];
      var resultado = p.resultado;
      html += '<div class="resultado-cabecera">';
      html += '<div class="marcador-nombres">' + nombreConColor(p.a) + '<span>vs</span>' + nombreConColor(p.b) + '</div>';
      html += '<div class="resultado-marcador">' + resultado.goles[0] + ' - ' + resultado.goles[1];
      if (resultado.penales) {
        html += ' <small style="font-size:1.1rem;color:var(--texto-suave)">(pen. ' + resultado.penales.resultado[0] + '-' + resultado.penales.resultado[1] + ')</small>';
      } else if (resultado.alargue && resultado.alargue.golDeOro) {
        html += ' <small style="font-size:1.1rem;color:var(--texto-suave)">(gol de oro, ' + resultado.alargue.golDeOro + "')</small>";
      }
      html += '</div><div class="resultado-ganador">Ganó ' + nombreConColor(p.ganador) + ' (+' + torneo.config.puntosPorVictoria + ')</div></div>';
      html += '<div class="resultado-grid">' +
        '<div><h3 style="color:' + colorManager(p.a) + '">' + escapeHtml(nombreManager(p.a)) + '</h3><ul class="resultado-goles">' + htmlGoles(resultado, 0) + '</ul></div>' +
        '<div><h3 style="color:' + colorManager(p.b) + '">' + escapeHtml(nombreManager(p.b)) + '</h3><ul class="resultado-goles">' + htmlGoles(resultado, 1) + '</ul></div></div>';
      html += '<p style="text-align:center;margin-top:14px">Posesión ' + resultado.estadisticas.posesion[0] + '% - ' + resultado.estadisticas.posesion[1] +
        '% · Remates ' + resultado.estadisticas.remates[0] + ' - ' + resultado.estadisticas.remates[1] + '</p>';
    } else {
      html += '<h2 class="pantalla__titulo" style="text-align:center">' + (ultimo.desempate ? 'Resultados del desempate' : 'Resultados de la fecha ' + ultimo.numero) + '</h2>';
      html += '<ul class="fecha-resultados">' + ultimo.partidos.map(function (pp) { return htmlFilaResultado(pp.a, pp.b, pp.resultado); }).join('') + '</ul>';
    }

    var figura = idAJugador(ultimo.partidos.length === 1 ? ultimo.partidos[0].resultado.figura : figuraDeLaFecha(ultimo.partidos));
    html += '<div class="figura-partido">' + renderCarta(figura, { tamano: 'mini' }) +
      '<div><div style="color:var(--texto-suave);font-size:.85rem">' + (ultimo.partidos.length === 1 ? 'Figura del partido' : 'Figura de la fecha') + '</div>' +
      '<div style="font-family:var(--fuente-num);font-size:1.3rem">' + escapeHtml(figura.nombre) + '</div></div></div>';

    if (torneo.desempate) {
      html += '<p class="aviso-desempate">Empate arriba entre ' + torneo.desempate.map(nombreConColor).join(' y ') +
        ': se juega una fecha de desempate entre ellos.</p>';
    }
    html += renderTablaTorneo(torneo);

    document.getElementById('resultado-contenido').innerHTML = html;
    var dos = torneo.managers.length === 2;
    document.getElementById('btn-siguiente-partido').textContent = torneo.terminado ? 'Ver campeón »'
      : torneo.desempate ? 'Jugar el desempate »' : (dos ? 'Siguiente partido »' : 'Siguiente fecha »');
  }

  // ------------------------------------------------------------------
  // Pantalla 6: Campeon
  // ------------------------------------------------------------------

  function calcularResumenTorneo(torneo) {
    var golesPorJugador = {};
    var masCaro = null;
    var todosLosFichajes = [];
    torneo.historial.forEach(function (h) {
      h.partidos.forEach(function (p) {
        p.resultado.eventos.forEach(function (e) {
          if (e.tipo === 'gol') golesPorJugador[e.autor] = (golesPorJugador[e.autor] || 0) + 1;
        });
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
    var html = '<div class="campeon-trofeo">🏆</div><div class="campeon-nombre" style="color:' + colorManager(torneo.campeon) + '">' +
      escapeHtml(nombreManager(torneo.campeon)) + '</div>';
    html += '<div class="campeon-resumen">';
    html += datoResumen('Fechas jugadas', torneo.historial.length);
    html += datoResumen('Goleador del torneo', stats.goleador ? idAJugador(stats.goleador.id).nombreCarta + ' (' + stats.goleador.goles + ')' : '—');
    html += datoResumen('Fichaje más caro', stats.masCaro ? idAJugador(stats.masCaro.jugadorId).nombreCarta + ' · ' + formatearPlata(stats.masCaro.precio) : '—');
    html += datoResumen('Ganga del torneo', stats.ganga ? idAJugador(stats.ganga.jugadorId).nombreCarta + ' (' + stats.ganga.golesPorDolar.toFixed(2) + ' goles/$)' : '—');
    html += '</div>';
    html += renderTablaTorneo(torneo);
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
    if (Estado.torneo.historial.length === 0) html += '<p>Todavía no se jugó ninguna fecha.</p>';
    Estado.torneo.historial.slice().reverse().forEach(function (h) {
      html += '<div class="historial-item"><div class="historial-item__cabecera"><span>Fecha ' + h.numero + (h.desempate ? ' · desempate' : '') + '</span></div>';
      html += '<ul class="historial-item__partidos">' + h.partidos.map(function (p) {
        return '<li>' + nombreConColor(p.a) + ' ' + p.resultado.goles[0] + '-' + p.resultado.goles[1] + ' ' + nombreConColor(p.b) +
          (p.resultado.penales ? ' (pen.)' : '') + ' · ganó ' + escapeHtml(nombreManager(p.ganador)) + '</li>';
      }).join('') + '</ul>';
      html += '<ul class="historial-item__fichajes">';
      h.participantes.forEach(function (id) {
        var suyos = h.lotes.filter(function (l) { return l.ganador === id; });
        html += '<li><span style="color:' + colorManager(id) + '">' + escapeHtml(nombreManager(id)) + '</span><span>' +
          suyos.map(function (l) {
            return escapeHtml(idAJugador(l.jugadorId).nombreCarta) + ' ' + formatearPlata(l.precio) + (l.asignado ? ' (azar)' : '');
          }).join(', ') + '</span></li>';
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
    document.getElementById('btn-reiniciar-global').addEventListener('click', function () {
      var boton = this;
      confirmarConDobleToque(boton, 'Tocá de nuevo para reiniciar', function () {
        boton.dataset.armado = '';
        boton.textContent = '↺ Reiniciar';
        reiniciarTodo();
      });
    });
    document.getElementById('form-inicio').addEventListener('submit', function (e) {
      e.preventDefault();
      iniciarNuevoTorneo();
    });
    document.querySelectorAll('.modo-opcion').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.modo-opcion').forEach(function (o) { o.classList.remove('seleccionada'); });
        el.classList.add('seleccionada');
        el.querySelector('input[type="radio"]').checked = true;
      });
    });
    document.getElementById('btn-agregar-manager').addEventListener('click', function () {
      if (FormInicio.nombres.length >= CONFIG.MANAGERS_MAX) return;
      FormInicio.nombres.push('');
      renderListaManagers();
      document.getElementById('nombre-m' + FormInicio.nombres.length).focus();
    });
    var inputFechas = document.getElementById('cant-fechas');
    function moverFechas(delta) {
      inputFechas.value = Math.max(CONFIG.FECHAS_MIN, Math.min(CONFIG.FECHAS_MAX, cantidadFechas() + delta));
    }
    document.getElementById('btn-fechas-menos').addEventListener('click', function () { moverFechas(-1); });
    document.getElementById('btn-fechas-mas').addEventListener('click', function () { moverFechas(1); });
    inputFechas.addEventListener('change', function () { inputFechas.value = cantidadFechas(); });
  }

  // Atajos de teclado (P2): manager 1 Q/W/E/A, manager 2 P/O/I/L. Solo
  // responden las teclas del manager al que le toca pujar.
  document.addEventListener('keydown', function (e) {
    if (Estado.pantalla !== 'subasta' || !Estado.torneo) return;
    var partido = Estado.torneo.partidoActual;
    if (!partido || !partido.lote) return;
    var turno = partido.lote.turno;
    var mapa = turno === 0 ? { q: 0, w: 1, e: 2, a: 'pasar' } : { p: 0, o: 1, i: 2, l: 'pasar' };
    var accion = mapa[e.key.toLowerCase()];
    if (accion === undefined) return;
    e.preventDefault();
    if (accion === 'pasar') {
      ejecutarAccionSubasta(function (p) { return subastaMod.pasar(p, turno); });
      return;
    }
    var opcion = opcionesPuja(partido)[accion];
    if (!opcion.habilitado) return;
    ejecutarAccionSubasta(function (p) { return subastaMod.pujar(p, turno, opcion.monto); });
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
