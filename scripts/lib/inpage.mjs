/* ==========================================================================
   WHAT TO ASK A RENDERED PAGE

   This is a string because it runs inside Chrome, not in Node. Everything
   here needs the two things src/test/dom.mjs deliberately refuses to fake:
   a cascade and a layout.

   The questions are chosen to have no judgement in them. A page that scrolls
   sideways is broken. Text nobody can read against its own background is
   broken. A heading rendered at zero height is broken. None of those is a
   matter of taste, which is the rule scripts/guard.mjs is built on too.

   AND WHAT IT REFUSES TO GUESS. Text over a gradient or a photograph has no
   single background colour, so its contrast cannot be computed this way. It
   is counted as unverifiable and reported, never failed: this site draws
   almost every panel on a gradient, and a check that assumed the top stop
   would fail dozens of things that are perfectly readable.
   ========================================================================== */
export const AUDIT = String.raw`(() => {
  const out = { overflow: null, unreadable: [], invisible: [], unverifiable: 0, measured: 0 };

  /* 1. IS ANYTHING PUSHED OFF THE SIDE OF THE PAGE?

     NOT documentElement.scrollWidth > clientWidth, which is the usual
     measure and is DEAD ON THIS SITE: home.css sets html{overflow-x:hidden}
     deliberately, because the four atmosphere layers behind every page are
     larger than the viewport by design. With that rule in place the document
     can never report horizontal scroll, so the usual check passes whatever it
     is shown - proven by putting a 3000px-wide element on the page and
     watching it say nothing.

     So the question is asked of TEXT instead: something a reader is meant to
     read, whose box ends past the right edge. The atmosphere layers hold no
     text, so they are silent here without needing to be special-cased, and a
     wide table inside its own overflow-x scroller is a thing you scroll on
     purpose rather than a broken page. */
  const overflowing = [];

  const chan = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(/[,\/ ]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  /* fg painted over bg, both already resolved. */
  const over = (fg, bg) => ({
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  });
  const ratio = (a, b) => {
    const hi = Math.max(lum(a), lum(b)), lo = Math.min(lum(a), lum(b));
    return (hi + 0.05) / (lo + 0.05);
  };

  /* The background a piece of text is actually drawn on: every translucent
     layer between it and the first opaque one, composited bottom-up. With no
     opaque ancestor there is nothing to compare against and the answer is
     "unknown", not "white". */
  function backdrop(el) {
    const layers = [];
    let gradient = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') gradient = true;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    const base = layers[layers.length - 1];
    if (!base || base.a < 1) return { colour: null, gradient };
    let acc = base;
    for (let i = layers.length - 2; i >= 0; i -= 1) acc = over(layers[i], acc);
    return { colour: acc, gradient };
  }

  /* <option> and <optgroup> have no layout box of their own - the select
     paints them - so measuring one gives 0x0 for every dropdown on the page.
     That is a fact about how a select is rendered, not a defect. */
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'OPTION', 'OPTGROUP']);
  for (const el of document.querySelectorAll('body *')) {
    if (SKIP.has(el.tagName) || el.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
    /* NOT RENDERED IS NOT THE SAME AS BROKEN. A child of a display:none
       parent computes its own display normally and measures 0x0, so the
       mobile nav's label was reported as invisible text on every screen at
       desktop width. checkVisibility asks the question properly, walking the
       ancestors and honouring content-visibility with it. */
    if (el.checkVisibility && !el.checkVisibility()) continue;
    /* Only elements holding text of their OWN. A wrapper inherits its
       child's problem, and reporting both is noise. */
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (el.closest('[hidden], [aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();

    /* VISUALLY HIDDEN IS NOT INVISIBLE BY ACCIDENT. The .sr-only pattern is a
       1px absolutely positioned box with its overflow clipped: it exists for
       a screen reader and no sighted person ever sees it, so its contrast is
       not a question and its size is the whole point. checkVisibility says
       true for it, correctly, because it IS rendered. */
    const clipped = cs.position === 'absolute'
      && r.width <= 1.5 && r.height <= 1.5
      && (cs.overflow === 'hidden' || cs.clipPath !== 'none' || cs.clip !== 'auto');
    if (clipped) continue;

    const label = String(el.tagName.toLowerCase() + (el.className ? '.' + el.className : '')).slice(0, 60);
    const text = el.textContent.trim().slice(0, 40);

    /* 1b. Off the side of the page. Measured on the same elements as the
       contrast question, for the reason in the note at the top. */
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      let scroller = false;
      for (let n = el.parentElement; n; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') { scroller = true; break; }
      }
      if (!scroller && r.width > 0) {
        overflowing.push({
          sel: label, text,
          past: Math.round(Math.max(r.right - window.innerWidth, -r.left)),
        });
      }
    }

    /* 2. TEXT RENDERED AT NO SIZE. Something is there to read and there is
       nowhere to read it. */
    if (r.width < 1 || r.height < 1) {
      out.invisible.push({ sel: label, text, w: Math.round(r.width), h: Math.round(r.height) });
      continue;
    }

    /* 3. CAN IT BE READ? */
    const fg = parse(cs.color);
    if (!fg) continue;
    const { colour: bg, gradient } = backdrop(el);
    if (!bg || gradient) { out.unverifiable += 1; continue; }
    const flat = fg.a < 1 ? over(fg, bg) : fg;
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(flat, bg);
    out.measured += 1;
    if (got < need - 0.005) {
      const hx = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
      out.unreadable.push({
        sel: label, text, got: Math.round(got * 100) / 100, need, size: Math.round(size),
        /* The two colours, so the fix does not start with a hunt for the
           rule: almost all of these are set by a descendant selector and the
           element carries no class of its own to grep for. */
        fg: hx(flat), bg: hx(bg),
        path: (() => { const p = []; for (let n = el; n && n.tagName !== 'BODY' && p.length < 4; n = n.parentElement) {
          p.unshift(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(' ')[0] : '')); } return p.join('>'); })(),
      });
    }
  }

  if (overflowing.length) {
    overflowing.sort((a, b) => b.past - a.past);
    out.overflow = { by: overflowing[0].past, worst: overflowing[0].sel, text: overflowing[0].text,
      count: overflowing.length };
  }
  return out;
})()`;
