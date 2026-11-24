// Milk tea game illustrations with the project's short flavor labels.
// Regenerate with: node tools/generate-milktea-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const output = new URL('../public/assets/milktea/', import.meta.url);
await mkdir(output, { recursive: true });
const drinks = [
  { name: '伯牙', light: '#fffdf3', body: '#eee3ce', shade: '#cbbb9c', accent: '#a82b34', ink: '#a82b34', lid: '#f8f2e7', style: 'boya' },
  { name: '茉莉', light: '#f5ffec', body: '#dfedd0', shade: '#abc295', accent: '#527b47', ink: '#325d3c', lid: '#f4f8e9', style: 'jasmine' },
  { name: '拿铁', light: '#f4dbb9', body: '#d5a479', shade: '#a96849', accent: '#7b3349', ink: '#fff7e8', lid: '#f5ead9', style: 'latte' },
  { name: '豆乳', light: '#fff3c9', body: '#e2ca92', shade: '#b5945d', accent: '#2469ab', ink: '#2469ab', lid: '#f5edce', style: 'soy' },
  { name: '糯米', light: '#f8e1df', body: '#e0b8b9', shade: '#a96c85', accent: '#c14580', ink: '#fff7fa', lid: '#343232', style: 'rice' },
  { name: '波霸', light: '#f7e5bb', body: '#d4ad7a', shade: '#a37143', accent: '#23754e', ink: '#23754e', lid: '#f4f3df', style: 'boba' },
  { name: '三兄弟', light: '#ffedbf', body: '#e1b270', shade: '#ba8551', accent: '#ed762c', ink: '#ffffff', lid: '#fce4bd', style: 'trio' },
  { name: '烤奶', light: '#e4c29d', body: '#bc8c61', shade: '#8c593d', accent: '#256961', ink: '#fff7e7', lid: '#f2e7ce', style: 'roast' },
  { name: '珍珠', light: '#fff0ca', body: '#dfbb87', shade: '#b58856', accent: '#de343e', ink: '#ffffff', lid: '#fff9ee', style: 'pearl' },
];

const pearls = (color = '#44312d') => [[105,248,9],[130,264,10],[153,244,9],[177,263,10],[200,247,9],[118,282,8],[155,281,9],[192,282,8]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x-3}" cy="${y-3}" r="2.2" fill="#fff0d0" opacity=".35"/>`).join('');
const flower = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})" fill="#fffdf0" stroke="#b6b39b" stroke-width="1.2">${[0,72,144,216,288].map(angle => `<ellipse cy="-9" rx="5.5" ry="10" transform="rotate(${angle})"/>`).join('')}<circle r="4" fill="#d7b460"/></g>`;
const teaLeaf = (x, y, angle = 0) => `<path transform="translate(${x} ${y}) rotate(${angle})" d="M0 0Q-27-30 0-44Q29-20 0 0Z" fill="#6e985d" stroke="#486d40" stroke-width="2"/><path transform="translate(${x} ${y}) rotate(${angle})" d="M0-5V-35" stroke="#bed396" stroke-width="2"/>`;

function artwork(index) {
  const drink = drinks[index];
  const straw = `<g class="drink-straw" transform="rotate(10 204 106)"><rect x="197" y="20" width="15" height="97" rx="6" fill="${drink.accent}"/><path d="M201 27v82" stroke="#fff9e9" stroke-width="3" opacity=".6"/></g>`;
  const cream = drink.style === 'latte' || drink.style === 'soy';
  const topping = drink.style === 'latte'
    ? `<path d="M83 103Q70 80 101 72Q95 48 125 48Q136 21 155 43Q179 25 188 49Q222 44 220 76Q247 83 232 106Z" fill="#fff7e7" stroke="#ddc9a9" stroke-width="3"/><path d="M104 75q37 18 98-9M97 91q64 10 122-1" fill="none" stroke="#e9dbc0" stroke-width="5" stroke-linecap="round"/>${[[117,60],[174,50],[207,83],[147,84]].map(([x,y]) => `<path d="M${x} ${y}l8-3 5 6-6 7-8-3Z" fill="#a6754d" stroke="#795339" stroke-width="1.5"/>`).join('')}`
    : drink.style === 'soy'
      ? `<path d="M76 103Q73 75 103 73Q99 53 124 52Q147 28 167 48Q200 39 213 67Q244 72 238 102Z" fill="#fff8e4" stroke="#ddc9a0" stroke-width="3"/><path d="M91 92q60 13 129-5" fill="none" stroke="#e6d3a6" stroke-width="7" stroke-linecap="round"/><g fill="#c3a16a">${[[100,77],[120,68],[143,61],[159,79],[182,60],[197,78],[218,91],[131,88],[177,94]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>` : '';
  let decoration = '';
  switch (drink.style) {
    case 'boya':
      decoration = `<path d="M82 131q44-28 53-6t-10 34q40-11 43 15M208 203q-33 13-20 33t36 5M98 236q-3 28 26 23" fill="none" stroke="${drink.accent}" stroke-width="2.5" opacity=".65"/><g fill="none" stroke="${drink.accent}" stroke-width="2" opacity=".65"><path d="m89 145 14-14 14 14-14 14ZM192 251l13-13 13 13-13 13ZM91 212l13-13 13 13-13 13Z"/></g><rect x="132" y="132" width="55" height="112" rx="7" fill="${drink.accent}"/><text x="160" y="176" fill="#fff7e7" font-size="31" font-weight="700" text-anchor="middle">${drink.name[0]}<tspan x="160" dy="40">${drink.name[1]}</tspan></text>${flower(84,84,.72)}`;
      break;
    case 'jasmine':
      decoration = `<rect x="82" y="133" width="156" height="99" rx="17" fill="${drink.accent}"/><path d="M94 226q60-23 132-2" fill="none" stroke="#aac293" stroke-width="2"/><text x="160" y="188" text-anchor="middle" fill="#fffde9" font-size="47" font-weight="800" font-family="STSong,serif">${drink.name}</text>${flower(100,93,.7)}${teaLeaf(233,130,35)}${flower(213,252,.58)}`;
      break;
    case 'latte':
      decoration = `<path d="M81 125h158l-16 130H97Z" fill="${drink.accent}"/><path d="M90 139h139M99 243h122" stroke="#e6b58a" stroke-width="2"/><circle cx="160" cy="186" r="43" fill="#f6ead3" stroke="#c8926e" stroke-width="3"/><text x="160" y="197" text-anchor="middle" fill="#7b3349" font-size="31" font-weight="700" font-family="STSong,serif">${drink.name}</text><path d="M115 231q40-13 90 0" fill="none" stroke="#f5ddbb" stroke-width="2"/>`;
      break;
    case 'soy':
      decoration = `<path d="M84 144h152l-8 94H93Z" fill="#f9f7e9" stroke="${drink.accent}" stroke-width="3"/><rect x="98" y="156" width="124" height="62" rx="9" fill="${drink.accent}"/><text x="160" y="197" text-anchor="middle" fill="#fffdf1" font-size="31" font-weight="800">${drink.name}</text><g fill="${drink.accent}" opacity=".9"><circle cx="108" cy="251" r="8"/><circle cx="132" cy="266" r="7"/><circle cx="192" cy="255" r="8"/><circle cx="211" cy="272" r="6"/></g>`;
      break;
    case 'rice':
      decoration = `<path d="M91 231q68-20 136 0l-6 48q-63 19-125-2Z" fill="#643449"/>${Array.from({length:20},(_,i) => `<ellipse cx="${103+(i%7)*18}" cy="${239+Math.floor(i/7)*16}" rx="5" ry="3" fill="${i%2?'#ae7e83':'#cda7a0'}" transform="rotate(-22 ${103+(i%7)*18} ${239+Math.floor(i/7)*16})"/>`).join('')}<path d="M79 138h161l-8 83H89Z" fill="${drink.accent}"/><text x="160" y="190" text-anchor="middle" fill="#fff8f0" font-size="36" font-weight="800">${drink.name}</text>`;
      break;
    case 'boba':
      decoration = `${pearls()}<circle cx="160" cy="174" r="47" fill="#f9f5df" stroke="${drink.accent}" stroke-width="6"/><text x="160" y="185" text-anchor="middle" fill="${drink.accent}" font-size="34" font-weight="800">${drink.name}</text><path d="M121 199q38 14 78 0" fill="none" stroke="${drink.accent}" stroke-width="2"/>`;
      break;
    case 'trio':
      decoration = `<g fill="#ffe49b" stroke="#c3924d" stroke-width="1.2"><path d="m97 234 31-3 1 31-30 3Z"/><path d="m138 249 25-4 4 31-28 1Z"/></g><g fill="#493b30"><path d="m169 230 29 4-5 25-28-3Z"/><path d="m198 263 23-5 4 23-29 3Z"/></g><g fill="#6b422c"><circle cx="114" cy="280" r="8"/><circle cx="154" cy="282" r="9"/><circle cx="181" cy="277" r="8"/></g><path d="M82 139h155l-8 80H91Z" fill="${drink.accent}"/><text x="160" y="193" text-anchor="middle" fill="#fffdf2" font-size="40" font-weight="900" font-family="Georgia,serif">${drink.name}</text>`;
      break;
    case 'roast':
      decoration = `<path d="M80 127h160l-16 132H96Z" fill="${drink.accent}"/><path d="M92 141h136l-11 103H103Z" fill="none" stroke="#d9c7a1" stroke-width="2"/><text x="160" y="197" text-anchor="middle" fill="#fff5df" font-size="36" font-weight="800" font-family="STSong,serif">${drink.name}</text><g stroke="#d9c9a0" fill="none" stroke-width="2"><path d="M108 149q17-23 29-25m-22 18-9-9m17 1 0-12M194 244q18-18 23-38m-11 17 12 1m-19 7-1-12"/></g>`;
      break;
    case 'pearl':
      decoration = `${pearls()}<path d="M80 128h160l-11 104H91Z" fill="${drink.accent}"/><circle cx="160" cy="175" r="34" fill="#fffaf0"/><g stroke="${drink.accent}" stroke-width="3" stroke-linecap="round"><path d="M160 152v46m-20-35 40 23m-40 0 40-23m-24-11 4 4 4-4m-4 38-4 4m8 0-4-4"/></g><text x="160" y="223" text-anchor="middle" fill="#fffaf0" font-size="20" font-weight="800">${drink.name}</text>`;
      break;
  }
  // Paint the straw above the lid surface, then cover its submerged tip with the front rim.
  const lid = cream
    ? `<path d="M71 103q89-12 178 0l-1 15q-88 13-176 0Z" fill="url(#rim)" stroke="#b3a188" stroke-width="2.5"/>${topping}`
    : `<ellipse class="lid-surface" cx="160" cy="102" rx="91" ry="15" fill="${drink.lid}" stroke="#b3a188" stroke-width="2.5"/><path d="M84 102q76-18 151 0" fill="none" stroke="#fffdf5" stroke-width="4" opacity=".7"/><ellipse cx="204" cy="109" rx="9" ry="3" fill="#886b51" opacity=".22"/>${straw}<path class="lid-front-rim" d="M69 102v10q91 23 182 0v-10q-91 23-182 0Z" fill="url(#rim)" stroke="#b3a188" stroke-width="2.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img"><title>${drink.name}</title><defs><linearGradient id="drink" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="${drink.shade}"/><stop offset=".22" stop-color="${drink.light}"/><stop offset=".7" stop-color="${drink.body}"/><stop offset="1" stop-color="${drink.shade}"/></linearGradient><linearGradient id="rim" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${drink.lid}"/></linearGradient><clipPath id="cup"><path d="M72 104H248L226 279Q224 294 160 296Q96 294 94 279Z"/></clipPath></defs><ellipse cx="160" cy="301" rx="77" ry="9" fill="#724b35" opacity=".13"/><path d="M72 104H248L226 279Q224 294 160 296Q96 294 94 279Z" fill="url(#drink)" stroke="#886b51" stroke-width="2.7"/><g clip-path="url(#cup)">${decoration}<path d="m83 115 24 161" stroke="#ffffff" stroke-width="8" opacity=".3" stroke-linecap="round"/><path d="m238 121-17 155" stroke="#70543c" stroke-width="4" opacity=".13" stroke-linecap="round"/></g><path d="M96 279q63 17 128 0" fill="none" stroke="#fffcf0" stroke-width="4" opacity=".6"/>${lid}</svg>`;
}

for (let index=0; index<drinks.length; index++) await writeFile(new URL(`drink-${index}.svg`, output), artwork(index));
const emblem = `<path d="m77 82 9 85q2 12 35 12t35-12l9-85Z" fill="#fff5df" stroke="#ad3437" stroke-width="4"/><ellipse cx="121" cy="83" rx="47" ry="7" fill="#efd0ab" stroke="#ad3437" stroke-width="4"/><path d="m136 85 9-36h12" fill="none" stroke="#ad3437" stroke-width="7" stroke-linecap="round"/><path d="M91 123h60v27H91" fill="#d74643"/><g fill="#81533b"><circle cx="104" cy="162" r="5"/><circle cx="122" cy="166" r="5"/><circle cx="138" cy="160" r="5"/></g>`;
await writeFile(new URL('cardback.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="270" viewBox="0 0 210 270"><title>奶茶宇宙统一卡背</title><defs><pattern id="checks" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#f3d6c0"/><rect x="16" y="16" width="16" height="16" fill="#f3d6c0"/></pattern></defs><rect x="6" y="9" width="198" height="254" rx="24" fill="#a83a3a"/><rect x="5" y="3" width="198" height="254" rx="24" fill="#fff5e4" stroke="#bc4142" stroke-width="3"/><rect x="15" y="13" width="178" height="234" rx="17" fill="url(#checks)"/><rect x="29" y="31" width="151" height="196" rx="55" fill="#fff9eb" stroke="#c84947" stroke-width="2"/><g transform="translate(-16 10)">${emblem}</g><g fill="#bd4541"><circle cx="46" cy="45" r="4"/><circle cx="164" cy="219" r="4"/></g><path d="M72 211h66" stroke="#c84947" stroke-width="3" stroke-linecap="round"/></svg>`);
await writeFile(new URL('hidden-pack.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="330" viewBox="0 0 240 330"><title>奶茶惊喜包</title><defs><pattern id="stripe" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="15" height="30" fill="#c73f40"/></pattern></defs><path d="M24 17h192l-5 298H29Z" fill="#fff0d9" stroke="#a93a37" stroke-width="3"/><path d="M25 20h190v31H25Z" fill="url(#stripe)"/><path d="M30 283h181v29H30Z" fill="url(#stripe)"/><path d="M82 75v-9q38-32 76 0v9" fill="none" stroke="#b94540" stroke-width="7" stroke-linecap="round"/><rect x="43" y="90" width="154" height="170" rx="38" fill="#fffaf0" stroke="#d68f6e" stroke-width="2"/><g transform="translate(0 42)">${emblem}</g><text x="120" y="246" text-anchor="middle" fill="#a53d37" font-size="17" font-weight="700" font-family="Microsoft YaHei,sans-serif">奶茶惊喜包</text></svg>`);
await writeFile(new URL('preview.svg', output), `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1140" viewBox="0 0 960 1140"><rect width="960" height="1140" rx="32" fill="#fff6e9"/><text x="480" y="61" text-anchor="middle" font-size="32" font-weight="700" fill="#af3739" font-family="Microsoft YaHei,sans-serif">奶茶宇宙</text>${drinks.map((drink,index) => `<g transform="translate(${index%3*320} ${Math.floor(index/3)*345+75})"><svg width="320" height="290" viewBox="0 0 320 320">${artwork(index).replace(/^<svg[^>]+>|<\/svg>$/g,'').replace(/id="([^"]+)"/g, `id="$1-${index}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${index})`)}</svg><text x="160" y="310" text-anchor="middle" fill="#553d30" font-size="22" font-weight="700" font-family="Microsoft YaHei,sans-serif">${drink.name}</text></g>`).join('')}</svg>`);
console.log('Created nine milk tea illustrations, uniform card back, hidden pack and preview.');
