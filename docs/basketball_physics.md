# Basquete — aro físico e confirmação de cesta

## Problema encontrado

A implementação anterior verificava a proximidade do X da bola no fim do frame, usando uma faixa de 9,5 unidades ao redor de um centro aproximado. Fazia essa verificação antes das colisões com o aro. Além disso, só aceitava o estado SHOT: tocar no aro ou na tabela mudava a bola para REBOUND e impedia uma cesta legítima posterior.

Os centros físicos anteriores também estavam deslocados em relação aos aros desenhados. A nova geometria usa pontos da imagem exportada e a mesma transformação do renderer.

## Modelagem

- Duas extremidades circulares independentes em cada aro: raio metálico 1,6.
- Abertura entre as extremidades totalmente livre de colisores.
- Tabela modelada por uma cápsula inclinada, acompanhando a face do sprite. Não é uma parede ocupando o interior do aro.
- Rede exclusivamente visual.
- Raio físico da bola: 8,8, correspondente à parte visível do sprite desenhado com 20 unidades.
- Cesta esquerda: centro X=95,6, extremidades X=81,2 e X=110.
- Cesta direita: centro X=351,4, extremidades X=336,8 e X=366.
- Plano dos dois aros: Y=188,4.

Nenhum PNG foi alterado. As posições derivam de pontos do PNG 601×621, escala 0,2 e anchor original (300,613).

## Física e detecção contínua

`basketball_hoop_physics.js` concentra a geometria e o sensor.

A bola usa colisão contínua com os círculos metálicos e a cápsula da tabela. Resolve-se primeiro o contato mais próximo ao longo do deslocamento, aplica-se restituição na normal e continua-se o movimento restante. O voo conserva a gravidade existente de 0,21 por tick do jogo, com integração balística e subpassos de no máximo 0,25 tick.

Restituição: 0,65 no aro e 0,74 na tabela. A velocidade tangencial sofre perda pequena; a rotação continua existindo. A pontuação não altera vx/vy para puxar ou encaixar a bola no aro. Foram removidas a frenagem artificial e a alteração de velocidade vertical que antes aconteciam ao marcar pontos.

## Regra de cesta

1. A bola pertence a uma jogada de um jogador identificado, está livre e em SHOT ou REBOUND.
2. Seu centro esteve acima do plano do aro.
3. Calcula-se o instante do cruzamento do plano na trajetória acelerada, incluindo o X naquele instante.
4. O centro precisa estar dentro da abertura livre, descontando o raio da bola e a espessura metálica.
5. O cruzamento deve ocorrer descendo.
6. A confirmação espera a bola continuar descendo até liberar completamente o metal, aproximadamente Y=198,9. Uma inversão de subida antes disso cancela a confirmação pendente.
7. Uma entrada por baixo da abertura invalida aquela tentativa, inclusive se a bola depois voltar a cair pelo centro.

Passar ao lado, tocar somente a rede, tocar a lateral externa ou começar no plano sem histórico acima não concede pontos. O cruzamento é medido na trajetória, não no X final do frame.

## Flags por bola e prevenção de duplicação

- `wasAboveRim`: histórico acima do plano.
- `crossedRimPlane`: passagem válida detectada.
- `pendingBasket`: candidato aguardando a liberação física do aro.
- `basketScored`: trava física após confirmar uma cesta.
- `scoredShotId` e `awardedShotId`: impedem repetição tanto no sensor quanto no placar.
- `scoreCrossing`: posição, direção e identificação da jogada no cruzamento.
- `enteredRimFromBelow`: bloqueia a tentativa que atravessou por baixo.
- `rimTouched` e `backboardTouched`: contatos da tentativa atual.

As flags são reinicializadas ao obter uma nova posse ou lançar uma nova jogada. A rede e os rebotes da mesma bola não removem a trava. A reposição após a cesta mantém o intervalo existente e inicia uma nova posse.

## Swoosh e feedback

SWOOSH é a passagem validada sem contato com aro ou tabela até a confirmação. Se houve qualquer contato, a cesta é NORMAL, mesmo que a bola tenha entrado depois de vários rebotes.

Conforme confirmado pelo usuário, os valores continuam sendo **2 e 3 pontos**, sem ponto extra de Swoosh. Mantém-se também a carga de especial já concedida por esses valores.

- Swoosh: anúncio próprio, efeito discreto junto ao aro e som especial.
- Cesta normal: anúncio de pontos e som normal.
- Aro: som metálico e pequeno efeito de contato; rim-out não pontua.
- Tabela: som mais grave, diferente do aro.
- Áudio criado após gesto do usuário, com no máximo três vozes simultâneas e sem arquivos externos novos.

## Debug

`window.BASKET_COLLISION_DEBUG` fica **false por padrão**.

Quando true, mostra círculos metálicos, cápsula da tabela, plano de pontuação, faixa válida para o centro, círculo da bola, vetor de velocidade e ponto do cruzamento detectado.

Os cenários `physics-*` existem somente quando o jogo é aberto com `?basketballQa=1`. A entrada desse modo também desativa a tela inicial, que anteriormente interceptava o loop de QA. Isso não muda o fluxo normal de menu/ilha/minigame.

## Testes no navegador

Chrome real, com o jogo completo e os assets oficiais. Os cenários controlados definiram somente as condições iniciais; depois o loop normal de física e desenho executou a trajetória. Os dois arremessos de quadra foram iniciados com eventos reais da tecla J via CDP. Não se trata de uma amostra de jogadores humanos.

1. Swoosh perfeito: **2 pontos**, sem contatos.
2. Aro e dentro: **2 pontos normais**, contato de aro registrado.
3. Tabela e dentro: **2 pontos normais**, contato de tabela registrado.
4. Rim-out: **0 pontos**, som de aro e um contato registrado.
5. Bola passando ao lado: **0 pontos**.
6. Bola subindo por baixo e voltando a cair: **0 pontos**, flag de entrada por baixo confirmada.
7. Rede sem entrada pelo aro: **0 pontos**.
8. Lateral externa: **0 pontos**, contato de aro sem cesta.
9. Vários contatos: dois de aro e um de tabela; **uma única cesta de 2 pontos**.
10. Arremesso de quadra iniciado com J: **2 pontos**.
11. Arremesso de longa distância iniciado com J: **3 pontos**.
12. Enterrada existente: **2 pontos**, passagem física confirmada.
13. Swoosh na cesta esquerda para o Mestre: **3 pontos para o Mestre**.
14. Tabela e dentro na cesta esquerda: **2 pontos para o Mestre**.

Resultado final: **14 cenários aprovados; zero 404, TypeError, ReferenceError, exceções de execução ou falhas de carregamento**. O AudioContext estava running e foram registrados eventos sonoros distintos para aro, tabela, cesta e Swoosh. As capturas do Canvas foram inspecionadas para conferir alinhamento, entrada da bola e feedback.

## Testes automatizados da física

**28 testes aprovados, zero falhas.**

Cobertura: duas cestas, contatos com aro e tabela, rim-out, entrada por baixo, toque em rede, lateral, repetição de contatos, trava por jogada, restituição, conservação de velocidade durante pontuação, alta velocidade e cruzamento no meio do frame. Cadências de 30, 60, 120 e 144 Hz; 500 trajetórias variadas também verificaram valores finitos, no máximo uma cesta e cruzamentos descendentes dentro da abertura.

## Arquivos desta etapa

- `basketball_hoop_physics.js`: novo módulo de colisões e sensor.
- `basketball_1v1.js`: integração da física, flags, Swoosh, sons, debug e cenários de QA.
- `index.html`: carrega o módulo antes do Basquete e atualiza sua versão de cache.
- `basketball_hoop_physics.test.cjs`: testes automatizados.
- `docs/basketball_physics.md`: este relatório.
- `docs/qa/basketball_physics/`: resultados e capturas do navegador.

Evidências principais: [resultado dos testes](qa/basketball_physics/unit-tests.txt), [resultado do navegador](qa/basketball_physics/browser-results.json), [debug dos colisores](qa/basketball_physics/hoops-debug.png), [Swoosh](qa/basketball_physics/physics-swoosh-score.png), [contato no aro](qa/basketball_physics/physics-rim-in-contact.png) e [cesta após tabela](qa/basketball_physics/physics-board-in-score.png).
