"""Open every exported screen in headless Chrome, report JS errors, save PNG screenshots.
Usage: python3 screenshot_screens.py <screens dir> [chrome path]
"""
import sys, os, json
from playwright.sync_api import sync_playwright

d = os.path.abspath(sys.argv[1])
chrome = sys.argv[2] if len(sys.argv) > 2 else None
screens = json.load(open(os.path.join(d, 'screens.json')))
FULL = {'KrojnaLista.html', 'Obracun.html', 'Poredjenje.html', 'Sajt.html', 'Prijava.html', 'Cenovnik.html', 'Standardi.html', 'AIPodesavanja.html', 'Biblioteka.html'}
extra = [
    ('Element.html', 'Element_korak_hover.png', "document.querySelectorAll('a.k-step')[3].dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); document.querySelectorAll('a.k-step')[3].focus()"),
    ('Main.html', 'Main_prepreke.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Prepreke')b.click()})"),
    ('Main.html', 'Main_rucke_sipka.png', "const s=document.querySelector('.k-lib select'); s.value='bar'; s.dispatchEvent(new Event('change',{bubbles:true}))"),
    ('Pogled3D.html', 'Pogled3D_tehnicki.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Tehnički')b.click()})"),
    ('Pogled3D.html', 'Pogled3D_vece.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Veče')b.click()}); document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Hrast prirodni')b.click()})"),
    ('Pogled3D.html', 'Pogled3D_slika.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Slika za ponudu')b.click()})"),
    ('Konfigurator.html', 'Konfigurator_pritisak.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim().startsWith('Na pritisak'))b.click()})"),
    ('Konfigurator.html', 'Konfigurator_visoki.png', "document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Visoki')b.click()}); await new Promise(r=>setTimeout(r,80)); document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Rerna + mikro')b.click()})"),
    ('Biblioteka.html', 'Biblioteka_rucke.png', "document.querySelectorAll('[role=tab]').forEach(b=>{if(b.textContent.trim().startsWith('Ručke'))b.click()})"),
    ('Biblioteka.html', 'Biblioteka_aparati.png', "document.querySelectorAll('[role=tab]').forEach(b=>{if(b.textContent.trim().startsWith('Aparati'))b.click()})"),
    ('Biblioteka.html', 'Biblioteka_katalog.png', "document.querySelectorAll('[role=tab]').forEach(b=>{if(b.textContent.trim().startsWith('Katalog'))b.click()})"),
    ('Main.html', 'Main_prazan.png', "document.querySelector('[data-pop=proj] > button').click(); await new Promise(r=>setTimeout(r,80)); document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Novi prazan prostor')b.click()})"),
    ('Main.html', 'Main_izabrano.png', "const el=[...document.querySelectorAll('[data-plan] span')].find(x=>x.textContent.trim()==='D2 · 800'); const r=el.getBoundingClientRect(); const o={bubbles:true,clientX:r.x+5,clientY:r.y+5,button:0,pointerType:'mouse'}; el.dispatchEvent(new PointerEvent('pointerdown',o)); el.dispatchEvent(new PointerEvent('pointerup',o)); el.dispatchEvent(new MouseEvent('click',o))"),
    ('Main.html', 'Main_desni_klik.png', "const el=[...document.querySelectorAll('[data-plan] span')].find(x=>x.textContent.trim()==='D2 · 800'); const r=el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.x+30,clientY:r.y+40,button:2}))"),
    ('Main.html', 'Main_provera.png', "document.querySelector('[data-pop=chk] > button').click()"),
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
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        pg.goto('file://' + os.path.join(d, f), wait_until='load', timeout=15000)
        pg.add_style_tag(url='file://' + os.path.join(d, 'fonts-test.css')); pg.evaluate('document.fonts.ready')
        pg.evaluate('async () => {' + js + '}'); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(d, png), full_page=f in FULL); pg.close()
        print(png, 'OK' if not errs2 else 'ERRORS: ' + ' | '.join(errs2[:3]))
    br.close()
