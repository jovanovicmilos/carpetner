"""Export the Claude Design artboards (.dc.html) to standalone HTML screens that run with dc-lite.js.
Usage: python3 export_screens.py <dir with *.dc.html and canvas.json> <out dir>
"""
import sys, os, re, json, html

src_dir, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
canvas = json.load(open(os.path.join(src_dir, 'canvas.json')))
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
    screens.append({'file': base + '.html', 'png': base + '.png', 'title': b.get('title', title), 'w': b['w'], 'h': b['h']})

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
