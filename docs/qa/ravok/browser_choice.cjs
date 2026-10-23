const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9291/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const key=(type,k,repeat=false)=>send('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k==='Enter'?'Enter':k==='Escape'?'Escape':k.startsWith('Arrow')?k:'Key'+k.toUpperCase(),windowsVirtualKeyCode:k===' '?32:k==='Enter'?13:k==='Escape'?27:k==='ArrowUp'?38:k==='ArrowDown'?40:k.toUpperCase().charCodeAt(0),autoRepeat:repeat});
 const tap=async k=>{await key('keyDown',k);await sleep(30);await key('keyUp',k);await sleep(70);};
 const ready=async()=>{for(let i=0;i<150;i++){await sleep(100);if(await ev("document.readyState==='complete'&&typeof surfEndlessGame!=='undefined'&&typeof RavokOutcome!=='undefined'&&RavokEvent.npcs.every(n=>n.img.complete&&n.img.naturalWidth>0)"))return;}throw Error('load timeout');};
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
 const read=async(capture=false)=>{
  const rows=[];for(let i=0;i<29;i++){
   const d=await ev('RavokEvent.dialogue()');assert.equal(d.type,'DIALOGUE');assert.equal(d.index,i);
   const sizes=await ev(`(()=>{const g=document.createElement('canvas').getContext('2d');g.font='10px monospace';const words=RavokEvent.dialogue().text.split(/\s+/),rows=[];let row='';for(const word of words){const n=row?row+' '+word:word;if(row&&g.measureText(n).width>390){rows.push(row);row=word;}else row=n;}if(row)rows.push(row);return rows.map(s=>g.measureText(s).width);})()`);
   assert.ok(sizes.length<=4&&sizes.every(w=>w<=390));rows.push({...d,rowWidths:sizes});
   assert.equal(await ev('RavokEvent.ravokChoice'),null);assert.equal(await ev('RavokEvent.endingCompleted'),false);
   if(capture&&[0,8,19,28].includes(i))await shot('proposal-line-'+i);await tap(' ');
  }assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');return rows;
 };
 const finishRoute=async route=>{
  const steps=[],shots=new Set(),targets={CONFRONTATION:1.2,DISARM:1.5,CUSTODY:1.7,RESOLVE:1.3,BOARD:1.6,LAUNCH:1.5,ORBIT:2.7,FADE:.6};
  for(let i=0;i<240;i++){
   await sleep(80);const s=await ev('RavokOutcome.snapshot()');assert.equal(s.route,route);
   if(steps.at(-1)?.phase!==s.phase)steps.push({phase:s.phase,time:s.time});
   if(s.phase==='CARD'){assert.equal(s.completed,true);await shot('outcome-'+route+'-card');return steps;}
   assert.equal(s.completed,false);assert.equal(await ev('RavokEvent.snapshot().ravokEndingCompleted'),false);
   if(targets[s.phase]!==undefined&&s.time>=targets[s.phase]&&!shots.has(s.phase)){await shot('outcome-'+route+'-'+s.phase.toLowerCase());shots.add(s.phase);}
  }throw Error('outcome timeout '+route);
 };
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8811/index.html'});await ready();
 const report={errors,httpErrors,failedRequests};await seed(7);await place('ILHA_ESCALADA',382,145);await sleep(400);
 report.seven=await ev('RavokEvent.snapshot()');assert.equal(report.seven.medals,7);assert.equal(report.seven.exit,null);assert.equal(report.seven.ravokAvailable,false);assert.equal(await ev("RavokEvent.interact(RavokEvent.npcs[1])"),null);await shot('proposal-seven-medals');
 await place();await ev("localStorage.setItem('zorpSurfCompleted','1');desbloquearMedalha('surf')");await sleep(100);
 assert.equal(await ev('RavokEvent.snapshot().medals'),8);assert.equal(await ev('RavokEvent.ravokExited'),false);assert.equal(await ev('RavokEvent.isNpcVisible(RavokEvent.npcs[1])'),false);
 report.pathToClearing=await walk(382,163);
 const starts=ev(`new Promise(resolve=>{let f=0;function tick(){if(RavokEvent.exitActive){keys.w=false;resolve(true);}else if(++f>100){keys.w=false;resolve(false);}else requestAnimationFrame(tick);}requestAnimationFrame(tick);})`);
 await key('keyDown','w');assert.equal(await starts,true);await key('keyUp','w');const frozen=await ev('({x:player.x,y:player.y})');
 const poses=[];let door=false,half=false;
 for(let i=0;i<75&&await ev('RavokEvent.exitActive');i++){
  await sleep(80);const s=await ev('RavokEvent.snapshot()');if(s.exit?.pose)poses.push(s.exit.pose);
  if(s.exit?.phase==='DOOR'&&s.exit.time>.3&&!door){await shot('proposal-door');door=true;}
  if(s.exit?.phase==='EXIT'&&s.exit.time>1&&!half){await shot('proposal-ravok-exiting');half=true;}
 }
 report.exit={frozen,after:await ev('({x:player.x,y:player.y})'),poses,event:await ev('RavokEvent.snapshot()')};assert.deepEqual(report.exit.after,frozen);assert.equal(report.exit.event.ravokExited,true);assert.ok(poses.some(p=>p.p>0&&p.p<1));assert.deepEqual(report.exit.event.npcs.map(n=>n.id).sort(),['k7','ravok']);await shot('proposal-ravok-outside');
 await walk(368,132);await sleep(100);assert.equal(await ev('overworldFocusNpc?.id'),'ravok');
 await key('keyDown','e');await sleep(80);await key('keyDown','e',true);await key('keyDown','w');await sleep(180);assert.equal(await ev('RavokEvent.dialogue().index'),0);await key('keyUp','w');await key('keyUp','e');
 report.lines=await read(true);assert.equal(await ev('RavokEvent.dialogue().selected'),1);await shot('proposal-choice-default');
 report.choiceTexts=await ev(`(()=>{const c=document.createElement('canvas');c.width=450;c.height=300;const g=c.getContext('2d'),texts=[];g.fillText=s=>texts.push(s);RavokEvent.drawOverlay(g);return texts;})()`);
 assert.ok(report.choiceTexts.every(s=>!(/GOOD|BAD|FINAL RUIM/i.test(s))));
 await tap('e');report.refusalCommitted=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot(),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');
 assert.equal(report.refusalCommitted.saved.ravokChoice,'refuse');assert.equal(report.refusalCommitted.saved.ravokEndingCompleted,false);assert.equal(report.refusalCommitted.outcome.phase,'CONFRONTATION');
 report.refusalPhases=await finishRoute('refuse');await sleep(900);await tap(' ');assert.equal(await ev('currentScene'),'TITLE_SCREEN');
 await reload();await place('ILHA_ESCALADA',225,240);await sleep(300);report.refusalReload=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot()})');assert.equal(report.refusalReload.event.ravokChoice,'refuse');assert.equal(report.refusalReload.event.ravokEndingCompleted,true);assert.equal(report.refusalReload.outcome.active,false);
 // Independent acceptance fixture; the completed exit is restored, never re-teleported.
 await seed(8,true);await place('ILHA_ESCALADA',368,132);await tap('e');await read();
 await tap('ArrowUp');assert.equal(await ev('RavokEvent.dialogue().selected'),0);await tap('ArrowDown');await tap('w');await key('keyDown',' ');await sleep(70);assert.equal(await ev('RavokEvent.dialogue().type'),'CONFIRM');assert.equal(await ev('RavokEvent.dialogue().selected'),1);
 for(let i=0;i<3;i++)await key('keyDown',' ',true);assert.equal(await ev('RavokEvent.ravokChoice'),null);await shot('proposal-confirmation');await key('keyUp',' ');
 await tap(' ');assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');assert.equal(await ev('RavokEvent.ravokChoice'),null);await tap('e');await tap('Escape');assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');await tap('e');await tap('w');await tap('e');
 report.acceptCommitted=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot(),saved:JSON.parse(localStorage.getItem(RavokEvent.storageKey))})');assert.equal(report.acceptCommitted.saved.ravokChoice,'accept');assert.equal(report.acceptCommitted.saved.ravokEndingCompleted,false);assert.equal(report.acceptCommitted.outcome.route,'accept');
 for(let i=0;i<35&&await ev("RavokOutcome.snapshot().phase!=='BOARD'");i++)await sleep(90);
 await reload();await place('HUB',225,194);await sleep(100);report.acceptResume=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot()})');assert.equal(report.acceptResume.outcome.active,true);assert.equal(report.acceptResume.outcome.route,'accept');assert.equal(report.acceptResume.event.ravokEndingCompleted,false);assert.deepEqual([report.acceptResume.outcome.origin.x,report.acceptResume.outcome.origin.y],report.acceptCommitted.saved.ravokChoicePosition);
 report.acceptPhases=await finishRoute('accept');await sleep(900);await tap(' ');assert.equal(await ev('currentScene'),'TITLE_SCREEN');await reload();await place('HUB',225,194);await sleep(250);
 report.acceptReload=await ev('({event:RavokEvent.snapshot(),outcome:RavokOutcome.snapshot()})');assert.equal(report.acceptReload.event.ravokChoice,'accept');assert.equal(report.acceptReload.event.ravokEndingCompleted,true);assert.equal(report.acceptReload.outcome.active,false);
 report.geometry=await ev(`RavokEvent.npcs.map(n=>{const s=prepareOverworldNpc(n),b=overworldNpcDrawBounds(n,s.surface.width,s.surface.height,s.geometry);return {id:n.id,source:n.img.src,crop:s.geometry.crop,scaleX:b.width/s.surface.width,scaleY:b.height/s.surface.height,valid:validateOverworldNpcGeometry(s.geometry,n.img),blockedFeet:RavokEvent.blocks({x:n.x-9,y:n.y-6,w:18,h:8})};})`);
 for(const g of report.geometry){assert.equal(g.valid.valid,true);assert.ok(Math.abs(g.scaleX-g.scaleY)<1e-12);assert.equal(g.blockedFeet,false);}
 report.renderIssues=await ev('getOverworldDiagnostics().renderIssues');assert.equal(report.renderIssues.length,0);
 fs.writeFileSync(__dirname+'/browser-choice-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({lines:report.lines.length,refuse:report.refusalPhases.map(p=>p.phase),accept:report.acceptPhases.map(p=>p.phase),doubleConfirmation:true,reload:true,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
