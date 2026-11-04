# Atualização integrada da campanha — 03/11/2026

## Nome oficial

41 textos/rótulos padronizados para Zorpzin/ZORPZIN, mais 15 referências em comentários (56 ocorrências em 21 arquivos). Inclui placares de Basquete, Boxe, Ping-Pong, Corrida e Arquearia, mensagens da Escalada/Surf e mochila. Diálogos, introdução e cards que já usavam Zorpzin foram preservados.

A busca final não encontrou nome narrativo antigo. Restam referências técnicas: IDs 'zorp', manifestos 'zorp/RUN/RIGHT', variáveis zorpSprite, chaves de save e filenames dos PNGs. Nenhum PNG foi renomeado ou modificado. Lista por arquivo em name_standardization_audit.json.

## Surf e moeda global

- surfMiniCoins é o contador local da run (stats.coins permanece como representação compatível durante a partida).
- Resultado de vitória e wipeout liquida uma única vez: Math.floor(surfMiniCoins / 10).
- Restos são descartados no reset. Não existe uma segunda carteira persistente.
- FestivalWallet.credit valida inteiros não negativos, salva e atualiza o HUD. Falha ao salvar desfaz o crédito; o resultado tenta novamente antes de liberar saída.
- Moedas pequenas usam o recorte já existente de moeda.png. O resultado mostra mini moedas, conversão e ganho com o ícone oficial.
- Casos 9/10/19/20/37/100: ganhos 0/1/1/2/3/10, sem duplicação em chamadas repetidas.
- Cinco percursos gerados: 129, 135, 125, 130 e 128 mini moedas disponíveis até a chegada. Teto de 12–13 moedas globais se todas forem coletadas, abaixo das missões de 30. A distribuição existente foi mantida.
- Saldo do HUD, loja, mochila e Capitão continua vindo do mesmo FestivalWallet e do mesmo zorp_festival_wallet.

## HUB e orientação

Sinalização das quatro direções e rotas seguintes, marcações discretas dos caminhos, vegetação baixa, detalhes esportivos e dois pontos de iluminação por Canvas. Bancos, nave e área da loja foram preservados. A indicação para Ping-Pong fica no piso, visível abaixo da loja. Não foram acrescentados colliders nem bloqueios aos caminhos.

Tutorial de três páginas na primeira ilha esportiva: Mestre/medalha; NPCs/conversa; missões opcionais e retorno ao NPC para receber recompensa. Destaca os personagens existentes, pausa movimento e bloqueia mochila/mapa durante a explicação. Funciona com qualquer uma das oito ilhas sendo a primeira.

Flags aditivas na commerce da carteira existente:
- firstSportIslandTutorialSeen
- firstQuestTutorialSeen
- firstMasterPromptSeen

Flags concluídas são preservadas em atualizações parciais e reload. A primeira missão inclui a explicação do retorno ao NPC; o primeiro Mestre recebe prompt explícito. NPCs de missão mostram ! / ... / ! conforme disponibilidade, andamento e entrega. Ambientais não ganham marcador.

A mochila oferece COMO FUNCIONA O ARQUIPÉLAGO mesmo sem compras. É uma ajuda permanente, sem item comprado artificialmente e sem ocupar um novo estado de inventário.

## Skip universal

cutscene_skip.js observa as cenas existentes. Indicador surge após 650 ms; novo pressionamento mantido por 1000 ms executa o skip, com barra de progresso.

Cobertura: introdução/chegada de Zorpzin, Comerciante, chegada de Ravok/K7, comunicação das oito medalhas, despedida, saída/preparação de Ravok, prisão, final secreto, final padrão, férias, encerramento cinematográfico do Surf e cume da Escalada.

Cada dono da cena aplica sua própria conclusão. Escolha de Ravok, confirmação de SIM, oferta do Capitão, escolha de embarque, menus e ending cards interativos não são pulados. A animação de um final termina no seu card; a confirmação posterior continua necessária.

SPACE fica bloqueado até ser solto após o skip. Buffers globais são limpos e o keyup chega aos controladores privados para não deixar tecla presa. A despedida finaliza a posição antes da escolha de embarque. O cume mantém a exigência de contato físico e o tempo nominal da subida de borda; o skip não concede medalha antes desse contato. Surf executa os eventos finais antes de concluir seu resultado.

Comparação automática em navegador: nove sequências narrativas × reprodução completa / skip inicial / skip intermediário = 27 estados finais equivalentes. Adicionalmente, Surf teve paridade nos três modos; cume teve testes completos versus skip inicial/intermediário.

## Skate definitivo

Causa do salto duplo: segundo toque era um OLLIE_UPGRADE vinculado ao salto do chão e à janela de 220 ms. Não havia um impulso aéreo próprio disponível após essa janela ou depois do grind.

Agora DOUBLE_JUMP chama uma única função física doubleJump(). Um novo keydown fora de captura válida consome airJumpsUsed de 0 para 1 e aplica o impulso aéreo. Segurar não produz outro toque. O contador reseta no contato com o chão e no reset da simulação. Entrada/saída de grind não consome nem restaura a carga já gasta. A antiga entrada upgradeJump delega para a mesma função central.

Causa do regrind: filtro do último rail no controlador e no parser; além dele, a validação rejeitava a subida rápida do Super Jump Out mesmo dentro do raio. O filtro por identidade foi removido de ambos os caminhos. lastExitedRailId fica somente para diagnóstico e crédito de combo.

canStartGrind considera airborne, SPACE mantido, ausência de estado incompatível, distância/projeção no segmento real e trajetória compatível. O raio continua em 24 px. A tolerância de velocidade normal é 1000 px/s; a trajetória do Super Jump Out agora pode ser capturada quando está fisicamente próxima. A extremidade final usa projeção na tangente, com tolerância de 0,5 px; passar além dela não autoriza captura.

Cooldown de movimento: 0 ms. A saída retorna imediatamente do update, impedindo recaptura no mesmo update; no próximo frame a geometria é avaliada novamente. Nenhum chão, outro rail ou timer precisa limpar um lock. A captura conserva o ajuste suave de 100 ms e o momentum.

Crédito extra de combo em regrind do mesmo rail continua separado do movimento: pelo menos 180 ms no ar OU 28 px percorridos. Uma captura física curta não é recusada por não gerar esse crédito.

Cinco testes pedidos:
1. Chão → salto → segundo toque após 400 ms → salto duplo → pouso: PASSOU; um salto aéreo, reset no chão.
2. Grind → exit → mesmo rail: PASSOU no primeiro rail e na escadaria reais.
3. Grind → exit → double jump → mesmo rail: PASSOU; airJumpsUsed permanece 1 após recapturar.
4. Quatro grinds no mesmo rail sem tocar o chão: PASSOU em ambos os rails, com contato físico entre saídas.
5. Além da extremidade: captura recusada. Também recusados chão, distância/altura inválida e ausência de SPACE.

Gaps, velocidade, percurso e Mega Ramp não foram alterados. A suíte também concluiu o percurso completo e validou rampas, chains, Super Jump Out e Mega Air a 30/60/144 Hz. O piloto de QA foi ajustado à regra de novo toque aéreo; não é carregado pelo jogo.

## Validação e evidências

- 178 testes do Skate passaram; os casos de estado/entrada também foram revalidados após a centralização final.
- 137 testes de campanha, compras, save, NPCs, Ravok, cards e briefing passaram.
- 3 testes adicionais de skip do cume passaram.
- 89 verificações/cenários no navegador isolado: 29 de integração, 26 adicionais, 27 de paridade narrativa e 7 de smoke final.
- Nenhum 404, TypeError ou ReferenceError nos cenários finais de navegador. Checagem sintática dos módulos alterados e diff sem erros de whitespace.
- Save do jogador não foi utilizado. Chrome/perfil e servidor foram exclusivos para QA.
- As execuções foram automatizadas; não representam avaliação de compreensão por uma pessoa nova.

Evidências: browser-results.json, extended-results.json, parity-results.json, final-smoke-results.json, skate-tests.tap, campaign-tests.tap e screenshots nesta pasta.

## Arquivos centrais

Novos: cutscene_skip.js, island_orientation.js, campaign_update.test.cjs, climb_skip.test.cjs, skate/definitive_state.test.cjs.

Integração: festival_economy.js, festival_challenges.js, merchant_campaign.js, merchant_ui.js, overworld_visuals.js, surf_endless.js, script.js, index.html.

Conclusões das cenas: adventure_intro.js, ravok_arrival.js, ravok_event.js, ravok_outcome.js, medal_completion.js, masters_farewell.js, ending_cinematic.js, captain_route.js, climb_summit.js.

Skate: ollie_physics.js, space_input_parser.js, traversal_system.js, skate_ollie_runtime.js, control_coach.js, pre_game_brief_configs.js e testes/piloto de QA correspondentes. Rótulos dos demais arquivos constam na auditoria de nomes.
