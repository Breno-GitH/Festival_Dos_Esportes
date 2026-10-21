# Montanha da Escalada — rotas conectadas

## Distribuição

O antigo deslocamento de todos os apoios para a face oeste foi substituído por
três corredores jogáveis distribuídos pela parede: esquerda, centro e direita.
Do paredão até a subida final, os apoios ocupam as cinco faixas horizontais da
montanha, chegando aproximadamente a 9–90% de sua largura útil. A base abre as
opções gradualmente depois dos três saltos iniciais.

São **589 apoios**, organizados em três blocos de rotas que convergem nos
patamares e na aresta final. Há **12 travessias diagonais** para trocar de
rota durante a subida. Não são três trilhas isoladas.

- **Esquerda:** mais passos, maioria de rochas fixas, alguns apoios com musgo
  e bônus; exige deslocamentos laterais mais longos.
- **Centro:** mudanças frequentes de direção, alternância de rocha comum,
  musgo, frágeis e gelo; conectada às travessias.
- **Direita:** menos passos nos desvios, com apoios móveis, gelo e frágeis;
  a redução de saltos exige mais leitura de movimento e tempo de agarrada.

A base visual continua larga e o cume estreito: aproximadamente **4.441**
unidades na base, **2.564** no meio, **867** a 90% de altitude e **200** no cume.
Todos os apoios, incluindo o percurso completo dos móveis, ficam dentro da
silhueta da montanha. A menor folga lateral validada é cerca de 98 unidades.

## Cinco zonas contínuas

1. **Base / Vale dos Caminhos — 0–1.100:** introdução curta e segura,
   abertura gradual das três rotas e primeiras escolhas.
2. **Parede / Travessias — 1.100–3.400:** primeira grande ocupação lateral,
   atalhos técnicos e cruzamentos de rota. Termina no checkpoint 1.
3. **Penhascos / Rotas Cruzadas — 3.400–6.100:** rotas bem separadas,
   conexões diagonais longas e maior exposição aos objetos do Mestre.
4. **Alta Montanha / Gelo — 6.100–8.800:** leitura de gelo e apoios móveis,
   checkpoint 2 e nova abertura das rotas.
5. **Aresta Final / Cume — 8.800–10.400:** plataformas menores, gelo,
   travessias e convergência final. Os últimos apoios levam à borda física
   já usada pelo sistema de pull-up e vitória.

## Checkpoints

- **Checkpoint 1:** altitude **3.400**, aproximadamente **32,7%**, etapa 51.
- **Checkpoint 2:** altitude **7.100**, aproximadamente **68,3%**, etapa 107.

Os dois continuam sendo plataformas físicas com HANG, PULL_UP, pose em pé,
caminhada A/D limitada, preparação de salto e câmera estável. As rotas
convergem antes deles e se abrem novamente depois. A validação também confirma
que não é possível contornar os checkpoints por uma sequência ascendente.

## Tipos de apoio

- 493 rochas normais;
- 14 com musgo;
- 19 frágeis;
- 14 de gelo;
- 14 de bônus;
- 26 móveis;
- 6 com espinhos;
- 2 checkpoints;
- 1 borda física de cume.

Os móveis usam trajetórias determinísticas horizontais, verticais, diagonais
baixas e íngremes, arco curto, pêndulo e elipse. Cruzamentos muito próximos
usam rochas fixas, para manter os pontos de decisão legíveis. Os espinhos
ficam em ramificações opcionais com alternativa segura na mesma altitude.

## Comprimento e câmera

A altura passou de **7.712 para 10.400** unidades. A linha central planejada
passou de 102 para 156 saltos; o caminho mínimo do grafo passou de 95 para
129 saltos. O tempo real depende das escolhas, da leitura e das recuperações.

O enquadramento horizontal foi centralizado para revelar escolhas dos dois
lados. O zoom, o tracking vertical e o bloqueio da câmera nos checkpoints
mantêm a apresentação existente. HUD e desenhos dos personagens não mudaram.

## Validação matemática

- Três rotas reais nas cinco zonas.
- Cinco faixas horizontais ocupadas no paredão, penhascos, neve e aresta final.
- 12 travessias e todas as sequências planejadas conectadas.
- Nenhum apoio seguro alcançável sem continuação até o cume.
- Nenhum espinho adjacente, sequência espinho → espinho ou espinho obrigatório.
- Dois checkpoints alcançáveis e obrigatórios.
- Todos os apoios móveis com entrada e saída, sem colisões entre trajetórias.
- 600 transferências planejadas auditadas em 64 fases independentes:
  11.628 simulações, tolerância de posição de 4 unidades, atraso de controle
  de 2 frames e janela mínima de 3 frames consecutivos.
- Nenhum apoio fora da montanha.
- Segurar W não resolve a subida: no teste de 2,2 s Zorp não passou da base.

## Playtests em navegador

Chrome real, com entradas de teclado automatizadas, save isolado e objetos do
Mestre ativos. Não foram atribuídas posições, checkpoints ou vitória durante
a subida.

### Tentativa central

Chegou à neve, aproximadamente altitude 6.542, e terminou por perda de vidas
com os objetos do Mestre. O primeiro checkpoint foi alcançado e sua caminhada,
limites e câmera foram testados. Isso reforça a importância de escolher rotas
e reposicionar a subida, em vez de insistir sempre na mesma linha.

### Run com trocas de rota

Concluída até o cume físico: **79,40 s** até ficar em pé e **86,85 s** até o
resultado. Foram 176 comandos de salto e quatro recuperações para apoios
inferiores. Visitou apoios das três rotas, incluindo 46 à esquerda, 14 à
direita e 12 de conexão. Terminou com três vidas, após recuperar vidas nos
checkpoints.

Nos dois checkpoints foram testados caminhada para os dois lados, limites e
estabilidade da câmera. O final executou HANG, PULL_UP, revelação, diálogo,
medalha, nova VICTORY e resultado, seguido de retorno ao overworld.

Uma verificação direcionada adicional confirmou, nas duas novas posições,
que o respawn só é atualizado após ficar em pé. Após perda controlada de vida,
Zorp reapareceu no mesmo ponto seguro e enquadramento, e saltou usando teclado
até o próximo apoio real. Essas verificações usaram fixtures isoladas; as runs
completas descritas aqui percorreram a montanha desde a base.

Média de **59,94 FPS**, sem 404, TypeError, ReferenceError, warnings ou outras
falhas de carregamento nessa execução.

### Run priorizando a direita

Também concluída com o Mestre ativo: **72,23 s** até o cume, **79,64 s** até
o resultado, 144 comandos de salto e nenhuma recuperação. Visitou 117 apoios
da rota direita e terminou com três vidas. Os dois checkpoints passaram pelos
mesmos testes de caminhada, limites e câmera. Média **59,90 FPS**, sem erros
de console ou carregamento.

### Run priorizando a esquerda

Concluída com o Mestre ativo: **75,50 s** até o cume e **82,60 s** até o
resultado. Foram 178 comandos de salto, nenhuma recuperação, 107 apoios
visitados à esquerda e três vidas ao terminar. Média **59,94 FPS**, sem
erros de console ou carregamento. Os tempos são de controle automatizado,
sem as pausas de leitura de um jogador humano.

### Ajustes após as primeiras verificações

- Corrigidas duas entradas de rota com intervalos verticais pequenos demais.
- O validador passou a analisar a rota inteira quando ela atravessa uma zona
  visual; antes, a divisão por seção cortava artificialmente a análise.
- Junções muito próximas foram afastadas para evitar sobreposição visual.
- Acrescentada verificação de continuação até o cume para todos os apoios seguros.

## Arquivos

- `climb_course.js`: distribuição, trajetos, tipos e marcos de progressão.
- `script.js`: leitura do plano de rotas, validação e enquadramento horizontal.
- `index.html`: cache das duas fontes modificadas.
- Este relatório e a imagem de visão geral das rotas.

Uma auditoria de hashes confirmou que os 58 arquivos protegidos — sprites,
atlas, lógica dos checkpoints e sistema de cume/vitória — permaneceram idênticos.
