# Full account-linking flow against mocked Supabase Auth + account_links REST (real RLS tested separately in SQL):
# guest → settings 계정 연동 → email OTP → verify → row inserted with this guest's secret+save → logout (guest warning when unlinked)
# → fresh device (cleared storage) → login → secret+save restored → same chapel/character/wallet identity.
import json, sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765'
DB = {'row': None}; LOG = []
USER = {'id': '11111111-2222-4333-8444-555555555555', 'aud': 'authenticated', 'role': 'authenticated', 'email': 'qa@example.invalid', 'is_anonymous': False, 'app_metadata': {'provider': 'email'}, 'user_metadata': {}, 'created_at': '2026-10-30T00:00:00Z'}
def b64(o):
    import base64; return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
TOK = b64({'alg': 'HS256', 'typ': 'JWT'}) + '.' + b64({'sub': USER['id'], 'role': 'authenticated', 'exp': 4102444800, 'email': USER['email']}) + '.sig'
SESSION = {'access_token': TOK, 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800, 'refresh_token': 'r', 'user': USER}
def route(rt):
    r = rt.request; u = r.url; m = r.method
    if '/auth/v1/settings' in u: return rt.fulfill(json={'external': {'email': True, 'google': True}})
    if '/auth/v1/otp' in u: LOG.append('otp ' + r.post_data); return rt.fulfill(json={})
    if '/auth/v1/verify' in u: LOG.append('verify'); return rt.fulfill(json=SESSION)
    if '/auth/v1/user' in u: return rt.fulfill(json=USER)
    if '/auth/v1/logout' in u: LOG.append('signout'); return rt.fulfill(status=204, body='')
    if '/rest/v1/account_links' in u:
        if m == 'GET':
            row = DB['row']; return rt.fulfill(json=row if 'vnd.pgrst.object' in (r.headers.get('accept') or '') and row else ([row] if row else []), status=200 if row or 'object' not in (r.headers.get('accept') or '') else 406) if False else rt.fulfill(json=[DB['row']] if DB['row'] else [])
        if m == 'POST': DB['row'] = json.loads(r.post_data); LOG.append('insert'); return rt.fulfill(status=201, body='')
        if m == 'PATCH': DB['row'].update(json.loads(r.post_data)); LOG.append('update'); return rt.fulfill(status=204, body='')
    return rt.continue_()
ok = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def device():
        c = b.new_context(viewport={'width': 1280, 'height': 800}); c.route('**/gisykxqhticmdhmupnry.supabase.co/**', route); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL + '/'); pg.evaluate('localStorage.clear(); localStorage.setItem("maeul_eula","9")'); pg.reload(); pg.wait_for_function('window.__ready', timeout=60000); return c, pg, errs
    c1, pg, e1 = device()
    pg.evaluate("G.start('연동이','basic')"); pg.wait_for_timeout(1000); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(2500)
    pg.evaluate("(()=>{G.S.coins = 777; G.refreshHud(); const k='chapel_v4_save', o=JSON.parse(localStorage.getItem(k)||'{}'); o.coins=777; o.name=o.name||G.S.name; localStorage.setItem(k, JSON.stringify(o));})()"); pg.wait_for_timeout(300)
    sec1 = pg.evaluate("localStorage.getItem('maeul_secret')")
    # guest logout warning offers linking
    pg.evaluate("P2.openSet()"); pg.wait_for_timeout(300); pg.click('#p2logout'); pg.wait_for_timeout(400)
    ok['guest_logout_warns'] = '성도' in pg.inner_text('#dialog') and '연동' in pg.inner_text('#dialog'); pg.screenshot(path='shots/ui/acct_1_guest_warn.png')
    pg.evaluate("[...document.querySelectorAll('#dopts button')].find(b=>b.textContent.includes('먼저 계정 연동')).click()"); pg.wait_for_timeout(1200)
    ok['link_panel_opens'] = pg.is_visible('#acmail'); ok['google_btn_when_enabled'] = pg.is_visible('#acg'); ok['kakao_hidden'] = not pg.is_visible('#ack')
    pg.fill('#acmail', 'qa@example.invalid'); pg.click('#acsend'); pg.wait_for_timeout(800); pg.screenshot(path='shots/ui/acct_2_otp.png')
    ok['otp_requested'] = any(l.startswith('otp') for l in LOG); pg.fill('#accode', '123456'); pg.click('#acver'); pg.wait_for_timeout(2000)
    ok['row_saved_with_guest_secret'] = bool(DB['row']) and DB['row']['secret'] == sec1 and 'chapel_v4_save' in DB['row']['save']
    pg.screenshot(path='shots/ui/acct_3_linked.png'); ok['linked_ui'] = '연동됨' in pg.inner_text('#p2acct')
    pg.evaluate("G.closeModal(); P2.openSet()"); pg.wait_for_timeout(300); pg.click('#p2logout'); pg.wait_for_timeout(600)
    ok['linked_logout_no_guest_warning'] = '성도' not in pg.inner_text('#dialog'); pg.screenshot(path='shots/ui/acct_4_linked_logout.png'); c1.close()
    # new device: login with same email → restore
    c2, pg, e2 = device(); sec2 = pg.evaluate("localStorage.getItem('maeul_secret')")
    pg.evaluate("G.start('딴사람','basic')"); pg.wait_for_timeout(1000); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(2000)
    pg.evaluate("P2.openSet()"); pg.wait_for_timeout(300); pg.click('#p2acctbtn'); pg.wait_for_timeout(1000)
    pg.fill('#acmail', 'qa@example.invalid'); pg.click('#acsend'); pg.wait_for_timeout(600); pg.fill('#accode', '123456')
    pg.click('#acver')
    pg.wait_for_function("sessionStorage.getItem('maeul_restored')!==null || localStorage.getItem('maeul_secret')==='%s'" % sec1, timeout=15000) if False else pg.wait_for_timeout(4000)
    pg.wait_for_function('window.__ready', timeout=60000); pg.wait_for_timeout(800)
    ok['restored_secret'] = pg.evaluate("localStorage.getItem('maeul_secret')") == sec1
    sv = json.loads(pg.evaluate("localStorage.getItem('chapel_v4_save')") or '{}'); ok['restored_character'] = sv.get('name') == '연동이'; ok['restored_coins_local'] = sv.get('coins') == 777
    pg.screenshot(path='shots/ui/acct_5_restored.png'); ok['errors'] = (e1 + e2)[:5]; c2.close(); b.close()
print(json.dumps(ok, ensure_ascii=False, indent=1)); print('LOG', LOG)
sys.exit(0 if all(v for k, v in ok.items() if k != 'errors') and not ok['errors'] else 1)
