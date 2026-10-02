# Versión B · EXTENSA gráfica (MC-MAN-001 v1.1 extensa). Todo en papel: un paso por página, letra grande, apoyo visual.
from kit import *

EXTRA_CSS = '''
ol.acts{--af:15pt;gap:3.4mm}
ol.acts li::before{width:8.4mm;height:8.4mm;font-size:13pt}
ol.acts.sm{--af:13.5pt}
.ok p,.err p,.ok li,.err li{font-size:13pt}
.lead{font-size:13.5pt}
.big-note{font-size:13pt;line-height:1.4}
'''
P = []
def add(body, section, label):
    P.append(page(body, section, label, len(P) + 1))

def num(n, c='var(--g)'):
    return f'<span style="flex:none;width:8mm;height:8mm;border-radius:50%;background:{c};color:#fff;font-weight:800;font-size:12pt;display:flex;align-items:center;justify-content:center">{n}</span>'

# 01 · Portada
P.append(f'''<section class="page cover"><div class="in"><div class="logo"></div>
<h1>Manual<br>de montaje.</h1>
<div class="sub">Cómo levantar las paredes de tu casa con el Sistema InBuild, paso por paso. Para vos y para la gente que te va a ayudar.</div>
<div class="ver">Versión extensa · un paso por página, con dibujos</div></div>
<div class="ph" style="background-image:url(img/portada.jpg)"></div>
<div class="meta"><span>Paneles estándar · Sistema InBuild</span><span>MC-MAN-001 · v1.1 extensa · octubre 2026</span></div></section>''')

# 02 · Índice + cómo leer
toc = [('Antes de empezar', [('Tres reglas y lo que no hacés vos', 3), ('Cuando llega el kit', 4), ('Herramientas y seguridad', 5)]),
       ('Entender el sistema', [('El panel por dentro', 6), ('Las piezas que lo unen', 7), ('Las familias de paneles', 8), ('Las variantes', 9),
                                ('Equivalencias y encuentros', 10), ('Los paneles sanitarios', 11), ('El orden de montaje', 12)]),
       ('El montaje, paso por paso', [('Pasos 1 y 2 · Replanteo y perfil galera', 13), ('Paso 2 · Cómo se fija a la base', 14), ('Paso 3 · El primer panel', 15),
                                      ('Paso 3 · La esquina, terminada', 16), ('Paso 4 · Panel a panel', 17), ('Paso 4 · La junta, en detalle', 18),
                                      ('Paso 5 · Paredes en "T"', 19), ('Paso 6 · Ventanas', 20), ('Paso 6 · Puertas', 21), ('Paso 7 · El remate de arriba', 22)]),
       ('Cierre', [('Qué sigue después de las paredes', 23), ('Los errores más comunes', 24), ('Glosario', 25), ('Checklist y contacto', 26)])]
toc_html = ''.join(f'<div class="sec">{s}</div>' + ''.join(f'<div class="it"><span>{a}</span><span>{b:02d}</span></div>' for a, b in its) for s, its in toc)
add(f'''<h1>Qué hay en este manual.</h1>
<div class="row grow">
 <div class="col"><div class="toc">{toc_html}</div></div>
 <div class="col"><div class="card w"><h3>Cómo leer cada paso</h3>
  <p class="big-note">Cada paso tiene el mismo orden: <b>una imagen, qué hacer y cómo darte cuenta de que quedó bien.</b> No hace falta saber de obra. Hace falta seguir el orden.</p>
  <div class="legend" style="margin-top:3mm">
   <div><span class="d">{icon("check",16,"#fff",3)}</span><span><b>Quedó bien si…</b> Lo que un montador con experiencia mira sin pensar; acá está escrito para que lo mires vos.</span></div>
   <div><span class="d" style="background:var(--t)">{icon("cross",16,"#fff",3)}</span><span><b>Error común.</b> Lo que más vemos que sale mal en ese paso, y cómo se corrige.</span></div>
   <div><span class="d" style="background:var(--k);font-size:7pt;width:12mm;border-radius:2mm">14×3"</span><span><b>Especificación.</b> Medidas de tornillos y separaciones. Son exactas a propósito: seguilas tal cual.</span></div>
   <div><span class="d" style="background:var(--gl)">{icon("people",16)}</span><span><b>Íconos.</b> Con qué herramienta y entre cuántos se hace cada paso.</span></div>
  </div></div>
  <div class="card g"><h3>Este manual y la capacitación</h3><p style="font-size:11.5pt">Este manual no reemplaza la capacitación de un día: la vuelve repetible. Si la hiciste, acá tenés lo que viste, para el día que montás. Si no, anotate en <b>mercadocasa.com.ar/capacitaciones</b>: salís habiendo levantado una pared con tus manos.</p></div>
 </div>
</div>''', 'Mercado Casa · Manual de montaje', 'Índice')

# 03 · Tres reglas + lo que no hacés vos
add(f'''<h1>Tres reglas que valen para todo el montaje.</h1>
<div class="rules" style="gap:5mm">
 <div class="card" style="background:var(--tl);display:flex;gap:6mm;align-items:center"><span class="n" style="flex:none;width:16mm;height:16mm;border-radius:50%;background:var(--t);color:#fff;font-weight:800;font-size:24pt;display:flex;align-items:center;justify-content:center">1</span>
  <div><h2>Un panel se levanta siempre entre cuatro.</h2><p class="big-note">Nunca solo, nunca de canto sin sostén.</p></div>{icon("people",60,"#C2563A",1.6)}</div>
 <div class="card" style="background:var(--tl);display:flex;gap:6mm;align-items:center"><span class="n" style="flex:none;width:16mm;height:16mm;border-radius:50%;background:var(--t);color:#fff;font-weight:800;font-size:24pt;display:flex;align-items:center;justify-content:center">2</span>
  <div><h2>Se atornilla cuando está a plomo y a nivel, no antes.</h2><p class="big-note">Un panel torcido y atornillado arrastra a todos los que siguen.</p></div>{icon("level",60,"#C2563A",1.6)}</div>
 <div class="card" style="background:var(--tl);display:flex;gap:6mm;align-items:center"><span class="n" style="flex:none;width:16mm;height:16mm;border-radius:50%;background:var(--t);color:#fff;font-weight:800;font-size:24pt;display:flex;align-items:center;justify-content:center">3</span>
  <div><h2>Si algo no encaja, no se fuerza.</h2><p class="big-note">Se revisa el plano, se revisa el perfil de abajo, y si sigue sin encajar, se pregunta (pág. 26).</p></div>{icon("warn",60,"#C2563A",1.6)}</div>
</div>
<h1 style="font-size:21pt;margin-top:3mm">Lo que no hacés vos.</h1>
<div class="row">
 <div class="col card" style="background:#E5E9EE"><h3 style="color:#3F5F7A">La base</h3><p style="font-size:12pt">Platea u otra fundación, según tu proyecto: la hace un albañil o un constructor. Este manual arranca con la base <b>terminada, curada y nivelada.</b></p></div>
 <div class="col card" style="background:#E5E9EE"><h3 style="color:#3F5F7A">Luz y gas</h3><p style="font-size:12pt">La conexión final de electricidad y de gas la hace <b>un matriculado</b>, por norma.</p></div>
 <div class="col card" style="background:#E5E9EE"><h3 style="color:#3F5F7A">Los papeles</h3><p style="font-size:12pt">La documentación municipal (plano, permiso y final de obra) va con <b>un profesional habilitado.</b></p></div>
</div>''', 'Antes de empezar', 'Tres reglas')

# 04 · Cuando llega el kit + guardado
add(f'''<h1>Cuando llega el kit.</h1>
<p class="lead">Todo llega en bultos cerrados, con una etiqueta afuera que dice qué hay adentro. <b>Antes de firmar el remito, contá los bultos contra la lista.</b></p>
<div class="card w"><h3>{icon("box",14)} Qué tiene que haber</h3>
 <div class="vtab" style="grid-template-columns:repeat(3,1fr)">
  <div>Paneles</div><div>Perfiles galera (los que se fijan a la base) y soleras de remate (las de arriba)</div><div>Tornillería de montaje</div>
  <div>Fijaciones a la base</div><div>Banda antivibratoria y materiales de montaje, según lo que compraste</div><div>Premarcos de ventanas y marcos de puertas</div>
  <div>Cubierta de chapa y zinguería, según proyecto</div><div>Planos</div><div style="background:var(--gl)"></div>
 </div></div>
{err("<b>¿Falta algo o un panel llegó golpeado?</b> Anotalo en el remito antes de firmar, sacale una foto y mandala por WhatsApp el mismo día (pág. 26). Un panel dañado no se monta hasta que te digan qué hacer.", "Antes de firmar")}
<h1 style="font-size:21pt;margin-top:2mm">Cómo guardar los paneles.</h1>
<div class="row grow">
 <div class="col" style="flex:1.3">{acts(["<b>Nunca contra el suelo:</b> sobre tirantes o pallets, en un lugar plano.",
   "<b>Máximo 15 paneles por pila</b>, acostados, todos del mismo ancho.", "<b>Tapados</b> si van a esperar más de un día.",
   "<b>Con la etiqueta hacia afuera</b>, para encontrar cada panel sin desarmar la pila.", "<b>Cerca de donde van</b>, según el plano de panelizado."])}</div>
 <div class="col" style="flex:.7;justify-content:center">{chips([("15","paneles por pila, máximo"),("1 día","si esperan más: tapados")])}
  <div class="card" style="background:var(--tl)"><p style="font-size:11.5pt"><b>Si se mojan o se apoyan en el suelo,</b> las placas se hinchan o se manchan. Los afectados se separan y se consulta: no se montan sin revisar.</p></div></div>
</div>''', 'Antes de empezar', 'Qué recibiste')

# 05 · Herramientas + seguridad
add(f'''<h1>Qué herramientas necesitás.</h1>
<div class="tools" style="--th:30mm;grid-template-columns:repeat(2,1fr)">
 <div class="tool"><img src="img/herr-atornilladora.jpg"><b>Atornilladora</b><span>Para unir los paneles entre sí y al perfil galera. Con punta tubo hexagonal.</span></div>
 <div class="tool"><img src="img/herr-rotopercutora.jpg"><b>Rotopercutora</b><span>Para anclar el perfil galera al piso. Con mecha de 8 mm.</span></div>
 <div class="tool"><img src="img/herr-escuadra.jpg"><b>Escuadra</b><span>Para corroborar las esquinas.</span></div>
 <div class="tool"><img src="img/herr-nivel.jpg"><b>Nivel de 2 m</b><span>Para corroborar el plomo de la casa.</span></div>
</div>
<div class="row grow">
 <div class="col"><div class="card w"><h3>Extras para que la obra sea más fácil</h3><ul class="dots" style="font-size:11pt">
  <li>Plomada o nivel láser.</li><li>Cinta métrica de 8 m, hilo de albañil y tiza.</li><li>Martillo, maza de goma, pinza, cutter.</li><li>Pistola de sellador.</li>
  <li>Escalera doble y dos caballetes.</li><li>Dos tirantes o perfiles largos para apuntalar.</li><li>Amoladora con disco de corte fino, solo si el plano indica un corte en obra.</li></ul>
  <p class="small" style="margin-top:2mm">Según el proyecto o el equipo, puede hacer falta alguna herramienta más.</p></div></div>
 <div class="col"><div class="card" style="background:var(--tl)"><h3 style="color:var(--t)">{icon("glove",14,"#C2563A")} Seguridad</h3><ul class="dots" style="font-size:11pt">
  <li><b>Guantes con agarre, para todos, todo el tiempo:</b> los bordes de chapa cortan.</li><li>Zapatos cerrados con puntera, anteojos al atornillar y al cortar.</li>
  <li>Faja lumbar para los que levantan paneles.</li><li>Casco cuando hay paneles por encima de la cabeza.</li>
  <li><b>Nunca un panel de canto sin sostén.</b> Apuntalado o sostenido por alguien, siempre.</li><li><b>No se monta con viento fuerte:</b> un panel levantado es una vela.</li>
  <li>Escalera con alguien sujetándola; nada de subirse a pilas de paneles.</li></ul></div></div>
</div>''', 'Antes de empezar', 'Herramientas · seguridad')

# 06 · El panel por dentro
add(f'''<h1>El panel, por dentro.</h1>
<p class="lead">Todo el sistema es un solo tipo de pieza: el panel. Mide 2,47 m de alto y tiene tres capas.</p>
<div class="row grow"><div class="col" style="flex:1.1;justify-content:center">{panel_photo("auto","100%")}</div>
 <div class="col" style="flex:.9;justify-content:center;gap:6mm">
  <div class="card"><div class="legend" style="gap:4mm">
   <div style="font-size:13pt"><span class="d" style="width:9mm;height:9mm;font-size:13pt">1</span><span><b>Placa OSB estructural</b> en las dos caras, con pintura exterior e hidrófuga.</span></div>
   <div style="font-size:13pt"><span class="d" style="width:9mm;height:9mm;font-size:13pt">2</span><span><b>Poliuretano inyectado</b> de 70 mm.</span></div>
   <div style="font-size:13pt"><span class="d" style="width:9mm;height:9mm;font-size:13pt">3</span><span><b>Perfil de acero galvanizado.</b></span></div></div></div>
  {chips([("2,47 m","de alto, todos"),("70 mm","de poliuretano")])}
  <div class="card g"><p style="font-size:12pt"><b>El borde del panel es escalonado:</b> el escalón de uno encastra en el del siguiente. Por eso las juntas cierran sin ruido y te dan hasta 5 mm para nivelar.</p></div>
 </div></div>''', 'Entender el sistema', 'El panel por dentro')

# 07 · Las piezas
def pc(img, name, txt, extra=''):
    im = f'<img src="img/{img}">' if img else f'<span style="font-weight:800;color:var(--g);font-size:26pt">{extra}</span>'
    return (f'<div class="piece" style="padding:3.6mm 0"><div class="pi" style="width:34mm;height:25mm">{im}</div>'
            f'<div><b style="font-size:14pt">{name}</b><span style="font-size:12pt">{txt}</span></div></div>')
add(f'''<h1>Las piezas que unen los paneles.</h1>
<p class="lead">Cada una tiene un nombre técnico: está en el glosario (pág. 25) para cuando hables con un profesional.</p>
<div class="card w" style="padding:1mm 5mm">
 {pc("pieza-galera.jpg","Perfil galera","El perfil de arranque: el riel fijado a la base sobre el que apoya cada pared. Tiene cara exterior: <b>los triángulos van para afuera.</b> Parado, arranca una pared en &quot;T&quot;.")}
 {pc("pieza-marco.jpg","Marco escalonado","El borde de cada panel. El escalón de uno encastra en el del siguiente: juntas estancas, sin ruido, y hasta 5 mm para nivelar.")}
 {pc("","Perfiles de esquina","Resuelven el encuentro de dos paredes en esquina. Hay uno para cada tipo de encuentro (pág. 10).","L")}
 {pc("pieza-tornillos.jpg","Tornillos con arandela","Autoperforantes, cabeza hexagonal, punta mecha, con arandela. Unen panel con panel. Los largos, para paredes en &quot;T&quot;.")}
 {pc("pieza-banda.jpg","Banda antivibratoria","Cinta autoadhesiva entre metal y metal: en el perfil galera (las dos caras) y en cada junta. Corta ruido y vibración. <b>No se saltea.</b>")}
</div>
{chips([("14 × 3&quot;","tornillo en juntas y esquinas"),("14 × 6&quot;","tornillo en la &quot;T&quot;")])}''', 'Entender el sistema', 'Las piezas')

# 08 · Familias
fam_cards = ''.join(f'<div style="background:{FAM[f][3]}"><b style="color:{FAM[f][4]}">{f}</b>{FAM[f][2]}<br><b style="font-size:11pt;display:inline">{str(FAM[f][0]).replace(".", ",")} m</b> de ancho<br>{FAM[f][1]} m²</div>' for f in 'ABCDEFG')
add(f'''<h1>Las familias de paneles.</h1>
<p class="lead">Todos los paneles miden <b>2,47 m de alto.</b> Lo que cambia es el ancho: <b>eso es la familia</b>, de la A a la G. Cada familia tiene su color de referencia, que vas a ver en los planos.</p>
<div class="card w" style="padding:6mm">{svg_familias()}</div>
<div class="fam">{fam_cards}</div>
<div class="card g note big-note">{icon("plan",26)}<div><b>Ojo con el orden:</b> las letras no van de mayor a menor. La F (1,11 m) es más ancha que la E (0,64 m) y la G (0,50 m). Fijate siempre el ancho, no solo la letra.</div></div>
<div class="row">
 <div class="col card"><h3>Panel de ajuste de altura</h3><p style="font-size:12pt">Sirve para elevar la pared, según el proyecto. Dentro de cada familia hay ajustes de <b>30, 60, 90 y 120 cm</b>, y se montan arriba de los paneles (paso 7, pág. 22).</p></div>
 <div class="col card w" style="justify-content:flex-end"><svg viewBox="0 0 100 34" width="100%" font-family="Manrope">
  {''.join(f'<rect x="{x}" y="{30 - h}" width="20" height="{h}" fill="#F6D2D2" stroke="#D9534F" stroke-width=".5"/><text x="{x + 10}" y="33.6" font-size="3.6" font-weight="700" text-anchor="middle">{l}</text>' for x, h, l in [(2, 5, "30 cm"), (27, 10, "60 cm"), (52, 15, "90 cm"), (77, 20, "120 cm")])}</svg></div>
</div>''', 'Entender el sistema', 'Familias')

# 09 · Variantes
add(f'''<h1>Las variantes: qué trae cada panel.</h1>
<p class="lead">El número dice qué trae el panel: ciego, con ventana o con puerta. Letra y número juntos forman el código: <b>A3 es un panel de la familia A con puerta.</b> Medidas de la abertura en cm (ancho × alto).</p>
<div class="card w grow" style="padding:5mm">{svg_variantes(row_h=29)}</div>
<p class="small">Dibujos esquemáticos, a la misma escala entre sí. La posición exacta de cada abertura está en tu plano de panelizado.</p>''', 'Entender el sistema', 'Variantes')

# 10 · Equivalencias + encuentros
add(f'''<h1>Equivalencias entre paneles.</h1>
<p class="lead">Un panel A ocupa el mismo largo de pared que cualquiera de estas combinaciones. Vistas en planta, desde arriba.</p>
<div class="card w">{svg_equivalencias()}</div>
<h1 style="font-size:21pt;margin-top:2mm">Posibles encuentros.</h1>
<p class="lead" style="font-size:12pt">Los <b>perfiles de esquina</b> son la solución para los encuentros en esquina. El <b>perfil galera</b> resuelve el encuentro del panel con el piso, de panel con panel y de pared con panel (en "T"). Vistas en planta.</p>
{fig("img/encuentros.jpg","Perfiles para encuentros en esquina y perfil galera","flex:1;min-height:0",cls="grow")}''', 'Entender el sistema', 'Equivalencias · encuentros')

# 11 · Sanitarios
add(f'''<h1>Los paneles sanitarios.</h1>
<p class="lead">Traen la instalación sanitaria del baño, la cocina o el lavadero. Cada uno tiene su número, de <b>M.S. 1 a M.S. 20</b>. Donde están dibujados los artefactos es donde salen sus conexiones.</p>
{err("<b>Antes de levantarlo, fijate en el plano de qué lado de la pared tienen que quedar las conexiones.</b> Un panel sanitario al revés se desmonta entero.", "Antes de levantar")}
{fig("img/sanitarios.jpg","Los 20 paneles sanitarios, vistos en planta","flex:1",cls="grow")}''', 'Entender el sistema', 'Paneles sanitarios')

# 12 · Orden de montaje
add(f'''<h1>El orden de montaje.</h1>
<p class="lead">Con el kit vienen varios planos. Para las paredes usás dos:</p>
<div class="row">
 <div class="col card g note big-note">{icon("plan",30)}<div><b>Plano de replanteo:</b> dónde va cada pared sobre la base.</div></div>
 <div class="col card g note big-note">{icon("plan",30)}<div><b>Plano de panelizado:</b> qué panel va en cada lugar.</div></div>
</div>
<div class="rules">
 <div class="rule"><span class="n" style="background:var(--g)">1</span><p><b>Primero, una esquina.</b> Asegura la escuadra de toda la casa. Se arma completa: la galera y los dos primeros paneles.</p></div>
 <div class="rule"><span class="n" style="background:var(--g)">2</span><p><b>Después, seguí con las galeras en línea con los paneles.</b> Fijás un tramo de galera, montás sus paneles, y pasás al tramo siguiente.</p></div>
</div>
{err("<b>Nunca coloques todas las galeras primero y los paneles después.</b> Por el error humano: una galera mal puesta se descubre recién al montar. Y porque los paneles tienen que poder ajustarse a medida que avanzan.", "Nunca")}
<div class="card w grow" style="display:flex;flex-direction:column"><h3>Un ejemplo de montaje, en planta</h3><div style="flex:1;min-height:0;display:flex;justify-content:center">{svg_orden()}</div></div>
<div class="row" style="font-size:12pt">
 <div class="col"><div class="note big-note">{num(1, "var(--t)")}<span>La primera esquina: galera y dos paneles, a escuadra.</span></div><div class="note big-note">{num(3, "#3F5F7A")}<span>Las paredes interiores de ese sector.</span></div></div>
 <div class="col"><div class="note big-note">{num(2)}<span>Las paredes que salen de esa esquina, galera y paneles a la vez.</span></div><div class="note big-note">{num(4, "#8C8C86")}<span>El resto del montaje, siempre por tramos.</span></div></div>
</div>''', 'Entender el sistema', 'Orden de montaje')

# 13 · Pasos 1 y 2
add(f'''<div class="card g" style="display:flex;gap:5mm;align-items:center"><div class="stepnum" style="width:15mm;height:15mm;font-size:26pt">1</div>
 <div><h2>Replanteo: marcar dónde va cada pared.</h2><p style="font-size:12pt">Según el plano de replanteo. Se marca por la <b>cara exterior</b>, no por el eje central.</p></div></div>
{stephead(2, "El perfil galera: el riel de las paredes.")}
<p class="lead">Cada pared apoya sobre un perfil fijado a la base. Ese perfil define la posición de todos los paneles: si queda torcido o desnivelado, los paneles lo copian. <b>Es el paso donde más vale la pena ir despacio.</b></p>
{ibs([("drill","Rotopercutora"),("level","Nivel de 2 m"),("band","Banda antivibratoria")])}
<div class="row grow">
 <div class="col" style="flex:1.2">{acts([
  "Identificá la cara exterior del perfil: <b>los triángulos van para afuera.</b>",
  "Pegá la <b>banda antivibratoria en las dos caras</b> del perfil, en todo el largo, antes de fijarlo. Es adhesiva: limpiá el metal y presioná.",
  "Apoyá el perfil sobre la línea de replanteo.",
  "Controlá el nivel con el nivel de 2 m a lo largo del perfil.",
  "Fijá la galera <b>de a un tramo</b>, a medida que avanzan los paneles (pág. 12). Nunca todas primero."])}</div>
 <div class="col" style="flex:.8">{fig("img/galera-foto.jpg","El perfil galera, antes de pegar la banda","flex:1")}</div>
</div>
{err("<b>Replantear por el eje central en vez de la cara exterior.</b> La casa queda 3,5 cm más chica por lado y las medidas interiores no dan con el plano. Se vuelve a marcar antes de fijar ningún perfil.")}''', 'El montaje', 'Pasos 1 y 2 · Replanteo y perfil galera')

# 14 · Paso 2 fijación
add(f'''{stephead(2, "Cómo se fija el perfil a la base.", "Paso 2 · continuación")}
<p class="lead">Perforá y fijá el perfil a la base. Las fijaciones varían según el lugar, la condición y el terreno: <b>si tu plano indica anclaje químico, va ese.</b></p>
{chips([("8 mm","mecha"),("N° 8","tarugo con tope"),("5 × 45 mm","tornillo"),("1 m","máximo entre anclajes"),("10 cm","de cada extremo, siempre")])}
<div class="row grow">
 {fig("img/galera-anclajes.jpg","Taco metálico, anclaje metálico o tarugo con tornillo","flex:.75")}
 {fig("img/galera-corte.jpg","Corte: panel, perfil galera, banda antivibratoria, anclaje y zinguería de piso","flex:1.25")}
</div>
{boxes(ok(["El perfil sigue la línea de replanteo de punta a punta.","La burbuja del nivel queda centrada en todo el largo.","Hay un anclaje a 10 cm de cada extremo."]),
       err("<b>Perfil al revés</b> (cara exterior hacia adentro). El panel no entra, o entra 3,5 cm corrido. Se nota en el primer panel: si no calza sin forzar, antes de tocar el panel revisá el perfil."))}''', 'El montaje', 'Paso 2 · Fijación a la base')

# 15 · Paso 3
add(f'''{stephead(3, "El primer panel y la esquina.")}
<p class="lead">La primera pared que levantás es la más difícil, porque no tiene nada que la sostenga. Por eso se arranca en una esquina: <b>dos paneles a 90° se sostienen entre sí.</b> Hasta que eso pase, cada panel va apuntalado.</p>
{ibs([("people","Entre cuatro"),("level","Nivel de 2 m"),("square","Escuadra"),("drill","Atornilladora")])}
{fig("img/esquina-dibujo.jpg","La esquina de arranque: segundo panel, perfil provisorio de escuadra y puntales","height:78mm")}
{acts([
 "Elegí la esquina con más lugar para moverse, y buscá en el plano los dos paneles que van ahí.",
 "Levantá el primer panel <b>entre cuatro</b>, de canto, con la cara exterior hacia afuera, y guiá el borde de abajo hasta que calce en el perfil galera.",
 "Aplomalo con el nivel de 2 m en el canto, en las dos direcciones. Mientras uno lo sostiene, otro coloca un <b>puntal provisorio</b>."])}''', 'El montaje', 'Paso 3 · El primer panel')

# 16 · Paso 3 cont.
add(f'''{stephead(3, "La esquina, terminada.", "Paso 3 · continuación")}
<div class="row grow">
 <div class="col" style="flex:1.15"><ol class="acts" style="counter-reset:a 3">
  <li>Levantá el <b>segundo panel</b>, el que forma la esquina, y presentalo contra el primero: el borde escalonado de uno entra en el del otro.</li>
  <li>Colocá un <b>perfil provisorio de escuadra</b> arriba, uniendo los dos paneles en diagonal, y verificá el ángulo con la escuadra.</li>
  <li><b>Atornillá la esquina</b>, y recién ahí sacá el puntal del primer panel. La esquina ya se sostiene sola.</li></ol></div>
 <div class="col" style="flex:.85">{fig("img/esquina-foto.jpg","Una esquina real, vista desde arriba","flex:1",cls="cover")}</div>
</div>
{ok(["Los dos paneles apoyan en todo el largo del perfil, sin luz abajo.","Plomada en las cuatro caras: burbuja centrada.","La escuadra apoya entera contra los dos paneles, sin luz en el vértice."])}
{err("<b>Atornillar el primer panel al perfil antes de tener la esquina.</b> Queda fijo pero torcido, y la esquina no cierra. El primer panel se atornilla con la esquina armada y controlada, no antes.")}''', 'El montaje', 'Paso 3 · La esquina')

# 17 · Paso 4
add(f'''{stephead(4, "Panel a panel: el encastre.")}
<p class="lead">Es el paso que vas a repetir más veces. El escalón de cada panel entra en el del siguiente, con la banda antivibratoria en el medio, y se fija con tornillos de lado a lado. <b>Una vez que le agarrás la mano, un panel lleva unos minutos.</b></p>
{ibs([("people","Entre cuatro"),("band","Banda"),("level","Nivel de 2 m"),("drill","Atornilladora")])}
<div class="row grow">
 <div class="col" style="flex:1.2">{acts([
  "Pegá la banda antivibratoria en el borde escalonado del panel que ya está levantado, de arriba a abajo.",
  "Levantá el siguiente panel <b>entre cuatro</b>, calzalo en el perfil galera y deslizalo hasta que el escalón entre en el escalón.",
  "Aplomalo y controlá que quede a nivel con el anterior arriba: el marco escalonado te da hasta 5 mm de juego para corregir.",
  "Atornillá <b>desde adentro</b>: el tornillo atraviesa el escalón de un panel y muerde el del otro.",
  "Repetí <b>del otro lado de la junta</b> (afuera), mismos 3 tornillos.",
  "Seguí con el siguiente, siempre en el mismo sentido a lo largo del eje, hasta terminar la pared."], "sm")}</div>
 <div class="col" style="flex:.8">{fig("img/encastre-axo.jpg","3 tornillos por lado, separación máxima 1 m","flex:1")}</div>
</div>
{chips([("14 × 3&quot;","autoperforante hexagonal con arandela"),("3 + 3","tornillos por junta"),("1 m","máximo entre tornillos"),("5 mm","de juego")])}''', 'El montaje', 'Paso 4 · Panel a panel')

# 18 · Paso 4 detalle
add(f'''{stephead(4, "La junta, en detalle.", "Paso 4 · continuación")}
<p class="lead">Así queda una junta vista desde arriba: el escalón de un panel dentro del otro, la banda en el medio y el tornillo que los une.</p>
{fig("img/encastre-corte.jpg","Corte de la unión panel–panel: banda antivibratoria y tornillo autoperforante 14 × 3&quot;","height:62mm")}
{ok(["La junta cierra pareja de arriba a abajo: no hay luz al mirar a contraluz.","Los cantos superiores de los dos paneles quedan al ras: pasás la mano y no hay escalón.","La arandela de cada tornillo quedó apretada contra la chapa, sin deformarla."])}
{err("<b>Junta sin banda antivibratoria &quot;porque el panel entraba justo&quot;.</b> Después la pared transmite ruido y vibra con el viento, y para corregirlo hay que desatornillar. La banda va siempre, antes de presentar el panel.")}
{err("<b>Forzar un panel que no entra.</b> Se abolla el marco escalonado. Nunca se golpea: se levanta y se vuelve a presentar. Si sigue sin entrar, revisá el perfil de abajo.", "Otro error común")}''', 'El montaje', 'Paso 4 · La junta')

# 19 · Paso 5
add(f'''{stephead(5, 'Paredes en "T".')}
<p class="lead">La pared intermedia que llega perpendicular a otra se une distinto: <b>cambian la pieza del medio y el largo del tornillo.</b> Las esquinas, en cambio, se resuelven con los perfiles de esquina (pág. 10).</p>
<div class="row" style="height:64mm">{fig("img/t-axo.jpg","Pared en &quot;T&quot;: perfil galera vertical y tornillos largos","flex:1.2")}{fig("img/t-foto.jpg","Una &quot;T&quot; real","flex:.8",cls="cover")}</div>
{acts([
 "La pared intermedia arranca con un <b>perfil galera parado</b> (vertical), fijado a la pared que ya está montada. Ahí la banda va <b>solo donde toca chapa con chapa.</b>",
 "Fijá ese perfil vertical con tornillos <b>14 × 6&quot;</b>: son los largos del kit, porque atraviesan todo el panel.",
 "El primer panel de la pared intermedia encastra en ese perfil como en el perfil del piso.",
 "De ahí en adelante, panel a panel como en el paso 4."], "sm")}
{fig("img/t-corte.jpg","","height:30mm")}
{boxes(ok(["Queda a plomo en los dos sentidos.","No se mueve al empujarla."]),
       err("<b>Usar el tornillo corto en la &quot;T&quot;.</b> Agarra solo la placa y con el tiempo la pared intermedia &quot;baila&quot;. En la &quot;T&quot; van los 14 × 6&quot;, sin excepción."))}''', 'El montaje', 'Paso 5 · Paredes en "T"')

# 20 · Paso 6 ventanas
add(f'''{stephead(6, "Ventanas.")}
<p class="lead">Las aberturas no se "hacen": ya vienen previstas. Los paneles con ventana traen el <b>premarco armado dentro del panel.</b> Lo que hacés vos es proteger el vano y colocar la abertura a plomo.</p>
<div class="row" style="height:70mm">{fig("img/ventana-axo.jpg","Panel con premarco de ventana","flex:1.1")}{fig("img/ventana-completo.jpg","Cortes del vano","flex:.9")}</div>
{acts([
 "Con el panel ya montado y atornillado, envolvé toda la jamba (los cuatro lados del vano) con la <b>barrera de agua y viento</b>, pegada y solapada hacia afuera. <b>Es obligatorio.</b>",
 "Mirá en el plano si la ventana va a <b>filo interior o a filo exterior</b> de la pared.",
 "Presentá la ventana en el premarco, calzala con cuñas, aplomá y nivelá: tiene que abrir y cerrar sin rozar.",
 "Fijala al premarco con los tornillos de la ventana, <b>mínimo dos por lado.</b>",
 "Sellá el perímetro exterior con sellador de poliuretano y el interior con espuma. Cortá el sobrante cuando cure."], "sm")}
{err("<b>Colocar la ventana sin la barrera &quot;porque se sella después&quot;.</b> El sellador no reemplaza a la barrera: a la primera lluvia con viento el agua entra por la jamba. Se saca la ventana y se hace de nuevo.")}''', 'El montaje', 'Paso 6 · Ventanas')

# 21 · Paso 6 puertas
add(f'''{stephead(6, "Puertas.", "Paso 6 · continuación")}
<p class="lead">Las puertas vienen con el <b>marco ensamblado.</b> Se fija al montante del panel: el perfil que cierra el vano.</p>
<div class="row" style="height:92mm">{fig("img/puerta-axo.jpg","Panel de puerta","flex:1.1")}{fig("img/puerta-completo.jpg","El marco se fija al montante del panel","flex:.9")}</div>
{acts([
 "Presentá el marco en el vano, calzalo con cuñas, <b>aplomá los dos parantes</b> y nivelá el dintel.",
 "Fijá el marco al montante del panel: <b>tres tornillos por parante.</b>",
 "Colgá la hoja y verificá que cierre sin rozar. Espuma en el perímetro; cortá el sobrante."])}
{chips([("3","tornillos por parante"),("2","tornillos por lado, mínimo, en ventanas")])}
{ok(["La barrera de agua envuelve el vano entero, sin arrugas ni cortes.","La hoja abre y cierra sola sin rozar, en cualquier posición.","La diagonal del marco es igual en los dos sentidos."])}''', 'El montaje', 'Paso 6 · Puertas')

# 22 · Paso 7
add(f'''{stephead(7, "El remate de arriba.")}
<p class="lead">Con las paredes levantadas, se cierra el borde superior de todas, que es donde después va el techo.</p>
<div class="row grow">
 <div class="col" style="flex:1.15">{acts([
  "Colocá la <b>solera de remate</b> sobre el canto superior de cada pared, encajada en el marco escalonado, y fijala con tornillos 14 × 3&quot; cada 60 cm.",
  "Si tu proyecto lleva <b>paneles de ajuste de altura</b>, van ahora, arriba de los paneles ya montados, con la misma banda y los mismos tornillos que cualquier junta.",
  "Envolvé el canto superior con <b>barrera de agua y viento</b>, solapada hacia afuera.",
  "Presentá la <b>zinguería superior</b> (babeta y tapa) con banda antivibratoria en el apoyo. Queda lista para recibir el techo."], "sm")}
  {chips([("14 × 3&quot;","tornillo de la solera"),("60 cm","entre tornillos")])}</div>
 <div class="col" style="flex:.85"><div class="card w" style="flex:1;display:flex;flex-direction:column;justify-content:center">{svg_remate()}<div class="small" style="margin-top:2mm">El borde superior, en corte. Esquema, no a escala.</div></div></div>
</div>
<div class="card" style="background:#E5E9EE"><h3 style="color:#3F5F7A">{icon("roof",14,"#3F5F7A")} El techo</h3><p style="font-size:12pt">El techo no es parte de las paredes: viene según tu proyecto y se coloca siguiendo sus propias instrucciones. Lo que sí es tuyo es dejar el borde superior de las paredes terminado: <b>solera, barrera y zinguería.</b> Si vas a colocar el techo vos, hacelo apenas cierres el perímetro: adentro queda un lugar seco para seguir trabajando.</p></div>''', 'El montaje', 'Paso 7 · El remate de arriba')

# 23 · Qué sigue
rows = ''.join(f'<tr><td class="b" style="color:var(--g);font-size:14pt">{i + 1}</td><td class="b">{a}</td><td>{b}</td><td><span class="tag{" p" if c != "Vos" else ""}">{c}</span></td></tr>' for i, (a, b, c) in enumerate(QUE_SIGUE))
add(f'''<h1>Las paredes ya están levantadas. ¿Y ahora?</h1>
<p class="lead">Este manual termina donde terminan las paredes. Lo que sigue tiene su orden, y en varios pasos entra un profesional. Este es el orden que evita volver atrás.</p>
<table class="t" style="font-size:11.5pt"><tr><th>#</th><th>Qué</th><th>Qué tener en cuenta</th><th>Quién</th></tr>{rows}</table>
<div style="margin-top:auto">{err(f"<b>{ERROR_TODOS[0]}</b> {ERROR_TODOS[1]}", "Antes de seguir: el error que engloba a todos")}</div>''', 'Cierre', 'Qué sigue')

# 24 · Errores
rows = ''.join(f'<tr><td class="b">{a}</td><td>{b}</td><td>{c}</td><td class="b" style="color:var(--g)">{d}</td></tr>' for a, b, c, d in ERRORES)
add(f'''<h1>Los errores más comunes. Y cómo se corrigen.</h1>
<p class="lead" style="font-size:12pt">Todos los que están acá los vimos en obra. Ninguno es grave si se agarra a tiempo; casi todos son caros si se descubren con la pared tapada.</p>
<table class="t" style="font-size:9.3pt"><tr><th style="width:27%">El error</th><th style="width:29%">Cómo te das cuenta</th><th>Cómo se corrige</th><th>Paso</th></tr>{rows}</table>
<div class="card" style="margin-top:auto;padding:3mm 5mm"><p style="font-size:9pt"><b>Sobre este manual.</b> Versión 1.1 extensa, octubre de 2026: el mismo contenido técnico de la 1.0, con más imágenes. Si encontraste algo que acá no está o que no funcionó así, contánoslo por WhatsApp. <b>Ante cualquier diferencia con los planos de tu proyecto, mandan los planos.</b></p></div>''', 'Cierre', 'Errores más comunes')

# 25 · Glosario
rows = ''.join(f'<tr><td class="b" style="width:33%">{a}</td><td>{b}</td></tr>' for a, b in GLOSARIO)
add(f'''<h1>Glosario: el nombre técnico de cada cosa.</h1>
<p class="lead" style="font-size:12pt">Para cuando hables con un albañil, un matriculado o con nosotros.</p>
<table class="t" style="font-size:10.3pt">{rows}</table>
''', 'Cierre', 'Glosario')

# 26 · Checklist + contacto
li = lambda xs: '<ul class="checks">' + ''.join(f'<li>{x}</li>' for x in xs) + '</ul>'
add(f'''<h1>Checklist: las paredes están listas cuando podés tildar todo esto.</h1>
<p class="small" style="font-size:11pt">Recorrelo con alguien más. Lo que no se pueda tildar, se corrige antes de que entre el techo, el matriculado o el emplacado.</p>
<div class="row">
 <div class="col"><div class="card w"><h3>Estructura</h3>{li(CHECK_ESTRUCTURA)}</div></div>
 <div class="col"><div class="card w"><h3>Aberturas y salidas</h3>{li(CHECK_ABERTURAS)}</div><div class="card w"><h3>Obra</h3>{li(CHECK_OBRA)}</div></div>
</div>
<div class="row">
 <div class="col"><div class="card g"><h3>{icon("chat",14)} Si te trabás, escribinos</h3><p style="font-size:11pt">Escribí al WhatsApp de Mercado Casa con una foto del paso en el que estás. Te respondemos por ahí y, si hace falta, con un video, una videollamada o una visita técnica.</p><p style="font-size:16pt;font-weight:800;color:var(--g);margin-top:1.5mm">{WHATSAPP}</p></div></div>
 <div class="col"><div class="card"><h3>Antes de escribir, fijate</h3><ul class="dots" style="font-size:10.5pt"><li>¿Está en la tabla de errores (pág. 24)?</li><li>¿El perfil de abajo está a nivel y con los triángulos para afuera?</li><li>¿El panel es el que dice el plano para ese lugar?</li><li>¿Probaste levantarlo y volver a presentarlo, en vez de forzarlo?</li></ul></div></div>
</div>
''', 'Cierre', 'Checklist · contacto')

h = doc('Mercado Casa · Manual de montaje · versión extensa', P).replace('</style>', EXTRA_CSS + '</style>', 1)
open('Manual de Montaje - extensa.html', 'w').write(h)
print('extensa:', len(P), 'páginas')
