/* Official boxing input. Physical keys stay separate from gameplay state across briefings/rounds. */
const boxingPhysicalKeys=new Set(),boxingGatedKeys=new Set(),boxingConsumedKeys=new Set();
function boxingKeyName(key){return [' ','Spacebar','space'].includes(key)?'space':String(key).toLowerCase();}
function boxingTrackKeyDown(event){
    if(typeof currentScene==='undefined'||currentScene!=='JOGO_BOXE')return;
    const k=boxingKeyName(event.key);boxingPhysicalKeys.add(k);
    if(k==='space'||k==='shift')event.preventDefault?.();
}
function boxingTrackKeyUp(event){const k=boxingKeyName(event.key);boxingPhysicalKeys.delete(k);boxingGatedKeys.delete(k);boxingConsumedKeys.delete(k);}
function boxingGateHeldInput(){for(const k of boxingPhysicalKeys)boxingGatedKeys.add(k);}
function boxingHandleKeyDown(event){
    const k=boxingKeyName(event.key),official=['w','a','s','d','j','k','l','shift','space','o','r','enter','escape'];
    if(!official.includes(k))return false;
    event.preventDefault?.();
    const fresh=!event.repeat&&!boxingConsumedKeys.has(k);boxingConsumedKeys.add(k);
    if(k==='escape'&&fresh){boxingReleaseInput();return 'exit';}
    if(boxeGame.phase==='RESULT'&&k==='r'&&fresh&&!boxingGatedKeys.has(k)){boxingInputPress.restart=true;return true;}
    if(boxeGame.phase==='READY'&&k==='enter'&&fresh&&!boxingGatedKeys.has(k)){boxingInputPress.start=true;return true;}
    if(boxeGame.phase!=='FIGHTING'){
        boxingGatedKeys.add(k);if(typeof keys!=='undefined'&&Object.hasOwn(keys,k))keys[k]=false;return true;
    }
    if(boxingGatedKeys.has(k))return true;
    if(k==='shift'){
        if(!fresh&&!boxingInputPress.guard)return true;
        if(fresh&&!boxingInputPress.guard)boxingInputPress.guardPressed=true;
        boxingInputPress.guard=true;return true;
    }
    if(['w','a','s','d'].includes(k)){if(!fresh&&!keys[k])return true;keys[k]=true;if(fresh)queueBoxingMoveTap(k);return true;}
    if(fresh){
        const action={j:'jab',k:'cross',l:'feint',space:'dodge',o:'special'}[k];
        if(action)boxingInputPress[action]=true;
    }return true;
}
function boxingHandleKeyUp(event){
    const k=boxingKeyName(event.key);boxingTrackKeyUp(event);
    if(typeof keys!=='undefined'&&Object.hasOwn(keys,k))keys[k]=false;
    if(k==='shift')boxingInputPress.guard=false;
    if(k==='space'&&typeof currentScene!=='undefined'&&currentScene==='JOGO_BOXE')event.preventDefault?.();
}
window.addEventListener('keydown',boxingTrackKeyDown,true);
window.addEventListener('keyup',boxingTrackKeyUp,true);
window.BoxingInput=Object.freeze({keyDown:boxingHandleKeyDown,keyUp:boxingHandleKeyUp,
    trackDown:boxingTrackKeyDown,trackUp:boxingTrackKeyUp,
    clearPhysical(){boxingPhysicalKeys.clear();boxingGatedKeys.clear();boxingConsumedKeys.clear();},
    snapshot:()=>({held:[...boxingPhysicalKeys],gated:[...boxingGatedKeys]})});
