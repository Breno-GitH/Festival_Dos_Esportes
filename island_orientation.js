/* One campaign tutorial; ordinary inhabitants retain their own dialogue. */
(function(g){'use strict';
 let cfg=null,active=false,index=0,opened=0,targets=[],held=new Set();
 const pages=[['MESTRE','Cada ilha possui um Mestre. Fale com ele para disputar o esporte e conquistar sua medalha.'],['NPCs','Os habitantes conversam com Zorpzin. Alguns possuem missões; outros contam histórias, dão dicas ou reagem à jornada.'],['MISSÕES OPCIONAIS','Você pode enfrentar o Mestre sem fazer missões. Desafios opcionais rendem moedas: cumpra e volte ao NPC para receber.']];
 function update(){if(!cfg)return false;if(active)return true;
  const scene=cfg.scene();if(!scene.startsWith('ILHA_')||g.IslandNavigation?.identifying||cfg.busy()||g.FestivalWallet.commerce.firstSportIslandTutorialSeen)return false;
  const local=cfg.npcs.filter(n=>n.scene===scene&&!n.eventId);targets=[local.find(n=>n.isMaster),local.find(n=>!n.isMaster)];index=0;active=true;opened=performance.now();cfg.clearInput();return true;
 }
 function advance(){if(index<2){index++;opened=performance.now();return;}if(g.FestivalWallet.updateCommerce({firstSportIslandTutorialSeen:true})){active=false;cfg.clearInput();}}
 g.addEventListener('keydown',e=>{const k=e.key.toLowerCase(),was=held.has(k);held.add(k);if(!active)return;e.preventDefault();e.stopImmediatePropagation();if([' ','e','enter'].includes(k)&&!was&&!e.repeat&&performance.now()-opened>=250)advance();},true);
 g.addEventListener('keyup',e=>{held.delete(e.key.toLowerCase());if(active){e.preventDefault();e.stopImmediatePropagation();}},true);
 g.addEventListener('blur',()=>held.clear());
 function wrap(c,text,x,y,width){let row='';for(const word of text.split(' ')){const next=row?row+' '+word:word;if(c.measureText(next).width>width&&row){c.fillText(row,x,y);y+=14;row=word;}else row=next;}c.fillText(row,x,y);}
 function draw(c){if(!cfg)return;const scene=cfg.scene();if(!scene.startsWith('ILHA_'))return;
  c.save();c.imageSmoothingEnabled=false;
  for(const q of g.FestivalChallenges.definitions){if(q.type==='dialogue')continue;const n=cfg.npcs.find(n=>n.id===q.npc&&n.scene===scene);if(!n)continue;const s=g.FestivalWallet.getChallenge(q.id);if(s.claimed)continue;const x=Math.round(n.x),y=Math.round(n.y-(n.tamanho||44)-10);c.fillStyle='#152f3e';c.fillRect(x-9,y-10,18,15);c.font='bold 12px monospace';c.textAlign='center';c.fillStyle=s.completed?'#b6edb0':'#f1cd74';c.fillText(s.completed?'!':s.accepted?'...':'!',x,y+1);}
  if(active){cfg.hideDialogue();c.fillStyle='rgba(6,20,31,.45)';c.fillRect(0,0,450,300);const n=targets[Math.min(index,1)];if(n){c.strokeStyle='#ffe59c';c.lineWidth=2;c.strokeRect(Math.round(n.x-22),Math.round(n.y-(n.tamanho||50)-7),44,(n.tamanho||50)+12);}
   c.fillStyle='#132d3e';c.fillRect(19,179,412,110);c.strokeStyle='#78b8bb';c.strokeRect(20,180,410,108);c.textAlign='left';c.fillStyle='#f1d691';c.font='bold 12px monospace';c.fillText(pages[index][0],32,198);c.font='10px monospace';c.fillStyle='#e4eadc';wrap(c,pages[index][1],32,217,386);c.font='9px monospace';c.textAlign='right';c.fillStyle='#b4d6cf';c.fillText((index+1)+'/3   [E / SPACE] CONTINUAR',418,278);
  }c.restore();
 }
 g.IslandOrientation=Object.freeze({init(c){cfg=c;},get active(){return active;},update,draw,snapshot:()=>({active,index,seen:g.FestivalWallet.commerce.firstSportIslandTutorialSeen})});
})(window);
