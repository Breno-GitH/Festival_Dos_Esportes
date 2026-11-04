const fs=require('fs'),assert=require('assert/strict');
(async()=>{process.env.NPC_QA_BASE='http://127.0.0.1:8871';const b=await require('../skate_control_clarity/browser_lib.cjs')();const results=[];
 for(const kind of ['intro','merchant','arrival','medals','farewell','standard','vacation','accept','refuse']){
  let expected;
  for(const mode of ['full','skipStart','skipMiddle']){
   await b.init(true);
   await b.ev(`window.parityKind='${kind}';window.parityNow=performance.now();Object.defineProperty(performance,'now',{configurable:true,value:()=>parityNow});window.parityTap=()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true,cancelable:true}));};
    if(parityKind==='intro'){currentScene='INTRO_ARRIVAL';AdventureIntro.start();}
    else {AdventureIntro.introSeen=true;const amount=parityKind==='merchant'?1:parityKind==='arrival'?4:8;for(const m of MEDALHAS_REGISTRY.slice(0,amount))desbloquearMedalha(m.id);if(parityKind!=='merchant')FestivalWallet.unlockMerchant();
      if(parityKind==='merchant')MerchantCampaign.tryStart('HUB');
      if(parityKind==='arrival')RavokArrival.tryStart('HUB');
      if(parityKind==='medals')MedalCompletion.begin();
      if(['farewell','standard'].includes(parityKind)){AdventureIntro.allMedalsComplete=true;AdventureIntro.homeCallSeen=true;AdventureIntro.mastersFarewellStarted=true;if(parityKind==='farewell')MastersFarewell.begin();else{AdventureIntro.mastersFarewellSeen=true;EndingCinematic.start();}}
      if(parityKind==='vacation'){FestivalWallet.setBalance(100);FestivalWallet.payCaptain();CaptainRoute.interact({id:'capitao'});}
      if(['accept','refuse'].includes(parityKind)){RavokEvent.completeArrival();currentScene='ILHA_ESCALADA';player.x=373;player.y=144;RavokEvent.updateConversation(currentScene);RavokEvent.skipPreparation();RavokEvent.interact(RavokEvent.npcs.find(n=>n.id==='ravok'));RavokEvent.skipPreparation();
       const k=key=>{const e={key,repeat:false,preventDefault(){},stopImmediatePropagation(){}};RavokEvent.handleKeyDown(e);RavokEvent.handleKeyUp(e);};if(parityKind==='accept'){k('w');k(' ');k('w');k(' ');}else k(' ');
      }
    }
    window.parityStep=()=>{parityNow+=100;const ev={key:' ',repeat:false,preventDefault(){},stopImmediatePropagation(){}};
     if(parityKind==='intro'){AdventureIntro.update();if(['REACTION','MONOLOGUE'].includes(AdventureIntro.state))AdventureIntro.handleKeyDown(ev);}
     else if(parityKind==='merchant'){MerchantCampaign.update('HUB',.1);if(MerchantCampaign.snapshot().cutscene?.phase==='SPEECH')parityTap();}
     else if(parityKind==='arrival'){RavokArrival.update(currentScene);if(RavokArrival.snapshot().phase==='DIALOGUE')parityTap();}
     else if(parityKind==='medals'){MedalCompletion.update(currentScene);MedalCompletion.handleKeyDown(ev);}
     else if(parityKind==='farewell'){MastersFarewell.update('HUB');if(MastersFarewell.state==='MASTERS_FAREWELL')MastersFarewell.handleKeyDown(ev);}
     else if(parityKind==='standard')EndingCinematic.update();
     else if(parityKind==='vacation'){CaptainRoute.update();if(CaptainRoute.scene==='MONOLOGUE')CaptainRoute.handleKeyDown(ev);}
     else {RavokOutcome.update(currentScene);if(RavokOutcome.snapshot().waitingForSpace)parityTap();}
    };
    window.parityDone=()=>parityKind==='intro'?!AdventureIntro.active:parityKind==='merchant'?!MerchantCampaign.cutsceneActive:parityKind==='arrival'?!RavokArrival.active:parityKind==='medals'?!MedalCompletion.active:parityKind==='farewell'?MastersFarewell.state==='BOARDING_PROMPT':parityKind==='refuse'?!RavokOutcome.active:EndingCard.active;
    window.parityState=()=>parityKind==='intro'?{seen:AdventureIntro.introSeen,scene:currentScene}:parityKind==='merchant'?{seen:FestivalWallet.commerce.merchantArrivalSeen,unlocked:FestivalWallet.commerce.merchantUnlocked}:parityKind==='arrival'?{seen:RavokEvent.ravokArrivalSeen,exited:RavokEvent.ravokExited,landed:RavokEvent.arrived}:parityKind==='medals'?{seen:AdventureIntro.homeCallSeen}:parityKind==='farewell'?{seen:AdventureIntro.mastersFarewellSeen,state:MastersFarewell.state}:parityKind==='refuse'?{arrested:RavokEvent.ravokArrested,scene:currentScene}:({card:EndingCard.snapshot().id,seen:parityKind==='accept'?RavokEvent.badEndingCardReady:parityKind==='vacation'?FestivalWallet.feriasVistas:AdventureIntro.endingSeen});`);
   if(mode==='full')await b.ev('for(let n=0;n<3000&&!parityDone();n++)parityStep()');
   else {
    if(mode==='skipMiddle')await b.ev("for(let n=0;n<(parityKind==='farewell'?5:parityKind==='intro'?250:parityKind==='arrival'?150:25)&&!parityDone();n++)parityStep()");
    if(!await b.ev('parityDone()')){await b.key('keyDown',' ');await b.ev('parityNow+=1100;CutsceneSkip.update(parityNow)');await b.key('keyUp',' ');}
   }
   const state=await b.ev('({done:parityDone(),state:parityState()})');assert.ok(state.done,kind+' '+mode+' terminates');if(!expected)expected=state.state;else assert.deepEqual(state.state,expected,kind+' parity');results.push({kind,mode,...state});console.log('OK '+kind+' '+mode);
  }
 }
 assert.equal(b.http.length,0);assert.equal(b.errors.length,0);fs.writeFileSync(__dirname+'/parity-results.json',JSON.stringify({results,http:b.http,errors:b.errors},null,2));b.ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
