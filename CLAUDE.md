# CLAUDE.md — memoria del proyecto

Leé esto antes de tocar nada. Resume el estado actual y las decisiones del dueño del repo para no
revertirlas sin querer. Si cambiás reglas o arquitectura, actualizá este archivo en el mismo commit.

## El repo

Dos proyectos independientes, 100 % estáticos, sin build ni dependencias (Vercel zero-config):

- **Raíz** (`index.html`, `assets/`, `build/pdfgen.py`): manual de comunicación para vendedores de Mercado Casa.
  No se toca cuando se trabaja en el juego.
- **`subasta-futbol/`**: el juego **«Subasta de Cracks»** (todo lo que sigue es sobre él).

Convenciones: todo en **español rioplatense** (UI «vos», commits, docs); identificadores en español sin tildes
(`presupuesto`, `pujaMaxima`). Rama de trabajo: `claude/football-auction-game-bp4zil`. No abrir PR salvo que lo pidan.

**Publicado** como artifact (compartido «cualquiera con el link»):
https://claude.ai/artifact/MvUH3j9p1iUYik4BLUdk83 — se actualiza siempre republicando ese mismo artifact
(el link no cambia). Ver «Publicar» abajo.

## Reglas vigentes del juego

- **2 a 6 jugadores** en la misma pantalla (hot-seat), cada uno con su color fijo
  (celeste, naranja, verde, violeta, amarillo, rosa). Nombres editables al empezar.
- **Duración**: «Cantidad de partidos» (fechas, 1 a 30, por defecto 10; gana el de más puntos) o «Primero a 100».
  Empate arriba al final → **fecha de desempate solo entre los empatados** (se repite si siguen empatados).
- **Cada fecha**: $20 por jugador y 4 lugares; subasta nueva; después se juega (2 jugadores: un partido con relato;
  más: **todos contra todos**). Cada victoria = **10 puntos**. Tabla: Pts, PJ, PG, GF, GC, DG.
- **Subasta al azar**: nadie elige; los jugadores salen de a uno de un mazo mezclado (24 del «mercado» con mezcla de
  categorías y posiciones, después el resto). Arranca en **$1** y sube de a **$0,50** (plata en centavos en el motor).
- **Sin pases**: el que abre el lote **tiene que pujar** (≥ $1); todo jugador que sale se vende. Después el turno rota:
  cada uno sube o dice **«No subo»** (queda afuera de ese jugador). Gana el último que queda.
- **Puja máxima** = presupuesto − (lugares libres − 1) × $1: a nadie le falta plata para completar 4.
- **Reparto parejo**: cuando queda **uno solo** sin completar, se le completan los lugares libres al azar con un equipo
  de la misma fuerza (ATQ+CRE+DEF, ±2) que el promedio de los equipos completos; $1 cada uno; se muestran juntos.
- **Arquero único**: los arqueros no salen al mercado; se compran 4 de campo y los 4 juegan. Todos le patean al mismo
  arquero estándar (nivel 90). Empate en 90' → **alargue con gol de oro** (91'–118', una jugada cada 3');
  si nadie convierte → **penales** (~2 % de los partidos).
- **Cartas estilo Ultimate Team** (sin marcas reales): OVR, posición detallada, bandera, sigla de club, silueta,
  6 stats (RIT TIR PAS | REG DEF FÍS). Categorías: Leyenda ≥95 (marfil), Crack 92–94 (azul), Estrella 89–91 (oro con
  trama), Figura ≤88 (oro liso). Referencia visual obligatoria: `subasta-futbol/referencia/cartas.html` + `cartas.css`.
- Botones globales siempre visibles durante el torneo: **Historial** y **↺ Reiniciar** (dos toques, vuelve a cero).

## Arquitectura (`subasta-futbol/`)

- `index.html` + `css/estilos.css` + `css/cartas.css`; `<script>` clásicos (sin ES modules: tiene que andar con doble
  clic en `file://`). Cada `js/*.js` usa patrón UMD: en el navegador cuelga de `window.SC.*`, en Node se `require()`a.
- `js/config.js` constantes (plata en centavos, fechas, colores, mercado) + `formatearPlata`.
- `js/rng.js` RNG con semilla (mulberry32). Todo es determinístico por seed (mercado, subasta, reparto, partidos).
- `js/jugadores.js` **generado**: 220 jugadores (200 de campo + 20 arqueros que no salen al mercado).
  No editar a mano: `data/jugadores-base.csv` + `tools/generar-jugadores.js` (arquetipos por perfil + variación propia
  por jugador; la stat principal derivada queda a ±2 del OVR; sin cartas repetidas).
- `js/mercado.js` `generarMercado` (24) y `generarMazo` (200 de campo en orden de salida).
- `js/subasta.js` máquina de estados pura (N managers): `abrirLote`, `pujar`, `pasar` (= «No subo»), `deshacer`,
  `completarPlantel`; estados `esperandoLote | pujando | reparto | terminada`.
- `js/reparto.js` equipo parejo al azar. `js/simulacion.js` partido (constantes en `CONFIG_SIM`).
- `js/torneo.js` fechas, cruces todos contra todos, tabla, fin y desempates.
- `js/app.js` única capa que toca el DOM. Guardado en `localStorage` clave **`subasta-cracks:v3`**
  (si cambia el formato del estado, subir la versión para ignorar guardados viejos).
- `SESION.md` es el **brief original** (con actualizaciones en §2); partes de §5.5/§6 quedaron históricas.
  La verdad está en el código, `subasta-futbol/README.md` y este archivo.

## Comandos y verificación

```bash
node --test subasta-futbol/tests/*.test.js     # 58 tests, todos en verde
node subasta-futbol/tools/calibrar.js          # escenarios de balance, todos OK (sale con 1 si alguno falla)
node subasta-futbol/tools/generar-jugadores.js # regenera js/jugadores.js y valida los datos
```

- Balance calibrado: equipos idénticos ~50 %; +3 de OVR ~63 %; +6 ~74 %; leyendas vs figuras ~90 %;
  equilibrado vs todo ataque ~53 %; reparto parejo vs comprado ~49 %; ~21 % van al alargue, ~2 % a penales.
  Si tocás datos o fórmulas, volvé a correr la calibración y ajustá `CONFIG_SIM` (no las fórmulas) hasta que pase.
- Prueba en navegador: Playwright está instalado global (`require(\`${npm root -g}/playwright\`)`) y Chromium en
  `/opt/pw-browsers`; **no correr `playwright install`**. Jugar torneos completos (2, 4 y 6 jugadores) y revisar capturas.
  Los errores `ERR_CERT_AUTHORITY_INVALID` de Google Fonts en este entorno son esperables (hay fallback).

## Publicar el artifact

1. Generar la página desde `subasta-futbol/index.html` **sin** `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` ni `<meta>`
   (el visor agrega su esqueleto): `<title>` primero, después los `<link>` y el contenido del `<body>`.
2. Publicar ese archivo con `files` = `css/*.css` y `js/*.js` (rutas relativas iguales a las del repo), al mismo artifact.
3. En el visor no existen `confirm/alert/prompt` (por eso las confirmaciones son de dos toques en la página);
   `localStorage` siempre dentro de `try/catch`; respetar `env(safe-area-inset-*)` en elementos fijos.

## Historial de decisiones del dueño (en orden)

1. Juego de subasta: $20, equipos de 4, top 200 históricos en su mejor momento, 10 puntos por victoria.
2. Cartas tipo FIFA/Ultimate Team; la subasta arranca en $1 y sube de a $0,50.
3. Arquero estándar igual para todos (gana la destreza); sin penales salvo que nadie haga el gol de oro.
4. Se sumaron 20 jugadores de campo para que la subasta siga teniendo 200.
5. Selección siempre al azar (sin grilla para elegir), reparto parejo al que no compra, botón Reiniciar.
6. De 2 a 6 jugadores y cantidad de partidos elegible. (Hubo 2 pases por fecha…)
7. …que se **sacaron**: «sin pases, así es más dramática la elección». Solo queda «No subo» con alguien ganando.

La primera versión la construyó una sesión aparte siguiendo `SESION.md`; después se corrigieron stats infladas y cartas
repetidas en el generador, el arquero, la calibración y el diseño en celular (ver `subasta-futbol/README.md`).
