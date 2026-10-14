# Skate — polimento de momentum, introdução e cores

## Grind

- Capture zone permanece em 24 unidades e intenção/buffer em 130 ms. É obrigatório manter SPACE; passar sem segurar não captura.
- A captura não altera instantaneamente x, y, velocidade horizontal ou vertical. Durante 100 ms, uma interpolação Hermite reduz o desvio normal até o grindPath, começando com a velocidade de chegada e terminando com a velocidade tangente.
- Projeção inicial: `vxProjetado = (vx + vy × slope) / (1 + slope²)`. A componente horizontal é limitada a 96–104% da velocidade de entrada, preservando o avanço arcade; a mudança ocorre suavemente. Depois, a velocidade converge gradualmente para 96% da velocidade do trecho.
- O contato usa o path real, incluindo rails inclinados e curvos. A entrada antes do primeiro poste não reposiciona Zorp em X.
- Animação faz transição curta para a postura de Grind no mesmo boardContact. Rotação acompanha a tangente suavemente; pequenas faíscas ciano dão sensação de deslizamento. Nenhum skate separado foi adicionado.
- HOLD mantém; RELEASE lança imediatamente. Impulso vertical: `-650 + clamp(slope × vx × 0,35, -100, 100)`. Rail ascendente acrescenta altura; descendente acrescenta até 8 unidades/s horizontais. O momentum horizontal remanescente decai gradualmente no ar, sem reset no próximo frame.
- Segurar até o fim do rail continua produzindo saída natural, sem salto automático.

## Saltos e rampas

- Normal Jump: primeiro SPACE imediato, velocidade vertical -350.
- Ollie: segundo toque em até 220 ms; upgrade do salto atual para -485, usando o flip existente.
- Super Jump de chão removido: parser não produz upgrade por duração, física rejeita essa ação, e os antigos thresholds/tiers de força foram retirados. Hold no ar é intenção de Grind.
- Saltos grandes vêm de RELEASE do Grind ou da rampa: inclinação × velocidade + impulso do lip escalado pela velocidade. Jump sobre a rampa acrescenta esse momentum ao salto normal. Hold não fornece energia adicional à rampa.
- A rampa secundária ROOFTOP LAUNCH precisou passar de launchStrength 120 para 450 para substituir a antiga dependência do Super de chão. Seu formato e gap de 260 unidades foram preservados. Antecipações de até 30 px voltaram a funcionar.
- Os três setpieces centrais e sua geometria foram preservados: cinco rails sem chão, grande escadaria + timed release e Big Ramp + Mega Gap. A Big Ramp especial mantém launchStrength 620 e sustentação SPACE+D existente.

## Introdução

Sete rails viraram cinco: removidos `transfer-a` e `three-b`. Extensões abaixo são horizontais, em unidades da pista.

- `first-rail`: 380,4 de extensão; plano, 39 acima do chão; primeiro contato com segurança abaixo.
- `first-link`: 170; ascendente, 109–126 acima do chão; ensina usar a saída do primeiro rail para ganhar altura.
- `transfer-b`: 445; descendente, de 160 para 60 acima do chão; fornece o lançamento para o primeiro risco.
- `three-a`: 320; curva que sobe e depois desce, alturas de referência 105 → 120 → 57; atravessa o primeiro gap.
- `three-c`: 560; curva longa, alturas de referência 55 → 74 → 40; prolonga o Grind sobre o segundo vazio.
- Gaps novos: x2470–2780 (310) e x3470–3870 (400). Ambos têm ausência real de chão, suportes visíveis e bordas de perigo.
- O início de `three-c` foi antecipado de x3400 para x3370 após encontrar uma entrada inconsistente. As tentativas com saltos de chão em ±12 px e releases em -20/-10/0/+8 px passam na introdução.
- Após o trecho arriscado existe um respiro de menos de 4 segundos até a próxima estrutura; não foram adicionados objetos para preencher espaço.

## Linguagem visual aplicada à pista inteira

- **Grindable — #65efff:** barra dos rails, handrails, pipes e bordas configuradas de bancos/ledges. Metal e suportes permanecem neutros.
- **Ramp — #ffb94d:** superfície, borda e lip de kickers, banks e launch ramps.
- **Safe — concreto/metal neutro, detalhe #6d9290:** chão, tops e plataformas. Sem brilho ciano falso em ledges não grindáveis.
- **Danger/lethal — #ff477d:** laterais perigosas discretas, marcações das escadas fatais, bordas e iluminação profunda dos gaps. A cor não transforma suportes decorativos em colliders.
- Câmera afastada preservada: zoom normal 0,72, enquadramento dos saltos e look-ahead existentes. Capturar Grind não centraliza nem reposiciona a câmera.

## QA e correções

- 123 testes aprovados em `skate/` e `skate_new/`, incluindo continuidade de posição/velocidade no blend, contato após 100 ms, quatro formas de rail, ausência de captura sem Hold e mesmo salto com tap ou hold.
- Runs completas do runtime, via eventos de teclado: linha completa 104,40 s / 22.511 pontos; sobrevivência com menos Grinds opcionais 104,18 s / 19.913 pontos. São replays de QA, não medições de jogadores humanos.
- ZERO INPUT e HOLD permanente falham em 1,80 s; MASH falha em 10,63 s. Segurar não vence automaticamente.
- Escadaria: dez saídas corretas repetidas; saída muito cedo e permanência até o fim falham. Mega Gap: SPACE+D passa; nenhum input, apenas SPACE, apenas D ou soltar cedo falham.
- Foi corrigido o roteiro de QA que soltava uma sequência de tap depois de já capturar o rail, provocando saída involuntária. Isso não adiciona assistência ao jogo oficial.
- O salto de aproximação do ledge final passou de x23450 para x23410 no roteiro de teste: a antiga captura instantânea mascarava uma colisão lateral. O collider perigoso foi preservado.
- O validador matemático de transfers agora executa a física real de RELEASE, substituindo uma fórmula antiga que simulava hold upgrade.
- Primeiro replay completo no navegador: COMPLETED, 104,04 s de física, 22.548 pontos, ambos os checkpoints, cinco rails do No Floor e final. Registro: `momentum-browser-run1.json`.
- Segundo replay completo no navegador: COMPLETED, 104,04 s, 22.520 pontos, ambos os checkpoints e todos os rails da linha. Registro: `momentum-browser-run2.json`. Sem erros no console. A revisão visual adicional da escadaria e do Mega Gap não exigiu mudar os setpieces ou a câmera.
- Controles operados manualmente na página de QA, com pausas: Hold no chão produz apenas Normal; Release no primeiro Grind produz estado Super no ar; novo Hold captura o rail elevado. Registros: `momentum-manual-hold.json`, `momentum-manual-release.json`, `momentum-manual-transfer.json`.
- A execução normal no navegador apresentou leituras de 57–60 FPS durante o trecho observado em primeiro plano. Em segundo plano, o navegador reduziu a cadência para perto de 1 FPS; os replays acelerados permitem concluir a inspeção, mas seus FPS não representam desempenho normal. Não foi comprovado 60 FPS sustentado durante uma run inteira.

Evidências: `momentum-tests.txt`, `momentum-final-runs.json`, registros do navegador e imagens `momentum-transfer.png`, `momentum-intro-risk.png`, `momentum-stair.png`. Nenhum outro minigame foi alterado nesta revisão.
