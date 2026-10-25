const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(load=true){
 let clock=0;const images=[],events=[],medals=[];
 class Image{set src(v){this._src=v;images.push(this);this.width=this.naturalWidth=1254;this.height=1254;if(load)this.onload?.();}get src(){return this._src;}}
 const env={console,Image,performance:{now:()=>clock},document:{hidden:false,createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},imageSmoothingEnabled:true})})},
  keys:{w:false,a:false,s:false,d:false,space:false},currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
  FestivalChallenges:{onBoxingStart(){},onBoxingResult(){}},desbloquearMedalha:id=>medals.push(id),
  resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent:kind=>events.push(kind),addEventListener(){}};
 env.window=env;vm.createContext(env);
 for(const name of ['boxing_controls.js','boxing_resources.js','boxing_rounds.js','boxing_arena.js','boxing_zorp_special_atlas.js','boxing_zorp_special.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),env);
 vm.runInContext('globalThis.api={game:boxeGame,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,request:boxingRequestSpecial,atlas:BOXING_ZORP_SPECIAL_ATLAS};',env);
 const a=env.api;a.reset(true);a.game.qaFreezeAi=true;
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const until=predicate=>{for(let i=0;i<600&&!predicate();i++)step();assert.ok(predicate(),'condition not reached');};
 const place=(distance=40,depth=0)=>{a.game.player.x=200;a.game.player.y=210;a.game.mestre.x=200+distance;a.game.mestre.y=210+depth;};place();
 const activate=()=>{a.game.player.specialCharge=100;a.input.special=true;step();};
 return {a,env,events,medals,images,step,until,place,activate};
}
test('official sheet loads once; seven curated masks retain uniform scale and feet anchors',()=>{
 const g=setup();assert.equal(g.images.length,1);assert.ok(g.images[0].src.startsWith('zorp_boxe3.0_especial.png?v=2.0_'));
 assert.equal(g.env.BoxingZorpSpecial.snapshot().frames,7);
 for(const f of Object.values(g.a.atlas.frames)){assert.equal(f.scale,.52);const[x,y,w,h]=f.sourceRect;for(const[sx,sy,sw,sh]of f.strips)assert.ok(sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h);}
});
test('O requires a ready sheet and full meter, consumes it once and grants four charges',()=>{
 const g=setup();g.a.input.special=true;g.step();assert.equal(g.a.game.player.special,null);g.activate();const p=g.a.game.player;
 assert.equal(p.special.mode,'RUSH_OVERDRIVE');assert.equal(p.special.remaining,360);assert.equal(p.special.charges,4);assert.equal(p.specialCharge,0);
 g.a.input.special=true;g.step(5);assert.equal(p.special.charges,4);assert.equal(p.specialCharge,0);assert.equal(p.attack,null);
 const h=setup(false);h.activate();assert.equal(h.a.game.player.special,null);assert.equal(h.a.game.player.specialCharge,100);
});
test('activation alone never moves Zorp, attacks, evades, targets the opponent or runs a six-hit script',()=>{
 const g=setup();g.activate();g.step(300);const p=g.a.game.player;assert.equal(p.x,200);assert.equal(p.y,210);assert.equal(p.attack,null);assert.equal(p.special.hits,0);assert.equal(p.special.spent,0);assert.equal(p.special.charges,4);assert.equal(g.a.game.mestre.hp,100);
});
test('Overdrive expires after six real simulation seconds even through contact hitstop',()=>{
 const g=setup();g.activate();g.a.game.hitPauseFrames=3;g.step(359);assert.equal(g.a.game.player.special.remaining,1);g.step();assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.lastSpecial.reason,'TIMEOUT');assert.equal(g.a.game.mestre.hp,100);
});
for(const[kind,type,damage,distance]of [['jab','RUSH_JAB',7,60],['cross','RUSH_STRAIGHT',16,90]])test(kind+' requests one '+type+' with physical advance and one spent charge',()=>{
 const g=setup();g.place(distance);g.activate();g.a.input[kind]=true;g.step();const p=g.a.game.player,a=p.attack,x=p.x;
 assert.equal(a.rush.type,type);assert.equal(p.special.charges,3);assert.equal(g.a.game.mestre.hp,100);g.until(()=>g.a.game.mestre.hp<100);
 assert.equal(g.a.game.mestre.hp,100-damage);assert.ok(p.x>x+10);const hp=g.a.game.mestre.hp;g.step(25);assert.equal(g.a.game.mestre.hp,hp);assert.equal(p.special.spent,1);assert.equal(p.special.hits,1);
});
function rushString(sequence){const g=setup();g.activate();for(const kind of sequence){const hp=g.a.game.mestre.hp;g.a.input[kind]=true;g.until(()=>g.a.game.mestre.hp<hp);}return g;}
for(const sequence of [['jab','jab','jab','cross'],['cross','jab','cross','cross'],['cross','cross','cross','cross'],['jab','cross','jab','jab']])test(sequence.join(' → ')+' is player-controlled and each link spends exactly one charge',()=>{
 const g=rushString(sequence),p=g.a.game.player;assert.equal(p.special,null);assert.equal(p.lastSpecial.spent,4);assert.equal(p.lastSpecial.hits,4);assert.equal(p.comboCount,4);assert.equal(p.lastSpecial.history.length,4);
 assert.equal(p.lastSpecial.reason,sequence.at(-1)==='cross'?'METEOR':'CHARGES_SPENT');assert.ok(p.lastSpecial.history.every(h=>h.outcome==='HIT'));
});
test('normal J J can activate Overdrive on a hit-confirm and link Rush J Rush J Rush K',()=>{
 const g=setup();for(const kind of ['jab','jab']){const hp=g.a.game.mestre.hp;g.a.input[kind]=true;g.until(()=>g.a.game.mestre.hp<hp);}
 const original=g.a.game.player.attack;g.a.game.player.specialCharge=100;g.a.input.special=true;g.a.input.jab=true;g.until(()=>!!g.a.game.player.special);assert.equal(g.a.game.player.special.mode,'RUSH_OVERDRIVE');assert.ok(g.a.game.player.attack===original||g.a.game.player.attack.rush);
 g.until(()=>g.a.game.player.comboCount===3);for(const kind of ['jab','cross']){const hp=g.a.game.mestre.hp;g.a.input[kind]=true;g.until(()=>g.a.game.mestre.hp<hp);}
 assert.equal(g.a.game.player.comboCount,5);assert.equal(g.a.game.player.special.charges,1);assert.equal(g.a.game.player.attack.finisher,true);
});
test('Rush obeys the five-hit separation cap rather than enabling an infinite combo',()=>{
 const g=setup();g.a.input.jab=true;g.until(()=>g.a.game.mestre.hp<100);g.a.game.player.specialCharge=100;g.a.input.special=true;g.step();
 for(const kind of ['jab','jab','jab','cross']){const hp=g.a.game.mestre.hp;g.a.input[kind]=true;g.until(()=>g.a.game.mestre.hp<hp);}
 assert.equal(g.a.game.player.comboCount,5);assert.equal(g.a.game.player.attack.finisher,true);assert.equal(g.a.start(g.a.game.player,'jab',true),false);g.step(12);assert.ok(Math.abs(g.a.game.mestre.x-g.a.game.player.x)>=70);
});
test('the last K is Meteor Straight: ends Overdrive, commits a powerful physical finisher and separates',()=>{
 const g=rushString(['jab','jab','jab','cross']),p=g.a.game.player,m=g.a.game.mestre;
 assert.equal(p.attack.rush.type,'METEOR_STRAIGHT');assert.equal(p.attack.finisher,true);assert.equal(p.special,null);assert.equal(p.lastSpecial.reason,'METEOR');assert.equal(p.attack.profile.lunge,72);assert.equal(p.attack.profile.push,42);const x=m.x;g.step(9);assert.ok(m.x>x+25);assert.equal(g.a.start(p,'jab',true),false);
});
test('last J spends the charge without inventing Meteor or another automatic hit',()=>{const g=rushString(['jab','jab','jab','jab']);assert.equal(g.a.game.player.attack.rush.type,'RUSH_JAB');assert.equal(g.a.game.player.lastSpecial.reason,'CHARGES_SPENT');const hp=g.a.game.mestre.hp;g.step(30);assert.equal(g.a.game.mestre.hp,hp);});
test('a Rush whiff consumes its charge, cannot hit-confirm cancel and leaves full recovery',()=>{
 const g=setup();g.place(180);g.activate();g.a.input.cross=true;g.step();const p=g.a.game.player,a=p.attack;g.step(13);g.a.input.jab=true;g.step(8);assert.equal(p.attack,a);assert.equal(p.special.charges,3);assert.equal(g.a.game.mestre.hp,100);g.until(()=>p.whiffFrames>0);assert.equal(p.whiffFrames,16);assert.equal(g.a.start(p,'jab'),false);assert.equal(p.special.history[0].outcome,'WHIFF');
});
test('a committed Rush never follows a target off the depth line or turns after crossing sides',()=>{
 const g=setup();g.place(65);g.activate();g.a.input.cross=true;g.step();const p=g.a.game.player,a=p.attack;g.a.game.mestre.y+=24;g.step(4);g.a.game.mestre.x=150;g.step(10);
 assert.equal(a.originY,210);assert.equal(a.facing,1);assert.equal(p.facing,1);assert.equal(p.y,210);assert.equal(g.a.game.mestre.hp,100);assert.equal(p.attack,a);
});
test('Rush forward motion stops at real bodies and cannot push a defender during startup',()=>{const g=setup();g.place(33);g.activate();g.a.input.cross=true;g.step();const x=g.a.game.mestre.x;g.step(7);assert.equal(g.a.game.mestre.x,x);assert.ok(g.a.game.mestre.x-g.a.game.player.x>=29.9);assert.equal(g.a.game.mestre.hp,100);});
test('Meteor can miss and be physically punished during its long whiff recovery',()=>{
 const g=setup();g.place(180,25);g.activate();for(let i=0;i<3;i++){g.a.input.jab=true;g.step();g.until(()=>!g.a.game.player.attack&&!g.a.game.player.whiffFrames);}
 g.a.input.cross=true;g.step();const p=g.a.game.player,m=g.a.game.mestre;assert.equal(p.attack.rush.type,'METEOR_STRAIGHT');assert.equal(p.special,null);g.until(()=>p.attack.frame>=p.attack.startup+5);
 const x=p.x;m.x=x+40;m.y=p.y;g.a.start(m,'jab');g.until(()=>p.hp<100);assert.equal(m.attack.counterSource,'WHIFF_RECOVERY');assert.equal(p.hp,90);assert.equal(p.lastSpecial.history[3].outcome,'INTERRUPTED');
});
test('Overdrive grants no invulnerability and a real hit only interrupts the requested punch',()=>{
 const g=setup();g.activate();g.a.start(g.a.game.mestre,'jab');g.until(()=>g.a.game.player.hp<100);const p=g.a.game.player;assert.equal(p.hp,92);assert.equal(p.special.charges,4);assert.equal(p.attack,null);assert.equal(p.dodgeFrames,0);
});
test('guard, Space, finta, neutral stamina and Perfect Dodge remain usable during Overdrive',()=>{
 const guard=setup();guard.activate();guard.a.input.guard=true;guard.step();assert.equal(guard.a.game.player.guard,true);
 const dodge=setup();dodge.activate();dodge.a.input.dodge=true;dodge.step(5);assert.ok(dodge.a.game.player.dodgeFrames>0);assert.ok(dodge.a.game.player.y!==210);
 const fake=setup();fake.activate();fake.a.input.feint=true;fake.step();assert.ok(fake.a.game.player.feint);assert.equal(fake.a.game.player.special.charges,4);
 const rest=setup();rest.activate();rest.a.game.player.stamina=40;rest.step(30);assert.ok(rest.a.game.player.stamina>50);
});
test('Overdrive HUD keeps guard, dodge, Perfect Dodge and counter feedback readable',()=>{
 const g=setup();vm.runInContext(fs.readFileSync(__dirname+'/boxing_presentation.js','utf8'),g.env);g.activate();const p=g.a.game.player;
 const state=()=>vm.runInContext('boxingVisualState(boxeGame.player)',g.env).label;
 assert.ok(state().includes('RUSH OVERDRIVE'));p.guard=true;assert.equal(state(),'DEFENDENDO');p.guard=false;
 p.dodgeFrames=18;assert.equal(state(),'ESQUIVA');p.perfectDodgeFrames=26;assert.equal(state(),'PERFECT DODGE');p.perfectDodgeFrames=0;p.dodgeFrames=0;
 p.counterWindow=20;assert.equal(state(),'CONTRA-ATAQUE');p.hitstun=5;assert.equal(state(),'STUN');
});
test('Perfect Dodge into a requested Rush K preserves its physical counter then permits Rush links',()=>{
 const g=setup(),p=g.a.game.player,m=g.a.game.mestre;g.activate();g.a.start(m,'cross');g.step(m.attack.startup-4);
 vm.runInContext('boxingStartDodge(boxeGame.player,1,0,boxeGame.mestre)',g.env);g.until(()=>p.perfectDodgeFrames>0);assert.equal(p.hp,100);g.a.input.cross=true;g.until(()=>m.hp<100);assert.equal(p.attack.rush.type,'RUSH_STRAIGHT');assert.equal(p.attack.counterSource,'DODGE');assert.equal(m.hp,81);
 g.a.input.jab=true;g.until(()=>p.comboCount===2);assert.equal(p.attack.rush.type,'RUSH_JAB');assert.equal(p.special.charges,2);
});
test('early Rush K may be feinted, but its charge is not refunded',()=>{const g=setup();g.activate();g.a.input.cross=true;g.step();g.a.input.feint=true;g.step();assert.ok(g.a.game.player.feint);assert.equal(g.a.game.player.special.charges,3);assert.equal(g.a.game.player.special.history[0].outcome,'FEINT');assert.equal(g.a.game.mestre.hp,100);});
test('insufficient stamina, stale input, repeated O and failed cancel never spend charges',()=>{const g=setup();g.activate();g.a.game.player.stamina=0;g.a.input.cross=true;g.step();assert.equal(g.a.game.player.attack,null);assert.equal(g.a.game.player.special.charges,4);g.a.input.special=true;g.step();assert.equal(g.a.game.player.special.charges,4);});
test('Overdrive cannot cancel a normal miss or startup to escape its commitment',()=>{const g=setup();g.place(150);g.a.start(g.a.game.player,'cross');g.a.game.player.specialCharge=100;g.a.input.special=true;g.step();assert.equal(g.a.game.player.special,null);g.step(12);g.a.input.special=true;g.step();assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.specialCharge,100);});
test('Rush damage does not refill its own meter; ordinary exchanges still do',()=>{const g=setup();g.activate();g.a.input.jab=true;g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.player.specialCharge,0);const h=setup();h.a.input.jab=true;h.until(()=>h.a.game.mestre.hp<100);assert.ok(h.a.game.player.specialCharge>=8);});
test('re-entry needs a full meter and respects cooldown even after artificial refilling',()=>{const g=setup();g.activate();g.env.BoxingZorpSpecial.stop(g.a.game.player);g.a.game.player.specialCharge=100;assert.equal(g.a.request(g.a.game.player,g.a.game.mestre),false);assert.equal(g.a.game.player.specialCharge,100);});
test('timeout does not erase an already committed physical Rush in flight',()=>{const g=setup();g.activate();g.a.game.player.special.remaining=1;g.a.input.jab=true;g.step();assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.attack.rush,undefined);const h=setup();h.activate();h.a.input.jab=true;h.step();h.a.game.player.special.remaining=1;h.step();assert.equal(h.a.game.player.special,null);assert.ok(h.a.game.player.attack.rush);h.until(()=>h.a.game.mestre.hp<100);assert.equal(h.a.game.mestre.hp,93);});
test('afterimages use real successive poses, constant canvas/scale, fixed feet and at most three ghosts',()=>{const g=setup();g.place(90);g.activate();g.a.input.cross=true;g.step();const p=g.a.game.player,names=new Set(),sizes=new Set();for(let i=0;i<13;i++){const visual=g.env.BoxingZorpSpecial.visual(p);assert.ok(visual);names.add(visual.boxingFrameId);sizes.add([visual.width,visual.height,visual.boxingAnchorX,visual.boxingFootY].join());g.step();assert.ok(p.rushGhosts.length<=3);}assert.ok(names.size>=3);assert.equal(sizes.size,1);});
test('the real actor renderer draws every Rush phase without indexing a single normalized canvas as an animation sheet',()=>{
 const g=setup();vm.runInContext(`globalThis.draws=[];const BOXING_SPRITES={zorp:{}},BOXING_FRAME_DURATIONS={},BOXING_FRAME_CANVAS={width:320,height:224},boxingShow={recoil:{}};
 globalThis.ctx=new Proxy({drawImage:(...args)=>draws.push(args)}, {get:(o,k)=>o[k]||(()=>{})});function drawBoxingPunchTrace(){}function drawBoxingFighterState(){}`,g.env);
 g.activate();g.a.input.cross=true;g.step();const p=g.a.game.player;
 for(let age=0;age<30;age++){vm.runInContext('drawBoxingActor(boxeGame.player)',g.env);g.step();}
 assert.ok(g.env.draws.length>=30);assert.ok(g.env.draws.every(call=>call[0]&&Number.isFinite(call[3])&&call[3]>0));
});
test('left-facing Rush commits left and the last Meteor remains equally physical',()=>{const g=setup();g.a.game.player.x=280;g.a.game.mestre.x=240;g.activate();g.a.input.cross=true;g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.player.attack.facing,-1);assert.ok(g.a.game.player.x<280);assert.equal(g.a.game.mestre.hp,84);});
test('round end clears Overdrive, any attack and all ghosts without awarding a medal',()=>{const g=setup();g.activate();g.a.input.jab=true;g.step(3);g.a.game.player.hp=100;g.a.game.mestre.hp=50;g.a.game.rounds.remaining=1;g.step();assert.equal(g.a.game.phase,'ROUND_RESULT');assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.attack,null);assert.equal(g.a.game.player.rushGhosts.length,0);assert.deepEqual(g.medals,[]);});
test('briefing, hidden document and interval freeze Overdrive clock and charges',()=>{for(const mode of ['PRE_GAME','ROUND_RESULT','hidden']){const g=setup();g.activate();if(mode==='hidden')g.env.document.hidden=true;else {g.a.game.phase=mode;g.a.game.rounds.transition=300;}g.step(120);assert.equal(g.a.game.player.special.remaining,360);assert.equal(g.a.game.player.special.charges,4);}});
for(const fps of [30,60,144])test('Rushes and six-second timeout remain consistent at '+fps+' FPS',()=>{const g=setup();g.activate();g.a.input.cross=true;g.step(Math.round(fps*.5),fps);assert.equal(g.a.game.mestre.hp,84);assert.equal(g.a.game.player.special.charges,3);g.step(Math.round(fps*5.5),fps);assert.equal(g.a.game.player.special,null);assert.equal(g.a.game.player.lastSpecial.reason,'TIMEOUT');});
