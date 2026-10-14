# Skate — revisão visual, escala e coerência física

## Escopo concluído

A pista continua procedural, linear e com a mesma ordem de seções. Foram preservados os três setpieces, os controles, as animações do Zorp, o score, a medalha e o fluxo global. Nenhum outro minigame foi alterado neste passe. Nenhum asset gráfico de gameplay foi adicionado.

O renderer e o builder continuam compartilhados entre a pista oficial e o playtest. A superfície desenhada das rampas e a barra dos rails usam os mesmos pontos que a física. Estruturas decorativas não acrescentam colliders.

## Proporções

- Big Ramp final: **290 → 110 px de altura**, redução de 62%. Comprimento: **276 → 420 px**. A nova superfície possui 41 pontos, aproximação progressiva e lip de aproximadamente 27,5°. Deck, espessura, travessas e pés ficam abaixo da superfície física.
- Mega Gap: **895 → 1.120 px**, aumento de 25%. As margens, fatal area, plataforma de chegada e elementos posteriores foram deslocados juntos. A landing tem 340 px e uma face de concreto até a base estrutural.
- Grande escadaria: **12 → 24 degraus**; comprimento horizontal **660 → 960 px**. Cada degrau mede 40 × 17,5 px; desnível total de 420 px. O corrimão percorre 1.000 px na horizontal, começa 30 px antes dos degraus e continua apoiado neles.
- Gap após a escadaria: **185 → 210 px**. Landing de 160 px, com estrutura inferior. O Grind da escadaria dura aproximadamente 3,67 s.
- Escadas secundárias: 12 degraus menores por conjunto, preservando suas respectivas áreas e desníveis.
- Small kickers: até 112 px de comprimento e 34 px de altura, mantendo o ponto de saída. A rampa intermediária do rooftop também foi reduzida de 230 para 110 px de altura.
- A pista conserva 22 rampas, 31 rails e 12 gaps. Comprimento útil final: 25.699 px. Checkpoints em aproximadamente 33,5% e 69,4%.

Para manter a travessia possível com a rampa mais baixa e o gap maior, foram recalibrados somente os parâmetros do lançamento já existente: launchStrength 620 e sustain máximo de 3.400 ms. Não foram adicionados estados, teclas ou uma nova interpretação de input. D + SPACE continua restrito ao Mega Air.

## Construção e materiais

- **Rails:** barra de metal com topo contrastante, postes distribuídos ao longo do path, pés aparafusados e apoios de alturas diferentes. Curvas visuais seguem exatamente o grindPath. Rails no vazio possuem pilares, travessas e contraventamento em X. Bordas de benches/ledges aproveitam a estrutura do objeto.
- **Rampas:** kickers baixos em madeira, rampas metálicas com travessas, banks de concreto e curva contínua nas transições curvas. Não há imagem esticada ou chão reto oculto substituindo a inclinação.
- **Ground:** superfície, curb, espessura, parede frontal, fundação, juntas, drenos e pequenas rachaduras. Juntas das escadas ficam dentro da estrutura, abaixo do degrau local.
- **Plataformas/ledges:** tampo plano, borda legível, face vertical, base e detalhes de concreto. As plataformas elevadas têm estrutura até o nível de apoio.
- **Bench:** assento de madeira, divisões nas tábuas, apron, pernas metálicas em A e travessa. Bancos longos recebem três apoios; colocações elevadas têm plinto de concreto visível. Topo seguro e lateral perigosa permanecem como antes.
- **Fatal gaps:** ausência real de chão, paredes separadas nas margens, sombras profundas, pilares distantes quebrados e cabo de serviço abaixo da trajetória. Marcações âmbar nas bordas distinguem risco de landing segura.
- **Background:** três camadas de cidade noturna, janelas discretas, antenas/utilidades de telhado, estruturas industriais, palmeiras e postes. Parallax de 0,07 / 0,17 / 0,31; vegetação em camada intermediária. Nenhum foreground cobre os rails ou as landings.

## Câmera final

- Normal: zoom **0,72**, Zorp aproximadamente em **25,5–30%** da largura.
- Super Jump: limite de zoom **0,62**, com redução adicional quando a altura exige. Terreno e contato futuro orientam a câmera; o salto não arrasta a visão para o céu.
- Grande escadaria: zoom observado **0,253–0,42**. O enquadramento inclui a landing depois do buraco, horizontal e verticalmente, durante a preparação do release.
- Mega Gap: zoom mínimo observado **0,213**; limite de 0,32 durante o setpiece. A margem distante permanece no campo visível durante a travessia. Zorp fica mais à esquerda e existe espaço abaixo para mostrar profundidade.
- Look-ahead aumenta com a velocidade. Smoothing foi mantido; não foi criada câmera exploratória.

## Correções após os playtests

### Primeiro passe

- O lançamento mais baixo do rooftop deixou pouca margem em uma saída antecipada. Seu gap foi ajustado para 260 px e a landing ampliada para 760 px.
- A câmera do Mega Gap mantinha a estrutura muito baixa. A referência vertical passou a 67% da tela; a câmera agora acomoda rider, landing e profundidade do vazio.
- Apoios da escadaria secundária foram alinhados aos degraus reais, incluindo a fundação antes do primeiro degrau.

### Segundo passe e verificação final

- Algumas alturas menores dos primeiros rails prejudicaram a captura com a trajetória já existente. As alturas de destino foram corrigidas para preservar a transferência sem alterar a tolerância do input.
- Capas dos pilares da chain no vazio foram rebaixadas para não atravessar a barra de Grind.
- O primeiro enquadramento afastado da escadaria ainda escondia a landing à direita. Foi adicionado ajuste horizontal baseado na margem de chegada, além do ajuste vertical. A screenshot final mostra escada, gap e landing juntos.
- O banco final recebeu um terceiro apoio. As superfícies e colliders não mudaram por causa desse detalhe visual.

## Validação

- **111 testes passaram**, sem falhas. Incluem percurso completo a 30, 60, 90 e 120 Hz, transições, colliders e câmera.
- A escadaria foi repetida dez vezes nos testes. Release correto atravessa; release cedo ou depois do final falha. O rail não salva automaticamente o jogador no término.
- Mega Gap: D + SPACE atravessa; sem ambos, SPACE isolado, D isolado e release com 1.000 ms falham. Sustain tem duração máxima e timeScale volta a 1.
- Foram observadas duas runs completas renderizadas durante os passes e outra após a última correção da câmera. A última concluiu em **103,6 s de simulação**, score 22.130, combo máximo 7.104, ambos checkpoints e todos os rails técnicos esperados. Sem colisões, quedas ou mensagens de erro do navegador.
- Essas runs foram **replays automatizados de teclado pelo runtime real**, com aceleração de QA. Não representam execução manual humana. O modo acelerado evita que o navegador em segundo plano distorça o timing; ele não teleporta Zorp nem modifica a física da run.
- A última run registrou 55,6 FPS de renderização durante o replay acelerado. Isso não é uma certificação de 60 FPS em jogo normal ou em outros computadores.

## Evidências e arquivos

- `visual-browser-final.json`: registro completo do último replay renderizado.
- `visual-scale-validation.json`: medições físicas, casos de falha e trace de câmera atualizado.
- `visual-scale-tests.txt`: resultado dos 111 testes.
- `visual-stair-final.jpg`: descida com landing já visível.
- `visual-stair-exit-final.jpg`: release, buraco e landing.
- `visual-mega-ramp-final.jpg`: proporção da rampa e do Mega Gap.
- `visual-mega-air-final.jpg`: landing visível durante o voo.
- `visual-bench-final.jpg`: banco construído e escala em relação ao Zorp.
- `visual-complete-final.jpg`: final da run.

Código principal do passe: `procedural_track.js`, `official_procedural_course.js` e `skate_ollie_runtime.js`. `level_playtest.html` recebeu apenas facilidades de QA. `index.html` recebeu atualização de versão dos scripts do Skate para invalidar o cache.

## Limitações visuais restantes

No enquadramento mais amplo do Mega Gap, Zorp e detalhes pequenos ficam menores. A cena prioriza mostrar o tamanho do buraco e a margem distante. O desenho continua deliberadamente procedural: perspectiva simplificada, contornos pixelados e iluminação sem arte final. Não foi identificada uma nova divergência entre superfície visual e física nos casos testados; a avaliação de dificuldade por jogadores humanos continua distinta dos replays automatizados.
