# Skate — jornada visual, movimento e clímax

## Mega Air com um botão

- A Mega Ramp entra no estado `MEGA_AIR`, com animação existente de salto grande do Zorp sobre o skate.
- Somente HOLD SPACE sustenta o salto. D foi removido do runtime, da leitura da física, do roteiro de replay e dos controles da página de QA.
- A sustentação continua limitada a 3400 ms. Gravidade durante Hold: 0,58 da gravidade normal; sem Hold ou após o limite: 1,75. A velocidade vertical sustentada usa o piso existente de -120 unidades/s. A tolerância inicial permanece em 100 ms.
- No gap atual, release aos 3260 ms falha; aos 3300 ms passa. Manter por 3400 ms é a execução recomendada e oferece margem. Isso prolonga o salto iniciado pela rampa, sem criar voo fora dela.
- Mega Hold tem prioridade própria no parser: não interpreta o mesmo input como Ollie ou sequência de trick. Ground Jump, Double Space, Hold de Grind e Release de Grind foram preservados.

## Perigo e leitura

- Onze entradas de gaps fatais recebem símbolo triangular de queda, poste/base, pequena luz pulsante e faixas diagonais pretas/amarelas na borda. Os três gaps menores recebem marcação discreta de perigo nas bordas.
- O vazio tem iluminação magenta mais perceptível em profundidade, mantendo paredes e estruturas interrompidas.
- Nos últimos 320/200/100 px do grande handrail, as pequenas marcações de construção anunciam a saída crítica. O símbolo de queda no final fica abaixo da linha do Grind.
- Placas, luzes, stripes e crowd são somente decoração. Nenhum collider, obstáculo móvel ou objeto de colisão foi acrescentado.
- A linguagem de gameplay permanece: ciano nas barras/bordas grindáveis, laranja nas ramp surfaces/lips, concreto neutro nas áreas seguras e magenta/vermelho no perigo. O amarelo de construção aparece em símbolos/stripes, distinguindo-se da superfície laranja de lançamento.

## Movimento do Zorp

- Ground/ramp e Grind amostram a tangente física real. A rotação visual acompanha parte desse ângulo, limitada a aproximadamente 21,5° em rampas/terreno e 24,2° em rails, com suavização exponencial.
- O pivô permanece no boardContact. A transformação visual não muda posição, collider ou velocidade.
- Grind recebe oscilação discreta de até 0,69°, inclinação do corpo e pequena compressão em subida. Rails ascendentes produzem mais faíscas; descendentes alongam a trilha. Rails curvos usam a tangente local com suavização.
- Landing recebe compressão visual de 4,5–12% durante 220 ms e partículas de contato por 350 ms em lançamentos fortes. Saídas naturais de rampa também são reconhecidas para esse feedback.
- O skate continua integrado aos sprites do Zorp; nenhum board separado foi desenhado.

## Progressão de horário

- Progresso vem de `(x - spawnX) / (finishX - spawnX)`, incluindo respawn coerente com o checkpoint.
- Referências das paletas: manhã em 0%, tarde em 32%, sunset em 64%, noite completa em 86%. Todas as cores são interpoladas com curva suave.
- Faixas de identificação no debug: 0–25% manhã, 25–50% tarde, 50–75% sunset e 75–100% noite. Não existe troca abrupta de cena nesses limites.
- Céu, skyline distante, cidade intermediária, palmeiras/estruturas próximas, janelas e postes acompanham a iluminação. O concreto recebe mais luz durante o dia; o brilho do neon aumenta até a noite.
- As cores funcionais da pista permanecem constantes. Na Mega Ramp, que começa depois de 91% do percurso, a noite já está completa.

## Fogos e chegada

- Pool fixo de 384 partículas. As partículas são reutilizadas e têm vida finita; nenhuma imagem/sprite novo foi adicionado.
- Timeline: foguete sobe por aproximadamente 1,05–1,35 s, explode em 32 partículas radiais e desaparece. Cores: ciano, magenta, amarelo, roxo, verde e azul.
- Durante Mega Air com Hold, começa um lançamento a cada 0,8 s. Ao soltar no ar, novos lançamentos param; partículas existentes terminam.
- Landing correta gera dois bursts sincronizados, com 96 partículas ao todo. A celebração passa a continuar mesmo sem Hold, com lançamentos a cada 0,48 s.
- Finish gera quatro bursts, com 192 partículas ao todo, e intensifica os lançamentos para um a cada 0,26 s durante quatro segundos. A tela de resultado aparece após uma breve janela visual de 550 ms; o sistema de medalhas existente foi preservado.
- Média observada no clímax completo, incluindo celebração após finish: aproximadamente seis fogos/lançamentos ativos e 113 partículas. Pico observado de 328, dentro do limite de 384.
- Os lançamentos ficam principalmente no skyline à frente. Uma região de 24 px ao redor do Zorp não desenha partículas. A pista é desenhada sobre os fogos e a câmera não os segue.
- Fail interrompe novos lançamentos e novos bursts; foguetes pendentes desaparecem sem explodir e partículas radiais existentes terminam naturalmente. Retry limpa o pool.
- O trecho após Mega Gap conserva 670 unidades, aproximadamente 2,39 s: landing ampla, um rail opcional simples, piso seguro e chegada. Não há novo desafio fatal depois do clímax.
- A chegada recebeu arco sustentado, faixa quadriculada, postes ciano/magenta, iluminação e silhuetas de público procedurais.

## Playtests e correções

- Primeira passagem completa no navegador: 104,05 s de física, ambos os checkpoints, todos os rails da linha, manhã → tarde → sunset → noite e sucesso no Mega Air com SPACE.
- Após a primeira inspeção: concreto diurno clareado, brilho dos rails reduzido durante o dia, iluminação de perigo reforçada e fogos reposicionados para não disputar atenção com Zorp.
- Corrigido o relógio visual no resultado/Fail: a celebração e o fade continuam mesmo quando a física ou o relógio acelerado de QA param.
- Segunda passagem: 104,05 s, sucesso, landing sincronizada e chegada. A inspeção encontrou um Hold de Mega Air interpretado como trick; foi criado o contexto de prioridade `MEGA_HOLD` e removido esse disparo acidental.
- Validação completa adicional após essa correção: 104,05 s, ambos os checkpoints, todos os rails e finish. A execução do runtime registrou somente a tecla Space.
- 129 testes aprovados, incluindo sustentação só com SPACE, ausência de sustentação com D sozinho, release cedo, quatro horários sem salto de iluminação, limites de rotação, landing, limite do pool e cancelamento da celebração no Fail.
- O percurso, posições dos três setpieces, colliders e demais minigames foram preservados.
- Mega Ramp → landing → finish em velocidade normal no navegador: 7,99 s, 60 FPS e apenas SPACE. Desenho Canvas observado entre aproximadamente 0,7 e 1,3 ms. Sem erros no console.
- Esses 60 FPS foram medidos no clímax em velocidade normal. Os replays completos acelerados executam 120 atualizações por frame e seus 36–46 FPS não são uma medida comparável do jogo normal; não foi medida uma run inteira normal a 60 FPS.
- Testes manuais adicionais no navegador: sem Hold, Fail em 2,40 s e zero fogos; release aos 875 ms de sustentação, Fail em 3,17 s. Este último teste revelou bursts pendentes após o Fail; foram suprimidos e a regressão específica confirmou que nenhum novo burst nasce depois da queda.

Evidências em `journey-tests.txt`, `journey-runs.json`, `journey-browser-run1.json`, `journey-browser-run2.json`, `journey-browser-final.json` e nas imagens da jornada. Os replays do navegador enviam eventos reais de teclado ao runtime; não são uma amostra de jogadores humanos.
