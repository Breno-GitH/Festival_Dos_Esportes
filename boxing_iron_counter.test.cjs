const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{setup}=require('./boxing_rounds_harness.cjs');
function fixture(distance=40,depth=0,seed=1){const g=setup(seed);g.place(distance,depth);vm.runInContext('globalThis.iron={config:MASTER_IRON_CONFIG,outcome:boxingAttackOutcome,resolve:boxingResolveContact,profile:boxingAttackSpec,canChain:boxingCanChain,canAct:boxingCanAct,observe:boxingIronObserve,brain:boxingCreateMasterAI,plan:boxingAiPlan,clear:boxingClearRoundCombat};',g.env);return {...g,p:g.a.game.player,m:g.a.game.mestre,i:g.env.iron};}
function masterString(sequence,counter=false){const g=fixture();if(counter){g.m.counterWindow=20;g.m.counterTarget='zorp';g.m.counterSource='PARRY';}for(let n=0;n<sequence.length;n++){const hp=g.p.hp,kind=sequence[n];if(n)g.until(()=>g.i.canChain(g.m,g.p,kind));assert.equal(g.a.start(g.m,kind,n>0),true);g.until(()=>g.p.hp<hp);assert.equal(g.m.comboCount,n+1);}return g;}
for(const sequence of [['jab','cross'],['jab','jab','cross'],['cross','jab']])test('Master physical short combo '+sequence.join(' → '),()=>{const g=masterString(sequence);assert.ok(g.m.comboCount<=3);if(sequence.length===3){assert.equal(g.m.attack.finisher,true);assert.equal(g.a.start(g.m,'jab',true),false);}});
test('parry Counter K → J → K is physical, capped at three hits and returns to neutral',()=>{const g=masterString(['cross','jab','cross'],true);assert.equal(g.m.comboCount,3);assert.equal(g.m.attack.finisher,true);assert.equal(g.a.start(g.m,'jab',true),false);g.step(12);assert.ok(Math.abs(g.p.x-g.m.x)>=70);});
for(const kind of ['jab','cross'])test('Master '+kind+' trades more damage/push/stamina/recovery than Zorp without changing attributes with HP',()=>{
 const g=fixture(60);g.a.start(g.p,kind);g.a.start(g.m,kind);const a=g.p.attack.profile,b=g.m.attack.profile;
 for(const key of ['damage','push','recovery'])assert.ok(b[key]>a[key],key);assert.ok(g.m.stamina<g.p.stamina);const h=fixture(60);h.m.hp=20;h.a.start(h.m,kind);assert.deepEqual(JSON.parse(JSON.stringify(h.m.attack.profile)),JSON.parse(JSON.stringify(b)));
});
test('earned Master counter K has a prepared ten-step startup, not instant contact',()=>{const g=fixture();g.m.counterWindow=20;g.m.counterTarget='zorp';g.m.counterSource='SLIP';g.a.start(g.m,'cross');assert.equal(g.m.attack.startup,10);g.step(9);assert.equal(g.p.hp,100);g.step();assert.equal(g.p.hp,80);});
test('counter stance has one predetermined four-step parry window, and no input-following retiming',()=>{
 const g=fixture();assert.equal(g.env.BoxingIronCounter.startStance(g.m,10),true);g.step(7);const s=g.m.counterStance;assert.equal(s.wait,10);assert.equal(g.m.parryFrames,0);g.p.y-=20;g.step(3);assert.equal(s.wait,10);assert.equal(s.lineY,210);g.step();assert.equal(g.m.parryFrames,4);g.step(4);assert.equal(g.m.counterStance,null);assert.equal(g.m.parryRecovery,14);assert.equal(g.m.guard,false);
});
test('predictable contact in stance is parried and grants a counter; a second input is still required',()=>{
 const g=fixture();g.env.BoxingIronCounter.startStance(g.m,6);g.step(6);g.a.start(g.p,'jab');g.p.attack.frame=g.p.attack.startup-1;g.step();assert.equal(g.p.attack,null);assert.equal(g.p.parryStun,14);assert.equal(g.m.counterSource,'PARRY');assert.equal(g.m.counterStance,null);assert.equal(g.m.attack,null);assert.equal(g.m.hp,100);
});
test('finta or patience baits the stance parry and leaves genuine punishable recovery',()=>{
 for(const fake of [false,true]){const g=fixture();g.env.BoxingIronCounter.startStance(g.m,6);if(fake)g.a.feint(g.p,g.m);g.until(()=>g.m.parryRecovery>0);assert.equal(g.m.hp,100);assert.equal(g.m.counterWindow,0);g.until(()=>!g.p.feint);g.a.start(g.p,'jab');g.until(()=>g.m.hp<100);assert.equal(g.p.attack.counterSource,'PARRY_WHIFF');assert.equal(g.m.hp,92);}
});
test('repositioning defeats the committed stance line and a late strike is not parried',()=>{const g=fixture();g.env.BoxingIronCounter.startStance(g.m,6);g.p.y=190;g.step(11);assert.equal(g.m.y,210);assert.equal(g.m.counterWindow,0);g.p.y=210;g.a.start(g.p,'jab');g.until(()=>g.m.hp<100);assert.equal(g.p.attack.blocked,false);assert.equal(g.p.attack.counterSource,'PARRY_WHIFF');});
test('counter stance respects guard pressure; it cannot shelter a broken guard',()=>{const g=fixture();g.env.BoxingIronCounter.startStance(g.m,22);g.m.guardPressure=99.9;g.step();assert.equal(g.m.guardBreakTimer,30);assert.equal(g.m.counterStance,null);assert.equal(g.m.guard,false);});
test('stance may adjust once from an actual blocked jab and previous cadence, then can be baited',()=>{
 const g=fixture();g.env.BoxingIronCounter.startStance(g.m,22);g.a.start(g.p,'jab');g.until(()=>g.p.attack.landed);
 assert.equal(g.m.counterStance.retimed,true);const wait=g.m.counterStance.wait;g.env.keys.j=true;g.step(2);assert.equal(g.m.counterStance.wait,wait);
 g.until(()=>!g.m.counterStance);assert.equal(g.m.counterWindow,0);assert.ok(g.m.parryRecovery>0);
});
test('Crushing Counter needs physical Master K into actual Zorp heavy startup',()=>{
 const g=fixture();g.a.start(g.m,'cross');g.step(10);g.a.start(g.p,'cross');g.until(()=>g.p.hp<100);assert.equal(g.m.attack.crushingCounter,true);assert.equal(g.m.attack.counterSource,'CRUSHING_COUNTER');assert.equal(g.p.hp,77);assert.equal(g.p.stamina,75);assert.equal(g.p.hitstun,28);assert.equal(g.a.game.hitPauseFrames,4);assert.ok(g.events.includes('crushing'));
});
test('Crushing Counter cannot hit through guard, depth, range, dodge or idle as a magic bonus',()=>{
 for(const [distance,depth,guard]of [[40,0,false],[40,0,true],[120,0,false],[40,22,false]]){const g=fixture(distance,depth);g.a.input.guard=guard;g.a.start(g.m,'cross');g.step(20);if(distance===40&&depth===0){assert.equal(g.m.attack.crushingCounter,undefined);assert.equal(g.p.hp,guard?95:82);}else assert.equal(g.p.hp,100);}
});
function armorFixture(frameOffset=-1){const g=fixture();g.m.ironArmorNext=true;g.a.start(g.m,'cross');g.m.attack.frame=g.m.attack.startup+frameOffset;g.a.start(g.p,'jab');g.p.attack.frame=g.p.attack.startup;return g;}
test('late armor absorbs one ordinary jab, still loses HP/stamina and grants no hit-confirm to the jab',()=>{
 const g=armorFixture(),a=g.m.attack,h=g.i.outcome(g.p,g.m);assert.equal(h.armored,true);g.i.resolve(h);assert.equal(g.m.hp,94);assert.equal(g.m.hitstun,0);assert.equal(g.m.attack,a);assert.equal(a.armorCharges,0);assert.equal(g.p.attack.armored,true);assert.equal(g.i.canChain(g.p,g.m,'cross'),false);
});
for(const offset of [-5,-4,0,1,5])test('armor inactive outside last three startup frames: offset '+offset,()=>{const g=armorFixture(offset),h=g.i.outcome(g.p,g.m);assert.equal(h.armored,false);g.i.resolve(h);assert.equal(g.m.attack,null);assert.ok(g.m.hitstun>0);});
test('armor is one contact only, never permanent or a damage shield',()=>{const g=armorFixture(-2);g.i.resolve(g.i.outcome(g.p,g.m));g.p.attack=null;g.a.start(g.p,'jab');g.p.attack.frame=g.p.attack.startup;const h=g.i.outcome(g.p,g.m);assert.equal(h.armored,false);g.i.resolve(h);assert.equal(g.m.attack,null);assert.ok(g.m.hp<90);});
for(const kind of ['heavy','counter','rush'])test(kind+' defeats late Master armor',()=>{
 const g=armorFixture(-1);g.p.attack=null;
 if(kind==='counter'){g.p.counterWindow=20;g.p.counterTarget='master';g.p.counterSource='DODGE';}
 if(kind==='rush'){g.p.specialCharge=100;g.a.request(g.p,g.m);}
 g.a.start(g.p,kind==='heavy'?'cross':'jab');g.p.attack.frame=g.p.attack.startup;const h=g.i.outcome(g.p,g.m);assert.equal(h.armored,false);g.i.resolve(h);assert.equal(g.m.attack,null);assert.ok(g.m.hitstun>0);
});
test('normal Master heavies have no armor unless one was explicitly prepared',()=>{const g=fixture();g.a.start(g.m,'cross');assert.equal(g.m.attack.profile.armorLate,false);assert.equal(g.m.attack.armorCharges,0);});
test('Slip moves only eight depth pixels, narrowly evades a normal jab and opens a real counter',()=>{
 const g=fixture();g.env.BoxingIronCounter.startSlip(g.m,1);g.step(3);assert.ok(g.m.y>210&&g.m.y<219);g.a.start(g.p,'jab');g.p.attack.frame=g.p.attack.startup;const h=g.i.outcome(g.p,g.m);assert.equal(h.slipped,true);g.i.resolve(h);assert.equal(g.m.hp,100);assert.equal(g.m.counterSource,'SLIP');assert.equal(g.m.counterWindow,20);g.a.input.cross=true;g.until(()=>!g.m.slip);assert.ok(g.m.y<=218.001);
});
test('Slip is not invulnerability to K/Rush or attacks arriving outside its short timing',()=>{
 for(const [kind,age,rush]of [['cross',4,false],['jab',7,false],['jab',4,true]]){const g=fixture();g.env.BoxingIronCounter.startSlip(g.m,1);g.m.slip.age=age;if(rush){g.p.specialCharge=100;g.a.request(g.p,g.m);}g.a.start(g.p,kind);g.p.attack.frame=g.p.attack.startup;const h=g.i.outcome(g.p,g.m);assert.equal(!!h.slipped,false);g.i.resolve(h);assert.ok(g.m.hp<100);assert.equal(g.m.slip,null);}
});
test('recent pattern model is bounded and uses visible history, including believable feints',()=>{
 const g=fixture(),b=g.i.brain(g.m);for(let n=1;n<=35;n++)g.i.observe(b,{frame:n*8,x:100,y:210,guard:n%2===0,dodgeFrames:n%3===0?4:0,attack:{token:n,kind:'jab',frame:1,startup:6}});
 assert.equal(b.patternSamples.length,24);assert.ok(b.attackLog.length<=8);assert.equal(b.recent.jab,1);assert.ok(b.recent.dodge>0);assert.ok(b.recent.guard>0);
});
test('jab patterns favor counter stance, guard patterns favor K/body pressure and distance uses approach',()=>{
 const modes=new Set();for(let seed=1;seed<=40;seed++){const g=fixture(55,0,seed),b=g.i.brain(g.m);b.recent={jab:1,attacks:4,guard:0,dodge:0,distant:0};b.attackLog=[{kind:'jab',start:40,startup:6},{kind:'jab',start:60,startup:6}];g.i.plan(b,g.m,{frame:65,x:g.p.x,y:g.p.y,hp:100,guard:false,attack:null},80);modes.add(b.mode);}
 assert.ok(modes.has('COUNTER_STANCE'));assert.ok(modes.has('MEASURE'));const g=fixture(140),b=g.i.brain(g.m);g.i.plan(b,g.m,{frame:50,x:g.p.x,y:g.p.y,hp:100,guard:false,attack:null},80);assert.equal(b.mode,'APPROACH');
});
test('measuring windows last 0.3–1 seconds and AI does not fire while measuring',()=>{const g=fixture();g.a.game.qaFreezeAi=false;g.step(28);const b=g.m.ai;g.m.attack=null;g.m.feint=null;g.m.hitstun=0;g.m.parryRecovery=0;b.mode='MEASURE';b.modeUntil=g.a.game.fightFrames+30;b.decisionIn=40;b.blockCounterAt=0;b.specialPending=false;const intent=g.env.boxingMasterIntent();assert.equal(intent.attack,null);assert.equal(intent.special,undefined);});
test('Titan Straight retains committed dash physics and mandatory recovery',()=>{const g=fixture(135);g.m.specialCharge=100;g.a.request(g.m,g.p);assert.equal(g.m.special.name,'TITAN_STRAIGHT');g.p.y-=25;g.until(()=>g.m.special?.phase==='RECOVERY');assert.equal(g.p.hp,100);assert.equal(g.m.special.lineY,210);assert.equal(g.m.special.facing,-1);assert.equal(g.m.special.feinted,false);});
test('rare Titan feint is planned before charge, has no hitbox, costs meter and leaves recovery',()=>{
 const g=fixture(135);g.a.game.rounds.number=2;g.m.titanFeintNext=true;g.m.specialCharge=100;g.a.request(g.m,g.p);g.step(12);assert.equal(g.m.special.phase,'FEINT_RECOVERY');assert.equal(g.m.attack,null);assert.equal(g.p.hp,100);assert.equal(g.m.specialCharge,45);assert.equal(g.m.specialCooldown,708);g.step(18);assert.equal(g.m.special,null);assert.equal(g.m.lastSpecial.feinted,true);
});
test('Titan feint selection is rare, based on recorded dodge habits, locked before charge and unavailable in round one',()=>{
 let selected=0;
 for(let seed=1;seed<=200;seed++){
  const g=fixture(135,0,seed),b=g.i.brain(g.m),view={frame:0,x:g.p.x,y:g.p.y,hp:100,guard:false,attack:null,dodgeFrames:0};
  g.m.ai=b;b.history=[view];b.view=view;b.decisionIn=100;b.mode='SPECIAL';b.modeUntil=100;b.specialPending=true;b.recent.dodge=.5;g.a.game.fightFrames=40;g.a.game.rounds.number=2;
  const intent=g.env.boxingMasterIntent();assert.equal(intent.special,true);selected+=g.m.titanFeintNext?1:0;
  if(g.m.titanFeintNext){b.specialPending=true;g.env.boxingMasterIntent();assert.equal(g.m.titanFeintNext,false);}
 }
 assert.ok(selected>0&&selected<40,'selected '+selected+' of 200');
 const first=fixture(135);first.m.titanFeintNext=true;first.m.specialCharge=100;first.a.request(first.m,first.p);first.step(12);assert.equal(first.m.special.phase,'CHARGE');
});
test('round transitions clear stance, slip, armor preparation and Titan-feint flags',()=>{const g=fixture();g.m.counterStance={age:1};g.m.slip={age:1};g.m.stanceCooldown=140;g.m.slipCooldown=50;g.m.ironArmorNext=true;g.m.titanFeintNext=true;g.i.clear();assert.equal(g.m.counterStance,null);assert.equal(g.m.slip,null);assert.equal(g.m.stanceCooldown,0);assert.equal(g.m.slipCooldown,0);assert.equal(g.m.ironArmorNext,false);assert.equal(g.m.titanFeintNext,false);});
for(const fps of [30,60,144])test('Iron stance and recovery timing at '+fps+' FPS',()=>{const g=fixture();g.env.BoxingIronCounter.startStance(g.m,12);g.step(fps*.6,fps);assert.equal(g.m.counterStance,null);assert.equal(g.m.parryRecovery,0);assert.equal(g.m.hp,100);});
