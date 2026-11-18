"""Measure every exported screen: layout map per screen (regions, sizes, key styles) + design-token usage across all screens.
Usage: python3 inspect_screens.py <screens dir> [chrome path]
Writes <Name>.layout.json next to each screen and tokens-usage.json.
"""
import sys, os, json, collections
from playwright.sync_api import sync_playwright

d = os.path.abspath(sys.argv[1]); chrome = sys.argv[2] if len(sys.argv) > 2 else None
screens = json.load(open(os.path.join(d, 'screens.json')))
JS = r"""
() => {
  const root = document.getElementById('dc-root');
  const out = [];
  const stats = {color:{}, bg:{}, border:{}, fs:{}, fw:{}, radius:{}, ff:{}, shadow:{}, gap:{}, pad:{}};
  const inc = (m,k)=>{ if(!k) return; m[k]=(m[k]||0)+1; };
  function rgbToHex(c){ const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); if(!m) return c; if(m[4]!==undefined && parseFloat(m[4])===0) return null; const h='#'+[1,2,3].map(i=>(+m[i]).toString(16).padStart(2,'0')).join('').toUpperCase(); return m[4]!==undefined && parseFloat(m[4])<1 ? h+'@'+m[4] : h; }
  function label(el){ const t=(el.getAttribute('aria-label')||el.innerText||'').trim().replace(/\s+/g,' '); return t.slice(0,60); }
  function walk(el, depth){
    if (el.nodeType!==1) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (cs.display==='none' || r.width===0 && r.height===0) return;
    if (!(el.closest('svg') && el.tagName.toLowerCase()!=='svg')) {
      inc(stats.color, rgbToHex(cs.color)); inc(stats.bg, rgbToHex(cs.backgroundColor));
      if (parseFloat(cs.borderTopWidth)>0) inc(stats.border, cs.borderTopWidth+' '+cs.borderTopStyle+' '+rgbToHex(cs.borderTopColor));
      if (el.childNodes.length && [...el.childNodes].some(n=>n.nodeType===3 && n.data.trim())) { inc(stats.fs, cs.fontSize); inc(stats.fw, cs.fontWeight); inc(stats.ff, cs.fontFamily.split(',')[0].replace(/['"]/g,'')); }
      if (cs.borderTopLeftRadius!=='0px') inc(stats.radius, cs.borderTopLeftRadius);
      if (cs.boxShadow!=='none') inc(stats.shadow, cs.boxShadow);
      if (cs.gap && cs.gap!=='normal') inc(stats.gap, cs.gap);
      if (cs.padding!=='0px') inc(stats.pad, cs.padding);
    }
    const tag = el.tagName.toLowerCase();
    if (depth <= 7 && tag!=='svg' && !el.closest('svg') && !['span','b','i','path','option'].includes(tag)) {
      const big = r.width>=120 && r.height>=28;
      const ctl = ['button','input','select','a','label','table','th','h1','h2','h3','aside','main','header','nav','section'].includes(tag);
      if (big || ctl) out.push({depth, tag, cls: el.getAttribute('class')||undefined, aria: el.getAttribute('aria-label')||undefined,
        text: label(el), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        style: {display: cs.display, flex: cs.flex!=='0 1 auto'?cs.flex:undefined, dir: cs.display.includes('flex')?cs.flexDirection:undefined,
          gap: cs.gap!=='normal'?cs.gap:undefined, pad: cs.padding!=='0px'?cs.padding:undefined, bg: rgbToHex(cs.backgroundColor)||undefined,
          border: parseFloat(cs.borderTopWidth)>0? cs.borderTopWidth+' '+rgbToHex(cs.borderTopColor):undefined, radius: cs.borderTopLeftRadius!=='0px'?cs.borderTopLeftRadius:undefined,
          font: cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily.split(',')[0].replace(/['"]/g,''), color: rgbToHex(cs.color), overflow: cs.overflowY!=='visible'?cs.overflowY:undefined}});
    }
    if (tag==='svg') return;
    for (const c of el.children) walk(c, depth+1);
  }
  walk(root, 0);
  return {layout: out, stats};
}
"""
agg = collections.defaultdict(collections.Counter)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch()
    for sc in screens:
        pg = br.new_page(viewport={'width': sc['w'], 'height': min(sc['h'], 1000)})
        pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg.goto('file://' + os.path.join(d, sc['file']), wait_until='load', timeout=15000)
        pg.add_style_tag(url='file://' + os.path.join(d, 'fonts-test.css')); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(150)
        pg.wait_for_timeout(200)
        res = pg.evaluate(JS)
        json.dump({'screen': sc['file'], 'viewport': [sc['w'], min(sc['h'], 1000)], 'note': 'x,y,w,h u px pri datom viewport-u; depth = dubina u DOM-u od korena ekrana', 'layout': res['layout']},
                  open(os.path.join(d, sc['file'].replace('.html', '.layout.json')), 'w'), ensure_ascii=False, indent=0)
        for k, m in res['stats'].items():
            agg[k].update(m)
        pg.close()
        print(sc['file'], len(res['layout']))
    br.close()
json.dump({k: dict(v.most_common(40)) for k, v in agg.items()}, open(os.path.join(d, 'tokens-usage.json'), 'w'), ensure_ascii=False, indent=1)
