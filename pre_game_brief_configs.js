/* Short, factual briefing data shared by every competition. */
(function(root){
    'use strict';
    const control=(keys,action)=>Object.freeze({keys,action});
    const brief=data=>Object.freeze({...data,controls:Object.freeze(data.controls)});
    const configs=Object.freeze({
        pingpong:brief({id:'pingpong',title:'PING-PONG',subtitle:'Não deixe a bola passar!',
            objective:'Seja o primeiro a alcançar 50 pontos.',
            controls:[
                control('W / S','Alinhar acima / abaixo'),
                control('A / D','Recuar / avançar; rebate automático'),
                control('ESPAÇO','Raquetada global com a barra cheia')
            ],
            tip:'MULTIBALL cria caos; o especial rebate todas as bolas.',accent:'#69d9d2',icon:'pingpong'}),
        basketball:brief({id:'basketball',title:'BASQUETE 1v1',subtitle:'Marque mais que o Mestre.',
            objective:'Faça mais pontos antes do tempo acabar.',
            controls:[
                control('A / D','Mover; toque duplo executa dash'),
                control('W','Pular'),
                control('J · K · L','Arremesso/roubo · finta/defesa · especial')
            ],
            tip:'Atrás da linha vale 3. Swoosh ganha feedback especial.',accent:'#f2a33c',icon:'basketball'}),
        marathon:brief({id:'marathon',title:'MARATONA',subtitle:'Três voltas. Um vencedor.',
            objective:'Complete 3 voltas e cruze a chegada em primeiro.',
            controls:[
                control('WASD','Movimento livre na pista'),
                control('SETAS','Alternativa para movimentar'),
                control('ESPAÇO','Pular barreiras')
            ],
            tip:'Desvie dos obstáculos e mantenha a melhor linha.',accent:'#65e7ff',icon:'marathon'}),
        skate:brief({id:'skate',title:'SKATE',subtitle:'Um botão. Vários contextos.',controlGuide:'skate',
            objective:'Complete o percurso e cruze a chegada.',
            controls:[
                control('TOQUE','SPACE no chão: salto; 2 toques: Ollie'),
                control('SEGURE','SPACE na rampa, grind e Mega Air'),
                control('SOLTE','SPACE no grind: saltar para fora')
            ],
            tip:'Todas as rampas usam a mesma regra: segure ESPAÇO.',accent:'#ed6ed3',icon:'skate'}),
        archery:brief({id:'archery',title:'ARQUEARIA',subtitle:'Precisão vale mais que velocidade.',
            objective:'Faça mais pontos que o Mestre antes do tempo acabar.',
            controls:[
                control('WASD','Mover dentro da área de tiro'),
                control('ESPAÇO','Disparar uma flecha')
            ],
            tip:'Alvos pequenos valem mais. Explosivos acertam vários.',accent:'#72d47e',icon:'archery'}),
        climbing:brief({id:'climbing',title:'ESCALADA',subtitle:'Encontre seu caminho até o cume.',
            objective:'Suba a montanha e alcance fisicamente o topo.',
            controls:[
                control('A / D','Controlar o salto no ar'),
                control('W / ESPAÇO','Saltar: um toque por salto'),
                control('AUTOMÁTICO','Agarrar um apoio válido')
            ],
            tip:'Há várias rotas. Checkpoints são pontos de descanso.',accent:'#9bc9e8',icon:'climbing'}),
        boxing:brief({id:'boxing',title:'BOXE',subtitle:'Melhor de três. Controle a distância.',
            objective:'Vença 2 rounds de até 40 segundos. Máximo: 3 rounds.',
            controls:[
                control('A/D W/S','Mover / profundidade.'),
                control('J / K / L','Soco fraco / forte / finta.'),
                control('SHIFT SPACE','Guarda / esquiva. O: especial.')
            ],
            tip:'Mestre contra-ataca. Finte e saia da linha do Titan.',accent:'#ef6d63',icon:'boxing'}),
        surf:brief({id:'surf',title:'SURF',subtitle:'Não deixe a onda alcançar você.',
            objective:'Complete o percurso sem sofrer wipeout.',
            controls:[
                control('ESPAÇO / W','Segure para subir; solte para descer'),
                control('AR: SPACE','Sustentar a trajetória'),
                control('AR: WASD','Executar manobras')
            ],
            tip:'Ganhe velocidade na onda e escape da whitewater.',accent:'#54dccc',icon:'surf'})
    });
    if(typeof module==='object'&&module.exports)module.exports=configs;
    if(root)root.PreGameBriefConfigs=configs;
})(typeof globalThis==='object'?globalThis:this);
