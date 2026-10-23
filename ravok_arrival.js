/* Fourth-medal interlude. Presentation only; medals remain owned by the registry. */
(function(global){
    'use strict';
    const shots=Object.freeze([
        ['FADE_OUT',1],['SILENCE',.65],['SPACE',4.8],['FLYBY',3.2],['SKY',3],
        ['ARCHIPELAGO',3.5],['LANDING',4.6],['DOOR',1.8],['K7_EXIT',3],
        ['DIALOGUE',null],['WITHDRAW',2.2],['FADE_BACK',1.1]
    ].map(([id,duration])=>Object.freeze({id,duration})));
    const lines=Object.freeze([
        Object.freeze({speaker:'RAVOK',text:'Então é verdade...'}),
        Object.freeze({speaker:'K7',text:'QUATRO ASSINATURAS CONFIRMADAS.'}),
        Object.freeze({speaker:'RAVOK',text:'Vamos ver até onde ele consegue chegar.'})
    ]);
    const clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,p)=>a+(b-a)*p;
    const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
    const stars=Array.from({length:110},(_,i)=>({x:(i*137+21)%450,y:(i*83+19)%300,z:.3+(i%7)/10}));
    // Geographic connections match the Overworld: climbing is north of archery.
    const islands=Object.freeze([[225,162,'hub'],[225,95,'boxing'],[302,162,'pingpong'],
        [302,95,'surf'],[225,233,'skate'],[302,233,'basketball'],[145,233,'race'],
        [145,162,'archery'],[145,95,'climbing']]);
    let config=null,active=false,index=0,time=0,elapsed=0,line=0,lineTime=0,last=0;
    let readyScene=null,readySince=0,returnPoint=null,previousFrame=null,cleanIsland=null,landedIsland=null;
    let k7=null,archipelago=null,audio=null,voices=0,completedRuns=0,saveFailed=false;
    const held=new Set(),norm=k=>String(k).toLowerCase(),now=()=>performance.now();
    const phase=()=>active?shots[index].id:'INACTIVE';
    const pending=()=>global.RavokEvent.arrivalPending&&!global.RavokEvent.ravokArrivalSeen;
    function onAward(event){
        const d=event.detail;
        if(d?.persisted===true&&d.previousCount===3&&d.total===4)global.RavokEvent.queueArrival();
    }
    function sound(kind){
        if(!audio||audio.state!=='running'||voices>=3)return;
        const notes={flyby:[85,42,.65,.035],landing:[62,38,.28,.025],door:[190,280,.18,.012],scan:[720,940,.08,.008]};
        const [a,b,d,volume]=notes[kind],t=audio.currentTime,o=audio.createOscillator(),gain=audio.createGain();
        o.type=kind==='scan'?'sine':'triangle';o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);
        gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(gain);gain.connect(audio.destination);voices++;o.onended=()=>{voices--;o.disconnect();gain.disconnect();};o.start(t);o.stop(t+d+.02);
    }
    function unlockAudio(){
        try{const C=global.AudioContext||global.webkitAudioContext;if(!C)return;
            if(!audio)audio=new C();if(audio.state==='suspended')audio.resume().catch(()=>{});
        }catch(_){/* Sound is optional, never a progression dependency. */}
    }
    function enterShot(){
        time=0;
        if(phase()==='FLYBY')sound('flyby');
        if(phase()==='DOOR')sound('door');
        if(phase()==='K7_EXIT')sound('scan');
    }
    function start(scene){
        if(!config||active||!pending()||config.busy())return false;
        returnPoint=config.destination(scene);if(!returnPoint)return false;
        const frame=document.createElement('canvas');frame.width=450;frame.height=300;
        frame.getContext('2d').drawImage(config.canvas,0,0,450,300);
        // Capture while the pending event still suppresses its permanent ship and NPCs.
        cleanIsland=config.captureIsland(false);landedIsland=config.captureIsland(true);k7=config.k7Sprite();
        previousFrame=frame;index=0;elapsed=0;line=0;lineTime=0;last=now();active=true;saveFailed=false;
        readyScene=null;config.clearInput();config.enter();unlockAudio();enterShot();return true;
    }
    function tryStart(scene){
        if(!active&&pending()&&config&&!config.busy()&&config.isOverworld(scene))return start(scene);
        return active;
    }
    function finish(){
        // Called only after all timed shots and all three manually advanced lines.
        if(!global.RavokEvent.completeArrival()){saveFailed=true;return;}
        saveFailed=false;completedRuns++;
        active=false;config.clearInput();config.resume(returnPoint);readyScene=null;
        previousFrame=cleanIsland=landedIsland=k7=null;
    }
    function update(scene){
        if(!config)return false;
        if(!active){
            if(tryStart(scene))return true;
            if(pending()&&config.resultReady(scene)){
                if(readyScene!==scene){readyScene=scene;readySince=now();config.clearInput();}
                if(now()-readySince>=2400)return start(scene);
                return true; // Brief victory hold; its normal confirmation can end it early.
            }
            readyScene=null;return false;
        }
        const stamp=now(),dt=document.hidden?0:Math.max(0,Math.min(.1,(stamp-last)/1000));last=stamp;
        if(saveFailed)return true;
        time+=dt;elapsed+=dt;
        if(phase()==='DIALOGUE'){lineTime+=dt;return true;}
        if(phase()==='LANDING'&&time-dt<3.7&&time>=3.7)sound('landing');
        if(time>=shots[index].duration){
            if(index===shots.length-1)finish();
            else{index++;enterShot();}
        }
        return true;
    }
    function handleKeyDown(event,wasHeld){
        if(active){
            event.preventDefault?.();event.stopImmediatePropagation?.();
            if(saveFailed){
                if(norm(event.key)===' '&&!event.repeat&&!wasHeld&&!document.hidden)finish();
                return true;
            }
            if(phase()==='DIALOGUE'&&norm(event.key)===' '&&!event.repeat&&!wasHeld&&lineTime>=.45){
                lineTime=0;
                if(++line===lines.length){index++;enterShot();}else sound('scan');
            }
            return true;
        }
        if(pending()&&config&&config.resultReady(config.scene())){
            event.preventDefault?.();event.stopImmediatePropagation?.();
            if([' ','enter','escape'].includes(norm(event.key))&&!event.repeat&&!wasHeld&&readyScene===config.scene()&&now()-readySince>=700){
                unlockAudio();start(config.scene());
            }
            return true;
        }
        return false;
    }
    global.addEventListener('keydown',event=>{const key=norm(event.key),wasHeld=held.has(key);held.add(key);handleKeyDown(event,wasHeld);},true);
    global.addEventListener('keyup',event=>{held.delete(norm(event.key));if(active||pending()&&config?.resultReady(config.scene())){
        event.preventDefault?.();event.stopImmediatePropagation?.();}},true);
    global.addEventListener('blur',()=>held.clear());
    global.addEventListener('festival:medal-unlocked',onAward);
    function fill(g,color,x=0,y=0,w=450,h=300){g.fillStyle=color;g.fillRect(x,y,w,h);}
    function gradient(g,top,bottom){const p=g.createLinearGradient(0,0,0,300);p.addColorStop(0,top);p.addColorStop(1,bottom);g.fillStyle=p;g.fillRect(0,0,450,300);}
    function glow(g,x,y,r,color){const p=g.createRadialGradient(x,y,0,x,y,r);p.addColorStop(0,color);p.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=p;g.fillRect(x-r,y-r,r*2,r*2);}
    function polygon(g,points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
    function space(g){
        gradient(g,'#080f25','#1d203b');glow(g,110,74,170,'rgba(83,48,115,.17)');
        for(let i=0;i<stars.length;i++){
            const s=stars[i];g.globalAlpha=.35+s.z*.55;fill(g,i%5?'#ccd5e8':'#c493b8',Math.round(s.x-elapsed*s.z*.45+450)%450,s.y,s.z>.8?2:1,1);
        }g.globalAlpha=1;
        const x=346,y=212,r=120;glow(g,x-4,y-3,r+23,'rgba(87,176,215,.30)');
        g.save();g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.clip();
        const p=g.createLinearGradient(x-r,y-r,x+r,y+r);p.addColorStop(0,'#449db9');p.addColorStop(.55,'#256594');p.addColorStop(1,'#132a51');g.fillStyle=p;g.fillRect(x-r,y-r,r*2,r*2);
        polygon(g,[[242,161],[263,131],[288,139],[309,158],[301,177],[274,182],[268,203],[246,196]],'#598968');
        polygon(g,[[302,218],[324,203],[343,219],[344,247],[327,275],[311,261]],'#659474');
        polygon(g,[[367,127],[398,141],[422,166],[415,190],[389,179],[376,158]],'#577d69');
        g.strokeStyle='rgba(213,238,232,.32)';g.lineWidth=4;
        for(let i=0;i<5;i++){g.beginPath();g.ellipse(x-47+i*23,y-49+i*29,28+i*4,3,-.2,0,Math.PI);g.stroke();}
        const shadow=g.createLinearGradient(269,130,441,282);shadow.addColorStop(0,'rgba(5,12,30,0)');shadow.addColorStop(.7,'rgba(5,12,30,.23)');shadow.addColorStop(1,'rgba(5,12,30,.9)');g.fillStyle=shadow;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
    }
    function flight(g,x,y,scale,reentry=false){
        const r=global.RavokEvent;
        if(reentry){
            glow(g,x+scale*43,y+scale*28,scale*43,'rgba(238,100,68,.24)');
            polygon(g,[[x+scale*4,y+scale*31],[x-scale*62,y-scale*20],[x+scale*12,y+scale*46]],'rgba(218,96,98,.15)');
            for(let i=0;i<14;i++){const p=(time*.7+i/14)%1;fill(g,'rgba(247,163,111,'+(1-p)*.5+')',Math.round(x-p*scale*70),Math.round(y+scale*(27-p*35+(i%3))),2,1);}
        }
        glow(g,x+scale*47,y+scale*45,scale*25,'rgba(184,60,136,.35)');
        r.drawShip(g,x,y,scale,{airborne:true});
    }
    function clouds(g,t,alpha=1){
        g.save();g.globalAlpha=alpha;
        for(let i=0;i<10;i++){
            const x=(i*103+27)%510-30,y=((i*47+t*32)%370)-45;
            fill(g,i%2?'rgba(222,235,222,.55)':'rgba(244,241,220,.76)',Math.round(x),Math.round(y),58+(i%3)*13,10);
            fill(g,'rgba(244,241,225,.66)',Math.round(x+11),Math.round(y-7),35,9);
        }g.restore();
    }
    function mapSurface(){
        if(archipelago)return archipelago;
        archipelago=document.createElement('canvas');archipelago.width=450;archipelago.height=300;
        const g=archipelago.getContext('2d');g.imageSmoothingEnabled=false;
        gradient(g,'#276a8d','#3d9da4');
        g.strokeStyle='#92b29a';g.lineWidth=5;
        for(const [a,b]of [[0,1],[0,2],[0,4],[0,7],[2,3],[4,5],[4,6],[7,8]]){
            g.beginPath();g.moveTo(...islands[a].slice(0,2));g.lineTo(...islands[b].slice(0,2));g.stroke();
        }
        for(const [x,y,id]of islands){
            polygon(g,[[x-32,y-19],[x+17,y-23],[x+33,y-8],[x+29,y+21],[x-10,y+25],[x-35,y+10]],'#254c4d');
            polygon(g,[[x-29,y-18],[x+17,y-20],[x+30,y-7],[x+26,y+18],[x-10,y+22],[x-32,y+9]],'#b2bc8b');
            polygon(g,[[x-25,y-15],[x+16,y-17],[x+27,y-6],[x+23,y+15],[x-8,y+18],[x-28,y+7]],'#6e9668');
            if(id==='climbing'){
                polygon(g,[[x-24,y+10],[x-10,y-4],[x-4,y-26],[x+4,y-20],[x+9,y-10],[x+23,y+11]],'#5b7170');
                polygon(g,[[x-4,y-26],[x+4,y-20],[x+8,y-11],[x+1,y-14],[x-5,y-11]],'#e0e4d0');
            }else if(id==='archery'){
                fill(g,'#4e9b9c',x-4,y-13,7,26);fill(g,'#c9dfc4',x-3,y-15,5,7);
            }else if(id==='basketball'||id==='pingpong'){
                fill(g,id==='basketball'?'#ba8b65':'#3e7f7c',x-15,y-8,30,18);g.strokeStyle='#d9d5ac';g.lineWidth=1;g.strokeRect(x-14,y-7,28,16);
            }else{fill(g,'#c3ba8a',x-3,y-11,6,22);fill(g,'#c3ba8a',x-16,y-2,32,4);}
        }
        return archipelago;
    }
    function landscape(g,focus,zoom,marks=true,shake=0){
        // Match drawWater exactly when the camera reveals ocean beyond the map cache.
        fill(g,'#2b78e4');
        g.save();g.translate(225+shake,146-shake*.4);g.scale(zoom,zoom);g.translate(-focus[0],-focus[1]);
        g.drawImage(marks?landedIsland:cleanIsland,0,0);return ()=>g.restore();
    }
    function robot(g,x,y,scale=1){
        if(!k7)return;
        const s=44/k7.geometry.visibleHeight*scale,a=k7.geometry.anchor;
        g.save();g.imageSmoothingEnabled=false;g.drawImage(k7.surface,x-a[0]*s,y-a[1]*s,k7.surface.width*s,k7.surface.height*s);g.restore();
    }
    function scan(g,strength=1){
        g.save();g.globalAlpha=.13*strength;
        polygon(g,[[396,89],[416,101],[403,112]],'#8fd5c5');
        g.globalAlpha=.35*strength;fill(g,'#b7d7ba',388,115,18,1);g.restore();
    }
    function groundScene(g,door=1,occupant=false,zoom=2,robotVisible=true){
        const done=landscape(g,[369,92],zoom,true);
        global.RavokEvent.drawShip(g,321,40,1,{door,occupant});
        if(robotVisible){fill(g,'rgba(20,38,35,.22)',388,110,17,5);robot(g,396,113);scan(g,.65+.25*Math.sin(time*2));}
        done();
    }
    function dialogue(g){
        const item=lines[line];fill(g,'rgba(9,19,32,.94)',24,220,402,62);fill(g,item.speaker==='K7'?'#9ad3c3':'#c7799b',24,220,3,62);
        g.textAlign='left';g.font='bold 9px monospace';g.fillStyle=item.speaker==='K7'?'#add8c6':'#d89bb6';g.fillText(item.speaker,37,235);
        g.font='10px monospace';g.fillStyle='#e7e5cd';
        const words=item.text.split(' '),rows=[];let row='';
        for(const word of words){const next=row?row+' '+word:word;if(g.measureText(next).width>372){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);
        rows.forEach((text,i)=>g.fillText(text,37,251+i*12));
        g.font='7px monospace';g.textAlign='right';g.fillStyle='#9ab3b1';g.fillText('[ESPAÇO] CONTINUAR',414,275);
    }
    function draw(g){
        if(!active)return;
        const id=phase(),p=shots[index].duration?clamp(time/shots[index].duration):0;
        g.save();g.imageSmoothingEnabled=false;
        if(id==='FADE_OUT'){
            g.drawImage(previousFrame,0,0);fill(g,'rgba(3,7,16,'+ease(p)+')');
        }else if(id==='SILENCE'){fill(g,'#030710');}
        else if(id==='SPACE'){
            space(g);const q=ease(p);flight(g,mix(56,244,q),mix(51,129,q),mix(.025,.83,q));
            if(time<.5)fill(g,'rgba(3,7,16,'+(1-time/.5)+')');
        }else if(id==='FLYBY'){
            space(g);const s=p<.6?mix(.83,3.3,ease(p/.6)):mix(3.3,1.5,ease((p-.6)/.4));
            const cx=p<.6?mix(283,270,ease(p/.6)):mix(270,565,ease((p-.6)/.4));
            const cy=p<.6?mix(151,174,ease(p/.6)):mix(174,292,ease((p-.6)/.4));
            flight(g,cx-s*47,cy-s*26,s,true);
            if(p>.83)fill(g,'rgba(131,166,174,'+((p-.83)/.17*.8)+')');
        }else if(id==='SKY'){
            gradient(g,'#36587c','#afd0b2');g.save();g.globalAlpha=ease((p-.25)/.65);g.drawImage(mapSurface(),0,75-p*55,450,300);g.restore();clouds(g,time,1-p*.5);
            flight(g,306-p*34,47+p*36,.42,false);
        }else if(id==='ARCHIPELAGO'){
            g.drawImage(mapSurface(),0,0);clouds(g,elapsed,.22);const q=ease(p);
            flight(g,mix(278,132,q),mix(83,68,q),mix(.42,.26,q));
            fill(g,'rgba(10,31,44,.7)',142,26,168,17);g.fillStyle='#e0dbb9';g.font='8px monospace';g.textAlign='center';g.fillText('ILHA DOS CAMPEÕES',226,37);
            if(p>.82)fill(g,'rgba(6,16,26,'+((p-.82)/.18)+')');
        }else if(id==='LANDING'){
            const q=ease(p),contact=clamp((time-3.5)/.4),shake=time>3.65&&time<4.05?Math.sin(time*72)*.65*(1-(time-3.65)/.4):0;
            const done=landscape(g,[mix(280,369,q),mix(122,92,q)],mix(1.1,2,q),time>=3.7,shake);
            const drop=ease(clamp(time/3.7)),shipY=mix(-55,40,drop);
            g.fillStyle='rgba(20,32,36,'+(.08+drop*.15)+')';g.beginPath();g.ellipse(369,95,18+drop*25,4+drop*2,0,0,Math.PI*2);g.fill();
            if(time<3.9){
                glow(g,341,94,10+8*(1-drop),'rgba(203,101,137,'+(.13+.13*(1-drop))+')');
                glow(g,398,94,10+8*(1-drop),'rgba(203,101,137,'+(.13+.13*(1-drop))+')');
                polygon(g,[[335,shipY+44],[348,shipY+44],[353,96],[330,96]],'rgba(201,115,160,.14)');
                polygon(g,[[391,shipY+44],[404,shipY+44],[410,96],[386,96]],'rgba(201,115,160,.14)');
            }
            global.RavokEvent.drawShip(g,321,shipY,1,{airborne:time<3.15});
            if(time>3.4)for(let i=0;i<22;i++){
                const u=clamp((time-3.4)/1.2),side=i%2?1:-1;
                g.globalAlpha=(1-u)*.55;fill(g,i%3?'#aaa17d':'#788473',Math.round(369+side*(20+u*(15+i%9))),Math.round(99+Math.sin(i*7)*4-u*(i%4)),i%4===0?2:3,1);
            }g.globalAlpha=1;done();
            if(time<.35)fill(g,'rgba(3,7,16,'+(1-time/.35)+')');
        }else if(id==='DOOR'){
            groundScene(g,ease((time-.2)/1.1),false,2,false);
        }else if(id==='K7_EXIT'){
            const done=landscape(g,[369,92],2,true);global.RavokEvent.drawShip(g,321,40,1,{door:1});
            const q=ease(clamp(time/2.2));
            // The doorway's occlusion recedes continuously as K7 steps out;
            // removing a fixed clip would make his head pop into view.
            g.save();if(q<.55){g.beginPath();g.rect(354,83-q*40,64,90);g.clip();}
            if(q<1)robot(g,mix(368,396,q),mix(89,113,q),mix(.5,1,q));g.restore();
            if(q===1){fill(g,'rgba(20,38,35,.22)',388,111,17,4);robot(g,396,113);scan(g,ease((time-2.2)/.7));}done();
        }else if(id==='DIALOGUE'){
            groundScene(g,1,true);dialogue(g);
        }else if(id==='WITHDRAW'){
            groundScene(g,mix(1,.12,ease(p)),p<.45,mix(2,1.45,ease(p)));
        }else if(id==='FADE_BACK'){
            groundScene(g,.12,false,1.45);fill(g,'rgba(3,7,16,'+ease(p)+')');
        }
        // Letterbox stays outside the world and dialogue's useful areas.
        if(!['FADE_OUT','SILENCE'].includes(id)){fill(g,'#030710',0,0,450,14);fill(g,'#030710',0,286,450,14);}
        if(saveFailed){
            fill(g,'#0b1625',25,225,400,58);g.textAlign='center';g.font='9px monospace';g.fillStyle='#dec9b6';
            g.fillText('Não foi possível salvar. A cena aguarda.',225,244);
            g.fillText('[ESPAÇO] TENTAR NOVAMENTE',225,266);
        }
        g.restore();
    }
    function drawPrompt(g){
        if(active||!readyScene||!pending())return;
        g.save();fill(g,'rgba(9,20,32,.95)',116,274,218,17);g.fillStyle='#d9e3ce';g.font='8px monospace';g.textAlign='center';g.fillText('[ESPAÇO / ENTER] CONTINUAR',225,285);g.restore();
    }
    global.RavokArrival=Object.freeze({
        init(options){config=options;},get active(){return active;},tryStart,update,draw,drawPrompt,
        snapshot:()=>({active,pending:pending(),seen:global.RavokEvent.ravokArrivalSeen,phase:phase(),time,elapsed,line,
            dialogue:phase()==='DIALOGUE'?lines[line]:null,readyScene,completedRuns,saveFailed,
            duration:shots.reduce((sum,s)=>sum+(s.duration||0),0),k7Outside:['DIALOGUE','WITHDRAW','FADE_BACK'].includes(phase())||phase()==='K7_EXIT'&&time>=2.2,
            ravokOutside:false,returnPoint:returnPoint?[...returnPoint]:null})
    });
})(window);
