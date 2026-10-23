# Final secreto — Ravok: SIM

Implementado em 22/10/2026. Escopo: rota de aceitação do encontro de Ravok.

## Sequência final

- Dupla confirmação existente preservada. Cancelar a segunda confirmação volta à escolha.
- Zorp fica em silêncio por 2,6 segundos.
- Ravok: “Sabia que você entenderia.” K7: “PROTOCOLO AUTORIZADO.”
- Ravok e K7 embarcam na nave escura. Um corte mostra Zorp caminhando e embarcando na sua própria nave, na ilha central.
- Plano aberto das duas ilhas mostra as duas decolagens; seguem nuvens, atmosfera e espaço.
- No espaço, câmera fixa, nave de Ravok cerca de três vezes mais larga que a de Zorp e Terra distante com raio de 46 pixels na resolução interna de 450×300.
- A arma se desdobra da própria nave de Ravok. Transmissão: “Olhe bem.” / “É assim que uma derrota deixa de existir.”
- Carga vermelha/roxa com som crescente; feixe e clarão distante. O clarão encobre o planeta antes de substituí-lo por fragmentos abstratos e poeira.
- Nenhum personagem, cidade, vítima ou detalhe de destruição na superfície é mostrado.
- Silêncio de 3,6 segundos diante dos fragmentos; Ravok: “Agora ninguém vai esquecer.” Zorp não responde.
- As duas naves diminuem até desaparecer, sem a câmera segui-las. Fade preto e entrada da ending card **A MAIOR CONQUISTA**, com os três parágrafos pedidos.
- Espaço retorna diretamente ao menu principal. Duração cronometrada até a card: 52.21 s.

## Save e encerramento da campanha

Chave existente: `zorp_ravok_event`, agora versão 6.

- `ravokChoice = "accept"`: salvo pela confirmação existente antes da cutscene.
- `ravokBadEndingCardReady`: salvo depois de toda a sequência e do fade, ao entrar na card. Não representa final concluído.
- `ravokBadEndingSeen = true` e `ravokEndingCompleted = true`: gravados juntos somente quando o jogador confirma Espaço na card, após sua entrada de 1,2 segundo.
- Falha ao salvar mantém a cena/card aberta, informa o problema e permite tentar novamente; as flags são revertidas até uma gravação bem-sucedida.
- Reload na card restaura a própria card; `ravokBadEndingSeen` continua falso até a confirmação.
- Continuar uma campanha concluída dessa rota reabre a card, sem devolver movimento ao Overworld. Um save de aceitação ainda pendente retoma o filme, também sem controle no Overworld.
- Saves versão 5 que já tinham o desfecho curto concluído são encaminhados à nova card sem antecipar a nova flag de leitura.
- O reinício de campanha já existente no menu permanece disponível. Nenhuma medalha, moeda ou resultado de outra modalidade foi alterado.

## Implementação

- `ravok_bad_ending.js` (novo): direção, 18 tomadas, composição das duas naves, arma articulada, Terra distante, fragmentos, efeitos, áudio sintetizado e card.
- `ravok_outcome.js`: encaminhamento da aceitação, bloqueio de input, pausas ao ocultar a página, gravação por etapa e saída ao menu. A recusa mantém sua sequência.
- `ravok_event.js`: novas flags, migração e transações de persistência.
- `script.js`: captura da ilha central para o embarque de Zorp e bloqueio de retorno ao Overworld pelo botão de continuar.
- `index.html`: carregamento do módulo e versões de cache atualizadas.
- `ravok_outcome.test.cjs`: testes da rota, card, recarregamento, falhas de gravação, migração e desenho.

As naves usam os desenhos oficiais existentes de `AdventureIntro.drawShip` e `RavokEvent.drawShip`. O filme usa snapshots das ilhas existentes e Canvas, sem novos PNGs ou dependências externas. Estrelas e fragmentos são estruturas fixas, criadas uma vez. Pixel art permanece com smoothing desligado.

## QA no navegador real

Executadas duas sequências completas no Chrome headless, com renderização e eventos reais de teclado via CDP, sem acelerar o relógio do filme. Servidor e perfil isolados; o save do jogador no endereço habitual não foi alterado. As oito medalhas e a conversa já lida foram preparadas como fixtures para testar diretamente esta rota; não foram conquistadas oito medalhas durante esse QA.

Verificado na versão final:

- SIM, confirmação secundária, proteção contra tecla segurada e cancelamento da confirmação.
- Embarques separados, duas naves, decolagem, nuvens e atmosfera.
- Arma, carga, disparo, clarão e Terra distante substituída por fragmentos.
- Silêncio após o disparo: zero vozes de áudio ativas nessa fase.
- Desaparecimento das duas naves, fade e todos os textos da card dentro do painel.
- Flags de conclusão falsas durante o filme e durante a leitura da card.
- Reload antes de fechar a card; confirmação e persistência; reload depois de concluir; continuar sem retornar ao Overworld.
- Regressão da recusa até sua própria card e menu.
- **Zero erros de execução/console, zero HTTP 404 ou outras respostas HTTP de erro, zero falhas de carregamento.** Isso inclui zero TypeError e ReferenceError durante os percursos testados.
- **29/29 testes automatizados passaram**, incluindo os testes existentes do evento e da chegada da quarta medalha.

Medição da última execução: 3132 frames, média 60.00 FPS; mediana 16.70 ms e percentil 95 16.80 ms. Medição local deste ambiente, sem garantia de desempenho idêntico em outros dispositivos.

## Evidências

- `browser_acceptance.cjs`: percurso reproduzível (servidor local 8812 e depuração Chrome 9292).
- `browser-acceptance-results.json`: estados, fases, flags, medições e listas de erros.
- `accept-second-confirmation.png`, `accept-island_departure.png`, `accept-space_establish.png`, `accept-weapon_deploy.png`, `accept-charge.png`, `accept-fire.png`, `accept-planet_flash.png`, `accept-silent_aftermath.png`, `accept-departure.png`, `accept-ending-card.png`, `accept-menu.png`: capturas da versão final.
