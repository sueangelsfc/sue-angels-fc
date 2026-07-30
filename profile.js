/* profile.js — animated player analytics modal. Reads baked window.PLAYER_PROFILES.
   Faithful to the backend (matchLog-derived) and built for motion: gauges draw +
   count up, the four-series chart draws in, bars grow, the contribution radial
   sweeps, heat blobs bloom, cards stagger. Colours are chosen per-viz (heat map =
   heat colours, chart series = distinct hues), not forced to one brand colour. */
(function () {
  var DB = window.PLAYER_PROFILES; if (!DB) return;
  var P = DB.players;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COMPS = ['all', 'League Ten', 'Dylan Rigobert Trophy', 'Chairman’s Cup', 'Marcus Lipton Cup', 'Surrey FA Cup'];
  // vertical pitch coords (x,y in 0..100; y=8 attack third -> y=92 own goal)
  var PITCH = { GK:[50,90],CB:[50,74],LCB:[35,75],RCB:[65,75],LB:[17,72],RB:[83,72],LWB:[15,58],RWB:[85,58],SW:[50,80],WB:[85,60],LDM:[37,61],CDM:[50,62],RDM:[63,61],DM:[50,62],LCM:[37,48],RCM:[63,48],CM:[50,48],LM:[16,46],RM:[84,46],CAM:[50,34],LAM:[35,33],RAM:[65,33],AM:[50,34],SS:[50,24],LW:[18,24],RW:[82,24],LF:[35,16],RF:[65,16],CF:[50,15],ST:[50,14] };
  var SERIES = [ {k:'ga',label:'G+A',c:'#FF7A2F'}, {k:'go',label:'Goals',c:'#F4F1EC'}, {k:'as',label:'Assists',c:'#22D3EE'}, {k:'cs',label:'Clean sheets',c:'#2BE38A'} ];

  function el(h){var d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild;}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}

  function ring(v, label, pct, i){
    pct=Math.max(0,Math.min(1,pct||0)); var r=25,c=2*Math.PI*r;
    return '<div class="pm-g" style="--i:'+i+'">'
      +'<svg viewBox="0 0 62 62" aria-hidden="true"><circle class="pm-g__bg" cx="31" cy="31" r="'+r+'"/>'
      +'<circle class="pm-g__fg" cx="31" cy="31" r="'+r+'" stroke-dasharray="'+c.toFixed(1)+'" style="--len:'+c.toFixed(1)+';--off:'+(c*(1-pct)).toFixed(1)+'" transform="rotate(-90 31 31)"/></svg>'
      +'<b class="pm-count" data-to="'+v+'">'+(reduce?v:0)+(String(v).indexOf('%')>-1?'':'')+'</b><span>'+label+'</span></div>';
  }

  function multiChart(s4){
    if(!s4||!s4.ga||s4.ga.length<2) return '<div class="pm-empty">Not enough games to chart.</div>';
    var W=600,H=170,padL=26,padR=12,padT=12,padB=26,n=s4.ga.length;
    var max=Math.max(1, Math.max.apply(null,s4.ga));
    var series=SERIES.filter(function(s){return s.k!=='cs' || Math.max.apply(null,s4.cs&&s4.cs.length?s4.cs:[0])>0;});
    function pts(arr){return arr.map(function(v,i){return [padL+(n<=1?0:i/(n-1))*(W-padL-padR), H-padB-(v/max)*(H-padT-padB)];});}
    var grid=''; [0,Math.round(max/2),max].forEach(function(gv){var y=H-padB-(gv/max)*(H-padT-padB);grid+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" class="pm-ch__grid"/><text x="'+(padL-6)+'" y="'+(y+3).toFixed(1)+'" class="pm-ch__yl">'+gv+'</text>';});
    var paths=series.map(function(s,si){
      var pp=pts(s4[s.k]); if(!pp.length) return '';
      var d=pp.map(function(q,i){return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1);}).join(' ');
      var end=pp[pp.length-1];
      return '<path class="pm-ch__line" style="--c:'+s.c+';--d:'+(0.15+si*0.12)+'s" d="'+d+'"/><circle class="pm-ch__dot" style="--c:'+s.c+';--dd:'+(0.9+si*0.12)+'s" cx="'+end[0].toFixed(1)+'" cy="'+end[1].toFixed(1)+'" r="3.5"/>';
    }).join('');
    var legend=series.map(function(s){return '<span class="pm-lg"><i style="background:'+s.c+'"></i>'+s.label+' &middot; <b>'+s4[s.k][s4[s.k].length-1]+'</b></span>';}).join('');
    return '<svg class="pm-ch" viewBox="0 0 '+W+' '+H+'" aria-hidden="true">'+grid
      +'<text x="'+padL+'" y="'+(H-8)+'" class="pm-ch__xl">Game 1</text><text x="'+(W-padR)+'" y="'+(H-8)+'" class="pm-ch__xl" text-anchor="end">Game '+n+'</text>'
      +paths+'</svg><div class="pm-lgs">'+legend+'</div>';
  }

  function radial(p){
    // 6 spokes with the photo/mono in the middle; each wedge fills to its %.
    var sp=(p.con&&p.con.length)?p.con:[];
    if(!sp.length) return '<div class="pm-empty">No contribution data.</div>';
    var cx=90,cy=90,R=78,ir=48,seg=sp.length,gap=3;
    function pol(a,rad){var rr=(a-90)*Math.PI/180;return [cx+rad*Math.cos(rr),cy+rad*Math.sin(rr)];}
    // one <g> per slice (bg + fill + labels + transparent hit-area) so the whole
    // wedge is hoverable and the fill replays / brightens on hover.
    var wedges=sp.map(function(s,i){
      var a0=i/seg*360+gap/2, a1=(i+1)/seg*360-gap/2;
      var pct=Math.max(0,Math.min(100,s[1]))/100; var rOut=ir+(R-ir)*pct;
      var bg=arc(cx,cy,ir,R,a0,a1,'pm-rad__bg');
      var fg=pct>0?arc(cx,cy,ir,rOut,a0,a1,'pm-rad__fg','--dl:'+(0.1+i*0.08)+'s'):'';
      var hit=arc(cx,cy,ir,R,a0,a1,'pm-rad__hit');
      var mid=(i+0.5)/seg*360; var lp=pol(mid,R+18);
      var lab='<text x="'+lp[0].toFixed(1)+'" y="'+(lp[1]-3).toFixed(1)+'" class="pm-rad__v" text-anchor="middle">'+s[1]+'%</text>'
        +'<text x="'+lp[0].toFixed(1)+'" y="'+(lp[1]+7).toFixed(1)+'" class="pm-rad__l" text-anchor="middle">'+esc(s[0]).toUpperCase()+'</text>';
      return '<g class="pm-rad__seg"><title>'+esc(s[0])+' · '+s[1]+'%</title>'+bg+fg+lab+hit+'</g>';
    }).join('');
    return '<div class="pm-radwrap"><svg class="pm-rad" viewBox="0 0 180 180" aria-hidden="true"><defs><clipPath id="pmph"><circle cx="90" cy="90" r="'+(ir-4)+'"/></clipPath></defs>'
      +wedges+'<circle cx="90" cy="90" r="'+(ir-4)+'" class="pm-rad__hub"/>'
      +'<g clip-path="url(#pmph)"><rect x="'+(90-ir)+'" y="'+(90-ir)+'" width="'+(ir*2)+'" height="'+(ir*2)+'" class="pm-rad__hubbg"/><image class="pm-rad__img" href="" x="'+(90-ir)+'" y="'+(90-ir)+'" width="'+(ir*2)+'" height="'+(ir*2)+'" preserveAspectRatio="xMidYMid slice"/></g>'
      +'<text x="90" y="94" class="pm-rad__mono" text-anchor="middle">'+esc((p.f[0]||'')+(p.l[0]||''))+'</text></svg></div>';
  }
  function arc(cx,cy,ri,ro,a0,a1,cls,style){
    function P(a,r){var rad=(a-90)*Math.PI/180;return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];}
    var p1=P(a0,ro),p2=P(a1,ro),p3=P(a1,ri),p4=P(a0,ri);var laf=(a1-a0)>180?1:0;
    return '<path class="'+cls+'"'+(style?' style="'+style+'"':'')+' d="M'+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+' A'+ro+' '+ro+' 0 '+laf+' 1 '+p2[0].toFixed(1)+' '+p2[1].toFixed(1)+' L'+p3[0].toFixed(1)+' '+p3[1].toFixed(1)+' A'+ri+' '+ri+' 0 '+laf+' 0 '+p4[0].toFixed(1)+' '+p4[1].toFixed(1)+' Z"/>';
  }

  function heat(harr){
    if(!harr||!harr.length) return '<div class="pm-empty">No position data.</div>';
    var max=harr[0][1]||1;
    // heat FIELD — soft additive blobs blended into one breathing cloud (screen-blend
    // inside an isolated group), so the hot core emerges where they actually played.
    var field=harr.map(function(h){var xy=PITCH[h[0]];if(!xy)return '';var inten=h[1]/max;var rr=13+inten*17;
      return '<circle class="pm-hm__blob" cx="'+xy[0]+'" cy="'+xy[1]+'" r="'+rr.toFixed(1)+'" fill="url(#pmheat)" opacity="'+(0.4+0.55*inten).toFixed(2)+'"/>';}).join('');
    // MARKERS — decluttered: bold primary chip, two secondary chips, the rest tiny
    // dots. Counts live in hover tooltips instead of crowding the pitch.
    var mk=harr.map(function(h,i){var xy=PITCH[h[0]];if(!xy)return '';
      var tip='<title>'+h[0]+' · '+h[1]+' appearance'+(h[1]===1?'':'s')+'</title>';
      if(i>=3) return '<g class="pm-hm__mk pm-hm__mk--min" style="--dl:'+(0.25+i*0.06)+'s">'+tip+'<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="1.7" class="pm-hm__mkmin"/></g>';
      var pri=i===0;
      return '<g class="pm-hm__mk'+(pri?' is-primary':'')+'" style="--dl:'+(0.22+i*0.07)+'s">'+tip
        +(pri?'<circle class="pm-hm__mkhalo" cx="'+xy[0]+'" cy="'+xy[1]+'" r="8.4"/>':'')
        +'<circle class="pm-hm__mkdot" cx="'+xy[0]+'" cy="'+xy[1]+'" r="'+(pri?6:4.9)+'"/>'
        +'<text class="pm-hm__mkt" x="'+xy[0]+'" y="'+(xy[1]+0.2)+'">'+h[0]+'</text></g>';}).join('');
    var stripes=''; for(var s=0;s<6;s++){ if(s%2) stripes+='<rect x="3" y="'+(3+s*15.66).toFixed(1)+'" width="94" height="15.66" class="pm-hm__stripe"/>'; }
    var pitch='<rect x="3" y="3" width="94" height="94" rx="3.5" class="pm-hm__pitch"/>'+stripes
      +'<rect x="3" y="3" width="94" height="94" rx="3.5" class="pm-hm__frame"/>'
      +'<line x1="3" y1="50" x2="97" y2="50" class="pm-hm__ln"/>'
      +'<circle cx="50" cy="50" r="9.5" class="pm-hm__ln" fill="none"/><circle cx="50" cy="50" r="1" class="pm-hm__spot"/>'
      +'<rect x="30" y="3" width="40" height="14" class="pm-hm__ln" fill="none"/><rect x="40" y="3" width="20" height="5.5" class="pm-hm__ln" fill="none"/>'
      +'<circle cx="50" cy="12" r="1" class="pm-hm__spot"/><path d="M42.5 17 A 8 8 0 0 1 57.5 17" class="pm-hm__ln" fill="none"/>'
      +'<rect x="30" y="83" width="40" height="14" class="pm-hm__ln" fill="none"/><rect x="40" y="91.5" width="20" height="5.5" class="pm-hm__ln" fill="none"/>'
      +'<circle cx="50" cy="88" r="1" class="pm-hm__spot"/><path d="M42.5 83 A 8 8 0 0 0 57.5 83" class="pm-hm__ln" fill="none"/>'
      +'<rect x="45" y="1.4" width="10" height="1.6" class="pm-hm__goal"/><rect x="45" y="97" width="10" height="1.6" class="pm-hm__goal"/>';
    return '<svg class="pm-hm" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
      +'<defs><radialGradient id="pmheat"><stop offset="0%" stop-color="#ff2400"/><stop offset="30%" stop-color="#ff6a00" stop-opacity="0.92"/><stop offset="60%" stop-color="#ffc400" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffe66b" stop-opacity="0"/></radialGradient></defs>'
      +pitch
      +'<g class="pm-hm__field">'+field+'</g>'
      +'<g class="pm-hm__mks">'+mk+'</g>'
      +'</svg>';
  }

  function build(num){
    var p=P[num]; if(!p) return null; var gk=!!p.gk,g=p.ga;
    var gauges=(gk
      ? [ring(g.ap,'Apps',g.ap/33,0),ring(g.st,'Starts',g.ap?g.st/g.ap:0,1),ring(g.cs,'Clean sheets',g.cs/16,2),ring(g.cn,'Conceded',1-Math.min(1,g.cn/40),3),ring(g.mo,'MOTM',g.mo/5,4),ring(g.wp+'%','Win rate',g.wp/100,5)]
      : [ring(g.ap,'Apps',g.ap/30,0),ring(g.st,'Starts',g.ap?g.st/g.ap:0,1),ring(g.go,'Goals',g.go/31,2),ring(g.as,'Assists',g.as/19,3),ring(g.mo,'MOTM',g.mo/5,4),ring(g.wp+'%','Win rate',g.wp/100,5)]).join('');
    var bmax=Math.max(1,p.brk.op,p.brk.pe,p.brk.sp,g.go,g.as);
    function bar(name,val,cls){return '<div class="pm-bar"><span>'+name+'</span><i class="'+(cls||'')+'" style="--w:'+(val/bmax*100).toFixed(0)+'%"></i><b>'+val+'</b></div>';}
    var brk=bar('Open play',p.brk.op)+bar('Penalties',p.brk.pe)+bar('Set pieces',p.brk.sp)+'<div class="pm-gva">'+bar('Goals vs assists',g.go,'pm-bar__g')+bar('',g.as,'pm-bar__a')+'</div>';
    var impRows=gk?[['#'+p.imp.csr,'Clean sheet rank',p.imp.cs+' kept','shield'],['#'+p.imp.mor,'MOTM rank',g.mo+' awards','star']]
      :[[p.imp.sh+'%','Share of club goals',g.go+' of '+p.imp.tgf,'ball'],['#'+p.imp.gr,'Goalscoring rank',p.imp.gr===1?'club top scorer':'in the squad','trophy'],['#'+p.imp.ar,'Assist rank','in the squad','pass'],['#'+p.imp.mor,'MOTM rank',g.mo+' awards','star']];
    var imp=impRows.map(function(r,i){return '<div class="pm-imp" style="--i:'+i+'"><span class="pm-imp__ic pm-ic--'+r[3]+'"></span><b>'+r[0]+'</b><span>'+r[1]+'</span><em>'+r[2]+'</em></div>';}).join('');
    var comp=(p.comp||[]).map(function(c){return '<tr><td>'+esc(c.c)+'</td><td>'+c.ap+'</td><td class="pm-tv">'+c.g+'</td><td class="pm-tv">'+c.a+'</td><td>'+(c.mo||0)+'</td></tr>';}).join('')||'<tr><td colspan="5" class="pm-empty">No appearances.</td></tr>';
    var form=(p.form||[]).map(function(m,i){var d=(m.g||m.a)?((m.g?m.g+'G ':'')+(m.a?m.a+'A':'')).trim():'&middot;';
      var rw={W:'Won',D:'Drew',L:'Lost'}[m.r]||m.r; var contrib=(m.g||m.a)?' · '+((m.g?m.g+'G ':'')+(m.a?m.a+'A':'')).trim():'';
      var tip=rw+' v '+esc(m.o)+contrib;
      return '<div class="pm-fm" style="--i:'+i+'" title="'+tip+'"><span class="pm-fm__c pm-fm--'+m.r.toLowerCase()+'">'+m.r+'</span><span class="pm-fm__d">'+d+'</span><span class="pm-fm__o">'+esc(m.o).slice(0,10)+'</span></div>';}).join('')||'<span class="pm-empty">No games.</span>';
    var mile=(p.land||[]).map(function(x){return '<li class="pm-ms pm-ms--land"><b>'+esc(x.t)+'</b><span>'+esc(x.s)+'</span></li>';}).join('')
      +(p.ms||[]).map(function(x){return '<li class="pm-ms"><b>'+esc(x.t)+'</b><span>'+(x.v||'')+'</span></li>';}).join('');
    if(!mile) mile='<li class="pm-empty">Milestones unlock as 26/27 plays out.</li>';
    var compTabs=COMPS.map(function(c){return '<button class="pm-tab'+(c==='all'?' is-on':'')+'" type="button" disabled>'+(c==='all'?'All':esc(c))+'</button>';}).join('');

    var node=el('<div class="pm-ov" role="dialog" aria-modal="true" aria-label="'+esc(p.f+' '+p.l)+' profile">'
      +'<div class="pm" role="document">'
      +'<button class="pm__x" aria-label="Close profile">&times;</button>'
      +'<div class="pm__head"><div class="pm__media"><span class="pm__mono">'+esc((p.f[0]||'')+(p.l[0]||''))+'</span></div>'
        +'<div class="pm__id"><span class="pm__pos">'+esc(p.pos||'—')+'</span><span class="pm__eyebrow">'+(gk?'Goalkeeper':'Outfield')+' &middot; 25/26</span><h2 class="pm__name">'+esc(p.l)+'<span>'+esc(p.f)+'</span></h2></div></div>'
      +'<div class="pm__filters"><div class="pm-tabs" role="tablist">'+['All seasons','25/26','26/27'].map(function(s,i){return '<button class="pm-tab'+(i===1?' is-on':'')+'" type="button" role="tab" data-season="'+s+'">'+s+'</button>';}).join('')+'</div><div class="pm-tabs pm-tabs--comp">'+compTabs+'</div></div>'
      +'<div class="pm__gauges">'+gauges+'</div>'
      +'<div class="pm__grid"><section class="pm__card" style="--i:0"><p class="pm__h">Goal breakdown</p>'+brk+'</section>'
        +'<section class="pm__card" style="--i:1"><p class="pm__h">Season impact</p><div class="pm__imps">'+imp+'</div></section></div>'
      +'<section class="pm__card" style="--i:2"><p class="pm__h">Cumulative goal involvements</p>'+multiChart(p.s4)+'</section>'
      +'<div class="pm__grid"><section class="pm__card" style="--i:3"><p class="pm__h">Contribution breakdown</p>'+radial(p)+'</section>'
        +'<section class="pm__card" style="--i:4"><p class="pm__h">Where they play</p>'+heat(p.heat)+'</section></div>'
      +'<section class="pm__card" style="--i:5"><p class="pm__h">By competition &middot; 25/26</p><table class="pm__tbl"><thead><tr><th>Competition</th><th>Apps</th><th>G</th><th>A</th><th>MOTM</th></tr></thead><tbody>'+comp+'</tbody></table></section>'
      +'<section class="pm__card" style="--i:6"><p class="pm__h">Last 10 featured</p><div class="pm__form">'+form+'</div></section>'
      +'<section class="pm__card" style="--i:7"><p class="pm__h">Achievements &amp; milestones</p><ul class="pm__ms">'+mile+'</ul></section>'
      +'<div class="pm-fut" aria-hidden="true"><span class="pm-fut__mark">26<i>/</i>27</span><p class="pm-fut__h">The new season is loading up</p><p class="pm-fut__p">Sue’s Angels kick off 26/27 in August. Every appearance, goal and heat blob builds here live, from the first whistle.</p></div>'
      +'</div></div>');

    // photo into header + radial hub
    var media=node.querySelector('.pm__media');
    var img=new Image(); img.className='pm__photo'; img.alt=p.f+' '+p.l; img.decoding='async';
    img.onload=function(){ media.insertBefore(img,media.firstChild); media.classList.add('has-photo');
      var im=node.querySelector('.pm-rad__img'); if(im){ im.setAttribute('href',img.src); node.querySelector('.pm').classList.add('has-radimg'); } };
    img.src='media/players/'+num+'.jpg';
    return node;
  }

  function countOne(b){
    if(reduce) return;
    var raw=b.getAttribute('data-to'); var pct=raw.indexOf('%')>-1; var to=parseFloat(raw)||0; if(!to){b.textContent=raw;return;}
    var t0=null,dur=760;
    function step(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/dur);var e=1-Math.pow(1-k,3);b.textContent=Math.round(to*e)+(pct?'%':'');if(k<1)requestAnimationFrame(step);else b.textContent=raw;}
    requestAnimationFrame(step);
  }
  function countUp(node){ if(reduce) return; node.querySelectorAll('.pm-count').forEach(countOne); }

  /* restart a CSS keyframe animation on demand (used for hover replays) */
  function restart(elm, anim){ elm.style.animation='none'; void elm.getBoundingClientRect(); elm.style.animation=anim; }

  /* wire the "comes alive on hover" behaviour the brief asks for: gauges re-draw +
     re-count, bars re-grow, the chart re-draws, pie wedges pop. Pointer-only. */
  function wireHovers(node){
    if(reduce) return;
    node.querySelectorAll('.pm-g').forEach(function(g){ g.addEventListener('mouseenter',function(){
      var fg=g.querySelector('.pm-g__fg');
      if(fg){ var off=fg.style.getPropertyValue('--off'), len=fg.style.getPropertyValue('--len');
        fg.style.transition='none'; fg.style.strokeDashoffset=len; void fg.getBoundingClientRect();
        fg.style.transition='stroke-dashoffset .8s cubic-bezier(.3,.8,.3,1)'; fg.style.strokeDashoffset=off; }
      var b=g.querySelector('.pm-count'); if(b) countOne(b);
    }); });
    node.querySelectorAll('.pm-bar').forEach(function(bar){ var i=bar.querySelector('i'); if(!i) return;
      bar.addEventListener('mouseenter',function(){ var w=i.style.getPropertyValue('--w');
        i.style.transition='none'; i.style.width='0'; void i.getBoundingClientRect();
        i.style.transition='width .8s cubic-bezier(.2,.8,.2,1)'; i.style.width=w; }); });
    var ch=node.querySelector('.pm-ch'); if(ch){ var host=ch.closest('.pm__card')||ch;
      host.addEventListener('mouseenter',function(){
        ch.querySelectorAll('.pm-ch__line').forEach(function(l){ restart(l,'pmdraw 1.05s ease forwards'); });
        ch.querySelectorAll('.pm-ch__dot').forEach(function(d){ restart(d,'pmfade .3s ease forwards .85s'); }); }); }
    node.querySelectorAll('.pm-rad__seg').forEach(function(sgm){ sgm.addEventListener('mouseenter',function(){
      var fg=sgm.querySelector('.pm-rad__fg'); if(fg) restart(fg,'pmwedge .5s cubic-bezier(.2,.8,.2,1)'); }); });
  }

  /* season tabs — 25/26 is the only played season, so All-seasons + 25/26 show the
     real console and 26/27 flips to an honest "not started yet" state. */
  function wireSeasons(node){
    var pm=node.querySelector('.pm');
    var tabs=[].slice.call(node.querySelectorAll('.pm-tabs:not(.pm-tabs--comp) .pm-tab'));
    tabs.forEach(function(t){ t.addEventListener('click',function(){
      tabs.forEach(function(x){ x.classList.remove('is-on'); }); t.classList.add('is-on');
      pm.classList.toggle('pm--fut', t.getAttribute('data-season')==='26/27');
    }); });
  }

  var open=null;
  function close(){ if(open){open.classList.remove('is-in');var o=open;open=null;document.documentElement.style.overflow='';setTimeout(function(){o.remove();},260);} }
  window.openProfile=function(num){
    close(); var node=build(num); if(!node) return; open=node; document.body.appendChild(node);
    document.documentElement.style.overflow='hidden';
    requestAnimationFrame(function(){ node.classList.add('is-in'); countUp(node); });
    wireHovers(node); wireSeasons(node);
    node.querySelector('.pm__x').addEventListener('click',close);
    node.addEventListener('click',function(e){if(e.target===node)close();});
  };
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});

  /* clicking a card flips it to its stat back; the back's "Full profile" button
     opens the detailed modal. Past players (no back) open the modal directly. */
  function wire(){ [].slice.call(document.querySelectorAll('.pl[data-num]')).forEach(function(card){ if(card.__w)return;card.__w=1;
    var act=function(){ if(card.querySelector('.pl__face--back')){ card.classList.toggle('is-flipped'); } else if(window.openProfile){ window.openProfile(card.getAttribute('data-num')); } };
    card.addEventListener('click',act);
    card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}}); }); }
  if(document.readyState!=='loading')wire();else document.addEventListener('DOMContentLoaded',wire);
})();

/* ============================================================
   SQUAD CARDS · premium collectible: 3D pointer-tilt, holographic
   sheen, and a flip to a stat console. Enhances the plain .pl markup
   in place (moves media/body into a front face, builds the back from
   the baked PLAYER_PROFILES). Degrades to the static card with no JS.
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DB = window.PLAYER_PROFILES && window.PLAYER_PROFILES.players;
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a9 9 0 0 0-15-3.3L3 8"/><path d="M3 3v5h5"/><path d="M3 16a9 9 0 0 0 15 3.3L21 16"/><path d="M21 21v-5h-5"/></svg>';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function div(c){ var d=document.createElement('div'); d.className=c; return d; }

  function backHTML(card, num){
    var p = DB && DB[num];
    var nameEl = card.querySelector('.pl__name');
    var surname = nameEl && nameEl.firstChild ? nameEl.firstChild.textContent : '';
    var firstEl = nameEl ? nameEl.querySelector('span') : null;
    var first = firstEl ? firstEl.textContent : '';
    var pos = (card.querySelector('.pl__pos') || {}).textContent || '';
    var tiles, form = '';
    if (p) {
      var g = p.ga, gk = !!p.gk;
      tiles = gk
        ? [[g.ap, 'Apps'], [g.cs, 'Clean sheets'], [g.st, 'Starts'], [g.mo, 'MOTM']]
        : [[g.ap, 'Apps'], [g.go, 'Goals'], [g.as, 'Assists'], [g.wp + '%', 'Win rate']];
      if (p.form && p.form.length) {
        form = '<div class="plb__form" aria-label="Recent form">' + p.form.slice(-5).map(function (m) {
          var r = String(m.r || '').toLowerCase(); return '<i class="' + r + '">' + esc(m.r) + '</i>';
        }).join('') + '</div>';
      }
    } else {
      tiles = [].slice.call(card.querySelectorAll('.pl__stats span')).map(function (s) {
        var b = s.querySelector('b'); var val = b ? b.textContent : '';
        var lab = b ? s.textContent.replace(b.textContent, '').trim() : s.textContent;
        return [val, lab];
      });
    }
    var tilesH = tiles.map(function (t) {
      return '<div class="plb__tile"><b>' + esc(t[0]) + '</b><span>' + esc(t[1]) + '</span></div>';
    }).join('');
    return '<div class="plb"><div class="plb__head"><p class="plb__name">' + esc(surname)
      + ' <span>' + esc(first) + '</span></p><span class="plb__pos">' + esc(pos) + '</span></div>'
      + '<div class="plb__tiles">' + tilesH + '</div>' + form
      + '<button class="plb__cta" type="button">Full profile</button></div>';
  }

  function wireTilt(card) {
    if (reduce) return;
    var raf = null, last = null, rect = null;
    function apply() {
      raf = null; if (!last || !rect) return;
      var px = (last.x - rect.left) / rect.width, py = (last.y - rect.top) / rect.height;
      px = px < 0 ? 0 : px > 1 ? 1 : px; py = py < 0 ? 0 : py > 1 ? 1 : py;
      card.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - 0.5) * 11).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }
    card.addEventListener('pointerenter', function () { rect = card.getBoundingClientRect(); card.classList.add('is-tilting'); });
    card.addEventListener('pointermove', function (e) { last = { x: e.clientX, y: e.clientY }; if (!raf) raf = requestAnimationFrame(apply); });
    card.addEventListener('pointerleave', function () {
      card.classList.remove('is-tilting'); rect = null;
      card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
    });
  }

  function enhance(card) {
    if (card.__pcard) return; card.__pcard = 1;
    var media = card.querySelector('.pl__media'), body = card.querySelector('.pl__body');
    if (!media || !body) return;
    var num = card.getAttribute('data-num');
    var isPast = card.hasAttribute('data-sub');

    // scale down very long surnames so they never clip the card (e.g. THILAGANATHAN)
    var nmEl = card.querySelector('.pl__name');
    var sn = nmEl && nmEl.firstChild ? nmEl.firstChild.textContent.trim() : '';
    if (sn.length >= 12) card.classList.add('pl--xlname');
    else if (sn.length >= 9) card.classList.add('pl--lgname');

    // build the back BEFORE moving media/body out of the card (backHTML reads
    // .pl__name / .pl__pos / .pl__stats, which live inside body).
    var back = null;
    if (!isPast) { back = div('pl__face pl__face--back'); back.innerHTML = backHTML(card, num); }

    var tilt = div('pl__tilt'), flipper = div('pl__flipper'), front = div('pl__face pl__face--front');
    front.appendChild(media); front.appendChild(body);
    front.appendChild(div('pl__sheen'));
    flipper.appendChild(front);
    if (back) flipper.appendChild(back);
    tilt.appendChild(flipper);

    if (!isPast) {
      var flip = document.createElement('button');
      flip.type = 'button'; flip.className = 'pl__flip';
      flip.setAttribute('aria-label', 'Flip card to see stats'); flip.innerHTML = ICON;
      flip.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); card.classList.toggle('is-flipped'); });
      tilt.appendChild(flip);
      var al = card.getAttribute('aria-label') || '';
      card.setAttribute('aria-label', al.replace(/,?\s*view profile/i, '') + ', flip for stats');
      var cta = flipper.querySelector('.plb__cta');
      if (cta) { cta.setAttribute('aria-label', 'View full profile and stats');
        cta.addEventListener('click', function (e) { e.stopPropagation(); if (window.openProfile) window.openProfile(num); }); }
    }

    card.appendChild(tilt);
    wireTilt(card);
  }

  function run() {
    var cards = document.querySelectorAll('.pl[data-num]');
    if (!cards.length) return;
    [].slice.call(cards).forEach(enhance);
  }
  if (document.readyState !== 'loading') run(); else document.addEventListener('DOMContentLoaded', run);
})();
