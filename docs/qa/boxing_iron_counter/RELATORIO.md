# Mestre do Boxe — Iron Counter

Implementado em 24/10/2026 sobre o combate existente. A identidade do Mestre passa a ser paciência, defesa, leitura e explosão. O Rush Overdrive de Zorp foi preservado.

## Golpes e sequências curtas

- Mestre limitado a **3 contatos por combo**; Zorp mantém o limite de 5. O terceiro contato do Mestre encerra a sequência com separação física e recuperação.
- A IA escolhe continuações curtas como J→K, J→J→K, K→J e Counter K→J→K. Só continua depois de um contato limpo confirmado e dentro da janela física de cancelamento. Golpe bloqueado, aparado, esquivado ou que errou não permite o cancelamento de hit-confirm.
- **J do Mestre:** 8 HP, ou 7 em golpe curto no corpo; custo de 7 stamina; startup de 7–8 passos; hitstun 14; knockback 5 px; recovery 14 passos e mais 7 quando erra.
- **K do Mestre:** 18 HP, ou 15 no corpo; custo de 17 stamina; startup de 14–16 passos; hitstun 22; knockback 12 px; recovery 24 passos e mais 14 quando erra.
- Um **K preparado após counter ganho** tem startup de 10 passos, permitindo uma resposta forte sem contato instantâneo. O restante da física, do custo e da punição permanece.
- Body shots do Mestre drenam mais stamina: J, 9; K, 18, quando conectam limpos. Pressão na guarda: J, 22; K, 42.

Valores anteriores à escala de combo, bloqueio ou bônus de counter. A física continua a 60 passos por segundo. Os atributos não mudam com HP, round ou placar.

## MASTER_COUNTER_STANCE

O Mestre fecha a postura numa linha e direção comprometidas. Planeja uma breve espera, inicialmente de 6–22 passos, e abre **uma janela de parry de 4 passos / aproximadamente 67 ms**.

Quando já existem jabs repetidos no histórico, a previsão usa a cadência observada. Se um jab comum for realmente bloqueado durante a espera, pode ajustar essa previsão **uma única vez**, a partir do impacto sentido e da cadência anterior, com pequeno erro. A espera total tem limite de 32 passos. Não há leitura da tecla J nem previsão exata do próximo input.

Se o parry funciona, utiliza a vantagem física já existente e pode responder com K e uma continuação curta. Se ninguém atacar, houver finta, mudança de ritmo ou saída da linha, a tentativa pode falhar e deixar **14 passos / aproximadamente 233 ms de recuperação aberta**. Cooldown da postura: 150 passos / 2,5 s. A pressão ainda pode quebrar sua guarda.

Finta, paciência e reposicionamento foram testados como respostas válidas. A postura não acompanha o jogador pela arena.

## CRUSHING COUNTER

Exige um contato real de **K do Mestre durante o startup de K de Zorp**. Não acontece apenas por proximidade nem contra um Zorp parado, bloqueando ou fora da linha.

- Bônus de 5 HP sobre o K, chegando a **23 HP** num primeiro direto limpo.
- **12 de dano adicional de stamina**.
- Hitstun de 28 passos no caso padrão, knockback adicional de 4 px e hitstop de **4 passos / aproximadamente 67 ms**.
- Feedback visual e sonoro próprio, com texto `CRUSHING COUNTER!`.
- Permite continuação pequena, respeitando o limite de três contatos.

## Resistência limitada no K

Alguns K preparados pela IA podem resistir a **um único jab comum** nos **últimos três passos do startup**, uma janela de aproximadamente 50 ms. Isso não é um escudo de HP: o Mestre recebe o dano e desgaste, mas esse jab não interrompe automaticamente seu ataque nem concede cancelamento de combo ao atacante.

A resistência não existe fora dessa janela, acaba no primeiro contato e não é aplicada a todo K. Golpes fortes, Rush/especial e counters ganhos por parry/esquiva/Perfect Dodge continuam interrompendo. Um jab neutral absorvido nessa janela não ganha o bônus genérico de counter de startup; um counter previamente conquistado mantém sua vantagem e vence a resistência.

## Slip

Movimento pequeno usando as poses existentes: até **8 px de profundidade**, durante cinco passos, com duração total de 12 passos / 200 ms. Custo de 7 stamina e cooldown de 60 passos / 1 s.

Nos passos 3–6, um jab comum que ameaçava a posição pode passar raspando. Não evita automaticamente K nem Rush. Um Slip bem-sucedido abre counter por 20 passos / 333 ms e permite resposta a partir do passo 8. Fora da janela, o corpo continua vulnerável à colisão normal.

## IA paciente e adaptação

- Janelas `MEASURE` de **18–60 passos / 0,3–1 s**, com pausa ou pequenos ajustes de distância.
- Histórico visível atrasado mantido: reação de 12–21 passos / aproximadamente **200–350 ms**, decisões a cada 6–10 passos e nenhuma leitura direta de inputs.
- Memória recente limitada a 24 amostras de comportamento e 8 ataques, descartando ataques antigos. Fintas visuais entram como ameaças, sem um marcador secreto que denuncie a finta.
- Repetição de J favorece Counter Stance/parry; esquivas recorrentes aumentam interesse em finta; guarda persistente favorece K e pressão corporal; distância favorece corte de ringue por uma linha interior.
- Após um bloqueio próprio, existe uma demora local de 6–10 passos antes da tentativa de resposta. Após parry, 3–6 passos. Sentir o próprio contato não revela um novo input do adversário.
- Quando está perdendo ou com pouca vida, pode escolher mais pressão. Não há aumento artificial de dano, velocidade, alcance ou resistência.

## TITAN STRAIGHT

Preservada a base do especial atual, agora identificado internamente como **TITAN_STRAIGHT**:

- Carga legível de **36 passos / 600 ms**, com postura firme, recuo do braço e brilho da luva.
- Dash físico de até **220 px**, 10 px por passo, em direção e profundidade comprometidas na ativação.
- 28 HP, grande knockback e impossibilidade de bloquear ou aparar normalmente.
- Evitável com Space no timing correto ou W/S para sair da linha. Não segue Zorp depois de começar.
- Se errar, mantém **36 passos / 600 ms de recuperação**, com os sprites específicos de recomposição e vulnerabilidade real a combo. A punição do whiff recebe o feedback de counter apropriado.
- Cooldown de 12 s e barra própria preservados.

A finta rara do Titan só é considerada pela IA nos rounds 2–3, com hábito de esquiva observado. Chance condicional de **8%**, no máximo uma tentativa por round. É decidida antes da carga, nunca depois de ver um Space atual. Cancela no passo 12, não cria hitbox de dash e deixa 18 passos / 300 ms de recuperação. Retorna 45 da barra, mas mantém o cooldown inteiro: não é uma preparação gratuita ou repetível continuamente.

## Validação

- **266 testes automatizados aprovados**: novos comportamentos e regressões de Zorp, Rush Overdrive, guarda, parry, Perfect Dodge, finta, combos, rounds, desempate e medalha.
- Contatos simultâneos continuam justos; os testes agora alinham fisicamente as diferentes preparações de Zorp e Mestre, em vez de presumir velocidades iguais.
- Testes a 30, 60 e 144 FPS com simulação fixa.
- **12 lutas completas simuladas**, com resultados para ambos os lados e comportamento falível. As políticas automatizadas não equivalem a uma avaliação de dificuldade humana.
- **14 cenários controlados no Chrome real**: postura, parry programado, combo Counter K→J→K, ajuste após bloqueio sentido, finta punindo postura, saída de profundidade, Crushing Counter, resistência a um jab, K interrompendo resistência, Slip, resposta de Slip, Titan contra guarda, whiff do Titan punido por combo e finta rara do Titan.
- Inspeção visual dos estados e dos sprites; sem novos recortes, squash/stretch ou alteração de assets.
- Luta completa no Chrome com IA ativa: Zorp venceu por 2–0, medalha somente após a luta e retorno ao Overworld.
- **92/92 assets carregados**, sem falhas. Zero 404, TypeError, ReferenceError ou exceções capturadas durante o QA.
- Amostras de 180 frames: aproximadamente **60 FPS** no ambiente headless de teste.
- Perfil e save de navegador isolados.

## Arquivos alterados

- `boxing_arena.js`: perfis próprios do Mestre, limite de combo, postura, Slip, resistência, Crushing Counter, memória e decisões.
- `boxing_resources.js`: custos do Mestre e regeneração consistente com postura/Slip.
- `boxing_rounds.js`: limpeza dos novos estados e preparações entre rounds.
- `boxing_master_special.js`: identidade Titan Straight e finta rara com recuperação.
- `boxing_presentation.js`: leitura de Iron Counter, Slip, resistência, Crushing Counter e Titan, com áudio procedural discreto.
- `pre_game_brief_configs.js`: dica curta sobre finta e saída da linha do Titan, somente no Boxe.
- `index.html`: cache versionado dos módulos alterados.
- `boxing_iron_counter.test.cjs`: testes próprios da identidade.
- Testes anteriores de arcade, núcleo, defesa, combos, IA, especial e rounds: atualizados apenas onde presumiam que os golpes do Mestre tinham o mesmo dano/startup de Zorp.

Não foram alterados os controles oficiais, o Rush Overdrive, os atlas/PNGs dos lutadores ou outras modalidades.
