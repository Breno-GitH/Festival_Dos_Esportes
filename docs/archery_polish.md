# Arquearia 2.0 — polimento visual, sonoro e de reações

## Escopo preservado

Esta etapa altera apresentação. A rodada continua com 60 segundos, quatro fases, as mesmas ondas, caminhos, flechas, hit zones, bônus, medalha, reação limitada da IA e janela para resolver flechas depois do zero.

Espaço continua sendo um disparo por toque, com cooldown de 0,5 s. Não foram adicionadas mecânicas de força, dano aos personagens ou controles novos. Os sprites 2.0 continuam usando os mesmos recortes, proporções, anchors nos pés e orientação para cima, sem espelhamento.

O HUD permanente foi preservado: Zorp/pontos, tempo e Mestre/pontos, com o pequeno nome da fase já existente. O feedback novo é local e temporário.

## Água e cenário

O terreno continua sendo desenhado uma vez em canvas e reutilizado. O passe de água acrescenta:

- oito reflexos fragmentados da cachoeira, com distorção suave;
- doze traços longitudinais para comunicar a correnteza vindo em direção à região inferior;
- seis pequenos redemoinhos/espumas próximos das pedras;
- filetes adicionais na cortina da cachoeira;
- espuma segmentada e animada no ponto de entrada da correnteza;
- duas camadas muito leves de névoa acima da espuma;
- pequenas folhas adicionais nas margens e deslocamento discreto das três silhuetas de pássaros distantes.

Uma máscara exclusiva de pintura evita que os highlights da água atravessem as pedras e as duas pequenas ilhas já desenhadas. A geometria usada por alvos e colisões não foi alterada.

Os elementos decorativos permanecem discretos e não recebem hitboxes. Pássaros distantes são pequenas silhuetas sem alvo, diferentes dos transportadores do gameplay. Folhas, borboletas e névoa não ocupam a área seca de movimentação.

O orçamento do desenho principal é fixo: 127 pequenos elementos animados, mais oito traços de espuma na camada da nascente. Isso inclui linhas e manchas, não 135 objetos de simulação persistentes. Os arrays reutilizados continuam pequenos; não existe emissão ilimitada de partículas.

## Sons

Foi estendido o AudioContext que já existia em `archery_river_targets.js`, sem sistema paralelo e sem arquivos externos de som:

- **Corda:** pequena tensão tonal ao entrar em DRAW_BOWSTRING.
- **Soltura/flecha:** twang curto e sopro filtrado no instante real de criação da flecha.
- **Impacto:** ataque curto e seco ao acertar o disco.
- **Mosca:** assinatura aguda ascendente, também usada no acerto valioso do dourado.
- **Explosivo:** som grave distinto; a profundidade da cadeia eleva o pitch progressivamente.
- **Combo:** pequena sequência ascendente que fica mais marcada nos grupos maiores.

Os dois personagens usam esses sons. O Mestre tem um pitch discretamente mais baixo nas ações do arco. A liberação de áudio continua dependendo da interação do jogador, como no sistema anterior.

O ruído do sopro é calculado uma vez por contexto e reutilizado. Seu gerador local não consome o RNG das ondas. Há um barramento de ganho de 0,65, compressor e limite de seis fontes sonoras simultâneas. Explosivos reservam margem para os outros sons, e os impactos continuam tendo um intervalo mínimo para não saturar a mistura.

Cada fonte é registrada e removida por identidade ao terminar, com limpeza idempotente e desconexão de seus nós. Uma primeira rodada completa revelou uma inconsistência na contagem numérica das vozes; ela foi substituída por esse registro de fontes. A validação passou a exigir igualdade entre fontes iniciadas e encerradas, além do limite simultâneo.

## Mosca e combos

Um acerto central real recebe `BULLSEYE!`, pontos, um pequeno anel e brilho cruzado por aproximadamente 0,23 s. O efeito é feito por Canvas, fora do sprite. Colateral da explosão continua sem gerar uma mosca artificial.

Combos mantêm os mesmos pontos e bônus. A apresentação agora mostra a contagem crescendo de x2 para x3, x4 e assim por diante, a cada seis atualizações. Há um pequeno pulso de tamanho/cor, bônus em uma segunda linha e `SUPER COMBO` a partir de seis alvos. A indicação dura menos de um segundo e tem posição limitada à largura da tela.

As ondas de choque existentes permanecem com opacidade reduzida quando há explosões simultâneas. O efeito não congela o jogo nem cria um flash que cubra a arena inteira.

## Reações dos personagens

Zorp e Mestre recebem feedback de acerto e erro. O Mestre também reage quando Zorp conquista um dourado ou quando um dourado sai sem ser acertado. Nesse caso, usa a pose existente de frustração e um pequeno ícone dourado riscado junto do personagem.

Uma reação pendente aguarda uma abertura visual. Ela não substitui RAISE, DRAW, AIM, RELEASE ou RECOVERY. A caminhada também mantém sua pose própria para não parecer que os pés deslizam durante uma reação parada. Existe somente um slot pendente, com descarte de reações antigas; não há fila crescente de poses.

Pequenos sinais locais reforçam o acontecimento mesmo durante a preparação: brilho curto de acerto, reticências no erro e a marca de oportunidade dourada perdida. Eles não alteram a decisão, mira, velocidade, cooldown ou posição do Mestre.

No resultado:

- vencedor: sequência VICTORY existente, sem reiniciar a cada frame;
- derrotado: MISS_REACTION existente, já que o atlas não tem grupo separado DEFEAT;
- empate: IDLE para os dois.

A recuperação de Zorp permanece sincronizada ao controlador do disparo. A reação de acerto começa depois dela, sem cortar a animação da soltura.

## Arquivos modificados

- `archery_valley.js`: reflexos, correnteza, espuma, névoa, máscara de pintura e detalhes vivos.
- `archery_river_targets.js`: sons no contexto existente, mistura limitada, registro das fontes, brilho da mosca e apresentação crescente do combo.
- `archery_characters_v2.js`: reações pendentes, prioridade das animações e pequenos sinais locais.
- `script.js`: chamadas de apresentação nos acontecimentos reais de tiro, acerto, erro, perda de dourado e combo.
- `index.html`: versões dos quatro scripts alterados para invalidar o cache.
- Este documento.

Não houve mudança de assets PNG, recortes ou manifestos. O conteúdo de `script.js` antes e depois da seção da Arquearia permaneceu idêntico na comparação com a cópia anterior. Outros minigames, Overworld, save e economia foram preservados.

## QA realizado

Chrome real em modo headless, save/perfil isolados, cache desativado e entrada por eventos de teclado do navegador. Os testes incluem cenários controlados, comparação de oito partidas com a versão anterior e uma rodada completa em tempo real. Não é uma alegação de playtest humano manual.

Para validar áudio, a instrumentação de QA capturou somente a saída sintetizada do próprio jogo, sem microfone. Um analisador verificou amostras reais, amplitude e ausência de clipping; um arquivo WebM foi gravado. Essa verificação não equivale a uma avaliação auditiva humana de timbre.

Os mesmos arquivos do projeto foram servidos temporariamente em `127.0.0.1:8786`. O navegador de QA usa um perfil diferente do jogador; nenhuma moeda, medalha ou flag de teste foi escrita no save real.

Cobertura: entrada pelo NPC; atlas pronto; animação da água; proteção das ilhas/área seca; placares e ondas invariantes; mosca real; sequência do arco; miss e recovery de Zorp; acerto, erro e dourado perdido do Mestre; prioridade das reações; combos x2/x3/x4/x6; crescimento visual da contagem; sons; sobreposição intensa; liberação das fontes; sinal capturado; vitória/derrota/empate; partida completa; HUD, limites e trajetórias; desempenho; rede e console; retorno à ilha.

## Resultado final

**30/30 verificações aprovadas**, sem 404, falhas de carregamento, TypeError, ReferenceError ou warnings na sessão testada.

- As oito sementes reproduziram exatamente os placares, quantidades de entradas por fase e vencedores anteriores ao polimento. Zorp fez 2.008–2.395 pontos e o Mestre 1.011–1.416 nessas amostras. Isso confirma a invariância dos casos testados; não mede dificuldade humana.
- No teste de mosca, o mesmo alvo continuou valendo 46 pontos e exibiu o novo brilho/texto. Os combos de 2, 3, 4 e 6 alvos mantiveram bônus de 15, 15, 40 e 80, respectivamente. A cadeia de seis usou duas detonações e terminou sem repetição infinita.
- No teste de pintura entre dois instantes, houve mudança em 1.091 pixels da área amostrada do rio e 1.537 da cachoeira. Os pontos de teste no miolo da ilha e na plataforma seca permaneceram iguais.
- A captura sonora controlada teve um único contexto, sinal não nulo e pico medido de aproximadamente 0,048 em escala normalizada, sem clipping. O teste intenso ficou em até seis vozes e terminou com todas as fontes liberadas.
- Na última partida completa, Zorp fez **2.046 x 1.140 Mestre**. As reações de acerto e erro dos dois personagens apareceram, e as duas oportunidades douradas perdidas pelo Mestre geraram feedback visual.
- A rodada completa emitiu **355 fontes sonoras e encerrou as mesmas 355**. Ao final da espera de verificação não havia nenhuma voz ativa. Todos os seis grupos de som foram usados na partida.
- Média medida: **60,13 FPS**, com mínimo amostrado de aproximadamente 36,10 FPS. A média não significa 60 FPS constantes em todo equipamento; a medição incluiu a instrumentação de captura de áudio do QA.
- Contagem final, resolução das flechas, resultado e retorno à ilha continuaram funcionais.

Evidências na pasta de QA desta conversa: `archery_polish_qa_report.json`, `archery_polish_audio.webm` e capturas `archery_polish_bullseye.png`, `archery_polish_combo_early.png`, `archery_polish_combo_late.png`, `archery_polish_master_hit.png`, `archery_polish_master_miss.png`, `archery_polish_master_gold_lost.png`, `archery_polish_zorp_miss.png`, `archery_polish_victory.png`, `archery_polish_live_river.png` e `archery_polish_live_climax.png`.
