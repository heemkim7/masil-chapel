# brand images for 마실채플: og.png (1200x630) + icon512.png, Pretendard ExtraBold pastel gradient wordmark
from PIL import Image,ImageDraw,ImageFont
F='/tmp/Pretendard-ExtraBold.otf'
def grad(w,h):
    im=Image.new('RGB',(w,h));d=ImageDraw.Draw(im)
    for y in range(h): t=y/h; d.line([(0,y),(w,y)],fill=(int(255-10*t),int(236-10*t),int(246+5*t)))
    return im
def word(im,txt,size,cy):
    f=ImageFont.truetype(F,size); w=ImageDraw.Draw(im).textlength(txt,font=f); x0=(im.width-w)/2
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).text((x0,cy),txt,font=f,fill=255,anchor='lm')
    g=Image.new('RGB',im.size); gd=ImageDraw.Draw(g); a,b,c=(255,156,201),(201,168,255),(143,211,255)
    for x in range(im.width):
        t=min(1,max(0,(x-x0)/max(w,1))); s,e,u=(a,b,t*2) if t<.5 else (b,c,(t-.5)*2); gd.line([(x,0),(x,im.height)],fill=tuple(int(s[i]+(e[i]-s[i])*u) for i in range(3)))
    sh=Image.new('L',im.size,0); ImageDraw.Draw(sh).text((x0,cy+size*.05),txt,font=f,fill=255,anchor='lm'); im.paste((255,255,255),mask=sh); im.paste(g,mask=m)
og=grad(1200,630); word(og,'마실채플',190,280); ImageDraw.Draw(og).text((600,440),'우리 동네 예배당 메타버스 · 동네 인증',font=ImageFont.truetype(F,44),fill=(154,131,196),anchor='mm'); og.save('assets/og.png')
ic=grad(512,512); word(ic,'마실',200,230); ImageDraw.Draw(ic).text((256,390),'채플',font=ImageFont.truetype(F,96),fill=(154,131,196),anchor='mm'); ic.save('assets/icon512.png')
