---
name: responsive-sweep
description: Verify every public page of the club site has no horizontal overflow at mobile/tablet/desktop widths. Use after any CSS or layout change, before deploying, or when the user reports "broken on my phone", "doesn't fit", "cut off on mobile/tablet".
---

# Responsive Sweep

Programmatic check that no page overflows the viewport at any width. Horizontal
overflow is this project's #1 mobile bug class (CLAUDE.md gotcha #4).

## How to run

1. Start the preview server (`preview_start`, name `sue-angels`). It serves on **4321**.
2. Install the sweep helper once per page-load via `preview_eval`:

```js
window.__sweep=function(pages,width){
  var out=[];var fr=document.createElement('iframe');
  fr.style.cssText='position:fixed;left:0;top:0;width:'+width+'px;height:750px;border:0;visibility:hidden';
  document.body.appendChild(fr);
  function test(i){return new Promise(function(res){
    if(i>=pages.length){res(null);return;}
    fr.onload=function(){setTimeout(function(){
      try{var d=fr.contentDocument;
        var sw=d.documentElement.scrollWidth, cw=d.documentElement.clientWidth;
        var worst=null;
        if(sw>cw+1){var els=d.querySelectorAll('body *');var max=0;
          for(var k=0;k<els.length;k++){var r=els[k].getBoundingClientRect();
            if(r.right>max&&r.width<sw*2){max=r.right;worst=els[k].className||els[k].tagName;}}}
        out.push({page:pages[i],overflow:sw>cw+1?(sw-cw)+'px':null,worst:worst?String(worst).slice(0,55):null});
      }catch(e){out.push({page:pages[i],err:String(e).slice(0,40)});}
      res(test(i+1));},1100);};
    fr.src=pages[i]+'?cb='+Math.random();});}   // paths from sitemap.xml, already .html
  return test(0).then(function(){fr.remove();return out;});};
```

3. Sweep in chunks of ≤8 pages (a 30s eval timeout applies; each page costs ~1.2s):

```js
window.__sweep(['index','about','champions','teams','schedule','results','fixtures','table'],375)
```

**Take the page list from `sitemap.xml`, never from a list written here.** Routes
are generated; a hard-coded list goes stale silently and stops covering the page
that broke. `teams`, `schedule` and `table` were in this file long after they
stopped existing.

Sweep every static route, plus two of each generated family (players, matches,
news, gallery). **Skip `/gallery/<album>.html` in the pane** - 175 images in one
iframe times out the 30s eval. Batch 3 to 4 pages per call.

## Widths to test

- **320** — iPhone SE floor (strictest)
- **375** — standard mobile
- **768** — tablet; sits just past the 760px mobile-hardening breakpoint, most likely gap
- Spot-check 430 and 1024 if a breakpoint was edited.

## Reading results

- `overflow: null` on every row = pass.
- Any `overflow: "Npx"` = fail; `worst` names the offending element's class. Fix with the
  project patterns: `repeat(auto-fill, minmax(min(100%, Npx), 1fr))` for grids,
  `min-width:0` on flex children, never fixed px widths ≥ viewport.
- After a fix: `npm run build` and re-sweep. Asset versions are content hashes
  now; there is nothing to bump by hand and `scripts/bump.sh` is long gone.

## Two things the pane lies about

**Pointer type.** The iframe reports `pointer: fine`, so every rule inside
`@media (pointer: coarse)` is inactive and small text measures at its desktop
size. The homepage will read 15 elements at 8.5px that are 10px on a real
phone. Do not report those. To check the floor honestly, collect the selector
text of the coarse font-size rules from the CSSOM and test each element with
`el.matches(joined)` - **not** by comparing class names, which misses every
descendant selector like `.pc__stats i` and produced a phantom "216 uncovered"
finding.

**Element bounds are not page overflow.** The atmosphere layers (`.pa`) are
deliberately larger than the viewport, and wide tables sit in an
`overflow-x: auto` wrapper. Both extend past the right edge by design. The
authoritative measure is `documentElement.scrollWidth > clientWidth`; an
element-level check reports these as failures and they are not.

Last full pass: Aug 2026 - 25 pages clean at 320/375/430/768/1280, including
the match-page album card and the player-profile chips. Document overflow 0
everywhere; type floor covers every sub-9px element.
