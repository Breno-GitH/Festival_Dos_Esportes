(function () {
    'use strict';
    // A delayed visual sensor. Nothing here reads routes, progress, spawn queues,
    // collision outcomes or the player's controls. All aiming uses copied samples.
    const CONFIG=Object.freeze({reactionDelay:18,decisionTime:8,accuracy:.90,sampleInterval:6,
        ready:8,raise:10,draw:10,aim:8,release:8,recovery:12,cooldown:30,
        moveSpeed:3.40,maxPrediction:44,maxRaiseWait:72,scanInterval:8});
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function create() {
        return {state:'OBSERVE',age:0,targetId:null,memory:new Map(),nextSample:0,nextScan:0,
            cooldown:0,lockedAim:null,selection:null,shots:0,decisions:0,cancellations:0,
            observedCount:0,lastCandidates:[],events:[],lastFrame:0,opponentHistory:[],opponent:null,
            attempts:{NORMAL:0,FAST:0,BIRD:0,GOLDEN:0,EXPLOSIVE:0}};
    }
    function event(ai,frame,type,data={}) {
        ai.events.push({frame,type,...data});if(ai.events.length>160)ai.events.shift();
    }
    function enter(ai,state,frame) {ai.state=state;ai.age=0;event(ai,frame,'STATE',{state,targetId:ai.targetId});}
    function sense(ai,context) {
        const frame=context.frame;
        if(frame<ai.nextSample)return;
        ai.nextSample=frame+CONFIG.sampleInterval;
        if(context.opponent){
            ai.opponentHistory.push({...context.opponent,frame});
            if(ai.opponentHistory.length>24)ai.opponentHistory.shift();
        }
        const seen=new Set();
        for(const t of context.targets){
            if(!t.active||!t.visible||t.hit)continue;
            seen.add(t.id);
            if(!ai.memory.has(t.id))ai.memory.set(t.id,[]);
            const history=ai.memory.get(t.id);
            history.push({frame,id:t.id,x:t.x,y:t.y,radius:t.radius,value:t.basePoints,
                bird:t.carrier==='BIRD',golden:!!t.isGolden,explosive:!!t.isExplosive,valid:true});
            if(history.length>24)history.shift();
        }
        for(const [id,history]of ai.memory){
            const last=history[history.length-1];
            if(!seen.has(id)&&last.valid)history.push({...last,frame,valid:false});
            if(frame-history[history.length-1].frame>180)ai.memory.delete(id);
        }
    }
    function perceive(ai,frame) {
        const result=[],cutoff=frame-CONFIG.reactionDelay;
        const opponentSamples=ai.opponentHistory.filter(s=>s.frame<=cutoff);
        const last=opponentSamples[opponentSamples.length-1];
        const recentlyShooting=opponentSamples.some(s=>s.arrowVisible&&cutoff-s.frame<90);
        ai.opponent=last?{x:last.x,y:last.y,frame:last.frame,shooting:recentlyShooting}:null;
        for(const history of ai.memory.values()){
            let index=history.length-1;while(index>=0&&history[index].frame>cutoff)index--;
            if(index<0||!history[index].valid)continue;
            const s=history[index],prev=index>0&&history[index-1].valid?history[index-1]:s;
            const old=index>1&&history[index-2].valid?history[index-2]:prev;
            const dt=Math.max(1,s.frame-prev.frame),oldDt=Math.max(1,prev.frame-old.frame);
            const vx=(s.x-prev.x)/dt,vy=(s.y-prev.y)/dt;
            const turn=Math.hypot(vx-(prev.x-old.x)/oldDt,vy-(prev.y-old.y)/oldDt);
            result.push({...s,vx,vy,turn,speed:Math.hypot(vx,vy)});
        }
        ai.observedCount=result.length;return result;
    }
    function lifetime(t) {
        const times=[];
        if(Math.abs(t.vx)>.2)times.push((t.vx>0?450+t.radius-t.x:t.x+t.radius)/Math.abs(t.vx));
        if(t.vy>.2)times.push((210+t.radius-t.y)/t.vy);
        if(t.vy<-.2)times.push((t.y+t.radius-35)/-t.vy);
        return clamp(times.length?Math.min(...times):600,1,600);
    }
    function evaluate(t,observations,context) {
        const distance=Math.abs(t.x-context.x),remaining=lifetime(t)-(context.frame-t.frame);
        const travel=Math.max(1,(context.y-73-t.y)/context.arrowSpeed);
        const required=CONFIG.ready+CONFIG.raise+CONFIG.draw+CONFIG.aim
            +Math.max(0,distance/CONFIG.moveSpeed-CONFIG.ready-CONFIG.raise)+travel;
        const chance=clamp(.98-t.speed*.045-Math.max(0,12-t.radius)*.015-(t.bird?.07:0)
            -distance/1400-t.turn*.18-Math.max(0,required-remaining)/100,.06,.98);
        let nearbyCount=0,nearbyValue=0;
        if(t.explosive)for(const other of observations){
            if(other.id===t.id)continue;
            if(Math.hypot(other.x-t.x,other.y-t.y)<=context.explosionRadius+other.radius){
                nearbyCount++;nearbyValue+=other.value;
            }
        }
        const expected=t.value+(t.golden?45:16)+nearbyValue*.82+(nearbyCount?15:0);
        const timeCost=.9+required/60;
        let score=expected*chance/timeCost;
        // A visible opponent can win a contested target before our bow is ready.
        // Prefer opportunities on our side, using the same delayed sight data.
        if(context.opponent&&context.opponent.shooting){
            const opponentDistance=Math.abs(t.x-context.opponent.x);
            score*=.25+.75*clamp((opponentDistance+20)/(distance+60),.05,1.35);
        }
        if(remaining<18||t.y-t.radius>=context.area.back-73)score*=.12;
        return {id:t.id,score,chance,distance,remaining,required,nearbyCount,nearbyValue,
            bird:t.bird,golden:t.golden,explosive:t.explosive,speed:t.speed,observedFrame:t.frame};
    }
    function choose(observations,context) {
        return observations.map(t=>evaluate(t,observations,context))
            .filter(t=>t.chance>=(t.golden?.16:.26)&&t.score>7)
            .sort((a,b)=>b.score-a.score||a.id-b.id);
    }
    function project(t,context,releaseIn,shotIndex) {
        const flight=Math.max(1,(context.y-73-t.y)/Math.max(1,context.arrowSpeed+t.vy));
        const horizon=clamp(context.frame-t.frame+releaseIn+flight,0,CONFIG.maxPrediction);
        const confidence=1-(1-CONFIG.accuracy)*.25;
        const spread=(1-CONFIG.accuracy)*(.8+t.speed*12+t.turn*24);
        const hand=Math.sin((shotIndex+1)*1.73+t.id*.31)*spread;
        const quantum=.8+(1-CONFIG.accuracy)*8;
        return {x:Math.round((t.x+t.vx*horizon*confidence+hand)/quantum)*quantum,
            y:t.y+t.vy*horizon*confidence,observedFrame:t.frame,horizon,spread};
    }
    function cancel(ai,frame,reason) {
        ai.cancellations++;event(ai,frame,'CANCEL',{targetId:ai.targetId,reason});
        ai.targetId=null;ai.lockedAim=null;ai.nextScan=frame+CONFIG.scanInterval;enter(ai,'OBSERVE',frame);
    }
    function step(ai,context) {
        const {frame,area}=context;ai.lastFrame=frame;ai.age++;if(ai.cooldown>0)ai.cooldown--;
        // In the climax, shorten hesitation and recovery between attempts.
        // Perception delay, aiming accuracy and the visible bow cycle are intact.
        ai.aggressive=!!context.aggressive;
        const decisionTime=ai.aggressive?6:CONFIG.decisionTime;
        const moveSpeed=ai.aggressive?3.70:CONFIG.moveSpeed;
        sense(ai,context);const observations=perceive(ai,frame);
        let x=context.x,y=context.y,fire=null;
        if(ai.state==='OBSERVE'&&frame>=ai.nextScan&&ai.cooldown===0&&observations.length){
            enter(ai,'DECIDING',frame);
        }
        if(ai.state==='DECIDING'&&ai.age>=decisionTime){
            const choices=choose(observations,{...context,opponent:ai.opponent});ai.lastCandidates=choices.slice(0,6);
            ai.decisions++;
            if(choices.length){
                ai.selection=choices[0];ai.targetId=ai.selection.id;
                if(ai.selection.golden)ai.attempts.GOLDEN++;
                if(ai.selection.bird)ai.attempts.BIRD++;
                if(ai.selection.explosive)ai.attempts.EXPLOSIVE++;
                if(ai.selection.speed>1.15)ai.attempts.FAST++;
                if(!ai.selection.golden&&!ai.selection.bird&&!ai.selection.explosive)ai.attempts.NORMAL++;
                event(ai,frame,'SELECT',{...ai.selection});enter(ai,'READY',frame);
            }else cancel(ai,frame,'NO_READABLE_SHOT');
        }
        const target=observations.find(t=>t.id===ai.targetId);
        if(['READY','RAISE_BOW','DRAW_BOWSTRING'].includes(ai.state)&&!target)cancel(ai,frame,'TARGET_LOST_AFTER_REACTION');
        if(target&&(ai.state==='READY'||ai.state==='RAISE_BOW')){
            const remain=(ai.state==='READY'?Math.max(0,CONFIG.ready-ai.age)+CONFIG.raise:Math.max(0,CONFIG.raise-ai.age))+CONFIG.draw+CONFIG.aim;
            const aim=project(target,{...context,x,y},remain,ai.shots);
            const goal=clamp(aim.x,area.left,area.right);
            x+=clamp(goal-x,-moveSpeed,moveSpeed);
            const goalY=clamp(target.y+73+18,area.front+28,area.back-2);
            y+=clamp(goalY-y,-1.35,1.35);
            if(ai.state==='READY'&&ai.age>=CONFIG.ready)enter(ai,'RAISE_BOW',frame);
            else if(ai.state==='RAISE_BOW'&&ai.age>=CONFIG.raise){
                const fly=Math.max(1,(y-73-aim.y)/context.arrowSpeed),steer=Math.min(18,Math.max(6,fly*2.7*.75));
                // Valuable moving opportunities justify a small, visible risk:
                // commit near the edge of our steering reach instead of waiting
                // for perfect centring until the bird or gold has disappeared.
                const riskMargin=target.golden||target.bird?clamp(target.speed*4,3,12):0;
                if(Math.abs(aim.x-x)<=steer+riskMargin&&aim.y<y-74)enter(ai,'DRAW_BOWSTRING',frame);
                else if(ai.age>CONFIG.maxRaiseWait||lifetime(target)-(frame-target.frame)<12)cancel(ai,frame,'LATE_OR_OUT_OF_REACH');
            }
        }
        if(ai.state==='DRAW_BOWSTRING'&&ai.age>=CONFIG.draw&&target){
            const aim=project(target,{...context,x,y},CONFIG.aim,ai.shots);
            if(aim.y>=y-74)cancel(ai,frame,'TARGET_BELOW_BOW');
            else{
                ai.lockedAim={...aim,lockedAim:true,commitFrame:frame};
                event(ai,frame,'LOCK',{targetId:ai.targetId,...ai.lockedAim});enter(ai,'AIM',frame);
            }
        }
        if(ai.state==='AIM'&&ai.age>=CONFIG.aim){
            fire={...ai.lockedAim};ai.shots++;ai.cooldown=ai.aggressive?22:CONFIG.cooldown;
            event(ai,frame,'SHOT',{targetId:ai.targetId,...fire});enter(ai,'RELEASE_SHOT',frame);
        }else if(ai.state==='RELEASE_SHOT'&&ai.age>=CONFIG.release)enter(ai,'RECOVERY',frame);
        else if(ai.state==='RECOVERY'&&ai.age>=CONFIG.recovery){ai.targetId=null;ai.lockedAim=null;enter(ai,'OBSERVE',frame);}
        return {x:clamp(x,area.left,area.right),y:clamp(y,area.front,area.back),state:ai.state,
            targetId:ai.targetId,fire,cooldown:ai.cooldown};
    }
    function diagnostics(ai) {
        return {config:CONFIG,state:ai.state,stateAge:ai.age,targetId:ai.targetId,observed:ai.observedCount,
            cooldown:ai.cooldown,shots:ai.shots,decisions:ai.decisions,cancellations:ai.cancellations,aggressive:!!ai.aggressive,
            selection:ai.selection,lockedAim:ai.lockedAim,candidates:ai.lastCandidates,attempts:ai.attempts,
            opponent:ai.opponent,events:ai.events};
    }
    window.ArcheryMasterAI=Object.freeze({CONFIG,create,step,evaluate,choose,project,diagnostics});
})();
