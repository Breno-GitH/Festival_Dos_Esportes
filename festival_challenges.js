/* One principal side quest per sport. Gameplay reports facts; only NPCs pay rewards. */
(function (global) {
    'use strict';
    const definitions = Object.freeze([
        Object.freeze({id:'guia_boas_vindas', npc:'guia_festival', speaker:'GUIA', amount:10, type:'dialogue',
            offer:'Explore as pontes e conheça as oito modalidades. Leve 10 moedas para começar sua aventura!',
            thanks:'Aproveite a viagem! As moedas de boas-vindas já são suas.'}),
        Object.freeze({id:'boxe_sem_quedas', npc:'pugilista_apostador', speaker:'PUGILISTA/APOSTADOR', amount:40, type:'boxing',
            offer:'Ganhe do Mestre do Boxe sem cair nenhuma vez. Valendo 40 moedas! Depois da vitória, volte aqui para buscar sua recompensa.',
            thanks:'Aposta paga! Você venceu sem cair. Essas 40 moedas já são suas.'}),
        Object.freeze({id:'pingpong_medalha', npc:'aprendiz_pingpong', speaker:'APRENDIZ', amount:25, type:'medal', medal:'pingpong',
            offer:'Eu não fiz um ponto contra esse vovô... Conquiste a medalha do Ping-Pong e volte aqui. Quero ver como se faz! Pago 25 moedas.',
            thanks:'Já paguei suas 25 moedas. Agora preciso treinar para conseguir um ponto!'}),
        Object.freeze({id:'escalada_medalha', npc:'geologa_escalada', speaker:'GEÓLOGA', amount:25, type:'medal', medal:'escalada',
            offer:'As pedras azuis deslizam e as vermelhas racham. Conquiste a medalha da Escalada e volte para me contar. Tenho 25 moedas para você.',
            thanks:'Sua recompensa da expedição já foi entregue. Bela escalada!'})
        ,Object.freeze({id:'basquete_foto_ano',npc:'fotografa_basquete',speaker:'FOTÓGRAFA ESPORTIVA',amount:30,type:'basket',medal:'basquete',
            offer:'A FOTO DO ANO: marque uma cesta de 3 nos últimos 10 segundos contra o Mestre. Não precisa vencer! Depois volte aqui para receber 30 moedas.',
            thanks:'A foto já está na capa do festival! Suas 30 moedas foram entregues.'}),
        Object.freeze({id:'corrida_volta_limpa',npc:'treinador_corrida',speaker:'TREINADOR',amount:25,type:'running',medal:'corrida',
            offer:'VOLTA LIMPA: complete uma volta real, pelos três checkpoints e pela chegada, sem sofrer penalidade de obstáculo. Volte para receber 25 moedas.',
            thanks:'Uma volta limpa exige cabeça e pernas! Suas 25 moedas já foram entregues.'}),
        Object.freeze({id:'skate_uma_tomada',npc:'cinegrafista_skate',speaker:'CINEGRAFISTA',amount:30,type:'skate',medal:'skate',
            offer:'UMA TOMADA SÓ: faça um grind válido, depois uma manobra aérea e aterrisse GOOD ou PERFECT, sem cair entre as ações. Traga essa linha para receber 30 moedas.',
            thanks:'Gravei a linha inteira, sem cortes! As 30 moedas já são suas.'}),
        Object.freeze({id:'arco_tres_vento',npc:'naturalista_arco',speaker:'NATURALISTA',amount:30,type:'archery',medal:'arco',
            offer:'TRÊS NO VENTO: acerte diretamente três alvos de pássaros na mesma partida, sem errar flechas miradas neles entre os acertos. Só os alvos! Volte para receber 30 moedas.',
            thanks:'Precisão e respeito aos pássaros. Suas 30 moedas já foram entregues.'}),
        Object.freeze({id:'surf_contra_corrente',npc:'salva_vidas_surf',speaker:'SALVA-VIDAS',amount:30,type:'surf',medal:'surf',
            offer:'CONTRA A CORRENTE: alcance 60% do percurso em uma run sem ser capturado pela espuma nem entrar no tubo de resgate. Volte à praia para receber 30 moedas.',
            thanks:'Você manteve distância da correnteza. As 30 moedas de recompensa já foram entregues.'})
    ]);
    const ids={basket:'basquete_foto_ano',running:'corrida_volta_limpa',skate:'skate_uma_tomada',archery:'arco_tres_vento',surf:'surf_contra_corrente'};
    const attempts={};
    function complete(type,evidence){return wallet.recordChallenge(ids[type],true,evidence);}
    function pending(type){const s=wallet.getChallenge(ids[type]);return s.accepted&&!s.completed;}
    let boxingAttempt = false;
    const wallet = global.FestivalWallet;
    global.FestivalChallenges = Object.freeze({
        definitions,
        start(type) {
            attempts[type]={enabled:pending(type),clean:true,started:false,grind:false,grindDistance:0,trick:false,
                birdStreak:0,shots:[],nextShot:0,lastLanding:null};
        },
        state(type){return wallet.getChallenge(ids[type]||type);},
        progress(type){return JSON.parse(JSON.stringify(attempts[type]||null));},
        onBasket({scorer,points,remaining}) {
            if(pending('basket')&&scorer==='zorp'&&points===3&&remaining>0&&remaining<=10)
                complete('basket',{type:'valid_basket',points,remaining});
        },
        onRunning(event) {
            const a=attempts.running;if(!a?.enabled)return;
            if(event.type==='OBSTACLE'){a.clean=false;return;}
            if(event.type==='START'){a.started=true;a.clean=true;return;}
            if(event.type==='LAP'){
                if(a.started&&a.clean)complete('running',{type:'validated_clean_lap',lap:event.lap,time:event.time});
                a.started=true;a.clean=true;
            }
        },
        onSkate(event) {
            const a=attempts.skate;if(!a?.enabled)return;
            if(event.type==='FALL'){a.grind=false;a.trick=false;a.grindDistance=0;return;}
            if(event.type==='GRIND_DISTANCE'){a.grindDistance+=Math.max(0,event.distance||0);if(a.grindDistance>=12)a.grind=true;}
            if(event.type==='TRICK'&&a.grind&&event.airborne)a.trick=true;
            if(event.type==='LAND'){
                a.lastLanding=event.quality;
                if(a.grind&&a.trick&&['GOOD','PERFECT'].includes(event.quality))
                    complete('skate',{type:'one_take',quality:event.quality,grindDistance:a.grindDistance});
                a.trick=false;
            }
        },
        onArcheryShot(arrow,targets) {
            const a=attempts.archery;if(!a?.enabled||arrow.owner!=='PLAYER')return;
            // Quest intent only: project the released direction against the currently visible
            // hanging disk and its measured velocity. This never steers an arrow or awards a hit.
            let aimed=null,best=Infinity;
            for(const t of targets){
                if(!t.active||!t.visible||t.carrier!=='BIRD')continue;
                const vx=t.x-(t.prevX??t.previousX??t.x),vy=t.y-(t.prevY??t.previousY??t.y);
                const rx=t.x+(t.hitOffsetX||0)-arrow.x,ry=t.y+(t.hitOffsetY||0)-arrow.y;
                const dx=arrow.speedX-vx,dy=arrow.speedY-vy,d2=dx*dx+dy*dy;
                const time=(rx*dx+ry*dy)/d2;
                if(time<0||time>150)continue;
                const distance=Math.hypot(rx-dx*time,ry-dy*time);
                if(distance<=t.radius+8&&time<best){aimed=t.id;best=time;}
            }
            const shot={id:++a.nextShot,intendedBird:aimed,resolved:false,birdHit:false};a.shots.push(shot);arrow.questShotId=shot.id;
        },
        onArcheryResolved(arrow,target=null) {
            const a=attempts.archery;if(!a?.enabled||arrow.owner!=='PLAYER')return;
            const shot=a.shots.find(s=>s.id===arrow.questShotId);if(!shot||shot.resolved)return;
            shot.resolved=true;shot.birdHit=target?.carrier==='BIRD';
            // Resolve in release order so differently sized flight paths cannot reorder a streak.
            while(a.shots[0]?.resolved){const s=a.shots.shift();
                if(s.birdHit)a.birdStreak++;
                else if(s.intendedBird!==null)a.birdStreak=0;
                if(a.birdStreak>=3)complete('archery',{type:'three_direct_bird_disks',hits:a.birdStreak});
            }
        },
        onSurf({progress,state,tubeCapture}) {
            const a=attempts.surf;if(!a?.enabled)return;
            if(tubeCapture||state==='TUBE_CAPTURE'||state==='CAUGHT')a.clean=false;
            if(a.clean&&progress>=.60)complete('surf',{type:'clean_current',progress});
        },
        interact(npc) {
            const quest = definitions.find(q => q.npc === npc.id);
            if (!quest) return null;
            let state = wallet.getChallenge(quest.id);
            const wasAccepted=state.accepted;
            const say = text => '> '+quest.speaker+': '+text;
            if (state.claimed) return say(quest.thanks);
            wallet.acceptChallenge(quest.id);
            if (quest.type === 'dialogue') {
                wallet.recordChallenge(quest.id, true, {type:'dialogue', npc:npc.id});
            } else if (quest.type === 'medal' && global.isMedalhaDesbloqueada(quest.medal)) {
                wallet.recordChallenge(quest.id, true, {type:'medal', medal:quest.medal});
            }
            state = wallet.getChallenge(quest.id);
            if (state.completed) {
                const amount = wallet.claimChallenge(quest.id, quest.amount);
                return say(amount ? (quest.type === 'dialogue' ? quest.offer+' ' : 'Desafio cumprido! ')+
                    '+'+amount+' moedas recebidas.' : 'Sua recompensa está pronta. Volte para recebê-la.');
            }
            const medalNote=quest.type!=='medal'&&quest.medal&&global.isMedalhaDesbloqueada(quest.medal)
                ? 'Você já provou seu valor ao Mestre. Agora vamos registrar outra conquista! ' : '';
            return say((wasAccepted?'Missão em andamento. ':'')+medalNote+quest.offer);
        },
        onBoxingStart() {
            const state = wallet.getChallenge('boxe_sem_quedas');
            boxingAttempt = state.accepted && !state.completed;
        },
        onBoxingResult(winner, knockdowns) {
            if (!boxingAttempt) return;
            boxingAttempt = false;
            wallet.recordChallenge('boxe_sem_quedas', winner === 'zorp' && knockdowns === 0,
                {type:'boxing_result', winner, knockdowns});
        }
    });
    // Public names requested by the story, derived from the one canonical saved
    // wallet entry. Never store a second copy that could disagree after reload.
    for(const [name,type] of Object.entries({sideQuestBasketPhotoComplete:'basket',
        sideQuestRunningCleanLapComplete:'running',sideQuestSkateOneTakeComplete:'skate',
        sideQuestArcheryWindComplete:'archery',sideQuestSurfCurrentComplete:'surf'}))
        Object.defineProperty(global,name,{enumerable:true,get:()=>wallet.getChallenge(ids[type]).completed});
})(window);
