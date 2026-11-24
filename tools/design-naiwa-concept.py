"""Preview only: crop/recolor the user's reference, then compose a design board.

This is a local image-editing study, not AI image generation or a shipped skin.
"""
from pathlib import Path
import math
import colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'designs' / 'naiwa-concept-v2'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = OUT / 'reference-upper-body.jpg'
if not SOURCE.exists():
    SOURCE = Path('C:/Users/armstrong/AppData/Local/Temp/codex-clipboard-649e41ba-8161-4388-8718-049bd7543454.jpg')
REF = Image.open(SOURCE).convert('RGB')
if SOURCE != OUT / 'reference-upper-body.jpg':
    REF.save(OUT / 'reference-upper-body.jpg', quality=95)
FONT = Path('C:/Windows/Fonts/msyh.ttc')
BOLD = Path('C:/Windows/Fonts/msyhbd.ttc')

def cubic(a, b, c, d, steps=60):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in (0,1)) for t in np.linspace(0,1,steps)]

def curve(start, segments):
    points = [start]
    for b,c,end in segments:
        points.extend(cubic(points[-1],b,c,end))
    return points

# Keep the supplied head, shoulders, both arms and hands; give the bust a
# softly curved lower edge below the hands rather than a square crop.
OUTLINE = [(0,0),(REF.width,0),(REF.width,1135)]
OUTLINE += cubic((REF.width,1135),(REF.width*.72,1280),(REF.width*.28,1280),(0,1135))
mask = Image.new('L', REF.size)
ImageDraw.Draw(mask).polygon(OUTLINE, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(.7))
raw = np.array(REF).astype(np.float32)/255
gray = raw.mean(axis=2)
# Remove the white source background, including its antialiased edge.
white_alpha = np.clip((1-raw.min(axis=2))/.12,0,1)
alpha = np.array(mask)/255*white_alpha
crop = (105,177,1005,1255)

PALETTE = [
    ('黄奶娃',None,'#edc04a'), ('红奶娃',.0,'#dc4e4d'), ('紫奶娃',.76,'#9756d3'),
    ('蓝奶娃',.59,'#4b9cdb'), ('绿奶娃',.33,'#60b963'), ('粉奶娃',.94,'#e877b3'),
    ('橙奶娃',.075,'#e69635'), ('青奶娃',.48,'#45beb2'), ('白奶娃',-1,'#c4c3b5'),
]

def recolor(hue):
    if hue is None:
        data = raw.copy()
    else:
        hsv = np.array(REF.convert('HSV')).astype(np.float32)/255
        # Recolor the complete skin, including its warm shadows. Preserve the
        # green iris with a soft spatial mask so thresholding cannot leave gold patches.
        eyes = Image.new('L',REF.size)
        eyes_draw=ImageDraw.Draw(eyes)
        eyes_draw.ellipse((417,254,527,350),fill=255)
        eyes_draw.ellipse((323,296,353,365),fill=255)
        strength = 1-np.array(eyes.filter(ImageFilter.GaussianBlur(2)))/255
        target = hsv.copy()
        if hue == -1:
            target[:,:,0] = .135
            target[:,:,1] *= .035
            target[:,:,2] = .21 + target[:,:,2]*.78
        else:
            # Direct yellow-to-target replacement; preserve saturation and
            # value so the reference's material and shadow detail stay intact.
            target[:,:,0] = (hue+(hsv[:,:,0]-.145)*.18)%1
        changed = np.array(Image.fromarray(np.uint8(np.clip(target,0,1)*255), 'HSV').convert('RGB')).astype(np.float32)/255
        data = raw*(1-strength[:,:,None])+changed*strength[:,:,None]
    rgba = np.dstack([np.uint8(np.clip(data,0,1)*255),np.uint8(alpha*255)])
    return Image.fromarray(rgba).crop(crop)

BUSTS = [recolor(hue) for _,hue,_ in PALETTE]
for index,bust in enumerate(BUSTS):
    bust.save(OUT/f'bust-{index}.png')

def font(size,bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT),size)

def text(canvas, xy, message, size=24, fill='#4c5044', bold=False, anchor=None):
    ImageDraw.Draw(canvas).text(xy,message,font=font(size,bold),fill=fill,anchor=anchor)

def shadow(canvas, box, radius=24, blur=20, color=(67,62,45,22), shift=(0,9)):
    layer = Image.new('RGBA',canvas.size)
    b = [box[0]+shift[0],box[1]+shift[1],box[2]+shift[0],box[3]+shift[1]]
    ImageDraw.Draw(layer).rounded_rectangle(b,radius=radius,fill=color)
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))

def paste_bust(canvas, index, box, with_shadow=True):
    bust = BUSTS[index].copy()
    bust.thumbnail((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS)
    x = round((box[0]+box[2]-bust.width)/2)
    y = round((box[1]+box[3]-bust.height)/2)
    if with_shadow:
        layer=Image.new('RGBA',canvas.size)
        ellipse=(x+bust.width*.20,y+bust.height*.96,x+bust.width*.85,y+bust.height*1.02)
        ImageDraw.Draw(layer).ellipse(ellipse,fill=(100,82,45,25))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(max(3,bust.width*.025))))
    canvas.alpha_composite(bust,(x,y))

def line_face(draw, x,y,w,h, color, width=2, shift=(0,0)):
    # Spare side-profile: forehead/nose/jaw, a round eye and a quiet mouth.
    def scale(p): return (x+p[0]*w+shift[0],y+p[1]*h+shift[1])
    profile=curve((.68,.08),[
        ((.34,.05),(.27,.25),(.23,.36)),
        ((.19,.46),(.13,.48),(.16,.53)),
        ((.19,.57),(.30,.57),(.45,.56)),
    ])
    jaw=curve((.16,.55),[
        ((.22,.63),(.39,.67),(.45,.75)),
        ((.54,.86),(.50,.95),(.43,1.00)),
    ])
    draw.line([scale(p) for p in profile],fill=color,width=width,joint='curve')
    draw.line([scale(p) for p in jaw],fill=color,width=width,joint='curve')
    ex,ey=scale((.40,.36))
    r=w*.075
    draw.arc((ex-r,ey-r,ex+r,ey+r),30,300,fill=color,width=width)
    draw.line([scale((.19,.57)),scale((.36,.57))],fill=color,width=width)

def back_card(light=False, size=(280,360)):
    w,h=size
    rng=np.random.default_rng(7)
    yy,xx=np.mgrid[0:h,0:w]
    glow=np.exp(-(((xx-w*.2)/(w*.9))**2+((yy-h*.15)/(h*.7))**2))
    noise=rng.normal(0,.7,(h,w))
    base=np.array([235,230,215] if light else [19,22,21])
    lift=np.array([14,13,10] if light else [16,19,15])
    rgb=np.clip(base+glow[:,:,None]*lift+noise[:,:,None],0,255).astype('uint8')
    card=Image.fromarray(rgb).convert('RGBA')
    cardmask=Image.new('L',size)
    ImageDraw.Draw(cardmask).rounded_rectangle((0,0,w-1,h-1),radius=26,fill=255)
    card.putalpha(cardmask)
    d=ImageDraw.Draw(card)
    d.rounded_rectangle((1,1,w-2,h-2),radius=26,outline='#d1c9ad' if light else '#4a4e3f',width=2)
    d.rounded_rectangle((12,12,w-13,h-13),radius=19,outline='#d5cebc' if light else '#373c31',width=1)
    x,y,cw,ch=w*.21,h*.14,w*.65,h*.63
    line_face(d,x,y,cw,ch,'#b6ae98' if light else '#050807',6,(1,3))
    if light:
        line_face(d,x,y,cw,ch,'#fffcf1',4,(-1,-1))
        line_face(d,x,y,cw,ch,'#333a30',2)
    else:
        line_face(d,x,y,cw,ch,'#615836',4)
        line_face(d,x,y,cw,ch,'#c4b276',2,(-1,-1))
        # Thin warm highlights catch the relief, avoiding a flat neon outline.
        for px,py in [(w*.46,h*.19),(w*.35,h*.39),(w*.50,h*.67)]:
            d.ellipse((px-1,py-1,px+2,py+2),fill='#dfd3a5')
    text(card,(w/2,h*.87),'奶娃宇宙',14,'#787b68' if light else '#88856a',anchor='mm')
    return card

W,H=1800,1800
rng=np.random.default_rng(11)
paper=np.clip(np.array([246,243,234])+rng.normal(0,.45,(H,W,1)),0,255).astype('uint8')
board=Image.fromarray(paper).convert('RGBA')
d=ImageDraw.Draw(board)
d.rounded_rectangle((72,59,267,99),radius=20,fill='#e2e7d7')
text(board,(169,79),'风格提案 02',18,'#637455',anchor='mm')
text(board,(72,116),'奶娃宇宙',66,'#363e31',True)
text(board,(75,207),'上半身像  /  原图质感  /  九色奶娃',24,'#8b8c7c')
d.line((73,268,1727,268),fill='#dedecf',width=2)

# Hero portrait and material direction.
d.rounded_rectangle((72,305,861,1110),radius=36,fill='#eeecdd')
d.ellipse((105,340,825,1085),fill='#f8f5e7')
paste_bust(board,0,(118,332,815,1030))
text(board,(104,1056),'黄奶娃（原奶娃）',25,'#565d48',True)
text(board,(838,1081),'保留肩膀、胳膊与上半身',18,'#92927d',anchor='rm')

text(board,(913,309),'九色奶娃',29,'#414b37',True)
text(board,(1727,320),'黄色直接换色，保留明暗与眼睛',18,'#8b907e',anchor='rm')
for i,(name,hue,color) in enumerate(PALETTE):
    row,col=divmod(i,3)
    x,y=913+col*274,369+row*248
    d.rounded_rectangle((x,y,x+250,y+230),radius=23,fill='#fffdf6')
    paste_bust(board,i,(x+25,y+7,x+225,y+191),False)
    d.ellipse((x+68,y+207,x+76,y+215),fill=color)
    text(board,(x+133,y+211),name,19,'#737964',anchor='mm')

# The card studies share dimensions and paper details with the existing game.
text(board,(74,1174),'卡牌质感',31,'#414b37',True)
text(board,(1727,1189),'半身正面，统一背面；翻开前不透露颜色',21,'#8b907e',anchor='rm')

front=Image.new('RGBA',(280,360),'#fffdf5')
fd=ImageDraw.Draw(front)
fd.rounded_rectangle((1,1,278,358),radius=26,fill='#fffcf0',outline='#d5cfb5',width=2)
fd.rounded_rectangle((12,12,267,347),radius=19,outline='#e8e2cb',width=1)
paste_bust(front,0,(18,23,262,285))
text(front,(140,313),'黄奶娃',24,'#727553',True,anchor='mm')
fm=Image.new('L',front.size)
ImageDraw.Draw(fm).rounded_rectangle((0,0,279,359),radius=26,fill=255)
front.putalpha(fm)
cards=[front,back_card(),back_card(True)]
for i,card in enumerate(cards):
    x=74+i*348
    shadow(board,(x,1237,x+280,1597),26)
    board.alpha_composite(card,(x,1237))
    text(board,(x+140,1641),['卡牌正面','统一卡背 · 黑曜金','备选卡背 · 奶油墨线'][i],22,'#505a43',True,anchor='mm')

# Small restrained palette/material note.
d.rounded_rectangle((1183,1238,1726,1670),radius=30,fill='#e7ebde')
text(board,(1220,1279),'这一版的调整',27,'#4d5d40',True)
for j,(title,detail) in enumerate([
    ('取景','肩膀、双臂、上半身都保留'),
    ('界面','奶油白底，鼠尾草绿按钮'),
    ('卡背','暗金细线，微浮雕与细砂纹'),
    ('配色','直接替换黄色，保留原图光影'),
]):
    y=1348+j*68
    text(board,(1220,y),title,20,'#687859',True)
    text(board,(1300,y),detail,20,'#78866c')
d.line((74,1730,1726,1730),fill='#dedecf',width=1)
text(board,(75,1760),'讨论稿 · 基于提供的参考图裁切与换色',18,'#9b9d8d')
text(board,(1727,1760),'尚未接入游戏',18,'#9b9d8d',anchor='rm')
board.convert('RGB').save(OUT/'naiwa-style-board.jpg',quality=96,subsampling=0)
board.save(OUT/'naiwa-style-board.png')
back_card().save(OUT/'cardback-obsidian.png')
back_card(True).save(OUT/'cardback-cream.png')
print(OUT/'naiwa-style-board.jpg')
