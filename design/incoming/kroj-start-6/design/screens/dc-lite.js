/*
 * dc-lite.js — minimal runtime so the exported design screens run as plain HTML.
 * Supports exactly what the Kroj design files use:
 *   {{ dotted.path }} holes in text and attributes, <sc-for list as>, <sc-if value>,
 *   <helmet> (moved to <head>), camelCase event attributes (onClick, onPointerDown, onChange...),
 *   class Component extends DCLogic { constructor, state, setState, forceUpdate, renderVals() }.
 * This is a reference viewer only — the real app is built in React (see CLAUDE.md).
 */
(function () {
  'use strict';
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var RAW = { style: 1, script: 1 };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function decode(s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, function (m, e) {
      var l = e.toLowerCase();
      if (l === 'amp') return '&'; if (l === 'lt') return '<'; if (l === 'gt') return '>';
      if (l === 'quot') return '"'; if (l === 'apos') return "'"; if (l === 'nbsp') return ' ';
      if (l[1] === 'x') return String.fromCodePoint(parseInt(l.slice(2), 16));
      return String.fromCodePoint(parseInt(l.slice(1), 10));
    });
  }

  // ---------- tokenizer / parser (keeps attribute case, no foster-parenting) ----------
  function parse(src) {
    var root = { tag: '#root', attrs: [], children: [] }, stack = [root], i = 0, n = src.length;
    function top() { return stack[stack.length - 1]; }
    while (i < n) {
      var lt = src.indexOf('<', i);
      if (lt < 0) lt = n;
      if (lt > i) { var t = src.slice(i, lt); if (t) top().children.push({ text: t }); i = lt; if (i >= n) break; }
      if (src.startsWith('<!--', i)) { var ce = src.indexOf('-->', i); i = ce < 0 ? n : ce + 3; continue; }
      if (src[i + 1] === '!' || src[i + 1] === '?') { var de = src.indexOf('>', i); i = de < 0 ? n : de + 1; continue; }
      if (src[i + 1] === '/') {
        var ge = src.indexOf('>', i), name = src.slice(i + 2, ge).trim().toLowerCase();
        for (var k = stack.length - 1; k > 0; k--) { if (stack[k].tag.toLowerCase() === name) { stack.length = k; break; } }
        i = ge + 1; continue;
      }
      // open tag
      var j = i + 1, m = /^[A-Za-z][\w:-]*/.exec(src.slice(j));
      if (!m) { top().children.push({ text: '<' }); i++; continue; }
      var tag = m[0]; j += tag.length;
      var attrs = [], selfClose = false;
      while (j < n) {
        while (j < n && /\s/.test(src[j])) j++;
        if (src[j] === '>') { j++; break; }
        if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break; }
        var am = /^[^\s=>\/]+/.exec(src.slice(j));
        if (!am) { j++; continue; }
        var an = am[0]; j += an.length;
        while (j < n && /\s/.test(src[j])) j++;
        var av = '';
        if (src[j] === '=') {
          j++; while (j < n && /\s/.test(src[j])) j++;
          var q = src[j];
          if (q === '"' || q === "'") { var qe = src.indexOf(q, j + 1); av = src.slice(j + 1, qe); j = qe + 1; }
          else { var um = /^[^\s>]+/.exec(src.slice(j)); av = um ? um[0] : ''; j += av.length; }
        }
        attrs.push([an, decode(av)]);
      }
      var node = { tag: tag, attrs: attrs, children: [] };
      top().children.push(node);
      i = j;
      var lower = tag.toLowerCase();
      if (RAW[lower]) {
        var close = src.toLowerCase().indexOf('</' + lower, i);
        node.children.push({ text: src.slice(i, close), raw: true });
        i = src.indexOf('>', close) + 1; continue;
      }
      if (!selfClose && !VOID[lower]) stack.push(node);
    }
    return root;
  }

  // ---------- template evaluation ----------
  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.'), v = scope;
    for (var k = 0; k < parts.length; k++) { if (v == null) return undefined; v = v[parts[k]]; }
    return v;
  }
  var HOLE = /\{\{([^}]*)\}\}/g;
  function interp(str, scope) {
    var whole = /^\s*\{\{([^}]*)\}\}\s*$/.exec(str);
    if (whole) return lookup(scope, whole[1]);
    return str.replace(HOLE, function (_, p) { var v = lookup(scope, p); return v == null ? '' : String(v); });
  }
  function hasHole(s) { return s.indexOf('{{') >= 0; }

  function build(nodes, scope, out, inSvg) {
    for (var k = 0; k < nodes.length; k++) {
      var nd = nodes[k];
      if (nd.text !== undefined) {
        if (nd.raw) { out.push({ text: nd.text }); continue; }
        var txt = decode(nd.text);
        if (hasHole(txt)) { var v = interp(txt, scope); txt = v == null ? '' : String(v); }
        out.push({ text: txt });
        continue;
      }
      var tl = nd.tag.toLowerCase();
      if (tl === 'helmet') continue;
      if (tl === 'sc-for') {
        var listA = attr(nd, 'list'), as = attr(nd, 'as') || 'item';
        var list = listA ? interp(listA, scope) : [];
        (list || []).forEach(function (it, idx) {
          var sc = Object.create(scope); sc[as] = it; sc.$index = idx;
          build(nd.children, sc, out, inSvg);
        });
        continue;
      }
      if (tl === 'sc-if') {
        var cond = interp(attr(nd, 'value') || '', scope);
        if (cond) build(nd.children, scope, out, inSvg);
        continue;
      }
      var svg = inSvg || tl === 'svg';
      var v = { tag: nd.tag, svg: svg, attrs: {}, events: {}, props: {}, children: [] };
      nd.attrs.forEach(function (a) {
        var name = a[0], raw = a[1];
        if (/^hint-/.test(name) || name === 'data-dc-script') return;
        var val = hasHole(raw) ? interp(raw, scope) : raw;
        if (/^on[A-Z]/.test(name)) { if (typeof val === 'function') v.events[name] = val; return; }
        v.attrs[name] = val;
      });
      build(nd.children, scope, v.children, svg && tl !== 'foreignobject');
      out.push(v);
    }
    return out;
  }
  function attr(nd, name) { for (var k = 0; k < nd.attrs.length; k++) if (nd.attrs[k][0] === name) return nd.attrs[k][1]; return null; }

  // ---------- DOM patching (positional, keeps focus in inputs) ----------
  var EVT = { onClick: 'click', onDoubleClick: 'dblclick', onPointerDown: 'pointerdown', onPointerMove: 'pointermove', onPointerUp: 'pointerup',
    onPointerEnter: 'pointerenter', onPointerLeave: 'pointerleave', onDragStart: 'dragstart', onDragEnd: 'dragend', onDragOver: 'dragover',
    onDragLeave: 'dragleave', onDrop: 'drop', onBlur: 'blur', onFocus: 'focus', onKeyDown: 'keydown', onKeyUp: 'keyup', onWheel: 'wheel',
    onSubmit: 'submit', onInput: 'input', onMouseEnter: 'mouseenter', onMouseLeave: 'mouseleave' };
  function evName(el, name) {
    if (name === 'onChange') {
      var t = (el.getAttribute('type') || '').toLowerCase(), tg = el.tagName.toLowerCase();
      return (tg === 'select' || t === 'checkbox' || t === 'radio') ? 'change' : 'input';
    }
    return EVT[name] || name.slice(2).toLowerCase();
  }
  function setAttrs(el, v) {
    var prev = el.__attrs || {}, next = {};
    Object.keys(v.attrs).forEach(function (name) {
      var val = v.attrs[name], lname = name.toLowerCase();
      if (lname === 'checked' || lname === 'selected' || lname === 'disabled' || lname === 'readonly') {
        var b = !(val === false || val === 'false' || val == null) && val !== undefined;
        if (lname === 'readonly') { el.readOnly = b; } else { el[lname] = b; }
        if (b) el.setAttribute(lname, ''); else el.removeAttribute(lname);
        next[name] = 1; return;
      }
      if (lname === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        var sv = val == null ? '' : String(val); if (el.value !== sv) el.value = sv; next[name] = 1; return;
      }
      var an = v.svg ? name : (lname === 'classname' ? 'class' : lname === 'htmlfor' ? 'for' : lname === 'inputmode' ? 'inputmode' : name);
      if (val === false || val == null) { el.removeAttribute(an); return; }
      var s = val === true ? '' : String(val);
      if (el.getAttribute(an) !== s) el.setAttribute(an, s);
      next[name] = an;
    });
    Object.keys(prev).forEach(function (name) { if (!(name in next) && typeof prev[name] === 'string') el.removeAttribute(prev[name]); });
    el.__attrs = next;
    // events
    el.__h = el.__h || {};
    var seen = {};
    Object.keys(v.events).forEach(function (name) {
      var ev = evName(el, name); seen[ev] = 1;
      if (!el.__h[ev]) { el.addEventListener(ev, function (e) { var f = el.__h[ev]; if (f) f(e); }, ev === 'wheel' ? { passive: true } : false); }
      el.__h[ev] = v.events[name];
    });
    Object.keys(el.__h).forEach(function (ev) { if (!seen[ev]) el.__h[ev] = null; });
  }
  function create(v) {
    if (v.text !== undefined) return document.createTextNode(v.text);
    var el = v.svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
    setAttrs(el, v);
    patchChildren(el, v.children);
    return el;
  }
  function patchChildren(parent, vs) {
    var kids = parent.childNodes;
    for (var k = 0; k < vs.length; k++) {
      var v = vs[k], cur = kids[k];
      if (!cur) { parent.appendChild(create(v)); continue; }
      if (v.text !== undefined) {
        if (cur.nodeType === 3) { if (cur.data !== v.text) cur.data = v.text; }
        else parent.replaceChild(create(v), cur);
        continue;
      }
      var same = cur.nodeType === 1 && cur.tagName.toLowerCase() === v.tag.toLowerCase() && (!!v.svg === (cur.namespaceURI === SVG_NS));
      if (!same) { parent.replaceChild(create(v), cur); continue; }
      setAttrs(cur, v);
      patchChildren(cur, v.children);
    }
    while (kids.length > vs.length) parent.removeChild(parent.lastChild);
  }

  // ---------- component ----------
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch, cb) {
    if (typeof patch === 'function') patch = patch(this.state, this.props);
    this.state = Object.assign({}, this.state, patch || {});
    this.__render(); if (cb) cb();
  };
  DCLogic.prototype.forceUpdate = function () { this.__render(); };
  window.DCLogic = DCLogic;

  function boot() {
    var tplSrc = document.getElementById('dc-template').textContent;
    var logicSrc = document.getElementById('dc-logic').textContent;
    var props = window.DC_PROPS || {};
    var tree = parse(tplSrc);
    // helmet -> head
    (function hoist(nodes) {
      nodes.forEach(function (nd) {
        if (!nd.tag) return;
        if (nd.tag.toLowerCase() === 'helmet') {
          nd.children.forEach(function (c) {
            if (!c.tag) return;
            var t = c.tag.toLowerCase(), el = document.createElement(t);
            c.attrs.forEach(function (a) { el.setAttribute(a[0], a[1]); });
            if (t === 'style') el.textContent = (c.children[0] && c.children[0].text) || '';
            document.head.appendChild(el);
          });
        } else hoist(nd.children);
      });
    })(tree.children);
    var Component = new Function('DCLogic', logicSrc + '\n;return Component;')(DCLogic);
    var inst = new Component(props);
    if (!inst.state) inst.state = {};
    var mount = document.getElementById('dc-root');
    inst.__render = function () {
      var vals = inst.renderVals ? inst.renderVals() : {};
      var scope = Object.assign({}, vals);
      patchChildren(mount, build(tree.children, scope, [], false));
    };
    inst.__render();
    if (inst.componentDidMount) inst.componentDidMount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
