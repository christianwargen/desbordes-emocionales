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

| Escenario                                                                        | Resultado              | Objetivo | OK/FALLA |
| -------------------------------------------------------------------------------- | ---------------------- | -------- | -------- |
| Dos equipos identicos                                                            | gana A 50.1%           | 48%-52%  | OK |
| Drafts aleatorios: goles/partido                                                 | 4.05                   | 2.8-4.2  | OK |
| Drafts aleatorios: % a penales                                                   | 19.6%                  | 15%-28%  | OK |
| Diferencia de OVR ~3 (real 3.0)                                                  | gana el mejor 66.8%    | 57%-67%  | OK |
| Diferencia de OVR ~6 (real 6.0)                                                  | gana el mejor 68.8%    | 68%-80%  | OK |
| Diferencia de OVR ~10 (real 8.5)                                                 | gana el mejor 87.0%    | 82%-92%  | OK |
| Yashin+Beckenbauer+Maradona+Messi vs Zenga+Ayala+Bochini+Caniggia                | gana A 89.3%           | 88%-95%  | OK |
| Con arquero (Yashin) vs sin arquero (Cruyff de campo)                            | gana con arquero 81.4% | >=80%    | OK |
| Equilibrado (Kahn,Puyol,Gerrard,Raúl) vs todo ataque (Kahn,Raúl,Totti,Del Piero) | gana equilibrado 55.0% | 52%-68%  | OK |

Todos los escenarios OK.
```

`CONFIG_SIM` final (único cambio respecto de los valores iniciales del brief: `pendienteGol`
bajó de 110 a 85 para que la ventaja de calidad pese un poco más, sin tocar las fórmulas):

```json
{
  "jugadas": 18,
  "expPosesion": 3,
  "posesionMin": 0.3,
  "posesionMax": 0.7,
  "baseRemate": 0.42,
  "pendienteRemate": 90,
  "remateMin": 0.12,
  "remateMax": 0.85,
  "baseGol": 0.36,
  "pendienteGol": 85,
  "golMin": 0.08,
  "golMax": 0.8,
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
- **`pendienteGol` en la calibración**: bajó de 110 a 85 (única constante tocada) para que
  los ocho escenarios de la sección 5.5 den todos OK a la vez; el resto de `CONFIG_SIM`
  quedó igual a los valores iniciales del brief.

## Correcciones al CSV

Ninguna. Se revisó `data/jugadores-base.csv` fila por fila (nombre, país, posición, año
pico, club, OVR) y no se encontraron errores factuales evidentes.

## Pendiente / lo que puede no estar perfecto

Se termina de completar en la fase de verificación y pulido (sección 11 de `SESION.md`).
