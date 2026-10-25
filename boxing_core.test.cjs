const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{setup}=require('./boxing_rounds_harness.cjs');
function fixture(distance=40,depth=0){const g=setup();g.place(distance,depth);vm.runInContext('globalThis.core={spec:boxingAttackSpec,canChain:boxingCanChain,canHit:boxingAttackCanHit,outcome:boxingAttackOutcome,feint:boxingStartFeint,sides:boxingRingSides,config:BOXING_CONFIG};',g.env);return {...g,core:g.env.core};}
function string(sequence,{distance=40,role='zorp',corner=false}={}){
 const g=fixture(distance),p=g.a.game.player,m=g.a.game.mestre;
 const attacker=role==='zorp'?p:m,target=role==='zorp'?m:p;
 if(corner){target.x=g.core.sides(target.y).right-14;attacker.x=target.x-distance;}
 const hits=[];
 for(const [i,key]of [...sequence].entries()){
  const hp=target.hp,kind=key==='J'?'jab':'cross';
  if(role==='zorp')g.a.input[kind]=true;
  else if(!g.a.start(attacker,kind,i>0)){
   for(let f=0;f<8&&!g.core.canChain(attacker,target,kind);f++)g.step();
   assert.equal(g.a.start(attacker,kind,true),true,'master could not link '+sequence);
  }
  g.until(()=>target.hp<hp);
  hits.push({key,stage:attacker.comboCount,damage:hp-target.hp,frame:g.a.game.fightFrames,variant:attacker.attack.profile.variant,
   body:attacker.attack.profile.body,counter:attacker.attack.counter,depth:attacker.attack.profile.depthTolerance});
  assert.equal(attacker.comboCount,i+1,sequence+' must remain connected');
 }
 return {g,attacker,target,hits};
}
for(const sequence of ['JJ','JJJ','JK','JJK','JKJ','JKK','KJ','KJK','KK','KKJ','KKK','KJJ','JJJJJ','JKJKJ','JKKJK','KKKKK']){
 test(sequence+' uses physical hit-confirm transitions with one contact per strike',()=>{
  const {g,attacker,target,hits}=string(sequence);assert.equal(hits.length,sequence.length);
  assert.ok(hits.every((h,i)=>h.stage===i+1));assert.equal(g.a.game.rounds.stats.zorp.cleanHits,sequence.length);
  const hp=target.hp;g.step(6);assert.equal(target.hp,hp);assert.ok(attacker.stamina<100);
 });
}
test('all eight length-three J/K permutations are valid without a command lookup',()=>{
 for(let bits=0;bits<8;bits++){const sequence=[0,1,2].map(i=>(bits>>i)&1?'K':'J').join('');const r=string(sequence);assert.equal(r.hits.at(-1).stage,3);}
});
test('the master uses the same K/J hit-confirm and stamina rules',()=>{
 const {attacker,target,hits}=string('KJK',{role:'master'});assert.equal(hits.length,3);assert.ok(attacker.stamina<=69);assert.ok(target.hp<100);
});
test('normal combos finish at five and create neutral even against the ropes',()=>{
 for(const corner of [false,true])for(const sequence of ['JJJJJ','KKKKK']){
  const {g,attacker,target}=string(sequence,{corner});const hp=target.hp;
  assert.equal(attacker.attack.finisher,true);assert.equal(g.core.canChain(attacker,target,'jab'),false);
  g.a.input.jab=true;g.step(9);assert.equal(target.hp,hp);assert.equal(attacker.attack.stage,5);
  g.until(()=>!target.hitstun);assert.ok(attacker.attack,'attacker must still recover while defender can act');
  assert.ok(Math.abs(target.x-attacker.x)>=70);assert.equal(g.a.start(attacker,'jab',true),false);
  assert.equal(g.a.dodge(target,0,1,attacker),true,'defender has an actual escape before the attacker returns');
 }
});
test('the fourth hit adds knockback; the fifth increases separation and shortens lock-down',()=>{
 const {g,attacker,target}=string('JJJJ');assert.ok(target.pushMotion.step*target.pushMotion.frames>3);
 const hp=target.hp;g.a.input.cross=true;g.until(()=>target.hp<hp);assert.equal(attacker.comboCount,5);
 assert.equal(target.hitstun,12);assert.ok(attacker.attack.recoverUntil-attacker.attack.frame>=24);
});
for(const kind of ['jab','cross'])test(kind+' whiff and recovery cannot hit-confirm cancel, feint away or erase stamina cost',()=>{
 const g=fixture(110),p=g.a.game.player,m=g.a.game.mestre;g.a.start(p,kind);const cost=kind==='jab'?5:13;
 g.step(kind==='jab'?10:19);assert.equal(m.hp,100);assert.equal(g.core.canChain(p,m,'jab'),false);
 assert.equal(g.a.start(p,'jab',true),false);assert.equal(g.core.feint(p,m),false);
 const original=p.attack;g.a.input.cross=true;g.step(3);assert.equal(p.attack,original);assert.equal(p.stamina,100-cost);
 g.until(()=>!p.attack&&!p.whiffFrames);assert.equal(g.a.start(p,'jab'),true);
});
test('blocked punches cost guard stamina and never authorize combo cancellation',()=>{
 const g=fixture();g.a.game.qaFreezeAi=false;vm.runInContext('boxingMasterIntent=()=>({x:0,y:0,guard:true,attack:null,dodge:false});',g.env);
 g.a.start(g.a.game.player,'cross');g.until(()=>g.a.game.mestre.hp<100);
 assert.ok(g.a.game.mestre.stamina<=91);assert.ok(g.a.game.mestre.guardPressure>=34);
 assert.equal(g.core.canChain(g.a.game.player,g.a.game.mestre,'jab'),false);
});
test('a clean light counters heavy startup through actual contact, with extra hitstop and stun',()=>{
 const g=fixture(),p=g.a.game.player,m=g.a.game.mestre;g.a.start(m,'cross');g.tap('j');g.until(()=>m.hp<100);
 assert.equal(p.attack.counterSource,'STARTUP');assert.equal(m.hp,92);assert.equal(p.hp,100);assert.equal(m.hitstun,16);
 assert.equal(g.a.game.hitPauseFrames,3);assert.equal(g.a.game.rounds.stats.zorp.counters,1);assert.ok(g.events.includes('counter'));
});
test('punishing a physically missed heavy during recovery produces COUNTER',()=>{
 const g=fixture(110),p=g.a.game.player,m=g.a.game.mestre;g.a.start(m,'cross');g.until(()=>m.attack.frame>=m.attack.startup+4);assert.equal(p.hp,100);
 p.x=m.x-40;p.pushMotion=null;g.tap('j');g.until(()=>m.hp<100);
 assert.equal(p.attack.counterSource,'WHIFF_RECOVERY');assert.equal(m.hp,92);
});
test('a short punch can counter an active straight heavy from a different depth line',()=>{
 const g=fixture(60),p=g.a.game.player,m=g.a.game.mestre;g.a.start(m,'cross');
 p.x=m.x-36;p.y=m.y+11;g.step(13);g.a.start(p,'jab');g.until(()=>m.hp<100);
 assert.equal(p.hp,100);assert.equal(p.attack.counterSource,'HEAVY_ATTACK');assert.equal(p.attack.profile.variant,'SHORT_HEAD');
});
test('a standing neutral boxer is not a counter and combo hits do not repeatedly award counter bonuses',()=>{
 const a=string('JJK');assert.ok(a.hits.every(h=>!h.counter));
 const g=fixture(),p=g.a.game.player,m=g.a.game.mestre;g.a.start(m,'cross');g.tap('j');g.until(()=>m.hp<100);
 const hp=m.hp;g.tap('k');g.until(()=>m.hp<hp);assert.equal(p.attack.stage,2);assert.equal(p.attack.counter,false);
 assert.equal(g.a.game.rounds.stats.zorp.counters,1);
});
test('short body shots drain stamina while keeping HP damage moderate',()=>{
 const {attacker,target,hits}=string('KK',{distance:33});assert.equal(hits[1].body,true);assert.equal(hits[1].variant,'SHORT_BODY');
 assert.ok(hits[1].damage<hits[0].damage);assert.ok(target.stamina<=85);assert.equal(attacker.attack.profile.animation,'hook');
});
test('distance/depth determine a fixed strike profile at startup, not homing',()=>{
 const far=fixture(48,11);far.a.start(far.a.game.player,'cross');far.step(25);assert.equal(far.a.game.mestre.hp,100);
 const close=fixture(33,11);close.a.start(close.a.game.player,'cross');close.until(()=>close.a.game.mestre.hp<100);assert.equal(close.a.game.player.attack.profile.depthTolerance,14);
 const committed=fixture(48),p=committed.a.game.player;committed.a.start(p,'cross');const line=p.attack.originY;committed.a.game.mestre.y+=20;committed.step(25);
 assert.equal(committed.a.game.mestre.hp,100);assert.equal(p.attack.originY,line);
});
test('weight transfer advances heavy startup by small physical steps and never changes visual scale',()=>{
 const g=fixture(80),p=g.a.game.player;g.a.start(p,'cross');let previous=p.x,maxStep=0;
 for(let i=0;i<12;i++){g.step();maxStep=Math.max(maxStep,Math.abs(p.x-previous));previous=p.x;}
 assert.ok(p.x>200&&p.x<=206.001);assert.ok(maxStep<=.51);assert.equal(p.attack.profile.lunge,6);
});
test('hands alternate through existing normalized poses and close K selects the real inside pose',()=>{
 const {g,attacker}=string('JJJ');assert.equal(attacker.attack.profile.animation,'jab_left');
 g.until(()=>!attacker.attack);const q=fixture(33);q.a.start(q.a.game.player,'cross');assert.equal(q.a.game.player.attack.profile.animation,'hook');
});
test('neutral stamina returns promptly while attack/dodge/feint costs remain distinct',()=>{
 const g=fixture(),p=g.a.game.player;p.stamina=20;p.staminaDelay=12;g.step(60);assert.ok(p.stamina>=48&&p.stamina<51);
 const h=fixture();h.tap('j');assert.equal(h.a.game.player.stamina,95);
 const k=fixture();k.tap('k');assert.equal(k.a.game.player.stamina,87);
 const f=fixture();f.tap('l');assert.equal(f.a.game.player.stamina,96);
 const d=fixture();d.tap(' ');assert.equal(d.a.game.player.stamina,86);
});
test('round transitions clear queued normal knockback and buffered combo state',()=>{
 const g=fixture(),p=g.a.game.player,m=g.a.game.mestre;g.a.start(p,'jab');g.until(()=>m.hp<100);assert.ok(m.pushMotion);
 g.a.finish('zorp','TEMPO');assert.equal(p.pushMotion,null);assert.equal(m.pushMotion,null);assert.equal(p.attack,null);
 assert.equal(p.bufferedAttack,null);assert.equal(p.comboCount,0);
});
for(const fps of [30,60,144])test('confirmed J K K stays a three-hit physical string at '+fps+' FPS',()=>{
 const g=fixture();for(const kind of ['jab','cross','cross']){
  const hp=g.a.game.mestre.hp;g.a.input[kind]=true;for(let i=0;i<fps&&g.a.game.mestre.hp===hp;i++)g.step(1,fps);
 }
 assert.equal(g.a.game.player.comboCount,3);assert.equal(g.a.game.mestre.hp,67);
});

test('whiff recovery is committed rest, not neutral stamina regeneration',()=>{
 const g=fixture(110),p=g.a.game.player;g.a.start(p,'cross');g.until(()=>p.whiffFrames>0);const stamina=p.stamina;
 g.step(4);assert.equal(p.stamina,stamina);g.until(()=>!p.whiffFrames);g.step(10);assert.ok(p.stamina>stamina);
});
