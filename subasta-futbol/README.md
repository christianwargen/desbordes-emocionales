# Subasta de Cracks

Juego web para 2 personas en la misma pantalla (hot-seat): cada una arma un equipo de 4
futbolistas históricos comprándolos en subasta con $20, y después los equipos juegan un
partido simulado. Gana el torneo quien llegue primero a 100 puntos (o quien tenga más
puntos después de 10 partidos, según el modo elegido). Ver la especificación completa en
[`SESION.md`](./SESION.md).

## Cómo jugar

Abrí `index.html` con doble clic (funciona sin conexión, salvo la tipografía de Google
Fonts que tiene fallback de sistema) o serví la carpeta con cualquier servidor estático.

## Cómo correr los tests

```
node --test subasta-futbol/tests/*.test.js
```

## Cómo correr la calibración del simulador

```
node subasta-futbol/tools/calibrar.js
```

## Cómo regenerar los datos de jugadores

```
node subasta-futbol/tools/generar-jugadores.js
```

Lee `data/jugadores-base.csv` y un mapa de arquetipos escrito a mano en el mismo script,
calcula los atributos derivados (fórmulas de `SESION.md` 3.2) y valida las reglas duras
antes de escribir `js/jugadores.js`.

## Salida de la calibración (sección 5.5)

Corrida con `node subasta-futbol/tools/calibrar.js`, 20.000 partidos por escenario, seed
fija (reproducible):

```
Calibracion del simulador (20000 partidos por escenario)

| Escenario                                                                               | Resultado               | Objetivo | OK/FALLA |
| --------------------------------------------------------------------------------------- | ----------------------- | -------- | -------- |
| Dos equipos identicos                                                                   | gana A 49.7%            | 48%-52%  | OK |
| Drafts aleatorios: goles/partido (90' + alargue)                                        | 3.74                    | 2.8-4.2  | OK |
| Drafts aleatorios: % que van al alargue                                                 | 20.7%                   | 12%-28%  | OK |
| Drafts aleatorios: % que llegan a penales                                               | 2.3%                    | <=6%     | OK |
| Diferencia de OVR ~3 (real 3.0)                                                         | gana el mejor 62.6%     | 57%-67%  | OK |
| Diferencia de OVR ~6 (real 5.8)                                                         | gana el mejor 73.8%     | 68%-80%  | OK |
| Diferencia de OVR ~10 (real 7.2)                                                        | gana el mejor 82.6%     | 82%-92%  | OK |
| Beckenbauer+Maradona+Messi+Pelé vs Ruggeri+Ayala+Bochini+Caniggia                       | gana A 90.4%            | 88%-96%  | OK |
| Equilibrado (Nesta,Puyol,Gerrard,Raúl) vs todo ataque (Totti,Del Piero,Tostão,Bergkamp) | gana equilibrado 53.4%  | 50%-66%  | OK |
| Reparto parejo al azar vs el equipo que compró el rival                                 | gana el repartido 49.4% | 42%-58%  | OK |

Todos los escenarios OK.
```

`CONFIG_SIM` final. Cambios respecto de los valores iniciales del brief: `jugadas` 18 → 16,
`pendienteRemate` 90 → 75, `remateMax` 0,85 → 0,92 y `pendienteGol` 110 → 130 (después de corregir
las estadísticas de las cartas), más `arqueroEstandar`, `jugadasAlargue` y `minutosPorJugadaAlargue`
para el arquero único y el alargue con gol de oro (ver «Cambio de reglas» abajo).

```json
{
  "jugadas": 16,
  "expPosesion": 3,
  "posesionMin": 0.3,
  "posesionMax": 0.7,
  "baseRemate": 0.42,
  "pendienteRemate": 75,
  "remateMin": 0.12,
  "remateMax": 0.92,
  "baseGol": 0.36,
  "pendienteGol": 130,
  "golMin": 0.08,
  "golMax": 0.8,
  "arqueroEstandar": 90,
  "jugadasAlargue": 10,
  "minutosPorJugadaAlargue": 3,
  "penalBase": 0.75,
  "penalPendiente": 200,
  "penalMin": 0.55,
  "penalMax": 0.92
}
```

## Decisiones tomadas

Cosas que no estaban 100% especificadas en `SESION.md` y se resolvieron de la forma más
simple, siguiendo adelante sin frenar a preguntar:

- **Retorno de `generarMercado(seed)`**: devuelve un array de 24 ids de jugadores (no los
  objetos completos), para que el estado del torneo sea serializable sin duplicar datos;
  la UI resuelve cada id contra `js/jugadores.js`.
- **Reemplazo de posición en el mercado**: cuando hace falta reemplazar un jugador para
  cumplir los mínimos de posición, se prioriza un candidato de la misma categoría (se
  prueban todos los candidatos disponibles al azar antes de relajar la restricción); solo
  si ninguna categoría tiene disponible la posición faltante se busca en cualquier
  categoría, tal como lo describe la sección 2.3.
- **`equipoA`/`equipoB` de `simularPartido`**: son arrays de 4 objetos jugador completos
  (no ids), para que `js/simulacion.js` sea un módulo puro sin depender de
  `js/jugadores.js`; quien arma los equipos (la UI, o `tools/calibrar.js`) resuelve los ids.
- **Relato de texto de los eventos**: vive en `js/app.js` (capa de UI), no en
  `js/simulacion.js`, porque necesita nombres de jugadores (`nombreCarta`) que el motor de
  simulación no conoce; `simularPartido` sólo devuelve eventos estructurados con ids.
- **Orden de penales cíclico**: si hace falta patear una 5ta vez (muerte súbita), se repite
  el orden desde el primer pateador (arrancando de nuevo por `ata` descendente, arquero al
  final del ciclo de 4).
- **`registrarResultado` de torneo**: recibe la salida completa de `simularPartido` (o
  cualquier objeto con al menos `{ganador}`) y la guarda tal cual en el historial del
  partido jugado, junto con los lotes de la subasta, para poder reconstruir el resumen del
  torneo (goleador, fichaje más caro, etc.) en la pantalla de campeón.
- **Calibración**: los escenarios «Diferencia de OVR ~3/~6/~10» promedian 10 cruces de
  equipos distintos (antes medían un único cruce, que dependía demasiado de los jugadores
  puntuales). Las constantes finales están en la sección anterior.
- **Persistencia mínima**: en `localStorage` sólo se guardan `{ torneo, pantalla }`. Los
  resultados de partido y las probabilidades de la previa NO se cachean: como
  `simularPartido`/`probabilidadVictoria` son determinísticos dado el seed del partido
  (`partido.seed`), recargar en medio de la previa o del relato los vuelve a calcular
  igual, en vez de guardar un blob más grande. Si recargás a mitad del relato animado del
  partido, la animación arranca de nuevo desde 0' (no queda a mitad de camino), pero el
  resultado final es el mismo siempre.
- **Botón «🎲 Al azar»**: usa `Math.random()`, no el RNG con semilla del motor. Es sólo una
  comodidad de UI (equivale a que la persona elija un jugador cualquiera); no afecta el
  determinismo del mercado ni del partido, que sólo dependen del seed del torneo.
- **Color del nombre en la pantalla Campeón**: se toma en vivo del manager que ganó
  (`torneo.campeon`), no de un color fijo, para que ande bien sin importar quién ganó.
- **Toast de adjudicación**: aparece abajo del todo de la pantalla (no arriba) para no
  taparse con los títulos o el marcador de cada pantalla.
- **Atajos de teclado (P2)**: sólo responden si hay un lote en curso y sólo las teclas del
  manager al que le toca pujar en ese momento (`Q/W/E/A` para el manager 1, `P/O/I/L` para
  el manager 2); no hay atajo para nominar ni para compra directa.
- **Revelación al nominar (P1)**: bandera (0–0,3s) → posición (0,3–0,6s) → club (0,6–0,9s) →
  carta completa con destello si es Leyenda (0,9–1,45s); se cierra sola al llegar a 1,45s,
  se puede saltear tocando en cualquier momento, y se omite por completo si
  `prefers-reduced-motion` está activo.

## Correcciones al CSV

Ninguna. Se revisó `data/jugadores-base.csv` fila por fila (nombre, país, posición, año
pico, club, OVR) y no se encontraron errores factuales evidentes.

## Verificación en navegador

Con Chromium vía Playwright (`/opt/pw-browsers`, sin `playwright install`), se automatizó
un torneo completo (nominar/pujar/pasar/fichar al azar, previa, partido, resultado) en tres
tamaños: 1280×800, 390×844 y 360×740. En los tres casos: `scrollWidth === clientWidth` (sin
scroll horizontal) y cero errores de consola. También se probaron por separado: el modo
«10 partidos» (progreso `partido N/10` correcto), recargar la página a mitad de una subasta
(retoma exactamente la misma pantalla y el mismo partido), la pantalla de Campeón (armando
un torneo casi terminado directamente con el motor para no tener que jugar 10 partidos
reales), la revelación de carta al nominar, deshacer una puja, y los atajos de teclado
(incluyendo que las teclas del manager que no tiene el turno no hagan nada). Las cartas se
compararon a ojo contra `referencia/cartas.html`: misma estructura, mismas 4 categorías,
arqueros con sus 6 estadísticas propias, minis con sólo OVR/posición/nombre.

Durante esta verificación se encontró y corrigió un bug real: el nombre en la pantalla de
Campeón estaba siempre pintado con el color del manager 2 (naranja), sin importar quién
había ganado.

## Pendiente / lo que puede no estar perfecto

- El modo «Primero a 100» se verificó armando el estado casi terminado directamente con el
  motor (`torneo.js`) en vez de jugar 10-19 partidos reales por la UI uno por uno; el
  camino completo (subasta → previa → partido → resultado → siguiente) sí se jugó de
  punta a punta varias veces, y la máquina de estados del torneo tiene su propia batería de
  tests (fin por los dos modos, desempate 50-50, nominación alternada).
- Nombres de carta que llegan justo a los 12 caracteres (p. ej. «Hugo Sánchez», «Van der
  Sar») pueden recortarse con «…» en el tamaño mini si la fuente no entra: es el
  comportamiento propio de `cartas.css` sin modificar (`text-overflow: ellipsis`), no algo
  que se ajustó a mano.
- No hay sonido ni animación del partido en una cancha (fuera de alcance, sección 12).

## Revisión de datos (después de la primera versión)

La primera versión de `js/jugadores.js` pasaba los tests pero tenía estadísticas secundarias
infladas: los arquetipos restaban muy poco al OVR, así que los defensores promediaban TIR 80 y
PAS 89 (Maldini con TIR 89 y FÍS 99), 58 jugadores tenían FÍS ≥ 95 y 124 de los 200 compartían
una carta idéntica con otro (Cafu = Facchetti = Lahm = Carlos Alberto = Nílton Santos).
Correcciones en `tools/generar-jugadores.js`:

- Arquetipos retocados con perfiles realistas: defensores con TIR ~55 y PAS ~70, delanteros con
  DEF ~40 y FÍS ~78, volantes creativos que no marcan, arqueros con VEL baja.
- Variación propia por jugador (−4..+4 por estadística, determinística por id): ya no hay dos
  cartas iguales. La estadística principal se sigue resolviendo para quedar a ±2 del OVR.
- Arquetipo nuevo `pivote` (Busquets, Rodri, Redondo: pase y marca); Kaká pasa a `enganche`.
- En celular, el lote o el mercado van primero y los paneles de los managers abajo, lado a
  lado y compactos (antes había que bajar por los dos paneles para poder pujar). El aviso de
  adjudicación ya no bloquea los botones que tiene debajo, y los nombres largos usan letra
  más chica para no cortarse.
- En la carta, el nombre tenía la parte de arriba recortada y no se veían los tildes de las
  mayúsculas (PELE, KAKA): se corrigió en `css/cartas.css` y `referencia/cartas.css`.

## Cambio de reglas: arquero único y alargue con gol de oro

Pedido después de probar la primera versión: que el partido lo defina la destreza de los jugadores,
no el arquero ni los penales.

- **Arquero estándar para los dos equipos** (nivel 90, `CONFIG_SIM.arqueroEstandar`). Los arqueros no
  salen al mercado (siguen en `js/jugadores.js` pero `generarMercado` los excluye): se compran 4
  jugadores de campo y los 4 juegan. La previa lo aclara y las métricas muestran ATQ, CRE y DEF.
- **Empate en los 90': alargue de 30' con gol de oro** (una jugada cada 3', del 91' al 118'). El primer
  gol termina el partido. **Si nadie convierte, penales** contra el mismo arquero. En la calibración,
  ~21 % de los partidos van al alargue y solo ~2,3 % llegan a penales.
- **20 jugadores de campo sumados** (ids 201–220) para que la subasta siga teniendo 200: Klose, Tevez,
  Bale, Van Nistelrooy, Villa, Pedernera, Lineker, Šuker, Cavani, Careca, Seedorf, Keane, Deyna,
  Xabi Alonso, Rui Costa, Giggs, Varane, Bergomi, Vogts y Ashley Cole. La base queda en 220
  (200 de campo + 20 arqueros).
- `window.confirm` se reemplazó por una confirmación de dos toques dentro de la página (en algunos
  visores embebidos el diálogo no aparece y el botón quedaba muerto).

## Cambio de reglas: subasta al azar, reparto parejo y reiniciar

- **Ya no se elige a quién subastar.** Después de los nombres arranca solo: los jugadores salen al azar de un mazo
  (`mercado.generarMazo`: los 24 del mercado en orden al azar y después el resto). Cada lote arranca en $1 sin dueño;
  se puede pujar o pasar, y si pasan los dos el jugador se descarta.
- **Reparto parejo** (`js/reparto.js`): cuando uno completa sus 4, al otro se le completan los lugares libres al azar
  buscando la misma fuerza (ATQ + CRE + DEF) que el equipo del rival. En la calibración, el equipo repartido le gana
  al comprado el 49,4 % de las veces.
- **«↺ Reiniciar»** siempre visible una vez que arranca el torneo: con dos toques borra todo y vuelve al inicio.

## Torneo de 2 a 6 jugadores, cantidad de partidos y pases

- **De 2 a 6 jugadores.** En el inicio se agregan o quitan jugadores; cada uno tiene su color. La subasta es entre todos
  (el turno rota) y después se juega **todos contra todos** con los equipos armados (con 2, un partido con relato).
  Tabla con puntos, PJ, PG, GF, GC y DG; si arriba quedan empatados, fecha de desempate solo entre ellos.
- **Cantidad de partidos** (fechas, de 1 a 30) o «Primero a 100», a elección al empezar.
- **Pases:** pasar cuando nadie pujó gasta un pase; hay 2 por fecha y se recargan en la siguiente. Sin pases, si nadie
  pujó, hay que pujar. Pasar cuando ya hay alguien ganando (no subir) es libre.
- **Reparto parejo:** cuando queda uno solo sin completar, se le completa al azar con la fuerza promedio de los demás.
- El guardado pasó a `subasta-cracks:v3` (los torneos guardados con el formato anterior se ignoran).

