const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const b=await require('./browser_lib.cjs')(),{ev,tap,shot}=b,out={checks:[],islands:[],errors:b.errors,http:b.http,failed:b.failed};
 const pass=name=>{out.checks.push(name);console.log('PASS '+name);fs.writeFileSync(__dirname+'/browser-qa.json',JSON.stringify(out,null,2));};
 await b.init(true);
 await ev(`window.qaPlace=(scene,x=225,y=245)=>{normalNpcDialogue=null;overworldConversationNpc=null;overworldConversationText=null;overworldFocusNpc=null;interactionPressed=false;shipInteractionPressed=false;PreGameBrief.state='CLOSED';for(const k of Object.keys(keys))keys[k]=false;currentScene=scene;player.x=x;player.y=y;ArcheryField.syncCanvas(canvas,scene);};`);
 await ev(`window.qaWalkToNpc=id=>{
  const n=npcs.find(n=>n.id===id),step=4,cols=113,rows=76,free=new Uint8Array(cols*rows),sx=Math.round(player.x/step),sy=Math.round(player.y/step);
  for(let y=4;y<70;y++)for(let x=4;x<109;x++)free[y*cols+x]=[[0,0],[-3,0],[3,0],[0,-3],[0,3]].every(([dx,dy])=>!checkObstacleCollision(x*step+dx,y*step+dy));
  const start=sy*cols+sx,prev=new Int32Array(free.length).fill(-1),q=[start];prev[start]=start;
  let goal=-1;
  for(let k=0;k<q.length;k++){
   const i=q[k],x=i%cols,y=Math.floor(i/cols),px=x*step,py=y*step;
   const save={x:player.x,y:player.y};player.x=px;player.y=py;
   const closest=npcs.filter(o=>o.scene===currentScene&&RavokEvent.isNpcVisible(o)&&isColliding(player,overworldNpcInteractionBox(o))).sort((a,b)=>Math.hypot(px-a.x,py-a.y)-Math.hypot(px-b.x,py-b.y))[0];
   const box=overworldNpcInteractionBox(n),close=closest===n&&isColliding(player,box)&&Math.hypot(px-n.x,py-n.y)<30;
   player.x=save.x;player.y=save.y;
   if(close&&py>=n.y+12){goal=i;break;}
   for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*cols+xx;if(xx<0||xx>=cols||yy<0||yy>=rows||!free[j]||prev[j]!==-1)continue;prev[j]=i;q.push(j);}
  }
  if(goal<0)return {ok:false,id,reason:'no navigable interaction point'};
  const path=[];for(let i=goal;i!==start;i=prev[i])path.push([i%cols*step,Math.floor(i/cols)*step]);path.reverse();
  for(const [tx,ty]of path)for(let k=0;k<15;k++){
   const dx=tx-player.x,dy=ty-player.y;if(Math.abs(dx)<=2.4&&Math.abs(dy)<=2.4)break;
   keys.a=dx< -2.4;keys.d=dx>2.4;keys.w=Math.abs(dx)<=2.4&&dy< -2.4;keys.s=Math.abs(dx)<=2.4&&dy>2.4;qaOriginalUpdate();
  }
  for(const k of ['a','d','w','s'])keys[k]=false;qaOriginalUpdate();
  return {ok:overworldFocusNpc?.id===id,id,focus:overworldFocusNpc?.id,steps:path.length,x:player.x,y:player.y,prompt:dialogBox.innerText};
 };`);
 const entries={ILHA_PINGPONG:[36,148],ILHA_BASQUETE:[36,148],ILHA_CORRIDA:[408,148],ILHA_SKATE:[224,40],ILHA_ARCO:[408,148],ILHA_SURF:[224,256],ILHA_ESCALADA:[224,256],ILHA_ESQUI:[224,256]};
 for(const [scene,[x,y]] of Object.entries(entries)){
  await ev(`qaPlace('${scene}',${x},${y})`);
  const ids=await ev('npcs.filter(n=>n.scene===currentScene&&RavokEvent.isNpcVisible(n)).map(n=>({id:n.id,master:!!n.isMaster,normal:!!n.normalIslandNpc}))');
  const record={scene,npcs:ids,walks:[]};
  for(const n of ids){
   await ev(`qaPlace('${scene}',${x},${y})`);
   const walk=await ev(`qaWalkToNpc('${n.id}')`);record.walks.push(walk);assert.ok(walk.ok,JSON.stringify(walk));
   if(!n.master){
    await tap('e');const before=await ev('({x:player.x,y:player.y,text:dialogText.innerText,locked:!!normalNpcDialogue})');assert.ok(before.text.length>12);
    if(n.id!=='capitao'){
     assert.ok(before.locked);await ev('keys.e=true;for(let i=0;i<6;i++)qaOriginalUpdate();keys.e=false;');assert.equal(await ev('normalNpcDialogue'),n.id);await b.key('keyDown','d');await ev('for(let i=0;i<6;i++)qaOriginalUpdate()');await b.key('keyUp','d');assert.deepEqual(await ev('({x:player.x,y:player.y})'),{x:before.x,y:before.y});await tap(' ');assert.equal(await ev('normalNpcDialogue'),null);
    }
   }
  }
  await ev(`qaPlace('${scene}',225,245)`);await shot('npcs-'+scene);out.islands.push(record);pass(scene+' NPCs, approach, collision and dialogue');
 }
 // Existing masters still open their actual briefing; Escape returns normally.
 for(const [scene,[x,y]] of Object.entries(entries)){
  await ev(`qaPlace('${scene}',${x},${y})`);const id=await ev('npcs.find(n=>n.scene===currentScene&&n.isMaster).id');assert.ok((await ev(`qaWalkToNpc('${id}')`)).ok);await tap('e');assert.ok(await ev('PreGameBrief.active'));assert.ok((await ev('currentScene')).startsWith('JOGO_'));await tap('Escape');await ev('PreGameBrief.update(.2)');assert.equal(await ev('currentScene'),scene);pass(scene+' Master briefing and return');
 }
 // Real hoop collision creates a 3-pointer with eight seconds remaining.
 const balance=await ev('FestivalWallet.coins');await ev(`qaPlace(BASKETBALL_SCENE);resetBasketball1v1(false);basketball1v1.phase='PLAYING';basketball1v1.clock=8;basketball1v1.releaseBall(basketball1v1.player,'SHOT');const h=basketball1v1.hoops.right;Object.assign(basketball1v1.ball,{x:h.rimX,y:h.rimY-43.4,vx:0,vy:1,target:'right',points:3,pickupLock:600,scoreResetTimer:0});BasketballHoopPhysics.resetShot(basketball1v1.ball);for(let i=0;i<40&&!FestivalChallenges.state('basket').completed;i++)basketball1v1.updateBall(1);`);
 assert.equal(await ev("FestivalChallenges.state('basket').completed"),true);assert.equal(await ev('FestivalWallet.coins'),balance);out.basket=await ev("({state:FestivalChallenges.state('basket'),score:basketball1v1.score})");pass('Photo completed by real scored 3-pointer, no auto coins');
 // Ordered physical lap gates on the actual track; no distance-only quest signal.
 await ev(`qaPlace('JOGO_CORRIDA');corridaMaratona.reset();window.qaRaceTravel=()=>{const g=corridaMaratona,r=g.player,t=g.track;let prev=t.pointOffset(-8,0);r.x=prev.x;r.y=prev.y;for(let s=0;s<=t.length+8;s+=8){const p=t.pointOffset(s,0);r.prevX=r.x;r.prevY=r.y;r.x=p.x;r.y=p.y;g.updateRunnerProgress(r,s/200,.05);}return {lap:r.validatedLaps,cp:r.checkpointProgress,events:g.lapSystem.events};};qaRaceTravel();`);
 assert.equal(await ev("FestivalChallenges.state('running').completed"),true);out.running=await ev("({state:FestivalChallenges.state('running'),lap:corridaMaratona.player.validatedLaps})");pass('Clean lap completed through START, CP1/CP2/CP3 and physical FINISH');
 // Direct swept collisions against the hanging disks. No bird-body collider or blast credit.
 await ev(`qaPlace('JOGO_ARCO');resetArco();beginArcoRound();for(let i=0;i<3;i++){arcoGame.targets.length=0;arcoGame.arrows.length=0;const t=ArcheryBirdTargets.create(i);Object.assign(t,{id:'quest-bird-'+i,x:225,y:170,prevX:225,previousX:225,prevY:170,previousY:170,active:true,visible:true});arcoGame.targets.push(t);const a={owner:'PLAYER',x:225,y:190,prevX:225,prevY:190,speedX:0,speedY:-100,state:'ACTIVE'};FestivalChallenges.onArcheryShot(a,arcoGame.targets);arcoGame.arrows.push(a);updateArcoArrows(1/60);}`);
 assert.equal(await ev("FestivalChallenges.state('archery').completed"),true);out.archery=await ev("({state:FestivalChallenges.state('archery'),hits:arcoGame.stats.birdHits.PLAYER})");pass('Three direct disk hits use real swept collision; birds remain unharmed');
 // Surf threshold is sampled by the real update, immediately after chaser/tube resolution.
 await ev(`qaPlace('JOGO_SURF');surfEndlessGame.reset(false);surfEndlessGame.distance=60000;window.qaSurfTarget=Number(surfEndlessGame.diagnostics().story.target);surfEndlessGame.distance=qaSurfTarget*.60;surfEndlessGame.chaseGap=72;surfEndlessGame.update();`);
 assert.equal(await ev("FestivalChallenges.state('surf').completed"),true);out.surf=await ev("({state:FestivalChallenges.state('surf'),target:qaSurfTarget,distance:surfEndlessGame.distance})");pass('Surf real update at 60% without capture');
 // Skate fixture feeds actual grind travel and a real trick completion into a physical touchdown.
 out.skate=await ev(`(()=>{
  qaPlace('JOGO_SKATE');skatePlaytestTimeMs=1000;resetSkateGame();
  const p=skateOllieSimulation.state.player;Object.assign(p,{x:1120,y:190,grounded:false,verticalVelocity:70,forwardSpeed:340,jumpTier:'normal',rampRide:null});skateTraversal.mode='AIR';skateOllieInput.held=true;
  const trace=[];let released=false,trick=false;
  for(let i=0;i<480&&skateOllieSimulation.state.phase==='PLAYING'&&!FestivalChallenges.state('skate').completed;i++){
   if(!released&&FestivalChallenges.progress('skate').grindDistance>=24){skateOllieInput.held=false;skateOllieInput.released=true;released=true;}
   if(released&&!trick&&skateTrickSystem.airborne&&!p.grounded){skateTrickSystem.queueSequence('T');trick=true;}
   skatePlaytestTimeMs+=1000/60;updateSkateGame();
   if(i%10===0)trace.push({i,x:p.x,y:p.y,phase:skateOllieSimulation.state.phase,ground:p.grounded,mode:skateTraversal.mode,trick:skateTrickSystem.lastResult});
  }
  return {quest:FestivalChallenges.state('skate'),trace};
 })()`);
 assert.equal(out.skate.quest.completed,true);assert.equal(out.skate.quest.evidence.quality,'PERFECT');pass('Skate actual capture, grind travel, Super Jump Out, trick and safe physical landing');
 assert.equal(await ev('FestivalWallet.coins'),balance);
 const placeFn=await ev('qaPlace.toString()'),walkFn=await ev('qaWalkToNpc.toString()');
 await b.init(false);await ev(`window.qaPlace=${placeFn};window.qaWalkToNpc=${walkFn};`);
 for(const type of ['basket','running','skate','archery','surf'])assert.deepEqual(await ev(`({completed:FestivalChallenges.state('${type}').completed,claimed:FestivalChallenges.state('${type}').claimed})`),{completed:true,claimed:false});
 assert.equal(await ev('FestivalWallet.coins'),balance);
 assert.equal(await ev('[sideQuestBasketPhotoComplete,sideQuestRunningCleanLapComplete,sideQuestSkateOneTakeComplete,sideQuestArcheryWindComplete,sideQuestSurfCurrentComplete].every(Boolean)'),true);pass('All five objectives survive reload, unpaid; public completion flags match save');
 for(const [type,scene,id,amount] of [['basket','ILHA_BASQUETE','fotografa_basquete',30],['running','ILHA_CORRIDA','treinador_corrida',25],['skate','ILHA_SKATE','cinegrafista_skate',30],['archery','ILHA_ARCO','naturalista_arco',30],['surf','ILHA_SURF','salva_vidas_surf',30]]){
  const before=await ev('FestivalWallet.coins'),[x,y]=entries[scene];await ev(`qaPlace('${scene}',${x},${y})`);assert.ok((await ev(`qaWalkToNpc('${id}')`)).ok);await tap('e');assert.equal(await ev('FestivalWallet.coins'),before+amount);assert.equal(await ev(`FestivalChallenges.state('${type}').claimed`),true);await tap('e');await tap('e');assert.equal(await ev('FestivalWallet.coins'),before+amount);await tap(' ');pass(type+' return to owner pays exactly once');
 }
 // The three existing owners and their requirements/rewards remain unchanged.
 await ev(`insignias.pingpong=true;insignias.escalada=true;qaPlace('JOGO_BOXE');resetBoxe(true);boxeGame.rounds.wins.zorp=2;boxeGame.player.knockdowns=0;boxingFinalizeMatch();`);
 assert.equal(await ev("FestivalWallet.getChallenge('boxe_sem_quedas').completed"),true);assert.equal(await ev("FestivalWallet.getChallenge('boxe_sem_quedas').claimed"),false);
 for(const [scene,id,amount] of [['ILHA_PINGPONG','aprendiz_pingpong',25],['ILHA_ESCALADA','geologa_escalada',25],['ILHA_ESQUI','pugilista_apostador',40]]){
  const before=await ev('FestivalWallet.coins'),[x,y]=entries[scene];await ev(`qaPlace('${scene}',${x},${y})`);assert.ok((await ev(`qaWalkToNpc('${id}')`)).ok);await tap('e');assert.equal(await ev('FestivalWallet.coins'),before+amount);await tap('e');await tap('e');assert.equal(await ev('FestivalWallet.coins'),before+amount);await tap(' ');pass(id+' original quest preserved and reward paid once');
 }
 const paid=await ev('FestivalWallet.coins');assert.equal(paid,235);out.finalCoins=paid;
 const saved=await ev('JSON.parse(localStorage.getItem(FestivalWallet.storageKey))');out.saved=saved;
 assert.equal(Object.values(saved.challenges).filter(s=>s.claimed).length,8);
 await b.init(false);assert.equal(await ev('FestivalWallet.coins'),paid);assert.equal(await ev('Object.values(JSON.parse(localStorage.getItem(FestivalWallet.storageKey)).challenges).filter(s=>s.claimed).length'),8);pass('Eight island quests: accepted/completed/claimed and 235 coins persist after reload');
 await ev(`window.qaPlace=${placeFn};window.qaWalkToNpc=${walkFn};qaPlace('ILHA_BASQUETE',225,245);`);
 out.fps=await ev(`new Promise(resolve=>{const t=[];function frame(now){t.push(now);if(t.length===121)resolve(120000/(t.at(-1)-t[0]));else requestAnimationFrame(frame);}requestAnimationFrame(frame);})`);assert.ok(out.fps>50);pass('Overworld with NPCs remains fluid');
 out.geometry=await ev(`npcs.filter(n=>n.normalIslandNpc).map(n=>{const s=prepareOverworldNpc(n),g=s.geometry,b=overworldNpcDrawBounds(n,s.surface.width,s.surface.height,g);return {id:n.id,scaleX:b.width/s.surface.width,scaleY:b.height/s.surface.height,visibleHeight:g.visibleHeight*b.scale,feetY:b.y+g.anchor[1]*b.scale,logicalY:n.y};})`);
 for(const g of out.geometry){assert.ok(Math.abs(g.scaleX-g.scaleY)<1e-9);assert.ok(Math.abs(g.feetY-g.logicalY)<1e-8);assert.equal(g.visibleHeight,44);}pass('All 11 NPCs: uniform scale, fixed feet anchor and 44px visible height');
 assert.equal(b.errors.length,0);assert.equal(b.http.length,0);assert.equal(b.failed.length,0);pass('Zero console warnings/errors, HTTP errors/404 and network failures');
 fs.writeFileSync(__dirname+'/browser-qa.json',JSON.stringify(out,null,2));
 console.log('COMPLETE '+JSON.stringify({checks:out.checks.length,errors:b.errors.length,http:b.http.length,fps:out.fps}));b.ws.close();
})().catch(e=>{console.error(e);process.exit(1);});
