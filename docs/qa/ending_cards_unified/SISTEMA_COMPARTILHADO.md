# Encerramentos — sistema visual compartilhado

## Resultado visual

Os três finais usam a mesma composição em Canvas 450 × 300:

- Identificação discreta do jogo e do tipo de final.
- Título no topo, em alfabeto local de pixels 5×7, com acento no título FÉRIAS MERECIDAS.
- Arte oficial de Zorp centralizada, sem deformação, em uma área máxima de 172 × 156.
- Duas ou três linhas curtas sobre o destino de Zorp.
- `[SPACE] CONTINUAR` na base.
- Moldura com cantos em degraus, coordenadas inteiras e marcas laterais discretas.

Não existem cenário completo atrás do card, sistemas de partículas, glow grande ou medalhas extras competindo com a arte principal.

Personalidade de cada preset:

- **De Volta para Casa:** azul profundo, dourado, pequenos detalhes de premiação. Usa `zorp_finalpadrao.png`, inteiro.
- **Férias Merecidas:** verde-água, areia e pequenas marcas de ondas nas laterais. Usa `zorp_feriasmerecidas.png`, recorte útil que preserva a pose e a cadeira.
- **A Maior Conquista:** vinho/roxo quase preto, branco frio e magenta discreto. Usa somente o retrato de Zorp no `card_zorp_MaiorConquista.png`. Permanece silencioso.

Os PNGs oficiais não foram editados. Todos os desenhos de retratos, inclusive os caches, usam `imageSmoothingEnabled=false`. A escala é sempre `min(larguraDisponível/larguraFonte, alturaDisponível/alturaFonte)`.

## Uma única implementação

`ending_card.js` contém preload dos três assets, cache, presets, layout, tipografia, decoração, relógio, entrada, saída e bloqueio de input. O antigo renderer exclusivo do card de Ravok foi removido; `ravok_bad_ending.js` delega ao componente compartilhado.

Identificadores disponíveis:

- `true_ending`
- `ferias_merecidas`
- `ravok_maior_conquista`

Uso pelos controladores:

```js
EndingCard.show({
    id: 'true_ending',
    onClose: voltarAoMenu
});
```

No encerramento secreto, `onContinue` tenta persistir a conclusão. Se retornar `false`, o card permanece visível com possibilidade de nova tentativa; o fade só começa depois de salvar com sucesso. `onClose` executa uma vez, depois do fade completo. Nenhum renderer decide vencedor, medalhas ou requisitos.

- `EndingCard.update()` atualiza a apresentação usando deltaTime.
- `EndingCard.draw(ctx)` usa o mesmo relógio e renderer, sem avanço duplicado no mesmo instante.
- `EndingCard.assetsReady` aguarda os três preloads.
- `EndingCard.snapshot()` expõe estado, ID, layout e asset para QA.
- `EndingCard.preview(ctx,id,t)` usa o mesmo renderer sem ativar a tela ou marcar apresentação/conclusão; serve apenas para prévia e ferramentas de desenvolvimento.

## Transições e input

Sequência comum:

1. `FADE_TO_BLACK`: 450 ms, usando o último frame da cutscene.
2. `BLACK_PAUSE`: 250 ms, preto completo.
3. `BACKGROUND`: 300 ms, entrada do fundo temático.
4. `REVEAL`: 1,1 s; Zorp primeiro, título depois, texto por último.
5. `READY`: aguarda um novo toque em Espaço.
6. `FADE_OUT`: 800 ms, seguido do callback de retorno ao menu.

A preparação não consome o tempo de revelação se o PNG ainda não estiver pronto. O bloqueio de 700 ms considera a primeira apresentação real do retrato. Relógio avançado sem desenho não permite encerrar a tela. Espaço herdado do diálogo, teclas repetidas e input durante transições não pulam o card. Aba oculta pausa a apresentação e a saída. Atalhos com modificadores não confirmam o final.

## Posição e escala finais

- Padrão: sourceRect `[0,0,1254,1254]`; destino `(147,66)`, `156 × 156`, escala `0.1244019139`.
- Férias: sourceRect `[256,42,1007,1007]`; destino `(147,66)`, `156 × 156`, escala `0.1549155909`.
- Secreto: sourceRect `[892,141,179,217]`; destino aproximado `(160.659,66)`, `128.682 × 156`, escala `0.7188940092`.

Durante a entrada há um deslocamento vertical suave de até seis pixels; a posição final é fixa.

## Validação

- **53 testes automatizados aprovados**: três assets oficiais, recortes, proporções, cache exclusivo, sequência comum, Espaço segurado, repetição de tecla, input bloqueado, card não desenhado, atraso/falha de carregamento, falha de save, aba oculta, confirmação e callbacks. Inclui regressão da chegada, proposta e prisão de Ravok.
- **Chrome real com perfil e origem de QA isolados.** Os cards padrão e Férias foram abertos pelo estado final de seus controladores; a rota secreta SIM foi executada inteira, sem acelerar os timers, até chegar ao novo componente.
- As três telas passaram pelas cinco etapas de entrada e por `FADE_OUT`, retornando ao menu somente após a saída completa.
- Espaço mantido desde o diálogo/fade anterior não fechou nenhum card.
- Zero mistura de assets, zero halo branco, recortes íntegros e smoothing desligado em todas as chamadas dos retratos.
- Texto dentro do painel, sem sobreposição; título no topo e retrato maior nos três finais.
- Falha de escrita simulada no final secreto manteve `READY`, não gravou conclusão e permitiu uma nova tentativa. Depois de confirmar, a flag persistiu e o reload restaurou o próprio card secreto, sem retornar à Terra.
- Zero erros de console, zero respostas HTTP >=400 e zero falhas de requisição no teste completo.

## Escopo preservado

As cutscenes anteriores, seus diálogos e a progressão de medalhas continuam iguais. Módulos de história, economia, estado de Ravok, prisão e o arquivo principal do jogo permaneceram idênticos. Os momentos de gravação existentes do padrão/Férias foram preservados; o secreto continua salvando somente depois de apresentar o card e receber a confirmação.

Arquivos de implementação alterados:

- `ending_card.js`: componente comum e três presets.
- `ending_cinematic.js` e `captain_route.js`: passam apenas o ID e seus callbacks, atualizando a apresentação comum.
- `ravok_bad_ending.js`: remove a UI exclusiva e o preload duplicado.
- `ravok_outcome.js`: conecta o card compartilhado ao fluxo e à gravação já existentes.
- `index.html`: ordem de carregamento e cache atualizado.
- `ending_card.test.cjs` e `ravok_outcome.test.cjs`: cobertura do sistema compartilhado.

Evidências: capturas dos três cards, das pausas no preto, do retrato entrando e do fade de saída; `secret-save-retry.png`; `browser-shared-ending-cards.json`; `unit-tests.txt`.
