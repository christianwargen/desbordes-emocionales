# Brief de sesión — «Subasta de Cracks»

> **Para el humano.** Abrí una sesión nueva de Claude Code sobre este repo, en la rama
> `claude/football-auction-game-bp4zil`, elegí el modelo que quieras usar para ejecutar y pegá esto como primer mensaje:
>
> ```
> Sos el desarrollador a cargo de "Subasta de Cracks". La especificación completa está en
> subasta-futbol/SESION.md (leela entera antes de tocar código) y la base de 200 jugadores
> en subasta-futbol/data/jugadores-base.csv. Trabajá en la rama claude/football-auction-game-bp4zil,
> seguí las fases en orden, hacé un commit al cerrar cada fase y pusheá al final. No abras PR.
> Cuando termines, pasame el reporte final que pide la sección 11.
> ```

---

## 0. Tu rol y cómo trabajar

Vas a construir, de punta a punta, un juego web para **2 personas en la misma pantalla** (hot-seat):
cada una arma un equipo de **4 futbolistas históricos** comprándolos en **subasta** con **$20**
(cada subasta arranca en **$1** y se sube de a **$0,50**). Los futbolistas se muestran como **cartas estilo Ultimate Team**
(valoración, posición, bandera y 6 estadísticas). Después los equipos juegan un **partido simulado** según esas estadísticas
en el mejor momento de cada uno, y el ganador suma **10 puntos**. Se repite (subasta nueva + partido) hasta que alguien llega a **100 puntos**.

Reglas de trabajo:

1. **Este documento es la fuente de verdad.** Las reglas de la sección 2 no se reinterpretan.
   Si algo no está especificado, elegí lo más simple, seguí adelante y anotalo en `subasta-futbol/README.md`
   bajo «Decisiones tomadas». No frenes para preguntar por detalles menores.
2. **Seguí las fases de la sección 9 en orden.** Cada fase termina con sus tests en verde y un commit.
3. **Motor primero, UI después.** Toda la lógica (subasta, mercado, simulación, torneo) son funciones puras
   testeadas en Node antes de escribir una línea de interfaz.
4. **No toques nada fuera de `subasta-futbol/`**, salvo agregar una línea en el `README.md` raíz que apunte al juego.
   El `index.html` raíz es otro proyecto (manual de Mercado Casa): no se modifica.
5. **Nunca digas que algo funciona sin haberlo corrido.** Si un test falla o un objetivo de calibración no se cumple, decilo.

---

## 1. Stack y restricciones técnicas

- **HTML + CSS + JavaScript vanilla.** Sin frameworks, sin bundler, sin paso de build, sin dependencias de runtime.
- Tiene que funcionar **abriendo `subasta-futbol/index.html` con doble clic** (`file://`) y también servido
  estático (el repo se publica en Vercel zero-config, así que va a quedar en `/subasta-futbol/`).
  - Por eso: **nada de ES modules ni `fetch()` de archivos locales** (Chrome los bloquea en `file://`).
    Usá `<script>` clásicos en orden, con el patrón UMD de la sección 7 para que los mismos archivos
    se puedan `require()`-ar desde Node en los tests.
  - Los datos de jugadores van embebidos en `js/jugadores.js` (no se lee el CSV en runtime).
- Tests con el runner nativo de Node (`node:test` + `node:assert/strict`). Node 22 está disponible.
  Se corren con `node --test subasta-futbol/tests/*.test.js`.
- Mobile-first y usable en notebook. Sin scroll horizontal a 360 px de ancho.
- **Sin fotos, escudos, logos ni marcas reales.** Las cartas usan silueta genérica, bandera en emoji y un escudo genérico
  con la sigla del club. En la UI no aparecen las palabras FIFA, EA, FUT, Ultimate Team ni ICON: el estilo es «inspirado en».
- **La plata se maneja en centavos** (enteros) en todo el motor, para no tener errores de coma flotante:
  $20 = `2000`, $1 = `100`, $0,50 = `50`. Solo la UI la formatea (sección 2.2).
- Idioma de la UI: **español rioplatense** («Pujá», «Pasá», «Te toca»). Identificadores del código en español sin tildes
  (`presupuesto`, `pujaMaxima`, `simularPartido`).

---

## 2. Reglas del juego (canon)

### 2.1 Torneo

- **De 2 a 6 managers** (así se llama en el código a cada persona que juega, para no confundir con «jugador» = futbolista).
  Nombres editables al empezar («+ Agregar jugador» / «✕»); un color fijo por manager, en orden:
  celeste `#38BDF8`, naranja `#FB923C`, verde `#4ADE80`, violeta `#C084FC`, amarillo `#FACC15`, rosa `#F472B6`.
- El torneo es una sucesión de **fechas**. Cada fecha = **mazo nuevo → subasta entre todos → partidos → puntos**.
  Con 2 managers se juega un partido; con más, **todos contra todos** (con 6, 15 partidos por fecha).
- Cada victoria da **10 puntos**. No hay empates: si un partido termina igualado en los 90', alargue de 30' con gol de oro
  y, si nadie convierte, penales (ver 5.3). La tabla lleva puntos, PJ, PG, GF, GC y DG.
- **Duración** (se elige al empezar):
  - **«Cantidad de partidos»** (por defecto): se elige cuántas fechas se juegan (1 a 30, por defecto 10); gana el de más puntos.
  - **«Primero a 100»**: termina en la fecha en que alguien llega a 100 puntos; si varios la pasan, gana el de más puntos.
  - En los dos modos, si arriba quedan empatados en puntos, se juega una **fecha de desempate solo entre los empatados**
    (y otra, si siguen empatados).
- **Quién abre el primer lote** de cada fecha: en la fecha 1 se sortea; después, el último de la tabla (si hay empate abajo, sorteo).

### 2.2 Presupuesto y plantel (se reinicia en cada partido)

- Al empezar cada partido, cada manager tiene **$20** y un plantel vacío de **4 lugares**.
  La plata que sobra de un partido **no** se acumula para el siguiente.
- **Cada subasta arranca en $1 y se sube de a $0,50**: $1 → $1,50 → $2 → $2,50 → … Todo monto es múltiplo de $0,50.
  Constantes (en centavos): `PRESUPUESTO = 2000`, `PRECIO_INICIAL = 100`, `INCREMENTO = 50`.
- Formato en pantalla (es-AR): sin decimales si es entero y con coma si no: `$1`, `$1,50`, `$12`, `$12,50`.
  Una sola función `formatearPlata(centavos)` en `js/config.js`, con test.
- **Regla de puja máxima** (clave para que nadie quede sin poder completar el equipo; cada lugar vacío necesita al menos $1):

  ```
  lugaresLibres(m) = 4 - m.plantel.length
  pujaMaxima(m)    = lugaresLibres(m) > 0 ? m.presupuesto - (lugaresLibres(m) - 1) * PRECIO_INICIAL : 0
  ```

  Ejemplos: con $9 y 3 lugares libres, la puja máxima es $7. Con $8,50 y 2 lugares libres, $7,50.
- **Se compran solo jugadores de campo.** El arquero es el mismo para los dos equipos (un arquero estándar de nivel 90):
  nadie gana ni pierde por el arquero, el partido lo define la destreza de los 4 comprados. No hay posiciones obligatorias.

### 2.3 Mercado del partido

Cada partido genera un **mercado** de **24 futbolistas** sacados de los 200 jugadores de campo (los 20 arqueros de la base no salen), sin repetir dentro del mercado:

| Categoría | OVR     | Cantidad en el mercado |
|-----------|---------|------------------------|
| Leyenda   | 95–99   | 3                      |
| Crack     | 92–94   | 4                      |
| Estrella  | 89–91   | 10                     |
| Figura    | ≤ 88    | 7                      |

- Restricciones de posición: **sin arqueros** (no salen al mercado) y **al menos 4 DEF, 4 MED y 4 DEL**. Si el sorteo no las cumple, reemplazá
  al azar un jugador de una posición sobrante por uno de la posición faltante **de la misma categoría**
  (si en esa categoría no hay disponibles, de cualquier categoría) hasta cumplirlas.
- Composición y restricciones van en el objeto de configuración (`MERCADO = { tamano, porCategoria, minPorPosicion }`).
- El mercado usa el RNG con semilla del partido (sección 7): mismo seed → mismo mercado.
- Entre partidos no se excluye a nadie: Messi puede volver a salir en el partido siguiente.

### 2.4 Subasta al azar, sin pases, y reparto parejo

Nadie elige a quién subastar: después de poner los nombres, el juego arranca solo.

1. **Sale un jugador al azar** del **mazo** de la fecha (los 24 del mercado de 2.3 en orden al azar y, detrás, el resto
   de los 200 mezclados). Aparece con la revelación de la carta.
2. **No se puede pasar.** El lote arranca en $1 y el que lo abre (se alterna lote a lote entre los que tienen lugar)
   **tiene que pujar** ($1, $1,50, $2 o «Todo»). Todo jugador que sale se vende.
3. **Después el turno va rotando** entre los demás con lugar: cada uno sube (+$0,50, +$1, +$2, «Todo») o dice
   **«No subo»** y queda afuera de ese jugador. Gana el último que queda; si al que le toca no le alcanza para superar,
   queda afuera solo.
4. **Reparto parejo.** Cuando **queda uno solo** con lugares libres, se le completan **al azar con un equipo parejo** a los
   demás (misma fuerza ATQ + CRE + DEF que el promedio de los equipos completos, ±2; `js/reparto.js`). Cuestan $1 cada
   uno y aparecen todos juntos. Con 2 managers, es «cuando uno completa sus 4, al otro se le completa el equipo».
5. Con todos completos → «Ir al partido ⚽» (2 managers) o «Ir a la fecha ⚽».

Casos borde que el motor cubre (y testea): pujas fuera de turno, por debajo del mínimo, que no son múltiplo de $0,50 o
por encima de la puja máxima; «No subo» sin que nadie haya pujado; invariante `presupuesto ≥ lugaresLibres × $1`.
**Deshacer** revierte la última puja o el último «No subo» del lote en curso.

**Reiniciar:** desde que arranca el torneo hay un botón «↺ Reiniciar» siempre visible (junto a «Historial») que, con
dos toques, borra todo y vuelve a la pantalla de nombres.

### 2.5 Partido simulado

- Al terminar la subasta se muestra la **previa**: las dos formaciones, quién ataja, las métricas de equipo
  (ATQ / CRE / DEF / ARQ, ver 5.1) y una **probabilidad estimada** de victoria (2000 simulaciones rápidas con un RNG aparte).
- Al tocar «Jugar partido» se simula (sección 5) y se muestra un relato corto: reloj del 0' al 90' en ~6 segundos
  con los eventos apareciendo, botón «Saltar al resultado»; si hace falta, el alargue con gol de oro y la tanda de penales (✅/❌ uno por uno).
- El resultado es **determinístico dado el seed del partido**: recargar la página no cambia un partido ya jugado.

---

## 3. Datos de jugadores

### 3.1 Fuente

`subasta-futbol/data/jugadores-base.csv` (ya está en el repo, curado a mano) trae 220 filas (200 de campo + 20 arqueros; ids 201–220 se sumaron cuando los arqueros salieron del mercado) con:
`id, nombre, pais, posicion (POR|DEF|MED|DEL), pico (año de su mejor momento), club (club en ese pico), ovr (85–99)`.

**No cambies nombres, posiciones ni OVR.** Si detectás un error factual claro (por ejemplo, un club mal asignado al año),
corregilo en el CSV y listalo en el reporte final.

### 3.2 Qué tenés que generar: `js/jugadores.js`

Cada futbolista es una **carta estilo Ultimate Team**: además de los campos del CSV, tiene las **6 estadísticas de carta**,
una posición detallada, un nombre corto para la carta y la sigla del club. De esas 6 estadísticas se **derivan** los 4
atributos que usa la simulación, así lo que se ve en la carta es exactamente lo que juega.

```js
{ id: 130, nombre: "Lionel Messi", nombreCarta: "Messi", pais: "Argentina", bandera: "🇦🇷",
  posicion: "DEL", posDetalle: "DC", pico: 2012, club: "Barcelona", siglaClub: "BAR",
  ovr: 99, categoria: "Leyenda",
  carta: { rit: 94, tir: 99, pas: 92, reg: 99, def: 38, fis: 68 },   // lo que muestra la carta
  ata: 98, cre: 95, def: 46, arq: 10 }                              // derivado (fórmulas abajo)
```

**Estadísticas de carta** (enteros 20–99, en su mejor momento):
- Jugadores de campo: `rit` RIT (ritmo), `tir` TIR (tiro), `pas` PAS (pase), `reg` REG (regate), `def` DEF (defensa), `fis` FÍS (físico).
- Arqueros: `est` EST (estirada), `par` PAR (paradas), `saq` SAQ (saque), `ref` REF (reflejos), `vel` VEL (velocidad), `col` COL (colocación).

**Atributos de simulación, derivados** (redondeo a entero; nunca se escriben a mano):

```
Jugador de campo:
  ata = 0.50·TIR + 0.30·REG + 0.20·RIT
  cre = 0.60·PAS + 0.40·REG
  def = 0.75·DEF + 0.25·FÍS
  arq = 10
Arquero:
  arq = (EST + PAR + REF + COL) / 4
  ata = 0.35·SAQ          (solo importa en penales o si ataja otro y él juega de campo)
  cre = 0.60·SAQ
  def = 0.50·COL
```

**Posición detallada** (`posDetalle`, abreviaturas en castellano, compatible con la posición del CSV):
POR → `POR` · DEF → `DFC`, `LD`, `LI` · MED → `MCD`, `MC`, `MCO`, `MD`, `MI` · DEL → `DC`, `SD`, `ED`, `EI`.
La que ocupaba en su mejor momento (Cafu `LD`, Roberto Carlos `LI`, Pirlo `MC`, Makélélé `MCD`, Maradona `MCO`, Garrincha `ED`).

**`nombreCarta`**: como se lo conoce, corto (≤ 12 caracteres) y **único** entre los 200: «Messi», «Maradona», «Pelé»,
«Ronaldo» (Nazário), «C. Ronaldo», «Suárez» (Luis) y «L. Suárez M.» (Miramontes), «Dibu». **`siglaClub`**: 3 letras
(RMA, BAR, MUN, MCI, BAY, PSG, JUV, MIL, INT, RIV, BOC, LIV, CHE, ARS, ATM…), definidas en un mapa `club → sigla`.

Reglas duras (un test las verifica para los 200):
1. **Coherencia con el OVR:** el atributo principal derivado queda a **±2** del OVR del CSV:
   POR → `arq`; DEF → `def`; MED → `max(cre, def)`; DEL → `ata`.
2. Todas las estadísticas de carta entre 20 y 99; `posDetalle` compatible; `nombreCarta` único y ≤ 12 caracteres.
3. `categoria` se deriva del OVR con la tabla de 2.3.

Anclas (ya usadas en la maqueta de referencia, respetalas):

| Jugador | Carta |
|---------|-------|
| Messi (DEL 99, DC) | RIT 94 · TIR 99 · PAS 92 · REG 99 · DEF 38 · FÍS 68 |
| Baresi (DEF 94, DFC) | RIT 80 · TIR 55 · PAS 82 · REG 80 · DEF 96 · FÍS 88 |
| Riquelme (MED 89, MCO) | RIT 66 · TIR 84 · PAS 90 · REG 88 · DEF 42 · FÍS 75 |
| Caniggia (DEL 87, DC) | RIT 97 · TIR 84 · PAS 72 · REG 88 · DEF 35 · FÍS 70 |
| Yashin (POR 95) | EST 96 · PAR 93 · SAQ 80 · REF 97 · VEL 68 · COL 94 |

El resto lo asignás vos según el perfil real de cada uno. Que se sientan distintos: Caniggia vuela (RIT alto),
Pirlo no es Makélélé, Gerd Müller (TIR altísimo, REG medio) no es Cruyff, Roberto Carlos tiene TIR y RIT de delantero,
Neuer y Alisson tienen SAQ alto, Chilavert el SAQ más alto de los arqueros.

Banderas: emoji del país. Casos especiales: Inglaterra `🏴󠁧󠁢󠁥󠁮󠁧󠁿`, Escocia `🏴󠁧󠁢󠁳󠁣󠁴󠁿`, Irlanda del Norte `🇬🇧`.

Generá `jugadores.js` con un script (`tools/generar-jugadores.js`) que lea el CSV y un mapa
`id → { posDetalle, nombreCarta, carta: {…} }` escrito por vos, calcule los atributos derivados, y **valide las reglas
antes de escribir el archivo** (si alguno no cumple, que liste cuáles y por cuánto, y corregís el mapa). Commiteá el script y el resultado.

---

## 4. Motor de subasta (funciones puras)

`js/subasta.js` expone funciones que reciben un estado y devuelven un estado **nuevo** (sin mutar el original),
o tiran un error con mensaje claro si la acción es ilegal. Forma sugerida:

```js
crearPartido({ numero, managers, nominaPrimero, seed, mercado })  // presupuestos en 2000 centavos, planteles vacíos
lugaresLibres(partido, m) · pujaMaxima(partido, m)                  // en centavos
nominar(partido, m, jugadorId)                // abre el lote en PRECIO_INICIAL (100) con m como líder
pujar(partido, m, montoCentavos)              // múltiplo de 50, > precio actual, ≤ pujaMaxima
pasar(partido, m)
ficharDirecto(partido, m, jugadorId)          // solo en modo compra directa, precio 100
deshacer(partido)                              // P2
estadoSubasta(partido) -> 'nominando' | 'pujando' | 'compraDirecta' | 'terminada'
```

El lote en curso guarda: `jugadorId`, `nominador`, `precio`, `lider`, `turno` y el historial de pujas
(`[{manager, monto}]`) para mostrarlo en la UI («Ana $1 → Juan $1,50 → Ana $2,50 → Juan $3»).
Cada lote cerrado se registra en `partido.lotes` (`{jugadorId, ganador, precio, pujas}`).

---

## 5. Motor de simulación

Todo en `js/simulacion.js`, con las constantes en un único objeto `CONFIG_SIM` (valores iniciales abajo,
ya probados en un prototipo). Toda la aleatoriedad sale del `rng` que se pasa por parámetro.

### 5.1 Alineación y métricas de equipo

Los atributos `ata`, `cre`, `def` y `arq` son los **derivados de la carta** (sección 3.2).

- **Arquero estándar:** los dos equipos atacan contra el mismo arquero, `ARQ = CONFIG_SIM.arqueroEstandar` (90).
  Los 4 comprados son **jugadores de campo**.
- Sobre los 4 de campo:

  ```
  ATQ = 0.5 · max(ata) + 0.5 · promedio(ata)
  CRE = 0.5 · max(cre) + 0.5 · promedio(cre)
  DEF = 0.3 · max(def) + 0.7 · promedio(def)      // la defensa es más colectiva
  ARQ = arqueroEstandar                            // igual para los dos
  ```

### 5.2 Los 90 minutos

```
CONFIG_SIM = {
  jugadas: 18,
  expPosesion: 3,  posesionMin: 0.30, posesionMax: 0.70,
  baseRemate: 0.42, pendienteRemate: 90, remateMin: 0.12, remateMax: 0.85,
  baseGol: 0.36,    pendienteGol: 110,   golMin: 0.08,    golMax: 0.80,
  penalBase: 0.75,  penalPendiente: 200, penalMin: 0.55,  penalMax: 0.92,
}

posesionA = clamp(CRE_A^exp / (CRE_A^exp + CRE_B^exp), posesionMin, posesionMax)

Se sortean `jugadas` minutos uniformes en 1..90 y se ordenan. Para cada jugada:
  atacante = rng() < posesionA ? A : B ; defensor = el otro
  pRemate = clamp(baseRemate + (ATQ_atacante − DEF_defensor) / pendienteRemate, remateMin, remateMax)
  si rng() < pRemate:                                   → hay remate
    pGol = clamp(baseGol + (ATQ_atacante − ARQ_defensor) / pendienteGol, golMin, golMax)
    si rng() < pGol → GOL.
        Autor: entre los 3 de campo, ponderado por ata².
        Asistencia (opcional, 70 % de los goles): otro de campo, ponderado por cre.
    si no → ATAJADA del arquero (registrala como evento).
```

### 5.3 Alargue con gol de oro y penales (si hay empate en los 90')

- **Alargue de 30' con gol de oro:** una jugada cada 3 minutos desde el 91' (10 jugadas), con las mismas reglas.
  El primer gol termina el partido.
- Si nadie convierte en el alargue, **penales** contra el arquero estándar: patean los 4 en orden de `ata` descendente, cíclico.
  `p = clamp(penalBase + (pateador.ata − arqueroEstandar) / penalPendiente, penalMin, penalMax)`.
  5 por lado alternados, cortando antes si ya está definido; si siguen iguales, muerte súbita.
- Siempre hay ganador. Llegan a penales muy pocos partidos (objetivo ≤ 6 %, ver 5.5).

### 5.4 Salida de `simularPartido(equipoA, equipoB, rng)`

```js
{
  goles: [2, 1],
  eventos: [ { minuto: 23, tipo: "gol", equipo: 0, autor: 130, asistencia: 67 },
             { minuto: 51, tipo: "atajada", equipo: 1, pateador: 129 },
             { minuto: 97, tipo: "gol", equipo: 1, autor: 67, alargue: true }, ... ],
  alargue: null | { golDeOro: 97 | null },
  penales: null | { tiros: [{ equipo, pateador, convertido }], resultado: [4, 3] },
  estadisticas: { posesion: [58, 42], remates: [7, 4] },
  metricas: [ {ATQ, CRE, DEF, ARQ}, {…} ],
  ganador: 0,
  figura: 130
}
```

**Figura del partido:** el de más goles (desempate: más asistencias, después el equipo ganador, después mayor OVR).

También: `probabilidadVictoria(equipoA, equipoB, n = 2000, seed)` → `[pA, pB]` para la previa.

Relato: un par de frases por tipo de evento, variadas y en rioplatense («¡GOOOL de Messi! La colgó del ángulo», «El arquero vuela y se la saca a Pelé»).
Nada de relatos largos.

### 5.5 Calibración (obligatoria)

`tools/calibrar.js` corre estos escenarios con 20.000 partidos cada uno (seed fija) e imprime una tabla
«escenario · resultado · objetivo · OK/FALLA». Si algo falla, ajustá `CONFIG_SIM` (no las fórmulas) hasta que pase,
y pegá la salida final en el README.

| Escenario | Objetivo |
|-----------|----------|
| Dos equipos idénticos | gana A entre 48 % y 52 % |
| Drafts aleatorios (4 de campo de todo el pool) | 2,8–4,2 goles por partido; 12 %–28 % van al alargue; ≤ 6 % llegan a penales |
| Diferencia de OVR promedio ≈ 3 (DEF+MED+DEL+DEL, promedio de 10 cruces) | gana el mejor 57 %–67 % |
| Diferencia ≈ 6 | 68 %–80 % |
| Diferencia ≈ 10 | 82 %–92 % |
| Beckenbauer + Maradona + Messi + Pelé vs Ruggeri + Ayala + Bochini + Caniggia | 88 %–96 % |
| Equilibrado (Nesta, Puyol, Gerrard, Raúl) vs todo ataque (Totti, Del Piero, Tostão, Bergkamp) | equilibrado 50 %–66 % |

La idea de diseño: la calidad pesa, pero el azar tiene que dar sorpresas; y ni «4 cracks de ataque» ni «equipo equilibrado» tienen que ser una estrategia dominante.

---

## 6. Interfaz

### 6.1 Pantallas

1. **Inicio**
   - Título «Subasta de Cracks», bajada corta. Inputs de nombres. Selector de modo («Primero a 100» / «10 partidos»).
   - «¿Cómo se juega?» desplegable con las reglas en 6–8 líneas.
   - Si hay un torneo guardado: «Continuar torneo (Partido 4 · Ana 30 – Juan 20)» + «Nuevo torneo» (con confirmación).
2. **Subasta** (la pantalla principal, donde pasa casi todo el juego)
   - Encabezado: «Partido N», marcador del torneo y barra de progreso de cada uno hacia 100 (o partidos jugados / 10).
   - Un **panel por manager** (izquierda/derecha en desktop, arriba/abajo en mobile) con: nombre en su color,
     presupuesto grande, «Puja máx. $X», los 4 lugares del plantel (mini-cartas, vacíos punteados)
     y sus métricas ATQ/CRE/DEF/ARQ en barras que se actualizan con cada compra.
   - **Centro, sin lote:** «Nomina: Ana» + grilla del mercado con **cartas mini** (filtros Todos/POR/DEF/MED/DEL,
     orden por OVR), botón «🎲 Al azar». Al tocar una carta: la carta grande completa y el botón «Sacar a subasta por $1».
   - **Revelación** (P1): al nominar, la carta aparece como en la apertura de un sobre: primero la bandera, después
     la posición, después el club y al final la carta entera con un destello (más espectacular si es Leyenda).
     Dura ≤ 1,5 s, se saltea con un toque y se omite con `prefers-reduced-motion`.
   - **Centro, con lote:** carta grande del futbolista, precio actual enorme, «Va ganando: Ana», «Le toca a: Juan (puja máx. $7)»,
     botones **+$0,50** (principal, el más grande, muestra a cuánto queda: «+$0,50 → $4») / +$1 / +$2 / Todo ($X) / Pasar
     (deshabilitados si no alcanza), y la cadena de pujas. Tal cual la maqueta `referencia/cartas.html` (sección «Lote en subasta»).
     Solo el panel del manager de turno tiene los controles activos y resaltado con su color.
   - Al adjudicar: banner 1,5 s «¡Maradona es de Ana por $12,50!» y la carta vuela/aparece en su plantel.
   - **Compra directa:** banner explicando «Juan ya completó. Ana elige 2 más a $1».
3. **Previa**: dos columnas con las formaciones, métricas enfrentadas (ATQ/CRE/DEF), aviso de que el arquero es el mismo para los dos
   y la barra de probabilidad («Ana 63 % · Juan 37 %»). Botón «Jugar partido».
4. **Partido**: marcador grande, reloj corriendo, eventos apareciendo; alargue con gol de oro y penales si hace falta; «Saltar».
5. **Resultado**: marcador final (+ «gol de oro» o penales), «Ganó Ana (+10)», goles con minuto, posesión y remates, figura del partido,
   tabla del torneo y botón «Siguiente partido» (o «Ver campeón»).
6. **Campeón**: trofeo, puntos finales y un resumen del torneo: partidos jugados, victorias de cada uno,
   goleador del torneo (sumando todos los partidos), fichaje más caro, «ganga» (más goles por dólar gastado).
   Botón «Nuevo torneo».
- **Historial** accesible desde cualquier pantalla (drawer o modal): lista de partidos con resultado y los 4 de cada uno con precio.

### 6.2 Carta de jugador (estilo Ultimate Team)

**La referencia visual ya existe y es obligatoria:** `subasta-futbol/referencia/cartas.html` + `referencia/cartas.css`.
Abrila en el navegador antes de empezar la UI. Copiá `cartas.css` a `css/cartas.css` y generá las cartas con **la misma
estructura HTML** (una función `renderCarta(jugador, { tamano: 'grande' | 'mini' })` en `app.js`). Podés ajustar detalles,
no rediseñarla.

- Forma de escudo con borde metálico; todo se mide en `cqw`, así que la misma carta escala cambiando `--w`.
- Arriba a la izquierda, en columna: **OVR** grande, **posición detallada** (`posDetalle`), bandera, escudo genérico con `siglaClub`.
- Silueta genérica a la derecha (la misma para todos; no hay fotos).
- **Nombre** (`nombreCarta`) en mayúsculas con una línea debajo.
- **6 estadísticas** en dos columnas, número en negrita + abreviatura:
  campo `RIT TIR PAS | REG DEF FÍS`; arqueros `EST PAR SAQ | REF VEL COL`.
- Pie chico: «2012 · BARCELONA» (año pico y club).
- Categorías (clases `carta--leyenda`, `--crack`, `--estrella`, `--figura`):
  **Leyenda** marfil y oro con brillo animado · **Crack** azul noche con detalles dorados ·
  **Estrella** oro brillante con trama · **Figura** oro liso.
- **Mini** (`carta--mini`, ~88 px): solo OVR, posición, silueta y nombre. Para el mercado y los planteles.
  Lugar vacío del plantel: `.carta-vacia` punteada.
- Accesibilidad: cada carta lleva `aria-label` «Lionel Messi, 99, DC»; la silueta es decorativa (`aria-hidden`).

### 6.3 Estilo

- Tema oscuro «estadio de noche»: fondo verde muy oscuro/azulado, textos claros, acentos en los colores de cada manager.
  Tokens de color en `:root` (CSS custom properties).
- Tipografía: una condensada para números y títulos (p. ej. «Barlow Condensed» de Google Fonts, con fallback de sistema
  para que ande offline) y sistema para el resto.
- Targets táctiles ≥ 44 px. Foco visible. Animaciones cortas y `prefers-reduced-motion` respetado.
- Atajos de teclado (P2): manager 1 → `Q` +$0,50, `W` +$1, `E` +$2, `A` pasar; manager 2 → `P` +$0,50, `O` +$1, `I` +$2, `L` pasar.
  Solo responden las teclas del manager de turno.

---

## 7. Arquitectura y archivos

```
subasta-futbol/
  index.html              UI (una sola página, pantallas como secciones que se muestran/ocultan)
  css/estilos.css
  css/cartas.css          copiado de referencia/cartas.css
  js/config.js            constantes del juego (plata en centavos, tamaño de plantel, puntos, mercado, colores) + formatearPlata
  js/rng.js               RNG con semilla (mulberry32) + helpers: entero, elegir, mezclar, ponderado
  js/jugadores.js         los 200 con carta + atributos derivados (generado)
  js/mercado.js           generarMercado(seed)
  js/subasta.js           máquina de estados de la subasta (sección 4)
  js/simulacion.js        simularPartido, probabilidadVictoria, metricasEquipo (sección 5)
  js/torneo.js            estado del torneo, puntos, fin por modo, quién nomina, persistencia
  js/app.js               render + eventos (lo único que toca el DOM)
  data/jugadores-base.csv
  referencia/cartas.html  maqueta visual de las cartas y del lote (ya existe; no se modifica)
  referencia/cartas.css
  tools/generar-jugadores.js
  tools/calibrar.js
  tests/*.test.js
  README.md               cómo jugar, cómo correr tests/calibración, decisiones tomadas, salida de calibración
  SESION.md               este documento
```

Patrón UMD para que cada archivo funcione en el navegador (vía `window.SC`) y en Node (vía `require`):

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./config.js'));
  } else {
    root.SC = root.SC || {};
    root.SC.simulacion = factory(root.SC.rng, root.SC.config);
  }
})(typeof self !== 'undefined' ? self : this, function (rng, config) {
  // ...
  return { simularPartido, probabilidadVictoria, metricasEquipo };
});
```

Estado y persistencia:
- Un único objeto `torneo` serializable (sin funciones ni referencias circulares): configuración, managers, puntos,
  partido actual (mercado, planteles, presupuestos, lote en curso), historial de partidos jugados y seed base.
- Seeds: `seedPartido = hash(seedTorneo, numeroPartido)`. El mercado y el partido usan seeds derivadas distintas.
- Guardar en `localStorage` (clave `subasta-cracks:v1`) después de cada acción; leer al iniciar.
  Todo acceso a `localStorage` dentro de `try/catch`; si el JSON está roto o es de otra versión, se ignora.
- El modelo usa **arrays de managers** (no `j1`/`j2` hardcodeados) donde no cueste nada, para poder sumar más de 2 personas
  en el futuro; la UI y la simulación son 1 vs 1 por ahora.

---

## 8. Tests y verificación

### 8.1 Tests automáticos (`node --test subasta-futbol/tests/*.test.js`)

- **jugadores:** 220 exactos (200 de campo + 20 arqueros); ids, nombres y `nombreCarta` únicos; reglas duras de 3.2 (principal derivado a ±2 del OVR,
  estadísticas 20–99, `posDetalle` compatible); los atributos derivados coinciden con las fórmulas; las 5 anclas de 3.2 tal cual;
  categorías con la tabla de 2.3 (18 Leyendas, 24 Cracks, 101 Estrellas, 77 Figuras); 20 POR.
- **plata:** `formatearPlata(100) = "$1"`, `(150) = "$1,50"`, `(1250) = "$12,50"`, `(2000) = "$20"`.
- **mercado:** 24 sin repetidos; composición por categoría; mínimos por posición; mismo seed → mismo mercado; seeds distintas → mercados distintos.
- **subasta:**
  - `pujaMaxima` en los casos de la sección 2.2;
  - nominar abre en $1 con el nominador como líder; subir de a $0,50 funciona (1 → 1,50 → 2);
  - nominar/pujar/pasar felices y todos los ilegales (fuera de turno, monto ≤ actual, sobre el máximo,
    monto que no es múltiplo de 50, jugador no disponible);
  - cierre automático cuando al rival no le alcanza o tiene el plantel lleno;
  - alternancia de nominación y compra directa;
  - **propiedad:** 2000 subastas con acciones legales al azar (mezclando +$0,50, +$1, +$2, Todo y Pasar) terminan siempre con 4 y 4,
    presupuestos ≥ 0 y múltiplos de 50, el invariante `presupuesto ≥ lugaresLibres × 100` se cumple después de cada acción,
    y cada manager pagó exactamente `2000 − presupuestoFinal`.
- **simulacion:** determinismo con seed; `goles` coincide con los eventos de gol; con empate en 90' hay alargue con gol de oro
  (termina con el primer gol) y, si nadie convierte, penales con ganador; el arquero es el mismo para los dos; < 8 % de penales.
- **torneo:** +10 al ganador; fin «Primero a 100»; fin «10 partidos» con desempate en 50–50; nomina primero el perdedor;
  serializar → deserializar devuelve el mismo estado.

### 8.2 Calibración

`node subasta-futbol/tools/calibrar.js` con todos los escenarios en OK (sección 5.5).

### 8.3 Prueba en navegador

Chromium está preinstalado en el entorno (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; **no corras `playwright install`**).
Si podés instalar el paquete `playwright` en un directorio temporal fuera del repo (no commitees `node_modules`), escribí un script
que abra `index.html`, juegue un partido completo haciendo clics (nominar, pujar, pasar, jugar, siguiente) y saque capturas
a 390×844 y 1280×800 de: inicio, mercado, subasta con lote activo, previa, resultado. Compará las cartas con las de
`referencia/cartas.html`. Revisá las capturas vos mismo antes de dar la fase por cerrada.
Si no se puede instalar, decilo en el reporte y describí qué verificaste a mano.

---

## 9. Plan por fases (un commit por fase)

1. **Datos.** `tools/generar-jugadores.js` + `js/jugadores.js` (cartas + atributos derivados) + `js/config.js` (con `formatearPlata`)
   + tests de jugadores y plata. → commit «Datos: 200 cartas de jugadores».
2. **Motor.** `rng.js`, `mercado.js`, `subasta.js`, `simulacion.js`, `torneo.js` + sus tests. → commit «Motor: mercado, subasta, simulación y torneo».
3. **Calibración.** `tools/calibrar.js`, ajuste de `CONFIG_SIM`, salida en README. → commit «Calibración del simulador».
4. **UI.** `index.html`, `css/estilos.css`, `css/cartas.css`, `js/app.js`: las 6 pantallas + cartas + historial + persistencia.
   → commit «UI jugable completa».
5. **Verificación y pulido.** Prueba en navegador (8.3), arreglos, responsive, README final, línea en el README raíz.
   → commit «Pulido y verificación» y `git push -u origin claude/football-auction-game-bp4zil`.

Prioridades: todo lo de las secciones 2–7 es **P0** salvo lo marcado **P1** (revelación de la carta al nominar)
y **P2** (deshacer, atajos de teclado). P1 va después de que lo P0 esté completo y verificado; P2, al final.

---

## 10. Criterios de aceptación

- [ ] Se abre con doble clic en `index.html` y funciona sin conexión (salvo la fuente web, que tiene fallback).
- [ ] Se puede jugar un torneo entero de principio a fin en «Primero a 100» y en «10 partidos».
- [ ] Nadie puede quedar sin poder completar su equipo de 4; nadie gasta más de $20 por partido.
- [ ] Todo lote termina en compra; cada subasta arranca en $1 y sube de a $0,50; la compra directa a $1 funciona cuando un manager ya completó.
- [ ] Las cartas se ven como en `referencia/cartas.html` (grande y mini, las 4 categorías, arqueros con sus 6 estadísticas).
- [ ] Cada partido muestra previa con probabilidad, relato, resultado con goleadores, figura y tabla actualizada.
- [ ] Recargar la página en cualquier momento retoma el torneo exactamente donde estaba.
- [ ] `node --test subasta-futbol/tests/*.test.js` en verde.
- [ ] `node subasta-futbol/tools/calibrar.js` con todos los escenarios OK.
- [ ] Sin scroll horizontal a 360 px; usable con el pulgar en mobile.
- [ ] Nada modificado fuera de `subasta-futbol/` salvo una línea en el `README.md` raíz.

---

## 11. Reporte final (lo que me tenés que devolver)

1. Qué quedó hecho, fase por fase, con los hashes de commit.
2. Salida de los tests (resumen) y la tabla de calibración final con los valores de `CONFIG_SIM`.
3. Capturas de la prueba en navegador (o por qué no se pudieron hacer).
4. «Decisiones tomadas» que no estaban en este brief.
5. Correcciones que hayas hecho al CSV, si hubo.
6. Lo que quedó pendiente o que sabés que no está bien.

## 12. Fuera de alcance

Multijugador online, más de 2 managers en la UI, cuentas/login, sonido, animación del partido en cancha,
estadísticas reales scrapeadas de internet, fotos o escudos reales.
