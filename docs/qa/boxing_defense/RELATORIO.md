# Boxe: camada defensiva

Implementado sobre o combate existente, preservando os rounds, os combos físicos, os sprites e os dois especiais. Validação realizada em 24/10/2026.

## Controles e janelas finais

- **SHIFT segurado:** guarda. Sofre 25% do dano normal, arredondado para inteiro com mínimo de 1 HP. Um J padrão bloqueado tira 2 HP; K padrão, 4 HP. O bloqueio não aplica hitstun normal.
- **Novo toque de SHIFT:** parry durante **4 passos a 60 Hz, aproximadamente 67 ms**. Repetição automática e Shift já segurado não renovam a janela. Não fica armazenado durante stun, ataque ou introdução de round.
- **Parry bem-sucedido:** dano residual de 6%, arredondado (J padrão: 0; K: 1 HP), recuo físico do atacante de até 6 px e **14 passos / 233 ms** de abertura. Resposta recebe uma janela de counter de **20 passos / 333 ms**, com bônus de 2 HP apenas se o golpe físico conectar. Hitstop de 2 passos / 33 ms.
- **Parry errado:** se o jogador soltar Shift após um toque antecipado, fica em recuperação por **10 passos / 167 ms**, sem atacar, defender, esquivar ou fintar. Segurar Shift mantém a guarda normal após a janela. Cooldown de tentativa: **24 passos / 400 ms**. Custo de tentativa: 3 stamina.
- **SPACE:** esquiva corporal de 18 passos / 300 ms. Deslocamento durante os primeiros 8 passos; componentes máximos de 3,2 px em X e 2,3 px em profundidade por passo. Custo: 14 stamina; cooldown: 40 passos / 667 ms.
- **Evasão:** passos 3–10 da esquiva. **Perfect Dodge:** contato nos passos **3–5**, uma janela de **3 passos / 50 ms**, situada entre aproximadamente 50 e 83 ms após iniciar a esquiva. Aplica hitstop de 3 passos / 50 ms e abre counter por 32 passos / 533 ms. Esquiva comum bem-sucedida abre counter por 18 passos / 300 ms. Só há recompensa quando o golpe cobria a posição atual ou a posição de onde a esquiva saiu.
- **W/S:** continua fazendo golpes retos errarem pela diferença real de profundidade, sem invulnerabilidade nem obrigação de usar Space. Faixa de profundidade dos golpes retos: 10 px; curtos: 14 px.
- **L:** ameaça com uma pose real de preparação, sem hitbox. Também cancela **apenas K nos frames 0–3**, aproximadamente os primeiros **67 ms**, sempre antes da hitbox ficar ativa. Não cancela J, golpe ativo, recovery, stun, guarda quebrada ou esquiva. Finta: 8 passos de ameaça, 14 passos / 233 ms totais, custo de 4 stamina e cooldown de 42 passos / 700 ms.

## Guard pressure

Limite: **100**. Bloquear J acrescenta **18**; K, **34**; especial bloqueável, **72**. Bloqueio também drena stamina: 4 / 9 / 18 respectivamente. Stamina zerada acrescenta mais 12 de pressão por contato.

Segurar guarda acrescenta 0,28 de pressão por passo (16,8 por segundo); fora da guarda ela decai 0,75 por passo (45 por segundo). Assim, bloquear combinações ou ficar indefinidamente na guarda tem consequência.

**Guard Break:** 30 passos / **500 ms**, pose de abertura/stun, indicação no HUD e efeito `GUARD BREAK!`. A pressão volta a 40, com recuperação gradual. O personagem não pode escapar desse stun com Shift, Space ou L. Um golpe limpo pode iniciar um combo nessa abertura.

Parry reduz a pressão recebida para J **4**, K **8**, especial bloqueável **18**, mas uma guarda já próxima do limite ainda pode quebrar. O dash punch do Mestre continua **impossível de bloquear ou aparar**: é preciso esquivar ou sair da linha.

## Finta e Mestre

A IA observa a pose de ameaça através do mesmo histórico atrasado usado para golpes reais. Não recebe indicador de que o ataque é uma finta nem lê o input atual de L. Pode escolher guarda, parry, esquiva ou reposicionamento. Parry e esquiva comprometidos podem deixar recovery para punição; não há reação garantida.

As decisões continuam sujeitas ao tempo de reação da IA. Um parry tentado tarde falha naturalmente. O sucesso não é decidido por um sorteio de HIT: depende do contato físico durante a janela.

## Validação

- **209 testes automatizados aprovados**, incluindo os limites das janelas, pressão acumulada, guarda quebrando, contra-ataque físico, ausência de contato duplo, esquiva antecipada punível, parry sem alvo em alcance, finta proibida fora do startup inicial e limpeza entre rounds.
- Regressões dos combos J/K, melhor de três, medalha só após vencer a luta e ambos os especiais aprovadas.
- Simulação a **30, 60 e 144 FPS** com física fixa e janelas consistentes.
- **60 cenários de finta** confirmaram respostas variadas do Mestre e compromissos defensivos puníveis.
- **12 lutas simuladas completas** terminaram corretamente, com resultados para ambos os lados. São políticas automatizadas de QA, não uma medida de dificuldade para jogadores humanos.
- **10 cenários controlados no Chrome real**, usando eventos de teclado: parry, riposte, guarda comum, guard break, parry antecipado, Perfect Dodge com deslocamento, esquiva somente por W, K→L inicial, L tardio rejeitado e J→L rejeitado.
- Inspeção visual dos estados, do briefing e da finta. Corrigida uma saída prematura no desenho da nova pose de finta; acrescentado teste de renderização de todos os seus frames.
- **Uma luta completa no Chrome**, com IA ativa: Zorp venceu 2–0, medalha coerente e retorno ao Overworld. O jogador usado nesse teste foi automatizado.
- **92/92 assets de Boxe carregados**, zero falhas de asset, zero HTTP 404, zero TypeError, zero ReferenceError e zero exceções no navegador durante os testes.
- Medição de 180 frames no Chrome headless: aproximadamente **60 FPS**. A medição é deste ambiente de teste.
- Testes de navegador usaram perfil e save isolados.

## Arquivos alterados

- `boxing_arena.js`: estados e contato de parry, janelas de defesa, punição e resposta da IA, renderização e snapshot de QA.
- `boxing_controls.js`: separa o novo toque de Shift da guarda segurada.
- `boxing_resources.js`: custo de parry, finta limitada ao startup inicial de K e regeneração consistente com os estados.
- `boxing_rounds.js`: limpa os novos estados de defesa nas transições.
- `boxing_presentation.js`: som e leitura visual de parry, abertura e recuperação.
- `pre_game_brief_configs.js`: dica curta de parry/finta, somente no Boxe.
- `index.html`: versões de cache dos módulos alterados.
- `boxing_defense.test.cjs`: novos testes de defesa e renderização de finta.
- `boxing_arcade.test.cjs` e `boxing_rounds.test.cjs`: expectativas atualizadas para punição da esquiva antecipada e compromisso do toque de parry.

Outras modalidades, atributos dos golpes normais e runtime dos especiais não foram modificados nesta etapa.
