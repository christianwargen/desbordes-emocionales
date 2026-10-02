# Página web de los QR: mercadocasa.com.ar/manual — secciones con ancla, pensada para el celular.
import json, os, shutil
from parts import *

OUT = 'web/manual'
os.makedirs(OUT + '/img', exist_ok=True)
IMGS = ['encuentros.jpg', 'sanitarios.jpg', 'galera-corte.jpg', 'galera-anclajes.jpg', 'encastre-completo.jpg', 'encastre-corte.jpg',
        't-completo.jpg', 't-corte.jpg', 'ventana-completo.jpg', 'puerta-completo.jpg', 'panel-foto.jpg', 'mercado-casa-isotipo.png']
for f in IMGS: shutil.copy('img/' + f, f'{OUT}/img/{f}')

def im(src, cap):
    return f'<figure><a href="img/{src}" target="_blank" rel="noopener"><img src="img/{src}" alt="{esc(cap)}" loading="lazy"></a><figcaption>{cap} · <span>tocá para ampliar</span></figcaption></figure>'

nav = [('encuentros', 'Encuentros'), ('variantes', 'Variantes'), ('sanitarios', 'Sanitarios'), ('galera', 'Perfil galera'),
       ('encastre', 'Panel a panel'), ('t', 'Paredes en "T"'), ('aberturas', 'Ventanas y puertas'), ('errores', 'Errores'), ('glosario', 'Glosario')]

errores = ''.join(f'<div class="e"><div class="eh"><b>{esc(a)}</b><span>{"Paso " + d if d[0].isdigit() else ("Orden de montaje" if d == "Orden" else "Antes de empezar")}</span></div>'
                  f'<p><em>Cómo te das cuenta:</em> {esc(b)}</p><p><em>Cómo se corrige:</em> {esc(c)}</p></div>' for a, b, c, d in ERRORES)
glos = ''.join(f'<div class="g"><b>{esc(a)}</b><p>{esc(b)}</p></div>' for a, b in GLOSARIO)

html_ = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manual de montaje · Detalles técnicos · Mercado Casa</title>
<meta name="description" content="Detalles técnicos del Manual de montaje de Mercado Casa (Sistema InBuild): encuentros, variantes, paneles sanitarios, cortes, errores comunes y glosario.">
<meta name="theme-color" content="#2A8B4E"><link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{{--g:#2A8B4E;--gd:#1F6E3D;--gl:#E7F2EA;--c:#F7F2EA;--k:#1A1F1C;--t:#C2563A;--tl:#F7E4DE;--m:#5E6660;--ln:#E2DCD1}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{scroll-behavior:smooth;scroll-padding-top:64px}}
body{{font-family:Manrope,system-ui,sans-serif;color:var(--k);background:#fff;font-size:17px;line-height:1.5;-webkit-text-size-adjust:100%}}
header{{background:var(--g);color:#fff;padding:22px 16px 26px}}
header .brand{{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;letter-spacing:.02em}}
header .brand i{{width:28px;height:28px;background:#F7F2EA;-webkit-mask:url(img/mercado-casa-isotipo.png) center/contain no-repeat;mask:url(img/mercado-casa-isotipo.png) center/contain no-repeat}}
header h1{{font-size:30px;line-height:1.1;margin-top:18px;font-weight:800;letter-spacing:-.02em}}
header p{{margin-top:8px;opacity:.92;font-size:16px}}
nav{{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--ln);overflow-x:auto;white-space:nowrap;padding:10px 12px;-webkit-overflow-scrolling:touch}}
nav a{{display:inline-block;margin-right:6px;padding:7px 12px;border-radius:99px;background:var(--gl);color:var(--gd);font-weight:700;font-size:14px;text-decoration:none}}
main{{max-width:760px;margin:0 auto;padding:0 16px 40px}}
section{{padding:30px 0 10px;border-bottom:1px solid var(--ln)}}
section:target h2{{color:var(--t)}}
.k{{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--g);font-weight:800}}
h2{{font-size:25px;line-height:1.15;margin:4px 0 10px;font-weight:800;color:var(--g)}}
h3{{font-size:18px;margin:18px 0 6px}}
p{{margin:8px 0}}
figure{{margin:14px 0;background:#fff;border:1px solid var(--ln);border-radius:12px;overflow:hidden}}
figure img{{width:100%;display:block}}
figcaption{{font-size:13px;color:var(--m);padding:8px 12px;border-top:1px solid var(--ln);background:var(--c)}}
figcaption span{{color:var(--g);font-weight:700}}
.chips{{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}}
.chip{{background:var(--k);color:#fff;border-radius:9px;padding:7px 11px;line-height:1.1}}
.chip b{{display:block;font-size:20px}}.chip span{{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.8}}
.warn{{background:var(--tl);border-left:5px solid var(--t);border-radius:10px;padding:12px 14px;margin:14px 0}}
.warn b{{color:var(--t)}}
.svgwrap{{overflow-x:auto;border:1px solid var(--ln);border-radius:12px;padding:10px;margin:14px 0}}
.svgwrap svg{{min-width:640px}}
.e{{border:1px solid var(--ln);border-radius:12px;padding:12px 14px;margin:12px 0}}
.eh{{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}}
.eh span{{flex:none;font-size:12px;font-weight:800;background:var(--gl);color:var(--gd);border-radius:6px;padding:3px 8px}}
.e em{{font-style:normal;font-weight:800;color:var(--m)}}
.g{{padding:12px 0;border-bottom:1px solid var(--ln)}}.g:last-child{{border:0}}
.g p{{margin:2px 0 0}}
footer{{background:var(--c);padding:24px 16px 40px;font-size:15px}}
footer .w{{max-width:760px;margin:0 auto}}
footer a{{color:var(--g);font-weight:800}}
.top{{display:inline-block;margin:14px 0 4px;font-size:14px;color:var(--g);font-weight:700;text-decoration:none}}
</style></head><body>
<header><div class="brand"><i></i>mercado casa</div>
<h1>Manual de montaje:<br>los detalles técnicos.</h1>
<p>Lo que el manual impreso deja para el celular. Cada QR del manual te trae directo a su sección.</p></header>
<nav>{''.join(f'<a href="#{a}">{b}</a>' for a, b in nav)}</nav>
<main>

<section id="encuentros"><div class="k">Entender el sistema · pág. 06</div><h2>Posibles encuentros.</h2>
<p>Los <b>perfiles de esquina</b> son la solución para los encuentros en esquina. El <b>perfil galera</b> resuelve el encuentro del panel con el piso, de panel con panel y de pared con panel (en "T"). Vistas en planta.</p>
{im("encuentros.jpg", "Perfiles para encuentros en esquina y perfil galera")}
<h3>Equivalencias entre paneles</h3><p>Un panel A ocupa el mismo largo de pared que estas combinaciones:</p>
<div class="svgwrap">{svg_equivalencias()}</div><a class="top" href="#">↑ Volver arriba</a></section>

<section id="variantes"><div class="k">Entender el sistema · pág. 05</div><h2>Todas las variantes.</h2>
<p>Todos los paneles miden <b>2,47 m de alto</b>. La letra es la familia (el ancho) y el número, la variante (lo que trae). <b>A3</b> es un panel de la familia A con puerta. Medidas de la abertura en cm (ancho × alto).</p>
<div class="svgwrap">{svg_variantes(row_h=29)}</div>
<p style="font-size:14px;color:var(--m)">Deslizá de costado para ver todas. Dibujos esquemáticos; la posición exacta de cada abertura está en tu plano de panelizado.</p>
<h3>Panel de ajuste de altura</h3><p>Eleva la pared según el proyecto. En cada familia hay ajustes de <b>30, 60, 90 y 120 cm</b>, y se montan arriba de los paneles (paso 7).</p><a class="top" href="#">↑ Volver arriba</a></section>

<section id="sanitarios"><div class="k">Entender el sistema · pág. 06</div><h2>Los paneles sanitarios.</h2>
<p>Traen la instalación sanitaria del baño, la cocina o el lavadero, numerados de <b>M.S. 1 a M.S. 20</b>. Donde están dibujados los artefactos es donde salen sus conexiones. Vistas en planta.</p>
<div class="warn"><b>Antes de levantarlo,</b> fijate en el plano de qué lado de la pared tienen que quedar las conexiones.</div>
{im("sanitarios.jpg", "Los 20 paneles sanitarios, en planta")}<a class="top" href="#">↑ Volver arriba</a></section>

<section id="galera"><div class="k">Paso 2 · pág. 08</div><h2>El perfil galera, en corte.</h2>
<p>El perfil se apoya sobre la línea de replanteo, con la <b>banda antivibratoria en las dos caras</b> y <b>los triángulos para afuera</b>.</p>
<div class="chips"><div class="chip"><b>8 mm</b><span>mecha</span></div><div class="chip"><b>N° 8</b><span>tarugo con tope</span></div><div class="chip"><b>5 × 45 mm</b><span>tornillo</span></div><div class="chip"><b>1 m</b><span>máx. entre anclajes</span></div><div class="chip"><b>10 cm</b><span>de cada extremo</span></div></div>
<p>O anclaje químico, si tu plano lo indica. <b>Las fijaciones a la base varían según el lugar, la condición y el terreno.</b></p>
{im("galera-corte.jpg", "Corte: panel, perfil galera, banda antivibratoria, anclaje y zinguería de piso")}
{im("galera-anclajes.jpg", "Cómo se ancla al piso: taco metálico, anclaje metálico o tarugo con tornillo")}<a class="top" href="#">↑ Volver arriba</a></section>

<section id="encastre"><div class="k">Paso 4 · pág. 10</div><h2>La junta panel a panel.</h2>
<p>El escalón de un panel entra en el del otro, con la banda antivibratoria en el medio. Se atornilla desde adentro y desde afuera: el tornillo atraviesa el escalón de un panel y muerde el del otro.</p>
<div class="chips"><div class="chip"><b>14 × 3"</b><span>autoperforante hexagonal con arandela</span></div><div class="chip"><b>3 + 3</b><span>tornillos por junta</span></div><div class="chip"><b>1 m</b><span>máx. entre tornillos</span></div><div class="chip"><b>5 mm</b><span>de juego para nivelar</span></div></div>
{im("encastre-completo.jpg", "Unión panel–panel alineados: 3 tornillos por lado, separación máxima 1 m, banda en la junta")}<a class="top" href="#">↑ Volver arriba</a></section>

<section id="t"><div class="k">Paso 5 · pág. 11</div><h2>La unión en "T".</h2>
<p>La pared intermedia arranca con un <b>perfil galera parado</b> (vertical), fijado a la pared ya montada, con tornillos <b>14 × 6"</b>: los largos del kit, porque atraviesan todo el panel. La banda va solo donde toca chapa con chapa.</p>
<div class="warn"><b>Nunca el tornillo corto en la "T":</b> agarra solo la placa y con el tiempo la pared intermedia "baila".</div>
{im("t-completo.jpg", "Pared en &quot;T&quot;: perfil galera vertical y tornillos largos")}<a class="top" href="#">↑ Volver arriba</a></section>

<section id="aberturas"><div class="k">Paso 6 · pág. 12</div><h2>Ventanas y puertas, en corte.</h2>
<p>Los paneles con ventana traen el <b>premarco armado</b>; las puertas vienen con el <b>marco ensamblado</b>, que se fija al <b>montante del panel</b> (el perfil que cierra el vano) con tres tornillos por parante. Mirá en el plano si la ventana va a filo interior o exterior.</p>
{im("ventana-completo.jpg", "Panel con premarco de ventana")}
{im("puerta-completo.jpg", "Panel de puerta: el marco se fija al montante del panel")}
<div class="warn"><b>La barrera de agua y viento es obligatoria:</b> envuelve los cuatro lados del vano, solapada hacia afuera, antes de colocar la ventana. El sellador no la reemplaza.</div><a class="top" href="#">↑ Volver arriba</a></section>

<section id="errores"><div class="k">Cierre · pág. 14</div><h2>Los errores más comunes. Y cómo se corrigen.</h2>
<p>Todos los que están acá los vimos en obra. Ninguno es grave si se agarra a tiempo; casi todos son caros si se descubren con la pared tapada.</p>
{errores}
<div class="warn"><b>{ERROR_TODOS[0]}</b> {ERROR_TODOS[1]}</div><a class="top" href="#">↑ Volver arriba</a></section>

<section id="glosario" style="border:0"><div class="k">Pág. 04</div><h2>Glosario: el nombre técnico de cada cosa.</h2>
<p>Para cuando hables con un albañil, un matriculado o con nosotros.</p>{glos}<a class="top" href="#">↑ Volver arriba</a></section>
</main>
<footer><div class="w"><b>¿Te trabaste?</b> Escribinos al WhatsApp de Mercado Casa con una foto del paso en el que estás: <a href="https://wa.me/5491179059540">{WHATSAPP}</a>.<br><br>
Manual de montaje MC-MAN-001 · v1.1 · octubre 2026 · Sistema InBuild. Ante cualquier diferencia entre este manual y los planos de tu proyecto, mandan los planos.<br><br><a href="/">mercadocasa.com.ar</a></div></footer>
</body></html>'''
open(f'{OUT}/index.html', 'w').write(html_)
print('web ok', len(html_))
