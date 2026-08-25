/* ==========================================================================
   A SMALL, STRICT DOM

   The panel's only runtime coverage was `harness.mjs`, which loads a chunk
   against stubs and asks whether it registered its modules. That is the
   contract the lazy split depends on, and it is real coverage, but it stops
   exactly where the bugs have actually been: every panel defect found in the
   last month was found by a person opening a browser and looking.

     - one of nine player dropdowns was filtered; the other eight offered the
       whole club. The suite asserted `offer()` existed.
     - the field hints attached to nothing for weeks, because the wiring
       looked for the wrong class. The suite asserted the wiring existed.
     - the panel title read "Fixtures 0", because it took the nav button's
       textContent and the button holds a hidden count badge.

   Every one of those is invisible to static analysis and obvious to anything
   that can render the markup and then ask a question about it. So: render it.

   WHY NOT jsdom. The project has one devDependency and the deploy installs
   it. A DOM big enough for this panel is a few hundred lines, and writing it
   means the failure mode is understood rather than imported.

   THE ONE RULE. `harness.mjs` says a half-built DOM that answers wrongly is
   worse than one that is absent, and that is still true - it is the whole
   reason rendering was not attempted before. So nothing here guesses. Every
   unsupported selector, every unimplemented API and every construct whose
   behaviour would differ from a browser's THROWS, loudly, naming itself.
   A test that cannot run is a test that gets fixed; a test that passes on a
   wrong answer is a lie that outlives everyone who could catch it.
   ========================================================================== */

/* Elements that never have children, so a parser must not look for a close
   tag it will never find. */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

/* Elements whose content is text, not markup: `<script>if (a<b)` must not
   open an element called `b`. */
const RAW = new Set(['script', 'style', 'textarea', 'title']);

/* Elements a browser closes for you when a sibling of the same kind opens.
   The panel writes well-formed markup, but `<option>` and `<td>` unclosed are
   common enough in hand-written template strings that guessing wrong here
   would silently reshape a table. */
const AUTO_CLOSE = {
  li: ['li'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  p: ['p'],
  option: ['option'],
  optgroup: ['optgroup', 'option'],
  tr: ['tr', 'td', 'th'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  thead: ['thead', 'tbody', 'tfoot'],
  tbody: ['thead', 'tbody', 'tfoot'],
  tfoot: ['thead', 'tbody', 'tfoot'],
};

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  middot: '·', ndash: '–', mdash: '—', hellip: '…',
  times: '×', rsquo: '’', lsquo: '‘', pound: '£',
};

function decode(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
    if (body[0] === '#') {
      const n = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : m;
  });
}

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

class DomError extends Error {
  constructor(msg) { super(msg); this.name = 'DomError'; }
}
const nope = (what) => { throw new DomError(what + ' is not implemented by src/test/dom.mjs. Add it deliberately, with a browser checked against it - do not stub it.'); };

/* ---- Nodes ------------------------------------------------------------- */

class Node {
  constructor() { this.parentNode = null; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  remove() {
    if (!this.parentNode) return;
    const i = this.parentNode.childNodes.indexOf(this);
    if (i >= 0) this.parentNode.childNodes.splice(i, 1);
    this.parentNode = null;
  }
}

class TextNode extends Node {
  constructor(data) { super(); this.nodeType = 3; this.data = String(data); }
  get textContent() { return this.data; }
  set textContent(v) { this.data = String(v); }
  get outerHTML() { return escText(this.data); }
  cloneNode() { return new TextNode(this.data); }
}

class CommentNode extends Node {
  constructor(data) { super(); this.nodeType = 8; this.data = String(data); }
  get textContent() { return ''; }
  get outerHTML() { return '<!--' + this.data + '-->'; }
  cloneNode() { return new CommentNode(this.data); }
}

class ClassList {
  constructor(el) { this.el = el; }
  _list() { return (this.el.getAttribute('class') || '').split(/\s+/).filter(Boolean); }
  _write(a) { this.el.setAttribute('class', a.join(' ')); }
  contains(c) { return this._list().indexOf(c) >= 0; }
  add(...cs) { const a = this._list(); cs.forEach((c) => { if (a.indexOf(c) < 0) a.push(c); }); this._write(a); }
  remove(...cs) { this._write(this._list().filter((c) => cs.indexOf(c) < 0)); }
  toggle(c, force) {
    const has = this.contains(c);
    const on = force === undefined ? !has : !!force;
    if (on) this.add(c); else this.remove(c);
    return on;
  }
  get length() { return this._list().length; }
  toString() { return this._list().join(' '); }
}

/* A style object that records what was set and serialises back to the
   attribute. Reading a value the page never set returns '' exactly as a
   browser does for an inline style; anything needing COMPUTED style is a
   layout question this DOM cannot answer and says so. */
class Style {
  constructor(el) {
    Object.defineProperty(this, '_el', { value: el, enumerable: false });
    Object.defineProperty(this, '_p', { value: new Map(), enumerable: false });
    const raw = el.getAttribute('style') || '';
    raw.split(';').forEach((d) => {
      const i = d.indexOf(':');
      if (i > 0) this._p.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    });
    return new Proxy(this, {
      get(t, k) {
        if (typeof k !== 'string') return undefined;
        if (k === 'setProperty') return (n, v) => { t._p.set(n, String(v)); t._flush(); };
        if (k === 'removeProperty') return (n) => { t._p.delete(n); t._flush(); };
        if (k === 'getPropertyValue') return (n) => t._p.get(n) || '';
        if (k === 'cssText') return t._text();
        if (k in t) return t[k];
        return t._p.get(dash(k)) || '';
      },
      set(t, k, v) {
        if (k === 'cssText') {
          t._p.clear();
          String(v).split(';').forEach((d) => {
            const i = d.indexOf(':');
            if (i > 0) t._p.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
          });
        } else t._p.set(dash(k), String(v));
        t._flush();
        return true;
      },
    });
  }
  _text() { return [...this._p].map(([k, v]) => k + ':' + v).join(';'); }
  _flush() {
    const t = this._text();
    if (t) this._el.setAttribute('style', t); else this._el.removeAttribute('style');
  }
}
const dash = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

let uid = 0;

class Element extends Node {
  constructor(tag, doc) {
    super();
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.localName = String(tag).toLowerCase();
    this.ownerDocument = doc;
    this.attributes = new Map();
    this.childNodes = [];
    this._listeners = new Map();
    this._uid = ++uid;
    this._props = {};
  }

  /* ---- attributes ---- */
  getAttribute(n) { const v = this.attributes.get(String(n).toLowerCase()); return v === undefined ? null : v; }
  setAttribute(n, v) { this.attributes.set(String(n).toLowerCase(), String(v)); }
  removeAttribute(n) { this.attributes.delete(String(n).toLowerCase()); }
  hasAttribute(n) { return this.attributes.has(String(n).toLowerCase()); }
  getAttributeNames() { return [...this.attributes.keys()]; }

  get id() { return this.getAttribute('id') || ''; }
  set id(v) { this.setAttribute('id', v); }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { this.setAttribute('class', v); }
  get classList() { if (!this._cl) this._cl = new ClassList(this); return this._cl; }
  get style() { if (!this._st) this._st = new Style(this); return this._st; }
  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(v) { if (v) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { if (v) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
  get href() { return this.getAttribute('href') || ''; }
  set href(v) { this.setAttribute('href', v); }
  /* REFLECTED, not a plain property. The shell loads a chunk with
     `s.src = '/control-match.js'`, and an Element that let that land as an
     ordinary JS property would look identical from JavaScript while being
     invisible to `getAttribute('src')` and to every selector. That is exactly
     the class of difference this DOM exists to refuse. */
  get src() { return this.getAttribute('src') || ''; }
  set src(v) { this.setAttribute('src', v); }
  get alt() { return this.getAttribute('alt') || ''; }
  set alt(v) { this.setAttribute('alt', v); }
  get title() { return this.getAttribute('title') || ''; }
  set title(v) { this.setAttribute('title', v); }
  get placeholder() { return this.getAttribute('placeholder') || ''; }
  set placeholder(v) { this.setAttribute('placeholder', v); }
  get type() { return (this.getAttribute('type') || (this.localName === 'button' ? 'submit' : 'text')).toLowerCase(); }
  set type(v) { this.setAttribute('type', v); }
  get name() { return this.getAttribute('name') || ''; }
  get dataset() {
    const el = this;
    return new Proxy({}, {
      get(t, k) { return el.getAttribute('data-' + dash(String(k))) ?? undefined; },
      set(t, k, v) { el.setAttribute('data-' + dash(String(k)), v); return true; },
      has(t, k) { return el.hasAttribute('data-' + dash(String(k))); },
      ownKeys() { return el.getAttributeNames().filter((a) => a.startsWith('data-')).map((a) => a.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase())); },
      getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
    });
  }

  /* ---- form state ----
     `value` is a PROPERTY, not the attribute, once anything has set it. That
     is the difference that matters for a panel: a form filled in and then
     read back must return what was typed, not what was rendered. */
  get value() {
    if (this.localName === 'select') {
      const sel = this._selected();
      return sel ? (sel.hasAttribute('value') ? sel.getAttribute('value') : sel.textContent) : '';
    }
    if (this.localName === 'textarea') {
      return '_value' in this._props ? this._props._value : this.textContent;
    }
    if ('_value' in this._props) return this._props._value;
    return this.getAttribute('value') || '';
  }
  set value(v) {
    if (this.localName === 'select') {
      const opts = this.querySelectorAll('option');
      let hit = false;
      opts.forEach((o) => {
        const ov = o.hasAttribute('value') ? o.getAttribute('value') : o.textContent;
        if (!hit && ov === String(v)) { o.setAttribute('selected', ''); hit = true; } else o.removeAttribute('selected');
      });
      /* A browser silently selects nothing when the value is not an option,
         and that silence is how a stale pick becomes an empty save. */
      this._props._unmatched = hit ? null : String(v);
      return;
    }
    this._props._value = String(v);
  }
  _selected() {
    const opts = this.querySelectorAll('option');
    return opts.find((o) => o.hasAttribute('selected')) || opts[0] || null;
  }
  get selectedIndex() { const o = this.querySelectorAll('option'); return o.indexOf(this._selected()); }
  get options() { return this.querySelectorAll('option'); }
  get checked() { return '_checked' in this._props ? this._props._checked : this.hasAttribute('checked'); }
  set checked(v) { this._props._checked = !!v; }
  get files() { return this._props._files || []; }
  set files(v) { this._props._files = v; }
  get selected() { return this.hasAttribute('selected'); }

  checkValidity() {
    if (this.localName === 'form') return this.querySelectorAll('input,select,textarea').every((e) => e.checkValidity());
    if (this.hasAttribute('required') && !String(this.value).trim() && !this.checked) return false;
    const p = this.getAttribute('pattern');
    if (p && this.value && !new RegExp('^(?:' + p + ')$').test(this.value)) return false;
    return true;
  }
  reportValidity() { return this.checkValidity(); }
  setCustomValidity() { /* a message store with no UI to show it */ }

  /* ---- tree ---- */
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get firstElementChild() { return this.children[0] || null; }
  get lastElementChild() { const c = this.children; return c[c.length - 1] || null; }
  get firstChild() { return this.childNodes[0] || null; }
  _sib(step) {
    if (!this.parentNode) return null;
    const c = this.parentNode.children;
    return c[c.indexOf(this) + step] || null;
  }
  get nextElementSibling() { return this._sib(1); }
  get previousElementSibling() { return this._sib(-1); }

  appendChild(n) {
    if (n instanceof DocumentFragment) { [...n.childNodes].forEach((c) => this.appendChild(c)); return n; }
    n.remove(); n.parentNode = this; this.childNodes.push(n); return n;
  }
  append(...ns) { ns.forEach((n) => this.appendChild(typeof n === 'string' ? new TextNode(n) : n)); }
  prepend(...ns) { ns.reverse().forEach((n) => this.insertBefore(typeof n === 'string' ? new TextNode(n) : n, this.firstChild)); }
  insertBefore(n, ref) {
    if (!ref) return this.appendChild(n);
    const i = this.childNodes.indexOf(ref);
    if (i < 0) throw new DomError('insertBefore: reference node is not a child');
    n.remove(); n.parentNode = this; this.childNodes.splice(i, 0, n); return n;
  }
  removeChild(n) {
    const i = this.childNodes.indexOf(n);
    if (i < 0) throw new DomError('removeChild: node is not a child');
    this.childNodes.splice(i, 1); n.parentNode = null; return n;
  }
  replaceChild(fresh, old) {
    const i = this.childNodes.indexOf(old);
    if (i < 0) throw new DomError('replaceChild: node is not a child');
    fresh.remove(); fresh.parentNode = this; this.childNodes[i] = fresh; old.parentNode = null; return old;
  }
  replaceWith(n) { if (this.parentNode) this.parentNode.replaceChild(n, this); }
  after(n) {
    if (!this.parentNode) return;
    const i = this.parentNode.childNodes.indexOf(this);
    n.remove(); n.parentNode = this.parentNode; this.parentNode.childNodes.splice(i + 1, 0, n);
  }
  before(n) { if (this.parentNode) this.parentNode.insertBefore(n, this); }
  contains(n) { for (let p = n; p; p = p.parentNode) if (p === this) return true; return false; }

  /* cloneNode(false) is what render() leans on: keep the element and its
     attributes, take nothing else - listeners above all. Getting this wrong
     is the bug it was written to fix. */
  cloneNode(deep) {
    const el = new Element(this.localName, this.ownerDocument);
    this.attributes.forEach((v, k) => el.attributes.set(k, v));
    Object.assign(el._props, this._props);
    if (deep) this.childNodes.forEach((c) => el.appendChild(c.cloneNode(true)));
    return el;
  }

  /* ---- serialisation ---- */
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  set textContent(v) {
    this.childNodes.forEach((n) => { n.parentNode = null; });
    this.childNodes = [];
    if (v !== '' && v != null) this.appendChild(new TextNode(v));
  }
  get innerText() { return this.textContent; }
  get innerHTML() {
    if (RAW.has(this.localName)) return this.childNodes.map((n) => (n.nodeType === 3 ? n.data : n.outerHTML)).join('');
    return this.childNodes.map((n) => n.outerHTML).join('');
  }
  set innerHTML(html) {
    this.childNodes.forEach((n) => { n.parentNode = null; });
    this.childNodes = [];
    parseInto(String(html), this, this.ownerDocument);
  }
  get outerHTML() {
    const attrs = [...this.attributes].map(([k, v]) => (v === '' ? ' ' + k : ' ' + k + '="' + escAttr(v) + '"')).join('');
    if (VOID.has(this.localName)) return '<' + this.localName + attrs + '>';
    return '<' + this.localName + attrs + '>' + this.innerHTML + '</' + this.localName + '>';
  }
  insertAdjacentHTML(pos, html) {
    const frag = this.ownerDocument.createElement('template');
    parseInto(String(html), frag, this.ownerDocument);
    const kids = [...frag.childNodes];
    if (pos === 'beforeend') kids.forEach((k) => this.appendChild(k));
    else if (pos === 'afterbegin') kids.reverse().forEach((k) => this.insertBefore(k, this.firstChild));
    else if (pos === 'beforebegin') kids.forEach((k) => this.before(k));
    else if (pos === 'afterend') kids.reverse().forEach((k) => this.after(k));
    else throw new DomError('insertAdjacentHTML: unknown position ' + pos);
  }

  /* ---- selectors ---- */
  querySelector(sel) { return firstMatch(this, compile(sel)); }
  querySelectorAll(sel) { const out = []; collect(this, compile(sel), out); return out; }
  matches(sel) { return compile(sel).some((c) => matchChain(this, c)); }
  closest(sel) {
    const c = compile(sel);
    for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (c.some((x) => matchChain(n, x))) return n;
    return null;
  }

  /* ---- events ----
     Capture is implemented, not stubbed, because the panel depends on it and
     depends on it for the right reason: the draft saver and the validity
     marker listen on `document` in the CAPTURE phase, so they see an `input`
     from a field inside a modal that is not in the panel body and would never
     bubble to them. A DOM that quietly dropped capture listeners would have
     reported the drafts working while nothing was ever stored. */
  addEventListener(t, fn, opts) {
    const cap = opts === true || !!(opts && opts.capture);
    const key = (cap ? '!' : '') + t;
    if (!this._listeners.has(key)) this._listeners.set(key, []);
    this._listeners.get(key).push(fn);
  }
  removeEventListener(t, fn, opts) {
    const cap = opts === true || !!(opts && opts.capture);
    const a = this._listeners.get((cap ? '!' : '') + t);
    if (!a) return;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  dispatchEvent(ev) {
    ev.target = ev.target || this;
    const path = [];
    for (let n = this; n; n = n.parentNode) path.push(n);

    const fire = (n, key) => {
      const a = n._listeners && n._listeners.get(key);
      if (!a || !a.length) return;
      ev.currentTarget = n;
      [...a].forEach((fn) => fn.call(n, ev));
    };

    /* Capture: root first, down to (but not including) the target. */
    ev.eventPhase = 1;
    for (let i = path.length - 1; i >= 1; i -= 1) {
      if (ev._stopped) break;
      fire(path[i], '!' + ev.type);
    }
    /* At the target both phases run, capture listeners first. */
    if (!ev._stopped) { ev.eventPhase = 2; fire(this, '!' + ev.type); }
    if (!ev._stopped) fire(this, ev.type);
    /* Bubble: up from the target's parent, only if the event bubbles. */
    if (ev.bubbles) {
      ev.eventPhase = 3;
      for (let i = 1; i < path.length; i += 1) {
        if (ev._stopped) break;
        fire(path[i], ev.type);
      }
    }
    ev.eventPhase = 0;
    return !ev.defaultPrevented;
  }
  click() { return this.dispatchEvent(new DomEvent('click', { bubbles: true })); }
  focus() { this.ownerDocument.activeElement = this; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body; }
  scrollIntoView() { /* no viewport; harmless and never asserted on */ }

  /* Layout is the one thing a DOM without a renderer genuinely cannot know.
     Returning zeroes would let a test "pass" on a measurement that is not a
     measurement, so it refuses. */
  getBoundingClientRect() { nope('getBoundingClientRect (this DOM has no layout)'); }
  get offsetWidth() { return nope('offsetWidth (this DOM has no layout)'); }
  get offsetHeight() { return nope('offsetHeight (this DOM has no layout)'); }
}

class DocumentFragment extends Element {
  constructor(doc) { super('#fragment', doc); this.nodeType = 11; }
}

export class DomEvent {
  constructor(type, opts = {}) {
    this.type = type;
    this.bubbles = !!opts.bubbles;
    this.defaultPrevented = false;
    this._stopped = false;
    this.target = null;
    this.currentTarget = null;
    Object.keys(opts).forEach((k) => { if (k !== 'bubbles') this[k] = opts[k]; });
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this._stopped = true; }
  stopImmediatePropagation() { this._stopped = true; }
}

/* ---- Selector engine ---------------------------------------------------
   A deliberately small subset: tag, *, #id, .class, [attr], [attr="v"],
   [attr^="v"], [attr*="v"], :not(simple), :checked, :disabled, plus the
   descendant and child combinators and comma groups. Anything else throws,
   because the alternative is a selector that quietly matches nothing and a
   test that quietly passes. */
const selCache = new Map();
const SIMPLE = /^(?:([a-zA-Z][\w-]*|\*))?((?:[#.][\w-]+|\[[^\]]+\]|:(?:not\([^)]+\)|checked|disabled|required))*)$/;

function compile(sel) {
  const key = String(sel);
  if (selCache.has(key)) return selCache.get(key);
  const groups = splitTop(key, ',').map((g) => {
    const parts = g.trim().split(/\s*(>)\s*|\s+/).filter((x) => x !== undefined && x !== '');
    const chain = [];
    let comb = null;
    parts.forEach((p) => {
      if (p === '>') { comb = 'child'; return; }
      chain.push({ test: simple(p, key), comb });
      comb = 'descendant';
    });
    if (!chain.length) throw new DomError('Empty selector: ' + key);
    return chain;
  });
  selCache.set(key, groups);
  return groups;
}

function splitTop(s, ch) {
  const out = []; let depth = 0; let cur = '';
  for (const c of s) {
    if (c === '[' || c === '(') depth += 1;
    if (c === ']' || c === ')') depth -= 1;
    if (c === ch && depth === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

function simple(part, whole) {
  const m = SIMPLE.exec(part);
  if (!m) throw new DomError('Unsupported selector "' + part + '" in "' + whole + '". src/test/dom.mjs supports tag, #id, .class, [attr], [attr="v"], [attr^="v"], [attr*="v"], :not(), :checked, :disabled, > and descendant. Add what you need rather than working around it.');
  const tag = m[1] && m[1] !== '*' ? m[1].toLowerCase() : null;
  const tests = [];
  if (tag) tests.push((el) => el.localName === tag);
  const rest = m[2] || '';
  const re = /([#.])([\w-]+)|\[([^\]]+)\]|:(not\(([^)]+)\)|checked|disabled|required)/g;
  let t;
  while ((t = re.exec(rest))) {
    if (t[1] === '#') { const v = t[2]; tests.push((el) => el.getAttribute('id') === v); }
    else if (t[1] === '.') { const v = t[2]; tests.push((el) => el.classList.contains(v)); }
    else if (t[3]) {
      const a = /^([\w-]+)(?:([~^*$|]?=)\s*"?([^"\]]*)"?)?$/.exec(t[3].trim());
      if (!a) throw new DomError('Unsupported attribute selector "[' + t[3] + ']" in "' + whole + '"');
      const nm = a[1].toLowerCase(); const op = a[2]; const val = a[3];
      if (!op) tests.push((el) => el.hasAttribute(nm));
      else if (op === '=') tests.push((el) => el.getAttribute(nm) === val);
      else if (op === '^=') tests.push((el) => (el.getAttribute(nm) || '').startsWith(val));
      else if (op === '*=') tests.push((el) => (el.getAttribute(nm) || '').includes(val));
      else if (op === '$=') tests.push((el) => (el.getAttribute(nm) || '').endsWith(val));
      else if (op === '~=') tests.push((el) => (el.getAttribute(nm) || '').split(/\s+/).includes(val));
      else throw new DomError('Unsupported attribute operator "' + op + '" in "' + whole + '"');
    } else if (t[4]) {
      if (t[5] !== undefined) { const inner = compile(t[5]); tests.push((el) => !inner.some((c) => matchChain(el, c))); }
      else if (t[4] === 'checked') tests.push((el) => !!el.checked);
      else if (t[4] === 'disabled') tests.push((el) => !!el.disabled);
      else if (t[4] === 'required') tests.push((el) => el.hasAttribute('required'));
    }
  }
  return (el) => tests.every((fn) => fn(el));
}

function matchChain(el, chain) {
  let i = chain.length - 1;
  if (!chain[i].test(el)) return false;
  let node = el;
  i -= 1;
  while (i >= 0) {
    const want = chain[i];
    const comb = chain[i + 1].comb;
    if (comb === 'child') {
      node = node.parentNode;
      if (!node || node.nodeType !== 1 || !want.test(node)) return false;
    } else {
      let p = node.parentNode; let hit = null;
      while (p && p.nodeType === 1) { if (want.test(p)) { hit = p; break; } p = p.parentNode; }
      if (!hit) return false;
      node = hit;
    }
    i -= 1;
  }
  return true;
}

function collect(root, groups, out) {
  root.children.forEach((el) => {
    if (groups.some((c) => matchChain(el, c))) out.push(el);
    collect(el, groups, out);
  });
}
function firstMatch(root, groups) {
  for (const el of root.children) {
    if (groups.some((c) => matchChain(el, c))) return el;
    const d = firstMatch(el, groups);
    if (d) return d;
  }
  return null;
}

/* ---- Parser ------------------------------------------------------------ */

function parseInto(html, root, doc) {
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { pushText(top(), html.slice(i)); break; }
    if (lt > i) pushText(top(), html.slice(i, lt));

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      const stop = end < 0 ? html.length : end + 3;
      top().appendChild(new CommentNode(html.slice(lt + 4, end < 0 ? html.length : end)));
      i = stop; continue;
    }
    if (html.startsWith('<!', lt)) { const end = html.indexOf('>', lt); i = end < 0 ? html.length : end + 1; continue; }

    if (html.startsWith('</', lt)) {
      const end = html.indexOf('>', lt);
      if (end < 0) { pushText(top(), html.slice(lt)); break; }
      const name = html.slice(lt + 2, end).trim().toLowerCase();
      for (let s = stack.length - 1; s > 0; s -= 1) {
        if (stack[s].localName === name) { stack.length = s; break; }
      }
      i = end + 1; continue;
    }

    const tm = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt));
    if (!tm) { pushText(top(), '<'); i = lt + 1; continue; }
    const name = tm[1].toLowerCase();
    let j = lt + tm[0].length;
    const el = doc.createElement(name);
    /* attributes */
    for (;;) {
      while (j < html.length && /\s/.test(html[j])) j += 1;
      if (j >= html.length) break;
      if (html[j] === '>') { j += 1; break; }
      if (html[j] === '/' && html[j + 1] === '>') { j += 2; break; }
      const am = /^([^\s=/>]+)(\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]*)))?/.exec(html.slice(j));
      if (!am) { j += 1; continue; }
      const val = am[4] !== undefined ? am[4] : am[5] !== undefined ? am[5] : am[6] !== undefined ? am[6] : '';
      el.setAttribute(am[1], decode(val));
      j += am[0].length;
    }

    /* A browser inserts a tbody around a bare <tr>, so `tbody tr` matches
       there and would not match here. Rather than guess in either direction,
       refuse: it is a real difference and the markup should say what it means. */
    if (name === 'tr' && top().localName === 'table') {
      throw new DomError('<tr> directly inside <table>: a browser inserts an implicit <tbody> here and this DOM does not. Write the <tbody> so both agree.');
    }

    const closes = AUTO_CLOSE[name];
    if (closes && closes.indexOf(top().localName) >= 0) stack.pop();

    top().appendChild(el);
    i = j;

    if (VOID.has(name)) continue;
    if (RAW.has(name)) {
      const close = '</' + name;
      const end = html.toLowerCase().indexOf(close, i);
      const stop = end < 0 ? html.length : end;
      const raw = html.slice(i, stop);
      if (raw) el.appendChild(new TextNode(name === 'script' || name === 'style' ? raw : decode(raw)));
      i = end < 0 ? html.length : html.indexOf('>', end) + 1;
      continue;
    }
    stack.push(el);
  }
}
function pushText(parent, raw) {
  if (!raw) return;
  parent.appendChild(new TextNode(decode(raw)));
}

/* ---- Document + window ------------------------------------------------- */

class Document extends Element {
  constructor() {
    super('#document', null);
    this.nodeType = 9;
    this.ownerDocument = this;
    this.documentElement = this.createElement('html');
    this.appendChild(this.documentElement);
    this.head = this.createElement('head');
    this.body = this.createElement('body');
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
  }
  createElement(tag) { return new Element(tag, this); }
  createElementNS(ns, tag) { return new Element(tag, this); }
  createTextNode(t) { return new TextNode(t); }
  createDocumentFragment() { return new DocumentFragment(this); }
  getElementById(id) { return this.querySelector('#' + id); }
  getElementsByTagName(t) { return this.querySelectorAll(t); }
}

class Storage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(String(k)) ? this.map.get(String(k)) : null; }
  setItem(k, v) { this.map.set(String(k), String(v)); }
  removeItem(k) { this.map.delete(String(k)); }
  clear() { this.map.clear(); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

/* A localStorage that refuses everything, for the one guarantee the drafts
   make: a safety net that throws is worse than no safety net. */
export function fullStorage() {
  return {
    getItem() { throw new Error('QuotaExceededError'); },
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('QuotaExceededError'); },
    clear() { throw new Error('QuotaExceededError'); },
    key() { throw new Error('QuotaExceededError'); },
    get length() { throw new Error('QuotaExceededError'); },
  };
}

class MutationObserverStub {
  constructor(fn) { this.fn = fn; this.targets = []; }
  observe(target, opts) {
    if (opts && opts.subtree) throw new DomError('MutationObserver with subtree:true - the panel deliberately watches body\'s direct children only; watching the subtree would fire on every keystroke that redraws a row.');
    target._mo = target._mo || [];
    target._mo.push(this);
    this.targets.push(target);
  }
  disconnect() { this.targets.forEach((t) => { t._mo = (t._mo || []).filter((o) => o !== this); }); this.targets = []; }
  takeRecords() { return []; }
}

/* The observer is not automatic: nothing here polls. `flushMutations(el)`
   tells the observers on `el` what its children are now, which is the same
   fact a browser would deliver on a microtask, delivered where a test can
   see it happen. */
export function flushMutations(el) {
  const obs = el._mo || [];
  const kids = [...el.children];
  const seen = el._moSeen || (el._moSeen = new Set());
  const added = kids.filter((k) => !seen.has(k));
  kids.forEach((k) => seen.add(k));
  [...seen].forEach((k) => { if (kids.indexOf(k) < 0) seen.delete(k); });
  if (!added.length) return 0;
  obs.forEach((o) => o.fn([{ type: 'childList', addedNodes: added, removedNodes: [] }], o));
  return added.length;
}

export function makeWindow(opts = {}) {
  const document = new Document();
  const win = {
    document,
    localStorage: opts.localStorage || new Storage(),
    sessionStorage: new Storage(),
    location: { href: opts.href || 'https://www.suesangelsfc.co.uk/control.html', hash: '', pathname: '/control.html', origin: 'https://www.suesangelsfc.co.uk', search: '' },
    navigator: { userAgent: 'sue-angels-fc test DOM', onLine: true },
    MutationObserver: MutationObserverStub,
    Event: DomEvent,
    CustomEvent: DomEvent,
    HTMLElement: Element,
    Node,
    requestAnimationFrame: (fn) => { fn(0); return 0; },
    cancelAnimationFrame: () => {},
    setTimeout: (fn, ms, ...a) => setTimeout(fn, ms, ...a),
    clearTimeout: (t) => clearTimeout(t),
    setInterval: () => nope('setInterval (a test that needs a clock should drive it explicitly)'),
    matchMedia: (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => nope('getComputedStyle (this DOM has no cascade)'),
    scrollTo: () => {},
    alert: () => nope('alert'),
    confirm: () => nope('confirm (the panel has its own confirmAction dialog)'),
    fetch: opts.fetch || (() => Promise.reject(new Error('fetch is not wired in this test'))),
    addEventListener: (t, fn) => document.addEventListener(t, fn),
    removeEventListener: (t, fn) => document.removeEventListener(t, fn),
    dispatchEvent: (e) => document.dispatchEvent(e),
  };
  win.window = win;
  win.self = win;
  document.defaultView = win;
  return win;
}

export { Document, Element, TextNode, DomError, Storage };
