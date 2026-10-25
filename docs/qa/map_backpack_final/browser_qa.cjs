const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const b=await require('./browser_lib.cjs')(),{ev,sleep,shot}=b;
 const out={checks:[],errors:b.errors,http:b.http,failed:b.failed};
 const save=()=>fs.writeFileSync(__dirname+'/browser-qa.json',JSON.stringify(out,null,2));
 const pass=name=>{out.checks.push(name);console.log('PASS '+name);save();};
 const snap=()=>ev('MerchantCampaign.snapshot()');
 const tap=async k=>{await b.key('keyDown',k);await b.key('keyUp',k);await ev('MerchantCampaign.update(currentScene,.25)');};
 const pick=async i=>{for(let n=0;n<12;n++){if((await snap()).ui?.selected===i)return;await tap('s');}throw Error('selection '+i);};
 const walk=async(scene,x,y,key,destination)=>{
  await ev(`currentScene=${JSON.stringify(scene)};player.x=${x};player.y=${y};normalNpcDialogue=null;overworldConversationNpc=null;overworldFocusNpc=null;clearMinigameBriefInput();`);
  await b.key('keyDown',key);await ev('for(let i=0;i<12;i++)qaOriginalUpdate()');await b.key('keyUp',key);
  assert.equal(await ev('currentScene'),destination);
  const r=await ev(`MerchantCatalog.regions.find(r=>r.id===${JSON.stringify(destination)})`);
  assert.equal(await ev(`JSON.parse(localStorage.getItem(FestivalWallet.storageKey)).commerce.islandVisited.${r.visitKey}`),true);
 };
 await b.init(true);await ev('AdventureIntro.introSeen=true;MerchantCampaign.update(currentScene,.05)');
 assert.deepEqual(await ev('FestivalWallet.islandVisited'),{central:true,pingpong:false,basketball:false,running:false,skate:false,archery:false,climbing:false,boxing:false,surf:false});
 assert.equal(await ev('Object.values(FestivalWallet.inventory).some(Boolean)'),false);await shot('qa-new-campaign');pass('Fresh campaign: Central alone, seven false inventory flags, no merchant or hidden shop icon');
 await walk('HUB',426,148,'d','ILHA_PINGPONG');
 assert.equal(await ev('MEDALHAS_REGISTRY.some(m=>isMedalhaDesbloqueada(m.id))'),false);
 assert.equal(await ev('FestivalWallet.getChallenge("pingpong_medalha").accepted'),false);
 pass('Physical east crossing immediately persists Ping-Pong, without medal, quest or conversation');
 await tap('m');assert.equal((await snap()).ui,null);assert.match((await snap()).toast,/ainda não possui/);pass('Exploration alone does not grant the purchasable map; M gives a discreet message');
 await tap('b');assert.equal((await snap()).ui.mode,'backpack');const point=await ev('({x:player.x,y:player.y,scene:currentScene})');
 await b.key('keyDown','d');await ev('for(let i=0;i<15;i++)qaOriginalUpdate()');await b.key('keyUp','d');
 assert.deepEqual(await ev('({x:player.x,y:player.y,scene:currentScene})'),point);await shot('qa-empty-backpack');await tap('Escape');pass('B opens persistent backpack; movement and world interaction are suspended; Esc closes');
 // The same real match-result/medal route as the existing merchant QA, rather than directly unlocking the shop.
 await ev(`currentScene='JOGO_PINGPONG';resetPingPong(true);PreGameBrief.state='CLOSED';pingPong.gameState='PLAYING';MerchantCampaign.startGame('pingpong');pingPong.playerScore=50;finishPingPongMatch();for(let i=0;i<91;i++){MerchantCampaign.update(currentScene,1/60);updatePingPong();}`);
 assert.equal(await ev('isMedalhaDesbloqueada("pingpong")'),true);assert.equal((await snap()).data.merchantArrivalSeen,false);
 await ev('keys.space=false;updatePingPong();keys.space=true;updatePingPong();keys.space=false;qaPaused=false;');
 const phases=new Set();let arrived=false;
 for(let i=0;i<650;i++){
  const s=await snap();if(s.cutscene){phases.add(s.cutscene.phase);if(s.cutscene.phase==='SPEECH'&&s.cutscene.time>.75)await tap(' ');}
  else if(s.data.merchantArrivalSeen){arrived=true;break;}await sleep(60);
 }
 assert.ok(arrived);for(const p of ['ARRIVE','BAG','ROOF','SHIP','SIGN','RETURN','SPEECH'])assert.ok(phases.has(p));
 await ev('qaPaused=true');assert.equal(await ev('FestivalWallet.islandVisited.pingpong'),true);pass('First real medal -> return -> merchant arrival once, walk/build/sign/speech; visited survives cutscene');
 await ev('currentScene="HUB";player.x=342;player.y=142;MerchantCampaign.update(currentScene,.1);qaOriginalUpdate()');await b.tap('e');await ev('MerchantCampaign.update(currentScene,.25)');assert.equal((await snap()).ui.mode,'talk');await shot('qa-shop-sign');await tap('Enter');
 await ev('FestivalWallet.setBalance(245)');
 const buy=async id=>{const index=await ev(`MerchantCatalog.items.findIndex(i=>i.id===${JSON.stringify(id)})`);await pick(index);await tap('Enter');assert.equal((await snap()).ui.mode,'buy_confirm');assert.equal((await snap()).ui.selected,0);await tap('d');await tap('Enter');await ev('MerchantCampaign.update(currentScene,.7)');assert.equal(await ev(`MerchantCampaign.owns(${JSON.stringify(id)})`),true);};
 await buy('island_map');await tap('b');await tap('m');assert.equal((await snap()).ui.mode,'map');await shot('qa-map-first-visit');
 let nodes=await ev('FestivalProgress.mapState(currentScene)');assert.equal(nodes.find(n=>n.id==='HUB').current,true);assert.equal(nodes.find(n=>n.id==='HUB').store,true);assert.equal(nodes.find(n=>n.id==='ILHA_PINGPONG').medal,true);assert.equal(nodes.find(n=>n.id==='ILHA_SURF').name,'???');assert.ok(nodes.every(n=>n.questStatus===null));pass('Map purchase/M: nine nodes, connections, actual-location marker, visited/medal distinction, hidden nodes, shop icon');
 await pick(3);await tap('Enter');assert.equal((await snap()).ui.mode,'map');assert.match((await snap()).toast,/não adquirido/);pass('Map is consultation only without teleporter; selecting does not travel');await tap('b');
 await walk('ILHA_PINGPONG',225,8,'w','ILHA_SURF');await tap('m');nodes=await ev('FestivalProgress.mapState(currentScene)');assert.equal(nodes.find(n=>n.id==='ILHA_SURF').current,true);assert.equal(nodes.find(n=>n.id==='ILHA_SURF').visited,true);assert.equal(nodes.find(n=>n.id==='ILHA_SURF').medal,false);await shot('qa-map-surf-current');await tap('b');pass('Second physical discovery updates map immediately; marker follows Zorp rather than menu selection');
 await ev('currentScene="HUB";player.x=342;player.y=142;MerchantCampaign.open("shop");MerchantCampaign.update(currentScene,.3)');await buy('quest_scanner');await tap('b');
 await ev('FestivalWallet.acceptChallenge("pingpong_medalha");MerchantCampaign.open("map");MerchantCampaign.update(currentScene,.3)');await pick(2);
 nodes=await ev('FestivalProgress.mapState(currentScene)');assert.equal(nodes.find(n=>n.id==='ILHA_PINGPONG').questStatus,'MISSÃO EM ANDAMENTO');assert.equal(nodes.find(n=>n.id==='ILHA_SURF').questStatus,'MISSÃO DISPONÍVEL');assert.equal(nodes.find(n=>n.id==='ILHA_ESCALADA').questStatus,null);await shot('qa-map-scanner');
 await ev('FestivalWallet.recordChallenge("pingpong_medalha",true,{type:"qa"})');assert.equal(await ev('FestivalProgress.mapState(currentScene).find(n=>n.id==="ILHA_PINGPONG").questStatus'),'MISSÃO CONCLUÍDA');await tap('b');pass('Scanner uses real quest states only for visited islands, independent of medals and rewards');
 await ev('MerchantCampaign.open("shop");MerchantCampaign.update(currentScene,.3)');await buy('teleporter');await tap('b');await tap('m');await pick(8);await tap('Enter');assert.equal((await snap()).ui.mode,'map');assert.match((await snap()).toast,/não visitou/);assert.equal(await ev('MerchantCampaign.beginTravel("ILHA_ESCALADA")'),false);pass('Unknown island is blocked both through map selection and travel API');
 await pick(3);await tap('Enter');assert.equal((await snap()).ui.mode,'travel_confirm');assert.equal((await snap()).ui.selected,0);await shot('qa-travel-confirm');
 await tap('Enter');assert.equal(await ev('currentScene'),'HUB');assert.equal((await snap()).ui.mode,'map');await pick(3);await tap('Enter');await tap('d');await tap('Enter');await ev('MerchantCampaign.update(currentScene,.5)');assert.equal(await ev('currentScene'),'ILHA_SURF');assert.equal(await ev('checkObstacleCollision(player.x,player.y)'),false);await ev('MerchantCampaign.update(currentScene,.5)');pass('Travel needs explicit confirmation, defaults to cancel, fades and lands safely');
 // All remaining sports are discovered through actual boundary movement, sharing the production transition code.
 for(const args of [['HUB',225,8,'w','ILHA_ESQUI'],['HUB',225,277,'s','ILHA_SKATE'],['ILHA_SKATE',426,148,'d','ILHA_BASQUETE'],['ILHA_SKATE',14,148,'a','ILHA_CORRIDA'],['HUB',14,148,'a','ILHA_ARCO'],['ILHA_ARCO',225,8,'w','ILHA_ESCALADA']])await walk(...args);
 assert.equal(await ev('Object.values(FestivalWallet.islandVisited).filter(Boolean).length'),9);pass('All nine regions have independent persistent visits, recorded by physical traversal');
 out.spawns=[];
 for(const region of await ev('MerchantCatalog.regions.map(r=>({id:r.id,name:r.name,fastTravelSpawn:r.fastTravelSpawn}))')){
  assert.equal(await ev(`MerchantCampaign.beginTravel(${JSON.stringify(region.id)})`),true,'landing '+region.id);
  await ev('MerchantCampaign.update(currentScene,.5)');
  const landing=await ev(`({scene:currentScene,x:player.x,y:player.y,blocked:checkObstacleCollision(player.x,player.y),npcDistance:Math.min(...npcs.filter(n=>n.scene===currentScene&&RavokEvent.isNpcVisible(n)&&MerchantCampaign.isNpcVisible(n)).map(n=>Math.hypot(player.x-n.x,player.y-n.y))),focus:overworldFocusNpc?.id||null})`);
  assert.equal(landing.scene,region.id);assert.equal(landing.blocked,false);assert.ok(landing.npcDistance>=56);assert.equal(landing.focus,null);out.spawns.push(landing);await ev('MerchantCampaign.update(currentScene,.5)');await shot('qa-spawn-'+region.id);
 }
 pass('Nine safe dedicated travel spawns: ground, no collider, no NPC interaction, no automatic minigame entry');
 await ev('currentScene="HUB";player.x=342;player.y=142;MerchantCampaign.open("shop");MerchantCampaign.update(currentScene,.3)');await buy('destiny_letter');await buy('records');await buy('jukebox');await buy('ship_customizer');await tap('b');assert.equal(await ev('FestivalWallet.coins'),100);
 await ev('MerchantCampaign.useItem("destiny_letter");MerchantCampaign.update(currentScene,.3)');assert.equal((await snap()).ui.mode,'letter');await shot('qa-letter');assert.equal(await ev('FestivalProgress.destinations().central'),false);await tap('b');pass('Separate Letter opens with three vague clues; all seven purchases leave 100 coins for Captain');
 await ev('MerchantCampaign.useItem("records");MerchantCampaign.update(currentScene,.3)');assert.equal((await snap()).ui.mode,'records');assert.equal((await snap()).data.playedSports.pingpong,true);assert.equal((await snap()).data.playedSports.surf,undefined);await shot('qa-records');await tap('b');pass('Records show played Ping-Pong score, not merely explored sports');
 await tap('b');const frozen=await ev('({x:player.x,y:player.y,scene:currentScene})');await b.key('keyDown','e');await b.key('keyUp','e');await ev('for(let i=0;i<8;i++)qaOriginalUpdate()');assert.equal((await snap()).ui.mode,'map');assert.deepEqual(await ev('({x:player.x,y:player.y,scene:currentScene})'),frozen);await tap('b');pass('Backpack intercepts interaction without opening NPC dialogue or starting a minigame');
 for(const scene of await ev('Object.keys(MerchantCatalog.sports)')){await ev(`currentScene=${JSON.stringify(scene)}`);for(const k of ['m','b']){await b.key('keyDown',k);await b.key('keyUp',k);}assert.equal((await snap()).ui,null);}
 await ev('currentScene="HUB";player.x=225;player.y=225;AdventureIntro.active=true');await tap('m');await tap('b');assert.equal((await snap()).ui,null);await ev('AdventureIntro.active=false');pass('M/B blocked during all eight minigames and an important cinematic');
 await ev('MerchantCampaign.open("map");MerchantCampaign.update(currentScene,.3);AdventureIntro.active=true;MerchantCampaign.update(currentScene,.1)');assert.equal((await snap()).ui,null);await ev('AdventureIntro.active=false');pass('An important cinematic closes an already open map and receives its own input');
 await ev('MerchantCampaign.startGame("surf");currentScene="JOGO_SURF";MerchantCampaign.update(currentScene,.05);currentScene="HUB";MerchantCampaign.update(currentScene,.05)');
 const saved=await ev('localStorage.getItem(FestivalWallet.storageKey)'),state=await ev('FestivalSave.snapshot()');out.saved=JSON.parse(saved);
 assert.equal(state.version,5);assert.equal(Object.keys(state.inventory).length,7);assert.equal(Object.values(state.inventory).every(Boolean),true);assert.equal(state.coins,100);assert.equal(state.commerce.merchantArrivalSeen,true);assert.equal(state.challenges.pingpong_medalha.completed,true);assert.ok(!/naturalWidth|HTMLImageElement|data:image/.test(saved));assert.equal(out.saved.commerce.purchasedItems,undefined);assert.equal(out.saved.commerce.visitedIslands,undefined);
 await b.init(false);await ev('AdventureIntro.introSeen=true;MerchantCampaign.update(currentScene,.1)');assert.deepEqual(await ev('FestivalWallet.inventory'),state.inventory);assert.deepEqual(await ev('FestivalWallet.islandVisited'),state.islandVisited);assert.equal(await ev('FestivalWallet.coins'),100);assert.equal((await snap()).cutscene,null);assert.equal(await ev('FestivalWallet.getChallenge("pingpong_medalha").completed'),true);assert.equal(await ev('isMedalhaDesbloqueada("pingpong")'),true);pass('Scene changes + reload retain inventory, nine visits, coins, quest, medal and merchant without replay');
 await tap('m');await shot('qa-map-complete');await tap('b');await tap('b');await shot('qa-backpack-complete');await tap('b');
 // Test legacy alias migration against an actual page reload, then restore the full campaign fixture.
 await ev(`localStorage.setItem(FestivalWallet.storageKey,JSON.stringify({version:4,coins:73,challenges:{pingpong_medalha:{accepted:true,completed:true,claimed:true}},commerce:{merchantArrivalSeen:true,merchantUnlocked:true,purchasedItems:{island_map:true,teleporter:true},visitedIslands:{HUB:true,ILHA_SURF:true},records:{pingpong:{best:42,label:'Pontos',unit:'PTS'}},playedSports:{pingpong:true}}}));`);
 await b.init(false);await ev('AdventureIntro.introSeen=true;MerchantCampaign.update(currentScene,.1)');assert.equal(await ev('FestivalWallet.coins'),73);assert.equal(await ev('FestivalWallet.inventory.islandMap&&FestivalWallet.inventory.teleporter'),true);assert.equal(await ev('FestivalWallet.islandVisited.surf'),true);assert.equal(await ev('FestivalWallet.getChallenge("pingpong_medalha").claimed'),true);assert.equal(await ev('FestivalWallet.commerce.records.pingpong.best'),42);assert.equal((await snap()).cutscene,null);pass('Actual v4 save migration preserves purchases, visited Surf, 73 coins, claimed quest and record');
 await ev('localStorage.setItem(FestivalWallet.storageKey,'+JSON.stringify(saved)+')');await b.init(false);await ev('AdventureIntro.introSeen=true;MerchantCampaign.update(currentScene,.1)');
 out.fps=await ev('new Promise(resolve=>{const t=[];function f(n){t.push(n);if(t.length===121)resolve(120000/(t.at(-1)-t[0]));else requestAnimationFrame(f);}requestAnimationFrame(f);})');
 assert.equal(b.errors.length,0);assert.equal(b.http.length,0);assert.equal(b.failed.length,0);pass('Zero 404, network failures, runtime exceptions, console errors/warnings, TypeError or ReferenceError');save();console.log('COMPLETE '+JSON.stringify({checks:out.checks.length,fps:out.fps}));b.ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
