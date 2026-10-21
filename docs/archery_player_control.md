# Arquearia — controle de Zorp por pressionamento

## Disparo e tempos

Espaço continua sendo o único botão de disparo. Um toque completo, mesmo muito curto, inicia automaticamente a preparação e produz uma flecha. Soltar o botão antes da animação terminar não cancela o tiro. Não há barra de força, carregamento obrigatório ou QTE.

O módulo `archery_player_control.js` mantém o estado do disparo e uma trava de tecla pressionada. Repetição do teclado e eventos `keydown` duplicados sem `keyup` não produzem tiros adicionais. A trava é liberada também ao perder o foco da janela. Os listeners não alteram as teclas nem os controles de outros minigames.

Na simulação existente de 60 atualizações por segundo:

- `RAISE_BOW`: 4 atualizações (~67 ms).
- `DRAW_BOWSTRING`: 5 atualizações (~83 ms).
- `RELEASE_SHOT`: 5 atualizações (~83 ms).
- `RECOVERY`: 8 atualizações (~133 ms).
- Cooldown entre inícios de preparação: 30 atualizações (0,5 s).

A flecha nasce na entrada em `RELEASE_SHOT`, 9 atualizações (~150 ms) depois da aceitação do toque. A sequência visual completa ocupa aproximadamente 0,37 s e não bloqueia WASD. A posição do arco usada no disparo é a posição real no momento da soltura, incluindo o deslocamento feito durante a preparação.

Um toque feito nos últimos 6 ticks (~0,1 s) do cooldown pode ser guardado em um único slot. Ele produz só uma nova preparação quando o intervalo acaba. Toques anteriores a essa janela são descartados; segurar a tecla nunca preenche o slot novamente. Não existe fila acumulada de flechas.

Tutorial e resultado também exigem um novo pressionamento. Segurar Espaço ao iniciar a partida não solta uma flecha automaticamente. Segurar o último tiro não fecha imediatamente o resultado.

## Mira por posicionamento

A implementação anterior usava posicionamento, sem cursor. Esse modelo foi preservado. A direção inicial recebe uma inclinação discreta para o centro do rio, calculada exclusivamente a partir de X/Y de Zorp e dos limites da área de tiro. Não consulta alvos.

No centro, o tiro é vertical. À esquerda, inclina ligeiramente para a direita; à direita, para a esquerda. A profundidade do posicionamento modifica suavemente essa abertura. O limite é aproximadamente 4,29 graus e o componente vertical permanece sempre para cima.

Três pequenas marcas próximas do arco mostram a direção inicial. A flecha mantém a velocidade total de 11,8 pixels por atualização e a direção calculada na soltura durante todo o voo. Não existe homing, correção posterior de mira, rotação lateral do personagem ou espelhamento dos sprites.

## Animação e legibilidade

Os estados de Zorp no atlas 2.0 acompanham diretamente os estados da simulação. O frame de soltura coincide com a criação da flecha. A pose pronta substitui a antiga preparação decorativa que acontecia sozinha enquanto Zorp esperava parado.

A escala, os recortes e o anchor dos pés foram preservados. `imageSmoothingEnabled` continua desativado. A flecha do jogador ganhou um pequeno destaque claro e um rastro de duas linhas translúcidas alinhadas ao vetor real de voo. Esses detalhes são apenas visuais e não aumentam a hitbox.

## Erro e colisão

A flecha continua usando colisão contínua entre a ponta anterior e a atual contra os discos em movimento. Entre todos os alvos válidos, vence o menor instante de contato do segmento. Portanto, a ordem no array não permite atravessar um alvo próximo para acertar outro atrás.

Após o primeiro acerto, a flecha é consumida. O efeito de área de um explosivo continua sendo resolvido separadamente pelo sistema existente; a flecha normal não atravessa vários discos.

Sem acerto, a flecha mantém o voo físico até sair por completo. A margem superior de remoção do jogador passou para 48 pixels fora da tela para acomodar o rastro de até 44 pixels. Não há tempo de vida que apague a flecha no meio do campo. A flecha do Mestre e suas regras permanecem iguais.

## Arquivos desta etapa

- `archery_player_control.js`: novo controlador de entrada, tempos, mira por posição, guia e diagnóstico.
- `script.js`: integração apenas na Arquearia, criação da flecha na soltura, ciclo de tutorial/resultado, margem visual e guarda de Espaço restrita a `JOGO_ARCO`.
- `archery_characters_v2.js`: sincronização das poses do jogador.
- `archery_river_targets.js`: destaque e rastro da flecha do jogador.
- `index.html`: carregamento do módulo e atualização de versões dos scripts alterados.
- Este documento.

IA do Mestre, distribuição dos alvos, placar, explosivos, pássaros, dourados, duração da partida, medalhas, economia, Overworld e outros minigames não foram reescritos. Uma comparação com a cópia anterior confirmou que o conteúdo de `script.js` fora da seção da Arquearia permaneceu idêntico, exceto a guarda de teclado exclusiva dessa cena.

## Método de validação

Chrome real em modo headless, perfil/save isolados e cache desativado. Foram enviados eventos reais de teclado pelo protocolo do navegador, incluindo toque imediato, tecla mantida, repetição automática e `keydown` duplicado. Houve cenários controlados, inspeção visual das capturas, oito partidas aceleradas pela mesma simulação e partidas completas de 55 segundos em tempo real com o driver de movimento/disparo de QA. Não é uma alegação de playtest humano manual.

O XAMPP estava indisponível nesta sessão. Os mesmos arquivos do projeto foram servidos temporariamente em `127.0.0.1:8784`; o save do usuário não foi usado nem modificado.

A bateria cobre: entrada pelo NPC; tutorial sem tiro por tecla segurada; toque sem carregamento; poses efetivamente desenhadas; antirrepetição; novo toque após soltar; cooldown e buffer; movimento durante preparação; mira sempre para cima; primeiro contato independente da ordem dos alvos; alvo já consumido; colisão em alta velocidade; explosivo e combo; mosca dourada; voo completo de erro; resultado sem fechamento acidental; retorno; reinício; oito sementes; partida completa; especiais; bounds; FPS; rede e console.

Um cenário inicial de teste marcava apenas `active=false` em um alvo, mas a atualização normal de visibilidade reativava corretamente um disco não atingido ainda presente no campo. O cenário foi corrigido para representar um alvo já consumido (`hit=true`). A regra de jogo não foi modificada para acomodar o teste.

Evidências na pasta de QA desta conversa: `archery_player_qa_report.json`, `archery_player_first_collision.png`, `archery_player_arrow_trail.png` e `archery_player_live_match.png`.

## Resultado final

**26/26 verificações aprovadas**, sem requisições 404, erros de rede, TypeError, ReferenceError ou warnings na sessão testada.

O toque imediato criou a flecha exatamente 9 atualizações após a aceitação. Segurar Espaço por mais de um segundo, inclusive com eventos repetidos, criou somente uma flecha. O ensaio de cadência produziu solturas nos ticks 9, 39 e 69: intervalo de 30 ticks. O buffer guardou somente uma preparação e nenhum tiro foi criado sem novo input.

O teste de alvos alinhados acertou apenas o disco mais próximo e pagou 46 pontos na mosca. O teste de varredura com velocidade artificialmente alta manteve esse resultado. Explosivo com dois vizinhos pagou 101 pontos ao todo, com três alvos e bônus de combo; dourado na mosca pagou 245. Sem alvo, a ponta atravessou o campo em linha reta e a flecha só foi removida depois de passar além de Y=-48, com o rastro já fora da tela.

As oito sementes aceleradas terminaram com vitória do driver de QA: 2.049–2.243 pontos para Zorp e 374–772 para o Mestre. Isso verifica a viabilidade do novo ritmo; não representa a dificuldade medida com jogadores humanos.

Na última partida completa em tempo real, Zorp fez 2.163 pontos e o Mestre 643. Zorp soltou 53 flechas e acertou 44 alvos, contando os afetados por explosão. A média medida foi **60,11 FPS**; houve amostras pontuais inferiores, portanto esse valor não promete 60 FPS constantes em todo hardware. Pássaros, explosivos, dourados, limites físicos, retorno à ilha e reinício permaneceram funcionais.
