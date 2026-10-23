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
 const walk=async(tx,ty)=>{
  const path=await ev(`(()=>{const start=[Math.round(player.x),Math.round(player.y)],q=[start],parents=new Map([[start.join(','),null]]);let end;for(let i=0;i<q.length;i++){const p=q[i];if(Math.abs(p[0]-${tx})<=2&&Math.abs(p[1]-${ty})<=2){end=p;break;}for(const [dx,dy]of [[0,-1],[1,0],[-1,0],[0,1]]){const x=p[0]+dx,y=p[1]+dy,k=x+','+y;if(x<25||x>425||y<20||y>282||parents.has(k)||[-1.2,1.2].some(ox=>[-1.2,1.2].some(oy=>checkObstacleCollision(x+ox,y+oy))))continue;parents.set(k,p);q.push([x,y]);}}if(!end)return null;const path=[];for(let p=end;parents.get(p.join(','));p=parents.get(p.join(',')))path.unshift(p);const turns=[];let prev=start,last='';for(const p of path){const k=p[0]>prev[0]?'d':p[0]<prev[0]?'a':p[1]>prev[1]?'s':'w';if(last&&last!==k)turns.push({k:last,x:prev[0],y:prev[1]});last=k;prev=p;}if(last)turns.push({k:last,x:prev[0],y:prev[1]});return {steps:path.length,turns};})()`);
  assert.ok(path,'no route to '+tx+','+ty);
  for(const t of path.turns){
   if(await ev(`Math.abs(player.x-${t.x})<=1.11&&Math.abs(player.y-${t.y})<=1.11`))continue;
   const moving=ev(`new Promise(resolve=>{let f=0;function tick(){if(Math.abs(player.x-${t.x})<=1.11&&Math.abs(player.y-${t.y})<=1.11){keys['${t.k}']=false;resolve(true);}else if(++f>240){keys['${t.k}']=false;resolve(false);}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})`);await key('keyDown',t.k);assert.equal(await moving,true,'blocked '+JSON.stringify(t));await key('keyUp',t.k);
  }
  return path;
 };

 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8814',storageTypes:'local_storage'});
 await send('Page.navigate',{url:'http://127.0.0.1:8814/index.html'});await ready();await place('ILHA_ESCALADA',382,145);
 const report={errors,httpErrors,failedRequests,early:[],arrivalPhases:[],arrivalLines:[],proposalLines:[]};
 for(let n=0;n<=3;n++){
  if(n)await ev(`desbloquearMedalha('${['pingpong','basquete','corrida'][n-1]}')`);await sleep(100);
  const s=await ev('({event:RavokEvent.snapshot(),arrival:RavokArrival.snapshot(),blocks:RavokEvent.blocks({x:350,y:75,w:10,h:10})})');
  assert.equal(s.event.medals,n);assert.equal(s.event.npcs.length,0);assert.equal(s.event.arrived,false);assert.equal(s.arrival.active,false);assert.equal(s.blocks,false);report.early.push(s);
 }await shot('qa-03-hidden');
 await place('ILHA_ARCO',225,150);await ev("resetArco();currentScene='JOGO_ARCO';arcoGame.gameState='PLAYING';arcoGame.playerScore=240;arcoGame.mestreScore=190");
 await key('keyDown',' ');await ev('finishArcoRound()');await sleep(950);await key('keyDown',' ',true);
 report.fourth=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot(),saved:JSON.parse(localStorage.getItem("zorp_esportes_medalhas")),frame:arcoGame.roundFrame,x:player.x,y:player.y})');
 assert.equal(report.fourth.event.medals,4);assert.equal(report.fourth.saved.arco,true);assert.equal(report.fourth.arrival.active,false);assert.equal(report.fourth.arrival.pending,true);await shot('qa-fourth-confirmed');
 await key('keyUp',' ');await tap(' ');assert.equal(await ev('RavokArrival.active'),true);
 await key('keyDown','w');await key('keyDown','e');await key('keyUp','e');const cap=new Set();
 const targets={SPACE:2,FLYBY:1.7,LANDING:3.9,K7_EXIT:2.65};
 for(let i=0;i<500;i++){
  await sleep(70);const s=await ev('RavokArrival.snapshot()');if(report.arrivalPhases.at(-1)!==s.phase)report.arrivalPhases.push(s.phase);
  assert.equal(s.seen,false);assert.equal(s.ravokOutside,false);assert.equal(await ev('RavokEvent.ravokChoice'),null);
  if(targets[s.phase]!==undefined&&s.time>=targets[s.phase]&&!cap.has(s.phase)){await shot('qa-arrival-'+s.phase.toLowerCase());cap.add(s.phase);}
  if(s.phase==='K7_EXIT'&&s.time>=2.5&&!cap.has('hold')){await key('keyDown',' ');cap.add('hold');}
  if(s.phase==='DIALOGUE')break;
 }
 await sleep(600);await key('keyDown',' ',true);assert.equal(await ev('RavokArrival.snapshot().line'),0);await key('keyUp',' ');await key('keyUp','w');
 report.frozenArrival=await ev('({x:player.x,y:player.y,frame:arcoGame.roundFrame})');
 assert.deepEqual(report.frozenArrival,{x:report.fourth.x,y:report.fourth.y,frame:report.fourth.frame});
 for(let i=0;i<3;i++){const s=await ev('RavokArrival.snapshot()');assert.equal(s.line,i);report.arrivalLines.push(s.dialogue);await sleep(500);await tap(' ');}
 // Inject a write failure only in the final arrival commit, then restore normal storage and retry.
 await ev(`window.qaOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='zorp_ravok_event'&&JSON.parse(v).ravokArrivalSeen===true)throw new DOMException('QA write failure','QuotaExceededError');return qaOriginalSetItem.call(this,k,v);}`);
 for(let i=0;i<65&&!await ev('RavokArrival.snapshot().saveFailed');i++)await sleep(80);
 report.saveFailure=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot(),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');
 assert.equal(report.saveFailure.arrival.saveFailed,true);assert.equal(report.saveFailure.arrival.active,true);assert.equal(report.saveFailure.event.ravokArrivalSeen,false);assert.equal(report.saveFailure.saved.ravokArrivalSeen,false);await shot('qa-arrival-save-failure');
 await ev('Storage.prototype.setItem=qaOriginalSetItem');await tap(' ');assert.equal(await ev('RavokArrival.active'),false);
 report.afterArrival=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot(),scene:currentScene,saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');
 assert.equal(report.afterArrival.arrival.completedRuns,1);assert.equal(report.afterArrival.saved.ravokArrivalSeen,true);assert.equal(report.afterArrival.saved.ravokArrivalPending,false);
 await place('ILHA_ESCALADA',225,262);report.pathToK7=await walk(382,129);await sleep(100);assert.equal(await ev('overworldFocusNpc?.id'),'k7');
 report.k7Lines=[];for(let i=0;i<4;i++){await tap('e');report.k7Lines.push(await ev('dialogText.textContent'));}
 assert.equal(new Set(report.k7Lines).size,4);assert.ok(report.k7Lines.every(s=>!(/Ravok|armamento|destruir|proposta/i.test(s))));
 assert.equal(await ev('RavokEvent.interact(RavokEvent.npcs[1])'),null);assert.equal(await ev('RavokEvent.ravokExited'),false);await shot('qa-four-medals-k7');
 await reload();await place('ILHA_ESCALADA',382,145);await sleep(200);
 report.fourReload=await ev('({event:RavokEvent.snapshot(),arrival:RavokArrival.snapshot()})');assert.equal(report.fourReload.arrival.active,false);assert.equal(report.fourReload.event.ravokArrivalSeen,true);assert.deepEqual(report.fourReload.event.npcs.map(n=>n.id),['k7']);
 await place('ILHA_ESCALADA',225,262);await ev("desbloquearMedalha('skate');desbloquearMedalha('escalada');desbloquearMedalha('boxe')");await sleep(250);
 report.seven=await ev('({event:RavokEvent.snapshot(),arrival:RavokArrival.snapshot()})');assert.equal(report.seven.event.medals,7);assert.equal(report.seven.arrival.active,false);assert.equal(report.seven.arrival.pending,false);
 await place('ILHA_ESCALADA',382,145);await sleep(300);assert.equal(await ev('RavokEvent.exitActive'),false);assert.equal(await ev('RavokEvent.interact(RavokEvent.npcs[1])'),null);
 await reload();await place('ILHA_ESCALADA',225,262);await ev("localStorage.setItem('zorpSurfCompleted','1');desbloquearMedalha('surf')");
 assert.equal(await ev('RavokEvent.snapshot().medals'),8);assert.equal(await ev('RavokEvent.ravokExited'),false);assert.equal(await ev('RavokArrival.active'),false);
 report.pathToExit=await walk(382,163);
 const began=ev(`new Promise(resolve=>{let i=0;function frame(){if(RavokEvent.exitActive){keys.w=false;resolve(true);}else if(++i>100){keys.w=false;resolve(false);}else requestAnimationFrame(frame);}requestAnimationFrame(frame);})`);
 await key('keyDown','w');assert.equal(await began,true);await key('keyUp','w');const frozen=await ev('({x:player.x,y:player.y})');await key('keyDown','d');
 report.exitPoses=[];const exitCaps=new Set();for(let i=0;i<90&&await ev('RavokEvent.exitActive');i++){
  await sleep(70);const s=await ev('RavokEvent.snapshot()');if(s.exit?.pose)report.exitPoses.push(s.exit.pose);
  if(s.exit&&s.exit.time>.6&&!exitCaps.has(s.exit.phase)){await shot('qa-exit-'+s.exit.phase.toLowerCase());exitCaps.add(s.exit.phase);}
 }
 await key('keyUp','d');assert.deepEqual(await ev('({x:player.x,y:player.y})'),frozen);assert.equal(await ev('RavokEvent.ravokExited'),true);assert.ok(report.exitPoses.some(p=>p.p>0&&p.p<1));
 await walk(368,132);await tap('e');assert.equal(await ev('RavokEvent.dialogue().index'),0);
 await key('keyDown','w');await key('keyDown','e',true);await sleep(200);await key('keyUp','w');await key('keyUp','e');assert.equal(await ev('RavokEvent.dialogue().index'),0);
 for(let i=0;i<29;i++){
  const d=await ev('RavokEvent.dialogue()');assert.equal(d.index,i);assert.equal(d.type,'DIALOGUE');report.proposalLines.push(d);
  const text=await ev(`(()=>{const c=document.createElement('canvas').getContext('2d');c.font='10px monospace';let line='',rows=[];for(const w of RavokEvent.dialogue().text.split(/\s+/)){const n=line?line+' '+w:w;if(line&&c.measureText(n).width>390){rows.push(line);line=w;}else line=n;}rows.push(line);return {lines:rows.length,width:Math.max(...rows.map(t=>c.measureText(t).width))};})()`);
  assert.ok(text.lines<=4&&text.width<=390);if([0,8,19,28].includes(i))await shot('qa-proposal-'+i);
  if(i<28)await tap(' ');else await key('keyDown',' ');
 }
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');assert.equal(await ev('RavokEvent.dialogue().selected'),1);
 // Hold the Space used for the final dialogue line; even changing selection cannot reuse it.
 for(let i=0;i<4;i++)await key('keyDown',' ',i%2===0);await tap('w');await key('keyDown',' ',true);await key('keyDown',' ',false);
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');assert.equal(await ev('RavokEvent.ravokChoice'),null);await key('keyUp',' ');
 await key('keyDown',' ');assert.equal(await ev('RavokEvent.dialogue().type'),'CONFIRM');assert.equal(await ev('RavokEvent.dialogue().selected'),1);
 await tap('w');for(let i=0;i<4;i++)await key('keyDown',' ',i%2===0);assert.equal(await ev('RavokEvent.ravokChoice'),null);await key('keyUp',' ');await tap('Escape');
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');assert.equal(await ev('RavokEvent.ravokChoice'),null);
 report.inputBoundaries={lastDialogueDidNotChoose:true,duplicateKeydownIgnored:true,heldSpaceCannotConfirmYes:true,extraConfirmationDefaultNo:true};await shot('qa-safe-choice');
 await tap('Escape');report.beforeChoiceSave=await ev('JSON.parse(localStorage.getItem(RavokEvent.storageKey))');
 assert.equal(report.beforeChoiceSave.ravokArrivalSeen,true);assert.equal(report.beforeChoiceSave.ravokChoice,null);assert.equal(report.beforeChoiceSave.ravokBadEndingSeen,false);assert.equal(report.beforeChoiceSave.ravokArrested,false);
 report.renderIssues=await ev('getOverworldDiagnostics().renderIssues');assert.equal(report.renderIssues.length,0);
 fs.writeFileSync(__dirname+'/browser-progression-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({early:report.early.map(s=>s.event.medals),arrivalOnce:true,saveFailureRecovered:true,k7Lines:report.k7Lines.length,exit:true,proposal:report.proposalLines.length,input:report.inputBoundaries,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
