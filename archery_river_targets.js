(function () {
    'use strict';
    const WIDTH = 450, SOURCE_LIP = 118;
    const PATHS = Object.freeze(['STRAIGHT','DIAGONAL','CURVE','S_CURVE','WAVE','ARC','ELLIPSE']);
    const SPEEDS = Object.freeze({SLOW:0.58, MEDIUM:0.90, FAST:1.30}); // world pixels per 60 Hz step
    const speedBonus = Object.freeze({SLOW:0,MEDIUM:3,FAST:7});
    const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
    let context = null, mix = null, limiter = null, noise = null, peakVoices = 0;
    const activeVoices=new Set();
    let voiceStarts=0,voiceEnds=0,ignoredEndEvents=0;
    let lastSound = -Infinity, explosionSounds = 0;
    const MAX_VOICES=6, audioCounts={draw:0,release:0,impact:0,bullseye:0,explosion:0,combo:0};
    function unlockAudio() {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        try {
            if (!context || context.state==='closed') {
                context = new C();mix=context.createGain();mix.gain.value=.65;
                limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;
                limiter.knee.value=15;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;
                mix.connect(limiter);limiter.connect(context.destination);
                noise=context.createBuffer(1,Math.ceil(context.sampleRate*.12),context.sampleRate);
                const samples=noise.getChannelData(0);let state=19321;
                for(let n=0;n<samples.length;n++){state=(Math.imul(state,1664525)+1013904223)>>>0;samples[n]=state/4294967296*2-1;}
            }
            if (context.state === 'suspended') context.resume().catch(()=>{});
        } catch (_) { /* Audio is optional when unavailable in the browser. */ }
    }
    function registerVoice(node,cleanup) {
        activeVoices.add(node);voiceStarts++;peakVoices=Math.max(peakVoices,activeVoices.size);
        // Keep ownership of each source instead of subtracting from a counter.
        // Cleanup is idempotent even if an end notification is delivered twice.
        node.onended=()=>{
            if(!activeVoices.delete(node)){ignoredEndEvents++;return;}
            voiceEnds++;node.onended=null;cleanup();
        };
    }
    function tone(kind,frequency,end,duration,volume=.025,delay=0,type='triangle',steps=null) {
        if(!context||context.state!=='running'||activeVoices.size>=MAX_VOICES)return false;
        const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
        registerVoice(o,()=>{o.disconnect();g.disconnect();});audioCounts[kind]++;
        o.type=type;o.frequency.setValueAtTime(frequency,t);
        if(steps)steps.forEach((f,i)=>o.frequency.setValueAtTime(f,t+i*.055));
        else o.frequency.exponentialRampToValueAtTime(end,t+duration*.8);
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.004);
        g.gain.exponentialRampToValueAtTime(.0001,t+duration);
        o.connect(g);g.connect(mix);o.start(t);o.stop(t+duration+.01);
        return true;
    }
    function bowSound(owner) {
        const pitch=owner==='MESTRE'?.90:1;
        return tone('draw',145*pitch,280*pitch,.085,.015);
    }
    function releaseSound(owner) {
        const pitch=owner==='MESTRE'?.90:1;
        const played=tone('release',480*pitch,110*pitch,.065,.028);
        if(!context||context.state!=='running'||activeVoices.size>=MAX_VOICES||!noise)return played;
        const t=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain();
        registerVoice(source,()=>{source.disconnect();filter.disconnect();g.disconnect();});source.buffer=noise;
        filter.type='bandpass';filter.frequency.setValueAtTime(3100*pitch,t);
        filter.frequency.exponentialRampToValueAtTime(1300*pitch,t+.08);filter.Q.value=.7;
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.022,t+.008);
        g.gain.exponentialRampToValueAtTime(.0001,t+.10);
        source.connect(filter);filter.connect(g);g.connect(mix);source.start(t);source.stop(t+.11);
        return played;
    }
    function sound(bullseye) {
        if (!context || context.state !== 'running' || context.currentTime-lastSound<.035) return;
        lastSound=context.currentTime;
        tone('impact',230,85,.085,.032);
        if(bullseye)tone('bullseye',740,1110,.14,.020,.018,'sine',[740,1110,1480]);
    }
    function explosionSound(depth=0) {
        if(!context||context.state!=='running'||activeVoices.size>=4)return;
        const pitch=1+Math.min(depth,5)*.20;
        if(tone('explosion',180*pitch,48*pitch,.17,.032,Math.min(depth*.045,.18),'sawtooth'))explosionSounds++;
    }
    function comboSound(count) {
        if(count<2)return;
        const base=620+Math.min(count,8)*45;
        tone('combo',base,base,.21,.019,0,'sine',[base,base*1.25,base*1.5,base*(count>=4?2:1.5)]);
    }

    function hermite(y0,y1,m0,m1,t) {
        const t2=t*t,t3=t2*t;
        return (2*t3-3*t2+1)*y0+(t3-2*t2+t)*m0+(-2*t3+3*t2)*y1+(t3-t2)*m1;
    }
    function makeRoute(entry, exit, kind, radius) {
        const margin=radius*1.3+20, right=exit==='RIGHT', mirror=right?1:-1;
        let points;
        if (entry==='TOP') {
            // The raft is initially hidden behind the waterfall's foam lip.
            points=[[225,82],[225,122],[221,145],[201,161],[182,178],[149,191],[92,201],[-margin,205]];
            if(right)points=points.map(([x,y])=>[WIDTH-x,y]);
        } else {
            points=[[-margin,141],[65,141],[130,143],[182,151],[222,166],[269,183],[334,198],[WIDTH+margin,205]];
            if(entry==='RIGHT')points=points.map(([x,y])=>[WIDTH-x,y]);
        }
        const slopes=points.map((p,i)=>{
            if(i===0)return points[1][1]-p[1];
            if(i===points.length-1)return p[1]-points[i-1][1];
            const a=p[1]-points[i-1][1],b=points[i+1][1]-p[1];
            return a*b<=0?0:2*a*b/(a+b);
        });
        const samples=[];let length=0,previous=null;
        for(let n=0;n<=640;n++) {
            const u=n/640,segment=Math.min(points.length-2,Math.floor(u*(points.length-1)));
            const t=u*(points.length-1)-segment;
            const p0=points[Math.max(0,segment-1)],p1=points[segment],p2=points[segment+1],p3=points[Math.min(points.length-1,segment+2)];
            let x=hermite(p1[0],p2[0],(p2[0]-p0[0])*.5,(p3[0]-p1[0])*.5,t);
            let y=hermite(p1[1],p2[1],slopes[segment],slopes[segment+1],t);
            const envelope=Math.sin(Math.PI*u)**2;
            if(kind==='DIAGONAL')x+=mirror*(u-.5)*14*envelope;
            if(kind==='CURVE')x+=mirror*Math.sin(Math.PI*u)*7*envelope;
            if(kind==='S_CURVE')x+=Math.sin(Math.PI*u*2)*8*envelope;
            if(kind==='WAVE')x+=Math.sin(Math.PI*u*3)*5*envelope;
            if(kind==='ARC')x+=mirror*Math.sin(Math.PI*u)*12*envelope;
            if(kind==='ELLIPSE'){x+=Math.sin(Math.PI*u*2)*6*envelope;y+=(1-Math.cos(Math.PI*u*2))*1.1*envelope;}
            if(previous)length+=Math.hypot(x-previous.x,y-previous.y);
            const point={x,y,d:length};samples.push(point);previous=point;
        }
        return {samples,length,entry,exit:entry==='TOP'?exit:(entry==='LEFT'?'RIGHT':'LEFT'),kind,margin};
    }
    function at(route, progress) {
        const distance=clamp(progress,0,1)*route.length,a=route.samples;
        let lo=0,hi=a.length-1;
        while(hi-lo>1){const mid=(lo+hi)>>1;if(a[mid].d<distance)lo=mid;else hi=mid;}
        const t=(distance-a[lo].d)/Math.max(.000001,a[hi].d-a[lo].d);
        return {x:a[lo].x+(a[hi].x-a[lo].x)*t,waterY:a[lo].y+(a[hi].y-a[lo].y)*t};
    }
    function position(target, progress) {
        const p=at(target.route,progress);
        return {x:p.x,y:p.waterY-target.radius-3,waterY:p.waterY};
    }
    function updateVisibility(target) {
        const extent=target.radius*1.3+12;
        target.visible=target.x+extent>0&&target.x-extent<WIDTH
            &&(target.entry!=='TOP'||target.waterY+4>SOURCE_LIP);
        const faceVisible=target.x+target.radius>0&&target.x-target.radius<WIDTH
            &&(target.entry!=='TOP'||target.y+target.radius>SOURCE_LIP);
        target.active=!target.hit&&faceVisible;
        const partial=target.x<target.radius||target.x>WIDTH-target.radius;
        target.flowState=target.progress<.5&&(partial||(target.entry==='TOP'&&target.y-target.radius<SOURCE_LIP))?'ENTERING'
            :(target.progress>.92||partial?'EXITING':'DRIFTING');
        target.state=target.hit?(target.hitAge<18?'HIT_REACTION':'SPENT'):target.flowState;
    }
    function create(spec, descriptor) {
        const entry=['TOP','LEFT','RIGHT'].includes(descriptor.entry)?descriptor.entry:'TOP';
        const exit=descriptor.exit==='LEFT'?'LEFT':'RIGHT';
        const path=PATHS.includes(descriptor.path)?descriptor.path:'STRAIGHT';
        const tier=SPEEDS[descriptor.speed]?descriptor.speed:'MEDIUM';
        const route=makeRoute(entry,exit,path,spec.radius);
        const target={carrier:'RIVER',route,pathType:path,entry,entryPoint:entry,exitPoint:route.exit,
            radius:spec.radius,basePoints:spec.basePoints+(spec.golden?0:speedBonus[tier]),speedTier:spec.golden?'GOLD':tier,speed:spec.travelSpeed||SPEEDS[tier],
            sizeTier:spec.sizeTier,isGolden:spec.golden,goldenVariant:descriptor.goldenVariant||null,isExplosive:!!spec.explosive,detonated:false,pathLength:route.length,margin:route.margin,
            progress:0,age:0,hit:false,hitBy:null,hitAge:0,hitOffsetX:0,hitOffsetY:0,speedX:0,speedY:0,qaStatic:!!descriptor.qaStatic};
        const p=position(target,0);Object.assign(target,p,{previousX:p.x,previousY:p.y});
        if(target.qaStatic){target.x=descriptor.x??225;target.y=descriptor.y??145;target.waterY=target.y+target.radius+3;target.previousX=target.x;target.previousY=target.y;}
        updateVisibility(target);return target;
    }
    function step(target) {
        target.age++;if(target.hit)target.hitAge++;
        target.previousX=target.x;target.previousY=target.y;
        if(!target.qaStatic){target.progress=Math.min(1,target.progress+target.speed/target.route.length);Object.assign(target,position(target,target.progress));}
        target.speedX=target.x-target.previousX;target.speedY=target.y-target.previousY;
        updateVisibility(target);
        // Retire only after the entire drawing (raft + wake) has left the viewport.
        return !target.qaStatic&&target.progress>=1&&!target.visible;
    }

    function sweep(arrow,target) {
        if(!target.active||target.hit)return null;
        // Relative segment against the moving circular face. The arrow is its tip,
        // not a generous rectangle around the shaft, stand or floating support.
        const ax=arrow.previousX-target.previousX,ay=arrow.previousY-target.previousY;
        const vx=(arrow.x-arrow.previousX)-(target.x-target.previousX);
        const vy=(arrow.y-arrow.previousY)-(target.y-target.previousY);
        const rr=target.radius*target.radius,A=vx*vx+vy*vy;
        if(A<1e-12)return null;
        const B=2*(ax*vx+ay*vy),C=ax*ax+ay*ay-rr,D=B*B-4*A*C;
        if(D<0)return null;
        let enter=Math.max(0,(-B-Math.sqrt(D))/(2*A)),leave=Math.min(1,(-B+Math.sqrt(D))/(2*A));
        if(enter>leave)return null;
        // Hidden pieces of a source-portal target must never absorb an arrow.
        const xAt=t=>arrow.previousX+(arrow.x-arrow.previousX)*t;
        const yAt=t=>arrow.previousY+(arrow.y-arrow.previousY)*t;
        const centerAt=t=>({x:target.previousX+(target.x-target.previousX)*t,y:target.previousY+(target.y-target.previousY)*t});
        const center=centerAt(enter);
        const ux=vx/Math.sqrt(A),uy=vy/Math.sqrt(A);
        const signed=ax*uy-ay*ux;
        let offsetX=signed*uy,offsetY=-signed*ux;
        if(xAt(enter)<0||xAt(enter)>WIDTH)return null;
        if(target.entry==='TOP'&&yAt(enter)<SOURCE_LIP)return null;
        if(target.entry==='TOP')offsetY=Math.max(offsetY,SOURCE_LIP-center.y);
        const distance=Math.hypot(offsetX,offsetY);
        return {t:enter,x:xAt(enter),y:yAt(enter),distance,center,offsetX,offsetY};
    }
    function markHit(target,owner,impact) {
        target.hit=true;target.hitBy=owner;target.hitAge=0;target.active=false;target.state='HIT_REACTION';
        target.hitOffsetX=impact?impact.offsetX:0;target.hitOffsetY=impact?impact.offsetY:0;
    }
    function draw(ctx,target) {
        if(!target.visible)return;
        const r=target.radius,x=target.x,y=target.y,w=target.waterY;
        ctx.save();ctx.imageSmoothingEnabled=false;
        if(target.entry==='TOP'){ctx.beginPath();ctx.rect(0,SOURCE_LIP,WIDTH,96);ctx.clip();}
        ctx.lineWidth=1;ctx.strokeStyle='rgba(187,231,220,.50)';
        ctx.beginPath();ctx.ellipse(x,w+2,r*1.25,3,0,0,Math.PI);ctx.stroke();
        ctx.fillStyle='rgba(17,72,76,.35)';ctx.beginPath();ctx.ellipse(x,w+1,r*1.18,4,0,0,Math.PI*2);ctx.fill();
        // Three short lashed logs float at the actual water contact point.
        for(let n=0;n<3;n++){
            ctx.fillStyle=n%2?'#8b673a':'#aa8450';ctx.fillRect(x-r*1.08,w-3+n*2,r*2.16,2);
            ctx.fillStyle='#d1ab68';ctx.fillRect(x-r*1.08,w-3+n*2,r*2.16,1);
        }
        ctx.fillStyle='#574f35';ctx.fillRect(x-r*.68,w-4,2,8);ctx.fillRect(x+r*.60,w-4,2,8);
        ctx.fillStyle='#725532';ctx.fillRect(x-2,y+r-2,4,w-y-r+4);
        // A detonated disk is gone; its empty raft still follows the river exit.
        if(target.isExplosive&&target.hit){ctx.restore();return;}
        const angle=target.hit&&target.hitAge<18?Math.sin(target.hitAge*1.1)*(1-target.hitAge/18)*.13:0;
        const fall=target.hit?Math.min(1,target.hitAge/18):0;
        // A claimed disk tips onto its raft instead of filling the river with
        // upright spent faces. It remains visibly present until the exit.
        ctx.translate(x,y+r*.72*fall);ctx.rotate(angle);ctx.scale(1,1-.72*fall);
        if(target.isGolden){window.ArcheryGoldenTargets.drawFace(ctx,target,0,0);ctx.restore();return;}
        ctx.fillStyle='#513f2c';ctx.beginPath();ctx.arc(0,0,r+2,0,Math.PI*2);ctx.fill();
        for(const [ratio,color,spent]of [[1,'#efe8cd','#a0a39b'],[.70,'#397fba','#68828b'],[.35,'#d65042','#99786a']]){
            ctx.fillStyle=target.hit?spent:color;ctx.beginPath();ctx.arc(0,0,r*ratio,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle=target.hit?'#c5b891':'#f0c450';ctx.beginPath();ctx.arc(0,0,r*.12,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(40,57,48,.55)';ctx.lineWidth=.6;
        ctx.beginPath();ctx.arc(0,0,r*.70,0,Math.PI*2);ctx.moveTo(r*.35,0);ctx.arc(0,0,r*.35,0,Math.PI*2);ctx.stroke();
        if(target.hit){ctx.strokeStyle='#ece7d3';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(target.hitOffsetX,target.hitOffsetY);ctx.lineTo(target.hitOffsetX-r*.4,target.hitOffsetY+r*.6);ctx.stroke();}
        if(target.hit&&target.hitAge<7){ctx.globalAlpha=(7-target.hitAge)/12;ctx.fillStyle='#fffbd9';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();}
        ctx.restore();
    }
    function drawArrow(ctx,assets,arrow) {
        const entry=assets&&assets.frame('arrow','arrow_up','UP',0),image=assets&&assets.drawable(entry);
        if(!image)return;
        ctx.save();ctx.translate(arrow.x,arrow.y);ctx.rotate(Math.atan2(arrow.speedX,-arrow.speedY));ctx.imageSmoothingEnabled=false;
        if(arrow.owner==='PLAYER'){
            // Fixed velocity makes this short tail coincide with the actual path.
            // It is cosmetic; collision still uses only the arrow tip.
            ctx.strokeStyle='rgba(143,232,245,.40)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(0,29);ctx.lineTo(0,37);ctx.stroke();
            ctx.strokeStyle='rgba(202,246,247,.20)';ctx.beginPath();ctx.moveTo(0,40);ctx.lineTo(0,44);ctx.stroke();
        }
        // Measured alpha tip of arrow_up frame 1: [79,9] on its 160px canvas.
        const s=38/160;ctx.drawImage(image,-79*s,-9*s,38,38);
        if(arrow.owner==='PLAYER'){ctx.fillStyle='#c6faff';ctx.fillRect(0,8,1,5);}
        if(arrow.owner==='MESTRE'){ctx.fillStyle='#df7966';ctx.fillRect(-1,24,3,1);ctx.fillRect(-1,27,3,1);}
        ctx.restore();
    }
    function drawImpact(ctx,effect) {
        const p=1-effect.timer/effect.duration,age=effect.duration-effect.timer;
        if(effect.effectKind==='COMBO'){
            const count=Math.min(effect.count||2,2+Math.floor(age/6));
            const bump=1-(age%6)/6;
            ctx.save();ctx.globalAlpha=Math.min(1,effect.timer/10);ctx.textAlign='center';
            ctx.font=`bold ${Math.round(8+Math.min(count,6)*.35+bump)}px monospace`;
            const label=(effect.owner==='MESTRE'?'MESTRE ':'')+(count>=6?'SUPER ':'')+'COMBO x'+count;
            const half=ctx.measureText(label).width/2,x=clamp(effect.x,half+4,WIDTH-half-4),y=Math.max(64,effect.y-p*8);
            ctx.strokeStyle='#203c34';ctx.lineWidth=3;ctx.strokeText(label,x,y);
            ctx.fillStyle=count>=4?'#ffd18a':'#fff0b5';ctx.fillText(label,x,y);
            ctx.font='bold 7px monospace';ctx.fillStyle='#eff3cf';ctx.fillText('+'+effect.bonus,x,y+10);
            if(age<22){ctx.strokeStyle='#f7d897';ctx.globalAlpha=(1-age/22)*.6;ctx.lineWidth=1;
                for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*(half+3),y-5);ctx.lineTo(x+side*(half+6+bump*3),y-7);ctx.stroke();}}
            ctx.restore();return;
        }
        ctx.save();ctx.globalAlpha=Math.min(1,effect.timer/8);ctx.strokeStyle=effect.bullseye?'#ffe897':'#edf2d4';ctx.lineWidth=1;
        if(effect.bullseye&&age<14){
            const fade=1-age/14,r=3+age*.65;
            ctx.globalAlpha=fade*.85;ctx.beginPath();ctx.arc(effect.x,effect.y,r,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#fff5c1';ctx.fillRect(effect.x-1,effect.y-4,2,8);ctx.fillRect(effect.x-4,effect.y-1,8,2);
            ctx.globalAlpha=Math.min(1,effect.timer/8);
        }
        for(let n=0;n<5;n++) {const a=n*Math.PI*2/5,inner=3+p*6,outer=inner+3*(1-p);
            ctx.beginPath();ctx.moveTo(effect.x+Math.cos(a)*inner,effect.y+Math.sin(a)*inner);ctx.lineTo(effect.x+Math.cos(a)*outer,effect.y+Math.sin(a)*outer);ctx.stroke();}
        ctx.font='bold 8px monospace';ctx.textAlign='center';
        const half=ctx.measureText(effect.label).width/2,textX=clamp(effect.x,half+4,WIDTH-half-4);
        ctx.strokeStyle='rgba(20,44,36,.85)';ctx.lineWidth=2;ctx.strokeText(effect.label,textX,effect.y-16-p*10);
        ctx.fillStyle=effect.color;ctx.fillText(effect.label,textX,effect.y-16-p*10);ctx.restore();
    }
    window.ArcheryRiverTargets=Object.freeze({PATHS,SPEEDS,speedBonus,create,position,step,sweep,markHit,draw,drawArrow,drawImpact,
        unlockAudio,bowSound,releaseSound,sound,explosionSound,comboSound,
        diagnostics:()=>({paths:PATHS,speeds:SPEEDS,sourceLip:SOURCE_LIP,audio:context?context.state:'LOCKED',
            voices:activeVoices.size,voiceStarts,voiceEnds,ignoredEndEvents,peakVoices,maxVoices:MAX_VOICES,
            audioCounts:{...audioCounts},mixGain:mix?mix.gain.value:0,
            limiter:!!limiter,explosionSounds,geometry:'MOVING_CIRCLE_VS_ARROW_TIP'})});
})();
