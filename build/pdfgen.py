#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera un PDF A4 del Manual de comunicación de Mercado Casa.
Sin dependencias externas: sólo stdlib (zlib). Decodifica el PNG del logo a mano
y construye el PDF con texto vectorial (fuentes estándar) + bloques de color."""
import zlib, struct, os

# ---------- colores (0..1) ----------
VERDE   = (42/255, 139/255, 78/255)    # #2A8B4E
VERDE800= (26/255, 87/255, 51/255)     # #1A5733
VERDE100= (230/255,244/255,236/255)    # #E6F4EC
CREMA   = (247/255,242/255,234/255)    # #F7F2EA
CARBON  = (26/255, 31/255, 28/255)     # #1A1F1C
TERRA   = (194/255, 86/255, 58/255)    # #C2563A
TERRACL = (244/255,201/255,188/255)    # rosa terracota claro
GRIS    = (216/255,213/255,206/255)    # #D8D5CE
ROSA    = (247/255,237/255,234/255)    # fondo "no"
TXT     = CARBON
MUT     = (107/255,111/255,104/255)

PAGE_W, PAGE_H = 595.28, 841.89   # A4 pt
ML, MR, MT, MB = 50, 50, 52, 50
CW = PAGE_W - ML - MR

# ---------- PNG -> RGB (compuesto sobre blanco) ----------
def png_to_rgb(path):
    data = open(path,'rb').read()
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    pos=8; w=h=bitd=ctype=None; idat=b''
    while pos < len(data):
        ln=struct.unpack('>I',data[pos:pos+4])[0]; typ=data[pos+4:pos+8]
        chunk=data[pos+8:pos+8+ln]; pos+=12+ln
        if typ==b'IHDR':
            w,h,bitd,ctype=struct.unpack('>IIBB',chunk[:10])
        elif typ==b'IDAT': idat+=chunk
        elif typ==b'IEND': break
    raw=zlib.decompress(idat)
    assert bitd==8 and ctype in (6,2), f'ctype {ctype} bitd {bitd}'
    chan=4 if ctype==6 else 3
    stride=w*chan
    out=bytearray(w*h*3)
    prev=bytearray(stride)
    p=0
    def paeth(a,b,c):
        pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
        return a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
    for y in range(h):
        f=raw[p]; p+=1
        line=bytearray(raw[p:p+stride]); p+=stride
        if f==1:
            for i in range(chan,stride): line[i]=(line[i]+line[i-chan])&255
        elif f==2:
            for i in range(stride): line[i]=(line[i]+prev[i])&255
        elif f==3:
            for i in range(stride):
                a=line[i-chan] if i>=chan else 0
                line[i]=(line[i]+((a+prev[i])>>1))&255
        elif f==4:
            for i in range(stride):
                a=line[i-chan] if i>=chan else 0
                c=prev[i-chan] if i>=chan else 0
                line[i]=(line[i]+paeth(a,prev[i],c))&255
        # componer sobre blanco -> RGB
        o=y*w*3
        if chan==4:
            for x in range(w):
                r=line[x*4]; g=line[x*4+1]; b=line[x*4+2]; al=line[x*4+3]
                out[o+x*3]   = (r*al + 255*(255-al))//255
                out[o+x*3+1] = (g*al + 255*(255-al))//255
                out[o+x*3+2] = (b*al + 255*(255-al))//255
        else:
            out[o:o+stride]=line
        prev=line
    return w,h,bytes(out)

# ---------- PDF builder ----------
class PDF:
    def __init__(self):
        self.objs=[]            # list of bytes (object bodies)
        self.pages=[]           # list of content-stream object numbers
        self.page_streams=[]    # current building
        self.images={}          # name->objnum
        self.cur=[]             # commands for current page
        self.y=PAGE_H-MT
    def _add(self,body):
        self.objs.append(body); return len(self.objs)  # 1-based
    # text helpers
    def _esc(self,s):
        return s.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
    def width(self,s,size,bold=False):
        # ancho aprox Helvetica
        wsum=0
        for ch in s:
            if ch in 'ijltfI.,;:\'! ': wsum+=0.28
            elif ch in 'mwMW': wsum+=0.84
            elif ch.isupper(): wsum+=0.68
            else: wsum+=0.50
        return wsum*size*(1.02 if bold else 1.0)
    def newpage(self):
        if self.cur: self._flush_page()
        self.cur=[]; self.y=PAGE_H-MT
    def _flush_page(self):
        stream=''.join(self.cur).encode('latin-1','replace')
        comp=zlib.compress(stream)
        n=self._add(b'<< /Length %d /Filter /FlateDecode >>\nstream\n'%len(comp)+comp+b'\nendstream')
        self.page_streams.append(n)
    def rect(self,x,y,w,h,color):
        r,g,b=color
        self.cur.append(f'{r:.3f} {g:.3f} {b:.3f} rg\n{x:.2f} {y:.2f} {w:.2f} {h:.2f} re f\n')
    def line(self,x1,y1,x2,y2,color=GRIS,wd=0.5):
        r,g,b=color
        self.cur.append(f'{r:.3f} {g:.3f} {b:.3f} RG {wd} w\n{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n')
    def text(self,x,y,s,size=10.5,color=TXT,bold=False):
        r,g,b=color; f='F2' if bold else 'F1'
        self.cur.append(f'BT /{f} {size} Tf {r:.3f} {g:.3f} {b:.3f} rg 1 0 0 1 {x:.2f} {y:.2f} Tm ({self._esc(s)}) Tj ET\n')
    def image(self,name,x,y,w,h):
        self.cur.append(f'q {w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm /{name} Do Q\n')
    # layout
    def ensure(self,need):
        if self.y-need < MB: self.newpage()
    def para(self,s,size=10.5,color=TXT,bold=False,lh=1.42,gap=5,x=ML,maxw=CW,indent=0):
        words=s.split(' '); line=''; first=True
        while words:
            w=words.pop(0)
            trial=(line+' '+w).strip()
            if self.width(trial,size,bold) > (maxw-indent) and line:
                self.ensure(size*lh)
                self.text(x+indent,self.y-size,line,size,color,bold)
                self.y-=size*lh; line=w; first=False
            else:
                line=trial
        if line:
            self.ensure(size*lh)
            self.text(x+indent,self.y-size,line,size,color,bold); self.y-=size*lh
        self.y-=gap
    def header_band(self,num,title):
        self.ensure(46)
        self.text(ML,self.y-9,num,8,VERDE,bold=True); self.y-=14
        self.ensure(24)
        self.text(ML,self.y-17,title,16,CARBON,bold=True); self.y-=24
    def bullets(self,items,color=TXT,size=10,bx=ML+10):
        for it in items:
            self.ensure(size*1.4)
            self.text(bx-8,self.y-size,'•',size,VERDE,bold=True)
            self.para(it,size=size,color=color,gap=2,x=bx,maxw=CW-(bx-ML))
        self.y-=3
    def build(self,path):
        if self.cur: self._flush_page()
        # font objects
        f1=self._add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
        f2=self._add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
        res_img=''.join(f'/{n} {num} 0 R ' for n,num in self.images.items())
        resources=(b'<< /Font << /F1 %d 0 R /F2 %d 0 R >> /XObject << '%(f1,f2)
                   +res_img.encode()+b'>> >>')
        res_obj=self._add(resources)
        kids=[]
        pages_parent_placeholder=len(self.objs)+len(self.page_streams)+1  # approx; fix below
        page_obj_nums=[]
        for sn in self.page_streams:
            pn=self._add(b'__PAGE__%d__'%sn)  # placeholder, fill after we know parent
            page_obj_nums.append((pn,sn))
        parent=self._add(b'__PAGES__')
        # now rewrite page objs and parent
        for pn,sn in page_obj_nums:
            self.objs[pn-1]=(b'<< /Type /Page /Parent %d 0 R /MediaBox [0 0 %.2f %.2f] /Resources %d 0 R /Contents %d 0 R >>'
                             %(parent,PAGE_W,PAGE_H,res_obj,sn))
            kids.append(pn)
        kids_s=' '.join(f'{k} 0 R' for k in kids).encode()
        self.objs[parent-1]=b'<< /Type /Pages /Kids [%s] /Count %d >>'%(kids_s,len(kids))
        catalog=self._add(b'<< /Type /Catalog /Pages %d 0 R >>'%parent)
        # write file
        out=bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
        offsets=[0]*(len(self.objs)+1)
        for i,body in enumerate(self.objs,1):
            offsets[i]=len(out)
            out+=b'%d 0 obj\n'%i+body+b'\nendobj\n'
        xref=len(out)
        out+=b'xref\n0 %d\n'%(len(self.objs)+1)
        out+=b'0000000000 65535 f \n'
        for i in range(1,len(self.objs)+1):
            out+=b'%010d 00000 n \n'%offsets[i]
        out+=b'trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF'%(len(self.objs)+1,catalog,xref)
        open(path,'wb').write(out)
        return len(out)
    def add_image(self,name,path):
        w,h,rgb=png_to_rgb(path)
        comp=zlib.compress(rgb,6)
        body=(b'<< /Type /XObject /Subtype /Image /Width %d /Height %d '
              b'/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length %d >>\n'
              b'stream\n'%(w,h,len(comp)))+comp+b'\nendstream'
        n=self._add(body); self.images[name]=n; return (w,h)

# =================== CONTENIDO ===================
pdf=PDF()
ASSET=os.path.join(os.path.dirname(__file__),'..','assets','mercado-casa-lockup.png')
lw,lh=pdf.add_image('Logo',ASSET)
ar=lw/lh

# ---- PORTADA ----
pdf.newpage()
# logo arriba (sobre blanco)
disp_w=210; disp_h=disp_w/ar
pdf.image('Logo',ML,pdf.y-disp_h,disp_w,disp_h); pdf.y-=disp_h+18
# banda verde título
band_h=150
pdf.rect(ML,pdf.y-band_h,CW,band_h,VERDE)
pdf.text(ML+22,pdf.y-30,'MERCADO CASA',9,CREMA,bold=True)
pdf.text(ML+22,pdf.y-62,'Manual de comunicacion',23,(1,1,1),bold=True)
pdf.text(ML+22,pdf.y-90,'para vendedores',23,(1,1,1),bold=True)
pdf.text(ML+22,pdf.y-116,'Para quienes salen a vender las casas de la Linea VIVE.',11.5,VERDE100)
pdf.text(ML+22,pdf.y-134,'Doc MC-MM-001 - v1.5 - Verde Vivo #2A8B4E - Manrope - Regla 70/20/10',8.5,(.80,.91,.85))
pdf.y-=band_h+14
pdf.para('Sintesis operativa del Manual de Marca oficial. Es la fuente de verdad: si una pieza la contradice, la pieza esta mal. MaCasa Holdings SRL comercializa Mercado Casa.',9,MUT,gap=12)

# 01
pdf.header_band('01 - LO QUE VENDEMOS','Una casa propia que se paga como un alquiler.')
pdf.para('Mercado Casa es acceso real a la primera vivienda: construccion semi-industrializada, precio cerrado en pesos y entrega en menos de 3 meses. No vendemos "lo barato": vendemos lo inteligente.',11,(.20,.22,.18),gap=10)
def keybox(label,body,bg,fg=CARBON,lab=VERDE):
    h=46
    pdf.ensure(h+6)
    pdf.rect(ML,pdf.y-h,CW,h,bg)
    pdf.text(ML+12,pdf.y-16,label,10,lab,bold=True)
    pdf.para(body,9.5,fg,gap=0,x=ML+12,maxw=CW-24)
    pdf.y=min(pdf.y,0) if False else pdf.y
    pdf.y-=8
# tres certezas en filas
pdf.rect(ML,pdf.y-50,CW,50,VERDE)
pdf.text(ML+12,pdf.y-16,'La promesa central',10,(1,1,1),bold=True)
pdf.text(ML+12,pdf.y-32,'Pagas como un alquiler. Pero es tuya. Y cuando tu familia crece, la casa crece.',10,CREMA)
pdf.y-=58
pdf.rect(ML,pdf.y-44,CW,44,VERDE100)
pdf.text(ML+12,pdf.y-15,'Las 3 certezas',10,VERDE800,bold=True)
pdf.text(ML+12,pdf.y-30,'Entrega en menos de 3 meses  -  Precio cerrado al firmar  -  Casa evolutiva (sumas dormitorios).',9.8,CARBON)
pdf.y-=52

# 02
pdf.header_band('02 - COMO NOMBRAR TODO','Reglas que no se negocian.')
pdf.para('Deci siempre:',10.5,VERDE,bold=True,gap=2)
pdf.bullets([
 'Mercado Casa - dos palabras, mayuscula inicial en cada una.',
 'Linea VIVE - VIVE 28 / 38 / 48 / 58 / 63 (el numero son los m2).',
 'Sistema InBuild de EFI - construccion semi-industrializada.',
 'Casa evolutiva - crece con la familia.'])
pdf.para('Nunca digas:',10.5,TERRA,bold=True,gap=2)
pdf.bullets([
 '"MercadoCasa" / "MERCADOCASA" / "mercadocasa".',
 '"MaCasa" como marca (es solo la razon social: MaCasa Holdings SRL).',
 '"Prefabricado", "modular" ni "container". Ni "industrializado" sin el "semi-".',
 'Usar azul en una pieza (es de MaCasa Holdings y STREK).'],color=(.45,.25,.20))

# 03 claims
pdf.header_band('03 - LAS FRASES OFICIALES','Cuatro claims. Cada uno tiene su momento.')
claims=[('Llegaste.','Emocional - cierre, entrega de llaves, post-venta.',TERRACL),
        ('Tu plata, tu casa.','Racional - cuando evalua y compara.',(1,1,1)),
        ('Pagas lo mismo. Pero es tuya.','Campania - cuando la cuota = el alquiler.',(1,1,1)),
        ('Tu casa crece con vos.','Producto - explica la Linea VIVE evolutiva.',(1,1,1))]
for big,when,bigcol in claims:
    pdf.ensure(54)
    pdf.rect(ML,pdf.y-46,CW,46,CARBON)
    pdf.text(ML+14,pdf.y-22,big,15,bigcol,bold=True)
    pdf.text(ML+14,pdf.y-38,when,9,(.74,.76,.73))
    pdf.y-=52

# 04 voz
pdf.newpage()
pdf.header_band('04 - COMO HABLAMOS','Cercano, claro, optimista, concreto.')
pdf.para('Hablas como una persona, no como una empresa. Tuteas siempre. Frases cortas, una idea por oracion, cifras reales.',11,(.20,.22,.18),gap=8)
pdf.para('Siempre:',10.5,VERDE,bold=True,gap=2)
pdf.bullets(['Tutear (vos / te / tu) y comparar contra el alquiler.',
 'Cifras concretas: "menos de 3 meses", "28 m2", "cuota desde $...".',
 'Verbos en presente y modo activo. Familias reales en casas terminadas.'])
pdf.para('Nunca:',10.5,TERRA,bold=True,gap=2)
pdf.bullets(['"Usted" ni lenguaje formal de banco. Diminutivos ("casita").',
 'Promesas vacias ("la casa de tus suenos"). Comparar contra otras constructoras.',
 'Emoji en el primer mensaje.'],color=(.45,.25,.20))
# glosario
pdf.para('Glosario rapido',11,VERDE,bold=True,gap=4)
glos=[('Casa propia','Unidad habitacional'),
      ('Cuota mensual accesible','Mensualidad / canon'),
      ('Construccion semi-industrializada','Prefabricado / modular'),
      ('Plazo de entrega inferior a 3 meses','Tiempo de obra / aproximadamente'),
      ('Precio cerrado al firmar','Presupuesto'),
      ('Financiacion accesible (en pesos)','Credito / hipoteca'),
      ('Casa evolutiva','Ampliable / extensible')]
colx=ML+CW*0.52
pdf.ensure(20); pdf.rect(ML,pdf.y-18,CW,18,VERDE100)
pdf.text(ML+8,pdf.y-13,'DECI',8.5,VERDE800,bold=True)
pdf.text(colx+8,pdf.y-13,'EN LUGAR DE',8.5,VERDE800,bold=True); pdf.y-=18
for a,b in glos:
    pdf.ensure(17)
    pdf.text(ML+8,pdf.y-12,a,9.5,VERDE,bold=True)
    pdf.text(colx+8,pdf.y-12,b,9.5,MUT)
    pdf.y-=16; pdf.line(ML,pdf.y+2,ML+CW,pdf.y+2,GRIS,0.4)
pdf.y-=8

# 05 objeciones
pdf.header_band('05 - LAS 4 OBJECIONES','Lo que te van a preguntar - y que respondes.')
obj=[('"Es una casa de verdad o un container?"','Es construccion semi-industrializada. Estructura de acero galvanizado, paneles con poliuretano de 70 mm, placa OSB hidrofuga. Una casa fija, en terreno propio.'),
     ('"Como es la financiacion?"','Tenemos esquema accesible en pesos. El detalle exacto depende de tu perfil: pasame ingreso y modelo y te lo arma un asesor.'),
     ('"Cuanto pago por mes?"','Depende del modelo y del plazo. Pasame ingreso y modelo y te muestro la cuota estimada hoy.'),
     ('"Cuando me la entregan?"','Menos de 3 meses desde la firma del boleto. Es contractual, no una estimacion.')]
for q,a in obj:
    pdf.ensure(40)
    pdf.para(q,10.5,CARBON,bold=True,gap=1)
    pdf.para(a,9.8,(.30,.32,.28),gap=8)
pdf.para('Mientras el esquema de financiacion este abierto: hablar de "financiacion accesible en pesos" y "sujeto a calificacion". No cerrar numeros por escrito.',8.5,MUT,gap=8)

# 06 cierre
pdf.newpage()
pdf.ensure(120)
pdf.rect(ML,pdf.y-118,CW,118,CARBON)
pdf.text(ML+18,pdf.y-24,'06 - EL CIERRE',8,TERRACL,bold=True)
pdf.text(ML+18,pdf.y-46,'Cuatro argumentos, en orden de impacto.',15,(1,1,1),bold=True)
arg=['1. Plazo contractual. Menos de 3 meses: sabes cuando te mudas.',
     '2. Precio cerrado al firmar. Lo que firmas es lo que pagas.',
     '3. Cuota accesible en pesos. Calculada sobre tu ingreso real.',
     '4. Casa evolutiva. Empezas en VIVE 28 y sumas dormitorios.']
yy=pdf.y-66
for a in arg:
    pdf.text(ML+18,yy,a,9.8,CREMA); yy-=15
pdf.text(ML+18,yy-2,'"Tu casa crece con vos. Llegaste."',12,TERRACL,bold=True)
pdf.y-=128

# 07 beats
pdf.header_band('07 - EL RELATO','Los 5 beats de Mercado Casa.')
pdf.para('La misma estructura para todo contenido largo: un video, un carrusel, una charla, un mail. Conta la historia en este orden.',11,(.20,.22,.18),gap=8)
beats=[('01  El Hartazgo','Anos pagando alquiler. Esa plata se fue para siempre.'),
       ('02  La Trampa','"Tu plata construye la casa de otro." El insight que cambia todo.'),
       ('03  La Salida','Mercado Casa: precio cerrado, cuotas en pesos, entrega en menos de 3 meses. Linea VIVE desde VIVE 28.'),
       ('04  La Prueba','Familias reales que lo hicieron. Sistema certificado, financiacion accesible.'),
       ('05  Llegaste.','Tu casa. Para siempre. Y cuando creces, tu casa crece.')]
for i,(n,m) in enumerate(beats):
    last=(i==4)
    pdf.ensure(34)
    if last:
        pdf.rect(ML,pdf.y-30,CW,30,VERDE)
        pdf.text(ML+12,pdf.y-13,n,10.5,(1,1,1),bold=True)
        pdf.para(m,9.5,CREMA,gap=0,x=ML+12,maxw=CW-24); pdf.y-=8
    else:
        pdf.text(ML+12,pdf.y-12,n,10.5,TERRA,bold=True)
        pdf.para(m,9.8,CARBON,gap=4,x=ML+12,maxw=CW-24)
        pdf.line(ML,pdf.y+1,ML+CW,pdf.y+1,GRIS,0.4); pdf.y-=4
pdf.y-=4
pdf.para('Eje diferencial: el comprador empieza en VIVE 28 con la cuota mas baja. Cuando llega un hijo, se suma un dormitorio. La familia no se muda: la casa crece con ella.',8.8,MUT,gap=8)

# 08 linea vive
pdf.header_band('08 - LA LINEA VIVE','Cinco modelos. El numero son los m2.')
cols=[(0,'MODELO'),(0.20,'M2'),(0.33,'COMPOSICION'),(0.66,'APTO PARA')]
pdf.ensure(20); pdf.rect(ML,pdf.y-18,CW,18,VERDE100)
for fx,t in cols: pdf.text(ML+8+CW*fx,pdf.y-13,t,8.5,VERDE800,bold=True)
pdf.y-=18
rows=[('VIVE 28','28','Cocina, living, 1 bano','Pareja sin hijos / arranque'),
      ('VIVE 38','38','+ 1 dormitorio','Pareja, primer hijo'),
      ('VIVE 48','48','+ 2 dormitorios','Familia chica'),
      ('VIVE 58','58','+ 3 dormitorios','Familia con 2-3 hijos'),
      ('VIVE 63','63','2 banos, 3 dormitorios','Familia consolidada')]
for m,sq,comp,apt in rows:
    pdf.ensure(17)
    pdf.text(ML+8,pdf.y-12,m,9.8,VERDE,bold=True)
    pdf.text(ML+8+CW*0.20,pdf.y-12,sq+' m2',9.5,CARBON)
    pdf.text(ML+8+CW*0.33,pdf.y-12,comp,9.5,CARBON)
    pdf.text(ML+8+CW*0.66,pdf.y-12,apt,9.5,CARBON)
    pdf.y-=16; pdf.line(ML,pdf.y+2,ML+CW,pdf.y+2,GRIS,0.4)
pdf.y-=8

# 09 identidad
pdf.newpage()
pdf.header_band('09 - IDENTIDAD MINIMA','Colores y tipografia.')
pals=[('Verde Vivo','#2A8B4E',VERDE,'Color institucional. Logo, fondos, titulos.'),
      ('Crema Hogar','#F7F2EA',CREMA,'Fondo principal. Reemplaza al blanco.'),
      ('Terracota Llave','#C2563A',TERRA,'Solo CTAs y cifras. Nunca decorativo.'),
      ('Carbon','#1A1F1C',CARBON,'Texto del cuerpo y modo oscuro.'),
      ('Verde Vivo 800','#1A5733',VERDE800,'Hover, sombras, separadores.'),
      ('Verde Vivo 100','#E6F4EC',VERDE100,'Fondos suaves, badges, estados.')]
for name,hexv,col,use in pals:
    pdf.ensure(26)
    pdf.rect(ML,pdf.y-22,30,22,col)
    if col in (CREMA,VERDE100): pdf.line(ML,pdf.y-22,ML+30,pdf.y-22,GRIS,0.5); pdf.line(ML+30,pdf.y-22,ML+30,pdf.y,GRIS,0.5)
    pdf.text(ML+40,pdf.y-10,name,10,CARBON,bold=True)
    pdf.text(ML+40,pdf.y-20,hexv,9,MUT)
    pdf.text(ML+150,pdf.y-15,use,9.5,(.30,.32,.28))
    pdf.y-=28
pdf.y-=2
pdf.para('Regla 70 / 20 / 10',11,VERDE,bold=True,gap=4)
bw=CW
pdf.ensure(26)
pdf.rect(ML,pdf.y-22,bw*0.70,22,VERDE); pdf.text(ML+10,pdf.y-15,'70% Verde',9,(1,1,1),bold=True)
pdf.rect(ML+bw*0.70,pdf.y-22,bw*0.20,22,CREMA); pdf.text(ML+bw*0.70+8,pdf.y-15,'20% Crema',8,CARBON,bold=True)
pdf.rect(ML+bw*0.90,pdf.y-22,bw*0.10,22,TERRA); pdf.text(ML+bw*0.90+6,pdf.y-15,'10%',8,(1,1,1),bold=True)
pdf.y-=30
pdf.para('Tipografia: Manrope (Google Fonts, gratuita). Titulos en ExtraBold (800), a la izquierda, sin justificar. Cuerpo en Regular. Cifras de cuota y plazo en Bold y, si se puede, en Terracota.',10,CARBON,gap=10)

# 10 logo
pdf.header_band('10 - EL LOGO','Usa el archivo oficial. No lo recrees.')
pdf.ensure(disp_h+10)
boxh=70
pdf.rect(ML,pdf.y-boxh,CW*0.5-6,boxh,CREMA); pdf.line(ML,pdf.y-boxh,ML+CW*0.5-6,pdf.y-boxh,GRIS,0.5)
iw=130; ih=iw/ar
pdf.image('Logo',ML+(CW*0.5-6-iw)/2,pdf.y-boxh/2-ih/2,iw,ih)
pdf.rect(ML+CW*0.5+6,pdf.y-boxh,CW*0.5-6,boxh,VERDE)
pdf.text(ML+CW*0.5+24,pdf.y-boxh/2+4,'MERCADO CASA',14,(1,1,1),bold=True)
pdf.text(ML+CW*0.5+24,pdf.y-boxh/2-12,'sobre verde pleno',8.5,VERDE100)
pdf.y-=boxh+10
pdf.para('Si:',10.5,VERDE,bold=True,gap=2)
pdf.bullets(['Verde sobre crema o blanco (principal); crema sobre verde (campanias).',
 'Deja aire alrededor (margen = altura del isotipo). Sobre foto, overlay 40%+.'])
pdf.para('No:',10.5,TERRA,bold=True,gap=2)
pdf.bullets(['Azul ni otro color; rotar, estirar o deformar; sombras o brillos.',
 'Recrearlo en Canva/Figma: usa siempre el archivo oficial.'],color=(.45,.25,.20))

# 11 listo
pdf.newpage()
pdf.header_band('11 - LISTO PARA USAR','Copia y pega en tus comunicaciones.')
snip=[('Folleto / firma','Comercializo las casas de la Linea VIVE de Mercado Casa: casa propia, precio cerrado en pesos y entrega en menos de 3 meses.'),
      ('Bio / presentacion','Tu primera casa propia. Entrega en menos de 3 meses. Cuotas en pesos. Linea VIVE desde 28 m2.'),
      ('Saludo de WhatsApp','Hola, soy [Tu nombre]. Comercializo Mercado Casa. En que te ayudo?'),
      ('Cierre de mensaje','Pasame tu ingreso y el modelo que te interesa y te muestro la cuota estimada hoy. Te acompano en todo el proceso.')]
for lab,tx in snip:
    pdf.ensure(40)
    yb=pdf.y
    pdf.text(ML+12,pdf.y-13,lab.upper(),8,VERDE,bold=True); pdf.y-=16
    pdf.para(tx,10,CARBON,gap=6,x=ML+12,maxw=CW-24)
    pdf.rect(ML,pdf.y+2,3,yb-(pdf.y+2),VERDE)  # barra izquierda verde
    pdf.y-=6
pdf.para('Firma siempre como: [Tu nombre] - Comercializa Mercado Casa + tu contacto. Nunca uses "MaCasa" como marca ni cierres numeros de financiacion por escrito.',8.8,MUT,gap=12)
# contacto destacado
pdf.ensure(54)
pdf.rect(ML,pdf.y-48,CW,48,VERDE100)
pdf.rect(ML,pdf.y-48,4,48,TERRA)
pdf.text(ML+16,pdf.y-19,'Cualquier duda de comunicacion o de venta:',10.5,VERDE800,bold=True)
pdf.text(ML+16,pdf.y-37,'escribi a  ventas@mercadocasa.com.ar',13,TERRA,bold=True)
pdf.y-=56
# footer band
pdf.ensure(48)
pdf.rect(ML,pdf.y-42,CW,42,CARBON)
pdf.text(ML+14,pdf.y-18,'Mercado Casa - Manual de comunicacion para vendedores.',9,(1,1,1),bold=True)
pdf.text(ML+14,pdf.y-32,'Sintesis del Manual de Marca oficial (MC-MM-001 v1.5). MaCasa Holdings SRL comercializa Mercado Casa - Buenos Aires.',8,(.74,.76,.73))
pdf.y-=50

size=pdf.build(os.path.join(os.path.dirname(__file__),'..','assets','Manual-Comunicacion-Mercado-Casa.pdf'))
print('PDF OK', size, 'bytes')
