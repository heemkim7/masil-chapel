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
    if '/rpc/delete_account' in u: LOG.append('delete_account'); return rt.fulfill(json=True)
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
    pg.evaluate("G.start('리셋이','basic')"); pg.wait_for_timeout(1000); pg.evaluate('G.closeModal&&G.closeModal()'); pg.wait_for_timeout(2500)
    pg.evaluate("G.S.coins=555; G.S.av='f.2.1.1.1.mint.-.-.-.-'; G.persist()"); sec1 = pg.evaluate("localStorage.getItem('maeul_secret')")
    # link
    pg.evaluate("P2.openSet()"); pg.wait_for_timeout(300); pg.click('#p2acctbtn'); pg.wait_for_timeout(1000)
    pg.fill('#acmail', 'qa@example.invalid'); pg.click('#acsend'); pg.wait_for_timeout(600); pg.fill('#accode', '123456'); pg.click('#acver'); pg.wait_for_timeout(2000)
    ok['linked'] = bool(DB['row'])
    # (a) appearance only
    pg.evaluate("G.closeModal(); P2.openSet()"); pg.wait_for_timeout(300); pg.screenshot(path='shots/ui/reset_1_settings.png'); pg.click('#p2avreset'); pg.wait_for_timeout(300)
    pg.evaluate("[...document.querySelectorAll('#dopts button')].find(b=>b.textContent.includes('외형 초기화')).click()"); pg.wait_for_timeout(2500)
    ok['av_default'] = pg.evaluate("G.S.av") == 'f.1.0.0.0.basic.-.-.-.-'; ok['coins_kept'] = pg.evaluate("G.S.coins") == 555
    ok['customizer_reopened'] = pg.is_visible('#p2cust'); ok['secret_kept'] = pg.evaluate("localStorage.getItem('maeul_secret')") == sec1
    ok['av_synced_server'] = 'f.1.0.0.0.basic' in json.dumps(DB['row'].get('save'))
    pg.screenshot(path='shots/ui/reset_2_cust.png')
    # (b) full
    pg.evaluate("G.closeModal(); P2.openSet()"); pg.wait_for_timeout(300); pg.click('#p2reset'); pg.wait_for_timeout(400)
    ok['warn_no_refund'] = '환불되지 않' in pg.inner_text('#p2rsc'); ok['btn_disabled'] = pg.is_disabled('#p2rsgo')
    pg.fill('#p2rsin', '초기화'); ok['btn_enabled'] = not pg.is_disabled('#p2rsgo'); pg.screenshot(path='shots/ui/reset_3_confirm.png')
    pg.click('#p2rsgo'); pg.wait_for_timeout(5000)
    ok['server_delete_called'] = 'delete_account' in LOG; ok['link_row_fresh'] = DB['row']['secret'] != sec1 and DB['row']['save'] == {}
    ok['local_wiped'] = pg.evaluate("localStorage.getItem('maeul_secret')") != sec1
    ok['errors'] = e1[:5]; c1.close(); b.close()
print(json.dumps(ok, ensure_ascii=False, indent=1)); print('LOG', LOG)
sys.exit(0 if all(v for k, v in ok.items() if k != 'errors') and not ok['errors'] else 1)
