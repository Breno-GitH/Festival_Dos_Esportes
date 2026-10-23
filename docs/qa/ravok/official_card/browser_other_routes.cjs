const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9295/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
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
 await send('Page.navigate',{url:'http://127.0.0.1:8815/index.html'});await ready();
 const report={errors,httpErrors,failedRequests};
 await seed(8,true);
 await ev(`const saved=JSON.parse(localStorage.getItem(RavokEvent.storageKey));saved.ravokProposalSeen=true;localStorage.setItem(RavokEvent.storageKey,JSON.stringify(saved));localStorage.setItem('zorp_festival_wallet',JSON.stringify({version:3,coins:100}));localStorage.setItem('zorp_festival_story',JSON.stringify({introSeen:true,homeCallSeen:true,allMedalsComplete:true}));`);
 await reload();await place('ILHA_ESCALADA',368,132);await sleep(200);await tap('e');
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');assert.equal(await ev('RavokEvent.dialogue().selected'),1);await shot('arrest-choice-no');await tap(' ');
 assert.equal(await ev('RavokOutcome.snapshot().phase'),'REFUSAL');
 const frozen=await ev('({x:player.x,y:player.y})');await key('keyDown','d');await sleep(240);await key('keyUp','d');assert.deepEqual(await ev('({x:player.x,y:player.y})'),frozen);
 await ev(`window.qaFrames=[];window.qaFrameOn=true;let prev=performance.now();function frame(t){if(!window.qaFrameOn)return;window.qaFrames.push(t-prev);prev=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);`);
 const targets={ANGER:.5,TURN_TO_SHIP:.8,TRANSMIT:1.8,SKY_REVEAL:1.8,AUTHORITY_LIGHTS:1.2,AUTHORITY_ARRIVAL:2,ENCIRCLEMENT:2,REMOTE_DISABLE:1.8,HOLOGRAM:.9,MEDALS:1.2,K7_EVIDENCE:1.6,RAVOK_ESCORT:1.5,AUTHORITIES_DEPART:1.4,AFTERMATH:1.3,FADE:.5},phases=[],lines=[],captured=new Set();
 const started=Date.now();let returned=false;
 for(let i=0;i<1400;i++){
  await sleep(70);const v=await ev('({outcome:RavokOutcome.snapshot(),event:RavokEvent.snapshot(),scene:currentScene})'),o=v.outcome;
  if(phases.at(-1)?.id!==o.phase)phases.push({id:o.phase,at:(Date.now()-started)/1000});
  assert.notEqual(v.scene,'TITLE_SCREEN');assert.notEqual(o.phase,'CARD');assert.equal(v.event.ravokEndingCompleted,false);assert.equal(v.event.ravokBadEndingSeen,false);
  if(!o.active){assert.equal(v.scene,'ILHA_ESCALADA');assert.equal(v.event.ravokArrested,true);returned=true;break;}
  assert.equal(v.scene,'RAVOK_SECRET_CUTSCENE');assert.equal(v.event.ravokArrested,false);assert.equal(o.saveFailed,false);
  if(o.waitingForSpace&&o.time>=.8){
   lines.push({...o.dialogue,phase:o.phase});
   const measured=await ev(`(()=>{const c=document.createElement('canvas');c.width=450;c.height=300;const g=c.getContext('2d'),texts=[];g.fillText=(text,x,y)=>texts.push({text,x,y,width:g.measureText(text).width});const s=RavokOutcome.snapshot();RavokArrest.draw(g,s.phase,0,s.time);return texts;})()`);
   assert.ok(measured.every(t=>t.y<=288&&t.y>=0&&t.width<=390),JSON.stringify(measured));
   if(['REFUSAL','TRUTH_TWO','ESCAPE_BLOCKED','OFFICER_CHARGES','EIGHT_MEMORIES','PROTOCOL_CLOSED'].includes(o.phase))await shot('arrest-'+o.phase.toLowerCase());
   await tap(' ');
  }else if(targets[o.phase]!==undefined&&o.time>=targets[o.phase]&&!captured.has(o.phase)){await shot('arrest-'+o.phase.toLowerCase());captured.add(o.phase);}
 }
 assert.ok(returned,'cutscene failed to return');report.duration=(Date.now()-started)/1000;report.phases=phases;report.dialogue=lines;assert.equal(lines.length,await ev('RavokArrest.shots.filter(s=>s[1]===null).length'));
 report.frames=await ev(`(()=>{qaFrameOn=false;const a=qaFrames.filter(n=>n>0).sort((a,b)=>a-b);return {count:a.length,medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.floor(a.length*.95)],averageFps:1000/(a.reduce((s,n)=>s+n,0)/a.length)};})()`);
 report.refusalCardCache=await ev('RavokBadEnding.snapshot().card.cached');assert.equal(report.refusalCardCache,false);
 report.returned=await ev('({event:RavokEvent.snapshot(),scene:currentScene,player:{x:player.x,y:player.y},coins:FestivalWallet.coins,allMedals:MedalCompletion.hasAllMedals(),blocks:RavokEvent.blocks({x:350,y:75,w:10,h:10}),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');
 assert.deepEqual(report.returned.player,frozen);assert.equal(report.returned.event.npcs.length,0);assert.equal(report.returned.blocks,false);assert.equal(report.returned.coins,100);assert.equal(report.returned.allMedals,true);await shot('arrest-returned-overworld');
 const before=await ev('player.y');await key('keyDown','s');await sleep(180);await key('keyUp','s');assert.ok(await ev('player.y')>before,'control not restored');report.controlRestored=true;
 await reload();await sleep(600);await tap('Enter');await sleep(1500);
 assert.equal(await ev('currentScene'),'HUB');assert.equal(await ev('RavokOutcome.active'),false);await place('ILHA_ESCALADA',382,143);await sleep(300);
 report.reloaded=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot(),focus:overworldFocusNpc?.id||null,scene:currentScene})');
 assert.equal(report.reloaded.event.ravokArrested,true);assert.equal(report.reloaded.event.npcs.length,0);assert.equal(report.reloaded.event.arrived,false);assert.equal(report.reloaded.outcome.active,false);assert.equal(report.reloaded.event.ravokEndingCompleted,false);assert.ok(!['ravok','k7'].includes(report.reloaded.focus));await shot('arrest-reloaded-clearing');
 // Use actual E interaction at the central ship, then the existing farewell and boarding prompt.
 await place('HUB',225,194);await sleep(150);await tap('e');await sleep(150);
 report.standardOffer=await ev('({farewell:MastersFarewell.snapshot(),story:AdventureIntro.snapshot(),ravok:RavokEvent.snapshot()})');
 assert.equal(await ev('MastersFarewell.active'),true);assert.equal(await ev('MastersFarewell.state'),'MASTERS_FAREWELL');await shot('arrest-standard-farewell-available');
 for(let i=0;i<11;i++)await tap(' ');for(let i=0;i<70&&await ev('MastersFarewell.path.length>0');i++)await sleep(70);
 assert.equal(await ev('MastersFarewell.state'),'BOARDING_PROMPT');await tap('w');await tap('e');await sleep(250);
 report.standardCardCache=await ev('RavokBadEnding.snapshot().card.cached');assert.equal(report.standardCardCache,false);
 report.standardStarted=await ev('({active:EndingCinematic.active,scene:currentScene,arrested:RavokEvent.ravokArrested})');assert.equal(report.standardStarted.active,true);assert.equal(report.standardStarted.scene,'FINAL_CUTSCENE');await shot('arrest-standard-ending-started');
 // Reload the same arrested save, then visit the Captain with the pre-existing 100-coin requirement.
 await reload();await place('ILHA_SURF',310,205);await sleep(250);assert.equal(await ev('overworldFocusNpc?.id'),'capitao');await tap('e');
 assert.equal(await ev('CaptainRoute.state'),'OFFER');await shot('arrest-vacation-offer-available');await tap('e');assert.equal(await ev('FestivalWallet.pagouCapitao'),true);await tap('e');await sleep(1000);
 report.vacationStarted=await ev('({active:CaptainRoute.active,state:CaptainRoute.state,scene:currentScene,arrested:RavokEvent.ravokArrested})');
 assert.equal(report.vacationStarted.active,true);assert.equal(report.vacationStarted.state,'FERIAS_MERECIDAS');assert.equal(report.vacationStarted.scene,'FERIAS_MERECIDAS');await shot('arrest-vacation-started');
 report.vacationCardCache=await ev('RavokBadEnding.snapshot().card.cached');assert.equal(report.vacationCardCache,false);
 fs.writeFileSync(__dirname+'/browser-arrest-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({phases:phases.map(p=>p.id),dialogue:lines.length,duration:report.duration,controlRestored:true,reload:true,standardEnding:report.standardStarted.active,vacation:report.vacationStarted.active,frames:report.frames,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
