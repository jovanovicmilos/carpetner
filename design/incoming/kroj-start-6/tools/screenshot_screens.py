"""Open every exported screen in headless Chrome, report JS errors, save PNG screenshots.
Usage: python3 screenshot_screens.py <screens dir> [chrome path]
"""
import sys, os, json
from playwright.sync_api import sync_playwright

d = os.path.abspath(sys.argv[1])
chrome = sys.argv[2] if len(sys.argv) > 2 else None
screens = json.load(open(os.path.join(d, 'screens.json')))
FULL = {'KrojnaLista.html', 'Obracun.html', 'Poredjenje.html', 'Sajt.html', 'Prijava.html', 'Cenovnik.html', 'Standardi.html', 'AIPodesavanja.html'}
extra = [
    ('Main.html', 'Main_prazan.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Novi prazan prostor')b.click()})"),
    ('Main.html', 'Main_bez_pomoci.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Pomoć')b.click()})"),
    ('Nacrti.html', 'Nacrti_odozgo.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Odozgo · otvaranje')b.click()})"),
    ('Nacrti.html', 'Nacrti_radne_ploce.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Radne ploče')b.click()})"),
    ('Element.html', 'Element_sablon.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Sačuvaj kao šablon')b.click()})"),
    ('Element.html', 'Element_fiokar.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Fiokar')b.click()}); document.querySelector('[aria-label=\"Mere i vrsta elementa\"]').scrollIntoView()"),
    ('Nacrti.html', 'Nacrti_tehnicki.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Tehnički')b.click()})"),
]
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch()
    for sc in screens:
        pg = br.new_page(viewport={'width': sc['w'], 'height': min(sc['h'], 1000)})
        pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.goto('file://' + os.path.join(d, sc['file']), wait_until='load', timeout=15000)
        pg.add_style_tag(url='file://' + os.path.join(d, 'fonts-test.css')); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(150)
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(d, sc['png']), full_page=sc['file'] in FULL)
        print(sc['file'], 'OK' if not errs else 'ERRORS: ' + ' | '.join(errs[:3]))
        pg.close()
    for f, png, js in extra:
        pg = br.new_page(viewport={'width': 1440, 'height': 920})
        pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        pg.goto('file://' + os.path.join(d, f), wait_until='load', timeout=15000)
        pg.add_style_tag(url='file://' + os.path.join(d, 'fonts-test.css')); pg.evaluate('document.fonts.ready')
        pg.evaluate(js); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(d, png)); pg.close()
        print(png)
    br.close()
