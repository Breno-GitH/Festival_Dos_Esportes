# Basquete — polimento da torcida e placar da arena

## Torcida preservada e refinada

Continuam sendo **66 espectadores em 3 fileiras**: agora explicitamente **30 humanos e 36 aliens**. Não há categorias ou desenhos de robôs, animais, mascotes, monstros ou objetos com rosto.

Humanos têm cinco tons de pele, cinco penteados (curto, bob, cacheado, rabo de cavalo e careca), bonés/faixas opcionais, roupas de quatro estilos e diferenças de altura/largura corporal. Aliens têm paletas próprias, três formatos de cabeça, uma ou duas antenas, olhos diferentes e roupas variadas. Todos são desenhados por retângulos inteiros, sem imagem externa e sem deformação por escala X/Y.

As identidades, assentos, medidas e preferências são construídos uma vez. A animação reutiliza os mesmos objetos de pose e a geometria da arquibancada. Não utiliza a aleatoriedade da gameplay. Nas duas partidas completas, as referências e os atributos de aparência permaneceram estáveis.

As três profundidades foram mantidas, com personagens menores/simplificados atrás e maiores/detalhados à frente. A fileira intermediária é deslocada, e há variações pequenas de X/Y, altura e postura. Os pés possuem referência de apoio/sombra no degrau; levantar, sentar e pequenos pulos são poses deliberadas, sem deslocar o assento lógico. O deslocamento lateral permanece limitado ao espaço de cada cadeira.

## Reações

- **IDLE:** palmas, acenos, olhar lateral, balanço e pequenos pulos ocasionais, com ciclos individuais.
- **BASKET / THREE / SWOOSH:** reações crescentes para 2 pontos, 3 pontos e cesta limpa.
- **STEAL / BLOCK:** reações rápidas/curtas, acionadas pelos eventos reais existentes.
- **RIM:** expectativa e inclinação do corpo; contatos consecutivos aumentam a apreensão, sem comemorar uma cesta inexistente.
- **COMEBACK / CLUTCH:** reação maior à troca de liderança e cestas nos últimos segundos.
- **TENSION:** uma partida apertada nos dez segundos finais aumenta a agitação. Mesmo com placar folgado, o final faz mais espectadores ficarem em pé, de forma mais discreta.
- **VICTORY:** comemoração do vencedor e o confete moderado já existente, limitado à arquibancada.

Fãs de Zorp e do Mestre estão misturados com neutros; há preferência por região sem formar dois blocos uniformes. Os fãs do autor do lance reagem mais. Neutros dão mais atenção a Swoosh, três pontos, bloqueios e outras jogadas impressionantes.

## Placar eletrônico por Canvas

Novo módulo `basketball_scoreboard.js`: suportes presos ao teto, moldura chanfrada em pixels, painel escuro, três compartimentos, LEDs, dígitos e mensagens. Geometria e glifos são preparados uma vez. O placar não usa PNG, fonte externa nem suavização.

Exibe **ZORP / pontuação — TEMPO — pontuação / MESTRE**, com segundos inteiros de dois dígitos. Lê diretamente `BasketballGame.score.zorp`, `score.master` e `clock`. O tempo de animação do painel serve somente para LEDs/mensagens: não existe outro cronômetro de partida.

- De 10 a 6 segundos: moldura/LEDs pulsam discretamente.
- De 5 a 1: piscam mais rápido, mantendo os dígitos sempre visíveis.
- Cestas fazem o valor do jogador crescer brevemente e voltar ao normal.
- Status temporários incluem **3 PONTOS**, **SWOOSH!**, **ROUBO!**, **TOCO!**, **VIRADA!**, **ULTIMOS 10** e **FIM**. Eventos não removem os pontos nem o tempo.
- Mensagens retornam ao letreiro padrão após a duração definida. FIM permanece no resultado.
- A prorrogação usa o `clock` já existente, sem mudar sua regra.

O renderer deixa de amostrar também o retângulo do placar estático embutido em `arena_basketball_background.png`. A faixa da torcida PNG continua excluída. Os arquivos físicos foram preservados, e o PNG segue usado apenas na arquitetura/quadra restantes.

Foram retirados da renderização o placar e o cronômetro do HUD superior, os anúncios grandes que cruzavam o painel e a segunda cópia numérica do placar na tela de resultado. As barras de especial permanecem nas laterais. O painel fica legível durante o resultado, com **00 / FIM** e o placar final real.

Ordem de desenho verificada: **torcida → painel → aros → jogadores → bola**. Assim, bola, personagens e cestas têm prioridade visual. Não foram alterados física do aro, recuperação de bola presa, controles, IA ou sprites dos jogadores.

## Testes no Chrome real

### Eventos controlados

**13 cenários aprovados** no jogo completo: idle, 2 pontos, 3 pontos por tecla J, Swoosh, Mestre marcando, partida apertada, cesta no fim, virada, rim-out, roubo, bloqueio e vitória de cada jogador. Os cenários usam condições iniciais controladas e as funções reais de eventos/física. Pontos e tempo do painel foram comparados ao estado do jogo a cada frame observado.

### Partidas completas

**Duas partidas completas de 60 segundos**, em tempo real, com IA normal e comandos enviados como eventos de teclado do navegador. Sem acelerar o relógio, injetar pontos ou reposicionar os personagens durante a partida. Trata-se de QA automatizado por teclado, não de uma amostra de playtest humano.

1. **Zorp 13 × 5 Mestre**: 3 cestas de três pontos, um Swoosh, cestas normais, roubos, tocos, contatos no aro, cesta decisiva e vitória.
2. **Zorp 7 × 2 Mestre**, após o último ajuste de espectadores em pé no fim: pontuação dos dois jogadores, três pontos, Swoosh, roubos, tocos, aro e vitória.

Nas duas:

- O painel coincidiu com os pontos e o tempo reais em todas as amostras: **zero divergências**.
- Os estados NORMAL → PULSE → FLASH → FINAL apareceram.
- O jogo encerrou em `clock=0`; após mais dois segundos no resultado, tempo e placar continuaram iguais, exibindo **00 / FIM**.
- **Zero chamadas de desenho do HUD numérico antigo** e **zero amostragens de pixels dos antigos público/placar do PNG**.
- Identidades, objetos dos espectadores e geometria da arquibancada permaneceram estáveis.
- Na segunda partida, a quantidade de espectadores em pé subiu de 16 no início para 29 perto de cinco segundos, mesmo sem placar apertado. O cenário controlado de partida apertada apresentou reação mais intensa.

### Desempenho e erros

- Partida 1: **59,996 FPS**, desenho da torcida ≈ **1,05 ms/frame**, painel ≈ **0,23 ms/frame**.
- Partida 2: **59,996 FPS**, torcida ≈ **1,01 ms/frame**, painel ≈ **0,22 ms/frame**. Tempo de frame p95: **16,8 ms**.
- Cenários controlados: aproximadamente **60 FPS**.
- **Zero 404, TypeError, ReferenceError, exceções de execução ou falhas de carregamento** nas sessões observadas.

As capturas foram inspecionadas para conferir humanos/aliens, profundidade, escala, apoio dos pés, legibilidade do painel e ausência de HUD sobreposto.

**109 testes automatizados aprovados:** 78 regressões anteriores de física/cesta, 21 testes da torcida e 10 do painel. Incluem identidades fixas, diversidade, reação por preferência, apreensão no aro, final com placar folgado/apertado, deltaTime, timer único, congelamento no resultado, expiração/prioridade de mensagens, ausência de PNG no painel e dígitos sempre visíveis.

## Arquivos alterados

- `basketball_crowd.js`: diversidade, posturas, identidade, geometria reutilizada e recortes do cenário.
- **Novo** `basketball_scoreboard.js`: painel eletrônico procedural.
- `basketball_1v1.js`: integração visual e remoção do HUD redundante.
- `index.html`: carregamento do painel e versões de cache.
- `basketball_crowd.test.cjs`: validação do refinamento.
- **Novo** `basketball_scoreboard.test.cjs`: testes do painel.
- `basketball_court_physics.test.cjs`: somente carregamento do painel no ambiente simulado; física preservada.
- Este relatório e `docs/qa/basketball_crowd_polish/`: evidências e roteiros de QA.

## Evidências

[Cenários e FPS](qa/basketball_crowd_polish/browser-results.json) · [Primeira partida](qa/basketball_crowd_polish/full-match-first.json) · [Partida final](qa/basketball_crowd_polish/full-match.json) · [109 testes](qa/basketball_crowd_polish/unit-tests.txt)

[Torcida e painel](qa/basketball_crowd_polish/first-look.png) · [Swoosh](qa/basketball_crowd_polish/swoosh-reaction.png) · [Últimos cinco segundos](qa/basketball_crowd_polish/full-5.png) · [Resultado](qa/basketball_crowd_polish/full-result.png)
