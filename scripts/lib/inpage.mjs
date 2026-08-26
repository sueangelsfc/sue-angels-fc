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
/* NO BACKTICKS BELOW THIS LINE, INCLUDING IN COMMENTS. Everything after it
   is one template literal, so a backtick around a CSS property name in a
   comment ends the string and the file stops parsing. It cost three round
   trips to learn twice. */
export const AUDIT = String.raw`(() => {
  const out = { overflow: null, unreadable: [], invisible: [], unverifiable: 0, measured: 0 };

  /* 1. DOES THE PAGE ACTUALLY SCROLL SIDEWAYS?

     This took three attempts and the first two were both wrong.

     documentElement.scrollWidth > clientWidth is the usual measure and is
     DEAD here: home.css sets html{overflow-x:hidden} on purpose, for the
     atmosphere layers, so the document can never report horizontal scroll. A
     3000px-wide element on the page proved it said nothing at all.

     Asking it of TEXT instead - is any element with text past the right edge
     - is not dead, and is wrong the other way: it reported 69 elements on the
     all-bands page, and every one was inside a ticker, a card carousel or a
     chart whose own ancestor clips it. Content a local container clips is
     contained, not spilling, and telling the two apart is a judgement call,
     which is the one thing these questions must not be.

     So: neutralise the page-level clip, force a reflow, and ask the document
     the ordinary question. The atmosphere layers are position:fixed and
     contribute nothing to scrollWidth, so they stay silent without a special
     case, and the answer is the one a reader would give - can you drag the
     page sideways. Restored immediately, before anything else is measured.

     AND IT IS A WEAK GATE ON THIS SITE, which is worth saying rather than
     leaving somebody to discover. .sec{overflow:hidden} is global, so every
     band absorbs its own overflow and the document can only be made to scroll
     by markup outside a band. What a reader on a phone actually experiences
     is text CLIPPED inside a band, and that is counted below and reported
     rather than failed, because a ticker, a card carousel and a chart all
     clip on purpose and telling those from an accident is a judgement. */
  const de = document.documentElement;
  {
    const wasHtml = de.style.overflowX;
    const wasBody = document.body.style.overflowX;
    de.style.overflowX = 'visible';
    document.body.style.overflowX = 'visible';
    void de.offsetWidth;
    const by = de.scrollWidth - de.clientWidth;
    if (by > 1) {
      let worst = null; let max = 0;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        /* Something six viewports wide is a decorative layer, not the thing
           that made the page scroll by 40px. */
        if (r.width > 0 && r.right > max && r.width < de.clientWidth * 6) {
          max = r.right; worst = String(el.className || el.tagName).slice(0, 50);
        }
      }
      out.overflow = { by, worst };
    }
    de.style.overflowX = wasHtml;
    document.body.style.overflowX = wasBody;
  }

  /* Text a container cuts off. Reported, never failed - see the note above.
     Deliberate truncation (nowrap + ellipsis) and anything inside a scroller
     are excluded, because both are things a reader can resolve. */
  const clippedText = [];

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
    /* THE 1px BOX IS NOT THE TEST. .sr-only sets width:1px;height:1px, and
       on a <table> that does nothing at all - a table sizes to its content -
       so the league table's screen-reader copy measures 512x331 and is hidden
       by clip-path: inset(50%) alone. Testing for the small box reported 46
       of its cells as text cut off by a container. The clip is what hides it,
       so the clip is what to look for. */
    const isSrOnly = (n, box) => {
      const s2 = getComputedStyle(n);
      if (s2.position !== 'absolute') return false;
      if (/inset\(\s*50%/.test(s2.clipPath)) return true;
      if (/rect\(\s*0(px)?[,\s]/.test(s2.clip)) return true;
      return box.width <= 1.5 && box.height <= 1.5
        && (s2.overflowX === 'hidden' || s2.clipPath !== 'none' || s2.clip !== 'auto');
    };
    if (isSrOnly(el, r)) continue;
    /* AND ANYTHING INSIDE ONE. The first version tested the element itself
       only, so the league table's screen-reader copy - a whole <table> inside
       a 1px .sr-only box - reported 46 of its cells as text cut off by a
       container. Every descendant of a visually hidden element is visually
       hidden; asking about its layout is asking the wrong question. */
    let inSrOnly = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (isSrOnly(n, n.getBoundingClientRect())) { inSrOnly = true; break; }
    }
    if (inSrOnly) continue;

    const label = String(el.tagName.toLowerCase() + (el.className ? '.' + el.className : '')).slice(0, 60);
    const text = el.textContent.trim().slice(0, 40);

    /* 1b. Cut off by a container. */
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      let contained = false; let scroller = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') { scroller = true; break; }
        if (ox === 'hidden' || ox === 'clip') contained = true;
      }
      const ellipsis = cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap';
      if (contained && !scroller && !ellipsis) {
        const band = el.closest('[class*="sec--"]');
        clippedText.push(band ? (/sec--([a-z0-9-]+)/.exec(band.className) || [, '?'])[1] : 'outside a band');
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

  out.clipped = {};
  for (const b of clippedText) out.clipped[b] = (out.clipped[b] || 0) + 1;
  return out;
})()`;
