# Skate — rampas unificadas (21/10/2026)

## Regra em produção

**Viu rampa → alinhe a linha → segure SPACE → percorra a superfície → lançamento no lip.**

As 22 rampas da pista oficial usam a mesma implementação. Os quarter-pipes do catálogo legado e rampas por polyline também recebem o mesmo contrato de geometria. Não há combinação exclusiva, carga por tempo, barra de força ou lançamento antecipado por Ollie.

- APPROACH: 70 unidades antes da superfície; reserva Space para a rampa.
- RAMP_SURFACE: o contato do skate acompanha a mesma polyline desenhada.
- LAUNCH_POINT: último ponto físico da superfície, com integração apenas da fração restante do passo após cruzar a borda.
- Saída vertical: tangente final × velocidade real − impulso da rampa.
- Impulso: launchStrength × velocidade real / 230 × launchMultiplier × qualidade.
- Qualidade: 1 segurando no lip; 0,40 quando houve preparação e soltura antecipada; 0,18 sem preparação. Não depende de acumular tempo.
- A velocidade horizontal é preservada, sem boost horizontal adicional no lançamento.
- A pose RAMP_PREP reutiliza os frames existentes de postura agachada. A rotação suavizada acompanha a inclinação; duas faíscas pequenas nas rodas sinalizam preparação.
- O desenho do HUD foi preservado; somente a instrução de controles passou a citar HOLD para rampas.

## Prioridade e compatibilidade

GROUND + RAMP reserva o input para a rampa. AIR permite captura suave de rail. GRIND mantém contato enquanto Space está segurado; soltar continua executando Super Jump Out. MEGA_AIR sustenta a trajetória por até 3400 ms, sem capturar grind simultaneamente. Duplo Space continua disponível no chão comum.

Aterrissagens segurando Space não entram em Manual quando já estão na aproximação/superfície da próxima rampa. A soltura de uma tecla originalmente pressionada na rampa também funciona quando o jogador já capturou um rail.

As antigas flags de autoria autoLaunch não selecionam caminhos separados na física. Os roteiros de teste deixaram de prescrever tap/Ollie sobre rampas.

## Ajustes de percurso

- chain-kicker e bench-exit-kicker passaram a usar o perfil médio e o comprimento/altura originalmente desenhados, com força suficiente para capturar os respectivos rails.
- stair-kicker: força base 480, para alcançar o corrimão sem exigir Ollie.
- huge-launch: força base 630. O primeiro playtest revelou que 450 era insuficiente quando o lançamento passou a acontecer exclusivamente no lip.
- advanced-launch: força base 400; banco seguinte deslocado de x=18360 para x=18395, evitando colisão lateral antes da saída física da rampa.
- final-medium-kicker: força base 375, para o corrimão final.
- ascent-bank-1/2/3: impulso de apoio 12, mantendo a subida e uma saída pequena para cada patamar.
- finish-landing-bank: impulso 18; pequena saída sobre piso contínuo antes da chegada.
- Demais rampas tiveram o controle e a saída unificados, com a geometria e a função preservadas.
- A câmera usa a área de destino declarada para ampliar a visão antes de grandes lançamentos; preserva o enquadramento especial da Mega Ramp.

## Todas as rampas e medições

Valores em unidades do mundo por segundo. Ângulo é a tangente da superfície; vy negativo indica subida. A captura pode começar até 24 unidades antes do rail e converge suavemente em 100 ms.

### start-kicker

- Função: Salto curto de introdução.
- Entrada: 230.0; velocidade no lip: 227.6; tangente: -16.9°; impulso adicional: 77.2; vy: -146.3.
- Segurando: piso em x=849.5, sem falha.
- Soltando na metade da rampa: vy=-99.9; piso em x=840.0.

### first-rail-kicker

- Função: Entrada no primeiro grind.
- Entrada: 230.0; velocidade no lip: 227.1; tangente: -20.0°; impulso adicional: 90.8; vy: -173.3.
- Segurando: first-rail em x=1075.9, sem falha.
- Soltando na metade da rampa: vy=-118.8; piso em x=1118.1.

### transfer-bank

- Função: Bank suave entre transfers.
- Entrada: 230.0; velocidade no lip: 228.1; tangente: -13.6°; impulso adicional: 44.6; vy: -99.8.
- Segurando: piso em x=1862.5, sem falha.
- Soltando na metade da rampa: vy=-73.0; piso em x=1856.7.

### chain-kicker

- Função: Entrada no rail sobre o gap.
- Entrada: 230.0; velocidade no lip: 227.4; tangente: -18.0°; impulso adicional: 276.8; vy: -350.8.
- Segurando: three-c em x=3353.9, sem falha.
- Soltando na metade da rampa: vy=-184.7; piso em x=3365.4.

### street-kicker

- Função: Salto curto de street.
- Entrada: 230.0; velocidade no lip: 227.6; tangente: -16.9°; impulso adicional: 69.3; vy: -138.3.
- Segurando: piso em x=5017.2, sem falha.
- Soltando na metade da rampa: vy=-96.8; piso em x=5009.5.

### bench-bank

- Função: Preparação da área de bancos.
- Entrada: 230.0; velocidade no lip: 227.2; tangente: -18.9°; impulso adicional: 61.3; vy: -139.0.
- Segurando: piso em x=6532.7, sem falha.
- Soltando na metade da rampa: vy=-102.3; piso em x=6525.1.

### bench-exit-kicker

- Função: Saída curva para grind.
- Entrada: 230.0; velocidade no lip: 227.8; tangente: -15.5°; impulso adicional: 495.2; vy: -558.2.
- Segurando: bench-exit em x=7339.7, sem falha.
- Soltando na metade da rampa: vy=-261.1; piso em x=7335.9.

### stair-kicker

- Função: Lançamento alto para corrimão da escada.
- Entrada: 230.0; velocidade no lip: 227.3; tangente: -18.8°; impulso adicional: 474.3; vy: -551.6.
- Segurando: stair-handrail em x=8049.8, sem falha.
- Soltando na metade da rampa: vy=-267.1; piso em x=8099.6.

### danger-chain-kicker

- Função: Primeiro rail da cadeia sem chão.
- Entrada: 230.0; velocidade no lip: 227.3; tangente: -18.4°; impulso adicional: 113.7; vy: -189.5.
- Segurando: danger-a em x=8947.2, sem falha.
- Soltando na metade da rampa: vy=-121.3; piso em x=9021.9.

### speed-kicker-first

- Função: Salto de entrada na subida.
- Entrada: 230.0; velocidade no lip: 227.6; tangente: -16.9°; impulso adicional: 71.2; vy: -140.3.
- Segurando: piso em x=10832.4, sem falha.
- Soltando na metade da rampa: vy=-97.6; piso em x=10824.7.

### ascent-bank-1

- Função: Subida longa e suave ao primeiro patamar.
- Entrada: 233.9; velocidade no lip: 239.8; tangente: -23.3°; impulso adicional: 12.5; vy: -115.6.
- Segurando: piso em x=11427.5, sem falha.
- Soltando na metade da rampa: vy=-108.1; piso em x=11423.4.

### ascent-bank-2

- Função: Segundo patamar da praça.
- Entrada: 246.0; velocidade no lip: 251.7; tangente: -23.3°; impulso adicional: 13.1; vy: -121.3.
- Segurando: piso em x=11780.4, sem falha.
- Soltando na metade da rampa: vy=-113.5; piso em x=11778.3.

### ascent-bank-3

- Função: Acesso ao rooftop.
- Entrada: 258.0; velocidade no lip: 261.2; tangente: -34.3°; impulso adicional: 13.6; vy: -191.6.
- Segurando: piso em x=12165.1, sem falha.
- Soltando na metade da rampa: vy=-183.4; piso em x=12160.6.

### huge-launch

- Função: Grande gap entre rooftops.
- Entrada: 278.2; velocidade no lip: 267.1; tangente: -25.0°; impulso adicional: 731.6; vy: -856.3.
- Segurando: piso em x=13158.1, sem falha.
- Soltando na metade da rampa: vy=-417.4; queda curta (FELL_IN_GAP).

### void-entry-kicker

- Função: Entrada na cadeia de cinco rails.
- Entrada: 230.9; velocidade no lip: 224.8; tangente: -40.0°; impulso adicional: 80.1; vy: -269.0.
- Segurando: void-a em x=14145.8, sem falha.
- Soltando na metade da rampa: vy=-220.9; piso em x=14221.2.

### advanced-launch

- Função: Banco elevado e ledge.
- Entrada: 280.0; velocidade no lip: 275.9; tangente: -22.9°; impulso adicional: 479.8; vy: -596.2.
- Segurando: advanced-ledge-edge em x=18513.7, sem falha.
- Soltando na metade da rampa: vy=-308.3; advanced-bench em x=18434.3.

### release-small

- Função: Kicker curto no downhill.
- Entrada: 279.0; velocidade no lip: 276.5; tangente: -19.7°; impulso adicional: 57.7; vy: -156.5.
- Segurando: piso em x=20480.2, sem falha.
- Soltando na metade da rampa: vy=-121.8; piso em x=20473.2.

### release-medium

- Função: Transfer médio para transição curva.
- Entrada: 280.0; velocidade no lip: 275.9; tangente: -22.6°; impulso adicional: 84.0; vy: -198.9.
- Segurando: piso em x=20760.3, sem falha.
- Soltando na metade da rampa: vy=-148.6; piso em x=20751.0.

### release-curve

- Função: Curva de conexão ao lançamento final.
- Entrada: 280.0; velocidade no lip: 275.2; tangente: -25.9°; impulso adicional: 101.7; vy: -235.3.
- Segurando: piso em x=21003.5, sem falha.
- Soltando na metade da rampa: vy=-174.2; piso em x=20991.9.

### final-medium-kicker

- Função: Corrimão do gauntlet final.
- Entrada: 280.0; velocidade no lip: 276.4; tangente: -20.2°; impulso adicional: 450.7; vy: -552.2.
- Segurando: final-descending em x=21182.6, sem falha.
- Soltando na metade da rampa: vy=-281.8; queda curta (DANGEROUS_STAIR_FALL).

### final-big-ramp

- Função: Mega Air sustentado sobre o grande vazio.
- Entrada: 280.0; velocidade no lip: 274.9; tangente: -27.4°; impulso adicional: 741.1; vy: -883.3.
- Segurando: piso em x=25226.1, sem falha.
- Soltando na metade da rampa: vy=-438.7; queda curta (FELL_IN_GAP).

### finish-landing-bank

- Função: Pequena saída e estabilização antes do finish.
- Entrada: 280.0; velocidade no lip: 280.0; tangente: 0.0°; impulso adicional: 21.9; vy: -21.9.
- Segurando: piso em x=25654.7, sem falha.
- Soltando na metade da rampa: vy=-8.8; piso em x=25652.3.

## QA realizado

- 22 rampas × 2 casos (segurar / soltar na metade): **44 casos no Chrome real**, com eventos de teclado via CDP; nenhuma posição foi alterada durante cada caso.
- Cada rampa segurando alcançou uma superfície/rail da área planejada. O contato com a superfície teve erro medido de 0.
- A soltura antecipada produziu saída mais fraca em todas as rampas; nos grandes gaps pode resultar em queda, como previsto.
- Run completa no Chrome em velocidade normal, dirigida por replay de teclado: **104,18 s de física**, ambos os checkpoints, 27 rails capturados, Mega Air completo e finish.
- Revisão adicional completa no Chrome com relógio acelerado de QA após os últimos ajustes.
- Verificação no index.html oficial: JOGO_SKATE aberto, 22 rampas e todos os frames do Zorp carregados.
- Pose RAMP_PREP confirmada no navegador: grounded=true, preparado=true e erro de contato com a superfície=0.
- Suíte completa Skate + geometria: **156 testes aprovados, zero falhas**; inclui 30/60/144 Hz para a linha completa e todas as rampas.
- Aproximadamente 60 FPS na run normal; desenho médio observado de 1,18 ms por frame no Chrome de QA.
- Verificação final: zero 404, TypeError, ReferenceError, exceções de execução ou falhas de carregamento.

Os testes de navegador foram automatizados por teclado; não são uma amostra de jogadores humanos. A primeira navegação para o index registrou uma falha de conexão isolada em uma imagem; a revisão final repetiu a carga com cache desabilitado e não reproduziu a falha.

## Problemas encontrados e corrigidos

- Lançamentos divididos entre autoLaunch, saída natural e salto de chão: consolidados em um único lançamento no lip.
- Energia extra usando velocidade configurada: passou a usar a velocidade real.
- Dependência de Ollie para determinados rails/gaps: forças e conexões recalibradas.
- Banco avançado muito próximo do lip: afastado 35 unidades.
- Spawn de treino dentro da lateral de uma plataforma: inicialização agora considera o topo seguro.
- Geometrias antigas de quarter-pipe sem startX/endX: agora declaram aproximação, superfície e lip no mesmo formato.
- Conflito Manual/rampa e soltura após captura de grind: prioridade e roteamento corrigidos.
- Fixtures antigas que esperavam lançamento automático ou Ollie sobre rampa: migradas para a regra atual.
- Limite fixo de frames do runner de QA truncava runs de 144 Hz: ajustado ao tempo simulado.

## Arquivos de implementação

- index.html: versões de cache dos módulos.
- skate_new/collision_geometry.js: contrato das rampas originadas do catálogo.
- skate/procedural_track.js: zonas, multiplicador e destino das rampas.
- skate/official_procedural_course.js: força, função, destino e conexões das 22 rampas.
- skate/space_input_parser.js: RAMP_HOLD / RAMP_RELEASE.
- skate/ollie_physics.js: contato, lançamento único, energia e telemetria limitada a 64 registros.
- skate/traversal_system.js: prioridades de rampa, Manual, grind e Mega Air.
- skate/rider_presentation.js: pose de preparação com frames existentes.
- skate/skate_ollie_runtime.js: input, câmera e feedback.

## Ferramentas, testes e documentação

- skate/level_pilot.js, level_playtest.cjs e level_playtest.html: replays com hold nas rampas e telemetria.
- skate/ramp_validation.cjs e universal_ramps.test.cjs: validação física das 22 rampas.
- Testes existentes atualizados: course_design, grind_chains_special_air, main_gameplay, official_procedural_course, procedural_track, skate_ollie_physics e skate_new/asset_geometry.
- skate/ARCHITECTURE.md: controles e contratos atuais.

## Evidências

- universal-ramps.json: telemetria completa por rampa, segurando e soltando cedo.
- universal-browser-ramps.json: 44 casos reais de navegador.
- universal-browser-full.json: run completa em velocidade normal, transições e inputs.
- universal-browser-review.json: revisão final, carga do jogo oficial e pose de preparação.
- universal-full-vm.json: replay completo com trace.
- universal-all-skate-tests.txt: resultado integral dos 156 testes.
- universal-full-rooftop-approach.png, universal-full-mega-air.png, universal-ramp-preparation.png e universal-final-reviewed.png: capturas do Canvas real.
