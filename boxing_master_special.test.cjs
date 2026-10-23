const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const live=process.env.BOXING_PROJECT||__dirname;
function setup(load=true){
 let clock=0;const events=[],images=[];
 class Image{set src(v){this._src=v;images.push(v);if(load)this.onload?.();}get src(){return this._src;}}
 const env={console,Image,performance:{now:()=>clock},document:{hidden:false,createElement:()=>({getContext:()=>({drawImage(){}})})},keys:{},currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
  FestivalChallenges:{onBoxingStart(){},onBoxingResult(){}},resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent:k=>events.push(k),addEventListener(){}};
 env.window=env;vm.createContext(env);
 for(const name of ['boxing_arena.js','boxing_zorp_special_atlas.js','boxing_zorp_special.js','boxing_master_special_atlas.js','boxing_master_special.js']){
  const file=fs.existsSync(path.join(__dirname,name))?path.join(__dirname,name):path.join(live,name);
  vm.runInContext(fs.readFileSync(file,'utf8'),env);
 }
 vm.runInContext('globalThis.api={game:boxeGame,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,request:boxingRequestSpecial,intent:boxingMasterIntent,contact:boxingAttackCanHit,atlas:BOXING_MASTER_SPECIAL_ATLAS};',env);
 const a=env.api;a.reset(true);a.game.qaFreezeAi=true;
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const until=p=>{for(let i=0;i<950&&!p();i++)step();assert.ok(p(),'not reached');};
 const place=(distance=135,depth=0,right=false)=>{a.game.player.x=right?300:130;a.game.player.y=210+depth;a.game.mestre.x=a.game.player.x+(right?-distance:distance);a.game.mestre.y=210;};place();
 const activate=()=>{a.game.mestre.specialCharge=100;assert.ok(a.request(a.game.mestre,a.game.player));};
 return {a,env,events,images,step,until,place,activate};
}
test('official master sheet preloads once, eight clean masks, uniform scale and anchors',()=>{
 const g=setup();assert.equal(g.images.filter(i=>i.startsWith('mestre_boxe3.0_especial.png?')).length,1);assert.equal(g.env.BoxingMasterSpecial.snapshot().frames,8);
 for(const f of Object.values(g.a.atlas.frames)){assert.equal(f.scale,.47);assert.ok(f.strips.length);const [x,y,w,h]=f.sourceRect;for(const [sx,sy,sw,sh]of f.strips)assert.ok(sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h);}
});
test('full independent meter required and consumed once; unavailable art does not spend',()=>{
 const g=setup();assert.equal(g.a.request(g.a.game.mestre,g.a.game.player),false);g.activate();assert.equal(g.a.game.mestre.specialCharge,0);assert.equal(g.a.game.player.specialCharge,0);
 assert.equal(g.a.request(g.a.game.mestre,g.a.game.player),false);assert.equal(g.a.game.mestre.specialCooldown,720);
 const h=setup(false);h.a.game.mestre.specialCharge=100;assert.equal(h.a.request(h.a.game.mestre,h.a.game.player),false);assert.equal(h.a.game.mestre.specialCharge,100);
});
test('charge lasts 36 steps with no physical advance or premature damage',()=>{
 const g=setup();g.activate();g.step(36);assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.x,265);assert.equal(g.a.game.mestre.special.phase,'DASH');g.until(()=>g.a.game.player.hp<100);assert.equal(g.a.game.player.hp,72);assert.equal(g.a.game.mestre.special.phase,'RECOVERY');
});
test('dash physically advances, lands once, pushes and never causes repeated damage',()=>{
 const g=setup();g.activate();g.until(()=>g.a.game.player.hp<100);assert.ok(g.a.game.mestre.x<265);assert.ok(g.a.game.player.x<130);assert.equal(g.a.game.player.hitstun,24);g.until(()=>!g.a.game.mestre.special);g.step(80);assert.equal(g.a.game.player.hp,72);assert.equal(g.a.game.mestre.lastSpecial.connected,true);
});
test('guard is unsafe: 14 chip damage, immediate guard break and substantial push',()=>{
 const g=setup();g.a.input.guard=true;g.activate();g.until(()=>g.a.game.player.hp<100);assert.equal(g.a.game.player.hp,86);assert.ok(g.a.game.player.guardBreakTimer>0);assert.equal(g.a.game.player.guard,false);assert.ok(g.a.game.player.x<111);
});
test('leaving depth line during charge defeats committed attack and exposes 36-step whiff recovery',()=>{
 const g=setup();g.activate();g.env.keys.w=true;g.step(15);g.env.keys.w=false;g.until(()=>g.a.game.mestre.special?.phase==='RECOVERY');assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.special.lineY,210);
 const x=g.a.game.mestre.x;g.step(35);assert.equal(g.a.game.mestre.x,x);assert.ok(g.a.game.mestre.special);g.step();assert.equal(g.a.game.mestre.special,null);assert.equal(g.a.game.mestre.lastSpecial.connected,false);
});
test('timed I dodge avoids an otherwise aligned hit and grants counter window',()=>{
 const g=setup();g.activate();g.step(40);g.a.input.dodge=true;g.step();g.until(()=>g.a.game.mestre.attack?.dodged||g.a.game.mestre.lastSpecial?.dodged);
 assert.equal(g.a.game.player.hp,100);assert.ok(g.a.game.player.counterWindow>0);g.until(()=>!g.a.game.mestre.special);assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.lastSpecial.dodged,true);
});
test('whiff recovery remains hittable; a real punch interrupts it and punishes',()=>{
 const g=setup();g.place(135,30);g.activate();g.until(()=>g.a.game.mestre.special?.phase==='RECOVERY');
 // Move a test opponent alongside the resting boxer, then use the ordinary hit path.
 g.a.game.player.x=g.a.game.mestre.x+40;g.a.game.player.y=210;assert.ok(g.a.start(g.a.game.player,'cross'));
 g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.mestre.hp,86);assert.equal(g.a.game.mestre.special,null);assert.equal(g.a.game.mestre.lastSpecial.interrupted,true);
});
test('charge is interruptible by a normal punch, with no hidden invulnerability',()=>{
 const g=setup();g.place(40);g.activate();g.a.start(g.a.game.player,'jab');g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.mestre.hp,94);assert.equal(g.a.game.mestre.special,null);assert.equal(g.a.game.player.hp,100);
});
test('dash never homes after Zorp crosses behind; facing and original line stay committed',()=>{
 const g=setup();g.activate();g.step(20);g.a.game.player.x=350;g.a.game.player.y=240;g.step(20);assert.equal(g.a.game.mestre.special.facing,-1);assert.equal(g.a.game.mestre.special.lineY,210);assert.ok(g.a.game.mestre.x<265);g.until(()=>!g.a.game.mestre.special);assert.equal(g.a.game.player.hp,100);
});
test('off-line, far outside reach and opposite-side defenders cannot receive magical hits',()=>{
 for(const [distance,depth]of [[135,24],[300,0],[-135,26]]){const g=setup();g.place(distance,depth);g.activate();g.until(()=>!g.a.game.mestre.special);assert.equal(g.a.game.player.hp,100);}
});
test('right-facing master dash obeys the same line and damage rules',()=>{
 const g=setup();g.place(135,0,true);g.activate();g.until(()=>!g.a.game.mestre.special);assert.equal(g.a.game.player.hp,72);assert.equal(g.a.game.mestre.lastSpecial.facing,1);assert.ok(g.a.game.player.x>300);
});
test('swept glove interval catches a traversed defender, without extending depth tolerance',()=>{
 const g=setup(),a={x:180},attack={kind:'dash_punch',facing:-1,originY:210,sweepFromX:200},spec={range:54,depthTolerance:11};
 assert.equal(g.a.contact(a,{x:190,y:210},attack,spec),true);assert.equal(g.a.contact(a,{x:125,y:210},attack,spec),false);assert.equal(g.a.contact(a,{x:190,y:222},attack,spec),false);
});
test('AI chooses charged medium-distance aligned pressure situations, never random specials',()=>{
 const g=setup(),m=g.a.game.mestre,p=g.a.game.player;m.specialCharge=100;g.a.game.fightFrames=650;m.aiTargetX=p.x;m.aiTargetY=p.y;
 assert.equal(g.env.BoxingMasterSpecial.shouldUse(m,p),true);m.aiDecisionTimer=0;assert.equal(g.a.intent().special,undefined);
 g.a.game.qaFreezeAi=false;g.until(()=>m.special);assert.ok(m.ai.view.frame<=g.a.game.fightFrames-12);
 m.special=null;m.attack=null;m.specialCooldown=0;m.specialCharge=100;
 m.aiTargetY=240;assert.equal(g.env.BoxingMasterSpecial.shouldUse(m,p),false);m.aiTargetY=p.y;m.specialCooldown=10;assert.equal(g.env.BoxingMasterSpecial.shouldUse(m,p),false);m.specialCooldown=0;m.specialCharge=99;assert.equal(g.env.BoxingMasterSpecial.shouldUse(m,p),false);
});
test('a stale observation is not refreshed magically while charging; AI can be baited',()=>{
 const g=setup(),m=g.a.game.mestre;m.specialCharge=100;m.aiTargetX=130;m.aiTargetY=210;g.a.game.fightFrames=650;g.activate();g.a.game.player.y=240;
 g.until(()=>!m.special);assert.equal(g.a.game.player.hp,100);assert.equal(m.lastSpecial.connected,false);
});
test('AI creates medium range with a real backstep and does not retreat through ropes',()=>{
 const g=setup();g.place(55);g.a.game.fightFrames=650;const m=g.a.game.mestre,p=g.a.game.player;m.specialCharge=100;m.aiDecisionTimer=0;
 const intent=g.a.intent();assert.equal(intent.x,0);assert.equal(intent.attack,null);
 const origin=m.x;g.a.game.qaFreezeAi=false;g.until(()=>m.x>origin+.5);assert.ok(m.ai.view.frame<=g.a.game.fightFrames-12);
 m.x=375;m.aiTargetX=330;m.aiTargetY=210;assert.equal(g.env.BoxingMasterSpecial.positionIntent(m,p),null);
});
test('ring boundaries constrain a missed dash and recovery never slides the fighter farther',()=>{
 const g=setup();g.place(135,30);g.activate();g.until(()=>g.a.game.mestre.special?.phase==='RECOVERY');
 const m=g.a.game.mestre,x=m.x,y=m.y;assert.ok(x>=45&&x<=405&&y>=173&&y<=245);g.step(30);assert.equal(m.x,x);assert.equal(m.y,y);
});
test('paused or hidden combat freezes charge, cooldown and special animation',()=>{
 const g=setup();g.activate();g.step(10);const m=g.a.game.mestre,age=m.special.age,cooldown=m.specialCooldown;
 g.env.document.hidden=true;g.step(120);assert.equal(m.special.age,age);assert.equal(m.specialCooldown,cooldown);
 g.env.document.hidden=false;g.a.game.phase='PRE_GAME';g.step(120);assert.equal(m.special.age,age);assert.equal(m.specialCooldown,cooldown);
});
test('master meter fills from exchanges and active proximity, not its own dash or inactive scenes',()=>{
 const g=setup();g.place(40);g.step(120);assert.ok(g.a.game.mestre.specialCharge>5);const before=g.a.game.mestre.specialCharge;
 g.a.start(g.a.game.player,'jab');g.until(()=>g.a.game.mestre.hp<100);assert.ok(g.a.game.mestre.specialCharge>before+8);
 const h=setup();h.activate();h.until(()=>!h.a.game.mestre.special);assert.equal(h.a.game.mestre.specialCharge,0);
 const j=setup();j.a.game.phase='PRE_GAME';j.step(200);assert.equal(j.a.game.mestre.specialCharge,0);
});
test('cooldown is meaningful even after artificially refilling the meter',()=>{
 const g=setup();g.activate();g.until(()=>!g.a.game.mestre.special);g.a.game.mestre.specialCharge=100;assert.equal(g.a.request(g.a.game.mestre,g.a.game.player),false);g.until(()=>!g.a.game.mestre.specialCooldown);assert.equal(g.a.request(g.a.game.mestre,g.a.game.player),true);
});
test('30, 60 and 144 FPS produce the same dash result and cooldown',()=>{
 const results=[30,60,144].map(fps=>{const g=setup();g.activate();g.step(fps*2,fps);return [g.a.game.player.hp,g.a.game.mestre.x,g.a.game.mestre.specialCooldown];});for(const r of results)assert.deepEqual(r,results[0]);
});
test('Zorp counter can evade a committed close dash and punish with all six punches',()=>{
 const g=setup();g.place(40);g.activate();g.step(30);g.a.game.player.specialCharge=100;assert.ok(g.a.request(g.a.game.player,g.a.game.mestre));assert.equal(g.a.game.player.special.mode,'counter');
 g.until(()=>!g.a.game.player.special);assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.player.lastSpecial.hits,6);assert.equal(g.a.game.mestre.hp,66);assert.equal(g.a.game.mestre.special,null);
});
test('KO cleans charge/dash state and never hits again after the result',()=>{
 const g=setup();g.a.game.player.hp=20;g.activate();g.until(()=>g.a.game.phase==='RESULT');assert.equal(g.a.game.player.hp,0);assert.equal(g.a.game.mestre.special,null);assert.equal(g.a.game.winner,'master');g.step(100);assert.equal(g.a.game.phase,'RESULT');
});
