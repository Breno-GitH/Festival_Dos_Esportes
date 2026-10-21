# Arquearia — oportunidade dourada

## Identidade visual

O alvo dourado agora é um medalhão solar: borda recortada e chanfrada, gravação central, reflexo metálico diagonal e quatro pequenos brilhos animados. Não reutiliza os anéis azul/vermelho de um alvo comum pintados de amarelo.

O desenho é feito por Canvas e mantém o raio físico do disco. Reflexo, borda e partículas não aumentam a hitbox. Após o acerto, os brilhos cessam; o disco do rio permanece visualmente gasto sobre sua boia, e o alvo aéreo se quebra enquanto a ave continua voando.

Um aviso curto `ALVO DOURADO!`, em fonte de oito pixels, aparece por 1,2 segundo quando ele realmente entra no campo. Não há texto gigante, pausa global ou mudança permanente no HUD.

## Raridade

Foram removidos os antigos padrões dourados da seleção aleatória normal e as duas injeções antigas baseadas em percentuais da rodada. A entrada é controlada por uma agenda própria dentro do estado atual da Arquearia:

- Primeira oportunidade planejada entre 18 e 22 segundos.
- Chance de 65% de haver uma segunda, planejada entre 38 e 42 segundos.
- Máximo de dois por partida de 55 segundos.
- Intervalo mínimo de 15 segundos entre entradas efetivas.
- Nunca dois dourados simultâneos, inclusive se o anterior já foi acertado mas seu transportador ainda está saindo.
- A entrada aguarda uma vaga entre os dez objetos permitidos; não elimina outro alvo para abrir espaço.

A variante e o sentido são sorteados uma vez por evento. Depois disso, a trajetória é determinística. A galeria explícita de QA `archeryQaAllGold` continua permitindo inspecionar as sete configurações registradas; ela não representa a frequência da partida normal.

## Aparições na partida

- **RAPIDS:** vem pela cachoeira, percorre a correnteza e sai pela esquerda ou direita. Raio de 8 pixels, velocidade 2,35 pixels por atualização de 60 Hz; cerca de 1,9 segundo de oportunidade ativa. Valor base: 155.
- **ARC:** entra pelo afluente esquerdo ou direito e segue um arco suave no rio. Raio 8, velocidade 2,30; cerca de 3,4 segundos de oportunidade ativa. Valor base: 160.
- **SKY:** uma ave especial, com detalhes dourados nas asas e corpo violeta, transporta um medalhão menor. Raio 7, velocidade horizontal 2,40; travessia completa de cerca de 3,7 segundos. Valor base: 180.

A seleção favorece igualmente correnteza e arco, com 40% cada; a ave corresponde aos 20% restantes. Se o céu estiver ocupado, o evento aguarda até dois segundos e passa a usar a correnteza, sem remover ou duplicar aves. O limite anterior de quatro transportadores aéreos por rodada inclui a ave dourada.

Comparação: o alvo rápido comum do rio se move a 1,30 pixel por atualização e seu disco pequeno tem raio de 10 pixels. Não houve aumento de velocidade dos alvos comuns.

## Pontuação

O dourado da partida paga 155, 160 ou 180 pontos no anel externo. O anel interno acrescenta +15. A mosca acrescenta **+90**, em vez dos +30 dos alvos comuns.

Exemplos testados por teclado:

- Correnteza: externo 155, interno 170, mosca 245, fora do disco zero.
- Ave dourada: mosca 270.
- A mesma recompensa é válida para o Mestre.
- Uma explosão pode reclamar o disco dourado pelo seu valor base e participar do combo; não recebe uma mosca artificial.
- Cada disco paga uma única vez.

As demais configurações já registradas (`GOLD_SMALL`, `GOLD_WAVE`, `GOLD_S_CURVE`, `GOLD_ELLIPSE`, `GOLD_CURVE`) foram mantidas para compatibilidade com a galeria de QA e têm os mesmos visuais especiais, menor tamanho e velocidade maior. Elas não criam entradas adicionais no jogo normal.

## Estado e integração

`goldenSchedule` e `lastGoldenSpawnFrame` pertencem a `arcoGame`. A agenda é criada ao iniciar a rodada e limpa ao reiniciar; não exige save ou economia paralela.

O diagnóstico registra aparições efetivas, variantes, acertos e moscas por arqueiro. Objetos do pool inicializam `goldenVariant` e `isGolden` explicitamente, evitando brilho ou recompensa dourada em alvos comuns reutilizados.

Arquivos desta etapa:

- `archery_golden_targets.js`: especificações, agenda, bônus de precisão, medalhão e aviso.
- `archery_river_targets.js`: velocidade específica, recompensa e desenho especial do dourado; normais preservados.
- `archery_bird_targets.js`: opção de transportador dourado, sem hitbox no corpo.
- `script.js`: substituição do sistema anterior de aparições, integração e estatísticas, dentro da seção da Arquearia.
- `index.html`: módulo e atualização de versões dos scripts modificados.
- Este documento.

## QA

Chrome real em modo headless, perfil/save isolados, cache desativado e eventos de teclado por CDP. Cenários controlados usam o diagnóstico; a partida completa usa o bot existente de movimentação/disparo, e não um playtest humano manual. Capturas do Canvas foram inspecionadas.

O XAMPP estava desligado. Os mesmos arquivos foram servidos temporariamente em `127.0.0.1:8782`; o save e o servidor do usuário não foram alterados.

Cobertura: dez mil agendas; frequência e espaçamento; passagem completa nas três apresentações; previsibilidade; superfície do rio; tiros de centro/anel/erro; pagamento único; pontuação normal preservada; ave intacta; explosão e autoria do Mestre; limite e ausência de sobreposição; fallback quando há outra ave; pool; apresentações móveis; partida completa com explosivos e aves; FPS; retorno e reinício; rede e console.

Dois cenários de QA foram corrigidos antes da repetição: o alvo normal configurado como rápido vale 47 na mosca, pois conserva seu bônus de velocidade; a verificação da água deve considerar o trecho visível do campo, excluindo o centro já fora da borda da tela. Essas correções foram exclusivas da bateria, não mudanças na pontuação ou na geometria do jogo.

Evidências: `archery_golden_qa_report.json`, `archery_golden_medallion.png`, `archery_golden_bird.png`, `archery_golden_live_rapids.png`, `archery_golden_live_arc.png` e `archery_golden_live_sky.png` na pasta de QA desta conversa.

Resultado final: **28/28 verificações aprovadas**. Foram concluídas duas partidas automatizadas de 55 segundos. Na última, houve dois dourados da correnteza, nas atualizações 1311 e 2445 (21,85 s e 40,75 s), nunca simultâneos. A partida anterior teve duas aparições aéreas. A galeria móvel validou também a variante em arco. Média da última partida: 60,34 FPS; quatro detonações de explosivos e quatro aves, com acertos de ambos os arqueiros. Zero 404, TypeError, ReferenceError ou warnings do jogo. Retorno e reinício aprovados.

O teste de dez mil agendas encontrou 64,82% de segundas oportunidades, sem violação dos limites. A comparação binária da cópia anterior confirmou que o conteúdo de `script.js` antes e depois da seção da Arquearia permaneceu idêntico. Nenhum outro minigame ou sistema de Overworld foi editado.
