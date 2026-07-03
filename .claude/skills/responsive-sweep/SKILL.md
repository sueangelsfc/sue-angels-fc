---
name: responsive-sweep
description: Verify every public page of the club site has no horizontal overflow at mobile/tablet/desktop widths. Use after any CSS or layout change, before deploying, or when the user reports "broken on my phone", "doesn't fit", "cut off on mobile/tablet".
---

# Responsive Sweep

Programmatic check that no page overflows the viewport at any width. Horizontal
overflow is this project's #1 mobile bug class (CLAUDE.md gotcha #4).

## How to run

1. Start the preview server (`preview_start`, name `sue-angels`, port 5599).
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
    fr.src='http://localhost:5599/'+pages[i]+'.html?cb='+Math.random();});}
  return test(0).then(function(){fr.remove();return out;});};
```

3. Sweep in chunks of ≤8 pages (a 30s eval timeout applies; each page costs ~1.2s):

```js
window.__sweep(['index','about','champions','teams','schedule','results','fixtures','table'],375)
```

Full public page list:
`index about champions teams schedule results fixtures table league media news gallery videos records awards stats sponsors join contact sepsis live squad coaches`

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
- After a fix: bump `app.css?v=` on ALL pages (`scripts/bump.sh app.css`) and re-sweep.

Last full pass: Jun 2026 — 23 pages clean at 320/375/768.
