// Best effort; no location permissions, external IP service, or client-side geo guess.
(function(){
  if(window.__hwVisit)return;window.__hwVisit=true;
  function count(){fetch('/api/visit',{method:'POST',credentials:'same-origin',keepalive:true}).catch(function(){})}
  count();setInterval(function(){if(!document.hidden)count()},30*60*1000);
})();
