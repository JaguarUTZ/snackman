/* Snackman x JaguarUTZ kit hooks: tip jar, one cosmetic paid unlock (golden Snackman skin), signed finish badge.
   kit.js loads async from https://jaguarutz-kit.vercel.app/kit.js. Every kit call here is guarded: if kit.js is missing,
   blocked or broken, the hooks stay hidden and the game plays exactly the same. No login, no player data collected.
   The unlock is cosmetic only (anyone editing the JS can fake it). It never gates a level. */
(function(){
'use strict';
var GAME='snackman',ITEM='golden-snackman',SATS=21,TOKEN='jutz:unlock:'+GAME+':'+ITEM,OFF='snackman_gold_off';
var S={owned:false,gold:false},subs=[],waiting=[],tries=0,timer=null;

function kit(){try{var J=window.JUTZ;return (typeof JUTZ!=='undefined'&&J&&typeof J.tipJar==='function')?J:null}catch(e){return null}}
function run(cb){try{cb(kit())}catch(e){try{console.warn('[snack-kit]',e)}catch(_){}}}
/* never blocks: polls for up to ~15 s, then gives up quietly */
function whenKit(cb){if(kit()){run(cb);return}waiting.push(cb);if(timer)return;
 timer=setInterval(function(){if(kit()){clearInterval(timer);timer=null;refresh();var w=waiting;waiting=[];w.forEach(run)}
  else if(++tries>60){clearInterval(timer);timer=null;waiting=[]}},250)}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}return null}
function $(x){return typeof x==='string'?document.querySelector(x):x}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

/* ---------- unlock state (localStorage token written by JUTZ.unlock) ---------- */
function owned(){var J=kit();
 if(J&&J.savedUnlock){try{return !!J.savedUnlock(GAME,ITEM,SATS)}catch(e){}}
 /* kit not loaded: trust the stored token's tags (cosmetic only, so no signature check needed offline) */
 try{var ev=JSON.parse(ls(TOKEN)||'null');if(!ev||!Array.isArray(ev.tags))return false;
  var t=function(n){var x=ev.tags.filter(function(a){return a[0]===n})[0];return x&&x[1]};
  return t('game')===GAME&&t('item')===ITEM&&Number(t('sats'))>=SATS}catch(e){return false}}
function refresh(){var o=owned(),g=o&&ls(OFF)!=='1',ch=o!==S.owned||g!==S.gold;S.owned=o;S.gold=g;
 if(ch)subs.forEach(function(f){try{f(S)}catch(e){}});return S}
function onChange(f){subs.push(f);try{f(S)}catch(e){}}

/* ---------- styles ---------- */
function css(){if(document.getElementById('sk-css'))return;var s=el('style');s.id='sk-css';s.textContent=
 '.sk-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin:6px 0}'+
 '.sk-btn,.sk-row .jutz-btn{font:400 8px/1.4 "Press Start 2P",ui-monospace,monospace;padding:7px 9px;border:2px solid #FFD400;background:#000;color:#FFD400;border-radius:0;box-shadow:none;cursor:pointer;text-decoration:none;display:inline-block;letter-spacing:0}'+
 '.sk-row .jutz-btn{border-color:#f7931a;color:#f7931a}.sk-btn:disabled{opacity:.5;cursor:default}'+
 '.sk-btn:hover,.sk-btn:focus,.sk-row .jutz-btn:hover,.sk-row .jutz-btn:focus{background:#FFD400;color:#000;outline:0;filter:none}'+
 '.sk-in{font:400 8px/1.4 "Press Start 2P",ui-monospace,monospace;padding:7px;background:#000;color:#fff;border:2px solid #555;border-radius:0;width:160px;max-width:60vw}'+
 '.sk-note{font:400 7px/1.6 "Press Start 2P",ui-monospace,monospace;color:#9a9ad0;margin:4px 0}'+
 '.sk-url{font:11px/1.3 ui-monospace,Menlo,monospace;width:100%;max-width:320px;background:#0b0b22;color:#c9ced6;border:1px solid #444;padding:4px;margin-top:6px}'+
 '.sk-end{margin-top:14px;padding-top:10px;border-top:2px dashed #333;text-align:center}';
 document.head.appendChild(s)}

/* ---------- 1. tip jar ---------- */
function tip(target){var box=$(target);if(!box)return;css();
 whenKit(function(J){if(box.querySelector('.jutz-btn'))return;J.tipJar(box,{game:GAME,label:'⚡ TIP SATS'})})}

/* ---------- 2. paid unlock: golden Snackman skin, 21 sats, cosmetic ---------- */
function skinButton(target){var box=$(target);if(!box)return;css();
 var b=el('button','sk-btn');b.type='button';b.hidden=true;box.appendChild(b);
 function paint(){if(S.owned){b.textContent='GOLD SKIN: '+(S.gold?'ON':'OFF');b.hidden=false}
  else{b.textContent='★ GOLDEN SNACKMAN · '+SATS+' SATS';b.hidden=!kit()}}
 b.addEventListener('click',function(){
  if(S.owned){ls(OFF,S.gold?'1':null);refresh();paint();return}
  var J=kit();if(!J)return;var p;
  try{p=J.unlock({game:GAME,item:ITEM,sats:SATS})}catch(e){return}
  Promise.resolve(p).then(function(){ls(OFF,null);refresh();paint()},function(){/* cancelled / timeout: nothing changes */})});
 onChange(paint);whenKit(paint);return b}

/* ---------- 3. signed badge ---------- */
function copy(text,btn){var done=function(){var o=btn.textContent;btn.textContent='COPIED';setTimeout(function(){btn.textContent=o},1500)};
 var fb=function(){try{var t=el('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}catch(e){}done()};
 try{navigator.clipboard.writeText(text).then(done,fb)}catch(e){fb()}}
function badgeForm(target,achievement){var box=$(target);if(!box)return;css();
 var w=el('div','sk-badge');w.hidden=true;
 var row=el('div','sk-row'),inp=el('input','sk-in'),btn=el('button','sk-btn','GET BADGE'),out=el('div');
 inp.maxLength=32;inp.placeholder='NAME (OPTIONAL)';inp.setAttribute('aria-label','Name on the badge (optional)');inp.autocomplete='off';
 btn.type='button';out.setAttribute('aria-live','polite');
 w.appendChild(el('div','sk-note','SIGNED BADGE'));row.appendChild(inp);row.appendChild(btn);w.appendChild(row);w.appendChild(out);box.appendChild(w);
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();btn.click()}});
 btn.addEventListener('click',function(){var J=kit();if(!J){out.textContent='';out.appendChild(el('div','sk-note','BADGE SERVICE OFFLINE'));return}
  var ach=String((typeof achievement==='function'?achievement():achievement)||'Snackman').slice(0,64),name=inp.value.trim().slice(0,32);
  btn.disabled=true;out.textContent='';out.appendChild(el('div','sk-note','SIGNING…'));var p;
  try{p=J.badge({game:GAME,achievement:ach,name:name||undefined,show:false})}catch(e){p=Promise.reject(e)}
  Promise.resolve(p).then(function(r){btn.disabled=false;if(!r||!r.url)throw new Error('no url');
   var ok=false;try{ok=!!J.verify(r.event)}catch(e){}
   out.textContent='';var links=el('div','sk-row'),a=el('a','sk-btn','OPEN BADGE'),c=el('button','sk-btn','COPY LINK');
   a.href=r.url;a.target='_blank';a.rel='noopener';c.type='button';c.addEventListener('click',function(){copy(r.url,c)});
   links.appendChild(a);links.appendChild(c);
   if(navigator.share){var sh=el('button','sk-btn','SHARE');sh.type='button';sh.addEventListener('click',function(){try{navigator.share({title:'Snackman badge',url:r.url}).catch(function(){})}catch(e){}});links.appendChild(sh)}
   var u=el('input','sk-url');u.readOnly=true;u.value=r.url;u.setAttribute('aria-label','Badge link');u.addEventListener('focus',function(){u.select()});
   out.appendChild(el('div','sk-note',ok?'BADGE READY · SIGNATURE OK':'BADGE READY'));out.appendChild(links);out.appendChild(u);
   api.last=r})
  .catch(function(){btn.disabled=false;out.textContent='';out.appendChild(el('div','sk-note','NO BADGE RIGHT NOW. TRY AGAIN.'))})});
 whenKit(function(){w.hidden=false});return w}

/* win / end card block: badge form + tip jar */
function endBlock(target,achievement){var box=$(target);if(!box)return;css();
 var d=el('div','sk-end');box.appendChild(d);badgeForm(d,achievement);var t=el('div','sk-row');d.appendChild(t);tip(t);return d}

refresh();whenKit(function(){refresh()});
var api={tip:tip,skinButton:skinButton,badgeForm:badgeForm,endBlock:endBlock,onChange:onChange,refresh:refresh,whenKit:whenKit,
 GAME:GAME,ITEM:ITEM,SATS:SATS,get owned(){return S.owned},get gold(){return S.gold},get kitLoaded(){return !!kit()},last:null};
window.SnackKit=api;
})();
