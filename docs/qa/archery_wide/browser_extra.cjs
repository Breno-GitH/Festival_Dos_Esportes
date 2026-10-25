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

 await send('Page.reload',{ignoreCache:true});await sleep(200);await ready();
 await ev("TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;currentScene='JOGO_ARCO';archeryQaParams.delete('archeryQaAuto');resetArco();beginArcoRound();arcoGame.roundFrame=3000;arcoGame.phase=3;arcoGame.pacing.phase=3;arcoGame.targets.length=0;arcoGame.pendingTargetSpawns.length=0;window.__originalArcheryMaster=updateArcoMaster;updateArcoMaster=()=>{arcoGame.mestreState='IDLE'};for(const key of Object.keys(keys))keys[key]=false;");
 const geometry=await ev(`(()=>{const bad=[];let samples=0;for(const band of ['NEAR','MID','FAR'])for(const path of ArcheryRiverTargets.PATHS)for(const entry of ['LEFT','RIGHT','TOP']){
  const t=ArcheryRiverTargets.create(ARCHERY_TARGET_TYPES.NORMAL_MEDIUM,{band,path,entry,exit:'RIGHT'});
  for(let i=0;i<=100;i++){const p=ArcheryRiverTargets.position(t,i/100);if(p.x<0||p.x>900||p.waterY<130)continue;samples++;if(!ArcheryValley.containsWater(p.x,p.waterY))bad.push({band,path,entry,...p});}}
  return {samples,bad:bad.slice(0,8),badCount:bad.length};})()`);
 await ev(`(()=>{for(let i=0;i<10;i++){
 const kind=i===8?'GOLD_FAST':i===3||i===6?'EXPLOSIVE':i%3===0?'NORMAL_LARGE':i%3===1?'NORMAL_MEDIUM':'NORMAL_SMALL';
 const t=ArcheryRiverTargets.create(ARCHERY_TARGET_TYPES[kind],{entry:i%2?'RIGHT':'LEFT',band:['NEAR','MID','FAR'][i%3],path:'S_CURVE',speed:i%3===0?'SLOW':i%3===1?'MEDIUM':'FAST'});
 t.id=arcoGame.nextTargetId++;t.type=kind;t.progress=.15+(i%5)*.07;ArcheryRiverTargets.step(t,0);arcoGame.targets.push(t);}
 for(let i=0;i<2;i++){const t=ArcheryBirdTargets.create(i*2);t.id=arcoGame.nextTargetId++;t.type='BIRD_TARGET';t.progress=.25+i*.25;ArcheryBirdTargets.step(t,0);arcoGame.targets.push(t);}})()`);
 const before=await ev('getArcoDiagnostics()');await shot('wide-load-12');
 const performance=await ev(`new Promise(resolve=>{const times=[];let peak=0,min=20;const tick=t=>{times.push(t);const n=arcoGame.targets.filter(t=>t.active&&!t.hit).length;peak=Math.max(peak,n);min=Math.min(min,n);if(times.length===181)return resolve({frames:180,fps:180000/(times.at(-1)-times[0]),minActive:min,peakActive:peak});requestAnimationFrame(tick);};requestAnimationFrame(tick);})`);
 const result={geometry,performance,before:{targets:before.targets,active:before.targetPaths.filter(t=>t.active).length},errors,httpErrors,failedRequests};
 fs.writeFileSync(__dirname+'/browser-extra.json',JSON.stringify(result,null,2));assert.equal(geometry.badCount,0);assert.equal(performance.minActive,12);assert.equal(errors.length,0);assert.equal(httpErrors.length,0);console.log(JSON.stringify({geometry,performance}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
