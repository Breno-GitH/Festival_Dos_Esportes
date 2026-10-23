const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(route,completed=false,n=8,extra={}){
 const saved={version:6,arrived:true,ravokArrivalSeen:true,ravokExited:true,ravokProposalSeen:true,ravokChoice:route,ravokEndingCompleted:completed,ravokBadEndingSeen:route==='accept'&&completed,...extra},store=new Map([['zorp_ravok_event',JSON.stringify(saved)]]),listeners=new Map();
 let clock=0,scene='ILHA_ESCALADA',menus=0,returns=0,fail=false;
 const images=[];
 class TestImage{constructor(){images.push(this);}set src(value){this._src=value;this.complete=true;this.naturalWidth=1536;this.naturalHeight=1024;this.onload?.();}get src(){return this._src;}}
 const env={console,Image:TestImage,performance:{now:()=>clock},document:{hidden:false,createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}})})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('quota');store.set(k,v);}},
  MEDALHAS_REGISTRY:Array.from({length:8},(_,i)=>({id:'m'+i})),isMedalhaDesbloqueada:id=>Number(id.slice(1))<n,
  addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);}};
 env.window=env;vm.createContext(env);for(const f of ['ravok_npc_geometry.js','ravok_event.js','ending_card.js','ravok_bad_ending.js','ravok_arrest.js','ravok_outcome.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),env);
 env.RavokEvent.sync();env.RavokOutcome.init({player:{x:373,y:137},busy:()=>false,captureIsland:()=>({}),captureHome:()=>({}),clearInput(){},enter:()=>scene='RAVOK_SECRET_CUTSCENE',returnMenu:()=>{menus++;scene='TITLE_SCREEN';},resumeOverworld:()=>{returns++;scene='ILHA_ESCALADA';}});
 const gradient={addColorStop(){}},ctx=new Proxy({createRadialGradient:()=>gradient,measureText:t=>({width:t.length*5.4})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const tick=(ms=100,render=true)=>{clock+=ms;env.RavokOutcome.update(scene);if(render&&['CARD','CARD_FADE_OUT'].includes(env.RavokOutcome.snapshot().phase))env.RavokOutcome.draw(ctx);};
 const key=(key,repeat=false,type='keydown')=>{for(const fn of listeners.get(type)||[])fn({key,repeat,preventDefault(){},stopImmediatePropagation(){}});};
 return {env,store,tick,key,images,menus:()=>menus,returns:()=>returns,scene:()=>scene,setFail:v=>fail=v};
}
for(const route of ['accept'])test(route+': saved choice resumes the correct cutscene; completion waits for its last fade',()=>{
 const g=setup(route);g.tick();assert.equal(g.env.RavokOutcome.active,true);assert.equal(g.env.RavokOutcome.snapshot().route,route);
 const phases=new Set();g.key(' ');for(let i=0;i<700;i++){
  const s=g.env.RavokOutcome.snapshot();phases.add(s.phase);
  if(s.phase==='CARD')break;
  assert.equal(g.env.RavokEvent.endingCompleted,false);g.key(' ',true);g.tick();
 }
 assert.ok(phases.has(route==='accept'?'SILENT_AFTERMATH':'CUSTODY'));assert.ok(phases.has('FADE'));assert.equal(g.env.RavokOutcome.snapshot().phase,'CARD');assert.equal(g.env.RavokEvent.endingCompleted,route==='refuse');assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);
 for(let i=0;i<34;i++)g.tick();g.key(' ',true);assert.equal(g.menus(),0);g.key(' ',false,'keyup');g.key(' ');for(let i=0;i<9;i++)g.tick();assert.equal(g.menus(),1);
 const saved=JSON.parse(g.store.get('zorp_ravok_event'));assert.equal(saved.ravokChoice,route);assert.equal(saved.ravokEndingCompleted,true);
});
test('completed saved ending does not replay; seven medals and missing choices cannot start',()=>{
 for(const g of [setup('accept',true),setup('refuse',false,8,{ravokArrested:true}),setup('accept',false,7),setup(null)]){g.tick();assert.equal(g.env.RavokOutcome.active,false);}
});
test('Space never skips timed scenes; hiding the document pauses progress',()=>{
 const g=setup('accept');g.tick();for(let i=0;i<50;i++){g.key(' ');g.key(' ',false,'keyup');}assert.equal(g.env.RavokOutcome.snapshot().phase,'SILENT_ACCEPTANCE');
 g.env.document.hidden=true;for(let i=0;i<100;i++)g.tick();assert.equal(g.env.RavokOutcome.snapshot().time,0);assert.equal(g.env.RavokEvent.endingCompleted,false);
});
function finishArrest(g){
 const phases=new Set();for(let i=0;i<1400;i++){
  const s=g.env.RavokOutcome.snapshot();if(!s.active)break;phases.add(s.phase);
  assert.notEqual(s.phase,'CARD');assert.equal(g.env.RavokEvent.endingCompleted,false);
  if(s.waitingForSpace&&s.time>=.5){g.key(' ');g.key(' ',false,'keyup');}g.tick();
 }return phases;
}
test('refusal plays authorities, disables and removes evidence, saves arrest, then resumes Overworld without any card or menu',()=>{
 const g=setup('refuse');g.tick();const phases=finishArrest(g);
 for(const id of ['TRANSMIT','AUTHORITY_ARRIVAL','ENCIRCLEMENT','REMOTE_DISABLE','OFFICER_CHARGES','MEDALS','K7_EVIDENCE','RAVOK_ESCORT','AUTHORITIES_DEPART','FADE'])assert.ok(phases.has(id),id);
 assert.equal(g.env.RavokEvent.ravokArrested,true);assert.equal(g.env.RavokEvent.endingCompleted,false);assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);
 assert.equal(g.returns(),1);assert.equal(g.menus(),0);assert.equal(g.scene(),'ILHA_ESCALADA');for(let i=0;i<20;i++)g.tick();assert.equal(g.returns(),1);
 const saved=JSON.parse(g.store.get('zorp_ravok_event')),reload=setup('refuse',false,8,saved);reload.tick();assert.equal(reload.env.RavokOutcome.active,false);assert.equal(reload.env.RavokEvent.snapshot().npcs.length,0);
});
test('failed arrest save holds the final scene, preserves the campaign and allows retry',()=>{
 const g=setup('refuse');g.tick();g.setFail(true);finishArrest(g);
 assert.equal(g.env.RavokOutcome.snapshot().saveFailed,true);assert.equal(g.env.RavokOutcome.snapshot().pendingSave,'arrest');assert.equal(g.env.RavokEvent.ravokArrested,false);assert.equal(g.returns(),0);assert.equal(g.menus(),0);
 g.setFail(false);g.key(' ');assert.equal(g.env.RavokEvent.ravokArrested,true);assert.equal(g.returns(),1);assert.equal(g.env.RavokEvent.endingCompleted,false);
});
test('refusal requires separate Space presses for every line; timed shots and hidden tabs cannot be skipped',()=>{
 const g=setup('refuse');g.tick();for(let i=0;i<20;i++)g.tick();assert.equal(g.env.RavokOutcome.snapshot().phase,'REFUSAL');
 g.key(' ');assert.equal(g.env.RavokOutcome.snapshot().phase,'MISUNDERSTANDING');for(let i=0;i<10;i++)g.tick();g.key(' ',true);assert.equal(g.env.RavokOutcome.snapshot().phase,'MISUNDERSTANDING');
 g.key(' ',false,'keyup');g.env.document.hidden=true;g.key(' ');assert.equal(g.env.RavokOutcome.snapshot().phase,'MISUNDERSTANDING');
});

test('acceptance card persists before completion, and reload resumes that card instead of Earth',()=>{
 const g=setup('accept');g.tick();for(let i=0;i<700&&g.env.RavokOutcome.snapshot().phase!=='CARD';i++)g.tick();
 const saved=JSON.parse(g.store.get('zorp_ravok_event'));
 assert.equal(saved.ravokBadEndingCardReady,true);assert.equal(saved.ravokBadEndingSeen,false);assert.equal(saved.ravokEndingCompleted,false);
 const again=setup('accept',false,8,saved);again.tick();assert.equal(again.env.RavokOutcome.snapshot().phase,'CARD');
 for(let i=0;i<34;i++)again.tick();again.key(' ');for(let i=0;i<9;i++)again.tick();assert.equal(again.menus(),1);
 const done=JSON.parse(again.store.get('zorp_ravok_event'));assert.equal(done.ravokBadEndingSeen,true);assert.equal(done.ravokEndingCompleted,true);
 const closed=setup('accept',true,8,done);closed.tick();assert.equal(closed.menus(),1);assert.equal(closed.env.RavokOutcome.active,false);
 assert.equal(closed.env.RavokOutcome.openSavedEnding(),true);assert.equal(closed.env.RavokOutcome.snapshot().phase,'CARD');
});
test('acceptance cannot complete before the card, and a failed card-dismiss save cannot return to the world/menu',()=>{
 const g=setup('accept');assert.equal(g.env.RavokEvent.completeEnding('accept'),false);g.tick();
 for(let i=0;i<700&&g.env.RavokOutcome.snapshot().phase!=='CARD';i++)g.tick();for(let i=0;i<34;i++)g.tick();
 g.setFail(true);g.key(' ');assert.equal(g.menus(),0);assert.equal(g.env.RavokOutcome.active,true);assert.equal(g.env.RavokOutcome.snapshot().pendingSave,'menu');assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);
 g.key(' ',false,'keyup');g.setFail(false);g.key(' ');for(let i=0;i<9;i++)g.tick();assert.equal(g.menus(),1);assert.equal(g.env.RavokEvent.ravokBadEndingSeen,true);
});
test('old completed acceptance restores the new card without setting its new seen flag early',()=>{
 const g=setup('accept',true,8,{version:5,ravokBadEndingSeen:false});
 assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);assert.equal(g.env.RavokEvent.endingCompleted,false);
 g.tick();assert.equal(g.env.RavokOutcome.snapshot().phase,'CARD');
 for(let i=0;i<34;i++)g.tick();g.key(' ');assert.equal(g.env.RavokEvent.ravokBadEndingSeen,true);for(let i=0;i<9;i++)g.tick();assert.equal(g.menus(),1);
});
test('every acceptance shot draws with both original hulls; the damaged planet is always a distant abstraction',()=>{
 const g=setup('accept'),calls=[],texts=[];
 g.env.AdventureIntro={earth:(...a)=>calls.push(['earth',...a.slice(1)]),drawShip:(...a)=>calls.push(['zorp',...a.slice(1)])};
 g.env.RavokEvent={...g.env.RavokEvent,drawShip:(...a)=>calls.push(['ravok',...a.slice(1)])};
 const gradient={addColorStop(){}},ctx=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,measureText:t=>({width:t.length*6}),fillText:t=>texts.push(t)},{get:(o,k)=>k in o?o[k]:(()=>{})});
 g.env.RavokBadEnding.prepare({island:{},home:{},origin:{x:368,y:132},drawZorp(){},drawNpc(){},caption(){}});
 for(const [id] of g.env.RavokBadEnding.shots)for(const p of [0,.2,.5,.9,1])g.env.RavokBadEnding.draw(ctx,id,p,p*5);
 calls.length=0;g.env.RavokBadEnding.draw(ctx,'SPACE_ESTABLISH',.5,1);
 assert.equal(calls.filter(c=>c[0]==='earth').length,1);assert.equal(calls.find(c=>c[0]==='earth')[3],46);assert.ok(calls.some(c=>c[0]==='zorp'));assert.ok(calls.some(c=>c[0]==='ravok'));
 calls.length=0;g.env.RavokBadEnding.draw(ctx,'SILENT_AFTERMATH',.5,1);assert.equal(calls.some(c=>c[0]==='earth'),false);
 g.env.RavokBadEnding.draw(ctx,'CARD',1,3);assert.equal(g.env.RavokBadEnding.snapshot().card.title,'A MAIOR CONQUISTA');assert.equal(g.env.RavokBadEnding.snapshot().card.titleFont,'LOCAL_BITMAP_5x7');assert.ok(texts.includes('[SPACE] CONTINUAR'));
});

test('all arrest shots render, officer text fits and the eight actual medal icons can be drawn',()=>{
 const g=setup('refuse'),texts=[];const gradient={addColorStop(){}},ctx=new Proxy({createRadialGradient:()=>gradient,measureText:t=>({width:t.length*6}),fillText:(t,x,y)=>texts.push({t,x,y})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 g.env.document.createElement=()=>({width:0,height:0,getContext:()=>ctx});
 g.env.RavokEvent={...g.env.RavokEvent,drawShip(){}};
 g.env.RavokArrest.prepare({island:{},clearedIsland:{},origin:{x:368,y:132},drawNpc(){},drawZorp(){}});
 for(const [id]of g.env.RavokArrest.shots)for(const p of [0,.3,.7,1])g.env.RavokArrest.draw(ctx,id,p,p*3);
 assert.ok(texts.some(s=>s.t==='OFICIAL'));assert.ok(texts.some(s=>s.t==='Ravok Noxaris.'));assert.ok(texts.every(s=>s.y<=288&&s.y>=0));
 assert.equal(g.env.RavokArrest.snapshot().endingCard,false);
});

test('official acceptance portrait crops the entire frontal head with one uniform scale and one cached surface',()=>{
 const g=setup('accept'),copies=[],draws=[];
 const gradient={addColorStop(){}},ctx=new Proxy({createRadialGradient:()=>gradient,measureText:t=>({width:t.length*6}),drawImage:(...a)=>draws.push(a)},{get:(o,k)=>k in o?o[k]:(()=>{})});
 g.env.document.createElement=()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage:(...a)=>{if(a[0].src)copies.push(a);}})});
 g.env.RavokBadEnding.draw(ctx,'CARD',1,3);g.env.RavokBadEnding.draw(ctx,'CARD',1,4);
 assert.equal(copies.length,1);assert.equal(copies[0][0].src,'card_zorp_MaiorConquista.png?v=1.0.0_official_secret_card');
 assert.deepEqual(copies[0].slice(1),[892,141,179,217,0,0,179,217]);
 const portraits=draws.filter(d=>d[0].width===179&&d[0].height===217);assert.equal(portraits.length,2);
 assert.ok(Math.abs(portraits[0][3]/179-portraits[0][4]/217)<1e-12);assert.ok(Math.abs(portraits[0][3]-179*164/217)<1e-10);assert.ok(Math.abs(portraits[0][4]-164)<1e-10);
 assert.equal(g.env.RavokBadEnding.snapshot().card.status,'ready');assert.equal(ctx.imageSmoothingEnabled,false);
});
test('failed official card load cannot close the card or award completion; Space retries the same real file',()=>{
 const g=setup('accept'),errors=[];g.env.console={...console,error:(...a)=>errors.push(a)};
 const image=g.images.find(i=>i.src.startsWith('card_zorp_MaiorConquista.png'));image.onerror();g.tick();
 for(let i=0;i<730&&g.env.RavokOutcome.snapshot().phase!=='CARD';i++)g.tick();for(let i=0;i<34;i++)g.tick();
 g.key(' ');assert.equal(g.menus(),0);assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);
 assert.equal(image.src,'card_zorp_MaiorConquista.png?v=1.0.0_official_secret_card');assert.equal(g.env.RavokBadEnding.cardReady,true);
 for(let i=0;i<34;i++)g.tick();g.key(' ',false,'keyup');g.key(' ');for(let i=0;i<9;i++)g.tick();assert.equal(g.menus(),1);assert.equal(g.env.RavokEvent.ravokBadEndingSeen,true);assert.equal(errors.length,1);
});


test('a loaded image and elapsed clock cannot complete a card that has never been drawn',()=>{
 const g=setup('accept',false,8,{ravokBadEndingCardReady:true});g.tick(100,false);
 for(let i=0;i<40;i++)g.tick(100,false);g.key(' ');
 assert.equal(g.env.RavokOutcome.snapshot().cardPresentation.presented,false);
 assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);assert.equal(g.menus(),0);
 g.key(' ',false,'keyup');g.tick();g.key(' ');
 assert.equal(g.env.EndingCard.snapshot().presented,false);
 assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);
});

test('held Space, repeats and hidden tabs cannot dismiss the reveal; a fresh press fades before returning once',()=>{
 const g=setup('accept',false,8,{ravokBadEndingCardReady:true});g.key(' ');g.tick();
 for(let i=0;i<30;i++){g.tick();g.key(' ',true);}
 assert.equal(g.env.RavokOutcome.snapshot().phase,'CARD');assert.equal(g.menus(),0);
 assert.equal(g.env.RavokEvent.ravokBadEndingSeen,false);
 g.key(' ',false,'keyup');g.key(' ');
 assert.equal(g.env.RavokOutcome.snapshot().phase,'CARD_FADE_OUT');assert.equal(g.menus(),0);
 assert.equal(g.env.RavokEvent.ravokBadEndingSeen,true);
 assert.equal(g.env.RavokOutcome.snapshot().endingId,'ravok_maior_conquista');
 g.env.document.hidden=true;for(let i=0;i<20;i++)g.tick();
 assert.equal(g.env.RavokOutcome.snapshot().cardPresentation.exitFade,0);
 g.env.document.hidden=false;for(let i=0;i<4;i++)g.tick();assert.equal(g.menus(),0);
 g.key(' ',false,'keyup');g.key(' ');g.key(' ',true);
 for(let i=0;i<20;i++)g.tick();assert.equal(g.menus(),1);assert.equal(g.returns(),0);
});

test('card typography and narrative have their own compact identity with no dependency on external fonts',()=>{
 const g=setup('accept'),snapshot=g.env.RavokBadEnding.snapshot();
 assert.equal(snapshot.endingId,'ravok_maior_conquista');
 assert.equal(snapshot.card.titleFont,'LOCAL_BITMAP_5x7');
 assert.equal(snapshot.card.narrative.length,3);assert.equal(snapshot.audioVoices,0);
 const calls=[],stack=[],ctx={globalAlpha:1,imageSmoothingEnabled:true,fillStyle:'',
  save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
  fillRect(x,y,w,h){calls.push({kind:'rect',x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha});},
  drawImage(...args){calls.push({kind:'image',args,alpha:this.globalAlpha});},
  fillText(text,x,y){calls.push({kind:'text',text,x,y,alpha:this.globalAlpha});},
  measureText:t=>({width:t.length*5.4}),beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}};
 g.env.RavokBadEnding.draw(ctx,'CARD',1,.2);
 assert.ok(calls.some(c=>c.kind==='image'&&c.alpha>0));
 assert.ok(calls.filter(c=>c.color==='#e1d9e1').every(c=>c.alpha===0));
 assert.ok(calls.filter(c=>c.kind==='text'&&c.text!=='ILHA DOS CAMPEÕES / FINAL SECRETO').every(c=>c.alpha===0));
 calls.length=0;g.env.RavokBadEnding.draw(ctx,'CARD',1,3);
 assert.ok(calls.filter(c=>c.color==='#e1d9e1').every(c=>Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.w===2&&c.h===2));
 assert.equal(calls.filter(c=>c.kind==='text'&&c.alpha>0).length,6);
 assert.ok(calls.filter(c=>c.kind==='text').every(c=>c.x===225&&c.y<=280&&ctx.measureText(c.text).width<=370));
});
