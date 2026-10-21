# Mestre Arqueiro 2.0 — observação, decisão e disparo

## Integração

A IA foi separada em `archery_master_ai.js`. `script.js` continua responsável por criar flechas, executar colisões, conceder pontos e encerrar a partida. Não houve mudança de controles, física das flechas do jogador, duração da rodada, alvos, medalhas ou outros minigames.

Foi removido o sistema antigo de erro deliberado por sorteio e a recalculação da posição real do alvo no instante do disparo. A IA nova não usa `Math.random`, não percorre a trajetória registrada dos alvos e não lê suas posições futuras ou a fila de spawns.

## Tempos e precisão

Todos os tempos usam a atualização de 60 Hz já existente na Arquearia:

- Amostragem visual a cada 6 atualizações: 0,10 s.
- `reactionDelay`: 18 atualizações, 0,30 s. Só amostras com essa idade mínima podem influenciar decisões e mira.
- `decisionTime`: 8 atualizações, aproximadamente 0,13 s.
- `accuracy`: 0,90. Controla quantização, confiança no pequeno avanço linear e dispersão limitada associada ao movimento; não é um sorteio de 90% de acerto.
- `READY`: 8 atualizações.
- `RAISE_BOW`: pelo menos 10, podendo aguardar alinhamento.
- `DRAW_BOWSTRING`: 10.
- `AIM`: 8.
- `RELEASE_SHOT`: 8.
- `RECOVERY`: 12.
- Cooldown: 30 atualizações, contando a partir da soltura. Ele ocorre junto da soltura/recuperação; a próxima decisão e preparação ainda precisam acontecer.

No caso controlado de alvo novo, parado e já à frente, a percepção começou na atualização 19 e o primeiro disparo ocorreu na 63, cerca de 1,05 s depois da entrada. Disparos seguintes no mesmo caso ficaram separados por 74 atualizações (~1,23 s). Não há soltura instantânea.

## O que o Mestre pode perceber

Cada amostra copia somente posições visíveis, raio, valor e identificação de alvo comum, aéreo, dourado ou explosivo. Velocidade e mudança de direção são estimadas pela diferença entre amostras antigas. Não há consulta a `route`, `progress`, velocidade real registrada, RNG do level ou eventos futuros.

A posição de Zorp e a presença de suas flechas visíveis também são amostradas com atraso. Isso permite preferir oportunidades menos disputadas quando o jogador está atirando, sem ler teclas ou antecipar suas decisões. Sem oposição ativa, esse fator não penaliza alvos próximos de Zorp parado.

A memória é limitada por alvo, com descarte de amostras antigas e objetos desaparecidos. Alvos atingidos por Zorp só deixam de ser percebidos depois do atraso de reação. O Mestre pode perder essa oportunidade durante a preparação.

## Seleção

O valor de cada tentativa considera:

- recompensa do alvo;
- tamanho, velocidade e mudança de direção observados;
- distância lateral para se posicionar;
- tempo aproximado até sair do campo, estimado pela posição e velocidade observadas;
- duração necessária da preparação e voo da flecha;
- confiança estimada de acerto;
- disputa visível com Zorp.

Alvos grandes, lentos e próximos têm maior confiança. Alvos pequenos, rápidos e aéreos são mais difíceis. O alto valor do dourado aumenta sua prioridade, mas não concede precisão perfeita nem elimina os tempos de preparação.

Para explosivos, o Mestre soma o valor dos discos próximos nas amostras disponíveis. Não simula a correnteza futura nem resolve antecipadamente toda a cadeia. A detonação real continua usando o mesmo sistema de área e pontuação do jogador.

## Mira e erros

Durante READY e RAISE o Mestre pode ajustar sua posição dentro dos limites da área seca. A partir de DRAW os pés ficam fixos até terminar a soltura e recuperação.

A previsão é apenas linear, por até 44 atualizações a partir da amostra. O ponto é quantizado e recebe uma pequena variação determinística proporcional à velocidade e à mudança de direção observadas. Em um alvo parado, essa variação permanece muito menor que o disco e não cria um erro deliberado.

Ao entrar em AIM, o ponto é travado. O trecho final de mira e a criação da flecha não consultam novamente o alvo real. A flecha recebe uma velocidade inicial e mantém sua trajetória; não há homing.

Em oportunidades valiosas ou aéreas, o Mestre aceita uma pequena margem de risco lateral em vez de esperar alinhamento perfeito até o alvo desaparecer. O limite lateral real da flecha continua valendo. Isso permite erros por posicionamento insuficiente, aceleração/curva, reação tardia e fim da janela de tiro. Tentativas sem alcance razoável podem ser abandonadas.

## Apresentação

Os sprites reais do `mestre_arquearia2.0.png`, recortados no atlas existente, seguem diretamente os estados da simulação:

`READY → RAISE_BOW → DRAW_BOWSTRING → AIM → RELEASE_SHOT → RECOVERY`

O frame da soltura coincide com a criação da flecha. A reação de acerto não interrompe a preparação de uma nova flecha. Foi mantida a orientação de costas/para cima, sem espelhar o personagem ou fazê-lo mirar lateralmente.

Há um pequeno brilho na ponta do arco durante AIM. As flechas do Mestre têm detalhe vermelho nas penas, e seus pontos aparecem com `MESTRE` e cor distinta. Os textos de impacto são limitados à largura da tela para evitar cortes. Os sprites, escala e anchor dos pés continuam os mesmos.

## Arquivos desta etapa

- `archery_master_ai.js`: sensor, avaliação, movimento, estados, mira travada e diagnóstico.
- `script.js`: integração e remoção da IA anterior, dentro da seção da Arquearia.
- `archery_characters_v2.js`: sincronização das poses do Mestre.
- `archery_river_targets.js`: identificação visual da flecha/pontuação e limites do texto de impacto.
- `index.html`: módulo e versões dos scripts modificados.
- Este documento.

## QA e limites da medição

Chrome real em modo headless, perfil/save isolados e cache desativado. Houve cenários controlados no navegador, inspeção das capturas, amostras de balanceamento aceleradas pela mesma simulação e partida completa em tempo real usando o driver de movimento/disparo de QA. Não se trata de playtest humano manual.

O XAMPP estava indisponível; os mesmos arquivos foram servidos temporariamente em `127.0.0.1:8783`. Nenhum save ou configuração do usuário foi alterado.

Cobertura: atraso de percepção; etapas e tempos; cooldown; proibição de acesso aos dados reais de trajetória; mira imutável após o lock; comparação entre alvo constante e aceleração suave; confiança por tipo; prioridade do dourado; leitura local de combos; poses efetivamente desenhadas; acerto em alvo parado; explosivo com três alvos e bônus; autoria dos pontos; oito sementes contra execução rápida; quatro sementes sem oposição; partida completa; bounds, especiais, FPS, retorno, reinício, rede e console.

O ensaio de precisão comparou duas trajetórias contínuas: uma manteve 0,6 pixel por atualização; a outra acelerou gradualmente para 2,35 após o lock. A mesma mira acertou o primeiro alvo e errou o segundo usando a colisão real, sem teleporte ou sorteio.

Durante a calibração, os tempos iniciais foram reduzidos para evitar que a preparação consumisse quase toda a janela dos alvos rápidos. A avaliação da disputa e a margem de risco dos especiais também foram ajustadas. Uma contagem de vizinhos da bateria foi corrigida porque o próprio cenário de teste incluía um terceiro alvo próximo; não era uma leitura indevida da IA.

Evidências: `archery_master_qa_report.json` e capturas `archery_master_ready.png`, `archery_master_raise_bow.png`, `archery_master_draw_bowstring.png`, `archery_master_aim.png`, `archery_master_release_shot.png`, `archery_master_scoring.png` e `archery_master_live_match.png` na pasta de QA desta conversa.

Resultado final: **27/27 verificações aprovadas**. Nas oito sementes com o driver rápido de QA, o jogador venceu 8/8; o Mestre fez entre 291 e 743 pontos, com 5–10 alvos acertados. Nas quatro amostras sem oposição, fez entre 1.588 e 1.875 pontos, com 27–32 disparos e 30–36 alvos acertados, incluindo efeitos de explosão. Esse contraste reflete a disputa pelos mesmos alvos durante a preparação; a IA não muda sua precisão em função do placar.

Na partida final em tempo real, Zorp fez 2.081 e o Mestre 666, com 23 disparos e oito alvos acertados pelo Mestre. Média: 60,17 FPS. Todos os locks auditados usaram amostras com pelo menos 18 atualizações de atraso; a leitura do adversário também respeitou esse limite. Explosivo com três alvos pagou 101 ao Mestre, e o dourado parado na mosca pagou 245. Não houve 404, TypeError, ReferenceError ou warnings. Retorno e reinício aprovados.

O teste de mestre sem oposição não exige errar em toda rodada: alvos fáceis podem ser acertados consistentemente. A limitação física foi comprovada pelo ensaio de aceleração após o lock e pelos erros na disputa real, sem introduzir um sorteio para forçar falhas.

A comparação binária com a cópia anterior confirmou que `script.js` permaneceu idêntico antes e depois da seção da Arquearia. Outros minigames e sistemas de Overworld não foram editados.
