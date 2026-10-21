# Arquearia 2.0 — confiabilidade das colisões

## Causa encontrada

A versão anterior já tinha uma tentativa de sweep relativo, não apenas sobreposição de posições finais. Ela, porém, tinha lacunas reproduzidas nos testes:

- rejeitava o alvo usando apenas `active` no fim do passo. Um disco de pássaro parcialmente visível, ou um alvo saindo rapidamente da arena, podia ser ignorado apesar de sua parte visível cruzar a flecha;
- removia o alvo que terminasse sua rota antes de testar as flechas daquele mesmo intervalo;
- retornava sem hit quando a velocidade relativa era zero, mesmo havendo sobreposição inicial;
- verificava visibilidade apenas no primeiro ponto geométrico, sem recortar todo o intervalo de contato contra a parte visível do campo;
- a simulação avançava um frame por chamada de renderização, sem sincronização por tempo real. Velocidades, deslocamentos e duração dependiam da taxa de atualização.

As hitboxes não foram aumentadas para corrigir esses problemas.

## Algoritmo

`archery_collision.js` centraliza a colisão de todas as faces circulares, incluindo discos flutuantes, alvos carregados por pássaros, explosivos e dourados.

Cada flecha mantém `prevX`, `prevY`, `x` e `y`. As propriedades anteriores `previousX/previousY` continuam sincronizadas para compatibilidade. Os alvos também registram os dois extremos do movimento.

A equação usa o segmento em movimento relativo:

`p(t) = (flechaAnterior - alvoAnterior) + t × (deslocamentoFlecha - deslocamentoAlvo)`.

Resolve-se `|p(t)|² = raio²` para encontrar o intervalo de entrada/saída do disco. O caso de deslocamento relativo zero é tratado explicitamente. O cálculo usa o raio real, com padding físico **zero**.

O intervalo é então recortado contra o campo visível. Alvos que emergem de trás da cachoeira respeitam a mesma máscara vertical usada no desenho. Partes ocultas não absorvem tiros.

Entre os alvos cruzados, o menor `t` determina o primeiro contato. A flecha comum só consome esse alvo e passa por `ACTIVE → HIT → REMOVED`, sendo retirada da lista ativa no mesmo passo. Flechas removidas e discos já atingidos não podem pagar novamente.

## Ponto de contato e pontuação

O ponto mundial do primeiro contato é calculado, sem reposicionar a flecha no centro do alvo. Ele determina qual alvo recebe a flecha e em que instante isso acontece.

A classificação dos anéis preserva a regra existente de afastamento da trajetória relativa em relação ao centro da face. Esse afastamento fornece um ponto de impacto na face e continua distinguindo centro, anel intermediário e borda. Ele também é limitado à parte visível do disco.

Há uma distinção necessária: o primeiro toque na circunferência serve para ordenar colisões; usar sua distância ao centro para pontuar faria todo tiro valer apenas a borda e eliminaria moscas. Por isso contato e classificação dos anéis são calculados separadamente, ambos pela trajetória, sem inventar um acerto central.

Valores base, bônus de velocidade, bônus de precisão, pontos dos dourados e bônus de combo não foram modificados. As funções `awardArcoTargetHit()` e `awardArcoHit()` permaneceram idênticas.

## Alvos móveis, pássaros e explosivos

O alvo continua disponível até terminar o teste das flechas, mesmo se sua posição final já estiver fora da tela. A remoção ocorre depois.

Para aplicar o hit, as posições dos alvos são interpoladas temporariamente ao instante de contato. Assim, explosões e reações em cadeia avaliam a vizinhança daquele instante. Depois, os portadores continuam nas posições finais de suas trajetórias. Nenhuma trajetória ou spawn foi alterado.

Nos pássaros, somente o disco pendurado tem hitbox. Corpo, asas, cordas e pássaros decorativos não são objetivos. A ave continua voando após perder o disco.

O código de explosões existente continua responsável por raio de área, reação em cadeia e proteção contra repetição. Não houve mudança nas regras de dano, combo ou personagens.

## DeltaTime

Somente a Arquearia passou a acumular o tempo decorrido entre atualizações. A lógica existente roda em passos fixos de **1/60 s**, independentemente da frequência de desenho.

O movimento de flechas e portadores recebe `deltaSeconds` e converte as velocidades existentes, expressas em unidades por passo de 60 Hz. Alvo e flecha sempre usam o mesmo intervalo na colisão.

A 30 FPS, são executados dois passos normais por atualização; a 120/144 FPS, algumas atualizações apenas desenham e as seguintes executam o passo acumulado. O input de Espaço é consumido uma única vez no passo em que foi processado, evitando repetir o tiro durante recuperação de frames.

Cooldown, decisão e dificuldade do Mestre, spawn, progressão de ondas e duração configurada de 3.600 passos/60 segundos permanecem os mesmos na referência de 60 Hz. O acúmulo por atualização é limitado a 250 ms para evitar longas rajadas de simulação ao reativar uma aba suspensa.

## Debug visual

Desligado por padrão. Para ligar temporariamente no console:

```js
window.ARCHERY_COLLISION_DEBUG = true;
```

Mostra posição anterior e atual da flecha, segmento percorrido, círculos reais dos discos, posição anterior dos discos, contato em vermelho e ponto de classificação na face em verde. Os registros têm duração curta e quantidade limitada. Para desligar, atribuir `false` à mesma flag.

## Testes no navegador

Chrome real em modo headless, perfil isolado e teclado por CDP. Foram executados testes geométricos e fixtures de integração no próprio navegador, taxas de atualização simuladas e uma partida completa em tempo real. **44 verificações aprovadas de 44**.

Cobertura:

- alvo parado com flecha lenta e flecha que atravessa o disco inteiro em um único passo;
- alvo rápido horizontal, diagonal e nas sete rotas determinísticas reais;
- caso de velocidade relativa zero, dentro e fora da face;
- primeiro contato com alvos em ordem invertida no array e discos parcialmente sobrepostos;
- consumo da flecha e ausência de hit/pagamento no passo seguinte;
- near miss a 0,01 unidade fora do raio real continua sendo erro;
- tangência exata, sem ampliar o raio;
- disco de pássaro parcialmente visível; corpo da ave atravessado sem ponto; ave continuando a voar após o hit;
- portador rápido que cruza a flecha e termina sua rota no mesmo passo;
- explosivo isolado e reação em cadeia com quatro alvos, sem afetar os personagens ou pagar novamente;
- zonas de pontuação normais e douradas preservadas;
- partes visíveis e ocultas sob a cachoeira;
- debug habilitado e novamente desligado;
- input único sem repetição em substeps.

### Volume

- **30.000 segmentos relativos**, comparados com um oráculo independente de distância mínima ao segmento: 3.102 interseções esperadas, **zero perdas e zero falsos positivos**.
- **560 tiros dirigidos** em dourados rápidos nas sete rotas reais, usando deltaTime de 30, 60, 120 e 144 FPS: todos registrados.
- **80 tiros adicionais** em dourados carregados por pássaros nas quatro taxas: todos registrados.
- Quatro partidas completas com a mesma semente e renderização simulada a 30/60/120/144 FPS: todas chegaram a 3.600 passos, com placar idêntico do Mestre de 1.921 pontos, 31 disparos e 36 alvos atingidos contando explosões. A resolução das flechas terminou aproximadamente em 60,4 s em todos os casos.
- Partida em tempo real no navegador: **109 disparos de Espaço**, 16 alvos atingidos pelo jogador, placar final **675 × 2.231**, fim em aproximadamente **60,26 s** e retorno normal ao Overworld. Essa execução usou movimentação e teclas automatizadas por CDP; não foi playtest humano.
- Smoke test em `file://`: módulo carregado, debug desligado e simulação/disparo funcionando.

Não houve atravessamento sem detecção nas baterias dirigidas. **Zero 404, falhas de carregamento, TypeError, ReferenceError ou avisos/erros de console** nos testes finais.

## Escopo e arquivos

Alterados/adicionados:

- `archery_collision.js` — sweep, contato, interpolação no impacto e debug.
- `archery_river_targets.js` — movimento por deltaTime e uso do sweep central.
- `archery_bird_targets.js` — movimento por deltaTime e extremos sincronizados.
- `script.js` — ciclo de vida da flecha, remoção posterior dos portadores, aplicação no instante de contato e simulação fixa da Arquearia.
- `index.html` — carregamento do módulo e versões de cache.
- `docs/archery_continuous_collision.md` — este relatório.

Nenhum PNG foi alterado. Arena, raios, configurações de pontos, spawn e código da IA foram preservados. O código fora do bloco da Arquearia em `script.js` permaneceu idêntico.
