# Vitória da Escalada — Zorp 2.0

## Sprites

Fonte oficial: `zorp_escalada2.0.png`.

- `victory_01.png`: braços abertos, pose alegre apoiada.
- `victory_02.png`: comemoração com perna levantada.
- `victory_03.png`: variação alegre da comemoração.
- `victory_04.png`: punho levantado.

Playback: **01 → 02 → 03 → 04 → 01**, a 5 fps, sem loop. A primeira pose
é reutilizada como pose final; não há frame inventado. A comemoração permanece
visível durante 2,5 segundos, com relógio em segundos, e mantém a pose de
vencedor no resultado.

Os quatro PNGs contêm somente o personagem. As marcas laranja soltas acima
da cabeça foram excluídas pela separação dos componentes visíveis, preservando
todos os pixels opacos do corpo, equipamentos e antenas. Nenhum fundo, chão,
texto ou moldura da folha é incorporado ao personagem. Canvas 144 × 192,
âncora dos pés (72, 186), escala uniforme 64/153, suavização desativada.
Os outros 49 PNGs do atlas permaneceram idênticos byte a byte.

## Fluxo

Último apoio → contato físico das mãos na borda → HANG → PULL_UP → STAND
→ REVEAL → DIALOGUE → MEDAL (700 ms) → CELEBRATE (2,5 s) → COMPLETE/resultado.

`ClimbSummit.canAward` exige confirmação física de pé, apoio final correto,
X dentro da superfície, altura dos pés coincidente com o cume, vida positiva
e diálogo concluído. O sistema oficial recebe a medalha em MEDAL. A flag
`summitSequence.medalAwarded` impede entrega duplicada na mesma sequência.
`canCelebrate` e `canFinish` também exigem essa confirmação. Uma coordenada Y
ou um estado em pé isolado não concede medalha ou comemoração.

Medalha, brilho e pequenas partículas são desenhados separadamente em Canvas.
A câmera e o Mestre mantêm a apresentação do cume já existente.

## Validação

Chrome real isolado, com entradas de teclado automatizadas e inspeção das
capturas de tela:

- salto real do último apoio, borda e quatro poses de pull-up;
- revelação do topo e diálogo sem avanço automático;
- medalha ausente antes do diálogo e presente antes da comemoração;
- quatro poses VICTORY, uma única sequência e pose final estável;
- equivalência da animação em passos de 30/60/144 Hz;
- checkpoints não iniciam VICTORY;
- resultado e retorno ao overworld preservando a medalha;
- atlas via file://, sem requisições de sprites antigos;
- execução final sem 404, TypeError, ReferenceError ou warnings.

A primeira tentativa com objetos do Mestre ativos foi encerrada por perda de
vidas na transição para a neve. Essa tentativa automatizada não é uma conclusão
manual da montanha; a validação do evento final foi feita separadamente com
contato físico real na borda, sem atribuir a vitória ou a medalha por debug.

Uma segunda run controlada percorreu toda a montanha desde a base, com entradas
de teclado e os projéteis do Mestre desativados pelo parâmetro de QA existente.
Nenhum reposicionamento foi usado durante a subida: cinco zonas, ambos os
checkpoints e contato físico no cume. Tempo até ficar em pé: **75,35 s**;
resultado após a sequência: **84,31 s**; três vidas; média **59,98 FPS**.
Houve uma falha transitória de conexão do servidor HTTP de QA ao carregar
um PNG preexistente de arquearia; não foi um 404 nem erro de JavaScript.
A bateria dedicada de oito verificações terminou com rede e console limpos.
O PNG da arquearia respondeu HTTP 200 na rechecagem, sem modificar seus assets.
A mesma bateria de oito verificações foi repetida pelo endereço `file://` do
jogo, também sem requisições falhadas, warnings ou erros de JavaScript.

## Arquivos

- `climb_summit.js`: confirmação física, etapa de medalha e apresentação final.
- `climb_sprites.js`: gate da VICTORY e pose mantida no resultado.
- `script.js`: entrega pelo sistema oficial na etapa MEDAL.
- `tools/prepare_climb_zorp_v2.py`: separação dos efeitos e sequência sem loop.
- `climb_assets/zorp_v2/victory_01.png` até `victory_04.png`.
- `climb_assets/zorp_v2/manifest.json` e `manifest.js`.
- `climb_assets/climb_assets_manifest.json`.
- `index.html`: versões dos arquivos modificados para evitar cache antigo.
- `docs/climb_sprite_atlas.html`: preview respeita o fim da animação e mostra
  cada imagem distinta uma vez.
- `docs/climb_zorp_v2_atlas.md`, `docs/climb_animation_states.md`, este relatório
  e `docs/climb_asset_previews/climb_zorp_v2_preview.png`.
