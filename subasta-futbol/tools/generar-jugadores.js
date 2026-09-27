#!/usr/bin/env node
'use strict';

// Genera js/jugadores.js a partir de data/jugadores-base.csv.
// Cada jugador recibe 6 estadisticas de carta (20-99) segun un "arquetipo" de
// estilo de juego (definido a mano abajo, en MAPA), y los 4 atributos de
// simulacion se DERIVAN con las formulas de SESION.md 3.2 (nunca se escriben
// a mano). Un paso de "resolucion algebraica" ajusta la estadistica dominante
// de cada formula para que el atributo principal quede a +-2 del OVR del CSV.

var fs = require('fs');
var path = require('path');

var CSV_PATH = path.join(__dirname, '..', 'data', 'jugadores-base.csv');
var OUT_PATH = path.join(__dirname, '..', 'js', 'jugadores.js');

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function leerCsv() {
  var texto = fs.readFileSync(CSV_PATH, 'utf8').trim();
  var lineas = texto.split('\n');
  lineas.shift(); // cabecera
  return lineas.map(function (linea) {
    var partes = linea.split(',');
    return {
      id: Number(partes[0]),
      nombre: partes[1],
      pais: partes[2],
      posicion: partes[3],
      pico: Number(partes[4]),
      club: partes[5],
      ovr: Number(partes[6]),
    };
  });
}

// ---------------------------------------------------------------------------
// Paises -> bandera
// ---------------------------------------------------------------------------

var ISO_PAIS = {
  Alemania: 'DE', Argentina: 'AR', Brasil: 'BR', Bulgaria: 'BG', Bélgica: 'BE',
  Camerún: 'CM', Chequia: 'CZ', Chile: 'CL', Colombia: 'CO', 'Costa de Marfil': 'CI',
  Croacia: 'HR', Dinamarca: 'DK', Ecuador: 'EC', Egipto: 'EG', Eslovenia: 'SI', España: 'ES',
  Francia: 'FR', Hungría: 'HU', Italia: 'IT', Liberia: 'LR', México: 'MX',
  Noruega: 'NO', Paraguay: 'PY', 'Países Bajos': 'NL', Perú: 'PE', Polonia: 'PL',
  Portugal: 'PT', Rumania: 'RO', Rusia: 'RU', Serbia: 'RS', Suecia: 'SE',
  Ucrania: 'UA', Uruguay: 'UY',
};

var BANDERA_ESPECIAL = {
  Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Escocia: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Irlanda del Norte': '🇬🇧',
};

function bandera(pais) {
  if (BANDERA_ESPECIAL[pais]) return BANDERA_ESPECIAL[pais];
  var iso = ISO_PAIS[pais];
  if (!iso) throw new Error('Sin bandera para el pais: ' + pais);
  var BASE = 0x1f1e6;
  return String.fromCodePoint(BASE + (iso.charCodeAt(0) - 65)) +
    String.fromCodePoint(BASE + (iso.charCodeAt(1) - 65));
}

// ---------------------------------------------------------------------------
// Clubes -> sigla (3 letras, unicas)
// ---------------------------------------------------------------------------

var SIGLA_CLUB = {
  Ajax: 'AJA', 'Alianza Lima': 'ALI', Arsenal: 'ARS', 'Aston Villa': 'AVI',
  Atalanta: 'ATA', 'Atlético de Madrid': 'ATM', Bangu: 'BAN', Barcelona: 'BAR',
  'Bayer Leverkusen': 'BLV', 'Bayern Múnich': 'BAY', Benfica: 'BEN',
  'Blackburn Rovers': 'BLB', Blackpool: 'BLP', 'Boca Juniors': 'BOC',
  'Borussia Dortmund': 'BVB', 'Borussia Mönchengladbach': 'BMG', Botafogo: 'BOT',
  Brescia: 'BRE', Cagliari: 'CAG', Chelsea: 'CHE', Corinthians: 'COR',
  Cruzeiro: 'CRU', 'Dinamo Kiev': 'DKI', 'Dinamo Moscú': 'DIN', 'Dukla Praga': 'DUK',
  Fiorentina: 'FIO', Flamengo: 'FLA', Hamburgo: 'HAM', Honvéd: 'HON',
  Independiente: 'IND', Inter: 'INT', Internacional: 'INL', Juventus: 'JUV',
  Kaiserslautern: 'FCK', Lazio: 'LAZ', Liverpool: 'LIV', 'MTK Budapest': 'MTK',
  'Manchester City': 'MCI', 'Manchester United': 'MUN', Milan: 'MIL',
  Montpellier: 'MTP', Napoli: 'NAP', 'Olympique de Marsella': 'OMA',
  'Paris Saint-Germain': 'PSG', Parma: 'PAR', Peñarol: 'PEN', Porto: 'FCP',
  Portuguesa: 'PTG', 'Racing Club': 'RAC', 'Real Madrid': 'RMA', 'River Plate': 'RIV',
  Roma: 'ROM', Santos: 'SAN', 'Spartak Moscú': 'SPM', 'Stade de Reims': 'REI',
  'Stoke City': 'STK', 'São Paulo': 'SAO', 'Tottenham Hotspur': 'TOT',
  Universitario: 'UNI', Valencia: 'VAL', 'Vélez Sarsfield': 'VSA',
  'West Ham United': 'WHU',
};

// ---------------------------------------------------------------------------
// Categoria por OVR (SESION.md 2.3)
// ---------------------------------------------------------------------------

function categoriaPorOvr(ovr) {
  if (ovr >= 95) return 'Leyenda';
  if (ovr >= 92) return 'Crack';
  if (ovr >= 89) return 'Estrella';
  return 'Figura';
}

// ---------------------------------------------------------------------------
// Utilidades numericas
// ---------------------------------------------------------------------------

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function clampRedondo(v) { return clamp(Math.round(v), 20, 99); }

// ---------------------------------------------------------------------------
// Arquetipos: cada uno define deltas (respecto del OVR) para las estadisticas
// "libres" de personalidad. La estadistica que cierra la formula principal
// (TIR en delanteros, PAS o DEF en mediocampistas, DEF en defensores, PAR en
// arqueros) se resuelve algebraicamente para que el atributo derivado quede
// pegado al OVR (ver resolver* abajo).
// ---------------------------------------------------------------------------

var ARQ_DEL = {
  // Deltas respecto del OVR. TIR se resuelve algebraicamente, por eso RIT y REG no
  // pueden bajar mucho en los OVR altos (si no, TIR tendria que pasar de 99).
  // area de tiro puro: TIR altisimo (resuelto), poco REG/PAS, defensa nula
  killerArea: { rit: -6, pas: -20, reg: -8, defStat: -55, fis: -8 },
  // pura velocidad y desborde
  explosivo: { rit: 12, pas: -14, reg: 6, defStat: -55, fis: -18 },
  // asociativo, mucho REG y PAS
  tecnico: { rit: -2, pas: -6, reg: 6, defStat: -52, fis: -20 },
  // area y fisico, target man
  potente: { rit: -6, pas: -18, reg: -6, defStat: -48, fis: 0 },
  // completo, sin debilidades marcadas
  completo: { rit: 2, pas: -10, reg: 2, defStat: -45, fis: -10 },
  // delantero de epoca clasica, gol por sobre todo
  clasico: { rit: -6, pas: -12, reg: -2, defStat: -50, fis: -10 },
  // extremo veloz y desequilibrante
  extremoVeloz: { rit: 12, pas: -10, reg: 8, defStat: -55, fis: -22 },
};

var ARQ_MED = {
  // volante de creacion profunda: PAS altisimo (resuelto via REG)
  regista: { tipo: 'cre', rit: -18, tir: -12, fis: -20, reg: -6, defStat: -30 },
  // enganche clasico: REG y regate por delante del pase directo, no marca
  enganche: { tipo: 'cre', rit: -6, tir: 2, fis: -22, reg: 2, defStat: -55 },
  // box to box, fisico y llegada
  boxToBox: { tipo: 'cre', rit: -6, tir: -4, fis: -6, reg: -4, defStat: -14 },
  // volante por afuera, desborde y centro
  extremoMed: { tipo: 'cre', rit: 4, tir: -6, fis: -22, reg: 4, defStat: -48 },
  // pivote: organiza de atrás y también marca (Busquets, Rodri, Redondo)
  pivote: { tipo: 'cre', rit: -20, tir: -22, fis: -6, reg: -8, defStat: -6 },
  // volante de marca / destructor: DEF resuelto, ataque casi nulo
  destructor: { tipo: 'def', rit: -12, tir: -30, pas: -14, reg: -16, fis: 2 },
};

var ARQ_DEF = {
  // DEF se resuelve algebraicamente desde FIS, por eso FIS no puede bajar mucho.
  // libero elegante, sale jugando
  libero: { rit: -14, tir: -30, pas: -6, reg: -10, fis: -10 },
  // central completo, sin debilidades
  completoDef: { rit: -14, tir: -35, pas: -20, reg: -22, fis: -6 },
  // lateral veloz y de proyeccion
  lateralRapido: { rit: -2, tir: -30, pas: -12, reg: -12, fis: -4 },
  // marcador duro, sale jugando poco
  marcadorDuro: { rit: -18, tir: -35, pas: -28, reg: -30, fis: 2 },
  // muro defensivo, casi sin salida
  muro: { rit: -20, tir: -45, pas: -32, reg: -34, fis: 6 },
  // veterano de lectura, poca velocidad, buena salida
  veteranoLectura: { rit: -24, tir: -35, pas: -12, reg: -18, fis: -6 },
  // lateral ofensivo extremo (Roberto Carlos: tiro y ritmo de delantero)
  lateralOfensivoExtremo: { rit: 6, tir: -8, pas: -10, reg: -6, fis: -4 },
};

var ARQ_POR = {
  // atajador de reflejos, menos con los pies
  reflejos: { est: -6, ref: 8, col: -4, saq: -20, vel: -30 },
  // arquero de area, imponente, domina el area
  estirada: { est: 8, ref: -2, col: 4, saq: -14, vel: -32 },
  // arquero moderno, juega con los pies
  saque: { est: -2, ref: 2, col: 2, saq: -4, vel: -22 },
  // equilibrado
  mixto: { est: 0, ref: 0, col: 0, saq: -12, vel: -28 },
  // arquero de epoca clasica, colocacion por sobre reflejos
  clasico: { est: 2, ref: -8, col: 6, saq: -20, vel: -34 },
};

// ---------------------------------------------------------------------------
// Resolucion algebraica de la estadistica principal
// ---------------------------------------------------------------------------

function calcularCartaDelantero(ovr, d) {
  var rit = clampRedondo(ovr + d.rit);
  var pas = clampRedondo(ovr + d.pas);
  var reg = clampRedondo(ovr + d.reg);
  var def = clampRedondo(ovr + d.defStat);
  var fis = clampRedondo(ovr + d.fis);
  // ata = 0.5*tir + 0.3*reg + 0.2*rit  =>  tir = (ovr - 0.3*reg - 0.2*rit) / 0.5
  var tir = clampRedondo((ovr - 0.3 * reg - 0.2 * rit) / 0.5);
  return { rit: rit, tir: tir, pas: pas, reg: reg, def: def, fis: fis };
}

function calcularCartaMediocampista(ovr, d) {
  var rit = clampRedondo(ovr + d.rit);
  var tir = clampRedondo(ovr + d.tir);
  var fis = clampRedondo(ovr + d.fis);
  if (d.tipo === 'cre') {
    var reg = clampRedondo(ovr + d.reg);
    // cre = 0.6*pas + 0.4*reg  =>  pas = (ovr - 0.4*reg) / 0.6
    var pas = clampRedondo((ovr - 0.4 * reg) / 0.6);
    var def = clampRedondo(ovr + d.defStat);
    return { rit: rit, tir: tir, pas: pas, reg: reg, def: def, fis: fis };
  }
  // tipo 'def': destructor. def = 0.75*def + 0.25*fis => def = (ovr - 0.25*fis) / 0.75
  var pas2 = clampRedondo(ovr + d.pas);
  var reg2 = clampRedondo(ovr + d.reg);
  var defv = clampRedondo((ovr - 0.25 * fis) / 0.75);
  return { rit: rit, tir: tir, pas: pas2, reg: reg2, def: defv, fis: fis };
}

function calcularCartaDefensor(ovr, d) {
  var rit = clampRedondo(ovr + d.rit);
  var tir = clampRedondo(ovr + d.tir);
  var pas = clampRedondo(ovr + d.pas);
  var reg = clampRedondo(ovr + d.reg);
  var fis = clampRedondo(ovr + d.fis);
  // def = 0.75*def + 0.25*fis => def = (ovr - 0.25*fis) / 0.75
  var def = clampRedondo((ovr - 0.25 * fis) / 0.75);
  return { rit: rit, tir: tir, pas: pas, reg: reg, def: def, fis: fis };
}

function calcularCartaArquero(ovr, d) {
  var est = clampRedondo(ovr + d.est);
  var ref = clampRedondo(ovr + d.ref);
  var col = clampRedondo(ovr + d.col);
  // arq = (est+par+ref+col)/4 => par = 4*ovr - est - ref - col
  var par = clampRedondo(4 * ovr - est - ref - col);
  var saq = clampRedondo(ovr + d.saq);
  var vel = clampRedondo(ovr + d.vel);
  return { est: est, par: par, saq: saq, ref: ref, vel: vel, col: col };
}

// ---------------------------------------------------------------------------
// Derivacion de atributos de simulacion (SESION.md 3.2, nunca a mano)
// ---------------------------------------------------------------------------

function derivarCampo(c) {
  return {
    ata: Math.round(0.5 * c.tir + 0.3 * c.reg + 0.2 * c.rit),
    cre: Math.round(0.6 * c.pas + 0.4 * c.reg),
    def: Math.round(0.75 * c.def + 0.25 * c.fis),
    arq: 10,
  };
}

function derivarArquero(c) {
  return {
    arq: Math.round((c.est + c.par + c.ref + c.col) / 4),
    ata: Math.round(0.35 * c.saq),
    cre: Math.round(0.6 * c.saq),
    def: Math.round(0.5 * c.col),
  };
}

function principal(pos, derivado) {
  if (pos === 'POR') return derivado.arq;
  if (pos === 'DEF') return derivado.def;
  if (pos === 'MED') return Math.max(derivado.cre, derivado.def);
  return derivado.ata; // DEL
}

// ---------------------------------------------------------------------------
// Cartas ancla (SESION.md 3.2, tal cual, no se recalculan)
// ---------------------------------------------------------------------------

var ANCLAS = {
  1: { posDetalle: 'POR', nombreCarta: 'Yashin', carta: { est: 96, par: 93, saq: 80, ref: 97, vel: 68, col: 94 } },
  23: { posDetalle: 'DFC', nombreCarta: 'Baresi', carta: { rit: 80, tir: 55, pas: 82, reg: 80, def: 96, fis: 88 } },
  102: { posDetalle: 'MCO', nombreCarta: 'Riquelme', carta: { rit: 66, tir: 84, pas: 90, reg: 88, def: 42, fis: 75 } },
  130: { posDetalle: 'DC', nombreCarta: 'Messi', carta: { rit: 94, tir: 99, pas: 92, reg: 99, def: 38, fis: 68 } },
  200: { posDetalle: 'DC', nombreCarta: 'Caniggia', carta: { rit: 97, tir: 84, pas: 72, reg: 88, def: 35, fis: 70 } },
};

// ---------------------------------------------------------------------------
// Mapa por jugador: posDetalle, nombreCarta y arquetipo de estilo.
// `ajustes` permite pisar algun delta puntual del arquetipo (para que un
// jugador puntual se sienta distinto a otro con el mismo arquetipo).
// `override` permite pisar el valor FINAL de una estadistica puntual
// (usado para casos citados textualmente en el brief, como el SAQ de
// Chilavert por sobre el de Neuer y Alisson).
// ---------------------------------------------------------------------------

var MAPA = {
  // ---- POR (1-20) ----
  2: { posDetalle: 'POR', nombreCarta: 'Buffon', arquetipo: 'reflejos' },
  3: { posDetalle: 'POR', nombreCarta: 'Neuer', arquetipo: 'saque' },
  4: { posDetalle: 'POR', nombreCarta: 'Casillas', arquetipo: 'reflejos' },
  5: { posDetalle: 'POR', nombreCarta: 'Schmeichel', arquetipo: 'estirada' },
  6: { posDetalle: 'POR', nombreCarta: 'Banks', arquetipo: 'reflejos' },
  7: { posDetalle: 'POR', nombreCarta: 'Zoff', arquetipo: 'clasico' },
  8: { posDetalle: 'POR', nombreCarta: 'Kahn', arquetipo: 'estirada' },
  9: { posDetalle: 'POR', nombreCarta: 'Maier', arquetipo: 'clasico' },
  10: { posDetalle: 'POR', nombreCarta: 'Courtois', arquetipo: 'mixto' },
  11: { posDetalle: 'POR', nombreCarta: 'Alisson', arquetipo: 'saque' },
  12: { posDetalle: 'POR', nombreCarta: 'Zamora', arquetipo: 'clasico' },
  13: { posDetalle: 'POR', nombreCarta: 'Van der Sar', arquetipo: 'saque' },
  14: { posDetalle: 'POR', nombreCarta: 'Cech', arquetipo: 'reflejos' },
  15: { posDetalle: 'POR', nombreCarta: 'Oblak', arquetipo: 'reflejos' },
  16: { posDetalle: 'POR', nombreCarta: 'Fillol', arquetipo: 'mixto' },
  17: { posDetalle: 'POR', nombreCarta: 'Dibu', arquetipo: 'reflejos' },
  18: { posDetalle: 'POR', nombreCarta: 'Chilavert', arquetipo: 'saque', override: { saq: 99 } },
  19: { posDetalle: 'POR', nombreCarta: 'Dasáyev', arquetipo: 'clasico' },
  20: { posDetalle: 'POR', nombreCarta: 'Zenga', arquetipo: 'reflejos' },

  // ---- DEF (21-66) ----
  21: { posDetalle: 'DFC', nombreCarta: 'Beckenbauer', arquetipo: 'libero' },
  22: { posDetalle: 'DFC', nombreCarta: 'Maldini', arquetipo: 'completoDef' },
  24: { posDetalle: 'DFC', nombreCarta: 'Moore', arquetipo: 'veteranoLectura' },
  25: { posDetalle: 'DFC', nombreCarta: 'Cannavaro', arquetipo: 'completoDef' },
  26: { posDetalle: 'DFC', nombreCarta: 'Passarella', arquetipo: 'marcadorDuro' },
  27: { posDetalle: 'DFC', nombreCarta: 'S. Ramos', arquetipo: 'marcadorDuro' },
  28: { posDetalle: 'DFC', nombreCarta: 'Van Dijk', arquetipo: 'completoDef' },
  29: { posDetalle: 'LD', nombreCarta: 'C. Alberto', arquetipo: 'lateralRapido' },
  30: { posDetalle: 'LD', nombreCarta: 'Cafu', arquetipo: 'lateralRapido' },
  31: { posDetalle: 'LI', nombreCarta: 'R. Carlos', arquetipo: 'lateralOfensivoExtremo' },
  32: { posDetalle: 'DFC', nombreCarta: 'Figueroa', arquetipo: 'completoDef' },
  33: { posDetalle: 'LI', nombreCarta: 'Facchetti', arquetipo: 'lateralRapido' },
  34: { posDetalle: 'LD', nombreCarta: 'Lahm', arquetipo: 'lateralRapido' },
  35: { posDetalle: 'LI', nombreCarta: 'N. Santos', arquetipo: 'lateralRapido' },
  36: { posDetalle: 'DFC', nombreCarta: 'Scirea', arquetipo: 'libero' },
  37: { posDetalle: 'DFC', nombreCarta: 'Nesta', arquetipo: 'completoDef' },
  38: { posDetalle: 'LI', nombreCarta: 'Krol', arquetipo: 'libero' },
  39: { posDetalle: 'DFC', nombreCarta: 'Puyol', arquetipo: 'marcadorDuro' },
  40: { posDetalle: 'DFC', nombreCarta: 'Desailly', arquetipo: 'muro' },
  41: { posDetalle: 'DFC', nombreCarta: 'Thuram', arquetipo: 'completoDef' },
  42: { posDetalle: 'LI', nombreCarta: 'Breitner', arquetipo: 'libero' },
  43: { posDetalle: 'DFC', nombreCarta: 'Koeman', arquetipo: 'libero' },
  44: { posDetalle: 'LD', nombreCarta: 'D. Santos', arquetipo: 'lateralRapido' },
  45: { posDetalle: 'DFC', nombreCarta: 'Ferdinand', arquetipo: 'completoDef' },
  46: { posDetalle: 'DFC', nombreCarta: 'Terry', arquetipo: 'marcadorDuro' },
  47: { posDetalle: 'LD', nombreCarta: 'Zanetti', arquetipo: 'lateralRapido' },
  48: { posDetalle: 'DFC', nombreCarta: 'T. Silva', arquetipo: 'completoDef' },
  49: { posDetalle: 'LD', nombreCarta: 'Dani Alves', arquetipo: 'lateralRapido' },
  50: { posDetalle: 'DFC', nombreCarta: 'Piqué', arquetipo: 'completoDef' },
  51: { posDetalle: 'LD', nombreCarta: 'Gentile', arquetipo: 'muro' },
  52: { posDetalle: 'LI', nombreCarta: 'Brehme', arquetipo: 'lateralRapido' },
  53: { posDetalle: 'DFC', nombreCarta: 'Santamaría', arquetipo: 'muro' },
  54: { posDetalle: 'DFC', nombreCarta: 'Blanc', arquetipo: 'libero' },
  55: { posDetalle: 'DFC', nombreCarta: 'Hierro', arquetipo: 'muro' },
  56: { posDetalle: 'DFC', nombreCarta: 'Vidić', arquetipo: 'muro' },
  57: { posDetalle: 'DFC', nombreCarta: 'Stam', arquetipo: 'muro' },
  58: { posDetalle: 'DFC', nombreCarta: 'Hummels', arquetipo: 'libero' },
  59: { posDetalle: 'LI', nombreCarta: 'Marcelo', arquetipo: 'lateralRapido' },
  60: { posDetalle: 'DFC', nombreCarta: 'Godín', arquetipo: 'marcadorDuro' },
  61: { posDetalle: 'DFC', nombreCarta: 'Ruggeri', arquetipo: 'marcadorDuro' },
  62: { posDetalle: 'DFC', nombreCarta: 'Perfumo', arquetipo: 'completoDef' },
  63: { posDetalle: 'LI', nombreCarta: 'Marzolini', arquetipo: 'lateralRapido' },
  64: { posDetalle: 'DFC', nombreCarta: 'Márquez', arquetipo: 'completoDef' },
  65: { posDetalle: 'DFC', nombreCarta: 'Chumpitaz', arquetipo: 'marcadorDuro' },
  66: { posDetalle: 'DFC', nombreCarta: 'Ayala', arquetipo: 'completoDef' },

  // ---- MED (67-128) ----
  67: { posDetalle: 'MCO', nombreCarta: 'Maradona', arquetipo: 'enganche', ajustes: { reg: 10, tir: 6 } },
  68: { posDetalle: 'MCO', nombreCarta: 'Zidane', arquetipo: 'enganche' },
  69: { posDetalle: 'MCO', nombreCarta: 'Platini', arquetipo: 'enganche' },
  70: { posDetalle: 'MCO', nombreCarta: 'Ronaldinho', arquetipo: 'enganche' },
  71: { posDetalle: 'MCO', nombreCarta: 'Zico', arquetipo: 'enganche' },
  72: { posDetalle: 'MC', nombreCarta: 'Xavi', arquetipo: 'regista' },
  73: { posDetalle: 'MCO', nombreCarta: 'Iniesta', arquetipo: 'enganche' },
  74: { posDetalle: 'MC', nombreCarta: 'Matthäus', arquetipo: 'boxToBox' },
  75: { posDetalle: 'MC', nombreCarta: 'Charlton', arquetipo: 'boxToBox' },
  76: { posDetalle: 'MC', nombreCarta: 'Modrić', arquetipo: 'regista' },
  77: { posDetalle: 'MCO', nombreCarta: 'Kaká', arquetipo: 'enganche' },
  78: { posDetalle: 'MC', nombreCarta: 'Gullit', arquetipo: 'boxToBox' },
  79: { posDetalle: 'MC', nombreCarta: 'Didi', arquetipo: 'regista' },
  80: { posDetalle: 'MC', nombreCarta: 'Rijkaard', arquetipo: 'boxToBox' },
  81: { posDetalle: 'MCD', nombreCarta: 'Pirlo', arquetipo: 'regista' },
  82: { posDetalle: 'MC', nombreCarta: 'De Bruyne', arquetipo: 'boxToBox' },
  83: { posDetalle: 'MCO', nombreCarta: 'Rivera', arquetipo: 'enganche' },
  84: { posDetalle: 'MCO', nombreCarta: 'Sócrates', arquetipo: 'enganche' },
  85: { posDetalle: 'MI', nombreCarta: 'Rivelino', arquetipo: 'enganche' },
  86: { posDetalle: 'MCO', nombreCarta: 'Schiaffino', arquetipo: 'enganche' },
  87: { posDetalle: 'MD', nombreCarta: 'Figo', arquetipo: 'extremoMed' },
  88: { posDetalle: 'MCO', nombreCarta: 'Zizinho', arquetipo: 'enganche' },
  89: { posDetalle: 'MC', nombreCarta: 'Neeskens', arquetipo: 'boxToBox' },
  90: { posDetalle: 'MC', nombreCarta: 'Kroos', arquetipo: 'regista' },
  91: { posDetalle: 'MC', nombreCarta: 'Gerrard', arquetipo: 'boxToBox' },
  92: { posDetalle: 'MI', nombreCarta: 'Nedvěd', arquetipo: 'boxToBox' },
  93: { posDetalle: 'MC', nombreCarta: 'Falcão', arquetipo: 'boxToBox' },
  94: { posDetalle: 'MCD', nombreCarta: 'Rodri', arquetipo: 'pivote' },
  95: { posDetalle: 'MC', nombreCarta: 'L. Suárez M.', arquetipo: 'enganche' },
  96: { posDetalle: 'MCO', nombreCarta: 'F. Walter', arquetipo: 'enganche' },
  97: { posDetalle: 'MCO', nombreCarta: 'Laudrup', arquetipo: 'enganche' },
  98: { posDetalle: 'MC', nombreCarta: 'Gérson', arquetipo: 'regista' },
  99: { posDetalle: 'MCO', nombreCarta: 'Mazzola', arquetipo: 'boxToBox' },
  100: { posDetalle: 'MC', nombreCarta: 'Netzer', arquetipo: 'regista' },
  101: { posDetalle: 'MCD', nombreCarta: 'Redondo', arquetipo: 'pivote' },
  103: { posDetalle: 'MCO', nombreCarta: 'Francescoli', arquetipo: 'enganche' },
  104: { posDetalle: 'MCD', nombreCarta: 'Vieira', arquetipo: 'destructor' },
  105: { posDetalle: 'MC', nombreCarta: 'Lampard', arquetipo: 'boxToBox' },
  106: { posDetalle: 'MCD', nombreCarta: 'Busquets', arquetipo: 'pivote' },
  107: { posDetalle: 'MC', nombreCarta: 'Ballack', arquetipo: 'boxToBox' },
  108: { posDetalle: 'MC', nombreCarta: 'Masopust', arquetipo: 'boxToBox' },
  109: { posDetalle: 'MC', nombreCarta: 'Bozsik', arquetipo: 'regista' },
  110: { posDetalle: 'MCO', nombreCarta: 'Hidegkuti', arquetipo: 'enganche' },
  111: { posDetalle: 'MCO', nombreCarta: 'Cubillas', arquetipo: 'enganche' },
  112: { posDetalle: 'MC', nombreCarta: 'Valderrama', arquetipo: 'regista' },
  113: { posDetalle: 'MCO', nombreCarta: 'Hagi', arquetipo: 'enganche' },
  114: { posDetalle: 'MCO', nombreCarta: 'Sneijder', arquetipo: 'enganche' },
  115: { posDetalle: 'MC', nombreCarta: 'Schweini', arquetipo: 'boxToBox' },
  116: { posDetalle: 'MC', nombreCarta: 'Scholes', arquetipo: 'regista' },
  117: { posDetalle: 'MCO', nombreCarta: 'D. Silva', arquetipo: 'enganche' },
  118: { posDetalle: 'MCO', nombreCarta: 'Deco', arquetipo: 'enganche' },
  119: { posDetalle: 'MC', nombreCarta: 'Coluna', arquetipo: 'boxToBox' },
  120: { posDetalle: 'MCD', nombreCarta: 'Kanté', arquetipo: 'destructor' },
  121: { posDetalle: 'MC', nombreCarta: 'Yaya Touré', arquetipo: 'boxToBox' },
  122: { posDetalle: 'MCD', nombreCarta: 'Varela', arquetipo: 'destructor' },
  123: { posDetalle: 'MCO', nombreCarta: 'Gascoigne', arquetipo: 'enganche' },
  124: { posDetalle: 'MD', nombreCarta: 'Beckham', arquetipo: 'extremoMed' },
  125: { posDetalle: 'MI', nombreCarta: 'Di María', arquetipo: 'extremoMed' },
  126: { posDetalle: 'MCD', nombreCarta: 'Makélélé', arquetipo: 'destructor' },
  127: { posDetalle: 'MC', nombreCarta: 'Verón', arquetipo: 'boxToBox' },
  128: { posDetalle: 'MCO', nombreCarta: 'Bochini', arquetipo: 'enganche' },

  // ---- DEL (129-200) ----
  129: { posDetalle: 'DC', nombreCarta: 'Pelé', arquetipo: 'completo' },
  131: { posDetalle: 'SD', nombreCarta: 'Cruyff', arquetipo: 'tecnico' },
  132: { posDetalle: 'DC', nombreCarta: 'Di Stéfano', arquetipo: 'completo' },
  133: { posDetalle: 'DC', nombreCarta: 'Ronaldo', arquetipo: 'explosivo' },
  134: { posDetalle: 'DC', nombreCarta: 'C. Ronaldo', arquetipo: 'potente' },
  135: { posDetalle: 'DC', nombreCarta: 'Puskás', arquetipo: 'killerArea' },
  136: { posDetalle: 'ED', nombreCarta: 'Garrincha', arquetipo: 'extremoVeloz' },
  137: { posDetalle: 'DC', nombreCarta: 'Eusébio', arquetipo: 'completo' },
  138: { posDetalle: 'DC', nombreCarta: 'Müller', arquetipo: 'killerArea' },
  139: { posDetalle: 'DC', nombreCarta: 'Van Basten', arquetipo: 'completo' },
  140: { posDetalle: 'DC', nombreCarta: 'Romário', arquetipo: 'killerArea' },
  141: { posDetalle: 'SD', nombreCarta: 'Baggio', arquetipo: 'tecnico' },
  142: { posDetalle: 'DC', nombreCarta: 'Henry', arquetipo: 'completo' },
  143: { posDetalle: 'EI', nombreCarta: 'Best', arquetipo: 'extremoVeloz' },
  144: { posDetalle: 'DC', nombreCarta: 'Meazza', arquetipo: 'completo' },
  145: { posDetalle: 'EI', nombreCarta: 'Mbappé', arquetipo: 'explosivo' },
  146: { posDetalle: 'EI', nombreCarta: 'Neymar', arquetipo: 'extremoVeloz' },
  147: { posDetalle: 'DC', nombreCarta: 'Rummenigge', arquetipo: 'completo' },
  148: { posDetalle: 'EI', nombreCarta: 'Rivaldo', arquetipo: 'tecnico' },
  149: { posDetalle: 'DC', nombreCarta: 'Lewandowski', arquetipo: 'potente' },
  150: { posDetalle: 'DC', nombreCarta: 'Suárez', arquetipo: 'completo' },
  151: { posDetalle: 'DC', nombreCarta: 'Benzema', arquetipo: 'tecnico' },
  152: { posDetalle: 'DC', nombreCarta: 'Ibrahimović', arquetipo: 'potente' },
  153: { posDetalle: 'DC', nombreCarta: 'Batistuta', arquetipo: 'potente' },
  154: { posDetalle: 'DC', nombreCarta: 'Shevchenko', arquetipo: 'potente' },
  155: { posDetalle: 'SD', nombreCarta: 'Sívori', arquetipo: 'tecnico' },
  156: { posDetalle: 'EI', nombreCarta: 'Gento', arquetipo: 'extremoVeloz' },
  157: { posDetalle: 'SD', nombreCarta: 'Kubala', arquetipo: 'tecnico' },
  158: { posDetalle: 'DC', nombreCarta: 'Leônidas', arquetipo: 'killerArea' },
  159: { posDetalle: 'ED', nombreCarta: 'Kopa', arquetipo: 'tecnico' },
  160: { posDetalle: 'ED', nombreCarta: 'Matthews', arquetipo: 'extremoVeloz' },
  161: { posDetalle: 'DC', nombreCarta: 'Haaland', arquetipo: 'potente' },
  162: { posDetalle: 'ED', nombreCarta: 'Jairzinho', arquetipo: 'extremoVeloz' },
  163: { posDetalle: 'DC', nombreCarta: 'Kocsis', arquetipo: 'killerArea' },
  164: { posDetalle: 'SD', nombreCarta: 'Bergkamp', arquetipo: 'tecnico' },
  165: { posDetalle: 'DC', nombreCarta: 'Kempes', arquetipo: 'completo' },
  166: { posDetalle: 'DC', nombreCarta: 'Stoichkov', arquetipo: 'potente' },
  167: { posDetalle: 'DC', nombreCarta: 'Weah', arquetipo: 'completo' },
  168: { posDetalle: 'DC', nombreCarta: "Eto'o", arquetipo: 'explosivo' },
  169: { posDetalle: 'ED', nombreCarta: 'Robben', arquetipo: 'extremoVeloz' },
  170: { posDetalle: 'ED', nombreCarta: 'Salah', arquetipo: 'extremoVeloz' },
  171: { posDetalle: 'SD', nombreCarta: 'Dalglish', arquetipo: 'tecnico' },
  172: { posDetalle: 'DC', nombreCarta: 'Denis Law', arquetipo: 'killerArea' },
  173: { posDetalle: 'DC', nombreCarta: 'Fontaine', arquetipo: 'killerArea' },
  174: { posDetalle: 'DC', nombreCarta: 'Rossi', arquetipo: 'killerArea' },
  175: { posDetalle: 'DC', nombreCarta: 'Riva', arquetipo: 'potente' },
  176: { posDetalle: 'DC', nombreCarta: 'Tostão', arquetipo: 'tecnico' },
  177: { posDetalle: 'DC', nombreCarta: 'Raúl', arquetipo: 'completo' },
  178: { posDetalle: 'SD', nombreCarta: 'Totti', arquetipo: 'tecnico' },
  179: { posDetalle: 'SD', nombreCarta: 'Del Piero', arquetipo: 'tecnico' },
  180: { posDetalle: 'EI', nombreCarta: 'Vinícius Jr', arquetipo: 'extremoVeloz' },
  181: { posDetalle: 'SD', nombreCarta: 'Moreno', arquetipo: 'completo' },
  182: { posDetalle: 'DC', nombreCarta: 'Keegan', arquetipo: 'completo' },
  183: { posDetalle: 'DC', nombreCarta: 'Nordahl', arquetipo: 'potente' },
  184: { posDetalle: 'EI', nombreCarta: 'Blokhin', arquetipo: 'extremoVeloz' },
  185: { posDetalle: 'EI', nombreCarta: 'Hazard', arquetipo: 'extremoVeloz' },
  186: { posDetalle: 'DC', nombreCarta: 'Kane', arquetipo: 'completo' },
  187: { posDetalle: 'DC', nombreCarta: 'Drogba', arquetipo: 'potente' },
  188: { posDetalle: 'DC', nombreCarta: 'Shearer', arquetipo: 'potente' },
  189: { posDetalle: 'SD', nombreCarta: 'Rooney', arquetipo: 'completo' },
  190: { posDetalle: 'DC', nombreCarta: 'Hugo Sánchez', arquetipo: 'killerArea' },
  191: { posDetalle: 'SD', nombreCarta: 'Griezmann', arquetipo: 'tecnico' },
  192: { posDetalle: 'SD', nombreCarta: 'Cantona', arquetipo: 'tecnico' },
  193: { posDetalle: 'DC', nombreCarta: 'Klinsmann', arquetipo: 'killerArea' },
  194: { posDetalle: 'DC', nombreCarta: 'Agüero', arquetipo: 'killerArea' },
  195: { posDetalle: 'DC', nombreCarta: 'Crespo', arquetipo: 'killerArea' },
  196: { posDetalle: 'DC', nombreCarta: 'Forlán', arquetipo: 'completo' },
  197: { posDetalle: 'DC', nombreCarta: 'F. Torres', arquetipo: 'explosivo' },
  198: { posDetalle: 'DC', nombreCarta: 'Spencer', arquetipo: 'killerArea' },
  199: { posDetalle: 'DC', nombreCarta: 'Labruna', arquetipo: 'tecnico' },
};

// ---------------------------------------------------------------------------
// Construccion de la carta de un jugador
// ---------------------------------------------------------------------------

// Variacion propia de cada jugador (-4..+4 por estadistica), deterministica por
// id: sin esto, dos jugadores con el mismo arquetipo y el mismo OVR tendrian
// cartas identicas. La estadistica principal se sigue resolviendo despues, asi
// que la coherencia con el OVR no cambia.
function variacion(id, clave) {
  var texto = id + ':' + clave;
  var h = 2166136261;
  for (var i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 9) - 4;
}

function conVariacion(id, deltas) {
  var out = {};
  Object.keys(deltas).forEach(function (k) {
    out[k] = typeof deltas[k] === 'number' ? deltas[k] + variacion(id, k) : deltas[k];
  });
  return out;
}

function construirCarta(fila) {
  var ancla = ANCLAS[fila.id];
  if (ancla) {
    return { posDetalle: ancla.posDetalle, nombreCarta: ancla.nombreCarta, carta: ancla.carta };
  }
  var entrada = MAPA[fila.id];
  if (!entrada) throw new Error('Falta el jugador id ' + fila.id + ' (' + fila.nombre + ') en el MAPA');

  var deltas;
  var carta;
  if (fila.posicion === 'POR') {
    deltas = Object.assign({}, ARQ_POR[entrada.arquetipo], entrada.ajustes || {});
    carta = calcularCartaArquero(fila.ovr, conVariacion(fila.id, deltas));
  } else if (fila.posicion === 'DEF') {
    deltas = Object.assign({}, ARQ_DEF[entrada.arquetipo], entrada.ajustes || {});
    carta = calcularCartaDefensor(fila.ovr, conVariacion(fila.id, deltas));
  } else if (fila.posicion === 'MED') {
    deltas = Object.assign({}, ARQ_MED[entrada.arquetipo], entrada.ajustes || {});
    carta = calcularCartaMediocampista(fila.ovr, conVariacion(fila.id, deltas));
  } else {
    deltas = Object.assign({}, ARQ_DEL[entrada.arquetipo], entrada.ajustes || {});
    carta = calcularCartaDelantero(fila.ovr, conVariacion(fila.id, deltas));
  }

  if (entrada.override) {
    carta = Object.assign({}, carta, entrada.override);
  }

  return { posDetalle: entrada.posDetalle, nombreCarta: entrada.nombreCarta, carta: carta };
}

// ---------------------------------------------------------------------------
// Validacion (reglas duras de SESION.md 3.2)
// ---------------------------------------------------------------------------

var POS_DETALLE_VALIDAS = {
  POR: ['POR'],
  DEF: ['DFC', 'LD', 'LI'],
  MED: ['MCD', 'MC', 'MCO', 'MD', 'MI'],
  DEL: ['DC', 'SD', 'ED', 'EI'],
};

function validar(jugadores) {
  var errores = [];

  if (jugadores.length !== 200) {
    errores.push('Se esperaban 200 jugadores, hay ' + jugadores.length);
  }

  var idsVistos = {};
  var nombresVistos = {};
  var porCategoria = { Leyenda: 0, Crack: 0, Estrella: 0, Figura: 0 };
  var cantidadPor = 0;

  jugadores.forEach(function (j) {
    if (idsVistos[j.id]) errores.push('id repetido: ' + j.id);
    idsVistos[j.id] = true;

    var nombreClave = j.nombreCarta.toLowerCase();
    if (nombresVistos[nombreClave]) {
      errores.push('nombreCarta repetido: "' + j.nombreCarta + '" (id ' + j.id + ' y ' + nombresVistos[nombreClave] + ')');
    }
    nombresVistos[nombreClave] = j.id;

    if (j.nombreCarta.length > 12) {
      errores.push('nombreCarta de mas de 12 caracteres: "' + j.nombreCarta + '" (' + j.nombreCarta.length + ')');
    }

    var posiblesDetalle = POS_DETALLE_VALIDAS[j.posicion];
    if (!posiblesDetalle || posiblesDetalle.indexOf(j.posDetalle) === -1) {
      errores.push('posDetalle "' + j.posDetalle + '" incompatible con ' + j.posicion + ' (id ' + j.id + ')');
    }

    var statsClave = j.posicion === 'POR'
      ? ['est', 'par', 'saq', 'ref', 'vel', 'col']
      : ['rit', 'tir', 'pas', 'reg', 'def', 'fis'];
    statsClave.forEach(function (k) {
      var v = j.carta[k];
      if (typeof v !== 'number' || v < 20 || v > 99) {
        errores.push('estadistica de carta fuera de rango: ' + j.nombreCarta + '.' + k + ' = ' + v);
      }
    });

    var pr = principal(j.posicion, j);
    var diff = Math.abs(pr - j.ovr);
    if (diff > 2) {
      errores.push(
        'atributo principal fuera de +-2: ' + j.nombreCarta + ' (id ' + j.id + ', ' + j.posicion +
        ') principal=' + pr + ' ovr=' + j.ovr + ' diff=' + diff
      );
    }

    var catEsperada = categoriaPorOvr(j.ovr);
    if (j.categoria !== catEsperada) {
      errores.push('categoria incorrecta: ' + j.nombreCarta + ' es ' + j.categoria + ', deberia ser ' + catEsperada);
    }
    porCategoria[j.categoria] = (porCategoria[j.categoria] || 0) + 1;

    if (j.posicion === 'POR') cantidadPor++;
  });

  var esperado = { Leyenda: 18, Crack: 24, Estrella: 100, Figura: 58 };
  Object.keys(esperado).forEach(function (cat) {
    if (porCategoria[cat] !== esperado[cat]) {
      errores.push('cantidad de ' + cat + ' = ' + porCategoria[cat] + ', se esperaban ' + esperado[cat]);
    }
  });
  if (cantidadPor !== 20) errores.push('cantidad de POR = ' + cantidadPor + ', se esperaban 20');

  return errores;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  var filas = leerCsv();

  var jugadores = filas.map(function (fila) {
    var c = construirCarta(fila);
    var derivado = fila.posicion === 'POR' ? derivarArquero(c.carta) : derivarCampo(c.carta);
    return {
      id: fila.id,
      nombre: fila.nombre,
      nombreCarta: c.nombreCarta,
      pais: fila.pais,
      bandera: bandera(fila.pais),
      posicion: fila.posicion,
      posDetalle: c.posDetalle,
      pico: fila.pico,
      club: fila.club,
      siglaClub: SIGLA_CLUB[fila.club],
      ovr: fila.ovr,
      categoria: categoriaPorOvr(fila.ovr),
      carta: c.carta,
      ata: derivado.ata,
      cre: derivado.cre,
      def: derivado.def,
      arq: derivado.arq,
    };
  });

  var errores = validar(jugadores);
  if (errores.length > 0) {
    console.error('Validacion fallida, ' + errores.length + ' error(es):');
    errores.forEach(function (e) { console.error('  - ' + e); });
    process.exit(1);
  }

  var cabecera =
    "(function (root, factory) {\n" +
    "  if (typeof module === 'object' && module.exports) {\n" +
    "    module.exports = factory();\n" +
    "  } else {\n" +
    "    root.SC = root.SC || {};\n" +
    "    root.SC.jugadores = factory();\n" +
    "  }\n" +
    "})(typeof self !== 'undefined' ? self : this, function () {\n" +
    "  'use strict';\n" +
    "  // Generado por tools/generar-jugadores.js a partir de data/jugadores-base.csv.\n" +
    "  // No editar a mano: correr `node subasta-futbol/tools/generar-jugadores.js`.\n" +
    "  var JUGADORES = ";

  var pie =
    ";\n\n  return JUGADORES;\n" +
    "});\n";

  var cuerpo = JSON.stringify(jugadores, null, 2);

  fs.writeFileSync(OUT_PATH, cabecera + cuerpo + pie, 'utf8');
  console.log('OK: ' + jugadores.length + ' jugadores escritos en ' + path.relative(process.cwd(), OUT_PATH));
}

main();
