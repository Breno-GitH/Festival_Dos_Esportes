# Boxe — núcleo contextual de combate

## Resultado e controles

Combate existente ampliado com transições de acerto entre golpes fracos e fortes. Não há reconhecimento de comandos mágicos nem botões extras por tipo de soco. Mantidos ringue 2.5D, movimentação, colisão, 100 HP, juiz, IA de percepção limitada e melhor de três rounds de 40 segundos.

- A/D: horizontal. W/S: profundidade.
- J: fraco. K: forte. L: finta.
- Shift: guarda. Space: esquiva. O: especial.
- Código dos controles e dos dois especiais permaneceu idêntico à versão anterior.

## Transições

- **J → J, J → K, K → J, K → K** estão disponíveis.
- Exigem acerto limpo, hitstun restante daquele atacante, alcance físico e stamina suficiente.
- Cancelamento abre dois passos após o contato. Startup da continuação: J quatro passos, K sete. O defensor precisa ter hitstun suficiente para a próxima conexão.
- Buffer de 12 passos. A regra é compartilhada pelos dois lutadores.
- Erro e bloqueio não autorizam cancelamento de combo. O whiff exige startup, active, recovery e recuperação extra completos. L não apaga um golpe que já tentou atingir.
- Até cinco acertos normais. Os três primeiros mantêm hitstun normal; o quarto amplia knockback; o quinto cria COMBO FINISH, separação e recovery obrigatória.
- No quinto: defensor tem 12 passos de hitstun; atacante recupera por pelo menos 24 passos. A separação ocorre durante seis passos físicos e busca no mínimo 74 px mesmo nas cordas.
- O defensor pode agir antes do atacante; o sexto não cancela o quinto. Uma nova troca exige reposicionamento.
- O counter especial de seis socos de Zorp mantém seu fluxo próprio. O limite de cinco se aplica aos J/K normais.

## Distância, variantes e animação

- Retos usam tolerância de profundidade de 10 px; curtos, 14 px. Sempre são exigidos X, Y e a direção comprometida.
- Perfil escolhido no início conforme distância, sequência, mão alternada e pressão na guarda. Ele não acompanha o adversário que sai da linha.
- J: startup de 6 passos, ou 5 perto; 6 HP antes de contexto/escala; custo 5 de stamina.
- K: startup de 12 passos, ou 10 perto; 14 HP antes de contexto/escala; custo 13 de stamina.
- Corpo em curta distância: J 5 HP + 7 stamina; K 11 HP + 15 stamina, antes da escala do combo.
- Transferência de peso: J avança 1,2–1,8 px; K, 4–6 px, distribuídos pelo startup. Não há teleporte.
- Knockback normal: J 3 px, K 7 px. No quarto soma 8 px. No quinto usa 32 px no alvo e recuo físico do atacante conforme o espaço disponível.
- Escala de dano dos acertos 1–5: 1,00 / 1,00 / 0,96 / 0,90 / 0,82.
- Poses existentes reutilizadas: jab_left, jab_right, cross e hook/inside_windup. A pose fechada compatível serve aos curtos; não foi criado outro botão nem inventado um novo uppercut.
- Os frames acompanham startup, contato e recovery, inclusive nas continuações rápidas. Mantidos os PNGs, proporções, escala uniforme e anchors.

## Counter, guarda e ritmo

- COUNTER! detectado no contato contra startup, pesado ativo ou whiff recovery.
- Punição contextual: +2 HP. Counter após esquiva correta: preserva +3 HP.
- Acrescenta quatro passos de hitstun e usa hitstop de três passos. O finisher continua com hitstun curto para permitir saída.
- Alvo neutro e alvo já em hitstun não geram bônus repetido de counter.
- Pausas: J um passo, K dois, counter/finisher três. Som e shake permanecem contidos.
- Custos: J 5, K 13, dodge 14, finta 4.
- Bloqueio drena stamina: J 4, K 9, especial bloqueável 18. Guard pressure e guard break continuam separados.
- Regeneração no neutral: 0,60 por passo, ou 36/s; atraso de 12 passos. Em guarda: 0,18 por passo. Não regenera durante ataque, dodge, finta, hitstun, quebra ou whiff recovery.
- Transição de round limpa também movimento de knockback pendente e buffers.

## Strings no navegador

Chrome real e teclas de entrada; adversário parado apenas nos fixtures de medição. A física registra os contatos. Referência: distância de 40 px, profundidade alinhada. Dano concreto pode mudar conforme corpo, distância, guarda e counter.

- J → J: danos 6 + 6; estágios 1, 2.
- J → J → J: danos 6 + 6 + 6; estágios 1, 2, 3.
- J → K: danos 6 + 14; estágios 1, 2.
- J → J → K: danos 6 + 6 + 13; estágios 1, 2, 3.
- J → K → J: danos 6 + 14 + 6; estágios 1, 2, 3.
- J → K → K: danos 6 + 14 + 13; estágios 1, 2, 3.
- K → J: danos 14 + 5; estágios 1, 2.
- K → J → K: danos 14 + 5 + 13; estágios 1, 2, 3.
- K → K → K: danos 14 + 11 + 13; estágios 1, 2, 3.
- J → J → J → J → J: danos 6 + 6 + 6 + 5 + 5; estágios 1, 2, 3, 4, 5.
- J → K → K → J → K: danos 6 + 14 + 13 + 5 + 11; estágios 1, 2, 3, 4, 5.

- Nas cordas: 5 acertos e 74.00 px de separação; defensor livre enquanto atacante ainda recuperava.
- Também verificados: whiff sem cancelamento, counter em startup, corpo drenando stamina, erro por profundidade, L/Shift/Space e os especiais.
- Zorp confirmou counter com seis contatos direita/esquerda. O dash do Mestre falhou ao sair da linha.

## Testes e luta completa

- **152 testes aprovados**: todas as oito permutações de três J/K, continuações de cinco, ambos os lados, cordas, guarda, whiff, counters, stamina, rounds e especiais.
- Combos e estado equivalentes com atualização em 30, 60 e 144 FPS.
- Expectativas antigas atualizadas onde mudaram alcance por avanço físico, dano contextual/escalado, limite de cinco, knockback em passos e counter ao interromper a carga. O teste de leitura atrasada limpa o empurrão pendente ao montar seu teleporte de fixture.
- Luta completa, IA ativa: vencedor zorp; rounds 2–0; 2 rounds disputados. Medalha: True. Retorno ao destino existente ILHA_ESQUI.
- 12 lutas simuladas adicionais chegaram a RESULT, com resultados dos dois lados. Os controladores existentes são políticas de QA, não uma classificação de habilidade humana.
- Desempenho observado no combate ativo: 60.00 FPS, amostra de 180 quadros. Não representa todos os dispositivos.
- Assets base: 92/92; falhas 0. Folhas de especiais carregadas também.
- Console/execução: 0 erros. HTTP ≥400: 0. Falhas de carregamento não canceladas: 0.

## Arquivos desta etapa

- Runtime: boxing_arena.js, boxing_resources.js, boxing_rounds.js, boxing_presentation.js.
- Texto do Boxe: pre_game_brief_configs.js. Cache: index.html.
- Novo: boxing_core.test.cjs. Expectativas atualizadas em boxing_arcade.test.cjs, boxing_fun.test.cjs, boxing_master_ai.test.cjs, boxing_master_special.test.cjs, boxing_rounds.test.cjs.
- Nenhum PNG, atlas de especial ou código de outro minigame foi alterado nesta etapa.
- Evidências: browser-core.json, browser-fight.json, simulated-fights.json, strings-simulated.jsonl, tests-integrated.tap, integration.json e capturas.
