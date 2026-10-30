// UGC safety: 이용약관 동의(EULA), 금칙어 마스킹, 신고/차단. Server triggers also mask chat/prayers.
const EV = 'v1-2026-10';
const RAW = ['시발','씨발','ㅅㅂ','ㅆㅂ','병신','ㅂㅅ','개새','좆','존나','ㅈㄴ','지랄','염병','미친놈','미친년','꺼져','닥쳐','엿먹','니애미','느금','섹스','야동','fuck','shit','bitch','sex','porn','nigger'];
const norm = s => String(s).toLowerCase().replace(/[\s._\-~!@#$%^&*0-9]+/g, '');
const RE = new RegExp(RAW.map(w => w.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[._\\-~*]*')).join('|'), 'gi');
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|kr|io|me|ly|gg)\b|카톡|오픈채팅|텔레그램|t\.me)/gi;
const PHONE = /01[016789][\s-]?\d{3,4}[\s-]?\d{4}/g;
const blocks = () => { try { return JSON.parse(localStorage.getItem('maeul_blocks') || '[]'); } catch { return []; } };
export const Safe = {
  EV,
  accepted: () => localStorage.getItem('maeul_eula') === EV,
  bad: t => { RE.lastIndex = 0; const r = RE.test(String(t)); RE.lastIndex = 0; return r; },
  clean(t) { return String(t || '').replace(RE, m => '♡'.repeat(Math.min(4, m.length))).replace(LINK, '(링크)').replace(PHONE, '(번호)'); },
  isBlocked: (id, name) => blocks().some(b => b.id === id || (name && b.name === name)),
  block(id, name) { const L = blocks().filter(b => b.id !== id); L.push({ id, name: String(name || '').slice(0, 12), t: Date.now() }); localStorage.setItem('maeul_blocks', JSON.stringify(L.slice(-200)));
    const n = window.G?.net; n?.sb?.rpc('block_user', { p_secret: n.secret(), p_target: (id || '') + ':' + String(name || '').slice(0, 12) }).then(() => {}, () => {}); },
  unblockAll() { localStorage.removeItem('maeul_blocks'); },
  list: blocks,
  async report(id, name, body) { const n = window.G?.net; try { if (n?.sb) { const { error } = await n.sb.from('reports').insert({ room: n.room || '-', target_id: String(id || '-').slice(0, 16), target_name: String(name || '').slice(0, 12), body: String(body || '').slice(0, 120), reporter_id: n.id }); if (error) throw error; } return true; } catch { return false; } },
  accept() { localStorage.setItem('maeul_eula', EV); const n = window.G?.net; n?.sb?.rpc('eula_accept', { p_secret: n.secret(), p_version: EV }).then(() => {}, () => {}); },
  // title gate
  mountTitle() { const card = document.querySelector('#title .tcard .row'); if (!card || document.getElementById('eula')) return;
    const w = document.createElement('label'); w.id = 'eula'; w.className = 'eula';
    w.innerHTML = `<input type="checkbox" id="eulachk"> <span><a href="#" id="eulalink">이용약관·운영정책</a>에 동의해요 (만 14세 이상 · 욕설/광고/개인정보 공유 금지 · 신고 3회 시 숨김)</span>`;
    card.before(w); const btns = ['#newgame', '#continue', '#guest'].map(s => document.querySelector(s)).filter(Boolean);
    const chk = w.querySelector('#eulachk'); chk.checked = this.accepted();
    const sync = () => btns.forEach(b => { b.classList.toggle('needeula', !chk.checked); });
    btns.forEach(b => b.addEventListener('click', e => { if (!chk.checked) { e.stopImmediatePropagation(); e.preventDefault(); w.classList.add('shake'); setTimeout(() => w.classList.remove('shake'), 500); } else this.accept(); }, true));
    chk.onchange = sync; sync(); w.querySelector('#eulalink').onclick = e => { e.preventDefault(); this.showTerms(); }; },
  showTerms(onOk) { let m = document.getElementById('eulam'); if (!m) { m = document.createElement('div'); m.id = 'eulam'; m.className = 'eulam'; document.body.append(m); }
    m.innerHTML = `<div class="panel"><h2>📜 마실채플 이용약관 · 운영정책</h2><div class="terms">
    <p>1. 마실채플은 누구나 무료로 즐기는 동네 예배당 놀이터예요. 만 14세 미만은 보호자 동의 후 이용해 주세요.</p>
    <p>2. 욕설·비하·혐오·성적인 말, 광고·링크·전화번호 등 개인정보 공유는 금지돼요. 자동으로 가려지고 반복되면 이용이 제한돼요.</p>
    <p>3. 불편한 이웃은 채팅 옆 🚩 버튼으로 신고하거나 차단할 수 있어요. 신고 3회 이상 콘텐츠는 모두에게 숨겨져요.</p>
    <p>4. 헌금·달란트는 게임 속 재화로만 쓰이며 실제 돈으로 사고팔거나 다른 사람에게 보낼 수 없어요.</p>
    <p>5. 설정 › '처음부터 다시 시작'으로 내 기록을 모두 지울 수 있어요.</p></div>
    <label class="eula"><input type="checkbox" id="eulam_c" ${this.accepted() ? 'checked' : ''}> 위 내용에 동의해요</label><button class="big" id="eulam_ok">확인</button></div>`;
    m.style.display = 'flex'; m.querySelector('#eulam_ok').onclick = () => { if (m.querySelector('#eulam_c').checked) { this.accept(); const c = document.getElementById('eulachk'); if (c) { c.checked = true; c.onchange?.(); } m.style.display = 'none'; onOk?.(); } else window.G?.toast?.('동의에 체크해 주세요'); }; },
  need(cb) { if (this.accepted()) return cb(); this.showTerms(cb); },
  // chat-line actions
  menu(id, name, text) { let m = document.getElementById('ugcm'); if (!m) { m = document.createElement('div'); m.id = 'ugcm'; m.className = 'eulam'; document.body.append(m); }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    m.innerHTML = `<div class="panel"><h2>${esc(name)}님</h2><p class="mnote">“${esc(text).slice(0, 80)}”</p><div class="row"><button class="big" data-a="rep">🚩 신고하기</button><button class="big alt" data-a="blk">🙈 차단하기</button></div><button class="big alt" data-a="x">닫기</button></div>`;
    m.style.display = 'flex'; m.onclick = async e => { const a = e.target.dataset?.a; if (!a && e.target !== m) return; m.style.display = 'none';
      if (a === 'rep') { const ok = await this.report(id, name, text); window.G?.toast?.(ok ? '🚩 신고가 접수되었어요. 확인 후 조치할게요' : '신고를 보내지 못했어요 (잠시 후 다시)'); }
      if (a === 'blk') { this.block(id, name); window.G?.toast?.(`🙈 ${name}님을 차단했어요 · 설정에서 해제할 수 있어요`); document.querySelectorAll(`#chatlog .cl[data-id="${CSS.escape(id)}"]`).forEach(x => x.remove()); window.G?.remotes?.get(id)?.say?.(''); } }; },
};
window.Safe = Safe;
