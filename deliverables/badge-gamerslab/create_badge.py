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
logo=Image.open(ROOT/'public/lets-play-logo.png').convert('RGBA')
# Keep the actual transparent brand asset, not a redrawn or AI approximated logo.
logo=logo.crop(logo.getbbox())
def text(c,s,x,y,size=10,font='Regular',color=WHITE,align='left'):
 c.setFillColor(color);c.setFont(font,size)
 if align=='center':c.drawCentredString(x*mm,y*mm,s)
 else:c.drawString(x*mm,y*mm,s)
def box(c,x,y,w,h,col):
 c.setFillColor(col);c.rect(x*mm,y*mm,w*mm,h*mm,fill=1,stroke=0)
def badge(c,bleed=0):
 box(c,-bleed,-bleed,105+bleed*2,148+bleed*2,DARK)
 # Purple planes and fine editorial framing, fully vector.
 c.setFillColor(P);p=c.beginPath();p.moveTo(-3*mm,75*mm);p.lineTo(108*mm,111*mm);p.lineTo(108*mm,151*mm);p.lineTo(-3*mm,151*mm);p.close();c.drawPath(p,fill=1,stroke=0)
 c.setStrokeColor(Color(1,1,1,.12));c.setLineWidth(.4)
 for y in [112,116,120]:c.line(70*mm,y*mm,100*mm,(y+10)*mm)
 # Narrow brand bar at the top, safely below any lanyard clip.
 box(c,46.5,141,12,1,Y)
 text(c,'PRESSE / MEDIA',52.5,136.3,6.5,'Bold',WHITE,'center')
 lw=66;lh=lw*logo.height/logo.width
 c.drawImage(ImageReader(logo),(105-lw)/2*mm, (130-lh)*mm,lw*mm,lh*mm,mask='auto')
 # High-visibility generic media designation.
 box(c,-bleed,55,105+bleed*2,25,Y)
 size=47
 text(c,'MEDIA',52.5,61.2,size,'Bold',DARK,'center')
 text(c,'GAMING · CULTURE · TECH',52.5,48.5,6.5,'Bold',SOFT,'center')
 # Event block. Names/dates transcribed from the supplied event poster.
 # Exact GamersLab / Powered By Makerslab lockup cropped from the supplied poster.
 event_logo=Image.open(OUT/'gamerslab-powered-by-makerslab-transparent.png')
 ew=65;eh=ew*event_logo.height/event_logo.width
 c.drawImage(ImageReader(event_logo),(105-ew)/2*mm,(27+(19.5-eh)/2)*mm,ew*mm,eh*mm,mask='auto')
 text(c,'VIDEO GAMES GO TO MARKET',52.5,22.8,7.2,'Bold',WHITE,'center')
 text(c,'23–26 NOVEMBRE 2026',52.5,16.5,8.3,'Bold',Y,'center')
 text(c,'ALGER, ALGÉRIE',52.5,11.5,7,'Regular',WHITE,'center')
 c.setStrokeColor(P);c.setLineWidth(.5);c.line(8*mm,8*mm,97*mm,8*mm)
 text(c,'IDENTIFICATION MÉDIA • LET’S PLAY',52.5,4.7,5.2,'Regular',SOFT,'center')
def make(name,margin=0,marks=False):
 w,h=105+2*margin,148+2*margin
 c=canvas.Canvas(str(OUT/name),pagesize=(w*mm,h*mm),pageCompression=1)
 c.setTitle('Let’s Play — MEDIA | GamersLab 23–26 novembre 2026')
 c.setAuthor('Let’s Play');c.saveState();c.translate(margin*mm,margin*mm)
 badge(c,3 if marks else 0)
 if marks:
  c.setTrimBox((margin*mm,margin*mm,(margin+105)*mm,(margin+148)*mm))
  c.setBleedBox(((margin-3)*mm,(margin-3)*mm,(margin+108)*mm,(margin+151)*mm))
  c.setStrokeColor(HexColor('#000000'));c.setLineWidth(.25)
  for x in [0,105]:
   c.line(x*mm,-7*mm,x*mm,-4*mm);c.line(x*mm,152*mm,x*mm,155*mm)
  for y in [0,148]:
   c.line(-7*mm,y*mm,-4*mm,y*mm);c.line(109*mm,y*mm,112*mm,y*mm)
 c.restoreState();c.showPage();c.save()
make('badge-lets-play-media-A6.pdf')
make('badge-lets-play-media-imprimeur.pdf',8,True)
pdf=pdfium.PdfDocument(str(OUT/'badge-lets-play-media-A6.pdf'))
pdf[0].render(scale=300/72).to_pil().save(OUT/'badge-lets-play-media-apercu.png',dpi=(300,300))
print('Created A6 PDF, print PDF with 3 mm bleed/crop marks, and 300 dpi preview.')
