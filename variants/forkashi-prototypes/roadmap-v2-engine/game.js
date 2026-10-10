/* Snackman Roadmap v2: the playable levels (classic maze-chase style). Vanilla canvas, no deps.
   Uses the story page's sound helpers (snd, ensureAC, beep, play) and Snackman sprite (spr) when present. */
(function(){
'use strict';
const COLS=19,ROWS=21;
const CENTER=[
"####.### # ###.####",
"   #.#   G   #.#   ",
"####.# ##-## #.####",
"    .  #GGG#  .    ",
"####.# ##### #.####",
"   #.#       #.#   ",
"####.# ##### #.####"];
const TOPS=[
["###################","#........#........#","#o##.###.#.###.##o#","#.................#","#.##.#.#####.#.##.#","#....#...#...#....#"],
["###################","#o.......#.......o#","#.##.###.#.###.##.#","#.#.............#.#","#.#.##.#####.##.#.#","#....#...#...#....#"],
["###################","#o...#.......#...o#","#.##.#.#####.#.##.#","#.................#","#..#.###.#.###.#..#","#..#.....#.....#..#"],
["###################","#o...............o#","#.######.#.######.#","#.................#","#.######.#.######.#","#........#........#"]];
const BOTS=[
["#........#........#","#.##.###.#.###.##.#","#o.#.....P.....#.o#","##.#.#.#####.#.#.##","#....#...#...#....#","#.######.#.######.#","#.................#","###################"],
["#........#........#","#.##.###.#.###.##.#","#o.......P.......o#","###.#.#######.#.###","#.....#.....#.....#","#.###.#.###.#.###.#","#.................#","###################"],
["#....#.......#....#","#.##.#.#####.#.##.#","#o.......P.......o#","#.#.###.###.###.#.#","#.#...#.....#...#.#","#.###.#.###.#.###.#","#.................#","###################"],
["#........#........#","#.######.#.######.#","#o.......P.......o#","#.######.#.######.#","#........#........#","#.######.#.######.#","#.................#","###################"]];
/* Levels. Anything that looks like a business number is labelled EXAMPLE / ILLUSTRATION on screen. Game sats are pretend. */
const LV=[
 {n:1,key:'river',title:'RIVER PLASTIC',kick:'LEVEL 1 OF 3',
  line:'The Interceptor handed you the river. Eat every piece of plastic before it reaches the sea.',
  real:'Real challenge: the river brings new plastic every single day.',
  ghosts:[['DRIFT','#ff5a5a'],['SLICK','#ffb8ff']],pSp:6.2,gSp:3.9,fright:7,rand:.45,release:4,
  wall:'#2121de',fill:'#050524',lesson:'River: clean. In real life it fills up again tomorrow, so Snackman has to keep eating.'},
 {n:2,key:'sort',title:'SORT IT 1-7',kick:'LEVEL 2 OF 3',
  line:'Every plastic has a number from 1 to 7. Eat them all and fill every bin.',
  real:'Real challenge: mixed plastic jams the line. Types 1-7 are the real resin codes.',
  ghosts:[['JAM','#ff5a5a'],['DIRTY','#c08a3e'],['MIX','#6fe7ff']],pSp:6.6,gSp:4.7,fright:6,rand:.3,release:3.5,
  wall:'#3fe36a',fill:'#03180a',lesson:'Sorted! Each type goes to its own line: gas, concrete, or sale.'},
 {n:3,key:'cash',title:'CASH TIMING',kick:'LEVEL 3 OF 3',
  line:'The power bill comes before the buyers pay. Keep the CASH bar up: eat fast and grab the buyer coins.',
  real:'EXAMPLE: the bill lands every 30 days, some buyers pay in 60. Numbers are examples, not company data.',
  ghosts:[['BILL','#ff5a5a'],['LATE','#fc9838'],['JAM','#ffb8ff'],['DEBT','#6fe7ff']],pSp:7,gSp:5.4,fright:5,rand:.2,release:3,cash:true,
  wall:'#fc9838',fill:'#1a0a00',lesson:'You made it to payday. Pyrolysis gas cuts the power bill, so the cash lasts longer.'},
 {n:4,key:'master',title:'THE SUPERMARKET DEAL',kick:'MASTER LEVEL',
  line:'A supermarket chain sends back every bottle and wrapper it sells. Clear all the aisles.',
  real:'ILLUSTRATION: a take-back deal means a steady stream of clean plastic. No real store is named or implied.',
  ghosts:[['WRAPPER','#ff5a5a'],['CART','#ffb8ff'],['PROMO','#6fe7ff'],['RECEIPT','#fc9838']],pSp:7.3,gSp:6,fright:5,rand:.12,release:2.2,
  wall:'#ffd400',fill:'#1a1400',lesson:''}];
const REG=3; /* regular levels; LV[3] is the secret master level (unlocks only after all 3) */
const RESIN=['#6fe7ff','#3fe36a','#ffd400','#ff6fd0','#fc9838','#fcfcfc','#b58cff'];
const DIR={L:[-1,0],R:[1,0],U:[0,-1],D:[0,1]};
const $=s=>document.getElementById(s);
const hasSnd=()=>typeof snd!=='undefined'&&snd&&typeof AC!=='undefined'&&AC;
const B=(f,d,w,t,v)=>{try{if(hasSnd())beep(f,d,w,t,v)}catch(e){}};
const PL=(n,v)=>{try{if(hasSnd())play(n,v)}catch(e){}};
const va=n=>{try{window.va&&window.va('event',{name:'rm2_'+n})}catch(e){}};

let M=[],R=null,pellets=0,total=0,L=null,li=0,score=0,lvStart=0,lives=3,state='off',stT=0,lvT=0,fr=0,frK=0,cash=100,coinT=0,coinOn=0,bins=[0,0,0,0,0,0,0],pops=[],unlocked=false,raf=0,last=0,ts=20,dpr=1,cx=null,cv=null,wakaT=0,musT=0,musI=0,pausedFrom='';
const P={x:9,y:15,dx:0,dy:0,want:null,face:1,mouth:0,dead:0,sx:9,sy:15};
let G=[];

function build(i){
 const rows=TOPS[i].concat(CENTER,BOTS[i]);M=rows.map(r=>r.split(''));pellets=0;
 const spawns=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const ch=M[r][c];
  if(ch==='P'){P.sx=c;P.sy=r;M[r][c]=' '}
  else if(ch==='G'){spawns.push([c,r]);M[r][c]=r===9?'h':' '}
  else if(ch==='.'){pellets++;M[r][c]={t:'.',k:(c*7+r*3)%7}}
  else if(ch==='o'){pellets++;M[r][c]={t:'o'}}}
 total=pellets;
 /* reachable cells (for drawing wall edges only where you can walk) */
 R=new Set();const q=[[P.sx,P.sy],[9,9]];q.forEach(p=>R.add(p+''));
 while(q.length){const [x,y]=q.shift();for(const d of Object.values(DIR)){const nx=(x+d[0]+COLS)%COLS,ny=y+d[1];if(ny<0||ny>=ROWS||M[ny][nx]==='#')continue;const k=nx+','+ny;if(!R.has(k)){R.add(k);q.push([nx,ny])}}}
 spawns.sort((a,b)=>a[1]-b[1]||a[0]-b[0]); /* [9,7] outside, then [8,9],[9,9],[10,9] in the house */
 G=L.ghosts.map((g,k)=>{const s=spawns[Math.min(k,spawns.length-1)];return{name:g[0],col:g[1],sx:s[0],sy:s[1],k}});
}
function cell(c,r){if(r<0||r>=ROWS)return'#';c=((c%COLS)+COLS)%COLS;return M[r][c]}
function canP(c,r){const ch=cell(c,r);return !(ch==='#'||ch==='-'||ch==='h')}
function canG(g,c,r){const ch=cell(c,r);if(ch==='#')return false;if(ch==='-'||ch==='h')return g.st==='house';return true}
function resetActors(){
 P.x=P.sx;P.y=P.sy;P.dx=-1;P.dy=0;P.want=null;P.face=-1;P.dead=0;
 G.forEach((g,k)=>{g.x=g.sx;g.y=g.sy;g.dx=0;g.dy=0;g.st=g.sy===9?'wait':'out';g.wt=k*L.release;g.fr=false;if(g.st==='out')g.dx=-1});
 fr=0;frK=0;
}
function startLevel(i,keepScore){
 li=i;L=LV[i];build(i);if(!keepScore)score=lvStart;lvStart=score;lives=3;cash=100;coinT=0;coinOn=0;bins=[0,0,0,0,0,0,0];pops=[];lvT=0;conf=[];
 resetActors();hud();resize();showIntro();
}
/* ---------- movement (tile-centre grid movement, wraps through the side tunnel) ---------- */
function atC(e){return Math.abs(e.x-Math.round(e.x))<1e-6&&Math.abs(e.y-Math.round(e.y))<1e-6}
function snap(e){e.x=Math.round(e.x);e.y=Math.round(e.y);if(e.x<0)e.x+=COLS;if(e.x>=COLS)e.x-=COLS}
function move(e,sp,dt,decide,onC){
 let d=sp*dt,guard=0;
 while(d>1e-9&&guard++<8){
  if(atC(e)){snap(e);decide(e);if(!e.dx&&!e.dy)return}
  let dist;
  if(e.dx){const n=e.dx>0?Math.floor(e.x+1e-9)+1:Math.ceil(e.x-1e-9)-1;dist=Math.abs(n-e.x)}
  else{const n=e.dy>0?Math.floor(e.y+1e-9)+1:Math.ceil(e.y-1e-9)-1;dist=Math.abs(n-e.y)}
  const m=Math.min(d,dist);e.x+=e.dx*m;e.y+=e.dy*m;d-=m;
  if(m<dist-1e-9)break;
  snap(e);if(onC){onC(e);if(state!=='play')return}
 }
}
function pDecide(e){const w=e.want,c=Math.round(e.x),r=Math.round(e.y);
 if(w&&canP(c+w[0],r+w[1])){e.dx=w[0];e.dy=w[1]}
 else if(!canP(c+e.dx,r+e.dy)){e.dx=0;e.dy=0}
 if(e.dx)e.face=e.dx}
function pOnC(e){const c=Math.round(e.x),r=Math.round(e.y),ch=cell(c,r);
 if(ch&&typeof ch==='object'){M[r][((c%COLS)+COLS)%COLS]=' ';pellets--;
  if(ch.t==='o'){score+=50;power()}else{score+=10;if(L.key==='sort')bins[ch.k]++;if(L.cash)cash=Math.min(100,cash+1.6);
   if(performance.now()-wakaT>130){wakaT=performance.now();B(P.mouth++%2?260:520,.07,0,'triangle',.08)}}
  hud();if(pellets<=0)levelClear()}
 if(L.cash&&coinOn>0&&c===9&&r===11){coinOn=0;cash=Math.min(100,cash+45);score+=300;pop('BUYER PAID! +300',9,11,'#ffd400');B(988,.08);B(1319,.2,.08);hud()}
}
function power(){fr=L.fright;frK=0;G.forEach(g=>{if(g.st==='out'){g.fr=true;g.dx=-g.dx;g.dy=-g.dy}});pop('PYROLYSIS!',P.x,P.y-1,'#fc9838');
 [392,523,659,784].forEach((f,k)=>B(f,.09,k*.06,'square',.05));PL('hit',.5);va('power_'+L.key)}
function target(g){
 const pc=Math.round(P.x),pr=Math.round(P.y);
 if(g.st==='house')return[9,7];
 const corners=[[COLS-2,1],[1,1],[COLS-2,ROWS-2],[1,ROWS-2]];
 if((lvT%24)<4.5)return corners[g.k%4];
 if(g.k===1)return[pc+P.dx*4,pr+P.dy*4];
 if(g.k===2){const d=Math.hypot(g.x-pc,g.y-pr);return d>6?[pc,pr]:corners[2]}
 if(g.k===3)return[pc+((lvT*3|0)%7)-3,pr+((lvT*2|0)%5)-2];
 return[pc,pr]}
function gDecide(g){const c=Math.round(g.x),r=Math.round(g.y);
 if(g.st==='house'&&c===9&&r===7)g.st='out';
 const all=Object.values(DIR).filter(d=>canG(g,c+d[0],r+d[1])&&(g.st!=='out'||!['-','h'].includes(cell(c+d[0],r+d[1]))));
 let opts=all.filter(d=>!(d[0]===-g.dx&&d[1]===-g.dy&&(g.dx||g.dy)));
 if(!opts.length)opts=all;
 if(!opts.length){g.dx=g.dy=0;return}
 let pick=opts[0];
 if(g.fr||(g.st==='out'&&Math.random()<L.rand))pick=opts[Math.random()*opts.length|0];
 else{const t=target(g);let best=1e9;opts.forEach(d=>{const dd=(c+d[0]-t[0])**2+(r+d[1]-t[1])**2;if(dd<best){best=dd;pick=d}})}
 g.dx=pick[0];g.dy=pick[1]}
/* ---------- state machine ---------- */
function setState(s){state=s;stT=0}
function update(dt){
 stT+=dt;
 if(state==='ready'){if(stT>1.3)setState('play');return}
 if(state==='dying'){P.dead=stT;if(stT>1.4){if(lives<=0)gameOver();else{resetActors();setState('ready')}}return}
 if(state!=='play')return;
 lvT+=dt;
 if(P.want&&P.want[0]===-P.dx&&P.want[1]===-P.dy&&(P.dx||P.dy)){P.dx=P.want[0];P.dy=P.want[1];if(P.dx)P.face=P.dx}
 move(P,L.pSp,dt,pDecide,pOnC);
 if(state!=='play')return;
 if(fr>0){fr-=dt;if(fr<=0){fr=0;G.forEach(g=>g.fr=false)}}
 G.forEach(g=>{
  if(g.st==='wait'){g.wt-=dt;if(g.wt<=0)g.st='house';else return}
  let sp=L.gSp*(g.fr?.55:1);if(Math.round(g.y)===9&&(g.x<4||g.x>14))sp*=.6;if(g.st==='house')sp=Math.min(sp,4);
  move(g,sp,dt,gDecide);
 });
 if(L.cash){cash-=dt*3.2;coinT+=dt;if(coinT>11){coinT=0;coinOn=8;pop('A BUYER PAID!',9,10,'#ffd400')}if(coinOn>0)coinOn-=dt;
  if(cash<=0){cash=0;die('CASH CRUNCH!');return}}
 for(const g of G){if(g.st==='wait')continue;
  let dx=Math.abs(g.x-P.x);dx=Math.min(dx,COLS-dx);
  if(dx+Math.abs(g.y-P.y)<.75){
   if(g.fr){g.fr=false;g.st='wait';g.wt=3;g.x=9;g.y=9;g.dx=g.dy=0;const v=200*Math.pow(2,frK++);score+=v;pop('ROASTED +'+v,P.x,P.y,'#fc9838');B(1200,.05);B(600,.12,.05,'sawtooth',.05);va('roast')}
   else{die();return}}}
 hud();
}
function die(msg){lives--;setState('dying');B(494,.12);B(392,.12,.12);B(262,.3,.24,'sawtooth',.06);PL('plop',.6);if(msg)pop(msg,P.x,P.y-1,'#ff5a5a');if(L.cash)cash=70;hud();va('die_'+L.key)}
function levelClear(){setState('clearing');const bonus=500*L.n+lives*200;score+=bonus;hud();
 [523,659,784,1047,784,1047].forEach((f,k)=>B(f,.12,k*.11,'square',.06));va('clear_'+L.key);
 setTimeout(()=>{if(state!=='clearing')return;
  if(li===REG-1){confetti();card({cls:'win',k:'★ ★ ★',h:'YOU BEAT ALL 3 LEVELS!',t:L.lesson,x:'+'+fmt(bonus)+' SATS BONUS · TOTAL '+fmt(score)+' SATS',b:[['CONTINUE ▶',()=>unlock(),'go']]})}
  else if(li===REG)final();
  else card({cls:'clear',k:'LEVEL '+L.n+' CLEAR!',h:L.title+': DONE',t:L.lesson,x:'+'+fmt(bonus)+' SATS BONUS · TOTAL '+fmt(score)+' SATS',b:[['NEXT LEVEL ▶',()=>startLevel(li+1,true),'go'],['◀ BACK TO STORY',close,'alt']]});
 },900)}
function gameOver(){setState('over');va('over_'+L.key);
 card({cls:'over',k:'GAME OVER',h:L.cash?'THE BILL CAME FIRST.':'THE PLASTIC WON THIS ROUND.',t:'Snackman never quits. Try '+(L.key==='master'?'the aisles':'level '+L.n)+' again?',x:'SCORE '+fmt(score)+' SATS',
  b:[['↺ RETRY',()=>{score=lvStart;startLevel(li)},'go'],['SEE THE PITCH ▶','/h-680e325f4c/#pitch','pitch'],['◀ BACK TO STORY',close,'alt']]})}
function unlock(){unlocked=true;setState('unlock');va('master_unlock');
 [523,659,784,1047,1319,1568].forEach((f,k)=>B(f,.14,k*.09,'square',.06));setTimeout(()=>PL('hit',.8),600);
 card({cls:'unlock',k:'SECRET BONUS',h:'🔓 MASTER LEVEL UNLOCKED',t:'You cleaned the river, sorted 1-7 and beat the cash crunch. One more level. The one that changes everything.',
  b:[['▶ PLAY THE MASTER LEVEL',()=>{lvStart=score;startLevel(REG,true)},'go']]});confetti()}
function final(){setState('end');va('master_win');
 [523,659,784,1047,1319,1568,2093].forEach((f,k)=>B(f,.16,k*.1,'square',.06));confetti();
 card({cls:'end',k:'MASTER LEVEL CLEAR · YOU WON THE WHOLE GAME',h:'BID PLASTIC, CLEAN THE RIVER, FIX THE MONEY, FIX THE WORLD.',
  t:'<b class="y">THE MODEL:</b> rivers, streets and stores send their plastic in. Snackman turns it into concrete, fuel and power, and the power earns sats.',x:'FINAL SCORE '+fmt(score)+' SATS (GAME SATS ARE PRETEND)',
  b:[['SEE THE PITCH ▶','/h-680e325f4c/#pitch','pitch'],['PUT A BID ON PLASTIC','/plastic','alt'],['↺ PLAY AGAIN',()=>{score=0;lvStart=0;startLevel(0)},'alt'],['◀ BACK TO STORY',close,'alt']]})}
function showIntro(){setState('intro');const touch=matchMedia('(pointer:coarse)').matches;
 const gl=L.ghosts.map(g=>'<span style="color:'+g[1]+'">●'+g[0]+'</span>').join(' ');
 card({cls:'intro'+(L.key==='master'?' m':''),k:L.kick,h:L.title,t:L.line,x:'AVOID '+gl+'<br>EAT <span class="o">🔥</span> = PYROLYSIS: ROAST THEM FOR SATS<br><small>'+L.real+'</small>',
  c:touch?'SWIPE OR USE THE PAD':'ARROWS / WASD TO MOVE',b:[['▶ START',()=>{hideCard();setState('ready');B(523,.08);B(784,.1,.08)},'go']]})}
/* ---------- cards ---------- */
function card(o){const el=$('gmcard');el.hidden=false;el.className=o.cls||'';const bx=el.querySelector('.gmc-box');
 bx.innerHTML='<p class="gmc-k">'+o.k+'</p><h3 class="gmc-h">'+o.h+'</h3>'+(o.t?'<p class="gmc-t">'+o.t+'</p>':'')+(o.x?'<p class="gmc-x">'+o.x+'</p>':'')+(o.c?'<p class="gmc-c">'+o.c+'</p>':'')+'<div class="gmc-b"></div>';
 const bb=bx.querySelector('.gmc-b');(o.b||[]).forEach(([lab,fn,cls])=>{let e;
  if(typeof fn==='string'){e=document.createElement('a');e.href=fn;e.addEventListener('click',()=>va('link_'+cls))}else{e=document.createElement('button');e.type='button';e.addEventListener('click',ev=>{ev.stopPropagation();fn()})}
  e.textContent=lab;e.className=cls||'';bb.appendChild(e)});
 bx.scrollTop=0;const f=bb.querySelector('.go')||bb.firstChild;if(f)setTimeout(()=>f.focus({preventScroll:true}),30)}
function hideCard(){$('gmcard').hidden=true}
function pause(){if(!['play','ready','dying'].includes(state))return;pausedFrom=state;setState('paused');va('pause');
 card({cls:'pz',k:'❚❚ GAME PAUSED',h:'THE BUSINESS BEHIND IT',t:'WE INTERRUPT THIS GAME TO BRING YOU…',b:[['CONTINUE GAME ↺',resume,'go'],['SEE THE PITCH ▶','/h-680e325f4c/#pitch','pitch'],['◀ BACK TO STORY',close,'alt']]})}
function resume(){if(state!=='paused')return;hideCard();if(pausedFrom==='dying'){if(lives<=0){gameOver();return}resetActors()}setState(pausedFrom==='play'?'ready':'ready')}
/* ---------- confetti ---------- */
let conf=[];function confetti(){conf=[];for(let i=0;i<90;i++)conf.push({x:Math.random(),y:-Math.random()*.6,v:.12+Math.random()*.3,c:RESIN[i%7],r:Math.random()*6})}
/* ---------- drawing ---------- */
function fmt(n){return n.toLocaleString('en-US')}
function pop(s,x,y,c){pops.push({s,x,y,c,t:0})}
function txt(s,x,y,c,sz){cx.font=sz+'px "Press Start 2P",monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#000';cx.fillText(s,x+1,y+1);cx.fillStyle=c;cx.fillText(s,x,y)}
function draw(now,dt){if(!cx||!L)return;const W=COLS*ts,H=ROWS*ts,t=now/1000;
 cx.setTransform(dpr,0,0,dpr,0,0);cx.imageSmoothingEnabled=false;cx.fillStyle='#000';cx.fillRect(0,0,W,H);
 const wl=L.wall,wf=L.fill,lw=Math.max(2,ts/9|0);
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const ch=M[r][c],x=c*ts,y=r*ts;
  if(ch==='#'){cx.fillStyle=wf;cx.fillRect(x,y,ts,ts);cx.fillStyle=wl;
   const o=(dc,dr)=>{const nc=c+dc,nr=r+dr;if(nr<0||nr>=ROWS||nc<0||nc>=COLS)return false;return R.has(nc+','+nr)};
   if(o(0,-1))cx.fillRect(x,y,ts,lw);if(o(0,1))cx.fillRect(x,y+ts-lw,ts,lw);if(o(-1,0))cx.fillRect(x,y,lw,ts);if(o(1,0))cx.fillRect(x+ts-lw,y,lw,ts)}
  else if(ch==='-'){cx.fillStyle='#ffb8ff';cx.fillRect(x,y+ts/2-2,ts,3)}
  else if(ch&&ch.t==='.'){
   if(L.key==='sort')txt(String(ch.k+1),x+ts/2,y+ts/2+1,RESIN[ch.k],Math.max(6,ts*.42|0));
   else{const s=Math.max(3,ts*.2|0);cx.fillStyle=L.key==='master'?RESIN[(c+r)%7]:(L.key==='cash'?'#ffd400':'#6fe7ff');cx.fillRect(x+ts/2-s/2|0,y+ts/2-s/2|0,s,s)}}
  else if(ch&&ch.t==='o'){if((t*4|0)%2||state!=='play'){const f=typeof spr==='function'?spr('flame'+((t*10|0)%3)):null;
   if(f)cx.drawImage(f,x+ts*.12,y+ts*.05,ts*.76,ts*.9);else{cx.fillStyle='#fc9838';cx.beginPath();cx.arc(x+ts/2,y+ts/2,ts*.35,0,7);cx.fill()}}}}
 if(L.cash&&coinOn>0&&(coinOn>2||(t*6|0)%2)){const x=9*ts+ts/2,y=11*ts+ts/2;cx.fillStyle='#ffd400';cx.beginPath();cx.arc(x,y,ts*.45,0,7);cx.fill();txt('$',x,y+1,'#b05000',Math.max(6,ts*.5|0))}
 G.forEach(g=>{const x=g.x*ts+ts/2,y=g.y*ts+ts/2,Rr=ts*.48;
  let col=g.col;if(g.fr)col=(fr<1.6&&(t*6|0)%2)?'#fcfcfc':'#2121de';
  const drawG=ox=>{cx.fillStyle=col;cx.beginPath();cx.arc(x+ox,y-Rr*.1,Rr,Math.PI,0);cx.lineTo(x+ox+Rr,y+Rr*.85);
   const wv=(t*8|0)%2;for(let i=0;i<=6;i++)cx.lineTo(x+ox+Rr-(2*Rr)*i/6,y+Rr*.85-((i+wv)%2?Rr*.3:0));cx.closePath();cx.fill();
   if(g.fr){cx.fillStyle='#ffd400';cx.fillRect(x+ox-Rr*.45,y-Rr*.3,Rr*.25,Rr*.25);cx.fillRect(x+ox+Rr*.2,y-Rr*.3,Rr*.25,Rr*.25);cx.fillStyle='#fc9838';cx.fillRect(x+ox-Rr*.5,y+Rr*.3,Rr,Rr*.12)}
   else[-1,1].forEach(s=>{cx.fillStyle='#fff';cx.fillRect(x+ox+s*Rr*.38-Rr*.2,y-Rr*.45,Rr*.4,Rr*.5);cx.fillStyle='#10306a';cx.fillRect(x+ox+s*Rr*.38-Rr*.1+g.dx*Rr*.12,y-Rr*.3+g.dy*Rr*.12,Rr*.22,Rr*.26)})};
  drawG(0);if(x<Rr)drawG(W);if(x>W-Rr)drawG(-W)});
 {const x=P.x*ts+ts/2,y=P.y*ts+ts/2,S=ts*1.35;
  if(fr>0){cx.fillStyle='rgba(252,152,56,'+(.25+.15*((t*8|0)%2))+')';cx.beginPath();cx.arc(x,y,ts*.85,0,7);cx.fill()}
  if(state==='dying'){const k=Math.min(1,P.dead/1.1);cx.globalAlpha=1-k;const f=typeof spr==='function'?spr('poop'):null;if(f)cx.drawImage(f,x-S/2,y-S/2-k*ts,S,S);cx.globalAlpha=1}
  else{const moving=P.dx||P.dy,fn=moving&&state==='play'?['chomp0','chomp1','chomp2','chomp1'][(t*12|0)%4]:'chomp1';const f=typeof spr==='function'?spr(fn,P.face<0):null;
   const dr=ox=>{if(f)cx.drawImage(f,x-S/2+ox,y-S/2-ts*.1,S,S);else{cx.fillStyle='#ffd400';cx.beginPath();cx.arc(x+ox,y,ts*.45,0,7);cx.fill()}};dr(0);if(x<S/2)dr(W);if(x>W-S/2)dr(-W)}}
 pops=pops.filter(p=>p.t<1.4);pops.forEach(p=>{p.t+=dt;cx.globalAlpha=Math.max(0,1-p.t/1.4);txt(p.s,Math.min(W-70,Math.max(70,p.x*ts+ts/2)),p.y*ts-p.t*ts,p.c,Math.max(8,ts*.42|0))});cx.globalAlpha=1;
 if(state==='ready')txt('READY!',W/2,11*ts+ts/2,'#ffd400',Math.max(10,ts*.6|0));
 if(conf.length&&['unlock','end','clearing'].includes(state))conf.forEach(q=>{q.y+=q.v*dt;q.r+=dt*6;if(q.y>1.05)q.y=-.05;cx.fillStyle=q.c;cx.fillRect(q.x*W,q.y*H,ts*.3,ts*.18*(1.2+Math.sin(q.r)))});
}
/* ---------- HUD ---------- */
function hud(){if(!L)return;$('gmlv').textContent=(L.key==='master'?'MASTER':'LV '+L.n)+' · '+L.title;$('gmsc').textContent=fmt(score)+' SATS';
 $('gmli').textContent='●'.repeat(Math.max(0,lives));const x=$('gmx');
 if(L.key==='sort')x.innerHTML='BINS '+bins.map((n,i)=>'<span style="color:'+RESIN[i]+'">'+(i+1)+':'+n+'</span>').join(' ');
 else if(L.cash)x.innerHTML='CASH <span class="bar"><i style="width:'+Math.max(0,cash)+'%;background:'+(cash<25?'#ff5a5a':cash<50?'#fc9838':'#3fe36a')+'"></i></span> <span class="ex">EXAMPLE</span>';
 else x.innerHTML='PLASTIC LEFT '+pellets+' / '+total+(L.key==='master'?' · <span class="ex">ILLUSTRATION</span>':'');
}
function resize(){if(!cv)return;const wr=$('gmwrap').getBoundingClientRect();ts=Math.max(8,Math.min(36,Math.floor(Math.min((wr.width-10)/COLS,(wr.height-10)/ROWS))));dpr=Math.min(3,window.devicePixelRatio||1);
 cv.style.width=COLS*ts+'px';cv.style.height=ROWS*ts+'px';cv.width=COLS*ts*dpr;cv.height=ROWS*ts*dpr}
/* ---------- music: a tiny chiptune bass loop while playing (only when ♪ ON) ---------- */
const SONG=[131,0,196,0,165,0,196,0,110,0,165,0,147,0,196,0];
function music(dt){if(state!=='play'||!hasSnd())return;musT+=dt;if(musT>.16){musT=0;const f=SONG[musI++%SONG.length];if(f)B(f,.12,0,'triangle',.05)}}
/* ---------- loop ---------- */
function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(state!=='paused'){update(dt);music(dt)}draw(now,dt)}
/* ---------- input ---------- */
function want(k){P.want=DIR[k]}
const KEYS={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D',a:'L',d:'R',w:'U',s:'D',A:'L',D:'R',W:'U',S:'D'};
function onKey(e){if(!open.on)return;const k=KEYS[e.key];
 if(k&&$('gmcard').hidden){e.preventDefault();e.stopImmediatePropagation();want(k);return}
 if(k){e.preventDefault();e.stopImmediatePropagation();return}
 if(e.key==='Escape'||e.key==='p'||e.key==='P'){e.preventDefault();e.stopImmediatePropagation();state==='paused'?resume():pause();return}
 if((e.key==='Enter'||e.key===' ')&&!$('gmcard').hidden){e.stopImmediatePropagation();const a=document.activeElement;if(a&&$('gmcard').contains(a)&&(a.tagName==='BUTTON'||a.tagName==='A'))return;e.preventDefault();const b=$('gmcard').querySelector('.go');if(b)b.click();return}
 if([' ','PageDown','PageUp','Home','End'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation()}}
let sw=null;
function bindInput(){
 addEventListener('keydown',onKey,true);
 const wr=$('gmwrap');
 wr.addEventListener('pointerdown',e=>{sw={x:e.clientX,y:e.clientY}});
 wr.addEventListener('pointermove',e=>{if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.max(Math.abs(dx),Math.abs(dy))>18){want(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'));sw={x:e.clientX,y:e.clientY}}});
 addEventListener('pointerup',()=>sw=null);addEventListener('pointercancel',()=>sw=null);
 document.querySelectorAll('#gmpad [data-d]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();want(b.dataset.d);b.classList.add('on');setTimeout(()=>b.classList.remove('on'),140)}));
 $('gm').addEventListener('touchmove',e=>{if(!e.target.closest('.gmc-box'))e.preventDefault()},{passive:false});
 $('gmpz').addEventListener('click',e=>{e.stopPropagation();state==='paused'?resume():pause()});
 $('gmx2').addEventListener('click',e=>{e.stopPropagation();close()});
 $('gmsnd').addEventListener('click',e=>{e.stopPropagation();const s=document.getElementById('snd');if(s)s.click();sndLabel()});
 addEventListener('resize',()=>{if(open.on)resize()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&open.on)pause()});
}
function sndLabel(){const on=typeof snd!=='undefined'&&snd;$('gmsnd').textContent=on?'♪ ON':'♪ OFF';$('gmsnd').setAttribute('aria-pressed',String(!!on))}
/* ---------- open / close ---------- */
let bound=false,scY=0;
function open(opts){opts=opts||{};if(!bound){bound=true;cv=$('gmc');cx=cv.getContext('2d');bindInput()}
 if(!open.on){open.on=true;scY=scrollY;document.documentElement.classList.add('gm-on');$('gm').hidden=false;window.rmHold&&window.rmHold(true);cancelAnimationFrame(raf);last=0;raf=requestAnimationFrame(frame)}
 sndLabel();va(opts.master?'open_master':'open_'+(opts.from||''));
 requestAnimationFrame(()=>{resize();
  if(opts.master){li=REG;L=LV[REG];build(REG);resetActors();score=0;lvStart=0;lives=3;hud();unlock()}
  else if(!L||state==='off'||state==='end'||opts.fresh){score=0;lvStart=0;startLevel(0)}
  else if(state==='paused')hud();
  else if(state==='over'||state==='intro')startLevel(li,true);
  else hud()});
}
open.on=false;
function close(){if(!open.on)return;if(['play','ready','dying'].includes(state)){pausedFrom=state;setState('paused');card({cls:'pz',k:'❚❚ GAME PAUSED',h:'WELCOME BACK',t:'Your level is waiting right where you left it.',b:[['CONTINUE GAME ↺',resume,'go'],['◀ BACK TO STORY',close,'alt']]})}
 open.on=false;$('gm').hidden=true;document.documentElement.classList.remove('gm-on');cancelAnimationFrame(raf);window.rmHold&&window.rmHold(false);scrollTo(0,scY);va('close')}
window.SnackGame={open,close,
 /* read-only peek for automated tests */
 get s(){return{state,level:L&&L.key,n:L&&L.n,score,lives,pellets,total,cash,unlocked,ts,player:{x:P.x,y:P.y,dx:P.dx,dy:P.dy},ghosts:G.map(g=>({x:g.x,y:g.y,st:g.st,fr:g.fr})),maze:M.map(r=>r.map(c=>typeof c==='object'?c.t:c).join(''))}}};
})();
