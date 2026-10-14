# Skate 2.0 — assets preparados

Este diretório contém recortes e metadados dos arquivos oficiais
`zorp_skate2.0.png` e `skate_assets2.0.png`, encontrados na raiz do projeto.
O jogo carrega os frames do Zorp deste catálogo para a apresentação do Skate.
As peças de cenário continuam preparadas para uma etapa futura; a fase e as
mecânicas não foram modificadas nesta integração visual.

## Conteúdo

- `zorp/`: 43 frames em 11 categorias de animação. O skate está no próprio
  frame. A quinta imagem de crash contém somente o skate separado.
- `scene/`: 10 módulos de chão, 11 rails, 7 peças de escada, 7 rampas,
  7 peças de abismo, 6 extras e 9 elementos de alerta/bloqueio.
- `manifest.json`: origem, tamanho, região do sheet, recorte, classificação,
  anchor e deslocamento de desenho para cada frame; regiões de gameplay e
  sugestões de superfície ou grindPath separadas do visual.
- `catalog.js`: mesmo manifesto como catálogo JavaScript independente,
  carregado pelo runtime para escolher as animações do Zorp.
- `preview/zorp-atlas.jpg`, `preview/zorp-anchor-atlas.jpg` e
  `preview/scene-atlas.jpg`: inspeção visual dos recortes e da linha de contato.
- `extract.py`: exportador reproduzível. Executa recorte uma vez, fora do loop
  de renderização. Requer Pillow e NumPy.

## Alinhamento do Zorp

Os frames normais usam `anchorPx` e `drawOffsetPx` referentes ao centro da
parte inferior do skate. O ponto amarelo e a linha ciano da prévia de anchor
mostram a posição física comum. Frames de queda usam o centro do corpo;
o skate sozinho usa o centro inferior da prancha.

Dois quadros de Super Jump (`03` e `05`) não mostram o skate com clareza.
Foram recortados e catalogados, mas `gameplayRecommended` é `false` nesses
dois quadros. O manifesto fornece a sequência recomendada sem eles. Nenhum
skate foi desenhado ou acrescentado por código.

## Geometria

As regras de apoio visual, junção de chão, gaps e colisão por instância para a
futura pista estão em `SPOT_ASSEMBLY_RULES.md`. O módulo `assembly_rules.js`
expõe os papéis e um validador preliminar de montagem, sem alterar a fase atual.

`collision` classifica SAFE_TOP, GRINDABLE_TOP, DANGEROUS_SIDE,
FATAL_BELOW e DECORATION como propriedades independentes. Os arrays em
`geometryHints` estão normalizados **dentro da região do sheet** (`sourceRegion`)
e são guias visuais de superfície ou grindPath. A posição final de colisão
deve ser calibrada quando cada peça for colocada na fase. Nenhuma hitbox usa
automaticamente o tamanho inteiro do sprite. `launchStrength` é um valor
sugerido de catálogo; a física atual não foi alterada.

## Limites do sheet de cenário

Algumas ilustrações se sobrepõem no PNG original, sobretudo pares de escada,
a junção da rampa de transição com a rampa grande e cabos entre pilares do
abismo. Os recortes preservam os pixels visíveis, mas nessas 12 peças pode
restar uma pequena parte do vizinho. Elas estão marcadas em `reviewFlags`.
Separação perfeita exigiria uma fonte com camadas independentes ou retoque
manual desses pixels antes de usar tais peças isoladamente.

Para reproduzir os PNGs e o manifesto, execute `extract.py` com o Python do
ambiente. Os arquivos originais não são alterados.
