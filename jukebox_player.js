/* Physical-looking mini player beside the wallet. Never consumes world gameplay keys. */
(function(g){'use strict';
 let cfg=null,last='';const root=document.getElementById('jukebox-mini'),name=document.getElementById('jukebox-track'),state=document.getElementById('jukebox-state'),mute=document.getElementById('jukebox-mute'),next=document.getElementById('jukebox-next');
 function update(){if(!cfg||!root)return;const scene=cfg.scene(),world=g.MerchantCatalog.regions.some(r=>r.id===scene),menu=cfg.menu(),blocked=cfg.blocked()||document.hidden;
  g.MerchantMusic.setContext({world,blocked,menu});const s=g.MerchantMusic.snapshot(),show=world&&!menu&&!blocked&&!!s.playing;
  const key=[show,s.playing,s.muted].join('|');if(key===last)return;last=key;root.hidden=!show;
  name.textContent=s.name;name.title=s.name;state.textContent=s.muted?'JUKEBOX · SEM SOM':'JUKEBOX · TOCANDO';root.dataset.muted=String(s.muted);
  const label=s.muted?'Ativar som da música':'Silenciar música';mute.setAttribute('aria-label',label);mute.title=label;mute.setAttribute('aria-pressed',String(s.muted));
 }
 function control(button,action){button?.addEventListener('click',e=>{e.stopPropagation();if(root.hidden)return;cfg?.clearInput();action();update();document.getElementById('gameCanvas')?.focus({preventScroll:true});});}
 control(next,()=>g.MerchantMusic.next());control(mute,()=>g.MerchantMusic.toggleMute());
 for(const type of ['keydown','keyup'])g.addEventListener(type,e=>{if(!root||root.hidden||!root.contains(e.target))return;e.stopImmediatePropagation();cfg?.clearInput();if(e.key==='Escape'){e.preventDefault();document.getElementById('gameCanvas')?.focus({preventScroll:true});}},true);
 document.addEventListener('visibilitychange',()=>update());
 g.JukeboxPlayer=Object.freeze({init(options){cfg=options;last='';update();},update});
})(window);
