"""Export the Claude Design artboards (.dc.html) to standalone HTML screens that run with dc-lite.js.
Usage: python3 export_screens.py <dir with *.dc.html and canvas.json> <out dir>
"""
import sys, os, re, json, html

src_dir, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
canvas = json.load(open(os.path.join(src_dir, 'canvas.json')))
DATA = {
  'BrziStart': 'Forma Brzog starta sa podrazumevanim unosom (L, A 3200, B 2400, voda 1500, trofazna 900 od ugla sa A, prozor 1100/1000, MSP + frižider + gornji). Rezultat autoLayout = elementi iz fixtures/kuhinja-petrovic.json.',
  'Main': 'fixtures/kuhinja-petrovic.json → project (zidovi A–D, prozor, vrata, radijator, kanal, instalacije, 12 elemenata). Ugrađeno u example(); t = offset + 60.',
  'Zid': 'fixtures/kuhinja-petrovic.json, zid A (elementi, prozor, instalacije) + tabela svih instalacija.',
  'Pogled3D': 'fixtures/kuhinja-petrovic.json (ilustracija scene).',
  'Element': 'fixtures/kuhinja-petrovic.json, element D2 + expected.parts (D2-1…D2-5) i okov D2.',
  'KrojnaLista': 'fixtures/kuhinja-petrovic.json → expected (parts spojeni po materijalu/meri/kantu, sheets, edgeMetersOrder, hardware, accessories).',
  'Obracun': 'fixtures/… expected × primer cenovnika iz Cenovnik ekrana; sečenje 118 m je procena optimizacije (nije u fixture-u).',
  'Poredjenje': 'Isti obim kao Krojna lista, primer cenovnika 3 pilane (izmišljene cene, nisu u fixture-u).',
  'Nacrti': 'fixtures/kuhinja-petrovic.json (zid A spreda, tlocrt sa šarkama, PDT1/PDT2 iz expected.worktops).',
  'AIPredlog': 'Primer AI predloga za isti prostor (zid A 3200, B ≈2400, prozor, V, O, S).',
  'Sajt': 'Statičan sadržaj; primer cene = Obračun.', 'Prijava': 'Statičan.', 'Cenovnik': 'Primer cenovnika (cene korišćene u Obračunu).',
  'Standardi': 'Preset vrednosti iz docs/STANDARDI.md.', 'AIPodesavanja': 'Statičan.',
  'Konfigurator': 'Primer: donji 600×720×560, fiokar 3 fioke (180 + auto + auto), ručke kao projekat (profil na vrhu). Očekivani delovi i okov: fixtures/konfigurator-primer.json.',
  'Projekti': 'Primer liste projekata; procenti po težinama koraka iz docs/TOK_PROJEKTA.md (Petrović 59 %).',
  'Biblioteka': 'Materijali (vezani za cenovnik), pravila otvaranja (fixtures/otvaranje.json), generički aparati (fixtures/aparati.json), katalog (fixtures/katalog.json).',
  'KupacStart': 'Mušterija, vodič u 5 pitanja (docs/MARKETPLACE.md → Customer experience). Podrazumevano: ugaona L, A 320 cm, B 240 cm, voda A 150, struja B 90, rerna u visokom, ugradni frižider, MSP 60, svetla + šipka. Rezultat ide u autoLayout (docs/BRZI_START.md).',
  'KupacEditor': 'Isti primer kao Petrović, uprošćeno za mušteriju (cm, samo katalog, širine iz liste). Primer cene samo uz partnera (opseg), upozorenje rečima za laike.',
  'KupacPosalji': 'Imenik radionica (placeholder imena), izbor do 3, poruka + fotografije, Plus [CENA] jednokratno po projektu.',
  'KupacPonude': 'Ponuda v2 od [Radionica A] = 268.066 RSD (isti iznos kao Obračun za Petrović), druga radionica u pregledu, treće slanje slobodno.',
  'Upiti': 'Inbox upita radionice: 5 upita (3 nova); detalj izabranog sa planom kupca, porukom i „Preuzmi projekat“.',
  'Saradnja': 'Projekat Ana P.: 3 predloga stolara (pomeranje sudopere, 2 × 30, završna lajsna), komentar kupca na visokom, tok, poruke; prekidač Stolar / Kupac.',
  'Pretplata': 'Pro proba (dan 18 od 30), potrošnja, paketi Start / Pro / Premium i dodaci iz docs/MARKETPLACE.md (cene [CENA]), obrazac zaključane opcije.',
  'Planer': 'Isti editor, uloga mušterija (prop role=kupac), zajednička sesija uživo sa [Radionica A] · Marko: prisustvo, kursor druge strane, izmene po autoru (Ana zeleno, Marko orah), sudopera potvrđena (katanac) — docs/SITE_AND_FLOW.md.',
  'PlanerStolar': 'Isti fajl kao Planer, uloga stolar (role=stolar): mm, pun katalog, prilagođeni element, Konstrukcija, Potvrdi (zaključaj), 7 koraka.',
  'Pregled': 'Korak 4 mušterije: sažetak, primer cene (partner, raspon), Javno (podrazumevano) / Privatno ([CENA] ili uz Plus), nalog tek ovde (Google ili e-pošta, link bez lozinke).',
  'Pocetna': 'Sajt, početna: jedno glavno dugme, kako radi u 3 koraka, galerija pravih kuhinja iz planera, traka za stolare (30 dana bez kartice), partneri [PARTNER].',
  'Inspiracija': 'Galerija javnih kuhinja: filteri oblik / stil / samo izrađene, 12 kartica (placeholder nazivi), „Napravi ovakvu“ na svakoj.',
  'Kuhinja': 'Javna stranica kuhinje: 3D / osnova, „Napravi ovakvu“ (jedna glavna radnja), izradila [Radionica A], materijali, primer cene, prijava sadržaja.',
  'ZaStolare': 'Sajt za stolare: probaj 30 dana bez kartice, šta dobija radionica, Cene sa tabovima Za stolare (Start / Pro / Premium) i Za kuću (Besplatno / Plus / Privatno), česta pitanja.',
  'Radionice': 'Imenik radionica na sajtu: filteri mesto / montaža / rok, lista ili lista + mapa ([PROVAJDER MAPA]), radovi kao sličice; isticanje uvek označeno; bez ocena (kasnije, samo završeni poslovi).',
  'Radionica': 'Javni profil radionice: naslovna traka, „Pošalji svoju kuhinju“ (vodi u planer), objavljeni radovi (uz saglasnost kupca), o radionici, usluge, područje rada; kontakt tek posle slanja.',
  'PlanerTelefon': 'Mušterija na telefonu (390 px): vodič (jedno pitanje po ekranu), raspored sa donjim listom za izabrani element i sesijom uživo, pregled sa javno / privatno. Artboard 1300 × 900 sa tri telefona.',
  'ProfilRadionice': 'Podešavanja radionice → Profil: naziv, logo, opis (400 znakova), usluge, područje (km), rok, prijem upita (pauza), portfolio sa statusom saglasnosti kupca (saglasan / čeka / bez / odbio / sopstveni) i „Zatraži saglasnost“; desno pregled kako ga vide kupci.',
  'MojeKuhinje': 'Početna mušterije posle prijave: kartice kuhinja sa vidljivošću, korakom i procentom, novostima (poruke, ponuda) i „Nastavi“; zahtev radionice za objavu u portfoliju (Dozvoli / Ne, hvala). Meni ⋯: preimenuj, kopija (varijanta), vidljivost, obriši.',
  'AppShell': 'Navigacija radionice (2026-11-21, korisnik): red 1 glavni meni UVEK vidljiv kad si prijavljen (Projekti · otvoreni projekat · Upiti; desno paket, dugme „Radionica“ na mestu starog „Pomoć“, avatar); red 2 traka projekta samo u projektu (naziv i %, koraci, mm/cm, Podeli). Meni „Radionica“ otvoren: Cene i materijali, Podešavanja, prekidač „Pomoć na ekranu“, Odjava.',
  'AdminShell': 'Stranice radionice (Cenovnik, Materijali i katalog, Dobavljači, Podrazumevane mere, Profil, Korisnici, Paket, AI) ispod istog glavnog menija, sa bočnim menijem levo i prekidačem „Pomoć na ekranu“ na dnu.',
  'Dobavljaci': 'Dva sopstvena dobavljača + jedan partner (placeholder imena); cene iz cenovnika Petrović (W980 6.500, U708 8.900, HDF 2.400, radna ploča 14.500).'
}
screens = []
for name in canvas['order']:
    path = os.path.join(src_dir, name)
    s = open(path, encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', s, re.S).group(1).strip()
    tpl = s[s.index('<x-dc>') + 6:s.index('</x-dc>')]
    tpl = re.sub(r'href="([A-Za-z0-9_-]+)\.dc\.html', r'href="\1.html', tpl)
    m = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='(.*?)'>(.*?)</script>", s, re.S)
    props_raw = json.loads(html.unescape(m.group(1)))
    props = {k: v.get('default') for k, v in props_raw.items() if isinstance(v, dict) and 'default' in v and not k.startswith('$')}
    logic = m.group(2)
    base = name.replace('.dc.html', '')
    page = f"""<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
</head>
<body>
<div id="dc-root"></div>
<script type="text/x-dc-template" id="dc-template">{tpl}</script>
<script type="text/x-dc-logic" id="dc-logic">{logic}</script>
<script>window.DC_PROPS = {json.dumps(props, ensure_ascii=False)};</script>
<script src="dc-lite.js"></script>
</body>
</html>
"""
    open(os.path.join(out_dir, base + '.html'), 'w', encoding='utf-8').write(page)
    b = canvas['boards'][name]
    screens.append({'file': base + '.html', 'png': base + '.png', 'title': b.get('title', title), 'w': b['w'], 'h': b['h'], 'data': DATA.get(base, '')})

cards = '\n'.join(
    f'<a class="card" href="{x["file"]}"><img src="{x["png"]}" alt="{html.escape(x["title"])}" loading="lazy"><span>{html.escape(x["title"])}</span></a>'
    for x in screens)
index = f"""<!doctype html>
<html lang="sr"><head><meta charset="utf-8"><title>Kroj — dizajn ekrana (referenca)</title>
<style>
body{{margin:0;font-family:'IBM Plex Sans',system-ui,sans-serif;background:#F3F1EC;color:#1C1B19}}
header{{background:#1C1B19;color:#F3F1EC;padding:20px 32px}} h1{{margin:0;font-size:24px}} p{{margin:6px 0 0;color:#D8D3C9}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;padding:24px 32px}}
.card{{display:flex;flex-direction:column;gap:8px;text-decoration:none;color:#1C1B19;background:#FFFFFF;border:1px solid #DDD8CE;border-radius:10px;padding:10px}}
.card img{{width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:6px;border:1px solid #EEEAE2}}
.card span{{font-weight:600;font-size:14px}}
</style></head><body>
<header><h1>Kroj — referentni ekrani</h1><p>Klikni ekran da ga otvoriš i isprobaš (radi bez interneta osim fontova). Ovo je izvor istine za izgled i ponašanje.</p></header>
<main>{cards}</main></body></html>"""
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(index)
json.dump(screens, open(os.path.join(out_dir, 'screens.json'), 'w'), ensure_ascii=False, indent=1)
print(len(screens), 'screens')
