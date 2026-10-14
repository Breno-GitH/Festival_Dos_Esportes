# Regras de montagem do Skate 2.0

Este contrato vale para a futura pista construída com **`skate_assets2.0.png`** e
seus recortes em `skate_v2/scene/`. Ele não posiciona nenhuma peça na fase atual.
`catalog.js` fornece o visual e guias de geometria; `assembly_rules.js` fornece
papéis de colisão, exigências de apoio e uma checagem preliminar da montagem.

## Coordenadas e geometria

- A posição de uma peça é o canto superior esquerdo do PNG recortado. A dimensão
  padrão é `size` do catálogo; escala diferente precisa transformar visual,
  superfície e grindPath juntos.
- `geometryHints` está normalizado na **região do sheet original**, não no PNG
  recortado. `worldPath()` faz essa conversão. Esses pontos são guias visuais e
  precisam de calibração fina quando a peça for colocada.
- `surfacePoints` representa somente o caminho onde o skate pode tocar. Um
  retângulo do sprite nunca substitui a superfície. `grindPath` representa
  somente a borda/barra utilizável, sem incluir pernas ou suportes.
- O contato de montagem entre duas peças deve diferir no máximo **4 px**.
  Junções de superfícies precisam coincidir dentro da mesma tolerância, sem
  microburacos ou degraus invisíveis. Ajustar o desenho e a colisão juntos.
- A colisão perigosa da lateral usa região própria da peça colocada. Ela não
  pode ocupar transparência nem a caixa inteira do sprite.

## Regra de sustentação visual

Cada peça acima do chão precisa de contatos visíveis (`mounts`) com outra peça
que, por sua vez, chegue a uma fundação visível. A mera proximidade dos PNGs
não prova apoio. `rooted: true` é reservado aos módulos de chão e estruturas
de abismo cuja base realmente esteja ligada ao solo/concreto visível; também
exige `visibleFoundation: true`. Conferir isso no screenshot final, pois um
validador de dados não consegue provar que os pixels parecem apoiados.

| Peça | Montagem física e visual obrigatória |
| --- | --- |
| Rails retos/curvos | As pernas desenhadas no sprite encostam no chão, plataforma, ledge ou estrutura. Dois contatos visíveis no mínimo. Suportes são visuais; a barra superior é o grindPath. |
| Handrails inclinados | As extremidades e postes se conectam a escada ou a níveis/estruturas visíveis. Inclinação não autoriza deixar a barra suspensa. |
| `cable-wave-linked` | Pontas presas a duas estruturas/postes visíveis. Nunca usar o cabo solto no vazio. |
| Rail elevado | Pernas/postes encontram a plataforma, escada, concreto ou estrutura que o sustenta. Altura extra não é preenchida por espaço transparente. |
| Escadas | Entrada e saída tocam dois níveis reais; corpo/degraus têm base visível. Handrail integrado já está no sprite; rail separado deve alinhar com os níveis da escada. |
| Kickers, banks e rampas curvas | Base e entrada encostam no chão ou plataforma. Estrutura de suporte desenhada fica visível; superfície inclinada segue o desenho. |
| Plataformas elevadas | Corpo, parede ou pilar visível chega ao solo ou a outra estrutura. Topo é superfície física independente das laterais. |
| Gap/abismo | Usar `chasm-takeoff-platform` e `chasm-landing-platform` nas duas bordas. O intervalo é vazio real, sem superfície de chão atravessando. Pilares opcionais precisam de base/ligação visível. Não representar o buraco apenas com um retângulo preto. |
| Banco/ledge | Pés ou bloco apoiados em superfície. Topo seguro; lateral frontal perigosa. A borda do ledge pode ter grindPath; o banco só terá se uma instância explicitar a geometria. |
| Bloqueios/decoração | Sempre apoiados ou fixados em estrutura. Nada cai, voa, se move aleatoriamente ou nasce no céu. |

## Colisão por papel

- **Chão, plataforma e topo de banco:** `SAFE_TOP` na superfície real.
- **Ledge:** `SAFE_TOP` no topo, `GRINDABLE_TOP` somente na borda indicada;
  frente/lateral como `DANGEROUS_SIDE` estreita e visível.
- **Rail/corrimão/pipe:** `GRINDABLE_TOP` no `grindPath`. Pernas e suportes
  não viram automaticamente hitboxes fatais.
- **Rampa:** `SAFE_TOP` na curva/inclinação. Uma lateral só é perigosa se
  houver estrutura visível e região frontal definida para aquela colocação.
- **Escada comum:** degraus/superfície do catálogo, sem fatalidade automática.
  `fatalStairs: true` numa **instância** troca o contato com os degraus por
  `DANGEROUS_STAIR_FALL` e requer `fatalRegion` própria. O handrail continua
  grindável. Não aplicar essa regra a todas as escadas.
- **Gap:** `FATAL_FALL` somente no vazio delimitado, com bordas físicas
  desenhadas. A arte de pilares não cria chão invisível.
- **Decoração:** sem colisão.

`collisionRoles(assetId, { fatalStairs })` reúne esses papéis. A geometria de
`DANGEROUS_SIDE` e `FATAL_FALL` deve ser dada por peça colocada. O manifesto
não contém polígonos finais confiáveis para todas as laterais.

## Contrato de dados para a futura pista

Cada colocação terá `id`, `assetId`, `x`, `y`, dimensões opcionais, `mounts`
com pontos normalizados no **PNG recortado**, e regiões perigosas quando
aplicáveis. Cada `mount` informa `on`, `at` e `hostAt`. Um módulo raiz informa
`rooted` e `visibleFoundation`. `joins` declara as costuras entre superfícies;
`gaps` declara `startX`, `endX`, `takeoffId` e `landingId`. O validador recusa
referências ausentes, apoio incompatível, contato desalinhado, costura aberta,
chão atravessando um gap e peças sem cadeia até uma fundação. Ele também
rejeita metadados de cenário móvel/voador.

Esse contrato é uma **primeira barreira**. Antes de usar uma montagem na fase,
conferir em debug a superfície, grindPath, lados perigosos, contatos, bordas de
gap e o screenshot parado. Peças marcadas em `catalog.js` como `reviewFlags`
(parte das escadas, a rampa especial e pilares) exigem atenção extra porque o
sheet original tem sobreposição de desenhos. Não esconder sobras do recorte
com colisão invisível.

## Limite desta etapa

O level design atual, os controles, a física e os outros minigames permanecem
como estão. Estas regras preparam a substituição futura do cenário pelo kit
oficial e evitam repetir peças suspensas ou hitboxes baseadas no PNG inteiro.
