(function () {
    'use strict';
    // The order, spacing and paths of every wave are authored. Randomness is
    // reserved for the rare golden opportunity, never for arbitrary positions.
    const PHASES=Object.freeze([
        {name:'INTRODUCAO',color:'#9ff3b0',capacity:6,riverCapacity:6,interval:240,waves:['OPENING_CURRENT','EASY_CROSSING','SKY_AND_STREAM']},
        {name:'CRUZAMENTOS',color:'#74e6ff',capacity:8,riverCapacity:8,interval:210,waves:['EASY_CROSSING','EXPLOSIVE_CONFLUENCE','SKY_AND_STREAM','DEPTH_CURRENTS']},
        {name:'COMPETICAO',color:'#ffcf70',capacity:10,riverCapacity:10,interval:185,waves:['DEPTH_CURRENTS','EXPLOSIVE_CONFLUENCE','SKY_AND_STREAM','FAST_SEQUENCE']},
        {name:'CLIMAX',color:'#ff9d78',capacity:12,riverCapacity:12,interval:170,waves:['EXPLOSIVE_CHAIN_CURRENT','FAST_SEQUENCE','SKY_AND_STREAM','FINAL_SWEEP']}
    ].map(p=>Object.freeze({...p,waves:Object.freeze(p.waves)})));
    const PATTERNS=Object.freeze([
        {id:'OPENING_CURRENT',targets:[
            {delay:0,kind:'NORMAL_LARGE',band:'NEAR',path:'STRAIGHT',speed:'SLOW',entry:'LEFT'},
            {delay:66,kind:'NORMAL_LARGE',band:'NEAR',path:'ARC',speed:'SLOW',entry:'RIGHT'},
            {delay:132,kind:'NORMAL_LARGE',band:'NEAR',path:'CURVE',speed:'SLOW',entry:'TOP',exit:'LEFT'}]},
        {id:'EASY_CROSSING',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',band:'MID',path:'DIAGONAL',speed:'MEDIUM',entry:'LEFT'},
            {delay:90,kind:'NORMAL_MEDIUM',band:'MID',path:'ARC',speed:'MEDIUM',entry:'RIGHT'}]},
        {id:'SKY_AND_STREAM',targets:[
            {delay:0,carrier:'BIRD',kind:'BIRD_TARGET',entry:'LEFT'},
            {delay:48,kind:'NORMAL_LARGE',band:'NEAR',path:'S_CURVE',speed:'SLOW',entry:'RIGHT'},
            {delay:106,kind:'NORMAL_MEDIUM',band:'MID',path:'WAVE',speed:'MEDIUM',entry:'TOP',exit:'RIGHT'}]},
        {id:'EXPLOSIVE_CONFLUENCE',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',band:'MID',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT',laneOffset:-16},
            {delay:28,kind:'EXPLOSIVE',band:'MID',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT'},
            {delay:56,kind:'NORMAL_MEDIUM',band:'MID',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT',laneOffset:16},
            {delay:84,kind:'NORMAL_SMALL',band:'MID',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT',laneOffset:24}]},
        {id:'DEPTH_CURRENTS',targets:[
            {delay:0,kind:'NORMAL_SMALL',band:'FAR',path:'ELLIPSE',speed:'FAST',entry:'RIGHT'},
            {delay:60,kind:'NORMAL_MEDIUM',band:'MID',path:'S_CURVE',speed:'MEDIUM',entry:'TOP',exit:'LEFT'},
            {delay:120,kind:'NORMAL_LARGE',band:'NEAR',path:'ARC',speed:'SLOW',entry:'LEFT'}]},
        {id:'FAST_SEQUENCE',targets:[
            {delay:0,kind:'NORMAL_SMALL',band:'FAR',path:'DIAGONAL',speed:'FAST',entry:'LEFT'},
            {delay:72,kind:'NORMAL_SMALL',band:'FAR',path:'WAVE',speed:'FAST',entry:'RIGHT'},
            {delay:144,kind:'NORMAL_SMALL',band:'FAR',path:'ELLIPSE',speed:'FAST',entry:'TOP',exit:'RIGHT'}]},
        {id:'EXPLOSIVE_CHAIN_CURRENT',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',band:'NEAR',path:'CURVE',speed:'MEDIUM',entry:'RIGHT',laneOffset:-12},
            {delay:28,kind:'EXPLOSIVE',band:'NEAR',path:'CURVE',speed:'MEDIUM',entry:'RIGHT'},
            {delay:56,kind:'EXPLOSIVE',band:'NEAR',path:'CURVE',speed:'MEDIUM',entry:'RIGHT',laneOffset:12},
            {delay:84,kind:'NORMAL_MEDIUM',band:'NEAR',path:'CURVE',speed:'MEDIUM',entry:'RIGHT',laneOffset:20},
            {delay:112,kind:'NORMAL_SMALL',band:'NEAR',path:'CURVE',speed:'MEDIUM',entry:'RIGHT',laneOffset:-20}]},
        {id:'FINAL_SWEEP',targets:[
            {delay:0,kind:'NORMAL_SMALL',band:'FAR',path:'ARC',speed:'FAST',entry:'LEFT'},
            {delay:48,kind:'NORMAL_MEDIUM',band:'MID',path:'ELLIPSE',speed:'MEDIUM',entry:'RIGHT'},
            {delay:96,kind:'NORMAL_LARGE',band:'NEAR',path:'DIAGONAL',speed:'MEDIUM',entry:'TOP',exit:'LEFT'}]}
    ].map(p=>Object.freeze({...p,targets:Object.freeze(p.targets.map(Object.freeze))})));
    // Bird opportunities now belong to authored waves; gold keeps its rare schedule.
    const BIRD_FRAMES=Object.freeze([]);
    const SETTLE_MIN=24,SETTLE_MAX=90;
    function create() {
        return {phase:0,waveCounts:[0,0,0,0],waves:[],phaseEntries:[{phase:0,frame:0}],
            phases:PHASES.map(()=>({spawns:0,normal:0,birds:0,explosives:0,golden:0,playerShots:0,masterShots:0,
                speeds:{},activeSamples:0,activeTotal:0,maxActive:0})),
            countdown:[],settleFrames:0,arrowsAtBuzzer:0,scoresAtBuzzer:null,finalScores:null};
    }
    function phaseAt(frame,total=3600) {return Math.min(3,Math.max(0,Math.floor(frame/Math.max(1,total)*4)));}
    function choose(phase,index) {
        const order=PHASES[phase].waves;
        return PATTERNS.find(p=>p.id===order[index%order.length]);
    }
    function nextBirdAfter(frame) {return BIRD_FRAMES.find(f=>f>frame+120)??Infinity;}
    function planGolden(random=Math.random) {
        const events=[],variant=()=>{const r=random();return r<.4?'RAPIDS':r<.8?'ARC':'SKY';};
        if(random()<.65)events.push({frame:1920+Math.floor(random()*181),variant:variant(),entry:random()<.5?'LEFT':'RIGHT'});
        if(random()<.90)events.push({frame:3060+Math.floor(random()*181),variant:variant(),entry:random()<.5?'LEFT':'RIGHT'});
        return events;
    }
    function recordSpawn(pacing,target,phase) {
        const p=pacing.phases[phase];p.spawns++;
        if(target.carrier==='BIRD')p.birds++;
        if(target.isGolden)p.golden++;
        else if(target.isExplosive)p.explosives++;
        else if(target.carrier!=='BIRD')p.normal++;
        p.speeds[target.speedTier]=(p.speeds[target.speedTier]||0)+1;
    }
    function sample(pacing,phase,targets,remaining) {
        const p=pacing.phases[phase],active=targets.filter(t=>t.active&&!t.hit).length;
        p.activeSamples++;p.activeTotal+=active;p.maxActive=Math.max(p.maxActive,active);
        if(remaining>0&&remaining<=300){const second=Math.ceil(remaining/60);
            if(pacing.countdown.at(-1)!==second)pacing.countdown.push(second);}
    }
    function drawCountdown(ctx,frame,total) {
        const remaining=total-frame;
        if(remaining<=0||remaining>300)return;
        const pulse=1-(frame%60)/60,x=window.ArcheryField.WIDTH/2;
        ctx.save();ctx.globalAlpha=.45+pulse*.45;ctx.strokeStyle=remaining<=120?'#ffb18d':'#ffe3a2';
        ctx.lineWidth=1;ctx.strokeRect(x-56.5,2.5,113,29);ctx.restore();
    }
    window.ArcheryMatchPacing=Object.freeze({PHASES,PATTERNS,BIRD_FRAMES,SETTLE_MIN,SETTLE_MAX,
        create,phaseAt,choose,nextBirdAfter,planGolden,recordSpawn,sample,drawCountdown});
})();
