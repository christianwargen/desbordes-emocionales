# CSS y componentes de página A4 para las dos versiones del manual.
from parts import *

CSS = '''
@import url("fonts/fonts.css");
:root{--g:#2A8B4E;--gd:#1F6E3D;--gl:#E7F2EA;--c:#F7F2EA;--k:#1A1F1C;--t:#C2563A;--tl:#F7E4DE;--m:#5E6660;--ln:#DCD6CB}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:0}
html,body{background:#fff}
body{font-family:Manrope,system-ui,sans-serif;color:var(--k);-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:11pt;line-height:1.38}
.page{width:210mm;height:297mm;padding:13mm 15mm 17mm;position:relative;overflow:hidden;page-break-after:always;display:flex;flex-direction:column;gap:4.2mm;background:#fff}
.top{display:flex;justify-content:space-between;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:var(--m);border-bottom:.3mm solid var(--ln);padding-bottom:2mm;font-weight:600}
.top b{color:var(--g);font-weight:800}
.foot{position:absolute;left:15mm;right:15mm;bottom:8mm;display:flex;justify-content:space-between;align-items:center;font-size:7.5pt;letter-spacing:.1em;color:var(--m);text-transform:uppercase}
.foot .n{font-size:11pt;font-weight:800;color:var(--g);letter-spacing:0}
h1{font-size:25pt;line-height:1.08;font-weight:800;color:var(--g);letter-spacing:-.02em}
h2{font-size:15pt;font-weight:800;line-height:1.15;color:var(--k)}
h3{font-size:9pt;letter-spacing:.12em;text-transform:uppercase;color:var(--g);font-weight:800;margin-bottom:1.6mm}
.lead{font-size:12.5pt;line-height:1.4;color:#2c332e}
.small{font-size:9.5pt;color:var(--m)}
b,strong{font-weight:800}
.row{display:flex;gap:6mm}.col{flex:1;min-width:0;display:flex;flex-direction:column;gap:3.5mm}
.grow{flex:1;min-height:0}
.page>*{flex-shrink:0}.page>.grow{flex-shrink:1}.page>.ok,.page>.err{flex:none}
.card{background:var(--c);border-radius:3mm;padding:4mm 5mm}
.card.g{background:var(--gl)}
.card.w{background:#fff;border:.35mm solid var(--ln)}
.stephead{display:flex;align-items:center;gap:5mm}
.stepnum{flex:none;width:19mm;height:19mm;border-radius:50%;background:var(--g);color:#fff;font-size:34pt;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1}
.stephead .k{font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--m);font-weight:700}
ol.acts{list-style:none;counter-reset:a;display:flex;flex-direction:column;gap:2.6mm}
ol.acts li{counter-increment:a;position:relative;padding-left:11mm;font-size:var(--af,14pt);line-height:1.3}
ol.acts li::before{content:counter(a);position:absolute;left:0;top:.2mm;width:7.6mm;height:7.6mm;border-radius:50%;background:var(--g);color:#fff;font-size:12pt;font-weight:800;display:flex;align-items:center;justify-content:center}
ol.acts.sm{--af:12.5pt;gap:2mm}
ol.acts.sm li::before{width:6.6mm;height:6.6mm;font-size:10.5pt}
.boxes{display:flex;gap:5mm}
.ok,.err{flex:1;border-radius:3mm;padding:3.6mm 4.5mm 4mm;display:flex;gap:3.5mm;align-items:flex-start}
.ok{background:var(--gl)}.err{background:var(--tl)}
.badge{flex:none;width:10mm;height:10mm;border-radius:50%;display:flex;align-items:center;justify-content:center}
.ok .badge{background:var(--g)}.err .badge{background:var(--t)}
.ok h4,.err h4{font-size:9pt;letter-spacing:.12em;text-transform:uppercase;font-weight:800;margin-bottom:1mm}
.ok h4{color:var(--gd)}.err h4{color:var(--t)}
.ok p,.err p,.ok li,.err li{font-size:12pt;line-height:1.32}
.ok ul{list-style:none;display:flex;flex-direction:column;gap:1.2mm}
.ok ul li::before{content:"✓ ";color:var(--g);font-weight:800}
.chips{display:flex;flex-wrap:wrap;gap:2.5mm}
.chip{background:var(--k);color:#fff;border-radius:2.4mm;padding:2mm 3.6mm 2.2mm;display:flex;flex-direction:column;line-height:1.1}
.chip b{font-size:16pt;font-weight:800;letter-spacing:-.01em}
.chip span{font-size:8pt;letter-spacing:.06em;text-transform:uppercase;opacity:.8;margin-top:.6mm}
.icons{display:flex;gap:3mm;flex-wrap:wrap}
.ib{display:flex;align-items:center;gap:1.6mm;background:var(--gl);border-radius:10mm;padding:1.2mm 3.4mm 1.2mm 2mm;font-size:9.5pt;font-weight:700;color:var(--gd)}
.ib .ic{width:6mm;height:6mm}
.fig{display:flex;flex-direction:column;gap:1.5mm;min-height:0}
.fig .im{flex:1;min-height:0;border-radius:3mm;overflow:hidden;background:#fff;border:.35mm solid var(--ln);display:flex;align-items:center;justify-content:center;position:relative}
.fig img{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;display:block}
.fig.cover img{object-fit:cover}
.fig .cap{font-size:7.8pt;letter-spacing:.08em;text-transform:uppercase;color:var(--m);font-weight:600}
.qr{display:flex;gap:4mm;align-items:center;background:#fff;border:.6mm solid var(--g);border-radius:3mm;padding:2.6mm 4mm 2.6mm 2.6mm}
.qr img{width:27mm;height:27mm;flex:none;image-rendering:pixelated}
.qr .t{display:flex;flex-direction:column;gap:1mm}
.qr .k{font-size:8pt;letter-spacing:.12em;text-transform:uppercase;color:var(--g);font-weight:800;display:flex;align-items:center;gap:1.4mm}
.qr .k .ic{width:4.6mm;height:4.6mm}
.qr .h{font-size:12.5pt;font-weight:800;line-height:1.2}
.qr .u{font-size:8.6pt;color:var(--m);font-weight:600;word-break:break-all}
.qr.sm img{width:22mm;height:22mm}.qr.sm .h{font-size:11pt}.qr.sm .u{font-size:7.4pt;word-break:normal}
table.t{width:100%;border-collapse:collapse;font-size:10pt}
table.t th{font-size:7.6pt;letter-spacing:.1em;text-transform:uppercase;color:var(--m);text-align:left;font-weight:800;padding:1.6mm 2mm;border-bottom:.4mm solid var(--k)}
table.t td{padding:2mm;border-bottom:.3mm solid var(--ln);vertical-align:top;line-height:1.3}
table.t td.b{font-weight:800}
.tag{display:inline-block;font-size:7.4pt;letter-spacing:.08em;text-transform:uppercase;font-weight:800;background:var(--gl);color:var(--gd);border-radius:1.4mm;padding:.5mm 1.6mm;white-space:nowrap}
.tag.p{background:#E5E9EE;color:#3F5F7A}
ul.dots{list-style:none;display:flex;flex-direction:column;gap:1.4mm}
ul.dots li{padding-left:4.5mm;position:relative}
ul.dots li::before{content:"";position:absolute;left:0;top:2.1mm;width:1.8mm;height:1.8mm;border-radius:50%;background:var(--g)}
ul.checks{list-style:none;display:flex;flex-direction:column;gap:2.2mm}
ul.checks li{padding-left:9mm;position:relative;font-size:11.5pt;line-height:1.3}
ul.checks li::before{content:"";position:absolute;left:0;top:.3mm;width:5.4mm;height:5.4mm;border:.5mm solid var(--g);border-radius:1.2mm}
.rules{display:flex;flex-direction:column;gap:3mm}
.rule{display:flex;gap:4mm;align-items:flex-start}
.rule .n{flex:none;width:11mm;height:11mm;border-radius:50%;background:var(--t);color:#fff;font-weight:800;font-size:16pt;display:flex;align-items:center;justify-content:center}
.rule p{font-size:13pt;line-height:1.3}
.mk{position:absolute;width:9mm;height:9mm;border-radius:50%;background:var(--g);color:#fff;border:.7mm solid #fff;font-weight:800;font-size:13pt;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);box-shadow:0 .4mm 1.2mm rgba(0,0,0,.3)}
.legend{display:flex;flex-direction:column;gap:2mm}
.legend div{display:flex;gap:3mm;align-items:flex-start;font-size:11.5pt;line-height:1.3}
.legend .d{flex:none;width:7mm;height:7mm;border-radius:50%;background:var(--g);color:#fff;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center}
.piece{display:flex;gap:4mm;align-items:center;padding:2.4mm 0;border-bottom:.3mm solid var(--ln)}
.piece:last-child{border-bottom:0}
.piece .pi{flex:none;width:22mm;height:16mm;border-radius:2mm;background:#fff;border:.3mm solid var(--ln);display:flex;align-items:center;justify-content:center;overflow:hidden}
.piece .pi img{max-width:92%;max-height:92%;object-fit:contain}
.piece b{display:block;font-size:12pt}
.piece span{font-size:10.5pt;line-height:1.3;color:#2c332e}
.tools{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.tool{background:#fff;border:.35mm solid var(--ln);border-radius:3mm;padding:2.5mm;display:flex;flex-direction:column;align-items:center;text-align:center;gap:1mm}
.tool img{height:var(--th,17mm);max-width:100%;object-fit:contain}
.tool b{font-size:10pt;letter-spacing:.06em;text-transform:uppercase;color:var(--g)}
.tool span{font-size:9.2pt;line-height:1.25}
.cover{padding:0;gap:0;background:var(--g)}
.cover .in{padding:16mm 16mm 0;color:#fff;display:flex;flex-direction:column;gap:5mm;flex:1}
.cover .logo{width:62mm;height:19mm;background:var(--c);-webkit-mask:url(img/mercado-casa-lockup.png) left center/contain no-repeat;mask:url(img/mercado-casa-lockup.png) left center/contain no-repeat}
.cover h1{color:#fff;font-size:50pt;line-height:.98;margin-top:20mm}
.cover .sub{font-size:15pt;line-height:1.35;max-width:150mm;opacity:.95}
.cover .ver{display:inline-flex;align-self:flex-start;background:var(--c);color:var(--g);font-weight:800;font-size:11pt;border-radius:10mm;padding:2mm 5mm;margin-top:3mm;letter-spacing:.02em}
.cover .ph{height:118mm;background-size:cover;background-position:center 30%;position:relative}
.cover .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,var(--g) 0%,rgba(42,139,78,.15) 30%,rgba(42,139,78,.25) 100%)}
.cover .meta{position:absolute;left:16mm;right:16mm;bottom:9mm;display:flex;justify-content:space-between;color:#fff;font-size:8pt;letter-spacing:.14em;text-transform:uppercase;font-weight:700;z-index:2}
.toc{display:flex;flex-direction:column}
.toc .sec{font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:var(--g);font-weight:800;margin:3mm 0 1mm}
.toc .it{display:flex;justify-content:space-between;font-size:11pt;padding:1.3mm 0;border-bottom:.3mm solid var(--ln)}
.toc .it span:last-child{font-weight:800;color:var(--g)}
.note{display:flex;gap:3mm;align-items:flex-start;font-size:10.5pt;line-height:1.35}
.note .ic{flex:none;margin-top:.4mm}
.fam{display:grid;grid-template-columns:repeat(7,1fr);gap:2mm}
.fam div{border-radius:2mm;padding:2.6mm;font-size:10pt;line-height:1.3}
.fam div b{font-size:13pt;display:block}
.vtab{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}
.vtab div{background:var(--c);border-radius:2mm;padding:2.8mm 3mm;font-size:11.5pt;line-height:1.25}
.vtab div b{font-size:14pt;color:var(--g);margin-right:1.2mm}
'''

def page(body, section, label, n, total=None, cls=''):
    return (f'<section class="page {cls}"><div class="top"><span><b>{section}</b></span><span>{label}</span></div>'
            f'{body}<div class="foot"><span>Mercado Casa · Manual de montaje · Sistema InBuild</span><span class="n">{n:02d}</span></div></section>')

def stephead(num, title, kicker='El montaje'):
    return (f'<div class="stephead"><div class="stepnum">{num}</div><div><div class="k">{kicker}</div><h1>{title}</h1></div></div>')

def acts(items, cls=''):
    return f'<ol class="acts {cls}">' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>'

def ok(items, title='Quedó bien si…'):
    return (f'<div class="ok"><div class="badge">{icon("check", 22, "#fff", 3)}</div><div><h4>{title}</h4>'
            f'<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul></div></div>')

def err(text, title='Error común'):
    return (f'<div class="err"><div class="badge">{icon("cross", 22, "#fff", 3)}</div><div><h4>{title}</h4><p>{text}</p></div></div>')

def boxes(*b): return '<div class="boxes">' + ''.join(b) + '</div>'

def chips(items):
    return '<div class="chips">' + ''.join(f'<div class="chip"><b>{a}</b><span>{b}</span></div>' for a, b in items) + '</div>'

def ibs(items):
    return '<div class="icons">' + ''.join(f'<div class="ib">{icon(i)}{t}</div>' for i, t in items) + '</div>'

def fig(src, cap='', style='', cls='', extra=''):
    c = f'<div class="cap">{cap}</div>' if cap else ''
    return f'<div class="fig {cls}" style="{style}"><div class="im"><img src="{src}">{extra}</div>{c}</div>'

QRS = {}
def qr(anchor, head, cls=''):
    url, data = qr_png(anchor)
    QRS[anchor] = url
    return (f'<div class="qr {cls}"><img src="{data}"><div class="t"><div class="k">{icon("phone")}Escaneá con el celular</div>'
            f'<div class="h">{head}</div><div class="u">{SHORT_URL}#{anchor}</div></div></div>')

def panel_photo(h='100%', w=None):
    marks = ''.join(f'<div class="mk" style="left:{x}%;top:{y}%">{n}</div>' for n, x, y in [(1, 66, 64), (2, 38, 40), (3, 72, 33.5)])
    box = f'width:{w};aspect-ratio:1300/1500' if w else 'height:100%;aspect-ratio:1300/1500'
    return (f'<div class="fig" style="height:{h}"><div class="im" style="border:0"><div style="position:relative;{box}">'
            f'<img src="img/panel-foto.jpg" style="object-fit:cover">{marks}</div></div></div>')

LAYERS = [('1', 'Placa OSB estructural en las dos caras, con pintura exterior e hidrófuga.'),
          ('2', 'Poliuretano inyectado de 70 mm.'), ('3', 'Perfil de acero galvanizado.')]
def legend():
    return '<div class="legend">' + ''.join(f'<div><span class="d">{a}</span><span>{b}</span></div>' for a, b in LAYERS) + '</div>'

def doc(title, pages):
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{title}</title>'
            f'<style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
