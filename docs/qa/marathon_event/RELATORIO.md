# Maratona — evento oficial de três voltas

## Auditoria e escopo

- Cena: `JOGO_CORRIDA`, implementada por `corrida_maratona.js`. A base oval, os oito corredores, os sprites, as velocidades e os perfis de IA foram mantidos.
- A versão anterior possuía duas voltas, oito portões validados por proximidade de 105 px e término decidido dentro do laço de corredores. Isso permitia contabilizar antes do cruzamento e podia favorecer a ordem de atualização em uma chegada apertada.
- A medalha já dependia de primeiro lugar. Essa condição permanece.
- O módulo ativo não continha arremesso dedicado do Mestre nem drafting. Para atender ao comportamento pedido do Mestre, foram integrados objetos físicos e bump com cooldown. Um sistema novo de drafting não foi introduzido.

## Voltas, sensores e classificação

- Exatamente **3 voltas completas**, para Zorp, Mestre e os seis adversários.
- **3 checkpoints intermediários** mais a linha compartilhada de largada/chegada. Sequência obrigatória: START → CP1 → CP2 → CP3 → FINISH.
- A primeira passagem pela linha apenas arma a primeira volta; não aumenta o número de voltas concluídas.
- CP1 fica na primeira curva, CP2 na reta oposta, CP3 na segunda curva. São sensores invisíveis atravessando somente a largura útil da pista.
- O segmento entre a posição anterior e a atual dos pés é testado contra o plano orientado do sensor. O contato deve ficar dentro da pista e ocorrer para a frente. Proximidade da linha, distância acumulada, ficar parado e cruzamento para trás não contam.
- A contagem não usa um limite de distância acumulada. A projeção no oval serve para orientação e progresso dentro do setor validado.
- O percurso entre posições também é verificado. Um corte pelo gramado congela a validação até o retorno à marca amarela, pouco antes da saída do traçado. O personagem continua se movendo com a desaceleração de terreno existente, sem teleporte.
- Voltas, checkpoints, progresso de setor e finishTime pertencem a cada corredor. Todos passam pela mesma função de validação.
- Classificação durante a prova: voltas concluídas → checkpoint confirmado → fração do trecho. Após a chegada, vale finishTime.
- O tempo de chegada inclui a fração exata do passo em que a linha foi cruzada. Todos os corredores do passo são processados antes de ordenar os finalistas.
- Após Zorp terminar, os demais continuam até haver três finalistas ou até oito segundos de apuração. Os que ainda estiverem correndo aparecem como EM PISTA, sem tempo final inventado.
- A física agora avança em passos fixos de 60 Hz; o desenho continua independente. A projeção da pista foi tornada analítica para evitar saltos nas emendas entre reta e curva.

### Localização dos sensores no mundo

- FINISH: x=-950.00, y=470.00; abertura ±125 px; direção (1.00, 0.00).
- CP1: x=1420.00, y=0.00; abertura ±125 px; direção (0.00, -1.00).
- CP2: x=-0.00, y=-470.00; abertura ±125 px; direção (-1.00, 0.00).
- CP3: x=-1420.00, y=-0.00; abertura ±125 px; direção (0.00, 1.00).

## Apresentação do evento

- Pintura terracota em oito raias, bordas claras, chegada quadriculada, números de raia e marcações de largada.
- Arquibancadas em 16 seções, com quatro fileiras cada; bandeiras, banners do festival, postes de iluminação, mesa de oficiais, câmera, caixas de equipamento e painel de cronometragem próximo da chegada.
- Decoração concentrada fora da pista, com chão estático pré-renderizado e reutilizado. O cache do chão foi construído uma vez durante o teste.
- HUD com posição, VOLTA 1/3–3/3, setores confirmados, tempo de corrida e mapa oval com os competidores.
- Feedback breve de VOLTA 2/3, ÚLTIMA VOLTA e chegada. Sinais sonoros sintetizados localmente, sem dependências externas.
- Câmera fixa em orientação, com zoom uniforme 0,72 e antecipação suave que considera a continuação da curva. Não há corte de um lado do oval para outro.
- Sombras pixeladas nos pés, desenho dos corredores por Y e escala uniforme de sprites com o anchor corrigido pelo pad de sete pixels do atlas.
- Briefing e instrução de reserva atualizados para três voltas; controles multidirecionais e Space para pular permanecem.

## Torcida

- 512 espectadores: 343 humanos e 169 aliens; nenhuma nova criatura aleatória.
- Cada aparência é gerada ao iniciar a prova e permanece fixa: pele, cabelo, roupas, antenas, postura, posição e ritmo.
- Idle com palmas, braços, pequenas poses e bandeiras; reação local à passagem dos corredores.
- Reações ligadas a ultrapassagem, liderança, nova volta, última volta e chegada de Zorp. A última volta aumenta apenas a apresentação.
- No teste final, as amostras desenharam até 64 espectadores próximos da câmera; os demais ficam fora do desenho.

## Obstáculos e adversários

- Trecho A: barreiras. Trecho B: cones. Trecho C: poças e objetos leves. Trecho D: obstáculos móveis.
- Volta 1 apresenta os distritos; volta 2 combina mais posições; volta 3 acrescenta barreira e poça adicionais. Os últimos 10% permanecem livres de obstáculos pesados.
- Móveis patrulham trajetórias locais previsíveis, mantendo sua identidade de trecho. Existem caminhos livres entre os bloqueios.
- Doze pombos decorativos permanecem nas bordas e no miolo. Levantam voo ao perceber corredores próximos e não causam colisão nem uma sobreposição de pássaros sobre o HUD.
- Os oito corredores são Zorp, Mestre, Cobalto, Ferrugem, Lina, Kai, Axol e Nox. Mantêm velocidades distintas, ultrapassagens, disputa lateral, erros, salto e contato físico.
- Mestre: arremessos com intervalo mínimo de 6,5 s e bump com intervalo de 4,8 s. A seleção considera corredores à frente e alinhados, sem prioridade exclusiva para Zorp.
- Objetos percorrem uma trajetória física sem seguir o alvo. A colisão contínua escolhe o primeiro corredor válido; outro adversário também pode ser atingido. IAs podem perceber e evitar os objetos.
- Teste controlado confirmou um objeto atingindo Cobalto. Na corrida final, o Mestre também escolheu Cobalto e Lina e aplicou bump em Nox.

## QA no navegador

Chrome real, em perfil isolado, usando os arquivos integrados ao projeto e um servidor HTTP local. Os controladores de teste fornecem movimento e salto; não atribuem voltas, posições finais ou medalhas. O save pessoal não foi usado.

- Corrida competente: primeiro lugar em **60.533 s**; três voltas; medalha concedida; retorno a ILHA_CORRIDA.
- Corrida com pausas deliberadas: **8º lugar em 78.619 s**; três voltas; nenhuma medalha; retorno a ILHA_CORRIDA.
- Cruzamento da volta 1: 20.109612 s.
- Cruzamento da volta 2: 39.973598 s.
- Cruzamento da volta 3: 60.533347 s.

### Proteções verificadas

- A: cruzar a linha e voltar para trás — nenhuma volta falsa.
- B: repetir movimento perto da linha — nenhuma volta falsa.
- C: cortar metade do oval pelo gramado — nenhum checkpoint ou volta concedido; recuperação indicada.
- D: CP1 e retorno — não completa volta.
- E: CP1 → CP2 → CP3 → FINISH — exatamente uma volta.
- CP3 isolado, travessia reversa, abertura fora da pista, primeira passagem e repetição de estado também rejeitados.
- Os oito corredores completaram fisicamente nove checkpoints e três chegadas na auditoria de simulação; nenhum recebeu volta por distância.
- Chegada apertada no mesmo passo usa o tempo de contato e mantém a regra da medalha.
- Fluxo de vitória, derrota, briefing pausado e retorno ao Overworld aprovados.
- **25 testes automatizados aprovados**, incluindo corridas completas com atualizações a 30, 60 e 144 FPS.
- Desempenho observado: **60.00 FPS**, medidos em 180 quadros durante gameplay.
- Erros de execução/console: 0. HTTP ≥400: 0. Falhas de carregamento não canceladas: 0.
- A amostra de FPS é local ao navegador de QA; não representa medição em todos os dispositivos.

## Arquivos desta etapa

- `corrida_maratona.js`: integração da prova, projeção, câmera, classificação e acabamento.
- `race_lap_system.js`: sensores direcionais, checkpoints, validação de trajeto e finishTime.
- `race_event_presentation.js`: cenário, torcida, HUD, áudio e efeitos leves.
- `race_rival_events.js`: bump, objetos físicos e cooldowns do Mestre.
- `pre_game_brief_configs.js`: apenas os textos da Maratona.
- `index.html`: carregamento dos módulos e versões do cache.
- `race_event.test.cjs` e `race_test_harness.cjs`: testes e simulação.
- `docs/qa/marathon_event/`: relatório, registros JSON, TAP e capturas.
