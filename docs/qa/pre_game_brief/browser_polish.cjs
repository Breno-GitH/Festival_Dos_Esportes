const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.BRIEF_QA_OUTPUT||process.cwd()+'/docs/qa/pre_game_brief',sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9284/json')).json();
 const page=pages.find(target=>target.type==='page'),ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
 let id=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[],results=[];
 ws.addEventListener('message',event=>{const message=JSON.parse(event.data);
  if(message.id){const job=pending.get(message.id);pending.delete(message.id);message.error?job.reject(message.error):job.resolve(message.result);}
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
  if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')errors.push(message.params);
  if(message.method==='Network.responseReceived'&&message.params.response.status>=400)httpErrors.push(message.params.response);
  if(message.method==='Network.loadingFailed'&&!message.params.canceled)failedRequests.push(message.params);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});ws.send(JSON.stringify({id:serial,method,params}));});
 const evaluate=async expression=>{const answer=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(answer.exceptionDetails)throw Error(JSON.stringify(answer.exceptionDetails));return answer.result.value;};
 const key=(type,value,code,vk)=>send('Input.dispatchKeyEvent',{type,key:value,code,windowsVirtualKeyCode:vk});
 const tap=async(value,code,vk)=>{await key('keyDown',value,code,vk);await sleep(35);await key('keyUp',value,code,vk);};
 const screenshot=async name=>fs.writeFileSync(out+'/'+name+'.png',Buffer.from(await evaluate("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
 const sports=[
  {id:'pingpong',scene:'JOGO_PINGPONG',island:'ILHA_PINGPONG',
   state:"({state:pingPong.gameState,score:[pingPong.playerScore,pingPong.opponentScore],balls:pingPong.balls.length,rally:pingPong.rallyHits,tick:pingPong.masterAI?.tick||0,x:pingPong.playerX,y:pingPong.playerY})",
   started:"pingPong.gameState==='PLAYING'&&pingPong.balls.length===1"},
  {id:'basketball',scene:'JOGO_BASQUETE',island:'ILHA_BASQUETE',
   state:"({state:basketball1v1.phase,clock:basketball1v1.clock,frame:basketball1v1.frame,score:{...basketball1v1.score},ball:[basketball1v1.ball.x,basketball1v1.ball.y,basketball1v1.ball.state],master:[basketball1v1.master.x,basketball1v1.master.y]})",
   started:"basketball1v1.phase==='PLAYING'&&basketball1v1.frame>0"},
  {id:'marathon',scene:'JOGO_CORRIDA',island:'ILHA_CORRIDA',
   state:"({state:corridaMaratona.phase,clock:corridaMaratona.clock,countdown:corridaMaratona.countdown,player:[corridaMaratona.player.x,corridaMaratona.player.y,corridaMaratona.player.progress],gates:corridaMaratona.gatesPassed})",
   started:"['COUNTDOWN','RACING'].includes(corridaMaratona.phase)&&corridaMaratona.countdown<3"},
  {id:'skate',scene:'JOGO_SKATE',island:'ILHA_SKATE',
   state:"({state:skateOllieRuntime.simulation.state.phase,elapsed:skateOllieRuntime.simulation.state.elapsed,x:skateOllieRuntime.simulation.state.player.x,y:skateOllieRuntime.simulation.state.player.y,bank:skateOllieRuntime.combo.bankedScore})",
   started:"skateOllieRuntime.simulation.state.phase==='PLAYING'&&skateOllieRuntime.simulation.state.elapsed>0"},
  {id:'archery',scene:'JOGO_ARCO',island:'ILHA_ARCO',
   state:"({state:arcoGame.gameState,frame:arcoGame.roundFrame,score:[arcoGame.playerScore,arcoGame.mestreScore],targets:arcoGame.targets.length,arrows:arcoGame.arrows.length,master:[arcoGame.mestreX,arcoGame.mestreY]})",
   started:"arcoGame.gameState==='PLAYING'&&arcoGame.roundFrame>0"},
  {id:'climbing',scene:'JOGO_ESCALADA',island:'ILHA_ESCALADA',
   state:"({state:escaladaGame.gameState,motion:escaladaGame.motionClock,step:escaladaGame.currentStep,x:escaladaGame.playerX,y:escaladaGame.playerY,hazards:escaladaGame.objetosCaindo.length})",
   started:"escaladaGame.gameState==='PLAYING'&&escaladaGame.motionClock>0"},
  {id:'boxing',scene:'JOGO_BOXE',island:'ILHA_ESQUI',
   state:"({state:boxeGame.phase,frames:boxeGame.fightFrames,intro:boxeGame.introFrames,player:[boxeGame.player.x,boxeGame.player.y,boxeGame.player.hp],master:[boxeGame.mestre.x,boxeGame.mestre.y,boxeGame.mestre.hp]})",
   started:"['INTRO','FIGHTING'].includes(boxeGame.phase)&&boxeGame.introFrames<48"},
  {id:'surf',scene:'JOGO_SURF',island:'ILHA_SURF',
   state:"({state:surfEndlessGame.state,time:surfEndlessGame.time,distance:surfEndlessGame.distance,score:surfEndlessGame.score,player:[surfEndlessGame.player.verticalPosition,surfEndlessGame.player.air],generated:surfEndlessGame.director.generated})",
   started:"surfEndlessGame.state==='PLAYING'&&surfEndlessGame.time>0&&surfEndlessGame.distance>0"}
 ];
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8804/index.html'});
 for(let attempt=0;attempt<180;attempt++){await sleep(100);if(await evaluate("typeof PreGameBrief!=='undefined'&&typeof resetPingPong==='function'&&typeof surfEndlessGame!=='undefined'&&typeof corridaMaratona!=='undefined'"))break;}
 await evaluate("TitleScreen.active=false;for(const name of Object.keys(keys))keys[name]=false;");
 for(const sport of sports){
  const setupExpression="(()=>{if(PreGameBrief.active){PreGameBrief.state='CLOSED';PreGameBrief.progress=0;}"+
   "currentScene='"+sport.island+"';for(const name of Object.keys(keys))keys[name]=false;interactionPressed=false;shipInteractionPressed=false;"+
   "const npc=npcs.find(item=>item.scene==='"+sport.island+"'&&item.isMaster==='"+sport.scene+"');"+
   "if(!npc)return {found:false};player.x=npc.x-18;player.y=npc.y+4;return {found:true,hit:isColliding(player,overworldNpcInteractionBox(npc))};})()";
  const setup=await evaluate(setupExpression);
  assert.equal(setup.found,true,sport.id+' master');assert.equal(setup.hit,true,sport.id+' interaction');
  await sleep(80);await tap('e','KeyE',69);await sleep(330);
  const brief=await evaluate('PreGameBrief.snapshot()');
  assert.equal(brief.active,true,sport.id+' briefing');assert.equal(brief.id,sport.id,sport.id+' id');
  const before=await evaluate(sport.state);await sleep(850);const after=await evaluate(sport.state);
  assert.deepEqual(after,before,sport.id+' changed while briefing was open');
  await screenshot('polished-'+sport.id+'-brief');
  await tap(' ','Space',32);await sleep(210);
  if(sport.id!=='marathon'){
   assert.equal(await evaluate('PreGameBrief.state'),'COUNTDOWN',sport.id+' countdown missing');
   const countdownBefore=await evaluate(sport.state);await sleep(650);
   assert.deepEqual(await evaluate(sport.state),countdownBefore,sport.id+' simulated during countdown');
   if(sport.id==='pingpong')await screenshot('polished-countdown');
   await sleep(1000);
  }else await sleep(200);
  if(sport.id==='boxing')await sleep(900);
  assert.equal(await evaluate(sport.started),true,sport.id+' did not start');
  results.push({sport:sport.id,brief,paused:true,gameplay:await evaluate(sport.state)});
 }
 const report={results,errors,httpErrors,failedRequests};
 fs.writeFileSync(out+'/browser-polished-results.json',JSON.stringify(report,null,2));
 assert.equal(errors.length,0,'runtime errors');assert.equal(httpErrors.length,0,'HTTP errors');assert.equal(failedRequests.length,0,'failed requests');
 console.log(JSON.stringify({sports:results.length,errors:errors.length,httpErrors:httpErrors.length,failedRequests:failedRequests.length}));
 ws.close();
})().catch(error=>{console.error(error);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
