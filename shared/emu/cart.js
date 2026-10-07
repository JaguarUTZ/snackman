/* Cartridge side of the emulator: pause overlay + START/PAUSE hooks.
   A cart sets window.EMU={start(){}, pause(){}, resume(){}, title:'...'} */
(function(){
let paused=false,ov=null;
function overlay(on){if(on&&!ov){ov=document.createElement('div');ov.id='emupz';ov.innerHTML='<div>❚❚ PAUSE</div><small>PRESS START OR ❚❚ TO RESUME</small>';
  ov.style.cssText="position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;background:rgba(0,0,0,.72);color:#FFD400;font:400 20px/1.4 'Press Start 2P',monospace;text-align:center";
  ov.querySelector('small').style.cssText='font-size:8px;color:#bbb';ov.onclick=()=>toggle(false);document.body.appendChild(ov)}
 if(!on&&ov){ov.remove();ov=null}}
function toggle(v){const E=window.EMU||{};paused=v===undefined?!paused:v;if(!E.ownPause)overlay(paused);try{paused?E.pause&&E.pause():E.resume&&E.resume()}catch(e){console.warn(e)}}
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||!e.data.emu)return;const E=window.EMU||{};
 if(e.data.emu==='pause')toggle();
 else if(e.data.emu==='start'){if(paused){toggle(false);return}try{E.start&&E.start()}catch(x){console.warn(x)}}});
window.EMUCART={toggle,get paused(){return paused},title(t){try{parent.postMessage({emuTitle:t},location.origin)}catch(e){}}};
})();
