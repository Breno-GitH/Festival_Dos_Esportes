/* Refusal is an Overworld story event, never an ending. All authority visuals are Canvas. */
(function(global){
    'use strict';
    const shots=Object.freeze([
        ['REFUSAL',null,'ZORPZIN','Não.'],
        ['MISUNDERSTANDING',null,'RAVOK','Você não entendeu.'],
        ['UNDERSTOOD',null,'ZORPZIN','Entendi perfeitamente.'],
        ['TRUTH_ONE',null,'ZORPZIN','Você não voltou porque queria vencer.'],
        ['TRUTH_TWO',null,'ZORPZIN','Voltou porque nunca conseguiu aceitar que perdeu.'],
        ['ANGER',1.1],['FURY',null,'RAVOK','Você não sabe nada sobre mim.'],
        ['TURN_TO_SHIP',1.5],['K7_ALERT',null,'K7','PARTIDA IMEDIATA RECOMENDADA.'],
        ['TRANSMIT',2.7],['WHAT_DID_YOU_DO',null,'RAVOK','O que você fez?'],
        ['COORDINATES_SENT',null,'ZORPZIN','Chamei quem deveria ter sido chamado há muito tempo.'],
        ['SKY_REVEAL',2.4],['AUTHORITY_LIGHTS',1.8],['AUTHORITY_ARRIVAL',2.7],['ENCIRCLEMENT',2.8],
        ['ESCAPE_BLOCKED',null,'K7','ROTA DE FUGA BLOQUEADA.'],['REMOTE_DISABLE',2.4],['HOLOGRAM',1.3],
        ['OFFICER_NAME',null,'OFICIAL','Ravok Noxaris.'],
        ['OFFICER_CHARGES',null,'OFICIAL','Você está detido por desenvolvimento de armamento planetário proibido, violação do código de não intervenção e tentativa de ataque contra uma civilização protegida.'],
        ['REMEMBERED',null,'RAVOK','Você poderia ter sido lembrado para sempre.'],
        ['EIGHT_MEMORIES',null,'ZORPZIN','Eu já tenho oito coisas para lembrar desta viagem.'],['MEDALS',2.8],
        ['PROTOCOL_CLOSED',null,'K7','PROTOCOLO ENCERRADO.'],['K7_EVIDENCE',2.5],['RAVOK_ESCORT',2.8],
        ['AUTHORITIES_DEPART',4.5],['AFTERMATH',1.8],['FADE',1]
    ].map(row=>Object.freeze(row)));
    const positions=Object.freeze([[317,51,.7],[409,70,.66],[420,142,.62]].map(p=>Object.freeze(p)));
    const clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,p)=>a+(b-a)*p;
    const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
    const ordinal=id=>shots.findIndex(s=>s[0]===id),from=(id,start)=>ordinal(id)>=ordinal(start);
    const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    let config=null,island=null,cleared=null,origin=null,audio=null,voices=new Set();
    const hulls=new Map();
    function line(g,c,w,points){g.strokeStyle=c;g.lineWidth=w;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
    function polygon(g,c,points){g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
    function glow(g,x,y,r,c){const a=g.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,c);a.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=a;g.fillRect(x-r,y-r,r*2,r*2);}
    function authoritySurface(){
        if(hulls.has('authority'))return hulls.get('authority');
        const c=document.createElement('canvas');c.width=72;c.height=42;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
        polygon(g,'#203c50',[[3,25],[15,15],[25,13],[28,6],[45,6],[49,13],[59,16],[69,25],[65,33],[7,33]]);
        polygon(g,'#bacdc9',[[7,24],[18,18],[27,16],[30,9],[43,9],[46,16],[57,19],[65,25],[61,28],[11,28]]);
        rect(g,'#5b8596',28,11,16,8);rect(g,'#b1eee2',29,11,10,2);
        rect(g,'#648c9b',12,27,48,5);rect(g,'#25475e',16,32,40,3);
        rect(g,'#87e5d9',11,24,10,2);rect(g,'#87e5d9',51,24,10,2);
        // Official insignia: framed diamond and vertical crest, distinct from Ravok's red ports.
        polygon(g,'#edf0cf',[[36,20],[41,24],[36,29],[31,24]]);rect(g,'#3d7c8d',35,21,2,7);
        hulls.set('authority',c);return c;
    }
    function authority(g,x,y,s=1){g.save();g.imageSmoothingEnabled=false;g.translate(Math.round(x),Math.round(y));g.scale(s,s);g.drawImage(authoritySurface(),-36,-24);g.restore();}
    function disabledRavok(g,x,y,s=1,amount=1,door=0){
        global.RavokEvent.drawShip(g,x,y,s,{door});
        g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha=amount;
        rect(g,'#111f30',7,34,6,2);rect(g,'#111f30',80,34,6,2);rect(g,'#283448',21,22,3,4);
        rect(g,'#213a44',33,10,28,10);rect(g,'#52646a',34,11,11,1);rect(g,'#213a44',50,39,2,2);rect(g,'#354654',60,41,7,2);g.restore();
    }
    function contain(g,x,y,amount=1){
        g.save();g.globalAlpha=amount;g.strokeStyle='#9cddd3';g.lineWidth=.8;g.strokeRect(x-14,y-47,28,49);
        for(let i=0;i<4;i++)rect(g,'rgba(163,229,218,.5)',x-13+i*8,y-46,1,47);g.restore();
    }
    function hologram(g,t,amount=1){
        const x=330,y=126;g.save();g.globalAlpha=amount;
        polygon(g,'rgba(109,222,216,.12)',[[x-14,y],[x+14,y],[x+10,y-49],[x-10,y-49]]);
        rect(g,'#7dd3cf',x-4,y-43,8,8);rect(g,'#a8f0df',x-6,y-45,12,3);rect(g,'#4b98b0',x-7,y-34,14,23);
        rect(g,'#c7efd6',x-1,y-31,3,4);line(g,'#92e6db',1,[[x-11,y],[x+11,y]]);
        for(let i=0;i<8;i++)rect(g,'rgba(189,249,231,.22)',x-8,y-44+i*4+(Math.floor(t*5)%3),16,1);g.restore();
    }
    function communicator(g,t){
        const x=origin.x+12,y=origin.y-23;
        rect(g,'#1b3447',x-3,y-8,7,12);rect(g,'#a1ebdb',x-1,y-6,3,6);
        g.strokeStyle='rgba(141,227,219,.65)';g.lineWidth=.7;
        for(let i=0;i<3;i++){const r=4+(t*.9+i/3)%1*15;g.beginPath();g.arc(x+1,y-7,r,-2.4,-.7);g.stroke();}
    }
    function medals(g,t){
        const a=Math.min(ease(t/.35),ease((2.8-t)/.35));g.save();g.globalAlpha=a;
        rect(g,'rgba(10,28,40,.95)',66,160,318,47);line(g,'#9ecdc3',1,[[67,160],[383,160]]);
        const all=global.MEDALHAS_REGISTRY||[];
        for(let i=0;i<8;i++){
            const x=83+i*37,m=all[i];
            if(m?.imgUnlocked?.complete&&m.imgUnlocked.naturalWidth)g.drawImage(m.imgUnlocked,x,167,26,29);
            else{rect(g,'#b45f6e',x+8,167,10,9);polygon(g,'#efcf83',[[x+13,175],[x+21,181],[x+18,192],[x+8,192],[x+5,181]]);}
        }g.restore();
    }
    function wrap(g,text,width){let row='';const rows=[];for(const word of text.split(/\s+/)){const n=row?row+' '+word:word;if(row&&g.measureText(n).width>width){rows.push(row);row=word;}else row=n;}if(row)rows.push(row);return rows;}
    function dialogue(g,speaker,text,t){
        g.save();g.textAlign='left';g.textBaseline='alphabetic';g.font='10px monospace';const rows=wrap(g,text,386),h=36+rows.length*13,y=288-h;
        rect(g,'rgba(9,24,36,.97)',16,y,418,h);rect(g,speaker==='RAVOK'?'#c68aa2':'#94d4ce',16,y,3,h);
        g.font='bold 9px monospace';g.fillStyle=speaker==='RAVOK'?'#daa5ba':'#a2e0d6';g.fillText(speaker,29,y+14);
        g.font='10px monospace';g.fillStyle='#e8eddb';rows.forEach((row,i)=>g.fillText(row,29,y+31+i*13));
        g.font='7px monospace';g.textAlign='right';g.fillStyle=t>=.45?'#a3c7bf':'#557871';g.fillText('[ESPAÇO] CONTINUAR',421,280);g.restore();
    }
    function draw(g,id,p,t){
        const sky=['SKY_REVEAL','AUTHORITY_LIGHTS','AUTHORITY_ARRIVAL'].includes(id);
        if(sky){
            const q=id==='SKY_REVEAL'?ease(p):1;
            rect(g,'#78aeca',0,0,450,300);g.save();g.translate(0,q*195);g.drawImage(island,0,0);g.restore();
            for(let i=0;i<7;i++)rect(g,'rgba(231,247,242,.5)',(i*89+17)%450,17+(i%4)*28+q*24,48+(i%3)*18,5);
            if(id!=='SKY_REVEAL')for(let i=0;i<3;i++){
                const x=118+i*107,y=67+(i%2)*28,a=id==='AUTHORITY_LIGHTS'?ease(p):1;
                glow(g,x,y,12,'rgba(158,244,236,'+a*.7+')');
                if(id==='AUTHORITY_ARRIVAL')authority(g,x,y,.12+ease(p)*.7);else rect(g,'#e6fff4',x-1,y-1,3,3);
            }
            return;
        }
        const late=from(id,'AFTERMATH'),depart=id==='AUTHORITIES_DEPART',zoom=late?mix(1.7,1,ease(id==='FADE'?1:p)):1.7;
        // Pull back around the same clearing; reach the native Overworld projection continuously.
        rect(g,'#2b78e4',0,0,450,300);g.save();g.translate(mix(225,369,(1.7-zoom)/.7),mix(135,99,(1.7-zoom)/.7));g.scale(zoom,zoom);g.translate(-369,-99);
        g.drawImage(late?cleared:island,0,0);
        if(!late){
            const disabled=from(id,'REMOTE_DISABLE'),amount=id==='REMOTE_DISABLE'?ease(p):1;
            const evidenceDoor=['PROTOCOL_CLOSED','K7_EVIDENCE'].includes(id)?1:id==='RAVOK_ESCORT'?1-ease((p-.75)/.25):0;
            if(!depart)disabled?disabledRavok(g,321,40,1,amount,evidenceDoor):global.RavokEvent.drawShip(g,321,40,1,{door:from(id,'TURN_TO_SHIP')?1:0});
            if(from(id,'ENCIRCLEMENT')&&!disabled){
                const effort=.5+.5*Math.sin(t*8);glow(g,369,97,15,'rgba(210,111,148,'+effort*.4+')');
                rect(g,'#e0a47c',337,89,6,4);rect(g,'#e0a47c',393,89,6,4);
            }
            if(from(id,'ENCIRCLEMENT')){
                for(let i=0;i<3;i++){
                    const a=positions[i],q=id==='ENCIRCLEMENT'?ease(p):1,dy=depart?-170*ease(p):0,s=depart?a[2]*(1-.72*ease(p)):a[2];
                    authority(g,mix(270+i*70,a[0],q),mix(20,a[1],q)+dy,s);
                    if((id==='REMOTE_DISABLE'&&p>.2)||id==='RAVOK_ESCORT'||depart){
                        const endY=depart?40-145*ease(p):90;
                        polygon(g,'rgba(133,221,218,.1)',[[a[0]-3,a[1]+dy],[a[0]+3,a[1]+dy],[382,endY],[350,endY]]);
                    }
                }
            }
            const turning=from(id,'TURN_TO_SHIP');
            const rv=turning?global.RavokK7Animation.path('ravok',[350,114],[360,105],1.5,id==='TURN_TO_SHIP'?t:1.5):global.RavokK7Animation.idle('ravok',350,114);
            const rx=rv.x,ry=rv.y;
            if(!from(id,'AUTHORITIES_DEPART')){
                if(id==='RAVOK_ESCORT'){
                    // Walk into the impounded ship; authorities take it as evidence.
                    const escorted=global.RavokK7Animation.path('ravok',[360,105],[368,89],1.35,t-.25);
                    if(t<=1.68){config.drawNpc(g,'ravok',escorted);contain(g,escorted.x,escorted.y,1);}
                }else config.drawNpc(g,'ravok',rv);
                if(from(id,'HOLOGRAM')&&!from(id,'RAVOK_ESCORT'))contain(g,rx,ry,id==='HOLOGRAM'?ease(p):1);
            }
            if(!from(id,'RAVOK_ESCORT')){
                const robot=id==='K7_EVIDENCE'?global.RavokK7Animation.path('k7',[396,113],[368,89],2.2,t):global.RavokK7Animation.idle('k7',396,113,'right');
                if(id!=='K7_EVIDENCE'||t<=2.28)config.drawNpc(g,'k7',robot);
                if(from(id,'K7_ALERT')&&!from(id,'REMOTE_DISABLE')){rect(g,'#f0bd6f',395,60,2,7);rect(g,'#f0bd6f',395,69,2,2);}
            }
            if(id==='ANGER'){glow(g,350,89,19,'rgba(193,75,117,'+Math.sin(p*Math.PI)*.2+')');}
            if(id==='REMOTE_DISABLE'){
                g.strokeStyle='rgba(157,231,222,'+(1-p)*.8+')';g.lineWidth=1;g.beginPath();g.ellipse(369,80,12+p*53,5+p*23,0,0,Math.PI*2);g.stroke();
            }
            if(from(id,'HOLOGRAM')&&!from(id,'K7_EVIDENCE'))hologram(g,t,id==='HOLOGRAM'?ease(p):1);
            if(depart){const q=ease(p);g.save();g.translate(369,40-170*q);g.scale(1-.65*q,1-.65*q);disabledRavok(g,-47,0,1,1);g.restore();}
        }
        config.drawZorp(g,origin.x,origin.y,1,false,t);
        if(from(id,'TRANSMIT')&&!from(id,'SKY_REVEAL'))communicator(g,t);
        g.restore();
        if(id==='TRANSMIT'){
            rect(g,'rgba(11,33,47,.97)',64,224,322,45);g.textAlign='center';g.font='bold 10px monospace';g.fillStyle='#b0e7db';g.fillText('TRANSMITINDO COORDENADAS...',225,242);
            for(let i=0;i<12;i++)rect(g,i/12<p?'#93d9ce':'#31515f',104+i*20,253,14,3);
        }
        if(id==='MEDALS')medals(g,t);
        if(id==='FADE')rect(g,'rgba(3,12,22,'+Math.sin(p*Math.PI)+')',0,0,450,300);
        const shot=shots.find(s=>s[0]===id);if(shot?.[2])dialogue(g,shot[2],shot[3],t);
    }
    function sound(id){
        if(!audio||audio.state!=='running')return;const notes={TRANSMIT:[640,820,.12,.012],AUTHORITY_LIGHTS:[330,660,.3,.012],REMOTE_DISABLE:[280,95,.65,.016]};
        if(!notes[id])return;const [a,b,d,v]=notes[id],t=audio.currentTime,o=audio.createOscillator(),n=audio.createGain();o.type='sine';o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);n.gain.setValueAtTime(.0001,t);n.gain.exponentialRampToValueAtTime(v,t+.03);n.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(n);n.connect(audio.destination);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();n.disconnect();};o.start(t);o.stop(t+d+.02);
    }
    global.RavokArrest=Object.freeze({shots,
        prepare(options){config=options;island=options.island;cleared=options.clearedIsland;origin=options.origin;try{const C=global.AudioContext||global.webkitAudioContext;if(C&&!audio)audio=new C();if(audio?.state==='suspended')audio.resume().catch(()=>{});}catch(_){/* Optional audio never gates the event. */}},
        enter:sound,draw,
        silence(){for(const o of voices){try{o.stop();}catch(_){}}voices.clear();},
        pause(){if(audio?.state==='running')audio.suspend().catch(()=>{});},resume(){if(audio?.state==='suspended')audio.resume().catch(()=>{});},
        snapshot:()=>({authorityShips:3,medalsShown:8,returnsTo:'ILHA_ESCALADA',endingCard:false})
    });
})(window);
