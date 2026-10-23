const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(load=true){
 let clock=0;const images=[],events=[],medals=[];
 class Image{set src(v){this._src=v;images.push(this);this.width=this.naturalWidth=1254;this.height=1254;if(load)this.onload?.();}get src(){return this._src;}}
 const env={console,Image,performance:{now:()=>clock},document:{hidden:false,createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},imageSmoothingEnabled:true})})},
  keys:{w:false,a:false,s:false,d:false,space:false},currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
  FestivalChallenges:{onBoxingStart(){},onBoxingResult(){}},desbloquearMedalha:id=>medals.push(id),
  resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent:kind=>events.push(kind),addEventListener(){}};
 env.window=env;vm.createContext(env);
 for(const name of ['boxing_arena.js','boxing_zorp_special_atlas.js','boxing_zorp_special.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),env);
 vm.runInContext('globalThis.api={game:boxeGame,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,request:boxingRequestSpecial,atlas:BOXING_ZORP_SPECIAL_ATLAS};',env);
 const a=env.api;a.reset(true);a.game.qaFreezeAi=true;
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const until=predicate=>{for(let i=0;i<600&&!predicate();i++)step();assert.ok(predicate(),'condition not reached');};
 const place=(distance=40,depth=0)=>{a.game.player.x=200;a.game.player.y=210;a.game.mestre.x=200+distance;a.game.mestre.y=210+depth;};place();
 const activate=()=>{a.game.player.specialCharge=100;a.input.special=true;step();};
 return {a,env,events,medals,images,step,until,place,activate};
}
test('official sheet is preloaded once and masked frames use a uniform scale with foot anchors',()=>{
 const g=setup();assert.equal(g.images.length,1);assert.ok(g.images[0].src.startsWith('zorp_boxe3.0_especial.png?'));
 const s=g.env.BoxingZorpSpecial.snapshot();assert.equal(s.status,'ready');assert.equal(s.frames,7);
 for(const frame of Object.values(g.a.atlas.frames)){
  assert.equal(frame.scale,.52);assert.ok(frame.strips.length>0);const [x,y,w,h]=frame.sourceRect;
  for(const [sx,sy,sw,sh]of frame.strips)assert.ok(sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h);
 }
});
test('a full meter is required; activation consumes it once and cannot be spammed',()=>{
 const g=setup();g.a.input.special=true;g.step();assert.equal(g.a.game.player.special,null);
 g.activate();assert.equal(g.a.game.player.special.mode,'normal');assert.equal(g.a.game.player.specialCharge,0);assert.ok(g.a.game.player.specialCooldown>0);
 g.a.input.special=true;g.step(10);assert.equal(g.a.game.player.specialCharge,0);assert.equal(g.a.game.player.special.mode,'normal');
});
test('normal weave advances physically and lands one stronger final punch',()=>{
 const g=setup();g.activate();g.step(20);assert.ok(g.a.game.player.x>200);assert.equal(g.a.game.mestre.hp,100);g.until(()=>!g.a.game.player.special);
 assert.equal(g.a.game.mestre.hp,74);assert.equal(g.a.game.player.lastSpecial.hits,1);assert.ok(g.a.game.mestre.x>=258);assert.ok(g.events.includes('special'));
});
test('normal special can be partially guarded and adds high guard pressure',()=>{
 const g=setup();g.a.game.qaFreezeAi=false;vm.runInContext('boxingMasterIntent=()=>({x:0,y:0,guard:true,attack:null,dodge:false});',g.env);
 g.activate();g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.mestre.hp,93);assert.ok(g.a.game.mestre.guardPressure>70||g.a.game.mestre.guardBreakTimer>0);
});
test('using weave on the wrong depth line whiffs and leaves a punishable recovery',()=>{
 const g=setup();g.place(40,25);g.activate();g.until(()=>!g.a.game.player.special);assert.equal(g.a.game.mestre.hp,100);assert.equal(g.a.game.player.whiffFrames,12);assert.equal(g.a.game.player.lastSpecial.connected,false);
});
test('a very distant normal special cannot teleport or invent contact',()=>{
 const g=setup();g.place(180);g.activate();g.until(()=>!g.a.game.player.special);assert.equal(g.a.game.mestre.hp,100);assert.ok(g.a.game.player.x<260);
});
test('an incoming committed attack triggers evasion, then exactly R L R L R L',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(6);g.activate();assert.equal(g.a.game.player.special.mode,'counter');g.until(()=>!g.a.game.player.special);
 const last=g.a.game.player.lastSpecial;assert.equal(last.confirmed,true);assert.equal(last.hits,6);assert.deepEqual(Array.from(last.history),['right','left','right','left','right','left']);
 assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.hp,66);
});
test('after the first counter contact, the opponent stays in hitstun between all six punches',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(6);g.activate();g.until(()=>g.a.game.player.special?.hits===1);
 while(g.a.game.player.special?.phase==='RUSH'&&g.a.game.player.special.hits<6){assert.ok(g.a.game.mestre.hitstun>0);assert.equal(g.a.game.mestre.guard,false);g.step();}
 assert.equal(g.a.game.player.special.hits,6);
});
test('a windup that is too early, distant or off-line does not grant the rare counter',()=>{
 for(const [distance,depth,ticks]of [[40,0,0],[100,0,6],[40,25,6]]){const g=setup();g.place(distance,depth);g.a.start(g.a.game.mestre,'cross');g.step(ticks);g.activate();assert.equal(g.a.game.player.special.mode,'normal');}
});
test('a baited counter without a real avoided contact fails safely rather than granting six punches',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(6);g.activate();g.a.game.mestre.attack=null;g.until(()=>!g.a.game.player.special);
 assert.equal(g.a.game.mestre.hp,100);assert.equal(g.a.game.player.lastSpecial.confirmed,false);assert.equal(g.a.game.player.lastSpecial.hits,0);
});
test('normal weave has no global invulnerability and can be interrupted',()=>{
 const g=setup();g.activate();g.a.start(g.a.game.mestre,'jab');g.until(()=>g.a.game.player.hp<100);assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.hp,94);
});
test('meter recharges through active fighting, landing, receiving and nearby exchanges, but not by its own special',()=>{
 const g=setup();g.step(120);assert.ok(g.a.game.player.specialCharge>4);const initial=g.a.game.player.specialCharge;
 g.a.start(g.a.game.player,'jab');g.until(()=>g.a.game.mestre.hp<100);assert.ok(g.a.game.player.specialCharge>initial+8);
 const prior=g.a.game.player.specialCharge;g.until(()=>!g.a.game.player.attack);g.a.start(g.a.game.mestre,'jab');g.until(()=>g.a.game.player.hp<100);assert.ok(g.a.game.player.specialCharge>prior+6);
 const h=setup();h.activate();h.until(()=>h.a.game.mestre.hp===74);assert.equal(h.a.game.player.specialCharge,0);
});
test('briefing, result, hidden documents, far-away inactivity and a missing sheet do not refill or spend the bar incorrectly',()=>{
 const g=setup();g.a.game.phase='PRE_GAME';g.step(120);assert.equal(g.a.game.player.specialCharge,0);g.a.game.phase='RESULT';g.step(120);assert.equal(g.a.game.player.specialCharge,0);
 const idle=setup();idle.a.game.player.x=90;idle.a.game.mestre.x=370;idle.step(120);assert.equal(idle.a.game.player.specialCharge,0);idle.place();idle.env.document.hidden=true;idle.step(120);assert.equal(idle.a.game.player.specialCharge,0);
 const h=setup(false);h.activate();assert.equal(h.a.game.player.special,null);assert.equal(h.a.game.player.specialCharge,100);
});
test('the same meter and special resolve consistently at 30, 60 and 144 FPS',()=>{
 const values=[30,60,144].map(fps=>{const g=setup();g.activate();g.step(fps*1.5,fps);return [g.a.game.mestre.hp,g.a.game.player.specialCharge,g.a.game.player.specialCooldown];});
 for(const v of values)for(let i=0;i<3;i++)assert.ok(Math.abs(v[i]-values[0][i])<1e-8);
});
test('a left-facing weave uses real leftward movement and pushback without changing sprite proportions',()=>{
 const g=setup();g.a.game.player.x=260;g.a.game.mestre.x=220;g.activate();g.until(()=>!g.a.game.player.special);
 assert.equal(g.a.game.mestre.hp,74);assert.ok(g.a.game.player.x<260);assert.ok(g.a.game.mestre.x<220);assert.equal(g.a.game.player.facing,-1);
});
test('KO during the rush cleans locks/special state and never strikes a defeated target again',()=>{
 const g=setup();g.a.game.mestre.hp=5;g.a.start(g.a.game.mestre,'cross');g.step(6);g.activate();g.until(()=>g.a.game.phase==='RESULT');
 assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.mestre.hp,0);assert.deepEqual(g.medals,['boxe']);
});
test('cooldown still prevents activation even when a development tool fills the bar again',()=>{
 const g=setup();g.activate();g.until(()=>!g.a.game.player.special);g.a.game.player.specialCharge=100;
 assert.equal(g.a.request(g.a.game.player,g.a.game.mestre),false);assert.equal(g.a.game.player.specialCharge,100);
});
