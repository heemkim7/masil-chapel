import { VERSES } from './v6.js';
// 전체 성경 읽기 (개역한글, 66권). 본문: 성경전서 개역한글판 © 대한성서공회 — 저작재산권 보호기간 만료, 원문 무수정.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function journey() { const n = window.G?.net; if (!n?.sb) return; try { const r = await n.sb.rpc('journey_step', { p_secret: n.secret(), p_kind: 'read' }); if (r.data?.station) { const o = JSON.parse(localStorage.getItem('maeul_journey') || '{}'); if (r.data.station > (o.station || 0)) G.toast(`📜 말씀 여정 ${r.data.station}/40 에 도착했어요`); localStorage.setItem('maeul_journey', JSON.stringify({ station: r.data.station, points: r.data.points, streak: r.data.streak, best: r.data.best })); } } catch { } }
const HL = ['#fff3a6', '#ffd6e6', '#cfeecf', '#d6e8ff'];
export const Reader = {
  idx: null, cache: {}, b: 1, c: 1, fs: +localStorage.getItem('maeul_bfs') || 18, marks: JSON.parse(localStorage.getItem('maeul_marks') || '{}'), view: 'read', q: '',
  async init() { if (this.idx) return; this.idx = await (await fetch('assets/bible/index.json')).json(); if (!this.moved) [this.b, this.c] = JSON.parse(localStorage.getItem('maeul_bpos') || '[1,1]'); this.pull(); },
  async book(b) { return this.cache[b] ||= await (await fetch(`assets/bible/${String(b).padStart(2, '0')}.json`)).json(); },
  async pull() { const n = window.G?.net; if (!n?.sb) return; const r = await n.sb.rpc('marks_get', { p_secret: n.secret() }); if (r.error || !r.data) return;
    const m = {}; for (const x of r.data) (m[x.ref] ||= {})[x.kind] = x.color || 1; for (const k in this.marks) if (!m[k]) m[k] = this.marks[k]; this.marks = m; this.keep(); },
  keep() { localStorage.setItem('maeul_marks', JSON.stringify(this.marks)); },
  async mark(ref, kind, color) { const m = (this.marks[ref] ||= {}); const on = !(m[kind] && (kind === 'bm' || m[kind] === color)); if (on) m[kind] = color || 1; else delete m[kind]; if (!Object.keys(m).length) delete this.marks[ref]; this.keep();
    const n = window.G?.net; if (n?.sb) n.sb.rpc('mark_set', { p_secret: n.secret(), p_ref: ref, p_kind: kind, p_color: color || null, p_on: on }).then(r => r.error && G.toast('동기화 실패 — 이 기기에 저장했어요')); },
  name(b) { return this.idx.books[b - 1][0]; },
  dayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  readToday() { return JSON.parse(localStorage.getItem('maeul_chap_' + this.dayKey()) || '[]'); },
  async render(B, bible) { this.B = B; this.bible = bible; await this.init(); if (this.view === 'search') return this.renderSearch(); if (this.view === 'marks') return this.renderMarks();
    const vs = (await this.book(this.b))[this.c - 1] || [], bk = this.idx.books, nC = bk[this.b - 1][1], key = `${this.b}:${this.c}`, done = this.readToday().includes(key);
    localStorage.setItem('maeul_bpos', JSON.stringify([this.b, this.c]));
    B.innerHTML = `<div class="rd-bar"><select id="rdB">${bk.map((x, i) => `<option value="${i + 1}"${i + 1 === this.b ? ' selected' : ''}>${esc(x[0])}</option>`).join('')}</select>
      <select id="rdC">${Array.from({ length: nC }, (_, i) => `<option${i + 1 === this.c ? ' selected' : ''}>${i + 1}</option>`).join('')}</select><span>장</span>
      <select id="rdV"><option value="">절</option>${vs.map((_, i) => `<option>${i + 1}</option>`).join('')}</select>
      <button id="rdS" title="글자 작게">가-</button><button id="rdL" title="글자 크게">가+</button><button id="rdQ">🔍</button><button id="rdM">🔖</button></div>
      <div class="rd-text" id="rdT" style="font-size:${this.fs}px"><h3>${esc(this.name(this.b))} ${this.c}장</h3>${vs.map((t, i) => { const r = `${this.b}:${this.c}:${i + 1}`, m = this.marks[r] || {};
        return `<p class="rv" id="rv${i + 1}" data-r="${r}" style="${m.hl ? `background:${esc(m.hl)}` : ''}"><sup>${i + 1}</sup>${esc(t)}${m.bm ? ' 🔖' : ''}</p>`; }).join('')}</div>
      <div class="rd-nav"><button id="rdP">◀ 이전 장</button><button id="rdD" ${done ? 'disabled' : ''}>${done ? '오늘 읽음 ✓' : '✔ 다 읽었어요'}</button><button id="rdN">다음 장 ▶</button></div>
      <div class="rd-tool" id="rdTool"></div><p class="rd-cr">성경전서 개역한글판 © 대한성서공회 (저작재산권 보호기간 만료 · 원문 무수정) · 오늘 읽은 장 ${this.readToday().length}</p>`;
    const $ = s => B.querySelector(s);
    $('#rdB').onchange = e => this.go(+e.target.value, 1); $('#rdC').onchange = e => this.go(this.b, +e.target.value);
    $('#rdV').onchange = e => { const el = $('#rv' + e.target.value); el?.scrollIntoView({ block: 'center' }); el?.classList.add('flash'); };
    $('#rdS').onclick = () => this.size(-2); $('#rdL').onclick = () => this.size(2);
    $('#rdQ').onclick = () => { this.view = 'search'; this.render(B, bible); }; $('#rdM').onclick = () => { this.view = 'marks'; this.render(B, bible); };
    $('#rdP').onclick = () => this.step(-1); $('#rdN').onclick = () => this.step(1); $('#rdD').onclick = () => this.done();
    B.querySelectorAll('.rv').forEach(p => p.onclick = () => this.tool(p.dataset.r));
    $('#rdT').scrollTop = 0; },
  tool(ref) { const T = this.B.querySelector('#rdTool'), [b, c, v] = ref.split(':').map(Number), m = this.marks[ref] || {};
    T.innerHTML = `<b>${esc(this.name(b))} ${c}:${v}</b><button data-k="bm">${m.bm ? '🔖 해제' : '🔖 책갈피'}</button>${HL.map(h => `<button data-k="hl" data-c="${h}" style="background:${h}">${m.hl === h ? '✓' : '　'}</button>`).join('')}<button data-k="x">✕</button>`;
    T.style.display = 'flex'; T.onclick = e => { const k = e.target.dataset.k; if (!k) return; if (k !== 'x') this.mark(ref, k, e.target.dataset.c); T.style.display = 'none'; if (k !== 'x') this.render(this.B, this.bible); }; },
  size(d) { this.fs = Math.max(14, Math.min(30, this.fs + d)); localStorage.setItem('maeul_bfs', this.fs); this.B.querySelector('#rdT').style.fontSize = this.fs + 'px'; },
  go(b, c) { this.moved = 1; this.b = b; this.c = c; this.view = 'read'; this.render(this.B, this.bible); },
  step(d) { let b = this.b, c = this.c + d; if (c < 1) { if (b === 1) return; b--; c = this.idx.books[b - 1][1]; } else if (c > this.idx.books[b - 1][1]) { if (b === 66) return; b++; c = 1; } this.go(b, c); },
  done() { const k = `${this.b}:${this.c}`, r = this.readToday(); if (r.includes(k)) return; r.push(k); localStorage.setItem('maeul_chap_' + this.dayKey(), JSON.stringify(r));
    G.toast(`📖 ${this.name(this.b)} ${this.c}장을 읽었어요 · 오늘 ${r.length}장`); journey(); if (r.length === 1) G.V?.done?.('verse'); this.render(this.B, this.bible); },
  async renderSearch() { const B = this.B, q = this.q;
    B.innerHTML = `<div class="rd-bar"><button id="rdBack">◀ 본문</button><input id="rdIn" placeholder="검색어 (예: 사랑, 평안)" value="${esc(q)}"><select id="rdSc"><option value="b">현재 책: ${esc(this.name(this.b))}</option><option value="all">전체 66권</option><option value="key">요절</option></select><button id="rdGo">검색</button></div><div class="rd-res" id="rdRes"></div>`;
    const $ = s => B.querySelector(s); $('#rdBack').onclick = () => { this.view = 'read'; this.render(B, this.bible); };
    const run = async () => { const w = $('#rdIn').value.trim(); this.q = w; if (w.length < 1) return; const sc = $('#rdSc').value, out = [], R = $('#rdRes'); R.innerHTML = '찾는 중…';
      if (sc === 'key') { for (const [t, r] of VERSES) if (t.includes(w) || r.includes(w)) { const m = r.match(/^(.+) (\d+):(\d+)/), b = m ? this.idx.books.findIndex(x => x[0] === m[1]) + 1 : 0; out.push([r, t, b ? [b, +m[2], +m[3]] : null]); } }
      else { const list = sc === 'all' ? Array.from({ length: 66 }, (_, i) => i + 1) : [this.b];
        for (const b of list) { const bk = await this.book(b); bk.forEach((ch, ci) => ch.forEach((t, vi) => { if (out.length < 300 && t.includes(w)) out.push([`${this.name(b)} ${ci + 1}:${vi + 1}`, t, [b, ci + 1, vi + 1]]); })); } }
      R.innerHTML = `<p class="mnote">${out.length}${out.length >= 300 ? '+' : ''}건</p>` + out.map((o, i) => `<div class="rs" data-i="${i}"><b>${esc(o[0])}</b> ${esc(o[1]).split(esc(w)).join(`<mark>${esc(w)}</mark>`)}</div>`).join('');
      R.querySelectorAll('.rs').forEach(d => d.onclick = async () => { const o = out[+d.dataset.i]; if (!o[2]) return; this.go(o[2][0], o[2][1]); setTimeout(() => B.querySelector('#rv' + o[2][2])?.scrollIntoView({ block: 'center' }), 150); }); };
    $('#rdGo').onclick = run; $('#rdIn').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') run(); }; if (q) run(); },
  async renderMarks() { const B = this.B, ks = Object.keys(this.marks).sort((a, b) => { const x = a.split(':').map(Number), y = b.split(':').map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
    const rows = []; for (const k of ks) { const [b, c, v] = k.split(':').map(Number); const t = (await this.book(b))[c - 1]?.[v - 1] || ''; rows.push(`<div class="rs" data-k="${k}" style="${this.marks[k].hl ? `background:${esc(this.marks[k].hl)}` : ''}"><b>${esc(this.name(b))} ${c}:${v}${this.marks[k].bm ? ' 🔖' : ''}</b> ${esc(t)}</div>`); }
    B.innerHTML = `<div class="rd-bar"><button id="rdBack">◀ 본문</button><b>책갈피 · 형광펜 ${ks.length}</b></div><div class="rd-res">${rows.join('') || '<p class="mnote">절을 눌러 책갈피나 형광펜을 남겨 보세요</p>'}</div>`;
    B.querySelector('#rdBack').onclick = () => { this.view = 'read'; this.render(B, this.bible); };
    B.querySelectorAll('.rs').forEach(d => d.onclick = () => { const [b, c, v] = d.dataset.k.split(':').map(Number); this.go(b, c); setTimeout(() => B.querySelector('#rv' + v)?.scrollIntoView({ block: 'center' }), 150); }); },
};
Reader.open = function () { let m = document.getElementById('p2bible'); if (!m) { m = document.createElement('div'); m.id = 'p2bible'; m.className = 'modal'; m.innerHTML = '<div class="panel"><button class="close">✕</button><h2>📖 성경 읽기 <small>개역한글</small></h2><div id="rdBody"></div></div>'; document.body.appendChild(m); m.querySelector('.close').onclick = () => G.closeModal(); }
  G.openModal('#p2bible'); this.render(m.querySelector('#rdBody'), {}); };
window.BR = Reader;
