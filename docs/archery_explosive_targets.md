# Arquearia — alvo explosivo

## Visual e entrada pelo rio

Novo tipo `EXPLOSIVE`, raio físico de 13 pixels. Usa a mesma boia, trajetórias determinísticas e ciclo de entrada/saída dos alvos do rio. Não aparece instantaneamente no campo.

A face tem borda laranja, núcleo escuro, símbolo de explosão e anel pulsante discreto. Após detonar, o disco desaparece e a boia vazia continua seguindo a correnteza. O desenho e os efeitos são feitos por Canvas; nenhum PNG novo é necessário.

As oportunidades começam a partir de 12 segundos, na próxima seleção de agrupamento, com intervalo mínimo de 16 segundos entre agrupamentos especiais:

- `EXPLOSIVE_CONFLUENCE`: alvo comum, explosivo e alvo pequeno entram pelo mesmo afluente, espaçados por 66 atualizações. Todos usam velocidade média, permitindo esperar pela aproximação dos três.
- `EXPLOSIVE_CHAIN_CURRENT`: oportunidade da fase final com seis alvos, sendo dois explosivos. Entradas alternadas esquerda/direita convergem no rio. O escalonamento é de 24/42 atualizações entre entradas, respeitando os 66 frames por afluente. A cadeia pode alcançar os seis discos quando o jogador espera sua aproximação.

Apenas esse agrupamento final pode preencher seis posições ativas. As demais entradas mantêm seus limites anteriores. O limite geral permanece dez objetos de alvo, incluindo transportadores já atingidos a caminho da saída. Os pássaros continuam limitados a um por vez.

## Raio e alvos válidos

O raio da explosão é **62 pixels lógicos**. O teste é círculo contra disco: uma face é atingida se a distância entre os centros for menor ou igual a `62 + raioDoAlvo`.

Somente objetos com transportador `RIVER` ou `BIRD`, visíveis, ativos e ainda não atingidos participam. Coordenadas e raio devem ser finitos. Alvos ocultos, inativos, já reclamados ou explosivos já detonados são ignorados.

- A explosão pode acertar o **disco pendurado** de uma ave. Ela recebe a reação já existente e continua voando sem o alvo.
- Corpo, asas e cordas não são hitboxes. Se apenas o corpo estiver no raio, o disco não é atingido.
- Zorp, Mestre e cenário não são candidatos e não recebem dano, empurrão ou alteração de estado pela explosão.

## Reação em cadeia e pagamento único

`ArcheryExplosiveTargets.resolve` usa uma fila em largura, sem recursão, e um conjunto de objetos já visitados. Cada explosivo recebe `detonated = true` antes de procurar vizinhos. Uma corrente A → B → A termina sem repetir detonação ou recompensa.

O resultado é aplicado sincronamente pela lógica da Arquearia. Todos os discos atingidos ficam inativos antes que outra flecha seja processada. A autoria pertence ao arqueiro que iniciou a explosão e permanece a mesma durante toda a cadeia, inclusive se esse arqueiro for o Mestre.

`isExplosive` e `detonated` são inicializados explicitamente em alvos do rio e aves para impedir contaminação pelo pool de objetos reutilizados.

## Pontuação

- Valor do explosivo: 24 pontos, mais o bônus de velocidade já existente: 0 / 3 / 7.
- A flecha inicial continua recebendo os bônus normais de precisão: +15 no anel interno ou +30 na mosca.
- Discos atingidos pela área concedem seu valor base, incluindo o bônus de velocidade. Não recebem uma mosca artificial, pois não houve impacto direto da flecha no centro.
- O combo conta os alvos únicos de toda a cadeia, incluindo o primeiro explosivo. É pago uma vez por ativação.

Bônus de combo:

- Um alvo: nenhum bônus.
- Dois ou três: +15.
- Quatro ou cinco: +40.
- Seis ou mais: +80, com `SUPER COMBO xN`.

## Efeitos e som

Cada detonação tem um círculo de choque de 28 atualizações (~0,47 s), oito partículas pequenas e flash local de no máximo 13 pixels durante cinco atualizações. Não há pausa global, dano a personagens ou flash de tela inteira.

As ondas visuais de cadeias têm atraso de três atualizações por nível. A opacidade diminui conforme o número de ondas simultâneas para preservar a leitura dos alvos e flechas. Os números individuais e o texto curto de combo usam o sistema de efeitos já existente.

O áudio usa o mesmo `AudioContext` local da Arquearia. A explosão tem timbre e envelope próprios; a frequência sobe nos níveis da cadeia. O limite compartilhado de três vozes e os ganhos baixos evitam sobreposição excessiva. Nenhum sistema de áudio global foi criado ou alterado.

## Arquivos desta etapa

- `archery_explosive_targets.js`: resolução, validação, bônus, símbolo e ondas.
- `archery_river_targets.js`: inicialização de flags, som e boia vazia após detonação.
- `archery_bird_targets.js`: inicialização explícita das flags de explosivo para reutilização segura.
- `script.js`: tipo, agrupamentos, pontuação, integração, efeitos e diagnósticos, dentro da seção de Arquearia.
- `index.html`: carregamento do módulo e versões dos scripts alterados.
- Este documento.

## QA

Chrome real em modo headless, perfil e save isolados, cache desativado e eventos de teclado por CDP. Cenários geométricos, de estresse e de propriedade dos pontos usam configurações controladas via diagnóstico. As partidas completas usam o bot de movimento/disparo de QA já existente, e não um playtest humano manual. Capturas do Canvas foram inspecionadas visualmente.

O XAMPP estava indisponível. Foi utilizado um servidor temporário para a mesma pasta em `127.0.0.1:8781`, sem alterar a configuração do usuário.

Cobertura: explosivo sozinho; dois, três, cinco e seis alvos; corrente de três explosivos; estresse com dez explosivos e mil tentativas repetidas; borda exata do raio e disco 0,02 pixel fora; alvos inativos/ocultos/gastos; autoria do Mestre; alvo pendurado e ave intacta; corpo da ave dentro e disco fora; personagens dentro do raio; cenário; pools; agrupamentos convergentes; seis entradas reais pelo rio; partida completa; reinício e retorno à ilha; rede e console.

Evidências: `archery_explosive_qa_report.json`, `archery_explosive_ready.png`, `archery_explosive_impact.png`, `archery_explosive_chain.png`, `archery_explosive_super_combo.png` e `archery_explosive_natural_cluster.png` na pasta de QA desta conversa.

Resultado: **32/32 verificações aprovadas** na versão final. Foram concluídas duas partidas automatizadas de 55 segundos nesta etapa; a última utilizou o agrupamento final de seis alvos. Nessa partida apareceram quatro explosivos e quatro aves; ambos os arqueiros pontuaram, e a média foi 60,25 FPS. Os testes controlados confirmaram combo de seis, cadeia de três explosivos e cadeia de dez sem repetição. O agrupamento final também entrou de fato pelo rio, mantendo seis discos ativos, sem teleporte. Zero 404, TypeError, ReferenceError ou warnings do jogo. Resultado, retorno e reinício aprovados.

Uma comparação binária da cópia anterior com o arquivo atual confirmou que o conteúdo de `script.js` antes e depois da seção da Arquearia permaneceu idêntico. Não houve edição de outros minigames, personagens, arena ou sistemas do Overworld.
