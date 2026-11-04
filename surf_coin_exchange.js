/* Local Surf exchange. Uses the existing fisherman and the one campaign wallet. */
(function(g){'use strict';
 let cfg=null,ui=null,pause=null;const held=new Set(),swallowed=new Set();
 const wallet=()=>g.FestivalWallet,game=()=>g.surfEndlessGame;
 const world=()=>cfg&&(cfg.scene()==='HUB'||cfg.scene().startsWith('ILHA_'));
 const fisherman=()=>cfg?.npcs.find(n=>n.id==='pescador_surf');
 function clear(){cfg?.clearInput();game()?.clearBriefingInput();}
 function open(kind,extra={}){clear();cfg.hideDialogue();ui={kind,selected:1,opened:performance.now(),...extra};return true;}
 function mark(){if(wallet().markSurfExchangeTutorialSeen())return true;ui.note='Não foi possível salvar. Tente novamente.';return false;}
 function close(){if(ui?.kind==='explain'&&!mark())return;ui=null;clear();}
 function interact(npc){if(npc?.id!=='pescador_surf'||cfg?.scene()!=='ILHA_SURF')return false;
  if(!wallet().surfCoinExchangeTutorialSeen)return open('explain',{automatic:false});
  return open('offer');
 }
 function trade(request='all'){
  if(ui?.kind!=='offer'||cfg.scene()!=='ILHA_SURF')return {status:'unavailable'};
  const result=wallet().exchangeSurfMiniCoins(request);
  if(result.status==='exchanged')open('receipt',{result});
  else ui.note=result.status==='save_failed'?'A troca não foi salva. Nenhum saldo mudou. Tente novamente.':'Preciso de dez pequenas para cada moeda grande.';
  return result;
 }
 function confirm(){if(!ui||performance.now()-ui.opened<220)return;
  if(ui.kind==='explain'){if(!mark())return;const automatic=ui.automatic;ui=null;clear();if(!automatic)open('offer');}
  else if(ui.kind==='receipt')close();
  else if(wallet().surfMiniCoins<10||ui.selected===1)close();else trade('all');
 }
 function openPause(){if(g.MinigamePause)return g.MinigamePause.open();const p=game();if(!cfg||cfg.scene()!=='JOGO_SURF'||g.PreGameBrief?.active||!p||p.runClosed)return false;
  if(!['PLAYING','FINALE','FAIL','COMPLETE'].includes(p.state))return false;
  if(pause)return true;p.paused=true;pause={selected:0,opened:performance.now()};clear();return true;
 }
 function resume(){if(game())game().paused=false;pause=null;clear();}
 function returnFromRun(){const p=game();if(!p||!p.closeRun()){
   if(pause)pause.note='Não foi possível guardar as mini moedas. Tente novamente.';return false;
  }pause=null;clear();cfg.returnToIsland();return true;
 }
 function update(){if(!cfg)return false;
  if(pause){if(cfg.scene()!=='JOGO_SURF'||!game()?.paused){resume();return false;}return true;}
  if(ui){if(!world()){ui=null;clear();return false;}return true;}
  if(world()&&!cfg.busy()&&wallet().surfCoinExchangeTutorialPending&&!wallet().surfCoinExchangeTutorialSeen)
   return open('explain',{automatic:true});
  return false;
 }
 function keyDown(e){const k=String(e.key||'').toLowerCase(),was=held.has(k);held.add(k);
  if(swallowed.has(k)){e.preventDefault();e.stopImmediatePropagation();return;}
  if(!ui&&!pause){if(k==='escape'&&openPause()){swallowed.add(k);e.preventDefault();e.stopImmediatePropagation();}return;}
  swallowed.add(k);e.preventDefault();e.stopImmediatePropagation();if(was||e.repeat)return;
  if(pause){if(k==='escape'){resume();return;}
   if(['w','s','arrowup','arrowdown'].includes(k))pause.selected=1-pause.selected;
   else if([' ','e','enter'].includes(k)&&performance.now()-pause.opened>=180){if(pause.selected===0)resume();else returnFromRun();}
  }else if(k==='escape')close();
  else if(ui.kind==='offer'&&wallet().surfMiniCoins>=10&&['w','s','arrowup','arrowdown'].includes(k))ui.selected=1-ui.selected;
  else if([' ','e','enter'].includes(k))confirm();
 }
 g.addEventListener('keydown',keyDown,true);
 g.addEventListener('keyup',e=>{const k=String(e.key||'').toLowerCase();held.delete(k);if(swallowed.delete(k)){e.preventDefault();e.stopImmediatePropagation();clear();}},true);
 g.addEventListener('blur',()=>{held.clear();swallowed.clear();if(ui||pause)clear();});
 function rect(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
 function text(c,value,x,y,color='#e3ebdc',font='10px monospace'){c.fillStyle=color;c.font=font;c.fillText(value,Math.round(x),Math.round(y));}
 function wrap(c,value,x,y,width,line=14){let row='';for(const word of value.split(' ')){const next=row?row+' '+word:word;if(c.measureText(next).width>width&&row){c.fillText(row,x,y);y+=line;row=word;}else row=next;}c.fillText(row,x,y);return y+line;}
 function coin(c,x,y,size){const image=g.FestivalAssets?.images.coin,f=g.FestivalAssets?.coinFrame;
  if(image?.complete&&image.naturalWidth&&f)c.drawImage(image,f.x,f.y,f.width,f.height,Math.round(x),Math.round(y),size,size);
  else{rect(c,'#d9ad51',x,y,size,size);rect(c,'#f5db85',x+2,y+1,Math.max(1,size-4),1);}
 }
 function drawStand(c){if(!cfg||cfg.scene()!=='ILHA_SURF')return;c.save();rect(c,'rgba(65,64,44,.16)',343,151,66,4);rect(c,'rgba(65,64,44,.16)',339,227,68,2);c.restore();}
 function drawBooth(c){c.save();c.imageSmoothingEnabled=false;
  rect(c,'#5f503d',347,111,4,38);rect(c,'#5f503d',402,111,4,38);
  rect(c,'#305861',342,104,68,7);rect(c,'#71958a',346,101,60,4);rect(c,'#b8b983',345,111,62,3);
  for(let x=353;x<401;x+=8){c.strokeStyle='#809b89';c.lineWidth=1;c.beginPath();c.moveTo(x,119);c.lineTo(x+4,141);c.stroke();}
  for(let y=122;y<142;y+=6)rect(c,'#809b89',352,y,49,1);
  rect(c,'#74573a',345,145,62,7);rect(c,'#b08e59',343,142,66,4);rect(c,'#dbc087',347,142,58,1);
  rect(c,'#775c40',335,145,8,11);rect(c,'#bb9e6d',336,145,6,2);coin(c,355,135,6);coin(c,395,136,5);
  c.restore();
 }
 function drawSign(c){c.save();c.imageSmoothingEnabled=false;
  // Wooden posts have feet on the sand; the ratio belongs to this physical sign.
  rect(c,'#715039',343,209,5,19);rect(c,'#715039',399,209,5,19);rect(c,'#ba9762',344,212,2,15);rect(c,'#ba9762',400,212,2,15);
  rect(c,'#785738',333,188,84,30);rect(c,'#c1a16b',333,188,84,2);rect(c,'#ddbf83',335,190,80,26);rect(c,'#254751',337,192,76,22);
  for(const [x,y]of [[334,189],[414,189],[334,215],[414,215]])rect(c,'#eee0ad',x,y,1,1);
  coin(c,341,198,7);c.textAlign='left';text(c,'×10',351,206,'#ecdb9e','bold 10px monospace');text(c,'→',372,206,'#c0ded1','bold 12px monospace');coin(c,385,195,12);text(c,'×1',400,206,'#f2dc9a','bold 9px monospace');c.restore();
 }
 function drawProps(c){drawBooth(c);drawSign(c);}
 function actors(scene,c){return scene==='ILHA_SURF'?[{y:152,draw:()=>drawBooth(c)},{y:228,draw:()=>drawSign(c)}]:[];}
 function blocks(b){return cfg?.scene()==='ILHA_SURF'&&b.x<407&&b.x+b.w>345&&b.y<152&&b.y+b.h>142;}
 function highlight(c){if(cfg.scene()!=='ILHA_SURF')return;const n=fisherman();if(!n)return;c.strokeStyle='#f0d583';c.lineWidth=1;c.strokeRect(n.x-20,n.y-(n.tamanho||44)-5,40,(n.tamanho||44)+10);}
 function draw(c){if(!cfg)return;
  if(pause&&cfg.scene()==='JOGO_SURF'){c.save();c.imageSmoothingEnabled=false;rect(c,'rgba(5,20,34,.58)',0,0,450,300);rect(c,'#17313e',60,83,330,145);c.strokeStyle='#75b5b4';c.strokeRect(61,84,328,143);c.textAlign='center';text(c,'SURF · PAUSA',225,106,'#f3d89b','bold 14px monospace');
   for(const [i,label]of ['CONTINUAR','SAIR'].entries()){rect(c,pause.selected===i?'#416969':'#223f4c',111,120+i*29,228,24);text(c,label,225,137+i*29,'#edf1d9','bold 11px monospace');}
   text(c,'MINI MOEDAS DA RUN: '+game().runMiniCoins,225,193,'#d7d8ad','10px monospace');text(c,pause.note||'As mini moedas serão guardadas ao sair.',225,211,pause.note?'#e9b093':'#a9cdc5','9px monospace');c.restore();return;
  }
  if(!ui||!world())return;c.save();c.imageSmoothingEnabled=false;rect(c,'rgba(6,22,33,.43)',0,0,450,300);highlight(c);
  const automatic=ui.kind==='explain'&&ui.automatic;rect(c,'#152f40',18,automatic?181:151,414,automatic?107:137);c.strokeStyle='#8bb9b6';c.strokeRect(19,automatic?182:152,412,automatic?105:135);c.textAlign='left';
  const top=automatic?199:171;text(c,ui.kind==='explain'?'MINI MOEDAS DO SURF':'PESCADOR · POSTO DE TROCAS',31,top,'#ecd28f','bold 12px monospace');c.font='10px monospace';c.fillStyle='#e0e8d7';
  if(ui.kind==='explain'){
   const value=automatic?'As moedas coletadas nas ondas ficam guardadas. Leve-as ao Pescador, à direita da Ilha do Surf.':'Viu as moedinhas nas ondas? Traga dez delas e eu troco por uma moeda que o pessoal das ilhas aceita. Dez pequenas por uma grande. Simples. Vento de leste... boa maré hoje.';
   const y=wrap(c,value,31,top+19,384);text(c,'10 MINI MOEDAS = 1 MOEDA',31,y+5,'#ecd28f','bold 10px monospace');
  }else if(ui.kind==='receipt'){
   text(c,ui.result.spent+' MINI MOEDAS → +'+ui.result.earned+' '+(ui.result.earned===1?'MOEDA':'MOEDAS'),31,195,'#f1dda3','bold 11px monospace');text(c,'Restam '+wallet().surfMiniCoins+' mini moedas para a próxima maré.',31,216);coin(c,389,184,16);text(c,'Vento de leste. Amanhã deve trazer outra boa maré.',31,239,'#a6c7c1','9px monospace');
  }else{
   const n=wallet().surfMiniCoins,earned=Math.floor(n/10);text(c,'MINI GUARDADAS: '+n+'   ·   MOEDAS: '+wallet().coins,31,191,'#b7d7cc');
   text(c,n<10?'Você tem '+n+'. Preciso de 10 para fazer uma troca.':'Posso trocar '+earned*10+' pequenas por '+earned+(earned===1?' moeda.':' moedas.'),31,209);
   const options=n<10?['SAIR']:['TROCAR TUDO','SAIR'];options.forEach((label,i)=>{const selected=n<10||ui.selected===i;rect(c,selected?'#416a68':'#223e4b',n<10?155:44+i*190,226,n<10?140:174,24);c.textAlign='center';text(c,label,n<10?225:131+i*190,242,'#efead4','bold 10px monospace');});c.textAlign='left';
  }
  if(ui.note){c.fillStyle='#eabfa0';c.font='9px monospace';wrap(c,ui.note,31,top+70,382,11);}
  c.textAlign='right';text(c,ui.kind==='offer'?'[W/S] ESCOLHER · [E/SPACE] CONFIRMAR · [ESC] SAIR':'[E / SPACE] CONTINUAR · [ESC] FECHAR',419,278,'#adcac6','8px monospace');c.restore();
 }
 g.SurfCoinExchange=Object.freeze({init(c){cfg=c;},get active(){return !!ui||!!pause;},interact,trade,openPause,returnFromRun,update,draw,drawStand,drawProps,actors,blocks,
  clearInputLatch(){held.clear();swallowed.clear();},
  snapshot:()=>({ui:ui?{...ui}:null,pause:pause?{...pause}:null,mini:wallet()?.surfMiniCoins,seen:wallet()?.surfCoinExchangeTutorialSeen,npc:fisherman()?.id})});
})(window);
