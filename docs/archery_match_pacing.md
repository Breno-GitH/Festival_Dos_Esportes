# Arquearia — partida de 60 segundos e progressão em quatro fases

## Estrutura

A duração normal passou de 55 para 60 segundos: 3.600 atualizações na simulação existente de 60 Hz. O módulo `archery_match_pacing.js` concentra as fases, a ordem das ondas, a agenda dos pássaros, as oportunidades de dourado e a contagem visual.

As trajetórias, os discos de colisão, a pontuação de cada alvo, a explosão, os sprites, WASD e o disparo por toque de Espaço foram preservados. A preparação de Zorp continua curta, com intervalo de 0,5 s entre tiros.

### Fase 1 — 60 a 45 segundos restantes

- Alterna `OPENING_CURRENT` e `EASY_ARC`.
- Dois alvos por onda, grandes/médios, lentos ou médios.
- Intervalo mínimo de 210 atualizações entre ondas (~3,5 s), sujeito à disponibilidade do campo.
- Limite nominal de dois alvos de rio, com espaço para um pássaro ocasional.
- Primeira oportunidade aérea aos 9 segundos decorridos.
- Nenhum explosivo ou dourado novo nesta fase.

### Fase 2 — 45 a 30 segundos restantes

- Ordem: `JOINING_STREAMS → EXPLOSIVE_CONFLUENCE → GENTLE_WAVES`.
- Entradas por margens diferentes, trajetórias combinadas e velocidades médias.
- Primeiros explosivos integrados em grupos, em vez de um timer independente que podia ativá-los na introdução.
- Intervalo mínimo de 175 atualizações (~2,9 s); limite nominal de quatro oportunidades simultâneas.
- Oportunidades aéreas planejadas aos 18 e 25 segundos decorridos.

### Fase 3 — 30 a 15 segundos restantes

- Ordem: `COMBINED_CURRENTS → EXPLOSIVE_CONFLUENCE → FAST_CROSSING → ARC_AND_ELLIPSE`.
- Alvos rápidos, discos menores e combinações entre S, curvas, diagonais e arcos.
- Explosivos com vizinhos acessíveis e primeira oportunidade rara de dourado.
- Intervalo mínimo de 150 atualizações (~2,5 s); cinco espaços nominais para alvos de rio e reserva aérea até seis.
- Oportunidades aéreas aos 32 e 39 segundos decorridos.

### Fase 4 — últimos 15 segundos

- Ordem: `EXPLOSIVE_CHAIN_CURRENT → FINAL_SWEEP → FAST_CROSSING → FINAL_COMBO`.
- Ondas de até seis entradas em sequência, explosivos cruzados e oportunidades de reação em cadeia.
- Intervalo mínimo de 125 atualizações (~2,1 s), com espaçamento real dos elementos da onda preservado.
- Sete espaços nominais para entradas do rio; reserva para pássaro até oito. O dourado pode usar sua reserva especial, respeitando o limite global de transportadores.
- Oportunidades aéreas aos 46, 52 e 57 segundos decorridos.
- Mestre com decisões e deslocamento um pouco mais rápidos, sem leitura perfeita dos alvos.

Os intervalos são mínimos, não uma obrigação de encher a tela. Se o campo estiver ocupado, a próxima entrada aguarda espaço e uma margem adequada. Uma nova onda só é escolhida quando a anterior terminou de lançar seus elementos. A escolha segue uma ordem fixa por fase, sem sorteio de posições no centro da arena.

## Entradas e limites

Continuam valendo os caminhos determinísticos do rio e a criação dos transportadores fora da área visível. Há pelo menos 24 atualizações entre entradas de rio e 66 entre entradas pelo mesmo lado. No máximo um pássaro transportador fica presente por vez.

Na troca de fase, os alvos que já entraram continuam seu percurso normalmente. Apenas entradas ainda não lançadas da fila anterior são canceladas. Não há desaparecimento de um alvo visível para abrir espaço.

Durante os testes, o limite antigo de dez objetos, que incluía boias já acertadas ainda descendo o rio, provocou uma espera longa entre ondas do clímax. Esse gargalo foi corrigido: os limites por fase consideram oportunidades ainda não consumidas, e o orçamento global de apresentação passou para **16 transportadores**, incluindo as boias vazias. Isso preserva a saída física dos objetos sem deixar a fase final vazia. O total continua limitado e os objetos continuam sendo reutilizados pelos pools existentes.

## Dourado

A oportunidade da fase 3 tem probabilidade de 65%, planejada entre 32 e 35 segundos decorridos. No clímax, a probabilidade sobe para 90%, entre 51 e 54 segundos. São decisões tomadas na preparação da rodada, sem tentar um sorteio a cada frame.

O limite continua em dois dourados por partida, com pelo menos 15 segundos entre aparições e sem sobreposição de dourados. A variante é RAPIDS, ARC ou SKY, com os mesmos valores e comportamentos anteriores. Uma oportunidade pode aguardar espaço ou a saída do pássaro anterior; o fallback para correnteza continua garantindo uma entrada física.

## Mestre no clímax

A partir da fase 4, `aggressive=true` é enviado à IA existente:

- decisão: 6 atualizações, antes 8;
- cooldown após soltura: 22, antes 30;
- velocidade lateral máxima de reposicionamento: 3,70, antes 3,40.

O sensor continua exigindo amostras com pelo menos 18 atualizações de atraso. `accuracy=0,90`, trava da mira, trajetória física da flecha, preparação visível e limitações de alcance permanecem iguais. O Mestre não passa a consultar o futuro das rotas nem recebe acerto automático.

No alvo estático controlado, as solturas ficaram separadas por 64 atualizações no clímax, contra 74 no modo normal. Esse ganho vem de menor hesitação entre tentativas; não de teleporte ou supressão da animação do arco.

## Contagem final

Nos últimos cinco segundos aparece `5 → 4 → 3 → 2 → 1`, em uma pequena placa abaixo do relógio. O número pulsa discretamente sem modal, pausa, mudança de controles ou cobertura do campo de alvos. Flechas, alvos e atores seguem a simulação normal.

## Encerramento e resultado

O fluxo agora é:

`TUTORIAL → PLAYING → RESOLVING → GAMEOVER → ILHA_ARCO`

Quando o relógio chega a zero:

1. O estado passa para `RESOLVING`.
2. Novos tiros e entradas param; a fila de tiros ainda não soltos é cancelada.
3. Flechas já criadas não são apagadas. Alvos, flechas, colisões, explosivos e pontos continuam sendo atualizados.
4. O placar só é comparado depois dessa resolução.

A janela tem no mínimo 24 atualizações (~0,4 s), para manter o feedback final visível, e limite de segurança de 90 (~1,5 s). No voo normal, mesmo a flecha disparada da posição mais baixa deixa completamente a tela em cerca de 21 atualizações. Portanto, a janela comporta as flechas reais sem interromper seu percurso.

Um acerto depois do zero pode mudar o vencedor. A medalha só é concedida na comparação final, quando Zorp termina com mais pontos. Derrota não concede medalha. Medalhas obtidas anteriormente não são apagadas.

O empate já possuía resultado próprio e foi preservado: placares iguais geram **EMPATE**, sem vencedor sorteado e sem nova medalha. O resultado permite voltar à ilha e tentar novamente. O jogo mostra essa regra explicitamente na tela de empate.

Durante a resolução, apertar Espaço não cria flechas novas nem acumula um disparo para a próxima rodada. O estado e as agendas são limpos no reinício.

## Arquivos desta etapa

- `archery_match_pacing.js`: fases, ondas, agendas, métricas e contagem.
- `script.js`: integração, duração, filas, limites de transportadores, resolução e HUD da Arquearia.
- `archery_bird_targets.js`: suporte à agenda progressiva de pássaros.
- `archery_golden_targets.js`: oportunidades raras nas fases finais e diagnóstico atualizado.
- `archery_master_ai.js`: pressão adicional restrita ao clímax.
- `index.html`: módulo novo e versões dos arquivos alterados.
- Este relatório.

A comparação com a cópia anterior confirmou que o conteúdo de `script.js` antes e depois da seção da Arquearia permaneceu idêntico. Outros minigames, Overworld, save, economia e controles globais não foram modificados nesta etapa.

## Validação

Chrome real em modo headless, perfil/save isolados, cache desativado e eventos de teclado pelo protocolo do navegador. Foram usados cenários controlados com as flechas e colisões reais, oito partidas aceleradas pela mesma simulação e partidas completas em tempo real com o driver de movimento/disparo de QA. Não é um playtest humano manual.

O XAMPP não respondeu nesta sessão. Os arquivos do projeto foram servidos temporariamente em `127.0.0.1:8785`. O save do jogador não foi alterado.

Cobertura: entrada pelo NPC; tutorial; duração; fronteiras das quatro fases; ordem de ondas; frequência de dourados; reação e pressão do Mestre; oito sementes; densidade por fase; explosivos e combos; limite de transportadores; pássaros; contagem; flechas depois do zero dos dois competidores; vitória, derrota e empate; medalha somente depois da resolução; erro sem ponto indevido; retorno; reinício; desempenho; rede e console.

As capturas foram inspecionadas para conferir a diferença entre introdução e clímax, a legibilidade da contagem, o estado de resolução e o empate. Evidências na pasta de QA desta conversa: `archery_pacing_qa_report.json` e capturas `archery_pacing_intro.png`, `archery_pacing_crossings.png`, `archery_pacing_competition.png`, `archery_pacing_climax.png`, `archery_pacing_countdown.png`, `archery_pacing_resolution.png`, `archery_pacing_tie.png` e `archery_pacing_result.png`.

## Resultado final dos testes

**28/28 verificações aprovadas**, sem 404, falhas de carregamento, TypeError, ReferenceError ou warnings no navegador testado.

- As oito sementes com execução rápida de QA terminaram em vitória de Zorp. Ele fez entre 2.008 e 2.395 pontos; o Mestre fez entre 1.011 e 1.416. Essas amostras verificam a viabilidade da disputa; não medem a dificuldade para jogadores humanos.
- Nas oito amostras, as fases geraram 10, 16, 20 e 26–28 transportadores, respectivamente. Esses números incluem entradas, não a quantidade presente ao mesmo tempo. A quantidade real depende de acertos, ocupação, saídas e oportunidades raras.
- O clímax gerou seis explosivos em cada amostra e combos efetivamente acertados de dois a quatro alvos. A densidade média de alvos válidos aumentou em todas as amostras da fase 3 para a 4.
- No ensaio de 5.000 planos, houve oportunidade na fase 3 em 3.284 rodadas e no clímax em 4.492. Nenhum plano excedeu dois dourados ou violou a separação mínima planejada.
- O teste de buzina começou com Zorp 0 x 30 Mestre e uma flecha já solta. Ao zerar, a flecha continuou presente e a medalha ainda não havia sido concedida. O acerto durante a resolução mudou o placar para 46 x 30, e só então houve vitória e medalha.
- O mesmo caso com uma flecha do Mestre produziu derrota por 0 x 46, sem medalha. Duas flechas simétricas produziram empate real por 46 x 46. Nenhum desses casos escolheu o vencedor antes de resolver as flechas.
- Uma flecha sem alvo permaneceu em voo até sair completamente, foi registrada como erro e não concedeu pontos.
- Na última partida em tempo real, medida desde o reinício do primeiro frame, transcorreram **60,459 segundos** até o resultado: 60 segundos de rodada mais 24 ticks de resolução e a margem de observação do navegador.
- Placar dessa partida: **Zorp 2.460 x 1.090 Mestre**. Os picos de alvos válidos por fase foram 2, 3, 4 e 7. A média de oportunidades simultâneas passou de aproximadamente 0,77 na introdução para 3,35 no clímax.
- A contagem real mostrou todos os números de 5 a 1. Ambos os competidores continuaram disparando na fase final. Resolução, resultado, retorno à ilha e reinício foram aprovados.
- Média medida: **60,04 FPS**, com mínimo amostrado de aproximadamente 43,29 FPS. A média não promete ausência de variação em todos os equipamentos. O limite global permaneceu em 16 transportadores e não houve teleporte ou violação dos bounds dos personagens.

O servidor e o perfil de navegador usados na validação são exclusivos de QA. Nenhum resultado ou medalha de teste foi gravado no save real do jogador.
