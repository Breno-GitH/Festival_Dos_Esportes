# Ping-Pong — arena da final

Passe visual de 24/10/2026. Física, controles, IA, pontuação e especiais preservados.

## Mesa e perspectiva

A mesa anteriormente incorporada ao PNG de fundo passou a ser desenhada por Canvas. O tampo ganhou duas tonalidades de azul-petróleo, iluminação discreta, linhas claras de contorno, linha central e divisão das metades. A estrutura inclui espessura do tampo, acabamento frontal, suportes, pés e sombra projetada.

A superfície continua alinhada ao retângulo físico original: X 90–360, Y 91,161–223,548. A sensação de perspectiva 3/4 vem do volume abaixo do tampo e das sombras, mantendo bola e pontos de quique alinhados à superfície.

Uma transformação visual uniforme de **1,10×** é aplicada ao campo completo. A mesa ocupa aproximadamente **297 × 146 pixels**, entre X 76,5–373,5 e Y 87,6–233,2 no Canvas interno de 450×300. Isso representa 10% de aumento visual em cada eixo, sem alterar as distâncias da simulação.

## Rede

Rede independente, com dois postes, pés de fixação, faixa superior clara, malha oblíqua discreta e sombra no tampo. A altura corresponde aos 20,323 pixels físicos existentes, aproximadamente 22,4 pixels na apresentação. O centro permanece em X 225.

A rede mantém o comportamento físico atual; nenhum colisor foi criado ou alterado nesta etapa.

## Arena e atmosfera

- Piso esportivo verde-petróleo, com perímetro de madeira em contraste baixo.
- Bordas da competição, áreas reservadas atrás dos jogadores e acesso central na barreira frontal.
- Banners, emblemas do torneio, identidade Ilha dos Campeões e pequenos detalhes tecnológicos.
- Refletores e suportes físicos do placar.
- Duas arquibancadas laterais, três fileiras por bloco e **48 espectadores** humanos/aliens em cores discretas.
- Algumas palmas independentes, com variação de tempo; aparência e posição dos espectadores permanecem fixas.

O fundo estático é desenhado em um Canvas de cache uma única vez. Só os poucos gestos, jogadores, bola, efeitos e HUD são desenhados dinamicamente.

## Câmera, jogadores e sombras

Enquadramento fixo que mostra mesa completa, jogadores em lados opostos e espaço atrás de ambos. A mesma transformação é usada para mesa, rede, personagens, bola, rastros, marcadores de quique e efeitos.

As oito poses existentes foram medidas pelos pixels visíveis. Cada pose utiliza seu recorte real, escala uniforme **0,66×** e referência nos pés. Foi removido o desenho que forçava todas as imagens a 36×48, apesar das proporções diferentes dos arquivos. A escala final com a câmera é 0,726×. Não houve edição dos PNGs nem alteração de posições ou áreas de rebatida.

Sombras pixeladas em camadas sustentam jogadores, mesa e postes. A sombra da bola acompanha a projeção de X/Y; tamanho e opacidade respondem à altura. Sobre a mesa, a sombra indica o quique. Fora do tampo, ela é projetada no piso, com o desnível visual da mesa.

## Leitura

Bola com núcleo branco, contorno escuro e detalhes de cor limitados à borda e ao rastro. Especial usa acento ciano; bolas rápidas, acento quente. A bola mantém formato legível no quique. Foram retirados os glows com blur da renderização da bola.

O placar ocupa o topo, fora da mesa. Preserva os pontos reais, meta de 50, carga/cooldown da Raquetada Global, quantidade de bolas e rally. Anúncio e carga do multiball continuam usando os estados existentes. A mesa tem maior contraste que o piso e a arquibancada.

Todos os contextos de desenho usam `imageSmoothingEnabled = false`; formas e destinos são alinhados à grade sempre que possível.

## Mecânica preservada

A comparação do código confirmou que todo `script.js` fora do renderizador permanece igual, exceto a remoção do preload do antigo fundo. Os arquivos abaixo permaneceram byte a byte iguais:

- `pingpong_ball.js` — voo, quique obrigatório, recepção, aceleração e Raquetada Global.
- `pingpong_master_ai.js` — percepção e decisões do Mestre.
- `pingpong_multiball.js` — preparação, emissão, quantidade e cooldown do especial.

O arquivo físico `bg_pingpong.png` foi preservado; o minigame deixa de carregá-lo e desenhá-lo. Nenhum outro esporte foi alterado.

## Testes

- **7 testes de apresentação aprovados.** Incluem desenho de estado congelado, ausência de consumo do RNG da partida, cache, enquadramento, proporções/âncoras das oito poses, assets ausentes e leitura da bola.
- **18.000 passos comparados com e sem renderização:** estados físicos e uso de aleatoriedade idênticos em todos os passos. Incluídos multiball, Raquetada Global, bolas rápidas, quique e recepção.
- **24 testes do briefing compartilhado aprovados.**
- Chrome real com perfil/save isolados: briefing pausado, início por Space, movimento WASD, poses, dez bolas simultâneas, Raquetada Global e retorno à ilha.
- Partida automatizada completa: **2–50**, 12.015 passos físicos, 162 recepções com quique e **zero recepção ilegal detectada**. Houve multiball natural e Raquetada Global. O trecho final do QA foi acelerado em oito passos originais por atualização para concluir o fluxo; essa aceleração não existe no jogo entregue.
- Amostras de 180 frames: **59,99 FPS na partida** e **60,00 FPS com dez bolas** no ambiente de teste.
- Oito sprites carregados. Nenhum carregamento do antigo fundo no teste final.
- Teste final do navegador: **zero 404, TypeError, ReferenceError, exceção ou falha de rede**.

## Arquivos

- `pingpong_presentation.js` — novo módulo exclusivamente visual.
- `script.js` — integração do desenho e remoção do preload do fundo antigo.
- `index.html` — inclusão do módulo e atualização da versão de cache.
- `pingpong_presentation.test.cjs` — regressão da apresentação e da independência da física.

Evidências: `browser-qa.json`, `mechanics-integrity.json`, resultados dos testes e capturas nesta pasta.

## Conferência da versão integrada

Os 31 testes passaram novamente na pasta final. A captura e os controles foram repetidos no Chrome contra o projeto integrado, incluindo dez bolas e Raquetada Global: oito sprites válidos, 60 FPS, nenhum carregamento do fundo antigo e zero falha de rede ou exceção. Hashes dos módulos finais e dos três módulos de mecânica preservados conferidos.
