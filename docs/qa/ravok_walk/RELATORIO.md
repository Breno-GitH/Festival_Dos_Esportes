# Ravok e K7 — caminhada real com escala fixa

## Causa localizada

As cenas desenhavam uma única pose frontal e alteravam seu tamanho durante o deslocamento:

- `ravok_event.js`: saída de Ravok, multiplicador de 0,55 até 1.
- `ravok_arrival.js`: saída de K7, multiplicador de 0,5 até 1.
- `ravok_bad_ending.js`: embarque dos dois personagens, multiplicador de 1 até 0,5.
- `ravok_arrest.js`: K7 encolhia até 0,5 ao embarcar; Ravok era elevado enquanto seu tamanho caía até 0,35 na escolta.
- `script.js`: os callbacks de desenho repassavam esses multiplicadores ao tamanho visual.

Essas mudanças de tamanho foram removidas dos personagens. O desenho agora troca frames reais e move a posição dos pés. Os movimentos de câmera e das naves continuam pertencendo à composição das cenas.

## Auditoria das folhas originais

### Ravok.png — 1254 × 1254

Foram medidos **40 frames de locomoção**:

- IDLE frente: 4.
- IDLE costas: 4.
- IDLE esquerda: 4.
- IDLE direita: 4.
- WALK baixo: 6.
- WALK cima: 6.
- WALK esquerda: 6.
- Linha WALK direita: 6 poses, das quais **4 são compatíveis com a direção direita**.

As poses de índices 3 e 4 da linha WALK direita olham visualmente para a esquerda. Foram mantidas no registro de auditoria e excluídas da sequência de caminhada à direita. Nenhuma direção ficou sem ciclo adequado.

As legendas da imagem não correspondem exatamente à quantidade real de poses. Os recortes foram medidos por personagem e por coluna; algumas linhas têm apenas 1–3 pixels de intervalo.

### K7.png — 1254 × 1254

Foram medidos **28 frames de locomoção**:

- IDLE frente, costas, esquerda e direita: 3 por direção, total de 12.
- WALK baixo, cima, esquerda e direita: 4 por direção, total de 16.

Poses adicionais de fala e reação presentes nas folhas não foram misturadas aos ciclos de caminhada.

## Atlas e fidelidade dos pixels

Os **68 sourceRects originais**, os pivôs dos pés e as sequências estão em `ravok_walk_atlas.json`. O espelho JavaScript é carregado por `ravok_walk_atlas.js`.

O atlas transparente derivado fica em `overworld_assets/ravok_k7_walk.png`. Os PNGs originais não foram modificados.

Preparação feita uma única vez:

- Recortes reais, sem incluir legendas ou personagens vizinhos.
- Remoção do preto exterior por flood fill conectado às bordas, preservando os detalhes internos.
- Normalização proporcional com nearest-neighbor: altura útil de 132 pixels para Ravok e 168 para K7. As poses originais possuem tamanhos distintos; essa preparação elimina a mudança de tamanho entre poses sem alterar proporções durante o jogo.
- Célula comum de 128 × 176 e pivô dos pés em (64, 172).
- Alinhamento horizontal pela região dos pés, sem acompanhar braços ou antenas.

Verificação do atlas: todas as poses têm a mesma linha de chão; alfa utiliza somente 0 ou 255; nenhum pixel opaco ganhou uma cor ausente da respectiva folha original. Não foi adicionado matte ou contorno branco. O corpo branco de K7 foi preservado.

## Sistema compartilhado

`ravok_k7_animation.js` fornece:

- `RAVOK_WALK_DOWN`, `RAVOK_WALK_UP`, `RAVOK_WALK_LEFT`, `RAVOK_WALK_RIGHT`.
- `K7_WALK_DOWN`, `K7_WALK_UP`, `K7_WALK_LEFT`, `K7_WALK_RIGHT`.
- IDLE correspondente à última direção de movimento.
- Direção visual pelo componente predominante do deslocamento; diagonais usam o mesmo critério.
- Atualização livre com `update(actor, vx, vy, deltaTime)`.
- Caminhos de cutscene calculados pelo tempo acumulado em segundos, com desaceleração nos últimos 30%.
- Fase dos passos proporcional à distância percorrida; desenhar mais vezes não acelera a animação.
- Colisão fixa de **18 × 8**, separada dos frames visuais.

### Escala e cadência

- Ravok: escala fixa **0,333333**, altura visível de **44 pixels**. Referência de movimento: **16 pixels de mapa/s**, cadência de **7,5 FPS**.
- K7: escala fixa **0,261905**, altura visível de **44 pixels**. Referência de movimento: **18 pixels de mapa/s**, cadência de **8 FPS**.

A cadência diminui quando o personagem anda mais devagar ou desacelera. Nos trajetos principais, fica aproximadamente entre 6 e 9,2 FPS durante a parte regular da caminhada. O pequeno deslocamento de Ravok em direção à nave na rota NÃO é mais lento e usa passos menos frequentes.

O render utiliza sempre a mesma célula, a mesma largura/altura de destino e uma única escala por personagem. Os valores presentes em uma pose não podem sobrescrever a escala oficial. `imageSmoothingEnabled = false`; a origem final do desenho é arredondada. Não há bob, squash, stretch, espelhamento ou rotação de personagens.

## Cenas revisadas

### Quarta medalha — K7 sai

Porta aberta → K7 em (368, 89) → WALK_RIGHT → deslocamento de 2,2 segundos até (396, 113) → IDLE_RIGHT. A caminhada substitui o crescimento de tamanho e o recorte móvel que revelava a pose frontal.

### Oito medalhas — Ravok sai

Porta aberta → Ravok em (368, 89) → WALK_DOWN → deslocamento de 2,2 segundos até (350, 114) → IDLE_DOWN → conversa existente.

Durante a saída, o personagem é desenhado à frente da porta aberta para que o casco não corte seu corpo quando os pés ainda estão na rampa.

### Rota SIM

Os dois caminham de volta à porta em (368, 89), com entradas desencontradas:

- K7 parte de (396, 113), caminhar de 2,1 segundos.
- Ravok parte de (350, 114), inicia após 0,6 segundo e caminha por 2 segundos.

Ambos chegam à coordenada da porta antes de desaparecer. O fechamento da porta, a partida das naves e o restante da sequência foram preservados.

### Rota NÃO

- Ravok caminha de (350, 114) até (360, 105) ao tentar partir.
- K7 volta fisicamente à porta, com WALK_UP, antes de ser recolhido como evidência.
- Na escolta, Ravok caminha de (360, 105) até (368, 89), dentro da contenção visual, e entra na nave apreendida.
- A nave e os equipamentos são levados pelas autoridades; o jogador recupera o controle no Overworld, conforme a rota existente.

## Debug

Desligado por padrão. Para ativar no console de desenvolvimento:

`DEBUG_RAVOK_K7_ANIMATION = true`

Mostra estado, direção, frame, x/y, scaleX/scaleY, ponto dos pés e collider. `RavokK7Animation.snapshot()` expõe as mesmas informações, os retângulos e o estado de carregamento.

## Testes

**57 testes automatizados aprovados, zero falhas.**

Incluem:

- Quatro direções para os dois personagens e retorno ao IDLE correto.
- Mesmas dimensões de destino e mesma escala em todos os frames.
- Pivô e collider fixos.
- Movimento e fase dos passos equivalentes em 30, 60 e 144 FPS.
- Direção predominante em diagonais.
- Desaceleração e chegada exata à porta.
- Nenhuma progressão da animação por repetição de desenho.
- Exclusão das duas poses incompatíveis da linha WALK direita de Ravok.
- Debug desligado por padrão.
- Embarque e escolta usando poses animadas.
- Regressão dos gatilhos, saves, escolhas, confirmações, chegada, prisão e final secreto existentes.

### Navegador real

Chrome, origem local e perfil de QA isolados; nenhum save do jogador foi alterado.

- Testadas oito combinações personagem/direção, com parada e IDLE.
- Quarta medalha: cutscene completa, cinco amostras de caminhada de K7, permanência no mapa.
- Oito medalhas: saída completa de Ravok, quatro amostras, parada e conversa.
- SIM: conversa, segunda confirmação, seis amostras do embarque, sequência até ending card e retorno ao menu.
- NÃO: fluxo completo a partir de um save de QA da escolha recusada, 28 amostras dos movimentos de retorno/escolta, prisão, retorno ao controle e persistência após reload.
- **3.433 desenhos monitorados na chegada/saída/aceitação e 3.115 na recusa**: nenhum com escala X/Y desigual, origem fracionária ou smoothing ligado.
- Zero 404, falhas de requisição, erros de console, TypeError ou ReferenceError observados.
- Inspeção das capturas: sprites reconhecíveis, sem alongamento, achatamento, blur adicional ou contorno branco adicionado.

Evidências: `browser-results.json`, `asset-validation.json`, `regression.txt`, `walk-directions.png` e capturas de cada cena nesta pasta.

### Conferência após integração

Os arquivos integrados foram comparados por hash com os módulos validados. Uma segunda checagem no Chrome serviu diretamente a pasta real do projeto em `http://127.0.0.1:8834/index.html`: Ravok e K7 carregaram, com as escalas corretas e zero erros de console ou HTTP. Evidências em `production-smoke.json` e `production-overworld.png`.

A URL habitual `http://localhost/2025/Festival_dos_Esportes/` apresentou `ERR_CONNECTION_REFUSED` no ambiente de teste. A configuração do Apache não foi alterada; a validação utilizou servidores locais de QA e um perfil de navegador isolado.

## Arquivos

Novos de runtime:

- `ravok_k7_animation.js`.
- `ravok_walk_atlas.js`.
- `ravok_walk_atlas.json`.
- `overworld_assets/ravok_k7_walk.png`.

Alterados:

- `ravok_event.js`.
- `ravok_arrival.js`.
- `ravok_bad_ending.js`.
- `ravok_arrest.js`.
- `script.js`, somente integração de desenho desses dois NPCs.
- `index.html`, carregamento e versões de cache dos módulos afetados.

Testes:

- `ravok_k7_animation.test.cjs` novo.
- `ravok_event.test.cjs`, `ravok_arrival.test.cjs` e `ravok_outcome.test.cjs`: dependências atualizadas.

Não houve alterações em minigames, diálogos, escolhas, critérios de medalhas, formato do save, ilha ou assets originais.
