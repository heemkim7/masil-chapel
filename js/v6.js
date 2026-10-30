// v6 features: 행정동 rooms (GPS → bundled boundary dataset, manual pick, 혼자 모드), dong map with live head counts,
// Supabase prayer wall, 오늘의 말씀 뽑기, daily missions + level, praise mode, posture/quick-phrase panel.
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
let A = null; // api from main: { S, player, net, toast, chatLog, openModal, closeModal, addXp, emote, refreshHud, persist, remotes, coinFx, board }
let IDX = null; const SIDO = {};
const MISSIONS = [['pray', '🙏', '기도하기', '기도벽에 기도제목을 올리거나 함께 기도하기'], ['praise', '🎵', '찬양하기', '찬양 모드로 3소절 부르기'], ['verse', '📖', '말씀 뽑기', '오늘의 말씀 카드 뽑기'], ['greet', '👋', '인사하기', '👋 인사 포즈나 "평안하세요"로 이웃에게 인사']];
const PHRASES = ['아멘 🙏', '할렐루야!', '감사합니다 😊', '평안하세요~', '축복합니다 ✨', '함께 기도해요'];
const POSES = [['wave', '👋', '인사'], ['jump', '🙌', '기뻐요'], ['pray', '🙏', '기도']];
// 개역한글(1961, 저작권 만료) 본문
const DEF_CTR = { cd: '1168064000', name: '역삼1동', sgg: '강남구', sido: '서울특별시', lon: 127.0364, lat: 37.5006 }; // map centre before any dong is chosen
const PLAZA = { cd: '0', name: '모두의 광장', sgg: '전국', sido: '' };
const VERSES = [
  ['여호와는 나의 목자시니 내가 부족함이 없으리로다', '시편 23:1'], ['내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라', '빌립보서 4:13'],
  ['항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라', '데살로니가전서 5:16-18'], ['수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라', '마태복음 11:28'],
  ['사랑은 오래 참고 사랑은 온유하며', '고린도전서 13:4'], ['너는 마음을 다하여 여호와를 의뢰하고 네 명철을 의지하지 말라', '잠언 3:5'],
  ['두려워 말라 내가 너와 함께 함이니라', '이사야 41:10'], ['주의 말씀은 내 발에 등이요 내 길에 빛이니이다', '시편 119:105'],
  ['서로 사랑하라 내가 너희를 사랑한 것 같이 너희도 서로 사랑하라', '요한복음 15:12'], ['하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니', '요한복음 3:16'],
  ['오직 여호와를 앙망하는 자는 새 힘을 얻으리니 독수리가 날개치며 올라감 같을 것이요', '이사야 40:31'], ['너희 염려를 다 주께 맡겨 버리라 이는 저가 너희를 권고하심이니라', '베드로전서 5:7'],
  ['여호와는 너를 지키시는 자라', '시편 121:5'], ['볼지어다 내가 세상 끝날까지 너희와 항상 함께 있으리라', '마태복음 28:20'],
  ['우리가 알거니와 하나님을 사랑하는 자 곧 그 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라', '로마서 8:28'],
  ['너희는 세상의 빛이라', '마태복음 5:14'], ['기쁨으로 여호와를 섬기며 노래하면서 그 앞에 나아갈지어다', '시편 100:2'],
  ['아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라', '빌립보서 4:6'],
  ['이 날은 여호와의 정하신 것이라 이 날에 우리가 즐거워하고 기뻐하리로다', '시편 118:24'], ['평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라', '요한복음 14:27']];
// original praise lyrics (written for this game)
const LYRICS = ['우리 동네 작은 예배당에', '햇살처럼 사랑이 내려와', '손을 잡고 함께 노래해', '감사해요 오늘도 함께해서', '기쁨의 노래 하늘 높이', '이웃과 나누는 평안의 인사'];

export const V = {
  praise: null, notes: [],
  async init(api) { A = api; this.wire(); },
  get S() { return A.S(); },
  // ---------- dong / rooms ----------
  async index() { return IDX ||= (await (await fetch('assets/geo/index.json')).json()).d.map(r => ({ cd: r[0], name: r[1], sgg: r[2], sido: r[3], lat: r[4], lon: r[5] })); },
  async sido(cd) { const k = cd.slice(0, 2); return SIDO[k] ||= await (await fetch(`assets/geo/sido_${k}.json`)).json(); },
  async byCode(cd) { return (await this.index()).find(d => d.cd === cd) || null; },
  async lookup(lat, lon) { const I = await this.index(); const near = I.map(d => [d, (d.lat - lat) ** 2 + ((d.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 15).map(a => a[0]);
    for (const d of near) { const P = (await this.sido(d.cd))[d.cd] || []; if (P.some(r => inRing(lon, lat, r))) return d; }
    return near[0]; },
  locate() { return new Promise((res, rej) => { if (!navigator.geolocation) return rej(new Error('위치 기능 없음')); navigator.geolocation.getCurrentPosition(p => res(p.coords), e => rej(e), { timeout: 9000, maximumAge: 600000, enableHighAccuracy: false }); }); },
  home() { return this.S?.dong || null; },
  // no dong yet => everyone shares '모두의 광장' (GPS is optional, never a gate)
  current() { const S = this.S; if (!S || S.solo) return null; return S.visit || S.dong || PLAZA; },
  // shard 1 keeps the legacy id d{cd}:{scene}; shard n>1 => d{cd}-{n}:{scene}. CAP users per shard (presence counts).
  cap() { return window.__shardCap || 100; },
  shard() { return this.S?.shard || 1; },
  room(scene) { const d = this.current(); return d ? `d${d.cd}${this.shard() > 1 ? '-' + this.shard() : ''}:${scene}` : null; },
  shardCounts(cd) { return (A.net.shards || {})[cd] || {}; },
  autoShard() { const S = this.S, d = this.current(); if (!d || S.shardLock) return; const c = this.shardCounts(d.cd), cap = this.cap(); let n = 1;
    while ((c[n] || 0) - (n === S.shard && A.net.lobbyMe ? 1 : 0) >= cap) n++; if (n !== this.shard()) { S.shard = n; A.persist(); this.hud(); if (n > 1) A.toast(`👥 방이 가득 차서 ${d.name} ${n}번 방으로 안내했어요`); } },
  setShard(n) { const S = this.S; S.shard = Math.max(1, n | 0); S.shardLock = true; A.persist(); this.hud(); A.closeModal(); A.toast(`🚪 ${this.current().name} ${S.shard}번 방으로 이동했어요`); },
  link() { const d = this.current(); return location.origin + location.pathname.replace(/index\.html$/, '') + (d && d.cd !== '0' ? `?room=${d.cd}-${this.shard()}` : ''); },
  openShards() { const d = this.current(); if (!d) return; const c = this.shardCounts(d.cd), cap = this.cap(), max = Math.max(1, ...Object.keys(c).map(Number), this.shard());
    const L = []; for (let n = 1; n <= max + 1; n++) { const k = c[n] || 0; if (n > max && k === 0 && n !== this.shard()) { L.push([`➕ 새 방 ${n}번 열기`, () => this.setShard(n)]); break; }
      L.push([`${n === this.shard() ? '📍' : '🚪'} ${n}번 방 · ${k}/${cap}명${k >= cap ? ' (가득)' : ''}`, () => k >= cap && n !== this.shard() ? A.toast('이 방은 가득 찼어요') : this.setShard(n)]); }
    L.push(['🔗 이 방 링크 복사', () => window.shareLink(this.link())], ['닫기', null]);
    A.dialog(`🏠 ${d.name} 방 목록`, '같은 동네라도 100명씩 방이 나뉘어요. 원하는 방으로 옮길 수 있어요.', L); },
  dongLabel() { const S = this.S; if (!S) return ''; if (S.solo) return '🌙 혼자 모드'; const d = this.current(); if (!d) return '📍 동네 선택'; return (d.cd === '0' ? '🌈 ' : S.visit ? '🧳 ' : '📍 ') + d.name + (this.shard() > 1 ? ` ${this.shard()}번 방` : ''); },
  async setDong(cd, opt = {}) { const S = this.S, d = await this.byCode(cd); if (!d) return false; S.solo = false;
    if (opt.visit && S.dong && S.dong.cd !== cd) S.visit = d; else { S.dong = d; S.visit = null; } if (!opt.keepShard) { S.shard = 1; S.shardLock = false; }
    if (S.visit) S.recent = [{ cd: d.cd, name: d.name, sgg: d.sgg }, ...(S.recent || []).filter(r => r.cd !== d.cd)].slice(0, 4);
    A.persist(); this.hud(); A.toast(S.visit ? `🧳 ${d.sgg} ${d.name}에 놀러 왔어요` : `📍 ${d.sgg} ${d.name} 예배당에 들어왔어요`); A.chatLog('📍', `${d.sido} ${d.sgg} ${d.name} 방`); return true; },
  goSolo() { const S = this.S; S.solo = true; S.visit = null; A.net.leave(); A.net.leaveLobby(); A.persist(); this.hud(); A.toast('🌙 혼자 모드: 다른 사람 없이 조용히 플레이해요'); A.closeModal(); },
  // top-bar place switcher: current place + 광장 / 우리 동네 / recent visits / search; tickRoom() reconnects to the new room on the next frame
  goPlace(k) { const S = this.S; S.solo = false; S.shard = 1; S.shardLock = false;
    if (k === 'plaza') S.visit = S.dong ? PLAZA : null; else if (k === 'home') S.visit = null;
    A.persist(); this.hud(); A.closeModal(); const d = this.current(); A.toast(`${d.cd === '0' ? '🌈' : '📍'} ${d.name}(으)로 이동했어요`); },
  openPlaces() { const S = this.S, d = this.current(), here = d ? d.cd : null, L = [];
    L.push([`🌈 모두의 광장${here === '0' ? ' · 지금 여기' : ''}`, () => here === '0' ? A.closeModal() : this.goPlace('plaza')]);
    if (S.dong) L.push([`🏠 우리 동네 ${S.dong.name}${here === S.dong.cd && !S.visit ? ' · 지금 여기' : ''}`, () => (here === S.dong.cd && !S.visit) ? A.closeModal() : this.goPlace('home')]);
    for (const r of (S.recent || [])) if (!S.dong || r.cd !== S.dong.cd) L.push([`🧳 ${r.sgg} ${r.name}${here === r.cd ? ' · 지금 여기' : ''}`, () => here === r.cd ? A.closeModal() : (A.closeModal(), this.setDong(r.cd, { visit: true }))]);
    L.push(['🔍 다른 동네 찾기', () => this.openDongPick(false)]);
    if (d) L.push(['🚪 같은 장소 다른 방', () => this.openShards()]);
    L.push([S.solo ? '🌙 혼자 모드 · 지금 여기' : '🌙 혼자 모드', () => S.solo ? A.closeModal() : this.goSolo()], ['닫기', null]);
    A.dialog('📍 장소 이동', `지금: ${this.dongLabel().replace(/^\S+ /, '')}`, L); },
  goHome() { const S = this.S; if (S.visit) { S.visit = null; A.persist(); this.hud(); A.toast(`🏠 우리 동네 ${S.dong.name}(으)로 돌아왔어요`); } },
  tickRoom(scene) { const net = A.net; if (!net.sb) return; const r = this.room(scene);
    if (!r) { if (net.room) { net.room = null; net.leave(); } return; }
    const h = this.current(); if (!net.lobbyMe || net.lobbyMe.dong !== h.cd || net.lobbyMe.shard !== this.shard()) { net.lobby(h.cd, this.S.name, this.shard()); this.lbWait ||= Date.now(); }
    if (!net.lbSynced && Date.now() - (this.lbWait || 0) < 2500) return; // wait for head counts before choosing a shard
    if (net.room !== r) { this.autoShard(); const r2 = this.room(scene); if (r2 !== r) return; net.join(r, A.meState()); } },
  openDongPick(first) { A.openModal('#dongpick'); $('#dpnote').textContent = first ? '어느 동네 예배당에 들어갈까요? 같은 행정동 이웃과 함께 놀아요.' : '동네를 바꾸거나 혼자 모드로 전환해요.'; $('#dpq').value = ''; this.dpList(''); },
  async dpList(q) { const I = await this.index(); q = q.trim(); const L = q ? I.filter(d => (d.sido + d.sgg + d.name).replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 30) : [];
    $('#dplist').innerHTML = L.length ? L.map(d => `<button class="dpi" data-cd="${d.cd}"><b>${esc(d.name)}</b><small>${esc(d.sido)} ${esc(d.sgg)}</small></button>`).join('') : `<p class="mnote">${q ? '검색 결과가 없어요' : '동 이름을 입력해 찾을 수 있어요 (예: 역삼1동, 해운대)'}</p>`;
    $('#dplist').querySelectorAll('.dpi').forEach(b => b.onclick = async () => { await this.setDong(b.dataset.cd); A.closeModal(); }); },
  async gps() { const b = $('#dpgps'); b.disabled = true; b.textContent = '📡 위치 확인 중…';
    try { const c = await this.locate(); const d = await this.lookup(c.latitude, c.longitude); await this.setDong(d.cd); A.closeModal(); }
    catch (e) { A.toast('위치를 가져오지 못했어요 · 동 이름으로 찾거나 혼자 모드를 써요'); }
    finally { b.disabled = false; b.textContent = '📍 내 위치로 찾기 (GPS)'; } },
  // ---------- dong map ----------
  async drawDongMap() { const c = $('#dmcv'); if (!c || !c.clientWidth) return; const S = this.S, cur = this.current(), ctr = cur && cur.lon != null ? cur : S.dong || DEF_CTR;
    const pr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight; c.width = w * pr; c.height = h * pr; const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0);
    g.fillStyle = '#eef6ff'; g.fillRect(0, 0, w, h); $('#dmspots').innerHTML = '';
    if (!ctr) { g.fillStyle = '#7a6f96'; g.font = '700 15px sans-serif'; g.textAlign = 'center'; g.fillText(S.solo ? '혼자 모드에서는 동네 지도가 꺼져 있어요' : '먼저 동네를 골라 주세요', w / 2, h / 2); return; }
    const I = await this.index(), P = await this.sido(ctr.cd), cos = Math.cos(ctr.lat * Math.PI / 180);
    const near = I.filter(d => d.cd.slice(0, 2) === ctr.cd.slice(0, 2)).map(d => [d, Math.hypot(d.lat - ctr.lat, (d.lon - ctr.lon) * cos)]).sort((a, b) => a[1] - b[1]).slice(0, 13).map(a => a[0]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const d of near) for (const r of P[d.cd] || []) for (const [x, y] of r) { x0 = Math.min(x0, x * cos); x1 = Math.max(x1, x * cos); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const pad = 18, s = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2 - 16) / (y1 - y0)), ox = (w - (x1 - x0) * s) / 2, oy = (h - 16 - (y1 - y0) * s) / 2;
    const T = (x, y) => [ox + (x * cos - x0) * s, oy + (y1 - y) * s];
    const pal = ['#ffd9e6', '#e3f4d9', '#fff2c6', '#dfe9ff', '#f0e2ff', '#d9f3f0', '#ffe5d4'], counts = A.net.counts || {};
    near.forEach((d, i) => { const me = d.cd === ctr.cd, home = S.dong && d.cd === S.dong.cd;
      for (const r of P[d.cd] || []) { g.beginPath(); r.forEach(([x, y], k) => { const [px, py] = T(x, y); k ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
        g.fillStyle = me ? '#ffb8d2' : pal[i % pal.length]; g.fill(); g.lineWidth = me ? 3 : 1.5; g.strokeStyle = me ? '#e0659a' : '#ffffff'; g.stroke(); } });
    const box = $('#dmspots');
    for (const d of near) { const [px, py] = T(d.lon, d.lat), n = counts[d.cd] || 0, me = d.cd === ctr.cd, home = S.dong && d.cd === S.dong.cd;
      const b = document.createElement('button'); b.className = 'dspot' + (me ? ' me' : '') + (home ? ' home' : ''); b.dataset.cd = d.cd;
      b.innerHTML = `${home ? '🏠' : me ? '📍' : '⛪'} ${esc(d.name)}<i>${n ? '👥 ' + n : '·'}</i>`; b.style.left = px + 'px'; b.style.top = py + 'px';
      b.onclick = () => this.dongTap(d); box.append(b); }
    $('#dmnote').textContent = S.visit ? `🧳 ${S.visit.name} 방문 중 · 🏠 우리 동네: ${S.dong.name}` : `📍 우리 동네 ${ctr.sgg} ${ctr.name} · 이웃 동네를 누르면 놀러 갈 수 있어요`; },
  dongTap(d) { const S = this.S; if (S.dong && d.cd === S.dong.cd) { this.goHome(); A.closeModal(); return; } if (this.current() && d.cd === this.current().cd) return;
    A.dialog(`⛪ ${d.name} 예배당`, `${d.sido} ${d.sgg} ${d.name}\n지금 ${(A.net.counts || {})[d.cd] || 0}명이 있어요. 방문객으로 놀러 갈까요? (우리 동네는 그대로예요)`, [['🧳 놀러 가기', () => this.setDong(d.cd, { visit: true })], ['취소', null]]); },
  // ---------- prayer wall ----------
  async openPrayers() { A.openModal('#board'); $('#bpub').checked = true; await this.renderPrayers(); },
  async renderPrayers() { const d = this.current(), L = $('#blist'); $('#bhead').textContent = d ? `${d.name} 기도벽` : '기도벽 (오프라인 · 이 기기에만 저장)';
    if (d && A.net.sb) { try { const r = await A.net.prayers(d.cd); const all = [...r.mine, ...r.list].sort((a, b) => b.created_at.localeCompare(a.created_at));
        L.innerHTML = all.length ? all.map(p => `<div class="post ${p.is_public ? '' : 'priv'}"><div><b>${esc(p.name)}</b> <small>${p.is_public ? '🙏 기도제목' : '🔒 나만 보기'}${p.mine ? ' · 내 글' : ''}</small></div><p>${esc(p.body)}</p>${p.is_public ? `<button data-id="${p.id}">🙏 함께 기도 <b>${p.amen_count}</b></button>` : ''}</div>`).join('') : '<p class="mnote">아직 기도제목이 없어요. 첫 기도제목을 올려 보세요 🙏</p>';
        L.querySelectorAll('button[data-id]').forEach(b => b.onclick = async () => { try { const n = await A.net.prayWith(+b.dataset.id); b.querySelector('b').textContent = n; b.disabled = true; this.done('pray'); A.toast('🙏 함께 기도했어요'); } catch (e) { A.toast(rl(e) ? '잠시 후 다시 해 주세요' : '함께 기도를 기록하지 못했어요'); } });
        return; } catch (e) { console.warn('[prayers]', e.message); } }
    const P = await A.board.list(); L.innerHTML = P.map(p => `<div class="post ${p.kind}"><div><b>${esc(p.author)}</b> <small>${p.kind === 'notice' ? '📢 공지' : '🙏 기도제목'}</small></div><p>${esc(p.text)}</p><button data-lid="${p.id}">🙏 함께 기도 ${p.prayers}</button></div>`).join('');
    L.querySelectorAll('button[data-lid]').forEach(b => b.onclick = async () => { await A.board.pray(b.dataset.lid); this.done('pray'); this.renderPrayers(); }); },
  async postPrayer() { const t = $('#btext').value.trim(), pub = $('#bpub').checked; if (!t) return; const d = this.current(); const btn = $('#bpost'); btn.disabled = true;
    try { if (d && A.net.sb) await A.net.postPrayer(d.cd, this.S.name, t.slice(0, 60), pub); else await A.board.post(this.S.name, t);
      $('#btext').value = ''; $('#bcount').textContent = '0/60'; A.addXp(5); this.done('pray'); A.toast(pub ? '🙏 기도제목을 올렸어요' : '🔒 나만 보는 기도제목을 저장했어요'); await this.renderPrayers(); }
    catch (e) { A.toast(rl(e) ? '기도제목은 10분에 3개까지 올릴 수 있어요' : '올리지 못했어요 · 잠시 후 다시 시도해요'); } finally { btn.disabled = false; } },
  // ---------- verse ----------
  openVerse() { A.openModal('#verse'); const S = this.S, v = S.verse && S.verse.date === today() ? VERSES[S.verse.i] : null;
    $('#vcard').className = 'vcard' + (v ? ' open' : ''); $('#vtext').textContent = v ? v[0] : ''; $('#vref').textContent = v ? v[1] : ''; $('#vdraw').textContent = v ? '✅ 오늘의 말씀을 받았어요' : '✨ 말씀 뽑기'; $('#vdraw').disabled = !!v; },
  drawVerse() { const S = this.S; if (S.verse && S.verse.date === today()) return; const i = Math.random() * VERSES.length | 0; S.verse = { date: today(), i }; $('#vcard').className = 'vcard flip';
    setTimeout(() => { $('#vcard').className = 'vcard open'; $('#vtext').textContent = VERSES[i][0]; $('#vref').textContent = VERSES[i][1]; $('#vdraw').textContent = '✅ 오늘의 말씀을 받았어요'; $('#vdraw').disabled = true; }, 450);
    this.done('verse'); A.persist(); },
  shareVerse() { const S = this.S; if (!S.verse) return; const v = VERSES[S.verse.i]; const t = `📖 ${v[0]} (${v[1]})`.slice(0, 80); A.say(t); },
  // ---------- missions ----------
  mis() { const S = this.S; if (!S.mis || S.mis.date !== today()) S.mis = { date: today(), done: {} }; return S.mis; },
  lv() { const x = this.S.mxp || 0; return 1 + Math.floor(x / 4); },
  done(k) { const m = this.mis(); if (m.done[k]) return; m.done[k] = 1; const S = this.S; S.mxp = (S.mxp || 0) + 1; S.coins += 20; window.W?.earn('mission'); A.addXp(6); A.coinFx();
    const M = MISSIONS.find(q => q[0] === k), n = Object.keys(m.done).length; A.toast(`${M[1]} 오늘의 임무 '${M[2]}' 완료! +20달란트 (${n}/4)`);
    if (n === 4) setTimeout(() => A.toast('🎉 오늘의 임무를 모두 마쳤어요! 보너스 +50달란트'), 2700), (S.coins += 50, window.W?.earn('mission_bonus')); this.hud(); A.persist(); },
  openMissions() { A.openModal('#missions'); const m = this.mis(); $('#mlv').textContent = `Lv.${this.lv()} · 오늘 ${Object.keys(m.done).length}/4`;
    $('#mlist').innerHTML = MISSIONS.map(([k, ic, t, d]) => `<div class="mi ${m.done[k] ? 'ok' : ''}"><span>${ic}</span><div><b>${t}</b><small>${d}</small></div><em>${m.done[k] ? '✅' : '⬜'}</em></div>`).join(''); },
  // ---------- praise mode ----------
  togglePraise() { if (this.praise) return this.stopPraise(); if (!A.player()) return; A.closeModal(); this.praise = { t: 0, line: -1, sung: 0 }; document.body.classList.add('praising'); $('#praise').style.display = 'flex'; $('#btn-praise').classList.add('on'); A.player().doEmote('jump'); },
  stopPraise() { this.praise = null; document.body.classList.remove('praising'); $('#praise').style.display = 'none'; $('#btn-praise').classList.remove('on'); },
  update(dt) { const p = this.praise, pl = A.player(); if (p && pl) { p.t += dt; const li = Math.floor(p.t / 3.2) % LYRICS.length;
      if (li !== p.line) { p.line = li; p.sung++; const L = LYRICS[li]; pl.say('🎵 ' + L, 3); A.net.send('praise', { line: L }); $('#plyric').textContent = L; $('#pnext').textContent = LYRICS[(li + 1) % LYRICS.length]; if (p.sung === 3) this.done('praise'); }
      if (Math.random() < dt * 5) this.notes.push({ x: pl.x + (Math.random() - .5) * 60, y: pl.y - 150, t: 0, ch: '♪♫🎵'[Math.random() * 3 | 0] }); }
    for (const n of this.notes) n.t += dt; this.notes = this.notes.filter(n => n.t < 1.6); },
  remotePraise(c, line) { c.say('🎵 ' + String(line).slice(0, 40), 3); for (let i = 0; i < 3; i++) this.notes.push({ x: c.x + (Math.random() - .5) * 60, y: c.y - 150, t: -i * .3, ch: '♪' }); },
  drawWorld(g) { g.save(); g.textAlign = 'center'; for (const n of this.notes) { if (n.t < 0) continue; g.globalAlpha = Math.max(0, 1 - n.t / 1.6); g.font = '26px sans-serif'; g.fillStyle = '#e0659a'; g.fillText(n.ch, n.x + Math.sin(n.t * 5) * 10, n.y - n.t * 60); } g.restore(); },
  // ---------- emote / phrases ----------
  onEmote(e) { if (e === 'wave') this.done('greet'); if (e === 'pray') A.toast('🙏 잠시 기도해요'); },
  onChat(t) { if (/평안|안녕|반가|하이|hello/i.test(t)) this.done('greet'); },
  openEmo() { const p = $('#emopanel'); const on = p.style.display !== 'flex'; p.style.display = on ? 'flex' : 'none'; $('#btn-emo').classList.toggle('on', on); },
  hud() { const S = this.S; if (!S) return; const m = this.mis(); $('#dongbtn').textContent = this.dongLabel().replace(/^(\S+) /, innerWidth < 560 ? '$1 ' : '$1 마실채플 · ') + ' ▾'; $('#dongbtn').setAttribute('aria-label', '장소 이동: ' + this.dongLabel().replace(/^\S+ /, '')); $('#mbadge').textContent = `Lv.${this.lv()} · 오늘 ${Object.keys(m.done).length}/4`; },
  wire() {
    $('#dpgps').onclick = () => this.gps(); $('#dpsolo').onclick = () => this.goSolo(); $('#dpq').oninput = e => this.dpList(e.target.value);
    $('#dongbtn').onclick = () => this.openPlaces(); $('#mbadge').onclick = () => this.openMissions();
    $('#btn-verse').onclick = () => this.openVerse(); $('#vdraw').onclick = () => this.drawVerse(); $('#vshare').onclick = () => { this.shareVerse(); A.closeModal(); };
    $('#bpost').onclick = () => this.postPrayer(); $('#btext').oninput = e => $('#bcount').textContent = `${e.target.value.length}/60`;
    $('#btn-emo').onclick = () => this.openEmo(); $('#btn-praise').onclick = () => this.togglePraise(); $('#pstop').onclick = () => this.stopPraise();
    $('#emoposes').innerHTML = POSES.map(([e, i, l]) => `<button data-pose="${e}">${i}<small>${l}</small></button>`).join('');
    $('#emophr').innerHTML = PHRASES.map(t => `<button data-phr="${esc(t)}">${esc(t)}</button>`).join('');
    $('#emoposes').querySelectorAll('button').forEach(b => b.onclick = () => { A.emote(b.dataset.pose); this.openEmo(); });
    $('#emophr').querySelectorAll('button').forEach(b => b.onclick = () => { A.say(b.dataset.phr); if (/평안|축복/.test(b.dataset.phr)) this.done('greet'); this.openEmo(); });
    document.querySelectorAll('.mtab').forEach(b => b.onclick = () => this.mapTab(b.dataset.tab));
    $('#mmhome').onclick = () => { this.goHome(); this.drawDongMap(); };
  },
  mapTab(t) { document.querySelectorAll('.mtab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); $('#mapwrap').style.display = t === 'isle' ? '' : 'none'; $('#mapnote').style.display = t === 'isle' ? '' : 'none'; $('#dongmap').style.display = t === 'dong' ? 'flex' : 'none'; if (t === 'dong') requestAnimationFrame(() => this.drawDongMap()); },
};
const rl = e => /rate_limited/.test(e?.message || '');
function inRing(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
export { VERSES };
