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
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;if(e.data.emuTitle)document.getElementById('emutitle').textContent=e.data.emuTitle});
})();
