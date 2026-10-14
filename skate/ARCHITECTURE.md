# Skate — implementação oficial

O mini-game usa uma pista fixa, linear e lateral. O runtime ativo é `skate/skate_ollie_runtime.js`; curso, input, física, travessia e combo ficam em módulos separados dentro de `skate/`. Os antigos runners e páginas de teste foram removidos; os sprites compartilhados permanecem no projeto.

## Controles e física

- Velocidade base: `230` unidades/s; descida chega a `280`.
- Gravidade: `1650` unidades/s².
- Primeiro SPACE: Normal Jump imediato, velocidade vertical `-350`.
- Segundo SPACE no ar em até `220 ms`: upgrade do mesmo salto para Ollie, `-485`, com o flip existente.
- HOLD no chão/ar não aumenta a altura; mantém intenção de Grind. Não existe Super Jump de chão.
- AIR + HOLD em até `24 px` do path: captura suave em `100 ms`. A projeção na tangente preserva o avanço (variação inicial limitada a ±4%). HOLD mantém o Grind; RELEASE lança imediatamente com `-650 + clamp(slope × vx × 0,35, -100, 100)`. O fim do rail nunca lança automaticamente.
- Na Mega Ramp, HOLD SPACE sustenta a trajetória por até `3400 ms`; slow motion usa escala `0,68`. A força vem da rampa e sua velocidade.
- Câmera distante: zoom normal `0,72`, Zorp perto de 30% da tela; deadzone vertical e enquadramentos existentes dos grandes saltos preservados.

SPACE é tratado como evento de borda e permanece pendente até a física consumir o primeiro passo. A soltura depois do pouso em Manual também é reconhecida mesmo que o pressionamento tenha começado no ar.

## Curso e colisões

A pista oficial é declarada em `official_procedural_course.js` com o mesmo builder usado pelos sandboxes. Ground, rampas, rails, escadas, bancos, ledges, plataformas, gaps e suportes são formas Canvas; a geometria desenhada também é a fonte de colisão. O runtime oficial não carrega catálogos nem PNGs de cenário. O catálogo `skate_v2` permanece ativo somente para as animações do Zorp.

- Uma rota contínua de 25.699 unidades (x=150..25849), dez beats e três setpieces preservados. Replays completos por teclado duram cerca de 104 segundos.
- 22 rampas, 29 rails/edges, 14 gaps e 29 props/estruturas (incluindo quatro escadas). Zero obstáculos do runner antigo.
- Checkpoints x=8750 e x=17980, aproximadamente 33,5% e 69,4% da extensão jogável.
- Introdução: cinco rails distintos; os dois primeiros têm chão seguro. Dois gaps de 310 e 400 unidades introduzem risco progressivo.
- No Floor possui cinco rails e quatro transfers internos. Todas as saídas usam o impulso de RELEASE; altura vem da tangente e do momentum anterior.
- High rails são preparados por rampas ou rails/ledges anteriores. Nenhum exige hold upgrade partindo do chão.
- O validador de transfer usa a física real de saída de Grind, sem a antiga fórmula de hold.
- A pista usa paths próprios para rails retos, inclinados e curvos; a mesma polyline desenha a barra e conduz o Grind.
- A Stair Death tem um caminho de grind próprio que acompanha a escada. Enquanto Zorp está preso a esse handrail, a colisão com os degraus correspondentes é ignorada; sem captura, os degraus causam Fail.
- Ramps usam superfícies por polyline. Rails e ledges usam `grindPath`. Props separam topo seguro, borda grindável e lateral perigosa. `skateDebug` desenha collider do rider, contato do board, ramp surfaces, grind paths e colisões dos props.
- Objetos procedurais são desenhados apenas quando entram na faixa visível. O cache de imagens do runtime carrega somente frames do Zorp.

## Score e medalha

Tricks e distância de Grind aumentam o score ativo; Normal Jump não recebe bônus direto. Ollie tradicional mantém o score do flip. High Rail alcançado com Super Jump vale `140`, Bench Trick com Ollie vale `120`, e Special Air com sustentação completa vale `300` antes do multiplier. O crash descarta o score ativo e conserva o score banked. A medalha continua usando o registro central e é concedida no finish. O projeto não contém um threshold de score para medalha; não foi calibrado sem runs reais medidas.

## QA automatizado

`node --test skate/*.test.cjs skate_new/*.test.cjs` cobre parser, upgrades de salto, Hold/Double Tap, Grind Hop, chain de cinco rails do curso, Mega Air com somente SPACE, banco, escadas, ramp surfaces, checkpoints, crash por zero input, Hold e mash, finish e medalha.

Na Stair Rail foram repetidos 10 cenários de captura do corrimão (com pequenas variações de timing) e 10 cenários de falha sobre a escada. A suíte confirma cinco rails sem pouso e runs completas com diferentes cadências de atualização. A introdução aceita saídas 20 px mais cedo ou 8 px mais tarde e saltos de chão deslocados em ±12 px.

## Limites de verificação

`level_playtest.html` é uma página de QA separada do jogo, com o renderer e runtime reais. Seus replays enviam eventos de teclado ao parser existente; não movimentam Zorp diretamente. O registro em `qa/` diferencia replays completos de tentativas manuais assistidas por pausas. Scores e tempos desses replays não representam uma amostra de jogadores humanos.

## Polimento de momentum e cor

Captura usa interpolação Hermite do desvio normal ao path: mantém posição/velocidade inicial e termina alinhada em 100 ms. O renderer faz transição curta de pose no mesmo board contact, rotação suave e faíscas discretas. Não há reposicionamento de câmera específico ao capturar.

Ciano `#65efff`: rails/bordas grindáveis. Laranja `#ffb94d`: ramp surfaces/lips. Concreto neutro e detalhe `#6d9290`: superfícies seguras. Magenta `#ff477d`: laterais perigosas, escadas fatais e bordas/profundidade de gaps. A cor aparece nos contornos e detalhes; não preenche objetos inteiros.

Evidência desta revisão: `qa/MOMENTUM_POLISH.md`.

## Jornada visual e clímax

`journey_presentation.js` controla a interpolação manhã/tarde/sunset/noite (paletas em 0%, 32%, 64%, 86%), reação visual à tangente, compressão de landing e fogos com pool fixo de 384 partículas. O Mega Air aceita apenas HOLD SPACE durante no máximo 3400 ms. D não é lido pela física nem pelo runtime. Fogos começam com Hold durante Mega Air, continuam após a landing e intensificam no finish; quedas interrompem novos lançamentos. Símbolos de queda, hazard stripes e avisos progressivos no handrail são decoração procedural sem colisão.
