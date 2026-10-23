const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9290/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,k,repeat=false)=>send('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k==='Enter'?'Enter':k==='Escape'?'Escape':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k===' '?32:k==='Enter'?13:k==='Escape'?27:k.toUpperCase().charCodeAt(0),autoRepeat:repeat});
 const tap=async k=>{await key('keyDown',k);await sleep(35);await key('keyUp',k);await sleep(70);};
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("document.readyState==='complete'&&typeof RavokArrival!=='undefined'&&typeof surfEndlessGame!=='undefined'&&RavokEvent.npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)"))return;}throw Error('load timeout');};
 const reload=async()=>{await send('Page.reload',{ignoreCache:true});await sleep(300);await ready();};
 const shot=async name=>{const png=await ev("canvas.toDataURL('image/png').split(',')[1]");fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(png,'base64'));};
 const place=async(scene='ILHA_ARCO',x=225,y=150)=>{await ev(`TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='${scene}';player.x=${x};player.y=${y};clearMinigameBriefInput();showOverworldUI();`);await sleep(100);};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8810',storageTypes:'local_storage'});
 await send('Page.navigate',{url:'http://127.0.0.1:8810/index.html'});await ready();await place();
 const report={automatic:process.env.RAVOK_AUTO==='1',phases:[],dialogue:[],errors,httpErrors,failedRequests};
 await ev("['pingpong','basquete','corrida'].forEach(id=>desbloquearMedalha(id))");await sleep(400);
 report.three=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot(),saved:JSON.parse(localStorage.getItem("zorp_esportes_medalhas"))})');
 assert.equal(report.three.event.medals,3);assert.equal(report.three.arrival.pending,false);assert.equal(report.three.arrival.active,false);await shot('arrival-three-medals');
 // Drive the real Archery result/medal function, with prepared scores (no 60s sport simulation).
 await ev("resetArco();currentScene='JOGO_ARCO';arcoGame.gameState='PLAYING';arcoGame.playerScore=240;arcoGame.mestreScore=190");
 await key('keyDown',' ');await ev('finishArcoRound()');await sleep(950);await key('keyDown',' ',true);await sleep(100);
 report.fourth=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot(),gameState:arcoGame.gameState,saved:JSON.parse(localStorage.getItem("zorp_esportes_medalhas")),frame:arcoGame.roundFrame,x:player.x,y:player.y})');
 assert.equal(report.fourth.gameState,'GAMEOVER');assert.equal(report.fourth.saved.arco,true);assert.equal(report.fourth.arrival.pending,true);assert.equal(report.fourth.arrival.active,false);assert.equal(report.fourth.arrival.seen,false);
 await shot('arrival-victory-pending');await key('keyUp',' ');
 if(report.automatic){for(let i=0;i<35&&!await ev('RavokArrival.active');i++)await sleep(100);}else await tap(' ');
 assert.equal(await ev('RavokArrival.active'),true);assert.equal(await ev('currentScene'),'RAVOK_ARRIVAL');
 const started=Date.now();await key('keyDown','w');await key('keyDown','e');await key('keyDown','Escape');await sleep(100);await key('keyUp','Escape');await key('keyUp','e');
 const captured=new Set(),targets={SPACE:3,FLYBY:1.7,SKY:1.5,ARCHIPELAGO:1.5,LANDING:3.95,DOOR:1.4,K7_EXIT:2.65};let holding=false;
 for(let i=0;i<450;i++){
  await sleep(85);const state=await ev('RavokArrival.snapshot()');
  if(report.phases.at(-1)?.id!==state.phase)report.phases.push({id:state.phase,elapsed:state.elapsed});
  assert.equal(state.ravokOutside,false);assert.equal(await ev('RavokEvent.ravokArrivalSeen'),false);
  if(targets[state.phase]!==undefined&&state.time>=targets[state.phase]&&!captured.has(state.phase)){
   await shot('arrival-'+state.phase.toLowerCase());captured.add(state.phase);
  }
  if(state.phase==='SPACE'&&state.time>1&&!captured.has('space-input')){await tap(' ');await key('keyDown',' ',true);await key('keyUp',' ');captured.add('space-input');assert.equal(await ev('RavokArrival.snapshot().phase'),'SPACE');}
  if(state.phase==='K7_EXIT'&&state.time>2.5&&!holding){await key('keyDown',' ');holding=true;}
  if(state.phase==='DIALOGUE')break;
 }
 assert.equal(await ev('RavokArrival.snapshot().phase'),'DIALOGUE');await sleep(1100);await key('keyDown',' ',true);
 assert.equal(await ev('RavokArrival.snapshot().line'),0);await key('keyUp',' ');await key('keyUp','w');
 report.frozen=await ev('({x:player.x,y:player.y,frame:arcoGame.roundFrame,keys:Object.values(keys).some(Boolean),scene:currentScene})');
 assert.equal(report.frozen.x,report.fourth.x);assert.equal(report.frozen.y,report.fourth.y);assert.equal(report.frozen.frame,report.fourth.frame);assert.equal(report.frozen.keys,false);
 for(let i=0;i<3;i++){
  const state=await ev('RavokArrival.snapshot()');assert.equal(state.line,i);report.dialogue.push(state.dialogue);
  await shot('arrival-dialogue-'+i);await sleep(500);await tap(' ');
 }
 assert.equal(await ev('RavokArrival.snapshot().phase'),'WITHDRAW');assert.equal(await ev('RavokEvent.ravokArrivalSeen'),false);
 report.phases.push({id:'WITHDRAW',elapsed:await ev('RavokArrival.snapshot().elapsed')});
 await shot('arrival-withdraw');
 for(let i=0;i<70&&await ev('RavokArrival.active');i++){
  await sleep(100);const s=await ev('RavokArrival.snapshot()');
  if(s.active&&report.phases.at(-1)?.id!==s.phase)report.phases.push({id:s.phase,elapsed:s.elapsed});
  if(s.phase==='FADE_BACK'&&s.time>.5&&!captured.has('FADE_BACK')){await shot('arrival-final-fade');captured.add('FADE_BACK');assert.equal(await ev('RavokEvent.ravokArrivalSeen'),false);}
 }
 report.durationWallSeconds=(Date.now()-started)/1000;report.after=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot(),scene:currentScene,saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey)),x:player.x,y:player.y})');
 assert.equal(report.after.arrival.active,false);assert.equal(report.after.arrival.completedRuns,1);assert.equal(report.after.saved.ravokArrivalSeen,true);assert.equal(report.after.saved.ravokArrivalPending,false);assert.equal(report.after.scene,'ILHA_ARCO');assert.deepEqual(report.after.event.npcs.map(n=>n.id),['k7']);await shot('arrival-return');
 // Real keyboard movement and collisions from the climbing island's entrance to K7.
 await place('ILHA_ESCALADA',225,262);
 const path=await ev(`(()=>{const start=[225,262],q=[start],parents=new Map([['225,262',null]]);let end;for(let i=0;i<q.length;i++){const p=q[i];if(Math.abs(p[0]-382)<=2&&Math.abs(p[1]-129)<=2){end=p;break;}for(const [dx,dy]of [[0,-1],[1,0],[-1,0],[0,1]]){const x=p[0]+dx,y=p[1]+dy,k=x+','+y;if(x<25||x>425||y<20||y>282||parents.has(k)||[-1.2,1.2].some(ox=>[-1.2,1.2].some(oy=>checkObstacleCollision(x+ox,y+oy))))continue;parents.set(k,p);q.push([x,y]);}}if(!end)return null;const path=[];for(let p=end;parents.get(p.join(','));p=parents.get(p.join(',')))path.unshift(p);const turns=[];let prev=start,last='';for(const p of path){const k=p[0]>prev[0]?'d':p[0]<prev[0]?'a':p[1]>prev[1]?'s':'w';if(last&&last!==k)turns.push({k:last,x:prev[0],y:prev[1]});last=k;prev=p;}turns.push({k:last,x:prev[0],y:prev[1]});return {steps:path.length,turns};})()`);
 assert.ok(path);for(const t of path.turns){const moving=ev(`new Promise(resolve=>{let f=0;function tick(){if(Math.abs(player.x-${t.x})<=1.11&&Math.abs(player.y-${t.y})<=1.11){keys['${t.k}']=false;resolve(true);}else if(++f>220){keys['${t.k}']=false;resolve(false);}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})`);await key('keyDown',t.k);assert.equal(await moving,true);await key('keyUp',t.k);}
 await sleep(150);assert.equal(await ev('overworldFocusNpc?.id'),'k7');await tap('e');report.k7Text=await ev('dialogText.textContent');assert.ok(!report.k7Text.includes('Ravok'));report.navigation=path;await shot('arrival-k7-permanent');
 await reload();await place('ILHA_ESCALADA',225,240);await sleep(350);
 report.reload=await ev('({arrival:RavokArrival.snapshot(),event:RavokEvent.snapshot()})');assert.equal(report.reload.arrival.active,false);assert.equal(report.reload.arrival.pending,false);assert.equal(report.reload.event.ravokArrivalSeen,true);assert.deepEqual(report.reload.event.npcs.map(n=>n.id),['k7']);
 await ev("desbloquearMedalha('skate')");await sleep(300);report.fifth=await ev('RavokArrival.snapshot()');assert.equal(report.fifth.active,false);assert.equal(report.fifth.pending,false);
 await ev("desbloquearMedalha('escalada');desbloquearMedalha('boxe');localStorage.setItem('zorpSurfCompleted','1');desbloquearMedalha('surf')");
 report.eight=await ev('RavokEvent.snapshot()');assert.equal(report.eight.medals,8);assert.deepEqual(report.eight.npcs.map(n=>n.id).sort(),['k7','ravok']);assert.equal(await ev('RavokArrival.active'),false);
 report.renderIssues=await ev('getOverworldDiagnostics().renderIssues');assert.equal(report.renderIssues.length,0);
 fs.writeFileSync(__dirname+'/browser-arrival-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({phases:report.phases.map(p=>p.id),duration:report.durationWallSeconds,dialogue:report.dialogue,completed:report.after.saved.ravokArrivalSeen,repeat:false,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
