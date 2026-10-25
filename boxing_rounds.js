/* Best of three owns the match lifecycle; the existing boxing simulation owns every contact. */
const BOXING_ROUND_CONFIG=Object.freeze({seconds:40,toWin:2,maxRounds:3,introFrames:132,resultFrames:100,
    intermissionFrames:60,suddenIntroFrames:84,fallFrames:12,judgeMoveFrames:24,countEvery:12,countTo:10});
function boxingEmptyRoundStats(){return {damage:0,counters:0,cleanHits:0};}
function boxingResetMatch(){
    boxeGame.rounds={number:1,wins:{zorp:0,master:0},remaining:BOXING_ROUND_CONFIG.seconds*60,
        elapsed:0,stats:{zorp:boxingEmptyRoundStats(),master:boxingEmptyRoundStats()},history:[],
        result:null,transition:0,suddenDeath:false,matchReported:false,adaptation:{guard:0,dodge:0,distant:0,jab:0,cross:0,feint:0,rush:0}};
}
function boxingClearRoundCombat(){
    for(const f of [boxeGame.player,boxeGame.mestre]){
        boxingSpecialController(f)?.stop(f);
        f.parryFrames=0;f.parryAttempt=false;f.parryCooldown=0;f.parryStun=0;f.parryRecovery=0;f.parryFlash=0;f.counterSource=null;
        f.counterStance=null;f.slip=null;f.stanceCooldown=0;f.slipCooldown=0;f.ironArmorNext=false;f.titanFeintNext=false;
        f.pushMotion=null;f.attack=null;f.feint=null;f.guard=false;f.hitstun=0;f.guardBreakTimer=0;f.guardFlash=0;
        f.dodgeFrames=0;f.counterWindow=0;f.counterStun=0;f.comboCount=0;f.comboTimer=0;
        f.bufferedAttack=null;f.bufferFrames=0;f.whiffFrames=0;f.perfectDodgeFrames=0;
    }
    boxeGame.effects.length=0;boxeGame.impactBursts.length=0;boxeGame.hitPauseFrames=0;boxeGame.cameraShake=0;
    boxingReleaseInput();
}
function boxingStartRoundIntro(sudden=false){
    boxingReleaseInput();boxingAccumulator=0;boxingLastUpdate=performance.now();
    boxeGame.phase='INTRO';boxeGame.introFrames=sudden?BOXING_ROUND_CONFIG.suddenIntroFrames:BOXING_ROUND_CONFIG.introFrames;
    boxeGame.rounds.introTotal=boxeGame.introFrames;
    boxeGame.juiz.animation='start';boxeGame.juiz.stateFrame=0;
    boxingShowEvent(sudden?'suddenDeath':boxeGame.rounds.number===3?'decider':'roundStart');
}
function boxingRoundTieWinner(){
    const r=boxeGame.rounds,p=boxeGame.player,m=boxeGame.mestre;
    const comparisons=[p.hp/p.maxHp-m.hp/m.maxHp,r.stats.zorp.damage-r.stats.master.damage,
        r.stats.zorp.counters-r.stats.master.counters,r.stats.zorp.cleanHits-r.stats.master.cleanHits];
    for(let i=0;i<comparisons.length;i++)if(Math.abs(comparisons[i])>1e-9)
        return {winner:comparisons[i]>0?'zorp':'master',criterion:['HP','DANO','COUNTERS','GOLPES LIMPOS'][i]};
    return null;
}
function boxingEnterSuddenDeath(){
    const r=boxeGame.rounds;boxingClearRoundCombat();r.suddenDeath=true;r.remaining=0;
    // A simultaneous KO has no surviving boxer. Give both a minimal, equal active HP for the clean-hit decider.
    for(const f of [boxeGame.player,boxeGame.mestre]){if(f.hp<=0)f.hp=1;boxingSetAnimation(f,'idle');}
    boxingStartRoundIntro(true);
}
function boxingCollectRoundAdaptation(){
    const b=boxeGame.mestre.ai,seen=b?.observedBehavior;
    if(!seen?.samples)return;
    const old=boxeGame.rounds.adaptation;
    for(const key of ['guard','dodge','distant'])old[key]=old[key]*.35+((seen[key]||0)/seen.samples)*.65;
    for(const key of ['jab','cross','feint','rush'])old[key]=(old[key]||0)*.35+((seen[key]||0)/Math.max(1,seen.attacks||0))*.65;
}
function boxingFinishRound(winner,reason,criterion=reason){
    const r=boxeGame.rounds;
    if(!['FIGHTING','KNOCKDOWN'].includes(boxeGame.phase)||!['zorp','master'].includes(winner)||r.wins[winner]>=2)return false;
    if(reason==='KO'&&boxeGame.phase!=='KNOCKDOWN')return false;
    if(boxeGame.phase==='KNOCKDOWN'&&(reason!=='KO'||boxeGame.knockdown?.attacker!==winner||boxeGame.knockdown.count<BOXING_ROUND_CONFIG.countTo))return false;
    boxingCollectRoundAdaptation();
    const before=r.wins.zorp-r.wins.master;
    r.wins[winner]++;r.result={number:r.number,winner,reason,criterion,
        hp:{zorp:boxeGame.player.hp,master:boxeGame.mestre.hp},
        stats:{zorp:{...r.stats.zorp},master:{...r.stats.master}},suddenDeath:r.suddenDeath};
    r.history.push(r.result);r.transition=BOXING_ROUND_CONFIG.resultFrames;
    boxingClearRoundCombat();boxeGame.phase='ROUND_RESULT';
    for(const f of [boxeGame.player,boxeGame.mestre])boxingSetAnimation(f,f.hp<=0?'knockdown':'idle');
    boxeGame.juiz.animation=reason==='KO'?'ko':'continue';boxeGame.juiz.stateFrame=0;
    boxingShowEvent('roundEnd',winner==='zorp'?boxeGame.player:boxeGame.mestre);
    const after=r.wins.zorp-r.wins.master;
    if(before&&Math.sign(before)!==Math.sign(after))boxingShowEvent('comeback');
    if(r.wins.zorp===1&&r.wins.master===1)boxingShowEvent('decider');
    return true;
}
function boxingEnterKnockdown(){
    const p=boxeGame.player,m=boxeGame.mestre;
    if(boxeGame.phase!=='FIGHTING')return;
    if(p.hp<=0)p.knockdowns++;if(m.hp<=0)m.knockdowns++;
    const winner=p.hp<=0?(m.hp<=0?boxingRoundTieWinner()?.winner:'master'):'zorp';
    if(!winner){boxingEnterSuddenDeath();return;}
    const loser=winner==='zorp'?m:p;
    const j=boxeGame.juiz;boxingClearRoundCombat();
    boxeGame.knockdown={role:loser.role,attacker:winner,frames:0,count:0,judgeFrom:{x:j.x,y:j.y},
        judgeTo:{x:boxingClamp(loser.x+(loser.x<225?-34:34),58,392),y:boxingClamp(loser.y-12,174,232)}};
    boxeGame.phase='KNOCKDOWN';
    for(const f of [p,m])boxingSetAnimation(f,f===loser?'knockdown':'idle');
    j.animation='observe';j.stateFrame=0;j.countNumber=0;
    boxingShowEvent('knockdown',loser);boxingImpact(loser.x,loser.y-35,12,'#f1cc9e','special');
}
function boxingAdvanceKnockdown(){
    const k=boxeGame.knockdown,j=boxeGame.juiz,c=BOXING_ROUND_CONFIG;
    if(!k)return;
    k.frames++;for(const f of [boxeGame.player,boxeGame.mestre])f.stateFrame++;
    const approachEnd=c.fallFrames+c.judgeMoveFrames;
    if(k.frames<=c.fallFrames){j.animation='observe';j.stateFrame++;return;}
    const t=boxingClamp((k.frames-c.fallFrames)/c.judgeMoveFrames,0,1);
    j.x=k.judgeFrom.x+(k.judgeTo.x-k.judgeFrom.x)*t;j.y=k.judgeFrom.y+(k.judgeTo.y-k.judgeFrom.y)*t;
    if(k.frames<=approachEnd){if(j.animation!=='step')j.stateFrame=0;j.animation='step';j.stateFrame++;return;}
    const count=Math.min(c.countTo,1+Math.floor((k.frames-approachEnd-1)/c.countEvery));
    if(count!==k.count){k.count=count;j.countNumber=count;boxingShowEvent('countBeat');}
    if(j.animation!=='count')j.stateFrame=0;j.animation='count';j.stateFrame++;
    if(k.frames>=approachEnd+c.countTo*c.countEvery)boxingFinishRound(k.attacker,'KO');
}

function boxingFinalizeMatch(){
    const r=boxeGame.rounds;if(r.matchReported)return;
    const winner=r.wins.zorp>=2?'zorp':r.wins.master>=2?'master':null;if(!winner)return;
    r.matchReported=true;boxeGame.winner=winner;boxeGame.phase='RESULT';boxingReleaseInput();
    boxeGame.juiz.animation='victory';boxeGame.juiz.stateFrame=0;
    for(const f of [boxeGame.player,boxeGame.mestre])boxingSetAnimation(f,f.role===winner?'victory':f.hp<=0?'knockdown':'defeat');
    window.FestivalChallenges.onBoxingResult(winner,boxeGame.player.knockdowns);
    boxingShowEvent('victory');
    if(winner==='zorp'&&typeof window.desbloquearMedalha==='function')window.desbloquearMedalha('boxe');
}
function boxingPrepareNextRound(){
    const r=boxeGame.rounds;
    if(r.wins.zorp>=2||r.wins.master>=2){boxingFinalizeMatch();return;}
    if(r.number>=BOXING_ROUND_CONFIG.maxRounds)return;
    const previous=[boxeGame.player,boxeGame.mestre];r.number++;
    boxeGame.player=makeBoxingFighter('zorp',145,218);boxeGame.mestre=makeBoxingFighter('master',302,198);
    for(let i=0;i<2;i++){
        const f=i?boxeGame.mestre:boxeGame.player,old=previous[i];
        f.specialCharge=0;f.specialCooldown=0;f.knockdowns=old.knockdowns;
    }
    boxeGame.juiz={role:'judge',x:76,y:172,animation:'start',stateFrame:0,facing:1,countNumber:0};
    boxeGame.mestre.aiAdaptation={...r.adaptation};
    r.stats={zorp:boxingEmptyRoundStats(),master:boxingEmptyRoundStats()};r.suddenDeath=false;
    r.remaining=BOXING_ROUND_CONFIG.seconds*60;r.elapsed=0;boxeGame.knockdown=null;
    boxeGame.effects.length=0;boxeGame.impactBursts.length=0;boxeGame.cameraShake=0;boxeGame.hitPauseFrames=0;
    resetBoxingPresentation();boxingStartRoundIntro();
}
function boxingRoundClockStep(){
    const r=boxeGame.rounds;
    if(boxeGame.phase!=='FIGHTING'||r.suddenDeath)return;
    if(r.remaining>0)r.remaining--;r.elapsed++;
    if(r.remaining===0){
        const tied=boxingRoundTieWinner();
        if(tied)boxingFinishRound(tied.winner,'TEMPO',tied.criterion);else boxingEnterSuddenDeath();
    }
}
function boxingRecordRoundContact(a,b,attack,hit,damage){
    const stat=boxeGame.rounds.stats[a.role];stat.damage+=damage;
    if(!hit.blocked){
        stat.cleanHits++;
        if(attack.counter)stat.counters++;
    }
}
function boxingResolveRoundFrame(contacts){
    const r=boxeGame.rounds;
    if(r.suddenDeath){
        const clean=contacts.filter(h=>h&&!h.dodged&&!h.blocked);
        const roles=new Set(clean.map(h=>h.a.role));
        if(roles.size===1){boxingFinishRound([...roles][0],'SUDDEN DEATH','PRIMEIRO GOLPE LIMPO');return;}
        if(roles.size>1){
            for(const f of [boxeGame.player,boxeGame.mestre])f.hp=Math.max(1,f.hp);
            boxingAddEffect(225,139,'TROCA SIMULTÂNEA','#ffe093');return;
        }
        for(const f of [boxeGame.player,boxeGame.mestre])f.hp=Math.max(1,f.hp);
    }
    if(boxeGame.player.hp<=0||boxeGame.mestre.hp<=0){boxingEnterKnockdown();return;}
    boxingRoundClockStep();
}
function boxingAdvanceRoundPhase(){
    const r=boxeGame.rounds;
    if(boxeGame.phase==='READY'){if(boxingInputPress.start)boxingStartRoundIntro();return true;}
    if(boxeGame.phase==='INTRO'){
        for(const f of [boxeGame.player,boxeGame.mestre,boxeGame.juiz])f.stateFrame++;
        if(boxeGame.introFrames===18)boxingShowEvent('fightStart');
        if(--boxeGame.introFrames<=0){boxeGame.phase='FIGHTING';boxeGame.juiz.animation='idle';boxingReleaseInput();}
        return true;
    }
    if(boxeGame.phase==='KNOCKDOWN'){boxingAdvanceKnockdown();return true;}
    if(boxeGame.phase==='ROUND_RESULT'){
        boxeGame.juiz.stateFrame++;for(const f of [boxeGame.player,boxeGame.mestre])f.stateFrame++;
        if(--r.transition<=0){
            if(r.wins.zorp>=2||r.wins.master>=2)boxingFinalizeMatch();
            else{boxeGame.phase='INTERMISSION';r.transition=BOXING_ROUND_CONFIG.intermissionFrames;boxeGame.juiz.animation='step';r.judgeReturn={x:boxeGame.juiz.x,y:boxeGame.juiz.y};boxingReleaseInput();}
        }return true;
    }
    if(boxeGame.phase==='INTERMISSION'){
        const j=boxeGame.juiz,from=r.judgeReturn||{x:76,y:172};
        const t=boxingClamp((BOXING_ROUND_CONFIG.intermissionFrames-r.transition)/24,0,1);
        j.x=from.x+(76-from.x)*t;j.y=from.y+(172-from.y)*t;j.animation=t<1?'step':'observe';j.stateFrame++;
        if(--r.transition<=0)boxingPrepareNextRound();return true;
    }
    if(boxeGame.phase==='RESULT'){
        if(boxingInputPress.restart){resetBoxe();boxingStartRoundIntro();}
        for(const f of [boxeGame.player,boxeGame.mestre,boxeGame.juiz])f.stateFrame++;return true;
    }
    return boxeGame.phase!=='FIGHTING';
}
window.BoxingRounds=Object.freeze({config:BOXING_ROUND_CONFIG,snapshot:()=>JSON.parse(JSON.stringify(boxeGame.rounds))});
