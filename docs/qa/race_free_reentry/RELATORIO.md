# Corrida / Maratona — retorno livre da grama à pista

Entrega: 28/10/2026. Projeto: `C:/xampp/htdocs/2025/Festival_Dos_Esportes`.

## Causa e correção

O antigo `RaceLapSystem.corridor()` criava `runner.routeRecovery` quando qualquer trecho do movimento saía da pista. Esse estado bloqueava a validação de progresso até o corredor voltar perto de uma posição antiga. O cenário desenhava uma marca amarela e instruía “RETORNE À MARCA AMARELA NA PISTA”; as IAs também recebiam ordem de voltar àquela posição.

Foram removidos o estado de recuperação, a gravação da posição antiga, o bloqueio, o marcador, a mensagem e as dependências desse alvo na IA/autopiloto. Não há substituição por teleporte nem outro ponto obrigatório.

Zorp pode cruzar ambas as bordas em qualquer região navegável. Movimento continua baseado em posição e velocidade. As IAs fora da pista calculam a borda próxima a partir de sua posição atual e retornam usando a mesma física de grama, sem alterar coordenadas instantaneamente.

## Superfícies

As penalidades naturais já existentes foram preservadas:

- Grama interna: velocidade-alvo de 42% da velocidade máxima.
- Região externa: velocidade-alvo de 55%.
- Resposta de movimento fora da pista: 5,0, inferior à resposta normal de 7,2 do Zorp.
- Desaceleração ao soltar o movimento: coeficiente 3,6 fora da pista, contra 1,8 na pista.

Ao retornar, a interpolação de velocidade existente retoma gradualmente o comportamento da pista. Nenhuma tecla, checkpoint ou evento especial libera essa retomada. O HUD mostra somente “FORA DA PISTA” enquanto necessário.

## Checkpoints e três voltas

Continuam obrigatórios CP1 → CP2 → CP3 → linha de chegada, na direção correta, em cada uma das três voltas. A passagem inicial pela largada não conta volta concluída. Zorp e os sete adversários usam o mesmo validador.

A detecção continua usando o segmento de deslocamento para calcular o contato físico com a linha. O contato precisa ocorrer sobre a pista, dentro da abertura do checkpoint. Cruzar o plano na grama não conta; saltos descontínuos de posição também são rejeitados. Se o corredor retorna à pista e cruza validamente um checkpoint dentro do mesmo quadro, o contato é aceito normalmente.

Sair da pista não apaga checkpoints já obtidos nem concede os que faltam. Cortar o infield, retornar em outra borda e cruzar a chegada sem a sequência necessária não concede volta. Uma sequência válida posterior volta a contar sem procurar a posição antiga.

## Testes

**53/53 testes automatizados passaram**, incluindo 36 testes da corrida/retorno livre e 17 regressões de NPCs/missões. Evidência: `integrated-tests.tap`.

Cobertura específica:

- Saída interna na curva e retorno pela mesma borda.
- Saída interna e retorno mais adiante.
- Saída externa e retorno livre.
- Retas e ambas as curvas para os oito corredores.
- Perda de velocidade na grama e retomada gradual na pista.
- Corte de metade do oval e chegada sem checkpoints: zero voltas.
- Checkpoint atravessado na pista durante o quadro de retorno: aceito.
- Plano de checkpoint atravessado na grama: rejeitado.
- Sete IAs retornando pelas duas bordas sem saltos de posição.
- HUD sem marcador nem instrução de recuperação.
- Ordem, direção, passagem inicial, classificação e três voltas preservadas.
- Corridas completas consistentes com atualizações de 30, 60 e 144 FPS.
- Eventos do Mestre, obstáculos e condição de medalha preservados.

**10 verificações no navegador passaram**, primeiro na preparação e novamente nos arquivos integrados:

1. Teclado real: curva interna → grama → mesma borda, sem marca ou evento de liberação.
2. Retorno alguns metros adiante na curva.
3. Borda externa atravessável nos dois sentidos.
4. Retorno livre também em reta.
5. Corte físico do infield seguido da linha real de chegada: volta rejeitada por checkpoints faltantes.
6. Circuito válido posterior: exatamente uma volta registrada.
7. Sete IAs do runtime retornando fisicamente por ambas as bordas, sem teleporte.
8. Oito corredores completando três voltas, nove checkpoints ordenados e três passagens válidas de chegada.
9. Escape continua devolvendo o jogador à ilha da Corrida.
10. ZERO 404, TypeError, ReferenceError, falha de carregamento ou erro de execução.

O navegador usou perfil e origem isolados, sem acessar o save do usuário. Nos cenários direcionados de borda, obstáculos e outros corredores foram retirados apenas da fixture de teste, para isolar o movimento. A corrida completa foi reiniciada com os elementos originais; o autopiloto de QA usa a física de 60 Hz. Na auditoria dos oito finalistas, o fechamento do pódio foi adiado apenas na fixture para permitir a chegada de todos. O fluxo normal de resultado/medalha foi coberto nos testes automatizados existentes.

## Arquivos

- `race_lap_system.js`: remove recuperação obrigatória; mantém contatos físicos e ordem dos checkpoints.
- `corrida_maratona.js`: IA retorna à borda próxima; remove referências ao alvo e seu desenho/diagnóstico.
- `race_event_presentation.js`: remove marcador e troca a instrução por “FORA DA PISTA”.
- `index.html`: versões de cache dos três scripts atualizadas.
- `race_event.test.cjs`: expectativas antigas de recuperação substituídas pela regra de retorno livre.
- `race_reentry.test.cjs`: onze testes novos específicos.

Não foram alterados saves, preços, itens, jukebox, outras modalidades ou assets. Física de superfície, eventos do Mestre e missões permaneceram nos arquivos originais; seus hashes estão nas evidências. Cópias anteriores dos arquivos envolvidos ficam em `before/`.
