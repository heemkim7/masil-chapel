import sys, json, base64, os
from playwright.sync_api import sync_playwright
os.makedirs('shots/qa', exist_ok=True); res = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in sys.argv[1:]:
        pg = b.new_page(); pg.on('console', lambda m: print('LOG', m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: print('ERR', e))
        pg.goto(f'http://localhost:8765/qa_chars.html?m={m}'); pg.wait_for_function('document.title=="DONE"', timeout=240000)
        o = pg.evaluate('window.QA'); d = pg.evaluate('window.PNG')
        out = {'qa': 'shots/qa/contact_qa.png', 'hair': 'shots/qa/hair_align.png', 'age': 'shots/age/lineup.png', 'skin': 'shots/skin/contact.png'}[m]
        os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'wb').write(base64.b64decode(d.split(',')[1])); o['png'] = out; res[m] = o
        print(m, json.dumps({k: (v if k != 'fails' else v[:12]) for k, v in o.items()}, ensure_ascii=False), 'nfail', len(o['fails']))
    b.close()
json.dump(res, open('shots/qa/report.json', 'w'), ensure_ascii=False, indent=1)
