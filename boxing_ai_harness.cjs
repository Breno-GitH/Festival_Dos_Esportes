const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(seed=1){
 const root=process.env.BOXING_PROJECT||__dirname;let clock=0,state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const math=Object.create(Math);math.random=random;
 class Image{set src(v){this._src=v;this.onload?.();}get src(){return this._src;}}
 const env={console,Math:math,Image,performance:{now:()=>clock},document:{hidden:false,createElement:()=>({getContext:()=>({drawImage(){}})})},keys:{},currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
 FestivalChallenges:{onBoxingStart(){},onBoxingResult(){}},desbloquearMedalha(){},resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent(){},addEventListener(){}};
 env.window=env;vm.createContext(env);
 for(const name of ['boxing_controls.js','boxing_resources.js','boxing_rounds.js','boxing_arena.js','boxing_zorp_special_atlas.js','boxing_zorp_special.js','boxing_master_special_atlas.js','boxing_master_special.js']){
  const file=fs.existsSync(path.join(__dirname,name))?path.join(__dirname,name):path.join(root,name);vm.runInContext(fs.readFileSync(file,'utf8'),env);
 }
 vm.runInContext('globalThis.api={game:boxeGame,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,intent:boxingMasterIntent,request:boxingRequestSpecial,canHit:boxingAttackCanHit,plan:boxingAiPlan,makeBrain:boxingCreateMasterAI,mode:boxingAiSetMode};',env);
 const a=env.api;a.reset(true);
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const place=(d=45,dy=0)=>{a.game.player.x=180;a.game.player.y=210;a.game.mestre.x=180+d;a.game.mestre.y=210+dy;};place();
 return {a,env,step,place,random};
}
function simulate(seed,policy,maxSeconds=180){
 const g=setup(seed),{a,env,step}=g;g.place(90,5);let attackAt=0,decisionAt=0,view=null,playerHistory=[],playerStarts=0,playerHits=0,lastAttack=null,playerDodges=0,playerSpecials=0;
 for(let frame=0;frame<60*maxSeconds&&a.game.phase!=='RESULT';frame++){
  const p=a.game.player,m=a.game.mestre,now=a.game.fightFrames;
  if(lastAttack!==p.attack){if(p.attack)playerStarts++;if(lastAttack?.landed)playerHits++;lastAttack=p.attack;}
  playerHistory.push({frame:now,x:m.x,y:m.y,hp:m.hp,special:m.special?{phase:m.special.phase,lineY:m.special.lineY}:null,
    attack:m.attack?{kind:m.attack.kind,frame:m.attack.frame,startup:m.attack.startup,facing:m.attack.facing,originY:m.attack.originY}:null});
  if(playerHistory.length>40)playerHistory.shift();
  if(frame>=decisionAt){view=playerHistory.findLast(v=>v.frame<=now-(policy==='skilled'?7:12))||view;decisionAt=frame+5;}
  env.keys.w=env.keys.a=env.keys.s=env.keys.d=false;a.input.guard=false;
  if(policy==='guard')a.input.guard=true;
  if(view&&policy!=='idle'&&policy!=='guard'&&a.game.phase==='FIGHTING'){
   const dx=view.x-p.x,dy=view.y-p.y,ax=Math.abs(dx),ay=Math.abs(dy),busy=p.attack||(p.special&&p.special.mode!=='RUSH_OVERDRIVE')||p.hitstun||p.guardBreakTimer||p.dodgeFrames||p.whiffFrames;
   const careful=policy==='skilled',ordinary=policy==='competent';
   if(careful&&view.special?.phase==='CHARGE'){
    env.keys.w=p.y>180;env.keys.s=p.y<=180&&p.y<view.special.lineY+22;
   }else{
    env.keys.a=dx<-(careful?39:42);env.keys.d=dx>(careful?39:42);env.keys.w=dy<-4;env.keys.s=dy>4;
   }
   const threat=view.attack&&ax<72&&Math.abs(p.y-view.attack.originY)<14;
   if(!busy&&careful&&p.specialCharge>=100&&!p.specialCooldown){a.input.special=true;playerSpecials++;}
   else if(!busy&&(careful||ordinary)&&threat&&view.attack.frame>=view.attack.startup-6&&!p.dodgeCooldown&&frame%3!==0){a.input.dodge=true;playerDodges++;}
   else if(!busy&&ordinary&&threat)a.input.guard=true;
   else if(now>=attackAt&&ax<65&&ay<13){
    a.input[(careful?frame%5===0:frame%4===0)?'cross':'jab']=true;
    attackAt=now+(policy==='mash'?9:careful?11:18);
   }
  }
  step();
 }
 const m=a.game.mestre,p=a.game.player,brain=env.BoxingMasterAI.snapshot();
 return {seed,policy,winner:a.game.winner,phase:a.game.phase,seconds:+(a.game.fightFrames/60).toFixed(2),
  playerHp:p.hp,masterHp:m.hp,playerStarts,playerHits,playerDodges,playerSpecials,stats:brain?.stats,
  minLag:Math.min(...(brain?.decisions.map(d=>d.lag)||[])),maxLag:Math.max(...(brain?.decisions.map(d=>d.lag)||[]))};
}
module.exports={setup,simulate};
