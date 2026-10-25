/* Single campaign facade. Existing medal/story authorities keep their own compatible saves. */
(function(g){'use strict';
 const W=g.FestivalWallet,C=g.MerchantCatalog;
 function discoverScene(scene){const region=C.regions.find(r=>r.id===scene);if(!region)return false;
  const data=W.commerce;if(data.islandVisited[region.visitKey])return true;
  return W.updateCommerce({islandVisited:{...data.islandVisited,[region.visitKey]:true}});
 }
 function medals(){return Object.fromEntries(C.regions.filter(r=>r.medal).map(r=>[r.medal,g.isMedalhaDesbloqueada?.(r.medal)===true]));}
 function mapState(scene){const data=W.commerce,m=medals();return C.regions.map(r=>{
  const visited=data.islandVisited[r.visitKey],q=visited&&data.inventory.questScanner&&r.quest?W.getChallenge(r.quest):null;
  return {id:r.id,visitKey:r.visitKey,visited,current:scene===r.id,name:visited?r.name:'???',icon:visited?r.icon:null,
   medal:!!(visited&&r.medal&&m[r.medal]),questStatus:q?(q.completed?'MISSÃO CONCLUÍDA':q.accepted?'MISSÃO EM ANDAMENTO':'MISSÃO DISPONÍVEL'):null,
   store:visited&&r.id==='HUB'&&data.merchantArrivalSeen&&data.merchantUnlocked&&g.MerchantCampaign?.snapshot().visible===true};
 });}
 function destinations(){return {central:g.AdventureIntro?.endingSeen===true,surf:W.feriasVistas===true,climbing:g.RavokEvent?.ravokBadEndingSeen===true};}
 function snapshot(){const wallet=W.campaignState();return {...wallet,islandVisited:wallet.commerce.islandVisited,inventory:wallet.commerce.inventory,
  medals:medals(),destinations:destinations(),ravok:g.RavokEvent?.snapshot()||null,
  story:g.AdventureIntro?{introSeen:g.AdventureIntro.introSeen,endingSeen:g.AdventureIntro.endingSeen}:null};}
 g.FestivalProgress=Object.freeze({discoverScene,mapState,medals,destinations,
  get islandVisited(){return W.islandVisited;},get inventory(){return W.inventory;},snapshot});
 g.FestivalSave=Object.freeze({storageKey:W.storageKey,snapshot});
})(window);
