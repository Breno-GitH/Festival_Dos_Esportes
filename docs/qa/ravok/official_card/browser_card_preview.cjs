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
 await send('Page.navigate',{url:'http://127.0.0.1:8815/index.html'});await ready();await seed(8,true);
 await ev(`const s=JSON.parse(localStorage.getItem(RavokEvent.storageKey));s.ravokChoice='accept';s.ravokBadEndingCardReady=true;localStorage.setItem(RavokEvent.storageKey,JSON.stringify(s));`);await reload();

 await ev(`window.qaCardSurfaces=[];window.qaCardCalls={source:[],render:[]};window.qaOriginalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(...a){
  const img=a[0];if(img?.src?.includes('card_zorp_MaiorConquista.png')){if(!qaCardSurfaces.includes(this.canvas))qaCardSurfaces.push(this.canvas);qaCardCalls.source.push({source:img.src,args:a.slice(1),smooth:this.imageSmoothingEnabled});}
  if(qaCardSurfaces.includes(img)&&qaCardCalls.render.length<600)qaCardCalls.render.push({args:a.slice(1),smooth:this.imageSmoothingEnabled,route:RavokOutcome.snapshot().route,phase:RavokOutcome.snapshot().phase});
  return qaOriginalDrawImage.apply(this,a);
 };`);

 await ev('TitleScreen.active=false;RavokOutcome.openSavedEnding()');await sleep(1500);await shot('official-card-preview');
 const report={errors,httpErrors,failedRequests};

 report.officialCard=await ev(`(()=>{
  const c=qaCardSurfaces[0],ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,r=-1,b=-1,whiteEdge=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i+3]>128){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);if(Math.min(d[i],d[i+1],d[i+2])>230){let edge=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=c.width||yy>=c.height||d[(yy*c.width+xx)*4+3]<32)edge=true;}if(edge)whiteEdge++;}}}
  return {asset:RavokBadEnding.snapshot().card,cacheSize:[c.width,c.height],visibleBounds:[l,t,r+1,b+1],whiteEdgePixels:whiteEdge,calls:qaCardCalls};})()`);
 assert.equal(report.officialCard.asset.status,'ready');assert.deepEqual(report.officialCard.asset.sourceRect,[892,141,179,217]);
 assert.equal(report.officialCard.calls.source.length,1);assert.equal(report.officialCard.whiteEdgePixels,0);
 assert.ok(report.officialCard.visibleBounds[0]>=4&&report.officialCard.visibleBounds[1]>=4&&report.officialCard.visibleBounds[2]<=175&&report.officialCard.visibleBounds[3]<=213);
 assert.ok(report.officialCard.calls.render.length>0);for(const c of report.officialCard.calls.render){assert.equal(c.smooth,false);assert.equal(c.route,'accept');assert.equal(c.phase,'CARD');assert.ok(Math.abs(c.args[2]/179-c.args[3]/217)<1e-12);}

 fs.writeFileSync(__dirname+'/card-preview-results.json',JSON.stringify(report,null,2));assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({asset:report.officialCard.asset,bounds:report.officialCard.visibleBounds,whiteEdgePixels:report.officialCard.whiteEdgePixels}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
