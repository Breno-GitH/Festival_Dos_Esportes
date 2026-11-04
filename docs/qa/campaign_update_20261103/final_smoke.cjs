const assert=require('assert/strict'),fs=require('fs');
(async()=>{process.env.NPC_QA_BASE='http://127.0.0.1:8871';const b=await require('../skate_control_clarity/browser_lib.cjs')();await b.init(true);const checks=[];const ok=(name,v)=>{assert.ok(v,name);checks.push(name);console.log('OK '+name)};
 await b.ev("currentScene='ILHA_SKATE';IslandOrientation.update()");for(const key of ['m','b']){await b.key('keyDown',key);await b.key('keyUp',key);}ok('Map and backpack cannot open over first-island teaching',await b.ev('IslandOrientation.active&&!MerchantCampaign.active'));
 for(let i=0;i<3;i++){await b.sleep(270);await b.key('keyDown','e');await b.key('keyUp','e');}
 await b.ev("currentScene='JOGO_SURF';FestivalWallet.setBalance(0)");let expected;const results=[];
 for(const mode of ['full','skipStart','skipMiddle']){
  await b.ev("surfEndlessGame.reset(false);surfEndlessGame.stats.coins=37;surfEndlessGame.distance=32000;surfEndlessGame.startFinale()");
  if(mode==='full')await b.ev("for(let i=0;i<600&&surfEndlessGame.state==='FINALE';i++)surfEndlessGame.updateFinale()");
  else{if(mode==='skipMiddle')await b.ev('for(let i=0;i<120;i++)surfEndlessGame.updateFinale()');await b.key('keyDown',' ');await b.sleep(1100);await b.key('keyUp',' ');}
  const r=await b.ev(`({state:surfEndlessGame.state,score:surfEndlessGame.result.score,distance:surfEndlessGame.result.distance,landings:surfEndlessGame.stats.finaleLandings,mini:surfEndlessGame.surfMiniCoins,pay:surfEndlessGame.surfSettlement.globalCoinsEarned})`);if(!expected)expected=r;else assert.deepEqual(r,expected);ok('Surf finale state parity: '+mode,r.state==='COMPLETE'&&r.landings===1&&r.pay===3);results.push({mode,...r});
 }
 ok('Three runs pay 3 each and no second currency is saved',await b.ev("FestivalWallet.coins===9&&!localStorage.getItem(FestivalWallet.storageKey).includes('surfCoins')"));
 await b.init(false);ok('Reload keeps global coins and tutorial completion',await b.ev('FestivalWallet.coins===9&&FestivalWallet.commerce.firstSportIslandTutorialSeen'));
 ok('No browser exception or 404',b.errors.length===0&&b.http.length===0);fs.writeFileSync(__dirname+'/final-smoke-results.json',JSON.stringify({checks,results,http:b.http,errors:b.errors},null,2));b.ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
