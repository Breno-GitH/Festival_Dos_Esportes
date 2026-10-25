const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{setup}=require('./boxing_rounds_harness.cjs');
function fixture(){const g=setup();vm.runInContext('globalThis.integration={brain:boxingCreateMasterAI,observe:boxingIronObserve,raw:boxingAiObserve,impact:boxingImpact,config:BOXING_CONFIG,roundConfig:BOXING_ROUND_CONFIG};',g.env);return {...g,p:g.a.game.player,m:g.a.game.mestre,i:g.env.integration};}
function knockdown(g,role='zorp'){const t=role==='zorp'?g.m:g.p,f=role==='zorp'?g.p:g.m;t.hp=1;g.a.start(f,'jab');g.until(()=>g.a.game.phase==='KNOCKDOWN');}
test('normal KO enters a real judge count before awarding the round; counts exactly 1 to 10',()=>{
 const g=fixture();knockdown(g);assert.equal(g.a.game.rounds.wins.zorp,0);assert.equal(g.a.game.rounds.history.length,0);const time=g.a.game.rounds.remaining,fight=g.a.game.fightFrames,positions=[g.p.x,g.p.y,g.m.x,g.m.y],counts=[];let last=0,sawStep=false,sawCount=false;
 for(let n=0;n<156;n++){g.step();const k=g.a.game.knockdown;if(k.count!==last){counts.push(k.count);last=k.count;}sawStep||=g.a.game.juiz.animation==='step';sawCount||=g.a.game.juiz.animation==='count';assert.deepEqual([g.p.x,g.p.y,g.m.x,g.m.y],positions);}
 assert.deepEqual(counts,[1,2,3,4,5,6,7,8,9,10]);assert.equal(g.a.game.phase,'ROUND_RESULT');assert.equal(g.a.game.rounds.wins.zorp,1);assert.equal(g.a.game.rounds.remaining,time);assert.equal(g.a.game.fightFrames,fight);assert.ok(sawStep&&sawCount);assert.equal(g.events.filter(k=>k==='countBeat').length,10);assert.equal(g.medals.length,0);
});
test('knockdown blocks attacks, specials, guard/dodge input and AI; no damage continues',()=>{
 const g=fixture();knockdown(g);const hp=[g.p.hp,g.m.hp],stamp=g.a.game.rounds.remaining;
 for(const k of ['j','k','l','Shift',' ','o','w','a'])g.down(k);
 for(const kind of ['jab','cross'])assert.equal(g.a.start(g.p,kind),false);g.p.specialCharge=100;assert.equal(g.a.request(g.p,g.m),false);assert.equal(g.a.dodge(g.p,1,0,g.m),false);assert.equal(g.a.feint(g.p,g.m),false);
 const intent=g.env.boxingMasterIntent();assert.equal(intent.attack,null);assert.equal(intent.dodge,false);
 g.step(100);assert.deepEqual([g.p.hp,g.m.hp],hp);assert.equal(g.p.guard,false);assert.equal(g.p.dodgeFrames,0);assert.equal(g.p.attack,null);assert.equal(g.a.game.rounds.remaining,stamp);
});
test('a KO round cannot be confirmed early or twice',()=>{const g=fixture();knockdown(g);assert.equal(g.a.finish('zorp','KO'),false);g.until(()=>g.a.game.phase==='ROUND_RESULT');assert.equal(g.a.finish('zorp','KO'),false);assert.equal(g.a.game.rounds.wins.zorp,1);assert.equal(g.a.game.rounds.history.length,1);});
test('judge announces either winner and advances the official victory frames while combat stays blocked',()=>{for(const role of ['zorp','master']){const g=fixture();g.winRound(role);g.next();g.winRound(role);g.next();assert.equal(g.a.game.phase,'RESULT');assert.equal(g.a.game.juiz.animation,'victory');const frame=g.a.game.juiz.stateFrame;g.step(20);assert.ok(g.a.game.juiz.stateFrame>frame);assert.equal(g.a.start(g.a.game.player,'jab'),false);assert.equal(g.a.game.rounds.number,2);}});
test('new round resets every combat resource, position and temporary state, while keeping score and learned tendencies',()=>{
 const g=fixture();g.p.specialCharge=90;g.m.specialCharge=100;g.p.specialCooldown=120;g.p.stamina=3;g.p.guardPressure=80;g.winRound('zorp');
 for(const key of ['Shift',' ','j','o','w'])g.down(key);g.next();const p=g.a.game.player,m=g.a.game.mestre;
 assert.deepEqual([p.x,p.y,m.x,m.y],[145,218,302,198]);assert.deepEqual([p.hp,p.stamina,m.hp,m.stamina],[100,100,100,100]);assert.equal(g.a.game.rounds.wins.zorp,1);assert.equal(g.a.game.rounds.number,2);assert.equal(g.a.game.rounds.remaining,2400);
 for(const f of [p,m]){for(const key of ['hitstun','guardBreakTimer','guardPressure','comboCount','dodgeFrames','parryFrames','parryRecovery','parryStun','specialCharge','specialCooldown'])assert.equal(f[key],0,key);for(const key of ['attack','special','feint','slip','counterStance','bufferedAttack','pushMotion'])assert.equal(f[key],null,key);assert.equal(f.rushGhosts.length,0);}
 assert.equal(g.a.game.effects.length,0);assert.equal(g.a.game.impactBursts.length,0);assert.deepEqual([g.a.game.juiz.x,g.a.game.juiz.y],[76,172]);g.step(5);assert.equal(p.guard,false);assert.equal(p.attack,null);assert.equal(p.dodgeFrames,0);
 for(const key of ['Shift',' ','j','o','w'])g.up(key);g.tap(' ');assert.ok(p.dodgeFrames>0);
});
function observed(g,frame,attack,extra={}){const b=g.m.ai||(g.m.ai=g.i.brain(g.m));g.i.observe(b,{frame,x:g.p.x,y:g.p.y,hp:100,guard:false,dodgeFrames:0,hitstun:0,whiffFrames:0,attack,...extra});return b;}
function pose(token,kind,frame,startup=kind==='jab'?6:12,extra={}){return {token,kind,frame,startup,facing:1,originY:210,landed:false,dodged:false,...extra};}
test('J, K, finta and Rush are learned only from delayed visible poses and withdrawal, then inherited by round two',()=>{
 const g=fixture();let b=observed(g,10,pose(1,'jab',1));observed(g,17,pose(1,'jab',8,6,{landed:true}));observed(g,22,pose(2,'cross',1));observed(g,34,pose(2,'cross',13,12,{landed:true}));
 observed(g,40,pose(3,'cross',2));assert.equal(b.observedBehavior.feint,0);observed(g,46,null);observed(g,54,pose(4,'jab',4,5,{rush:true}));
 assert.deepEqual([b.observedBehavior.attacks,b.observedBehavior.jab,b.observedBehavior.cross,b.observedBehavior.feint,b.observedBehavior.rush],[4,2,1,1,1]);
 b.observedBehavior.samples=10;b.observedBehavior.guard=4;b.observedBehavior.dodge=3;b.observedBehavior.distant=2;g.a.finish('zorp','TEMPO');g.next();const learned=g.a.game.mestre.aiAdaptation;
 for(const k of ['jab','cross','feint','rush','guard','dodge','distant'])assert.ok(learned[k]>0&&learned[k]<1,k);assert.equal(learned.jab,.325);assert.equal(learned.feint,.1625);
 g.a.game.qaFreezeAi=false;g.step(20);assert.equal(g.a.game.mestre.ai.adaptation.rush,.1625);
});
test('hit-confirm transition to another visible attack is not mistaken for a feint',()=>{const g=fixture();observed(g,10,pose(1,'cross',2));const b=observed(g,18,pose(2,'jab',1));assert.equal(b.observedBehavior.feint,0);assert.equal(b.observedBehavior.cross,1);});
test('interrupted or fully completed punches are not secretly classified as feints',()=>{
 const interrupted=fixture();observed(interrupted,10,pose(1,'cross',2));const b=observed(interrupted,16,null,{hitstun:8});assert.equal(b.observedBehavior.feint,0);
 const complete=fixture();observed(complete,10,pose(1,'cross',15));const c=observed(complete,18,null);assert.equal(c.observedBehavior.feint,0);
});
test('Rush is not revealed to perception before the visible drive pose',()=>{
 const g=fixture();g.p.specialCharge=100;g.a.request(g.p,g.m);g.a.start(g.p,'jab');const b=g.i.brain(g.m);g.i.raw(b,g.p,1);assert.equal(b.history.at(-1).attack.rush,false);g.p.attack.frame=3;g.i.raw(b,g.p,4);assert.equal(b.history.at(-1).attack.rush,true);
});
test('round one has neutral prior memory; round three keeps the same movement and damage attributes',()=>{
 const g=fixture();for(const n of Object.values(g.a.game.rounds.adaptation))assert.equal(n,0);const a=g.i.config.attacks.cross.damage,speed=g.i.config.movement.playerX;g.winRound('zorp');g.next();g.winRound('master');g.next();assert.equal(g.a.game.rounds.number,3);assert.deepEqual(JSON.parse(JSON.stringify(g.a.game.rounds.wins)),{zorp:1,master:1});assert.equal(g.i.config.attacks.cross.damage,a);assert.equal(g.i.config.movement.playerX,speed);assert.ok(g.events.includes('decider'));
});
test('duplicate keydown without release does not restart attack or consume Rush charges',()=>{
 const g=fixture();g.p.specialCharge=100;g.tap('o');g.down('j');g.step();g.until(()=>!g.p.attack);const spent=g.p.special.spent,hp=g.m.hp;g.down('j');g.down('j',true);g.step(5);assert.equal(g.p.special.spent,spent);assert.equal(g.m.hp,hp);assert.equal(g.p.attack,null);g.up('j');g.down('j');g.step();assert.equal(g.p.special.spent,spent+1);
});
test('holding Space never retriggers after cooldown; a new keydown after release does',()=>{const g=fixture();g.down(' ');g.step(70);g.down(' ',true);g.step();assert.equal(g.p.dodgeFrames,0);g.up(' ');g.down(' ');g.step();assert.ok(g.p.dodgeFrames>0);});
test('focus reset drops guard/movement and ignores orphaned repeats',()=>{const g=fixture();g.down('Shift');g.down('w');g.step();g.env.BoxingInput.clearPhysical();g.a.release();g.down('Shift',true);g.down('w',true);g.step(7);assert.equal(g.p.guard,false);assert.equal(g.env.keys.w,false);assert.equal(g.p.parryFrames,0);});
test('camera tiers keep J almost still, K small, counter medium and specials short/strong',()=>{
 const g=fixture(),levels={};for(const kind of ['jab','cross','counter','special']){g.a.game.cameraShake=0;g.i.impact(200,160,12,'#fff',kind);levels[kind]=g.a.game.cameraShake;}
 assert.ok(levels.jab<.2);assert.ok(levels.cross>levels.jab&&levels.cross<1);assert.ok(levels.counter>levels.cross);assert.ok(levels.special>levels.counter&&levels.special<=2);
});
test('hitstop hierarchy remains one step for J, two for K, three for counter and four for Meteor/Titan',()=>{
 for(const [kind,pause]of [['jab',1],['cross',2]]){const g=fixture();g.a.start(g.p,kind);g.until(()=>g.m.hp<100);assert.equal(g.a.game.hitPauseFrames,pause);}
 const counter=fixture();counter.a.start(counter.m,'cross');counter.a.start(counter.p,'jab');counter.until(()=>counter.m.hp<100);assert.equal(counter.a.game.hitPauseFrames,3);
 const meteor=fixture();meteor.p.specialCharge=100;meteor.a.request(meteor.p,meteor.m);meteor.p.special.charges=1;meteor.a.start(meteor.p,'cross');meteor.until(()=>meteor.m.hp<100);assert.equal(meteor.a.game.hitPauseFrames,4);
 const titan=fixture();titan.place(135);titan.m.specialCharge=100;titan.a.request(titan.m,titan.p);titan.until(()=>titan.p.hp<100);assert.equal(titan.a.game.hitPauseFrames,4);
});
test('shared presentation reacts to decisive events more strongly than an ordinary jab',()=>{
 const g=fixture();vm.runInContext(fs.readFileSync(__dirname+'/boxing_presentation.js','utf8'),g.env);const energy=k=>vm.runInContext(`resetBoxingPresentation();boxingShowEvent('${k}',boxeGame.player);boxingShow.energy`,g.env),jab=energy('jab');
 for(const kind of ['comboFour','perfectDodge','counter','crushing','guardBreak','overdrive','titanStart','knockdown','decider','victory'])assert.ok(energy(kind)>jab*3,kind);
});
test('official judge asset and all lifecycle poses exist, using the curated manifest',()=>{
 const root=process.env.BOXING_PROJECT||__dirname,j=JSON.parse(fs.readFileSync(path.join(root,'boxe_assets/v3/boxing_v3_manifest.json'),'utf8')).actors.judge;
 assert.equal(j.source,'juiz_boxe3.0.png');for(const action of ['idle','step','start','count_start','count','continue','ko','victory'])assert.ok(j.actions[action].length>0,action);assert.equal(j.frameCount,24);
});
for(const fps of [30,60,144])test('KO count resolves once and freezes the combat clock at '+fps+' FPS',()=>{const g=fixture();knockdown(g);const time=g.a.game.rounds.remaining;g.step(fps*3,fps);assert.equal(g.a.game.phase,'ROUND_RESULT');assert.equal(g.a.game.knockdown.count,10);assert.equal(g.a.game.rounds.wins.zorp,1);assert.equal(g.a.game.rounds.remaining,time);});
