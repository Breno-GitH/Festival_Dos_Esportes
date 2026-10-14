(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(root)root.SkateJourney=api;
})(typeof globalThis==='object'?globalThis:this,function(){
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const smooth=x=>x*x*(3-2*x);
    const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
    const css=c=>`rgb(${c.join(',')})`;
    const STOPS=Object.freeze([
        {at:0, name:'morning',top:[112,175,213],horizon:[247,218,173],far:[125,150,157],mid:[87,116,127],near:[64,91,105],neon:.12},
        {at:.32,name:'afternoon',top:[81,153,205],horizon:[248,188,129],far:[111,124,153],mid:[70,94,119],near:[51,75,92],neon:.22},
        {at:.64,name:'sunset',top:[65,44,99],horizon:[235,120,92],far:[69,62,96],mid:[42,49,77],near:[31,45,60],neon:.65},
        {at:.86,name:'night',top:[8,14,33],horizon:[36,54,72],far:[20,32,50],mid:[27,44,58],near:[32,52,63],neon:1}
    ]);
    function lighting(progress){
        const p=clamp(progress,0,1);
        let a=STOPS[0],b=STOPS[1];
        for(let i=1;i<STOPS.length;i++){a=STOPS[i-1];b=STOPS[i];if(p<=b.at)break;}
        const t=smooth(clamp((p-a.at)/(b.at-a.at),0,1));
        return {progress:p,period:p<.25?'morning':p<.5?'afternoon':p<.75?'sunset':'night',
            top:css(mix(a.top,b.top,t)),horizon:css(mix(a.horizon,b.horizon,t)),
            far:css(mix(a.far,b.far,t)),mid:css(mix(a.mid,b.mid,t)),near:css(mix(a.near,b.near,t)),
            neon:a.neon+(b.neon-a.neon)*t};
    }
    function riderFeedback({slope=0,grinding=false,contact=1,clock=0,landingAge=1,impact=0}){
        const tangent=clamp(Math.atan(slope),-.48,.48);
        const effort=grinding?clamp(-slope,0,.6):0;
        // Rotation around board contact never changes physical position or collider.
        const balance=grinding?Math.sin(clock*10)*.012*contact:0;
        const compression=landingAge<.22?Math.sin(Math.PI*landingAge/.22)*clamp(impact/1000,.045,.12):0;
        return {angle:tangent*(grinding?.88:.78)*contact+balance,
            lean:grinding?clamp(-slope*.12,-.045,.055)+Math.sin(clock*7)*.012:clamp(-slope*.06,-.03,.03),
            scaleY:1-compression-effort*.035,scaleX:1+compression*.35,
            sparks:grinding?3+Math.round(effort*5):0,trail:grinding?clamp(1+slope*.7,.8,1.6):1};
    }
    const COLORS=['#65efff','#ff65c6','#ffcb63','#ba93ff','#82efad','#71a9ff'];
    const LIMIT=384;
    function createController(){
        // Fixed pool; no per-frame particle allocation, no gameplay RNG.
        const pool=Array.from({length:LIMIT},()=>({life:0}));
        let cursor=0,seed=7281,clock=0,nextLaunch=0,stage='quiet',stageAge=0;
        let previousLandings=0,previousTier='',previousVy=0,lastLanding=null,landingAge=1;
        let launched=0,bursts=0,activePeak=0,megaStarted=false,landedMega=false,finished=false,airHeld=false;
        let particleSum=0,fireworkSum=0,samples=0;
        const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        function particle(properties){
            for(let i=0;i<LIMIT;i++){
                const p=pool[cursor];cursor=(cursor+1)%LIMIT;
                if(p.life<=0){Object.assign(p,properties);return p;}
            }
            return null;
        }
        function burst(x,y,count=32,color=COLORS[Math.floor(random()*COLORS.length)]){
            bursts++;
            for(let i=0;i<count;i++){
                const angle=Math.PI*2*i/count+random()*.1,speed=.045+random()*.06;
                particle({kind:'spark',x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
                    life:1.15+random()*.8,maxLife:2,color,group:bursts});
            }
        }
        function launch(){
            launched++;
            particle({kind:'rocket',x:.48+random()*.40,y:.60,vy:-.24-random()*.06,vx:0,
                life:1.05+random()*.3,maxLife:1.4,color:COLORS[launched%COLORS.length],group:-launched});
        }
        function reset(){
            pool.forEach(p=>p.life=0);cursor=0;seed=7281;clock=0;nextLaunch=0;stage='quiet';stageAge=0;
            previousLandings=0;previousTier='';previousVy=0;lastLanding=null;landingAge=1;
            launched=0;bursts=0;activePeak=0;megaStarted=false;landedMega=false;finished=false;airHeld=false;
            particleSum=0;fireworkSum=0;samples=0;
        }
        function observe(state,held){
            const p=state.player;
            airHeld=held===true;
            if(state.phase==='FAILED'){stage='failed';return;}
            if(p.specialRampAir?.active&&held&&!megaStarted){megaStarted=true;stage='air';stageAge=0;nextLaunch=0;}
            if(p.landings>previousLandings){
                lastLanding={x:p.x,y:p.y,impact:Math.abs(previousVy),strong:['super','ramp','mega-air','special-ramp'].includes(previousTier)};
                landingAge=0;
                if(p.specialRampAir?.landed&&megaStarted&&!landedMega){
                    landedMega=true;stage='landing';stageAge=0;nextLaunch=0;
                    burst(.48,.26,56,COLORS[0]);burst(.70,.20,40,COLORS[1]);
                }
            }
            if(state.phase==='COMPLETED'&&!finished){
                finished=true;stage='finish';stageAge=0;nextLaunch=0;
                for(let i=0;i<4;i++)burst(.18+i*.21,.18+(i%2)*.12,48,COLORS[i]);
            }
            previousLandings=p.landings;
            previousTier=p.jumpTier||(state.lastEvent==='RAMP_TAKEOFF'?'ramp':'');
            previousVy=p.verticalVelocity;
        }
        function update(dt){
            dt=clamp(dt,0,.05);clock+=dt;stageAge+=dt;landingAge+=dt;
            if(stage==='quiet')return;
            const emitting=['air','landing','finish'].includes(stage)&&(stage!=='air'||airHeld)&&(stage!=='finish'||stageAge<4);
            if(emitting){
                nextLaunch-=dt;
                if(nextLaunch<=0){launch();nextLaunch=stage==='air'?.8:stage==='landing'?.48:.26;}
            }
            let active=0;
            for(const p of pool){
                if(p.life<=0)continue;
                p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
                if(p.kind==='spark')p.vy+=.055*dt;
                if(p.life<=0&&p.kind==='rocket'&&stage!=='failed')burst(p.x,p.y,32,p.color);
                else if(p.life>0)active++;
            }
            const groups=new Set();active=0;
            for(const p of pool)if(p.life>0){active++;groups.add(p.group);}
            activePeak=Math.max(activePeak,active);
            if(emitting){particleSum+=active;fireworkSum+=groups.size;samples++;}
        }
        function drawFireworks(ctx,width,height,rider=null){
            // Screen-space skyline layer: camera follows the course, never the fireworks.
            ctx.save();ctx.lineWidth=1.2;
            for(const p of pool){
                if(p.life<=0)continue;
                if(rider&&Math.hypot(p.x*width-rider.x,p.y*height-rider.y)<24)continue;
                ctx.globalAlpha=clamp(p.life/.5,0,.72);
                ctx.strokeStyle=p.color;ctx.beginPath();
                ctx.moveTo(p.x*width,p.y*height);
                ctx.lineTo((p.x-p.vx*.06)*width,(p.y-p.vy*.06)*height+ (p.kind==='rocket'?5:0));ctx.stroke();
            }
            ctx.restore();
        }
        function drawLanding(ctx){
            if(!lastLanding||!lastLanding.strong||landingAge>.35)return;
            const t=landingAge/.35;
            ctx.save();ctx.strokeStyle='#c4d8d9';ctx.lineWidth=1.4;ctx.globalAlpha=(1-t)*.7;
            for(let i=0;i<8;i++){
                const sign=i%2?1:-1,x=lastLanding.x+sign*(4+t*(12+i*3)),y=lastLanding.y-Math.sin(t*Math.PI)*(3+i%3*3);
                ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sign*3,y+1);ctx.stroke();
            }
            ctx.restore();
        }
        function snapshot(){let particles=0;for(const p of pool)if(p.life>0)particles++;
            return {stage,stageAge,megaStarted,landedMega,finished,clock,landingAge,lastLanding,
            particles,particleLimit:LIMIT,averageParticles:samples?particleSum/samples:0,
            averageFireworks:samples?fireworkSum/samples:0,activePeak,launched,bursts};}
        return {reset,observe,update,drawFireworks,drawLanding,snapshot};
    }
    return Object.freeze({lighting,riderFeedback,createController,PARTICLE_LIMIT:LIMIT,STOPS});
});
