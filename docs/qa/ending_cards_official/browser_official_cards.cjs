const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9297/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
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
 await send('Page.navigate',{url:'http://127.0.0.1:8817/index.html'});await ready();
 const report={errors,httpErrors,failedRequests,mode:'DEVELOPMENT_FORCE_CARD',cards:[]};
 for(const id of ['true_ending','ferias_merecidas','ravok_maior_conquista']){
  await ev(`localStorage.clear();localStorage.setItem('zorp_esportes_medalhas',JSON.stringify(Object.fromEntries(MEDALHAS_REGISTRY.map(m=>[m.id,true]))));localStorage.setItem('zorpSurfCompleted','1');localStorage.setItem('zorp_festival_wallet',JSON.stringify({version:3,coins:100,pagouCapitao:true,feriasVistas:false}));localStorage.setItem('zorp_festival_story',JSON.stringify({introSeen:true,homeCallSeen:true,allMedalsComplete:true,endingSeen:false}));localStorage.setItem('zorp_ravok_event',JSON.stringify({version:7,arrived:true,ravokArrivalSeen:true,ravokExited:true,ravokProposalSeen:true,ravokChoice:${id==='ravok_maior_conquista'?"'accept'":'null'},ravokBadEndingCardReady:${id==='ravok_maior_conquista'},ravokBadEndingSeen:false,ravokEndingCompleted:false}));`);
  await reload();await ev('EndingCard.assetsReady');
  await ev(`window.qaPortraitSources=[];window.qaPortraitRenders=[];window.qaSurfaces=new Map();window.qaOriginalDraw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...a){
   const image=a[0],source=image?.src||'',name=['zorp_finalpadrao.png','zorp_feriasmerecidas.png','card_zorp_MaiorConquista.png'].find(name=>source.includes(name));
   if(name){qaSurfaces.set(this.canvas,name);qaPortraitSources.push({name,source,args:a.slice(1),smooth:this.imageSmoothingEnabled});}
   if(qaSurfaces.has(image)&&qaPortraitRenders.length<2000)qaPortraitRenders.push({name:qaSurfaces.get(image),args:a.slice(1),smooth:this.imageSmoothingEnabled,scene:currentScene});
   return qaOriginalDraw.apply(this,a);
  };`);
  if(id==='true_ending')await ev(`TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;currentScene='FINAL_CUTSCENE';hideOverworldUI();EndingCinematic.active=true;EndingCinematic.state='HOME_FADE';EndingCinematic.finish();`);
  else if(id==='ferias_merecidas')await ev(`TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;currentScene='FERIAS_MERECIDAS';hideOverworldUI();CaptainRoute.active=true;CaptainRoute.state='FERIAS_MERECIDAS';CaptainRoute.scene='MONOLOGUE';CaptainRoute.showEndingCard();`);
  else await ev(`TitleScreen.active=false;RavokOutcome.openSavedEnding();`);
  await sleep(id==='ravok_maior_conquista'?2300:950);await shot(id);
  const data=await ev(`(()=>{
   const isRavok=${id==='ravok_maior_conquista'},state=isRavok?RavokBadEnding.snapshot():EndingCard.snapshot();
   const asset=isRavok?state.card:state.portrait;
   const surface=[...qaSurfaces.keys()][0],g=surface.getContext('2d'),a=g.getImageData(0,0,surface.width,surface.height).data;
   let whiteEdge=0,l=surface.width,t=surface.height,r=-1,b=-1;
   for(let y=0;y<surface.height;y++)for(let x=0;x<surface.width;x++){const i=(y*surface.width+x)*4;if(a[i+3]<=128)continue;
    l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
    if(Math.min(a[i],a[i+1],a[i+2])>230){let edge=false;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=surface.width||yy>=surface.height||a[(yy*surface.width+xx)*4+3]<32)edge=true;}if(edge)whiteEdge++;}
   }
   return {id:'${id}',state,asset,sources:qaPortraitSources,renders:qaPortraitRenders,cache:[surface.width,surface.height],visibleBounds:[l,t,r+1,b+1],whiteEdgePixels:whiteEdge,
    flags:{standard:AdventureIntro.endingSeen,vacation:FestivalWallet.feriasVistas,secret:RavokEvent.ravokBadEndingSeen},scene:currentScene};
  })()`);
  const filename=id==='true_ending'?'zorp_finalpadrao.png':id==='ferias_merecidas'?'zorp_feriasmerecidas.png':'card_zorp_MaiorConquista.png';
  assert.equal(data.asset.status,'ready');assert.ok(data.asset.source.startsWith(filename+'?'));assert.equal(data.sources.length,1);
  assert.ok(data.renders.length>0);assert.equal(data.whiteEdgePixels,0);
  assert.equal(data.sources[0].name,filename);assert.equal(data.sources[0].smooth,false);
  for(const draw of data.renders){assert.equal(draw.name,filename);assert.equal(draw.smooth,false);const [, ,w,h]=draw.args;assert.ok(Math.abs(w/data.cache[0]-h/data.cache[1])<1e-10);}
  if(id==='true_ending'){assert.equal(data.state.title,'DE VOLTA PARA CASA');assert.deepEqual(data.flags,{standard:true,vacation:false,secret:false});}
  else if(id==='ferias_merecidas'){assert.equal(data.state.title,'FÉRIAS MERECIDAS');assert.deepEqual(data.flags,{standard:false,vacation:true,secret:false});}
  else{assert.equal(data.state.card.title,'A MAIOR CONQUISTA');assert.deepEqual(data.flags,{standard:false,vacation:false,secret:false});}
  await tap(' ');if(id==='ravok_maior_conquista'){assert.equal(await ev('RavokOutcome.snapshot().phase'),'CARD_FADE_OUT');await sleep(1000);}
  assert.equal(await ev('currentScene'),'TITLE_SCREEN');
  data.after=await ev('({scene:currentScene,standard:AdventureIntro.endingSeen,vacation:FestivalWallet.feriasVistas,secret:RavokEvent.ravokBadEndingSeen,savedStory:JSON.parse(localStorage.getItem("zorp_festival_story")),savedWallet:JSON.parse(localStorage.getItem("zorp_festival_wallet")),savedRavok:JSON.parse(localStorage.getItem("zorp_ravok_event"))})');
  assert.equal(data.after.secret,id==='ravok_maior_conquista');report.cards.push(data);
 }
 fs.writeFileSync(__dirname+'/browser-official-ending-cards.json',JSON.stringify(report,null,2));
 assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({cards:report.cards.map(c=>({id:c.id,asset:c.asset.source,destination:c.asset.destination,whiteEdgePixels:c.whiteEdgePixels,menu:c.after.scene})),errors:errors.length,httpErrors:httpErrors.length,failedRequests:failedRequests.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
