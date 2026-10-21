# Arquearia — pássaros com alvos pendurados

## Implementação

`archery_bird_targets.js` desenha aves e pequenos alvos por Canvas. Não utiliza arquivos de imagem novos e não altera a arena, os controles, os sprites dos arqueiros, a duração da partida ou a entrega da medalha.

O centro lógico de cada objeto é **o disco pendurado**, nunca o corpo do pássaro. A colisão contínua existente compara o segmento percorrido pela ponta da flecha com esse disco em movimento. Corpo, asas, bico e cordas não possuem hitbox. O marcador `carrier: BIRD / RIVER` impede que a reutilização de objetos misture os dois tipos.

## Dificuldade e frequência

- Disco: raio de 8 pixels, contra 10 pixels do menor alvo comum do rio.
- Valor: 48 pontos no anel externo; 63 no interno; 78 na mosca. As mesmas proporções de zonas existentes continuam valendo: 70% e 35% do raio.
- Velocidade horizontal: 1,55–1,65 pixels por atualização de 60 Hz. O deslocamento total máximo, incluindo a componente vertical, é aproximadamente 1,657 px, contra 1,30 px do alvo rápido do rio.
- Primeira oportunidade: a partir de 9 segundos, aguardando espaço entre os alvos existentes.
- Intervalo mínimo entre entradas: 12 segundos. Limite de quatro aves por partida e uma simultânea, inclusive depois de seu alvo ser atingido.
- Uma travessia dura aproximadamente 5,4–5,7 segundos. A ave entra completamente de fora da tela e só é retirada depois que toda sua silhueta sai pelo lado oposto.

## Percursos

Todos têm avanço horizontal monotônico. A altura é uma função determinística do progresso do voo; não há perseguição, random walk ou inversão repentina.

1. Esquerda → direita: horizontal, disco na altura 98.
2. Direita → esquerda: diagonal suave, altura 104 → 122.
3. Esquerda → direita: arco suave, altura 116 nas extremidades e 99 no centro.
4. Direita → esquerda: arco com pequena subida, altura 108 → 98 e mínimo aproximado de 90,6.

As coordenadas são referentes ao Canvas lógico 450 × 300. O corpo fica 25 pixels acima do disco. As aves são desenhadas depois da espuma da cachoeira, para que o alvo aéreo não seja ocultado pela camada do rio. As bordas contrastantes do disco, seus anéis e as duas cordas distinguem claramente o objetivo dos pequenos pássaros decorativos distantes.

## Acerto

1. A flecha acerta o disco e o desativa imediatamente.
2. O jogo concede os pontos ao arqueiro responsável, uma única vez.
3. Aparecem fragmentos pequenos do alvo, impacto, som e `AEREO +pontos`.
4. A ave reage durante 24 atualizações, com mudança breve no bater das asas e sinal de surpresa.
5. O pássaro segue a mesma trajetória, sem alvo e sem cordas. Sua posição, velocidade e progressão não são alteradas pelo acerto.

Não há dano ao pássaro, queda, explosão da ave ou pausa global. Zorp e Mestre disputam os mesmos alvos, usando suas rotinas atuais de tiro.

## Arquivos alterados nesta etapa

- `archery_bird_targets.js`: criação, voo, desenho e reação da ave transportadora.
- `archery_river_targets.js`: apenas identificação explícita `carrier: RIVER` para o pool compartilhado.
- `script.js`: agenda de aves, seleção do atualizador/desenhador, colisão compartilhada, pontuação e diagnóstico. Alterações confinadas à seção da Arquearia.
- `index.html`: carregamento do novo módulo antes da lógica principal e atualização das versões dos scripts modificados.
- Este documento.

## Validação

QA executado em Chrome real, em modo headless, com perfil e save isolados, cache desativado e eventos de teclado via CDP. Capturas do Canvas foram inspecionadas visualmente. Uma partida completa usa o bot de movimentação/disparo de QA já existente; não se trata de playtest humano manual.

O XAMPP estava indisponível nesta sessão. Os mesmos arquivos foram servidos temporariamente por HTTP em `127.0.0.1:8780`; nenhuma configuração do XAMPP ou save do navegador do usuário foi alterada.

A bateria cobre entrada pelo Mestre, partida, quatro trajetórias completas, geometria do disco, tiros reais pela asa e pelo alvo, recompensa única, reação e saída da ave, reutilização do pool, regressão da mosca do alvo do rio, partida completa de 55 segundos, frequência e limite de aves, acertos de ambos os arqueiros, FPS, resultado/retorno, reinício e erros de rede/console.

Resultado final: **23/23 verificações aprovadas**. Foram concluídas duas partidas de 55 segundos. Na última, surgiram quatro aves, sempre uma por vez; Zorp e Mestre acertaram um alvo aéreo cada, e todas as quatro aves saíram voando da tela. Média de 60,26 FPS no Chrome isolado. Zero 404, TypeError, ReferenceError ou warnings do jogo. O retorno à ilha e o reinício também foram aprovados. A comparação com a cópia anterior confirmou que o conteúdo de `script.js` antes e depois da seção da Arquearia permaneceu idêntico.

Evidências locais: `archery_birds_qa_report.json`, `archery_bird_hanging_canvas.png`, `archery_bird_hit_canvas.png`, `archery_bird_empty_canvas.png` e `archery_bird_live_canvas.png` na pasta de QA desta conversa.

Um teste geométrico inicial teve sua preparação corrigida: depois de colocar artificialmente o alvo no centro para o ensaio, era necessário estabilizar sua posição anterior antes de medir uma flecha contra um disco parado. Os tiros reais já funcionavam; essa correção foi exclusiva do script de QA. A bateria completa foi repetida após o ajuste.
