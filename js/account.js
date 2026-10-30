// 계정 연동: guest start stays (identity = maeul_secret). Linking = Supabase Auth user (email OTP / magic link, Google when
// the provider is enabled) owning one account_links row {secret, save}. Login on any device restores secret + save → same chapel/character/wallet.
const SITE = 'https://maeul-chapel-25d.vercel.app';
const KEEP = /^(chapel_v4_(save|board)|p2_|maeul_(journey|marks|prefs|audio|bfs|bpos|grid|eula|blocks|hidden_decor|read_|chap_|dong))/;
const G = () => window.G, sb = () => G()?.net?.sb, $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let PROV = null;
export async function providers() { if (PROV) return PROV; try { const c = sb(); const r = await fetch(c.supabaseUrl + '/auth/v1/settings', { headers: { apikey: c.supabaseKey } }); const j = await r.json(); PROV = j.external || {}; } catch { PROV = { email: true }; } return PROV; }
function snapshot() { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEEP.test(k)) o[k] = localStorage.getItem(k); } return o; }
export async function user() { try { const { data } = await sb().auth.getSession(); const u = data?.session?.user; return u && !u.is_anonymous ? u : null; } catch { return null; } }
export const isLinked = async () => !!(await user());
// after any sign-in: first time → store this device's guest; existing row → restore it (reload if identity differs)
let SETTLING = null; export function settle() { return SETTLING ||= _settle().finally(() => setTimeout(() => SETTLING = null, 3000)); }
async function _settle() { const u = await user(); if (!u) return null; const c = sb(), me = G().net.secret();
  const { data: row, error } = await c.from('account_links').select('secret,save').eq('user_id', u.id).maybeSingle(); if (error) { G().toast?.('계정 연결 확인 실패 · 잠시 후 다시'); return null; }
  if (!row) { const r = await c.from('account_links').insert({ user_id: u.id, secret: me, save: snapshot() }); if (r.error) return null; G().toast?.('🔗 계정이 연동됐어요 · 다른 기기에서도 이어할 수 있어요'); return 'linked'; }
  if (row.secret !== me) { localStorage.setItem('maeul_secret', row.secret); for (const [k, v] of Object.entries(row.save || {})) localStorage.setItem(k, v); sessionStorage.setItem('maeul_restored', '1'); window.__RESETTING = true; try { G().net.leave(); } catch { } location.replace(location.pathname); return 'restored'; }
  backup(); return 'same'; }
let bt = 0; export function backup() { clearTimeout(bt); bt = setTimeout(async () => { const u = await user(); if (u) sb().from('account_links').update({ save: snapshot(), updated_at: new Date().toISOString() }).eq('user_id', u.id).then(() => {}, () => {}); }, 1500); }
async function google() { const c = sb(); const { data } = await c.auth.getSession(); const opt = { provider: 'google', options: { redirectTo: SITE + '/' } };
  const r = data?.session?.user?.is_anonymous ? await c.auth.linkIdentity(opt) : await c.auth.signInWithOAuth(opt); if (r.error) G().toast('Google 연결 실패: ' + r.error.message); }
export async function open() { const P = await providers(), u = await user(), body = $('#p2acct .body');
  body.innerHTML = u ? `<p class="acct-ok">🔗 연동됨 · <b>${esc(u.email || u.user_metadata?.full_name || '계정')}</b></p><p class="mnote">이 계정으로 어느 기기에서 로그인해도 지금 예배당·캐릭터·지갑으로 돌아와요.</p><div class="row"><button id="acbak" class="big alt">지금 백업</button><button id="acout" class="big alt">이 기기에서 로그아웃</button></div>`
    : `<p class="mnote">지금은 손님으로 플레이 중이에요. 계정을 연동하면 기기를 바꾸거나 로그아웃해도 그대로 이어할 수 있어요.</p>
      ${P.google ? '<button id="acg" class="big oauth g">Google로 연동 / 로그인</button>' : ''}${P.kakao && window.MAEUL_KAKAO ? '<button id="ack" class="big oauth k">카카오로 연동</button>' : ''}
      <label class="aclab">이메일<input id="acmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" maxlength="120"></label><button id="acsend" class="big">인증 메일 받기</button>
      <div id="acotp" hidden><label class="aclab">메일로 받은 6자리 코드<input id="accode" inputmode="numeric" maxlength="10" placeholder="123456"></label><button id="acver" class="big">확인</button><small class="mnote">메일의 링크를 눌러도 돼요</small></div><p id="acmsg" class="mnote" aria-live="polite"></p>`;
  const msg = t => { const e = $('#acmsg'); if (e) e.textContent = t; };
  $('#acg') && ($('#acg').onclick = google);
  $('#acsend') && ($('#acsend').onclick = async () => { const em = $('#acmail').value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return msg('이메일 주소를 확인해 주세요');
    $('#acsend').disabled = true; const r = await sb().auth.signInWithOtp({ email: em, options: { emailRedirectTo: SITE + '/', shouldCreateUser: true } }); $('#acsend').disabled = false;
    if (r.error) return msg('보내지 못했어요: ' + r.error.message); $('#acotp').hidden = false; msg('📮 ' + em + ' 로 인증 메일을 보냈어요'); });
  $('#acver') && ($('#acver').onclick = async () => { const r = await sb().auth.verifyOtp({ email: $('#acmail').value.trim(), token: $('#accode').value.trim(), type: 'email' }); if (r.error) return msg('코드가 맞지 않아요'); const s = await settle(); if (s !== 'restored') open(); });
  $('#acbak') && ($('#acbak').onclick = () => { backup(); G().toast('백업했어요'); });
  $('#acout') && ($('#acout').onclick = () => window.MaeulReset.logout()); }
export async function boot() { if (!sb()) return; if (sessionStorage.getItem('maeul_restored')) { sessionStorage.removeItem('maeul_restored'); setTimeout(() => G().toast?.('🔄 내 계정의 예배당으로 돌아왔어요'), 1500); }
  sb().auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN') settle(); }); if (await user()) settle(); addEventListener('pagehide', backup); }
window.Acct = { open, isLinked, settle, backup, providers, boot, unlinkSave };

// full reset for linked accounts: point the auth uid at a fresh secret with an empty save so re-login starts clean
export async function unlinkSave() { const u = await user(); if (!u) return; const a = new Uint8Array(24); crypto.getRandomValues(a); const ns = [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  await sb().from('account_links').update({ secret: ns, save: {}, updated_at: new Date().toISOString() }).eq('user_id', u.id); }
