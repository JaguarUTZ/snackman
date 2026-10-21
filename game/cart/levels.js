/* Snackman levels, UX rework (branch snackman-ux). Phone-first: 3 short levels (~30 s each), each teaches ONE chunk of the
   business (one big line at the start, one takeaway card at the end), the cash-in/hoard depot between levels, and the secret
   Master Level. AUTOPLAY: tap ▶ WATCH (always visible) or make no progress for 8 s and Snackman steers itself along the pellet
   path with 2-3 caption beats. On-screen numbers are sourced or labelled ESTIMATE/EXAMPLE; game sats are pretend.
   Keeps the API used by levels.html: SnackGame.open/close/s, onSave checkpoints (per-code save), rec (depot record). */
(function(){
'use strict';
const COLS=11,ROWS=9,TIME=30,IDLE=8,CAP=4;
const LV=[
 {n:1,key:'sort',icons:'🌊 → 🧴🪣 · 🛍️🍬',
  hint0:'🧴🪣 → 🧼🧱 · 🛍️🍬 → 🚫',
  item:'🧴',ghost:['🦠','DIRT','#8a5a2a'],pSp:6.5,gSp:2.8,wall:'#2121de',fill:'#050524',river:true,
  map:["###########","#G b f t w#","# ## # ## #","#f b # w t#","## # P # ##","#t w # b f#","# ## # ## #","#b f t b b#","###########"],
  end:{icons:'🧴🪣 → 🧼 → 🧱<br>🛍️🍬 → 🚫'}},
 {n:2,key:'wah',icons:'🚫 🛍️🍬 → 🎺 … 🔥',
  item:'🧴',ghost:['🎺','WAH WAH','#6a6a8a'],pSp:6.5,gSp:3.1,wall:'#3fe36a',fill:'#03180a',
  map:["###########","#x . o . x#","# # ### # #","#. x   x .#","### #P# ###","#x   .   x#","# # ### # #","#. x . x G#","###########"],
  end:{icons:'🛍️ → 🔥 → 🛢️ ⚡'}},
 {n:3,key:'chain',icons:'🧴 → ⚡🏭 → 🏪 🛒',
  item:'🧴',ghost:['🧾','BILL','#fc9838'],pSp:6.8,gSp:3.2,wall:'#fc9838',fill:'#1a0a00',
  map:["###########","#. . S . .#","# ## # ## #","#.   .   .#","## # P # ##","#.   #   .#","# ## # ## #","#. . G . .#","###########"],
  end:{icons:'🧴 → ⚡🏭 → 🏪 → 🛒',x:1}},
 {n:4,key:'master',icons:'🏪 → 🧴🧴🧴 → 🔁',
  item:'🧴',ghost:['🛒','CART','#ffb8ff'],pSp:6.8,gSp:3.4,wall:'#ffd400',fill:'#1a1400',
  map:["###########","#. . . . G#","# ## # ## #","#. . # . .#","## # P # ##","#. . # . .#","# ## # ## #","#. . . . .#","###########"]}];
/* i18n: player-facing level text lives in game/shared/i18n/strings.js (lvN.kick/title/line/hint/cap0-2/endH/endT/endX) */
const T=(k,v)=>{try{return window.SNK?SNK.t(k,v):k}catch(e){return k}};
LV.forEach(o=>{const p='lv'+o.n+'.',g=(f,fn)=>Object.defineProperty(o,f,{get:fn,configurable:true});
 g('kick',()=>T(p+'kick'));g('title',()=>T(p+'title'));g('line',()=>T(p+'line'));g('hint',()=>o.hint0||T(p+'hint'));g('caps',()=>[0,1,2].map(i=>T(p+'cap'+i)));
 if(o.end){const e=o.end,x=e.x;Object.defineProperty(e,'h',{get:()=>T(p+'endH')});Object.defineProperty(e,'t',{get:()=>T(p+'endT')});Object.defineProperty(e,'x',{get:()=>x?T(p+'endX'):''})}});
const REG=3;
const TYPE={b:'🧴',t:'🪣',f:'🛍️',w:'🍬'},RIGID='bt',PILE0=7; /* L1 river mix: rigid (bottle, tub) → wash → concrete plastic; film + wrapper → the can't-recycle pile that L2 inherits */
const DIR={L:[-1,0],R:[1,0],U:[0,-1],D:[0,1]};
const $=s=>document.getElementById(s);
const hasSnd=()=>typeof snd!=='undefined'&&snd&&typeof AC!=='undefined'&&AC;
const B=(f,d,w,t,v)=>{try{if(hasSnd())beep(f,d,w,t,v)}catch(e){}};
const PL=(n,v)=>{try{if(hasSnd())play(n,v)}catch(e){}};
const va=n=>{try{window.va&&window.va('event',{name:'rm2_'+n})}catch(e){}};
const RESIN=['#6fe7ff','#3fe36a','#ffd400','#ff6fd0','#fc9838','#fcfcfc','#b58cff'];
const EMO='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

let M=[],L=null,li=0,score=0,lvStart=0,state='off',stT=0,items=0,left=0,eaten=0,tLeft=TIME,idle=0,auto=false,capI=-1,fire=false,carry=0,credit=0,
 unlocked=false,raf=0,last=0,ts=30,dpr=1,cx=null,cv=null,pops=[],conf=[],pausedFrom='',wahT=0,hitT=0,sx=5,sy=4,gsx=1,gsy=1,store=null,wakaT=0,mouth=0,rigid=0,pile=0;
const P={x:5,y:4,dx:0,dy:0,want:null,face:1};const G={x:1,y:1,dx:0,dy:0};

function build(){M=L.map.map(r=>r.split(''));items=0;store=null;
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const ch=M[r][c];
  if(ch==='P'){sx=c;sy=r;M[r][c]=' '}else if(ch==='G'){gsx=c;gsy=r;M[r][c]=' '}else if(ch==='S'){store=[c,r];M[r][c]=' '}
  else if('.xobtfw'.includes(ch)){items++;M[r][c]={t:ch}}}
 left=items;eaten=0}
function cell(c,r){if(r<0||r>=ROWS||c<0||c>=COLS)return'#';return M[r][c]}
const open_=(c,r)=>cell(c,r)!=='#';
function resetActors(){P.x=sx;P.y=sy;P.dx=P.dy=0;P.want=null;P.face=-1;G.x=gsx;G.y=gsy;G.dx=G.dy=0}
function startLevel(i,keepScore){if(i>=2)return window.HWLevelGate&&HWLevelGate.enter("snackman",i+1,()=>hwStartLevel(i,keepScore));return hwStartLevel(i,keepScore)}
function hwStartLevel(i,keepScore){li=i;L=LV[i];build();if(L.key==='sort'){rigid=0;pile=0}if(L.key==='wah'&&!pile)pile=PILE0;if(!keepScore)score=lvStart;lvStart=score;tLeft=TIME;idle=0;fire=false;carry=0;credit=0;pops=[];conf=[];
 setAuto(false);resetActors();resize();hud();showIntro();sv()}
function sv(x){try{window.SnackGame.onSave&&SnackGame.onSave(Object.assign({level:li,score:lvStart,master:unlocked||li>=REG},x))}catch(e){}}
/* ---------- grid movement ---------- */
function atC(e){return Math.abs(e.x-Math.round(e.x))<1e-6&&Math.abs(e.y-Math.round(e.y))<1e-6}
function snap(e){e.x=Math.round(e.x);e.y=Math.round(e.y)}
function move(e,sp,dt,decide,onC){let d=sp*dt,guard=0;
 while(d>1e-9&&guard++<8){if(atC(e)){snap(e);decide(e);if(!e.dx&&!e.dy)return}
  const n=e.dx?(e.dx>0?Math.floor(e.x+1e-9)+1:Math.ceil(e.x-1e-9)-1):(e.dy>0?Math.floor(e.y+1e-9)+1:Math.ceil(e.y-1e-9)-1);
  const dist=Math.abs(n-(e.dx?e.x:e.y)),m=Math.min(d,dist);e.x+=e.dx*m;e.y+=e.dy*m;d-=m;if(m<dist-1e-9)break;
  snap(e);if(onC){onC(e);if(state!=='play')return}}}
function pDecide(e){if(auto)e.want=autoDir();const w=e.want,c=Math.round(e.x),r=Math.round(e.y);
 if(w&&open_(c+w[0],r+w[1])){e.dx=w[0];e.dy=w[1]}else if(!open_(c+e.dx,r+e.dy)){e.dx=0;e.dy=0}if(e.dx)e.face=e.dx}
function gDecide(g){const c=Math.round(g.x),r=Math.round(g.y);
 const all=Object.values(DIR).filter(d=>open_(c+d[0],r+d[1]));let opts=all.filter(d=>!(d[0]===-g.dx&&d[1]===-g.dy&&(g.dx||g.dy)));if(!opts.length)opts=all;
 let pick=opts[Math.random()*opts.length|0];
 if(Math.random()>.35){let best=1e9;opts.forEach(d=>{const dd=(c+d[0]-P.x)**2+(r+d[1]-P.y)**2;if(dd<best){best=dd;pick=d}})}
 g.dx=pick[0];g.dy=pick[1]}
/* ---------- autoplay: BFS along the pellet path to the next useful tile, stepping around the ghost ---------- */
function wantStore(){return L.key==='chain'&&store&&(carry>=CAP||(left===0&&carry>0))}
function isTarget(c,r){if(wantStore())return c===store[0]&&r===store[1];const ch=M[r][c];return !!ch&&typeof ch==='object'&&!(ch.t==='x'&&!fire)}
function autoDir(){const pc=Math.round(P.x),pr=Math.round(P.y),gc=Math.round(G.x),gr=Math.round(G.y);
 const bfs=avoid=>{const seen=new Map([[pc+','+pr,null]]),q=[[pc,pr]];
  while(q.length){const [x,y]=q.shift();if(!(x===pc&&y===pr)&&isTarget(x,y)){let k=x+','+y,f=null;while(seen.get(k)){f=seen.get(k);k=f.p}return f&&DIR[f.d]}
   for(const d in DIR){const nx=x+DIR[d][0],ny=y+DIR[d][1],k=nx+','+ny;if(!open_(nx,ny)||seen.has(k))continue;
    if(avoid&&Math.abs(nx-gc)+Math.abs(ny-gr)<=1)continue;seen.set(k,{p:x+','+y,d});q.push([nx,ny])}}return null};
 return bfs(true)||bfs(false)}
function setAuto(on){auto=!!on;capI=-1;const w=$('gmw');if(w){w.textContent=auto?T('lv.auto'):T('lv.watch');w.classList.toggle('on',auto)}
 if(!auto){const c=$('gmcap');if(c)c.hidden=true}else{idle=0;va('auto_'+(L&&L.key));caption()}}
function caption(){if(!auto||!L||state!=='play'&&state!=='ready')return;const f=items?eaten/items:0,i=f<.34?0:f<.7?1:2;
 if(L.key==='wah'&&!fire&&i>0)return; if(i===capI)return;capI=i;const c=$('gmcap');c.textContent=L.caps[i];c.hidden=false;c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop')}
/* ---------- eating ---------- */
function progress(){idle=0;if(auto)caption()}
function pOnC(e){const c=Math.round(e.x),r=Math.round(e.y),ch=M[r][c],now=performance.now();
 if(store&&c===store[0]&&r===store[1]&&carry>0){credit+=carry;score+=carry*40;pop('🛒 +'+carry,c,r,'#3fe36a');B(988,.08);B(1319,.2,.08);carry=0;progress();hud();done();return}
 if(!ch||typeof ch!=='object')return;
 if(ch.t==='x'&&!fire){if(now-wahT>1200){wahT=now;pop('WAH WAH 🎺',c,r,'#c9ced6');B(311,.22,0,'sawtooth',.06);B(294,.22,.24,'sawtooth',.06);B(262,.5,.48,'sawtooth',.06)}return}
 if(L.key==='chain'&&carry>=CAP){if(now-wahT>1200){wahT=now;pop(T('lv.full'),c,r,'#fc9838')}return}
 M[r][c]=' ';left--;eaten++;
 if(ch.t==='o'){fire=true;score+=50;pop(T('lv.pyroPop',{p:pile}),c,r,'#fc9838');[392,523,659,784].forEach((f,k)=>B(f,.09,k*.06,'square',.05));PL('hit',.5);capI=-1}
 else if(ch.t==='x'){score+=30;pop('🛢️+⚡',c,r,'#ffd400')}
 else if(TYPE[ch.t]){score+=10;if(RIGID.includes(ch.t)){rigid++;pop(TYPE[ch.t]+'→🧼'+(rigid%2?'':' +🧱'),c,r,'#6fe7ff')}else{pile++;pop(TYPE[ch.t]+'→🚫',c,r,'#ff8a8a')}
  if(now-wakaT>130){wakaT=now;B(mouth++%2?260:520,.07,0,'triangle',.08)}}
 else{score+=10;if(L.key==='chain')carry++;
  if(now-wakaT>130){wakaT=now;B(mouth++%2?260:520,.07,0,'triangle',.08)}}
 progress();hud();done()}
function done(){if(left<=0&&carry===0)levelClear(false)}
/* ---------- state machine ---------- */
function setState(s){state=s;stT=0}
function update(dt){stT+=dt;
 if(state==='intro'){if(stT>IDLE)watchStart();return}
 if(state==='ready'){if(stT>.7)setState('play');return}
 if(state!=='play')return;
 tLeft-=dt;idle+=dt;if(!auto&&idle>IDLE)setAuto(true);
 if(tLeft<=0){tLeft=0;levelClear(true);return}
 if(P.want&&P.want[0]===-P.dx&&P.want[1]===-P.dy&&(P.dx||P.dy)){P.dx=P.want[0];P.dy=P.want[1];if(P.dx)P.face=P.dx}
 move(P,L.pSp,dt,pDecide,pOnC);if(state!=='play')return;
 if(!P.dx&&!P.dy&&atC(P))pDecide(P);
 move(G,L.gSp,dt,gDecide);hitT-=dt;
 if(hitT<=0&&Math.abs(G.x-P.x)+Math.abs(G.y-P.y)<.7){hitT=1.2;tLeft=Math.max(0,tLeft-3);pop(L.ghost[0]+' -3s',P.x,P.y-1,'#ff5a5a');B(262,.3,0,'sawtooth',.06);PL('plop',.5);G.x=gsx;G.y=gsy;G.dx=G.dy=0;va('hit_'+L.key)}
 hud()}
function levelClear(timeout){setState('clearing');const bonus=300*L.n+Math.round(tLeft)*10;score+=bonus;const wasAuto=auto;setAuto(false);hud();
 sv({level:Math.min(li+1,REG),score,master:li>=REG-1});va('clear_'+L.key+(timeout?'_time':'')+(wasAuto?'_auto':''));
 [523,659,784,1047].forEach((f,k)=>B(f,.12,k*.11,'square',.06));
 setTimeout(()=>{if(state!=='clearing')return;if(li===REG)return final();const e=L.end,last=li===REG-1;if(last)confetti();
  const sc=score,pl=pile;card(()=>({cls:'clear take',k:(timeout?T('card.time'):'✔ ')+T('card.takeaway',{n:L.n}),h:e.h,t:'<span class="ic">'+e.icons+(L.key==='sort'?' ×'+pl:'')+'</span>'+e.t,
   x:(e.x?e.x+'<br>':'')+T('card.bonus',{b:fmt(bonus),t:fmt(sc)}),
   b:[[last?T('card.continueDepot'):T('card.nextDepot'),()=>depot(last?unlock:()=>startLevel(li+1,true)),'go'],[T('card.replay'),()=>{score=lvStart;startLevel(li)},'alt']]}))},700)}
function unlock(){unlocked=true;setState('unlock');va('master_unlock');
 [523,659,784,1047,1319,1568].forEach((f,k)=>B(f,.14,k*.09,'square',.06));setTimeout(()=>PL('hit',.8),600);
 card(()=>({cls:'unlock',k:T('card.secret'),h:T('card.unlockH'),t:'<span class="ic">🧱 🛢️ ⚡ 🛒</span>'+T('card.unlockT'),
  b:[[T('card.playMaster'),()=>{lvStart=score;startLevel(REG,true)},'go']]}));confetti()}
function final(){setState('end');va('master_win');
 [523,659,784,1047,1319,1568,2093].forEach((f,k)=>B(f,.16,k*.1,'square',.06));confetti();
 const sc=score;card(()=>({cls:'end',k:T('card.wonK'),h:T('card.wonH'),
  t:'<span class="ic">🧴 → 🧱 🛢️ ⚡ → 🛒</span>'+T('card.wonT'),x:T('card.final',{n:fmt(sc)}),
  b:[[T('card.bonus3d'),'bonus3d.html','go'],[T('card.again'),()=>{score=0;lvStart=0;startLevel(0)},'alt'],[T('card.title'),'title.html','alt']]}))}
function showIntro(){setState('intro');
 card(()=>({cls:'intro',k:L.kick+' · ⏱ 30s',h:L.line,t:'<span class="ic">'+L.icons+'</span>'+(L.key==='wah'?'<b class="y">'+T('card.fromL1',{n:pile})+'</b>':''),c:L.hint+' · '+T('card.avoid',{g:L.ghost[0]}),
  b:[[T('lv.play'),()=>{hideCard();setState('ready');B(523,.08);B(784,.1,.08)},'go'],[T('lv.watch'),watchStart,'alt']]}))}
function watchStart(){if(state==='intro'){hideCard();setState('ready')}setAuto(true)}
/* ---------- ONE REAL CHOICE (between levels): CASH IN the plastic you carried, or HOARD it for a better price.
   Hoarding raises the price each day, but the bin fills; overflow = you PAY to dump (negative price).
   All plastic prices are EXAMPLE numbers. Fact + source: Jaguar Utz Game Choices Ledger 2026-09-29 (Research fact-check). */
const DEP={p0:2,up:1,neg:-3,fmin:14,fmax:30}; /* EXAMPLE: sats per kg today, +per day hoarded, price after overflow, bin fill % per day */
const FACT=()=>'<small class="dp-f">'+T('dep.fact')+'</small>';
function depot(next){setState('depot');va('depot_'+L.key);const kg=eaten*10,from=L.key;let day=0,p=DEP.p0,fill=0,tape=[p];
 const bin=()=>'<span class="dp-bin"><i style="height:'+fill+'%;background:'+(fill>=100?'#ff5a5a':fill>60?'#fc9838':'#3fe36a')+'"></i><b>'+Math.min(100,fill)+'%</b></span>';
 const tk=()=>'<span class="dp-tk">'+tape.map((v,i)=>'<span class="'+(v<0?'neg':i===tape.length-1?'now':'')+'">'+v+'</span>').join(' ')+'<em>'+T('dep.tape')+'</em></span>';
 const rec=window.SnackGame.rec,rl=()=>rec&&rec.n?'<small class="dp-r">'+T('dep.you')+' 🛒'+(rec.cash||0)+' 🛢'+(rec.hoard||0)+' 💥'+(rec.over||0)+'</small>':'';
 const view=()=>{const v=$('dpv');if(v)v.innerHTML='<div class="dp">'+tk()+bin()+'</div><div class="dp-kg">'+T('dep.kgDay',{kg,d:day})+'</div>'+rl()};
 const done=(r,v)=>{score=Math.max(0,score+v);hud();sv({level:Math.min(li+1,REG),score,master:li>=REG-1,choice:{r,from,day,price:p,v}})};
 card(()=>({cls:'depot',k:T('dep.k'),h:'🛒💵 ? 🛢',x:'<div id="dpv"></div>',b:[[T('dep.cash'),cashIn,'go'],[T('dep.hoard'),hoard,'alt']]}),view);
 function cashIn(){const v=kg*p;done(day?'hoard':'cash',v);B(988,.08);B(1319,.2,.08);
  const sc=score,d=day,pp=p;card(()=>({cls:'clear',k:T('dep.sold',{d}),h:'+'+fmt(v)+' SATS',x:'<div class="dp">'+tk()+bin()+'</div><span class="dp-v">'+kg+' KG × '+pp+' SATS/KG <span class="ex">'+T('dep.example')+'</span><br>'+T('dep.total',{n:fmt(sc)})+'</span>',b:[[T('dep.next'),next,'go']]}))}
 function hoard(){day++;p+=DEP.up;fill+=DEP.fmin+Math.floor(Math.random()*(DEP.fmax-DEP.fmin+1));B(330+day*40,.06);
  if(fill>=100){fill=100;p=DEP.neg;tape.push(p);return overflow()}tape.push(p);view()}
 function overflow(){const v=kg*p;done('over',v);B(262,.3,0,'sawtooth',.08);B(131,.5,.25,'sawtooth',.08);
  const sc=score,pp=p;card(()=>({cls:'over dpo',k:T('dep.over'),h:'-$37.63',t:T('dep.overT'),x:'<div class="dp">'+tk()+bin()+'</div><span class="dp-v">'+fmt(v)+' SATS · '+kg+' KG × '+pp+' SATS/KG <span class="ex">'+T('dep.example')+'</span><br>'+T('dep.total',{n:fmt(sc)})+'</span>'+FACT(),b:[[T('dep.next'),next,'go']]}))}
}
/* ---------- cards ---------- */
let lastCard=null,lastAfter=null;
function card(o,after){lastCard=typeof o==='function'?o:null;lastAfter=after||null;if(lastCard)o=o();const el=$('gmcard');el.hidden=false;el.className=o.cls||'';const bx=el.querySelector('.gmc-box');
 bx.innerHTML='<p class="gmc-k">'+o.k+'</p><h3 class="gmc-h">'+o.h+'</h3>'+(o.t?'<p class="gmc-t">'+o.t+'</p>':'')+(o.x?'<p class="gmc-x">'+o.x+'</p>':'')+(o.c?'<p class="gmc-c">'+o.c+'</p>':'')+'<div class="gmc-b"></div>';
 const bb=bx.querySelector('.gmc-b');(o.b||[]).forEach(([lab,fn,cls])=>{let e;
  if(typeof fn==='string'){e=document.createElement('a');e.href=fn;e.addEventListener('click',()=>va('link_'+cls))}else{e=document.createElement('button');e.type='button';e.addEventListener('click',ev=>{ev.stopPropagation();fn()})}
  e.textContent=lab;e.className=cls||'';bb.appendChild(e)});
 bx.scrollTop=0;const f=bb.querySelector('.go')||bb.firstChild;if(f)setTimeout(()=>f.focus({preventScroll:true}),30);if(after)after()}
function hideCard(){$('gmcard').hidden=true}
function pause(){if(!['play','ready'].includes(state))return;pausedFrom=state;setState('paused');va('pause');
 card(()=>({cls:'pz',k:T('card.paused'),h:T('card.welcome'),b:[[T('card.continue'),resume,'go'],[T('card.title'),'title.html','alt']]}))}
function resume(){if(state!=='paused')return;hideCard();setState('ready')}
function confetti(){conf=[];for(let i=0;i<70;i++)conf.push({x:Math.random(),y:-Math.random()*.6,v:.12+Math.random()*.3,c:RESIN[i%7],r:Math.random()*6})}
/* ---------- drawing ---------- */
function fmt(n){return n.toLocaleString('en-US')}
function pop(s,x,y,c){pops.push({s,x,y,c,t:0})}
function txt(s,x,y,c,sz){cx.font=sz+'px "Press Start 2P",'+EMO;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#000';cx.fillText(s,x+1,y+1);cx.fillStyle=c;cx.fillText(s,x,y)}
function emo(s,x,y,sz,a){cx.globalAlpha=a==null?1:a;cx.font=sz+'px '+EMO;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(s,x,y);cx.globalAlpha=1}
function draw(now,dt){if(!cx||!L)return;const W=COLS*ts,H=ROWS*ts,t=now/1000;
 cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle='#000';cx.fillRect(0,0,W,H);
 if(L.river){cx.fillStyle='rgba(40,120,255,.28)';cx.fillRect(ts,ts,W-2*ts,ts);cx.fillStyle='rgba(120,190,255,.5)';for(let k=0;k<COLS;k++)cx.fillRect(((k*ts+t*ts*1.5)%(W-2*ts))+ts,ts*1.8,ts*.35,2)}
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const ch=M[r][c],x=c*ts,y=r*ts;
  if(ch==='#'){cx.fillStyle=L.wall;cx.fillRect(x+1,y+1,ts-2,ts-2);cx.fillStyle=L.fill;cx.fillRect(x+ts*.22,y+ts*.22,ts*.56,ts*.56)}
  else if(ch&&typeof ch==='object'){const b=1+.06*Math.sin(t*5+c+r);
   if(ch.t==='o')emo('🔥',x+ts/2,y+ts/2,ts*.72*b);
   else if(ch.t==='x')emo((c+r)%2?'🛍️':'🍬',x+ts/2,y+ts/2,ts*.6,fire?1:.4);
   else if(TYPE[ch.t])emo(TYPE[ch.t],x+ts/2,y+ts/2,ts*.58*b);
   else emo(L.item,x+ts/2,y+ts/2,ts*.55*b)}}
 if(store){const x=store[0]*ts+ts/2,y=store[1]*ts+ts/2;if(wantStore()&&(t*4|0)%2){cx.strokeStyle='#3fe36a';cx.lineWidth=3;cx.strokeRect(x-ts/2+2,y-ts/2+2,ts-4,ts-4)}emo('🏪',x,y,ts*.8)}
 {const x=G.x*ts+ts/2,y=G.y*ts+ts/2;cx.fillStyle=L.ghost[2];cx.globalAlpha=.55;cx.beginPath();cx.arc(x,y,ts*.46,0,7);cx.fill();cx.globalAlpha=1;emo(L.ghost[0],x,y,ts*.62)}
 {const x=P.x*ts+ts/2,y=P.y*ts+ts/2,R=ts*.44,moving=(P.dx||P.dy)&&state==='play',m=moving?.08+.28*Math.abs(Math.sin(t*14)):.2;
  const a=P.dx>0?0:P.dx<0?Math.PI:P.dy>0?Math.PI/2:P.dy<0?-Math.PI/2:(P.face<0?Math.PI:0);
  if(auto){cx.strokeStyle='#6fe7ff';cx.lineWidth=2;cx.beginPath();cx.arc(x,y,R+4+2*Math.sin(t*8),0,7);cx.stroke()}
  cx.fillStyle='#ffd400';cx.beginPath();cx.moveTo(x,y);cx.arc(x,y,R,a+m*Math.PI,a+(2-m)*Math.PI);cx.closePath();cx.fill();
  cx.fillStyle='#3fe36a';cx.fillRect(x-R*.7,y-R*1.05,R*1.4,R*.35);
  if(L.key==='chain'&&carry)txt('🎒'+carry,x,y-ts*.75,'#fff',Math.max(8,ts*.3|0))}
 pops=pops.filter(p=>p.t<1.3);pops.forEach(p=>{p.t+=dt;cx.globalAlpha=Math.max(0,1-p.t/1.3);txt(p.s,Math.min(W-60,Math.max(60,p.x*ts+ts/2)),p.y*ts-p.t*ts*.8,p.c,Math.max(14,ts*.34|0))});cx.globalAlpha=1;
 if(state==='ready')txt(auto?T('lv.watch'):T('lv.go'),W/2,H/2,'#ffd400',Math.max(14,ts*.5|0));
 if(conf.length&&['unlock','end','clearing'].includes(state))conf.forEach(q=>{q.y+=q.v*dt;q.r+=dt*6;if(q.y>1.05)q.y=-.05;cx.fillStyle=q.c;cx.fillRect(q.x*W,q.y*H,ts*.25,ts*.15*(1.2+Math.sin(q.r)))})}
/* ---------- HUD ---------- */
function hud(){if(!L)return;$('gmlv').textContent=L.key==='master'?'★ '+L.title:T('lv.hud',{n:L.n,t:L.title});$('gmsc').textContent=T('lv.sats',{n:fmt(score)});
 const s=Math.ceil(tLeft);$('gmli').textContent='⏱ '+s;$('gmli').className=s<=8?'lo':'';
 let st;if(L.key==='sort')st='🧼 '+rigid+' → 🧱 '+Math.floor(rigid/2)+' · 🚫 '+pile;
 else if(L.key==='wah')st=(fire?T('lv.fireOn'):T('lv.findFire',{p:pile}))+' · '+eaten+'/'+items;
 else if(L.key==='chain')st='🎒 '+carry+'/'+CAP+' · 🏪 🛒 '+credit;
 else st='🧴 '+eaten+'/'+items+' <span class="ex">'+T('lv.illu')+'</span>';
 $('gmx').innerHTML='<span class="bar"><i style="width:'+(100*tLeft/TIME)+'%;background:'+(tLeft<8?'#ff5a5a':tLeft<15?'#fc9838':'#3fe36a')+'"></i></span> '+st}
function resize(){if(!cv)return;const wr=$('gmwrap').getBoundingClientRect();ts=Math.max(16,Math.min(60,Math.floor(Math.min((wr.width-8)/COLS,(wr.height-8)/ROWS))));dpr=Math.min(3,window.devicePixelRatio||1);
 cv.style.width=COLS*ts+'px';cv.style.height=ROWS*ts+'px';cv.width=COLS*ts*dpr;cv.height=ROWS*ts*dpr}
/* ---------- loop ---------- */
function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(state!=='paused'&&!(window.HWLevelGate&&HWLevelGate.blocked))update(dt);draw(now,dt)}
/* ---------- input: keys, swipe anywhere on the play area, big pad; any human steer takes back control from autoplay ---------- */
function want(k){if(auto){setAuto(false);idle=0}P.want=DIR[k]}
const KEYS={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D',a:'L',d:'R',w:'U',s:'D',A:'L',D:'R',W:'U',S:'D'};
function onKey(e){if(!open.on)return;const k=KEYS[e.key];
 if(k&&$('gmcard').hidden){e.preventDefault();e.stopImmediatePropagation();want(k);return}
 if(k){e.preventDefault();e.stopImmediatePropagation();return}
 if(e.key==='Escape'||e.key==='p'||e.key==='P'){e.preventDefault();e.stopImmediatePropagation();state==='paused'?resume():pause();return}
 if((e.key==='Enter'||e.key===' ')&&!$('gmcard').hidden){e.stopImmediatePropagation();const a=document.activeElement;if(a&&$('gmcard').contains(a)&&(a.tagName==='BUTTON'||a.tagName==='A'))return;e.preventDefault();const b=$('gmcard').querySelector('.go');if(b)b.click();return}
 if([' ','PageDown','PageUp','Home','End'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation()}}
let sw=null;
function bindInput(){addEventListener('keydown',onKey,true);const gm=$('gm');
 gm.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,.gmc-box'))return;sw={x:e.clientX,y:e.clientY}});
 gm.addEventListener('pointermove',e=>{if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.max(Math.abs(dx),Math.abs(dy))>16){want(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'));sw={x:e.clientX,y:e.clientY}}});
 addEventListener('pointerup',()=>sw=null);addEventListener('pointercancel',()=>sw=null);
 document.querySelectorAll('#gmpad [data-d]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();want(b.dataset.d);b.classList.add('on');setTimeout(()=>b.classList.remove('on'),140)}));
 gm.addEventListener('touchmove',e=>{if(!e.target.closest('.gmc-box'))e.preventDefault()},{passive:false});
 $('gmpz').addEventListener('click',e=>{e.stopPropagation();state==='paused'?resume():pause()});
 $('gmw').addEventListener('click',e=>{e.stopPropagation();if(state==='intro'||state==='play'||state==='ready')auto&&state!=='intro'?setAuto(false):watchStart()});
 $('gmx2').addEventListener('click',e=>{e.stopPropagation();close()});
 $('gmsnd').addEventListener('click',e=>{e.stopPropagation();const s=document.getElementById('snd');if(s)s.click();sndLabel()});
 addEventListener('resize',()=>{if(open.on)resize()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&open.on)pause()})}
function sndLabel(){const on=typeof snd!=='undefined'&&snd;$('gmsnd').textContent=on?'♪ ON':'♪ OFF';$('gmsnd').setAttribute('aria-pressed',String(!!on))}
/* ---------- open / close ---------- */
let bound=false;
function open(opts){opts=opts||{};if(!bound){bound=true;cv=$('gmc');cx=cv.getContext('2d');bindInput()}
 if(!open.on){open.on=true;$('gm').hidden=false;cancelAnimationFrame(raf);last=0;raf=requestAnimationFrame(frame)}
 sndLabel();va('open_'+(opts.from||''));
 requestAnimationFrame(()=>{resize();
  if(opts.level!=null){score=lvStart=opts.score||0;startLevel(opts.level)}
  else if(!L||state==='off'||state==='end'||opts.fresh){score=0;lvStart=0;startLevel(0)}
  else hud()})}
open.on=false;
function close(){if(!open.on)return;if(['play','ready'].includes(state))pause();open.on=false;$('gm').hidden=true;cancelAnimationFrame(raf);va('close')}
/* language switch mid-game: re-render the open card, HUD, WATCH label and caption in the new language */
function relang(){if(!L)return;hud();const w=$('gmw');if(w)w.textContent=auto?T('lv.auto'):T('lv.watch');if(auto){const c=$('gmcap');if(c&&!c.hidden&&capI>=0)c.textContent=L.caps[capI]}
 if(lastCard&&!$('gmcard').hidden)card(lastCard,lastAfter)}
if(window.SNK)addEventListener('jutz:lang',relang);
window.SnackGame={open,close,
 /* read-only peek for automated tests */
 get s(){return{state,rigid,pile,level:L&&L.key,n:L&&L.n,score,eaten,items,left,auto,tLeft,carry,credit,fire,unlocked,ts,player:{x:P.x,y:P.y,dx:P.dx,dy:P.dy},ghost:{x:G.x,y:G.y},store,maze:M.map(r=>r.map(c=>typeof c==='object'?c.t:c).join(''))}}};
})();
