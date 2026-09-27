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
cada una arma un equipo de **4 futbolistas históricos** comprándolos en **subasta** con **$20**,
después los equipos juegan un **partido simulado** según los atributos de cada jugador en su mejor momento,
y el ganador suma **10 puntos**. Se repite (subasta nueva + partido) hasta que alguien llega a **100 puntos**.

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
- **Sin fotos, escudos ni logos reales.** Avatar = círculo con iniciales + bandera en emoji.
- Idioma de la UI: **español rioplatense** («Pujá», «Pasá», «Te toca»). Identificadores del código en español sin tildes
  (`presupuesto`, `pujaMaxima`, `simularPartido`).

---

## 2. Reglas del juego (canon)

### 2.1 Torneo

- 2 managers (así se llama en el código a cada persona que juega, para no confundir con «jugador» = futbolista).
  Nombres editables al empezar; por defecto «Jugador 1» y «Jugador 2».
  Colores fijos: manager 1 **celeste** (`#38BDF8`), manager 2 **naranja** (`#FB923C`).
- El torneo es una sucesión de **partidos**. Cada partido = **mercado nuevo → subasta → partido simulado → puntos**.
- Ganar un partido da **10 puntos**. No hay empates: si termina igualado en los 90', se define por penales.
- **Modo de torneo** (se elige en la pantalla de inicio):
  - **«Primero a 100»** (por defecto): gana el torneo el primero que llega a 100 puntos (10 victorias).
    Puede llevar entre 10 y 19 partidos.
  - **«10 partidos»**: se juegan exactamente 10; gana quien tenga más puntos. Si quedan 50–50,
    se juega un **partido de desempate** (con su subasta) y quien lo gana es campeón.
  - Ambas variantes existen porque el pedido original menciona las dos cosas. Guardá las constantes
    (`PUNTOS_POR_VICTORIA = 10`, `PUNTOS_OBJETIVO = 100`, `PARTIDOS_FIJOS = 10`) en un único objeto de configuración.
- **Quién nomina primero** en cada partido: en el partido 1 se sortea; desde el partido 2, nomina primero
  **el que perdió el partido anterior**.

### 2.2 Presupuesto y plantel (se reinicia en cada partido)

- Al empezar cada partido, cada manager tiene **$20** y un plantel vacío de **4 lugares**.
  La plata que sobra de un partido **no** se acumula para el siguiente.
- Montos siempre en **dólares enteros**. La puja mínima es **$1**.
- **Regla de puja máxima** (clave para que nadie quede sin poder completar el equipo):

  ```
  lugaresLibres(m) = 4 - m.plantel.length
  pujaMaxima(m)    = lugaresLibres(m) > 0 ? m.presupuesto - (lugaresLibres(m) - 1) * 1 : 0
  ```

  Ejemplo: con $9 y 3 lugares libres, la puja máxima es $7 (hay que guardar $1 para cada uno de los otros 2 lugares).
- No hay posiciones obligatorias. Podés comprar 4 delanteros; la simulación se encarga de castigarlo
  (ver 5.1: alguien va a tener que atajar).

### 2.3 Mercado del partido

Cada partido genera un **mercado** de **24 futbolistas** sacados de los 200, sin repetir dentro del mercado:

| Categoría | OVR     | Cantidad en el mercado |
|-----------|---------|------------------------|
| Leyenda   | 95–99   | 3                      |
| Crack     | 92–94   | 4                      |
| Estrella  | 89–91   | 10                     |
| Figura    | ≤ 88    | 7                      |

- Restricciones de posición: **al menos 3 POR, 4 DEF, 4 MED y 4 DEL**. Si el sorteo no las cumple, reemplazá
  al azar un jugador de una posición sobrante por uno de la posición faltante **de la misma categoría**
  (si en esa categoría no hay disponibles, de cualquier categoría) hasta cumplirlas.
- Composición y restricciones van en el objeto de configuración (`MERCADO = { tamano, porCategoria, minPorPosicion }`).
- El mercado usa el RNG con semilla del partido (sección 7): mismo seed → mismo mercado.
- Entre partidos no se excluye a nadie: Messi puede volver a salir en el partido siguiente.

### 2.4 Subasta: nominación y pujas por turnos

Mecánica de «nominación alternada» (como un draft de subasta), toda visible en la misma pantalla:

1. **Nominar.** El manager al que le toca elige un futbolista del mercado (o toca «🎲 Al azar») y fija
   la **apertura**: entre $1 y su `pujaMaxima` (por defecto $1). Abrir es obligatorio: quien nomina
   queda como primer postor, así que **todo lote termina en una compra**.
2. **Pujar o pasar.** El turno pasa al otro manager, que puede:
   - **Subir** a cualquier monto mayor al actual y ≤ su `pujaMaxima` (botones rápidos +$1, +$2, +$5 y «Todo» = su máximo), o
   - **Pasar** → el lote se adjudica al que va ganando, al precio actual.
   Los turnos se alternan hasta que alguien pasa.
3. **Cierre automático.** Si al que le toca responder no le alcanza para superar el precio
   (`pujaMaxima < precioActual + 1`) o ya tiene el plantel completo, el lote se cierra solo a favor del que va ganando
   (la UI lo muestra: «A Juan no le alcanza — Maradona es de Ana por $12»).
4. **Adjudicación.** El ganador paga el precio, el futbolista pasa a su plantel y sale del mercado.
5. **Siguiente nominación.** Nomina el manager que **no** nominó el lote anterior, si tiene lugares libres;
   si no, nomina el otro.
6. **Compra directa.** Cuando un solo manager tiene lugares libres, ya no hay subasta: elige del mercado
   los que le faltan a **$1 cada uno** (botón «Fichar por $1»).
7. La subasta termina cuando los dos tienen 4 futbolistas → botón «Ir al partido ⚽».

Casos borde que el motor tiene que cubrir (y testear):
- Nadie puede nominar ni pujar por encima de su `pujaMaxima`, ni pujar fuera de turno, ni pujar un monto ≤ al actual.
- Un manager con $4 y 4 lugares libres solo puede abrir o pujar $1 (y por lo tanto nunca puede superar una puja).
- Si el mercado se quedara sin futbolistas antes de completar planteles (no debería pasar con 24 ≥ 8), completá
  con futbolistas al azar de los 200 que no estén en ningún plantel del partido.
- **Deshacer** (prioridad P2): permite revertir la última acción del lote en curso (una puja o la apertura).
  No deshace lotes ya adjudicados.

### 2.5 Partido simulado

- Al terminar la subasta se muestra la **previa**: las dos formaciones, quién ataja, las métricas de equipo
  (ATQ / CRE / DEF / ARQ, ver 5.1) y una **probabilidad estimada** de victoria (2000 simulaciones rápidas con un RNG aparte).
- Al tocar «Jugar partido» se simula (sección 5) y se muestra un relato corto: reloj del 0' al 90' en ~6 segundos
  con los eventos apareciendo, botón «Saltar al resultado», y si hace falta la tanda de penales (✅/❌ uno por uno).
- El resultado es **determinístico dado el seed del partido**: recargar la página no cambia un partido ya jugado.

---

## 3. Datos de jugadores

### 3.1 Fuente

`subasta-futbol/data/jugadores-base.csv` (ya está en el repo, curado a mano) trae las 200 filas con:
`id, nombre, pais, posicion (POR|DEF|MED|DEL), pico (año de su mejor momento), club (club en ese pico), ovr (85–99)`.

**No cambies nombres, posiciones ni OVR.** Si detectás un error factual claro (por ejemplo, un club mal asignado al año),
corregilo en el CSV y listalo en el reporte final.

### 3.2 Qué tenés que generar: `js/jugadores.js`

Un array con los 200 jugadores, cada uno con los campos del CSV más:

```js
{ id: 130, nombre: "Lionel Messi", pais: "Argentina", bandera: "🇦🇷", posicion: "DEL",
  pico: 2012, club: "Barcelona", ovr: 99, categoria: "Leyenda",
  ata: 99, cre: 97, def: 38, arq: 8 }
```

Atributos (enteros 1–99), en su mejor momento:
- `ata` ataque/definición, `cre` creación/pase/regate, `def` defensa/marca, `arq` arquero.

Reglas duras (un test las verifica):
1. **El atributo principal de su posición es exactamente el OVR:** POR → `arq`, DEF → `def`, MED → `cre`, DEL → `ata`.
2. Ningún otro atributo supera el OVR.
3. Jugadores de campo: `arq` entre 5 y 20. Arqueros: `ata` ≤ 45.
4. `categoria` se deriva del OVR con la tabla de 2.3.

Los atributos secundarios los asignás vos según el perfil real de cada uno. Guía de rangos:

| Posición | ata | cre | def |
|----------|-----|-----|-----|
| POR | 10–30 (Chilavert hasta 45) | 30–70 (Neuer, Alisson y Chilavert altos) | 35–55 |
| DEF | 35–85 (laterales ofensivos altos: Cafu, Roberto Carlos, Dani Alves, Marcelo, Carlos Alberto, Facchetti, Breitner, Krol) | 50–94 (líberos y salida limpia altos: Beckenbauer, Baresi, Koeman, Scirea) | = OVR |
| MED | 45–97 (Maradona, Zico, Platini, Kaká, Ronaldinho muy altos) | = OVR | 30–92 (Makélélé, Kanté, Rijkaard, Busquets, Rodri, Vieira altos) |
| DEL | = OVR | 55–98 (Messi, Cruyff, Pelé, Di Stéfano, Bergkamp, Baggio altos) | 20–55 (Di Stéfano, Rummenigge, Rooney arriba; puros 9 abajo) |

Que se sientan distintos: Pirlo no es Makélélé, Gerd Müller no es Cruyff.

Banderas: emoji del país. Casos especiales: Inglaterra `🏴󠁧󠁢󠁥󠁮󠁧󠁿`, Escocia `🏴󠁧󠁢󠁳󠁣󠁴󠁿`, Irlanda del Norte `🇬🇧`.

Generá `jugadores.js` con un script (`tools/generar-jugadores.js`) que lea el CSV y un mapa `id → {ata, cre, def, arq}`
escrito por vos, y valide las reglas antes de escribir el archivo. Commiteá el script y el resultado.

---

## 4. Motor de subasta (funciones puras)

`js/subasta.js` expone funciones que reciben un estado y devuelven un estado **nuevo** (sin mutar el original),
o tiran un error con mensaje claro si la acción es ilegal. Forma sugerida:

```js
crearPartido({ numero, managers, nominaPrimero, seed, mercado })  // presupuestos en 20, planteles vacíos
lugaresLibres(partido, m) · pujaMaxima(partido, m)
nominar(partido, m, jugadorId, apertura)
pujar(partido, m, monto)
pasar(partido, m)
ficharDirecto(partido, m, jugadorId)          // solo en modo compra directa, precio $1
deshacer(partido)                              // P2
estadoSubasta(partido) -> 'nominando' | 'pujando' | 'compraDirecta' | 'terminada'
```

El lote en curso guarda: `jugadorId`, `nominador`, `precio`, `lider`, `turno` y el historial de pujas
(`[{manager, monto}]`) para mostrarlo en la UI («Ana abrió $1 → Juan $3 → Ana $4»).
Cada lote cerrado se registra en `partido.lotes` (`{jugadorId, ganador, precio, pujas}`).

---

## 5. Motor de simulación

Todo en `js/simulacion.js`, con las constantes en un único objeto `CONFIG_SIM` (valores iniciales abajo,
ya probados en un prototipo). Toda la aleatoriedad sale del `rng` que se pasa por parámetro.

### 5.1 Alineación y métricas de equipo

- **Arquero** = el del plantel con mayor `arq` (desempate: mayor OVR). Los otros 3 son **jugadores de campo**.
  Si nadie es POR, ataja el de campo con más `arq` (≈ 5–20): el equipo lo sufre muchísimo. La previa lo avisa:
  «⚠️ Sin arquero: ataja Cruyff».
- Sobre los 3 de campo:

  ```
  ATQ = 0.5 · max(ata) + 0.5 · promedio(ata)
  CRE = 0.5 · max(cre) + 0.5 · promedio(cre)
  DEF = 0.3 · max(def) + 0.7 · promedio(def)      // la defensa es más colectiva
  ARQ = arquero.arq
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
    si no → ATAJADA del arquero rival (registrala como evento).
```

### 5.3 Penales (si hay empate en los 90')

- Patean en orden de `ata` descendente los 4 (incluido el arquero, que patea último), cíclico.
- `p = clamp(penalBase + (pateador.ata − arqueroRival.arq) / penalPendiente, penalMin, penalMax)`.
- 5 por lado alternados, cortando antes si ya está definido; si siguen iguales, muerte súbita.
- Siempre hay ganador.

### 5.4 Salida de `simularPartido(equipoA, equipoB, rng)`

```js
{
  goles: [2, 1],
  eventos: [ { minuto: 23, tipo: "gol", equipo: 0, autor: 130, asistencia: 67 },
             { minuto: 51, tipo: "atajada", equipo: 1, arquero: 1, pateador: 129 }, ... ],
  penales: null | { tiros: [{ equipo, pateador, convertido }], resultado: [4, 3] },
  estadisticas: { posesion: [58, 42], remates: [7, 4] },
  metricas: [ {ATQ, CRE, DEF, ARQ, arquero}, {…} ],
  ganador: 0,
  figura: 130
}
```

**Figura del partido:** el de más goles (desempate: más asistencias, después mayor OVR, priorizando al equipo ganador);
si nadie hizo goles, el arquero del ganador.

También: `probabilidadVictoria(equipoA, equipoB, n = 2000, seed)` → `[pA, pB]` para la previa.

Relato: un par de frases por tipo de evento, variadas y en rioplatense («¡GOOOL de Messi! La colgó del ángulo», «Yashin vuela y la saca»).
Nada de relatos largos.

### 5.5 Calibración (obligatoria)

`tools/calibrar.js` corre estos escenarios con 20.000 partidos cada uno (seed fija) e imprime una tabla
«escenario · resultado · objetivo · OK/FALLA». Si algo falla, ajustá `CONFIG_SIM` (no las fórmulas) hasta que pase,
y pegá la salida final en el README.

| Escenario | Objetivo |
|-----------|----------|
| Dos equipos idénticos | gana A entre 48 % y 52 % |
| Drafts aleatorios (1 POR + 3 de campo de todo el pool) | 2,8–4,2 goles por partido; 15 %–28 % a penales |
| Diferencia de OVR promedio ≈ 3 (ambos equipos POR+DEF+MED+DEL) | gana el mejor 57 %–67 % |
| Diferencia ≈ 6 | 68 %–80 % |
| Diferencia ≈ 10 | 82 %–92 % |
| Yashin + Beckenbauer + Maradona + Messi vs Zenga + Ayala + Bochini + Caniggia | 88 %–95 % |
| Yashin + Messi + Pelé + Maradona vs Cruyff + Messi + Pelé + Maradona (sin arquero) | con arquero gana ≥ 80 % |
| Equilibrado (Kahn, Puyol, Gerrard, Raúl) vs todo ataque (Kahn, Raúl, Totti, Del Piero) | equilibrado 52 %–68 % |

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
   - **Centro, sin lote:** «Nomina: Ana» + grilla del mercado (filtros Todos/POR/DEF/MED/DEL, orden por OVR),
     botón «🎲 Al azar». Al tocar una carta: panel con la carta grande, stepper de apertura ($1 por defecto) y «Abrir subasta».
   - **Centro, con lote:** carta grande del futbolista, precio actual enorme, «Va ganando: Ana», «Le toca a: Juan»,
     botones +$1 / +$2 / +$5 / Todo ($X) / Pasar (deshabilitados si no alcanza), y la cadena de pujas.
     Solo el panel del manager de turno tiene los controles activos y resaltado con su color.
   - Al adjudicar: banner 1,5 s «¡Maradona es de Ana por $12!» y la carta vuela/aparece en su plantel.
   - **Compra directa:** banner explicando «Juan ya completó. Ana elige 2 más a $1».
3. **Previa**: dos columnas con las formaciones (🧤 marca al arquero, aviso si no hay POR), métricas enfrentadas
   y la barra de probabilidad («Ana 63 % · Juan 37 %»). Botón «Jugar partido».
4. **Partido**: marcador grande, reloj corriendo, eventos apareciendo; penales si hace falta; «Saltar».
5. **Resultado**: marcador final (+ penales), «Ganó Ana (+10)», goles con minuto, posesión y remates, figura del partido,
   tabla del torneo y botón «Siguiente partido» (o «Ver campeón»).
6. **Campeón**: trofeo, puntos finales y un resumen del torneo: partidos jugados, victorias de cada uno,
   goleador del torneo (sumando todos los partidos), fichaje más caro, «ganga» (más goles por dólar gastado).
   Botón «Nuevo torneo».
- **Historial** accesible desde cualquier pantalla (drawer o modal): lista de partidos con resultado y los 4 de cada uno con precio.

### 6.2 Carta de jugador

- Borde/fondo según categoría: **Leyenda** dorado con brillo sutil, **Crack** violeta, **Estrella** azul, **Figura** bronce.
- OVR grande, posición, avatar de iniciales, bandera, nombre, «1986 · Napoli», y 4 barras cortas ATA/CRE/DEF/ARQ.
- Versión mini para planteles y grilla.

### 6.3 Estilo

- Tema oscuro «estadio de noche»: fondo verde muy oscuro/azulado, textos claros, acentos en los colores de cada manager.
  Tokens de color en `:root` (CSS custom properties).
- Tipografía: una condensada para números y títulos (p. ej. «Barlow Condensed» de Google Fonts, con fallback de sistema
  para que ande offline) y sistema para el resto.
- Targets táctiles ≥ 44 px. Foco visible. Animaciones cortas y `prefers-reduced-motion` respetado.
- Atajos de teclado (P2): manager 1 → `Q` +$1, `W` +$2, `E` +$5, `A` pasar; manager 2 → `P` +$1, `O` +$2, `I` +$5, `L` pasar.
  Solo responden las teclas del manager de turno.

---

## 7. Arquitectura y archivos

```
subasta-futbol/
  index.html              UI (una sola página, pantallas como secciones que se muestran/ocultan)
  css/estilos.css
  js/config.js            constantes del juego (presupuesto, tamaño de plantel, puntos, mercado, colores)
  js/rng.js               RNG con semilla (mulberry32) + helpers: entero, elegir, mezclar, ponderado
  js/jugadores.js         los 200 con atributos (generado)
  js/mercado.js           generarMercado(seed)
  js/subasta.js           máquina de estados de la subasta (sección 4)
  js/simulacion.js        simularPartido, probabilidadVictoria, metricasEquipo (sección 5)
  js/torneo.js            estado del torneo, puntos, fin por modo, quién nomina, persistencia
  js/app.js               render + eventos (lo único que toca el DOM)
  data/jugadores-base.csv
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

- **jugadores:** 200 exactos; ids y nombres únicos; reglas duras de 3.2; categorías con la tabla de 2.3
  (18 Leyendas, 24 Cracks, 100 Estrellas, 58 Figuras); 20 POR.
- **mercado:** 24 sin repetidos; composición por categoría; mínimos por posición; mismo seed → mismo mercado; seeds distintas → mercados distintos.
- **subasta:**
  - `pujaMaxima` en los casos de la sección 2.2;
  - nominar/pujar/pasar felices y todos los ilegales (fuera de turno, monto ≤ actual, sobre el máximo, jugador no disponible);
  - cierre automático cuando al rival no le alcanza o tiene el plantel lleno;
  - alternancia de nominación y compra directa;
  - **propiedad:** 2000 subastas con acciones legales al azar terminan siempre con 4 y 4, presupuestos ≥ 0, y cada manager pagó exactamente `20 − presupuestoFinal`.
- **simulacion:** determinismo con seed; `goles` coincide con los eventos de gol; con empate en 90' siempre hay penales y ganador;
  el equipo sin arquero pierde claramente contra el mismo equipo con arquero (≥ 75 % en 2000 partidos).
- **torneo:** +10 al ganador; fin «Primero a 100»; fin «10 partidos» con desempate en 50–50; nomina primero el perdedor;
  serializar → deserializar devuelve el mismo estado.

### 8.2 Calibración

`node subasta-futbol/tools/calibrar.js` con todos los escenarios en OK (sección 5.5).

### 8.3 Prueba en navegador

Chromium está preinstalado en el entorno (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; **no corras `playwright install`**).
Si podés instalar el paquete `playwright` en un directorio temporal fuera del repo (no commitees `node_modules`), escribí un script
que abra `index.html`, juegue un partido completo haciendo clics (nominar, pujar, pasar, jugar, siguiente) y saque capturas
a 390×844 y 1280×800 de: inicio, subasta con lote activo, previa, resultado. Revisá las capturas vos mismo antes de dar la fase por cerrada.
Si no se puede instalar, decilo en el reporte y describí qué verificaste a mano.

---

## 9. Plan por fases (un commit por fase)

1. **Datos.** `tools/generar-jugadores.js` + `js/jugadores.js` + `js/config.js` + tests de jugadores. → commit «Datos: 200 jugadores con atributos».
2. **Motor.** `rng.js`, `mercado.js`, `subasta.js`, `simulacion.js`, `torneo.js` + sus tests. → commit «Motor: mercado, subasta, simulación y torneo».
3. **Calibración.** `tools/calibrar.js`, ajuste de `CONFIG_SIM`, salida en README. → commit «Calibración del simulador».
4. **UI.** `index.html`, `css/estilos.css`, `js/app.js`: las 6 pantallas + historial + persistencia. → commit «UI jugable completa».
5. **Verificación y pulido.** Prueba en navegador (8.3), arreglos, responsive, README final, línea en el README raíz.
   → commit «Pulido y verificación» y `git push -u origin claude/football-auction-game-bp4zil`.

Prioridades: todo lo de las secciones 2–7 es **P0** salvo lo marcado **P2** (deshacer, atajos de teclado),
que se hace solo si lo P0 está completo y verificado.

---

## 10. Criterios de aceptación

- [ ] Se abre con doble clic en `index.html` y funciona sin conexión (salvo la fuente web, que tiene fallback).
- [ ] Se puede jugar un torneo entero de principio a fin en «Primero a 100» y en «10 partidos».
- [ ] Nadie puede quedar sin poder completar su equipo de 4; nadie gasta más de $20 por partido.
- [ ] Todo lote termina en compra; la compra directa a $1 funciona cuando un manager ya completó.
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
