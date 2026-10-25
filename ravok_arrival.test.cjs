const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(saved={},failStorage=false){
 const store=new Map(Object.entries(saved)),events=[],listeners=new Map();let clock=0,scene='JOGO_TEST',result=false;
 const context={imageSmoothingEnabled:false,drawImage(){},translate(){},fillRect(){}};
 const env={console:{log(){},warn(){},error:console.error},Image:class{},URLSearchParams,
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
  performance:{now:()=>clock},document:{hidden:false,createElement:()=>({width:450,height:300,getContext:()=>context})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('storage unavailable');store.set(k,v);},removeItem:k=>store.delete(k)},
  addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  dispatchEvent:e=>{events.push(e);for(const fn of listeners.get(e.type)||[])fn(e);}};
 env.window=env;env.insignias={};vm.createContext(env);
 for(const file of ['medalhas_registry.js','ravok_npc_geometry.js','ravok_walk_atlas.js','ravok_k7_animation.js','ravok_event.js','ravok_arrival.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),env);
 env.carregarMedalhas(env.insignias);env.RavokEvent.sync();
 const calls={enter:0,resume:0,clear:0};env.RavokArrival.init({canvas:{},busy:()=>false,scene:()=>scene,
  destination:s=>[s.startsWith('ILHA_')?s:'ILHA_ARCO',225,150],isOverworld:s=>s.startsWith('ILHA_'),resultReady:()=>result,
  captureIsland:()=>({}),k7Sprite:()=>null,clearInput:()=>calls.clear++,enter:()=>{scene='RAVOK_ARRIVAL';calls.enter++;},resume:d=>{scene=d[0];calls.resume++;}});
 const key=(key,repeat=false,type='keydown')=>{const e={type,key,repeat,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};env.dispatchEvent(e);return e;};
 const tick=(ms=100)=>{clock+=ms;env.RavokArrival.update(scene);};
 const tap=()=>{key(' ');key(' ',false,'keyup');};
 return {env,events,store,calls,key,tick,tap,setStorageFailure:v=>failStorage=v,setResult:v=>result=v,setScene:v=>scene=v,scene:()=>scene,
  award:id=>env.desbloquearMedalha(id),advanceTo:phase=>{for(let i=0;i<500&&env.RavokArrival.snapshot().phase!==phase;i++)tick();assert.equal(env.RavokArrival.snapshot().phase,phase);}};
}
const firstThree=g=>['pingpong','basquete','corrida'].forEach(g.award);
test('only the saved 3→4 award queues arrival, never earlier awards or duplicates',()=>{
 const g=setup();firstThree(g);assert.equal(g.env.RavokEvent.arrivalPending,false);g.award('arco');
 const detail=g.events.filter(e=>e.type==='festival:medal-unlocked').at(-1).detail;
 assert.deepEqual(JSON.parse(JSON.stringify(detail)),{id:'arco',previousCount:3,total:4,persisted:true});
 assert.equal(g.env.RavokEvent.arrivalPending,true);assert.equal(g.env.RavokEvent.ravokArrivalSeen,false);
 assert.equal(JSON.parse(g.store.get('zorp_esportes_medalhas')).arco,true);
 assert.equal(g.env.RavokEvent.arrived,false);assert.equal(g.env.RavokEvent.isNpcVisible(g.env.RavokEvent.npcs[0]),false);
 g.award('arco');assert.equal(g.events.filter(e=>e.type==='festival:medal-unlocked').length,4);
});
test('a failed medal save does not queue the cutscene',()=>{
 const g=setup({},true);firstThree(g);g.award('arco');assert.equal(g.events.filter(e=>e.type==='festival:medal-unlocked').at(-1).detail.persisted,false);
 assert.equal(g.env.RavokEvent.arrivalPending,false);
});
test('minigame celebration finishes first; held or repeated result input cannot start or skip arrival',()=>{
 const g=setup();firstThree(g);g.award('arco');g.tick();assert.equal(g.env.RavokArrival.active,false);
 g.key(' ');g.setResult(true);g.tick(1000);assert.equal(g.env.RavokArrival.active,false);
 g.tick(1000);g.key(' ',true);assert.equal(g.env.RavokArrival.active,false);
 g.key(' ',false,'keyup');g.tap();assert.equal(g.env.RavokArrival.snapshot().phase,'FADE_OUT');
 for(let i=0;i<20;i++)g.tap();assert.equal(g.env.RavokArrival.snapshot().phase,'FADE_OUT');
 assert.equal(g.calls.resume,0);assert.equal(g.env.RavokEvent.ravokArrivalSeen,false);
});
test('all essential shots precede three paced lines; only the final fade commits completion',()=>{
 const g=setup();firstThree(g);g.award('arco');g.setScene('ILHA_ARCO');g.tick();
 g.advanceTo('DIALOGUE');assert.equal(g.env.RavokEvent.ravokArrivalSeen,false);
 assert.equal(g.env.RavokArrival.snapshot().ravokOutside,false);assert.equal(g.env.RavokArrival.snapshot().k7Outside,true);
 for(let i=0;i<30;i++)g.tick();assert.equal(g.env.RavokArrival.snapshot().line,0);
 for(let i=0;i<3;i++){assert.equal(g.env.RavokArrival.snapshot().line,i);g.tick(500);for(let j=0;j<5;j++)g.tick();g.tap();}
 assert.equal(g.env.RavokArrival.snapshot().phase,'WITHDRAW');assert.equal(g.env.RavokEvent.ravokArrivalSeen,false);
 g.advanceTo('FADE_BACK');assert.equal(g.env.RavokEvent.ravokArrivalSeen,false);
 for(let i=0;i<20;i++)g.tick();assert.equal(g.env.RavokArrival.active,false);assert.equal(g.calls.resume,1);
 const saved=JSON.parse(g.store.get('zorp_ravok_event'));assert.equal(saved.ravokArrivalSeen,true);assert.equal(saved.ravokArrivalPending,false);
 assert.equal(g.env.RavokEvent.arrived,true);assert.equal(g.env.RavokEvent.isNpcVisible(g.env.RavokEvent.npcs[0]),true);assert.equal(g.env.RavokEvent.isNpcVisible(g.env.RavokEvent.npcs[1]),false);
 const reload=setup(Object.fromEntries(g.store));reload.setScene('ILHA_ARCO');reload.tick();reload.award('skate');reload.tick();
 assert.equal(reload.env.RavokArrival.active,false);assert.equal(reload.env.RavokEvent.ravokArrivalSeen,true);assert.equal(reload.calls.enter,0);
});
test('unfinished pending save remains unfinished and can resume before Overworld movement',()=>{
 const g=setup();firstThree(g);g.award('arco');const reload=setup(Object.fromEntries(g.store));reload.setScene('ILHA_ARCO');reload.tick();
 assert.equal(reload.env.RavokArrival.active,true);assert.equal(reload.env.RavokEvent.ravokArrivalSeen,false);assert.equal(reload.calls.resume,0);
});
test('a victory starts arrival automatically after its short result hold, without an extra command',()=>{
 const g=setup();firstThree(g);g.award('arco');g.setResult(true);g.tick();g.tick(2300);
 assert.equal(g.env.RavokArrival.active,false);g.tick(101);assert.equal(g.env.RavokArrival.active,true);
 assert.equal(g.env.RavokArrival.snapshot().phase,'FADE_OUT');assert.equal(g.calls.enter,1);
});
test('legacy saves already at four medals are not given a retroactive arrival cutscene',()=>{
 const g=setup({'zorp_esportes_medalhas':JSON.stringify({pingpong:true,basquete:true,corrida:true,arco:true}),
 'zorp_ravok_event':JSON.stringify({version:3,arrived:true,metK7:true})});
 g.setScene('ILHA_ARCO');g.tick();assert.equal(g.env.RavokArrival.active,false);assert.equal(g.env.RavokEvent.arrived,true);
});

test('arrival completion waits for a successful save and a failed write can be retried without replay',()=>{
 const g=setup();firstThree(g);g.award('arco');g.setScene('ILHA_ARCO');g.tick();g.advanceTo('DIALOGUE');
 for(let i=0;i<3;i++){for(let j=0;j<6;j++)g.tick();g.tap();}g.advanceTo('FADE_BACK');g.setStorageFailure(true);
 for(let i=0;i<20;i++)g.tick();
 assert.equal(g.env.RavokEvent.ravokArrivalSeen,false,'failed disk save must not claim the cutscene was seen');
 assert.equal(g.env.RavokArrival.active,true);assert.equal(g.env.RavokArrival.snapshot().saveFailed,true);assert.equal(g.calls.resume,0);
 assert.equal(JSON.parse(g.store.get('zorp_ravok_event')).ravokArrivalSeen,false);
 g.setStorageFailure(false);g.tap();assert.equal(g.env.RavokArrival.active,false);assert.equal(g.env.RavokEvent.ravokArrivalSeen,true);assert.equal(g.calls.resume,1);
 const again=setup(Object.fromEntries(g.store));again.setScene('ILHA_ARCO');again.tick();assert.equal(again.env.RavokArrival.active,false);
});
