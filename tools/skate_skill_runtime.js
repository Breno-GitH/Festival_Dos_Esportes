'use strict';
const qaStatus=document.getElementById('status'),qaMetrics=document.getElementById('metrics');
let qaLastReport=null,qaAirTrickIndex=0,qaGrindTrickIndex=0,qaRunning=false,qaTrickedThisAir=false,qaJumpCount=0,qaLastGrind='';

function qaClearInput(){Object.assign(fixedSkateInput,{left:false,right:false,down:false,space:false,jump:false,trick:'',grindTrick:''});}
function qaRampProgress(p){const skin=p.surface?.rampSkin;if(!skin)return 0;const points=skin.surface;return (p.x-points[0][0])/(points[points.length-1][0]-points[0][0]);}
function qaHasConnectedExit(line){return [...skateGame.terrain,...skateGame.platforms].some(other=>other!==line&&Math.abs(other.x1-line.x2)<.2&&Math.abs(other.y1-line.y2)<2);}
function qaDriveSkill(p,allowTricks=true){
    qaClearInput();fixedSkateInput.right=true;
    if(p.grinding){
        const grindId=p.rail?.group?.id||'';
        if(allowTricks&&grindId!==qaLastGrind&&p.grindTicks>8&&!p.grindTrick){fixedSkateInput.grindTrick=qaGrindTrickIndex++%2?'grindGrab':'boardslide';qaLastGrind=grindId;}
        return;
    }
    if(p.grounded){
        qaTrickedThisAir=false;
        const obstacle=skateGame.obstacles.find(o=>o.x>=p.x-4&&o.x-p.x<Math.max(52,p.vx*5.2));
        const line=p.surface,edge=line?line.x2-p.x:Infinity;
        const rampReady=line?.kind==='ramp'&&qaRampProgress(p)>.92;
        const gapReady=line&&!qaHasConnectedExit(line)&&edge<Math.max(34,p.vx*3.4);
        if(obstacle||rampReady||gapReady){fixedSkateInput.jump=true;qaJumpCount++;}
        return;
    }
    if(allowTricks&&!p.activeTrick&&!qaTrickedThisAir&&p.trickCooldown<=0&&p.airTicks>7&&p.vy<-2&&qaJumpCount%2===0){
        fixedSkateInput.trick=['flip','heel','grab','spin'][qaAirTrickIndex++%4];
        qaTrickedThisAir=true;
    }
}
function qaDrivePassive(){qaClearInput();fixedSkateInput.right=true;}

async function qaEnsureImages(){
    await fixedKitCatalog.promise;
    await Promise.all([...fixedSpriteCache.values()].map(image=>image.decode().catch(error=>qaErrors.push(String(error)))));
}

async function qaRun(mode){
    if(qaRunning)return qaLastReport;
    qaRunning=true;qaStatus.textContent=mode==='passive'?'Teste passivo em andamento…':mode==='noTricks'?'Corrida sem tricks em andamento…':'Corrida habilidosa em andamento…';
    await qaEnsureImages();fixedResetSkate();currentScene='JOGO_SKATE';skateGame.state='PLAYING';qaAirTrickIndex=0;qaGrindTrickIndex=0;qaTrickedThisAir=false;qaJumpCount=0;qaLastGrind='';qaErrors.length=0;qaInvalidDraws=0;
    const states=new Set(),actions=new Set(),frames=new Set(),events=[];let lastState='',minY=skateGame.player.y,maxY=minY,minCamera=0,maxCamera=0,tick=0;
    for(;tick<6000&&!['VICTORY','FAIL'].includes(skateGame.state);tick++){
        const p=skateGame.player;mode==='passive'?qaDrivePassive():qaDriveSkill(p,mode!=='noTricks');
        try{updateSkateGame();drawSkateGame();}catch(error){qaErrors.push(error.stack||String(error));break;}
        if(p.moveState!==lastState){events.push({tick,state:p.moveState,x:Math.round(p.x),y:Math.round(p.y),vx:+p.vx.toFixed(2),vy:+p.vy.toFixed(2),rail:p.rail?.group?.id||''});lastState=p.moveState;}
        states.add(p.moveState);actions.add(p.action);const sequence=fixedSkateFrames[p.action]||fixedSkateFrames.CRUISE;frames.add(sequence[p.frame%sequence.length][5]);
        minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);minCamera=Math.min(minCamera,skateGame.cameraY);maxCamera=Math.max(maxCamera,skateGame.cameraY);
        // Yield periodically while still exercising every production update/draw.
        if(tick%24===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    const motionFrames=skateGame.stats.groundFrames+skateGame.stats.airFrames+skateGame.stats.grindFrames;
    qaLastReport={mode,state:skateGame.state,failReason:skateGame.failReason,ticks:tick,x:Math.round(skateGame.player.x),score:skateGame.score,minY,maxY,minCamera,maxCamera,checkpoint:skateGame.currentCheckpoint,progression:{...skateGame.progression,totalGates:skateGame.sectionGates.length},contactRatio:motionFrames?+(skateGame.stats.groundFrames/motionFrames).toFixed(3):0,stats:skateGame.stats,events,states:[...states],actions:[...actions],frames:[...frames],pro3Frames:[...frames].filter(name=>name.includes('pro3_')),collectibles:skateGame.rings.length,remainingCollectibles:skateGame.rings.filter(r=>!r.used).length,errors:[...qaErrors],invalidDraws:qaInvalidDraws,kitFailures:[...fixedKitCatalog.failed]};
    qaStatus.textContent=mode==='passive'?'Teste passivo concluído.':mode==='noTricks'?'Corrida sem tricks concluída.':'Corrida habilidosa concluída.';qaMetrics.textContent=JSON.stringify(qaLastReport,null,2);qaRunning=false;return qaLastReport;
}

document.getElementById('skill').onclick=()=>{void qaRun('skill');};
document.getElementById('noTricks').onclick=()=>{void qaRun('noTricks');};
document.getElementById('passive').onclick=()=>{void qaRun('passive');};
document.getElementById('restart').onclick=async()=>{
    if(!qaLastReport||skateGame.state!=='FAIL')await qaRun('passive');
    fixedSkateInput.jump=true;updateSkateGame();drawSkateGame();
    const result={stateAfterRestart:skateGame.state,xAfterRestart:skateGame.player.x,moveState:skateGame.player.moveState,errors:[...qaErrors],invalidDraws:qaInvalidDraws};
    qaStatus.textContent='Restart validado.';qaMetrics.textContent=JSON.stringify(result,null,2);
};
document.getElementById('checkpoint').onclick=async()=>{
    if(qaRunning)return;
    if(skateGame.currentCheckpoint<0)await qaRun('skill');
    const checkpoint=skateGame.checkpoints[skateGame.currentCheckpoint];
    skateGame.state='PLAYING';fixedBeginFall('TESTE DE CHECKPOINT');
    for(let tick=0;tick<60&&skateGame.state!=='FAIL';tick++){
        qaClearInput();updateSkateGame();drawSkateGame();await new Promise(resolve=>setTimeout(resolve,0));
    }
    fixedSkateInput.jump=true;updateSkateGame();drawSkateGame();
    const result={checkpoint:checkpoint?.label,index:skateGame.currentCheckpoint,expectedX:checkpoint?.spawnX,stateAfterRespawn:skateGame.state,xAfterRespawn:skateGame.player.x,yAfterRespawn:skateGame.player.y,moveState:skateGame.player.moveState,errors:[...qaErrors],invalidDraws:qaInvalidDraws};
    qaStatus.textContent='Checkpoint validado.';qaMetrics.textContent=JSON.stringify(result,null,2);
};

async function qaRunSkipTests(){
    if(qaRunning)return;qaRunning=true;qaStatus.textContent='Testes de skip em andamento…';await qaEnsureImages();qaErrors.length=0;qaInvalidDraws=0;
    const report={};

    fixedResetSkate();skateGame.state='PLAYING';
    const future=skateGame.checkpoints[3],p=skateGame.player;
    p.x=future.x;p.y=future.y;p.grounded=true;
    fixedUpdateProgression(p);fixedUpdateCheckpoint(p);
    report.futureCheckpoint={target:future.label,activated:skateGame.currentCheckpoint,completed:skateGame.progression.completed,blocked:skateGame.currentCheckpoint===-1};

    const arenaLine=skateGame.platforms.find(line=>fixedContains(line,skateGame.finishX));
    p.x=skateGame.finishX+5;p.y=fixedY(arenaLine,p.x);p.surface=arenaLine;p.grounded=true;p.falling=false;p.vx=3;p.speed=3;
    updateSkateGame();
    report.earlyArena={state:skateGame.state,completed:skateGame.progression.completed,blocked:skateGame.state!=='VICTORY'};

    fixedResetSkate();skateGame.state='PLAYING';
    const first=skateGame.sectionGates[0],cp0=skateGame.checkpoints[0],cpFuture=skateGame.checkpoints[3];
    skateGame.player.x=(first.x1+first.x2)/2;skateGame.player.y=(first.y1+first.y2)/2;fixedUpdateProgression(skateGame.player);
    skateGame.player.x=cpFuture.x;skateGame.player.y=cpFuture.y;fixedUpdateCheckpoint(skateGame.player);
    report.futureAfterSection1={activated:skateGame.currentCheckpoint,blocked:skateGame.currentCheckpoint===-1};
    skateGame.player.x=cp0.x;skateGame.player.y=cp0.y;fixedUpdateCheckpoint(skateGame.player);
    report.firstCheckpoint={activated:skateGame.currentCheckpoint,expected:0,valid:skateGame.currentCheckpoint===0};

    fixedResetSkate();skateGame.state='PLAYING';
    for(const gate of skateGame.sectionGates){skateGame.player.x=(gate.x1+gate.x2)/2;skateGame.player.y=(gate.y1+gate.y2)/2;fixedUpdateProgression(skateGame.player);}
    report.orderedPass={completed:skateGame.progression.completed,order:[...skateGame.progression.order],valid:skateGame.progression.completed===skateGame.sectionGates.length};

    fixedResetSkate();
    const labels=[...new Set([...skateGame.terrain,...skateGame.platforms].filter(line=>line.rampSkin).map(line=>line.rampSkin.label))];
    report.maxSpeedRamps=[];
    for(const label of labels){
        fixedResetSkate();skateGame.state='PLAYING';qaClearInput();
        const segments=[...skateGame.terrain,...skateGame.platforms].filter(line=>line.rampSkin?.label===label).sort((a,b)=>a.x2-b.x2);
        const line=segments[segments.length-1],rider=skateGame.player,startX=line.x2-1,startY=fixedY(line,startX);
        Object.assign(rider,{x:startX,y:startY,surface:line,onPlatform:skateGame.platforms.includes(line),grounded:true,grinding:false,falling:false,speed:20,vx:20,vy:0,rampEntrySpeed:20});
        fixedLaunch(rider,line);let minY=rider.y,ticks=0;
        for(;ticks<420&&!rider.grounded&&!rider.grinding&&!rider.falling;ticks++){fixedUpdateAir(rider);minY=Math.min(minY,rider.y);}
        report.maxSpeedRamps.push({label,dx:+(rider.x-startX).toFixed(1),rise:+(startY-minY).toFixed(1),ticks,target:rider.grinding?rider.rail?.group?.id:rider.surface?.kind||'gap',landed:rider.grounded||rider.grinding,crossSection:(rider.x-startX)>750});
    }
    report.rampSafety={largestDx:Math.max(...report.maxSpeedRamps.map(test=>test.dx)),crossSectionCount:report.maxSpeedRamps.filter(test=>test.crossSection).length};
    report.errors=[...qaErrors];report.invalidDraws=qaInvalidDraws;report.kitFailures=[...fixedKitCatalog.failed];
    qaStatus.textContent='Testes de skip concluídos.';qaMetrics.textContent=JSON.stringify(report,null,2);qaRunning=false;return report;
}
document.getElementById('skips').onclick=()=>{void qaRunSkipTests();};

qaEnsureImages().then(()=>{currentScene='JOGO_SKATE';drawSkateGame();qaStatus.textContent=`${fixedSpriteCache.size} frames ativos e ${fixedKitCatalog.loaded} sprites de cenário carregados.`;}).catch(error=>{qaErrors.push(String(error));qaStatus.textContent=String(error);});
