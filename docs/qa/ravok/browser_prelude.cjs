const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9287/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,k,repeat=false)=>send('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k==='Enter'?'Enter':k==='Escape'?'Escape':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k===' '?32:k==='Enter'?13:k==='Escape'?27:k.toUpperCase().charCodeAt(0),autoRepeat:repeat});
 const tap=async k=>{await key('keyDown',k);await sleep(35);await key('keyUp',k);await sleep(100);};
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("document.readyState==='complete'&&typeof RavokEvent!=='undefined'&&typeof surfEndlessGame!=='undefined'&&RavokEvent.npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)"))return;}throw Error('load timeout');};
 const reload=async()=>{await send('Page.reload',{ignoreCache:true});await sleep(300);await ready();};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(r.data,'base64'));};
 const place=async(x,y)=>{await ev(`TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='ILHA_ESCALADA';player.x=${x};player.y=${y};for(const k of Object.keys(keys))keys[k]=false;`);await sleep(120);};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8807/index.html'});await ready();
 await ev("for(const k of ['zorp_ravok_event','zorp_esportes_medalhas','zorpSurfCompleted','zorpSurfMedal'])localStorage.removeItem(k)");await reload();
 // Award through the official API; player skill runs are outside this encounter QA.
 await ev("['pingpong','basquete','corrida','skate','arco','escalada','boxe'].forEach(id=>desbloquearMedalha(id))");await place(225,240);
 const report={lines:[],errors,httpErrors,failedRequests};report.seven=await ev('RavokEvent.snapshot()');
 assert.equal(report.seven.medals,7);assert.equal(report.seven.state,'LANDED');assert.deepEqual(report.seven.npcs.map(n=>n.id),['k7']);
 assert.equal(await ev("RavokEvent.interact(RavokEvent.npcs.find(n=>n.id==='ravok'))"),null);assert.equal(await ev('RavokEvent.conversationActive'),false);await shot('prelude-seven-medals');
 report.eighth=await ev("(()=>{const before=currentScene;localStorage.setItem('zorpSurfCompleted','1');desbloquearMedalha('surf');return {sceneBefore:before,sceneAfter:currentScene,event:RavokEvent.snapshot()};})()");
 assert.equal(report.eighth.sceneBefore,report.eighth.sceneAfter);assert.equal(report.eighth.event.state,'RAVOK_PRESENT');assert.deepEqual(report.eighth.event.npcs.map(n=>n.id).sort(),['k7','ravok']);assert.equal(report.eighth.event.conversation,null);await sleep(150);await shot('prelude-eight-medals');
 await place(368,128);assert.equal(await ev('overworldFocusNpc?.id'),'ravok');
 const before=await ev('({coins:FestivalWallet.coins,x:player.x,y:player.y})');
 await key('keyDown','e');await sleep(120);assert.equal(await ev('RavokEvent.dialogue().index'),0);assert.equal(await ev('RavokEvent.conversationActive'),true);
 for(let i=0;i<3;i++)await key('keyDown','e',true);await key('keyDown','w');await sleep(300);
 assert.equal(await ev('RavokEvent.dialogue().index'),0);assert.deepEqual(await ev('({x:player.x,y:player.y})'),{x:before.x,y:before.y});
 await key('keyUp','w');await key('keyUp','e');await shot('prelude-ravok-proposal');
 for(let i=0;i<9;i++){
  const line=await ev("({...RavokEvent.dialogue(),textWidth:dialogText.scrollWidth,boxWidth:dialogText.clientWidth,html:dialogText.textContent})");
  assert.equal(line.index,i);assert.ok(line.textWidth<=line.boxWidth+1,'dialogue overflow '+i);report.lines.push(line);
  assert.equal(await ev('RavokEvent.snapshot().preludeSeen'),false);
  if(i===3)await shot('prelude-zorpzin-objection');if(i===7)await shot('prelude-future-choice');
  if(i<8)await tap(['e',' ','Enter'][i%3]);
 }
 // Keep the last Space held: it must close, never instantly reopen the encounter.
 await key('keyDown',' ');await sleep(120);assert.equal(await ev('RavokEvent.conversationActive'),false);
 await key('keyDown',' ',true);await sleep(100);assert.equal(await ev('RavokEvent.conversationActive'),false);await key('keyUp',' ');
 report.completed=await ev("({event:RavokEvent.snapshot(),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey)),coins:FestivalWallet.coins,ending:EndingCinematic.active,vacation:CaptainRoute.active,scene:currentScene})");
 assert.equal(report.completed.event.preludeSeen,true);assert.equal(report.completed.saved.preludeSeen,true);assert.equal(report.completed.coins,before.coins);assert.equal(report.completed.ending,false);assert.equal(report.completed.vacation,false);assert.equal(report.completed.scene,'ILHA_ESCALADA');
 assert.equal(report.completed.saved.accepted,undefined);assert.equal(report.completed.saved.rejected,undefined);
 await tap('e');assert.equal(await ev('RavokEvent.dialogue().index'),0);await tap('Escape');assert.equal(await ev('RavokEvent.conversationActive'),false);
 await place(382,129);assert.equal(await ev('overworldFocusNpc?.id'),'k7');await tap('e');assert.match(await ev('dialogText.textContent'),/Ravok está esperando/);assert.equal(await ev('RavokEvent.conversationActive'),false);
 report.composition=await ev(`RavokEvent.npcs.map(n=>{const s=prepareOverworldNpc(n),b=overworldNpcDrawBounds(n,s.surface.width,s.surface.height,s.geometry);return {id:n.id,bounds:b,footprint:n.footprint,shipBlocksFeet:RavokEvent.blocks({x:n.x-9,y:n.y-6,w:18,h:8}),scaleX:b.width/s.surface.width,scaleY:b.height/s.surface.height};})`);
 const [a,b]=report.composition;assert.ok(a.bounds.x>=b.bounds.x+b.bounds.width||b.bounds.x>=a.bounds.x+a.bounds.width,'NPC sprites overlap');
 for(const n of report.composition){assert.equal(n.shipBlocksFeet,false);assert.ok(Math.abs(n.scaleX-n.scaleY)<1e-12);}
 await reload();report.afterReload=await ev('RavokEvent.snapshot()');assert.equal(report.afterReload.preludeSeen,true);assert.equal(report.afterReload.state,'RAVOK_PRESENT');assert.equal(report.afterReload.conversation,null);
 fs.writeFileSync(__dirname+'/browser-prelude-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({hiddenAtSeven:true,automaticAtEight:true,lines:report.lines.length,positionFrozen:true,k7Present:true,saveLoad:true,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
