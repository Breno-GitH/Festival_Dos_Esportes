/* Acceptance closes a campaign; refusal resolves an event and returns to the same island. */
(function(global){
    'use strict';
    const routes=Object.freeze({accept:global.RavokBadEnding.shots,refuse:global.RavokArrest.shots});
    const held=new Set();
    let config=null,active=false,route=null,index=0,time=0,last=0,island=null,origin=null;
    let saveFailed=false,pendingSave=null;
    const shot=()=>routes[route]?.[index];
    const phase=()=>active?index>=routes[route].length?global.EndingCard.snapshot().state==='FADE_OUT'?'CARD_FADE_OUT':'CARD':shot()[0]:'INACTIVE';
    const film=()=>route==='accept'?global.RavokBadEnding:global.RavokArrest;
    function openCard(){
        global.EndingCard.show({id:global.RavokBadEnding.endingId,
            onContinue(){
                pendingSave='menu';const event=global.RavokEvent;
                if(!event.ravokBadEndingSeen&&!event.completeEnding('accept')){saveFailed=true;return false;}
                saveFailed=false;pendingSave=null;film().silence();config.clearInput();return true;
            },
            onClose(){active=false;island=null;held.clear();film().silence();config.clearInput();config.returnMenu();}
        });
    }
    function start(choice,reopenCard=false){
        const event=global.RavokEvent;event.sync();
        if(active||global.EndingCard.active||!config||config.busy()||!event.eligible||event.ravokChoice!==choice||
            event.ravokArrested||(event.endingCompleted&&!(choice==='accept'&&reopenCard))||!routes[choice])return false;
        island=config.captureIsland();const pos=event.choicePosition||[373,137];origin={x:pos[0],y:pos[1]};
        route=choice;index=choice==='accept'&&(event.badEndingCardReady||event.ravokBadEndingSeen)?routes.accept.length:0;
        time=0;last=performance.now();active=true;saveFailed=false;pendingSave=null;
        film().prepare({...config,island,origin,...(choice==='accept'?{home:config.captureHome(),caption}:{clearedIsland:config.captureIsland(true)})});
        film().enter(phase());config.clearInput();event.releaseAll();config.enter();if(index>=routes[route].length)openCard();return true;
    }
    function finish(){
        const event=global.RavokEvent;
        if(route==='refuse'){
            pendingSave='arrest';
            if(!event.completeArrest()){saveFailed=true;return;}
            saveFailed=false;pendingSave=null;active=false;island=null;film().silence();config.clearInput();
            event.releaseAll();config.resumeOverworld(origin);return;
        }
        pendingSave='card';
        if(!event.prepareBadEndingCard()){saveFailed=true;return;}
        index=routes.accept.length;time=0;saveFailed=false;pendingSave=null;config.clearInput();film().enter('CARD');openCard();
    }
    function next(){
        if(index===routes[route].length-1)finish();
        else{index++;time=0;film().enter(phase());}
    }
    function update(scene){
        if(!active){
            const event=global.RavokEvent;
            if(config&&!config.busy()&&(scene==='HUB'||scene.startsWith('ILHA_'))&&event.ravokChoice&&!event.ravokArrested){
                if(event.ravokChoice==='accept'&&event.endingCompleted){config.returnMenu();return true;}
                if(!event.endingCompleted)return start(event.ravokChoice);
            }return false;
        }
        const stamp=performance.now(),dt=document.hidden?0:Math.max(0,Math.min(.1,(stamp-last)/1000));last=stamp;time+=dt;
        if(document.hidden)film().pause();else film().resume();
        if(index>=routes[route].length){global.EndingCard.update();return true;}
        if(saveFailed)return true;
        const duration=shot()[1];if(duration!==null&&time>=duration)next();return true;
    }
    global.addEventListener('keydown',event=>{
        const key=event.key.toLowerCase(),wasHeld=held.has(key);held.add(key);if(!active)return;
        if(index>=routes[route].length){global.EndingCard.handleKeyDown(event);return;}
        event.preventDefault?.();event.stopImmediatePropagation?.();
        if(key===' '&&!wasHeld&&!event.repeat&&!document.hidden){
            if(saveFailed)finish();
            else if(shot()?.[1]===null&&time>=.45)next();
        }
    },true);
    global.addEventListener('keyup',event=>{held.delete(event.key.toLowerCase());if(active){event.preventDefault?.();event.stopImmediatePropagation?.();}},true);
    global.addEventListener('blur',()=>held.clear());
    function caption(g,speaker,text){
        g.fillStyle='rgba(9,19,32,.96)';g.fillRect(22,229,406,54);g.fillStyle='#b58a9e';g.fillRect(22,229,3,54);
        g.textAlign='left';g.font='bold 8px monospace';g.fillStyle='#cfa5b5';g.fillText(speaker,34,243);
        g.fillStyle='#e8e4d1';g.font='10px monospace';let row='',y=259;
        for(const word of text.split(/\s+/)){const n=row?row+' '+word:word;if(row&&g.measureText(n).width>382){g.fillText(row,34,y);y+=12;row=word;}else row=n;}if(row)g.fillText(row,34,y);
    }
    function draw(g){
        if(!active)return;
        if(index>=routes[route].length){global.EndingCard.draw(g);return;}
        g.save();g.imageSmoothingEnabled=false;const duration=shot()?.[1]||1,p=Math.max(0,Math.min(1,time/duration));
        film().draw(g,phase(),p,time);
        if(saveFailed){g.fillStyle='#0b1625';g.fillRect(25,225,400,58);g.fillStyle='#dec9b6';g.font='9px monospace';g.textAlign='center';g.fillText('Não foi possível salvar. A cena aguarda.',225,244);g.fillText('[ESPAÇO] TENTAR NOVAMENTE',225,266);}
        g.fillStyle='#030810';g.fillRect(0,0,450,12);g.fillRect(0,288,450,12);g.restore();
    }
    global.RavokOutcome=Object.freeze({init(options){config=options;},get active(){return active;},start,openSavedEnding:()=>start('accept',true),update,draw,
        snapshot:()=>({active,route,phase:phase(),time,completed:global.RavokEvent.endingCompleted,
            arrested:global.RavokEvent.ravokArrested,badEndingSeen:global.RavokEvent.ravokBadEndingSeen,
            cardReady:global.RavokEvent.badEndingCardReady,saveFailed,pendingSave,
            endingId:route==='accept'?global.RavokBadEnding.endingId:null,
            cardPresentation:{presented:global.EndingCard.snapshot().presented,visibleTime:global.EndingCard.snapshot().totalTime,inputLock:global.EndingCard.timing.inputLock,exitFade:global.EndingCard.snapshot().state==='FADE_OUT'?global.EndingCard.snapshot().elapsed:null,exitFadeDuration:global.EndingCard.timing.fadeOut},
            dialogue:active&&route==='refuse'&&shot()?.[2]?{speaker:shot()[2],text:shot()[3]}:null,
            waitingForSpace:active&&shot()?.[1]===null,origin:origin?{...origin}:null,
            duration:route?routes[route].reduce((sum,s)=>sum+(s[1]||0),0):0})});
})(window);
