(function () {
    'use strict';
    // Only delayed visual samples: no routes, future spawn queues or projectile corrections.
    // All durations use the existing fixed 60 Hz simulation, not display frames.
    // Accuracy is aim consistency, never a probability that awards a hit.
    const CONFIG=Object.freeze({difficulty:'NORMAL',reactionDelay:30,decisionDelay:18,decisionTime:18,
        accuracy:.70,predictionError:.065,shotCooldown:48,sampleInterval:6,
        ready:9,raise:11,draw:13,aim:15,release:8,recovery:21,cooldown:48,
        moveSpeed:3.20,maxPrediction:100,maxRaiseWait:72,scanInterval:10,
        minSkill:.50,maxSkill:.60,minAimError:3.5,minReactionDelay:21,maxReactionDelay:39,maxAccuracy:.74});
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
    function profileAt(frame,totalFrames=3600) {
        const progress=clamp(frame/Math.max(1,totalFrames),0,1);
        const decisionDelay=lerp(18,16,progress),shotCooldown=lerp(50,46,progress);
        return {masterSkill:lerp(CONFIG.minSkill,CONFIG.maxSkill,progress),progress,
            reactionDelay:lerp(31,28,progress),reactionBase:lerp(31,28,progress),decisionDelay,decisionTime:decisionDelay,
            accuracy:lerp(CONFIG.accuracy,CONFIG.maxAccuracy,progress),
            aimError:lerp(4,CONFIG.minAimError,progress),prediction:lerp(.88,.91,progress),
            predictionError:lerp(.075,.055,progress),selectionError:.24,comboAwareness:lerp(.42,.52,progress),
            ready:9,raise:11,draw:13,aim:Math.round(lerp(16,14,progress)),release:8,
            recovery:21,shotCooldown,cooldown:shotCooldown,moveSpeed:3.20};
    }
    function varyTiming(ai,p) {
        // One stable human tempo per attempt. Never resample perception each frame.
        const reactionDelay=clamp(Math.round(p.reactionBase+(ai.random()*2-1)*8),CONFIG.minReactionDelay,CONFIG.maxReactionDelay);
        const decisionDelay=Math.round(p.decisionDelay+(ai.random()*2-1)*4);
        const shotCooldown=Math.round(p.shotCooldown+(ai.random()*2-1)*6);
        return {...p,reactionDelay,decisionDelay,decisionTime:decisionDelay,shotCooldown,cooldown:shotCooldown};
    }
    function create(options={}) {
        const random=options.random||Math.random;
        const timing=varyTiming({random},profileAt(0));
        return {state:'OBSERVE',age:0,targetId:null,memory:new Map(),nextSample:0,nextScan:0,
            cooldown:0,lockedAim:null,selection:null,shots:0,decisions:0,cancellations:0,
            observedCount:0,lastCandidates:[],events:[],lastFrame:0,opponentHistory:[],opponent:null,
            random,aimNoise:null,masterSkill:CONFIG.minSkill,
            profile:{...timing},timing,perceptionDelay:timing.reactionDelay,
            attempts:{NORMAL:0,FAST:0,BIRD:0,GOLDEN:0,EXPLOSIVE:0}};
    }
    function normal(random) {
        return Math.sqrt(-2*Math.log(Math.max(1e-9,random())))*Math.cos(2*Math.PI*random());
    }
    function event(ai,frame,type,data={}) {
        ai.events.push({frame,type,...data});if(ai.events.length>600)ai.events.shift();
    }
    function enter(ai,state,frame) {ai.state=state;ai.age=0;event(ai,frame,'STATE',{state,targetId:ai.targetId});}
    function sense(ai,context) {
        const frame=context.frame;
        if(frame<ai.nextSample)return;
        ai.nextSample=frame+CONFIG.sampleInterval;
        if(context.opponent){ai.opponentHistory.push({...context.opponent,frame});if(ai.opponentHistory.length>24)ai.opponentHistory.shift();}
        const seen=new Set();
        for(const t of context.targets){
            if(!t.active||!t.visible||t.hit)continue;
            seen.add(t.id);if(!ai.memory.has(t.id))ai.memory.set(t.id,[]);
            const history=ai.memory.get(t.id);
            history.push({frame,id:t.id,x:t.x,y:t.y,radius:t.radius,value:t.basePoints,
                bird:t.carrier==='BIRD',golden:!!t.isGolden,explosive:!!t.isExplosive,valid:true});
            if(history.length>30)history.shift();
        }
        for(const [id,history]of ai.memory){
            const last=history[history.length-1];
            if(!seen.has(id)&&last.valid)history.push({...last,frame,valid:false});
            if(frame-history[history.length-1].frame>180)ai.memory.delete(id);
        }
    }
    function perceive(ai,frame) {
        const result=[],cutoff=frame-ai.profile.reactionDelay;
        const samples=ai.opponentHistory.filter(s=>s.frame<=cutoff),last=samples.at(-1);
        ai.opponent=last?{x:last.x,y:last.y,frame:last.frame,shooting:samples.some(s=>s.arrowVisible&&cutoff-s.frame<90)}:null;
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
        if(Math.abs(t.vx)>.2)times.push((t.vx>0?window.ArcheryField.WIDTH+t.radius-t.x:t.x+t.radius)/Math.abs(t.vx));
        if(t.vy>.2)times.push((window.ArcheryField.SOURCE_BOTTOM+t.radius-t.y)/t.vy);
        if(t.vy<-.2)times.push((t.y+t.radius-35)/-t.vy);
        return clamp(times.length?Math.min(...times):600,1,600);
    }
    function evaluate(t,observations,context) {
        const p=context.profile||profileAt(context.frame,context.totalFrames);
        const distance=Math.abs(t.x-context.x),remaining=lifetime(t)-(context.frame-t.frame);
        const travel=Math.max(1,(context.y-73-t.y)/context.arrowSpeed);
        const required=p.ready+p.raise+p.draw+p.aim+Math.max(0,distance/p.moveSpeed-p.ready-p.raise)+travel;
        const chance=clamp(p.accuracy+.12-t.speed*.065-Math.max(0,14-t.radius)*.013-(t.bird?.08:0)
            -distance/1800-t.turn*.22-Math.max(0,required-remaining)/100,.06,.94);
        let nearbyCount=0,nearbyValue=0;
        if(t.explosive){
            const neighbours=observations.filter(o=>o.id!==t.id&&Math.hypot(o.x-t.x,o.y-t.y)<=context.explosionRadius+o.radius)
                .sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y));
            const understood=neighbours.slice(0,2);
            nearbyCount=understood.length;
            if(nearbyCount>=2)nearbyValue=understood.reduce((sum,o)=>sum+o.value,0);
        }
        const expected=t.value+(t.golden?35:14)+nearbyValue*p.comboAwareness+(nearbyCount>=2?15:0);
        let score=expected*chance/(.9+required/60);
        if(t.golden)score*=lerp(1.10,1.20,p.progress);
        // Do not spend an entire preparation crossing an unreachable shooting lane.
        if(distance>p.moveSpeed*(CONFIG.maxRaiseWait+p.ready)+28)score*=.60;
        if(context.opponent?.shooting){const d=Math.abs(t.x-context.opponent.x);score*=.72+.28*clamp((d+20)/(distance+60),.08,1.35);}
        if(remaining<18||t.y-t.radius>=context.area.back-73)score*=.12;
        return {id:t.id,score,chance,distance,remaining,required,nearbyCount,nearbyValue,
            bird:t.bird,golden:t.golden,explosive:t.explosive,speed:t.speed,observedFrame:t.frame};
    }
    function choose(observations,context) {
        const p=context.profile||profileAt(context.frame,context.totalFrames);
        return observations.map(t=>evaluate(t,observations,context))
            .filter(t=>t.chance>=(t.golden?.18:.24)&&t.score>5.5)
            .sort((a,b)=>b.score-a.score||a.id-b.id);
    }
    function project(t,context,releaseIn,shotIndex=0,noise=null) {
        const p=context.profile||profileAt(context.frame,context.totalFrames);
        // Sampled once per attempt, not a new random direction on every frame.
        const n=noise||{x:Math.sin(shotIndex*1.73+t.id*.31),y:Math.cos(shotIndex*.71+t.id),velocity:Math.sin(shotIndex*.93)};
        const flight=Math.max(1,(context.y-73-t.y)/Math.max(1,context.arrowSpeed+t.vy));
        const horizon=clamp(context.frame-t.frame+releaseIn+flight,0,CONFIG.maxPrediction);
        const distance=Math.abs(t.x-context.x),complexity=clamp(t.turn*12,0,2);
        const difficulty=t.speed*.9+Math.max(0,14-t.radius)*.10+(t.bird?.8:0)+(t.golden?.55:0)+complexity+Math.max(0,context.y-73-t.y)/180;
        const spread=p.aimError+(1-p.accuracy)*(8+difficulty*6.5+distance*.02);
        // Continuous hand dispersion with occasional wider offsets, never a forced miss.
        const hand=clamp(n.x*(.85+.12*n.x*n.x),-3.6,3.6);
        // Pick a broad part of the visible face, not a guaranteed centre shot.
        const faceOffset=(n.face||0)*t.radius;
        const aimErrorX=hand*spread+faceOffset;
        const confidence=clamp(p.prediction+n.velocity*p.predictionError,.65,.97);
        const quantum=lerp(2,1.6,p.progress);
        return {x:Math.round((t.x+t.vx*horizon*confidence+aimErrorX)/quantum)*quantum,
            y:t.y+t.vy*horizon*confidence+n.y*spread*.28,observedFrame:t.frame,horizon,spread,
            aimErrorX,aimErrorY:n.y*spread*.28,predictionError:p.predictionError,masterSkill:p.masterSkill,accuracy:p.accuracy};
    }
    function cancel(ai,frame,reason) {
        ai.cancellations++;event(ai,frame,'CANCEL',{targetId:ai.targetId,reason});
        ai.targetId=null;ai.lockedAim=null;ai.aimNoise=null;ai.nextScan=frame+CONFIG.scanInterval;ai.perceptionDelay=varyTiming(ai,ai.profile).reactionDelay;enter(ai,'OBSERVE',frame);
    }
    function step(ai,context) {
        const {frame,area}=context;ai.lastFrame=frame;ai.age++;if(ai.cooldown>0)ai.cooldown--;
        ai.profile=profileAt(frame,context.totalFrames);
        ai.profile.reactionDelay=ai.perceptionDelay;
        ai.masterSkill=ai.profile.masterSkill;
        sense(ai,context);const observations=perceive(ai,frame);
        let x=context.x,y=context.y,fire=null;
        if(ai.state==='OBSERVE'&&frame>=ai.nextScan&&ai.cooldown===0&&observations.length){
            ai.timing={...varyTiming(ai,ai.profile),reactionDelay:ai.perceptionDelay};enter(ai,'DECIDING',frame);
        }
        const timing=ai.timing;
        if(ai.state==='DECIDING'&&ai.age>=timing.decisionTime){
            const choices=choose(observations,{...context,profile:ai.profile,opponent:ai.opponent})
                .map(c=>({...c,decisionScore:c.score*(1+(ai.random()*2-1)*ai.profile.selectionError)}))
                .sort((a,b)=>b.decisionScore-a.decisionScore);
            ai.lastCandidates=choices.slice(0,6);ai.decisions++;
            if(choices.length){
                // A small weighted shortlist represents imperfect judgement, not an optimal solver.
                // The weighting only selects a target; the arrow must still hit it physically.
                const shortlist=choices.filter(c=>c.decisionScore>=choices[0].decisionScore*.60).slice(0,2);
                const weights=shortlist.map(c=>Math.pow(c.decisionScore,1.6));
                let pick=ai.random()*weights.reduce((sum,w)=>sum+w,0),index=0;
                while(index<weights.length-1&&pick>=weights[index])pick-=weights[index++];
                ai.selection=shortlist[index];ai.targetId=ai.selection.id;
                ai.aimNoise={x:normal(ai.random),y:normal(ai.random),velocity:normal(ai.random),face:(ai.random()*2-1)*.45};
                if(ai.selection.golden)ai.attempts.GOLDEN++;
                if(ai.selection.bird)ai.attempts.BIRD++;
                if(ai.selection.explosive)ai.attempts.EXPLOSIVE++;
                if(ai.selection.speed>1.15)ai.attempts.FAST++;
                if(!ai.selection.golden&&!ai.selection.bird&&!ai.selection.explosive)ai.attempts.NORMAL++;
                event(ai,frame,'SELECT',{...ai.selection,masterSkill:ai.masterSkill,reactionDelay:timing.reactionDelay,decisionDelay:timing.decisionDelay,shotCooldown:timing.shotCooldown});enter(ai,'READY',frame);
            }else cancel(ai,frame,'NO_READABLE_SHOT');
        }
        const target=observations.find(t=>t.id===ai.targetId);
        if(['READY','RAISE_BOW','DRAW_BOWSTRING'].includes(ai.state)&&!target)cancel(ai,frame,'TARGET_LOST_AFTER_REACTION');
        if(target&&(ai.state==='READY'||ai.state==='RAISE_BOW')){
            const remain=(ai.state==='READY'?Math.max(0,timing.ready-ai.age)+timing.raise:Math.max(0,timing.raise-ai.age))+timing.draw+timing.aim;
            const aim=project(target,{...context,x,y,profile:ai.profile},remain,ai.shots,ai.aimNoise);
            x+=clamp(clamp(aim.x,area.left,area.right)-x,-timing.moveSpeed,timing.moveSpeed);
            const stanceY=clamp(Math.max(y,aim.y+73+22),Math.min(area.front+28,area.back-3),area.back-2);
            y+=clamp(stanceY-y,-1.35,1.35);
            if(ai.state==='READY'&&ai.age>=timing.ready)enter(ai,'RAISE_BOW',frame);
            else if(ai.state==='RAISE_BOW'&&ai.age>=timing.raise){
                const fly=Math.max(1,(y-73-aim.y)/context.arrowSpeed),steer=Math.min(18,Math.max(6,fly*2.7*.75));
                const risk=target.golden||target.bird?clamp(target.speed*lerp(2.5,4,ai.profile.progress),3,12):0;
                if(Math.abs(aim.x-x)<=steer+risk&&aim.y<y-74)enter(ai,'DRAW_BOWSTRING',frame);
                else if(ai.age>CONFIG.maxRaiseWait||lifetime(target)-(frame-target.frame)<12)cancel(ai,frame,'LATE_OR_OUT_OF_REACH');
            }
        }
        if(ai.state==='DRAW_BOWSTRING'&&ai.age>=timing.draw&&target){
            const aim=project(target,{...context,x,y,profile:ai.profile},timing.aim,ai.shots,ai.aimNoise);
            if(aim.y>=y-74)cancel(ai,frame,'TARGET_BELOW_BOW');
            else {ai.lockedAim={...aim,lockedAim:true,commitFrame:frame};event(ai,frame,'LOCK',{targetId:ai.targetId,...ai.lockedAim});enter(ai,'AIM',frame);}
        }
        if(ai.state==='AIM'&&ai.age>=timing.aim){
            fire={...ai.lockedAim};ai.shots++;ai.cooldown=timing.cooldown;
            event(ai,frame,'SHOT',{targetId:ai.targetId,...fire});enter(ai,'RELEASE_SHOT',frame);
        }else if(ai.state==='RELEASE_SHOT'&&ai.age>=timing.release)enter(ai,'RECOVERY',frame);
        else if(ai.state==='RECOVERY'&&ai.age>=timing.recovery){ai.targetId=null;ai.lockedAim=null;ai.aimNoise=null;ai.perceptionDelay=varyTiming(ai,ai.profile).reactionDelay;enter(ai,'OBSERVE',frame);}
        return {x:clamp(x,area.left,area.right),y:clamp(y,area.front,area.back),state:ai.state,targetId:ai.targetId,fire,cooldown:ai.cooldown};
    }
    function diagnostics(ai) {
        return {config:CONFIG,state:ai.state,stateAge:ai.age,targetId:ai.targetId,observed:ai.observedCount,
            masterSkill:ai.masterSkill,profile:ai.profile,timing:ai.timing,
            cooldown:ai.cooldown,shots:ai.shots,decisions:ai.decisions,cancellations:ai.cancellations,
            selection:ai.selection,lockedAim:ai.lockedAim,candidates:ai.lastCandidates,attempts:ai.attempts,opponent:ai.opponent,events:ai.events};
    }
    window.ArcheryMasterAI=Object.freeze({CONFIG,create,profileAt,step,evaluate,choose,project,diagnostics});
})();
