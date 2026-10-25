# Boxe definitivo — integração final

Validação de 24/10/2026. Integra o combate existente, Rush Boxer, Iron Counter, defesa, rounds, juiz, torcida e apresentação. Outras modalidades, saves e assets físicos não foram alterados.

## Controles finais

- **A/D:** movimentação horizontal.
- **W/S:** profundidade real no ringue 2.5D.
- **J:** soco fraco.
- **K:** soco forte.
- **L:** finta; também cancela apenas o startup inicial de K.
- **SHIFT segurado:** guarda; um novo toque perto do impacto pode aparar.
- **SPACE:** esquiva corporal; timing preciso produz Perfect Dodge.
- **O:** Rush Overdrive, com barra cheia.
- Briefing: Espaço ou Enter começa. Resultado: R reinicia e Esc volta à ilha, preservando o fluxo existente.

O briefing apresenta todos os comandos em três linhas legíveis. Teclas repetidas sem soltura não criam novos ataques. Espaço não rola a página e o pressionamento do briefing não vira esquiva.

## Formato e rounds

**Melhor de três, primeiro a vencer dois rounds.** Não existe Round 3 depois de 2–0. Cada round possui **40 segundos** e ambos começam com **100 HP**.

Fluxo: briefing → apresentação/3–2–1/LUTE → combate → queda/contagem quando houver KO → resultado do round → intervalo → próximo round se necessário → resultado final → fluxo existente de medalha e retorno.

No tempo esgotado, decide a porcentagem de HP restante. Persistindo empate: dano causado, counters e golpes limpos, nessa ordem. Empate absoluto conserva o sudden death existente: primeiro golpe limpo, sem escolher vencedor aleatoriamente.

Com 1–1, o terceiro round mostra **FINAL ROUND**, com maior reação da torcida, sinais visuais discretos e áudio distinto. Dano, velocidade, alcance e atributos não aumentam por ser o último round.

Entre rounds, reset completo de HP, stamina, guarda, stun, combos, ataques, esquivas, posturas, especiais, cooldowns, buffers, posições e efeitos temporários. **Barras de especial voltam a zero**; não há mais acúmulo de carga entre rounds. Permanecem o placar, estatísticas necessárias da luta e memória de comportamento da IA.

## Combos

J→J, J→K, K→J e K→K são transições por hit-confirm, não comandos mágicos. Incluem J→J→J, J→J→K, J→K→J, J→K→K, K→J→K e variações físicas com Rush.

- Zorp: até **5 contatos**, com separação no final.
- Mestre: normalmente **1–3 contatos**, encerrando a combinação no terceiro.
- Um whiff mantém recovery; não permite cancelamento gratuito.
- Bloqueio, parry, esquiva e resistência limitada não concedem o cancelamento de combo de um golpe limpo.
- X e profundidade precisam estar corretos. W/S permite sair da linha de um direto sem usar Space.

## Estados de Zorp — Rush Boxer

Idle, movimentação, golpe fraco/forte contextual, finta, guarda, parry, esquiva, Perfect Dodge, counter, hitstun, guard break, recuperação, Overdrive, Rush Jab, Rush Straight, Meteor Straight, knockdown, vitória e derrota.

**Rush Overdrive:** O com barra cheia concede **4 cargas por até 6 segundos**. Cada J/K durante o estado consome uma carga e executa o Rush correspondente. K na última carga produz Meteor Straight e encerra o estado. J na última carga encerra sem inventar um golpe extra.

O jogador escolhe cada ataque. Não há weave automático, evasão automática ou sequência de seis socos. Rush erra, gasta carga e sofre recovery. O avanço compromete direção e profundidade, sem homing. Afterimages por Canvas são discretos e limitados a três por lutador.

## Estados do Mestre — Iron Counter

Medição de distância, aproximação/corte de ringue, cautela, pressão curta, guarda, parry, Counter Stance, Slip, golpes normais/corporais, resistência limitada no K, Crushing Counter, Titan Straight, recuperação, knockdown, vitória e derrota.

- Golpes mais fortes e comprometidos, com mais custo de stamina e recovery.
- **Counter Stance:** espera uma cadência provável e abre uma janela curta de parry. Pode ajustar a previsão uma vez após sentir um bloqueio real, usando o histórico anterior. Finta, paciência, mudança de ritmo e saída da linha deixam uma abertura punível.
- **Crushing Counter:** K físico durante o startup de K de Zorp; bônus de dano, dano de stamina, hitstun e impacto próprios. Permite continuação curta.
- **Heavy Armor limitado:** alguns K resistem a um único jab comum nos últimos três passos do startup. Recebem dano de HP; K, Rush e counters conquistados interrompem.
- **Slip:** deslocamento pequeno do corpo, sem dash longo, com janela estreita contra jab comum e possibilidade de resposta.

**Titan Straight:** carga de 600 ms, luva brilhando, dash linear de até 220 px, 28 HP, grande knockback e impossibilidade de bloqueio comum. Space ou W/S evitam. A direção não é corrigida depois da ativação. Se errar, fica aberto por 600 ms, usando os frames específicos de recovery.

A finta rara do Titan permanece nos rounds avançados: chance condicional de 8%, no máximo uma por round, baseada no hábito observado de esquiva e decidida antes da carga. Não reage a um Space atual.

## Sistema defensivo

- Guarda reduz dano e evita hitstun normal, mas recebe pressão e desgaste.
- Limite de pressão: 100; guard break gera aproximadamente **500 ms** de abertura.
- Novo toque de Shift: parry por **4 passos / cerca de 67 ms**, sem renovação por auto-repeat. Aparar concede breve vantagem física; um toque antecipado e solto deixa recovery.
- Space desloca o corpo. Perfect Dodge acontece nos passos 3–5: **janela de 50 ms**, com hitstop curto e counter window.
- Finta isolada não possui hitbox. K→L só cancela os primeiros quatro passos do startup; não escapa de ataque ativo, recovery ou hitstun.

## IA e memória entre rounds

O Round 1 começa sem conhecimento prévio de padrões. A memória agora registra **guarda, dodge, distância, J, K, finta e Rush**. Round 2 herda os índices do Round 1; Round 3 combina o histórico dos dois.

A coleta usa somente poses e posições observadas com atraso. Finta só é classificada **depois de uma ameaça visivelmente retirada antes da atividade**, com cuidados para não confundir uma continuação de combo, interrupção ou ataque concluído com finta. Rush só é identificado depois da pose de avanço visível, não no instante do input.

Continuam existindo reaction delay variável, decisões imperfeitas, histórico limitado, erros de timing e whiffs físicos. A adaptação altera escolhas; não concede dano, velocidade ou precisão artificial ao último round.

## Juiz, knockdown e contagem

Usado **juiz_boxe3.0.png**, através dos recortes oficiais já normalizados. Nenhum PNG ou sourceRect foi redesenhado.

Quando HP chega a zero num KO normal:

1. encerra ataques e bloqueia combate/input;
2. executa a queda existente;
3. juiz se aproxima fisicamente do caído;
4. apresenta a contagem de **1 a 10**;
5. só então confirma o resultado do round.

A sequência é arcade e rápida: **2,6 segundos** — 12 passos de queda inicial, 24 de aproximação e dez contagens de 12 passos. Cronômetro, IA, ataques, stamina e especiais ficam parados. Não há dano adicional nem medalha durante a contagem.

O juiz usa poses de início, caminhada, contagem, separação/fim e vitória. Retorna à posição de base antes do novo round. A vitória do juiz anima corretamente para qualquer vencedor. Ele não possui collider de combate nem interfere na movimentação. O número da contagem vem da lógica, sem inventar frames de dedos ausentes na spritesheet.

## Torcida, câmera e hitstop

A torcida existente foi preservada, com reação maior a combo 4+, Perfect Dodge, counter, Crushing Counter, guard break, Overdrive, Titan, queda, terceiro round e vitória. Jab comum tem resposta discreta. Final Round mantém um leve clima de tensão entre os eventos.

Shake máximo por contato: J **0,12 px**; K **0,75 px**; counter **1,2 px**; Crushing **1,55 px**; especiais **1,9 px**, com limite de 2 px e decaimento rápido. O HUD permanece estável.

Hitstop: J **1 passo / 17 ms**; K **2 / 33 ms**; counter **3 / 50 ms**; Crushing, Meteor e Titan **4 / 67 ms**. A contagem possui áudio curto por batida e o último round tem sinal sonoro próprio. Sem arquivos de áudio ou dependências novos.

## Sprites preservados

- `zorp_boxe3.0.png`.
- `zorp_boxe3.0_especial.png`.
- `mestre_boxe3.0.png`.
- `mestre_boxe3.0_especial.png`.
- `juiz_boxe3.0.png`, incluindo seus 24 frames oficiais utilizados.
- `arena_boxe3.0.png`.

Preservados recortes curados, proporções, escala uniforme, pés/bottom-center e `imageSmoothingEnabled = false`. Os colliders permanecem independentes da transparência dos PNGs.

## Problemas corrigidos nesta integração

- KO pulava diretamente para o resultado e deixava a contagem sem uso.
- Memória entre rounds não incluía J, K, finta ou Rush.
- Barras/cooldowns podiam carregar vantagem de combate para o próximo round.
- Keydown duplicado e repeats sem uma pressão física nova podiam reativar ações.
- Repeats órfãos após perder foco podiam restaurar guarda/movimento indevidamente.
- Animação de vitória do juiz não avançava no resultado final.
- Feedback de especial tinha pouco contraste em relação ao golpe normal, enquanto a hierarquia de shake/hitstop não era explícita.

Não foi encontrado erro de recorte nos assets oficiais. Os sourceRects foram preservados e as poses conferidas no navegador.

## Resultado dos testes

- **286 testes automatizados aprovados**, incluindo os dois lutadores, combos, defesa, 2.5D, postura, resistência, especiais, memória, contagem, resets, inputs e todos os placares 2–0/2–1.
- Verificação a **30, 60 e 144 FPS** com simulação fixa.
- **20 lutas simuladas completas**: oito políticas passivas/de guarda foram vencidas pelo Mestre; doze controladores automatizados de ataque e combo venceram. Esses controladores executam padrões repetíveis e não são uma classificação de dificuldade humana.
- **14 cenários de Iron Counter** e **11 de Rush Overdrive** no Chrome real, todos aprovados.
- **15 cenários de integração no navegador**, incluindo sequência completa 2–1, FINAL ROUND, KO/contagem, bloqueio de inputs e memória aprendida após ações reais de teclado. Também exercitados os caminhos 2–0 para ambos os vencedores, sem Round 3.
- Luta completa com IA ativa, resultado, medalha somente após vencer a luta e retorno ao Overworld aprovados.
- Cerca de **60 FPS** em amostras de 180 frames no ambiente de teste.
- **92/92 assets de Boxe carregados**, zero 404, TypeError ou ReferenceError nos testes finais; nenhuma exceção de execução capturada.
- Um carregamento transitório de outra modalidade falhou no servidor temporário de QA; a fila de conexões do servidor de teste foi ampliada e a luta repetida com sucesso. Nenhum arquivo dessa modalidade foi alterado.
- Perfil e save de navegador isolados. O save do usuário não foi usado.

## Arquivos alterados

- `boxing_rounds.js`: contagem/juiz, resets, memória de round e resultado.
- `boxing_arena.js`: aprendizagem visível e prioridades, eventos, shake/hitstop, poses/foco do juiz e dicas de fase.
- `boxing_controls.js`: bordas de input, prevenção de repeats duplicados e proteção após foco/transições.
- `boxing_presentation.js`: reações, contagem, terceiro round e hierarquia de feedback.
- `boxing_master_special.js`: cue próprio de início do Titan; física preservada.
- `pre_game_brief_configs.js`: controles finais, somente na configuração do Boxe.
- `index.html`: versões de cache dos módulos modificados.
- `boxing_integration.test.cjs`: nova bateria de integração.
- `boxing_arcade.test.cjs`, `boxing_rounds.test.cjs`, `boxing_master_ai.test.cjs` e `boxing_master_special.test.cjs`: testes atualizados para contagem, reset total e cobertura de políticas de jogo.

PNG/atlas, Rush Overdrive, parâmetros de dano e velocidade, outras modalidades e lógica de save/medalhas permanecem preservados.

## Conferência após integração no projeto

Os mesmos 286 testes passaram novamente na pasta final. O navegador foi repetido contra os arquivos integrados, sem sobreposição de módulos de staging: 15 cenários, ambos os caminhos 2–0 e sequência 2–1 aprovados. Luta completa com IA ativa: Zorp 2–0, retorno à ilha confirmado, aproximadamente 60 FPS, 92/92 assets e nenhuma falha de rede ou exceção. Hashes dos arquivos finais conferidos.
