from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image
import pypdfium2 as pdfium
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
mm=72/25.4
for name,file in [('Regular','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf')]:
 pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
P=HexColor('#4E3392'); DARK=HexColor('#160B30'); Y=HexColor('#F7D900'); WHITE=HexColor('#FFFFFF'); SOFT=HexColor('#C4B7E8')
lp=Image.open(ROOT/'public/lets-play-logo.png').convert('RGBA'); lp=lp.crop(lp.getbbox())
gl=Image.open(OUT/'gamerslab-powered-by-makerslab-transparent.png').convert('RGBA')

def text(c,s,x,y,size,font='Regular',color=WHITE,align='left'):
 c.setFillColor(color);c.setFont(font,size)
 (c.drawCentredString if align=='center' else c.drawString)(x*mm,y*mm,s)

def badge(c,bleed=0):
 c.setFillColor(DARK);c.rect(-bleed*mm,-bleed*mm,(90+bleed*2)*mm,(55+bleed*2)*mm,fill=1,stroke=0)
 c.setFillColor(P);c.rect(-bleed*mm,-bleed*mm,36*mm,(55+bleed*2)*mm,fill=1,stroke=0)
 # Brand block, left. Logo kept fully inside the trim with a clear lanyard margin.
 lw=28;lh=lw*lp.height/lp.width
 c.drawImage(ImageReader(lp),(18-lw/2)*mm,(43-lh)*mm,lw*mm,lh*mm,mask='auto')
 text(c,'MEDIA',18,16,15,'Bold',Y,'center')
 text(c,'PRESSE / MEDIA',18,9,4.4,'Bold',WHITE,'center')
 # Event block, right. Logo and wording exactly as supplied by the organiser.
 gw=44;gh=gw*gl.height/gl.width
 c.drawImage(ImageReader(gl),39*mm,(49.5-gh)*mm,gw*mm,gh*mm,mask='auto')
 text(c,'VIDEO GAMES GO TO MARKET',39,30.5,5.4,'Bold',WHITE)
 text(c,'23–26 NOVEMBRE 2026',39,22,7.4,'Bold',Y)
 text(c,'ALGER, ALGÉRIE',39,15.5,5.2,'Regular',SOFT)
 c.setStrokeColor(P);c.setLineWidth(.4);c.line(39*mm,10*mm,86*mm,10*mm)
 text(c,'IDENTIFICATION MÉDIA • LET’S PLAY',39,6.2,4.2,'Regular',SOFT)

def make(name,margin=0,marks=False):
 w,h=90+2*margin,55+2*margin
 c=canvas.Canvas(str(OUT/name),pagesize=(w*mm,h*mm),pageCompression=1)
 c.setTitle('Let’s Play — MEDIA | GamersLab 23–26 novembre 2026 | 90 × 55 mm')
 c.setAuthor('Let’s Play');c.saveState();c.translate(margin*mm,margin*mm)
 badge(c,3 if marks else 0)
 if marks:
  c.setTrimBox((margin*mm,margin*mm,(margin+90)*mm,(margin+55)*mm))
  c.setBleedBox(((margin-3)*mm,(margin-3)*mm,(margin+93)*mm,(margin+58)*mm))
  c.setStrokeColor(HexColor('#000000'));c.setLineWidth(.25)
  for x in (0,90):
   c.line(x*mm,-7*mm,x*mm,-4*mm);c.line(x*mm,59*mm,x*mm,62*mm)
  for y in (0,55):
   c.line(-7*mm,y*mm,-4*mm,y*mm);c.line(94*mm,y*mm,97*mm,y*mm)
 c.restoreState();c.showPage();c.save()

make('badge-lets-play-media-90x55.pdf')
make('badge-lets-play-media-90x55-imprimeur.pdf',8,True)
doc=pdfium.PdfDocument(str(OUT/'badge-lets-play-media-90x55.pdf'))
doc[0].render(scale=1200/doc[0].get_height()).to_pil().save(OUT/'badge-lets-play-media-90x55-apercu.png',dpi=(300,300))
print('created 90x55')
