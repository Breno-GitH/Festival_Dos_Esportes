const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 let clock=0;const results=[],medals=[];
 const env={console,performance:{now:()=>clock},document:{hidden:false},keys:{w:false,a:false,s:false,d:false,space:false},
  currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
  FestivalChallenges:{onBoxingStart(){},onBoxingResult:(...a)=>results.push(a)},desbloquearMedalha:id=>medals.push(id),
  resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent(){},addEventListener(){}};
 env.window=env;vm.createContext(env);
 vm.runInContext(fs.readFileSync(__dirname+'/boxing_arena.js','utf8')+`\nglobalThis.api={game:boxeGame,config:BOXING_CONFIG,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,dodge:boxingStartDodge,constrain:boxingConstrain,sides:boxingRingSides,distance:boxingDistance,separate:boxingSeparateFighters,special:boxingRequestSpecial,release:boxingReleaseInput};`,env);
 const a=env.api;a.reset(true);a.game.qaFreezeAi=true;
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const place=(distance=40,depth=0)=>{a.game.player.x=200;a.game.player.y=210;a.game.mestre.x=200+distance;a.game.mestre.y=210+depth;};
 const masterIntent=expression=>{a.game.qaFreezeAi=false;vm.runInContext('boxingMasterIntent=()=>('+expression+');',env);};
 return {a,env,step,place,masterIntent,results,medals};
}
test('both fighters start at 100 HP and use the existing mat bounds',()=>{
 const {a}=setup();assert.equal(a.game.player.hp,100);assert.equal(a.game.mestre.hp,100);assert.equal(a.config.ring.top,166);
});
test('movement and depth have identical speed at 30, 60 and 144 FPS',()=>{
 const samples=[30,60,144].map(fps=>{const g=setup();g.a.game.mestre.x=390;g.env.keys.d=true;g.env.keys.w=true;g.step(fps/2,fps);return [g.a.game.player.x,g.a.game.player.y];});
 for(const value of samples)for(let i=0;i<2;i++)assert.ok(Math.abs(value[i]-samples[0][i])<1e-8);
});
test('all four rope corners constrain body colliders; overlapping bodies separate even at a wall',()=>{
 const {a}=setup();for(const x of [-999,999])for(const y of [-999,999]){
  Object.assign(a.game.player,{x,y});a.constrain(a.game.player);Object.assign(a.game.mestre,{x:a.game.player.x,y:a.game.player.y});
  a.separate(a.game.player,a.game.mestre);assert.ok(a.distance(a.game.player,a.game.mestre)>29.95);
  for(const f of [a.game.player,a.game.mestre]){const s=a.sides(f.y);assert.ok(f.x>=s.left+14-1e-8&&f.x<=s.right-14+1e-8);assert.ok(f.y>=173&&f.y<=245);}
 }
});
test('light and heavy require real horizontal reach and matching depth',()=>{
 for(const [kind,distance,depth,damage]of [['jab',40,0,6],['jab',53,0,0],['jab',40,12,0],['cross',60,0,14],['cross',64,0,0],['cross',40,13,0]]){
  const g=setup();g.place(distance,depth);g.a.start(g.a.game.player,kind);g.step(20);assert.equal(g.a.game.mestre.hp,100-damage,kind+' '+distance+','+depth);
 }
});
test('walking to another depth line avoids a committed straight punch',()=>{
 const g=setup();g.place();g.a.start(g.a.game.mestre,'cross');g.env.keys.w=true;g.step(13);assert.equal(g.a.game.player.hp,100);
});
test('guard reduces damage, still permits chip and pushback, and breaks under sustained pressure',()=>{
 const g=setup();g.place();g.masterIntent('{x:0,y:0,guard:true,attack:null,dodge:false}');
 g.a.start(g.a.game.player,'jab');g.step(7);assert.equal(g.a.game.mestre.hp,98);assert.ok(g.a.game.mestre.x>240);assert.ok(g.a.game.mestre.guardPressure>0);
 g.step(30);g.place();g.a.game.mestre.guardPressure=80;g.a.start(g.a.game.player,'cross');g.step(13);
 assert.equal(g.a.game.mestre.hp,94);assert.ok(g.a.game.mestre.guardBreakTimer>0);assert.equal(g.a.game.mestre.guard,false);
});
test('well-timed dodge avoids a real hit and opens a counter; an early dodge can be punished',()=>{
 const good=setup();good.place();good.a.start(good.a.game.mestre,'cross');good.step(6);good.a.dodge(good.a.game.player,1,0,good.a.game.mestre);good.step(6);
 assert.equal(good.a.game.player.hp,100);assert.ok(good.a.game.player.counterWindow>0);
 const early=setup();early.place();early.a.start(early.a.game.mestre,'cross');early.a.dodge(early.a.game.player,1,0,early.a.game.mestre);early.step(13);assert.equal(early.a.game.player.hp,86);
});
test('dodge cannot be restarted or spammed while active',()=>{
 const g=setup();g.place();assert.equal(g.a.dodge(g.a.game.player,1,0,g.a.game.mestre),true);g.step(4);
 assert.equal(g.a.dodge(g.a.game.player,1,0,g.a.game.mestre),false);assert.equal(g.a.game.player.dodgeAge,4);
});
test('J J K links only connected lights and finishes a three-hit combo with heavier damage',()=>{
 const g=setup();g.place();const until=hp=>{for(let i=0;i<80&&g.a.game.mestre.hp>hp;i++)g.step();};
 g.a.input.jab=true;until(94);g.a.input.jab=true;until(87);g.a.input.cross=true;until(71);
 assert.equal(g.a.game.mestre.hp,71);assert.equal(g.a.game.player.comboCount,3);assert.ok(g.a.game.player.attack.kind==='cross');
});
test('missed heavy has a longer committed recovery and cannot be canceled into another hit',()=>{
 const g=setup();g.place(100);g.a.start(g.a.game.player,'cross');g.step(38);assert.equal(g.a.game.mestre.hp,100);assert.ok(g.a.game.player.whiffFrames>0);
 assert.equal(g.a.start(g.a.game.player,'jab'),false);g.step(12);assert.equal(g.a.start(g.a.game.player,'jab'),true);
});
test('fighters turn toward each other after changing sides, including during recovery',()=>{
 const g=setup();g.place();g.a.start(g.a.game.player,'cross');g.a.game.player.x=300;g.step();assert.equal(g.a.game.player.facing,-1);assert.equal(g.a.game.mestre.facing,1);
});
test('O has no installed special, produces no attack or damage, and only supplies a future hook',()=>{
 const g=setup();g.place();g.a.input.special=true;g.step(20);assert.equal(g.a.game.mestre.hp,100);assert.equal(g.a.game.player.attack,null);assert.equal(g.env.BoxingSpecials.available('zorp'),false);
});
test('zero HP leads to KO once, no HP recovery, and the existing winner reward',()=>{
 const g=setup();g.place();g.a.game.mestre.hp=6;g.a.start(g.a.game.player,'jab');g.step(6);assert.equal(g.a.game.phase,'KNOCKDOWN');assert.equal(g.a.game.mestre.hp,0);
 g.step(100);assert.equal(g.a.game.phase,'RESULT');assert.equal(g.a.game.mestre.hp,0);assert.equal(g.results.length,1);assert.deepEqual(g.medals,['boxe']);assert.equal(g.a.game.mestre.damageFlash,0);assert.equal(g.a.game.mestre.hitstun,0);
});
test('master KO awards no medal; restarting restores both fighters to 100 HP',()=>{
 const g=setup();g.place();g.a.game.player.hp=6;g.a.start(g.a.game.mestre,'jab');g.step(60);
 assert.equal(g.a.game.phase,'RESULT');assert.equal(g.a.game.winner,'master');assert.equal(g.medals.length,0);
 g.a.input.restart=true;g.step();assert.equal(g.a.game.phase,'FIGHTING');assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.hp,100);
});
test('simultaneous lethal contacts produce a double KO without choosing an arbitrary winner',()=>{
 const g=setup();g.place();g.a.game.player.hp=g.a.game.mestre.hp=6;g.a.start(g.a.game.player,'jab');g.a.start(g.a.game.mestre,'jab');g.step(6);g.step(50);
 assert.equal(g.a.game.winner,'draw');assert.equal(g.a.game.player.hp,0);assert.equal(g.a.game.mestre.hp,0);assert.equal(g.medals.length,0);
});
test('briefing and hidden documents freeze combat; blur releases movement and guard',()=>{
 const g=setup();g.env.keys.d=true;g.a.game.phase='PRE_GAME';g.step(60);assert.equal(g.a.game.fightFrames,0);
 g.a.game.phase='FIGHTING';g.env.document.hidden=true;g.step(60);assert.equal(g.a.game.fightFrames,0);
 g.a.input.guard=true;g.a.release();assert.equal(g.a.input.guard,false);assert.equal(g.env.keys.d,false);
});
