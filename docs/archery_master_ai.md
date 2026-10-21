# Mestre da Arquearia — dificuldade dinâmica

## Resultado

O Mestre começa aquecendo e melhora durante os 60 segundos. A habilidade depende somente do tempo da rodada, sem ajuste oculto pelo placar. Mesmo no nível máximo continuam existindo atraso, dispersão de mira, decisões imperfeitas e erros físicos.

Foram preservados duração, controles do jogador, flechas, colisão contínua, raios, pontuação, spawn, arena, medalha e retorno ao Overworld.

## Curva de habilidade

A variável da run é `arcoGame.masterAI.masterSkill`. Ela cresce linearmente e é limitada explicitamente a **0,88**:

- início: **0,30**;
- 15 segundos: **0,445**;
- 30 segundos: **0,59**;
- 45 segundos: **0,735**;
- 60 segundos: **0,88**.

Uma nova partida cria uma IA nova e reinicia a habilidade. Nada foi acrescentado ao save.

O perfil é acessível por `ArcheryMasterAI.profileAt(frame, totalFrames)` e pelo diagnóstico já existente do minigame.

### Tempos e limites

- Reação: base de **700 ms no início → 300 ms no fim**, com uma variação de ritmo de até 50 ms por partida. Faixas aproximadas: **650–750 ms → 250–350 ms**.
- Decisão: **400 → 167 ms**.
- Precisão de configuração: **0,58 → 0,84**. É um parâmetro da estimativa e dispersão, não um sorteio binário de acerto.
- Erro base da mira: **4,5 → 3,5 unidades**, somado à dificuldade do alvo e à distância.
- Confiança da previsão linear: **0,82 → 0,95**, sempre imperfeita.
- Cooldown após a soltura: **1,10 → 0,70 s**, em paralelo com soltura/recuperação. A preparação do próximo tiro continua obrigatória.
- Há pisos explícitos de reação e erro, e teto de precisão abaixo de 100%.

Os tempos de READY, RAISE, DRAW, AIM e RECOVERY também diminuem gradualmente. Cada ciclo conserva seus tempos enquanto a animação está em andamento.

## Percepção e seleção

O sensor copia somente alvos ativos e visíveis a cada seis passos de simulação. A IA usa amostras antigas conforme seu atraso de reação; estima velocidade e mudança de direção por diferenças entre essas amostras.

Não consulta `route`, `progress`, posição futura real, fila de spawn ou o resultado futuro de uma colisão. A posição do jogador e a presença de suas flechas também são percebidas com atraso.

O valor de uma tentativa considera tamanho, velocidade, complexidade observada, distância, tempo estimado para escapar e tempo de preparação. A avaliação melhora com a habilidade. Um pequeno desvio na classificação permite escolhas menos eficientes sem impor erros de tiro.

Dourados recebem interesse adicional, mas continuam difíceis. Nos explosivos, o Mestre avalia apenas vizinhos observados: no começo entende grupos simples; mais tarde considera grupos maiores e dá mais peso ao valor do combo. Não prevê alvos que ainda não surgiram.

## Mira física, sem sorteio de MISS

Cada tentativa recebe uma única amostra de erro motor e de estimativa de velocidade. Ela é mantida durante a preparação, evitando jitter e correções aleatórias a cada frame.

A dispersão aumenta para alvos pequenos, rápidos, pássaros, dourados, mudanças de direção e tiros distantes. Há offsets ocasionais mais largos, ainda calculados como desvio de mira. Não existe regra do tipo “20% dos tiros serão declarados erro”.

A partir de amostras atrasadas, o Mestre calcula uma interceptação linear aproximada, aplica sua confiança imperfeita, o erro motor e uma quantização pequena. A colisão física decide HIT ou MISS.

Ao entrar em AIM, a mira é travada. Não há troca de alvo no último instante nem alteração da flecha depois da soltura. Alvos perdidos podem provocar cancelamento durante a preparação ou um tiro atrasado no ponto antigo.

O Mestre também passou a reservar espaço para a frente prevista do alvo, recuando dentro da própria área de tiro. Isso evita abandonar quase todas as oportunidades rápidas por preparar o arco perto demais da frente. A decisão usa a estimativa da própria IA, não a trajetória real futura.

## Animações

Toda flecha continua seguindo:

**READY → RAISE_BOW → DRAW_BOWSTRING → AIM → RELEASE_SHOT → RECOVERY.**

Os frames acompanham a duração do ciclo atual. A renderização consulta o estado real da IA para garantir que uma reação de erro não substitua prematuramente a preparação, a soltura ou a recuperação.

Nenhum sprite foi substituído e a orientação de costas/para cima foi preservada.

## Calibração por partidas completas

Foram feitas **60 partidas simuladas de calibração no Chrome**: 18 com a IA anterior, 24 na primeira configuração e 18 na configuração final. Os controladores de teste usam movimento, preparação e flechas físicas; não teletransportam Zorp, não alteram cooldown e não concedem pontos diretamente.

A bateria final teve seis sementes em cada cenário: Mestre sem oposição, jogador com observação a cada 300 ms e cadência de 750 ms, e controlador mais preciso usado como referência superior de desempenho.

### Comparação sem oposição

Na versão anterior, o Mestre teve **192 acertos em 193 disparos**, aproximadamente **99,5%**, e média de **2.050,8 pontos**.

Na configuração final, teve **97 acertos em 125 disparos**, aproximadamente **77,6%**, e média de **1.033,5 pontos**. Errou em todas as seis partidas.

Médias do Mestre por trecho, com o mesmo conjunto de sementes e sem disputa pelos alvos:

- **0–15 s:** 3,83 disparos; 2,33 flechas acertaram; 1,50 erros; 1,33 moscas; 0 detonações; 0 dourados; **76,8 pontos**.
- **15–30 s:** 5,33 disparos; 4 flechas acertaram; 1,33 erros; 2 moscas; 1 detonação; 0 dourados; **223,5 pontos**.
- **30–45 s:** 4,83 disparos; 3,83 flechas acertaram; 1 erro; 2,33 moscas; 1 detonação; 0,17 dourado; **289,8 pontos**.
- **45–60 s:** 6,83 disparos; 6 flechas acertaram; 0,83 erro; 3,50 moscas; 2,67 detonações; 0,17 dourado; **443,3 pontos**.

Impactos e erros são contabilizados no trecho em que ocorreram; um tiro pode sair num trecho e terminar no seguinte. Explosões podem atingir mais de um alvo por flecha.

### Disputa com reação e cadência limitadas

Nas seis partidas finais com o controle de observação de 300 ms:

- Mestre: **505–1.033 pontos**, média **797,3**;
- jogador de teste: **1.145–1.736 pontos**, média **1.434**;
- seis vitórias do jogador, incluindo **1.145 × 1.033**.

O controlador mais preciso também venceu suas seis partidas. Esses agentes automatizados servem como referências de balanceamento; seus resultados não equivalem a uma taxa garantida de vitória de jogadores humanos.

## Teste do mesmo desafio em níveis diferentes

Um conjunto controlado manteve a dificuldade dos alvos e variou somente a habilidade da IA. Foram usados sensor, preparação, posicionamento, flechas e sweep reais.

Acerto por flecha no começo → nível máximo:

- grande/lento: **85,4% → 97,6%**;
- médio/rápido: **56,0% → 87,2%**;
- pequeno/rápido: **42,9% → 75,0%**;
- trajetória WAVE: **48,1% → 87,2%**;
- pássaro: **26,8% → 63,6%**.

O ensaio do dourado rápido é especialmente exigente: no nível inicial não houve soltura de flecha antes de perder a oportunidade; no nível máximo houve **9 tiros, 3 acertos e 6 erros**. A IA mostrou interesse/preparação, mas não recebeu precisão garantida.

Todas as categorias tiveram erros físicos no nível máximo. O parâmetro de precisão não representa a taxa observada de HIT: tamanho, movimento e oportunidades mudam essa taxa.

## Duas partidas em tempo real

Chrome real em modo headless, perfil de teste isolado e entradas por teclado via CDP. Foram partidas completas de aproximadamente 60,4 s, com leitura do estado para dirigir o teste. **Não foram sessões jogadas por uma pessoa.**

1. Movimentação contínua e Espaço: **Zorp 842 × Mestre 434**, vitória e retorno ao Overworld.
2. Leitura periódica de alvos e posicionamento por teclas: **Zorp 1.228 × Mestre 850**, vitória e retorno ao Overworld.

Registro do Mestre na segunda partida:

- **0–15 s:** 2 tiros, 0 flechas acertaram, 2 erros, 0 moscas, 0 detonações, 0 dourados; **0 pontos**.
- **15–30 s:** 4 tiros, 2 flechas acertaram 2 alvos, 2 erros, 1 mosca, 0 detonações, 0 dourados; **68 pontos**.
- **30–45 s:** 7 tiros, 6 flechas acertaram 9 alvos, 1 erro, 2 moscas, 1 detonação, 0 dourados; **355 pontos**.
- **45–60 s:** 9 tiros, 6 flechas acertaram 9 alvos, 3 erros, 4 moscas, 2 detonações, 0 dourados; **427 pontos**.

A habilidade sempre sobe; a pontuação de um trecho específico não é forçada a subir. Disputa, oportunidades de combo, dourados e erros continuam influenciando o resultado.

## QA técnico

- **16/16 verificações controladas aprovadas:** curva, limites, atraso, dispersão por tipo, mira travada e sequência completa de estados.
- O teste colocou getters que lançam erro em `route` e `progress`: a IA não tentou acessá-los.
- Um alvo foi movido/retirado após o lock: a flecha manteve exatamente a mira antiga.
- **6/6 verificações de poses aprovadas**, inclusive com uma reação de erro pendente: nenhuma etapa do arco foi substituída.
- **7/7 verificações das partidas reais e carregamento aprovadas**, incluindo retorno ao Overworld e `file://`.
- **Zero 404, TypeError, ReferenceError ou erros/avisos de console** nas baterias finais.
- Perfil/save de QA separado; o save real do jogador não foi utilizado.

## Arquivos modificados

- `archery_master_ai.js` — progressão, perfil, percepção, seleção, erro físico e diagnóstico.
- `script.js` — entrega da duração à IA e integração do tempo de decisão variável.
- `archery_characters_v2.js` — sincronização das poses com o ciclo real e proteção contra interrupção por reação.
- `index.html` — versões de cache dos três scripts envolvidos.
- `docs/archery_master_ai.md` — este relatório atualizado.

Nenhuma alteração no módulo de colisão, valores de pontuação, padrões de spawn, duração, arena, sprites, outras ilhas ou minigames.
