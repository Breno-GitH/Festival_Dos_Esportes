# De Volta para Casa — fundo de partida da Terra

## Montagem

Foi enriquecido somente o fundo do tema `champion` no componente compartilhado `ending_card.js`. O título, subtítulo, texto, retrato oficial do Zorp, escala, posições, sequência de entrada, input e saída para o menu foram preservados.

- Espaço azul-marinho, doze estrelas discretas com fases de brilho diferentes.
- Terra em pixel art, com oceanos, continentes, gelo, poucas nuvens, sombra esférica e atmosfera em degraus. A arte é rasterizada uma única vez em Canvas 90×90 e reutilizada.
- Terra desenhada em (35,101), centro aproximado (79,5;145,5), raio de superfície de 42 pixels, à esquerda do retrato.
- Miniatura em pixel art da nave prateada do Zorp, com cabine ciano, porta central e luzes discretas, feita uma vez em Canvas 38×26. Não requer novo PNG.
- Nave à direita, começando aproximadamente em (340,110), afastando-se lentamente até perto de (365,89). A trajetória é limitada e não retorna ao planeta. Há apenas um rastro curto e fraco, com oscilação leve da propulsão.
- Nenhum motivo atravessa o título, o retrato central ou o texto. A faixa inferior azul-escura existente mantém a leitura.
- Todos os desenhos usam coordenadas inteiras e imageSmoothingEnabled=false.

## Validação

O final padrão foi aberto no jogo real em Chrome isolado, na entrada de seu ending card. A captura `de-volta-para-casa.png` registra o resultado. Não foi necessário repetir a cutscene anterior, que não foi alterada.

- PNG oficial carregado e preservado: `zorp_finalpadrao.png?v=1.1.0_transparent_mission_card`.
- Título, texto e prompt nas mesmas posições e sem exceder a área de leitura.
- SPACE passa pelo fade existente e retorna ao menu principal.
- Zero erros de JavaScript, respostas HTTP com erro ou requisições falhas.
- Férias Merecidas e A Maior Conquista foram comparados pixel a pixel, no mesmo instante de apresentação, com o componente anterior: ambos idênticos.
- 32 testes automatizados passaram, incluindo cache da Terra/nave, deslocamento da nave, exclusividade do tema, proporção do retrato, input e controladores dos finais.
- Os três PNGs oficiais e os controladores de cutscene/rotas não foram alterados.

## Arquivos

- `ending_card.js`: motivos de fundo exclusivos do final padrão.
- `index.html`: versão de cache atualizada para 2.4.0_peaceful_earth_departure.
- `ending_card.test.cjs`: suporte de Canvas no mock e dois testes do novo fundo.

Evidências: `browser-results.json`, `unit-tests.txt`, `de-volta-para-casa.png`, `de-volta-para-casa-animacao.png` e `retorno-menu.png`.
