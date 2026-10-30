// v6 worship service: 찬양 → 대표기도 → 말씀 → 헌금 → 축도. Led by 목사님 NPC by default, or by one volunteer
// '오늘의 인도자' per room (Realtime broadcast claim, earliest claim wins). Leader text is length/rate limited;
// listeners can mute (local) or report (insert-only Supabase table). 헌금 is in-game gold only.
import { VERSES } from './v6.js';
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAXLEN = 80, GAP = 4000, BAD = /(시발|씨발|병신|개새|좆|fuck|shit)/i;
const SERMON = ['오늘 말씀은 우리에게 "혼자가 아니다"라고 말해요. 우리 동네 이웃과 서로의 짐을 조금씩 나누어 들어요.', '작은 친절 하나가 동네를 밝혀요. 이번 주에는 이웃에게 먼저 인사를 건네 봐요.', '걱정이 많은 날에도 하나님은 우리를 붙들고 계세요. 오늘 하루 감사 한 가지를 적어 봐요.'];
const PRAYER = '사랑의 하나님, 오늘도 우리 동네에 모이게 하심을 감사드립니다. 아픈 이웃에게 회복을, 지친 마음에 쉼을 주시고, 이 예배를 기쁘게 받아 주옵소서. 예수님의 이름으로 기도합니다.';
const BLESS = '이제는 우리 주 예수 그리스도의 은혜와 하나님의 사랑과 성령의 교통하심이 우리 동네 모든 이웃과 함께 영원히 있을지어다.';
export const PH = ['찬양', '대표기도', '말씀', '헌금', '축도'];
export const Svc = {
  phase: -1, leader: null, muted: new Set(), lastMsg: 0, msg: null,
  init(a) { this.a = a; const n = a.net;
    n.on('lead', p => this.onLead(p)); n.on('lmsg', p => this.onMsg(p)); n.on('svc', p => this.onSvc(p));
    $('#svnext').onclick = () => this.next(true); $('#svamen').onclick = () => this.amen(); $('#svclose').onclick = () => this.stop();
    $('#svsend').onclick = () => this.send(); $('#svin').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); this.send(); } };
    $('#svmute').onclick = () => this.mute(); $('#svreport').onclick = () => this.report();
    document.querySelectorAll('#svgive button').forEach(b => b.onclick = () => this.give(+b.dataset.g)); },
  isLeader() { return this.leader && this.leader.id === this.a.net.id; },
  leadName() { return this.leader ? this.leader.name : '목사님'; },
  // ---- service flow
  start(remote) { const a = this.a; if (this.phase >= 0) return; if (a.scene() !== 'inside') a.enterChapel(true);
    this.phase = 0; this.given = false; this.amens = 0; a.sitAny(); $('#svc').style.display = 'block'; document.body.classList.add('service');
    if (!remote && (this.isLeader() || !this.leader)) a.net.send('svc', { op: 'start' });
    this.render(); a.startWorship({ svc: true }); },
  onSvc(p) { if (p.op === 'start' && this.phase < 0 && this.a.scene() === 'inside') { this.a.toast(`⛪ ${this.leadName()}님이 예배를 시작했어요`); this.start(true); }
    else if (p.op === 'phase' && this.phase >= 0 && p.i > this.phase) { this.phase = p.i - 1; this.next(false); } },
  afterPraise() { if (this.phase === 0) this.next(false); },
  next(user) { const a = this.a; if (this.phase < 0) return; if (this.phase === 0 && a.worshipOn()) { if (!user) return; a.endWorship(); return; }
    this.phase++; if (this.phase >= PH.length) return this.finish();
    if (user && this.isLeader()) a.net.send('svc', { op: 'phase', i: this.phase });
    const P = a.pastor(); if (P && !this.leader) P.say(['', '🙏 함께 기도하겠습니다', '📖 말씀을 함께 읽어요', '💝 감사의 헌금을 드려요', '✋ 축도하겠습니다'][this.phase], 3);
    this.render(); },
  render() { const i = this.phase, a = this.a; if (i < 0) return;
    $('#svsteps').innerHTML = PH.map((p, k) => `<span class="${k < i ? 'done' : k === i ? 'on' : ''}">${p}</span>`).join('<i>›</i>');
    $('#svlead').textContent = `🎙 인도: ${this.leadName()}${this.isLeader() ? ' (나)' : ''}`;
    const v = VERSES[(new Date().getDate() + (a.S().svcN || 0)) % VERSES.length], body = $('#svbody');
    body.innerHTML = i === 0 ? '<b>🎵 찬양</b><p>화면 아래 ♪ 박자에 맞춰 함께 찬양해요. 가사는 성가대가 불러줘요.</p>'
      : i === 1 ? `<b>🙏 대표기도</b><p>${esc(PRAYER)}</p>`
      : i === 2 ? `<b>📖 말씀 · ${esc(v[1])}</b><p class="vs">“${esc(v[0])}”</p><p>${esc(SERMON[(a.S().svcN || 0) % SERMON.length])}</p>`
      : i === 3 ? `<b>💝 헌금</b><p>감사의 마음을 헌금 달란트로 드려요. (게임 속 달란트만 사용돼요)</p>`
      : `<b>✋ 축도</b><p>${esc(BLESS)}</p>`;
    $('#svgive').style.display = i === 3 ? 'flex' : 'none'; $('#svamen').style.display = i >= 1 && i !== 3 ? '' : 'none';
    $('#svnext').textContent = i === PH.length - 1 ? '예배 마치기 ✨' : i === 0 ? '찬양 건너뛰기 ›' : '다음 순서 ›';
    $('#svnext').style.display = !this.leader || this.isLeader() ? '' : 'none';
    $('#svlrow').style.display = this.isLeader() ? 'flex' : 'none'; $('#svmod').style.display = this.leader && !this.isLeader() ? 'flex' : 'none';
    $('#svmsg').style.display = this.msg ? 'block' : 'none'; if (this.msg) $('#svmsg').textContent = `💬 ${this.msg.name}: ${this.msg.text}`; },
  amen() { const a = this.a; a.say('아멘 🙏'); a.emote('pray'); this.amens++; for (const n of a.npcs()) if (Math.random() < .6) setTimeout(() => n.say('아멘', 1.6), 200 + Math.random() * 900); },
  give(g) { const a = this.a, S = a.S(); if (this.given) return; if (g > S.coins) return a.toast('달란트가 부족해요'); this.given = true;
    if (g) { S.coins -= g; window.W?.spend(g, null); a.addXp(Math.round(g / 2)); a.toast(`💝 헌금 ${g} 달란트를 드렸어요 (게임 내 달란트)`); } else a.toast('마음으로 드렸어요 🙏'); a.refreshHud(); this.next(false); },
  finish() { const a = this.a, S = a.S(); this.phase = -1; $('#svc').style.display = 'none'; document.body.classList.remove('service');
    S.svcN = (S.svcN || 0) + 1; S.coins += 20; window.W?.earn('service'); a.addXp(40); a.V.done('pray'); a.coinFx(); a.refreshHud(); a.persist();
    for (const n of a.npcs()) n.doEmote('jump'); a.dialog('예배를 마쳤어요 ✨', `함께 예배해 주셔서 고마워요!\n출석 보상 +20 달란트 · 경험치 +40 · 오늘의 미션 '기도' 완료`, [['아멘 🙏', null]]); },
  stop() { if (this.a.worshipOn()) this.a.endWorship(true); this.phase = -1; $('#svc').style.display = 'none'; document.body.classList.remove('service'); },
  // ---- 오늘의 인도자 (one per room)
  claim() { const a = this.a, n = a.net; if (this.leader && !this.isLeader()) return a.toast(`이미 ${this.leader.name}님이 인도하고 있어요`);
    this.leader = { id: n.id, name: a.S().name, ts: Date.now() }; n.send('lead', { op: 'claim', ...this.leader }); const p = a.cfg().interior.pulpit;
    a.tp(p.x, p.y + 40); a.player().face = 'S'; a.toast('🎙 오늘의 인도자가 되었어요! 강대상에서 메시지를 전해 보세요'); this.render(); a.refreshLead(); },
  release() { if (!this.isLeader()) return; this.a.net.send('lead', { op: 'release' }); this.leader = null; this.render(); this.a.refreshLead(); this.a.toast('인도를 마쳤어요'); },
  onLead(p) { if (p.op === 'claim') { if (!this.leader || p.ts < this.leader.ts || this.leader.id === p.id) { if (this.isLeader() && p.id !== this.a.net.id) this.a.toast('먼저 신청한 분이 인도자가 되었어요'); this.leader = { id: p.id, name: String(p.name).slice(0, 12), ts: p.ts }; } }
    else if (p.op === 'release' && this.leader && this.leader.id === p.id) this.leader = null;
    else if (p.op === 'hello' && this.isLeader()) this.a.net.send('lead', { op: 'claim', ...this.leader });
    this.render(); this.a.refreshLead(); },
  peerLeft(id) { if (this.leader && this.leader.id === id) { this.leader = null; this.render(); this.a.refreshLead(); } },
  joined() { this.leader = null; this.a.net.send('lead', { op: 'hello' }); },
  clean(t) { t = String(t).replace(/\s+/g, ' ').trim().slice(0, MAXLEN); return BAD.test(t) ? null : t; },
  send() { const a = this.a, inp = $('#svin'); if (!this.isLeader()) return; const t = this.clean(inp.value); if (!t) return a.toast(inp.value.trim() ? '바른 말을 사용해 주세요 🙏' : '');
    if (Date.now() - this.lastMsg < GAP) return a.toast('메시지는 4초에 한 번 보낼 수 있어요'); this.lastMsg = Date.now(); inp.value = '';
    a.net.send('lmsg', { name: a.S().name, text: t }); this.onMsg({ id: a.net.id, name: a.S().name, text: t }); },
  onMsg(p) { if (!this.leader || p.id !== this.leader.id || this.muted.has(p.id)) return; const t = this.clean(p.text); if (!t) return;
    this.msg = { name: String(p.name).slice(0, 12), text: t }; this.lastSeen = t; const c = p.id === this.a.net.id ? this.a.player() : this.a.remotes.get(p.id); c && c.say('🎙 ' + t, 5); this.a.chatLog('🎙 ' + this.msg.name, t); this.render(); },
  mute() { if (!this.leader) return; this.muted.add(this.leader.id); this.msg = null; this.render(); this.a.toast(`🔇 ${this.leader.name}님의 메시지를 숨겼어요`); },
  async report() { const a = this.a, L = this.leader; if (!L) return; this.muted.add(L.id); this.msg = null; this.render();
    try { if (a.net.sb) { const { error } = await a.net.sb.from('reports').insert({ room: a.net.room || '-', target_id: L.id.slice(0, 16), target_name: L.name.slice(0, 12), body: (this.lastSeen || '').slice(0, 120), reporter_id: a.net.id }); if (error) throw error; }
      a.toast('🚩 신고가 접수되었어요. 메시지도 숨겼어요'); } catch { a.toast('신고를 보내지 못했어요 (잠시 후 다시)'); } }
};
