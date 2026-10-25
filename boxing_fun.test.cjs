const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 let clock=0;const events=[];
 const env={console,performance:{now:()=>clock},document:{hidden:false},keys:{w:false,a:false,s:false,d:false,space:false},
  currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
  FestivalChallenges:{onBoxingStart(){},onBoxingResult(){}},desbloquearMedalha(){},
  resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent:kind=>events.push(kind),addEventListener(){}};
 env.window=env;vm.createContext(env);
 vm.runInContext(['boxing_controls.js','boxing_resources.js','boxing_rounds.js','boxing_arena.js'].map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n')+`\nglobalThis.api={game:boxeGame,config:BOXING_CONFIG,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,dodge:boxingStartDodge,pressure:boxingApplyGuardPressure};`,env);
 const a=env.api;a.reset(true);a.game.qaFreezeAi=true;
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const until=predicate=>{for(let i=0;i<200&&!predicate();i++)step();assert.ok(predicate(),'condition did not occur');};
 const place=()=>{a.game.player.x=200;a.game.player.y=210;a.game.mestre.x=240;a.game.mestre.y=210;};place();
 const guardMaster=()=>{a.game.qaFreezeAi=false;vm.runInContext('boxingMasterIntent=()=>({x:0,y:0,guard:true,attack:null,dodge:false});',env);};
 return {a,env,events,step,until,place,guardMaster};
}
for(const [pattern,total]of [[['jab','jab','cross'],25],[['jab','cross'],20],[['jab','jab','jab'],18]]){
 test(pattern.join(' → ')+' is a real connected combo with exactly one contact per punch',()=>{
  const g=setup();let previous=100;
  for(let i=0;i<pattern.length;i++){
   g.a.input[pattern[i]]=true;g.until(()=>g.a.game.mestre.hp<previous);
   previous=g.a.game.mestre.hp;assert.equal(g.a.game.player.comboCount,i+1);
  }
  assert.equal(previous,100-total);assert.equal(g.events.filter(e=>['jab','cross'].includes(e)).length,pattern.length);
 });
}
test('a late follow-up cannot keep a combo after the defender has left hitstun',()=>{
 const g=setup();g.a.start(g.a.game.player,'jab');g.until(()=>g.a.game.mestre.hp===94);g.until(()=>g.a.game.mestre.hitstun===0);
 assert.equal(g.a.start(g.a.game.player,'jab',true),false);g.until(()=>!g.a.game.player.attack);g.a.input.jab=true;g.until(()=>g.a.game.mestre.hp<94);
 assert.equal(g.a.game.player.comboCount,1);assert.equal(g.a.game.mestre.hp,88);
});
test('a sixth light cannot cancel the fifth finisher into an infinite combo',()=>{
 const g=setup();for(let i=0;i<5;i++){const hp=g.a.game.mestre.hp;g.a.input.jab=true;g.until(()=>g.a.game.mestre.hp<hp);}
 g.a.input.jab=true;g.step(8);assert.equal(g.a.game.player.comboCount,5);assert.equal(g.a.game.player.attack.stage,5);assert.equal(g.a.game.mestre.hp,72);
});
test('a blocked punch does not authorize a hit-confirm cancel',()=>{
 const g=setup();g.guardMaster();g.a.start(g.a.game.player,'jab');g.until(()=>g.a.game.mestre.hp===98);g.a.input.cross=true;g.step(6);
 assert.equal(g.a.game.player.attack.kind,'jab');assert.equal(g.a.game.player.comboCount,0);
});
test('holding guard alone breaks it after about six seconds, then a short stun recovers',()=>{
 const g=setup();g.a.input.guard=true;g.until(()=>g.a.game.player.guardPressure>50);
 // The helper is intentionally bounded; finish in two windows.
 g.until(()=>g.a.game.player.guardBreakTimer>0);
 assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.player.guard,false);assert.equal(g.a.game.player.guardBreakTimer,30);
 assert.ok(g.a.game.player.guardPressure>0&&g.a.game.player.guardPressure<100);assert.ok(g.events.includes('guardBreak'));
 g.a.input.guard=false;g.step(40);assert.equal(g.a.game.player.guardBreakTimer,0);
});
test('several blocks build pressure; releasing guard recovers gradually rather than resetting it',()=>{
 const g=setup();g.guardMaster();g.a.start(g.a.game.player,'cross');g.until(()=>g.a.game.mestre.hp===96);
 const pressure=g.a.game.mestre.guardPressure;assert.ok(pressure>=34);
 g.a.game.mestre.guard=false;g.a.game.qaFreezeAi=true;g.step(5);assert.ok(g.a.game.mestre.guardPressure>0);assert.ok(g.a.game.mestre.guardPressure<pressure);
});
test('future blocked specials add much more guard pressure but install no special attack',()=>{
 const g=setup();g.a.game.player.guard=true;g.a.game.player.guardPressure=30;
 assert.equal(g.env.BoxingSpecials.onBlocked(g.a.game.player),true);assert.equal(g.a.game.player.guardBreakTimer,30);
 assert.equal(g.a.game.player.hp,100);assert.equal(g.env.BoxingSpecials.available('zorp'),false);
 assert.equal(g.env.BoxingSpecials.onBlocked(g.a.game.juiz),false);
});
test('correct dodge permits an early counter, with bonus damage and a short extra hitstun',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(g.a.game.mestre.attack.startup-6);g.a.dodge(g.a.game.player,1,0,g.a.game.mestre);
 g.until(()=>g.a.game.player.counterWindow>0);g.a.input.jab=true;g.until(()=>g.a.game.player.attack?.counter===true);
 assert.ok(g.a.game.player.dodgeAge<18);g.until(()=>g.a.game.mestre.hp<100);
 assert.equal(g.a.game.player.hp,100);assert.equal(g.a.game.mestre.hp,91);assert.equal(g.a.game.mestre.hitstun,16);assert.ok(g.events.includes('counter'));assert.ok(g.a.game.effects.every(effect=>effect.text!=='ESQUIVA!'));
});
test('a timed sidestep out of the punch line opens a counter, even without overlap at the final position',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(g.a.game.mestre.attack.startup-6);g.a.dodge(g.a.game.player,0,-1,g.a.game.mestre);g.step(6);
 assert.ok(Math.abs(g.a.game.player.y-g.a.game.mestre.y)>12);assert.equal(g.a.game.player.hp,100);assert.ok(g.a.game.player.counterWindow>0);
});
test('dodging outside the threatened range awards no free counter',()=>{
 const g=setup();g.a.game.mestre.x=330;g.a.start(g.a.game.mestre,'cross');g.step(g.a.game.mestre.attack.startup-6);g.a.dodge(g.a.game.player,0,-1,g.a.game.mestre);g.step(6);
 assert.equal(g.a.game.player.counterWindow,0);
});
test('waiting out the counter window removes the damage bonus',()=>{
 const g=setup();g.a.start(g.a.game.mestre,'cross');g.step(g.a.game.mestre.attack.startup-6);g.a.dodge(g.a.game.player,1,0,g.a.game.mestre);g.until(()=>g.a.game.player.counterWindow>0);g.step(65);g.place();
 g.a.start(g.a.game.player,'jab');assert.equal(g.a.game.player.attack.counter,false);g.until(()=>g.a.game.mestre.hp<100);assert.equal(g.a.game.mestre.hp,94);
});
test('hit pause freezes both fighters for only 1–3 steps and preserves a newly buffered punch',()=>{
 const g=setup();g.a.start(g.a.game.player,'jab');g.until(()=>g.a.game.mestre.hp===94);
 const frames=g.a.game.fightFrames,attack=g.a.game.player.attack.frame,stun=g.a.game.mestre.hitstun;
 g.a.input.jab=true;g.env.keys.d=true;g.step();assert.equal(g.a.game.fightFrames,frames);assert.equal(g.a.game.player.attack.frame,attack);assert.equal(g.a.game.mestre.hitstun,stun);assert.equal(g.a.input.jab,true);
 g.step();assert.ok(g.a.game.fightFrames>frames);assert.equal(g.a.input.jab,false);assert.ok(g.a.game.player.bufferedAttack);
});
test('a missed punch produces no contact pause or impact event',()=>{
 const g=setup();g.a.game.mestre.x=320;g.a.start(g.a.game.player,'cross');g.step(30);
 assert.equal(g.a.game.hitPauseFrames,0);assert.equal(g.events.length,0);assert.equal(g.a.game.mestre.hp,100);
});
test('guard strain and real-time contact pause stay equivalent at 30, 60 and 144 FPS',()=>{
 const samples=[30,60,144].map(fps=>{const g=setup();g.a.input.guard=true;g.step(fps*6,fps);return [g.a.game.player.guardBreakTimer,g.a.game.hitPauseFrames,g.a.game.player.guardPressure];});
 for(const value of samples)for(let i=0;i<3;i++)assert.ok(Math.abs(value[i]-samples[0][i])<1e-8);
});
