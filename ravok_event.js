/* Overworld encounter, its save and the explicit handoff to the chosen cutscene. */
(function(global){
    'use strict';
    const SCENE='ILHA_ESCALADA',STORAGE_KEY='zorp_ravok_event',ARRIVAL_MEDALS=4;
    const ship=Object.freeze({x:321,y:40,width:94,height:63,depth:96,
        colliders:Object.freeze([Object.freeze({x:341,y:64,w:53,h:31}),Object.freeze({x:330,y:76,w:77,h:15})])});
    const images={},assetErrors=[],geometry=global.RAVOK_NPC_GEOMETRY;
    for(const [key,file] of [['ravok','Ravok.png'],['k7','K7.png']]){
        const image=images[key]=new Image();
        image.onerror=()=>{assetErrors.push(file);console.error('[Ravok] Asset indisponível: '+file);};
        image.src=file+'?v=1.0.0_secret_overworld';
    }
    const K7_LINES=Object.freeze(['Não me atrapalhe.','Ainda não é hora.','Volte para o nosso planeta.','Você não vai querer ver o que vem.']);
    const PRELUDE=Object.freeze([
        ['RAVOK','Então você conseguiu.'],
        ['RAVOK','Todas as oito.'],
        ['ZORPZIN','Era para isso que eu vim.'],
        ['RAVOK','Eu também vim à Terra por esse motivo.'],
        ['RAVOK','Há muito tempo.'],
        ['RAVOK','Mesmo planeta.'],
        ['RAVOK','Mesmos Mestres.'],
        ['RAVOK','Mesmo objetivo.'],
        ['RAVOK','Mas eu falhei.'],
        ['RAVOK','Eu voltei para casa sem nada.'],
        ['RAVOK','Enquanto eles ficaram aqui...'],
        ['RAVOK','...como se nunca tivesse acontecido.'],
        ['ZORPZIN','Você perdeu competições.'],
        ['ZORPZIN','Isso acontece.'],
        ['RAVOK','Eu não voltei para tentar de novo.'],
        ['RAVOK','Voltei para terminar isso de outra maneira.'],
        ['ZORPZIN','Não.'],
        ['RAVOK','Nem ouviu minha proposta.'],
        ['ZORPZIN','Não preciso.'],
        ['ZORPZIN','Usar nossa tecnologia para atacar uma civilização que não pode se defender dela é proibido por uma das leis fundamentais da nossa espécie.'],
        ['ZORPZIN','Não é competição.'],
        ['ZORPZIN','É abuso.'],
        ['RAVOK','Leis.'],
        ['RAVOK','Você venceu todos eles.'],
        ['RAVOK','Provou que é melhor que este planeta.'],
        ['RAVOK','Você realmente quer voltar para casa carregando apenas oito pedaços de metal?'],
        ['RAVOK','Eu tenho algo maior.'],
        ['RAVOK','Algo que ninguém do nosso planeta esqueceria.'],
        ['K7','PROTOCOLO DISPONÍVEL.']
    ].map(([speaker,text])=>Object.freeze({speaker,text})));
    let arrived=false,metK7=false,metRavok=false,count=0,k7Line=0,preludeSeen=false;
    let ravokArrivalSeen=false,ravokArrivalPending=false;
    let ravokExited=false,ravokProposalSeen=false,ravokChoice=null,ravokEndingCompleted=false;
    let ravokChoicePosition=null;
    let ravokBadEndingCardReady=false,ravokBadEndingSeen=false,ravokArrested=false;
    let config=null,conversation=null,exit=null,lastUpdate=0;
    const held=new Set(),normalize=key=>key===' '||key==='Spacebar'?'space':String(key).toLowerCase();
    try{
        const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
        arrived=saved?.arrived===true;metK7=arrived&&saved?.metK7===true;metRavok=arrived&&saved?.metRavok===true;
        preludeSeen=metRavok&&saved?.preludeSeen===true;
        ravokArrivalSeen=saved?.ravokArrivalSeen===true;
        ravokArrivalPending=!ravokArrivalSeen&&saved?.ravokArrivalPending===true;
        ravokExited=saved?.ravokExited===true;
        ravokProposalSeen=saved?.ravokProposalSeen===true;
        ravokChoice=['accept','refuse'].includes(saved?.ravokChoice)?saved.ravokChoice:null;
        ravokEndingCompleted=!!ravokChoice&&saved?.ravokEndingCompleted===true;
        // An old completed acceptance restores the new card without claiming it was already read.
        ravokBadEndingSeen=ravokChoice==='accept'&&saved?.ravokBadEndingSeen===true;
        ravokBadEndingCardReady=ravokChoice==='accept'&&(saved?.ravokBadEndingCardReady===true||ravokBadEndingSeen||saved?.version===5&&ravokEndingCompleted);
        ravokArrested=ravokChoice==='refuse'&&saved?.ravokArrested===true;
        // Old refusal cards were not campaign endings: resume the expanded arrest once.
        ravokEndingCompleted=ravokChoice==='accept'&&ravokBadEndingSeen;
        const pos=saved?.ravokChoicePosition;
        if(ravokChoice&&Array.isArray(pos)&&pos.length===2&&pos.every(Number.isFinite)&&pos[0]>=0&&pos[0]<=450&&pos[1]>=0&&pos[1]<=300)ravokChoicePosition=pos;
        if(Number.isInteger(saved?.k7Line)&&saved.k7Line>=0&&saved.k7Line<K7_LINES.length)k7Line=saved.k7Line;
    }catch(_){/* Session progression works when storage is unavailable. */}
    function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:7,arrived,metK7,metRavok,k7Line,preludeSeen,ravokArrivalSeen,ravokArrivalPending,
        ravokExited,ravokProposalSeen,ravokChoice,ravokChoicePosition,ravokEndingCompleted,ravokBadEndingCardReady,ravokBadEndingSeen,ravokArrested}));return true;}catch(_){return false;}}
    // Old/inconsistent saves cannot reveal the encounter before four actual medals.
    const landed=()=>!ravokArrested&&arrived&&count>=ARRIVAL_MEDALS&&!ravokArrivalPending;
    const state=()=>ravokArrested?'ARRESTED':!landed()?'DORMANT':count>=8?'RAVOK_PRESENT':'LANDED';
    const eligible=()=>landed()&&ravokArrivalSeen&&count===8;
    function message(id){
        if(id==='k7')return ravokEndingCompleted?'> K7: PROTOCOLO ENCERRADO.':eligible()
            ? ravokExited?'> K7: Ravok está esperando você junto à nave.':'> K7: Aguarde. Ele quer ver suas medalhas.'
            : '> K7: '+K7_LINES[k7Line];
        return '> RAVOK: '+PRELUDE[0].text;
    }
    const npcs=[
        {id:'k7',eventId:'ravok',scene:SCENE,x:396,y:113,img:images.k7,spriteGeometry:geometry.k7_front,tamanho:44,facingDirection:'right',footprint:Object.freeze({width:18,height:8}),msg:message('k7')},
        {id:'ravok',eventId:'ravok',scene:SCENE,x:350,y:114,img:images.ravok,spriteGeometry:geometry.ravok_front,tamanho:44,facingDirection:'down',footprint:Object.freeze({width:18,height:8}),msg:message('ravok')}
    ];
    function sync(){
        count=(global.MEDALHAS_REGISTRY||[]).filter(m=>global.isMedalhaDesbloqueada?.(m.id)).length;
        if(!arrived&&count>=ARRIVAL_MEDALS){arrived=true;persist();}
        for(const npc of npcs)npc.msg=message(npc.id);
        return state();
    }
    function isNpcVisible(npc){return npc.eventId!=='ravok'||landed()&&(npc.id==='k7'||npc.id==='ravok'&&eligible()&&ravokExited&&!exit&&!ravokEndingCompleted);}
    function interact(npc){
        if(npc.eventId!=='ravok'||!isNpcVisible(npc))return null;
        const text=message(npc.id);
        if(npc.id==='k7'){
            metK7=true;
            if(!eligible())k7Line=(k7Line+1)%K7_LINES.length;
            persist();
        }
        if(npc.id==='ravok'){
            if(!metRavok){metRavok=true;persist();}
            beginConversation();
        }
        return text;
    }
    function dialogue(){
        if(!conversation)return null;
        return {type:conversation.phase,...(conversation.phase==='DIALOGUE'?PRELUDE[conversation.line]:{}),
            index:conversation.line,total:PRELUDE.length,selected:conversation.selected,error:conversation.error||null};
    }
    function beginConversation(){
        sync();
        if(!config||conversation||exit||!eligible()||!ravokExited||ravokChoice||ravokEndingCompleted||config.scene()!==SCENE)return false;
        for(const key of config.heldKeys?.()||[])held.add(normalize(key));
        conversation={phase:ravokProposalSeen?'CHOICE':'DIALOGUE',line:0,selected:1};config.clearInput();config.showDialogue(dialogue());return true;
    }
    function finishConversation(completed){
        if(!conversation)return false;
        if(completed&&!preludeSeen){preludeSeen=true;persist();}
        conversation=null;config.clearInput();config.closeDialogue();return true;
    }
    function advanceConversation(){
        if(!conversation)return false;
        if(++conversation.line>=PRELUDE.length){
            preludeSeen=true;ravokProposalSeen=true;persist();
            conversation.phase='CHOICE';conversation.line=PRELUDE.length-1;conversation.selected=1;
        }
        config.showDialogue(dialogue());return true;
    }
    function choose(route){
        if(!eligible()||!ravokExited||!ravokProposalSeen||ravokChoice||!['accept','refuse'].includes(route))return false;
        ravokChoice=route;
        ravokChoicePosition=config.player?[config.player.x,config.player.y]:[373,137];
        if(!persist()){ravokChoice=null;ravokChoicePosition=null;if(conversation)conversation.error='Não foi possível salvar. Tente novamente.';return false;}
        finishConversation(false);config.startOutcome(route);return true;
    }
    function handleKeyDown(event){
        const key=normalize(event.key),wasHeld=held.has(key);
        if(!conversation&&!exit&&!wasHeld)return false;
        event.preventDefault?.();event.stopImmediatePropagation?.();
        if(conversation||exit){
            held.add(key);
            if(conversation&&!event.repeat&&!wasHeld){
                const phase=conversation.phase;
                if(phase==='DIALOGUE'){
                    if(key==='space')advanceConversation();
                    else if(key==='escape')finishConversation(false);
                }else if(['w','arrowup'].includes(key))conversation.selected=0;
                else if(['s','arrowdown'].includes(key))conversation.selected=1;
                else if(['e','space','enter'].includes(key)){
                    if(phase==='CHOICE'&&conversation.selected===1)choose('refuse');
                    else if(phase==='CHOICE'){conversation.phase='CONFIRM';conversation.selected=1;}
                    else if(conversation.selected===0)choose('accept');
                    else{conversation.phase='CHOICE';conversation.selected=0;}
                }else if(key==='escape'){
                    if(phase==='CONFIRM'){conversation.phase='CHOICE';conversation.selected=0;}
                    else finishConversation(false);
                }
                if(conversation)config.showDialogue(dialogue());
            }
        }
        return true;
    }
    function handleKeyUp(event){
        const key=normalize(event.key),handled=!!conversation||!!exit||held.has(key);held.delete(key);
        if(handled){event.preventDefault?.();event.stopImmediatePropagation?.();}return handled;
    }
    function updateConversation(scene){
        const stamp=performance.now(),dt=document.hidden?0:Math.max(0,Math.min(.1,(stamp-lastUpdate)/1000));lastUpdate=stamp;
        if(scene!==SCENE||!eligible()){
            if(conversation)finishConversation(false);exit=null;return false;
        }
        if(conversation)return true;
        if(exit){
            exit.time+=dt;
            const duration={DOOR:.9,EXIT:2.2,LOOK:.8}[exit.phase];
            if(exit.time>=duration){
                if(exit.phase==='DOOR')exit={phase:'EXIT',time:0};
                else if(exit.phase==='EXIT')exit={phase:'LOOK',time:0};
                else{ravokExited=true;persist();exit=null;config.clearInput();}
            }return true;
        }
        const p=config?.player;
        if(!ravokExited&&!ravokChoice&&!ravokEndingCompleted&&p&&!config.busy?.()&&p.x>=342&&p.x<=413&&p.y>=132&&p.y<=158){
            for(const key of config.heldKeys?.()||[])held.add(normalize(key));
            exit={phase:'DOOR',time:0};config.clearInput();config.closeDialogue();return true;
        }
        return false;
    }
    function blocks(box){return landed()&&ship.colliders.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y);}
    const caches=new Map();
    let landingSurface=null,landingRemains=null;
    function drawGround(g,preview=false){
        if(ravokArrested||preview==='cleared'){
            if(!landingRemains){
                landingRemains=document.createElement('canvas');landingRemains.width=102;landingRemains.height=74;
                const r=landingRemains.getContext('2d');r.imageSmoothingEnabled=false;
                // Only flattened grass, four local stones and faint landing scars remain. No hull shadow.
                for(const [x,y,w,h,color]of [[19,42,62,1,'#758664'],[25,46,49,1,'#829474'],
                    [24,41,9,2,'#88977a'],[66,41,8,2,'#88977a'],[22,47,6,1,'#a4aa84'],
                    [5,36,5,2,'#88957a'],[91,29,4,2,'#88957a'],[14,63,5,2,'#88957a'],[86,57,6,2,'#88957a']]){
                    r.fillStyle=color;r.fillRect(x,y,w,h);
                }
            }
            g.save();g.imageSmoothingEnabled=false;g.drawImage(landingRemains,318,53);g.restore();return;
        }
        if(!preview&&!landed())return;
        if(!landingSurface){
            landingSurface=document.createElement('canvas');landingSurface.width=102;landingSurface.height=74;
            const p=landingSurface.getContext('2d');p.imageSmoothingEnabled=false;p.translate(-318,-53);
            const r=(color,x,y,w,h)=>{p.fillStyle=color;p.fillRect(x,y,w,h);};
            // Rasterize the irregular soil edge on the game's pixel grid, once per session.
            const patch=(points,color)=>{
                p.fillStyle=color;
                const ys=points.map(v=>v[1]);
                for(let y=Math.min(...ys);y<Math.max(...ys);y++){
                    const intersections=[];
                    for(let i=0,j=points.length-1;i<points.length;j=i++){
                        const a=points[j],b=points[i];
                        if((a[1]>y+.5)!==(b[1]>y+.5))intersections.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
                    }
                    intersections.sort((a,b)=>a-b);
                    for(let i=0;i+1<intersections.length;i+=2){
                        const left=Math.ceil(intersections[i]-.5),right=Math.ceil(intersections[i+1]-.5);
                        p.fillRect(left,y,right-left,1);
                    }
                }
            };
            // Compressed turf, exposed local earth, and a shallow apron beneath the door.
            // No new walls or props: this is a ground decal under the island's rocks/trees.
            patch([[332,66],[344,60],[387,62],[400,70],[409,85],[415,95],[410,108],
                [399,116],[379,120],[349,117],[335,111],[325,99],[328,82]],'#69805d');
            patch([[337,71],[351,66],[383,67],[397,76],[405,91],[405,104],[392,112],
                [366,115],[343,109],[332,100],[333,85]],'#81886b');
            patch([[346,80],[369,74],[391,82],[398,97],[390,108],[367,111],
                [347,105],[338,94]],'#919276');
            // Low contrast drag marks follow the two landing struts; no glowing landing pad.
            for(const [x,y,w]of [[334,105,15],[335,102,13],[391,104,13],[393,101,10]]){
                r('#616e56',x,y,w,1);r('#a4a17c',x+1,y+1,w-2,1);
            }
            r('#596b53',336,96,14,3);r('#596b53',389,96,16,3);
            r('#9a9876',337,99,12,1);r('#9a9876',390,99,13,1);
            for(const [x,y,w]of [[342,112,8],[356,116,6],[376,114,8],[404,108,4],
                [328,93,4],[401,79,4],[346,72,5],[382,68,3]])r('#a2a17e',x,y,w,1);
            // Six flat local stones and flattened grass frame an open approach from the south.
            for(const [x,y,w]of [[325,89,5],[411,82,4],[409,110,6],[332,116,5],[382,122,4],[404,68,4]]){
                r('#526958',x,y+2,w+1,2);r('#88957a',x,y,w,2);r('#adb291',x+1,y,Math.max(1,w-2),1);
            }
            for(const [x,y]of [[329,77],[326,104],[342,119],[397,117],[413,99]]){
                r('#496d4f',x,y,4,1);r('#a1b076',x+1,y+1,4,1);
            }
            // Ground shadow belongs below all actors, independently of the hull's depth sort.
            r('rgba(14,29,36,.18)',326,93,84,3);r('rgba(14,29,36,.22)',331,91,76,8);
        }
        g.save();g.imageSmoothingEnabled=false;g.drawImage(landingSurface,318,53);g.restore();
    }
    function shipSurface(doorOpen,airborne=false){
        const key=doorOpen+'-'+airborne;
        if(caches.has(key))return caches.get(key);
        const surface=document.createElement('canvas');surface.width=94;surface.height=63;
        const g=surface.getContext('2d');g.imageSmoothingEnabled=false;
        const r=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
        // Landed struts, stepped plating and raised cockpit describe a small 3/4 scout.
        if(!airborne){
            r('#1a2839',15,45,7,12);r('#1a2839',73,45,7,12);r('#80929d',17,45,3,10);r('#80929d',75,45,3,10);
            r('#182c3d',12,55,14,3);r('#182c3d',69,55,15,3);
        }
        r('#263548',20,11,54,33);r('#263548',12,22,69,24);r('#263548',3,32,88,13);r('#263548',9,45,76,6);
        r('#817783',24,12,46,3);r('#655e70',19,16,56,22);r('#4d4d63',13,26,68,16);
        r('#41475b',6,34,82,9);r('#626077',13,43,68,4);r('#8e8190',15,43,63,2);
        r('#303c50',3,31,20,9);r('#a09299',7,30,16,2);r('#4b5867',5,36,19,5);
        r('#303c50',70,31,21,9);r('#a09299',70,30,17,2);r('#4b5867',70,36,19,5);
        r('#121e2d',6,33,8,5);r('#d66b8f',7,34,6,2);r('#121e2d',79,33,8,5);r('#d66b8f',80,34,6,2);
        r('#1a2e40',28,7,38,21);r('#9aa4a2',32,5,30,2);r('#7d9297',28,8,38,2);
        r('#302a46',30,11,34,12);r('#5a3e65',33,10,28,10);r('#b1779d',34,11,11,2);r('#80547d',34,14,5,3);
        r('#1a2f3c',46,10,2,13);r('#96bcb0',32,24,30,1);
        r('#283448',19,21,7,7);r('#bc6e60',21,22,3,4);r('#bc6e60',20,23,5,2);
        r('#a69a9b',64,25,8,2);r('#2e394c',65,28,9,1);r('#b8a172',16,45,4,2);r('#b8a172',74,45,4,2);
        r('#202a3b',37,30,21,20);r('#8b8186',38,30,19,2);
        if(doorOpen){
            r('#0f202d',39,33,17,16);r('#33505a',41,33,13,9);r('#8db3a4',41,34,2,6);
            r('#354456',37,50,22,4);r('#77878a',35,54,26,3);r('#a7a995',33,57,30,2);
        }else{
            r('#56606c',39,33,17,14);r('#8d8a89',40,33,15,2);r('#242f40',46,35,2,12);r('#98c6ae',50,39,2,2);
        }
        r('#97b6a0',60,41,3,2);r('#61726e',64,41,3,2);
        caches.set(key,surface);return surface;
    }
    function drawShip(g,x,y,scale=1,options={}){
        const door=Math.max(0,Math.min(1,options.door||0));
        g.save();g.imageSmoothingEnabled=false;g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);
        g.drawImage(shipSurface(door>0,!!options.airborne),0,0);
        if(door>0&&door<1){g.fillStyle='#56606c';g.fillRect(39,33,17,Math.round(16*(1-door)));}
        if(options.occupant&&door>.65){
            // Only two dim eyes, never Ravok's exterior sprite, during the first arrival.
            g.fillStyle='#662d49';g.fillRect(43,36,3,1);g.fillRect(50,36,3,1);
        }
        g.restore();
    }
    function draw(g){
        if(!landed())return;
        const door=exit?exit.phase==='DOOR'?Math.min(1,exit.time/.9):1:ravokExited?1:0;
        drawShip(g,ship.x,ship.y,1,{door});
    }
    function exitPose(){
        if(!exit||exit.phase==='DOOR')return null;
        const t=exit.phase==='LOOK'?1:Math.min(1,exit.time/2.2),p=t*t*(3-2*t);
        const actor=global.RavokK7Animation.path('ravok',[368,89],[350,114],2.2,t*2.2);
        return {...actor,scale:global.RavokK7Animation.settings.ravok.scale,p};
    }
    function actors(scene){
        const pose=exitPose();
        if(scene!==SCENE||!pose)return [];
        // The open doorway is in front of the hull, even while the feet are on its ramp.
        return [{y:Math.max(ship.depth+.1,pose.y),draw:()=>{
            global.RavokK7Animation.draw(config.context,pose);
        }}];
    }
    function wrap(g,text,width){
        const rows=[];let row='';
        for(const word of text.split(/\s+/)){
            const candidate=row?row+' '+word:word;
            if(row&&g.measureText(candidate).width>width){rows.push(row);row=word;}else row=candidate;
        }if(row)rows.push(row);return rows;
    }
    function drawOverlay(g){
        if(exit?.phase==='LOOK'){
            g.save();g.globalAlpha=Math.sin(Math.min(1,exit.time/.8)*Math.PI)*.75;g.fillStyle='#e0c47c';
            for(let i=0;i<8;i++)g.fillRect(337+i*3,94+(i%2),2,2);g.restore();
        }
        const d=dialogue();if(!d)return;
        g.save();g.imageSmoothingEnabled=false;g.textAlign='left';
        if(d.type==='DIALOGUE'){
            g.fillStyle='rgba(9,19,32,.96)';g.fillRect(16,192,418,96);
            const accent=d.speaker==='RAVOK'?'#cc8da8':d.speaker==='K7'?'#93cdbd':'#e3d69d';
            g.fillStyle=accent;g.fillRect(16,192,3,96);g.font='bold 9px monospace';g.fillText(d.speaker,29,207);
            g.font='10px monospace';g.fillStyle='#e8e5d5';wrap(g,d.text,390).forEach((row,i)=>g.fillText(row,29,225+i*13));
            g.font='7px monospace';g.fillStyle='#9bb8b4';g.textAlign='right';g.fillText('[ESPAÇO] CONTINUAR',421,279);
        }else{
            g.fillStyle='rgba(9,19,32,.98)';g.fillRect(83,143,284,145);g.strokeStyle='#8a6f85';g.lineWidth=1;g.strokeRect(85.5,145.5,279,140);
            g.textAlign='center';g.fillStyle='#e6debf';g.font='bold 12px monospace';g.fillText(d.type==='CONFIRM'?'CONFIRMAR?':'AJUDAR RAVOK?',225,166);
            if(d.type==='CONFIRM'){
                g.font='9px monospace';g.fillStyle='#cfb7be';wrap(g,'Esta decisão encerrará sua jornada na Terra.',250).forEach((row,i)=>g.fillText(row,225,184+i*12));
            }
            const firstY=d.type==='CONFIRM'?218:205;
            for(let i=0;i<2;i++){
                if(d.selected===i){g.fillStyle='#304755';g.fillRect(104,firstY-12+i*24,242,20);}
                g.font='bold 11px monospace';g.fillStyle=d.selected===i?'#f1e6bd':'#9aadb1';g.fillText((d.selected===i?'> ':'')+(i?'NÃO':'SIM'),225,firstY+i*24);
            }
            g.font='7px monospace';g.fillStyle='#9bb8b4';g.fillText('[W/S / SETAS] ESCOLHER  [E / ESPAÇO] CONFIRMAR',225,278);
            if(d.error){g.font='8px monospace';g.fillStyle='#e6ba9c';g.fillText(d.error,225,132);}
        }g.restore();
    }
    global.RavokEvent=Object.freeze({scene:SCENE,storageKey:STORAGE_KEY,arrivalMedals:ARRIVAL_MEDALS,
        get arrived(){return landed();},
        get ravokArrivalSeen(){return ravokArrivalSeen;},
        get eligible(){return eligible();},
        get ravokExited(){return ravokExited;},
        get ravokChoice(){return ravokChoice;},
        get choicePosition(){return ravokChoicePosition?[...ravokChoicePosition]:null;},
        get endingCompleted(){return ravokEndingCompleted;},
        get ravokArrested(){return ravokArrested;},
        completeArrest(){
            if(!eligible()||ravokChoice!=='refuse'||ravokArrested)return false;
            ravokArrested=true;
            if(!persist()){ravokArrested=false;return false;}return true;
        },
        get ravokBadEndingSeen(){return ravokBadEndingSeen;},
        get badEndingCardReady(){return ravokBadEndingCardReady;},
        prepareBadEndingCard(){
            if(!eligible()||ravokChoice!=='accept'||ravokEndingCompleted)return false;
            if(ravokBadEndingCardReady)return true;
            ravokBadEndingCardReady=true;
            if(!persist()){ravokBadEndingCardReady=false;return false;}return true;
        },
        completeEnding(route){
            if(route!=='accept'||!eligible()||ravokChoice!==route||ravokEndingCompleted||!ravokBadEndingCardReady)return false;
            ravokEndingCompleted=true;if(route==='accept')ravokBadEndingSeen=true;
            if(!persist()){ravokEndingCompleted=false;if(route==='accept')ravokBadEndingSeen=false;return false;}return true;
        },
        get arrivalPending(){return ravokArrivalPending&&count>=ARRIVAL_MEDALS;},
        queueArrival(){
            if(ravokArrivalSeen||ravokArrivalPending)return false;
            sync();if(count!==4)return false;
            ravokArrivalPending=true;persist();return true;
        },
        completeArrival(){
            if(!ravokArrivalPending)return false;
            const wasArrived=arrived;
            ravokArrivalSeen=true;ravokArrivalPending=false;arrived=true;
            if(!persist()){ravokArrivalSeen=false;ravokArrivalPending=true;arrived=wasArrived;return false;}
            sync();return true;
        },
        get conversationActive(){return !!conversation;},
        get exitActive(){return !!exit;},
        init(options){config=options;},
        npcs,ship,sync,isNpcVisible,interact,blocks,drawGround,drawShip,draw,drawOverlay,actors,dialogue,handleKeyDown,handleKeyUp,updateConversation,
        releaseAll(){held.clear();if(conversation)config.clearInput();},
        snapshot:()=>({state:state(),medals:count,arrived:landed(),ravokArrivalSeen,ravokArrivalPending,ravokAvailable:eligible()&&ravokExited&&!ravokEndingCompleted,
            ravokExited,ravokProposalSeen,ravokChoice,ravokChoicePosition:ravokChoicePosition?[...ravokChoicePosition]:null,ravokEndingCompleted,ravokBadEndingCardReady,ravokBadEndingSeen,ravokArrested,exit:exit?{...exit,pose:exitPose()}:null,
            metK7,metRavok,k7Line,preludeSeen,conversation:dialogue(),
            npcs:npcs.filter(isNpcVisible).map(n=>({id:n.id,x:n.x,y:n.y,height:n.tamanho,source:n.spriteGeometry.source,
                crop:n.spriteGeometry.crop,scale:n.tamanho/n.spriteGeometry.visibleHeight,footprint:n.footprint||null})),
            assetErrors:[...assetErrors]})});
    // Immediate award hook, including results earned away from the climbing island.
    global.addEventListener?.('festival:medal-unlocked',sync);
    global.addEventListener?.('DOMContentLoaded',sync,{once:true});
})(window);
