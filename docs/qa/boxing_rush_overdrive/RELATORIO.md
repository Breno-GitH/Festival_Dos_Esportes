# Zorp — Rush Boxer / Rush Overdrive

Implementado sobre o Boxe existente em 24/10/2026. O jogador confirmou que **todos os J/K gastam uma carga durante o Overdrive**; não há modificador adicional de teclado.

## Comportamento final

- **O**, com barra cheia, ativa **RUSH OVERDRIVE** por **6 segundos** e concede **4 Rush Charges**. A barra é consumida na ativação.
- O sozinho não causa dano, não avança, não esquiva e não escolhe alvo. É possível continuar andando, defendendo, aparando, esquivando e fintando durante o estado.
- Cada novo **J** solicitado executa **RUSH JAB** e consome uma carga.
- Cada novo **K** solicitado executa **RUSH STRAIGHT** e consome uma carga. **K com exatamente uma carga restante** executa **METEOR STRAIGHT** e encerra o Overdrive.
- Se a última carga for usada com J, ela é consumida e o estado termina sem inventar um Meteor ou golpe extra.
- A carga é consumida quando o ataque realmente começa, mesmo se depois errar, for esquivado, aparado, interrompido ou cancelado em finta. Rejeições por falta de stamina, input inválido ou recovery não gastam cargas.
- Ao esgotar as cargas ou os 6 segundos, os próximos J/K voltam aos golpes normais. Um Rush já comprometido termina fisicamente mesmo que o tempo do estado acabe durante sua execução.
- Cooldown de ativação: **3 segundos**, além da exigência de recompor a barra inteira. Os próprios Rushes não recarregam essa barra.

## Ataques e risco

Valores de dano abaixo são anteriores à escala de combo, counter ou bloqueio.

- **Rush Jab:** 7 HP; startup 5 passos (3 quando ligado por hit-confirm), ativo 3; avanço de até **18 px**; knockback **2 px**. Recovery 11 passos; se errar, mais 9. Recuperação após a janela ativa de um whiff: aproximadamente **333 ms**.
- **Rush Straight:** 16 HP; startup 9 passos (5 em combo), ativo 3; avanço de até **38 px**; knockback **12 px**. Recovery 20 passos; se errar, mais 16. Recuperação após a janela ativa de um whiff: aproximadamente **600 ms**.
- **Meteor Straight:** 22 HP; startup 12 passos (7 em combo), ativo 4; avanço de até **72 px**; knockback **42 px**. Recovery 28 passos; se errar, mais 22. Recuperação após a janela ativa de um whiff: aproximadamente **833 ms**. Não permite continuação por cancelamento após conectar.

A física roda a 60 passos por segundo. O avanço respeita as cordas e o corpo do adversário; os valores são máximos, não teleporte garantido. A direção e a linha de profundidade são comprometidas no início. Rush não segue o Mestre nem vira durante o golpe.

Os danos não são duplicados: a vantagem vem principalmente do avanço, das ligações mais rápidas e da pressão. Rush Jab acrescenta 20 de pressão na guarda; Rush Straight, 38; Meteor, 58. Todos podem ser bloqueados, aparados, esquivados ou evitados saindo da linha, conforme as mesmas regras físicas do combate.

## Combos e counters

A ativação de O pode aproveitar um acerto normal já confirmado, preservando o hit-confirm e o buffer. Não pode cancelar o startup ou o whiff de um golpe normal para fugir da punição.

Validados, entre outros:

- J normal → J normal → O → Rush J → Rush J → Rush K.
- Rush J → Rush K → Rush J → Meteor K.
- Rush K → Rush J → Rush K → Meteor K.
- Perfect Dodge → Rush K Counter → Rush J.

As quatro transições J→J, J→K, K→J e K→K continuam usando as janelas reais de cancelamento, não uma lista de comandos. O limite de cinco contatos e a separação de fim de combo permanecem. Não há hitstun automático que prenda o Mestre em seis golpes.

## Sprites e apresentação

Reutilizados os **7 recortes reais** já mapeados de `zorp_boxe3.0_especial.png`. Os retângulos, máscaras de transparência, escala uniforme **0,52** e anchors dos pés foram preservados.

As ações do atlas agora mapeiam preparação → avanço → soco → recuperação para Rush Jab, Rush Straight e Meteor. O sprite muda de pose enquanto o corpo avança fisicamente. Não foram gerados sprites artificiais nem alterado o PNG.

Afterimages por Canvas: no máximo **3**, vida de **6 passos / 100 ms**, opacidade máxima **0,13**. Mantidos `imageSmoothingEnabled = false`, escala proporcional e bottom-center.

O HUD informa cargas e segundos restantes. O último K recebe identificação de Meteor Straight. Indicadores de guarda, parry, stun, Perfect Dodge e counter continuam tendo leitura própria durante o estado. O briefing do Boxe foi atualizado.

## Lógica antiga removida

Removidos da gameplay o weave que avançava sozinho, a evasão automática na ativação, a detecção contextual que escolhia o counter especial e o agendamento de seis socos automáticos. Também foram removidos os antigos tipos de ataque `weave_finish` e `weave_rush` e suas exceções de contato/pontuação.

Alguns nomes de recortes do atlas ainda descrevem a pose original da imagem. Isso não representa um estado ou uma sequência automática de gameplay.

## QA

- **228 testes automatizados aprovados**, cobrindo ativação, controle por J/K, charges, hit-confirm, Rushes em combo, whiffs, recuperação, punição física, Meteor, timeout e movimento sem homing.
- Regressões de guarda, parry, Perfect Dodge, finta, combos normais, rounds, empate/sudden death e especial linear do Mestre aprovadas.
- Testes físicos a **30, 60 e 144 FPS**, mantendo a simulação fixa.
- **11 cenários controlados no Chrome real**, usando eventos de teclado: ativação sem ataques automáticos; Rush Jab; ausência de continuação automática; Rush Straight; combo misto com Meteor; ativação no meio de J→J; whiff punido; Meteor errando; Perfect Dodge seguido de Rush Counter; parry durante Overdrive; expiração natural em 6 segundos.
- Inspeção visual dos frames, avanço, afterimages, HUD e briefing. Nenhum stretch ou novo recorte de sprite foi introduzido.
- **12 lutas completas simuladas** terminaram corretamente, com vitórias para os dois lados. Os controladores usados são políticas de QA, não uma medição de dificuldade humana.
- **Uma luta completa no Chrome**, com controle automatizado do jogador e IA ativa: vitória de Zorp por **2–0**, medalha concedida apenas no final da luta e retorno à ilha correspondente do Overworld.
- **92/92 assets carregados**, zero falhas, zero HTTP 404, zero TypeError, zero ReferenceError e zero exceções capturadas no navegador.
- Amostras de 180 frames: aproximadamente **60 FPS** no ambiente headless de teste.
- Perfil e save isolados; o save do usuário não foi usado.

## Arquivos alterados

- `boxing_zorp_special.js`: substitui o controlador automático pelo Overdrive passivo e pelos Rushes acionados por J/K.
- `boxing_zorp_special_atlas.js`: ações de Rush e atualização da versão de cache, preservando os recortes reais.
- `boxing_arena.js`: integra perfis de Rush, hit-confirms, direção comprometida, colisão de avanço, interrupções e timer.
- `boxing_resources.js`: permite defesa, finta e recuperação de stamina durante o estado, sem reembolsar Rush cancelado.
- `boxing_rounds.js`: remove a antiga exceção de contagem do counter automático; a limpeza de round encerra Overdrive e afterimages.
- `boxing_presentation.js`: cargas, duração, poses, trails, áudio e leitura dos estados.
- `pre_game_brief_configs.js`: instrução curta do Overdrive, somente no Boxe.
- `index.html`: versões de cache dos módulos alterados.
- `boxing_special.test.cjs`: substitui testes do especial automático pelos testes do Overdrive controlado pelo jogador.
- `boxing_defense.test.cjs`, `boxing_master_special.test.cjs`, `boxing_rounds.test.cjs`: expectativas atualizadas para a remoção do antigo counter automático.
- `boxing_ai_harness.cjs`: o jogador automatizado de QA reconhece Overdrive como estado que permite continuar atacando.

Controles oficiais, sprites normais, parâmetros da IA e runtime do especial do Mestre não foram alterados.
