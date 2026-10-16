# Ajustes pontuais — Arco, Skate e Ping-Pong

## Arco e Flecha

Os alvos, bandeirolas, fardos de feno e cavalete usam agora o frame fixo 0.
Foi removida a seleção de frame por tempo e as alternâncias entre variantes.
A mudança está restrita ao desenho da ilha; o registro de assets e as animações
do minigame de arquearia permanecem iguais.

Validação: duas leituras da região interna da ilha, separadas por 850 ms,
apresentaram **zero pixels alterados**. Mestre, prompt e acesso aprovados.

## Skate

Foi redesenhada somente a peça indicada no anexo, no canto superior esquerdo.
A rampa apresenta superfície curva, deck, coping metálico ciano, face estrutural
apoiada no chão e um skate estacionado na base. O antigo grafite foi retirado.

O footprint de colisão foi preservado. A comparação antes/depois confirmou que
as diferenças estão contidas na região (50,31)–(125,93), que abrange somente a
peça indicada. O restante da ilha, Mestre e entrada do minigame ficaram iguais.

[Prévia da ilha do Skate](overworld_points_skate.png)

## Ping-Pong

- Mesa centralizada em X225, entre os dois participantes.
- Aprendiz à esquerda: (138,187), com identificação de zero pontos.
- Mestre à direita: (312,187), com identificação azul.
- Área demonstrativa e cesto reposicionados junto da mesa.
- Placar: **MESTRE/AZUL 50 × 0 APRENDIZ**, com os nomes e números nas cores
  correspondentes. Trata-se do placar decorativo do overworld.
- Raquete à direita com cor azul para reforçar o time do Mestre.
- Os três colisores da mesa, cesto e placar acompanham os elementos reposicionados.
- Escalas, sprites, prompts e comandos de interação foram preservados.

Texto final do Aprendiz:

> Desafiei o mestre e não consegui fazer um ponto... Esse vovô é realmente bom nisso ou eu sou muito ruim?

A frase foi conferida no diálogo real, após pressionar e soltar E.

[Composição central](overworld_points_pingpong.png) · [Diálogo no navegador](overworld_points_dialogue.png)

## Preservação do escopo

Somente três funções de desenho foram alteradas: `drawIlhaArco`,
`drawIlhaSkate` e `drawIlhaPingPong`. Fora delas, foram ajustados apenas os dois
registros de NPCs e os três colisores específicos do Ping-Pong.

Uma comparação do restante de `script.js` confirmou que não houve alterações
nos sistemas compartilhados. Nenhum módulo de gameplay foi modificado.
`overworld_visuals.js` e os catálogos de sprites permaneceram intactos.

As capturas de **Hub, Basquete, Boxe, Corrida, Escalada e Surf** ficaram idênticas
às capturas anteriores, usando relógio e posição de jogador controlados.

## Testes no navegador

Chrome em `http://localhost/2025/Festival_dos_Esportes/`, com cache desativado:

- Overworld e sprites carregados corretamente.
- Elementos decorativos do Arco estáticos.
- Rampa do Skate inspecionada visualmente.
- Mesa exatamente no ponto médio entre Aprendiz e Mestre; Mestre à direita.
- Desenho do placar confirmado: 50 azul, 0 vermelho.
- Texto do Aprendiz visível e correto.
- Prompts e entradas/retornos dos oito minigames aprovados, incluindo os três
  esportes ajustados. Os retornos de Ping-Pong/Arco/Escalada foram exercitados
  com estados de resultado preparados, sem simular partidas completas.
- 28 verificações de navegação até NPCs e 16 conexões entre ilhas aprovadas.
- Zero 404, TypeError, ReferenceError, outras exceções ou warnings registrados.
- Aproximadamente 60 FPS no teste local.

Evidências detalhadas: `overworld_points_qa.json`.

## Assets e arquivos

Nenhum PNG de gameplay foi criado, substituído ou editado. Foram reutilizados os
sprites existentes e o desenho em Canvas. As novas imagens em `docs/` são somente
capturas de validação.

- `script.js`: três desenhos de ilha e registros locais do Ping-Pong.
- `index.html`: versão do script atualizada para `10.4.2_overworld_details`.
- `docs/OVERWORLD_PONTUAL_REPORT.md`: este relatório.
- `docs/overworld_points_qa.json`: resultados e comprovação do escopo.
- `docs/overworld_points_pingpong.png`, `overworld_points_dialogue.png` e
  `overworld_points_skate.png`: prévias.
