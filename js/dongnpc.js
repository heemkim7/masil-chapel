// Per-dong NPC variation. Core NPCs (목사님, 권사님, 하은, 양이) never change.
// Villagers, shopkeepers and their lines are seeded deterministically by the 행정동 code.
import { AV } from './avatar.js';
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황'];
const GN = { f: ['서연', '지우', '하린', '수아', '예린', '민서', '채원', '다은', '윤아', '소율', '지민', '은비'], m: ['민준', '도윤', '서준', '하준', '예준', '시우', '지호', '건우', '우진', '현우', '준서', '태윤'] };
const TITLE = [['', '어린이'], ['', ''], ['', '집사님'], ['', '할머니', '할아버지']];
const WALK = d => [`${d} 공기가 참 좋네요~`, `${d}에 이사 온 지 벌써 일 년이에요`, `${d} 시장 떡볶이 드셔 보셨어요?`, `오늘도 ${d} 한 바퀴 산책 중이에요 🚶`, `${d} 예배당 종소리 들으면 마음이 편해요`, `${d} 골목에 꽃이 피었어요 🌼`, `이번 주일에 ${d} 예배당에서 만나요!`, `${d} 사람들은 다 친절해요 😊`];
const KEEP = { clothes: ['옷가게', ['오늘 들어온 신상이에요!', '어울리는 모자 골라 드릴게요']], flower: ['꽃집', ['갓 들어온 꽃이에요 🌷', '예배당에 꽃 한 송이 어때요?']], bakery: ['빵집', ['방금 구운 빵이에요 🍞', '소금빵이 제일 인기예요']], cafe: ['카페', ['따뜻한 라떼 한 잔 하세요 ☕', '오늘의 원두는 고소해요']], book: ['서점', ['말씀 한 구절 함께 읽어요 📖', '새로 들어온 묵상집이 있어요']] };
let base = null, cur = null;
function avatarFor(r, age) { const g = r() < .5 ? 'f' : 'm', a = age ?? Math.floor(r() * 4); const pick = n => Math.floor(r() * n);
  const hats = Object.keys(AV.COS).filter(k => AV.COS[k].slot === 'hat' && AV.COS[k].rar !== '전설');
  return { g, a, code: [g, a, pick(AV.SKIN.length), pick(AV.HAIRS[g].length), a === 3 ? 7 : pick(AV.HAIRC.length), AV.OUTFITS[g][pick(AV.OUTFITS[g].length)][0], r() < .35 ? hats[pick(hats.length)] : '-', '-', '-', '-'].join('.') }; }
function personName(r, g, a) { const n = GN[g][Math.floor(r() * GN[g].length)]; if (a === 3) return SUR[Math.floor(r() * SUR.length)] + (g === 'f' ? ' 할머니' : ' 할아버지'); if (a === 2) return SUR[Math.floor(r() * SUR.length)] + n + ' 집사님'; return n; }
export function apply(d) { const G = window.G; if (!G?.wanderers || !G.cfg) return; const cfg = G.cfg(); const key = d ? d.cd : 'solo'; if (cur === key && G.wanderers[0]?._dn === key) return; cur = key; G.wanderers.forEach(w => w._dn = key);
  const dn = !d ? '마실' : /동$/.test(d.name) ? d.name.replace(/제?\d+동$/, '동') : d.name; const r = rng(hash('npc' + key));
  base ||= { keep: cfg.shops.map(s => s.keeper), n: G.wanderers.filter(w => !w.pilgrim).length };
  // villagers: reuse the configured wanderer slots plus 2–4 extra 산책하는 주민
  const extra = d ? 2 + Math.floor(r() * 3) : 0; G.wanderers.length = base.n;
  for (let i = 0; i < extra; i++) G.addWanderer()._dn = key;
  G.wanderers.forEach((w, i) => { if (w.pilgrim) return; if (!d && i < base.n) { w.av = null; w._avp = null; w.lines = null; w.name = cfg.wanderers[i]?.name || w.name; w.char = 'player'; w.outfit = cfg.wanderers[i]?.outfit || 'basic'; w.drawH = 145; return; }
    const A = avatarFor(r); AV.apply(w, A.code); AV.preload(AV.parse(A.code)); w.drawH = Math.round(w.drawH * .97); w.name = personName(r, A.g, A.a);
    const L = WALK(dn); w.lines = [L[Math.floor(r() * L.length)], L[Math.floor(r() * L.length)], L[Math.floor(r() * L.length)]]; });
  // shopkeepers
  cfg.shops.forEach((s, i) => { if (!d) { s.keeper = base.keep[i]; s._dl = null; return; } const A = avatarFor(r, 1 + Math.floor(r() * 3)); s.keeper = `${personName(r, A.g, A.a === 1 ? 2 : A.a)} · ${dn} ${KEEP[s.id]?.[0] || '가게'}`; s._av = A.code;
    s._dl = [`${dn}에 오신 걸 환영해요!`, `${dn} 주민이시군요? 반가워요 😊`, ...(KEEP[s.id]?.[1] || [])]; }); }
export function shopLines(sh) { return sh._dl || null; }
export const DN = { apply, shopLines, hash }; window.DN = DN;
