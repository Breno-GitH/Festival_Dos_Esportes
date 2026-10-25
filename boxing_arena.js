"use strict";

// Fixed 60 Hz simulation; positions are mat coordinates, Y is depth, never jump height.
const BOXING_CONFIG = Object.freeze({
    ring: Object.freeze({ top:166, bottom:252, backLeft:62, backRight:388, frontLeft:31, frontRight:419 }),
    body: Object.freeze({ radiusX:14, radiusY:7, depthScale:1.65, minSeparation:30 }),
    movement: Object.freeze({ playerX:2.65, playerY:1.8, masterX:1.95, masterY:1.35 }),
    maxHp:100, step:1/60, koFrames:48,
    guardDamageScale:.25,
    guard:Object.freeze({ max:100, decay:.75, holdPressure:.28, breakFrames:30, breakResidual:40,
        pressure:Object.freeze({jab:18,cross:34,special:72}) }),
    parry:Object.freeze({window:4,cooldown:24,stun:14,recovery:10,counterWindow:20,push:6,damageScale:.06,
        pressure:Object.freeze({jab:4,cross:8,special:18})}),
    feint:Object.freeze({cancelFrames:4,threatFrames:8,duration:14,cooldown:42}),
    dodge:Object.freeze({perfectFrom:3,perfectTo:5,normalCounterWindow:18,duration:18, moveFrames:8, invulnerableFrom:3, invulnerableTo:10, cooldown:40, speedX:3.2, speedY:2.3}),
    combo:Object.freeze({buffer:12,window:42,maxHits:5,cancelAfterContact:2,lightLinkStartup:4,heavyLinkStartup:7,
        finisherRecovery:24,finisherStun:12,finisherPush:32,finisherGap:74,damageScale:Object.freeze([1,1,.96,.90,.82])}),
    counter:Object.freeze({window:32,cancelAge:10,damageBonus:3,punishDamageBonus:2,hitstunBonus:4}),
    impact:Object.freeze({lightPause:1,heavyPause:2,counterPause:3,blockPause:1,breakPause:3,specialPause:4,shake:Object.freeze({jab:.12,cross:.75,counter:1.2,crushing:1.55,special:1.9,block:.12,parry:.5,armor:.15})}),
    attacks:Object.freeze({
        jab:Object.freeze({damage:6,range:52,depthTolerance:11,startup:6,active:3,recovery:10,whiff:4,hitstun:12,push:4}),
        cross:Object.freeze({damage:14,range:63,depthTolerance:12,startup:12,active:4,recovery:18,whiff:8,hitstun:18,push:11}),
        dash_punch:Object.freeze({damage:28,range:54,depthTolerance:11,startup:36,active:24,recovery:20,whiff:36,hitstun:24,push:24,guardPressure:110,guardDamageScale:.5,guardPushScale:.85,unblockable:true})
    })
});
const MASTER_IRON_CONFIG=Object.freeze({maxCombo:3,jabCost:7,crossCost:17,
    stance:Object.freeze({waitMin:6,waitMax:22,retimeMax:32,recovery:14,cooldown:150}),
    slip:Object.freeze({duration:12,moveFrames:5,speedY:1.6,cooldown:60,cost:7,evadeFrom:3,evadeTo:6,counterWindow:20,cancelAge:8}),
    armor:Object.freeze({startupFrames:3,charges:1}),crushing:Object.freeze({damageBonus:5,staminaDamage:12,extraStun:2,pushBonus:4,hitstop:4})});
function boxingComboLimit(f){return f.role==='master'?MASTER_IRON_CONFIG.maxCombo:BOXING_CONFIG.combo.maxHits;}
function boxingIronProfile(f,p,kind){
    if(f.role!=='master')return p;
    const heavy=kind==='cross',close=p.variant!=='STRAIGHT';
    return {...p,damage:heavy?(p.body?15:18):(p.body?7:8),startup:heavy?(f.counterWindow?10:close?14:16):(close?7:8),
        recovery:heavy?24:14,whiff:heavy?14:7,hitstun:heavy?22:14,push:heavy?12:5,
        staminaDamage:p.body?(heavy?18:9):0,guardPressure:heavy?42:22,
        armorLate:heavy&&!!f.ironArmorNext&&f.counterWindow===0&&f.stamina>=15};
}
function boxingIronClear(f){f.counterStance=null;f.slip=null;f.parryAttempt=false;f.parryFrames=0;}
function boxingStartCounterStance(f,wait=12){
    if(f.role!=='master'||!boxingCanAct(f)||f.attack||f.special||f.stanceCooldown||!boxingSpendStamina(f,'parry'))return false;
    f.counterStance={state:'MASTER_COUNTER_STANCE',age:0,wait:boxingClamp(wait,MASTER_IRON_CONFIG.stance.waitMin,MASTER_IRON_CONFIG.stance.waitMax),lineY:f.y,facing:f.facing};
    f.stanceCooldown=MASTER_IRON_CONFIG.stance.cooldown;f.guard=true;f.bufferedAttack=null;f.bufferFrames=0;
    if(f.ai)f.ai.stats.counterStance++;boxingSetAnimation(f,'guard');return true;
}
function boxingUpdateCounterStance(f){
    const s=f.counterStance;s.age++;f.bufferedAttack=null;f.bufferFrames=0;
    if(s.age<=s.wait){
        f.guard=true;if(boxingApplyGuardPressure(f,BOXING_CONFIG.guard.holdPressure))return;boxingSetAnimation(f,'guard');return;
    }
    if(s.age===s.wait+1){f.parryFrames=BOXING_CONFIG.parry.window;f.parryAttempt=true;f.parryCooldown=BOXING_CONFIG.parry.cooldown;}
    if(s.age<=s.wait+BOXING_CONFIG.parry.window){f.guard=true;boxingSetAnimation(f,'guard');return;}
    f.counterStance=null;f.parryFrames=0;f.parryAttempt=false;f.guard=false;f.parryRecovery=MASTER_IRON_CONFIG.stance.recovery;
    if(f.ai)f.ai.stats.stanceWhiffs++;boxingSetAnimation(f,'idle');
}
function boxingIronBlocked(f,attack){
    const s=f.counterStance;
    if(!s||s.retimed||s.age>s.wait||attack.kind!=='jab'||attack.rush||f.guardBreakTimer)return;
    const log=(f.ai?.attackLog||[]).filter(a=>a.kind==='jab');
    const gaps=log.slice(1).map((a,i)=>a.start-log[i].start).sort((a,b)=>a-b);
    const cadence=boxingClamp(gaps.length?gaps[Math.floor(gaps.length/2)]:20,14,30);
    // One adjustment from a felt block and past cadence. No read of current input or future attack.
    s.wait=boxingClamp(s.age+cadence-1+boxingAiRange(-1,1),s.age+1,MASTER_IRON_CONFIG.stance.retimeMax);s.retimed=true;
}
function boxingStartSlip(f,side){
    if(f.role!=='master'||!boxingCanAct(f)||f.attack||f.special||f.slipCooldown||f.stamina<MASTER_IRON_CONFIG.slip.cost)return false;
    f.stamina-=MASTER_IRON_CONFIG.slip.cost;f.staminaDelay=BOXING_STAMINA.regenDelay;
    const direction=side||((f.y-173)<(245-f.y)?1:-1);
    f.slip={age:0,side:direction,originX:f.x,originY:f.y};f.slipCooldown=MASTER_IRON_CONFIG.slip.cooldown;
    f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;if(f.ai)f.ai.stats.slip++;boxingSetAnimation(f,'dodge');return true;
}
function boxingUpdateSlip(f,target){
    const s=f.slip,c=MASTER_IRON_CONFIG.slip;s.age++;
    if(s.age<=c.moveFrames)boxingMove(f,0,s.side,0,c.speedY);
    if(f.counterWindow&&s.age>=c.cancelAge&&f.bufferedAttack){f.slip=null;if(boxingStartAttack(f,f.bufferedAttack))return;}
    boxingSetAnimation(f,'dodge');if(s.age>=c.duration)f.slip=null;
}
function boxingIronArmor(f,attack,spec,earned){
    const a=f.attack;if(f.role!=='master'||!a?.profile?.armorLate||!a.armorCharges||attack.kind!=='jab'||attack.rush||earned||attack.finisher)return false;
    const start=boxingAttackStartup(a,boxingAttackSpec(a));
    return a.frame>=start-MASTER_IRON_CONFIG.armor.startupFrames&&a.frame<start;
}
function boxingResolveArmor(hit){
    const {a,b,attack}=hit,previousHp=b.hp;attack.landed=true;attack.armored=true;attack.contactFrame=attack.frame;
    b.hp=Math.max(0,b.hp-hit.damage);b.damageFlash=7;b.attack.armorCharges--;
    b.stamina=Math.max(0,b.stamina-4);b.staminaDelay=BOXING_STAMINA.regenDelay;
    a.comboCount=0;a.comboTimer=0;boxingQueuePush(b,attack.facing*.8,2);
    boxingAddEffect(b.x,b.y-58,'RESISTIU','#e3c39b');boxingShowEvent('armor',b,attack.facing);
    boxeGame.hitPauseFrames=Math.max(boxeGame.hitPauseFrames,1);if(b.ai)b.ai.stats.armorHits++;
    boxingRecordRoundContact(a,b,attack,hit,previousHp-b.hp);
    window.BoxingZorpSpecial?.exchange(a,b,attack,hit);window.BoxingMasterSpecial?.exchange(a,b,attack,hit);
}
function boxingLearnVisibleAction(b,view){
    const a=view.attack,old=b.observedAction,seen=b.observedBehavior;
    if(old&&(!a||a.token!==old.token)){
        // A threat visibly withdrawn before activity can be learned as a feint only after the withdrawal.
        if(!a&&old.kind==='cross'&&view.frame-old.visibleFrame<=12&&old.frame<old.startup&&!old.landed&&!view.hitstun&&!view.whiffFrames&&
            view.frame-old.visibleFrame<old.startup+(BOXING_CONFIG.attacks[old.kind]?.active||0)+(BOXING_CONFIG.attacks[old.kind]?.recovery||0)-old.frame){
            if(old.kind==='jab'||old.kind==='cross')seen[old.kind]=Math.max(0,seen[old.kind]-1);
            seen.feint++;const item=b.attackLog.find(item=>item.token===old.token);if(item)item.kind='feint';
        }b.observedAction=null;
    }
    if(!a)return;
    if(!b.observedAction||b.observedAction.token!==a.token){
        seen.attacks++;if(a.kind==='jab'||a.kind==='cross')seen[a.kind]++;
        b.observedAction={token:a.token,kind:a.kind,frame:a.frame,startup:a.startup,landed:a.landed,visibleFrame:view.frame,rush:false};
    }
    const current=b.observedAction;current.frame=a.frame;current.landed=a.landed;current.visibleFrame=view.frame;
    if(a.rush&&!current.rush){
        current.rush=true;seen.rush++;const item=b.attackLog.find(item=>item.token===a.token);if(item)item.rush=true;
    }
}

function boxingIronObserve(b,view){
    const old=b.patternSamples.at(-1);if(old?.frame===view.frame)return;
    b.patternSamples.push({frame:view.frame,guard:!!view.guard,dodge:!!view.dodgeFrames,distant:Math.abs(view.x-boxeGame.mestre.x)>100});
    if(b.patternSamples.length>24)b.patternSamples.shift();
    const a=view.attack;
    if(a&&a.token!==b.lastPatternToken){b.lastPatternToken=a.token;b.attackLog.push({token:a.token,kind:a.kind,start:view.frame-a.frame,startup:a.startup,rush:false});if(b.attackLog.length>8)b.attackLog.shift();}
    boxingLearnVisibleAction(b,view);
    b.attackLog=b.attackLog.filter(a=>view.frame-a.start<180);
    const count=b.patternSamples.length,ratio=k=>b.patternSamples.reduce((n,s)=>n+(s[k]?1:0),0)/count;
    b.recent={jab:b.attackLog.length?b.attackLog.filter(a=>a.kind==='jab').length/b.attackLog.length:0,
        guard:ratio('guard'),dodge:ratio('dodge'),distant:ratio('distant'),attacks:b.attackLog.length,
        cross:b.attackLog.filter(a=>a.kind==='cross').length/Math.max(1,b.attackLog.length),
        feint:b.attackLog.filter(a=>a.kind==='feint').length/Math.max(1,b.attackLog.length),rush:b.attackLog.filter(a=>a.rush).length/Math.max(1,b.attackLog.length)};
}
function boxingIronStanceWait(b,now){
    const log=b.attackLog,jabs=log.filter(a=>a.kind==='jab');
    if(jabs.length<2)return boxingAiRange(8,18);
    const gaps=jabs.slice(1).map((a,i)=>a.start-jabs[i].start).sort((a,b)=>a-b),cadence=gaps[Math.floor(gaps.length/2)];
    return boxingClamp(jabs.at(-1).start+cadence+jabs.at(-1).startup-now+boxingAiRange(-3,3),6,22);
}
function boxingIronCombo(b,kind,counter){
    const r=Math.random();
    if(counter)return r<.65?['jab','cross']:r<.9?['jab']:[];
    if(kind==='jab')return r<.25?['jab','cross']:r<.62?['cross']:[];
    return r<.15?['jab','cross']:r<.48?['jab']:[];
}
window.BoxingIronCounter=Object.freeze({config:MASTER_IRON_CONFIG,startStance:boxingStartCounterStance,startSlip:boxingStartSlip,
    snapshot:()=>{const f=boxeGame.mestre;return {stance:f.counterStance?{...f.counterStance}:null,slip:f.slip?{...f.slip}:null,
        armor:!!(f.attack?.profile?.armorLate&&f.attack.armorCharges&&f.attack.frame>=f.attack.startup-3&&f.attack.frame<f.attack.startup),
        recent:f.ai?.recent||null};}});

const BOXING_RING_BOUNDS=BOXING_CONFIG.ring;
const boxingInputPress={start:false,jab:false,cross:false,special:false,dodge:false,feint:false,guard:false,guardPressed:false,restart:false};
const boxingTapMovement={x:0,y:0,frames:0};
// Contextual specials install through the same activation and cooldown gate.
const boxingSpecialSlots={zorp:null,master:null};
let boxingAccumulator=0,boxingLastUpdate=null;

function makeBoxingFighter(role,x,y){
    return {role,x,y,facing:role==='zorp'?1:-1,state:'idle',animation:'idle',stateFrame:0,
        stamina:100,maxStamina:100,staminaDelay:0,staminaNotice:0,feint:null,feintCooldown:0,perfectDodgeFrames:0,
        lastMoveX:0,lastMoveY:0,hp:BOXING_CONFIG.maxHp,maxHp:BOXING_CONFIG.maxHp,attack:null,hitstun:0,whiffFrames:0,
        guard:false,guardFlash:0,guardPressure:0,guardBreakTimer:0,guardHoldFrames:0,
        parryFrames:0,parryAttempt:false,parryCooldown:0,parryStun:0,parryRecovery:0,parryFlash:0,counterSource:null,
        dodgeFrames:0,dodgeAge:0,dodgeCooldown:0,dodgeX:0,dodgeY:0,dodgeOriginX:x,dodgeOriginY:y,
        counterWindow:0,counterTarget:null,counterStun:0,damageFlash:0,knockdowns:0,
        comboCount:0,comboTimer:0,bufferedAttack:null,bufferFrames:0,lastHitBy:null,strikeSerial:0,pushMotion:null,rushGhosts:[],counterStance:null,stanceCooldown:0,slip:null,slipCooldown:0,ironArmorNext:false,titanFeintNext:false,
        specialCooldown:0,specialCharge:0,special:null,lastSpecial:null,ai:null,aiAttackCooldown:22,aiDecisionTimer:0,aiGuardFrames:0,
        aiTargetX:x,aiTargetY:y,aiCircleSign:1,aiDodge:false};
}
const boxeGame={phase:'READY',player:makeBoxingFighter('zorp',145,218),mestre:makeBoxingFighter('master',302,198),
    juiz:{role:'judge',x:76,y:172,animation:'idle',stateFrame:0,facing:1},
    fightFrames:0,effects:[],impactBursts:[],winner:null,qaFreezeAi:false,
    introFrames:0,knockdown:null,finisher:null,cameraShake:0,hitPauseFrames:0};
boxingResetMatch();
function boxingClamp(n,min,max){return Math.max(min,Math.min(max,n));}
function boxingRingSides(y){
    const r=BOXING_CONFIG.ring,t=boxingClamp((y-r.top)/(r.bottom-r.top),0,1);
    return {left:r.backLeft+(r.frontLeft-r.backLeft)*t,right:r.backRight+(r.frontRight-r.backRight)*t};
}
function boxingConstrain(f){
    const body=BOXING_CONFIG.body;
    f.y=boxingClamp(f.y,BOXING_CONFIG.ring.top+body.radiusY,BOXING_CONFIG.ring.bottom-body.radiusY);
    const sides=boxingRingSides(f.y);f.x=boxingClamp(f.x,sides.left+body.radiusX,sides.right-body.radiusX);
}
function boxingFaceOpponent(f,target){if(f.counterStance){f.facing=f.counterStance.facing;return;}if(f.attack?.rush){f.facing=f.attack.facing;return;}if(Math.abs(target.x-f.x)>.5)f.facing=target.x>f.x?1:-1;}
function boxingMove(f,x,y,speedX,speedY){
    const oldX=f.x,oldY=f.y,length=Math.hypot(x,y);
    if(length){f.x+=x/length*speedX;f.y+=y/length*speedY;}
    boxingConstrain(f);f.lastMoveX=f.x-oldX;f.lastMoveY=f.y-oldY;
    return Math.abs(f.lastMoveX)+Math.abs(f.lastMoveY)>.08;
}
function boxingDistance(a,b){return Math.hypot(b.x-a.x,(b.y-a.y)*BOXING_CONFIG.body.depthScale);}
function boxingSeparateFighters(a,b){
    // Re-project against ropes each iteration, so a boxer pinned to a corner does not absorb separation.
    for(let i=0;i<10;i++){
        const dx=b.x-a.x,dy=(b.y-a.y)*BOXING_CONFIG.body.depthScale,d=Math.hypot(dx,dy);
        if(d>=BOXING_CONFIG.body.minSeparation-.02)return;
        const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0,push=(BOXING_CONFIG.body.minSeparation-d)/2;
        a.x-=nx*push;b.x+=nx*push;a.y-=ny*push/BOXING_CONFIG.body.depthScale;b.y+=ny*push/BOXING_CONFIG.body.depthScale;
        boxingConstrain(a);boxingConstrain(b);
    }
}
function queueBoxingMoveTap(key){
    const v={a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]}[key];
    if(v){boxingTapMovement.x=v[0];boxingTapMovement.y=v[1];boxingTapMovement.frames=2;}
}
function boxingClearPresses(){for(const k of ['jab','cross','special','dodge','feint','guardPressed','restart'])boxingInputPress[k]=false;}
function boxingReleaseInput(){
    boxingGateHeldInput();boxingClearPresses();boxingInputPress.guard=false;boxingInputPress.start=false;boxingTapMovement.frames=0;
    if(typeof keys!=='undefined'&&typeof currentScene!=='undefined'&&currentScene==='JOGO_BOXE')
        for(const k of ['w','a','s','d','j','k','l','shift','o','space'])keys[k]=false;
}
window.addEventListener('blur',()=>{window.BoxingInput.clearPhysical();boxingReleaseInput();});
function resetBoxe(startImmediately=false){
    boxeGame.phase=startImmediately?'FIGHTING':'READY';
    boxeGame.player=makeBoxingFighter('zorp',145,218);boxeGame.mestre=makeBoxingFighter('master',302,198);
    boxeGame.juiz={role:'judge',x:76,y:172,animation:'idle',stateFrame:0,facing:1};
    boxeGame.fightFrames=0;boxeGame.effects.length=0;boxeGame.impactBursts.length=0;
    boxeGame.winner=null;boxeGame.knockdown=null;boxeGame.finisher=null;boxeGame.cameraShake=0;boxeGame.hitPauseFrames=0;
    boxeGame.introFrames=0;boxeGame.qaFreezeAi=false;
    boxingAccumulator=0;boxingLastUpdate=performance.now();boxingReleaseInput();boxingResetMatch();resetBoxingPresentation();
    window.FestivalChallenges.onBoxingStart();
    if(typeof dialogBox!=='undefined')dialogBox.classList.remove('show');
}
function startBoxingFight(){boxingStartRoundIntro();}
function boxingSetAnimation(f,name){
    if(f.animation!==name){f.animation=name;f.stateFrame=0;}else f.stateFrame++;
    f.state=name;
}
function boxingAddEffect(x,y,text,color){
    boxeGame.effects.push({x,y,text,color,life:24});if(boxeGame.effects.length>14)boxeGame.effects.shift();
}
function boxingImpact(x,y,strength,color,kind){
    boxeGame.impactBursts.push({x,y,strength,color,life:13});if(boxeGame.impactBursts.length>8)boxeGame.impactBursts.shift();
    boxeGame.cameraShake=Math.max(boxeGame.cameraShake,BOXING_CONFIG.impact.shake[kind]??Math.min(2,strength*strength*.012));
}
function boxingCanAct(f){return boxeGame.phase==='FIGHTING'&&f.hp>0&&!f.hitstun&&!f.guardBreakTimer&&!f.whiffFrames&&!f.dodgeFrames&&!f.feint&&!f.parryFrames&&!f.parryStun&&!f.parryRecovery&&!f.counterStance&&!f.slip;}
function boxingAttackStartup(attack,spec){return attack.startup??spec.startup;}
function boxingIsNormal(kind){return kind==='jab'||kind==='cross';}
function boxingAttackSpec(attack){return attack.profile||BOXING_CONFIG.attacks[attack.kind];}
function boxingLinkStartup(kind,f){return (f&&boxingSpecialController(f)?.linkStartup?.(f,kind))??(kind==='cross'?BOXING_CONFIG.combo.heavyLinkStartup:BOXING_CONFIG.combo.lightLinkStartup);}
function boxingNormalProfile(f,kind,stage,target){
    const base=BOXING_CONFIG.attacks[kind],close=Math.abs(target.x-f.x)<=38&&Math.abs(target.y-f.y)<=14;
    const hand=(f.strikeSerial||0)%2?'right':'left';
    const body=close&&(stage%2===0||kind==='cross'&&target.guardPressure>25);
    return {...base,range:close?(kind==='jab'?48:54):base.range,depthTolerance:close?14:10,
        startup:close?(kind==='jab'?5:10):base.startup,recovery:close&&kind==='cross'?16:base.recovery,
        damage:body?(kind==='jab'?5:11):base.damage,staminaDamage:body?(kind==='jab'?7:15):0,
        push:kind==='jab'?3:7,lunge:kind==='jab'?(close?1.2:1.8):(close?4:6),
        variant:close?(body?'SHORT_BODY':'SHORT_HEAD'):'STRAIGHT',hand,body,
        animation:kind==='cross'?(close?'hook':'cross'):'jab_'+hand};
}
function boxingQueuePush(f,distance,frames=5){
    f.pushMotion={step:distance/frames,frames};
}
function boxingTickPush(f){
    const motion=f.pushMotion;if(!motion)return;
    f.x+=motion.step;boxingConstrain(f);if(--motion.frames<=0)f.pushMotion=null;
}
function boxingCanChain(f,target,nextKind=f.bufferedAttack||'jab'){
    const a=f.attack;if(!a||!boxingIsNormal(a.kind)||!boxingIsNormal(nextKind))return false;
    const linkedStartup=boxingLinkStartup(nextKind,f);
    return a.landed&&!a.blocked&&!a.dodged&&!a.armored&&!a.finisher&&a.stage<boxingComboLimit(f)&&f.comboTimer>0&&
        a.frame>=(a.contactFrame??boxingAttackStartup(a,boxingAttackSpec(a)))+BOXING_CONFIG.combo.cancelAfterContact&&
        target.hitstun>=linkedStartup+1&&target.lastHitBy===f.role;
}
function boxingStartAttack(f,kind,chain=false){
    if(!BOXING_CONFIG.attacks[kind]||!boxingCanAct(f)||(f.attack&&!chain))return false;
    const target=f.role==='zorp'?boxeGame.mestre:boxeGame.player;
    if(chain&&!boxingCanChain(f,target,kind))return false;
    if(!boxingSpendStamina(f,kind))return false;
    if(!chain)f.comboCount=0;
    boxingFaceOpponent(f,target);
    const stage=chain?f.comboCount+1:1,counter=f.counterWindow>0&&f.counterTarget===target.role;
    const normal=boxingIsNormal(kind)?boxingIronProfile(f,boxingNormalProfile(f,kind,stage,target),kind):null;
    const profile=normal?(boxingSpecialController(f)?.profile?.(f,normal,kind)||normal):null;
    const startup=chain?boxingLinkStartup(kind,f):(profile||BOXING_CONFIG.attacks[kind]).startup;
    if(chain)boxingSpecialController(f)?.onAttackEnded?.(f,f.attack,'CHAINED');
    f.attack={kind,frame:0,startup,profile,facing:f.facing,originY:f.y,landed:false,dodged:false,blocked:false,
        counter,counterSource:counter?(f.counterSource||'DODGE'):null,stage,linked:chain,lungeMoved:0};
    if(profile)f.strikeSerial++;
    f.attack.armorCharges=profile?.armorLate?1:0;f.ironArmorNext=false;
    boxingSpecialController(f)?.onAttackStarted?.(f,f.attack);
    f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;if(counter){f.counterWindow=0;f.counterSource=null;}
    f.animation=kind;f.state=kind;f.stateFrame=0;return true;
}
function boxingPunishReason(target){
    if(target.hitstun||target.guardBreakTimer)return null;
    if(target.parryRecovery)return 'PARRY_WHIFF';
    if(target.parryStun)return 'PARRIED';
    if(target.dodgeFrames&&target.dodgeAge>BOXING_CONFIG.dodge.invulnerableTo)return 'DODGE_RECOVERY';
    if(target.slip&&target.slip.age>6)return 'SLIP_RECOVERY';
    if(target.special&&((target.special.phase==='RECOVERY'&&!target.special.connected)||target.special.phase==='FEINT_RECOVERY'))return 'TITAN_WHIFF';
    if(target.whiffFrames)return 'WHIFF_RECOVERY';
    const a=target.attack;if(!a)return null;
    const spec=boxingAttackSpec(a),startup=boxingAttackStartup(a,spec);
    if(a.frame<startup&&!a.landed)return 'STARTUP';
    if(a.frame>=startup+spec.active&&!a.landed)return 'WHIFF_RECOVERY';
    if(a.kind==='cross'&&a.frame<startup+spec.active)return 'HEAVY_ATTACK';
    return null;
}
function boxingStartDodge(f,x,y,target){
    if(!boxingCanAct(f)||boxingBusySpecial(f)||f.dodgeCooldown||f.attack||!boxingSpendStamina(f,'dodge'))return false;
    if(Math.hypot(x,y)<.1){x=-f.facing*.3;y=f.y>209?-1:1;}
    const length=Math.hypot(x,y);f.dodgeX=x/length;f.dodgeY=y/length;
    f.dodgeOriginX=f.x;f.dodgeOriginY=f.y;
    f.dodgeFrames=BOXING_CONFIG.dodge.duration;f.dodgeAge=0;f.dodgeCooldown=BOXING_CONFIG.dodge.cooldown;
    f.guard=false;f.bufferedAttack=null;boxingSetAnimation(f,'dodge');return true;
}
function boxingRequestSpecial(f,target){
    const slot=boxingSpecialSlots[f.role];
    if(!slot||!boxingCanAct(f)||(f.attack&&!boxingSpecialController(f)?.canActivateDuringAttack?.(f,target))||f.specialCooldown)return false;
    if(slot.activate(f,target)!==true)return false;
    f.specialCooldown=slot.cooldown;return true;
}
// A new guard press commits four simulation steps, never a held/repeated key or a queued stun escape.
function boxingStartParry(f){
    if(!boxingCanAct(f)||f.attack||boxingBusySpecial(f)||f.parryCooldown||!boxingSpendStamina(f,'parry'))return false;
    f.parryFrames=BOXING_CONFIG.parry.window;f.parryAttempt=true;f.parryCooldown=BOXING_CONFIG.parry.cooldown;
    f.guard=true;f.bufferedAttack=null;f.bufferFrames=0;boxingSetAnimation(f,'guard');return true;
}
function boxingResolveParry(hit){
    const {a,b,attack,spec}=hit,cfg=BOXING_CONFIG.parry,previousHp=b.hp;
    attack.landed=true;attack.blocked=true;attack.parried=true;attack.contactFrame=attack.frame;
    if(b.counterStance){b.counterStance=null;if(b.ai)b.ai.stats.stanceSuccess++;}
    b.hp=Math.max(0,b.hp-hit.damage);b.guardFlash=8;b.parryFlash=18;b.parryFrames=0;b.parryAttempt=false;
    b.stamina=Math.max(0,b.stamina-(boxingIsNormal(attack.kind)?attack.kind==='jab'?1:3:6));
    b.staminaDelay=BOXING_STAMINA.regenDelay;
    boxingApplyGuardPressure(b,cfg.pressure[attack.kind]??cfg.pressure.special);
    // A nearly broken guard still breaks. Parry reduces pressure; it does not grant immunity to fatigue.
    if(!b.guardBreakTimer){b.counterWindow=cfg.counterWindow;b.counterTarget=a.role;b.counterSource='PARRY';}
    boxingInterruptSpecial(a,'PARRY');a.attack=null;a.whiffFrames=0;
    a.parryStun=cfg.stun;a.guard=false;a.comboCount=0;a.comboTimer=0;a.bufferedAttack=null;a.bufferFrames=0;
    boxingQueuePush(a,-attack.facing*cfg.push,4);boxingSetAnimation(a,'hurt');
    boxingAddEffect(b.x,b.y-58,'PARRY!','#b8edff');boxingImpact(b.x-attack.facing*8,b.y-48,6,'#b8edff','parry');
    boxingShowEvent('parry',b,attack.facing);boxeGame.hitPauseFrames=Math.max(boxeGame.hitPauseFrames,2);
    boxingRecordRoundContact(a,b,attack,hit,previousHp-b.hp);
    window.BoxingZorpSpecial?.exchange(a,b,attack,hit);window.BoxingMasterSpecial?.exchange(a,b,attack,hit);
}
function boxingApplyGuardPressure(target,amount){
    if(boxeGame.phase!=='FIGHTING'||!target.guard||target.guardBreakTimer||!Number.isFinite(amount)||amount<=0)return false;
    target.guardPressure=Math.min(BOXING_CONFIG.guard.max,target.guardPressure+amount);
    if(target.guardPressure<BOXING_CONFIG.guard.max)return false;
    target.guard=false;target.guardPressure=BOXING_CONFIG.guard.breakResidual;target.guardHoldFrames=0;
    boxingIronClear(target);
    target.parryFrames=0;target.parryAttempt=false;target.counterWindow=0;target.counterSource=null;
    target.guardBreakTimer=BOXING_CONFIG.guard.breakFrames;target.attack=null;target.bufferedAttack=null;target.bufferFrames=0;
    target.comboCount=0;target.comboTimer=0;boxingSetAnimation(target,'hurt');
    // The fighter's HUD state already displays "GUARDA QUEBRADA" during the stun.
    boxingShowEvent('guardBreak',target,-target.facing);
    boxeGame.hitPauseFrames=Math.max(boxeGame.hitPauseFrames,BOXING_CONFIG.impact.breakPause);return true;
}
window.BoxingSpecials=Object.freeze({
    register(role,activate,cooldownSeconds=8){
        if(!Object.hasOwn(boxingSpecialSlots,role)||typeof activate!=='function'||!Number.isFinite(cooldownSeconds)||cooldownSeconds<=0)return false;
        boxingSpecialSlots[role]={activate,cooldown:Math.ceil(cooldownSeconds*60)};return true;
    },
    available:role=>!!boxingSpecialSlots[role],
    // Returns whether the guard broke; a smaller pressure increase is still applied.
    onBlocked(target){
        if(target!==boxeGame.player&&target!==boxeGame.mestre)return false;
        return boxingApplyGuardPressure(target,BOXING_CONFIG.guard.pressure.special);
    }
});
function boxingSpecialController(f){return f.role==='zorp'?window.BoxingZorpSpecial:f.role==='master'?window.BoxingMasterSpecial:null;}
function boxingBusySpecial(f){return !!f.special&&!boxingSpecialController(f)?.isOverdrive?.(f);}
function boxingInterruptSpecial(f,reason){
    const c=boxingSpecialController(f);if(c?.onInterrupted)c.onInterrupted(f,reason);else c?.stop(f);
}
function boxingAttackCanHit(a,b,attack,spec){
    spec=attack.profile||spec;
    if(attack.kind==='dash_punch'){
        // Sweep the committed glove reach over this physical step; do not skip a fast contact.
        const from=attack.sweepFromX??a.x,forward=(b.x-from)*attack.facing;
        const reach=Math.max(spec.range,(a.x-from)*attack.facing+spec.range);
        return forward>=3&&forward<=reach&&Math.abs(b.y-attack.originY)<=spec.depthTolerance;
    }
    const forward=(b.x-a.x)*attack.facing;
    return forward>=3&&forward<=spec.range&&Math.abs(b.y-attack.originY)<=spec.depthTolerance;
}
function boxingAttackOutcome(a,b){
    const attack=a.attack;if(!attack||attack.landed||attack.dodged)return null;
    const spec=boxingAttackSpec(attack);
    const startup=boxingAttackStartup(attack,spec);
    if(attack.frame<startup||attack.frame>=startup+spec.active)return null;
    const onLine=boxingAttackCanHit(a,b,attack,spec);
    const slip=b.slip;
    if(slip&&attack.kind==='jab'&&!attack.rush&&slip.age>=3&&slip.age<=6&&
        (onLine||boxingAttackCanHit(a,{x:slip.originX,y:slip.originY},attack,spec)))return {a,b,attack,spec,dodged:true,slipped:true};
    const d=BOXING_CONFIG.dodge;
    const evading=b.dodgeFrames&&b.dodgeAge>=d.invulnerableFrom&&b.dodgeAge<=d.invulnerableTo;
    // A short sidestep can leave the line before contact; reward only a strike that covered its origin.
    const leftLine=evading&&boxingAttackCanHit(a,{x:b.dodgeOriginX,y:b.dodgeOriginY},attack,spec);
    if(evading&&(onLine||leftLine))return {a,b,attack,spec,dodged:true};
    if(!onLine)return null;
    const blocked=!spec.unblockable&&b.guard&&!b.hitstun&&!b.guardBreakTimer&&(a.x-b.x)*b.facing>=0;
    if(blocked&&b.parryFrames>0&&b.parryAttempt)return {a,b,attack,spec,blocked:true,parried:true,stage:1,
        damage:Math.round((attack.damageOverride??spec.damage)*BOXING_CONFIG.parry.damageScale)};
    const stage=attack.linked&&b.hitstun>0&&b.lastHitBy===a.role?attack.stage:1;
    const normal=boxingIsNormal(attack.kind),earned=attack.counterSource||(attack.counter?'DODGE':null);
    const armored=!blocked&&boxingIronArmor(b,attack,spec,earned);
    const crushing=!blocked&&a.role==='master'&&attack.kind==='cross'&&b.attack?.kind==='cross'&&!b.attack.landed&&b.attack.frame<boxingAttackStartup(b.attack,boxingAttackSpec(b.attack));
    const counterSource=armored?null:!blocked&&(crushing?'CRUSHING_COUNTER':earned||(normal?boxingPunishReason(b):null));
    const damage=attack.damageOverride??spec.damage,scale=normal?BOXING_CONFIG.combo.damageScale[stage-1]??.82:1;
    const bonus=counterSource?(crushing?MASTER_IRON_CONFIG.crushing.damageBonus:counterSource==='DODGE'?BOXING_CONFIG.counter.damageBonus:BOXING_CONFIG.counter.punishDamageBonus):0;
    return {a,b,attack,spec,blocked,armored,crushing,stage,counterSource,damage:blocked?Math.max(1,Math.round(damage*(spec.guardDamageScale??BOXING_CONFIG.guardDamageScale))):
        normal?Math.max(1,Math.round(damage*scale))+bonus:damage+(stage-1)+(attack.counter?BOXING_CONFIG.counter.damageBonus:0)};
}
function boxingResolveContact(hit){
    if(!hit)return;const {a,b,attack,spec}=hit;
    if(hit.armored){boxingResolveArmor(hit);return;}
    if(hit.parried){boxingResolveParry(hit);return;}
    if(hit.dodged){
        attack.dodged=true;boxingSpecialController(a)?.onDodged?.(a);b.counterTarget=a.role;b.counterSource=hit.slipped?'SLIP':'DODGE';
        const perfect=!hit.slipped&&b.dodgeAge>=BOXING_CONFIG.dodge.perfectFrom&&b.dodgeAge<=BOXING_CONFIG.dodge.perfectTo;
        b.counterWindow=hit.slipped?MASTER_IRON_CONFIG.slip.counterWindow:perfect?BOXING_CONFIG.counter.window:BOXING_CONFIG.dodge.normalCounterWindow;
        if(perfect){b.perfectDodgeFrames=26;boxeGame.hitPauseFrames=Math.max(boxeGame.hitPauseFrames,3);boxingShowEvent('perfectDodge',b,attack.facing);}
        boxingAddEffect(b.x,b.y-52,hit.slipped?'SLIP!':perfect?'PERFECT DODGE':'ESQUIVA!','#9eeaff');boxingShowEvent(hit.slipped?'slip':'dodge',b,attack.facing);return;
    }
    const previousHp=b.hp;
    attack.landed=true;attack.contactFrame=attack.frame;attack.blocked=hit.blocked;attack.stage=hit.stage;
    if(hit.counterSource){attack.counter=true;attack.counterSource=hit.counterSource;}b.hp=Math.max(0,b.hp-hit.damage);
    b.damageFlash=10;b.guardFlash=hit.blocked?9:0;
    if(hit.blocked){
        const staminaDrain=boxingIsNormal(attack.kind)?(attack.kind==='jab'?4:9):18;
        b.stamina=Math.max(0,b.stamina-staminaDrain);b.staminaDelay=BOXING_STAMINA.regenDelay;
        boxingApplyGuardPressure(b,(spec.guardPressure??BOXING_CONFIG.guard.pressure[attack.kind])+(b.stamina===0?12:0));boxingIronBlocked(b,attack);a.comboCount=0;a.comboTimer=0;
    }else{
        boxingInterruptSpecial(b,'HIT');boxingIronClear(b);
        b.parryFrames=0;b.parryAttempt=false;b.parryRecovery=0;b.parryStun=0;b.counterWindow=0;b.counterSource=null;
        b.attack=null;b.feint=null;b.guard=false;b.dodgeFrames=0;b.hitstun=spec.hitstun+(attack.counter?BOXING_CONFIG.counter.hitstunBonus:0)+(hit.crushing?MASTER_IRON_CONFIG.crushing.extraStun:0);b.lastHitBy=a.role;
        b.comboCount=0;b.comboTimer=0;b.bufferedAttack=null;b.bufferFrames=0;
        a.comboCount=attack.stage;a.comboTimer=BOXING_CONFIG.combo.window;
        if(hit.crushing){attack.crushingCounter=true;b.stamina=Math.max(0,b.stamina-MASTER_IRON_CONFIG.crushing.staminaDamage);b.staminaDelay=BOXING_STAMINA.regenDelay;if(a.ai)a.ai.stats.crushing++;}
        if(spec.staminaDamage){b.stamina=Math.max(0,b.stamina-spec.staminaDamage);b.staminaDelay=BOXING_STAMINA.regenDelay;}
        if(boxingIsNormal(attack.kind)&&(attack.stage===boxingComboLimit(a)||attack.rush?.type==='METEOR_STRAIGHT')){
            attack.finisher=true;attack.recoverUntil=attack.frame+BOXING_CONFIG.combo.finisherRecovery;
            b.hitstun=spec.finisherStun??BOXING_CONFIG.combo.finisherStun;
        }
        boxingSetAnimation(b,'hurt');
        if(attack.stage>1)boxingAddEffect(a.x,a.y-73,attack.stage+' HITS','#ffe178');
        if(attack.stage===4)boxingShowEvent('comboFour',a,attack.facing);
    }
    const normal=boxingIsNormal(attack.kind);
    if(normal){
        const distance=(attack.finisher?Math.max(BOXING_CONFIG.combo.finisherPush,spec.push):spec.push+(attack.stage===4?8:0)+(hit.crushing?MASTER_IRON_CONFIG.crushing.pushBonus:0))*(hit.blocked?.38:1);
        boxingQueuePush(b,attack.facing*distance,attack.finisher?6:4);
        if(attack.finisher){
            const projected={...b,x:b.x+attack.facing*distance};boxingConstrain(projected);
            const targetTravel=Math.abs(projected.x-b.x),gap=Math.abs(b.x-a.x);
            const recoil=Math.max(24,BOXING_CONFIG.combo.finisherGap-gap-targetTravel);
            boxingQueuePush(a,-attack.facing*recoil,6);
            boxingAddEffect(a.x,a.y-73,'COMBO FINISH','#ffe178');
        }
    }else{b.pushMotion=null;b.x+=attack.facing*(attack.pushOverride??spec.push)*(hit.blocked?(spec.guardPushScale??.38):1);boxingConstrain(b);}
    if(attack.counter)boxeGame.effects=boxeGame.effects.filter(effect=>effect.text!=='ESQUIVA!');
    boxingAddEffect(b.x,b.y-54,hit.blocked?(b.guardBreakTimer?'GUARD BREAK!':'DEFESA'):hit.crushing?'CRUSHING COUNTER!':attack.counter?'COUNTER!':spec.body?'CORPO -'+hit.damage:'-'+hit.damage,hit.blocked?'#9eeaff':'#ffbd82');
    const specialFinal=attack.kind==='dash_punch'||attack.rush?.type==='METEOR_STRAIGHT';
    boxingImpact(b.x-attack.facing*8,b.y-(spec.body?35:48),hit.blocked?3:specialFinal||attack.finisher?12:attack.counter?11:attack.kind==='jab'?5:9,hit.blocked?'#9eeaff':'#ffab72',hit.blocked?'block':specialFinal||attack.finisher?'special':hit.crushing?'crushing':attack.counter?'counter':attack.kind);
    boxingShowEvent(hit.blocked?'block':hit.crushing?'crushing':specialFinal?'special':attack.finisher?'comboFinish':attack.counter?'counter':attack.rush?'rushHit':attack.kind,b,attack.facing);
    const pause=hit.blocked?BOXING_CONFIG.impact.blockPause:attack.counter?BOXING_CONFIG.impact.counterPause:
        attack.kind==='jab'?BOXING_CONFIG.impact.lightPause:BOXING_CONFIG.impact.heavyPause;
    boxeGame.hitPauseFrames=Math.max(boxeGame.hitPauseFrames,hit.crushing?MASTER_IRON_CONFIG.crushing.hitstop:specialFinal?BOXING_CONFIG.impact.specialPause:attack.finisher?3:pause);
    boxingRecordRoundContact(a,b,attack,hit,previousHp-b.hp);
    window.BoxingZorpSpecial?.exchange(a,b,attack,hit);
    window.BoxingMasterSpecial?.exchange(a,b,attack,hit);
    boxingSpecialController(a)?.onContact(a,b,attack,hit);
}
function boxingUpdateAttack(f){
    const a=f.attack,spec=boxingAttackSpec(a);a.frame++;boxingSetAnimation(f,a.kind);
    if(a.profile){
        const next=spec.lunge*Math.min(1,a.frame/boxingAttackStartup(a,spec));let delta=next-a.lungeMoved;
        if(delta>0){
            const target=f.role==='zorp'?boxeGame.mestre:boxeGame.player;
            // Stop at real bodies, never drag or home toward the opponent on another depth line.
            if(a.rush&&Math.abs(target.y-f.y)<BOXING_CONFIG.body.radiusY*2)
                delta=Math.min(delta,Math.max(0,(target.x-f.x)*a.facing-BOXING_CONFIG.body.minSeparation));
            const x=f.x;boxingMove(f,a.facing,0,delta,0);a.lungeMoved=next;
            boxingSpecialController(f)?.onAttackStep?.(f,a,Math.abs(f.x-x));
        }
    }
    const target=f.role==='zorp'?boxeGame.mestre:boxeGame.player,canChain=boxingCanChain(f,target);
    if(canChain&&f.bufferedAttack&&boxingStartAttack(f,f.bufferedAttack,true))return;
    if(a.frame>=Math.max(boxingAttackStartup(a,spec)+spec.active+spec.recovery,a.recoverUntil||0)){
        boxingSpecialController(f)?.onAttackEnded?.(f,a,'RECOVERY_END');
        f.attack=null;if(!a.landed){f.whiffFrames=spec.whiff;f.comboCount=0;f.comboTimer=0;if(!a.rush)window.BoxingZorpSpecial?.whiff(f,f.role==='zorp'?boxeGame.mestre:boxeGame.player);}
    }
}
function boxingUpdateFighter(f,target,intent,speedX,speedY){
    boxingTickPush(f);
    for(const timer of ['dodgeCooldown','guardFlash','counterWindow','specialCooldown','comboTimer','feintCooldown','perfectDodgeFrames','parryCooldown','parryFrames','parryFlash','stanceCooldown','slipCooldown'])if(f[timer]>0)f[timer]--;
    boxingUpdateStamina(f);
    if(!f.counterWindow)f.counterSource=null;
    if(!f.comboTimer&&!f.attack)f.comboCount=0;
    if(f.bufferFrames>0){if(--f.bufferFrames===0)f.bufferedAttack=null;}
    if(intent.attack){f.bufferedAttack=intent.attack;f.bufferFrames=BOXING_CONFIG.combo.buffer;}
    if(!f.guard){f.guardPressure=Math.max(0,f.guardPressure-BOXING_CONFIG.guard.decay);f.guardHoldFrames=0;}
    if(f.hitstun||f.guardBreakTimer||f.parryStun||f.parryRecovery){
        if(f.hitstun)f.hitstun--;if(f.guardBreakTimer)f.guardBreakTimer--;
        if(f.parryStun)f.parryStun--;if(f.parryRecovery)f.parryRecovery--;
        f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;boxingSetAnimation(f,'hurt');return;
    }
    if(f.counterStance){boxingUpdateCounterStance(f);return;}
    if(f.slip){boxingUpdateSlip(f,target);return;}
    if(f.parryAttempt){
        if(f.parryFrames){f.guard=true;boxingSetAnimation(f,'guard');return;}
        f.parryAttempt=false;
        if(!intent.guard){
            f.guard=false;f.parryRecovery=BOXING_CONFIG.parry.recovery;f.bufferedAttack=null;f.bufferFrames=0;
            boxingSetAnimation(f,'idle');boxingShowEvent('parryWhiff',f);return;
        }
        // Holding Shift transitions directly into ordinary guard after the short parry window.
    }
    if(intent.special&&f.role==='zorp'&&boxingRequestSpecial(f,target))intent={...intent,special:false};
    if(f.special&&boxingSpecialController(f)?.update(f,target))return;
    if(f.feint){boxingUpdateFeint(f);return;}
    if(f.dodgeFrames){
        f.dodgeAge++;f.dodgeFrames--;
        const moving=f.dodgeAge<=BOXING_CONFIG.dodge.moveFrames;
        if(moving)boxingMove(f,f.dodgeX,f.dodgeY,BOXING_CONFIG.dodge.speedX,BOXING_CONFIG.dodge.speedY);
        if(f.counterWindow>0&&f.dodgeAge>=BOXING_CONFIG.counter.cancelAge&&f.bufferedAttack){
            f.dodgeFrames=0;
            if(boxingStartAttack(f,f.bufferedAttack))return;
        }
        boxingSetAnimation(f,'dodge');return;
    }
    if(intent.feint&&boxingStartFeint(f,target))return;
    if(f.attack){boxingUpdateAttack(f);return;}
    if(f.whiffFrames){f.whiffFrames--;f.guard=false;boxingSetAnimation(f,'idle');return;}
    if(intent.counterStance!==undefined&&boxingStartCounterStance(f,intent.counterStance))return;
    if(intent.slip&&boxingStartSlip(f,intent.y))return;
    if(intent.dodge&&boxingStartDodge(f,intent.x,intent.y,target))return;
    if(intent.special&&boxingRequestSpecial(f,target))return;
    if((intent.guardPressed||intent.parry)&&boxingStartParry(f))return;
    f.guard=!!intent.guard;
    if(f.guard){
        f.bufferedAttack=null;f.bufferFrames=0;
        f.guardHoldFrames++;
        if(boxingApplyGuardPressure(f,BOXING_CONFIG.guard.holdPressure))return;
        boxingMove(f,intent.x,intent.y,speedX*.42,speedY*.42);boxingSetAnimation(f,'guard');return;
    }
    if(f.bufferedAttack&&boxingStartAttack(f,f.bufferedAttack))return;
    const moved=boxingMove(f,intent.x,intent.y,speedX,speedY);boxingSetAnimation(f,moved?'walk':'idle');
}
// Decisions use delayed visible poses/positions. No key state or future player trajectory is read.
const BOXING_MASTER_AI_CONFIG=Object.freeze({reactionMin:12,reactionMax:21,decisionMin:6,decisionMax:10,
    memoryFrames:48,modeMin:36,modeMax:68,pressureDecay:.012,guardMin:22,guardMax:34});
function boxingAiRange(min,max){return min+Math.floor(Math.random()*(max-min+1));}
function boxingAiIdle(){return {x:0,y:0,guard:false,attack:null,dodge:false};}
function boxingCreateMasterAI(m){
    return {history:[],view:null,reactionFrames:boxingAiRange(BOXING_MASTER_AI_CONFIG.reactionMin,BOXING_MASTER_AI_CONFIG.reactionMax),
        decisionIn:0,mode:'OBSERVE',modeUntil:0,side:1,pressure:0,previousHp:m.hp,
        attackRef:null,attackSerial:0,lastThreat:0,lastOwnAttack:null,lastGuard:false,lastDodge:false,lastSpecialId:0,lastFeint:null,adaptation:{guard:0,dodge:0,distant:0,jab:0,cross:0,feint:0,rush:0,...m.aiAdaptation},
        observedBehavior:{samples:0,guard:0,dodge:0,distant:0,attacks:0,jab:0,cross:0,feint:0,rush:0},observedAction:null,patternSamples:[],attackLog:[],lastPatternToken:0,recent:{jab:0,guard:0,dodge:0,distant:0,attacks:0},comboPlan:[],sentStage:0,stancePending:false,slipPending:false,titanFeintUsed:false,
        followUp:null,followUpSent:false,preferredAttack:'jab',dodgePending:false,attackReady:0,
        lastGuardFlash:0,lastParryFlash:0,parryPending:false,blockCounterAt:0,blockCounterUntil:0,defenseReady:0,dodgeCounterSent:false,
        decisions:[],stats:{jab:0,cross:0,guard:0,dodge:0,parry:0,parrySuccess:0,special:0,hits:0,blocked:0,whiffs:0,dodged:0,interrupted:0,
            counterStance:0,stanceSuccess:0,stanceWhiffs:0,slip:0,armorHits:0,crushing:0,titanFeints:0,measure:0,damageTaken:0,feint:0,approach:0,pressure:0,cautious:0,reposition:0,defensivePlans:0,comboFollowUps:0}};
}
function boxingAiObserve(b,p,now){
    const a=p.attack||(p.feint&&p.feint.age<BOXING_CONFIG.feint.threatFrames?p.feint:null);
    if(b.attackRef!==a){b.attackRef=a;if(a)b.attackSerial++;}
    b.history.push({frame:now,x:p.x,y:p.y,hp:p.hp,guard:p.guard,dodgeFrames:p.dodgeFrames,
        hitstun:p.hitstun,whiffFrames:p.whiffFrames,
        attack:a?{token:b.attackSerial,kind:a.kind,frame:a.frame,startup:boxingAttackStartup(a,BOXING_CONFIG.attacks[a.kind]),
            facing:a.facing,originY:a.originY,landed:a.landed,dodged:a.dodged,rush:!!(a.rush&&a.frame>=Math.ceil(boxingAttackStartup(a,boxingAttackSpec(a))*.35))}:null});
    while(b.history.length>BOXING_MASTER_AI_CONFIG.memoryFrames)b.history.shift();
    const cutoff=now-b.reactionFrames;
    // Keep the last *reacted-to* observation until the next decision; never expose today's sample to planning.
    const delayed=b.history.findLast(sample=>sample.frame<=cutoff)||null;
    return delayed&&b.view&&delayed.frame<b.view.frame?b.view:delayed;
}
function boxingAiTrackOwnState(b,m,now){
    const damage=Math.max(0,b.previousHp-m.hp);b.previousHp=m.hp;
    if(damage){b.pressure=Math.min(4,b.pressure+Math.min(1.6,damage/(m.guardFlash?18:6)));b.stats.damageTaken+=damage;
        if(!m.guardFlash){b.blockCounterAt=0;b.blockCounterUntil=0;}}
    if(m.guardFlash>b.lastGuardFlash){
        b.blockCounterAt=now+boxingAiRange(6,10);b.blockCounterUntil=now+30;
    }b.lastGuardFlash=m.guardFlash;
    if(m.parryFlash>b.lastParryFlash){
        b.stats.parrySuccess++;b.blockCounterAt=now+boxingAiRange(3,6);b.blockCounterUntil=now+20;
    }b.lastParryFlash=m.parryFlash;
    if(!m.dodgeFrames)b.dodgeCounterSent=false;
    b.pressure=Math.max(0,b.pressure-BOXING_MASTER_AI_CONFIG.pressureDecay);
    if(b.lastOwnAttack!==m.attack){
        const old=b.lastOwnAttack;
        if(old){
            if(old.landed){if(old.blocked)b.stats.blocked++;else b.stats.hits++;}
            else if(old.dodged)b.stats.dodged++;
            else if(old.frame>=boxingAttackStartup(old,BOXING_CONFIG.attacks[old.kind]))b.stats.whiffs++;
            else b.stats.interrupted++;
        }
        if(old?.finisher){boxingAiSetMode(b,'MEASURE',now,boxingAiRange(18,40));b.attackReady=Math.max(b.attackReady,b.modeUntil);}
        b.lastOwnAttack=m.attack;
        if(m.attack&&Object.hasOwn(b.stats,m.attack.kind))b.stats[m.attack.kind]++;
    }
    if(m.feint&&m.feint!==b.lastFeint)b.stats.feint++;b.lastFeint=m.feint;
    if(m.guard&&!b.lastGuard)b.stats.guard++;b.lastGuard=m.guard;
    if(m.dodgeFrames&&!b.lastDodge)b.stats.dodge++;b.lastDodge=!!m.dodgeFrames;
    if(m.special&&m.special.id!==b.lastSpecialId){b.lastSpecialId=m.special.id;b.stats.special++;}
}
function boxingAiSetMode(b,mode,now,duration){
    b.mode=mode;b.modeUntil=now+duration;
    if(mode!=='SPECIAL')b.specialPending=false;
    if(mode==='MEASURE')b.stats.measure++;
    if(mode==='APPROACH')b.stats.approach++;if(mode==='PRESSURE')b.stats.pressure++;
    if(mode==='CAUTIOUS')b.stats.cautious++;if(mode==='REPOSITION')b.stats.reposition++;
}
function boxingAiSide(m,view){
    // Prefer room to leave the last observed attack line; only the boxer knows its own rope clearance immediately.
    const top=m.y-BOXING_CONFIG.ring.top-8,bottom=BOXING_CONFIG.ring.bottom-8-m.y;
    if(top<14)return 1;if(bottom<14)return -1;
    if(view.attack&&Math.abs(m.y-view.attack.originY)>3)return Math.sign(m.y-view.attack.originY);
    return Math.random()<.5?-1:1;
}
function boxingAiPlan(b,m,view,now){
    const dx=view.x-m.x,dy=view.y-m.y,ax=Math.abs(dx),ay=Math.abs(dy),a=view.attack;
    const spec=a&&BOXING_CONFIG.attacks[a.kind];
    const threat=spec&&a&&!a.landed&&!a.dodged&&(m.x-view.x)*a.facing>0&&ax<=spec.range+14&&Math.abs(m.y-a.originY)<=spec.depthTolerance+5;
    const freshThreat=threat&&a.token!==b.lastThreat;if(freshThreat)b.lastThreat=a.token;
    const busy=m.attack||m.special||m.dodgeFrames||m.feint||m.parryFrames||m.parryRecovery||m.parryStun||m.slip||m.counterStance;
    if(!busy&&!m.hitstun&&!m.guardBreakTimer&&b.blockCounterAt&&now>=b.blockCounterAt&&now<b.blockCounterUntil){
        b.blockCounterAt=0;b.blockCounterUntil=0;boxingAiSetMode(b,'PRESSURE',now,28);
        b.preferredAttack=m.counterWindow?'cross':'jab';b.attackReady=now;m.aiAttackCooldown=0;b.defenseReady=now+18;
    }else if(!busy&&now>=b.defenseReady&&(freshThreat||b.pressure>=1.05&&now>=b.modeUntil)){
        b.side=boxingAiSide(m,view);b.stats.defensivePlans++;const choice=Math.random(),stressed=m.guardPressure>65,feintHabit=Math.max(b.recent.feint||0,b.adaptation.feint||0);
        const evasionBias=Math.max(b.recent.cross||0,b.recent.rush||0,b.adaptation.cross||0,b.adaptation.rush||0)>.4;
        if(freshThreat&&a.kind==='jab'&&!m.slipCooldown&&choice<.25){b.slipPending=true;boxingAiSetMode(b,'SLIP',now,20);}
        else if(freshThreat&&!stressed&&!m.parryCooldown&&choice<(evasionBias?.32:.45)*(1-feintHabit*.6)){b.parryPending=true;boxingAiSetMode(b,'PARRY',now,18);}
        else if(!m.dodgeCooldown&&choice<(stressed||evasionBias?.78:.65)){b.dodgePending=true;boxingAiSetMode(b,'EVADE',now,24);}
        else if(!stressed&&choice<.88)boxingAiSetMode(b,'DEFEND',now,boxingAiRange(22,34));
        else boxingAiSetMode(b,'REPOSITION',now,boxingAiRange(18,28));
        b.attackReady=Math.max(b.attackReady,now+boxingAiRange(12,20));b.defenseReady=now+boxingAiRange(24,36);
    }else if(!busy&&now>=b.modeUntil){
        b.side=boxingAiSide(m,view);const aggressive=m.hp<view.hp-12||m.hp<=35,leading=m.hp-view.hp>=18;
        const spam=b.recent.attacks>=2&&(b.recent.jab>=.6||b.adaptation.jab>.5);
        const feintHabit=Math.max(b.recent.feint||0,b.adaptation.feint||0),rushHabit=Math.max(b.recent.rush||0,b.adaptation.rush||0);
        if(ax>(b.adaptation.distant>.4?72:85)||ay>23)boxingAiSetMode(b,'APPROACH',now,boxingAiRange(30,48));
        else if(!m.stanceCooldown&&ay<=12&&ax>=32&&ax<=80&&Math.random()<(spam?.7:.16)*(1-feintHabit*.7)*(1-rushHabit*.35)){
            b.stanceWait=boxingIronStanceWait(b,now);b.stancePending=true;boxingAiSetMode(b,'COUNTER_STANCE',now,48);
        }else{
            const choice=Math.random(),measure=aggressive?.22:leading?.62:.48;
            boxingAiSetMode(b,choice<measure?'MEASURE':choice<measure+.16?'CAUTIOUS':'PRESSURE',now,boxingAiRange(18,60));
        }
        b.preferredAttack=Math.random()<(b.mode==='PRESSURE'?.52:.3)?'jab':'cross';
    }
    const reversal=m.hp<=35&&m.specialCharge>=100&&(b.mode==='PRESSURE'||now>=b.modeUntil);
    if(!busy&&!m.hitstun&&!m.guardBreakTimer&&!m.whiffFrames&&(!freshThreat||reversal)&&(b.pressure<1.8||reversal)&&
        (!['DEFEND','EVADE','SLIP','PARRY','COUNTER_STANCE','REPOSITION'].includes(b.mode)||reversal)){
        if(window.BoxingMasterSpecial?.shouldUse(m,view)){boxingAiSetMode(b,'SPECIAL',now,60);b.specialPending=true;}
        else if(window.BoxingMasterSpecial?.positionIntent(m,view))boxingAiSetMode(b,'SPECIAL_SETUP',now,54);
    }
    b.decisions.push({frame:now,observedFrame:view.frame,lag:now-view.frame,mode:b.mode,pressure:+b.pressure.toFixed(2)});
    if(b.decisions.length>24)b.decisions.shift();
}
function boxingMasterIntent(){
    if(boxeGame.phase!=='FIGHTING')return boxingAiIdle();
    const m=boxeGame.mestre,p=boxeGame.player,now=boxeGame.fightFrames,b=m.ai||(m.ai=boxingCreateMasterAI(m));
    boxingAiTrackOwnState(b,m,now);const observed=boxingAiObserve(b,p,now),intent=boxingAiIdle();
    if(m.aiAttackCooldown)m.aiAttackCooldown--;if(!observed)return intent;
    if(--b.decisionIn<=0){
        b.decisionIn=boxingAiRange(BOXING_MASTER_AI_CONFIG.decisionMin,BOXING_MASTER_AI_CONFIG.decisionMax);
        b.observedBehavior.samples++;b.observedBehavior.guard+=observed.guard?1:0;b.observedBehavior.dodge+=observed.dodgeFrames?1:0;
        b.observedBehavior.distant+=Math.abs(observed.x-m.x)>100?1:0;
        boxingIronObserve(b,observed);b.view=observed;m.aiTargetX=observed.x;m.aiTargetY=observed.y;
        boxingAiPlan(b,m,observed,now);b.reactionFrames=boxingAiRange(BOXING_MASTER_AI_CONFIG.reactionMin,BOXING_MASTER_AI_CONFIG.reactionMax);
    }
    const view=b.view;if(!view)return intent;const dx=view.x-m.x,dy=view.y-m.y,ax=Math.abs(dx),ay=Math.abs(dy);
    if(!m.attack&&boxingCanAct(m)&&b.blockCounterAt&&now>=b.blockCounterAt&&now<b.blockCounterUntil){
        b.blockCounterAt=0;b.blockCounterUntil=0;boxingAiSetMode(b,'PRESSURE',now,28);b.preferredAttack=m.counterWindow?'cross':'jab';b.attackReady=now;m.aiAttackCooldown=0;
    }
    if(m.special||m.feint||m.counterStance)return intent;
    if(m.attack){
        const next=b.comboPlan[m.attack.stage-1];
        if(next&&b.sentStage!==m.attack.stage&&m.attack.stage<3&&boxingCanChain(m,p,next)){
            intent.attack=next;b.sentStage=m.attack.stage;b.stats.comboFollowUps++;
        }return intent;
    }
    if(m.slip){if(m.counterWindow&&m.slip.age>=8){intent.attack='cross';b.comboPlan=['jab','cross'];b.sentStage=0;}return intent;}
    if(m.dodgeFrames&&m.counterWindow&&m.dodgeAge>=BOXING_CONFIG.counter.cancelAge&&!b.dodgeCounterSent&&ax<=62&&ay<=12){
        b.dodgeCounterSent=true;intent.attack='cross';b.comboPlan=['jab'];b.sentStage=0;return intent;
    }
    if(m.hitstun||m.guardBreakTimer||m.whiffFrames||m.dodgeFrames||m.parryFrames||m.parryRecovery||m.parryStun)return intent;
    if(b.mode==='COUNTER_STANCE'&&now<b.modeUntil){
        if(b.stancePending){b.stancePending=false;intent.counterStance=b.stanceWait;}return intent;
    }
    if(b.mode==='PARRY'&&now<b.modeUntil){if(b.parryPending){b.parryPending=false;b.stats.parry++;intent.parry=true;}return intent;}
    if(b.mode==='SLIP'&&now<b.modeUntil){if(b.slipPending){b.slipPending=false;intent.slip=true;intent.y=b.side;}return intent;}
    if(b.specialPending){
        b.specialPending=false;
        // Chosen before charge begins, from recent observed dodge frequency. Never a response to this frame's input.
        m.titanFeintNext=boxeGame.rounds.number>=2&&!b.titanFeintUsed&&b.recent.dodge>.15&&Math.random()<.08;
        if(m.titanFeintNext){b.titanFeintUsed=true;b.stats.titanFeints++;}intent.special=true;return intent;
    }
    if(b.mode==='EVADE'&&b.dodgePending&&!m.dodgeCooldown){b.dodgePending=false;intent.dodge=true;intent.y=b.side;return intent;}
    if(b.mode==='DEFEND'&&now<b.modeUntil){intent.guard=true;intent.x=ax<38?-Math.sign(dx)*.45:0;return intent;}
    if((b.mode==='REPOSITION'||b.mode==='EVADE')&&now<b.modeUntil){intent.y=b.side;intent.x=ax<65?-Math.sign(dx)*.25:0;return intent;}
    if(b.mode==='MEASURE'&&now<b.modeUntil){intent.x=ax<44?-Math.sign(dx)*.3:ax>78?Math.sign(dx)*.25:0;return intent;}
    if(b.mode==='SPECIAL_SETUP'){const setup=window.BoxingMasterSpecial?.positionIntent(m,view);if(setup)return setup;}
    const cautious=b.mode==='CAUTIOUS',rushHabit=Math.max(b.recent.rush||0,b.adaptation.rush||0),desired=(cautious?65:b.mode==='PRESSURE'?43:54)+(rushHabit>.35?8:0);
    intent.x=ax>desired+5?Math.sign(dx):ax<desired-10?-Math.sign(dx)*.55:0;
    const lane=b.mode==='APPROACH'&&ax>100?view.y*.75+209*.25:view.y;
    intent.y=Math.abs(lane-m.y)>6?Math.sign(lane-m.y):cautious?b.side*.2:0;if(ay>17)intent.x*=.6;
    const dodgeHabit=Math.max(b.recent.dodge,b.adaptation.dodge),guardHabit=Math.max(b.recent.guard,b.adaptation.guard);
    if(now>=b.attackReady&&!m.aiAttackCooldown&&!m.feintCooldown&&ax>=35&&ax<=80&&ay<=14&&
        (view.guard||view.dodgeFrames||guardHabit>.3||dodgeHabit>.15)&&Math.random()<.12+Math.min(.45,dodgeHabit*.7+guardHabit*.25)){
        intent.feint=true;b.attackReady=now+28;m.aiAttackCooldown=28;return intent;
    }
    const opening=view.whiffFrames>0||view.hitstun>0||m.counterWindow>0;
    const choice=opening||guardHabit>.45?'cross':b.preferredAttack;
    const perceivedReach=BOXING_CONFIG.attacks[choice].range-2;
    if(now>=b.attackReady&&!m.aiAttackCooldown&&ax>=24&&ax<=perceivedReach&&ay<=10.5){
        intent.attack=choice;b.comboPlan=boxingIronCombo(b,choice,!!m.counterWindow);b.sentStage=0;
        m.ironArmorNext=choice==='cross'&&!m.counterWindow&&m.stamina>=35&&b.pressure>.35&&rushHabit<.35&&Math.max(b.recent.cross||0,b.adaptation.cross||0)<.45&&Math.random()<.35;
        const urgent=m.hp<view.hp-12||m.hp<=35;
        m.aiAttackCooldown=boxingAiRange(urgent?26:cautious?44:36,urgent?42:cautious?66:56);
        b.attackReady=now+m.aiAttackCooldown;intent.x=0;intent.y=0;
    }
    return intent;
}

window.BoxingMasterAI=Object.freeze({config:BOXING_MASTER_AI_CONFIG,snapshot:()=>{
    const b=boxeGame.mestre.ai;
    return b?{mode:b.mode,reactionFrames:b.reactionFrames,pressure:b.pressure,
        observedFrame:b.view?.frame??null,observedX:b.view?.x??null,observedY:b.view?.y??null,
        stats:{...b.stats},recent:{...b.recent},comboPlan:[...b.comboPlan],adaptation:{...b.adaptation},observedBehavior:{...b.observedBehavior},decisions:b.decisions.map(d=>({...d}))}:null;
}});

function boxingStep(){
    window.BoxingZorpSpecial?.clock();
    // Consume real time, not input: a fresh press during contact waits for the next simulation step.
    if(boxeGame.phase==='FIGHTING'&&boxeGame.hitPauseFrames>0){boxeGame.hitPauseFrames--;boxingRoundClockStep();return;}
    updateBoxingPresentation();
    for(const f of [boxeGame.player,boxeGame.mestre])if(f.damageFlash>0)f.damageFlash--;
    for(const e of boxeGame.effects)e.life--;boxeGame.effects=boxeGame.effects.filter(e=>e.life>0);
    for(const e of boxeGame.impactBursts)e.life--;boxeGame.impactBursts=boxeGame.impactBursts.filter(e=>e.life>0);
    boxeGame.cameraShake*=.78;if(boxeGame.cameraShake<.15)boxeGame.cameraShake=0;
    if(boxingAdvanceRoundPhase()){boxingClearPresses();return;}
    boxeGame.fightFrames++;
    window.BoxingZorpSpecial?.tick();
    window.BoxingMasterSpecial?.tick();
    const p=boxeGame.player,m=boxeGame.mestre;boxingFaceOpponent(p,m);boxingFaceOpponent(m,p);
    const x=(keys.d?1:0)-(keys.a?1:0)||(boxingTapMovement.frames?boxingTapMovement.x:0);
    const y=(keys.s?1:0)-(keys.w?1:0)||(boxingTapMovement.frames?boxingTapMovement.y:0);
    const playerIntent={x,y,guard:boxingInputPress.guard,guardPressed:boxingInputPress.guardPressed,dodge:boxingInputPress.dodge,special:boxingInputPress.special,feint:boxingInputPress.feint,
        attack:boxingInputPress.cross?'cross':boxingInputPress.jab?'jab':null};
    const masterIntent=boxeGame.qaFreezeAi?{x:0,y:0,guard:false,attack:null,dodge:false}:boxingMasterIntent();
    boxingUpdateFighter(p,m,playerIntent,BOXING_CONFIG.movement.playerX,BOXING_CONFIG.movement.playerY);
    boxingUpdateFighter(m,p,masterIntent,BOXING_CONFIG.movement.masterX,BOXING_CONFIG.movement.masterY);
    boxingSeparateFighters(p,m);boxingFaceOpponent(p,m);boxingFaceOpponent(m,p);
    // Sample both contacts before knockback/damage, allowing fair simultaneous trades.
    const contacts=[boxingAttackOutcome(p,m),boxingAttackOutcome(m,p)];contacts.forEach(boxingResolveContact);
    boxingSeparateFighters(p,m);boxingFaceOpponent(p,m);boxingFaceOpponent(m,p);
    boxingResolveRoundFrame(contacts);
    boxeGame.juiz.stateFrame++;
    if(boxingTapMovement.frames)boxingTapMovement.frames--;boxingClearPresses();
}
function updateBoxeGame(deltaSeconds){
    const now=performance.now();
    const dt=typeof deltaSeconds==='number'?deltaSeconds:boxingLastUpdate===null?BOXING_CONFIG.step:(now-boxingLastUpdate)/1000;
    boxingLastUpdate=now;
    hintText.innerText=boxeGame.phase==='RESULT'?'R: REINICIAR | ESC: SAIR':
        boxeGame.phase==='KNOCKDOWN'?'CONTAGEM DO JUIZ / AGUARDE':boxeGame.phase==='INTRO'?'PREPARE-SE!':['ROUND_RESULT','INTERMISSION'].includes(boxeGame.phase)?'INTERVALO ENTRE ROUNDS':
        'A/D HORIZONTAL | W/S PROFUNDIDADE | J FRACO | K FORTE | L FINTA | SHIFT GUARDA | SPACE ESQUIVA | O RUSH OVERDRIVE';
    if(document.hidden||boxeGame.phase==='PRE_GAME'){boxingAccumulator=0;return;}
    boxingAccumulator+=boxingClamp(Number.isFinite(dt)?dt:0,0,.1);
    while(boxingAccumulator+1e-9>=BOXING_CONFIG.step){boxingAccumulator-=BOXING_CONFIG.step;boxingStep();}
}

function drawBoxingArenaCover() {
    drawBoxingOfficialArena();
    drawBoxingCrowd();
    drawBoxingEventLighting();
}
// Presentation selects actual 3.0 damage/stun poses without changing combat state.
function boxingPresentationAnimation(actor) {
    if(actor.feint&&actor.feint.age<BOXING_CONFIG.feint.threatFrames)return 'hook';
    if(actor.attack&&boxingIsNormal(actor.attack.kind)&&!boxingBusySpecial(actor))return actor.attack.profile?.animation||actor.animation;
    if (actor.role === "judge") {
        if (actor.animation === "count" && (boxeGame.knockdown?.count||0)<=1) return "count_start";
        if (actor.animation === "ko" && boxeGame.phase === "RESULT" && actor.stateFrame > 18) return "victory";
        return actor.animation;
    }
    if (actor.animation === "hurt" && (actor.counterStun > 0 || actor.guardBreakTimer > 0 || actor.parryStun > 0)) return "stun";
    if (actor.animation === "idle") {
        const health = actor.hp / actor.maxHp;
        if (health <= .34) return "idle_heavy";
        if (health <= .67) return "idle_damaged";
    }
    return actor.animation;
}
function drawBoxingActor(actor) {
    const role = actor.role, spriteSet = BOXING_SPRITES[role];
    const animation = boxingPresentationAnimation(actor);
    const specialSprite=boxingSpecialController(actor)?.visual(actor)||null;
    const frames = specialSprite?[specialSprite]:spriteSet && spriteSet[animation];
    if (!frames || !frames.length) return;
    const duration = actor.role==='judge'&&animation==='step'?4:BOXING_FRAME_DURATIONS[animation] || 7;
    const recoil = boxingShow.recoil[role];
    const visualFrame = recoil?.hold > 0 && !actor.cinematicPose ? recoil.poseFrame : actor.stateFrame;
    const frameNumber = Math.floor(visualFrame / duration);
    const looping = ["idle", "idle_damaged", "idle_heavy", "walk", "guard", "stun", "count", "observe", "step"].includes(animation);
    // The judge observes the downed boxer while the round result pauses combat.
    // No finger-number poses are inferred from unrelated gestures.
    let index = looping ? frameNumber % frames.length : Math.min(frames.length - 1, frameNumber);
    if(!specialSprite&&actor.attack&&boxingIsNormal(actor.attack.kind)&&!boxingBusySpecial(actor)){
        const a=actor.attack,spec=boxingAttackSpec(a),startup=boxingAttackStartup(a,spec);
        index=a.frame<startup?0:a.frame<startup+spec.active?Math.min(frames.length-2,1+(frames.length>3&&a.frame>startup?1:0)):frames.length-1;
    }
    if(actor.feint&&actor.feint.age<BOXING_CONFIG.feint.threatFrames)index=0; // Real windup pose, no active punch/hitbox.
    const sprite = frames[index];
    const near = boxingClamp((actor.y - BOXING_CONFIG.ring.top) /
        (BOXING_CONFIG.ring.bottom - BOXING_CONFIG.ring.top), 0, 1);
    const scale = (role === "judge" ? 0.47 : 0.53) * (0.91 + near * 0.16);
    ctx.fillStyle = "rgba(4,7,17,.4)";
    ctx.beginPath(); ctx.ellipse(actor.x, actor.y + 2, role === "judge" ? 13 : 19, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (!sprite.complete || !sprite.naturalWidth) return;
    if(specialSprite)boxingSpecialController(actor).drawGhosts(ctx,actor,scale);
    ctx.save(); ctx.translate(Math.round(actor.x), Math.round(actor.y));
    if (recoil?.life > 0 && !actor.cinematicPose && actor.animation !== "knockdown") {
        const weight = recoil.life / recoil.maxLife * recoil.strength;
        ctx.translate(recoil.direction * weight * 1.2, 0);
        ctx.rotate(recoil.direction * weight * .045);
    }
    if (actor.cinematicPose?.rotation) ctx.rotate(actor.cinematicPose.rotation);
    if (role !== "judge" && actor.hp < actor.maxHp * 0.35 && animation === "idle")
        ctx.rotate(actor.facing * 0.035);
    let visualFacing = actor.attack?.rush?actor.attack.facing:role==='master'&&actor.special?actor.special.facing:actor.facing;
    if (role === "judge") {
        const winnerRole=boxeGame.phase==='RESULT'?boxeGame.winner:boxeGame.phase==='ROUND_RESULT'?boxeGame.rounds.result?.winner:null;
        const observed = winnerRole?(winnerRole==='zorp'?boxeGame.player.x:boxeGame.mestre.x):boxeGame.knockdown && (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP")
            ? (boxeGame.knockdown.role === "zorp" ? boxeGame.player : boxeGame.mestre).x
            : (boxeGame.player.x + boxeGame.mestre.x) / 2;
        visualFacing = observed >= actor.x ? 1 : -1;
    }
    if (visualFacing < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -sprite.boxingAnchorX * scale,
        -(sprite.boxingFootY + 1) * scale,
        BOXING_FRAME_CANVAS.width * scale, BOXING_FRAME_CANVAS.height * scale);
    ctx.restore();
    drawBoxingPunchTrace(actor);
    if (role !== "judge") {
        const wear = 1 - actor.hp / actor.maxHp;
        if (wear > 0.32 && animation !== "knockdown" && animation !== "defeat") {
            ctx.fillStyle = `rgba(106,32,62,${boxingClamp((wear - 0.25) * 0.9, 0, 0.48)})`;
            ctx.beginPath(); ctx.ellipse(actor.x + actor.facing * 8, actor.y - 52, 5, 3, -0.2, 0, Math.PI * 2); ctx.fill();
            if (wear > 0.62) {
                ctx.strokeStyle = "rgba(145,47,64,.75)"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(actor.x - actor.facing * 5, actor.y - 60);
                ctx.lineTo(actor.x - actor.facing * 1, actor.y - 55); ctx.stroke();
                ctx.fillStyle = "rgba(180,231,255,.72)";
                ctx.beginPath(); ctx.arc(actor.x + actor.facing * 12, actor.y - 43, 1.8, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
    drawBoxingFighterState(actor);
}

function drawBoxingFrontRopes() {
    drawBoxingOfficialFrontRopes();
}
function drawBoxingHud(){drawBoxingFightHud(ctx);}
function drawBoxingEffects(){drawBoxingReadableEffects();}
function drawBoxeGame() {
    ctx.fillStyle='#0b1019';ctx.fillRect(0,0,450,300);
    ctx.save();ctx.beginPath();ctx.rect(0,0,450,300);ctx.clip();
    const camera=boxingShow.camera,n=boxeGame.fightFrames;
    const shake=Math.min(2,Math.max(0,boxeGame.cameraShake));
    ctx.translate(Math.round(camera.x+Math.sin(n*2.4)*shake),Math.round(camera.y+Math.cos(n*3.1)*shake*.55));
    drawBoxingArenaCover();
    [boxeGame.juiz, boxeGame.player, boxeGame.mestre]
        .map(actor => actor.cinematicPose
            ? { ...actor, x: actor.cinematicPose.x, y: actor.cinematicPose.y }
            : actor)
        .sort((a, b) => a.y - b.y).forEach(drawBoxingActor);
    drawBoxingEffects();
    drawBoxingContactParticles();
    drawBoxingFrontRopes();
    ctx.restore();
    drawBoxingHud();
    drawBoxingRoundOverlay(ctx);
    if (new URLSearchParams(location.search).has("boxeDebug")) {
        ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(4, 269, 442, 26);
        ctx.fillStyle = "#aef3ff"; ctx.font = "8px monospace"; ctx.textAlign = "left";
        const p = boxeGame.player, m = boxeGame.mestre;
        ctx.fillText(`Z ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.animation} HP${p.hp} | M ${m.x.toFixed(0)},${m.y.toFixed(0)} ${m.animation} HP${m.hp}`, 9, 280);
        ctx.fillText(`assets ${boxingAssetStatus.loaded}/${boxingAssetStatus.requested} | d ${boxingDistance(p, m).toFixed(1)} | IA ${boxeGame.qaFreezeAi ? "OFF" : "ON"}`, 9, 290);
    }
}
window.getBoxeQaSnapshot = () => ({
    phase: boxeGame.phase, winner: boxeGame.winner,rounds:window.BoxingRounds.snapshot(), hitPauseFrames:boxeGame.hitPauseFrames,
    finisherFrame: boxeGame.finisher?.frame ?? null,
    knockdown: boxeGame.knockdown ? { ...boxeGame.knockdown } : null,
    player: { x: boxeGame.player.x, y: boxeGame.player.y, hp: boxeGame.player.hp,stamina:boxeGame.player.stamina,feint:boxeGame.player.feint?.age??null,perfectDodgeFrames:boxeGame.player.perfectDodgeFrames,
        animation: boxeGame.player.animation, attack: boxeGame.player.attack?.kind || null,variant:boxeGame.player.attack?.profile?.variant||null,bodyShot:!!boxeGame.player.attack?.profile?.body,counterSource:boxeGame.player.attack?.counterSource||null,
        guard: boxeGame.player.guard, dodgeAge: boxeGame.player.dodgeAge,
        knockdowns: boxeGame.player.knockdowns, facing:boxeGame.player.facing, combo:boxeGame.player.comboCount, hitstun:boxeGame.player.hitstun, whiffFrames:boxeGame.player.whiffFrames,
        parry:{window:boxeGame.player.parryFrames,stun:boxeGame.player.parryStun,recovery:boxeGame.player.parryRecovery,cooldown:boxeGame.player.parryCooldown},guardPressure:boxeGame.player.guardPressure,guardBreakTimer:boxeGame.player.guardBreakTimer,counterWindow:boxeGame.player.counterWindow,dodgeFrames:boxeGame.player.dodgeFrames },
    mestre: { x: boxeGame.mestre.x, y: boxeGame.mestre.y, hp: boxeGame.mestre.hp,stamina:boxeGame.mestre.stamina,feint:boxeGame.mestre.feint?.age??null,
        animation: boxeGame.mestre.animation, attack: boxeGame.mestre.attack?.kind || null,variant:boxeGame.mestre.attack?.profile?.variant||null,bodyShot:!!boxeGame.mestre.attack?.profile?.body,counterSource:boxeGame.mestre.attack?.counterSource||null,
        guard: boxeGame.mestre.guard, dodgeAge: boxeGame.mestre.dodgeAge,
        knockdowns: boxeGame.mestre.knockdowns, facing:boxeGame.mestre.facing, combo:boxeGame.mestre.comboCount, hitstun:boxeGame.mestre.hitstun, whiffFrames:boxeGame.mestre.whiffFrames,
        parry:{window:boxeGame.mestre.parryFrames,stun:boxeGame.mestre.parryStun,recovery:boxeGame.mestre.parryRecovery,cooldown:boxeGame.mestre.parryCooldown},guardPressure:boxeGame.mestre.guardPressure,guardBreakTimer:boxeGame.mestre.guardBreakTimer,counterWindow:boxeGame.mestre.counterWindow,dodgeFrames:boxeGame.mestre.dodgeFrames },
    juiz: { x: boxeGame.juiz.x, y: boxeGame.juiz.y,
        animation: boxeGame.juiz.animation, count: boxeGame.juiz.countNumber || 0 },
    distance: boxingDistance(boxeGame.player, boxeGame.mestre),
    assets: { ...boxingAssetStatus },
    presentation: boxingPresentationSnapshot(),special:window.BoxingZorpSpecial?.snapshot()||null,masterSpecial:window.BoxingMasterSpecial?.snapshot()||null,masterAI:window.BoxingMasterAI?.snapshot()||null
});

