/* Merchant arrival, world presentation and campaign-only interfaces. */
(function(g){'use strict';
 const W=g.FestivalWallet,C=g.MerchantCatalog,A=g.MerchantAnimation;
 const actor=A.create(),npc={id:'comerciante_central',eventId:'merchant',scene:'HUB',x:342,y:111,img:A.image,tamanho:44,
  interactionWidth:58,interactionHeight:70,interactionOffsetY:38,footprint:{width:18,height:8},msg:'> COMERCIANTE: Clientela interplanetária é sempre bem-vinda!'};
 const shots=[['FADE',.55],['ARRIVE',null],['LOOK',.8],['BAG',1.1],['COUNTER',.6],['ROOF',.6],['PRODUCTS',.8],['SHIP',2.2],['SIGN_WALK',null],['SIGN',2.4],['RETURN',null],['HAPPY',.9],['SPEECH',null],['FADE_BACK',.55]];
 let cfg=null,cut=null,ui=null,clock=0,last=0,toast='',toastTime=0,animTime=0,anim='idle_down',wasScene=null,gameStarted=null,gameBest=null,saveError=false;
 const held=new Set();const snapshot=()=>W.commerce,owns=id=>snapshot().purchasedItems[id]===true;
 const medalCount=()=>cfg?cfg.medalCount():0;
 const visible=()=>medalCount()>0&&snapshot().merchantUnlocked;
 const overworld=scene=>C.regions.some(r=>r.id===scene);
 function persist(patch){return W.updateCommerce(patch);}
 function message(text){toast=text;toastTime=3.2;}
 function updateVisit(scene){if(!overworld(scene))return;
  if(g.FestivalProgress&&!g.FestivalProgress.discoverScene(scene))return;
  const theme=scene==='HUB'?'market':scene==='ILHA_SURF'?'ocean':scene==='ILHA_ESCALADA'?'mountain':'festival';
  if(snapshot().visitedIslands[scene]&&snapshot().heardTracks[theme])return;
  const data=snapshot(),tracks={...data.heardTracks};tracks.festival=true;
  if(scene==='HUB')tracks.market=true;if(scene==='ILHA_SURF')tracks.ocean=true;if(scene==='ILHA_ESCALADA')tracks.mountain=true;
  persist({visitedIslands:{...data.visitedIslands,[scene]:true},heardTracks:tracks});
 }
 function tryStart(scene){
  if(!cfg||cut||ui||!overworld(scene)||medalCount()<1||snapshot().merchantArrivalSeen||cfg.busy()||!A.image.complete||!A.image.naturalWidth)return false;
  cut={index:0,time:0,total:0,pathIndex:0,build:0,returnPoint:cfg.point(),background:cfg.captureHub(),previous:cfg.captureFrame()};
  actor.x=425;actor.y=148;actor.direction='left';A.pose(actor,'idle_left');cfg.clearInput();cfg.hideDialogue();return true;
 }
 function phase(){return cut?shots[cut.index][0]:'INACTIVE';}
 function next(){cut.index++;cut.time=0;cut.pathIndex=0;}
 function walkPath(points,dt){if(cut.pathIndex>=points.length)return true;if(A.move(actor,points[cut.pathIndex],dt))cut.pathIndex++;return cut.pathIndex>=points.length;}
 function finish(){if(!W.unlockMerchant()){saveError=true;return false;}
  const p=cut.returnPoint;cut=null;saveError=false;actor.x=npc.x;actor.y=npc.y;actor.direction='down';A.pose(actor,'idle_down');cfg.clearInput();cfg.restore(p);return true;
 }
 function tickCut(dt){cut.time+=dt;cut.total+=dt;const id=phase();
  if(id==='ARRIVE'){if(walkPath([[342,148],[342,111]],dt))next();return;}
  if(id==='SIGN_WALK'){if(walkPath([[281,162],[281,222]],dt))next();return;}
  if(id==='RETURN'){if(walkPath([[281,162],[342,111]],dt))next();return;}
  if(id==='COUNTER')cut.build=Math.max(1,cut.build);if(id==='ROOF')cut.build=Math.max(2,cut.build);if(id==='PRODUCTS')cut.build=Math.max(3,cut.build);if(id==='SIGN')cut.build=4;
  A.pose(actor,['BAG','COUNTER'].includes(id)?'bag':['ROOF','PRODUCTS','SIGN'].includes(id)?'present':id==='SHIP'?'surprised':['HAPPY','SPEECH','FADE_BACK'].includes(id)?'happy':id==='LOOK'?'idle_left':'idle_down',dt);
  if(id==='SPEECH'||saveError)return;
  if(cut.time>=shots[cut.index][1]){if(id==='FADE_BACK')finish();else next();}
 }
 function animate(state,duration=1.3){anim=state;animTime=duration;A.pose(actor,state);}
 function dialogue(){const n=medalCount();let text=n<=1?'Primeira medalha? Eu reconheço um bom começo. Trouxe ferramentas para a viagem, não atalhos para a vitória.'
  :n<=3?'Duas coisas crescem por aqui: sua coleção e a minha vontade de conhecer novos clientes. Vá no seu ritmo.'
  :n<=5?'Você já conhece metade do arquipélago. Quem viaja bastante aprende a reconhecer bons caminhos... e bons mapas.'
  :n<=7?'Falta pouco! Uma mochila útil pesa menos que uma viagem cheia de arrependimentos.'
  :'Oito medalhas! Agora o destino é seu. Eu negocio ferramentas; o rumo da viagem continua sendo escolha sua.';
  if(W.coins>=100)text+=' Cem moedas ou mais? Uma bela reserva. Há viagens que pedem dinheiro guardado.';
  if(cfg.nearShip?.()||snapshot().merchantArrivalSeen&&n===1)text+=' E aquela nave? Já negociei longe daqui, mas o seu estacionamento é excelente.';
  return text;
 }
 function open(mode,extra={}){if(!cfg||!overworld(cfg.scene())||cfg.busy()||cut)return false;
  cfg.clearInput();cfg.hideDialogue();toastTime=0;ui={mode,selected:0,time:0,lock:.16,...extra};
  if(mode==='talk')animate('talk',2);return true;
 }
 function close(){ui=null;g.MerchantMusic?.stop();cfg.clearInput();cfg.hideDialogue();}
 function interact(n){if(n.id!=='comerciante_central'||!visible())return null;open('talk',{text:dialogue()});return '> COMERCIANTE: '+dialogue();}
 function useItem(id){if(!owns(id))return false;
  if(id==='island_map')return open('map');
  if(id==='teleporter')return open('teleport');
  if(id==='records')return open('records');
  if(id==='destiny_letter'){animate('talk',1);return open('letter');}
  if(id==='quest_scanner')return open('info',{title:'SCANNER ATIVO',text:'O mapa agora mostra MISSÃO DISPONÍVEL, EM PROGRESSO ou CONCLUÍDA. Os objetivos continuam sendo apresentados pelos próprios NPCs.'});
  return open('info',{title:'INSTALADO NA NAVE',text:'A melhoria está instalada. Aproxime-se da nave e use F para acessar seus equipamentos.'});
 }
 function buy(id){if(!ui||cut||!visible())return 'locked';ui.sale=false;const first=!snapshot().firstPurchaseSeen,result=W.purchaseItem(id),item=C.items.find(i=>i.id===id);
  if(result==='purchased'){
   animate('present',.55);ui.saleAge=0;ui.sale=true;
   ui.note=id==='destiny_letter'?'Essa carta percorreu muitos portos. As marcas fazem mais perguntas do que promessas.'
    :first?'Primeira compra! Guarde bem: ferramenta boa acompanha a jornada inteira.'
    :item.price>=25?'Uma compra de respeito. Eu conto as moedas; você escolhe até onde ir.':'Bom negócio. Já está na sua mochila ou instalado na nave!';
  }else{animate(result==='insufficient_coins'?'surprised':'talk',1.2);ui.note=result==='insufficient_coins'?'O bolso ainda não acompanha os planos. Pode voltar depois, sem compromisso.'
   :result==='already_owned'?'Este já é seu. Não vou cobrar duas vezes pelo mesmo produto.'
   :result==='save_failed'?'Não consegui registrar a venda. Nenhuma moeda foi cobrada.':'A loja ainda está sendo preparada.';}
  ui.mode='shop';ui.selected=C.items.findIndex(i=>i.id===id);ui.lock=.45;return result;
 }
 function list(){if(!ui)return [];
  if(ui.mode==='talk')return ['VER MERCADORIAS','CONTINUAR VIAGEM'];
  if(ui.mode==='shop')return C.items;
  if(ui.mode==='backpack')return C.items.filter(i=>owns(i.id));
  if(['map','teleport'].includes(ui.mode))return ui.mode==='teleport'?C.regions.filter(r=>snapshot().visitedIslands[r.id]):C.regions;
  if(ui.mode==='ship')return [owns('jukebox')?'JUKEBOX DA NAVE':null,owns('ship_customizer')?'PERSONALIZADOR DA NAVE':null].filter(Boolean);
  if(ui.mode==='customizer')return C.styles;
  if(ui.mode==='jukebox')return g.MerchantMusic.tracks.filter(t=>snapshot().heardTracks[t.id]);
  if(ui.mode==='buy_confirm')return ['CANCELAR','COMPRAR'];
  if(ui.mode==='travel_confirm')return ['CANCELAR','VIAJAR'];
  return [];
 }
 function confirm(){if(!ui||ui.lock>0)return;
  const selected=list()[ui.selected];
  if(ui.mode==='talk'){if(ui.selected===0){ui.mode='shop';ui.selected=0;ui.note='Tudo opcional. Se quiser, guarde 100 moedas para outras viagens.';animate('present',1);}else close();}
  else if(ui.mode==='shop'&&selected){if(owns(selected.id)){ui.note='JÁ ADQUIRIDO. Este produto é seu.';animate('talk',.7);}else{ui.mode='buy_confirm';ui.itemId=selected.id;ui.previous=ui.selected;ui.selected=0;ui.lock=.2;animate('present',1);}}
  else if(ui.mode==='buy_confirm'){if(ui.selected===1)buy(ui.itemId);else{ui.mode='shop';ui.selected=ui.previous||0;}}
  else if(ui.mode==='backpack'&&selected)useItem(selected.id);
  else if(['map','teleport'].includes(ui.mode)&&selected){if(!owns('teleporter')){message('Teletransporte portátil não adquirido.');return;}if(!snapshot().visitedIslands[selected.id]){message('Você ainda não visitou essa ilha.');return;}ui={mode:'travel_confirm',selected:0,destination:selected.id,time:0,lock:.2};}
  else if(ui.mode==='travel_confirm'){if(ui.selected===0)open('map');else beginTravel(ui.destination);}
  else if(ui.mode==='ship'&&selected)open(selected==='JUKEBOX DA NAVE'?'jukebox':'customizer');
  else if(ui.mode==='customizer'&&selected){persist({shipStyle:selected});ui.note='VISUAL APLICADO. Nenhum atributo foi alterado.';}
  else if(ui.mode==='jukebox'&&selected){g.MerchantMusic.play(selected.id);ui.note='TOCANDO: '+selected.name;}
  else if(['info','letter','records'].includes(ui.mode))open('backpack');
 }
 function beginTravel(id){if(!cfg||!overworld(cfg.scene())||cfg.busy()||cut||ui?.mode==='travel')return false;
  if(!owns('teleporter')||!snapshot().visitedIslands[id]){message('Destino não autorizado.');return false;}
  const region=C.regions.find(r=>r.id===id);const point=region&&cfg.landing(region);if(!point){message('O destino não está livre. Tente depois.');return false;}
  ui={mode:'travel',time:0,lock:1,destination:id,point,moved:false};cfg.clearInput();return true;
 }
 function handleKeyDown(e){const key=e.key.toLowerCase(),wasHeld=held.has(key);held.add(key);
  if(cut){e.preventDefault?.();e.stopImmediatePropagation?.();if(!e.repeat&&!wasHeld&&key===' '&&phase()==='SPEECH'&&cut.time>=.6)next();else if(saveError&&!e.repeat&&!wasHeld&&key===' ')finish();return true;}
  if(ui&&cfg.busy()){close();return false;}
  if(ui){e.preventDefault?.();e.stopImmediatePropagation?.();if(e.repeat||wasHeld||ui.lock>0)return true;
   if(key==='escape'||key==='b'){close();return true;}
   if(key==='s'||key==='arrowdown'||key==='d'||key==='arrowright')ui.selected=(ui.selected+1)%Math.max(1,list().length);
   else if(key==='w'||key==='arrowup'||key==='a'||key==='arrowleft')ui.selected=(ui.selected-1+Math.max(1,list().length))%Math.max(1,list().length);
   else if([' ','e','enter'].includes(key))confirm();return true;
  }
  if(!cfg||!overworld(cfg.scene())||cfg.busy()||e.repeat||wasHeld)return false;
  if(key==='b'){e.preventDefault?.();e.stopImmediatePropagation?.();open('backpack');return true;}
  if(key==='m'){e.preventDefault?.();e.stopImmediatePropagation?.();if(!owns('island_map'))message('Você ainda não possui um mapa.');else open('map');return true;}
  if(key==='f'&&cfg.nearShip?.()&&(owns('jukebox')||owns('ship_customizer'))){e.preventDefault?.();e.stopImmediatePropagation?.();open('ship');return true;}
  return false;
 }
 function startGame(id){const aliases={basketball:'basquete',marathon:'corrida',archery:'arco',climbing:'escalada',boxing:'boxe'};id=aliases[id]||id;
  if(!Object.values(C.sports).includes(id))return;gameStarted=id;gameBest=null;
  const data=snapshot();persist({playedSports:{...data.playedSports,[id]:true}});
 }
 function observeRecords(){if(!gameStarted||!cfg.record)return;const r=cfg.record(gameStarted);if(!r||!Number.isFinite(r.value)||r.value<0)return;
  if(!gameBest||(r.lowerIsBetter?r.value<gameBest.value:r.value>gameBest.value))gameBest={...r};
 }
 function flushRecord(){if(!gameStarted)return;if(gameBest){const data=snapshot(),old=data.records[gameStarted],r=gameBest;
  if(!old||(r.lowerIsBetter?r.value<old.best:r.value>old.best))persist({records:{...data.records,[gameStarted]:{best:r.value,label:r.label,unit:r.unit||'',lowerIsBetter:!!r.lowerIsBetter}}});}
  gameStarted=null;gameBest=null;
 }
 function update(scene,seconds){if(!cfg)return false;const now=performance.now(),dt=seconds??(document.hidden?0:Math.min(.05,Math.max(0,(now-last)/1000)));last=now;clock+=dt;toastTime=Math.max(0,toastTime-dt);
  if(gameStarted){if(scene.startsWith('JOGO_'))observeRecords();else flushRecord();}
  if(!cut&&!ui&&overworld(scene)&&!cfg.busy())updateVisit(scene);
  if(ui&&cfg.busy()){close();return false;}
  if(cut){tickCut(dt);return true;}
  if(tryStart(scene))return true;
  if(ui){ui.time+=dt;ui.lock=Math.max(0,ui.lock-dt);
   if(ui.sale){ui.saleAge+=dt;const state=ui.saleAge<.55?'present':ui.saleAge<1.2?'coins':'happy';animateIfChanged(state);if(ui.saleAge>2)ui.sale=false;}
   if(ui.mode==='travel'){if(ui.time>=.4&&!ui.moved){
    const region=C.regions.find(r=>r.id===ui.destination),fresh=region&&cfg.landing(region);
    if(!owns('teleporter')||!snapshot().visitedIslands[ui.destination]||!fresh){close();message('Viagem cancelada: destino indisponível.');return true;}
    ui.point=fresh;cfg.restore(fresh);updateVisit(fresh.scene);ui.moved=true;}if(ui.time>=.8){close();}return true;}
  }
  if(animTime>0){animTime-=dt;A.pose(actor,anim,dt);}else if(visible()){
   const near=cfg.scene()==='HUB'&&Math.hypot(cfg.point().x-npc.x,cfg.point().y-npc.y)<95;
   A.pose(actor,near&&clock%9<1.4?'beckon':'idle_down',dt);
  }
  wasScene=scene;return !!ui;
 }
 function animateIfChanged(state){if(anim!==state||animTime<=0)animate(state,.3);}
 function boxHits(b,r){return b.x<r.x+r.w&&b.x+b.w>r.x&&b.y<r.y+r.h&&b.y+b.h>r.y;}
 function blocks(b){if(!visible())return false;return [{x:303,y:99,w:93,h:21},{x:292,y:222,w:113,h:5}].some(r=>boxHits(b,r));}
 function bagProp(ctx){ctx.fillStyle='#443025';ctx.fillRect(289,109,15,13);ctx.fillStyle='#9c7147';ctx.fillRect(291,110,11,10);ctx.fillStyle='#d1a265';ctx.fillRect(292,108,9,3);ctx.fillRect(294,104,5,2);ctx.fillStyle='#edc477';ctx.fillRect(295,112,3,4);}
 function shopBack(ctx,level){if(level<1)return;ctx.fillStyle='#17322d44';ctx.fillRect(293,112,113,13);bagProp(ctx);ctx.fillStyle='#8d6746';ctx.fillRect(301,87,96,25);ctx.fillStyle='#bc9461';ctx.fillRect(302,87,94,3);
  ctx.fillStyle='#70523c';ctx.fillRect(292,98,14,20);ctx.fillStyle='#b18857';ctx.fillRect(294,100,10,14);
  if(level<2)return;ctx.fillStyle='#5e4736';ctx.fillRect(300,59,3,52);ctx.fillRect(397,59,3,52);
  ctx.fillStyle='#234b4b';ctx.fillRect(295,48,108,16);for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#edc06c':'#477e72';ctx.fillRect(295+i*12,49,12,15);}ctx.fillStyle='#e2c18a';ctx.fillRect(293,63,112,3);
  ctx.fillStyle='#31453b';ctx.fillRect(311,50,78,12);g.MerchantUI.text(ctx,'FEIRA VIAJANTE',350,53,{align:'center',color:'#fff0c0'});
 }
 function counter(ctx,level){if(level<1)return;ctx.fillStyle='#4a382d';ctx.fillRect(301,104,98,16);ctx.fillStyle='#b48655';ctx.fillRect(303,106,94,12);ctx.fillStyle='#e0b478';ctx.fillRect(299,102,102,5);
  ctx.fillStyle='#88613d';for(let x=310;x<396;x+=14)ctx.fillRect(x,108,1,9);
  if(level>=3){for(let i=0;i<5;i++){ctx.fillStyle=['#7ac9bc','#d6a754','#748cbe','#b6c570','#dba56c'][i];ctx.fillRect(309+i*17,96-i%2*2,10,7+i%2*2);ctx.fillStyle='#f1dfad';ctx.fillRect(311+i*17,95-i%2*2,6,2);}}
 }
 function drawSign(ctx,x=290,y=175){ctx.save();ctx.fillStyle='#4e392b';ctx.fillRect(x+7,y+41,4,13);ctx.fillRect(x+101,y+41,4,13);ctx.fillStyle='#432f24';ctx.fillRect(x,y,116,49);ctx.fillStyle='#f5deb0';ctx.fillRect(x+2,y+2,112,44);ctx.fillStyle='#976c40';ctx.fillRect(x+5,y+5,106,1);
  C.sign.forEach((line,i)=>g.MerchantUI.text(ctx,line,x+58,y+9+i*12,{align:'center',color:'#2a2828',accents:true}));ctx.restore();}
 function actors(scene){if(scene!=='HUB'||!visible())return [];return [{y:58,draw:()=>shopBack(cfg.ctx,4)},{y:120,draw:()=>counter(cfg.ctx,4)},{y:227,draw:()=>drawSign(cfg.ctx)}];}
 function drawCut(ctx){const id=phase(),level=cut.build;ctx.save();ctx.imageSmoothingEnabled=false;
  if(id==='FADE'){ctx.drawImage(cut.previous,0,0);ctx.fillStyle='#07111d';ctx.globalAlpha=Math.min(1,cut.time/.55);ctx.fillRect(0,0,450,300);ctx.restore();return;}
  if(id==='SHIP'){ctx.translate(225,150);ctx.scale(1.12,1.12);ctx.translate(-225,-150);}
  ctx.drawImage(cut.background,0,0);shopBack(ctx,level);if(cut.index>=3&&level===0)bagProp(ctx);
  const world=cfg.hubActors();world.push({y:150,draw:()=>g.AdventureIntro.drawParked(ctx)});world.push({y:actor.y,draw:()=>A.draw(ctx,actor)});if(level>=1)world.push({y:120,draw:()=>counter(ctx,level)});if(level>=4)world.push({y:227,draw:()=>drawSign(ctx)});world.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
  if(id==='SHIP'){ctx.strokeStyle='#f1d289';ctx.strokeRect(177,104,96,61);g.MerchantUI.text(ctx,'CLIENTELA... INTERPLANETÁRIA?',225,184,{align:'center',color:'#f5e3ad'});}
  if(id==='SIGN'){ctx.strokeStyle='#ffe29b';ctx.strokeRect(287,172,122,55);}
  if(id==='SPEECH'||saveError){g.MerchantUI.dialogue(ctx,'COMERCIANTE',saveError?'Não consegui salvar a montagem. [ESPAÇO] TENTAR NOVAMENTE':'Pronto. Clientela interplanetária garantida.',id==='SPEECH'&&cut.time>=.6);}
  if(id==='FADE_BACK'){ctx.fillStyle='#07111d';ctx.globalAlpha=Math.min(1,cut.time/.55);ctx.fillRect(0,0,450,300);}
  ctx.restore();
 }
 function draw(ctx){if(cut||ui)cfg.hideDialogue();if(cut){drawCut(ctx);return;}if(ui)g.MerchantUI.draw(ctx,ui,{items:C.items,regions:C.regions,data:snapshot(),coins:W.coins,list:list(),owns,currentScene:cfg.scene(),mapState:g.FestivalProgress?.mapState(cfg.scene()),destinations:g.FestivalProgress?.destinations(),medalCount:medalCount(),ravokArrived:g.RavokEvent?.ravokArrivalSeen===true});
  if(toastTime>0&&!cut){ctx.fillStyle='#0b1b2ded';ctx.fillRect(25,251,400,30);g.MerchantUI.wrap(ctx,toast,35,259,380,{color:'#ffe5a3'});}
  if(!ui&&cfg?.nearShip?.()&&(owns('jukebox')||owns('ship_customizer'))){g.MerchantUI.text(ctx,'[F] EQUIPAMENTOS DA NAVE',225,218,{align:'center',color:'#fff0bd'});}
 }
 function drawShipAccent(ctx){if(!visible()||!owns('ship_customizer'))return;const style=snapshot().shipStyle;if(style==='ORIGINAL')return;
  ctx.save();ctx.fillStyle=style==='AURORA'?'#bd83df':'#efd077';for(let i=-2;i<=2;i++)ctx.fillRect(225+i*14-2,140,4,3);ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(225,136,40,8,0,.15,Math.PI-.15);ctx.stroke();ctx.restore();}
 g.addEventListener('keydown',e=>handleKeyDown(e),true);
 g.addEventListener('keyup',e=>{held.delete(e.key.toLowerCase());if(cut||ui){e.preventDefault?.();e.stopImmediatePropagation?.();cfg?.clearInput();}},true);
 g.addEventListener('blur',()=>{held.clear();cfg?.clearInput();});
 g.MerchantCampaign=Object.freeze({npc,actor,init(options){cfg=options;last=performance.now();npc.interactionWidth=58;npc.interactionHeight=70;npc.interactionOffsetY=38;
   // A medal proves that its island and sport were reached in a legacy save.
   // Historical scores that were never stored are not fabricated.
   const data=snapshot(),map={ILHA_ESQUI:'boxe',ILHA_PINGPONG:'pingpong',ILHA_SURF:'surf',ILHA_SKATE:'skate',ILHA_BASQUETE:'basquete',ILHA_CORRIDA:'corrida',ILHA_ARCO:'arco',ILHA_ESCALADA:'escalada'};let changed=false;
   for(const [region,id]of Object.entries(map))if(g.isMedalhaDesbloqueada?.(id)){data.visitedIslands[region]=true;data.playedSports[id]=true;changed=true;}
   try{const best=Number(localStorage.getItem('zorpSurfBestScore'));if(Number.isFinite(best)&&best>0&&!data.records.surf){data.playedSports.surf=true;data.visitedIslands.ILHA_SURF=true;data.records.surf={best,label:'Pontuação',unit:'PTS',lowerIsBetter:false};changed=true;}}catch(_){}
   if(changed)persist({visitedIslands:data.visitedIslands,playedSports:data.playedSports,records:data.records});
  },
  get active(){return !!cut||!!ui;},get cutsceneActive(){return !!cut;},get merchantArrivalSeen(){return snapshot().merchantArrivalSeen;},get merchantUnlocked(){return snapshot().merchantUnlocked;},
  tryStart,update,draw,actors,blocks,interact,isNpcVisible:n=>n.eventId!=='merchant'||visible(),drawActor:ctx=>A.draw(ctx,actor),drawShipAccent,
  owns,open,useItem,buy,beginTravel,startGame,dialogue,
  snapshot:()=>({visible:visible(),cutscene:cut?{phase:phase(),time:cut.time,total:cut.total,build:cut.build}:null,ui:ui?{...ui}:null,animation:A.diagnostics(actor),data:snapshot(),toast:toastTime>0?toast:null,gameStarted})});
 g.FestivalBackpack=Object.freeze({get items(){return C.items.filter(item=>owns(item.id));},open:()=>open('backpack'),use:useItem,owns});
})(window);
