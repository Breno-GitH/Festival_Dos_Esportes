/* One pause owner. Gameplay uses now(); menu input uses the real clock. */
(function(g){'use strict';
 const realNow=()=>performance.now();
 const SPORTS=Object.freeze({JOGO_PINGPONG:['PING-PONG','#83ded2'],JOGO_BASQUETE:['BASQUETE','#e9b06d'],
  JOGO_CORRIDA:['MARATONA','#9bd69a'],JOGO_SKATE:['SKATE','#dba0cb'],JOGO_ARCO:['ARQUEARIA','#b9d793'],
  JOGO_ESCALADA:['ESCALADA','#a9c8e2'],JOGO_BOXE:['BOXE','#e49d91'],JOGO_SURF:['SURF','#83d6df']});
 let cfg=null,menu=null,pausedAt=null,offset=0,frame=null,token=null;
 const physical=new Set(),gated=new Set(),continuous=new Set();
 const key=e=>e.code==='Space'||e.key===' '||e.key==='Spacebar'?'space':String(e.key||'').toLowerCase();
 const now=()=> (pausedAt===null?realNow():pausedAt)-offset;
 function consume(e){e.preventDefault();e.stopImmediatePropagation();}
 function open(){
  const scene=cfg?.scene();if(menu)return true;
  if(!SPORTS[scene]||cfg.busy())return false;
  pausedAt=realNow();frame=cfg.capture();token=cfg.suspend();
  menu={scene,screen:'MENU',selected:0,opened:realNow(),note:''};
  for(const k of physical){gated.add(k);continuous.add(k);}
  cfg.audio?.(true);cfg.hideDialogue();return true;
 }
 function finishClock(){offset+=realNow()-pausedAt;pausedAt=null;}
 function resume(){if(!menu)return false;
  const scene=menu.scene;finishClock();menu=null;frame=null;
  // Only an existing Skate hold may continue; menu presses are never gameplay.
  const retained=cfg.resume(token,new Set([...physical].filter(k=>continuous.has(k))),scene)||[];token=null;continuous.clear();
  for(const k of physical)gated.add(k);for(const k of retained)gated.delete(k);
  cfg.audio?.(false);return true;
 }
 function exit(){if(!menu||menu.screen!=='CONFIRM')return false;
  if(cfg.abandon(menu.scene)===false){menu.note='Não foi possível salvar. Tente novamente.';return false;}
  finishClock();menu=null;frame=null;token=null;continuous.clear();
  for(const k of physical)gated.add(k);cfg.audio?.(false);return true;
 }
 function down(e){const k=key(e),fresh=!physical.has(k)&&!e.repeat;physical.add(k);
  if(gated.has(k)&&!menu){consume(e);return;}
  if(!menu){
   if((k==='escape'||(k==='p'&&cfg?.scene()==='JOGO_SKATE'))&&open())consume(e);
   return;
  }
  consume(e);gated.add(k);if(!fresh)return;
  if(k==='escape'||(k==='p'&&menu.scene==='JOGO_SKATE')){
   if(menu.screen==='MENU')resume();else{menu.screen='MENU';menu.selected=0;menu.opened=realNow();}return;
  }
  if(menu.screen==='CONTROLS'){if(['space','enter','e','c'].includes(k)){menu.screen='MENU';menu.opened=realNow();}return;}
  if(k==='c'&&menu.scene==='JOGO_SKATE'&&menu.screen==='MENU'){menu.screen='CONTROLS';return;}
  if(['w','s','arrowup','arrowdown'].includes(k)){menu.selected=1-menu.selected;return;}
  if(!['space','e','enter'].includes(k)||realNow()-menu.opened<180)return;
  if(menu.screen==='CONFIRM'){
   if(menu.selected===0)exit();else{menu.screen='MENU';menu.selected=0;menu.opened=realNow();}
  }else if(menu.selected===0)resume();
  else{menu.screen='CONFIRM';menu.selected=1;menu.opened=realNow();menu.note='';}
 }
 g.addEventListener('keydown',down,true);
 g.addEventListener('keyup',e=>{const k=key(e);physical.delete(k);continuous.delete(k);
  if(menu||gated.has(k)){gated.delete(k);cfg?.release?.(k);consume(e);}
 },true);
 g.addEventListener('blur',()=>{physical.clear();gated.clear();continuous.clear();if(!menu)open();});
 function draw(c){if(!menu)return false;
  c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.imageSmoothingEnabled=false;
  c.clearRect(0,0,c.canvas.width,c.canvas.height);if(frame)c.drawImage(frame,0,0);
  c.fillStyle='rgba(5,12,23,.72)';c.fillRect(0,0,c.canvas.width,c.canvas.height);
  const scale=Math.min(c.canvas.width/450,c.canvas.height/300);
  c.translate(Math.round((c.canvas.width-450*scale)/2),Math.round((c.canvas.height-300*scale)/2));c.scale(scale,scale);
  const accent=SPORTS[menu.scene][1],controls=menu.screen==='CONTROLS';
  const x=controls?20:57,y=controls?12:52,w=controls?410:336,h=controls?276:202;
  c.fillStyle='#07131e';c.fillRect(x+4,y+5,w,h);c.fillStyle='#203c49';c.fillRect(x,y,w,h);
  c.fillStyle='#102633';c.fillRect(x+3,y+3,w-6,h-6);c.fillStyle=accent;c.fillRect(x+3,y+3,w-6,2);
  c.textAlign='center';c.textBaseline='alphabetic';
  const text=(s,yy,color='#e9ecde',font='bold 12px monospace')=>{c.fillStyle=color;c.font=font;c.fillText(s,225,yy);};
  if(controls){text('CONTROLES DO SKATE',36,accent,'bold 15px monospace');g.SkateControlCoach?.drawGuide(c,43,60,364);text('[ESC / SPACE] VOLTAR',268,'#b4ced1','10px monospace');}
  else{
   text(SPORTS[menu.scene][0]+' / ILHA DOS CAMPEÕES',73,'#a9c6cc','9px monospace');
   text(menu.screen==='CONFIRM'?'SAIR DO DESAFIO?':'PAUSADO',99,accent,'bold 18px monospace');
   const labels=menu.screen==='CONFIRM'?['SIM','NÃO']:['CONTINUAR','SAIR'];
   labels.forEach((s,i)=>{c.fillStyle=menu.selected===i?'#355762':'#1a3441';c.fillRect(95,116+i*34,260,28);
    if(menu.selected===i){c.fillStyle=accent;c.fillRect(95,116+i*34,3,28);}text(s,135+i*34,menu.selected===i?'#fff1c9':'#bfced0');});
   let note=menu.screen==='CONFIRM'?'A partida não contará como vitória.':'[ESC] CONTINUAR';
   if(menu.scene==='JOGO_SURF')note='As mini moedas coletadas serão guardadas.';
   text(menu.note||note,199,menu.note?'#eeb69c':'#b2c7ca','9px monospace');
   text('[W/S / SETAS] ESCOLHER · [E / SPACE] CONFIRMAR',224,'#b4c8ce','9px monospace');
   if(menu.scene==='JOGO_SKATE'&&menu.screen==='MENU')text('[C] CONTROLES',241,accent,'9px monospace');
  }
  c.restore();return true;
 }
 g.MinigamePause=Object.freeze({init(c){cfg=c;},now,open,resume,draw,get active(){return !!menu;},
  snapshot:()=>({active:!!menu,scene:menu?.scene||null,screen:menu?.screen||null,selected:menu?.selected??null,note:menu?.note||'',time:now(),held:[...physical],gated:[...gated]})});
})(window);
