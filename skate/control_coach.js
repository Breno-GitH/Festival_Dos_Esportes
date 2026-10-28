/* Skate communication only: observes real events, never changes the simulation. */
(function(g,factory){const api=factory(g);if(typeof module==='object'&&module.exports)module.exports=api;if(g)g.SkateControlCoach=api;})(typeof window==='object'?window:globalThis,function(g){'use strict';
 const FLAG={jump:'skateTutorialJumpSeen',ramp:'skateTutorialRampSeen',grind:'skateTutorialGrindSeen',exit:'skateTutorialGrindExitSeen',mega:'skateTutorialMegaSeen'};
 const RULE='NO SKATE, SPACE MUDA DE FUNÇÃO CONFORME O QUE ZORP ESTÁ FAZENDO.';
 const TIPS={jump:'NO CHÃO, TOQUE SPACE PERTO DA BORDA.',ramp:'NAS RAMPAS, SEGURE SPACE ATÉ A SAÍDA.',grind:'NO AR, SEGURE SPACE PERTO DO RAIL.',exit:'SOLTE SPACE ANTES DO FIM DO RAIL.',mega:'ENTRE COM VELOCIDADE E SEGURE SPACE NA RAMPA E NO MEGA AIR.',unknown:'P / ESC: PAUSE E CONSULTE OS CONTROLES.'};
 const DETAIL={jump:'Espere chegar perto da borda e dê um toque em SPACE. Segurar não aumenta o salto normal.',ramp:'Parece que você está soltando cedo demais. Segure SPACE durante toda a rampa, até Zorp sair da ponta.',grind:'Espere estar no ar e segure SPACE perto do topo do rail. Mantenha pressionado depois de encaixar.',exit:'Solte SPACE enquanto Zorp ainda está no rail. Isso dispara a saída antes da borda.',mega:'Chegue com embalo, segure SPACE na Mega Rampa e continue segurando durante o Mega Air. Isso não permite voo infinito.',unknown:'Abra CONTROLES no pause para rever TOQUE, SEGURE e SOLTE, sem reiniciar a tentativa.'};
 function blank(){return {...Object.fromEntries(Object.values(FLAG).map(k=>[k,false])),attempts:0,lastFailure:'',sameFailureCount:0};}
 function text(c,s,x,y,color='#e6e9de',font='9px monospace'){c.fillStyle=color;c.font=font;c.fillText(s,Math.round(x),Math.round(y));}
 function wrap(c,s,x,y,width,line=11){let value='',yy=y;for(const word of s.split(/\s+/)){const next=value?value+' '+word:word;if(c.measureText(next).width>width&&value){c.fillText(value,Math.round(x),Math.round(yy));yy+=line;value=word;}else value=next;}if(value)c.fillText(value,Math.round(x),Math.round(yy));return yy+line;}
 function keycap(c,kind,x,y){const color=kind==='RELEASE'?'#c6b1e8':kind==='TAP'?'#c6e7a3':'#f3cf85';c.fillStyle='#2d4858';c.fillRect(x,y,42,24);c.strokeStyle=color;c.lineWidth=1;c.strokeRect(x+.5,y+.5,41,23);c.textAlign='center';text(c,kind==='TAP'?'TOQUE':kind==='RELEASE'?'SOLTE':'SEGURE',x+21,y+8,color,'bold 7px monospace');text(c,'SPACE',x+21,y+18,'#f5edd8','bold 8px monospace');
  if(kind==='HOLD'){c.fillStyle=color;for(let i=0;i<3;i++)c.fillRect(x+14+i*5,y+21,3,2);}if(kind==='RELEASE'){c.fillStyle=color;c.fillRect(x+18,y-3,6,2);}c.textAlign='left';}
 function drawGuide(c,x,y,width=344){c.save();c.imageSmoothingEnabled=false;c.textAlign='left';text(c,'',x,y,'#f3d184','bold 10px monospace');wrap(c,RULE,x,y,width,12);
  text(c,'MOVIMENTO: Zorp avança sozinho.',x,y+27,'#a9c4d0','9px monospace');
  const cards=[['CHÃO','TAP','Um toque para pular.'],['RAMPA','HOLD','Segure até o lançamento.'],['NO AR, PERTO DO RAIL','HOLD','Encaixe no grind.'],['DURANTE O GRIND','HOLD','Continue no rail.'],['SAÍDA DO GRIND','RELEASE','Solte para saltar fora.'],['MEGA RAMPA / MEGA AIR','HOLD','Segure na rampa e no ar.']];
  const col=(width-8)/2;for(let i=0;i<cards.length;i++){const [title,kind,action]=cards[i],xx=x+(i%2)*(col+8),yy=y+39+Math.floor(i/2)*33;c.fillStyle='#192f3d';c.fillRect(xx-2,yy-2,col+2,31);keycap(c,kind,Math.round(xx),Math.round(yy+1));text(c,title,xx+48,yy+7,'#eddbb1','bold 8px monospace');text(c,'',xx+48,yy+18,'#c4d7dc','8px monospace');wrap(c,action,xx+48,yy+18,col-49,9);}
  text(c,'2 TOQUES RÁPIDOS: OLLIE  ·  P / ESC: PAUSE',x,y+145,'#a9c4d0','8px monospace');c.restore();
 }
 function bounds(rail){const p=rail.grindPath||rail.points||[];return {start:p[0]?.x??Infinity,end:p.at(-1)?.x??-Infinity,points:p};}
 function nearRail(player,rails,limit){let best=null;for(const rail of rails){const b=bounds(rail);if(player.x<b.start-limit||player.x>b.end+limit)continue;for(let i=1;i<b.points.length;i++){const a=b.points[i-1],z=b.points[i],dx=z.x-a.x,dy=z.y-a.y,u=Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.y-a.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(player.x-a.x-u*dx,player.y-a.y-u*dy);if(d<=limit&&(!best||d<best.distance))best={rail,distance:d};}}return best;}
 function createController(options={}){let cfg=null,data={...blank(),...(options.read?.()||{})},pause=null,selected=0,pauseAt=0,pauseHeld=false;const swallowed=new Set();let run;
  const save=()=>options.write?.({...data});
  const resetRun=()=>{run={started:false,failed:false,completed:false,shown:new Set(),mastered:new Set(),hint:null,mistake:null,takeoffs:0,launches:0,prepared:false};pause=null;selected=0;};resetRun();
  const again=reason=>data.sameFailureCount>=3&&data.lastFailure===reason;
  const unseen=reason=>!data[FLAG[reason]]||(again(reason)&&!run.mastered.has(reason));
  function hint(id,kind,title,message,seconds=2.8){if(run.shown.has(id))return;run.shown.add(id);run.hint={id,kind,title,message,remaining:seconds};}
  function success(reason){run.mastered.add(reason);if(!data[FLAG[reason]]){data[FLAG[reason]]=true;save();}}
  function mistake(reason,state){run.mistake={reason,time:state.elapsed,x:state.player.x};}
  function observe({state,input,traversal,course,transitions=[]},dt){if(cfg?.enabled&&!cfg.enabled())return;const p=state.player,held=input.held===true;if(!run.started){run.started=true;data.attempts++;save();}
   if(run.hint){run.hint.remaining-=dt;if(run.hint.remaining<=0)run.hint=null;}
   if(p.takeoffs>run.takeoffs&&['normal','ollie'].includes(p.jumpTier))success('jump');run.takeoffs=p.takeoffs;
   for(const launch of (state.rampLaunches||[]).slice(run.launches)){const ramp=course.ramps.find(r=>r.id===launch.rampId);if(launch.held&&!launch.releasedEarly)success('ramp');else mistake(ramp?.specialAir?'mega':'ramp',state);}run.launches=(state.rampLaunches||[]).length;
   if(p.specialRampAir?.active&&p.specialRampAir.controlledMs>=350&&!p.specialRampAir.releasedEarly)success('mega');
   if(p.rampRide?.prepared&&!run.prepared&&unseen('ramp'))hint('good-ramp','HOLD','BOA!','MANTENHA SPACE ATÉ SAIR DA RAMPA.',1.2);run.prepared=!!p.rampRide?.prepared;
   for(const e of transitions){if(e.type==='GRIND_ENTER'){success('grind');run.mistake=null;if(unseen('exit'))hint('exit','RELEASE','GRIND!','SOLTE SPACE PARA SALTAR DO RAIL.',4);}
    if(e.type==='GRIND_OLLIE_OUT'){const explain=unseen('exit');success('exit');run.mistake=null;if(explain)hint('exit-good','RELEASE','BOA SAÍDA!','VOCÊ SOLTOU SPACE AINDA NO RAIL.',1.3);}
    if(e.type==='GRIND_EXIT'&&held)mistake('exit',state);}
   if(!p.grounded&&traversal.mode!=='GRIND'&&!held&&nearRail(p,course.rails||[],34))mistake('grind',state);
   if(state.phase==='FAILED'&&!run.failed){run.failed=true;let reason='unknown';const m=run.mistake;
    if(m&&state.elapsed-m.time<4&&Math.abs(p.x-m.x)<650)reason=m.reason;
    else if(p.specialRampAir&&!p.specialRampAir.landed)reason='mega';else if(p.rampRide&&!held)reason='ramp';else if(!p.takeoffs)reason='jump';
    data.sameFailureCount=data.lastFailure===reason?data.sameFailureCount+1:1;data.lastFailure=reason;save();run.failure={reason,tip:TIPS[reason],detail:data.sameFailureCount>=3?DETAIL[reason]:null,count:data.sameFailureCount};run.hint=null;return;
   }
   if(run.hint?.id==='ramp'){const r=(course.ramps||[]).find(r=>p.x>=(r.zones?.APPROACH.startX??r.startX-70)&&p.x<=r.endX);if(r){run.hint.title='NA RAMPA';run.hint.message='AGORA, SEGURE SPACE ATÉ A SAÍDA.';}}
   if(run.hint?.id==='jump'&&(course.gaps||[]).some(g=>g.startX-p.x>0&&g.startX-p.x<=40)){run.hint.title='PERTO DA BORDA';run.hint.message='TOQUE SPACE PARA PULAR.';}
   if(state.phase==='COMPLETED'&&!run.completed){run.completed=true;data.lastFailure='';data.sameFailureCount=0;save();}
   if(state.phase!=='PLAYING'||run.hint)return;
   const speed=p.forwardSpeed||230,ramps=course.ramps||[],ramp=ramps.find(r=>p.x>=r.startX-Math.max(150,speed*.9)&&p.x<=r.endX&&p.grounded);
   if(traversal.mode==='GRIND'&&unseen('exit'))hint('exit','RELEASE','DURANTE O GRIND','SOLTE SPACE PARA SALTAR DO RAIL.',4);
   else if((p.specialRampAir?.active||ramp?.specialAir)&&unseen('mega'))hint('mega','HOLD','MEGA RAMPA / MEGA AIR','AO ENTRAR, SEGURE SPACE; CONTINUE NO AR.',4);
   else if(ramp&&unseen('ramp'))hint('ramp','HOLD','RAMPA À FRENTE','AO CHEGAR À RAMPA, SEGURE SPACE.',3.4);
   else if(unseen('grind')&&(course.rails||[]).some(r=>{const b=bounds(r);return b.start>=p.x-24&&b.start-p.x<Math.max(180,speed*.8)&&Math.abs((b.points[0]?.y||p.y)-p.y)<180;}))hint('grind','HOLD','RAIL À FRENTE','NO AR, SEGURE SPACE PERTO DO RAIL.',3.5);
   else if(unseen('jump')&&p.grounded&&(course.gaps||[]).some(g=>g.startX-p.x>0&&g.startX-p.x<95))hint('jump','TAP','GAP À FRENTE','TOQUE SPACE PERTO DA BORDA PARA PULAR.',2);
  }
  function noteInput(mode,holdMs,state){if(mode==='RAMP'&&holdMs<220)mistake('ramp',state);}
  function resume(){const duration=Math.max(0,(cfg?.clock?.()||0)-pauseAt);pause=null;cfg?.resume?.(duration,pauseHeld);}
  function choose(){if(selected===0)resume();else if(selected===1)pause='CONTROLS';else{pause=null;cfg?.exit?.();}}
  function keyDown(e){const key=(e.key||e.code||'').toLowerCase(),space=key===' '||key==='space';if(!cfg||cfg.scene()!=='JOGO_SKATE'||g.PreGameBrief?.active)return false;
   if(!pause&&swallowed.has(key)){e.preventDefault?.();e.stopImmediatePropagation?.();return true;}
   if(!pause&&!['p','escape'].includes(key))return false;e.preventDefault?.();e.stopImmediatePropagation?.();if(e.repeat||swallowed.has(key))return true;swallowed.add(key);
   if(!pause){pause='MENU';selected=0;pauseAt=cfg.clock();pauseHeld=cfg.held();cfg.freeze?.();return true;}
   if(pause==='CONTROLS'){if(key==='escape'||key==='p'||key==='enter'||space)pause='MENU';return true;}
   if(key==='escape'||key==='p')resume();else if(['s','arrowdown'].includes(key))selected=(selected+1)%3;else if(['w','arrowup'].includes(key))selected=(selected+2)%3;else if(key==='enter'||space)choose();return true;
  }
  function keyUp(e){const key=(e.key||e.code||'').toLowerCase();if(!cfg||cfg.scene()!=='JOGO_SKATE'||g.PreGameBrief?.active)return false;const used=!!pause||swallowed.has(key);if(!used)return false;
   if(key===' '||key==='space')pauseHeld=false;swallowed.delete(key);e.preventDefault?.();e.stopImmediatePropagation?.();return true;}
  function drawPrompt(c){if(!run.hint||pause||run.failed)return;const h=run.hint,x=40,y=66;c.save();c.imageSmoothingEnabled=false;c.textAlign='left';c.fillStyle='#101f30ed';c.fillRect(x,y,370,43);keycap(c,h.kind,x+7,y+9);text(c,h.title,x+59,y+14,'#f0d59c','bold 9px monospace');text(c,'',x+59,y+28,'#d4e4e0','9px monospace');wrap(c,h.message,x+59,y+28,299,10);c.restore();}
  function drawPause(c){if(!pause)return;c.save();c.imageSmoothingEnabled=false;c.fillStyle='#06121de8';c.fillRect(0,0,450,300);c.fillStyle='#152b39';c.fillRect(28,13,394,274);c.strokeStyle='#dd94c4';c.lineWidth=2;c.strokeRect(28,13,394,274);c.textAlign='center';text(c,pause==='CONTROLS'?'CONTROLES DO SKATE':'PAUSA',225,38,'#f0d0e8','bold 16px monospace');c.textAlign='left';
   if(pause==='CONTROLS'){drawGuide(c,52,64,346);c.textAlign='center';text(c,'[ENTER / ESC] VOLTAR AO PAUSE',225,270,'#d5e5df','bold 10px monospace');}
   else{['CONTINUAR','CONTROLES','VOLTAR À ILHA'].forEach((v,i)=>{c.fillStyle=i===selected?'#41616e':'#203c4c';c.fillRect(74,91+i*43,302,33);c.textAlign='center';text(c,v,225,112+i*43,i===selected?'#fff0bd':'#c4d8dd','bold 12px monospace');});text(c,'[W/S] ESCOLHER  [ENTER / SPACE] CONFIRMAR',225,251,'#a9c5cb','9px monospace');}c.restore();}
  function drawFailure(c,{title,bank,lost}){const f=run.failure||{reason:'unknown',tip:TIPS.unknown};c.save();c.imageSmoothingEnabled=false;c.fillStyle='#0b182bf5';c.fillRect(27,69,396,208);c.strokeStyle='#e5a780';c.lineWidth=2;c.strokeRect(27,69,396,208);c.textAlign='center';text(c,title,225,93,'#ffc99d','bold 13px monospace');c.textAlign='left';text(c,'',43,120,'#fff0c8','bold 10px monospace');let y=wrap(c,f.tip,43,120,364,14);
   if(f.detail){text(c,'',43,y+13,'#bbd4de','9px monospace');wrap(c,f.detail,43,y+13,364,13);}
   c.textAlign='center';text(c,`BANK ${bank} · COMBO PERDIDO ${lost}`,225,231,'#b8d2d5','9px monospace');text(c,'[SPACE] RECOMEÇAR  ·  [P] CONTROLES',225,258,'#eddbb0','bold 10px monospace');c.restore();}
  return {bind(options){cfg=options;},resetRun,observe,noteInput,keyDown,keyUp,drawPrompt,drawPause,drawFailure,get paused(){return !!pause;},get failure(){return run.failure;},snapshot:()=>({data:{...data},pause,selected,hint:run.hint?{...run.hint}:null,failure:run.failure?{...run.failure}:null})};
 }
 const api=createController({read:()=>g.FestivalWallet?.commerce.skateTutorial,write:data=>g.FestivalWallet?.updateCommerce({skateTutorial:data})});
 function drawWorld(c,course,left,right){c.save();c.lineWidth=2;for(const [items,color]of [[course.ramps||[],'#e5ba78'],[course.rails||[],'#86d6dc']]){c.strokeStyle=color;for(const item of items){const pts=item.surfacePoints||item.grindPath||item.points;if(!pts?.length||pts.at(-1).x<left||pts[0].x>right)continue;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(Math.round(p.x),Math.round(p.y)):c.moveTo(Math.round(p.x),Math.round(p.y)));c.stroke();}}c.restore();}
 Object.assign(api,{createController,blank,FLAG,RULE,drawGuide,drawWorld});g.addEventListener?.('keydown',e=>api.keyDown(e),true);g.addEventListener?.('keyup',e=>api.keyUp(e),true);
 return Object.freeze(api);
});
