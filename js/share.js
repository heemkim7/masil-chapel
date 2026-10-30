// Share/copy link: runs synchronously inside the user gesture (no await before share/clipboard).
(function () {
  const T = m => (window.G?.toast ? G.toast(m) : alert(m));
  function legacy(u) { const ta = document.createElement('textarea'); ta.value = u; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, u.length); let ok = false; try { ok = document.execCommand('copy'); } catch { } ta.remove(); return ok; }
  function manual(u) { let el = document.getElementById('sharebox'); if (!el) { el = document.createElement('div'); el.id = 'sharebox';
      el.innerHTML = '<span>아래 링크를 길게 눌러 복사해 주세요</span><input readonly><button>닫기</button>'; document.body.appendChild(el); el.querySelector('button').onclick = () => el.style.display = 'none'; }
    const i = el.querySelector('input'); i.value = u; el.style.display = 'flex'; i.focus(); i.select(); T('자동 복사가 안 돼요 — 링크를 직접 복사해 주세요'); }
  function copy(u) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(u).then(() => T('🔗 링크를 복사했어요'), () => (legacy(u) ? T('🔗 링크를 복사했어요') : manual(u))); return; }
    legacy(u) ? T('🔗 링크를 복사했어요') : manual(u); }
  window.shareLink = function (u) {
    const mobile = matchMedia('(pointer:coarse)').matches;
    if (mobile && navigator.share) { navigator.share({ title: '마실채플', text: '같이 마실채플에 놀러 와요 🙏', url: u }).then(() => T('🔗 공유했어요'), e => { if (e && e.name === 'AbortError') return; copy(u); }); return; }
    copy(u); };
})();
