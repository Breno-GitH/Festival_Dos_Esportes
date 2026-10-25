const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9313/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],httpErrors=[],failedRequests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response);if(m.method==='Network.loadingFailed'&&!m.params.canceled)failedRequests.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async(expression,limit=15000)=>{for(let t=0;t<limit;t+=40){if(await ev(expression))return;await sleep(40);}throw Error('timeout '+expression);};
 const tap=async k=>{const code=k===' '?'Space':k==='Escape'?'Escape':k==='Enter'?'Enter':k.startsWith('Arrow')?k:'Key'+k.toUpperCase(),windowsVirtualKeyCode=k===' '?32:k==='Escape'?27:k==='Enter'?13:k==='ArrowUp'?38:k==='ArrowDown'?40:k.toUpperCase().charCodeAt(0);await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode});await sleep(30);await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode});await sleep(60);};
 const shot=async name=>{const data=await ev("canvas.toDataURL('image/png').split(',')[1]");fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(data,'base64'));};
 const ready=()=>until("document.readyState==='complete'&&typeof surfEndlessGame!=='undefined'&&typeof RavokK7Animation!=='undefined'&&RavokK7Animation.snapshot().ready",25000);
 const scene=()=>ev("TitleScreen.active=false;AdventureIntro.active=false;AdventureIntro.introSeen=true;AdventureIntro.homeCallSeen=true;MedalCompletion.active=false;currentScene='ILHA_ESCALADA';player.x=373;player.y=137;for(const k of Object.keys(keys))keys[k]=false;");
 const medals=n=>ev(`for(const id of Object.keys(rawInsignias))rawInsignias[id]=false;MEDALHAS_REGISTRY.slice(0,${n}).forEach(m=>rawInsignias[m.id]=true);RavokEvent.sync();`);
 const reload=async()=>{await send('Page.reload',{ignoreCache:true});await sleep(200);await ready();};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await ev("localStorage.clear()");await reload();await scene();
 const results={errors,httpErrors,failedRequests,directions:[],arrival:[],exit:[],accept:[],refuse:[]};
 const save=()=>fs.writeFileSync(__dirname+'/browser-results.json',JSON.stringify(results,null,2));
 // Instrument only the derived atlas; all production scene/animation timing stays real.
 await ev(`window.__walkDraws=[];window.__oldDrawImage=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(...args){if(args[0]?.src?.includes('ravok_k7_walk.png'))__walkDraws.push({smooth:this.imageSmoothingEnabled,args:args.slice(1),transform:[this.getTransform().a,this.getTransform().d]});return __oldDrawImage.apply(this,args);};`);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__walkDraws=[];const baseDraw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(args[0]?.src?.includes('ravok_k7_walk.png'))__walkDraws.push({smooth:this.imageSmoothingEnabled,args:args.slice(1),transform:[this.getTransform().a,this.getTransform().d]});return baseDraw.apply(this,args);};`});
 results.directions=await ev(`(()=>{const a=RavokK7Animation,all=[],board=document.createElement('canvas');board.width=640;board.height=400;const g=board.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#315448';g.fillRect(0,0,640,400);g.font='12px monospace';
 for(const [row,id]of ['ravok','k7'].entries())for(const [col,dir]of ['left','right','up','down'].entries()){
 const p=a.create(id,-200,-200),v=dir==='left'?[-16,0]:dir==='right'?[16,0]:dir==='up'?[0,-16]:[0,16],frames=new Set();
 for(let i=0;i<120;i++){a.update(p,...v,1/60);frames.add(p.frame);a.draw(g,p);}
 a.update(p,0,0,1/60);if(p.direction!==dir||p.state!=='IDLE')throw Error('idle direction');all.push({id,direction:dir,frames:[...frames],scaleX:p.scaleX,scaleY:p.scaleY,collider:a.collider(p)});
 for(let i=0;i<4;i++){const pose=a.path(id,[0,0],v,1,.15+i*.16);pose.x=col*160+25+i*37;pose.y=80+row*175;a.draw(g,pose);}const idle=a.idle(id,col*160+80,145+row*175,dir);a.draw(g,idle);g.fillStyle='#f4e5b4';g.fillText(id+' '+dir,col*160+8,22+row*175);}
 window.__walkBoard=board;return all;})()`);
 fs.writeFileSync(__dirname+'/walk-directions.png',Buffer.from(await ev("__walkBoard.toDataURL('image/png').split(',')[1]"),'base64'));
 for(const d of results.directions){assert.ok(d.frames.length>=4);assert.equal(d.scaleX,d.scaleY);assert.equal(d.collider.w,18);}
 await medals(3);assert.equal(await ev('RavokEvent.arrived'),false);
 await ev("desbloquearMedalha(MEDALHAS_REGISTRY[3].id)");await until('RavokArrival.active');console.log('Fourth-medal arrival started');
 await until("RavokArrival.snapshot().phase==='K7_EXIT'",35000);
 for(const t of [.25,.65,1.05,1.55,2.3]){await until(`RavokArrival.snapshot().time>=${t}`);const s=await ev('({scene:RavokArrival.snapshot(),animation:RavokK7Animation.snapshot()})');results.arrival.push(s);await shot('k7-exit-'+t);}
 assert.ok(new Set(results.arrival.map(s=>s.animation.actors.k7.frame)).size>=3);
 await until("RavokArrival.snapshot().phase==='DIALOGUE'");for(let i=0;i<3;i++){await sleep(500);await tap(' ');}
 await until('!RavokArrival.active');assert.equal(await ev('RavokEvent.ravokArrivalSeen'),true);await shot('arrival-complete');save();
 await medals(8);await scene();await until('RavokEvent.exitActive');await until("RavokEvent.snapshot().exit?.phase==='EXIT'");
 for(const t of [.25,.65,1.05,1.55]){await until(`RavokEvent.snapshot().exit?.time>=${t}`);results.exit.push(await ev('({event:RavokEvent.snapshot(),animation:RavokK7Animation.snapshot()})'));await shot('ravok-exit-'+t);}
 await until('RavokEvent.ravokExited');await shot('ravok-idle-after-exit');save();
 assert.ok(new Set(results.exit.map(s=>s.animation.actors.ravok.frame)).size>=3);
 // Use real dialogue and two-step confirmation; never skip essential arrival or exit shots.
 await ev("RavokEvent.interact(RavokEvent.npcs[1])");for(let i=0;i<29;i++)await tap(' ');
 assert.equal(await ev('RavokEvent.dialogue().type'),'CHOICE');await tap('ArrowUp');await tap(' ');assert.equal(await ev('RavokEvent.dialogue().type'),'CONFIRM');await tap('ArrowUp');await tap(' ');
 await until("RavokOutcome.snapshot().phase==='RAVOK_BOARD'");console.log('Acceptance boarding started');
 for(const t of [.3,.8,1.3,1.8,2.3,2.65]){await until(`RavokOutcome.snapshot().time>=${t}`);results.accept.push(await ev('({scene:RavokOutcome.snapshot(),animation:RavokK7Animation.snapshot()})'));await shot('accept-board-'+t);}
 await until("RavokOutcome.snapshot().phase==='CARD'",65000);await until('EndingCard.snapshot().presented');results.acceptCard=await ev('RavokOutcome.snapshot()');await sleep(1200);await tap(' ');await until("currentScene==='TITLE_SCREEN'");
 results.firstDraws=await ev('({count:__walkDraws.length,invalid:__walkDraws.filter(d=>d.smooth||d.args[6]/d.args[2]!==d.args[7]/d.args[3]||!Number.isInteger(d.args[4])||!Number.isInteger(d.args[5])).slice(0,3)})');assert.equal(results.firstDraws.invalid.length,0);save();
 // Refusal uses a separate isolated QA save at the completed arrival / eight-medal gate.
 await ev("localStorage.setItem('zorp_ravok_event',JSON.stringify({version:7,arrived:true,ravokArrivalSeen:true,ravokExited:true,ravokProposalSeen:true,ravokChoice:'refuse'}));localStorage.setItem('zorpSurfCompleted','1');salvarMedalhas(rawInsignias)");await reload();await scene();await until('RavokOutcome.active');console.log('Refusal route started');
 const phases=new Set(),captured=new Set();
 for(let i=0;i<1600;i++){
  const s=await ev('RavokOutcome.snapshot()');if(!s.active)break;phases.add(s.phase);
  if(['TURN_TO_SHIP','K7_EVIDENCE','RAVOK_ESCORT'].includes(s.phase)){
   const bucket=Math.floor(s.time*4),key=s.phase+'-'+bucket;
   if(!captured.has(key)){captured.add(key);results.refuse.push(await ev('({scene:RavokOutcome.snapshot(),animation:RavokK7Animation.snapshot()})'));if([2,5].includes(bucket))await shot('refuse-'+key);}
  }
  if(s.waitingForSpace&&s.time>=.5)await tap(' ');else await sleep(60);
 }
 results.refusalFinished=await ev('({scene:currentScene,event:RavokEvent.snapshot()})');assert.equal(results.refusalFinished.scene,'ILHA_ESCALADA');assert.equal(results.refusalFinished.event.ravokArrested,true);await shot('arrest-cleared');
 assert.ok(phases.has('RAVOK_ESCORT'));assert.ok(!phases.has('CARD'));
 results.draws=await ev('({count:__walkDraws.length,invalid:__walkDraws.filter(d=>d.smooth||d.args[6]/d.args[2]!==d.args[7]/d.args[3]||!Number.isInteger(d.args[4])||!Number.isInteger(d.args[5])).slice(0,3)})');
 assert.equal(results.draws.invalid.length,0);
 // Reload replaced the instrumentation; the per-pose records still report both constant scales.
 results.animation=await ev('RavokK7Animation.snapshot()');results.renderIssues=await ev('getOverworldDiagnostics().renderIssues');
 await reload();await scene();results.reload=await ev('RavokEvent.snapshot()');assert.equal(results.reload.ravokArrested,true);assert.equal(results.reload.npcs.length,0);
 fs.writeFileSync(__dirname+'/browser-results.json',JSON.stringify(results,null,2));
 assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);assert.equal(results.renderIssues.length,0);
 console.log(JSON.stringify({directions:results.directions.length,arrivalFrames:results.arrival.length,ravokExitFrames:results.exit.length,acceptanceFrames:results.accept.length,refusalFrames:results.refuse.length,errors:errors.length,httpErrors:httpErrors.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
