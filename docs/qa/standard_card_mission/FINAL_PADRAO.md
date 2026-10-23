# De Volta para Casa — missão cumprida

## Arte oficial sem fundo preto

- Arquivo final: `zorp_finalpadrao.png`, RGBA, 1254 × 1254. O nome oficial foi mantido.
- O recorte foi produzido com a ferramenta integrada `image_gen`, usando a skill `imagegen` em modo de remoção de fundo.
- Para preservar o desenho original, o resultado gerado forneceu somente orientação para a máscara de transparência. A composição final foi feita por Canvas com os pixels de cor do PNG original. A arte gerada não substituiu os pixels de Zorp ou das medalhas.
- A máscara guia a remoção das áreas quase pretas vazias, incluindo espaços entre medalhas, sem eliminar os olhos, a roupa escura, os emblemas ou os contornos que pertencem à arte.
- A comparação dos arquivos encontrou **zero pixels opacos com RGB alterado** e **zero pixels de cor protegida eliminados**. Existem 775.936 pixels transparentes. A conversão para alpha pode zerar os valores RGB dos pixels totalmente transparentes; isso não modifica a arte visível.
- Zorp, os oito emblemas esportivos e suas oito medalhas continuam sendo os do PNG original. Nenhuma medalha nova foi criada. O original anterior foi guardado em `before/zorp_finalpadrao.png` nesta documentação.

## Composição por Canvas

- Título oficial: **DE VOLTA PARA CASA**, em letras locais de pixels.
- Azul-marinho predominante, detalhes dourados e texto claro.
- Removida a placa escura que o Canvas desenhava atrás da arte no final padrão.
- Arte maior, com escala uniforme: `172 × 172`, posição aproximadamente `(139,58)` no Canvas 450 × 300. SourceRect inteiro `[0,0,1254,1254]`.
- Oito estrelas ambientais fixas em locais discretos, com cintilação lenta e fases diferentes. Não existe sistema de partículas, medalha desenhada no peito ou conjunto adicional de oito medalhas.
- A imagem permanece estável depois da entrada, sem flutuação contínua.
- Texto:

  “Zorpzin conquistou as oito medalhas da Ilha dos Campeões.”

  “Com sua missão concluída, chegou a hora de voltar para casa.”

- `[SPACE] CONTINUAR` mantém o fade e o retorno ao menu do componente compartilhado.
- Cache renovado no PNG e no script de apresentação.

## Conferência visual

A tela foi aberta em Chrome isolado para revisão da composição. O resultado mostra o azul-marinho atravessando as áreas antes pretas do PNG, a expressão de Zorp legível e todas as oito medalhas. A prévia não registrou erros de console ou de carregamento.

As apresentações de Férias Merecidas e A Maior Conquista, suas artes, as cutscenes, os requisitos e a lógica de gravação não foram modificados.

## Arquivos alterados

- `zorp_finalpadrao.png`: alpha transparente com cores originais da arte preservadas.
- `ending_card.js`: somente o preset e os detalhes do tema `champion`, a caixa maior de retrato e suporte ao tempo das estrelas.
- `index.html`: versão do componente para renovar o cache.
- `ending_card.test.cjs`: expectativas de tamanho do final padrão ajustadas à nova caixa; nenhuma nova suíte foi executada nesta etapa visual.

Evidências: `de-volta-para-casa.png`, `pixel-preservation.json`, `cutout-metadata.json` e `visual-preview.json`.

## Prompt utilizado

Use case: background-extraction. Edit target: the attached official pixel art PNG zorp_finalpadrao.png. Remove ONLY the near-black background/matte, including black empty spaces BETWEEN the eight medals, the gold rays and Zorp. Output a genuinely transparent RGBA PNG, same square composition, full image uncropped. Absolutely preserve the source artwork: identical Zorp character, face, antennae, hands, jacket, shoes, original pose, exactly EIGHT existing medals in their exact positions with identical sports emblems, golden linking arcs, rays and small stars. Do not redraw, reinterpret, retouch, smooth, sharpen or change RGB colors of the character or medals. Black outlines, black eyes and dark clothing belonging to Zorp and dark marks INSIDE medals are foreground and must stay opaque. No ninth medal. No new chest medal. No text, additions, glow, white halo, shadows, replacement background or checkerboard pixels. The only desired edit is an alpha cutout of the black matte so this exact artwork can be layered on a navy Canvas game ending screen. Prefer retaining the original 1254x1254 resolution and all original pixel details.
