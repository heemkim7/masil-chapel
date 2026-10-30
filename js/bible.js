// 성경 읽기 + 말씀 여정. Verses: 성경전서 개역한글판 © 대한성서공회 1961 (저작재산권 만료, 본문 무수정·출처 표기)
export const STATIONS = ['천지 창조', '에덴 동산', '노아의 방주', '무지개 언약', '바벨탑', '아브라함의 부르심', '이삭의 번제', '야곱의 사다리', '요셉의 꿈', '모세와 떨기나무',
  '출애굽', '홍해를 건너다', '만나와 메추라기', '십계명', '여리고 성', '룻의 이삭줍기', '사무엘의 부르심', '다윗과 골리앗', '다윗의 시편', '솔로몬의 성전',
  '엘리야와 갈멜산', '요나와 큰 물고기', '이사야의 환상', '다니엘과 사자굴', '느헤미야의 성벽', '예수님 탄생', '세례 요한', '산상수훈', '오병이어', '물 위를 걸으심',
  '선한 사마리아인', '돌아온 탕자', '나사로를 살리심', '예루살렘 입성', '최후의 만찬', '십자가', '부활', '오순절 성령', '바울의 전도 여행', '새 하늘과 새 땅'];
export const REWARDS = { 5: { title: '새싹 순례자', gold: 50 }, 10: { title: '광야의 길벗', gold: 80 }, 15: { title: '약속의 땅 여행자', gold: 100 }, 20: { title: '시편 노래꾼', gold: 120 }, 25: { title: '베들레헴 별지기', gold: 150 }, 30: { title: '갈릴리 제자', gold: 200 }, 35: { title: '부활의 증인', gold: 250 }, 40: { title: '말씀 여정 완주자 👑', gold: 500 } };
const THEMES = ['오늘', '위로', '감사', '사랑', '용기', '평안', '말씀', '여정'];
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const Bible = {
  data: null, tab: '오늘', j: { station: 0, points: 0, streak: 0, best: 0 }, api: null,
  init(api) { this.api = api; const L = JSON.parse(localStorage.getItem('maeul_journey') || 'null'); if (L) this.j = L; this.sync(); },
  async load() { if (!this.data) this.data = (await (await fetch('data/verses_krv.json')).json()); return this.data; },
  dayKey() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); },
  daily() { const v = this.data.verses, k = this.dayKey(); let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return v[h % v.length]; },
  ref(v) { return `${v.b} ${v.c}:${v.v}`; },
  async sync() { try { const r = await this.api.net.sb?.rpc('journey_get', { p_secret: this.api.net.secret() }); if (r && !r.error && r.data) { this.j = r.data; this.keep(); } } catch {} },
  keep() { localStorage.setItem('maeul_journey', JSON.stringify(this.j)); this.api.onJourney?.(this.j); },
  async step(kind) {
    const before = this.j.station; let r = null;
    try { r = await this.api.net.sb?.rpc('journey_step', { p_secret: this.api.net.secret(), p_kind: kind }); } catch {}
    if (r && !r.error && r.data) { const d = r.data; this.j = { station: d.station, points: d.points, streak: d.streak, best: d.best }; if (d.ok === false && d.why !== 'slow') this.api.toast('오늘 이 활동으로 갈 수 있는 여정은 다 걸었어요. 내일 또 만나요 🙂'); }
    this.keep();
    if (this.j.station > before) { const s = this.j.station; this.api.sfx('stamp'); this.api.toast(`📜 말씀 여정 ${s}/40 · '${STATIONS[s - 1]}'에 도착했어요`);
      for (let k = before + 1; k <= s; k++) if (REWARDS[k]) { const w = REWARDS[k]; this.api.reward(w); this.api.sfx('levelup'); this.api.toast(`🎖 칭호 '${w.title}'와 ${w.gold}달란트를 받았어요`); } }
    if (kind === 'worship' && this.j.streak > 1) this.api.toast(`🔥 ${this.j.streak}일 연속 출석이에요!`);
    if ($('#bible').style.display === 'flex') this.render();
    return this.j;
  },
  async open(tab) { await this.load(); this.tab = tab || this.tab; this.api.openModal('#bible'); this.render(); },
  render() {
    const tb = $('#bbtabs'); tb.innerHTML = THEMES.map(t => `<button class="bbt${t === this.tab ? ' on' : ''}" data-t="${t}">${t === '오늘' ? '☀ 오늘의 말씀' : t === '여정' ? '🗺 말씀 여정' : t}</button>`).join('');
    tb.querySelectorAll('.bbt').forEach(b => b.onclick = () => { this.api.sfx('page'); this.tab = b.dataset.t; this.render(); });
    const B = $('#bbbody'), read = JSON.parse(localStorage.getItem('maeul_read_' + this.dayKey()) || '[]');
    if (this.tab === '여정') {
      const s = this.j.station; B.innerHTML = `<div class="jhead">현재 여정 <b>${s}/40</b> · 연속 출석 <b>${this.j.streak || 0}일</b> (최고 ${this.j.best || 0}일)</div>
      <p class="mnote">예배에 참여하거나, 말씀을 읽거나, 미션을 하면 한 걸음씩 나아가요. 5정거장마다 칭호와 달란트를 받아요.</p>
      <div class="jmap">${STATIONS.map((n, i) => `<div class="st${i < s ? ' done' : i === s ? ' now' : ''}"><i>${i < s ? '✔' : i + 1}</i><span>${esc(n)}</span>${REWARDS[i + 1] ? `<em>🎖 ${esc(REWARDS[i + 1].title)}</em>` : ''}</div>`).join('')}</div>`;
      return;
    }
    const list = this.tab === '오늘' ? [this.daily()] : this.data.verses.filter(v => v.th === this.tab);
    B.innerHTML = list.map((v, i) => { const id = this.ref(v); return `<div class="vs${this.tab === '오늘' ? ' big' : ''}"><p>${esc(v.t)}</p><div class="vr"><span>${esc(id)}</span><button class="vread" data-id="${esc(id)}" ${read.includes(id) ? 'disabled' : ''}>${read.includes(id) ? '읽었어요 ✓' : '📖 읽었어요'}</button></div></div>`; }).join('') + `<p class="bnote">${esc(this.data.notice)}</p>`;
    B.querySelectorAll('.vread').forEach(b => b.onclick = () => { const r = JSON.parse(localStorage.getItem('maeul_read_' + this.dayKey()) || '[]'); if (r.includes(b.dataset.id)) return; r.push(b.dataset.id); localStorage.setItem('maeul_read_' + this.dayKey(), JSON.stringify(r)); b.disabled = true; b.textContent = '읽었어요 ✓'; this.api.sfx('page'); this.step('read'); });
  },
};
