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
    dodge:Object.freeze({duration:18, moveFrames:8, invulnerableFrom:3, invulnerableTo:10, cooldown:40, speedX:3.2, speedY:2.3}),
    combo:Object.freeze({buffer:12, window:42, maxHits:3, cancelRecovery:0, heavyLinkStartup:8}),
    counter:Object.freeze({window:32, cancelAge:10, damageBonus:3, hitstunBonus:4}),
    impact:Object.freeze({lightPause:1,heavyPause:2,counterPause:3,blockPause:1,breakPause:3}),
    attacks:Object.freeze({
        jab:Object.freeze({damage:6,range:52,depthTolerance:11,startup:6,active:3,recovery:10,whiff:4,hitstun:12,push:4}),
        cross:Object.freeze({damage:14,range:63,depthTolerance:12,startup:12,active:4,recovery:18,whiff:8,hitstun:18,push:11}),
        dash_punch:Object.freeze({damage:28,range:54,depthTolerance:11,startup:36,active:24,recovery:20,whiff:36,hitstun:24,push:24,guardPressure:110,guardDamageScale:.5,guardPushScale:.85}),
        weave_finish:Object.freeze({damage:26,range:64,depthTolerance:12,startup:10,active:4,recovery:18,whiff:12,hitstun:22,push:18,guardPressure:72}),
        weave_rush:Object.freeze({damage:5,range:60,depthTolerance:12,startup:2,active:2,recovery:4,whiff:12,hitstun:11,push:2,guardPressure:72})
    })
});
const BOXING_RING_BOUNDS=BOXING_CONFIG.ring;
const boxingInputPress={start:false,jab:false,cross:false,special:false,dodge:false,guard:false,restart:false};
const boxingTapMovement={x:0,y:0,frames:0};
// Contextual specials install through the same activation and cooldown gate.
const boxingSpecialSlots={zorp:null,master:null};
let boxingAccumulator=0,boxingLastUpdate=null;

function makeBoxingFighter(role,x,y){
    return {role,x,y,facing:role==='zorp'?1:-1,state:'idle',animation:'idle',stateFrame:0,
        lastMoveX:0,lastMoveY:0,hp:BOXING_CONFIG.maxHp,maxHp:BOXING_CONFIG.maxHp,attack:null,hitstun:0,whiffFrames:0,
        guard:false,guardFlash:0,guardPressure:0,guardBreakTimer:0,guardHoldFrames:0,
        dodgeFrames:0,dodgeAge:0,dodgeCooldown:0,dodgeX:0,dodgeY:0,dodgeOriginX:x,dodgeOriginY:y,
        counterWindow:0,counterTarget:null,counterStun:0,damageFlash:0,knockdowns:0,
        comboCount:0,comboTimer:0,bufferedAttack:null,bufferFrames:0,lastHitBy:null,
        specialCooldown:0,specialCharge:0,special:null,lastSpecial:null,ai:null,aiAttackCooldown:22,aiDecisionTimer:0,aiGuardFrames:0,
        aiTargetX:x,aiTargetY:y,aiCircleSign:1,aiDodge:false};
}
const boxeGame={phase:'READY',player:makeBoxingFighter('zorp',145,218),mestre:makeBoxingFighter('master',302,198),
    juiz:{role:'judge',x:76,y:172,animation:'idle',stateFrame:0,facing:1},
    fightFrames:0,effects:[],impactBursts:[],winner:null,qaFreezeAi:false,
    introFrames:0,knockdown:null,finisher:null,cameraShake:0,hitPauseFrames:0};
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
function boxingFaceOpponent(f,target){if(Math.abs(target.x-f.x)>.5)f.facing=target.x>f.x?1:-1;}
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
function boxingClearPresses(){for(const k of ['jab','cross','special','dodge','restart'])boxingInputPress[k]=false;}
function boxingReleaseInput(){
    boxingClearPresses();boxingInputPress.guard=false;boxingInputPress.start=false;boxingTapMovement.frames=0;
    if(typeof keys!=='undefined'&&typeof currentScene!=='undefined'&&currentScene==='JOGO_BOXE')
        for(const k of ['w','a','s','d','j','k','l','i','space'])keys[k]=false;
}
window.addEventListener('blur',boxingReleaseInput);
function resetBoxe(startImmediately=false){
    boxeGame.phase=startImmediately?'FIGHTING':'READY';
    boxeGame.player=makeBoxingFighter('zorp',145,218);boxeGame.mestre=makeBoxingFighter('master',302,198);
    boxeGame.juiz={role:'judge',x:76,y:172,animation:'idle',stateFrame:0,facing:1};
    boxeGame.fightFrames=0;boxeGame.effects.length=0;boxeGame.impactBursts.length=0;
    boxeGame.winner=null;boxeGame.knockdown=null;boxeGame.finisher=null;boxeGame.cameraShake=0;boxeGame.hitPauseFrames=0;
    boxeGame.introFrames=0;boxeGame.qaFreezeAi=false;
    boxingAccumulator=0;boxingLastUpdate=performance.now();boxingReleaseInput();resetBoxingPresentation();
    window.FestivalChallenges.onBoxingStart();
    if(typeof dialogBox!=='undefined')dialogBox.classList.remove('show');
}
function startBoxingFight(){
    boxingReleaseInput();boxingAccumulator=0;boxingLastUpdate=performance.now();
    boxeGame.phase='INTRO';boxeGame.introFrames=48;boxeGame.juiz.animation='start';boxeGame.juiz.stateFrame=0;
    boxingShowEvent('intro');
}
function boxingSetAnimation(f,name){
    if(f.animation!==name){f.animation=name;f.stateFrame=0;}else f.stateFrame++;
    f.state=name;
}
function boxingAddEffect(x,y,text,color){
    boxeGame.effects.push({x,y,text,color,life:24});if(boxeGame.effects.length>14)boxeGame.effects.shift();
}
function boxingImpact(x,y,strength,color){
    boxeGame.impactBursts.push({x,y,strength,color,life:13});if(boxeGame.impactBursts.length>8)boxeGame.impactBursts.shift();
    boxeGame.cameraShake=Math.max(boxeGame.cameraShake,Math.min(2,strength*strength*.012));
}
function boxingCanAct(f){return boxeGame.phase==='FIGHTING'&&f.hp>0&&!f.hitstun&&!f.guardBreakTimer&&!f.whiffFrames&&!f.dodgeFrames;}
function boxingAttackStartup(attack,spec){return attack.startup??spec.startup;}
function boxingCanChain(f,target){
    const a=f.attack;if(!a)return false;const spec=BOXING_CONFIG.attacks[a.kind];
    return a.kind==='jab'&&a.landed&&!a.blocked&&a.stage<BOXING_CONFIG.combo.maxHits&&
        a.frame>=boxingAttackStartup(a,spec)+spec.active+BOXING_CONFIG.combo.cancelRecovery&&
        target.hitstun>0&&target.lastHitBy===f.role;
}
function boxingStartAttack(f,kind,chain=false){
    if(!BOXING_CONFIG.attacks[kind]||!boxingCanAct(f)||(f.attack&&!chain))return false;
    const target=f.role==='zorp'?boxeGame.mestre:boxeGame.player;
    if(chain&&!boxingCanChain(f,target))return false;
    if(!chain)f.comboCount=0;
    boxingFaceOpponent(f,target);
    const stage=chain?f.comboCount+1:1,counter=f.counterWindow>0&&f.counterTarget===target.role;
    const startup=chain&&kind==='cross'?BOXING_CONFIG.combo.heavyLinkStartup:BOXING_CONFIG.attacks[kind].startup;
    f.attack={kind,frame:0,startup,facing:f.facing,originY:f.y,landed:false,dodged:false,blocked:false,counter,stage,linked:chain};
    f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;if(counter)f.counterWindow=0;
    f.animation=kind;f.state=kind;f.stateFrame=0;return true;
}
function boxingStartDodge(f,x,y,target){
    if(!boxingCanAct(f)||f.dodgeCooldown||f.attack)return false;
    if(Math.hypot(x,y)<.1){x=-f.facing*.3;y=f.y>209?-1:1;}
    const length=Math.hypot(x,y);f.dodgeX=x/length;f.dodgeY=y/length;
    f.dodgeOriginX=f.x;f.dodgeOriginY=f.y;
    f.dodgeFrames=BOXING_CONFIG.dodge.duration;f.dodgeAge=0;f.dodgeCooldown=BOXING_CONFIG.dodge.cooldown;
    f.guard=false;f.bufferedAttack=null;boxingSetAnimation(f,'dodge');return true;
}
function boxingRequestSpecial(f,target){
    const slot=boxingSpecialSlots[f.role];
    if(!slot||!boxingCanAct(f)||f.attack||f.specialCooldown)return false;
    if(slot.activate(f,target)!==true)return false;
    f.specialCooldown=slot.cooldown;return true;
}
function boxingApplyGuardPressure(target,amount){
    if(boxeGame.phase!=='FIGHTING'||!target.guard||target.guardBreakTimer||!Number.isFinite(amount)||amount<=0)return false;
    target.guardPressure=Math.min(BOXING_CONFIG.guard.max,target.guardPressure+amount);
    if(target.guardPressure<BOXING_CONFIG.guard.max)return false;
    target.guard=false;target.guardPressure=BOXING_CONFIG.guard.breakResidual;target.guardHoldFrames=0;
    target.guardBreakTimer=BOXING_CONFIG.guard.breakFrames;target.attack=null;target.bufferedAttack=null;target.bufferFrames=0;
    target.comboCount=0;target.comboTimer=0;boxingSetAnimation(target,'hurt');
    // The persistent stun label already says "GUARDA QUEBRADA" above this fighter.
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
function boxingAttackCanHit(a,b,attack,spec){
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
    const spec=BOXING_CONFIG.attacks[attack.kind];
    const startup=boxingAttackStartup(attack,spec);
    if(attack.frame<startup||attack.frame>=startup+spec.active)return null;
    const onLine=boxingAttackCanHit(a,b,attack,spec);
    if(window.BoxingZorpSpecial?.evades(b,a,attack,spec))return {a,b,attack,spec,dodged:true,specialDodge:true};
    const d=BOXING_CONFIG.dodge;
    const evading=b.dodgeFrames&&b.dodgeAge>=d.invulnerableFrom&&b.dodgeAge<=d.invulnerableTo;
    // A short sidestep can leave the line before contact; reward only a strike that covered its origin.
    const leftLine=evading&&boxingAttackCanHit(a,{x:b.dodgeOriginX,y:b.dodgeOriginY},attack,spec);
    if(evading&&(onLine||leftLine))return {a,b,attack,spec,dodged:true};
    if(!onLine)return null;
    const blocked=b.guard&&!b.hitstun&&!b.guardBreakTimer&&(a.x-b.x)*b.facing>=0;
    const stage=attack.linked&&b.hitstun>0&&b.lastHitBy===a.role?attack.stage:1;
    const damage=attack.damageOverride??spec.damage;
    return {a,b,attack,spec,blocked,stage,damage:blocked?Math.max(1,Math.round(damage*(spec.guardDamageScale??BOXING_CONFIG.guardDamageScale))):
        damage+(stage-1)+(attack.counter?BOXING_CONFIG.counter.damageBonus:0)};
}
function boxingResolveContact(hit){
    if(!hit)return;const {a,b,attack,spec}=hit;
    if(hit.dodged){
        if(hit.specialDodge){attack.dodged=true;window.BoxingZorpSpecial.onEvaded(b);boxingSpecialController(a)?.onDodged?.(a);return;}
        attack.dodged=true;boxingSpecialController(a)?.onDodged?.(a);b.counterWindow=BOXING_CONFIG.counter.window;b.counterTarget=a.role;
        boxingAddEffect(b.x,b.y-52,'ESQUIVA!','#9eeaff');boxingShowEvent('dodge',b,attack.facing);return;
    }
    attack.landed=true;attack.blocked=hit.blocked;attack.stage=hit.stage;b.hp=Math.max(0,b.hp-hit.damage);
    b.damageFlash=10;b.guardFlash=hit.blocked?9:0;
    if(hit.blocked){
        boxingApplyGuardPressure(b,spec.guardPressure??BOXING_CONFIG.guard.pressure[attack.kind]);a.comboCount=0;a.comboTimer=0;
    }else{
        boxingSpecialController(b)?.stop(b);
        b.attack=null;b.guard=false;b.dodgeFrames=0;b.hitstun=spec.hitstun+(attack.counter?BOXING_CONFIG.counter.hitstunBonus:0);b.lastHitBy=a.role;
        b.comboCount=0;b.comboTimer=0;b.bufferedAttack=null;b.bufferFrames=0;
        a.comboCount=attack.stage;a.comboTimer=BOXING_CONFIG.combo.window;
        boxingSetAnimation(b,'hurt');
        if(attack.stage>1)boxingAddEffect(a.x,a.y-73,attack.stage+' HITS','#ffe178');
    }
    b.x+=attack.facing*(attack.pushOverride??spec.push)*(hit.blocked?(spec.guardPushScale??.38):1);boxingConstrain(b);
    if(attack.counter)boxeGame.effects=boxeGame.effects.filter(effect=>effect.text!=='ESQUIVA!');
    if(attack.kind!=='weave_rush'||hit.blocked||attack.specialHit===6)
        boxingAddEffect(b.x,b.y-54,hit.blocked?'DEFESA':attack.counter?'CONTRA!':'-'+hit.damage,hit.blocked?'#9eeaff':'#ffbd82');
    const specialFinal=attack.kind==='dash_punch'||attack.kind==='weave_finish'||attack.kind==='weave_rush'&&attack.specialHit===6;
    boxingImpact(b.x-attack.facing*8,b.y-48,hit.blocked?3:specialFinal?12:attack.counter?11:attack.kind==='jab'||attack.kind==='weave_rush'?5:9,hit.blocked?'#9eeaff':'#ffab72');
    boxingShowEvent(hit.blocked?'block':specialFinal?'special':attack.counter?'counter':attack.kind==='weave_rush'?'jab':attack.kind,b,attack.facing);
    const pause=hit.blocked?BOXING_CONFIG.impact.blockPause:attack.counter?BOXING_CONFIG.impact.counterPause:
        attack.kind==='jab'?BOXING_CONFIG.impact.lightPause:BOXING_CONFIG.impact.heavyPause;
    boxeGame.hitPauseFrames=Math.max(boxeGame.hitPauseFrames,specialFinal?3:attack.kind==='weave_rush'?1:pause);
    window.BoxingZorpSpecial?.exchange(a,b,attack,hit);
    window.BoxingMasterSpecial?.exchange(a,b,attack,hit);
    boxingSpecialController(a)?.onContact(a,b,attack,hit);
}
function boxingUpdateAttack(f){
    const a=f.attack,spec=BOXING_CONFIG.attacks[a.kind];a.frame++;boxingSetAnimation(f,a.kind);
    const target=f.role==='zorp'?boxeGame.mestre:boxeGame.player,canChain=boxingCanChain(f,target);
    if(canChain&&f.bufferedAttack&&boxingStartAttack(f,f.bufferedAttack,true))return;
    if(a.frame>=boxingAttackStartup(a,spec)+spec.active+spec.recovery){
        f.attack=null;if(!a.landed){f.whiffFrames=spec.whiff;f.comboCount=0;f.comboTimer=0;window.BoxingZorpSpecial?.whiff(f,f.role==='zorp'?boxeGame.mestre:boxeGame.player);}
    }
}
function boxingUpdateFighter(f,target,intent,speedX,speedY){
    for(const timer of ['dodgeCooldown','guardFlash','counterWindow','specialCooldown','comboTimer'])if(f[timer]>0)f[timer]--;
    if(!f.comboTimer&&!f.attack)f.comboCount=0;
    if(f.bufferFrames>0){if(--f.bufferFrames===0)f.bufferedAttack=null;}
    if(intent.attack){f.bufferedAttack=intent.attack;f.bufferFrames=BOXING_CONFIG.combo.buffer;}
    if(!f.guard){f.guardPressure=Math.max(0,f.guardPressure-BOXING_CONFIG.guard.decay);f.guardHoldFrames=0;}
    if(f.hitstun||f.guardBreakTimer){
        if(f.hitstun)f.hitstun--;if(f.guardBreakTimer)f.guardBreakTimer--;
        f.guard=false;f.bufferedAttack=null;f.bufferFrames=0;boxingSetAnimation(f,'hurt');return;
    }
    if(f.special&&boxingSpecialController(f)?.update(f,target))return;
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
    if(f.attack){boxingUpdateAttack(f);return;}
    if(f.whiffFrames){f.whiffFrames--;f.guard=false;boxingSetAnimation(f,'idle');return;}
    if(intent.dodge&&boxingStartDodge(f,intent.x,intent.y,target))return;
    if(intent.special&&boxingRequestSpecial(f,target))return;
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
        attackRef:null,attackSerial:0,lastThreat:0,lastOwnAttack:null,lastGuard:false,lastDodge:false,lastSpecialId:0,
        followUp:null,followUpSent:false,preferredAttack:'jab',dodgePending:false,attackReady:0,
        lastGuardFlash:0,blockCounterAt:0,blockCounterUntil:0,defenseReady:0,dodgeCounterSent:false,
        decisions:[],stats:{jab:0,cross:0,guard:0,dodge:0,special:0,hits:0,blocked:0,whiffs:0,dodged:0,interrupted:0,
            damageTaken:0,approach:0,pressure:0,cautious:0,reposition:0,defensivePlans:0,comboFollowUps:0}};
}
function boxingAiObserve(b,p,now){
    if(b.attackRef!==p.attack){b.attackRef=p.attack;if(p.attack)b.attackSerial++;}
    const a=p.attack;
    b.history.push({frame:now,x:p.x,y:p.y,hp:p.hp,guard:p.guard,dodgeFrames:p.dodgeFrames,
        hitstun:p.hitstun,whiffFrames:p.whiffFrames,
        attack:a?{token:b.attackSerial,kind:a.kind,frame:a.frame,startup:boxingAttackStartup(a,BOXING_CONFIG.attacks[a.kind]),
            facing:a.facing,originY:a.originY,landed:a.landed,dodged:a.dodged}:null});
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
        b.lastOwnAttack=m.attack;
        if(m.attack&&Object.hasOwn(b.stats,m.attack.kind))b.stats[m.attack.kind]++;
    }
    if(m.guard&&!b.lastGuard)b.stats.guard++;b.lastGuard=m.guard;
    if(m.dodgeFrames&&!b.lastDodge)b.stats.dodge++;b.lastDodge=!!m.dodgeFrames;
    if(m.special&&m.special.id!==b.lastSpecialId){b.lastSpecialId=m.special.id;b.stats.special++;}
}
function boxingAiSetMode(b,mode,now,duration){
    b.mode=mode;b.modeUntil=now+duration;
    if(mode!=='SPECIAL')b.specialPending=false;
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
    const threat=a&&!a.landed&&!a.dodged&&(m.x-view.x)*a.facing>0&&ax<=spec.range+14&&
        Math.abs(m.y-a.originY)<=spec.depthTolerance+5;
    const freshThreat=threat&&a.token!==b.lastThreat;
    if(freshThreat)b.lastThreat=a.token;
    const busy=m.attack||m.special||m.dodgeFrames;
    // Pressure is remembered while stunned, so a defensive plan can be ready at the end of a real combo.
    if(!busy&&!m.hitstun&&!m.guardBreakTimer&&b.blockCounterAt&&now>=b.blockCounterAt&&now<b.blockCounterUntil){
        b.blockCounterAt=0;b.blockCounterUntil=0;
        boxingAiSetMode(b,'PRESSURE',now,28);b.preferredAttack='jab';
        b.attackReady=now;m.aiAttackCooldown=0;b.defenseReady=now+18;
    }else if(!busy&&now>=b.defenseReady&&(freshThreat||b.pressure>=1.05&&now>=b.modeUntil)){
        b.side=boxingAiSide(m,view);b.stats.defensivePlans++;
        const choice=Math.random(),stressed=m.guardPressure>65;
        if(!m.dodgeCooldown&&(choice<(stressed?.55:.32))){
            b.dodgePending=true;boxingAiSetMode(b,'EVADE',now,24);
        }else if(!stressed&&choice<.76){
            boxingAiSetMode(b,'DEFEND',now,boxingAiRange(BOXING_MASTER_AI_CONFIG.guardMin,BOXING_MASTER_AI_CONFIG.guardMax));
        }else boxingAiSetMode(b,'REPOSITION',now,boxingAiRange(18,28));
        // It takes time to recover the initiative after responding; no guaranteed instant counter.
        b.attackReady=Math.max(b.attackReady,now+boxingAiRange(9,16));
        b.defenseReady=now+boxingAiRange(18,26);
    }else if(!busy&&now>=b.modeUntil){
        b.side=boxingAiSide(m,view);
        const aggressive=m.hp<=35,leading=m.hp-view.hp>=18;
        const cautiousChance=aggressive?.14:leading?.46:.28;
        const mode=ax>85||ay>23?'APPROACH':Math.random()<cautiousChance?'CAUTIOUS':'PRESSURE';
        boxingAiSetMode(b,mode,now,boxingAiRange(BOXING_MASTER_AI_CONFIG.modeMin,BOXING_MASTER_AI_CONFIG.modeMax));
        b.preferredAttack=Math.random()<(mode==='PRESSURE'?(aggressive?.58:.68):mode==='CAUTIOUS'?.3:.45)?'jab':'cross';
    }
    // The special module sees the delayed visible opponent, never the live player object.
    const reversal=m.hp<=35&&m.specialCharge>=100&&(b.mode==='PRESSURE'||now>=b.modeUntil);
    if(!busy&&!m.hitstun&&!m.guardBreakTimer&&!m.whiffFrames&&(!freshThreat||reversal)&&(b.pressure<1.8||reversal)&&
        (!['DEFEND','EVADE','REPOSITION'].includes(b.mode)||reversal)){
        if(window.BoxingMasterSpecial?.shouldUse(m,view)){
            boxingAiSetMode(b,'SPECIAL',now,60);b.specialPending=true;
        }else if(window.BoxingMasterSpecial?.positionIntent(m,view))boxingAiSetMode(b,'SPECIAL_SETUP',now,54);
    }
    b.decisions.push({frame:now,observedFrame:view.frame,lag:now-view.frame,mode:b.mode,pressure:+b.pressure.toFixed(2)});
    if(b.decisions.length>24)b.decisions.shift();
}
function boxingMasterIntent(){
    const m=boxeGame.mestre,p=boxeGame.player,now=boxeGame.fightFrames;
    const b=m.ai||(m.ai=boxingCreateMasterAI(m));
    boxingAiTrackOwnState(b,m,now);
    const observed=boxingAiObserve(b,p,now),intent=boxingAiIdle();
    if(m.aiAttackCooldown)m.aiAttackCooldown--;
    if(!observed)return intent;
    if(--b.decisionIn<=0){
        b.decisionIn=boxingAiRange(BOXING_MASTER_AI_CONFIG.decisionMin,BOXING_MASTER_AI_CONFIG.decisionMax);
        b.view=observed;m.aiTargetX=observed.x;m.aiTargetY=observed.y;
        boxingAiPlan(b,m,observed,now);
        b.reactionFrames=boxingAiRange(BOXING_MASTER_AI_CONFIG.reactionMin,BOXING_MASTER_AI_CONFIG.reactionMax);
    }
    const view=b.view;if(!view)return intent;
    const dx=view.x-m.x,dy=view.y-m.y,ax=Math.abs(dx),ay=Math.abs(dy);
    if(m.special)return intent;
    if(m.attack){
        // A boxer can feel its own connected punch. This permits at most one planned follow-up, never a stun escape.
        const a=m.attack,spec=BOXING_CONFIG.attacks[a.kind];
        if(b.followUp&&!b.followUpSent&&a.kind==='jab'&&a.landed&&!a.blocked&&a.stage===1&&
            a.frame>=boxingAttackStartup(a,spec)+spec.active){
            intent.attack=b.followUp;b.followUpSent=true;b.stats.comboFollowUps++;
        }return intent;
    }
    if(m.dodgeFrames&&m.counterWindow&&m.dodgeAge>=BOXING_CONFIG.counter.cancelAge&&!b.dodgeCounterSent&&ax<=58&&ay<=12){
        b.dodgeCounterSent=true;intent.attack=ax<=49?'jab':'cross';return intent;
    }
    if(m.hitstun||m.guardBreakTimer||m.whiffFrames||m.dodgeFrames)return intent;
    if(b.specialPending){
        b.specialPending=false;intent.special=true;return intent;
    }
    if(b.mode==='EVADE'&&b.dodgePending&&!m.dodgeCooldown){
        b.dodgePending=false;intent.dodge=true;intent.y=b.side;return intent;
    }
    if(b.mode==='DEFEND'&&now<b.modeUntil){
        intent.guard=true;intent.x=ax<38?-Math.sign(dx)*.45:0;return intent;
    }
    if((b.mode==='REPOSITION'||b.mode==='EVADE')&&now<b.modeUntil){
        intent.y=b.side;intent.x=ax<65?-Math.sign(dx)*.25:0;return intent;
    }
    if(b.mode==='SPECIAL_SETUP'){
        const setup=window.BoxingMasterSpecial?.positionIntent(m,view);if(setup)return setup;
    }
    const cautious=b.mode==='CAUTIOUS',desired=cautious?67:b.mode==='PRESSURE'?40:51;
    intent.x=ax>desired+5?Math.sign(dx):ax<desired-10?-Math.sign(dx)*.7:0;
    intent.y=ay>6?Math.sign(dy):cautious?b.side*.28:0;
    if(ay>17)intent.x*=.5;
    // Requests are based on perceived reach; the unchanged physical contact test decides whether a punch actually lands.
    const opening=view.whiffFrames>0||view.hitstun>0;
    const choice=opening?'cross':b.preferredAttack;
    const perceivedReach=BOXING_CONFIG.attacks[choice].range-2;
    if(now>=b.attackReady&&!m.aiAttackCooldown&&ax>=24&&ax<=perceivedReach&&ay<=10.5){
        const aggressive=m.hp<=35;
        intent.attack=choice;
        b.followUp=intent.attack==='jab'&&b.mode==='PRESSURE'&&Math.random()<(aggressive?.58:.42)?
            (Math.random()<.6?'cross':'jab'):null;
        b.followUpSent=false;
        m.aiAttackCooldown=boxingAiRange(aggressive?20:cautious?34:26,aggressive?30:cautious?48:38);
        b.attackReady=now+m.aiAttackCooldown;intent.x=0;intent.y=0;
    }
    return intent;
}
window.BoxingMasterAI=Object.freeze({config:BOXING_MASTER_AI_CONFIG,snapshot:()=>{
    const b=boxeGame.mestre.ai;
    return b?{mode:b.mode,reactionFrames:b.reactionFrames,pressure:b.pressure,
        observedFrame:b.view?.frame??null,observedX:b.view?.x??null,observedY:b.view?.y??null,
        stats:{...b.stats},decisions:b.decisions.map(d=>({...d}))}:null;
}});

function boxingEnterKnockdown(){
    if(boxeGame.phase!=='FIGHTING')return;
    const p=boxeGame.player,m=boxeGame.mestre;
    boxeGame.winner=p.hp<=0?(m.hp<=0?'draw':'master'):'zorp';
    const loser=p.hp<=0?p:m;loser.knockdowns++;
    boxeGame.knockdown={role:loser.role,attacker:boxeGame.winner,frames:0,count:0};boxeGame.phase='KNOCKDOWN';boxeGame.hitPauseFrames=0;
    for(const f of [p,m]){
        boxingSpecialController(f)?.stop(f);
        f.attack=null;f.guard=false;f.dodgeFrames=0;f.bufferedAttack=null;f.hitstun=0;
        f.counterWindow=0;f.guardBreakTimer=0;f.comboTimer=0;f.comboCount=0;f.guardFlash=0;
        boxingSetAnimation(f,f.hp<=0?'knockdown':'idle');
    }
    if(m.ai)boxingAiTrackOwnState(m.ai,m,boxeGame.fightFrames);
    boxeGame.juiz.animation='ko';boxeGame.juiz.stateFrame=0;boxingShowEvent('knockdown',loser);
}
function boxingCompleteKo(){
    if(boxeGame.phase==='RESULT')return;boxeGame.phase='RESULT';
    for(const f of [boxeGame.player,boxeGame.mestre])boxingSetAnimation(f,f.hp<=0?'defeat':'victory');
    window.FestivalChallenges.onBoxingResult(boxeGame.winner,boxeGame.player.knockdowns);
    boxingShowEvent('victory');
    if(boxeGame.winner==='zorp'&&typeof window.desbloquearMedalha==='function')window.desbloquearMedalha('boxe');
}
function boxingStep(){
    // Consume real time, not input: a fresh press during contact waits for the next simulation step.
    if(boxeGame.phase==='FIGHTING'&&boxeGame.hitPauseFrames>0){boxeGame.hitPauseFrames--;return;}
    updateBoxingPresentation();
    for(const f of [boxeGame.player,boxeGame.mestre])if(f.damageFlash>0)f.damageFlash--;
    for(const e of boxeGame.effects)e.life--;boxeGame.effects=boxeGame.effects.filter(e=>e.life>0);
    for(const e of boxeGame.impactBursts)e.life--;boxeGame.impactBursts=boxeGame.impactBursts.filter(e=>e.life>0);
    boxeGame.cameraShake*=.78;if(boxeGame.cameraShake<.15)boxeGame.cameraShake=0;
    if(boxeGame.phase==='READY'){
        if(boxingInputPress.start||keys.space||keys.w||keys.a||keys.s||keys.d)startBoxingFight();else return;
    }
    if(boxeGame.phase==='INTRO'){
        boxeGame.juiz.stateFrame++;boxeGame.player.stateFrame++;boxeGame.mestre.stateFrame++;
        if(--boxeGame.introFrames<=0){boxeGame.phase='FIGHTING';boxeGame.juiz.animation='idle';boxingAddEffect(225,118,'LUTEM!','#ffe178');}
        boxingClearPresses();return;
    }
    if(boxeGame.phase==='KNOCKDOWN'){
        boxeGame.player.stateFrame++;boxeGame.mestre.stateFrame++;boxeGame.juiz.stateFrame++;
        if(++boxeGame.knockdown.frames>=BOXING_CONFIG.koFrames)boxingCompleteKo();boxingClearPresses();return;
    }
    if(boxeGame.phase==='RESULT'){
        if(boxingInputPress.restart)resetBoxe(true);
        boxeGame.player.stateFrame++;boxeGame.mestre.stateFrame++;boxingClearPresses();return;
    }
    if(boxeGame.phase!=='FIGHTING')return;
    boxeGame.fightFrames++;
    window.BoxingZorpSpecial?.tick();
    window.BoxingMasterSpecial?.tick();
    const p=boxeGame.player,m=boxeGame.mestre;boxingFaceOpponent(p,m);boxingFaceOpponent(m,p);
    const x=(keys.d?1:0)-(keys.a?1:0)||(boxingTapMovement.frames?boxingTapMovement.x:0);
    const y=(keys.s?1:0)-(keys.w?1:0)||(boxingTapMovement.frames?boxingTapMovement.y:0);
    const playerIntent={x,y,guard:boxingInputPress.guard,dodge:boxingInputPress.dodge,special:boxingInputPress.special,
        attack:boxingInputPress.cross?'cross':boxingInputPress.jab?'jab':null};
    const masterIntent=boxeGame.qaFreezeAi?{x:0,y:0,guard:false,attack:null,dodge:false}:boxingMasterIntent();
    boxingUpdateFighter(p,m,playerIntent,BOXING_CONFIG.movement.playerX,BOXING_CONFIG.movement.playerY);
    boxingUpdateFighter(m,p,masterIntent,BOXING_CONFIG.movement.masterX,BOXING_CONFIG.movement.masterY);
    boxingSeparateFighters(p,m);boxingFaceOpponent(p,m);boxingFaceOpponent(m,p);
    // Sample both contacts before knockback/damage, allowing fair simultaneous trades.
    const contacts=[boxingAttackOutcome(p,m),boxingAttackOutcome(m,p)];contacts.forEach(boxingResolveContact);
    boxingSeparateFighters(p,m);boxingFaceOpponent(p,m);boxingFaceOpponent(m,p);
    if(p.hp<=0||m.hp<=0)boxingEnterKnockdown();
    boxeGame.juiz.stateFrame++;
    if(boxingTapMovement.frames)boxingTapMovement.frames--;boxingClearPresses();
}
function updateBoxeGame(deltaSeconds){
    const now=performance.now();
    const dt=typeof deltaSeconds==='number'?deltaSeconds:boxingLastUpdate===null?BOXING_CONFIG.step:(now-boxingLastUpdate)/1000;
    boxingLastUpdate=now;
    hintText.innerText=boxeGame.phase==='RESULT'?'R: REINICIAR | ESC: SAIR':
        boxeGame.phase==='INTRO'?'PREPARE-SE!':boxeGame.phase==='KNOCKDOWN'?'NOCAUTE!':
        'WASD MOVER | J LEVE | K PESADO | L DEFESA | I ESQUIVA | O ESPECIAL';
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
    if (actor.role === "judge") {
        if (actor.animation === "count" && actor.stateFrame < 18) return "count_start";
        if (actor.animation === "ko" && boxeGame.phase === "RESULT" && boxeGame.winner === "zorp" && actor.stateFrame > 28) return "victory";
        return actor.animation;
    }
    if (actor.animation === "hurt" && (actor.counterStun > 0 || actor.guardBreakTimer > 0)) return "stun";
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
    const duration = BOXING_FRAME_DURATIONS[animation] || 7;
    const recoil = boxingShow.recoil[role];
    const visualFrame = recoil?.hold > 0 && !actor.cinematicPose ? recoil.poseFrame : actor.stateFrame;
    const frameNumber = Math.floor(visualFrame / duration);
    const looping = ["idle", "idle_damaged", "idle_heavy", "walk", "guard", "stun", "count", "observe"].includes(animation);
    // The new judge observes the downed boxer; the existing HUD counts 1–10.
    // No finger-number poses are inferred from unrelated gestures.
    const index = looping ? frameNumber % frames.length : Math.min(frames.length - 1, frameNumber);
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
    let visualFacing = role==='master'&&actor.special?actor.special.facing:actor.facing;
    if (role === "judge") {
        const observed = boxeGame.knockdown && (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP")
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
    const shake=Math.min(1.5,Math.max(0,boxeGame.cameraShake));
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
    if (boxeGame.phase === "KNOCKDOWN" || boxeGame.phase === "GETUP") {
        const count = boxeGame.knockdown?.count || 0;
        ctx.fillStyle = "rgba(8,12,30,.88)"; ctx.fillRect(187, 80, 76, 45);
        ctx.strokeStyle = "#ffe178"; ctx.lineWidth = 2; ctx.strokeRect(187, 80, 76, 45);
        ctx.textAlign = "center"; ctx.fillStyle = "#ffe178";
        ctx.font = "bold 25px Arial"; ctx.fillText("KO", 225, 112);
    }
    if (boxeGame.phase === "READY" || boxeGame.phase === "RESULT") {
        const result = boxeGame.phase === "RESULT";
        const panelX = result ? 76 : 66, panelY = result ? 94 : 104;
        const panelWidth = result ? 298 : 318, panelHeight = result ? 38 : 54;
        ctx.fillStyle = "rgba(5,10,25,.83)";
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = "#ef485a";
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        ctx.textAlign = "center"; ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Arial";
        ctx.fillText(boxeGame.phase === "READY" ? "ENTRE NO RINGUE" :
            boxeGame.winner === "draw" ? "EMPATE — KO DUPLO!" : boxeGame.winner === "zorp" ? "ZORP VENCE POR KO!" : "MESTRE VENCE POR KO!",
            225, result ? 111 : 124);
        ctx.font = "9px Arial";
        ctx.fillText(boxeGame.phase === "READY" ? "ESPAÇO OU WASD" : "R PARA REINICIAR",
            225, result ? 125 : 142);
    }
    if (new URLSearchParams(location.search).has("boxeDebug")) {
        ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(4, 269, 442, 26);
        ctx.fillStyle = "#aef3ff"; ctx.font = "8px monospace"; ctx.textAlign = "left";
        const p = boxeGame.player, m = boxeGame.mestre;
        ctx.fillText(`Z ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.animation} HP${p.hp} | M ${m.x.toFixed(0)},${m.y.toFixed(0)} ${m.animation} HP${m.hp}`, 9, 280);
        ctx.fillText(`assets ${boxingAssetStatus.loaded}/${boxingAssetStatus.requested} | d ${boxingDistance(p, m).toFixed(1)} | IA ${boxeGame.qaFreezeAi ? "OFF" : "ON"}`, 9, 290);
    }
}
window.getBoxeQaSnapshot = () => ({
    phase: boxeGame.phase, winner: boxeGame.winner, hitPauseFrames:boxeGame.hitPauseFrames,
    finisherFrame: boxeGame.finisher?.frame ?? null,
    knockdown: boxeGame.knockdown ? { ...boxeGame.knockdown } : null,
    player: { x: boxeGame.player.x, y: boxeGame.player.y, hp: boxeGame.player.hp,
        animation: boxeGame.player.animation, attack: boxeGame.player.attack?.kind || null,
        guard: boxeGame.player.guard, dodgeAge: boxeGame.player.dodgeAge,
        knockdowns: boxeGame.player.knockdowns, facing:boxeGame.player.facing, combo:boxeGame.player.comboCount, hitstun:boxeGame.player.hitstun, whiffFrames:boxeGame.player.whiffFrames,
        guardPressure:boxeGame.player.guardPressure,guardBreakTimer:boxeGame.player.guardBreakTimer,counterWindow:boxeGame.player.counterWindow,dodgeFrames:boxeGame.player.dodgeFrames },
    mestre: { x: boxeGame.mestre.x, y: boxeGame.mestre.y, hp: boxeGame.mestre.hp,
        animation: boxeGame.mestre.animation, attack: boxeGame.mestre.attack?.kind || null,
        guard: boxeGame.mestre.guard, dodgeAge: boxeGame.mestre.dodgeAge,
        knockdowns: boxeGame.mestre.knockdowns, facing:boxeGame.mestre.facing, combo:boxeGame.mestre.comboCount, hitstun:boxeGame.mestre.hitstun, whiffFrames:boxeGame.mestre.whiffFrames,
        guardPressure:boxeGame.mestre.guardPressure,guardBreakTimer:boxeGame.mestre.guardBreakTimer,counterWindow:boxeGame.mestre.counterWindow,dodgeFrames:boxeGame.mestre.dodgeFrames },
    juiz: { x: boxeGame.juiz.x, y: boxeGame.juiz.y,
        animation: boxeGame.juiz.animation, count: boxeGame.juiz.countNumber || 0 },
    distance: boxingDistance(boxeGame.player, boxeGame.mestre),
    assets: { ...boxingAssetStatus },
    presentation: boxingPresentationSnapshot(),special:window.BoxingZorpSpecial?.snapshot()||null,masterSpecial:window.BoxingMasterSpecial?.snapshot()||null,masterAI:window.BoxingMasterAI?.snapshot()||null
});

