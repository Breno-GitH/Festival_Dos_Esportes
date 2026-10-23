const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9294/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const inFlight=new Set();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent')inFlight.add(m.params.requestId);if(m.method==='Network.loadingFinished'||m.method==='Network.loadingFailed')inFlight.delete(m.params.requestId);});
 const networkIdle=async()=>{let quiet=0;for(let i=0;i<150;i++){await sleep(100);if(!inFlight.size){if(++quiet>=4)return;}else quiet=0;}throw Error('network remained busy');};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,k,repeat=false)=>send('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k==='Enter'?'Enter':k==='Escape'?'Escape':k.startsWith('Arrow')?k:'Key'+k.toUpperCase(),windowsVirtualKeyCode:k===' '?32:k==='Enter'?13:k==='Escape'?27:k==='ArrowUp'?38:k==='ArrowDown'?40:k.toUpperCase().charCodeAt(0),autoRepeat:repeat});
 const tap=async k=>{await key('keyDown',k);await sleep(30);await key('keyUp',k);await sleep(70);};
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("document.readyState==='complete'&&typeof surfEndlessGame!=='undefined'&&typeof RavokOutcome!=='undefined'&&RavokEvent.npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)")){await networkIdle();return;}}throw Error('load timeout');};
 const reload=async()=>{await send('Page.reload',{ignoreCache:true});await sleep(200);await ready();};
 const shot=async name=>{const png=await ev("canvas.toDataURL('image/png').split(',')[1]");fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(png,'base64'));};
 const place=async(scene='ILHA_ESCALADA',x=225,y=262)=>{await ev(`TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='${scene}';player.x=${x};player.y=${y};clearMinigameBriefInput();showOverworldUI();`);await sleep(100);};
 const seed=async(n,exited=false)=>{
  await ev(`localStorage.clear();localStorage.setItem('zorp_esportes_medalhas',JSON.stringify(Object.fromEntries(MEDALHAS_REGISTRY.map((m,i)=>[m.id,i<${n}]))));if(${n}===8)localStorage.setItem('zorpSurfCompleted','1');localStorage.setItem('zorp_ravok_event',JSON.stringify({version:5,arrived:true,ravokArrivalSeen:true,ravokExited:${exited},preludeSeen:true}));`);
  await reload();await place();
 };

 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8814/index.html'});await ready();
 const report={errors,httpErrors,failedRequests};
 await seed(8,true);await ev(`const saved=JSON.parse(localStorage.getItem(RavokEvent.storageKey));saved.ravokProposalSeen=true;localStorage.setItem(RavokEvent.storageKey,JSON.stringify(saved));`);
 await reload();await place('ILHA_ESCALADA',368,132);await sleep(200);await tap('e');
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');assert.equal(await ev('RavokEvent.dialogue().selected'),1);
 await tap('w');await key('keyDown',' ');await sleep(100);await key('keyDown',' ',true);
 assert.equal(await ev('RavokEvent.dialogue().type'),'CONFIRM');assert.equal(await ev('RavokEvent.dialogue().selected'),1);assert.equal(await ev('RavokEvent.ravokChoice'),null);
 await shot('accept-second-confirmation');await key('keyUp',' ');await tap(' ');
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');await tap('e');await tap('w');await tap('e');
 report.confirmation=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot()})');
 assert.equal(report.confirmation.event.ravokChoice,'accept');assert.equal(report.confirmation.event.ravokBadEndingSeen,false);assert.equal(report.confirmation.outcome.phase,'SILENT_ACCEPTANCE');
 const frozenAccept=await ev('({x:player.x,y:player.y})');
 await key('keyDown','w');await key('keyDown','e');await key('keyDown',' ');await sleep(240);
 await key('keyUp','w');await key('keyUp','e');await key('keyUp',' ');
 assert.deepEqual(await ev('({x:player.x,y:player.y})'),frozenAccept);
 assert.equal(await ev('RavokOutcome.snapshot().phase'),'SILENT_ACCEPTANCE');report.inputFrozen=true;
 await ev(`window.qaFrames=[];window.qaFrameOn=true;let prev=performance.now();function frame(t){if(!window.qaFrameOn)return;window.qaFrames.push(t-prev);prev=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);`);
 const targets={SILENT_ACCEPTANCE:1,ACCEPTANCE:1,AUTHORIZATION:.8,RAVOK_BOARD:1.6,RETURN_TO_SHIP:2.2,ISLAND_DEPARTURE:1.2,CLOUDS:1.2,ATMOSPHERE:1.3,SPACE_ESTABLISH:1,WEAPON_DEPLOY:2.6,TRANSMISSION:2.7,CHARGE:2.7,FIRE:.32,PLANET_FLASH:.6,SILENT_AFTERMATH:1.5,LAST_WORDS:1,DEPARTURE:2.8,FADE:.8},captured=new Set(),phases=[];
 const start=Date.now();let card=false;
 for(let i=0;i<1200;i++){
  await sleep(60);const state=await ev('({outcome:RavokOutcome.snapshot(),event:RavokEvent.snapshot(),scene:currentScene,film:RavokBadEnding.snapshot()})');
  assert.equal(state.scene,'RAVOK_SECRET_CUTSCENE');assert.equal(state.event.ravokBadEndingSeen,false);assert.equal(state.outcome.completed,false);assert.equal(state.outcome.saveFailed,false);
  const id=state.outcome.phase;if(phases.at(-1)?.id!==id)phases.push({id,at:(Date.now()-start)/1000});
  if(targets[id]!==undefined&&state.outcome.time>=targets[id]&&!captured.has(id)){await shot('accept-'+id.toLowerCase());captured.add(id);}
  if(id==='SILENT_AFTERMATH'){assert.equal(state.film.audioVoices,0);}
  if(id==='CARD'){assert.equal(state.event.ravokBadEndingCardReady,true);card=true;break;}
 }
 assert.ok(card,'film did not finish');report.phases=phases;report.duration=(Date.now()-start)/1000;
 report.frames=await ev(`(()=>{qaFrameOn=false;const a=qaFrames.filter(n=>n>0).sort((a,b)=>a-b);return {count:a.length,medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.floor(a.length*.95)],averageFps:1000/(a.reduce((s,n)=>s+n,0)/a.length)};})()`);
 await sleep(1400);await shot('accept-ending-card');
 report.cardTexts=await ev(`(()=>{const c=document.createElement('canvas');c.width=450;c.height=300;const g=c.getContext('2d'),texts=[];g.fillText=(text,x,y)=>texts.push({text,x,y,width:g.measureText(text).width});RavokBadEnding.draw(g,'CARD',1,3);return texts;})()`);
 assert.ok(report.cardTexts.some(t=>t.text==='A MAIOR CONQUISTA'));assert.ok(report.cardTexts.every(t=>t.width<=370&&t.y<=273));
 assert.equal(await ev('RavokEvent.ravokBadEndingSeen'),false);
 // Reload before dismissing the card: Continue must restore the card, with no Overworld control.
 await reload();await sleep(600);await tap('Enter');await sleep(1500);
 report.cardResume=await ev('({scene:currentScene,outcome:RavokOutcome.snapshot(),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');
 assert.equal(report.cardResume.scene,'RAVOK_SECRET_CUTSCENE');assert.equal(report.cardResume.outcome.phase,'CARD');assert.equal(report.cardResume.saved.ravokBadEndingSeen,false);
 await sleep(1300);await tap(' ');await sleep(300);report.completed=await ev('({scene:currentScene,saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');
 assert.equal(report.completed.scene,'TITLE_SCREEN');assert.equal(report.completed.saved.ravokBadEndingSeen,true);assert.equal(report.completed.saved.ravokEndingCompleted,true);await shot('accept-menu');
 await reload();await sleep(600);await tap('Enter');await sleep(1500);
 report.completedContinue=await ev('({scene:currentScene,outcome:RavokOutcome.snapshot(),event:RavokEvent.snapshot()})');
 assert.equal(report.completedContinue.scene,'RAVOK_SECRET_CUTSCENE');assert.equal(report.completedContinue.outcome.phase,'CARD');assert.equal(report.completedContinue.event.ravokBadEndingSeen,true);
 await sleep(1300);await tap(' ');assert.equal(await ev('currentScene'),'TITLE_SCREEN');

 fs.writeFileSync(__dirname+'/browser-accept-regression-results.json',JSON.stringify(report,null,2));
 assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({acceptance:true,phases:phases.map(s=>s.id),cardResume:true,completedContinue:true,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
