# Mercado Casa — Manual de Comunicación para Vendedores

Guía oficial, breve y concisa, para quienes salen a vender las casas de la **Línea VIVE**
de Mercado Casa. Es una síntesis operativa del Manual de Marca oficial
(Doc **MC-MM-001 · v1.5**), enfocada en lo que un vendedor necesita: cómo nombrar
las cosas, qué frases usar, cómo responder objeciones, cómo cerrar y cómo se ve la marca.

## Qué incluye

- **Qué vendemos** — esencia, promesa central y el enemigo (el alquiler).
- **Cómo nombrar** — reglas duras de naming (Mercado Casa, Línea VIVE, VIVE 28/38/48/58/63…).
- **Frases oficiales** — los 4 claims y cuándo usar cada uno.
- **Cómo hablar** — voz, tono, glosario y la lista Siempre / Nunca.
- **Las 4 objeciones** con su respuesta corta.
- **Los 4 argumentos de cierre.**
- **La Línea VIVE** — los 5 modelos.
- **Identidad mínima** — paleta con copia de HEX, tipografía Manrope y regla 70/20/10.
- **El logo** — variantes, usos correctos/prohibidos y descarga del archivo oficial.
- **Listo para usar** — textos para copiar y pegar en folleto, bio y WhatsApp.

## Estructura

```
index.html                       Manual completo (single page, sin build)
assets/
  mercado-casa-lockup.png        Logo completo (isotipo + wordmark) · Verde Vivo · 3200×1000 RGBA
  mercado-casa-isotipo.png       Solo isotipo M-casa · Verde Vivo · 2048×2048 RGBA
```

Sitio 100% estático: se sirve tal cual, sin paso de compilación. Compatible con Vercel (zero-config).

## Notas de marca

- **Verde Vivo `#2A8B4E`** es el verde institucional confirmado por socios. El verde
  apagado `#1B6B47` (Verde Hogar) y cualquier azul están descartados.
- El logo en crema sobre fondos verdes/oscuros se renderiza con CSS `mask` a partir
  del isotipo oficial (variante cromática aprobada en §4.5 del manual).
- Tipografía **Manrope** (Google Fonts).

## Desarrollo local

No requiere dependencias. Para previsualizar:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```
