// Save/load + game rules (quests, gacha, level, decor). Pure logic, no DOM.
const KEY = 'chapel_v4_save';
export function newSave(name, outfit) {
  return { v: 1, name, outfit, coins: 150, xp: 0, inv: [], equip: { hat: null, back: null, pet: null },
    quest: { stage: 0, talked: {}, got: [], round: 1 }, decorInv: {}, yard: [], inside: [], pos: null, scene: 'field', worshipBest: 0 };
}
export const hasSave = () => !!localStorage.getItem(KEY);
export function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
export function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function wipe() { localStorage.removeItem(KEY); }

export function levelInfo(cfg, xp) {
  const L = cfg.levels; let lv = 0; while (lv + 1 < L.length && xp >= L[lv + 1]) lv++;
  const lo = L[lv], hi = L[lv + 1] ?? lo; return { lv: lv + 1, pct: hi > lo ? (xp - lo) / (hi - lo) : 1, max: lv + 1 >= L.length };
}
export function rollGacha(cfg, s, rnd = Math.random) {
  const g = cfg.gacha; if (s.coins < g.cost) return { err: '코인이 부족해요' };
  s.coins -= g.cost;
  let t = g.pool.reduce((a, p) => a + p.w, 0) * rnd(); let it = g.pool[0];
  for (const p of g.pool) { if ((t -= p.w) < 0) { it = p; break; } }
  if (it.kind === 'decor') { s.decorInv[it.id] = (s.decorInv[it.id] || 0) + 1; return { item: it, dup: false }; }
  const bag = it.kind === 'cos' ? (s.cos ||= []) : s.inv, dup = bag.includes(it.id);
  if (dup) s.coins += g.dupRefund; else bag.push(it.id);
  return { item: it, dup };
}
export const QUEST_TEXT = [
  '목사님께 인사하기',
  '마을 친구들과 이야기하기 (하은, 양이)',
  '숨겨진 축복의 별·꽃잎 모으기',
  '목사님께 별 전해드리기',
  '완료! 목사님께 다시 말 걸어 새 임무 받기'];

// Community board: local adapter now; swap `adapter` for a network one later (same async API).
export class Board {
  constructor(key, seed) { this.key = key; if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed)); }
  async list() { return JSON.parse(localStorage.getItem(this.key)).sort((a, b) => b.ts - a.ts); }
  async post(author, text, kind = 'prayer') { const a = JSON.parse(localStorage.getItem(this.key)); const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), author, text, kind, ts: Date.now(), prayers: 0 }; a.push(p); localStorage.setItem(this.key, JSON.stringify(a)); return p; }
  async pray(id) { const a = JSON.parse(localStorage.getItem(this.key)); const p = a.find(x => x.id === id); if (p) p.prayers++; localStorage.setItem(this.key, JSON.stringify(a)); return p; }
}
export const BOARD_SEED = [
  { id: 's1', author: '하은', text: '이번 주 성가대 발표 떨지 않게 기도해주세요 🎵', kind: 'prayer', ts: 1, prayers: 3 },
  { id: 's2', author: '양이', text: '우비 잃어버렸어요… 찾게 해주세요 ☔', kind: 'prayer', ts: 2, prayers: 5 },
  { id: 's3', author: '목사님', text: '주일 오후 마을 꽃심기 함께해요 🌸', kind: 'notice', ts: 3, prayers: 8 }];
