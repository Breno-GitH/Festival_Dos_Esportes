/* Missões de quatro NPCs existentes. Nenhuma regra de combate ou pontuação é alterada. */
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
    ]);
    let boxingAttempt = false;
    const wallet = global.FestivalWallet;
    global.FestivalChallenges = Object.freeze({
        definitions,
        interact(npc) {
            const quest = definitions.find(q => q.npc === npc.id);
            if (!quest) return null;
            let state = wallet.getChallenge(quest.id);
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
            return say(quest.offer);
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
})(window);
