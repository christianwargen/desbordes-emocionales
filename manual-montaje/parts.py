# Piezas compartidas: CSS, íconos, dibujos SVG, QR y contenido técnico (texto v1.0 revisado por Ori).
import base64, io, html
import qrcode

GREEN = '#2A8B4E'; CREAM = '#F7F2EA'; CARBON = '#1A1F1C'; TERRA = '#C2563A'
BASE_URL = 'https://mercadocasa.com.ar/manual'
SHORT_URL = 'mercadocasa.com.ar/manual'

FAM = {  # familia: (ancho m, m², color nombre, relleno, borde)
    'A': (2.47, '6,10', 'rojo', '#F6D2D2', '#D9534F'),
    'B': (1.86, '4,59', 'verde', '#D3EDDA', '#3E9B5C'),
    'C': (1.40, '3,46', 'azul', '#D4E1F5', '#4A78C2'),
    'D': (1.25, '3,09', 'amarillo', '#FBEFC2', '#D6A92B'),
    'E': (0.64, '1,58', 'gris', '#E3E3E3', '#8A8A8A'),
    'F': (1.11, '2,72', 'violeta', '#EADAF4', '#9A5FC2'),
    'G': (0.50, '1,22', 'naranja', '#FBDCC6', '#E07B39'),
}
VARIANTS = {  # familia: lista de (código, tipo, (ancho cm, alto cm) o None)
    'A': [1, 2, 3, 4, 5, 6, 7], 'B': [1, 2, 3, 4, 5, 6], 'C': [1, 2, 3, 4, 5],
    'D': [1, 2, 3, 4], 'E': [1], 'F': [1, 2, 3, 4], 'G': [1],
}
VDIM = {1: ('ciego', None), 2: ('ventana', (60, 40)), 3: ('puerta', (83, 210)), 4: ('ventana', (60, 110)),
        5: ('ventana', (150, 110)), 6: ('ventana', (150, 40)), 7: ('puerta', (180, 210))}

def vdim(f, v):
    t, d = VDIM[v]
    if f == 'C' and v == 5: d = (86, 110)
    return t, d

def esc(s): return html.escape(s, quote=False)

# ---------------------------------------------------------------- QR
def qr_png(anchor):
    url = f'{BASE_URL}#{anchor}'
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    q.add_data(url); q.make(fit=True)
    img = q.make_image(fill_color=CARBON, back_color='white')
    b = io.BytesIO(); img.save(b, format='PNG')
    return url, 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

# ---------------------------------------------------------------- íconos (línea gruesa, verde)
_I = {
 'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 'cross': '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
 'warn': '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
 'phone': '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/><path d="M9.5 6.5h2v2h-2zM12.5 6.5h2v2h-2zM9.5 9.5h2v2h-2z"/>',
 'people': '<circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="6.5" r="2"/><circle cx="6.5" cy="15" r="2"/><circle cx="17.5" cy="15" r="2"/><path d="M3.5 12c0-1.7 1.3-3 3-3s3 1.3 3 3M14.5 12c0-1.7 1.3-3 3-3s3 1.3 3 3M3.5 20.5c0-1.7 1.3-3 3-3s3 1.3 3 3M14.5 20.5c0-1.7 1.3-3 3-3s3 1.3 3 3"/>',
 'drill': '<path d="M3 7h11v5H3zM14 8.5h4M18 9.5h3"/><path d="M6 12l-1 8h4l1-8"/>',
 'level': '<rect x="2" y="9" width="20" height="6" rx="1"/><rect x="10" y="10.5" width="4" height="3" rx="1.5"/>',
 'square': '<path d="M4 3v17h17v-4H8V3z"/>',
 'band': '<circle cx="10" cy="12" r="6.5"/><circle cx="10" cy="12" r="2.5"/><path d="M16.5 12H22v3h-5"/>',
 'screw': '<path d="M8 4h8M9 4v3h6V4M10 7v11l2 3 2-3V7M10 10l4 1.5M10 13l4 1.5M10 16l4 1.5"/>',
 'plan': '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
 'roof': '<path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/>',
 'glove': '<path d="M7 21v-6L4.5 11a1.4 1.4 0 012.3-1.6L8 11V4.5a1.3 1.3 0 012.6 0V10V3.5a1.3 1.3 0 012.6 0V10V4.5a1.3 1.3 0 012.6 0V11V7a1.3 1.3 0 012.6 0v7l-2 4v3"/>',
 'chat': '<path d="M4 18.5l1.3-3.8A8 8 0 1112 20a8 8 0 01-3.9-1z"/>',
 'box': '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
 'stack': '<path d="M3 17h18M3 13.5h18M3 10h18"/><path d="M4 20.5h3M17 20.5h3"/>',
}
def icon(name, size=22, color=GREEN, sw=2.1):
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{_I[name]}</svg>')

# ---------------------------------------------------------------- dibujos
def svg_familias(width=180):
    order = list('ABCDEFG')
    gap = 0.22; total = sum(FAM[f][0] for f in order) + gap * (len(order) - 1)
    s = width / total; H = 2.47 * s
    x = 0; out = []
    for f in order:
        w = FAM[f][0] * s; fill, st = FAM[f][3], FAM[f][4]
        out.append(f'<rect x="{x:.2f}" y="6" width="{w:.2f}" height="{H:.2f}" fill="{fill}" stroke="{st}" stroke-width=".5"/>')
        out.append(f'<text x="{x + w / 2:.2f}" y="{6 + H / 2 + 4:.2f}" text-anchor="middle" font-size="11" font-weight="800" fill="{st}">{f}</text>')
        out.append(f'<text x="{x + w / 2:.2f}" y="{6 + H + 6:.2f}" text-anchor="middle" font-size="3.6" font-weight="700" fill="{CARBON}">{str(FAM[f][0]).replace(".", ",")} m</text>')
        x += w + gap * s
    out.append(f'<path d="M0 3h3M1.5 3v{H + 6:.1f}M0 {H + 6:.1f}h3" stroke="{CARBON}" stroke-width=".3" fill="none"/>')
    return f'<svg viewBox="-7 0 {width + 12} {H + 14:.1f}" width="100%" font-family="Manrope, system-ui, sans-serif">' \
           f'<text x="-3" y="{6 + H / 2:.1f}" font-size="3.2" fill="{CARBON}" transform="rotate(-90 -3 {6 + H / 2:.1f})" text-anchor="middle">2,47 m de alto</text>' \
           + ''.join(out) + '</svg>'

def svg_panel(f, v, s, x0=0, y0=0, label=True):
    """Elevación esquemática de un panel. s = mm por metro."""
    w = FAM[f][0] * s; h = 2.47 * s; fill, st = FAM[f][3], FAM[f][4]
    t, d = vdim(f, v)
    o = [f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{fill}" stroke="{st}" stroke-width=".45"/>']
    if d:
        ow, oh = d[0] / 100 * s, d[1] / 100 * s
        top = y0 + (2.47 - 2.10) * s
        ox = x0 + (w - ow) / 2
        oy = top if t == 'ventana' else y0 + h - oh
        o.append(f'<rect x="{ox:.2f}" y="{oy:.2f}" width="{ow:.2f}" height="{oh:.2f}" fill="#fff" stroke="{st}" stroke-width=".45"/>')
    return ''.join(o)

def svg_variantes(width=180, row_h=26, compact=False):
    s = 7.0  # mm por metro
    cols = 7; lab = 30; cw = (width - lab) / cols
    rows = list('ABCDEFG')
    H = 10 + row_h * len(rows)
    o = []
    for j in range(cols):
        t, _ = VDIM[j + 1]
        o.append(f'<text x="{lab + cw * j + cw / 2:.1f}" y="4" text-anchor="middle" font-size="3.4" font-weight="800" fill="{CARBON}">{j + 1}</text>')
        o.append(f'<text x="{lab + cw * j + cw / 2:.1f}" y="7.6" text-anchor="middle" font-size="2.5" fill="#666">{t}</text>')
    for i, f in enumerate(rows):
        y = 10 + i * row_h
        st = FAM[f][4]
        o.append(f'<line x1="0" x2="{width}" y1="{y + row_h - .5:.1f}" y2="{y + row_h - .5:.1f}" stroke="#ddd" stroke-width=".25"/>')
        o.append(f'<text x="0" y="{y + 8:.1f}" font-size="7" font-weight="800" fill="{st}">{f}</text>')
        o.append(f'<text x="7" y="{y + 5:.1f}" font-size="2.7" font-weight="700" fill="{CARBON}">Familia {f}</text>')
        o.append(f'<text x="7" y="{y + 8.4:.1f}" font-size="2.5" fill="#555">{str(FAM[f][0]).replace(".", ",")} m · {FAM[f][1]} m²</text>')
        for v in VARIANTS[f]:
            cx = lab + cw * (v - 1)
            pw = FAM[f][0] * s
            o.append(svg_panel(f, v, s, cx + (cw - pw) / 2, y + 1.5))
            t, d = vdim(f, v)
            txt = f'{f}{v}' + (f' · {d[0]}×{d[1]}' if d else '')
            o.append(f'<text x="{cx + cw / 2:.1f}" y="{y + row_h - 2.2:.1f}" text-anchor="middle" font-size="2.6" font-weight="700" fill="{CARBON}">{txt}</text>')
    return f'<svg viewBox="0 0 {width} {H}" width="100%" font-family="Manrope, system-ui, sans-serif">' + ''.join(o) + '</svg>'

def svg_equivalencias(width=180, rh=11):
    rows = [['A'], ['B', 'E'], ['C', 'F'], ['D', 'D'], ['C', 'G', 'E'], ['E', 'E', 'E', 'E']]
    L = width - 22; o = []
    for i, r in enumerate(rows):
        y = i * (rh + 3.2)
        tot = sum(FAM[f][0] for f in r); x = 0
        for f in r:
            w = FAM[f][0] / tot * L
            o.append(f'<rect x="{x + .4:.2f}" y="{y:.2f}" width="{w - .8:.2f}" height="{rh}" rx="1" fill="{FAM[f][3]}" stroke="{FAM[f][4]}" stroke-width=".5"/>')
            o.append(f'<text x="{x + w / 2:.2f}" y="{y + rh / 2 + 2.4:.2f}" text-anchor="middle" font-size="6.5" font-weight="800" fill="{FAM[f][4]}">{f}</text>')
            x += w
        lab = '2,47 m' if i == 0 else '= A'
        o.append(f'<text x="{L + 3}" y="{y + rh / 2 + 2.2:.2f}" font-size="5" font-weight="800" fill="{CARBON}">{lab}</text>')
    H = len(rows) * (rh + 3.2)
    return f'<svg viewBox="0 0 {width} {H:.1f}" width="100%" font-family="Manrope, system-ui, sans-serif">' + ''.join(o) + '</svg>'

def svg_orden(width=180):
    G, B, Gr = GREEN, '#3F5F7A', '#8C8C86'
    def m(x, y, n, c):
        return (f'<circle cx="{x}" cy="{y}" r="5.2" fill="{c}"/><text x="{x}" y="{y + 2.3}" text-anchor="middle" '
                f'font-size="6.5" font-weight="800" fill="#fff">{n}</text>')
    o = [f'<rect x="10" y="10" width="160" height="70" fill="{CREAM}"/>',
         f'<path d="M10 80V10h160v70z" fill="none" stroke="{Gr}" stroke-width="3"/>',
         f'<path d="M10 80V10h55v70z" fill="none" stroke="{G}" stroke-width="3.4"/>',
         f'<path d="M65 50h30v30" fill="none" stroke="{B}" stroke-width="3"/>',
         f'<path d="M65 10v70" stroke="{B}" stroke-width="3"/>',
         f'<circle cx="10" cy="10" r="9" fill="none" stroke="{TERRA}" stroke-width="1.6"/>',
         m(4, 6, 1, TERRA), m(22, 48, 2, G), m(80, 38, 3, B), m(160, 45, 4, Gr)]
    return f'<svg viewBox="0 0 {width} 88" width="100%" font-family="Manrope, system-ui, sans-serif">' + ''.join(o) + '</svg>'

def svg_remate():
    # esquema de corte del borde superior: solo los elementos que nombra el paso 7
    return f'''<svg viewBox="0 0 120 110" width="100%" font-family="Manrope, system-ui, sans-serif">
<rect x="40" y="40" width="22" height="70" fill="#F2D27A"/>
<rect x="38.5" y="40" width="1.5" height="70" fill="#9b8a6a"/><rect x="62" y="40" width="1.5" height="70" fill="#9b8a6a"/>
<path d="M37 40V31h28v9" fill="none" stroke="{CARBON}" stroke-width="2.2"/>
<path d="M35 46V28.5h32V46" fill="none" stroke="#3B7DD8" stroke-width="1.1" stroke-dasharray="2.2 1.4"/>
<path d="M30 24h42l3 6M30 24l-3 6" fill="none" stroke="#8C8C86" stroke-width="2.4" stroke-linejoin="round"/>
<rect x="36" y="25.6" width="30" height="1.6" fill="{TERRA}"/>
<g font-size="4.2" fill="{CARBON}" font-weight="700">
<text x="78" y="22">Zinguería</text><text x="78" y="27" font-weight="400" font-size="3.6">babeta y tapa</text>
<text x="2" y="18">Banda en</text><text x="2" y="22.5">el apoyo</text>
<text x="78" y="37">Solera de remate</text><text x="78" y="42" font-weight="400" font-size="3.6">14 × 3" cada 60 cm</text>
<text x="2" y="44">Barrera de</text><text x="2" y="48.5">agua y viento</text><text x="2" y="53" font-weight="400" font-size="3.6">solapada afuera</text>
<text x="70" y="80">Panel</text></g>
<path d="M76 21.5h-4M20 21l16 5M76 36h-11M24 46l11 2M69 79h-7" stroke="{CARBON}" stroke-width=".35"/>
</svg>'''

# ---------------------------------------------------------------- contenido técnico compartido
ERRORES = [
 ('Colocar todas las galeras primero y los paneles después', 'Los paneles no ajustan y un error de una galera aparece recién al montar', 'Galera y paneles van juntos, de a un tramo, desde la primera esquina', 'Orden'),
 ('Replanteo por el eje central en vez de la cara exterior', 'La casa queda 3,5 cm más chica por lado; las medidas interiores no dan con el plano', 'Volver a marcar antes de fijar ningún perfil', '1'),
 ('Perfil galera al revés', 'El primer panel no calza o queda corrido', 'Desanclar, girar el perfil (los triángulos para afuera), volver a fijar', '2'),
 ('Perfil galera desnivelado', 'Los cantos superiores de los paneles van "escalonando"', 'Volver a nivelar el perfil antes de seguir; nunca forzarlo con el anclaje', '2'),
 ('Sin banda antivibratoria en una junta o en el perfil', 'Ruido y vibración con viento; se ve metal contra metal', 'Desatornillar la junta, pegar la banda, volver a atornillar', '2 · 4'),
 ('Panel al revés (cara exterior hacia adentro)', 'La etiqueta o las salidas de un panel sanitario quedan del lado equivocado', 'Se desmonta entero; por eso se chequea la etiqueta antes de levantarlo', '3 · 4'),
 ('Atornillar fuera de plomo', 'Al quinto panel, la pared "se va" o la ventana no entra', 'Aflojar, empujar hasta la burbuja, apretar. Controlar cada panel antes del primer tornillo', '3 · 4'),
 ('Menos de 3 tornillos por lado o sin arandela', 'La junta abre al empujar; la chapa deformada alrededor del tornillo', 'Completar a 3 por lado, separación máxima 1 m, siempre con arandela', '4'),
 ('Tornillo corto en la "T"', 'La pared intermedia se mueve al empujarla', 'Reemplazar por los 14 × 6" del kit', '5'),
 ('Ventana sin barrera de agua en la jamba', 'Entra agua con la primera lluvia con viento', 'Sacar la ventana, envolver el vano con la barrera, volver a colocar y sellar', '6'),
 ('Forzar un panel que no entra', 'Se abolla el marco escalonado', 'Nunca se golpea: se levanta y se vuelve a presentar. Si sigue sin entrar, revisar el perfil de abajo', '4'),
 ('Paneles apilados en el suelo o destapados', 'Placas hinchadas o manchadas antes de montar', 'Separar los afectados y consultar; no se montan sin revisar', 'Antes'),
]
ERROR_TODOS = ('Seguir cuando algo no cierra.', 'Un panel que no encaja, una diagonal que no da, una burbuja que no centra: son avisos. '
               'El sistema es preciso a propósito; cuando algo no entra, el error está antes. Volvé un paso.')

GLOSARIO = [
 ('Perfil galera', 'El perfil de arranque. Riel de acero galvanizado de 70 mm fijado a la base (o parado, en una "T") sobre el que apoya el panel.'),
 ('Marco escalonado', 'Perfil Escalón. Borde perimetral del panel; encastra uno en otro. Estanqueidad y hasta 5 mm de nivelación.'),
 ('Perfil de esquina', 'Perfil que resuelve el encuentro de dos paredes en esquina.'),
 ('Solera de remate', 'Solera 70. Perfil en "U" del canto superior de la pared y de los premarcos.'),
 ('Panel', 'Unidad de pared: perfil de acero galvanizado, poliuretano inyectado y placa OSB estructural en las dos caras. 2,47 m de alto; el ancho depende de la familia (A a G).'),
 ('Familia y variante', 'La familia es el ancho del panel (A a G); la variante, si es ciego o trae ventana o puerta (1 a 7). Juntas forman el código: A3.'),
 ('Panel de ajuste de altura', 'Eleva la pared según el proyecto. Hay de 30, 60, 90 y 120 cm en cada familia.'),
 ('Panel sanitario (M.S.)', 'Panel con la instalación sanitaria de baño, cocina o lavadero. Numerados de M.S. 1 a M.S. 20.'),
 ('Planos de replanteo y de panelizado', 'El de replanteo dice dónde va cada pared sobre la base; el de panelizado, qué panel va en cada lugar.'),
 ('Tornillo autoperforante hexagonal', 'Punta mecha (sin agujero previo), cabeza hexagonal, arandela vulcanizada. 14 × 3" en juntas y esquinas; 14 × 6" en "T".'),
 ('Banda antivibratoria', 'Cinta de espuma autoadhesiva que se pone entre metal y metal.'),
 ('Barrera de agua y viento', 'Membrana que deja pasar el vapor y no el agua. Envuelve jambas y cantos.'),
 ('Fijaciones a la base', 'Taco metálico, anclaje metálico, tarugo con tornillo o anclaje químico. Varían según el lugar, la condición y el terreno.'),
 ('Aplomar / nivelar', 'Aplomar: dejar vertical. Nivelar: dejar horizontal. Ambos con el nivel de 2 m.'),
 ('Puntal provisorio', 'Tirante inclinado que sostiene un panel hasta que la esquina lo fija.'),
 ('Jamba · dintel · montante', 'Lados del vano · parte de arriba del vano · perfil vertical del panel donde se fija un marco.'),
 ('Babeta', 'Zinguería que cubre el encuentro pared–techo para que no entre agua.'),
]

QUE_SIGUE = [
 ('Techo', 'Según tu proyecto y sus instrucciones. Va apenas cerrás el perímetro: protege todo lo que sigue.', 'Profesional o vos, según el techo'),
 ('Zinguería', 'Babetas, tapas y canaletas, con banda en cada apoyo y sellador en cada solape.', 'Vos'),
 ('Aberturas exteriores', 'Paso 6. Con el techo puesto, la casa queda cerrada.', 'Vos'),
 ('Conexión de instalaciones', 'Agua, cloaca, electricidad y gas a la red, cableado, tablero, habilitaciones.', 'Matriculado'),
 ('Revestimiento exterior', 'La pintura de frentes PU viene con el kit. El revestimiento (placa cementicia, base y terminación) no viene en el kit: lo comprás aparte.', 'Vos'),
 ('Emplacado interior', 'Placas de yeso sobre la cara interior, masillado, cielorraso. No vienen en el kit. Recién con las instalaciones probadas.', 'Vos'),
 ('Aberturas interiores', 'Paso 6, puertas.', 'Vos'),
 ('Terminaciones', 'Pisos, sanitarios, cocina, pintura. A tu ritmo.', 'Vos'),
 ('Final de obra', 'Documentación municipal.', 'Profesional habilitado'),
]

CHECK_ESTRUCTURA = [
 'Todos los paneles del plano están montados, cada uno en su lugar y con la cara exterior hacia afuera.',
 'Cada junta tiene banda antivibratoria y mínimo 3 tornillos con arandela por lado.',
 'Cada esquina escuadra sin luz, adentro y afuera.',
 'Cada pared en "T" tiene su perfil vertical con tornillos largos.',
 'Todos los paneles a plomo; cantos superiores al ras.',
 'Diagonales iguales en cada ambiente (diferencia máxima 1 cm).',
 'Solera de remate continua en todo el perímetro.',
 'Barrera de agua y viento en el canto superior, solapada hacia afuera.',
]
CHECK_ABERTURAS = [
 'Cada vano de ventana envuelto con barrera de agua y viento.',
 'Ventanas y puertas a plomo, abren y cierran sin rozar, selladas.',
 'Las salidas de los paneles sanitarios, del lado correcto según el plano.',
 'Bocas señalizadas para el matriculado.',
]
CHECK_OBRA = [
 'Sin paneles sobrantes sin explicación (si sobra uno, falta en algún lado).',
 'Puntales provisorios retirados.',
 'Planos guardados con las anotaciones de obra.',
 'Fotos de cada pared terminada, por si hay que consultar después.',
]
WHATSAPP = '+54 9 11 7905-9540'
