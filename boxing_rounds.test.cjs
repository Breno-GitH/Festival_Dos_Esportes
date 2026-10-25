const test=require('node:test'),assert=require('node:assert/strict'),{setup}=require('./boxing_rounds_harness.cjs');
for(const [label,sequence,winner]of [['Zorp 2–0',['zorp','zorp'],'zorp'],['Zorp 2–1',['zorp','master','zorp'],'zorp'],['Mestre 2–0',['master','master'],'master'],['Mestre 2–1',['master','zorp','master'],'master']]){
 test(label+' only finishes the match after two round wins',()=>{
  const g=setup();for(let i=0;i<sequence.length;i++){
   g.winRound(sequence[i]);assert.equal(g.medals.length,0);assert.equal(g.results.length,0);g.next();
   if(i<sequence.length-1){assert.equal(g.a.game.phase,'FIGHTING');assert.equal(g.a.game.rounds.number,i+2);}
  }
  assert.equal(g.a.game.phase,'RESULT');assert.equal(g.a.game.winner,winner);assert.equal(g.a.game.rounds.history.length,sequence.length);
  assert.equal(g.a.game.rounds.wins[winner],2);assert.equal(g.results.length,1);assert.deepEqual(g.medals,winner==='zorp'?['boxe']:[]);
  const n=g.a.game.rounds.number;g.step(300);assert.equal(g.a.game.rounds.number,n);assert.equal(g.medals.length,winner==='zorp'?1:0);
 });
}
test('official keys: J weak, K strong, L feint, Shift guard, Space dodge; I has no action',()=>{
 const weak=setup();weak.tap('j');assert.equal(weak.a.game.player.attack.kind,'jab');assert.equal(weak.a.game.player.stamina,95);
 const strong=setup();strong.tap('k');assert.equal(strong.a.game.player.attack.kind,'cross');assert.equal(strong.a.game.player.stamina,87);
 const fake=setup();fake.tap('l');assert.ok(fake.a.game.player.feint);assert.equal(fake.a.game.player.attack,null);
 const guard=setup();guard.down('Shift');guard.step();assert.equal(guard.a.game.player.guard,true);guard.up('Shift');guard.step(4);assert.equal(guard.a.game.player.guard,false);assert.ok(guard.a.game.player.parryRecovery>0);
 const dodge=setup();dodge.tap(' ');assert.ok(dodge.a.game.player.dodgeFrames>0);assert.equal(dodge.a.game.player.attack,null);assert.ok(dodge.prevented()>0);
 const old=setup();old.tap('i');assert.equal(old.a.game.player.dodgeFrames,0);assert.equal(old.a.game.player.attack,null);
});
test('A/D move horizontally; W/S physically change depth',()=>{
 for(const [key,axis,sign]of [['a','x',-1],['d','x',1],['w','y',-1],['s','y',1]]){
  const g=setup();g.place(100);const before=g.a.game.player[axis];g.down(key);g.step(5);g.up(key);assert.ok((g.a.game.player[axis]-before)*sign>0);
 }
});
test('Space repeat cannot spam dodge or scroll, and an intro-held Space never leaks into gameplay',()=>{
 const g=setup();g.a.intro();g.down(' ');g.step(160);g.down(' ',true);g.step(2);assert.equal(g.a.game.phase,'FIGHTING');assert.equal(g.a.game.player.dodgeFrames,0);
 assert.ok(g.env.BoxingInput.snapshot().gated.includes('space'));g.up(' ');g.tap(' ');assert.ok(g.a.game.player.dodgeFrames>0);
 const before=g.a.game.player.stamina;g.down(' ',true);g.step();assert.equal(g.a.game.player.stamina,before);assert.ok(g.prevented()>0);
});
test('an active round runs for exactly 40 simulation seconds, even through hitstop; transitions pause clock and damage',()=>{
 const g=setup();g.a.game.hitPauseFrames=3;g.step(60);assert.equal(g.a.game.rounds.remaining,2340);
 g.a.game.player.hp=80;g.a.game.mestre.hp=60;g.a.game.rounds.remaining=1;g.step();assert.equal(g.a.game.phase,'ROUND_RESULT');
 assert.equal(g.a.game.rounds.result.reason,'TEMPO');assert.equal(g.a.game.rounds.result.winner,'zorp');
 const before=g.a.game.player.hp;g.a.input.jab=true;g.a.input.cross=true;g.step(50);assert.equal(g.a.game.player.hp,before);assert.equal(g.a.game.rounds.remaining,0);assert.equal(g.a.game.player.attack,null);
});
for(const [name,stats,expected]of [['damage',{damage:[20,10],counters:[0,4],cleanHits:[1,8]},'DANO'],['counters',{damage:[20,20],counters:[2,1],cleanHits:[1,8]},'COUNTERS'],['clean hits',{damage:[20,20],counters:[1,1],cleanHits:[8,7]},'GOLPES LIMPOS']]){
 test('tied HP uses '+name+' in the prescribed order',()=>{
  const g=setup();g.a.game.player.hp=g.a.game.mestre.hp=60;for(const [key,values]of Object.entries(stats)){g.a.game.rounds.stats.zorp[key]=values[0];g.a.game.rounds.stats.master[key]=values[1];}
  g.a.game.rounds.remaining=1;g.step();assert.equal(g.a.game.rounds.result.winner,'zorp');assert.equal(g.a.game.rounds.result.criterion,expected);
 });
}
test('an absolute tie enters sudden death; only a clean strike wins, with no random tiebreak',()=>{
 const g=setup();g.a.game.rounds.remaining=1;g.step();assert.equal(g.a.game.phase,'INTRO');assert.equal(g.a.game.rounds.suddenDeath,true);assert.equal(g.a.game.rounds.history.length,0);
 g.next();g.place();g.down('Shift');g.a.start(g.a.game.mestre,'jab');g.step(10);assert.equal(g.a.game.phase,'FIGHTING');assert.equal(g.a.game.rounds.history.length,0);
 g.up('Shift');g.until(()=>!g.a.game.mestre.attack);g.place();g.a.start(g.a.game.player,'cross');g.until(()=>g.a.game.phase==='ROUND_RESULT');assert.equal(g.a.game.rounds.result.winner,'zorp');assert.equal(g.a.game.rounds.result.reason,'SUDDEN DEATH');
});
test('simultaneous lethal strikes do not pick a winner by contact order',()=>{
 const g=setup();g.a.game.player.hp=g.a.game.mestre.hp=6;g.a.start(g.a.game.player,'jab');g.a.start(g.a.game.mestre,'jab');g.a.game.mestre.attack.frame=g.a.game.mestre.attack.startup-g.a.game.player.attack.startup;g.step(6);
 assert.equal(g.a.game.rounds.history.length,0);assert.equal(g.a.game.rounds.suddenDeath,true);g.next();g.place();g.a.game.player.hp=g.a.game.mestre.hp=1;
 g.a.start(g.a.game.player,'jab');g.a.start(g.a.game.mestre,'jab');g.a.game.mestre.attack.frame=g.a.game.mestre.attack.startup-g.a.game.player.attack.startup;g.step(6);assert.equal(g.a.game.phase,'FIGHTING');assert.equal(g.a.game.rounds.history.length,0);assert.equal(g.a.game.player.hp,1);assert.equal(g.a.game.mestre.hp,1);
});
test('next round restores HP/stamina, clears combat and buffered input, and resets special meters and cooldowns',()=>{
 const g=setup();g.a.game.player.specialCharge=90;g.a.game.mestre.specialCharge=75;g.a.game.player.specialCooldown=99;
 g.winRound('zorp');const charge=[g.a.game.player.specialCharge,g.a.game.mestre.specialCharge];g.a.game.player.stamina=2;g.a.game.player.guardPressure=90;g.a.game.player.feintCooldown=40;
 g.down('j');g.down('Shift');g.down(' ');g.next();const p=g.a.game.player,m=g.a.game.mestre;
 assert.equal(p.hp,100);assert.equal(m.hp,100);assert.equal(p.stamina,100);assert.equal(m.stamina,100);assert.equal(p.specialCharge,0);assert.equal(m.specialCharge,0);assert.equal(p.specialCooldown,0);
 for(const key of ['attack','feint','special','bufferedAttack'])assert.equal(p[key],null);
 for(const key of ['hitstun','guardBreakTimer','comboCount','dodgeFrames','feintCooldown'])assert.equal(p[key],0);
 g.step(5);assert.equal(p.attack,null);assert.equal(p.guard,false);assert.equal(p.dodgeFrames,0);g.up('j');g.up('Shift');g.up(' ');g.tap('j');assert.equal(p.attack.kind,'jab');
});
test('feint creates only a visible windup and never hits; it can cancel a normal startup but not its impact',()=>{
 const g=setup();g.tap('l');g.step(40);assert.equal(g.a.game.mestre.hp,100);assert.equal(g.a.game.player.feint,null);assert.equal(g.a.game.rounds.stats.zorp.cleanHits,0);
 const h=setup();h.tap('k');h.step(2);h.tap('l');assert.equal(h.a.game.player.attack,null);assert.ok(h.a.game.player.feint);h.step(25);assert.equal(h.a.game.mestre.hp,100);
});
test('weak-heavy combos remain connected, with the strong finisher costing more stamina',()=>{
 const g=setup();g.tap('j');g.until(()=>g.a.game.mestre.hp===94);g.tap('j');g.until(()=>g.a.game.mestre.hp===88);g.tap('k');g.until(()=>g.a.game.mestre.hp===75);assert.equal(g.a.game.player.comboCount,3);assert.equal(g.a.game.player.stamina,77);
});
test('guard still breaks under pressure and cannot erase chip damage',()=>{
 const g=setup();g.down('Shift');g.a.game.player.guardPressure=90;g.a.start(g.a.game.mestre,'cross');g.until(()=>g.a.game.player.guardBreakTimer>0);assert.equal(g.a.game.player.hp,95);assert.equal(g.a.game.player.guard,false);
});
test('Space within the narrow impact window produces Perfect Dodge, hitstop and a counter',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(g.a.game.mestre.attack.startup-4);g.tap(' ');g.step(3);assert.equal(g.a.game.player.hp,100);assert.ok(g.a.game.player.perfectDodgeFrames>0);assert.ok(g.a.game.player.counterWindow>0);assert.ok(g.a.game.hitPauseFrames>0);
 const early=setup();early.a.start(early.a.game.mestre,'cross');early.step(5);early.tap(' ');early.step(8);assert.equal(early.a.game.player.perfectDodgeFrames,0);
});
test('a W/S sidestep changes the actual line of defense rather than granting permanent invulnerability',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.down('w');g.tap(' ');g.step(10);g.up('w');assert.ok(g.a.game.player.y<194);assert.equal(g.a.game.player.hp,100);
});
test('player-requested Rush and the Master linear dash respect the round lifecycle',()=>{
 const g=setup();g.a.game.player.specialCharge=100;g.tap('o');assert.equal(g.a.game.mestre.hp,100);g.tap('j');g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.mestre.hp,93);assert.equal(g.a.game.player.special.charges,3);
 const m=setup();m.place(135);m.down('Shift');m.a.game.mestre.specialCharge=100;m.a.request(m.a.game.mestre,m.a.game.player);m.until(()=>m.a.game.player.hp<100);assert.equal(m.a.game.player.hp,72);assert.equal(m.a.game.player.guard,false);
});
test('round transition stops attacks/charge and the match awards no medal for round one',()=>{
 const g=setup();g.a.game.player.specialCharge=100;g.tap('o');g.a.game.player.hp=100;g.a.game.mestre.hp=50;g.a.game.rounds.remaining=1;g.step();assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.attack,null);assert.equal(g.medals.length,0);
});
test('resources cannot be spammed; regeneration happens during active rest, not the interval',()=>{
 const g=setup();g.a.game.player.stamina=0;g.tap('k');assert.equal(g.a.game.player.attack,null);g.step(80);assert.ok(g.a.game.player.stamina>20);
 g.winRound('zorp');g.a.game.player.stamina=4;g.step(50);assert.equal(g.a.game.player.stamina,4);
});
test('AI adaptation between rounds uses observed guard/dodge/distance history only',()=>{
 const g=setup();g.a.game.qaFreezeAi=false;g.down('Shift');g.step(100);g.up('Shift');g.a.game.player.hp=90;g.a.game.mestre.hp=50;g.a.game.rounds.remaining=1;g.step();
 assert.ok(g.a.game.rounds.adaptation.guard>0);g.next();assert.ok(g.a.game.mestre.aiAdaptation.guard>0);
});
test('round clocks and outcomes are consistent at 30, 60 and 144 FPS',()=>{
 const frames=[30,60,144].map(fps=>{const g=setup();g.step(fps*3,fps);return g.a.game.rounds.remaining;});assert.deepEqual(frames,[2220,2220,2220]);
});
test('a feint cannot erase an impact that has already connected',()=>{
 const g=setup();g.a.start(g.a.game.player,'cross');g.step(12);assert.equal(g.a.game.mestre.hp,86);
 assert.equal(g.a.feint(g.a.game.player,g.a.game.mestre),false);assert.equal(g.a.game.player.attack.kind,'cross');
});
test('blocked chip at one HP cannot decide sudden death',()=>{
 const g=setup();g.a.game.rounds.suddenDeath=true;g.a.game.rounds.remaining=0;g.a.game.player.hp=1;
 g.down('Shift');g.a.start(g.a.game.mestre,'jab');g.step(7);assert.equal(g.a.game.player.hp,1);assert.equal(g.a.game.phase,'FIGHTING');assert.equal(g.a.game.rounds.history.length,0);
});
test('briefing and a hidden document freeze the round clock as well as combat',()=>{
 const g=setup();g.env.document.hidden=true;g.step(120);assert.equal(g.a.game.rounds.remaining,2400);
 g.env.document.hidden=false;g.a.game.phase='PRE_GAME';g.step(120);assert.equal(g.a.game.rounds.remaining,2400);
});
test('R after the final result starts a fresh best-of-three with no carried score',()=>{
 const g=setup();g.winRound('master');g.next();g.winRound('master');g.next();g.tap('r');assert.equal(g.a.game.phase,'INTRO');
 assert.equal(g.a.game.rounds.number,1);assert.equal(g.a.game.rounds.wins.master,0);assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.stamina,100);
});
