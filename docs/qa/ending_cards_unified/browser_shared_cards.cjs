const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9298/json')).json(),ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
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
 await send('Page.navigate',{url:'http://127.0.0.1:8818/index.html'});await ready();
 const report={errors,httpErrors,failedRequests,cards:[]};
 for(const id of ['true_ending','ferias_merecidas','ravok_maior_conquista']){
  await ev(`localStorage.clear();localStorage.setItem('zorp_esportes_medalhas',JSON.stringify(Object.fromEntries(MEDALHAS_REGISTRY.map(m=>[m.id,true]))));localStorage.setItem('zorpSurfCompleted','1');localStorage.setItem('zorp_festival_wallet',JSON.stringify({version:3,coins:100,pagouCapitao:true,feriasVistas:false}));localStorage.setItem('zorp_festival_story',JSON.stringify({introSeen:true,homeCallSeen:true,allMedalsComplete:true,endingSeen:false}));localStorage.setItem('zorp_ravok_event',JSON.stringify({version:7,arrived:true,ravokArrivalSeen:true,ravokExited:true,ravokProposalSeen:true,ravokChoice:${id==='ravok_maior_conquista'?"'accept'":'null'},ravokBadEndingCardReady:false,ravokBadEndingSeen:false,ravokEndingCompleted:false}));`);
  await reload();await ev('EndingCard.assetsReady');
  await ev(`window.qaPortraitSources=[];window.qaPortraitRenders=[];window.qaSurfaces=new Map();window.qaOriginalDraw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...a){
   const image=a[0],source=image?.src||'',name=['zorp_finalpadrao.png','zorp_feriasmerecidas.png','card_zorp_MaiorConquista.png'].find(name=>source.includes(name));
   if(name){qaSurfaces.set(this.canvas,name);qaPortraitSources.push({name,source,args:a.slice(1),smooth:this.imageSmoothingEnabled});}
   if(qaSurfaces.has(image)&&qaPortraitRenders.length<2000)qaPortraitRenders.push({name:qaSurfaces.get(image),args:a.slice(1),alpha:this.globalAlpha,smooth:this.imageSmoothingEnabled,scene:currentScene,state:EndingCard.snapshot().state});
   return qaOriginalDraw.apply(this,a);
  };`);
  if(id==='true_ending'){
   await ev(`TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;currentScene='FINAL_CUTSCENE';hideOverworldUI();`);
   await key('keyDown',' ');await ev(`EndingCinematic.active=true;EndingCinematic.state='HOME_FADE';EndingCinematic.finish();`);
  }else if(id==='ferias_merecidas'){
   await ev(`TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;currentScene='FERIAS_MERECIDAS';hideOverworldUI();CaptainRoute.active=true;CaptainRoute.state='FERIAS_MERECIDAS';CaptainRoute.scene='MONOLOGUE';`);
   await key('keyDown',' ');
  }else{
   await ev(`TitleScreen.active=false;RavokOutcome.openSavedEnding();`);
   const phases=[],started=Date.now();let held=false;
   for(let n=0;n<1300;n++){
    const s=await ev('({outcome:RavokOutcome.snapshot(),card:EndingCard.snapshot(),seen:RavokEvent.ravokBadEndingSeen})');
    assert.equal(s.seen,false);if(phases.at(-1)!==s.outcome.phase)phases.push(s.outcome.phase);
    if(s.outcome.phase==='FADE'&&!held){await key('keyDown',' ');held=true;}
    if(s.card.active)break;await sleep(55);
   }
   report.secretFilm={phases,duration:(Date.now()-started)/1000};assert.ok(phases.includes('BLACK_INTERVAL'));
  }
  const stages=[],captured=new Set();let readyCard=false;
  for(let n=0;n<150;n++){
   const c=await ev('EndingCard.snapshot()');assert.equal(c.id,id);
   if(stages.at(-1)!==c.state)stages.push(c.state);
   if(c.state==='BLACK_PAUSE'&&!captured.has(c.state)){
    captured.add(c.state);await shot(id+'-black-pause');
    assert.equal(await ev(`(()=>{const a=ctx.getImageData(0,0,450,300).data;for(let i=0;i<a.length;i+=4)if(a[i]||a[i+1]||a[i+2])return false;return true;})()`),true);
   }
   if(c.state==='REVEAL'&&c.elapsed>=.2&&!captured.has('PORTRAIT')){captured.add('PORTRAIT');await shot(id+'-portrait-first');}
   if(c.state==='READY'&&c.presented){readyCard=true;break;}await sleep(40);
  }
  assert.ok(readyCard);for(const phase of ['FADE_TO_BLACK','BLACK_PAUSE','BACKGROUND','REVEAL','READY'])assert.ok(stages.includes(phase),id+': '+stages);
  await key('keyDown',' ',true);await sleep(150);assert.equal(await ev('EndingCard.snapshot().state'),'READY');
  await shot(id);await key('keyUp',' ');
  const data=await ev(`(()=>{
   const state=EndingCard.snapshot(),surface=[...qaSurfaces.keys()][0],g=surface.getContext('2d'),a=g.getImageData(0,0,surface.width,surface.height).data;
   let whiteEdge=0;for(let y=0;y<surface.height;y++)for(let x=0;x<surface.width;x++){const i=(y*surface.width+x)*4;if(a[i+3]<=128||Math.min(a[i],a[i+1],a[i+2])<=230)continue;let edge=false;for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=surface.width||yy>=surface.height||a[(yy*surface.width+xx)*4+3]<32)edge=true;}if(edge)whiteEdge++;}
   const c=document.createElement('canvas');c.width=450;c.height=300;const paint=c.getContext('2d'),text=[],old=paint.fillText.bind(paint);paint.fillText=(value,x,y)=>{text.push({value,x,y,width:paint.measureText(value).width,alpha:paint.globalAlpha});old(value,x,y);};EndingCard.preview(paint,'${id}',2);
   return {id:'${id}',state,sources:qaPortraitSources,renders:qaPortraitRenders,cache:[surface.width,surface.height],whiteEdgePixels:whiteEdge,text,
    flags:{standard:AdventureIntro.endingSeen,vacation:FestivalWallet.feriasVistas,secret:RavokEvent.ravokBadEndingSeen}};
  })()`);
  data.stages=stages;data.carriedSpaceIgnored=true;
  const filename=id==='true_ending'?'zorp_finalpadrao.png':id==='ferias_merecidas'?'zorp_feriasmerecidas.png':'card_zorp_MaiorConquista.png';
  assert.equal(data.state.portrait.status,'ready');assert.ok(data.state.portrait.source.startsWith(filename+'?'));assert.equal(data.sources.length,1);
  assert.equal(data.whiteEdgePixels,0);assert.ok(data.renders.length>0);assert.equal(data.sources[0].name,filename);assert.equal(data.sources[0].smooth,false);
  for(const draw of data.renders){assert.equal(draw.name,filename);assert.equal(draw.smooth,false);const [, ,w,h]=draw.args;assert.ok(Math.abs(w/data.cache[0]-h/data.cache[1])<1e-10);}
  assert.ok(data.text.every(t=>t.y<=280&&t.width<=374));assert.ok(data.text.some(t=>t.value==='[SPACE] CONTINUAR'));
  if(id==='true_ending')assert.deepEqual(data.flags,{standard:true,vacation:false,secret:false});
  else if(id==='ferias_merecidas')assert.deepEqual(data.flags,{standard:false,vacation:true,secret:false});
  else{
   assert.deepEqual(data.flags,{standard:false,vacation:false,secret:false});
   // A write error must keep the shared card visible, with a fresh retry input.
   await ev(`window.qaStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='zorp_ravok_event')throw Error('QA quota');return qaStorageSet.call(this,k,v);};`);
   await tap(' ');assert.equal(await ev('EndingCard.snapshot().state'),'READY');assert.equal(await ev('RavokEvent.ravokBadEndingSeen'),false);
   assert.ok(await ev('EndingCard.snapshot().error'));await shot('secret-save-retry');
   await ev('Storage.prototype.setItem=qaStorageSet;');data.saveRetry=true;
  }
  await key('keyDown',' ');await sleep(70);assert.equal(await ev('EndingCard.snapshot().state'),'FADE_OUT');assert.notEqual(await ev('currentScene'),'TITLE_SCREEN');
  await key('keyDown',' ',true);await key('keyUp',' ');await sleep(250);await shot(id+'-exit-fade');assert.notEqual(await ev('currentScene'),'TITLE_SCREEN');
  await sleep(850);assert.equal(await ev('currentScene'),'TITLE_SCREEN');data.menu=true;
  data.after=await ev('({standard:AdventureIntro.endingSeen,vacation:FestivalWallet.feriasVistas,secret:RavokEvent.ravokBadEndingSeen,savedStory:JSON.parse(localStorage.getItem("zorp_festival_story")),savedWallet:JSON.parse(localStorage.getItem("zorp_festival_wallet")),savedRavok:JSON.parse(localStorage.getItem("zorp_ravok_event"))})');
  assert.equal(data.after.secret,id==='ravok_maior_conquista');report.cards.push(data);
 }
 // Completed acceptance still resumes its own shared card after reload; it cannot re-open the Overworld.
 await reload();await sleep(600);await tap('Enter');await sleep(2800);
 report.secretReload=await ev('({card:EndingCard.snapshot(),scene:currentScene,seen:RavokEvent.ravokBadEndingSeen})');
 assert.equal(report.secretReload.card.id,'ravok_maior_conquista');assert.equal(report.secretReload.card.state,'READY');assert.equal(report.secretReload.seen,true);assert.equal(report.secretReload.scene,'RAVOK_SECRET_CUTSCENE');
 await tap(' ');await sleep(950);assert.equal(await ev('currentScene'),'TITLE_SCREEN');
 fs.writeFileSync(__dirname+'/browser-shared-ending-cards.json',JSON.stringify(report,null,2));
 assert.equal(errors.length,0);assert.equal(httpErrors.length,0);assert.equal(failedRequests.length,0);
 console.log(JSON.stringify({cards:report.cards.map(c=>({id:c.id,stages:c.stages,asset:c.state.portrait.source,destination:c.state.portrait.destination,menu:c.menu})),secretFilm:report.secretFilm,secretReload:true,errors:errors.length,httpErrors:httpErrors.length,failedRequests:failedRequests.length}));ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;setTimeout(()=>process.exit(1),500);});
