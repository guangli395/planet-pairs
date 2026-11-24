// Original code-drawn temporary artwork. Run with: node tools/generate-carrot-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../public/assets/carrot/', import.meta.url);
await mkdir(out, { recursive: true });
const colors = [
  ['#b9e580','#76b549','#3d742f'], ['#ffe0f0','#f49bcd','#c45a9b'], ['#dac7fa','#ab8bd3','#77549e'],
  ['#c0e8ff','#7cb6e0','#437db2'], ['#fff98a','#f0df2e','#aa9718'], ['#e66071','#bd2942','#7e1930'],
  ['#ffad43','#df7619','#a4490d'], ['#b6eee1','#71c3b2','#398d82'], ['#ffffff','#e6ecd9','#9ea98b'],
];
function carrot(index) {
  const [light, mid, dark] = colors[index];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
<defs>
 <linearGradient id="body" x1=".15" y1=".05" x2=".85" y2=".95"><stop stop-color="#ffca79"/><stop offset=".38" stop-color="#ff9f4e"/><stop offset=".78" stop-color="#ee7836"/><stop offset="1" stop-color="#d75b2c"/></linearGradient>
 <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${light}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
 <linearGradient id="belly" x2="0" y2="1"><stop stop-color="#ffe0a2" stop-opacity=".78"/><stop offset="1" stop-color="#ffbf65" stop-opacity="0"/></linearGradient>
 <radialGradient id="cheek"><stop stop-color="#ed795f" stop-opacity=".7"/><stop offset="1" stop-color="#f69268" stop-opacity="0"/></radialGradient>
 <radialGradient id="eye" cx=".32" cy=".25" r=".8"><stop stop-color="#65483c"/><stop offset=".7" stop-color="#3d2c26"/><stop offset="1" stop-color="#251e1b"/></radialGradient>
</defs>
<ellipse cx="160" cy="289" rx="66" ry="10" fill="#956844" opacity=".12"/>
<g stroke="${dark}" stroke-width="3" stroke-linejoin="round">
 <path d="M156 111C128 112 84 89 78 49C109 47 144 65 156 111Z" fill="url(#leaf)"/>
 <path d="M159 109C138 78 137 34 161 18C187 42 183 82 159 109Z" fill="url(#leaf)"/>
 <path d="M164 113C168 74 205 45 239 49C237 82 200 110 164 113Z" fill="url(#leaf)"/>
</g>
<g fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M147 101 96 61m32 23-22 1m55 10V37m15 65 47-42m-30 29 21 1"/></g>
<path d="M158 104C110 85 71 114 73 160C75 213 114 250 153 280C159 285 165 283 170 278C207 243 247 209 247 160C248 115 208 87 169 104Z" fill="url(#body)" stroke="#be6232" stroke-width="3" stroke-linejoin="round"/>
<path d="M99 127C115 110 135 109 143 115C151 121 140 130 122 136C109 141 98 150 92 147C87 144 91 135 99 127Z" fill="#ffe5b9" opacity=".65"/>
<ellipse cx="158" cy="203" rx="51" ry="50" fill="url(#belly)"/>
<path d="M78 168q13 3 22 0m132 14-16 4m-115 26 16-2m68 33 12-5m-49 25 9-2" fill="none" stroke="#d16832" stroke-width="4" stroke-linecap="round" opacity=".48"/>
<ellipse cx="108" cy="187" rx="24" ry="17" fill="url(#cheek)"/><ellipse cx="212" cy="187" rx="24" ry="17" fill="url(#cheek)"/>
<g fill="url(#eye)"><ellipse cx="127" cy="166" rx="15.5" ry="21"/><ellipse cx="193" cy="166" rx="15.5" ry="21"/></g>
<g fill="#fff9ee"><ellipse cx="122" cy="158" rx="5.5" ry="7"/><ellipse cx="188" cy="158" rx="5.5" ry="7"/><circle cx="133" cy="174" r="2.5"/><circle cx="199" cy="174" r="2.5"/></g>
<path d="M145 192Q160 214 175 192Q160 200 145 192Z" fill="#8a4632" stroke="#8a4632" stroke-width="2" stroke-linejoin="round"/>
<path d="M152 202Q160 198 168 202Q160 208 152 202Z" fill="#f5a08b"/>
<g fill="#ffe6bd" opacity=".6"><ellipse cx="98" cy="179" rx="6" ry="2"/><ellipse cx="222" cy="179" rx="6" ry="2"/></g>
<path d="M150 111Q160 116 170 110" fill="none" stroke="#ffe2a4" stroke-width="4" stroke-linecap="round" opacity=".7"/>
</svg>`;
}
for (let i = 0; i < 9; i++) await writeFile(new URL(`carrot-${i}.svg`, out), carrot(i));
const emblem = `<g transform="translate(66 75) scale(.4)"><path d="M82 100Q55 40 29 35Q26 83 82 100M82 100Q66 37 87 14Q112 50 82 100M85 100Q128 36 156 46Q144 93 85 100" fill="#6f9f49" stroke="#4c7d32" stroke-width="4"/><path d="M83 99C28 72 14 133 44 178L78 221Q84 228 90 220L128 177C157 132 137 74 83 99Z" fill="#ef9853" stroke="#ae6539" stroke-width="4"/><path d="m42 143 17 2m51 19 13-4m-50 30 10-2" stroke="#cf753a" stroke-width="4" stroke-linecap="round" fill="none"/></g>`;
await writeFile(new URL('cardback.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="270" viewBox="0 0 210 270"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fff8de"/><stop offset="1" stop-color="#efd4a1"/></linearGradient><pattern id="dots" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="1.5" fill="#bd9562" opacity=".2"/></pattern></defs><rect x="6" y="9" width="198" height="254" rx="25" fill="#bb8a56"/><rect x="5" y="3" width="198" height="254" rx="25" fill="url(#paper)" stroke="#b98551" stroke-width="3"/><rect x="16" y="14" width="176" height="232" rx="18" fill="url(#dots)" stroke="#fffdf0" stroke-width="2"/><path d="M48 71Q105 40 163 71L157 197Q105 232 53 197Z" fill="#fff6dc" stroke="#d4b37c" stroke-width="2"/>${emblem}<g fill="#89a461"><path d="M33 33q18-5 10 14-16 2-10-14M173 225q18-5 10 14-16 2-10-14"/></g><g fill="#e9a46b"><circle cx="174" cy="43" r="4"/><circle cx="36" cy="229" r="4"/></g></svg>`);
await writeFile(new URL('hidden-pack.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="330" viewBox="0 0 240 330"><defs><linearGradient id="bag" x2="1" y2="1"><stop stop-color="#ffe4ac"/><stop offset=".48" stop-color="#f2be7b"/><stop offset="1" stop-color="#dd9657"/></linearGradient></defs><path d="M24 24Q24 14 35 14H205Q216 14 216 25L211 307Q210 318 198 318H42Q30 318 29 306Z" fill="url(#bag)" stroke="#b77b43" stroke-width="3"/><path d="M27 37H213M28 299H212" stroke="#b87f49" stroke-width="15" stroke-dasharray="3 4" opacity=".4"/><rect x="44" y="64" width="152" height="217" rx="21" fill="#fff5d9" stroke="#fff9eb" stroke-width="3"/><path d="M51 247q69-31 138 0v22H51" fill="#d9ddb3"/>${emblem.replace('translate(66 75) scale(.4)', 'translate(56 76) scale(.76)')}<path d="M181 76q-3 20-22 22 0-21 22-22" fill="#799d52"/><text x="120" y="266" text-anchor="middle" font-size="16" font-weight="700" fill="#8a5f3a" font-family="Microsoft YaHei,sans-serif">惊喜萝卜包</text></svg>`);
const names = ['绿','粉','紫','蓝','黄','红','橙','青','白'];
await writeFile(new URL('preview.svg', out), `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1080" viewBox="0 0 960 1080"><rect width="960" height="1080" rx="32" fill="#fff4df"/><text x="480" y="62" text-anchor="middle" font-size="32" font-weight="700" font-family="Microsoft YaHei,sans-serif" fill="#755033">萝卜宇宙</text>${names.map((name,i)=>`<svg x="${i%3*320}" y="${Math.floor(i/3)*320+70}" width="320" height="290" viewBox="0 0 320 320">${carrot(i).replace(/^<svg[^>]+>|<\/svg>$/g,'').replace(/id="([^"]+)"/g,`id="$1-${i}"`).replace(/url\(#([^)]+)\)/g,`url(#$1-${i})`)}</svg><text x="${i%3*320+160}" y="${Math.floor(i/3)*320+375}" text-anchor="middle" font-size="20" fill="#755033" font-family="Microsoft YaHei,sans-serif">${name}萝卜星球</text>`).join('')}</svg>`);
console.log('Created nine carrot characters, card back, hidden pack and preview.');
