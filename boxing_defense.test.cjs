const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{setup}=require('./boxing_rounds_harness.cjs');
function fixture(distance=40,depth=0,seed=1){
 const g=setup(seed);g.place(distance,depth);vm.runInContext('globalThis.defense={cfg:BOXING_CONFIG,outcome:boxingAttackOutcome,resolve:boxingResolveContact,update:boxingUpdateFighter,startParry:boxingStartParry,pressure:boxingApplyGuardPressure,clear:boxingClearRoundCombat,canAct:boxingCanAct,observe:boxingAiObserve,brain:boxingCreateMasterAI};',g.env);
 return {...g,d:g.env.defense,p:g.a.game.player,m:g.a.game.mestre};
}
function incoming(g,kind='cross',frame){g.a.start(g.m,kind);g.m.attack.frame=frame??g.m.attack.startup-1;return g.m.attack;}
function guardHit(kind){const g=fixture();g.a.input.guard=true;g.step(5);const pressure=g.p.guardPressure;incoming(g,kind);g.step();return {...g,pressure};}
for(const [kind,damage,pressure]of [['jab',2,22],['cross',5,42]])test('held guard: '+kind+' chip, pressure, stamina wear and no normal hitstun',()=>{
 const g=guardHit(kind);assert.equal(g.p.hp,100-damage);assert.equal(g.p.hitstun,0);assert.equal(g.p.guardBreakTimer,0);assert.ok(g.p.guardPressure-g.pressure>=pressure);assert.ok(g.p.stamina<100);assert.equal(g.m.attack.blocked,true);assert.equal(g.m.attack.parried,undefined);
});
test('pressure stacks from blocked combinations and resets only gradually',()=>{const g=fixture();g.a.input.guard=true;g.step();for(let n=0;n<3;n++){g.m.attack=null;incoming(g,'cross');g.step();g.a.game.hitPauseFrames=0;}assert.ok(g.p.guardBreakTimer>0);assert.equal(g.p.guard,false);assert.equal(g.p.attack,null);assert.equal(g.p.guardBreakTimer,30);assert.ok(g.events.includes('guardBreak'));});
test('guard break opens a real clean combo and cannot be escaped by Shift or Space',()=>{
 const g=fixture();g.a.input.guard=true;g.step();g.p.guardPressure=85;incoming(g);g.step();g.a.game.hitPauseFrames=0;assert.equal(g.p.guardBreakTimer,30);
 g.down('Shift');g.down(' ');g.step();assert.equal(g.p.guard,false);assert.equal(g.p.dodgeFrames,0);assert.equal(g.p.parryFrames,0);
 g.m.attack=null;g.a.start(g.m,'jab');g.until(()=>g.p.hitstun>0);assert.equal(g.m.comboCount,1);assert.equal(g.p.hp,87);
});
for(const age of [0,1,2,3])test('fresh Shift parries on active step '+age+' of four',()=>{
 const g=fixture(),a=incoming(g,'cross',0);a.frame=a.startup-1-age;g.down('Shift');g.step(age+1);assert.equal(a.parried,true);assert.equal(g.p.hp,99);assert.equal(g.p.hitstun,0);assert.equal(g.m.parryStun,14);assert.equal(g.p.counterSource,'PARRY');assert.ok(g.p.guardPressure<12);
});
test('four-step boundary: late contact is ordinary block, not parry',()=>{const g=fixture(),a=incoming(g,'cross',0);g.down('Shift');g.step(5);a.frame=a.startup-1;g.step();assert.equal(a.parried,undefined);assert.equal(g.p.hp,95);assert.equal(g.m.parryStun,0);});
test('auto-repeat and duplicated held keydown never refresh parry',()=>{const g=fixture();g.down('Shift');g.step(5);g.down('Shift',true);g.down('Shift');g.step();assert.equal(g.p.parryFrames,0);assert.equal(g.p.guard,true);const a=incoming(g);g.step();assert.equal(a.parried,undefined);});
test('tapping too early commits recovery; held guard remains guard',()=>{
 const tap=fixture();tap.tap('Shift');tap.step(4);assert.ok(tap.p.parryRecovery>0);assert.equal(tap.p.guard,false);assert.equal(tap.a.start(tap.p,'jab'),false);assert.equal(tap.a.dodge(tap.p,0,1,tap.m),false);assert.equal(tap.a.feint(tap.p,tap.m),false);
 const hold=fixture();hold.down('Shift');hold.step(9);assert.equal(hold.p.parryRecovery,0);assert.equal(hold.p.guard,true);assert.ok(hold.p.guardPressure>0);
});
test('parry missed tap takes ten full recovery steps and its cooldown prevents rapid rearming',()=>{
 const g=fixture();g.tap('Shift');g.step(4);assert.equal(g.p.parryRecovery,10);g.step(9);assert.equal(g.p.parryRecovery,1);g.step();assert.equal(g.p.parryRecovery,0);g.down('Shift');g.step();assert.equal(g.p.parryFrames,0);assert.equal(g.p.guard,true);
});
test('fresh guard while stunned is discarded, not buffered into a future parry',()=>{const g=fixture();g.p.hitstun=4;g.down('Shift');g.step(5);assert.equal(g.p.parryFrames,0);assert.equal(g.p.guard,true);});
test('Shift held through round intro needs release and a new keydown',()=>{const g=fixture();g.a.intro();g.down('Shift');g.step(140);assert.equal(g.p.guard,false);assert.equal(g.p.parryFrames,0);g.up('Shift');g.down('Shift');g.step();assert.equal(g.p.parryFrames,4);});
test('parry moves/staggers attacker, riposte is physical and gives one counter window',()=>{
 const g=fixture(),a=incoming(g);g.down('Shift');g.step();g.up('Shift');const x=g.m.x;assert.equal(a.parried,true);g.a.game.hitPauseFrames=0;g.step(4);assert.ok(g.m.x>x+5);assert.equal(g.m.attack,null);
 g.tap('j');g.until(()=>g.m.hp<100);assert.equal(g.p.attack.counterSource,'PARRY');assert.equal(g.m.hp,92);assert.equal(g.p.counterWindow,0);assert.equal(g.m.parryStun,0);
});
test('parry counter does not become an automatic hit out of range',()=>{const g=fixture();incoming(g);g.down('Shift');g.step();g.up('Shift');g.m.x=350;g.a.game.hitPauseFrames=0;g.tap('j');g.step(15);assert.equal(g.m.hp,100);assert.equal(g.p.attack.counterSource,'PARRY');});
test('repeated contact evaluation cannot parry, score or displace twice',()=>{const g=fixture(),a=incoming(g);g.down('Shift');g.step();const hp=g.p.hp,stamina=g.p.stamina;assert.equal(g.d.outcome(g.m,g.p),null);g.step(2);assert.equal(g.p.hp,hp);assert.equal(g.p.stamina,stamina);assert.equal(g.events.filter(e=>e==='parry').length,1);assert.equal(a.parried,true);});
test('parry does not save an exhausted guard already at its pressure limit',()=>{const g=fixture();incoming(g);g.p.guardPressure=99;g.down('Shift');g.step();assert.equal(g.p.guardBreakTimer,30);assert.equal(g.p.counterWindow,0);});
test('unblockable linear Master special cannot be parried',()=>{const g=fixture();g.m.specialCharge=100;assert.equal(g.a.request(g.m,g.p),true);g.m.attack.frame=g.m.attack.startup;g.d.startParry(g.p);const h=g.d.outcome(g.m,g.p);assert.ok(h);assert.equal(h.parried,undefined);assert.equal(h.blocked,false);});
test('a requested Rush can be parried: punch stops, charge stays spent, unused Overdrive charges remain',()=>{
 const g=fixture();g.p.specialCharge=100;g.a.request(g.p,g.m);g.a.start(g.p,'cross');const a=g.p.attack;a.frame=a.startup;g.d.startParry(g.m);const h=g.d.outcome(g.p,g.m);assert.equal(h.parried,true);g.d.resolve(h);assert.equal(g.p.special.charges,3);assert.equal(g.p.attack,null);assert.equal(g.p.whiffFrames,0);assert.equal(g.p.parryStun,14);assert.equal(g.m.hp,99);assert.equal(g.p.special.history[0].outcome,'PARRIED');
});
for(const age of [2,3,4,5,6,10,11])test('dodge contact age '+age+' respects evasive and perfect timing boundaries',()=>{
 const g=fixture(),a=incoming(g);g.a.dodge(g.p,1,0,g.m);g.p.dodgeAge=age;g.p.dodgeFrames=18-age;a.frame=a.startup;const h=g.d.outcome(g.m,g.p);g.d.resolve(h);
 const evasive=age>=3&&age<=10,perfect=age>=3&&age<=5;assert.equal(!!h.dodged,evasive);assert.equal(g.p.perfectDodgeFrames>0,perfect);if(evasive){assert.equal(g.p.hp,100);assert.equal(g.p.counterWindow,perfect?32:18);assert.equal(g.a.game.hitPauseFrames,perfect?3:0);}else assert.ok(g.p.hp<100);
});
test('Space sidesteps physically and correct timing rewards leaving the original line',()=>{const g=fixture();incoming(g,'cross',0);g.step(g.m.attack.startup-6);g.tap(' ');g.step(5);assert.ok(Math.abs(g.p.y-210)>8);assert.equal(g.p.hp,100);assert.ok(g.p.counterWindow>0);assert.ok(g.p.dodgeFrames>0);});
test('ordinary W depth movement avoids a straight punch without dodge invulnerability',()=>{const g=fixture();incoming(g,'cross',0);g.down('w');g.step(13);assert.ok(g.p.y<190);assert.equal(g.p.dodgeFrames,0);assert.equal(g.p.hp,100);assert.equal(g.m.attack.landed,false);});
test('recovery of an early dodge is punishable on a real line',()=>{const g=fixture();incoming(g,'cross',0);g.a.dodge(g.p,1,0,g.m);g.step(17);assert.equal(g.p.hp,80);assert.equal(g.m.attack.counterSource,'DODGE_RECOVERY');});
for(const kind of ['jab','cross'])for(const frame of [0,1,2,3,4,8,12,16,24])test('L cancel gate '+kind+' frame '+frame,()=>{
 const g=fixture();g.a.start(g.p,kind);const a=g.p.attack;a.frame=frame;const allowed=kind==='cross'&&frame<4;assert.equal(g.a.feint(g.p,g.m),allowed);if(allowed){assert.equal(g.p.attack,null);assert.equal(g.p.feint.kind,'cross');assert.equal(g.d.outcome(g.p,g.m),null);}else assert.equal(g.p.attack,a);
});
test('standalone L has readable windup, finite recovery, stamina cost, no hitbox or free cancel',()=>{const g=fixture();g.tap('l');assert.equal(g.p.animation,'hook');assert.equal(g.p.stamina,96);assert.equal(g.p.attack,null);assert.equal(g.a.start(g.p,'jab'),false);g.step(20);assert.equal(g.p.feint,null);assert.equal(g.m.hp,100);});
test('every feint frame really draws the boxer at a stable foot anchor and scale',()=>{
 const g=fixture();vm.runInContext(`globalThis.drawCalls=[];
 const testFrame={complete:true,naturalWidth:320,boxingAnchorX:160,boxingFootY:209};
 const BOXING_SPRITES={zorp:{hook:[testFrame],idle:[testFrame]}};
 const BOXING_FRAME_DURATIONS={},BOXING_FRAME_CANVAS={width:320,height:240},boxingShow={recoil:{}};
 globalThis.ctx=new Proxy({drawImage:(...args)=>drawCalls.push(args)}, {get:(o,k)=>o[k]||(()=>{})});
 function drawBoxingPunchTrace(){}function drawBoxingFighterState(){}
 `,g.env);g.a.feint(g.p,g.m);
 for(let frame=0;frame<14;frame++){vm.runInContext('drawBoxingActor(boxeGame.player)',g.env);g.step();}
 assert.equal(g.env.drawCalls.length,14);const first=g.env.drawCalls[0].slice(1);for(const call of g.env.drawCalls)assert.deepEqual(call.slice(1),first);
});
test('L cannot escape hitstun, guard break, whiff recovery, dodge or an already connected heavy',()=>{
 for(const field of ['hitstun','guardBreakTimer','whiffFrames','dodgeFrames','parryStun','parryRecovery']){const g=fixture();g.p[field]=5;assert.equal(g.a.feint(g.p,g.m),false,field);}
 const g=fixture();g.a.start(g.p,'cross');g.p.attack.landed=true;assert.equal(g.a.feint(g.p,g.m),false);
});
test('AI observation sees a credible pose, not the feint input or a magic fake tag',()=>{const g=fixture();g.a.feint(g.p,g.m);const b=g.d.brain(g.m);g.d.observe(b,g.p,1);const attack=b.history.at(-1).attack;assert.equal(attack.kind,'cross');assert.equal(Object.hasOwn(attack,'isFeint'),false);assert.equal(Object.hasOwn(attack,'feint'),false);assert.equal(g.p.attack,null);});
test('Master is sometimes baited by visible feints into parry/dodge and not always the same response',()=>{
 const modes=new Set();let baited=0,parries=0;
 for(let seed=1;seed<=60;seed++){
  const g=fixture(40,0,seed);g.a.game.qaFreezeAi=false;g.m.aiAttackCooldown=120;g.a.feint(g.p,g.m);
  for(let t=0;t<40;t++){g.step();const b=g.m.ai;if(b?.stats.defensivePlans)modes.add(b.mode);if(g.m.parryRecovery||g.m.dodgeFrames&&g.m.dodgeAge>10)baited++;}
  parries+=g.m.ai?.stats.parry||0;
 }
 assert.ok(parries>0,'no parry attempts');assert.ok(baited>0,'no punishable defensive commitments');assert.ok(modes.size>=3,[...modes].join(','));
});
test('all defense commitments and counter source clear at round transition',()=>{const g=fixture();Object.assign(g.p,{parryFrames:4,parryAttempt:true,parryCooldown:24,parryStun:14,parryRecovery:10,parryFlash:18,counterSource:'PARRY',counterWindow:20});g.d.clear();for(const field of ['parryFrames','parryCooldown','parryStun','parryRecovery','parryFlash','counterWindow'])assert.equal(g.p[field],0,field);assert.equal(g.p.parryAttempt,false);assert.equal(g.p.counterSource,null);});
for(const fps of [30,60,144])test('defense simulation is stable at '+fps+' render FPS',()=>{const g=fixture();g.down('Shift');g.step(Math.round(fps*.5),fps);assert.equal(g.p.parryFrames,0);assert.equal(g.p.guard,true);assert.ok(g.p.guardPressure>6);assert.equal(g.p.parryRecovery,0);assert.equal(g.a.game.fightFrames,30);});
