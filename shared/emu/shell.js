/* Emulator shell: START / PAUSE / FULLSCREEN relay to the cartridge iframe via postMessage */
(function(){
const scr=document.getElementById('emuframe'),boot=document.getElementById('emuboot');
const cq=new URLSearchParams(location.search).get('cart');if(cq&&/^[a-z0-9-]+$/.test(cq))scr.src='cart/'+cq+'.html';
const send=m=>{try{scr.contentWindow.postMessage({emu:m},location.origin)}catch(e){}};
const focusGame=()=>{try{scr.contentWindow.focus()}catch(e){}};
document.getElementById('emustart').onclick=()=>{send('start');focusGame()};
document.getElementById('emupause').onclick=()=>{send('pause');focusGame()};
const fs=document.getElementById('emufs');
fs.onclick=()=>{const d=document.documentElement;
 if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return}
 const rq=d.requestFullscreen||d.webkitRequestFullscreen;if(rq){try{rq.call(d)}catch(e){document.body.classList.toggle('fs')}}else document.body.classList.toggle('fs');focusGame()};
scr.addEventListener('load',()=>{focusGame();setTimeout(()=>boot&&boot.classList.add('off'),900)});
addEventListener('keydown',e=>{ /* keys pressed while the shell has focus go to the game */
 if(e.target.closest&&e.target.closest('#emubar'))return;focusGame()});
/* ◀ SHELF guard (2026-10-24 bounce fix): the link sits in the top bar next to START, so a fast or auto tap during play used to
   drop players back on the shelf. While a cart other than the title screen runs, the first tap only arms it (label "◀ LEAVE?");
   a second tap 0.35-4 s later leaves. Any tap in the game, or a quick double-fire, does not count. On the title screen one tap leaves. */
const sh=document.querySelector('#emubar a[href="../"]');let armAt=0,armT=0;
const shT=(k,d)=>{try{return window.SNK&&SNK.t?SNK.t(k):d}catch(e){return d}};
const inPlay=()=>{try{return !/\/cart\/title\.html$/.test(scr.contentWindow.location.pathname)}catch(e){return true}};
function disarm(){if(!armAt)return;armAt=0;clearTimeout(armT);if(sh){sh.classList.remove('arm');sh.textContent=shT('frame.shelf','◀ SHELF')}}
if(sh){sh.addEventListener('click',e=>{if(!inPlay())return;const now=Date.now();if(armAt&&now-armAt>=350)return;e.preventDefault();
  if(!armAt){armAt=now;sh.classList.add('arm');sh.textContent=shT('frame.shelfConfirm','◀ LEAVE?');armT=setTimeout(disarm,4000)}});
 document.addEventListener('pointerdown',e=>{if(armAt&&!sh.contains(e.target))disarm()},true);addEventListener('jutz:lang',disarm)}
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;if(e.data.emuTap){disarm();return}if(e.data.emuTitle)document.getElementById('emutitle').textContent=e.data.emuTitle});
})();
