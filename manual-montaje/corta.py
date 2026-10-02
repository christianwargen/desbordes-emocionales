# Versión A · CORTA con QR (MC-MAN-001 v1.1 corta). Lo básico en papel; lo técnico, en la web por QR.
from kit import *

P = []
def add(body, section, label, cls=''):
    P.append(page(body, section, label, len(P) + 1, cls=cls))

# 01 · Portada
P.append(f'''<section class="page cover"><div class="in"><div class="logo"></div>
<h1>Manual<br>de montaje.</h1>
<div class="sub">Cómo levantar las paredes de tu casa con el Sistema InBuild, paso por paso. Para vos y para la gente que te va a ayudar.</div>
<div class="ver">Versión corta · lo técnico, en tu celular con QR</div></div>
<div class="ph" style="background-image:url(img/portada.jpg)"></div>
<div class="meta"><span>Paneles estándar · Sistema InBuild</span><span>MC-MAN-001 · v1.1 corta · octubre 2026</span></div></section>''')

# 02 · Cómo usar este manual
add(f'''<h1>Cómo usar este manual.</h1>
<p class="lead">Cada paso tiene una imagen, qué hacer en orden y cómo darte cuenta de que quedó bien. No hace falta saber de obra: hace falta seguir el orden.</p>
<div class="row">
 <div class="col">
  <div class="card w"><h3>Lo que vas a ver en cada página</h3>
   <div class="legend">
    <div><span class="d" style="background:var(--g)">{icon("check",16,"#fff",3)}</span><span><b>Quedó bien si…</b> lo que un montador con experiencia mira sin pensar.</span></div>
    <div><span class="d" style="background:var(--t)">{icon("cross",16,"#fff",3)}</span><span><b>Error común.</b> Lo que más vemos que sale mal, y cómo se evita.</span></div>
    <div><span class="d" style="background:var(--k);font-size:7pt;width:12mm;border-radius:2mm">14×3"</span><span><b>Medida exacta.</b> Tornillos y separaciones: seguilas tal cual.</span></div>
    <div><span class="d" style="background:#fff;border:.5mm solid var(--g)">{icon("phone",16)}</span><span><b>QR.</b> Lo más técnico (cortes, tablas, errores) está en el celular. Escaneá con la cámara.</span></div>
   </div></div>
  <div class="card" style="background:#E5E9EE"><h3 style="color:#3F5F7A">{icon("warn",14,"#3F5F7A")} Lo que no hacés vos</h3>
   <ul class="dots" style="font-size:10.5pt"><li><b>La base</b> (platea u otra fundación): la hace un albañil o un constructor. Este manual arranca con la base terminada, curada y nivelada.</li>
   <li><b>La conexión final de electricidad y gas:</b> un matriculado, por norma.</li>
   <li><b>La documentación municipal:</b> plano, permiso y final de obra, con un profesional habilitado.</li></ul></div>
 </div>
 <div class="col">
  <div class="card" style="background:var(--tl)"><h3 style="color:var(--t)">Tres reglas para todo el montaje</h3>
   <div class="rules">
    <div class="rule"><span class="n">1</span><p><b>Un panel se levanta siempre entre cuatro.</b> Nunca solo, nunca de canto sin sostén.</p></div>
    <div class="rule"><span class="n">2</span><p><b>Se atornilla a plomo y a nivel, no antes.</b> Un panel torcido arrastra a todos los que siguen.</p></div>
    <div class="rule"><span class="n">3</span><p><b>Si algo no encaja, no se fuerza.</b> Revisá el plano y el perfil de abajo; si sigue, preguntá.</p></div>
   </div></div>
  <div class="card w toc" style="padding-top:2mm">
   <div class="sec">Antes de empezar</div><div class="it"><span>Qué recibiste, herramientas, seguridad</span><span>03</span></div>
   <div class="sec">Entender el sistema</div><div class="it"><span>El panel y sus piezas</span><span>04</span></div>
   <div class="it"><span>Familias y variantes</span><span>05</span></div><div class="it"><span>Equivalencias, encuentros, sanitarios</span><span>06</span></div>
   <div class="it"><span>El orden de montaje</span><span>07</span></div>
   <div class="sec">El montaje, paso por paso</div><div class="it"><span>Pasos 1 a 7</span><span>08–13</span></div>
   <div class="sec">Cierre</div><div class="it"><span>Qué sigue y los errores más comunes</span><span>14</span></div><div class="it"><span>Checklist y contacto</span><span>15</span></div>
  </div>
 </div>
</div>''', 'Mercado Casa · Manual de montaje', 'Cómo usarlo')

# 03 · Antes de empezar
add(f'''<h1>Qué recibiste, con qué se monta y cómo cuidarte.</h1>
<div class="row">
 <div class="col"><div class="card"><h3>{icon("box",14)} Cuando llega el kit</h3>
  <p style="font-size:11.5pt">Todo llega en bultos cerrados y etiquetados. <b>Antes de firmar el remito, contá los bultos contra la lista.</b></p>
  <p style="font-size:11.5pt;margin-top:2mm">¿Falta algo o un panel llegó golpeado? Anotalo en el remito, sacale una foto y mandala por WhatsApp el mismo día. <b>Un panel dañado no se monta</b> hasta que te digan qué hacer.</p></div></div>
 <div class="col"><div class="card"><h3>{icon("stack",14)} Cómo guardar los paneles</h3>
  <ol class="acts sm" style="--af:11.5pt"><li><b>Nunca contra el suelo:</b> sobre tirantes o pallets, en un lugar plano.</li><li><b>Máximo 15 por pila</b>, acostados, del mismo ancho.</li>
  <li><b>Tapados</b> si esperan más de un día.</li><li><b>Etiqueta hacia afuera.</b></li><li>Cerca de donde van, según el plano de panelizado.</li></ol></div></div>
</div>
<h2>Qué herramientas necesitás</h2>
<div class="tools" style="--th:24mm">
 <div class="tool"><img src="img/herr-atornilladora.jpg"><b>Atornilladora</b><span>Para unir paneles entre sí y al perfil galera. Punta tubo hexagonal.</span></div>
 <div class="tool"><img src="img/herr-rotopercutora.jpg"><b>Rotopercutora</b><span>Para anclar el perfil galera al piso. Mecha de 8 mm.</span></div>
 <div class="tool"><img src="img/herr-escuadra.jpg"><b>Escuadra</b><span>Para corroborar las esquinas.</span></div>
 <div class="tool"><img src="img/herr-nivel.jpg"><b>Nivel de 2 m</b><span>Para corroborar el plomo de la casa.</span></div>
</div>
<div class="row">
 <div class="col"><div class="card w"><h3>Extras que facilitan la obra</h3><ul class="dots" style="font-size:11pt">
  <li>Plomada o nivel láser · cinta métrica de 8 m, hilo y tiza</li><li>Martillo, maza de goma, pinza, cutter · pistola de sellador</li>
  <li>Escalera doble y dos caballetes · dos tirantes para apuntalar</li><li>Amoladora con disco fino, solo si el plano indica un corte en obra</li></ul></div></div>
 <div class="col"><div class="card" style="background:var(--tl)"><h3 style="color:var(--t)">{icon("glove",14,"#C2563A")} Seguridad</h3><ul class="dots" style="font-size:11pt">
  <li><b>Guantes con agarre, todos, siempre:</b> la chapa corta.</li><li>Zapatos con puntera; anteojos al atornillar y cortar; faja lumbar; casco con paneles en altura.</li>
  <li><b>Nunca un panel de canto sin sostén.</b></li><li><b>No se monta con viento fuerte:</b> un panel levantado es una vela.</li></ul></div></div>
</div>''', 'Antes de empezar', 'Kit · herramientas · seguridad')

# 04 · El panel y sus piezas
add(f'''<h1>El panel. Y las piezas que lo unen.</h1>
<div class="row grow">
 <div class="col" style="flex:.95">{panel_photo("118mm")}{legend()}</div>
 <div class="col" style="flex:1.05"><div class="card w" style="padding:1mm 4mm">
  <div class="piece"><div class="pi"><img src="img/pieza-galera.jpg"></div><div><b>Perfil galera</b><span>El riel fijado a la base sobre el que apoya cada pared. <b>Los triángulos van para afuera.</b> Parado, arranca una pared en "T".</span></div></div>
  <div class="piece"><div class="pi"><img src="img/pieza-marco.jpg"></div><div><b>Marco escalonado</b><span>El borde de cada panel: el escalón de uno encastra en el del siguiente. Da hasta 5 mm para nivelar.</span></div></div>
  <div class="piece"><div class="pi" style="font-weight:800;color:var(--g);font-size:18pt">L</div><div><b>Perfiles de esquina</b><span>Resuelven el encuentro de dos paredes en esquina (pág. 06).</span></div></div>
  <div class="piece"><div class="pi"><img src="img/pieza-tornillos.jpg"></div><div><b>Tornillos con arandela</b><span>Autoperforantes, cabeza hexagonal. Unen panel con panel. Los largos, para la "T".</span></div></div>
  <div class="piece"><div class="pi"><img src="img/pieza-banda.jpg"></div><div><b>Banda antivibratoria</b><span>Entre metal y metal: en el perfil galera y en cada junta. <b>No se saltea.</b></span></div></div>
 </div></div>
</div>
{qr("glosario", "El nombre técnico de cada pieza, para hablar con un profesional")}''', 'Entender el sistema', 'El panel y sus piezas')

# 05 · Familias
fam_cards = ''.join(f'<div style="background:{FAM[f][3]}"><b style="color:{FAM[f][4]}">{f}</b>{FAM[f][2]}<br>{str(FAM[f][0]).replace(".", ",")} m</div>' for f in 'ABCDEFG')
add(f'''<h1>Los paneles estándar: familias y variantes.</h1>
<p class="lead">Todos miden <b>2,47 m de alto</b>. La <b>letra</b> es el ancho (la familia, de la A a la G). El <b>número</b> es lo que trae (la variante). <b>A3</b> = familia A con puerta.</p>
<div class="card w">{svg_familias()}</div>
<div class="fam">{fam_cards}</div>
<h2>Qué trae cada número</h2>
<div class="vtab">
 <div><b>1</b>ciego</div><div><b>2</b>ventana 60×40</div><div><b>3</b>puerta 83×210</div><div><b>4</b>ventana 60×110</div>
 <div><b>5</b>ventana 150×110<br><span class="small">(en la C: 86×110)</span></div><div><b>6</b>ventana 150×40</div><div><b>7</b>puerta 180×210</div><div style="background:var(--gl)"><span class="small">No todas las familias tienen todas las variantes.</span></div>
</div>
<div class="card g note">{icon("level",22)}<div><b>Panel de ajuste de altura.</b> Eleva la pared según el proyecto: hay de 30, 60, 90 y 120 cm en cada familia, y se montan arriba de los paneles (paso 7).</div></div>
<div style="margin-top:auto">{qr("variantes", "Todas las variantes de cada familia, dibujadas y con medidas")}</div>''', 'Entender el sistema', 'Familias y variantes')

# 06 · Equivalencias, encuentros, sanitarios
add(f'''<h1>Equivalencias entre paneles.</h1>
<p class="lead">Un panel A ocupa el mismo largo de pared que cualquiera de estas combinaciones. Vistas en planta, desde arriba.</p>
<div class="card w">{svg_equivalencias()}</div>
<h1 style="font-size:20pt;margin-top:2mm">Encuentros y paneles sanitarios.</h1>
<div class="row">
 <div class="col"><div class="card"><h3>Encuentros</h3><p style="font-size:11.5pt">Las <b>esquinas</b> se resuelven con los <b>perfiles de esquina</b>. El <b>perfil galera</b> resuelve el encuentro del panel con el piso, de panel con panel y de pared con panel (en "T").</p></div>
  {qr("encuentros", "Los dibujos de cada tipo de encuentro", "sm")}</div>
 <div class="col"><div class="card"><h3>Paneles sanitarios</h3><p style="font-size:11.5pt">Traen la instalación del baño, la cocina o el lavadero, numerados de <b>M.S. 1 a M.S. 20</b>. <b>Antes de levantarlo, fijate en el plano de qué lado de la pared tienen que quedar las conexiones.</b></p></div>
  {qr("sanitarios", "Los 20 paneles sanitarios, en planta", "sm")}</div>
</div>''', 'Entender el sistema', 'Equivalencias · encuentros · sanitarios')

# 07 · Orden de montaje
add(f'''<h1>El orden de montaje.</h1>
<p class="lead">Para las paredes usás dos planos del kit: el <b>de replanteo</b> (dónde va cada pared sobre la base) y el <b>de panelizado</b> (qué panel va en cada lugar). Y siempre el mismo orden:</p>
<div class="rules">
 <div class="rule"><span class="n" style="background:var(--g)">1</span><p><b>Primero, una esquina.</b> Asegura la escuadra de toda la casa. Se arma completa: la galera y los dos primeros paneles.</p></div>
 <div class="rule"><span class="n" style="background:var(--g)">2</span><p><b>Después, galeras en línea con los paneles.</b> Fijás un tramo de galera, montás sus paneles, y pasás al tramo siguiente.</p></div>
</div>
{err("<b>Nunca coloques todas las galeras primero y los paneles después.</b> Una galera mal puesta se descubre recién al montar, y los paneles tienen que poder ajustarse a medida que avanzan.", "Nunca")}
<div class="card w"><h3>Un ejemplo de montaje, en planta</h3>{svg_orden()}</div>
<div class="row" style="font-size:11.5pt">
 <div class="col"><div class="note"><span class="d" style="flex:none;width:7mm;height:7mm;border-radius:50%;background:var(--t);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">1</span><span>La primera esquina: galera y dos paneles, a escuadra.</span></div>
  <div class="note"><span style="flex:none;width:7mm;height:7mm;border-radius:50%;background:#3F5F7A;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">3</span><span>Las paredes interiores de ese sector.</span></div></div>
 <div class="col"><div class="note"><span style="flex:none;width:7mm;height:7mm;border-radius:50%;background:var(--g);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">2</span><span>Las paredes que salen de esa esquina, galera y paneles a la vez.</span></div>
  <div class="note"><span style="flex:none;width:7mm;height:7mm;border-radius:50%;background:#8C8C86;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">4</span><span>El resto del montaje, siempre por tramos.</span></div></div>
</div>''', 'Entender el sistema', 'El orden de montaje')

# 08 · Pasos 1 y 2
add(f'''<div class="card g" style="display:flex;gap:5mm;align-items:center;padding:3.5mm 5mm"><div class="stepnum" style="width:14mm;height:14mm;font-size:24pt">1</div>
 <div><h2>Replanteo: marcar dónde va cada pared.</h2><p style="font-size:11pt">Según el plano de replanteo. <b>Se marca por la cara exterior, no por el eje central:</b> si no, la casa queda 3,5 cm más chica por lado.</p></div></div>
{stephead(2, "El perfil galera: el riel de las paredes.")}
<p class="lead">Ese perfil define la posición de todos los paneles: si queda torcido o desnivelado, los paneles lo copian. <b>Andá despacio.</b></p>
<div class="row grow">
 <div class="col" style="flex:1.25">{acts([
  "Identificá la cara exterior: <b>los triángulos van para afuera.</b>",
  "Pegá la <b>banda antivibratoria en las dos caras</b> del perfil, en todo el largo. Limpiá el metal y presioná.",
  "Apoyá el perfil sobre la línea de replanteo.",
  "Controlá el nivel con el nivel de 2 m.",
  "Perforá y fijá. Anclaje químico solo si tu plano lo indica.",
  "Fijá la galera <b>de a un tramo</b>, a medida que avanzan los paneles."], "sm")}
 {chips([("8 mm","mecha"),("N° 8","tarugo con tope"),("5 × 45 mm","tornillo"),("1 m","máx. entre anclajes"),("10 cm","del extremo")])}</div>
 <div class="col" style="flex:.75">{fig("img/galera-foto.jpg","El perfil galera, antes de la banda","height:44mm")}{fig("img/galera-anclajes.jpg","Las fijaciones varían según el lugar y el terreno","flex:1")}</div>
</div>
{err("<b>Perfil al revés</b> (cara exterior hacia adentro): el panel no entra, o entra 3,5 cm corrido. Si el primer panel no calza sin forzar, revisá el perfil antes de tocar el panel.")}
{qr("galera", "Corte técnico: panel, galera, banda, anclaje y zinguería de piso", "sm")}''', 'El montaje', 'Pasos 1 y 2 · Replanteo y perfil galera')

# 09 · Paso 3
add(f'''{stephead(3, "El primer panel y la esquina.")}
<p class="lead">La primera pared es la más difícil porque no tiene nada que la sostenga. Por eso se arranca en una esquina: <b>dos paneles a 90° se sostienen entre sí.</b></p>
{ibs([("people","Entre cuatro"),("level","Nivel de 2 m"),("square","Escuadra"),("drill","Atornilladora")])}
{fig("img/esquina-dibujo.jpg","La esquina de arranque: segundo panel, perfil provisorio de escuadra y puntales","height:60mm")}
{acts([
  "Elegí la esquina con más lugar y buscá en el plano los dos paneles que van ahí.",
  "Levantá el primer panel <b>entre cuatro</b>, cara exterior afuera, y calzalo en el perfil galera.",
  "Aplomalo en las dos direcciones. Uno lo sostiene, otro pone un <b>puntal provisorio</b>.",
  "Levantá el segundo panel y encastralo contra el primero: escalón con escalón.",
  "Poné un perfil provisorio de escuadra arriba, en diagonal, y verificá el ángulo.",
  "<b>Atornillá la esquina.</b> Recién ahí sacá el puntal."])}
{boxes(ok(["Los dos paneles apoyan en todo el perfil, sin luz abajo.","Burbuja centrada en las cuatro caras.","La escuadra apoya entera, sin luz en el vértice."]),
       err("<b>Atornillar el primer panel antes de tener la esquina.</b> Queda fijo pero torcido y la esquina no cierra."))}''', 'El montaje', 'Paso 3 · El primer panel')

# 10 · Paso 4
add(f'''{stephead(4, "Panel a panel: el encastre.")}
<p class="lead">Es el paso que más vas a repetir. El escalón de un panel entra en el del siguiente, con la banda en el medio, y se atornilla de los dos lados. <b>Con práctica, un panel lleva unos minutos.</b></p>
<div class="row grow">
 <div class="col" style="flex:1.1">{acts([
 "Pegá la banda en el borde escalonado del panel ya levantado, de arriba a abajo.",
 "Levantá el siguiente <b>entre cuatro</b>, calzalo en la galera y deslizalo hasta que el escalón entre.",
 "Aplomalo y dejalo a nivel con el anterior arriba.",
 "Atornillá <b>desde adentro</b>: 3 tornillos 14 × 3&quot; con arandela.",
 "Repetí <b>desde afuera</b>: otros 3 tornillos.",
 "Seguí con el siguiente, siempre en el mismo sentido."])}</div>
 <div class="col" style="flex:.9">{fig("img/encastre-axo.jpg","Unión panel–panel: 3 tornillos por lado, máx. 1 m","flex:1")}</div>
</div>
{chips([("14 × 3&quot;","tornillo con arandela"),("3 + 3","tornillos por junta"),("1 m","máx. entre tornillos"),("5 mm","de juego para nivelar")])}
{boxes(ok(["La junta cierra pareja: sin luz a contraluz.","Cantos de arriba al ras: pasás la mano y no hay escalón.","La arandela apretada, sin deformar la chapa."]),
       err("<b>Junta sin banda</b> &quot;porque entraba justo&quot;: la pared hace ruido y vibra con el viento. La banda va siempre, antes de presentar el panel."))}
{qr("encastre", "El corte de la junta: dónde va la banda y por dónde pasa el tornillo", "sm")}''', 'El montaje', 'Paso 4 · Panel a panel')

# 11 · Paso 5
add(f'''{stephead(5, 'Paredes en "T".')}
<p class="lead">La pared que llega perpendicular a otra se une distinto: <b>cambian la pieza del medio y el largo del tornillo.</b> Las esquinas, en cambio, van con perfiles de esquina.</p>
<div class="row" style="height:72mm">{fig("img/t-axo.jpg","Pared en &quot;T&quot;: perfil galera vertical","flex:1.3")}{fig("img/t-foto.jpg","Una &quot;T&quot; real","flex:.9",cls="cover")}</div>
{acts([
 "La pared intermedia arranca con un <b>perfil galera parado</b> (vertical), fijado a la pared ya montada.",
 "Banda antivibratoria <b>solo donde toca chapa con chapa</b>.",
 "Fijá ese perfil con tornillos <b>14 × 6&quot;</b>: los largos del kit, atraviesan todo el panel.",
 "El primer panel encastra en ese perfil como en el del piso. Después, panel a panel como en el paso 4."])}
{chips([("14 × 6&quot;","tornillo largo, solo en la T")])}
{boxes(ok(["Queda a plomo en los dos sentidos.","No se mueve al empujarla."]),
       err("<b>Tornillo corto en la &quot;T&quot;:</b> agarra solo la placa y con el tiempo la pared &quot;baila&quot;. En la &quot;T&quot; van los 14 × 6&quot;, sin excepción."))}
{qr("t", "El corte de la unión en &quot;T&quot;, con la banda y el tornillo largo", "sm")}''', 'El montaje', 'Paso 5 · Paredes en "T"')

# 12 · Paso 6
add(f'''{stephead(6, "Ventanas y puertas.")}
<p class="lead">Las aberturas ya vienen previstas: los paneles con ventana traen el premarco y las puertas vienen con el marco armado. <b>Vos protegés el vano y colocás la abertura a plomo.</b></p>
<div class="row" style="height:46mm">{fig("img/ventana-axo.jpg","","flex:1")}{fig("img/puerta-axo.jpg","","flex:1")}</div>
<div class="row">
 <div class="col" style="flex:1.15"><h2>Ventanas</h2>{acts([
  "Envolvé los 4 lados del vano con <b>barrera de agua y viento</b>, solapada hacia afuera. <b>Obligatorio.</b>",
  "Mirá en el plano si va a filo interior o exterior.",
  "Presentala, calzala con cuñas, aplomá y nivelá.",
  "Fijala al premarco: mínimo 2 tornillos por lado.",
  "Sellador de poliuretano afuera, espuma adentro."], "sm")}</div>
 <div class="col" style="flex:.85"><h2>Puertas</h2>{acts([
  "Presentá el marco, calzalo con cuñas, aplomá los parantes y nivelá el dintel.",
  "Fijalo al montante del panel: <b>3 tornillos por parante</b>.",
  "Colgá la hoja: tiene que cerrar sin rozar. Espuma en el perímetro."], "sm")}</div>
</div>
{boxes(ok(["La barrera envuelve el vano entero, sin arrugas ni cortes.","La hoja abre y cierra sin rozar.","Las diagonales del marco, iguales."]),
       err("<b>Ventana sin barrera</b> &quot;porque se sella después&quot;: el sellador no la reemplaza. A la primera lluvia con viento entra agua por la jamba."))}
{qr("aberturas", "Los cortes de ventana y puerta: premarco, filo y montante", "sm")}''', 'El montaje', 'Paso 6 · Ventanas y puertas')

# 13 · Paso 7
add(f'''{stephead(7, "El remate de arriba.")}
<p class="lead">Con las paredes levantadas, se cierra el borde superior de todas, que es donde después va el techo.</p>
{acts([
  "Colocá la <b>solera de remate</b> sobre el canto superior de cada pared, encajada en el marco escalonado.",
  "Si tu proyecto lleva <b>paneles de ajuste de altura</b>, van ahora, arriba: misma banda y mismos tornillos que cualquier junta.",
  "Envolvé el canto superior con <b>barrera de agua y viento</b>, solapada hacia afuera.",
  "Presentá la <b>zinguería superior</b> (babeta y tapa) con banda en el apoyo. Queda lista para el techo."])}
{chips([("14 × 3&quot;","tornillo de la solera"),("60 cm","entre tornillos")])}
<div class="card w grow" style="display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="height:100%;max-height:95mm;aspect-ratio:120/110">{svg_remate()}</div><div class="small">El borde superior de la pared, en corte. Esquema, no a escala.</div></div>
<div class="card" style="background:#E5E9EE"><h3 style="color:#3F5F7A">{icon("roof",14,"#3F5F7A")} El techo</h3><p style="font-size:11.5pt">No es parte de las paredes: viene según tu proyecto, con sus propias instrucciones. Lo tuyo es dejar el borde superior terminado: <b>solera, barrera y zinguería.</b> Si colocás el techo vos, hacelo apenas cierres el perímetro: adentro queda un lugar seco para seguir.</p></div>''', 'El montaje', 'Paso 7 · El remate de arriba')

# 14 · Qué sigue + errores
rows = ''.join(f'<tr><td class="b" style="color:var(--g)">{i + 1}</td><td class="b">{a}</td><td>{b}</td><td><span class="tag{" p" if c != "Vos" else ""}">{c}</span></td></tr>' for i, (a, b, c) in enumerate(QUE_SIGUE))
add(f'''<h1>Las paredes ya están. ¿Y ahora?</h1>
<p class="lead">Lo que sigue tiene su orden, y en varios pasos entra un profesional. Este es el orden que evita volver atrás.</p>
<table class="t" style="font-size:10pt"><tr><th>#</th><th>Qué</th><th>Qué tener en cuenta</th><th>Quién</th></tr>{rows}</table>
<div style="margin-top:auto;display:flex;flex-direction:column;gap:4mm">
{err(f"<b>{ERROR_TODOS[0]}</b> {ERROR_TODOS[1]}", "El error que engloba a todos")}
{qr("errores", "Los 12 errores más comunes: cómo te das cuenta y cómo se corrigen")}</div>''', 'Cierre', 'Qué sigue · errores')

# 15 · Checklist + contacto
li = lambda xs: '<ul class="checks">' + ''.join(f'<li>{x}</li>' for x in xs) + '</ul>'
add(f'''<h1>Checklist: las paredes están listas cuando podés tildar todo.</h1>
<p class="lead" style="font-size:11.5pt">Recorrelo con alguien más. Lo que no se pueda tildar, se corrige antes de que entre el techo, el matriculado o el emplacado.</p>
<div class="row">
 <div class="col"><div class="card w"><h3>Estructura</h3>{li(CHECK_ESTRUCTURA)}</div></div>
 <div class="col"><div class="card w"><h3>Aberturas y salidas</h3>{li(CHECK_ABERTURAS)}</div><div class="card w"><h3>Obra</h3>{li(CHECK_OBRA)}</div></div>
</div>
<div class="row" style="margin-top:auto">
 <div class="col"><div class="card g"><h3>{icon("chat",14)} Si te trabás, escribinos</h3><p style="font-size:11pt">Mandá al WhatsApp de Mercado Casa una foto del paso en el que estás. Te respondemos por ahí y, si hace falta, con un video, una videollamada o una visita técnica.</p><p style="font-size:15pt;font-weight:800;color:var(--g);margin-top:1.5mm">{WHATSAPP}</p></div></div>
 <div class="col"><div class="card"><h3>Sobre este manual</h3><p style="font-size:9.5pt">Versión corta 1.1, octubre de 2026. Mismo contenido técnico que la versión 1.0; lo más técnico está en {SHORT_URL}. Ante cualquier diferencia entre este manual y los planos de tu proyecto, <b>mandan los planos.</b></p></div></div>
</div>''', 'Cierre', 'Checklist · contacto')

open('Manual de Montaje - corta.html', 'w').write(doc('Mercado Casa · Manual de montaje · versión corta con QR', P))
import json; json.dump(QRS, open('qrs-corta.json', 'w'), indent=1)
print('corta:', len(P), 'páginas;', len(QRS), 'QR')
