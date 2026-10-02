# Manual de montaje · dos versiones (v1.1)

Pedido de Christian sobre el manual v1.0 (MC-MAN-001, ya revisado por Ori): "demasiado texto, chico y junto".
Se arman dos versiones con **el mismo contenido técnico de la v1.0** (no se agregó ni cambió ningún dato):

| Versión | Archivo | Páginas | Idea |
|---|---|---|---|
| **Corta con QR** | `pdf/… v1.1 corta con QR.pdf` | 15 | Lo básico en papel, letra grande, una imagen por paso. Lo técnico (cortes, encuentros, variantes, sanitarios, errores, glosario) en el celular con 9 QR. |
| **Extensa gráfica** | `pdf/… v1.1 extensa.pdf` | 26 | Todo en papel: un paso por página, imagen grande, acciones en 15 pt, íconos y medidas destacadas. |

Los QR apuntan a `https://mercadocasa.com.ar/manual#<sección>` (secciones: `encuentros`, `variantes`, `sanitarios`,
`galera`, `encastre`, `t`, `aberturas`, `errores`, `glosario`). La página está en el repo `mercado-casa`,
en `public/manual/` (la genera `web.py` en `web/manual/`). **Tiene que estar publicada para que los QR funcionen.**

## Regenerar

```bash
pip install qrcode pillow
python3 corta.py && python3 extensa.py && python3 web.py
node render.js "Manual de Montaje - corta.html"   corta.pdf      # chequea desbordes y exporta A4
node render.js "Manual de Montaje - extensa.html" extensa.pdf
```

`render.js` usa Playwright + Chromium e informa cualquier elemento que se pase del margen inferior (las páginas son
`overflow:hidden`). Imágenes: extraídas del PDF v1.0 (`img/`). Tipografía Manrope embebida (`fonts/`).
