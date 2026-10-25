const test=require('node:test'),assert=require('node:assert/strict'),{setup,simulate}=require('./boxing_ai_harness.cjs');
test('no response or movement occurs before a delayed observation exists',()=>{
 const g=setup(7),m=g.a.game.mestre;g.a.start(g.a.game.player,'cross');const x=m.x,y=m.y;g.step(11);
 assert.equal(m.x,x);assert.equal(m.y,y);assert.equal(m.guard,false);assert.equal(m.dodgeFrames,0);assert.equal(m.attack,null);assert.equal(m.ai.view,null);
});
test('all decisions use positions at least 200ms old; abrupt changes are not read immediately',()=>{
 const g=setup(8);g.step(28);const b=g.a.game.mestre.ai;assert.ok(b.decisions.length);assert.ok(b.decisions.every(d=>d.lag>=12));
 const before=b.view.x;g.a.game.player.x=350;g.a.game.player.pushMotion=null;g.step(8);assert.equal(b.view.x,before);g.step(30);assert.equal(b.view.x,350);
});
test('input flags alone cannot trigger a reaction before a visible action',()=>{
 const a=setup(31),b=setup(31);a.a.game.qaFreezeAi=b.a.game.qaFreezeAi=true;
 for(let frame=1;frame<60;frame++){a.a.game.fightFrames=b.a.game.fightFrames=frame;a.env.keys.j=true;a.a.input.special=true;
  assert.deepEqual(JSON.parse(JSON.stringify(a.a.intent())),JSON.parse(JSON.stringify(b.a.intent())));}
});
test('pressure plans defense, dodge or leaving the line without breaking real hitstun',()=>{
 const seen=new Set();for(let seed=1;seed<=18;seed++){
  const g=setup(seed);g.a.game.qaFreezeAi=true;const m=g.a.game.mestre,p=g.a.game.player,b=g.a.makeBrain(m);m.ai=b;
  b.pressure=2;b.view={frame:0,x:p.x,y:p.y,hp:100,guard:false,attack:null};m.hitstun=12;
  g.a.plan(b,m,b.view,30);seen.add(b.mode);g.a.game.qaFreezeAi=false;g.step(5);assert.ok(m.hitstun>0);assert.equal(m.attack,null);assert.equal(m.dodgeFrames,0);
 }assert.ok(seen.has('DEFEND'));assert.ok(seen.has('EVADE'));assert.ok(seen.has('REPOSITION'));
});
test('low HP prefers pressure, while an HP lead allows cautious play',()=>{
 const count=(own,other)=>{let pressure=0,cautious=0;for(let seed=10;seed<110;seed++){
  const g=setup(seed),m=g.a.game.mestre,b=g.a.makeBrain(m);m.hp=own;g.a.plan(b,m,{frame:0,x:m.x-45,y:m.y,hp:other,guard:false,attack:null},80);
  pressure+=b.mode==='PRESSURE';cautious+=b.mode==='CAUTIOUS'||b.mode==='MEASURE';}return {pressure,cautious};};
 const urgent=count(25,80),ahead=count(80,35);assert.ok(urgent.pressure>ahead.pressure);assert.ok(ahead.cautious>urgent.cautious);
});
test('delayed attacks can whiff on a sidestep; ordinary reach and depth are unchanged',()=>{
 const g=setup(12);g.step(90);g.a.game.player.y=175;g.step(35);assert.ok(g.a.game.mestre.ai.decisions.every(d=>d.lag>=12));
 const m=g.a.game.mestre,p=g.a.game.player,attack={facing:-1,originY:210};assert.equal(g.a.canHit({x:240},{x:200,y:235},attack,{range:52,depthTolerance:11}),false);
});
test('AI cannot act during whiff recovery, dodge, guard break or hitstun',()=>{
 for(const field of ['hitstun','whiffFrames','guardBreakTimer','dodgeFrames']){
  const g=setup(22);g.step(25);g.a.game.mestre.attack=null;g.a.game.mestre[field]=20;const intent=g.a.intent();assert.equal(intent.attack,null);assert.equal(intent.special,undefined);assert.equal(intent.dodge,false);
 }
});
test('master uses the delayed snapshot for special gating rather than current guard/dodge/position',()=>{
 const g=setup(32);let saw=[];g.env.BoxingMasterSpecial={...g.env.BoxingMasterSpecial,shouldUse:(m,v)=>{saw.push(v);return false;},positionIntent:()=>null};
 g.a.game.player.x=90;g.step(25);g.a.game.player.x=350;g.a.game.player.pushMotion=null;g.a.game.player.guard=true;g.step(6);
 assert.ok(saw.length);assert.ok(saw.slice(-1)[0].x!==350);assert.ok(saw.slice(-1)[0].guard===false);
});
test('reset clears perception, pressure and statistics',()=>{
 const g=setup(5);g.step(120);assert.ok(g.a.game.mestre.ai);g.a.reset(true);assert.equal(g.a.game.mestre.ai,null);g.step();assert.equal(g.a.game.mestre.ai.view,null);
});
test('late defensive reading permits a first quick jab to connect before the AI can react',()=>{
 const g=setup(24);g.a.start(g.a.game.player,'jab');g.step(6);assert.equal(g.a.game.mestre.hp,94);
 assert.equal(g.a.game.mestre.guard,false);assert.equal(g.a.game.mestre.dodgeFrames,0);assert.equal(g.a.game.mestre.ai.view,null);
});
test('perception moves forward in time and its history stays bounded throughout a fight',()=>{
 const g=setup(14);let previous=-1;for(let n=0;n<600&&g.a.game.phase==='FIGHTING';n++){
  g.step();const b=g.a.game.mestre.ai;assert.ok(b.history.length<=48);assert.ok(b.decisions.length<=24);
  if(b.view){assert.ok(b.view.frame>=previous);previous=b.view.frame;}
 }
});
test('successful blocking has a short local response delay, not an immediate free strike',()=>{
 const g=setup(41);g.a.game.qaFreezeAi=true;const m=g.a.game.mestre;m.ai=g.a.makeBrain(m);
 m.guard=true;m.guardFlash=9;g.a.game.fightFrames=30;g.a.intent();
 assert.ok(m.ai.blockCounterAt>=36);assert.ok(m.ai.blockCounterAt<=40);assert.equal(m.attack,null);
});
test('a critical master may attempt a vulnerable reversal at shorter range, without changing the dash physics',()=>{
 const g=setup(65),m=g.a.game.mestre,p=g.a.game.player;m.ai=g.a.makeBrain(m);m.hp=30;m.ai.pressure=2;
 m.specialCharge=100;m.x=p.x+65;m.aiTargetX=p.x;m.aiTargetY=p.y;g.a.game.fightFrames=650;
 assert.equal(g.env.BoxingMasterSpecial.shouldUse(m,{x:p.x,y:p.y,guard:false,attack:null,dodgeFrames:0}),true);
 m.aiTargetY=p.y+25;assert.equal(g.env.BoxingMasterSpecial.shouldUse(m,p),false);
});
test('same seed produces identical fights and fixed-step behavior across rendering rates',()=>{
 const run=fps=>{const g=setup(77);g.place(90,5);for(let n=0;n<fps*5;n++)g.step(1,fps);return [g.a.game.mestre.x,g.a.game.mestre.y,g.a.game.player.hp,g.a.game.mestre.ai.stats.jab,g.a.game.mestre.ai.stats.cross];};
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(144));
});
test('several complete fights offer wins, mistakes, defense and every attack type',()=>{
 const rows=[];for(const policy of ['idle','guard','mash','competent','skilled'])for(let seed=1;seed<=4;seed++)rows.push(simulate(seed,policy));
 assert.ok(rows.every(r=>r.phase==='RESULT'));assert.ok(rows.some(r=>r.winner==='zorp'));assert.ok(rows.some(r=>r.winner==='master'));assert.ok(rows.filter(r=>r.policy==='guard').every(r=>r.winner==='master'));assert.ok(rows.filter(r=>r.policy==='skilled').some(r=>r.winner==='zorp'));
 for(const key of ['jab','cross','guard','dodge','special','whiffs'])assert.ok(rows.some(r=>r.stats[key]>0),'missing '+key);
});
