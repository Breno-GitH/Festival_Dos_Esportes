/* Final Canvas: somente apresentação. Nunca concede, remove ou regrava medalhas. */
(function (global) {
    'use strict';
    const clamp = n => Math.max(0,Math.min(1,n));
    const ease = n => {n=clamp(n);return n*n*(3-2*n);};
    const mix = (a,b,p) => a+(b-a)*p;
    const sceneBeat = .55;
    const shots = [
        ['BOARDING',3.6],['TAKEOFF',5.7],['DEPARTURE',4.2],
        ['SPACE',5.2],['HOME_APPROACH',10.8],['HOME_FADE',2.7]
    ].map(([id,duration])=>({id,duration}));
    const total = shots.reduce((s,a)=>s+a.duration+sceneBeat,0);
    const ending = {
        active:false, elapsed:0, state:'INACTIVE', localTime:0, lastTime:0, config:null,
        atlas:null, replay:false, frameCount:0, wallSeconds:0,
        shotIndex:0, sceneTime:0, line:0, waitingForText:false, dialogueDone:false,
        transitionFrame:null,
        stars:Array.from({length:150},(_,i)=>({x:(i*127.71)%450,y:(i*73.37)%300,z:.25+(i%7)/8})),
        init(config){this.config=config;},
        eligible(){return MedalCompletion.hasAllMedals()&&AdventureIntro.allMedalsComplete&&AdventureIntro.homeCallSeen&&AdventureIntro.mastersFarewellStarted&&AdventureIntro.mastersFarewellSeen;},
        start(){
            if(this.active||!this.eligible())return false;
            this.replay=AdventureIntro.endingSeen;this.config.clearInput();this.config.hideUI();
            this.atlas={HUB:this.config.captureIsland('HUB')};
            this.active=true;this.elapsed=0;this.state='BOARDING';this.localTime=0;
            this.shotIndex=0;this.sceneTime=0;this.line=0;this.waitingForText=false;this.dialogueDone=false;
            this.transitionFrame=document.createElement('canvas');this.transitionFrame.width=450;this.transitionFrame.height=300;
            this.captureTransition();
            this.frameCount=0;this.wallSeconds=0;this.lastTime=performance.now();
            this.config.enter();return true;
        },
        captureTransition(){
            // Copiar Canvas é permitido também em file://; nunca lê pixels dos PNGs.
            this.transitionFrame.getContext('2d').drawImage(document.getElementById('gameCanvas'),0,0,450,300);
        },
        update(){
            if(!this.active)return;
            if(this.state==='ENDING_CARD'){global.EndingCard.update();return;}
            const now=performance.now(),raw=(now-this.lastTime)/1000;this.lastTime=now;
            if(document.hidden)return;
            const dt=Math.max(0,Math.min(.1,raw));
            this.elapsed+=dt;this.wallSeconds+=Math.max(0,raw);this.frameCount++;
            this.sceneTime+=dt;this.localTime=Math.max(0,this.sceneTime-sceneBeat);
            if(this.localTime>=shots[this.shotIndex].duration){
                if(++this.shotIndex===shots.length){this.finish();return;}
                this.captureTransition();
                this.state=shots[this.shotIndex].id;this.sceneTime=0;this.localTime=0;
                this.line=0;this.dialogueDone=false;
            }
        },
        finish(){
            if(!this.active||this.state==='ENDING_CARD')return;
            AdventureIntro.endingSeen=true;AdventureIntro.persist();
            this.state='ENDING_CARD';this.atlas=null;this.transitionFrame=null;this.waitingForText=false;
            this.config.clearInput();
            global.EndingCard.show({
                id:'true_ending',
                onClose:()=>{this.active=false;this.state='COMPLETE';this.config.clearInput();this.config.returnToMenu();}
            });
        },
        handleKeyDown(e){
            if(!this.active)return false;
            if(e.ctrlKey||e.metaKey||e.altKey)return true;
            if(this.state==='ENDING_CARD')return global.EndingCard.handleKeyDown(e);
            if([' ','w','a','s','d','e','enter','escape','arrowup','arrowdown'].includes(e.key.toLowerCase()))e.preventDefault();
            return true;
        },
        gradient(ctx,top,bottom){const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,450,300);},
        glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);},
        flightTrail(ctx,x,y,size=1,angle=0){
            ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);
            const g=ctx.createLinearGradient(-120,0,-15,0);g.addColorStop(0,'rgba(103,226,235,0)');g.addColorStop(1,'rgba(150,244,232,.5)');
            ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-135,8);ctx.lineTo(-25,-1);ctx.lineTo(-25,15);ctx.closePath();ctx.fill();
            for(let i=0;i<10;i++){const p=(this.elapsed*1.5+i/10)%1;ctx.globalAlpha=(1-p)*.5;ctx.fillStyle='#d1fff1';ctx.fillRect(-30-p*110,6+Math.sin(i*7)*9,3,1);}
            ctx.restore();
        },
        drawStars(ctx,time=this.elapsed,speed=4){
            const alpha=ctx.globalAlpha;
            for(let i=0;i<this.stars.length;i++){const s=this.stars[i];ctx.globalAlpha=alpha*(.3+s.z*.65)*(.8+.2*Math.sin(time*.8+i));ctx.fillStyle=s.z>.8?'#b5f2e7':'#d5e0f1';
                const x=((s.x-time*speed*s.z)%450+450)%450;
                if(speed>15){ctx.fillRect(x,s.y,2+speed*s.z*.11,1);}else ctx.fillRect(x,s.y,s.z>.85?2:1,1);
                if(i%29===0&&speed<15){ctx.fillRect(x-2,s.y+.5,6,.6);ctx.fillRect(x+.5,s.y-2,.6,6);}
            }ctx.globalAlpha=alpha;
        },
        zorp(ctx,x,y,row=0,frame=0,size=1){
            const a=OVERWORLD_ZORP_WALK,col=a.sequences[row][frame%4],[sx,sy,w,h]=a.frames[row][col],s=a.scale*size;
            ctx.imageSmoothingEnabled=false;ctx.drawImage(this.config.zorp,sx,sy,w,h,x-(a.pivots[col]-sx)*s,y-h*s,w*s,h*s);
        },
        ship(ctx,x,y,size=1,door=0,air=false){
            // O facho vertical pertence à decolagem; no espaço fica somente o rastro.
            AdventureIntro.drawShip(ctx,x,y,size,door,air&&this.state==='TAKEOFF',!air);
        },
        thrust(ctx,x,y,size,t){
            ctx.save();ctx.translate(x,y);ctx.scale(size,size);
            const g=ctx.createLinearGradient(0,0,0,50);g.addColorStop(0,'rgba(127,255,225,.65)');g.addColorStop(1,'rgba(80,206,247,0)');
            ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-23,0);ctx.lineTo(23,0);ctx.lineTo(38,53);ctx.lineTo(-38,53);ctx.fill();
            // Quantidade fixa, sem criar objetos de partículas a cada frame.
            for(let i=0;i<28;i++){
                const p=(t*1.4+i/28)%1;ctx.globalAlpha=(1-p)*.8;ctx.fillStyle=i%3?'#91ebdc':'#f7d58c';
                ctx.fillRect(Math.sin(i*7.3)*mix(12,38,p),p*55,2,2);
            }ctx.restore();
        },
        earthActors(ctx,wave=false){
            for(const n of this.config.npcs.filter(n=>n.scene==='HUB'))this.config.drawNPC(n);
            for(let i=0;i<MastersFarewell.masters.length;i++){
                const m=MastersFarewell.masters[i];ctx.save();
                if(wave){ctx.translate(m.x,m.y);ctx.rotate(Math.sin(this.elapsed*3+i)*.018);ctx.translate(-m.x,-m.y);}
                this.config.drawNPC({...m.npc,x:m.x,y:m.y});ctx.restore();
            }
        },
        earth(ctx){
            const t=this.localTime,air=this.state==='TAKEOFF';
            this.gradient(ctx,'#11344e','#216078');
            const zoom=air?mix(1,.88,ease((t-1.4)/3.4)):1;
            ctx.save();ctx.translate(225,150);ctx.scale(zoom,zoom);ctx.translate(-225,-150);
            ctx.drawImage(this.atlas.HUB,0,0);this.earthActors(ctx,air);
            if(!air){
                const door=t<.5?mix(.3,1,ease(t/.5)):1-ease((t-2.1)/1.1);
                this.glow(ctx,225,168,35,'rgba(125,246,222,'+(.18*door)+')');
                this.ship(ctx,225,150,1,door);
                if(t<2.25){ctx.save();ctx.globalAlpha=1-ease((t-1.55)/.65);this.zorp(ctx,225,mix(195,156,ease(t/2)),1,Math.floor(t*8)%4);ctx.restore();}
            }else{
                const lift=ease(t/2.5),acceleration=clamp((t-2.4)/2.8),y=150-32*lift-185*acceleration*acceleration;
                const light=(1-ease((t-4.1)/1.1))*(.12+.14*lift);
                this.glow(ctx,225,154,105,'rgba(119,242,218,'+light+')');
                ctx.fillStyle='rgba(4,23,37,'+(.3*(1-lift*.85))+')';ctx.beginPath();ctx.ellipse(225,155,42-25*lift,8-4*lift,0,0,Math.PI*2);ctx.fill();
                for(let i=0;i<3;i++){const p=(t*.65+i/3)%1;ctx.strokeStyle='rgba(170,239,213,'+((1-p)*light)+')';ctx.beginPath();ctx.ellipse(225,155,28+p*53,6+p*10,0,0,Math.PI*2);ctx.stroke();}
                for(let i=0;i<22;i++){const p=(t*.45+i/22)%1;ctx.fillStyle='rgba(240,222,159,'+((1-p)*light*1.6)+')';ctx.fillRect(225+Math.sin(i*7.3)*(22+p*50),156+Math.cos(i*2.4)*p*13,2,1);}
                this.thrust(ctx,225,y,1,t);this.ship(ctx,225,y,1,0,true);
            }
            ctx.restore();
        },
        spaceBackdrop(ctx,speed=4){
            this.gradient(ctx,'#030818','#16172f');
            this.glow(ctx,345,78,220,'rgba(87,64,146,.18)');
            this.glow(ctx,92,235,175,'rgba(31,116,133,.13)');
            this.drawStars(ctx,this.elapsed,speed);
        },
        departure(ctx){
            this.spaceBackdrop(ctx,5);
            this.glow(ctx,75,278,215,'rgba(56,151,226,.22)');
            AdventureIntro.earth(ctx,75,314,190);
            const p=ease(this.localTime/3.8),x=mix(142,389,p),y=mix(166,55,p),size=mix(.65,.11,p);
            this.flightTrail(ctx,x,y,size,-.35);
            ctx.save();ctx.translate(x,y);ctx.rotate(-.17);this.ship(ctx,0,0,size,0,true);ctx.restore();
        },
        trophy(ctx,x,y,size=1){
            ctx.save();ctx.translate(x,y);ctx.scale(size,size);
            const g=ctx.createLinearGradient(-15,0,15,0);g.addColorStop(0,'#9d682b');g.addColorStop(.45,'#ffe7a1');g.addColorStop(1,'#c08b39');ctx.fillStyle=g;ctx.strokeStyle='#f9d582';ctx.lineWidth=3;
            for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*14,-30,8,12,0,0,Math.PI*2);ctx.stroke();}
            ctx.beginPath();ctx.moveTo(-16,-47);ctx.lineTo(16,-47);ctx.lineTo(11,-24);ctx.quadraticCurveTo(0,-12,-11,-24);ctx.closePath();ctx.fill();
            ctx.fillRect(-3,-22,6,17);ctx.fillRect(-13,-5,26,5);ctx.restore();
        },
        homePlanet(ctx,r){
            const x=306,y=145;
            // Distritos e estádios permanecem na esfera; a câmera nunca vai à superfície.
            this.glow(ctx,x,y,r*1.55,'rgba(91,192,207,.2)');
            this.glow(ctx,x-r*.5,y-r*.7,r*.76,'rgba(167,133,219,.15)');
            ctx.strokeStyle='rgba(162,148,216,.35)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,r*1.35,r*.35,-.29,0,Math.PI*2);ctx.stroke();
            ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
            const g=ctx.createLinearGradient(x-r,y-r,x+r,y+r);
            g.addColorStop(0,'#70c5c3');g.addColorStop(.35,'#3b7d94');g.addColorStop(.7,'#35426e');g.addColorStop(1,'#10182e');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
            ctx.save();ctx.translate(x,y);ctx.scale(r/114,r/114);
            for(let i=0;i<20;i++){
                const a=i*2.399,rad=22+(i*29)%83,px=Math.cos(a)*rad,py=Math.sin(a)*rad*.85;
                ctx.fillStyle=i%2?'rgba(20,52,78,.63)':'rgba(49,49,98,.55)';
                ctx.beginPath();ctx.moveTo(px-13,py-9);ctx.lineTo(px+8,py-15);ctx.lineTo(px+22,py);ctx.lineTo(px+9,py+14);ctx.lineTo(px-14,py+7);ctx.closePath();ctx.fill();
                ctx.strokeStyle=i%3?'rgba(129,233,216,.55)':'rgba(247,206,126,.65)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(px-13,py+8);ctx.lineTo(px+8,py+8);ctx.lineTo(px+20,py);ctx.stroke();
                for(let j=0;j<4;j++){ctx.fillStyle=(i+j)%3?'#9aead7':'#eed59b';ctx.fillRect(px-8+j*6,py-3+(j%2)*4,1.5,1);}
            }
            ctx.strokeStyle='rgba(168,231,231,.14)';ctx.lineWidth=.7;
            for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(0,i*31,114,16+Math.abs(i)*4,0,0,Math.PI*2);ctx.stroke();}
            for(const [px,py]of [[-37,-23],[36,34],[-4,76]]){
                ctx.fillStyle='#173b51';ctx.strokeStyle='#edce91';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(px,py,22,10,-.24,0,Math.PI*2);ctx.fill();ctx.stroke();
                ctx.strokeStyle='#85e4d5';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(px,py,16,6,-.24,0,Math.PI*2);ctx.stroke();
                ctx.beginPath();ctx.moveTo(px-7,py+2);ctx.lineTo(px+7,py-2);ctx.moveTo(px,py-4);ctx.lineTo(px,py+4);ctx.stroke();
            }
            this.trophy(ctx,27,-20,.48);ctx.restore();
            const shade=ctx.createLinearGradient(x-r,y-r,x+r,y+r);shade.addColorStop(0,'rgba(2,6,21,0)');shade.addColorStop(.55,'rgba(2,6,21,.04)');shade.addColorStop(1,'rgba(2,6,21,.78)');ctx.fillStyle=shade;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
            ctx.strokeStyle='rgba(174,247,229,.85)';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(x,y,r,-2.9,-.55);ctx.stroke();
            ctx.strokeStyle='rgba(134,210,226,.25)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r+3,-2.9,-.55);ctx.stroke();
            ctx.strokeStyle='#d8bf8d';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(x,y,r*1.35,r*.35,-.29,0,Math.PI);ctx.stroke();
            for(let i=0;i<9;i++){
                const a=i*.32+.15,rx=r*1.35*Math.cos(a),ry=r*.35*Math.sin(a),px=x+rx*Math.cos(-.29)-ry*Math.sin(-.29),py=y+rx*Math.sin(-.29)+ry*Math.cos(-.29);
                ctx.fillStyle=i%3?'#a4ecd8':'#f2d296';ctx.beginPath();ctx.arc(px,py,1.3,0,Math.PI*2);ctx.fill();
            }
        },
        homeFlight(){
            const q=this.state==='HOME_FADE'?1:clamp(this.localTime/8.7),p=ease(q),r=mix(103,114,p);
            return {progress:q,planetRadius:r,x:mix(133,306-.79*r,p),y:mix(191,145+.3*r,p)-13*Math.sin(p*Math.PI),
                size:.012+.568*Math.pow(1-p,1.25),opacity:1-ease((q-.74)/.22)};
        },
        travel(ctx){
            const p=ease(this.localTime/5.2);
            this.spaceBackdrop(ctx,mix(15,4,p));this.homePlanet(ctx,mix(48,103,p));
            const x=mix(62,133,p),y=mix(200,191,p),size=mix(.84,.58,p);
            this.flightTrail(ctx,x,y,size,-.1);
            ctx.save();ctx.translate(x,y);ctx.rotate(-.08);this.ship(ctx,0,0,size,0,true);ctx.restore();
        },
        homeApproach(ctx){
            const f=this.homeFlight();
            this.spaceBackdrop(ctx,2);this.homePlanet(ctx,f.planetRadius);
            const entry=clamp((f.progress-.66)/.34);
            this.glow(ctx,306-.79*f.planetRadius,145+.3*f.planetRadius,26,'rgba(177,244,228,'+(Math.sin(entry*Math.PI)*.24)+')');
            if(f.opacity>.001){
                ctx.save();ctx.globalAlpha=f.opacity;this.flightTrail(ctx,f.x,f.y,f.size,-.08);
                ctx.translate(f.x,f.y);ctx.rotate(-.08);this.ship(ctx,0,0,f.size,0,true);ctx.restore();
            }
        },
        draw(ctx){
            if(!this.active)return;
            if(this.state==='ENDING_CARD'){global.EndingCard.draw(ctx);return;}
            ctx.save();ctx.clearRect(0,0,450,300);ctx.imageSmoothingEnabled=false;
            if(this.state==='BOARDING'||this.state==='TAKEOFF')this.earth(ctx);
            else if(this.state==='DEPARTURE')this.departure(ctx);
            else if(this.state==='SPACE')this.travel(ctx);
            else this.homeApproach(ctx);
            const vignette=ctx.createRadialGradient(225,145,105,225,145,275);vignette.addColorStop(0,'rgba(2,6,20,0)');vignette.addColorStop(1,'rgba(2,6,20,.35)');ctx.fillStyle=vignette;ctx.fillRect(0,0,450,300);
            if(this.transitionFrame&&this.sceneTime<sceneBeat){
                ctx.save();ctx.globalAlpha=1-ease(this.sceneTime/sceneBeat);ctx.drawImage(this.transitionFrame,0,0);ctx.restore();
            }
            if(this.state==='HOME_FADE'){ctx.fillStyle='rgba(3,7,19,'+ease((this.localTime-.25)/1.9)+')';ctx.fillRect(0,0,450,300);}
            ctx.fillStyle='#030713';ctx.fillRect(0,0,450,12);ctx.fillRect(0,288,450,12);ctx.restore();
        },
        snapshot(){return {active:this.active,state:this.state,elapsed:this.elapsed,localTime:this.localTime,totalDuration:total,replay:this.replay,
            sceneBeat,sceneIndex:this.shotIndex,sceneCount:shots.length,waitingForText:this.waitingForText,dialogueLine:this.line,
            message:null,flight:['HOME_APPROACH','HOME_FADE'].includes(this.state)?this.homeFlight():null,
            averageFps:this.wallSeconds?this.frameCount/this.wallSeconds:0,endingSeen:AdventureIntro.endingSeen};}
    };
    global.EndingCinematic=ending;
})(window);
