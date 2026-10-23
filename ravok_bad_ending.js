/* Acceptance film: two original hulls, fixed orbital camera, distant non-graphic aftermath. */
(function(global){
    'use strict';
    const shots=Object.freeze([
        ['SILENT_ACCEPTANCE',2.6],['ACCEPTANCE',2.3],['AUTHORIZATION',1.9],['RAVOK_BOARD',3.4],
        ['RETURN_TO_SHIP',4.6],['ISLAND_DEPARTURE',3.7],['CLOUDS',2.5],['ATMOSPHERE',2.8],
        ['SPACE_ESTABLISH',2.4],['WEAPON_DEPLOY',3],['TRANSMISSION',4.4],['CHARGE',3.5],
        ['FIRE',.65],['PLANET_FLASH',1.4],['SILENT_AFTERMATH',3.6],['LAST_WORDS',2.8],
        ['DEPARTURE',5],['FADE',1.6],['BLACK_INTERVAL',.55]
    ].map(row=>Object.freeze(row)));
    const clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,p)=>a+(b-a)*p;
    const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
    const stars=Array.from({length:108},(_,i)=>({x:(i*127+21)%450,y:(i*73+19)%300,a:.25+(i%5)*.12}));
    const debris=Array.from({length:32},(_,i)=>({a:i*2.39996,r:10+(i*17)%29,size:i<7?4+(i%3)*2:1}));
    let config,island,home,origin,audio=null,voices=new Set();
    const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    function glow(g,x,y,r,color){const v=g.createRadialGradient(x,y,0,x,y,r);v.addColorStop(0,color);v.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=v;g.fillRect(x-r,y-r,r*2,r*2);}
    function line(g,color,width,points){g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
    function poly(g,color,points){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
    function space(g){rect(g,'#060b1c',0,0,450,300);glow(g,80,65,220,'rgba(79,54,116,.14)');for(const s of stars)rect(g,'rgba(193,216,235,'+s.a+')',s.x,s.y,1,1);}
    function earth(g){global.AdventureIntro.earth(g,332,169,46);}
    function zorpShip(g,x,y,s=1,door=0){global.AdventureIntro.drawShip(g,x,y,s,door,false,false);}
    function ravokShip(g,x,y,s=1,door=0){global.RavokEvent.drawShip(g,x,y,s,{door,airborne:false});}
    function exhaust(g,x,y,s,color){glow(g,x,y,17*s,color);poly(g,'#8de0db',[[x-5*s,y],[x+5*s,y],[x+2*s,y+13*s],[x-2*s,y+13*s]]);}
    function twoShips(g,departure=0){
        const q=ease(departure),s=1-q;
        if(s<.018)return;
        const rx=mix(78,38,q),ry=mix(74,39,q),zx=mix(216,68,q),zy=mix(118,57,q);
        if(departure){exhaust(g,rx+47*1.25*s,ry+55*1.25*s,s,'rgba(202,81,176,.3)');exhaust(g,zx,zy+2*s,s*.55,'rgba(96,217,231,.25)');}
        ravokShip(g,rx,ry,1.25*s);zorpShip(g,zx,zy,.43*s);
    }
    function weapon(g,open,power=0){
        const q=ease(open),x=153,y=134;
        // Hinged jaws grow directly out of Ravok's hull, sharing its dark armor palette.
        for(const sign of [-1,1]){
            const dy=sign*(3+q*15);
            poly(g,'#101c30',[[x-29,y+sign*4],[x-8,y+dy],[x+26*q,y+dy],[x+35*q,y+sign*5],[x+9,y+sign*3]]);
            line(g,'#6a4c77',2,[[x-23,y+sign*5],[x-5,y+dy],[x+23*q,y+dy]]);
            line(g,'#b25986',1,[[x-4,y+dy-sign*3],[x+18*q,y+dy-sign*3]]);
        }
        rect(g,'#28243f',x-16,y-6,18,12);rect(g,'#7e466c',x-8,y-4,10,8);
        glow(g,x+13*q,y,12+power*25,'rgba(202,58,138,'+(.12+power*.47)+')');
        rect(g,power>.7?'#ffe4ed':'#db779e',x+10*q,y-2,4,4);
        if(power>0){
            for(let i=0;i<9;i++){const a=i*Math.PI*2/9+power*2,r=(1-power)*24+6;rect(g,'#d875b6',x+12+Math.cos(a)*r,y+Math.sin(a)*r,1,1);}
            g.strokeStyle='rgba(187,103,199,'+power*.35+')';g.lineWidth=1;g.beginPath();g.ellipse(x+12,y,9+power*12,4+power*6,-.2,0,Math.PI*2);g.stroke();
        }
    }
    function fragments(g,p=1){
        glow(g,332,169,73,'rgba(103,122,156,.13)');
        for(const d of debris){const r=d.r*(.8+.3*ease(p)),x=332+Math.cos(d.a)*r*1.35,y=169+Math.sin(d.a)*r*.8;
            if(d.size>1){poly(g,'#486176',[[x-d.size,y-2],[x+1,y-d.size],[x+d.size,y],[x+2,y+d.size*.7],[x-d.size,y+2]]);line(g,'#7c8d96',1,[[x-d.size,y-2],[x+1,y-d.size],[x+d.size,y]]);}
            else rect(g,'#697c8e',x,y,1,1);
        }
    }
    function orbital(g,id,p){
        space(g);
        const broken=['SILENT_AFTERMATH','LAST_WORDS','DEPARTURE','FADE'].includes(id);
        if(broken)fragments(g,id==='SILENT_AFTERMATH'?p:1);else earth(g);
        twoShips(g,id==='DEPARTURE'?p:id==='FADE'?1:0);
        if(!['SPACE_ESTABLISH','DEPARTURE','FADE'].includes(id))weapon(g,id==='WEAPON_DEPLOY'?p:1,id==='CHARGE'?p:id==='FIRE'?1:0);
        if(id==='TRANSMISSION')config.caption(g,'RAVOK',p<.43?'Olhe bem.':'É assim que uma derrota deixa de existir.');
        if(id==='FIRE'){
            const reach=clamp(p*3),endX=mix(169,296,reach),endY=mix(134,155,reach);
            line(g,'rgba(184,55,141,.32)',12,[[169,134],[endX,endY]]);line(g,'#d86eac',5,[[169,134],[endX,endY]]);line(g,'#fff0f5',2,[[169,134],[endX,endY]]);
            glow(g,296,155,12+ease(p)*38,'rgba(255,211,235,'+p*.9+')');
        }
        if(id==='PLANET_FLASH'){
            // The flash fully occludes the disc before fragments replace it; never show surface damage.
            if(p>.36){space(g);fragments(g,p);twoShips(g);weapon(g,1);}
            const a=p<.36?1:1-ease((p-.36)/.64);
            glow(g,332,169,150,'rgba(255,230,241,'+a+')');
            rect(g,'rgba(249,237,246,'+a+')',0,0,450,300);
        }
        if(id==='LAST_WORDS')config.caption(g,'RAVOK','Agora ninguém vai esquecer.');
        if(id==='FADE')rect(g,'rgba(0,0,0,'+ease(p)+')',0,0,450,300);
    }
    function localScene(g,id,p){
        rect(g,'#2b78e4',0,0,450,300);
        if(id==='RETURN_TO_SHIP'){
            g.drawImage(home,0,0);zorpShip(g,225,150,1,1-ease((p-.75)/.2));
            const q=ease(p);if(q<.96)config.drawZorp(g,mix(278,225,q),mix(215,151,q),mix(1,.55,q),true,p*4.6);
            const fade=p<.13?1-p/.13:p>.9?(p-.9)/.1:0;rect(g,'rgba(0,0,0,'+fade+')',0,0,450,300);return;
        }
        g.save();g.translate(225,135);g.scale(1.7,1.7);g.translate(-369,-99);g.drawImage(island,0,0);
        const board=id==='RAVOK_BOARD',q=board?ease(p):0,kr=board?ease((p-.2)/.8):0;
        ravokShip(g,321,40,1,board?1-ease((p-.82)/.18):1);
        if(q<.96)config.drawNpc(g,'ravok',mix(350,368,q),mix(114,89,q),mix(1,.5,q));
        if(kr<.96)config.drawNpc(g,'k7',mix(396,368,kr),mix(113,89,kr),mix(1,.5,kr));
        config.drawZorp(g,origin.x,origin.y,1,false,0);g.restore();
        if(id==='ACCEPTANCE')config.caption(g,'RAVOK','Sabia que você entenderia.');
        if(id==='AUTHORIZATION')config.caption(g,'K7','PROTOCOLO AUTORIZADO.');
        if(board&&p>.88)rect(g,'rgba(0,0,0,'+ease((p-.88)/.12)+')',0,0,450,300);
    }
    function ascent(g,id,p){
        if(id==='ISLAND_DEPARTURE'){
            // Match both cached islands' ocean exactly, avoiding rectangular capture seams.
            rect(g,'#2b78e4',0,0,450,300);
            for(let i=0;i<16;i++)rect(g,'rgba(112,186,237,.24)',(i*89+23)%450,(i*47+31)%300,8+(i%3)*4,1);
            // Geographic wide shot: mountain on the left, central island to the right.
            g.drawImage(island,15,120,216,144);g.drawImage(home,216,133,216,144);
            const q=ease(p),rs=.62*(1-.45*q),zs=.45*(1-.45*q);
            const rx=169-18*q,ry=155-190*q,zx=324-20*q,zy=205-230*q;
            exhaust(g,rx+47*rs,ry+54*rs,rs,'rgba(207,85,176,.35)');ravokShip(g,rx,ry,rs);
            exhaust(g,zx,zy,zs,'rgba(111,231,228,.35)');zorpShip(g,zx,zy,zs);
            for(let i=0;i<12;i++)rect(g,'rgba(215,215,191,'+(1-q)*.35+')',190+(i%5)*5+(i%2?1:-1)*q*24,179+(i%3)*3,2,1);
        }else{
            const a=id==='ATMOSPHERE',grad=g.createLinearGradient(0,0,0,300);grad.addColorStop(0,a?'#0b1630':'#5f9dbd');grad.addColorStop(1,a?'#588fb7':'#c7dfe2');g.fillStyle=grad;g.fillRect(0,0,450,300);
            if(a){for(const s of stars)if(s.y<140)rect(g,'#aab6cb',s.x,s.y,1,1);line(g,'#87c1d3',4,[[0,273],[85,256],[225,248],[360,259],[450,277]]);}
            for(let i=0;i<7;i++){const y=(i*43+p*(a?35:85))%340;rect(g,'rgba(232,245,247,'+(a?.12:.4)+')',(i*107)%450-60,y,100+(i%3)*25,9);}
            const rx=116-15*p,ry=92-34*p,zx=264-14*p,zy=161-32*p;
            exhaust(g,rx+47*.9,ry+54*.9,.8,'rgba(209,83,170,.3)');ravokShip(g,rx,ry,.9);
            exhaust(g,zx,zy,.4,'rgba(111,231,228,.3)');zorpShip(g,zx,zy,.4);
        }
    }
    const endingId='ravok_maior_conquista',cardRevealDuration=global.EndingCard.timing.reveal;
    function silence(){for(const o of voices){try{o.stop();}catch(_){}}voices.clear();}
    function sound(kind){
        if(!audio||audio.state!=='running')return;
        const settings={launch:[74,43,1.1,.018],deploy:[100,170,.5,.012],charge:[60,430,3.45,.032],fire:[330,48,.55,.045]};
        const [a,b,d,v]=settings[kind],t=audio.currentTime,o=audio.createOscillator(),gain=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);
        gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(v,t+Math.min(.2,d/3));gain.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gain);gain.connect(audio.destination);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();gain.disconnect();};o.start(t);o.stop(t+d+.02);
    }
    global.RavokBadEnding=Object.freeze({shots,endingId,cardRevealDuration,
        get cardReady(){return global.EndingCard.portraitInfo(endingId).status==='ready';},
        retryCardAsset(){global.EndingCard.retryAsset(endingId);},
        prepare(options){config=options;island=options.island;home=options.home;origin=options.origin;silence();try{const C=global.AudioContext||global.webkitAudioContext;if(C&&!audio)audio=new C();if(audio?.state==='suspended')audio.resume().catch(()=>{});}catch(_){/* Optional synthesized audio. */}},
        enter(id){if(id==='ISLAND_DEPARTURE')sound('launch');if(id==='WEAPON_DEPLOY')sound('deploy');if(id==='CHARGE')sound('charge');if(id==='FIRE')sound('fire');if(['PLANET_FLASH','SILENT_AFTERMATH','CARD'].includes(id))silence();},
        pause(){if(audio?.state==='running')audio.suspend().catch(()=>{});},resume(){if(audio?.state==='suspended')audio.resume().catch(()=>{});},silence,
        draw(g,id,p,t){if(id==='BLACK_INTERVAL')rect(g,'#000',0,0,450,300);else if(id==='CARD')global.EndingCard.preview(g,endingId,t);else if(['SILENT_ACCEPTANCE','ACCEPTANCE','AUTHORIZATION','RAVOK_BOARD','RETURN_TO_SHIP'].includes(id))localScene(g,id,p);else if(['ISLAND_DEPARTURE','CLOUDS','ATMOSPHERE'].includes(id))ascent(g,id,p);else orbital(g,id,p);},
        snapshot:()=>({ships:2,camera:'FIXED_DISTANT_SPACE',earthRadius:46,destruction:'DISTANT_STYLIZED_FRAGMENTS',audioVoices:voices.size,
            endingId,card:{...global.EndingCard.portraitInfo(endingId),title:global.EndingCard.presets[endingId].title,titleFont:'LOCAL_BITMAP_5x7',narrative:global.EndingCard.presets[endingId].text.split('\n'),revealDuration:cardRevealDuration}})
    });
})(window);
