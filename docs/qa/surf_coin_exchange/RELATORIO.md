# Mini moedas do Surf e posto do Pescador

## Loop implementado

SURF → coletar mini moedas → terminar ou escolher ESC / SAIR → saldo de mini moedas salvo → Pescador → TROCAR TUDO → moedas globais disponíveis no restante da campanha.

O Pescador é o NPC existente pescador_surf, em x=376, y=155, na direita da Ilha do Surf. Continua usando npcs_surf.png e seu recorte/escala/anchor já aprovados. Nenhum personagem ou PNG novo foi criado. Capitão permanece em x=310, y=180; Salva-Vidas mantém a única missão secundária principal do Surf.

## Carteiras e operações

A carteira global continua em zorp_festival_wallet, com preservação dos saves antigos e dos saldos globais já ganhos na versão anterior. Os novos campos são aditivos:

- surfMiniCoins: mini moedas guardadas, incluindo restos.
- surfCoinExchangeTutorialSeen: explicação concluída.
- surfCoinExchangeTutorialPending: explicação aguardando retorno seguro ao Overworld.
- surfRunSequence / surfLastDepositedRunId: recibos persistentes para impedir depósito repetido de uma run antiga.

Durante o Surf, runMiniCoins é o contador da run atual, representado por stats.coins por compatibilidade com o runtime. O HUD da onda mostra somente essa quantidade local.

Vitória, wipeout, reset seguro e SAIR depositam as mini moedas na carteira, sem adicionar moedas globais. Só depois de persistir o depósito o contador local é zerado. O resultado conserva uma cópia da quantidade da run para mostrar o que foi guardado.

FestivalWallet.depositSurfRun valida o recibo e salva de forma atômica. O mesmo recibo reapresentado, mesmo após reload ou depois de outra run, não credita novamente. Se a gravação falhar, as moedas locais ficam intactas e a saída continua bloqueada até a nova tentativa ser salva.

FestivalWallet.exchangeSurfMiniCoins('all') converte todas as dezenas disponíveis e mantém o resto. A função também aceita múltiplos de 10 para uma futura opção TROCAR 10, sem exigir mudança na operação financeira. A interface atual apresenta somente TROCAR TUDO / SAIR. A troca salva os dois saldos juntos; falha de gravação restaura ambos.

Comerciante, recompensas, mochila, Capitão e HUD continuam usando FestivalWallet.coins. Apenas a troca explícita com o Pescador aumenta esse saldo a partir das mini moedas. A conversão automática anterior foi removida do runtime e do resultado.

## Diálogo, tutorial e pause

Antes de coletar, o Pescador explica dez pequenas por uma grande. Após a explicação, a flag é salva e não há tutorial automático posterior. O diálogo inclui sua observação de vento/maré e não o transforma em outra loja principal.

Se a primeira run guardar pelo menos uma mini moeda, o tutorial fica pendente até o jogador voltar ao Overworld em uma oportunidade segura. A caixa destaca o Pescador na ilha e apresenta 10 MINI MOEDAS = 1 MOEDA. A flag é gravada ao fechar/confirmar a explicação. Não há troca remota nesse tutorial.

Menos de dez: informa o saldo e permite SAIR. Dez ou mais: mostra o total convertível e TROCAR TUDO / SAIR. O padrão selecionado é SAIR; repetição da tecla não confirma compras nem duplica trocas. O recibo mostra o total gasto, as moedas ganhas e o resto guardado.

ESC no Surf abre CONTINUAR / SAIR. Física, distância, cronômetros e coleta ficam parados. SAIR só retorna à ilha após o depósito; CONTINUAR preserva a run. Confirmações não deixam SPACE preso. O pause da apresentação final também suspende o skip universal enquanto o menu está aberto.

## Pedido visual adicional

A faixa foi transformada em placa física de madeira, com moldura, pontos de fixação, dois postes e sombra na areia. Mantém os símbolos de mini moeda ×10 → moeda global ×1.

A banca ficou centralizada atrás do Pescador: cobertura em x=342..410, balcão em x=345..407, rede de pesca e poucos objetos. A camada da banca usa profundidade 152 e o Pescador permanece em 155, portanto ele fica na frente dela. O Capitão está livre da banca.

A placa ocupa x=333..417 e y=188..218; os pés dos postes chegam a y=228. Ela participa da ordenação por profundidade do mapa. Os pequenos colliders correspondem aos postes; o centro fica aberto para a aproximação ao Pescador. A navegação foi testada fisicamente por teclado do sul até o NPC, sem reposicionar o personagem durante o caminho.

## Testes

72 testes automatizados passaram: 15 específicos de mini moedas/recibos/migração/troca/camada da banca e 57 de campanha, carteira, loja, NPCs e mochila.

58 verificações no navegador isolado passaram, usando colisões reais de coleta e eventos de teclado:

- 9: não troca; 9 guardadas.
- 10: +1 global; 0 mini restantes.
- 19: +1 global; 9 mini restantes.
- 20: +2 globais; 0 mini restantes.
- 37: +3 globais; 7 mini restantes.
- Coletar 27 → ESC / SAIR → ilha → tutorial → Pescador → +2 globais e resto 7.
- Reload mantém os saldos e a flag. Run posterior com 3 mini completa as 7 anteriores; a próxima troca entrega mais uma moeda global.
- Vitória também guarda sem converter. Confirmar retorno não deposita duas vezes.
- Recibos antigos não podem ser reapresentados para ganhar moedas.
- Falha de save durante SAIR mantém o pause e todas as moedas locais; nova tentativa deposita uma única vez.
- Pause congela o jogo e não deixa SPACE preso ao continuar.
- Pescador alcançável entre os postes; posições e quantidade de NPCs preservadas.
- Pause na cena final bloqueia skip; SPACE usado para retomar não pula a apresentação.

Nenhum 404 ou exceção de navegador nos cenários finais. Testes foram automatizados em perfil isolado, sem usar o save do jogador.

## Arquivos

Novos: surf_coin_exchange.js e surf_coin_exchange.test.cjs.

Alterados: festival_economy.js, surf_endless.js, script.js, index.html, cutscene_skip.js.

Evidências atuais: wood-sign-booth.png, automatic-fisher-tutorial-final.png, exchange-37-receipt-final.png, surf-pause-exit.png, run-banked-37.png, browser-results.json, visual-results.json e tests.tap.
