/* Hold-to-skip presentation; each owner commits its own terminal state. */
(function(g){'use strict';
 let cfg=null,targetId=null,entered=0,heldAt=null,heldTarget=null,quarantine=false,view=null;
 const delay=650,duration=1000;
 function target(){
  if(g.MinigamePause?.active)return null;
  if(g.EndingCard?.active)return null;
  if(cfg?.summitActive?.())return {id:'climbSummit',finish:()=>cfg.skipSummit()};
  if(g.AdventureIntro?.active)return {id:'intro',finish:()=>g.AdventureIntro.skip()};
  if(g.RavokArrival?.active)return {id:'ravokArrival',finish:()=>g.RavokArrival.skip()};
  if(g.RavokOutcome?.active)return {id:'ravokOutcome',finish:()=>g.RavokOutcome.skip()};
  if(g.MerchantCampaign?.cutsceneActive)return {id:'merchant',finish:()=>g.MerchantCampaign.skipCutscene()};
  if(g.EndingCinematic?.active)return {id:'standardEnding',finish:()=>g.EndingCinematic.skip()};
  if(g.CaptainRoute?.active&&g.CaptainRoute.state==='FERIAS_MERECIDAS')return {id:'vacation',finish:()=>g.CaptainRoute.skip()};
  if(cfg?.scene?.()==='JOGO_SURF'&&g.surfEndlessGame?.state==='FINALE'&&!g.surfEndlessGame.paused)return {id:'surfFinale',finish:()=>g.surfEndlessGame.skipFinale()};
  if(g.MedalCompletion?.active)return {id:'medals',finish:()=>g.MedalCompletion.skip()};
  if(g.MastersFarewell?.active&&g.MastersFarewell.state==='MASTERS_FAREWELL')return {id:'farewell',finish:()=>g.MastersFarewell.skip()};
  if(g.RavokEvent?.exitActive||g.RavokEvent?.dialogue?.()?.type==='DIALOGUE')return {id:'ravokPrelude',finish:()=>g.RavokEvent.skipPreparation()};
  return null;
 }
 function update(now=performance.now()){
  const t=target();if(t?.id!==targetId){targetId=t?.id||null;entered=now;heldAt=null;heldTarget=null;}
  if(document.hidden){heldAt=null;return;}
  const progress=t&&heldTarget===t.id&&heldAt!==null?Math.min(1,(now-heldAt)/duration):0;
  if(view){view.hidden=!t||now-entered<delay;view.querySelector('i').style.width=Math.round(progress*100)+'%';}
  if(progress>=1){quarantine=true;heldAt=null;heldTarget=null;cfg?.clearInput();t.finish();cfg?.clearInput();g.RavokEvent?.releaseAll();if(view)view.hidden=true;}
 }
 function down(e){
  if(e.code!=='Space'&&e.key!==' ')return;
  if(quarantine){e.preventDefault();e.stopImmediatePropagation();return;}
  const t=target();if(!t)return;
  e.preventDefault();
  if(e.repeat){e.stopImmediatePropagation();return;}
  if(t.id!==targetId){targetId=t.id;entered=performance.now();}
  heldAt=performance.now();heldTarget=t.id;
 }
 g.addEventListener('keydown',down,true);
 g.addEventListener('keyup',e=>{if(e.code!=='Space'&&e.key!==' ')return;heldAt=null;heldTarget=null;if(quarantine){e.preventDefault();quarantine=false;cfg?.clearInput();}},true);
 g.addEventListener('blur',()=>{heldAt=null;heldTarget=null;quarantine=false;cfg?.clearInput();});
 function frame(){update();g.requestAnimationFrame(frame);}g.requestAnimationFrame(frame);
 g.CutsceneSkip=Object.freeze({init(c){cfg=c;view=document.createElement('div');view.hidden=true;view.style.cssText='position:absolute;bottom:6px;right:6px;padding:7px 9px;background:#101f2fee;border:1px solid #70959b;color:#e3e5ce;font:10px monospace;pointer-events:none;z-index:30';view.innerHTML='SEGURE [SPACE] PARA PULAR<div style="height:3px;background:#354354;margin-top:5px"><i style="display:block;height:3px;background:#e7c682;width:0"></i></div>';document.getElementById('canvas-wrapper').appendChild(view);},update,target:()=>target()?.id||null,snapshot:()=>({targetId,heldAt,quarantine,delay,duration})});
})(window);
