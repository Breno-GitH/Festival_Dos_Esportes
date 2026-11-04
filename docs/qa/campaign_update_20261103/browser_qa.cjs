const fs=require('fs'),assert=require('assert/strict');
(async()=>{process.env.NPC_QA_BASE='http://127.0.0.1:8871';const b=await require('../skate_control_clarity/browser_lib.cjs')();const checks=[];
 const ok=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('OK '+name);};
 const hold=async()=>{await b.key('keyDown',' ');await b.sleep(1150);await b.key('keyUp',' ');};
 const shot=async name=>{await b.ev('draw()');fs.writeFileSync(__dirname+'/'+name+'.png',Buffer.from(await b.ev("canvas.toDataURL().split(',')[1]"),'base64'));};
 await b.init(true);
 const money=await b.ev(`(()=>{FestivalWallet.setBalance(0);const out=[];for(const mini of [9,10,19,20,37,100]){surfEndlessGame.reset(false);surfEndlessGame.stats.coins=mini;const before=FestivalWallet.coins;surfEndlessGame.wipeout('QA');surfEndlessGame.settleMiniCoins();out.push([mini,FestivalWallet.coins-before,surfEndlessGame.surfSettlement]);}return out;})()`);
 ok('Surf conversion 9/10/19/20/37/100; repeated settlement cannot duplicate',JSON.stringify(money.map(r=>r[1]))===JSON.stringify([0,1,1,2,3,10]));
 ok('HUD and saved global wallet share the 17 earned coins',await b.ev(`FestivalWallet.coins===17&&document.getElementById('coin-value').textContent==='17'&&JSON.parse(localStorage.getItem(FestivalWallet.storageKey)).coins===17`));
 await b.ev("currentScene='JOGO_SURF';surfEndlessGame.resultDelay=0;surfEndlessGame.resultShownAt=-120");await shot('surf-conversion');
 await b.ev("currentScene='INTRO_ARRIVAL';AdventureIntro.start()");await hold();ok('Intro skip commits introSeen and returns to world',await b.ev('!AdventureIntro.active&&AdventureIntro.introSeen'));
 await b.ev("currentScene='HUB';desbloquearMedalha('pingpong');MerchantCampaign.tryStart(currentScene)");ok('Merchant arrival starts',await b.ev('MerchantCampaign.cutsceneActive'));await hold();ok('Merchant skip commits shop, sign and wallet flags',await b.ev('MerchantCampaign.merchantArrivalSeen&&MerchantCampaign.merchantUnlocked&&!MerchantCampaign.cutsceneActive'));await shot('hub');
 await b.ev("desbloquearMedalha('basquete');desbloquearMedalha('corrida');desbloquearMedalha('skate');RavokArrival.tryStart(currentScene)");ok('Ravok arrival starts at four medals',await b.ev('RavokArrival.active'));await hold();ok('Arrival skip commits Ravok inside and K7 outside',await b.ev('RavokEvent.ravokArrivalSeen&&!RavokEvent.ravokExited&&!RavokArrival.active'));
 await b.ev("currentScene='ILHA_PINGPONG';player.x=350;player.y=235;IslandOrientation.update()");ok('First sport island opens orientation',await b.ev('IslandOrientation.active'));await shot('island-tutorial');
 const before=await b.ev('[player.x,player.y]');await b.key('keyDown','d');await b.ev('qaOriginalUpdate()');await b.key('keyUp','d');ok('Orientation freezes player motion',JSON.stringify(before)===JSON.stringify(await b.ev('[player.x,player.y]')));
 for(let i=0;i<3;i++){await b.sleep(270);await b.key('keyDown','e');await b.key('keyUp','e');}
 ok('Orientation completes once and persists',await b.ev('!IslandOrientation.active&&FestivalWallet.commerce.firstSportIslandTutorialSeen'));
 for(const scene of ['ILHA_PINGPONG','ILHA_BASQUETE','ILHA_CORRIDA','ILHA_SKATE','ILHA_ARCO','ILHA_ESCALADA','ILHA_ESQUI','ILHA_SURF']){await b.ev(`currentScene='${scene}';IslandOrientation.update()`);ok('No repeat in '+scene,await b.ev('!IslandOrientation.active'));}
 ok('Quest introduction is given once',await b.ev(`(()=>{const n=npcs.find(n=>n.id==='fotografa_basquete');const a=FestivalChallenges.interact(n),c=FestivalChallenges.interact(n);return a.includes('desafios opcionais')&&!c.includes('desafios opcionais');})()`));
 await b.ev("currentScene='HUB';FestivalBackpack.open();MerchantCampaign.useItem('archipelago_help')");ok('Backpack contains reusable archipelago help',await b.ev("MerchantCampaign.snapshot().ui.mode==='info'&&MerchantCampaign.snapshot().ui.title==='COMO FUNCIONA O ARQUIPÉLAGO'"));await shot('backpack-help');await b.key('keyDown','Escape');await b.key('keyUp','Escape');
 await b.ev("desbloquearMedalha('arco');desbloquearMedalha('escalada');desbloquearMedalha('boxe');surfEndlessGame.completeSurf();currentScene='ILHA_ESCALADA';player.x=373;player.y=144;RavokEvent.sync();RavokEvent.updateConversation(currentScene)");
 // Skip any medal call first; it owns priority over the local exit sequence.
 if(await b.ev('MedalCompletion.active'))await hold();
 if(await b.ev('RavokEvent.exitActive'))await hold();
 ok('Eight medal exit skip leaves Ravok outside',await b.ev('RavokEvent.ravokExited'));
 await b.ev("RavokEvent.interact(RavokEvent.npcs.find(n=>n.id==='ravok'))");
 ok('Ravok preparation dialogue starts',await b.ev("RavokEvent.dialogue()?.type==='DIALOGUE'"));await hold();
 ok('Skip reaches choice and never selects SIM',await b.ev("RavokEvent.dialogue()?.type==='CHOICE'&&RavokEvent.ravokChoice===null"));await shot('ravok-choice');
 await b.key('keyDown',' ');await b.key('keyUp',' ');ok('NO starts refusal',await b.ev("RavokEvent.ravokChoice==='refuse'&&RavokOutcome.active"));await hold();ok('Arrest skip saves arrest and returns to climbing',await b.ev("RavokEvent.ravokArrested&&!RavokOutcome.active&&currentScene==='ILHA_ESCALADA'"));
 // Dedicated accepted save verifies the other branch without overriding the player profile.
 await b.ev(`(()=>{const s=JSON.parse(localStorage.getItem('zorp_ravok_event'));s.ravokChoice='accept';s.ravokArrested=false;s.ravokEndingCompleted=false;s.ravokBadEndingSeen=false;s.ravokBadEndingCardReady=false;localStorage.setItem('zorp_ravok_event',JSON.stringify(s));})()`);
 await b.send('Page.reload');await b.ready();await b.ev("TitleScreen.active=false;AdventureIntro.active=false;MedalCompletion.active=false;currentScene='HUB';window.qaOriginalUpdate=update;window.qaPaused=true;update=function(){if(!qaPaused)qaOriginalUpdate();};desbloquearMedalha('escalada');RavokOutcome.start('accept')");ok('Accepted route resumes',await b.ev('RavokOutcome.active'));await hold();ok('Acceptance skip opens the exclusive ending card',await b.ev("EndingCard.active&&EndingCard.snapshot().id==='ravok_maior_conquista'"));
 await b.ev('qaPaused=false');await b.sleep(2100);await shot('secret-card');await b.key('keyDown',' ');await b.key('keyUp',' ');await b.sleep(800);ok('Accepted ending persists and returns to menu',await b.ev('RavokEvent.ravokBadEndingSeen&&TitleScreen.isActive()'));
 ok('No 404 or browser exception',b.http.length===0&&b.errors.length===0);fs.writeFileSync(__dirname+'/browser-results.json',JSON.stringify({checks,money,errors:b.errors,http:b.http},null,2));b.ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
