# Pre-game briefing — sistema compartilhado

## Resultado

Os oito minigames usam o mesmo cartão esportivo em Canvas antes de iniciar:

1. Ping-Pong
2. Basquete
3. Maratona
4. Skate
5. Arquearia
6. Escalada
7. Boxe
8. Surf

O layout segue a referência visual fornecida: arena visível sob overlay escuro, painel central em pixel art, faixa de competição, título, subtítulo, ícone temático, objetivo, até três linhas de controles, dica e botão **[ESPAÇO / ENTER] COMEÇAR**. Proporções, tipografia e hierarquia são compartilhadas; cada esporte muda apenas a cor de destaque, o ícone e o conteúdo.

## Fluxo

Interagir com o Mestre no Overworld abre o briefing da modalidade. Enquanto o cartão está aberto:

- física, cronômetro, IA, projéteis, obstáculos e spawns ficam congelados;
- o loop desenha somente a arena já preparada e a animação do painel;
- teclas usadas para abrir ou fechar o painel não vazam para o gameplay;
- Espaço ou Enter inicia a modalidade após uma saída curta;
- Esc cancela e devolve Zorp à ilha correta.

Estados de apresentação: **CLOSED → OPENING → READY → CLOSING → CLOSED**. O painel não fecha sozinho e respeita o tempo de leitura do jogador.

## Conteúdo por modalidade

### Ping-Pong

- Objetivo: chegar primeiro a 50 pontos.
- Controles: W/S alinham; A/D recuam ou avançam; Espaço usa a raquetada global com a barra cheia.
- Dica: a bola acelera nas trocas e o Mestre pode ativar MULTIBALL.

### Basquete 1v1

- Objetivo: marcar mais pontos antes do tempo acabar.
- Controles: A/D movem e toque duplo executa dash; W pula; J/K/L controlam arremesso/roubo, finta/defesa e especial.
- Dica: arremessos atrás da linha valem 3 e Swoosh recebe feedback especial.

### Maratona

- Objetivo: cruzar a chegada depois de completar as duas voltas implementadas atualmente.
- Controles: WASD ou setas movem; Espaço pula barreiras.
- Dica: desviar de obstáculos e manter a melhor linha.

### Skate

- Objetivo: completar o percurso e cruzar a chegada.
- Controles: Espaço salta, segundo toque faz Ollie; segurar Espaço usa rampas e sustenta Mega Air; no ar junto de rail segura o grind, e soltar executa Super Jump Out.
- Dica: todas as rampas usam a mesma regra, segurar Espaço.

### Arquearia

- Objetivo: superar a pontuação do Mestre antes do tempo acabar.
- Controles: WASD move na área de tiro; Espaço dispara uma flecha.
- Dica: alvos pequenos valem mais e explosivos acertam vários alvos.

### Escalada

- Objetivo: subir a montanha e alcançar fisicamente o topo.
- Controles: A/D controlam o salto no ar; W ou Espaço fazem um salto; agarrar apoio válido é automático.
- Dica: há várias rotas e checkpoints funcionam como pontos de descanso.

### Boxe

- Objetivo: derrotar o Mestre no ringue.
- Controles: WASD move e controla profundidade; J/K/L executam jab, golpe forte e hook; Shift/Espaço/Q controlam defesa, esquiva e especial.
- Dica: posição e profundidade determinam se o golpe alcança.

### Surf

- Objetivo: completar o percurso sem wipeout.
- Controles: Espaço/W sobe e soltar desce; no ar, Espaço sustenta a trajetória; WASD executa manobras aéreas.
- Dica: ganhar velocidade na onda e escapar da whitewater.

Os textos refletem a implementação atual. Por isso, a Maratona informa **duas voltas**, o Swoosh do Basquete informa feedback especial sem prometer bônus de tempo, e o Skate pede a chegada sem citar uma pontuação mínima inexistente.

## Componente

`pre_game_brief.js` expõe `PreGameBrief` e `showPreGameBrief`. `pre_game_brief_configs.js` concentra as oito configurações curtas. O controlador compartilhado cuida de animação, entrada, desenho, proteção contra teclas seguradas, início e cancelamento; cada modalidade fornece apenas seus callbacks de limpar entrada, iniciar e retornar ao Overworld.

Os ícones de raquete, cesta, corrida, skate, arco, montanha, luva e prancha são desenhados por código. Nenhuma imagem externa foi adicionada ao cartão.

## Validação real no navegador

O jogo completo foi carregado em Chrome. Para cada modalidade, Zorp foi posicionado junto ao Mestre e a abertura ocorreu pelo evento real de interação do Overworld. Em seguida o teste:

1. confirmou o briefing correto;
2. registrou o estado completo da modalidade;
3. aguardou com o cartão aberto e confirmou que o estado permaneceu congelado;
4. pressionou Espaço;
5. confirmou a transição para o estado ativo e o avanço da simulação.

Resultado: **8 de 8 modalidades aprovadas**, com **zero exceções de execução, zero respostas HTTP com erro e zero falhas de carregamento**. As oito capturas foram inspecionadas: textos cabem no painel, os controles permanecem legíveis e não há sobreposição com o botão.

A suíte automatizada completa do projeto também foi executada: **285 testes aprovados, 0 falhas**. Ela inclui 20 verificações específicas do briefing e as regressões existentes de Basquete e Skate.

## Arquivos modificados nesta integração

- `pre_game_brief.js`: painel, entrada compartilhada e oito ícones.
- `pre_game_brief_configs.js`: conteúdo dos oito esportes.
- `script.js`: abertura pelos Mestres, pausa global, início e cancelamento.
- `basketball_1v1.js`: início externo seguro e limpeza de entrada.
- `corrida_maratona.js`: início externo, espera do atlas e limpeza de entrada.
- `skate/skate_ollie_runtime.js`: início e limpeza de entrada.
- `surf_endless.js`: início e limpeza de entrada.
- `index.html`: módulos e versões de cache.
- `pre_game_brief.test.cjs`: contrato, desenho e entrada para as oito modalidades.
- `docs/qa/pre_game_brief/browser_all.cjs`: teste integrado no navegador.

## Evidências

- [Resultado dos oito fluxos](qa/pre_game_brief/browser-all-results.json)
- [Ping-Pong](qa/pre_game_brief/all-pingpong-brief.png)
- [Basquete](qa/pre_game_brief/all-basketball-brief.png)
- [Maratona](qa/pre_game_brief/all-marathon-brief.png)
- [Skate](qa/pre_game_brief/all-skate-brief.png)
- [Arquearia](qa/pre_game_brief/all-archery-brief.png)
- [Escalada](qa/pre_game_brief/all-climbing-brief.png)
- [Boxe](qa/pre_game_brief/all-boxing-brief.png)
- [Surf](qa/pre_game_brief/all-surf-brief.png)

## Passe visual — miniaturas esportivas e apresentação

O cabeçalho agora possui uma miniatura de **82×56 pixels**, desenhada integralmente por Canvas com coordenadas inteiras e `imageSmoothingEnabled = false`. Cada miniatura é uma pequena cena, com profundidade e objetos próprios:

- **Ping-Pong:** mesa em perspectiva, linhas, rede, pés, raquete e bolinha.
- **Basquete:** piso de quadra, marcações, suporte, tabela, aro, rede e bola com gomos.
- **Maratona:** pista com raias, faixa de chegada quadriculada, bandeira e tênis.
- **Skate:** rampa curva, rail com suportes, skate inclinado e rodas.
- **Arquearia:** vale verde com água, alvo circular sobre suporte, arco e flecha.
- **Escalada:** montanha com base larga e cume nevado, faces rochosas, corda, bandeira e mosquetão.
- **Boxe:** tablado, postes, cordas e duas luvas com cores distintas.
- **Surf:** onda com espuma, mar em camadas, prancha e horizonte ensolarado.

As molduras receberam pequenos detalhes de metal e fixadores em tom de latão. O título tem um brilho curto na entrada, e a moldura do botão pulsa suavemente enquanto aguarda confirmação. As miniaturas permanecem estáticas para preservar a leitura. Os controles e a dica aceitam quebra de linha sem reduzir a fonte.

### Transição e áudio

Após a saída de 120 ms do painel, sete esportes usam a contagem compartilhada **3 → 2 → 1 → VAI!**, com duração de aproximadamente 1,63 s. A Maratona conserva sua contagem nativa, sem duplicação. Física, IA, cronômetro e spawns continuam pausados durante a contagem compartilhada. Entradas repetidas não a pulam nem causam ações antes da partida.

Abertura, confirmação, contagem e início têm notas curtas e discretas por Web Audio, tecnologia já utilizada pelo projeto. Não há novos arquivos de som ou dependências. Se áudio estiver indisponível, o fluxo continua normalmente.

### Verificação desta etapa

- **8/8 esportes:** abertura pela interação real com o Mestre, pausa do estado, captura visual e início por Espaço no Chrome.
- **7/7 contagens compartilhadas:** presentes após a saída do cartão e sem avanço da simulação durante a espera.
- **Maratona:** mantém somente sua contagem original.
- **16 verificações de layout:** oito esportes em viewports de 900×600 e 390×844; medidas reais dos textos ficaram dentro do painel, sem truncamento.
- **Áudio:** contexto em execução e notas de abertura, confirmação, contagem e início verificadas com a política padrão de autoplay do Chrome.
- **Enter e ESC:** início e retorno à ilha aprovados.
- **24 testes do componente aprovados**, incluindo bloqueio da simulação/input até o término da contagem em 30, 60 e 144 Hz.
- **Zero exceções de execução, respostas HTTP com erro ou falhas de carregamento** nos oito fluxos.

O teste desta etapa cobre a apresentação e a retomada do gameplay; não percorre oito partidas completas.

Arquivos de produção alterados neste passe: `pre_game_brief.js`, `script.js` e `index.html`. Testes/evidências: `pre_game_brief.test.cjs`, `docs/qa/pre_game_brief/browser_polish.cjs`, `docs/qa/pre_game_brief/check_presentation.cjs` e os resultados/capturas abaixo.

- [Resultados dos oito esportes](qa/pre_game_brief/browser-polished-results.json)
- [Áudio, layout e navegação](qa/pre_game_brief/presentation-results.json)
- [Ping-Pong refinado](qa/pre_game_brief/polished-pingpong-brief.png)
- [Basquete refinado](qa/pre_game_brief/polished-basketball-brief.png)
- [Maratona refinada](qa/pre_game_brief/polished-marathon-brief.png)
- [Skate refinado](qa/pre_game_brief/polished-skate-brief.png)
- [Arquearia refinada](qa/pre_game_brief/polished-archery-brief.png)
- [Escalada refinada](qa/pre_game_brief/polished-climbing-brief.png)
- [Boxe refinado](qa/pre_game_brief/polished-boxing-brief.png)
- [Surf refinado](qa/pre_game_brief/polished-surf-brief.png)
- [Contagem sobre a arena](qa/pre_game_brief/polished-countdown.png)
