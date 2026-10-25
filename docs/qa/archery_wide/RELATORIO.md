# Arquearia — campo ampliado e ondas por profundidade

## Dimensões e câmera

- Resolução nativa da Arquearia: **900 × 480**, anteriormente 450 × 300.
- Zorp: X **48–852**, faixa lateral de **804 pixels**, anteriormente 354; aproximadamente **2,27 vezes** o espaço lateral.
- Mestre: X **48–852**, também com 804 pixels disponíveis.
- Zorp permanece na faixa inferior Y **432–458**. Mestre possui faixa própria Y **312–332**.
- Há pelo menos 100 pixels de separação entre as posições lógicas dos dois arqueiros. A ordenação por profundidade permanece funcionando.
- Ambos continuam atirando de baixo para cima. Zorp não pode entrar na região dos targets.
- Câmera fixa: mostra toda a largura, as duas linhas de tiro, o rio e as entradas. Não existe acompanhamento de alvo nem zoom de gameplay.
- Ao sair da Arquearia, o Canvas retorna a **450 × 300** para o Overworld e as demais modalidades. O layout CSS mantém a proporção.
- Capturas para cutscenes mantêm a proporção por letterbox, e a resolução é restaurada no mesmo frame em que a cena muda.

O Canvas recebeu uma resolução própria para esta modalidade. O cenário anterior não foi esticado ou ampliado como imagem.

## Elementos preservados

- Sprites e atlas de Zorp/Mestre, orientação de costas, anchors e escala **0,46** intactos.
- Flecha mantém o desenho de 38 × 38 e a velocidade física básica existente.
- Raios dos alvos normais permanecem **18 / 14 / 10**; pássaro **8**; dourados mantêm seus raios originais.
- Pontos base, bônus de precisão, mosca, combos e recompensa do dourado foram preservados.
- A função de swept collision foi preservada integralmente. Apenas os limites de recorte passaram a acompanhar o novo campo.
- A função de progressão de dificuldade do Mestre foi preservada integralmente. Seus limites de deslocamento e a estimativa de saída de alvos foram adaptados à nova geometria.
- A duração continua em **60 segundos**, seguida da resolução das flechas já em voo.

Comparações das funções estão registradas em `preservation.json`.

## Vale, rio e cachoeira

O cenário usa a mesma linguagem gráfica, paleta e funções de árvores/pedras do vale anterior, com uma composição nova para a largura maior:

- Cadeias de montanhas e encostas em camadas.
- Cachoeira central distante, aproximadamente em **(423, 52), 54 × 80**.
- Espuma, queda d'água, névoa e pequenos respingos animados.
- Rio abre a partir da cachoeira e ocupa a área central, com entradas nas duas laterais.
- Correnteza, reflexos e pequenas ondas feitos por Canvas.
- Pequenas ilhas ficam a montante, fora dos trajetos principais dos alvos.
- Duas amplas plataformas secas de tiro, com marcações distintas para Mestre e Zorp.
- Vegetação e pedras nas bordas; pássaros decorativos distantes sem discos.

O terreno é desenhado uma vez em cache. As animações têm orçamento fixo e não criam novas partículas a cada frame.

## Faixas naturais de targets

As faixas não possuem linhas artificiais no rio. Os centros de contato na água são referências para os trajetos:

- **Próxima:** água em Y 246; predominam alvos grandes e lentos.
- **Média:** água em Y 206; predominam alvos médios e velocidade intermediária.
- **Distante:** água em Y 166; predominam alvos pequenos, rápidos e mais valiosos pelas categorias de pontuação já existentes.

Velocidades dos alvos normais ajustadas para o percurso maior: **0,85 / 1,35 / 1,95 pixels por passo de 60 Hz**. Os dourados conservam suas velocidades especiais.

As rotas preservam o interpolador Hermite e a parametrização por distância do sistema atual. Foram ampliadas e distribuídas por faixa. Reta, diagonal, curva, S, senoide, arco e elipse parcial permanecem determinísticos. Não dependem da posição dos arqueiros.

A mira posicional continua apontando para cima, agora com inclinação máxima aproximada de **6,8°**, para que o reposicionamento lateral tenha efeito. Não há homing, charge ou controle novo.

## Waves planejadas

Oito padrões de rio/céu, mais a oportunidade rara do dourado:

- `OPENING_CURRENT`: três grandes lentos, vindos das laterais e da cachoeira.
- `EASY_CROSSING`: dois médios em cruzamento.
- `SKY_AND_STREAM`: pássaro com disco + dois alvos no rio.
- `EXPLOSIVE_CONFLUENCE`: um explosivo e três acompanhantes, em curvas que aproximam o grupo.
- `DEPTH_CURRENTS`: combinação de alvos em três profundidades.
- `FAST_SEQUENCE`: três pequenos rápidos, com entradas espaçadas.
- `EXPLOSIVE_CHAIN_CURRENT`: dois explosivos e três acompanhantes para reação em cadeia.
- `FINAL_SWEEP`: combinação final de pequeno distante, médio e grande próximo.
- **Dourado:** oportunidade rara na faixa distante ou em pássaro especial; mantém o planejamento de no máximo dois por partida.

Os pássaros comuns agora fazem parte das waves. Seus quatro voos alternam cruzamento alto, diagonal e arcos em alturas médias. O corpo continua decorativo: somente o disco pendurado possui hitbox.

As entradas mantêm separação temporal: pelo menos 24 frames globais e 28 na mesma entrada. Nos grupos de combo, offsets espaciais fazem as rotas convergirem sem empilhar os centros dos discos no nascimento.

## Progressão e limites

- 0–15 s: capacidade de **6** alvos válidos; abertura legível.
- 15–30 s: até **8**; cruzamentos e primeiras confluências explosivas.
- 30–45 s: até **10**; três profundidades, pássaros, rápidos e dourado possível.
- 45–60 s: até **12**; combinações e reação em cadeia, sem remover os espaçamentos.

Todas as entradas de gameplay, incluindo pássaros e dourados, respeitam o limite ativo. No máximo dois pássaros simultâneos após a introdução; apenas um na introdução.

Existe também o orçamento anterior de **16 portadores desenhados**, incluindo boias já abatidas e pássaros que perderam o disco. Eles continuam saindo naturalmente. Uma boia abatida não conta como alvo ativo e não concede pontos novamente.

O HUD permanece na faixa superior, acima dos trajetos dos targets. O contador dos últimos cinco segundos destaca o relógio, sem ocupar o campo.

## Performance e pooling

- Mantidos os pools de flechas, alvos e efeitos existentes.
- Geometria das rotas passa a ser compartilhada por cache; cada alvo conserva seu estado próprio.
- Terreno estático pré-desenhado; apenas água, névoa e pequenos elementos atualizam a animação.
- Nenhuma dependência ou PNG novo necessário para o cenário.

## Testes automatizados

**20 testes aprovados, zero falhas.**

- Resolução própria, câmera fixa e retorno ao tamanho normal das outras cenas.
- Limites amplos e separados dos dois arqueiros.
- Tamanhos, pontos e faixas.
- 63 combinações de trajetória/entrada/profundidade: entrada, continuidade e saída física.
- Cache de rotas sem compartilhar estado dos alvos.
- Composição das waves, confluência de combo e reação em cadeia.
- 1.500 swept collisions contra alvo pequeno em movimento, na região X 820, em 30/60/144 FPS.
- Primeiro alvo atingido, consumo da flecha e ausência de ponto duplicado.
- Corpo do pássaro sem hitbox de alvo.
- Dourado raro, pequeno e com recompensa preservada.
- Limites de todos os spawners.
- Flecha errada percorre o campo até sair.
- Partidas completas com resultados, waves e disparos equivalentes em 30/60/144 FPS.
- Preservação da renderização dos personagens e da matemática de colisão.
- Captura proporcional do campo largo para cutscenes e restauração imediata da resolução na troca de cena.

Log: `regression.txt`.

## Navegador real

Chrome, Canvas real, teclado automatizado, perfil e save de QA isolados. Não foi uma sessão manual humana.

### Movimento e briefing

- Briefing aparece e o relógio fica parado até a confirmação/countdown.
- Teclado levou Zorp às duas extremidades X 48 e X 852, e aos dois limites de profundidade.
- Mestre permaneceu na sua faixa separada.
- Personagens e targets não foram ampliados.

### Contatos físicos

Fixtures no runtime real confirmaram acertos contínuos, em longa posição lateral, contra:

- Pequeno normal em X ≈ 829, raio 10.
- Explosivo em X ≈ 832, raio 13.
- Dourado em X ≈ 825, raio 8.
- Disco de pássaro em X ≈ 834, raio 8.

Também foi verificada a regra de primeiro alvo no segmento e ausência de segunda pontuação da mesma flecha.

### Partida completa

- **Zorp 986 × 514 Mestre**.
- 60 s, mais 28 passos de resolução; duas flechas estavam em voo ao soar o final.
- 83 disparos de Zorp e 20 do Mestre. O controlador de QA usa deslocamento e disparo físicos existentes; placares não foram forçados.
- Quatro fases percorridas.
- 11 / 13 / 16 / 21 entradas de alvos por fase.
- Pico de alvos visíveis ativos por fase: **6 / 8 / 10 / 8** nesta partida. Acertos em combo liberaram espaço no clímax.
- Combo máximo de quatro alvos, reação em cadeia de dois explosivos, um dourado e quatro pássaros.
- Zero violações dos limites de movimento; nenhum NaN.
- Maior deslocamento de target por passo: aproximadamente 2,35 pixels, abaixo do limite de diagnóstico de teleporte.
- Retorno por Space para `ILHA_ARCO`, com Canvas restaurado a 450 × 300.

### Carga e alinhamento do cenário

- **5.768 amostras** dos trajetos sobre a geometria real da água: nenhuma boia sobre solo seco.
- Fixture com **12 alvos ativos durante todos os 180 quadros** da medição.
- Partida normal: **60,002 FPS** na amostra de 180 quadros.
- Carga de 12 alvos: **60,002 FPS** na amostra de 180 quadros.
- São medições locais do navegador de teste.
- Zero HTTP 404, falhas de requisição, erros de console, TypeError ou ReferenceError observados.

Evidências: `browser-results.json`, `browser-extra.json` e capturas `wide-*.png`.

A versão integrada na pasta real também foi aberta em um servidor local direto, com confirmação de 900 × 480 na Arquearia, 450 × 300 ao retornar, e início da transição da quarta medalha em 450 × 300. Nenhum erro HTTP ou de console foi observado nessa conferência. Evidências: `production-smoke.json`, `production-wide.png` e `production-transition.png`.

## Simulações adicionais

Oito partidas completas com sementes diferentes e o controlador de movimento/disparo de QA existente:

- Todas terminaram corretamente.
- Zorp venceu cinco e Mestre três; isso descreve o bot de teste e não uma taxa de vitória humana.
- Picos de 9–11 alvos visíveis ativos.
- Nenhuma violação de limites ou movimento descontínuo.
- Pontuação, explosivos e waves funcionaram em todas.

Dados completos: `simulations.json`.

## Arquivos

Novo:

- `archery_field.js`: dimensões, zonas, profundidades e troca/restauração da resolução.

Alterados:

- `archery_valley.js`: composição panorâmica do cenário.
- `archery_river_targets.js`: rotas por profundidade, largura e cache.
- `archery_match_pacing.js`: waves, progressão e capacidades.
- `archery_bird_targets.js`: espaço aéreo e alturas.
- `archery_collision.js`: limites do mundo; função swept preservada.
- `archery_explosive_targets.js`: máscara visual da nascente ampliada.
- `archery_golden_targets.js`: posição do aviso no campo largo.
- `archery_master_ai.js`: limites geométricos; perfil de dificuldade preservado.
- `archery_player_control.js`: ajuste pequeno da mira posicional.
- `script.js`: integração, limites, spawns e HUD de chão.
- `index.html`: carregamento do módulo novo e versões de cache.

Testes novos: `archery_wide.test.cjs` e `archery_wide_harness.cjs`.

Outras modalidades, Overworld, saves, medalhas, diálogos e assets de personagens não foram redesenhados ou substituídos.
