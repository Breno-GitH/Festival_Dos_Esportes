/* O registro oficial é a única fonte das medalhas; este módulo guarda apenas a narrativa. */
(function (global) {
    'use strict';
    const overworld = new Set(['HUB', 'ILHA_ESQUI', 'ILHA_PINGPONG', 'ILHA_SKATE',
        'ILHA_BASQUETE', 'ILHA_ARCO', 'ILHA_CORRIDA', 'ILHA_ESCALADA', 'ILHA_SURF']);
    // Alguns resultados limpam keys.space antes do keyup físico. Não reutilizar esse toque.
    const held = new Set();
    global.addEventListener('keydown', e => held.add(e.key.toLowerCase()), true);
    global.addEventListener('keyup', e => held.delete(e.key.toLowerCase()), true);
    global.addEventListener('blur', () => held.clear());
    const celebration = ['CONSEGUI!', 'As oito medalhas!', 'Eu realmente consegui...'];
    const call = [
        ['ZORPZIN NONARIS', 'Missão concluída.'],
        ['ZORPZIN NONARIS', 'Consegui as oito medalhas da Terra!'],
        ['ZORPZIN NONARIS', 'Estou voltando para casa.'],
        ['COMUNICADOR · CASA', 'Recebido, Zorpzin Nonaris.'],
        ['COMUNICADOR · CASA', 'Estaremos esperando.']
    ];
    const event = {
        active: false, state: 'IDLE', line: 0, config: null,
        readySince: null, readyScene: null, stateSince: 0,
        init(config) { this.config = config; },
        hasAllMedals() {
            return global.MEDALHAS_REGISTRY.length === 8 &&
                global.MEDALHAS_REGISTRY.every(m => global.isMedalhaDesbloqueada(m.id));
        },
        begin() {
            if (this.active || !this.hasAllMedals() || AdventureIntro.homeCallSeen) return false;
            this.active = true; this.setState('ALL_MEDALS_COMPLETE'); this.config.clearInput();
            this.config.faceForward();
            return true;
        },
        setState(state) { this.state = state; this.line = 0; this.stateSince = performance.now(); },
        update(scene) {
            if (this.active) {
                if (this.state === 'CALLING' && performance.now() - this.stateSince >= 2800) this.setState('CONNECTED');
                return true;
            }
            const complete = this.hasAllMedals();
            if (AdventureIntro.allMedalsComplete !== complete) {
                AdventureIntro.allMedalsComplete = complete; AdventureIntro.persist();
            }
            if (!complete || AdventureIntro.homeCallSeen || AdventureIntro.endingSeen || !overworld.has(scene)) {
                this.readySince = null; this.readyScene = null; return false;
            }
            // Não interrompe resultado, entrega da medalha ou tecla ainda segurada na saída.
            if (this.readyScene !== scene || held.has(' ') || held.has('e') || this.config.interactionHeld()) {
                this.readyScene = scene; this.readySince = performance.now(); return false;
            }
            if (this.readySince === null) this.readySince = performance.now();
            if (performance.now() - this.readySince < 800) return false;
            return this.begin();
        },
        handleKeyDown(e) {
            if (!this.active) return false;
            if (!e.ctrlKey && !e.metaKey && [' ', 'w', 'a', 's', 'd', 'e', 'Enter'].includes(e.key)) e.preventDefault();
            if (e.key !== ' ' || e.repeat) return true;
            if (this.state === 'ALL_MEDALS_COMPLETE') {
                if (++this.line >= celebration.length) this.setState('CALLING');
            } else if (this.state === 'CONNECTED') this.setState('HOME_CALL');
            else if (this.state === 'HOME_CALL') {
                if (++this.line >= call.length) this.setState('RETURN_TO_SHIP');
            } else if (this.state === 'RETURN_TO_SHIP') {
                AdventureIntro.homeCallSeen = true; AdventureIntro.persist();
                this.active = false; this.setState('COMPLETE'); this.config.clearInput();
            }
            return true;
        },
        message() {
            if (this.state === 'ALL_MEDALS_COMPLETE') return ['ZORPZIN NONARIS', celebration[this.line]];
            if (this.state === 'CONNECTED') return ['COMUNICADOR', 'Sinal estabelecido.'];
            if (this.state === 'HOME_CALL') return call[this.line];
            return ['ZORPZIN NONARIS', 'Hora de voltar para a nave. Volte à ilha central.'];
        },
        draw(ctx) {
            if (!this.active) return;
            const {player} = this.config, t = (performance.now() - this.stateSince) / 1000;
            ctx.save(); ctx.fillStyle = 'rgba(5,17,32,.3)';ctx.fillRect(0,0,450,300);
            // O corpo fica no mesmo ponto da ilha; nenhum deslocamento narrativo é aplicado.
            this.config.drawActor();
            if (this.state === 'ALL_MEDALS_COMPLETE') {
                for(let i=0;i<12;i++) {
                    const a=i*Math.PI/6+t*0.45, r=28+Math.sin(t*3+i)*3;
                    ctx.fillStyle=i%2?'#f6d57e':'#9ae9d5';
                    ctx.fillRect(player.x+Math.cos(a)*r,player.y-24+Math.sin(a)*r,2,2);
                }
            } else {
                const x=Math.min(430,player.x+13), y=player.y-23;
                ctx.fillStyle='#0d243b';ctx.strokeStyle='#99ebda';ctx.lineWidth=1;
                ctx.fillRect(x-4,y-7,9,14);ctx.strokeRect(x-4,y-7,9,14);
                ctx.fillStyle='#73eedc';ctx.fillRect(x-2,y-4,5,7);
                const px=Math.max(14,Math.min(266,player.x<225?player.x+30:player.x-180)),py=35;
                ctx.fillStyle='rgba(8,44,59,.94)';ctx.fillRect(px,py,170,79);
                ctx.strokeStyle='#68cfc8';ctx.strokeRect(px+.5,py+.5,169,78);
                ctx.fillStyle='#7dd8c7';ctx.font='8px monospace';ctx.textAlign='center';
                ctx.fillText('CANAL INTERESTELAR',px+85,py+16);
                ctx.fillStyle='#d4fff3';ctx.font='bold 12px monospace';
                if(this.state==='CALLING') {
                    const word='CHAMANDO'+'.'.repeat(1+Math.floor(t/0.45)%3);
                    const w=ctx.measureText(word).width, start=px+85-w/2;ctx.textAlign='left';
                    let offset=0;
                    for(let i=0;i<word.length;i++) {
                        const bounce=Math.max(0,Math.sin(t*6-i*.6))*2.5;
                        ctx.fillText(word[i],start+offset,py+44-bounce);offset+=ctx.measureText(word[i]).width;
                    }
                } else {ctx.font='bold 10px monospace';ctx.fillText('SINAL ESTABELECIDO',px+85,py+43);}
                ctx.strokeStyle='rgba(110,228,211,.25)';ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(px+85,py+79);ctx.stroke();
                for(let i=0;i<7;i++){ctx.fillStyle=i/7<Math.min(1,t/2.8)?'#71d9c3':'#254a57';ctx.fillRect(px+37+i*14,py+60,9,3);}
            }
            if(this.state!=='CALLING') {
                const [speaker,text]=this.message();
                ctx.fillStyle='rgba(6,20,36,.97)';ctx.fillRect(18,218,414,69);
                ctx.strokeStyle='#7accca';ctx.strokeRect(18.5,218.5,413,68);
                ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=speaker.includes('CASA')?'#8de6ef':'#a2f0bd';ctx.font='bold 9px monospace';
                ctx.fillText(speaker,29,227);ctx.fillStyle='#eef4ec';ctx.font='11px monospace';
                let row='',y=244;
                for(const word of text.split(' ')) {
                    const candidate=row?row+' '+word:word;
                    if(ctx.measureText(candidate).width>386 && row){ctx.fillText(row,29,y);y+=14;row=word;}else row=candidate;
                }
                ctx.fillText(row,29,y);ctx.textAlign='right';ctx.fillStyle='#a7bac6';ctx.font='8px monospace';ctx.fillText('[SPACE] CONTINUAR',419,275);
            }
            ctx.restore();
        },
        drawObjective(ctx, scene) {
            if (this.active || !AdventureIntro.homeCallSeen || !this.hasAllMedals() || !overworld.has(scene)) return;
            // Longe do rodapé: caixas de conversa e dicas HTML ocupam essa região.
            ctx.save();ctx.fillStyle='rgba(6,24,37,.94)';ctx.fillRect(288,31,156,25);
            ctx.fillStyle='#8cafa9';ctx.font='6px monospace';ctx.textAlign='left';
            ctx.fillText('PRÓXIMO OBJETIVO',296,39);
            ctx.fillStyle='#a9ecda';ctx.font='bold 8px monospace';
            ctx.fillText(scene==='HUB'?'VOLTE À NAVE':'VOLTE À ILHA CENTRAL',296,50);ctx.restore();
        },
        snapshot() {return {active:this.active,state:this.state,line:this.line,allMedalsComplete:AdventureIntro.allMedalsComplete,homeCallSeen:AdventureIntro.homeCallSeen};}
    };
    global.MedalCompletion=event;
})(window);
