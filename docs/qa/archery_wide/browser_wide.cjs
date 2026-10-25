const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9315/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async(expression,limit=15000)=>{for(let t=0;t<limit;t+=40){if(await ev(expression))return;await sleep(40);}throw Error('timeout '+expression);};
 const key=(type,k,repeat=false)=>send('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k==='Escape'?'Escape':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k===' '?32:k==='Escape'?27:k.toUpperCase().charCodeAt(0),autoRepeat:repeat});
 const tap=async k=>{await key('keyDown',k);await sleep(30);await key('keyUp',k);await sleep(60);};
 const shot=async name=>{fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));};
 const ready=()=>until("document.readyState==='complete'&&typeof surfEndlessGame!=='undefined'&&typeof ArcheryField!=='undefined'",25000);
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await ev('localStorage.clear()');await send('Page.reload',{ignoreCache:true});await sleep(200);await ready();
 await ev("TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='JOGO_ARCO';resetArco();openMinigameBrief('archery');");
 await sleep(400);await shot('wide-brief');const paused=await ev('arcoGame.roundFrame');await sleep(350);assert.equal(await ev('arcoGame.roundFrame'),paused);await tap(' ');await until("arcoGame.gameState==='PLAYING'&&!PreGameBrief.active");await shot('wide-start');
 const results={errors,httpErrors,failedRequests,movement:[],collisions:[],phases:[],briefPaused:true};
 for(const [k,expr]of [['a','arcoGame.playerX===48'],['d','arcoGame.playerX===852'],['w','arcoGame.playerY===432'],['s','arcoGame.playerY===458']]){
  await key('keyDown',k);await until(expr,5500);await key('keyUp',k);results.movement.push(await ev('getArcoDiagnostics()'));await shot('wide-move-'+k);
 }
 assert.equal(results.movement[0].player.x,48);assert.equal(results.movement[1].player.x,852);assert.ok(results.movement.every(d=>d.masterInBounds&&d.playerInBounds&&!d.overlapAllowed));
 // Controlled contact fixtures use the real moving-target and arrow update pipeline.
 results.collisions=await ev(`(()=>{
  const all=[];resetArco();arcoGame.gameState='TUTORIAL';arcoGame.phase=3;
  for(const type of ['NORMAL_SMALL','EXPLOSIVE','GOLD_FAST','BIRD']){
   arcoGame.targets.length=0;arcoGame.arrows.length=0;const before=arcoGame.playerScore;
   const t=type==='BIRD'?ArcheryBirdTargets.create(1):ArcheryRiverTargets.create(ARCHERY_TARGET_TYPES[type],{entry:'RIGHT',band:'FAR',path:'S_CURVE',speed:'FAST'});
   t.id=arcoGame.nextTargetId++;t.type=type;t.progress=.1;
   (type==='BIRD'?ArcheryBirdTargets:ArcheryRiverTargets).step(t,1/30);t.active=true;t.visible=true;arcoGame.targets.push(t);
   const x=t.x-2,prevY=t.y+80;arcoGame.arrows.push({owner:'PLAYER',state:'ACTIVE',x,y:prevY,prevX:x,prevY,speedX:0,speedY:-160});
   updateArcoTargets(1/30);updateArcoArrows();all.push({type,hit:t.hit,points:arcoGame.playerScore-before,radius:t.radius,x:t.x});
   if(!t.hit)throw Error('continuous contact missed '+type);
  }
  arcoGame.targets.length=0;arcoGame.arrows.length=0;const x=845;const first=spawnArcoTarget({kind:'NORMAL_SMALL',entry:'LEFT',qaStatic:true,x,y:180}),second=spawnArcoTarget({kind:'NORMAL_SMALL',entry:'LEFT',qaStatic:true,x,y:130});
  arcoGame.arrows.push({owner:'PLAYER',state:'ACTIVE',x,y:240,prevX:x,prevY:240,speedX:0,speedY:-180});updateArcoArrows();if(!first.hit||second.hit||arcoGame.arrows.length)throw Error('first-target rule');
  const p=arcoGame.playerScore;updateArcoArrows();if(arcoGame.playerScore!==p)throw Error('double score');
  return all;
 })()`);await shot('wide-contact-fixture');
 await ev("archeryQaParams.set('archeryQaAuto','1');resetArco();beginArcoRound();");
 console.log('Full 60-second match started');const start=Date.now();
 for(const [frame,name]of [[600,'wide-phase1'],[1300,'wide-phase2'],[2200,'wide-phase3'],[3150,'wide-climax']]){
  await until(`arcoGame.roundFrame>=${frame}`,22000);results.phases.push(await ev('getArcoDiagnostics()'));await shot(name);fs.writeFileSync(__dirname+'/browser-results.json',JSON.stringify(results,null,2));
  console.log(name+' '+JSON.stringify(results.phases.at(-1).scores));
 }
 results.performance=await ev(`new Promise(resolve=>{const times=[];const next=t=>{times.push(t);if(times.length===181)resolve({frames:180,fps:180000/(times.at(-1)-times[0]),state:arcoGame.gameState});else requestAnimationFrame(next);};requestAnimationFrame(next);})`);
 await until("arcoGame.gameState==='GAMEOVER'",18000);results.elapsed=(Date.now()-start)/1000;results.final=await ev('getArcoDiagnostics()');await shot('wide-result');
 assert.equal(results.final.stats.boundsViolations,0);assert.equal(results.final.hasNaN,false);assert.equal(results.final.pacing.phaseEntries.length,4);assert.ok(results.final.scores.player>0);assert.ok(results.final.scores.master>0);assert.equal(await ev('arcoGame.roundFrame'),3600);
 await tap(' ');await until("currentScene==='ILHA_ARCO'");results.return=await ev('({scene:currentScene,width:canvas.width,height:canvas.height})');assert.equal(results.return.width,450);assert.equal(results.return.height,300);await shot('wide-return');
 fs.writeFileSync(__dirname+'/browser-results.json',JSON.stringify(results,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({score:results.final.scores,fps:results.performance,elapsed:results.elapsed,peak:results.final.stats.maxTargets,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
