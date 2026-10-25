# Ping-Pong — feedback de rally e especiais

Passe de feedback de 24/10/2026 sobre a arena existente. Nenhuma função de física, controles, pontuação, IA ou spawn foi alterada.

## Bola, altura e velocidade

A bola mantém raio físico e tamanho-base visual. Núcleo branco, highlight de dois pixels e contorno escuro continuam priorizando a leitura.

A sombra responde à altura real `z`: baixa, próxima e definida; alta, menor, mais discreta e com pequeno deslocamento da projeção. No quique, a projeção converge ao contato. Fora da mesa, a sombra considera o desnível visual até o piso.

O feedback usa velocidade física e velocidade de ataque existente:

- Baixa: bola limpa.
- Média: dois pequenos pontos de rastro.
- Alta: rastro curto e duas linhas discretas atrás da trajetória.

O comprimento do rastro está limitado a 14 pixels do campo. A cor principal das bolas permanece comum; o especial usa apenas acento ciano. A tangente física determina a orientação das marcas, inclusive depois da Raquetada Global.

## Quique e rebatidas

O observador identifica o incremento real de `tableContacts`, sem repetir o impacto nos quadros seguintes. Cada quique recebe um micro squash visual, impacto de aproximadamente 130 ms e uma a três partículas. O squash não altera raio, posição ou colisão.

Rebatidas reais são reconhecidas pela mudança de `shotId`. Criam arco aberto/flash curto na raquete e pequenas linhas direcionais. Somente contatos fortes recebem micro shake, de até um pixel. Os sons originais de mesa, raquete e Raquetada Global continuam nos eventos físicos originais. Contatos muito fortes podem receber um acento curto de áudio por código.

O hitstop solicitado é **retenção de renderização**: 18 ms para uma rebatida comum e 28 ms para a Raquetada Global. A imagem do contato é capturada e mantida brevemente; física, IA, inputs e cronômetros continuam normalmente. Contatos comuns possuem espaçamento mínimo de 100 ms para evitar congelamento visual em sequência. Um ponto real cancela imediatamente qualquer retenção pendente.

## Rally, torcida e clímax

A torcida existente conserva as mesmas 48 identidades. A quantidade de gestos e atenção aumenta nos patamares de **5, 10 e 15 trocas**. Iluminação discreta acompanha a progressão. Aos 15 há um acento sonoro leve de tensão.

Nos últimos cinco pontos da meta, com diferença de até três pontos, a arena assume reação de clímax. Pontos nessa situação recebem um acento sonoro um pouco maior. Nenhum atributo de jogador ou bola é alterado.

## Multiball do Mestre

O carregamento existente ganhou telegraph concentrado na raquete, pequenos traços de preparação e aviso `MULTIBALL...`. Depois aparece `MULTIBALL xN`.

Foram mantidos os **24 passos de preparação** e a emissão original em intervalos de **5 a 10 passos**. O renderizador não cria bolas. Cada emissão é percebida visualmente na raquete; cada bola possui sombra, marcador de quique e trajetória próprios, com a mesma família de cores.

No teste de seis bolas, as cinco extras apareceram nos passos **25, 35, 43, 49 e 59**, confirmando a emissão escalonada.

## Raquetada Global do Zorp

Uma ativação gera um único flash/arco na raquete e até duas afterimages discretas do frame HIT original. Todas as bolas participantes mudam para a leitura ciano imediatamente; suas novas tangentes físicas orientam os rastros para a devolução ao Mestre.

Não há explosão radial, pontos antecipados, texto HIT ou KO. O som único original foi preservado. Depois da retenção visual de 28 ms, continuam sendo desenhadas as trajetórias físicas normais do especial existente.

## Fadiga do Mestre e ponto

O suor em pixels depende de `masterAI.fatigue` ou `masterAI.struggling` reais. Com fadiga acima de 0,65 e estado RECOVER, o frame existente de finalização pode permanecer por até 60 ms adicionais após uma rebatida real. Movimento, velocidade, recuperação física e decisões não mudam. Não há squash/stretch do personagem nem emoji de suor.

Uma bola realmente marcada como MISSED recebe uma saída visual curta para fora, de 125 ms, a partir do último movimento observado. É uma imagem de saída; o objeto físico parado e a confirmação do ponto permanecem intactos.

`POINT ZORP` ou `POINT MASTER` aparece por **430 ms**, somente depois do aumento real do placar. Não acrescenta pausa à partida; usa a pequena pausa/espera de saque que já existia.

## Limites e preservação da mecânica

Efeitos limitados a 24 contatos, 12 rebatidas, 10 saídas, 48 partículas e dez registros de bola. O fundo permanece em cache e a captura do hitstop reutiliza um único Canvas. Sem blur pesado, dependências ou assets novos. Pixel art e `imageSmoothingEnabled = false` preservados.

Comparação de código: **todo `script.js` fora de `drawPingPongGame` permanece idêntico**. Os três módulos de mecânica permaneceram byte a byte iguais:

- `pingpong_ball.js`.
- `pingpong_master_ai.js`.
- `pingpong_multiball.js`.

## QA

- **15 testes novos de feedback aprovados:** eventos reais, ausência de mutação/RNG, deduplicação de quique, retenção exclusivamente visual, global sem ponto, emissão, saída, fadiga, reset e limites.
- **7 testes de apresentação aprovados**, incluindo **18.000 passos** com e sem renderização: estado físico e uso de aleatoriedade idênticos em todos os passos, com ambos os especiais.
- Expiração por tempo validada a **30, 60 e 144 FPS**.
- Chrome real, perfil/save isolados: **14 cenários aprovados**, incluindo os três patamares de rally, quique, raquetada, telegraph, emissão escalonada, dez bolas, Raquetada Global sem pontuação, ponto confirmado, fadiga e clímax.
- Partida automatizada concluída **8–50**, com retorno à ilha. O trecho final do QA usou oito passos físicos originais por atualização para concluir o fluxo; essa aceleração não existe no jogo entregue.
- Nessa partida, o observador registrou 187 quiques, 103 rebatidas, quatro globais, 17 emissões e 58 pontos reais, correspondentes ao placar final.
- Aproximadamente **60 FPS** em amostras de 180 frames durante o jogo e com dez bolas.
- Teste final do navegador: **zero 404, TypeError, ReferenceError, exceção ou falha de rede**.

## Arquivos alterados

- `pingpong_feedback.js`: observador e efeitos exclusivamente visuais/sonoros.
- `pingpong_presentation.js`: sombras por altura, rastros graduais, micro squash e reações da arena.
- `script.js`: integração somente no renderizador.
- `index.html`: inclusão do módulo e versões de cache.
- `pingpong_feedback.test.cjs`: nova bateria de regressão.
- `pingpong_presentation.test.cjs`: carrega o observador para validar o renderizador integrado.

Evidências: capturas `feedback-*.png`, `browser-qa.json`, resultados dos testes e `mechanics-integrity.json`.

## Conferência após integração

Na pasta final, passaram os 46 testes: 15 de feedback, sete de apresentação e 24 do briefing compartilhado. O navegador foi repetido contra o projeto integrado: 12 cenários de feedback, 60 FPS com dez bolas e zero falha de carregamento ou exceção. Hashes finais conferidos; os três módulos de mecânica permanecem byte a byte iguais aos anteriores.
