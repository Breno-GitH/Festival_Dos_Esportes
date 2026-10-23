/* Entirely procedural spectators; visual-only and independent of match RNG. */
(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(root)root.BasketballCrowd=api;
})(typeof globalThis==='object'?globalThis:this,function(){
    'use strict';
    const BAND_TOP=95,BAND_BOTTOM=186,TAU=Math.PI*2;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const presets={
        RIM:[.34,.85],STEAL:[.52,1.35],BLOCK:[.68,1.6],
        BASKET:[.60,1.65],THREE:[.82,2.1],SWOOSH:[.96,2.25],
        COMEBACK:[1.02,2.6],CLUTCH:[1.08,2.7],VICTORY:[1.15,4.8]
    };
    function randomGenerator(seed){
        let n=seed>>>0;
        return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};
    }
    // The old audience is BAKED INTO the arena image. Only sample the ceiling /
    // architecture above it and the barrier / court below it. No crowd pixels
    // from that PNG are rendered, nor is there a PNG fallback for spectators.
    function drawArchitecture(ctx,image,width=450,height=300){
        const sw=image.naturalWidth,sh=image.naturalHeight,top=Math.round(height*BAND_TOP/300),bottom=Math.round(height*BAND_BOTTOM/300);
        ctx.save();ctx.imageSmoothingEnabled=false;
        // Exclude the old scoreboard baked into the upper centre as well.
        const left=Math.round(width*.3),right=Math.round(width*.7),panelBottom=Math.round(height*78/300);
        ctx.drawImage(image,0,0,sw*.3,sh*BAND_TOP/300,0,0,left,top);
        ctx.drawImage(image,sw*.7,0,sw*.3,sh*BAND_TOP/300,right,0,width-right,top);
        ctx.drawImage(image,sw*.3,sh*78/300,sw*.4,sh*(BAND_TOP-78)/300,left,panelBottom,right-left,top-panelBottom);
        ctx.fillStyle='#151632';ctx.fillRect(left,0,right-left,panelBottom);
        ctx.fillStyle='#242044';
        for(let y=7;y<panelBottom;y+=12)ctx.fillRect(left,y,right-left,1);
        ctx.fillStyle='#302651';ctx.fillRect(left,3,right-left,3);
        ctx.drawImage(image,0,sh*BAND_BOTTOM/300,sw,sh*(300-BAND_BOTTOM)/300,0,bottom,width,height-bottom);
        ctx.restore();
    }
    class Crowd{
        constructor(seed=0x51a7c0){
            const random=randomGenerator(seed),pick=a=>a[Math.floor(random()*a.length)];
            this.people=[];
            const humanSkin=['#e3b18e','#c98e65','#aa7253','#80543f','#604135'];
            const humanShade=['#b78269','#975e48','#794b39','#593b32','#3f2e2d'];
            const alienSkin=['#9acb69','#65b9bf','#c994b4','#b7a2db','#77a17c','#83b9db'];
            const alienShade=['#4e754c','#367783','#865881','#706094','#45665d','#4b7198'];
            const clothes=['#35b7d8','#df9651','#9d68c5','#6b98d1','#a8ad67','#c76483'];
            const species=Array.from({length:66},(_,i)=>i<30?'HUMAN':'ALIEN');
            for(let i=species.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[species[i],species[j]]=[species[j],species[i]];}
            for(let row=0;row<3;row++)for(let half=0;half<2;half++)for(let col=0;col<11;col++){
                const kind=species[this.people.length],skin=kind==='HUMAN'?humanSkin:alienSkin,skinShade=kind==='HUMAN'?humanShade:alienShade;
                const tone=Math.floor(random()*skin.length),affiliation=random()<.24?'neutral':random()<.75?(half?'master':'zorp'):(half?'zorp':'master');
                const seatX=(half?257:12)+col*18+(row===1?3:0),head=5+row;
                const shape=pick(['ROUND','TALL','WIDE']);
                this.people.push({row,seatX,x:seatX+Math.floor(random()*3)-1,
                    footY:[123,150,179][row]+Math.floor(random()*3)-1,
                    height:16+row*3+Math.floor(random()*3),head,
                    body:skin[tone],shade:skinShade[tone],hair:pick(['#31243e','#493455','#62443d','#b68255']),
                    shirt:random()<.62?(affiliation==='zorp'?'#36b7d0':affiliation==='master'?'#de9558':pick(clothes)):pick(clothes),
                    species:kind,headShape:kind==='ALIEN'?shape:'ROUND',
                    hairStyle:pick(['CROP','BOB','CURLY','PONYTAIL','BALD']),
                    accessory:kind==='HUMAN'?pick(['NONE','NONE','NONE','CAP','HEADBAND']):'NONE',
                    antennae:kind==='ALIEN'?1+Math.floor(random()*2):0,
                    eyes:kind==='ALIEN'?pick(['NARROW','LARGE','WIDE']):'HUMAN',
                    outfit:pick(['JERSEY','STRIPES','VEST','COLLAR']),build:Math.floor(random()*2),
                    standThreshold:.35+random()*.5,restStanding:random()<.23,lookDirection:random()<.5?-1:1,
                    metrics:{headWidth:head+(kind==='ALIEN'&&shape==='WIDE'?1:0),headHeight:head+(kind==='ALIEN'&&shape==='TALL'?1:0)},
                    motion:{},affiliation,phase:random()*TAU,
                    period:3.4+random()*4.6,delay:.035+random()*.31,
                    enthusiasm:.8+random()*.3,style:Math.floor(random()*3)});
            }
            // Geometry is assembled once, not during animation frames.
            this.standGeometry=[];
            const add=(color,x,y,w,h)=>this.standGeometry.push({color,x,y,w,h});
            add('#14142f',0,BAND_TOP,450,BAND_BOTTOM-BAND_TOP);add('#23204b',0,96,450,10);
            for(let row=0;row<3;row++){
                const y=[106,133,161][row];
                for(const x of [0,243]){
                    add(['#2a2454','#302657','#382a60'][row],x,y,207,25);
                    add('#514071',x,y+15,207,2);add('#171b3d',x,y+21,207,4);
                }
                for(let x=6;x<450;x+=18){if(x>204&&x<242)continue;add(row===0?'#403360':'#4c386b',x,y+10,12,9);}
                for(const x of [0,243])add('#423956',x,[124,151,180][row],207,2);
            }
            add('#1b203e',209,96,32,90);
            for(let y=104;y<186;y+=12){add('#393865',210,y,30,8);add('#626090',210,y,30,1);add('#6c97b0',218,y+1,15,1);}
            add('#11172f',0,183,450,3);
            this.reset();
        }
        reset(){
            for(const person of this.people)for(const key of Object.keys(person.motion))delete person.motion[key];
            this.time=0;this.tension=0;this.urgency=0;this.events=[];this.confetti=[];
            this.lastReaction=null;this.counts={};this.lastRim=-10;this.rimStreak=0;
        }
        react(type,side='neutral',details={}){
            let kind=type;
            if(type==='BASKET')kind=details.late?'CLUTCH':details.comeback?'COMEBACK':details.swoosh?'SWOOSH':details.points===3?'THREE':'BASKET';
            const preset=presets[kind];if(!preset)return false;
            if(kind==='RIM'&&this.time-this.lastRim<.35)return false;
            if(kind==='RIM'){this.rimStreak=this.time-this.lastRim<1.3?Math.min(4,this.rimStreak+1):1;this.lastRim=this.time;}
            const event={kind,side,at:this.time,power:preset[0],duration:preset[1],...details};
            if(kind==='RIM')event.power+=Math.max(0,this.rimStreak-1)*.06;
            this.events.push(event);if(this.events.length>8)this.events.shift();
            this.lastReaction={kind,side,at:this.time,...details};
            this.counts[kind]=(this.counts[kind]||0)+1;
            if(kind==='VICTORY'){
                // Fixed, bounded celebration, clipped to the stands.
                this.confetti=Array.from({length:28},(_,i)=>({
                    x:8+(i*73)%434,y:96+(i*11)%38,vx:Math.sin(i*2.1)*8,
                    vy:7+(i%5)*2,phase:i*1.7,at:this.time,
                    color:['#57dcec','#f5cf79','#b389e9','#9ad68b'][i%4]}));
            }
            return true;
        }
        update(seconds,match={}){
            if(!Number.isFinite(seconds)||seconds<=0)return;
            this.time+=seconds;
            const close=match.phase==='PLAYING'&&match.clock<=10&&Math.abs((match.score?.zorp??0)-(match.score?.master??0))<=3;
            const goal=close?.5+.5*(1-clamp(match.clock/10,0,1)):0;
            this.tension+=(goal-this.tension)*(1-Math.exp(-seconds*3));
            const late=match.phase==='PLAYING'&&match.clock<=10?.25+.5*(1-clamp(match.clock/10,0,1)):0;
            this.urgency+=(late-this.urgency)*(1-Math.exp(-seconds*3));
            this.events=this.events.filter(e=>this.time-e.at<e.duration+.4);
            if(this.confetti.length&&this.time-this.confetti[0].at>4.8)this.confetti=[];
        }
        poseFor(person){
            let power=0,kind='IDLE';
            for(const e of this.events){
                const age=this.time-e.at-person.delay;
                if(age<=0||age>=e.duration)continue;
                const envelope=Math.min(1,age/.14)*Math.min(1,(e.duration-age)/.7);
                const impressive=['THREE','SWOOSH','COMEBACK','CLUTCH','BLOCK','VICTORY'].includes(e.kind)||e.swoosh||e.points===3;
                const favor=e.side==='neutral'?.7:person.affiliation==='neutral'?(impressive?.92:e.kind==='RIM'?.65:.3):e.side===person.affiliation?1:.22;
                const energy=e.power*envelope*favor*person.enthusiasm;
                if(energy>power){power=energy;kind=e.kind;}
            }
            const cycle=(this.time/person.period+person.phase/TAU)%1;
            const sway=Math.round(Math.sin(this.time*1.1+person.phase)*.7);
            let pose=cycle<.04?'WAVE':cycle>.34&&cycle<.40?'LOOK':cycle>.72&&cycle<.77?'CLAP':cycle>.91&&cycle<.93?'HOP':'IDLE';
            if(this.tension>.2&&Math.sin(this.time*5+person.phase)>.2)pose='CLAP';
            if(power>.65)pose=person.style===1?'CLAP':'CHEER';
            else if(power>.3)pose=person.style===2?'WAVE':'CLAP';
            if(kind==='RIM'&&power>.18)pose='LEAN';
            let bounce=power>.62?Math.round(Math.max(0,Math.sin(this.time*(6+person.style)+person.phase))*(power>.9?4:2))
                :this.tension>.25?Math.round(Math.max(0,Math.sin(this.time*4+person.phase))*this.tension):0;
            if(pose==='HOP')bounce=1;
            return Object.assign(person.motion,{pose,sway,bounce,power,kind,
                standing:person.restStanding||power>.55||Math.max(this.tension,this.urgency)>person.standThreshold,
                look:pose==='LOOK'?person.lookDirection:pose==='LEAN'?1:0});
        }
        drawStands(ctx){
            for(const r of this.standGeometry){ctx.fillStyle=r.color;ctx.fillRect(r.x,r.y,r.w,r.h);}
        }
        drawPerson(ctx,p,m){
            const x=clamp(p.x+m.sway,p.seatX-1,p.seatX+1),y=p.footY-m.bounce,h=p.height-(m.standing?0:2),head=p.metrics.headWidth,headH=p.metrics.headHeight;
            const lean=m.pose==='LEAN'?(p.x<225?1:-1):0;
            const left=x-Math.floor(head/2)+lean,top=y-h,bodyY=top+headH+1,bodyWidth=p.head+2+p.build;
            const rect=(color,rx,ry,w,h)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(rx),Math.round(ry),w,h);};
            // Shared integer-pixel poses, dark outlines and feet anchored on a seat.
            rect('#11192e',p.x-5,p.footY+1,10,1);
            rect('#171b32',left,top-1,head,headH+2);rect('#171b32',left-1,top+1,head+2,headH-1);
            rect(p.shade,left,top,head,headH);rect(p.body,left,top,head-1,headH-1);
            if(p.species==='HUMAN'){
                if(p.hairStyle!=='BALD')rect(p.hair,left-1,top-2,head+1,p.hairStyle==='CURLY'?4:3);
                if(p.hairStyle==='BOB'){rect(p.hair,left-1,top,2,headH-1);rect(p.hair,left+head-1,top,1,headH);}
                if(p.hairStyle==='PONYTAIL')rect(p.hair,left+head,top+1,2,4);
                if(p.hairStyle==='CROP')rect(p.hair,left-1,top,1,2);
                if(p.hairStyle==='CURLY'){rect(p.hair,left-1,top-3,2,2);rect(p.hair,left+head-3,top-3,2,2);}
                if(p.accessory==='CAP'){rect(p.shirt,left-1,top-3,head+1,3);rect(p.shade,left+head-1,top-1,3,1);}
                if(p.accessory==='HEADBAND')rect('#d1ac91',left,top+1,head,1);
            }else{
                for(let a=0;a<p.antennae;a++){
                    const ax=p.antennae===1?x:left+a*(head-1);
                    rect(p.shade,ax,top-3,1,3);rect(p.body,ax-1,top-4,2,2);
                }
                if(p.headShape==='ROUND')rect(p.shade,left+head-1,top+headH-2,1,1);
            }
            const blink=Math.sin(this.time*.8+p.phase)> .994;
            const eyeY=top+Math.floor(headH/2),eyeWidth=p.eyes==='LARGE'&&p.row>0?2:1;
            const look=m.look&&head>5?m.look:0;
            if(!blink){
                rect('#18243b',left+1+look,eyeY,eyeWidth,p.eyes==='LARGE'&&p.row>0?2:1);
                rect('#18243b',left+head-2+Math.min(0,look),eyeY,1,p.eyes==='NARROW'?1:eyeWidth);
            }
            if(p.row>0)rect(p.shade,x,top+head-2,2,1);
            rect('#171b32',left-2,bodyY,bodyWidth+2,y-bodyY-2);
            rect(p.shirt,left-1,bodyY+1,bodyWidth,y-bodyY-3);
            if(p.outfit==='STRIPES')rect(p.shade,left-1,bodyY+3,bodyWidth,1);
            else if(p.outfit==='VEST'){rect('#343049',left-1,bodyY+1,2,y-bodyY-3);rect('#343049',left+bodyWidth-3,bodyY+1,2,y-bodyY-3);}
            else if(p.outfit==='COLLAR')rect('#d2c4a0',x-1,bodyY+1,3,1);
            else rect('#d2c4a0',x,bodyY+2,1,p.row>0?3:2);
            rect('#22253f',x-3,y-3,2,3);rect('#22253f',x+1,y-3,2,3);
            // Arms use three shared poses with independent clapping cadence.
            const armY=bodyY+2;
            if(m.pose==='CHEER'||m.pose==='WAVE'){
                rect(p.shirt,left-3,armY-2,2,3);rect(p.body,left-4,top-1,2,head+3);
                if(m.pose==='CHEER'){
                    rect(p.shirt,left+head+1,armY-2,2,3);rect(p.body,left+head+2,top-1,2,head+3);
                }else{rect(p.shirt,left+head+1,armY,2,4);rect(p.shade,left+head+1,armY+4,2,2);}
            }else if(m.pose==='CLAP'){
                const open=Math.sin(this.time*11+p.phase)>0?2:0;
                rect(p.shirt,left-2,armY,2,4);rect(p.shirt,left+head,armY,2,4);
                rect(p.body,x-2-open,armY+2,2,2);rect(p.body,x+open,armY+2,2,2);
            }else{
                rect(p.shirt,left-2,armY,2,4);rect(p.shirt,left+head,armY,2,4);
                rect(p.shade,left-2,armY+4,2,2);rect(p.body,left+head,armY+4,2,2);
            }
        }
        draw(ctx){
            ctx.save();ctx.imageSmoothingEnabled=false;
            ctx.beginPath();ctx.rect(0,BAND_TOP,450,BAND_BOTTOM-BAND_TOP);ctx.clip();
            this.drawStands(ctx);
            for(let row=0;row<3;row++){
                for(const person of this.people)if(person.row===row)this.drawPerson(ctx,person,this.poseFor(person));
                // Low rails organize the layers without crossing the court.
                const y=[126,153,183][row];
                ctx.fillStyle='#514275';ctx.fillRect(0,y,207,1);ctx.fillRect(243,y,207,1);
                ctx.fillStyle='#292545';ctx.fillRect(0,y+1,207,1);ctx.fillRect(243,y+1,207,1);
            }
            for(const p of this.confetti){
                const age=this.time-p.at,x=p.x+p.vx*age+Math.sin(age*3+p.phase)*4,y=p.y+p.vy*age;
                ctx.fillStyle=p.color;ctx.fillRect(Math.round(x),Math.round(y),1+(Math.floor(age*6+p.phase)%2),2);
            }
            ctx.restore();
        }
        snapshot(){
            return {spectators:this.people.length,rows:3,time:this.time,tension:this.tension,
                humans:this.people.filter(p=>p.species==='HUMAN').length,aliens:this.people.filter(p=>p.species==='ALIEN').length,
                standing:this.people.filter(p=>this.poseFor(p).standing).length,urgency:this.urgency,rimStreak:this.rimStreak,
                state:this.events.length?this.events[this.events.length-1].kind:this.tension>.2?'TENSION':'IDLE',
                lastReaction:this.lastReaction,counts:{...this.counts},activeEvents:this.events.length,
                confetti:this.confetti.length,band:{top:BAND_TOP,bottom:BAND_BOTTOM}};
        }
    }
    return Object.freeze({Crowd,drawArchitecture,BAND_TOP,BAND_BOTTOM});
});
