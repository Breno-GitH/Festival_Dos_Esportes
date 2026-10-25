# Boxe — controles oficiais e melhor de três

## Entrega

O combate existente foi preservado. A luta agora tem até três rounds de **40 segundos**, vencendo quem conquistar **dois rounds**. O terceiro não começa depois de 2–0. Os dois especiais continuam usando os mesmos módulos, sprites e recortes.

## Controles oficiais

- A/D: movimentação horizontal.
- W/S: movimentação em profundidade.
- J: soco fraco, rápido e com menor custo de stamina.
- K: soco forte, mais dano, impacto, custo e recuperação.
- L: finta; ameaça de golpe seguida de cancelamento antes do impacto, sem dano próprio.
- Shift segurado: guarda; mantém redução de dano, pressão e quebra de guarda.
- Space: uma esquiva por pressionamento, com deslocamento real e janela de evasão.
- O: especial existente, dependente da barra.

Briefing e HUD foram atualizados. I deixou de acionar esquiva. Space não ataca e tem o comportamento de rolagem impedido no Boxe. As teclas mantidas durante briefing/transições precisam ser soltas antes de voltar a agir. Repetição automática de keydown não dispara ações repetidas.

## Fluxo e decisão dos rounds

Briefing → ROUND 1 / 3–2–1 / LUTE → combate → resultado do round → intervalo → próximo round → resultado da luta.

- KO encerra o round, não a luta inteira.
- Ao esgotar os 40 segundos, compara-se a porcentagem de HP restante.
- Empates usam, nesta ordem: dano causado, counters conectados e golpes limpos.
- Persistindo empate absoluto, há Sudden Death: o primeiro golpe limpo decide. Dano bloqueado não decide esse desempate. Trocas simultâneas não escolhem vencedor pela ordem de processamento.
- O relógio continua durante o breve hitstop de impacto; fica congelado no briefing, aba oculta e transições.
- O HUD mostra ROUND n/3, tempo, placar e dois marcadores de vitórias por lutador.
- O terceiro round recebe FINAL ROUND e reação maior da torcida, sem bônus de atributos.
- O resultado final mostra VITÓRIA/DERROTA e 2–0 ou 2–1.
- A medalha e o resultado da modalidade são confirmados apenas ao terminar a luta completa. Reiniciar com R limpa o placar e volta à introdução do Round 1.

## Reset e proteção das transições

Entre rounds não há movimento, dano, IA ativa, contagem de tempo ou ganho de carga.

O próximo round restaura HP e stamina, repõe os lutadores nas posições iniciais e remove ataques, especiais ativos, hitstun, guard break, combos, esquiva, counter window, buffer de golpes, afterimages e efeitos temporários. A carga remanescente do especial é reduzida para **60%**, limitada a 60 pontos; cooldowns restantes são preservados e ficam congelados durante o intervalo.

## Combate preservado e ajustes de integração

- J/K continuam conectando os combos existentes. Custos de stamina: J 5, K 13, esquiva 14 e finta 4, com máximo de 100.
- A finta pode cancelar a preparação inicial de golpe comum, mas não apaga um golpe já conectado nem cancela especiais.
- Perfect Dodge exige um contato real evitado na janela estreita de três frames; produz feedback, hitstop breve e abertura de counter. Uma esquiva antecipada ainda pode evitar o golpe sem receber esse reconhecimento.
- A profundidade continua relevante para sair da linha dos ataques.
- Zorp conserva o weave com avanço, afterimages, soco final e counter automático de seis socos.
- Mestre conserva carga visível, dash linear e recuperação ao errar. O dash especial não pode ser bloqueado com segurança: a guarda não reduz seu dano; esquiva e saída da linha continuam válidas.
- A adaptação entre rounds usa somente amostras atrasadas de comportamento observado: guarda, esquiva e distância. Isso altera interesse em fintas e aproximação, sem leitura direta de inputs ou aumento artificial de atributos.
- Juiz e torcida participam do início/fim de round, KO, empate em 1–1 e vitória final.

## Validação automatizada

**139 testes aprovados; zero falhas.** Log: `regression.txt`.

Cobertura inclui controles oficiais, remoção do input antigo, custo/recuperação de stamina, combos, finta sem dano, cancelamento antes do impacto, guarda/quebra, Perfect Dodge, profundidade, dois especiais do Zorp, dash do Mestre, quatro placares finais, KO, tempo, todos os critérios de desempate, Sudden Death, troca simultânea, resets, carry de carga, inputs mantidos/repetidos, medalha apenas ao fim, reinício e relógio em 30/60/144 FPS.

## Teste no navegador real

Executado por automação de teclado no Chrome, com origem e perfil isolados. Nenhum save do jogador foi alterado.

- Briefing: texto e controles cabem no painel.
- Space mantido desde o briefing: não dispara esquiva ao começar.
- Novo Space: executa esquiva. Com página deliberadamente rolável, scroll permaneceu em 100 antes/depois.
- J, K, L, Shift, Space, A/D e W/S foram exercitados no runtime real.
- Finta não causa dano; guard break e Perfect Dodge foram reproduzidos.
- Especial normal do Zorp, counter de seis golpes e especial linear do Mestre foram exercitados. A guarda não anula o dash; sair da profundidade permite fazê-lo errar.
- Cenários controlados concluíram Zorp 2–0, Zorp 2–1, Mestre 2–0 e Mestre 2–1, percorrendo as transições reais e usando contatos físicos para os golpes decisivos.
- Os cenários verificaram ausência de medalha após Round 1 e ausência de round extra depois de 2–0.
- Encerramento por tempo e empate absoluto/Sudden Death foram reproduzidos.
- Uma partida adicional foi jogada por automação contra a IA normal, com recursos conquistados durante o combate: **Zorp 2–1**, terminando com **7 HP**. Não foi uma avaliação humana de dificuldade.
- Retorno ao Overworld confirmado.
- 92/92 recursos do Boxe carregados; zero falhas de assets.
- Zero HTTP 404, falhas de requisição, TypeError, ReferenceError ou erros de console observados.
- Amostra de 180 quadros durante FIGHTING: **60,004 FPS**. Isso é uma medição local, não uma garantia para todo dispositivo.

Evidências: `browser-results.json` e capturas `rounds-*.png`.

## Simulações de partidas

24 partidas completas, oito por política de jogador simulado. Todas encerraram sem travamento.

- Política de ataques repetidos: Mestre venceu 8/8.
- Política reativa limitada: Mestre venceu 8/8.
- Política tática: Zorp venceu 5/8, Mestre 3/8.

Esses agentes são estratégias de teste e não representam uma taxa de vitória humana. A duração média de combate ativo ficou entre 24,9 e 34,1 segundos por partida nesses cenários; os rounds mantêm limite individual de 40 segundos. Dados completos em `playtest-results.json`.

## Arquivos de implementação

Novos:

- `boxing_controls.js`: roteamento dos controles e proteção de inputs.
- `boxing_resources.js`: stamina e custos comuns.
- `boxing_rounds.js`: ciclo de rounds e decisão da luta.

Alterados:

- `boxing_arena.js`: integração dos rounds, finta, stamina, Perfect Dodge e observação histórica da IA.
- `boxing_presentation.js`: HUD, relógio, placar de rounds e feedback.
- `script.js`: entrada do Boxe, limpeza de teclas, briefing e descrição dos controles do Mestre.
- `pre_game_brief_configs.js`: instruções oficiais do Boxe.
- `index.html`: carregamento e versões dos módulos.

Testes/harness:

- `boxing_rounds.test.cjs` e `boxing_rounds_harness.cjs` novos.
- `boxing_arcade.test.cjs`, `boxing_fun.test.cjs`, `boxing_special.test.cjs`, `boxing_master_special.test.cjs`, `boxing_master_ai.test.cjs` e `boxing_ai_harness.cjs` atualizados para a nova duração da luta e dependências.

Sprites, demais modalidades, requisitos de medalhas e formato de save não foram alterados.
