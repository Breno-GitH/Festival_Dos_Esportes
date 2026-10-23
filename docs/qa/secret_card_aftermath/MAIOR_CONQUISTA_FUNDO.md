# A Maior Conquista — reflexo sombrio do final padrão

## Fundo

Somente o fundo do tema secreto foi enriquecido no componente compartilhado EndingCard. Título, subtítulo, narrativa, retrato oficial de Zorp, proporções, layout, entrada progressiva, input e retorno ao menu foram preservados.

Na resolução nativa de 450×300:

- A Terra destruída ocupa a lateral esquerda, perto de (80,146), na mesma região do planeta intacto do final padrão. O mesmo mapa de oceanos/continentes foi separado por máscaras pixeladas em quatro grandes fragmentos, com espaços vazios entre eles e bordas de rocha discretamente aquecidas.
- Os quatro fragmentos usam a referência (35,101), com deslocamentos iniciais (-4,-5), (+6,-4), (-5,+5) e (+5,+8). Há seis pequenos destroços adicionais, sem partículas geradas continuamente.
- A nave do Zorp começa aproximadamente em (328,119), tamanho 38×26, reutilizando a mesma miniatura em Canvas do final padrão.
- A nave do Ravok começa em (351,78), tamanho 64×42. A silhueta maior mantém a linguagem do casco oficial: placas em degraus, cabine roxa, porta central e pequenas luzes vermelhas. Nenhum NPC extra aparece no card principal.
- Ambas as naves seguem lentamente para cima e à direita: Zorp até aproximadamente (353,98); Ravok até (363,62). O deslocamento é limitado e não retorna à Terra.
- Espaço quase preto, roxo escuro, estrelas fracas, rastros curtos e propulsão discreta. Não há nova explosão, clarão contínuo ou reencenação da destruição.
- O texto começa abaixo dos motivos do fundo, sobre a mesma faixa escura existente.

As superfícies do planeta e das naves são criadas uma vez e reutilizadas. O movimento usa o tempo do componente, coordenadas inteiras e imageSmoothingEnabled=false.

## Validação

O jogo real foi aberto em Chrome isolado com um save de desenvolvimento pronto para o ending card secreto. Não foi necessário repetir a cutscene anterior, que não foi modificada. O save normal do jogador não foi usado.

- Card oficial carregado, proporção e recorte preservados.
- Quatro fragmentos visíveis e duas naves visíveis, sem invadir a área central.
- Título, narrativa e SPACE dentro da área de leitura.
- SPACE inicia o fade existente e retorna ao menu; a flag ravokBadEndingSeen continua sendo persistida pelo controlador existente.
- Zero erros JavaScript, respostas HTTP com erro ou requisições falhas.
- 33 testes passaram, incluindo cache dos fragmentos e das duas naves, movimento, exclusividade de cada fundo, input e controladores.
- Final padrão e Férias Merecidas comparados pixel a pixel com a versão anterior: idênticos.
- PNGs oficiais e controladores das rotas/cutscenes não foram alterados.

## Arquivos alterados

- ending_card.js: fundo exclusivo do tema secreto.
- index.html: cache atualizado para 2.5.0_dark_earth_aftermath.
- ending_card.test.cjs: cobertura dos fragmentos e das duas naves; contagem do cache do retrato separada das superfícies do fundo.
- ravok_outcome.test.cjs: suporte dos mocks aos desenhos Canvas e verificação do retrato independente dos novos motivos de fundo.

Evidências: a-maior-conquista.png, a-maior-conquista-animacao.png, retorno-menu.png, browser-results.json e unit-tests.txt.
