const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9286/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("document.readyState==='complete'&&typeof RavokEvent!=='undefined'&&typeof surfEndlessGame!=='undefined'"))return;}throw Error('load timeout');};
 const reload=async()=>{await send('Page.reload',{ignoreCache:true});await sleep(300);await ready();};
 const key=(type,k)=>send('Input.dispatchKeyEvent',{type,key:k==='space'?' ':k,code:k==='space'?'Space':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k==='space'?32:k.toUpperCase().charCodeAt(0)});
 const tap=async k=>{await key('keyDown',k);await sleep(35);await key('keyUp',k);await sleep(100);};
 const enterClimb=async()=>{
  await ev("TitleScreen.active=false;AdventureIntro.introSeen=true;AdventureIntro.active=false;currentScene='ILHA_ARCO';player.x=225;player.y=12;for(const k of Object.keys(keys))keys[k]=false;");
  const crossing=ev("new Promise(resolve=>{let frames=0;const tick=()=>{if(currentScene==='ILHA_ESCALADA'||++frames>240){keys.w=false;return resolve(currentScene);}requestAnimationFrame(tick);};requestAnimationFrame(tick);})");
  await key('keyDown','w');await crossing;await key('keyUp','w');
  assert.equal(await ev('currentScene'),'ILHA_ESCALADA');return ev('RavokEvent.snapshot()');
 };
 const nearK7=async()=>{await ev("currentScene='ILHA_ESCALADA';player.x=382;player.y=129;for(const k of Object.keys(keys))keys[k]=false;");await sleep(100);assert.equal(await ev('overworldFocusNpc?.id'),'k7');};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8806/index.html'});await ready();
 // Only this isolated profile/origin is reset; the user's XAMPP save is untouched.
 await ev("for(const k of ['zorp_ravok_event','zorp_esportes_medalhas','zorpSurfCompleted','zorpSurfMedal'])localStorage.removeItem(k)");await reload();
 const report={beforeFour:[],dialogues:[],errors,httpErrors,failedRequests};
 report.beforeFour.push(await ev('RavokEvent.snapshot()'));assert.equal(report.beforeFour[0].state,'DORMANT');
 await reload();assert.equal(await ev('RavokEvent.snapshot().arrived'),false);
 await ev("['pingpong','basquete','corrida'].forEach(id=>desbloquearMedalha(id))");
 assert.equal(await ev('RavokEvent.snapshot().medals'),3);assert.equal(await ev('RavokEvent.snapshot().arrived'),false);
 await reload();report.beforeFour.push(await ev('RavokEvent.snapshot()'));assert.equal(report.beforeFour[1].medals,3);assert.equal(report.beforeFour[1].state,'DORMANT');assert.equal(report.beforeFour[1].npcs.length,0);
 await ev("currentScene='JOGO_ARCO';TitleScreen.active=true;");
 // Both snapshots occur in one JS turn: no Overworld polling can explain the arrival.
 report.fourth=await ev("(()=>{const before=RavokEvent.snapshot();desbloquearMedalha('skate');return {before,after:RavokEvent.snapshot(),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey)),scene:currentScene};})()");
 assert.equal(report.fourth.before.arrived,false);assert.equal(report.fourth.after.medals,4);assert.equal(report.fourth.after.state,'LANDED');assert.equal(report.fourth.saved.arrived,true);assert.equal(report.fourth.scene,'JOGO_ARCO');assert.deepEqual(report.fourth.after.npcs.map(n=>n.id),['k7']);
 report.firstReturn=await enterClimb();assert.equal(report.firstReturn.state,'LANDED');
 fs.writeFileSync(__dirname+'/progression-fourth-insignia.png',Buffer.from(await ev("canvas.toDataURL('image/png').split(',')[1]"),'base64'));
 await nearK7();for(let i=0;i<3;i++){await tap('e');report.dialogues.push(await ev('dialogText.textContent'));}
 const stored=await ev("JSON.parse(localStorage.getItem(RavokEvent.storageKey))");assert.equal(stored.k7Line,3);assert.equal(stored.metK7,true);
 await reload();report.afterReload=await ev('RavokEvent.snapshot()');assert.equal(report.afterReload.medals,4);assert.equal(report.afterReload.arrived,true);assert.equal(report.afterReload.state,'LANDED');assert.equal(report.afterReload.k7Line,3);assert.equal(report.afterReload.metK7,true);
 report.secondReturn=await enterClimb();await nearK7();await tap('space');report.dialogues.push(await ev('dialogText.textContent'));
 assert.deepEqual(report.dialogues,['> K7: Não me atrapalhe.','> K7: Ainda não é hora.','> K7: Volte para o nosso planeta.','> K7: Você não vai querer ver o que vem.']);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(__dirname+'/progression-k7-mystery.png',Buffer.from(shot.data,'base64'));
 const savedBefore=await ev('localStorage.getItem(RavokEvent.storageKey)');await ev("desbloquearMedalha('arco');desbloquearMedalha('skate')");
 assert.equal(await ev('localStorage.getItem(RavokEvent.storageKey)'),savedBefore);
 report.final=await ev("({event:RavokEvent.snapshot(),instances:npcs.filter(n=>n.eventId==='ravok').map(n=>n.id),coins:FestivalWallet.coins,scene:currentScene,cinematic:EndingCinematic.active,captain:CaptainRoute.active,renderIssues:getOverworldDiagnostics().renderIssues})");
 assert.equal(report.final.event.medals,5);assert.equal(report.final.event.state,'LANDED');assert.equal(report.final.event.ravokAvailable,false);assert.deepEqual(report.final.instances,['k7','ravok']);assert.equal(report.final.cinematic,false);assert.equal(report.final.captain,false);assert.equal(report.final.renderIssues.length,0);
 fs.writeFileSync(__dirname+'/browser-progression-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({savesBelowFour:'0 and 3 passed',exactFourth:true,returnVisits:2,persistent:true,dialogues:4,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
