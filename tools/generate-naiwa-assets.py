"""Export the approved upper-body study and an obsidian/gold card collection.

Run with the workspace Python runtime (Pillow and NumPy are required).
The accepted reference-derived busts are the editable source; no AI service is used.
"""
from pathlib import Path
import base64
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/designs/naiwa-concept-v2'
OUT = ROOT / 'public/assets/naiwa'
OUT.mkdir(parents=True, exist_ok=True)
NAMES = ['黄奶娃','红奶娃','紫奶娃','蓝奶娃','绿奶娃','粉奶娃','橙奶娃','青奶娃','白奶娃']

# JPEG near-white compression blocks were faint on the paper study but become
# visible against obsidian. Keep only the connected silhouette of the bust.
source_alpha = Image.open(SOURCE / 'bust-0.png').getchannel('A')
silhouette = source_alpha.point(lambda value: 255 if value > 110 else 0)
ImageDraw.floodfill(silhouette, (450, 600), 128, thresh=0)
silhouette = silhouette.point(lambda value: 255 if value == 128 else 0)
silhouette = silhouette.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
silhouette = np.array(silhouette.filter(ImageFilter.GaussianBlur(.7))).astype(np.float32)/255

for index in range(9):
    bust = Image.open(SOURCE / f'bust-{index}.png').convert('RGBA')
    data = np.array(bust).astype(np.float32)
    data[:,:,3] *= silhouette
    alpha = data[:,:,3:4]/255
    # Unmatte the antialiased white reference edge for use on a dark surface.
    data[:,:,:3] = np.where(alpha > .03, np.clip((data[:,:,:3] - 255*(1-alpha))/np.maximum(alpha,.03),0,255),0)
    bust = Image.fromarray(data.astype('uint8'))
    bust.thumbnail((350,352),Image.Resampling.LANCZOS)
    square = Image.new('RGBA',(384,384))
    square.alpha_composite(bust,((384-bust.width)//2,12))
    square.save(OUT / f'naiwa-{index}.png',optimize=True)

PROFILE = 'M155 46C115 39 86 63 78 89C72 108 70 118 61 128C55 135 54 141 60 146C67 151 89 153 119 149M59 151C74 169 105 179 119 200C134 222 124 241 111 256'
GOLD = '''<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4d371d"/><stop offset=".15" stop-color="#ddba67"/><stop offset=".28" stop-color="#fff5c7"/><stop offset=".42" stop-color="#a67938"/><stop offset=".55" stop-color="#efd79a"/><stop offset=".7" stop-color="#77603a"/><stop offset=".86" stop-color="#f2da96"/><stop offset="1" stop-color="#694822"/></linearGradient>'''
def profile(transform=''):
    return f'''<g transform="{transform}" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="{PROFILE}" stroke="#03060a" stroke-width="6" transform="translate(1.4 2)"/><path d="{PROFILE}" stroke="url(#gold)" stroke-width="3.3"/><path d="M109 103a12 14 0 1 0 1 23M63 153l45 0" stroke="url(#gold)" stroke-width="2.5"/><path d="M154 45q-44-4-68 32M60 146q15 9 58 3M112 255q16-20 14-32" stroke="#fff0b3" stroke-width=".7" opacity=".8"/></g>'''

rng = np.random.default_rng(18)
flecks = ''.join(f'<circle cx="{rng.integers(20,190)}" cy="{rng.integers(18,270)}" r="{rng.uniform(.2,.6):.2f}" fill="#f2dc9c" opacity="{rng.uniform(.05,.15):.2f}"/>' for _ in range(85))
guilloche = ''.join(f'<ellipse cx="105" cy="142" rx="{49+i*2.1:.1f}" ry="{82+i*2.7:.1f}" transform="rotate({(i-6)*3} 105 142)" fill="none" stroke="#c09d56" stroke-width=".3" opacity=".09"/>' for i in range(13))
back = f'''<svg xmlns="http://www.w3.org/2000/svg" width="210" height="280" viewBox="0 0 210 280"><title>奶娃宇宙·黑曜鎏金统一卡背</title><defs>{GOLD}<linearGradient id="obsidian" x2="1" y2="1"><stop stop-color="#303339"/><stop offset=".38" stop-color="#131922"/><stop offset=".7" stop-color="#0c1018"/><stop offset="1" stop-color="#22282d"/></linearGradient><radialGradient id="aura" cx=".35" cy=".3"><stop stop-color="#c3a264" stop-opacity=".12"/><stop offset="1" stop-color="#10141d" stop-opacity="0"/></radialGradient><pattern id="grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1h5M1 0v5" stroke="#e8d6ad" stroke-width=".25" opacity=".05"/></pattern></defs><rect x="4" y="7" width="202" height="270" rx="24" fill="#594522"/><rect x="3" y="2" width="202" height="270" rx="24" fill="url(#obsidian)" stroke="url(#gold)" stroke-width="2.5"/><rect x="9" y="8" width="190" height="258" rx="19" fill="url(#grain)" stroke="#f0d899" stroke-opacity=".24" stroke-width=".6"/><rect x="15" y="14" width="178" height="246" rx="15" fill="url(#aura)" stroke="url(#gold)" stroke-opacity=".45" stroke-width=".7"/>{guilloche}{flecks}{profile('translate(5 0) scale(.91)')}<g fill="url(#gold)"><path d="m105 22 3 5-3 5-3-5ZM105 250l3 5-3 5-3-5Z"/><circle cx="35" cy="36" r="1.1"/><circle cx="176" cy="237" r="1"/></g><path d="M24 57V32q0-9 9-9h21M157 251h20q9 0 9-9v-22" fill="none" stroke="url(#gold)" stroke-width="1.2"/><path d="M22 16Q98-4 194 11" fill="none" stroke="#fff3c9" stroke-opacity=".45" stroke-width=".8"/></svg>'''
(OUT/'cardback.svg').write_text(back,encoding='utf-8')

# A flexible, heat-sealed foil pouch rather than a framed card: bowed sides,
# pinched seals, fine crimping, corner folds and a printed character on the film.
hero_data = base64.b64encode((OUT/'naiwa-0.png').read_bytes()).decode('ascii')
pouch = 'M20 15L218 18L215 45C207 101 226 204 214 283L221 314L18 318L24 286C13 219 13 111 24 44Z'
crimps = ''.join(f'<path d="M{x} 19l-1 23M{x} 291l1 22" stroke="#050912" stroke-width="1.3" opacity=".65"/><path d="M{x+1.2} 20l-1 21M{x+1.2} 292l1 20" stroke="#f8e2ac" stroke-width=".65" opacity=".48"/>' for x in range(27,214,4))
hidden = f'''<svg xmlns="http://www.w3.org/2000/svg" width="240" height="330" viewBox="0 0 240 330">
<title>奶娃宇宙·黑曜鎏金铝箔卡包</title>
<defs>{GOLD}
<linearGradient id="foil" x1="0" y1=".1" x2="1" y2=".18"><stop stop-color="#060b14"/><stop offset=".04" stop-color="#92908a"/><stop offset=".075" stop-color="#1a202a"/><stop offset=".13" stop-color="#5b5b5d"/><stop offset=".23" stop-color="#202938"/><stop offset=".48" stop-color="#3c4555"/><stop offset=".71" stop-color="#1a2231"/><stop offset=".89" stop-color="#121923"/><stop offset=".94" stop-color="#746f64"/><stop offset=".97" stop-color="#262b34"/><stop offset="1" stop-color="#060b14"/></linearGradient>
<linearGradient id="seal" x2="0" y2="1"><stop stop-color="#a69166"/><stop offset=".1" stop-color="#f4dfa2"/><stop offset=".19" stop-color="#554732"/><stop offset=".65" stop-color="#363a40"/><stop offset=".87" stop-color="#80745a"/><stop offset="1" stop-color="#0b111d"/></linearGradient>
<linearGradient id="crease"><stop stop-color="#fff0c6" stop-opacity=".55"/><stop offset=".35" stop-color="#c9bd9c" stop-opacity=".12"/><stop offset=".55" stop-color="#060a14" stop-opacity=".7"/><stop offset="1" stop-color="#fff0c6" stop-opacity="0"/></linearGradient>
<linearGradient id="film-light" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#e8d5a1" stop-opacity=".08"/><stop offset=".39" stop-color="#f1e9d5" stop-opacity=".12"/><stop offset=".47" stop-color="#fff8df" stop-opacity=".02"/><stop offset="1" stop-color="#030916" stop-opacity=".15"/></linearGradient>
<radialGradient id="print-glow"><stop stop-color="#d5b36c" stop-opacity=".13"/><stop offset="1" stop-color="#c4a26a" stop-opacity="0"/></radialGradient>
<pattern id="foil-grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1h5M1 0v5" stroke="#e9e1cd" stroke-width=".3" opacity=".08"/></pattern>
<clipPath id="pouch"><path d="{pouch}"/></clipPath>
</defs>
<path d="{pouch}" fill="url(#foil)" stroke="#bbb29a" stroke-opacity=".5" stroke-width=".8"/>
<g clip-path="url(#pouch)">
<path d="M20 15l198 3-3 27Q120 52 24 44Z" fill="url(#seal)"/>
<path d="M24 286Q120 281 214 283l7 31-203 4Z" fill="url(#seal)"/>
{crimps}
<path d="M24 44Q120 50 215 45M24 286Q120 280 214 283" fill="none" stroke="#080e1c" stroke-width="3"/>
<path d="M25 46Q121 52 214 47M25 288Q120 282 214 285" fill="none" stroke="#f4dfaf" stroke-opacity=".38" stroke-width=".7"/>
<path d="M25 46C13 123 18 223 25 285L36 275C25 198 28 113 36 57Z" fill="url(#crease)"/>
<path d="M213 47C207 118 222 222 213 284L202 273C214 195 200 110 202 60Z" fill="url(#crease)" opacity=".7"/>
<ellipse cx="120" cy="176" rx="82" ry="99" fill="url(#print-glow)"/>
<g fill="none" stroke="url(#gold)" stroke-width=".7" opacity=".26"><ellipse cx="120" cy="178" rx="72" ry="85"/><path d="m48 104 4 7-4 7-4-7ZM188 229l3 5-3 5-3-5ZM180 93l2 4-2 4-2-4Z"/></g>
<text x="119" y="81" text-anchor="middle" fill="#080e1c" font-size="23" font-weight="700" font-family="Microsoft YaHei,sans-serif" letter-spacing="2">奶娃宇宙</text>
<text x="118" y="79.7" text-anchor="middle" fill="url(#gold)" font-size="23" font-weight="700" font-family="Microsoft YaHei,sans-serif" letter-spacing="2">奶娃宇宙</text>
<image href="data:image/png;base64,{hero_data}" x="28" y="91" width="180" height="174"/>
<text x="120" y="276" text-anchor="middle" fill="#edd69b" font-size="14" font-weight="700" font-family="Microsoft YaHei,sans-serif" letter-spacing="2">奶娃惊喜包</text>
<path d="M24 47 62 64 33 104ZM212 46l-35 29 31 30ZM25 285l42-21-29 34ZM213 284l-37-20 26 31Z" fill="url(#crease)" opacity=".62"/>
<path d="m26 69 24 18m-23-1 13 9m169-28-18 24m19 164-22-15m-161 19 21-16M26 121q7 2 11 9m174 39-10 9" fill="none" stroke="#dad1b8" stroke-opacity=".19" stroke-width=".8"/>
<path d="M30 54Q111 38 208 58L205 274Q122 285 33 278Z" fill="url(#film-light)"/>
<path d="{pouch}" fill="url(#foil-grain)"/>
</g>
</svg>'''
(OUT/'hidden-pack.svg').write_text(hidden,encoding='utf-8')

board=Image.new('RGB',(1200,1390),'#111724')
draw=ImageDraw.Draw(board)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
title=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc',40)
draw.text((600,58),'奶娃宇宙 · 黑曜鎏金',font=title,fill='#ead398',anchor='mm')
for i,name in enumerate(NAMES):
    row,col=divmod(i,3)
    x,y=35+col*390,110+row*412
    draw.rounded_rectangle((x,y,x+350,y+385),radius=25,fill='#1e2636',outline='#8b7145',width=2)
    image=Image.open(OUT/f'naiwa-{i}.png').convert('RGBA')
    image.thumbnail((320,320),Image.Resampling.LANCZOS)
    board.paste(image,(x+(350-image.width)//2,y+16),image)
    draw.text((x+175,y+354),name,font=font,fill='#e8d9af',anchor='mm')
board.save(OUT/'preview.jpg',quality=93)
print('Exported 9 transparent PNG portraits, a gold SVG card back, hidden pack and preview.')
print('Asset bytes:',sum(p.stat().st_size for p in OUT.iterdir() if p.is_file()))
