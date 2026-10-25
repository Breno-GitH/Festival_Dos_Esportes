const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(seed=1){
 const root=process.env.BOXING_PROJECT||__dirname;let clock=0,state=seed>>>0;const medals=[],results=[],events=[];
 const math=Object.create(Math);math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 class Image{set src(v){this._src=v;this.onload?.();}}
 const env={console,Math:math,Image,performance:{now:()=>clock},document:{hidden:false,createElement:()=>({getContext:()=>({drawImage(){}})})},keys:{w:false,a:false,s:false,d:false,space:false},currentScene:'JOGO_BOXE',hintText:{},location:{search:''},URLSearchParams,
  FestivalChallenges:{onBoxingStart(){},onBoxingResult:(...v)=>results.push(v)},desbloquearMedalha:id=>medals.push(id),
  resetBoxingPresentation(){},updateBoxingPresentation(){},boxingShowEvent:k=>events.push(k),addEventListener(){}};
 env.window=env;vm.createContext(env);
 for(const name of ['boxing_controls.js','boxing_resources.js','boxing_rounds.js','boxing_arena.js','boxing_zorp_special_atlas.js','boxing_zorp_special.js','boxing_master_special_atlas.js','boxing_master_special.js']){
  const file=fs.existsSync(path.join(__dirname,name))?path.join(__dirname,name):path.join(root,name);vm.runInContext(fs.readFileSync(file,'utf8'),env);
 }
 vm.runInContext('globalThis.api={game:boxeGame,input:boxingInputPress,reset:resetBoxe,update:updateBoxeGame,start:boxingStartAttack,feint:boxingStartFeint,dodge:boxingStartDodge,request:boxingRequestSpecial,release:boxingReleaseInput,clock:boxingRoundClockStep,finish:boxingFinishRound,intro:boxingStartRoundIntro};',env);
 const a=env.api;a.reset(true);a.game.qaFreezeAi=true;
 const step=(n=1,fps=60)=>{for(let i=0;i<n;i++){clock+=1000/fps;a.update(1/fps);}};
 const until=pred=>{for(let i=0;i<1600&&!pred();i++)step();if(!pred())throw Error('condition not reached: '+pred);};
 const place=(distance=40,depth=0)=>{a.game.player.x=200;a.game.player.y=210;a.game.mestre.x=200+distance;a.game.mestre.y=210+depth;};place();
 let prevented=0;
 const event=(key,repeat=false)=>({key,repeat,preventDefault(){prevented++;}});
 const down=(key,repeat=false)=>{const e=event(key,repeat);env.BoxingInput.trackDown(e);return env.BoxingInput.keyDown(e);};
 const up=key=>env.BoxingInput.keyUp(event(key));
 const tap=key=>{down(key);step();up(key);};
 const winRound=role=>{
  place();const f=role==='zorp'?a.game.player:a.game.mestre,t=role==='zorp'?a.game.mestre:a.game.player;
  f.stamina=100;t.hp=1;f.hitstun=0;f.whiffFrames=0;f.guardBreakTimer=0;f.dodgeFrames=0;f.attack=null;
  if(!a.start(f,'jab'))throw Error('cannot start round-winning hit');until(()=>a.game.phase==='ROUND_RESULT');
 };
 const next=()=>until(()=>a.game.phase==='FIGHTING'||a.game.phase==='RESULT');
 return {a,env,step,until,place,down,up,tap,winRound,next,medals,results,events,prevented:()=>prevented};
}
module.exports={setup};
