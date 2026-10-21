(function () {
    'use strict';
    // The order, spacing and paths of every wave are authored. Randomness is
    // reserved for the rare golden opportunity, never for arbitrary positions.
    const PHASES=Object.freeze([
        {name:'INTRODUCAO',color:'#9ff3b0',capacity:3,riverCapacity:2,interval:210,
            waves:['OPENING_CURRENT','EASY_ARC']},
        {name:'CRUZAMENTOS',color:'#74e6ff',capacity:4,riverCapacity:4,interval:175,
            waves:['JOINING_STREAMS','EXPLOSIVE_CONFLUENCE','GENTLE_WAVES']},
        {name:'COMPETICAO',color:'#ffcf70',capacity:6,riverCapacity:5,interval:150,
            waves:['COMBINED_CURRENTS','EXPLOSIVE_CONFLUENCE','FAST_CROSSING','ARC_AND_ELLIPSE']},
        {name:'CLIMAX',color:'#ff9d78',capacity:8,riverCapacity:7,interval:125,
            waves:['EXPLOSIVE_CHAIN_CURRENT','FINAL_SWEEP','FAST_CROSSING','FINAL_COMBO']}
    ].map(p=>Object.freeze({...p,waves:Object.freeze(p.waves)})));
    const PATTERNS=Object.freeze([
        {id:'OPENING_CURRENT',targets:[
            {delay:0,kind:'NORMAL_LARGE',path:'STRAIGHT',speed:'SLOW',entry:'TOP',exit:'LEFT'},
            {delay:90,kind:'NORMAL_LARGE',path:'DIAGONAL',speed:'SLOW',entry:'RIGHT'}]},
        {id:'EASY_ARC',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'ARC',speed:'SLOW',entry:'LEFT'},
            {delay:96,kind:'NORMAL_LARGE',path:'CURVE',speed:'MEDIUM',entry:'TOP',exit:'RIGHT'}]},
        {id:'JOINING_STREAMS',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'DIAGONAL',speed:'MEDIUM',entry:'RIGHT'},
            {delay:78,kind:'NORMAL_MEDIUM',path:'CURVE',speed:'MEDIUM',entry:'TOP',exit:'LEFT'},
            {delay:146,kind:'NORMAL_LARGE',path:'ARC',speed:'MEDIUM',entry:'LEFT'}]},
        {id:'GENTLE_WAVES',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'WAVE',speed:'MEDIUM',entry:'LEFT'},
            {delay:80,kind:'NORMAL_MEDIUM',path:'S_CURVE',speed:'MEDIUM',entry:'TOP',exit:'RIGHT'}]},
        {id:'EXPLOSIVE_CONFLUENCE',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT'},
            {delay:66,kind:'EXPLOSIVE',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT'},
            {delay:132,kind:'NORMAL_SMALL',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT'}]},
        {id:'COMBINED_CURRENTS',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'S_CURVE',speed:'MEDIUM',entry:'LEFT'},
            {delay:52,kind:'NORMAL_SMALL',path:'DIAGONAL',speed:'FAST',entry:'TOP',exit:'RIGHT'},
            {delay:104,kind:'NORMAL_MEDIUM',path:'ARC',speed:'FAST',entry:'RIGHT'}]},
        {id:'FAST_CROSSING',targets:[
            {delay:0,kind:'NORMAL_SMALL',path:'DIAGONAL',speed:'FAST',entry:'LEFT'},
            {delay:54,kind:'NORMAL_MEDIUM',path:'CURVE',speed:'FAST',entry:'RIGHT'},
            {delay:112,kind:'NORMAL_SMALL',path:'WAVE',speed:'FAST',entry:'TOP',exit:'LEFT'}]},
        {id:'ARC_AND_ELLIPSE',targets:[
            {delay:0,kind:'NORMAL_SMALL',path:'ELLIPSE',speed:'FAST',entry:'TOP',exit:'LEFT'},
            {delay:74,kind:'NORMAL_MEDIUM',path:'ARC',speed:'FAST',entry:'LEFT'}]},
        {id:'EXPLOSIVE_CHAIN_CURRENT',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'ARC',speed:'MEDIUM',entry:'LEFT'},
            {delay:24,kind:'NORMAL_MEDIUM',path:'ARC',speed:'MEDIUM',entry:'RIGHT'},
            {delay:66,kind:'EXPLOSIVE',path:'ARC',speed:'MEDIUM',entry:'LEFT'},
            {delay:90,kind:'EXPLOSIVE',path:'ARC',speed:'MEDIUM',entry:'RIGHT'},
            {delay:132,kind:'NORMAL_SMALL',path:'ARC',speed:'MEDIUM',entry:'LEFT'},
            {delay:156,kind:'NORMAL_SMALL',path:'ARC',speed:'MEDIUM',entry:'RIGHT'}]},
        {id:'FINAL_SWEEP',targets:[
            {delay:0,kind:'NORMAL_MEDIUM',path:'ELLIPSE',speed:'FAST',entry:'TOP',exit:'RIGHT'},
            {delay:40,kind:'NORMAL_SMALL',path:'DIAGONAL',speed:'FAST',entry:'RIGHT'},
            {delay:80,kind:'EXPLOSIVE',path:'DIAGONAL',speed:'FAST',entry:'RIGHT'},
            {delay:146,kind:'NORMAL_MEDIUM',path:'DIAGONAL',speed:'FAST',entry:'RIGHT'}]},
        {id:'FINAL_COMBO',targets:[
            {delay:0,kind:'NORMAL_SMALL',path:'WAVE',speed:'FAST',entry:'LEFT'},
            {delay:48,kind:'NORMAL_MEDIUM',path:'S_CURVE',speed:'MEDIUM',entry:'RIGHT'},
            {delay:96,kind:'EXPLOSIVE',path:'S_CURVE',speed:'MEDIUM',entry:'RIGHT'},
            {delay:162,kind:'NORMAL_MEDIUM',path:'S_CURVE',speed:'MEDIUM',entry:'RIGHT'}]}
    ].map(p=>Object.freeze({...p,targets:Object.freeze(p.targets.map(Object.freeze))})));
    const BIRD_FRAMES=Object.freeze([9,18,25,32,39,46,52,57].map(s=>s*60));
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
        const second=Math.ceil(remaining/60),pulse=1-(frame%60)/60;
        ctx.save();ctx.textAlign='center';ctx.font=`bold ${Math.round(15+pulse*3)}px monospace`;
        ctx.fillStyle='rgba(14,41,39,.78)';ctx.fillRect(211,36,28,24);
        ctx.fillStyle=second<=2?'#ffba8c':'#fff0b3';ctx.fillText(String(second),225,54);ctx.restore();
    }
    window.ArcheryMatchPacing=Object.freeze({PHASES,PATTERNS,BIRD_FRAMES,SETTLE_MIN,SETTLE_MAX,
        create,phaseAt,choose,nextBirdAfter,planGolden,recordSpawn,sample,drawCountdown});
})();
