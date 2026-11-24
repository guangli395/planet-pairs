"""Original vector artwork for the playable prototype; no external media."""
from pathlib import Path
import random

root = Path(__file__).resolve().parents[1] / 'public' / 'assets'
root.mkdir(parents=True, exist_ok=True)
palettes = [
 ('#d7fff0','#6cdbc0','#248b98'), ('#ffd4c6','#ff856f','#b93259'),
 ('#f1dbff','#b68bea','#5149a3'), ('#c8f8ff','#6bbcec','#2969a8'),
 ('#fff6c9','#edce6e','#d58a47'), ('#f6c7eb','#c84fa4','#652c82'),
 ('#ffd09a','#d85c32','#702b2b'), ('#e2e5ff','#8d9be6','#515695'),
 ('#efffc7','#acd66c','#388d7c'),
]
for i,(light,base,dark) in enumerate(palettes):
 rng=random.Random(811+i)
 marks=''
 if i in (0,3,8):
  for j in range(6):
   y=66+j*18
   marks+=f'<path d="M32 {y} Q95 {y-28} 150 {y+1} T224 {y-13}" fill="none" stroke="{light if j%2 else dark}" stroke-width="{rng.randint(8,16)}" opacity=".3"/>'
 else:
  for j in range(11):
   x,y,rad=rng.randint(64,192),rng.randint(57,195),rng.randint(5,16)
   marks+=f'<circle cx="{x}" cy="{y}" r="{rad}" fill="{dark}" opacity=".24"/><ellipse cx="{x-2}" cy="{y-3}" rx="{rad*.8}" ry="{rad*.65}" fill="{light}" opacity=".17"/>'
 ring=''
 if i in (2,4,7):
  ring=f'<ellipse cx="128" cy="134" rx="116" ry="31" fill="none" stroke="{base}" stroke-width="15" transform="rotate(-25 128 134)" opacity=".6"/>'
  front=f'<path d="M19 174 Q83 226 230 89" fill="none" stroke="{light}" stroke-width="10" stroke-linecap="round" opacity=".95"/>'
 else: front=''
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
 <defs><radialGradient id="surface" cx="31%" cy="23%" r="83%"><stop stop-color="{light}"/><stop offset=".42" stop-color="{base}"/><stop offset=".85" stop-color="{dark}"/><stop offset="1" stop-color="#29294b"/></radialGradient><radialGradient id="halo"><stop stop-color="{base}" stop-opacity=".28"/><stop offset="1" stop-color="{base}" stop-opacity="0"/></radialGradient><clipPath id="planet"><circle cx="128" cy="125" r="87"/></clipPath></defs>
 <ellipse cx="128" cy="222" rx="66" ry="10" fill="#080c27" opacity=".2"/>
 <circle cx="128" cy="125" r="121" fill="url(#halo)"/>{ring}
 <circle cx="128" cy="125" r="87" fill="url(#surface)"/>
 <g clip-path="url(#planet)">{marks}<ellipse cx="91" cy="69" rx="47" ry="23" transform="rotate(-34 91 69)" fill="white" opacity=".18"/></g>
 <path d="M57 95A78 78 0 0 1 124 47" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".5"/>{front}
 <circle cx="202" cy="42" r="3" fill="{light}" opacity=".8"/><path d="M36 44v12m-6-6h12" stroke="{light}" stroke-width="2" stroke-linecap="round"/>
 </svg>'''
 (root/f'planet-{i}.svg').write_text(svg,encoding='utf-8')

(root/'cardback.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="210" height="270" viewBox="0 0 210 270"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#cab6fa"/><stop offset=".5" stop-color="#8171bc"/><stop offset="1" stop-color="#4c467f"/></linearGradient><radialGradient id="h"><stop stop-color="#ecdbff" stop-opacity=".55"/><stop offset="1" stop-color="#c2a1e9" stop-opacity="0"/></radialGradient></defs><rect x="6" y="8" width="198" height="254" rx="25" fill="#352c59"/><rect x="5" y="3" width="198" height="254" rx="25" fill="url(#g)" stroke="#f5e1b6" stroke-width="3"/><rect x="17" y="15" width="174" height="230" rx="17" fill="none" stroke="#edd9b4" opacity=".65"/><circle cx="105" cy="125" r="82" fill="url(#h)"/><ellipse cx="105" cy="129" rx="66" ry="28" transform="rotate(-31 105 129)" fill="none" stroke="#efdbb2" stroke-width="2"/><circle cx="105" cy="129" r="43" fill="#c7b6eb" opacity=".45"/><path d="M105 78L117 116L155 129L117 141L105 180L93 142L55 129L93 116Z" fill="#fff0cc"/><path d="M105 103L111 123L130 129L111 135L105 155L99 135L80 129L99 123Z" fill="#b395cc"/><g fill="#fff0cc"><circle cx="45" cy="55" r="2.5"/><circle cx="161" cy="192" r="2"/><circle cx="54" cy="209" r="1.5"/><circle cx="163" cy="68" r="2"/></g><path d="M36 39h12m-6-6v12M163 219h12m-6-6v12" stroke="#fff0cc" stroke-width="1.7"/><text x="105" y="226" text-anchor="middle" fill="#f5e7cf" font-size="10" letter-spacing="3" font-family="sans-serif">A LITTLE LUCK</text></svg>''',encoding='utf-8')

# Same view box and frame geometry as cardback.svg keep both visible faces identical in size.
(root/'blessing-front.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="210" height="270" viewBox="0 0 210 270"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#fff5d5"/><stop offset=".55" stop-color="#e6d4eb"/><stop offset="1" stop-color="#c5a7ce"/></linearGradient><radialGradient id="h" cx=".4" cy=".3"><stop stop-color="#fffaf0" stop-opacity=".55"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient></defs><rect x="6" y="8" width="198" height="254" rx="25" fill="#696380"/><rect x="5" y="3" width="198" height="254" rx="25" fill="url(#g)" stroke="#fff7ef" stroke-width="3"/><rect x="17" y="15" width="174" height="230" rx="17" fill="none" stroke="#bda2c9" opacity=".65"/><rect x="5" y="3" width="198" height="254" rx="25" fill="url(#h)"/></svg>''',encoding='utf-8')
print(f'Wrote 11 original SVG assets to {root}')
