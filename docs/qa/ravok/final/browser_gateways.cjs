// Result-adapter smoke checks. These prepare result states, not complete sport runs.
const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9294/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);});
 const inFlight=new Set(),failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent')inFlight.add(m.params.requestId);if(m.method==='Network.loadingFinished'||m.method==='Network.loadingFailed')inFlight.delete(m.params.requestId);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const networkIdle=async()=>{let quiet=0;for(let i=0;i<150;i++){await sleep(100);if(!inFlight.size){if(++quiet>=4)return;}else quiet=0;}throw Error('network remained busy');};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("document.readyState==='complete'&&typeof surfEndlessGame!=='undefined'&&typeof RavokArrival!=='undefined'&&RavokEvent.npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)")){await networkIdle();return;}}throw Error('load timeout');};
 const fixtures=[
  {id:'pingpong',scene:'JOGO_PINGPONG',destination:'ILHA_PINGPONG',prepare:"resetPingPong();pingPong.gameState='GAMEOVER';pingPong.win=true",check:"pingPong.gameState==='GAMEOVER'"},
  {id:'basquete',scene:'JOGO_BASQUETE',destination:'ILHA_BASQUETE',prepare:"basketball1v1.reset(true);basketball1v1.finishMatch('zorp')",check:"basketball1v1.phase==='RESULT'"},
  {id:'corrida',scene:'JOGO_CORRIDA',destination:'ILHA_CORRIDA',prepare:"corridaMaratona.reset();corridaMaratona.phase='RESULT'",check:"corridaMaratona.phase==='RESULT'"},
  {id:'skate',scene:'JOGO_SKATE',destination:'ILHA_SKATE',prepare:"resetSkateGame();skateOllieRuntime.simulation.state.phase='COMPLETED'",check:"skateOllieRuntime.simulation.state.phase==='COMPLETED'"},
  {id:'arco',scene:'JOGO_ARCO',destination:'ILHA_ARCO',prepare:"resetArco();arcoGame.playerScore=240;arcoGame.mestreScore=190;finishArcoRound()",check:"arcoGame.gameState==='GAMEOVER'"},
  {id:'escalada',scene:'JOGO_ESCALADA',destination:'ILHA_ESCALADA',prepare:"resetEscalada();escaladaGame.gameState='GAMEOVER';escaladaGame.win=true",check:"escaladaGame.gameState==='GAMEOVER'"},
  {id:'boxe',scene:'JOGO_BOXE',destination:'ILHA_ESQUI',prepare:"resetBoxe();boxeGame.phase='RESULT';boxeGame.winner='zorp'",check:"boxeGame.phase==='RESULT'"},
  {id:'surf',scene:'JOGO_SURF',destination:'ILHA_SURF',prepare:"surfEndlessGame.state='COMPLETE';surfEndlessGame.resultShownAt=surfEndlessGame.frame-90;localStorage.setItem('zorpSurfCompleted','1')",check:"surfEndlessGame.state==='COMPLETE'"}
 ];
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});const result={cases:[],errors,httpErrors,failedRequests};
 for(const f of fixtures){
  await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8814',storageTypes:'local_storage'});await send('Page.navigate',{url:'http://127.0.0.1:8814/index.html'});await ready();
  const seeds=['pingpong','basquete','corrida','skate','arco'].filter(id=>id!==f.id).slice(0,3);
  await ev(`TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='HUB';${JSON.stringify(seeds)}.forEach(id=>desbloquearMedalha(id));player.x=225;player.y=${f.id==='escalada'?194:150};currentScene='${f.scene}';${f.prepare};desbloquearMedalha('${f.id}');`);
  await sleep(900);const before=await ev('RavokArrival.snapshot()');assert.equal(before.active,false);assert.equal(before.pending,true);assert.equal(before.readyScene,f.scene);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await sleep(25);await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await sleep(70);
  const after=await ev('RavokArrival.snapshot()');assert.equal(after.active,true);assert.equal(after.phase,'FADE_OUT');assert.equal(after.returnPoint[0],f.destination);assert.equal(await ev(f.check),true,'result restarted for '+f.id);
  const returnAccessible=await ev(`(()=>{const previous=currentScene;currentScene='${f.destination}';try{return !checkObstacleCollision(${after.returnPoint[1]},${after.returnPoint[2]});}finally{currentScene=previous;}})()`);
  assert.equal(returnAccessible,true,'return point blocked for '+f.id+': '+JSON.stringify(after.returnPoint));
  result.cases.push({sport:f.id,ready:before.readyScene,started:after.phase,destination:after.returnPoint,resultPreserved:true,returnAccessible});
 }
 fs.writeFileSync(__dirname+'/browser-arrival-gateways.json',JSON.stringify(result,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({adapters:result.cases.length,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
