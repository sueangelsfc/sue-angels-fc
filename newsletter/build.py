# -*- coding: utf-8 -*-
import random
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

INK=HexColor('#080C15'); INK2=HexColor('#0E1422'); CARD=HexColor('#121A2A'); VOLT=HexColor('#D6F23A')
WHITE=HexColor('#FFFFFF'); SOFT=HexColor('#C9D2E2'); MUTE=HexColor('#6E7A92'); HAIR=HexColor('#222E45'); VOLTDK=HexColor('#46570A')
import os, json, tempfile, datetime, urllib.request, re as _re
from PIL import Image, ImageEnhance, ImageOps
from fontTools.ttLib import TTFont as _TTF
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS=os.path.join(ROOT,'assets'); _FD=tempfile.mkdtemp(); _DD=tempfile.mkdtemp()
for _n,_rel in [('Clash','clash-display-600'),('ClashB','clash-display-700'),('Hk','hanken-400'),('HkM','hanken-500'),('HkSB','hanken-600')]:
    _f=_TTF(os.path.join(ASSETS,'fonts',_rel+'.woff2')); _f.flavor=None; _f.save(os.path.join(_FD,_n+'.ttf'))
    pdfmetrics.registerFont(TTFont(_n,os.path.join(_FD,_n+'.ttf')))
def _grade(src,dst):
    im=Image.open(src).convert('RGB'); d=ImageEnhance.Color(im).enhance(0.62); d=ImageEnhance.Contrast(d).enhance(1.05)
    g=ImageOps.autocontrast(im.convert('L'),1); duo=ImageOps.colorize(g,black=(14,20,34),mid=(86,100,126),white=(228,232,240))
    Image.blend(d,duo,0.20).save(dst,quality=90)
for _r in ['hero-team.jpg']+['hero/banner-%02d.jpg'%i for i in range(1,13)]:
    _sp=os.path.join(ASSETS,_r)
    if os.path.exists(_sp): _grade(_sp,os.path.join(_DD,os.path.basename(_r)))
def D(name): return os.path.join(_DD,name)
_SUPA='https://hvbquuvxcswylyguplfb.supabase.co'; _KEY='sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly'
def _fetch_news():
    try:
        rq=urllib.request.Request(_SUPA+'/rest/v1/articles?select=data',headers={'apikey':_KEY,'Authorization':'Bearer '+_KEY})
        rows=json.load(urllib.request.urlopen(rq,timeout=25)); out=[]
        for r in rows:
            dd=r.get('data') or {}
            if isinstance(dd,str): dd=json.loads(dd)
            if dd.get('title'): out.append(dd)
        out.sort(key=lambda a:a.get('sortISO') or '',reverse=True); return out
    except Exception as e:
        print('news fetch failed:',e); return []
NEWS=_fetch_news()
_now=datetime.datetime.utcnow()
ISSUE_N=max(1,(_now.year-2026)*12+(_now.month-6)+1); ISSUE_DATE=_now.strftime('%B %Y')
PW,PH=A4; MX=54; CW=PW-2*MX
OUT=os.path.join(ROOT,'newsletter','sue-angels-newsletter-latest.pdf')
c=canvas.Canvas(OUT,pagesize=A4)

def fit(t,fn,tw,maxs,mins=9):
    s=maxs
    while s>mins and c.stringWidth(t,fn,s)>tw: s-=0.5
    return s
def img(name,x,y,w,h,focus=0.5,radius=0):
    im=ImageReader(D(name)); iw,ih=im.getSize(); sc=max(w/iw,h/ih); dw,dh=iw*sc,ih*sc
    c.saveState(); p=c.beginPath()
    (p.roundRect(x,y,w,h,radius) if radius else p.rect(x,y,w,h)); c.clipPath(p,stroke=0)
    c.drawImage(im,x-(dw-w)/2.0,y-(dh-h)*focus,width=dw,height=dh,mask='auto'); c.restoreState()
def grad(x,y,w,band,fade,amax=0.86,up=False):
    c.setFillColor(INK)
    if up:
        st=40; sh=fade/st
        for i in range(st): c.setFillAlpha(amax*(i/(st-1))**1.7); c.rect(x,y+band+i*sh,w,sh+0.8,fill=1,stroke=0)
        c.setFillAlpha(amax); c.rect(x,y,w,band,fill=1,stroke=0)
    else:
        c.setFillAlpha(amax); c.rect(x,y,w,band,fill=1,stroke=0)
        st=40; sh=fade/st
        for i in range(st): c.setFillAlpha(amax*(1-i/(st-1))**1.6); c.rect(x,y+band+i*sh,w,sh+0.8,fill=1,stroke=0)
    c.setFillAlpha(1)
def topdark(amax=0.6,h=140):
    st=42; sh=h/st
    for i in range(st):
        c.setFillColor(INK); c.setFillAlpha(amax*((i+1)/st)**1.3); c.rect(0,PH-h+i*sh,PW,sh+0.8,fill=1,stroke=0)
    c.setFillAlpha(1)
def trk(x,y,t,sz,col,track=2.0,fn='HkSB',al='l'):
    t=t.upper(); tw=c.stringWidth(t,fn,sz)+track*max(0,len(t)-1)
    if al=='c': x=x-tw/2.0
    elif al=='r': x=x-tw
    c.saveState(); to=c.beginText(x,y); to.setFont(fn,sz); to.setFillColor(col); to.setCharSpace(track); to.textOut(t); c.drawText(to); c.restoreState()
def hair(x1,y,x2,col=HAIR,wd=0.7):
    c.setStrokeColor(col); c.setLineWidth(wd); c.line(x1,y,x2,y)
def wrap(t,x,y,mw,fn,sz,ld,col,al='l'):
    c.setFont(fn,sz); c.setFillColor(col); ln=''; out=[]
    for w in t.split():
        s=(ln+' '+w).strip()
        if c.stringWidth(s,fn,sz)<=mw: ln=s
        else: out.append(ln); ln=w
    if ln: out.append(ln)
    for L in out:
        (c.drawCentredString if al=='c' else c.drawRightString if al=='r' else c.drawString)(x,y,L); y-=ld
    return y
def flow(t,x,top,cw,gap,nc,ch,fn,sz,ld,col):
    c.setFont(fn,sz); lines=[]; ln=''
    for w in t.split():
        s=(ln+' '+w).strip()
        if c.stringWidth(s,fn,sz)<=cw: ln=s
        else: lines.append(ln); ln=w
    if ln: lines.append(ln)
    per=int(ch//ld)
    for i,L in enumerate(lines):
        ci=i//per
        if ci>=nc: break
        c.setFillColor(col); c.setFont(fn,sz); c.drawString(x+ci*(cw+gap),top-(i%per)*ld,L)
    return min(nc,(len(lines)+per-1)//per)
def kick(x,y,t,col=VOLT):
    c.setStrokeColor(VOLT); c.setLineWidth(3); c.setLineCap(0); c.line(x,y+13,x+24,y+13)
    c.setFillColor(col); c.setFont('HkSB',8.5); c.drawString(x+32,y+10,t.upper())
def voltmark(x,y,r=2.4):
    c.setFillColor(VOLT); c.rect(x,y,r*2,r*2,fill=1,stroke=0)
def cta(x,y,t,link,sz=9,inv=False,w=None):
    tt=t.upper(); w=w or c.stringWidth(tt,'HkSB',sz)+40
    if inv: c.setStrokeColor(VOLT); c.setLineWidth(1.5); c.roundRect(x,y,w,26,13,fill=0,stroke=1); tc=VOLT
    else: c.setFillColor(VOLT); c.roundRect(x,y,w,26,13,fill=1,stroke=0); tc=INK
    c.setFillColor(tc); c.setFont('HkSB',sz); c.drawString(x+16,y+8.6,tt)
    c.setFont('ClashB',12); c.drawString(x+w-19,y+8,'›')
    if link: c.linkURL(link,(x,y,x+w,y+26),relative=0,thickness=0)
    return w
def runhead(section,pg):
    c.setFillColor(INK); c.rect(0,0,PW,PH,fill=1,stroke=0)
    chrome(section,pg)
def chrome(section,pg):
    hair(MX,PH-58,PW-MX,HAIR,0.7)
    trk(MX,PH-52,"Sue's Angels FC",8.5,WHITE,1.6,'HkSB'); trk(MX+96,PH-52,"The Newsletter",8.5,MUTE,1.6,'Hk')
    trk(PW-MX,PH-52,section,8,VOLT,2.0,'HkSB',al='r')
    hair(MX,52,PW-MX,HAIR,0.7)
    trk(MX,44,"suesangelsfc.co.uk",7.5,MUTE,1.4,'Hk')
    trk(PW/2,44,"Issue %02d · %02d"%(ISSUE_N,pg),7.5,MUTE,1.6,'HkSB',al='c')
    trk(PW-MX,44,"In her name",7.5,MUTE,1.4,'Hk',al='r')
def opener(name,section,pg,focus=0.5,title_h=300):
    # clean solid header bar + full-bleed photo below
    c.setFillColor(INK); c.rect(0,0,PW,PH,fill=1,stroke=0)
    img(name,0,PH-title_h,PW,title_h,focus=focus)
    grad(0,PH-title_h,PW,140,90,amax=0.88)
    c.setFillColor(INK); c.rect(0,PH-60,PW,60,fill=1,stroke=0)
    chrome(section,pg)

# word search
random.seed(7)
WORDS=['LUWAWA','ALLEN','KNIGHT','MUNNS','OSUNKOYA','DUNKLEY','MCLANE','LLOYD','NUR','POTTER','MULLINGS','BRABROOK','CLARK','HORRILL']
N=14; grid=[['' for _ in range(N)] for _ in range(N)]
dirs=[(0,1),(1,0),(1,1),(1,-1),(0,-1),(-1,0),(-1,-1),(-1,1)]
def place(w):
    for _ in range(600):
        d=random.choice(dirs); r=random.randrange(N); cc=random.randrange(N)
        if not(0<=r+d[0]*(len(w)-1)<N and 0<=cc+d[1]*(len(w)-1)<N): continue
        if all(grid[r+d[0]*i][cc+d[1]*i] in('',w[i]) for i in range(len(w))):
            for i in range(len(w)): grid[r+d[0]*i][cc+d[1]*i]=w[i]
            return True
    return False
placed=[w for w in WORDS if place(w)]
for r in range(N):
    for cc in range(N):
        if grid[r][cc]=='': grid[r][cc]=random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

# ===================== P1 COVER =====================
c.setFillColor(INK); c.rect(0,0,PW,PH,fill=1,stroke=0)
img('hero-team.jpg',0,0,PW,PH,focus=0.40)
grad(0,0,PW,300,250,amax=0.9); topdark(0.62,160)
hair(MX,PH-66,PW-MX,VOLT,0.8)
trk(MX,PH-58,"Sue's Angels FC · The Newsletter",8.5,WHITE,1.8,'HkSB')
trk(PW-MX,PH-58,"Issue %02d · %s"%(ISSUE_N,ISSUE_DATE),8.5,SOFT,1.8,'HkSB',al='r')
c.setFillColor(WHITE); c.setFont('ClashB',fit("ANGELS",'ClashB',PW-2*MX,96)); c.drawString(MX-2,PH-152,"ANGELS")
voltmark(MX-2+c.stringWidth("ANGELS",'ClashB',c._fontsize)+8,PH-152)
trk(MX,300,"The Champions Issue",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',58); c.drawString(MX-2,236,"The Perfect")
c.setFillColor(WHITE); c.setFont('Clash',58); c.drawString(MX-2,180,"Season.")
hair(MX,158,MX+120,VOLT,1.2)
wrap("Eighteen games. Eighteen wins. Not a single defeat. The full story of the season that made history, and the woman it was all for.",MX,142,CW*0.62,'HkM',11.5,17,SOFT)
trk(MX,84,"Farewell to a captain · the season in numbers",8,SOFT,1.5,'Hk')
trk(MX,68,"For Sue · club news · what comes next",8,MUTE,1.5,'Hk')
trk(PW-MX,68,"suesangelsfc.co.uk",8,MUTE,1.6,'Hk',al='r')
c.showPage()

# ===================== P2 CONTENTS + LETTER =====================
runhead("Contents",2)
img('banner-06.jpg',0,0,232,PH,focus=0.66)
grad(0,0,232,90,150,amax=0.7); grad(0,PH-120,232,0,120,amax=0.72)
c.saveState(); c.translate(56,150); c.rotate(90)
to=c.beginText(0,0); to.setFont('Clash',46); to.setFillColor(WHITE); to.setCharSpace(4); to.textOut("CONTENTS"); c.drawText(to)
c.restoreState()
rx=270; rw=PW-MX-rx
trk(rx,PH-92,"In this issue",9,VOLT,2.2,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',30); c.drawString(rx,PH-126,"Issue One")
iy=PH-168
items=[("01","The perfect season","The unbeaten title run"),("02","The season in numbers","Six figures that defined it"),("03","Club news","Farewells to two of our own"),("04","For Sue","The story behind the badge"),("05","What's next","Pre-season and League Eight"),("06","The fan zone","Word search, quiz and predictions")]
for n,t,d in items:
    hair(rx,iy+22,PW-MX,HAIR,0.7)
    trk(rx,iy,n,9,VOLT,1.5,'HkSB')
    c.setFillColor(WHITE); c.setFont('Clash',14.5); c.drawString(rx+34,iy+2,t)
    trk(rx+34,iy-13,d,7.5,MUTE,1.2,'Hk')
    iy-=46
ly=iy-14; trk(rx,ly,"Letter from the club",9,VOLT,2.2,'HkSB')
ly=wrap("Welcome to the very first issue. What a season to begin with. This is a club built on something far bigger than football, in memory of a woman who meant the world to us, and every page that follows is part of keeping her close. Thank you for being here. It means more than you know.",rx,ly-26,rw,'Hk',10.3,16.5,SOFT)
c.setFillColor(WHITE); c.setFont('Clash',15); c.drawString(rx,ly-6,"In her name.")
trk(rx,ly-22,"Sue's Angels FC",7.5,MUTE,1.4,'Hk')
c.showPage()

# ===================== P3 FEATURE =====================
opener('banner-05.jpg',"The season",3,focus=0.5)
trk(MX,PH-300+96,"Season Review",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',46); c.drawString(MX-2,PH-300+50,"The Perfect")
c.setFillColor(WHITE); c.setFont('Clash',46); c.drawString(MX-2,PH-300+8,"Season.")
sby=PH-300-78
trk(MX,sby+48,"The campaign in five",8,MUTE,2.0,'HkSB')
st=[("18","Played"),("18","Won"),("0","Drawn"),("0","Lost"),("100%","Win rate")]
seg=CW/len(st)
for i,(b,s) in enumerate(st):
    sx=MX+seg*i
    c.setFillColor(VOLT); c.setFont('Clash',30 if len(b)<4 else 22); c.drawString(sx,sby+16,b)
    trk(sx,sby+4,s,7,SOFT,1.2,'HkSB')
hair(MX,sby-8,PW-MX,HAIR,0.7)
ty=sby-34
ty=wrap("Eighteen played. Eighteen won. Not a single defeat. How Sue's Angels turned a debut campaign into history, and did it all in her name.",MX,ty,CW,'HkM',13,18.5,WHITE)
body=("n our very first campaign in the Southern Sunday Football League, Sue's Angels did not just compete in League Ten, we won it, and we won every single game on the way. Up front we were ruthless, with thirty-one goals from our top scorer alone. At the back we grew more stubborn every week. A group who barely knew one another in August became, by spring, a team that did not know how to lose. The table only says so much. What this season really proved is what people can build when they play for a reason. Every win was for Sue, and every performance carried her name a little further. Promotion to League Eight is the reward, and the real test starts now.")
c.setFillColor(VOLT); c.setFont('Clash',40); c.drawString(MX,ty-44,"I")
flow(body,MX+30,ty-20,(CW-30-26)/2,26,2,150,'Hk',9.8,14.6,SOFT)
pq=ty-20-150-8
c.setStrokeColor(VOLT); c.setLineWidth(2.4); c.line(MX,pq+12,MX,pq-30)
wrap("“For a first season, it is just about flawless.”",MX+18,pq,CW-18,'Clash',22,26,WHITE)
csy=70
trk(MX,csy+58,"Golden boots · leading scorers",8,VOLT,2.0,'HkSB'); hair(MX,csy+48,PW-MX,HAIR,0.7)
sc=[("31","Osunkoya"),("24","Dunkley"),("17","Potter"),("10","McLane"),("9","Mullings")]
sgp=CW/len(sc)
for i,(g,nm) in enumerate(sc):
    sx=MX+sgp*i
    c.setFillColor(VOLT); c.setFont('Clash',28); c.drawString(sx,csy+18,g); trk(sx,csy+6,nm,7,SOFT,1.0,'HkSB')
c.showPage()

# ===================== P4 BY THE NUMBERS =====================
runhead("By the numbers",4)
trk(MX,PH-92,"The season in six",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',46); c.drawString(MX-2,PH-136,"By The Numbers")
wrap("A flawless campaign, told through the six figures that came to define it.",MX,PH-160,CW*0.8,'HkM',11.5,17,SOFT)
nums=[("18","Wins from eighteen games, a perfect record."),("0","Defeats all season, unbeaten throughout."),("31","Goals from our top scorer, Frazier Osunkoya."),("100%","Win rate across the League Ten campaign."),("1","Title, and promotion at the first attempt."),("30","Appearances for our ever-present, Stewart Luwawa.")]
cwd=(CW-2*26)/3.0; chh=226
for i,(n,d) in enumerate(nums):
    col=i%3; row=i//3; gx=MX+col*(cwd+26)
    gy=(PH-210-chh) if row==0 else (PH-210-chh-26-chh)
    hair(gx,gy+chh,gx+cwd,VOLT,1.2)
    trk(gx,gy+chh-22,"%02d"%(i+1),7.5,MUTE,1.6,'HkSB')
    c.setFillColor(WHITE); c.setFont('Clash',fit(n,'Clash',cwd,66)); c.drawString(gx-1,gy+chh-118,n)
    hair(gx,gy+66,gx+cwd,HAIR,0.7); wrap(d,gx,gy+50,cwd,'Hk',9.6,14,SOFT)
c.showPage()

# ===================== P5 CLUB NEWS (auto-filled from latest articles) =====================
opener('banner-01.jpg',"Club news",5,focus=0.82,title_h=232)
def _cl(t): return ' '.join((t or '').split())
main=NEWS[0] if NEWS else {'title':'The latest from the club','date':ISSUE_DATE,'lede':"Catch up on all the latest from Sue's Angels FC at suesangelsfc.co.uk/news."}
mt=_cl(main.get('title')); ml=_cl(main.get('lede'))
_qm=_re.search('[“"]([^”"]{30,175})[”"]',ml)
quote=_qm.group(1) if _qm else None
body=ml.replace(_qm.group(0),'').strip() if _qm else ml
trk(MX,PH-232+72,"Club news · "+_cl(main.get('date') or ISSUE_DATE),9,VOLT,2.4,'HkSB')
_hsz=fit(mt,'Clash',CW,34,24)
if _hsz<26:
    _hb=wrap(mt,MX-2,PH-232+46,CW,'Clash',26,28,WHITE); ty=_hb-18
else:
    c.setFillColor(WHITE); c.setFont('Clash',_hsz); c.drawString(MX-2,PH-232+26,mt); ty=PH-232-30
flow(body,MX,ty,(CW-26)/2,26,2,138,'Hk',9.8,14.6,SOFT)
ny=ty-150
if quote:
    c.setStrokeColor(VOLT); c.setLineWidth(2.4); c.line(MX,ny+12,MX,ny-44)
    ny=wrap('“'+quote+'”',MX+18,ny,CW-18,'Clash',17,22,WHITE)-14
if len(NEWS)>1:
    s2=NEWS[1]; st=_cl(s2.get('title')); sl=_cl(s2.get('lede')); sl=(sl[:300].rsplit(' ',1)[0]+'\u2026') if len(sl)>300 else sl
    wy=ny-10; wh=112
    if wy-wh>72:
        c.setFillColor(CARD); c.roundRect(MX,wy-wh,CW,wh,8,fill=1,stroke=0); hair(MX+22,wy,MX+62,VOLT,1.4)
        trk(MX+22,wy-24,"Also this month",8,VOLT,2.0,'HkSB')
        c.setFillColor(WHITE); c.setFont('Clash',fit(st,'Clash',CW-44,18,13)); c.drawString(MX+20,wy-46,st)
        wrap(sl,MX+22,wy-64,CW-44,'Hk',9.2,13.5,SOFT); ny=wy-wh
ry=ny-30
if ry>74:
    hair(MX,ry+18,PW-MX,HAIR,0.7); trk(MX,ry,"More from the club",8.5,VOLT,2.0,'HkSB')
    c.setFillColor(SOFT); c.setFont('Hk',9.5); c.drawString(MX+172,ry-1,"Read every story at suesangelsfc.co.uk/news")
c.showPage()

# ===================== P6 FOR SUE =====================
opener('banner-08.jpg',"The cause",6,focus=0.62)
trk(MX,PH-300+98,"Why we play",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',60); c.drawString(MX-2,PH-300+42,"For Sue.")
trk(MX,PH-300+22,"In memory of Susan Anne Martin",8.5,SOFT,1.8,'Hk')
ty=PH-300-34
ty=wrap("Every club has a reason it exists. Ours has a name. Sue's Angels was founded in memory of Susan Anne Martin, and we carry her with us into every match and every season. Playing in her name is how we keep her close, and how we turn something that hurt into something good.",MX,ty,CW,'Hk',10.6,16.5,SOFT)
ty=wrap("We also play to talk about sepsis, because knowing the signs saves lives. It can affect anyone, and it can move quickly, so the kindest thing any of us can do is learn to spot it. If someone you love seems suddenly and seriously unwell, trust your instinct and ask the question: could this be sepsis? Then call 999 or NHS 111. Knowing to ask is a small thing that can change everything.",MX,ty-9,CW,'Hk',10.6,16.5,SOFT)
sky=ty-30; trk(MX,sky,"Know the signs of sepsis",9,VOLT,2.2,'HkSB'); hair(MX,sky-10,PW-MX,HAIR,0.7)
signs=["Slurred speech or sudden confusion","Extreme shivering or muscle pain","Passing no urine in a day","Severe breathlessness, breathing fast","“It feels like I might die”","Skin mottled, bluish or pale"]
gw=CW/2.0; srow=30
for i,s in enumerate(signs):
    col=i%2; row=i//2; gx=MX+col*gw; gy=sky-38-row*srow
    voltmark(gx,gy-1,2.2); c.setFillColor(SOFT); c.setFont('HkM',10); c.drawString(gx+14,gy-3,s)
last_sign=sky-38-2*srow; dph=96; dpy=last_sign-36-dph
c.setFillColor(CARD); c.roundRect(MX,dpy,CW,dph,8,fill=1,stroke=0); hair(MX+22,dpy+dph,MX+62,VOLT,1.4)
trk(MX+22,dpy+dph-26,"Back the cause",8,VOLT,2.0,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',24); c.drawString(MX+20,dpy+dph-58,"Give in her memory.")
trk(MX+22,dpy+18,"The club, or the UK Sepsis Trust, at suesangelsfc.co.uk",7.5,MUTE,1.2,'Hk')
c.setFillColor(VOLT); c.roundRect(PW-MX-150,dpy+dph/2-14,150,28,14,fill=1,stroke=0)
c.setFillColor(INK); trk(PW-MX-150+18,dpy+dph/2-4.5,"Donate now",8.5,INK,1.4,'HkSB'); c.setFont('ClashB',12); c.drawString(PW-MX-24,dpy+dph/2-5,'›')
c.linkURL("https://www.suesangelsfc.co.uk/sepsis.html#give",(PW-MX-150,dpy+dph/2-14,PW-MX,dpy+dph/2+14),relative=0,thickness=0)
c.showPage()

# ===================== P7 WHAT'S NEXT =====================
runhead("What's next",7)
trk(MX,PH-92,"The road ahead",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',fit("Up To League Eight.",'Clash',CW,46)); c.drawString(MX-2,PH-136,"Up To League Eight.")
wrap("Promotion earned, the boots are back out, and a tougher league awaits.",MX,PH-160,CW*0.82,'HkM',11.5,17,SOFT)
by=PH-360; bh=170; halfw=CW*0.5-10
img('banner-10.jpg',MX+halfw+20,by,halfw,bh,focus=0.5,radius=8)
trk(MX,by+bh-6,"In the diary",9,VOLT,2.2,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',fit("24 June",'Clash',halfw,56)); c.drawString(MX-2,by+bh-78,"24 June")
wrap("Our first pre-season session, 7:00pm at The Reeves. Then every Sunday morning, 10:00 to 12:30. New faces always welcome.",MX,by+bh-104,halfw,'Hk',10,15,SOFT)
ky=by-30; trk(MX,ky,"Key dates",9,VOLT,2.2,'HkSB')
dd=[("Wed 24 June","Pre-season begins, 7:00pm at The Reeves"),("Sundays after","Training, 10:00 to 12:30, home ground"),("Over the summer","The 26/27 League Eight fixtures are released"),("This autumn","League Eight kicks off, and we go again")]
dy=ky-26
for a,b in dd:
    hair(MX,dy+16,PW-MX,HAIR,0.7)
    voltmark(MX,dy-1,2.2); c.setFillColor(WHITE); c.setFont('HkSB',10.5); c.drawString(MX+14,dy-3,a)
    c.setFillColor(MUTE); c.setFont('Hk',10); c.drawString(MX+170,dy-3,b); dy-=30
fy=dy-12
img('banner-07.jpg',MX,fy-150,CW,150,focus=0.4,radius=8)
grad(MX,fy-150,CW,48,40,amax=0.82); c.saveState(); p=c.beginPath(); p.roundRect(MX,fy-150,CW,150,8); c.clipPath(p,stroke=0)
trk(MX+20,fy-150+30,"Never miss a kick",8,VOLT,2.0,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',17); c.drawString(MX+18,fy-150+10,"Every fixture, at suesangelsfc.co.uk")
c.restoreState()
c.setStrokeColor(VOLT); c.setLineWidth(1.4); c.roundRect(PW-MX-148,fy-150+15,134,26,13,fill=0,stroke=1)
trk(PW-MX-148+14,fy-150+23,"The fixtures",8,VOLT,1.4,'HkSB'); c.setFillColor(VOLT); c.setFont('ClashB',11); c.drawString(PW-MX-30,fy-150+22,'›')
c.linkURL("https://www.suesangelsfc.co.uk/fixtures.html",(PW-MX-148,fy-150+15,PW-MX-14,fy-150+41),relative=0,thickness=0)
c.showPage()

# ===================== P8 THE FAN ZONE (redesigned) =====================
runhead("Fan zone",8)
trk(MX,PH-92,"Half-time",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',46); c.drawString(MX-2,PH-136,"The Back Pages.")
wrap("A few minutes of fun for the supporters. Find the squad, take the quiz, and tell us how you think 26/27 will go.",MX,PH-160,CW,'HkM',11,16,SOFT)
# LEFT: word search card
gwm=CW*0.52; cell=15.4; gs=N*cell; pad=18
cx0=MX; cy0=PH-208-(gs+pad*2)
trk(cx0,cy0+gs+pad*2+12,"Word search · find the squad",8.5,VOLT,2.0,'HkSB')
c.setFillColor(WHITE); c.roundRect(cx0,cy0,gs+pad*2,gs+pad*2,10,fill=1,stroke=0)
gx=cx0+pad; gy=cy0+pad
c.setStrokeColor(HexColor('#E6E9DE')); c.setLineWidth(0.4)
for i in range(N+1): c.line(gx+i*cell,gy,gx+i*cell,gy+gs); c.line(gx,gy+i*cell,gx+gs,gy+i*cell)
c.setFillColor(INK); c.setFont('HkM',9.2)
for r in range(N):
    for cc in range(N): c.drawCentredString(gx+cc*cell+cell/2,gy+(N-1-r)*cell+cell/2-3.2,grid[r][cc])
# squad list under grid (3 cols)
lcols=3; lrows=(N+lcols-1)//lcols; lw=(gs+pad*2)/lcols
for i,w in enumerate(placed):
    col=i%lcols; row=i//lcols; trk(cx0+col*lw, cy0-16-row*15, w,7.4,SOFT,0.8,'HkM')
# RIGHT: quiz + predictions
rx=cx0+gs+pad*2+28; rw=PW-MX-rx
trk(rx,cy0+(gs+pad*2)+12,"The quiz",9,VOLT,2.0,'HkSB')
qty=cy0+(gs+pad*2)-16
qs=["In whose memory was the club founded?","Which league did we win first?","How many games did we win?","Which league do we play in now?","Who was our top scorer?","Which cause do we support?"]
for i,q in enumerate(qs):
    hair(rx,qty-i*30+12,PW-MX,HAIR,0.6)
    c.setFillColor(VOLT); c.setFont('Clash',13); c.drawString(rx,qty-i*30,"%d"%(i+1))
    c.setFillColor(SOFT); c.setFont('Hk',9.4); wrap(q,rx+22,qty-i*30,rw-22,'Hk',9.4,12,SOFT)
# BOTTOM: predict 26/27
py=cy0-16-15*lrows-26
trk(MX,py,"Over to you · predict 26/27",9,VOLT,2.2,'HkSB'); hair(MX,py-10,PW-MX,HAIR,0.7)
preds=[("Where will we finish?",""),("Who'll be top scorer?",""),("One to watch?",""),("Biggest game of the season?","")]
pw=CW/2.0
for i,(q,_) in enumerate(preds):
    col=i%2; row=i//2; qx=MX+col*pw; qy=py-34-row*44
    c.setFillColor(WHITE); c.setFont('HkSB',10.5); c.drawString(qx,qy,q)
    hair(qx,qy-18,qx+pw-30,VOLT,1)
c.setFillColor(MUTE); c.setFont('Hk',9)
c.drawString(MX,py-34-2*44-6,"Tag us with your answers and your finished grid")
trk(MX+232,py-34-2*44-6,"@suesangelsfc",8.5,VOLT,1.4,'HkSB')
c.showPage()

# ===================== P9 BACK COVER =====================
c.setFillColor(INK); c.rect(0,0,PW,PH,fill=1,stroke=0)
img('banner-12.jpg',0,330,PW,PH-330,focus=0.4)
grad(0,330,PW,150,130,amax=0.9); topdark(0.55,120)
hair(MX,PH-66,PW-MX,VOLT,0.8)
trk(MX,PH-58,"Sue's Angels FC · The Newsletter",8.5,WHITE,1.8,'HkSB'); trk(PW-MX,PH-58,"Issue %02d"%ISSUE_N,8.5,SOFT,1.8,'HkSB',al='r')
trk(MX,288,"In her name",9,VOLT,2.6,'HkSB')
c.setFillColor(WHITE); c.setFont('Clash',54); c.drawString(MX-2,232,"Up the Angels.")
hair(MX,210,MX+120,VOLT,1.2)
wrap("Champions, unbeaten, and only just getting started. If this season meant something to you, stay with us a while longer, and help us carry Sue's story a little further.",MX,192,CW*0.74,'HkM',11.5,17,SOFT)
yy=132
for h,d in [("Donate","suesangelsfc.co.uk/donate"),("Follow","Instagram & TikTok @suesangelsfc"),("Join","The supporters' list, for news and fixtures")]:
    trk(MX,yy,h,8.5,VOLT,2.0,'HkSB'); c.setFillColor(SOFT); c.setFont('Hk',10); c.drawString(MX+58,yy-1,d); yy-=20
hair(MX,60,PW-MX,HAIR,0.7)
try: c.drawImage('assets/badge/sue-angels-badge.png',MX,18,width=32,height=32,mask='auto',preserveAspectRatio=True)
except Exception: pass
trk(MX+42,38,"Sue's Angels FC",9,WHITE,1.4,'HkSB'); trk(MX+42,26,"What we do in life echoes in eternity",7.5,MUTE,1.2,'Hk')
trk(PW-MX,32,ISSUE_DATE,7.5,MUTE,1.6,'HkSB',al='r')
c.showPage()
c.save(); print("WROTE",OUT)
