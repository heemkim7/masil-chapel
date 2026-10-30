// Server-authoritative 달란트 wallet. Local S.coins is a display cache; server balance wins.
const G = () => window.G;
const rpc = async (fn, args) => { const n = G()?.net; if (!n?.sb) return null; try { const r = await n.sb.rpc(fn, { p_secret: n.secret(), ...args }); return r.error ? { err: r.error.message } : r.data; } catch (e) { return { err: String(e) }; } };
const apply = d => { if (d && typeof d.talent === 'number' && G()?.S) { G().S.coins = d.talent; G().refreshHud?.(); G().persist?.(); } return d; };
export const W = {
  online: false,
  async sync() { const S = G()?.S; const d = await rpc('wallet_get', { p_seed: S?.coins ?? 150 }); if (d && !d.err) { this.online = true; apply(d); } return d; },
  async earn(kind, n = 1) { const d = await rpc('earn', { p_kind: kind, p_n: n | 0 }); if (d && !d.err) { apply(d); if (!d.granted && d.why === 'cap') G()?.toast?.('오늘 받을 수 있는 달란트를 모두 받았어요 · 내일 또 만나요'); } return d; },
  async spend(amt, item) { if (!this.online) return { ok: true, local: true }; const d = await rpc('spend', { p_amount: amt, p_item: item || null }); if (d?.err) { await this.sync(); return { err: d.err }; } apply(d); return { ok: true }; },
  async odds() { const n = G()?.net; if (!n?.sb) return null; const r = await n.sb.rpc('gacha_odds'); return r.data; },
};
window.W = W;
