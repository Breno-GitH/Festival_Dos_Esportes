# Primeira chegada de Ravok — quarta medalha

## Gatilho e fluxo

O registro oficial de medalhas agora informa, no evento `festival:medal-unlocked`, o total anterior, o total atual e se a gravação das medalhas foi concluída. A chegada só é enfileirada quando os três critérios são verdadeiros: `previousCount === 3`, `total === 4` e `persisted === true`.

A premiação e a celebração próprias da modalidade continuam até a tela de resultado. Nela, há uma pausa de 2,4 segundos antes do início automático. Espaço/Enter podem confirmar antes, após uma proteção inicial de 700 ms; a tecla que já estava segurada não serve como nova confirmação. O mesmo tratamento cobre Ping-Pong, Basquete, Maratona, Skate, Arquearia, Escalada, Boxe e Surf.

Não é liberado um quadro de controle normal do Overworld entre o resultado e a chegada. Se uma modalidade já tiver retornado à ilha, o interlúdio intercepta esse retorno antes do movimento e antes de desenhar a ilha.

## Sequência implementada

1. **Fade da vitória — 1 s:** usa a imagem real da tela de resultado como origem.
2. **Preto/silêncio — 0,65 s.**
3. **Espaço — 4,8 s:** estrelas em profundidade, Terra com atmosfera e uma nave distante que se aproxima.
4. **Passagem próxima/reentrada — 3,2 s:** a nave cresce, passa diante da câmera e segue para a atmosfera, com brilho e partículas discretas.
5. **Céu — 3 s:** nuvens revelam o arquipélago.
6. **Ilha dos Campeões — 3,5 s:** vista estilizada das conexões reais; a nave segue para a ilha montanhosa a noroeste da ilha central.
7. **Pouso — 4,6 s:** aproximação da clareira existente, sombra, motores, poeira, pequenos fragmentos e vibração curta. Usa o cenário real da Ilha da Escalada.
8. **Porta — 1,8 s:** abertura e breve espera.
9. **Saída de K7 — 3 s:** o sprite oficial recortado sai da porta, assume sua posição e faz um scan visual discreto.
10. **Conversa:** três falas, avançadas individualmente com Espaço.
11. **Recuo — 2,2 s:** a porta fecha parcialmente e a câmera se afasta; K7 permanece fora.
12. **Fade final — 1,1 s:** conclusão e retorno à ilha de origem, na posição segura preservada antes do minigame.

A animação soma **28,85 segundos**, sem contar a leitura das falas. A execução final completa observada no navegador durou aproximadamente **32 segundos** com leitura rápida.

## Falas

- **Ravok:** “Então é verdade...”
- **K7:** “QUATRO ASSINATURAS CONFIRMADAS.”
- **Ravok:** “Vamos ver até onde ele consegue chegar.”

Ravok não sai da nave. Sua presença nessa cena é representada apenas por dois pontos vermelhos discretos na sombra da porta. O sprite exterior dele continua condicionado às oito medalhas.

## Direção visual e controles

A nave utiliza o mesmo desenho em Canvas da nave estacionada, com chapas escuras, contorno angular e luzes vermelhas/roxas. Durante o voo, os apoios ficam recolhidos; durante o pouso eles aparecem. O desenho mantém relação visual com a tecnologia de Zorpzin, com uma presença mais pesada na passagem próxima.

K7 reutiliza o recorte frontal e a máscara de transparência já aprovados de `K7.png`, com escala uniforme, anchor nos pés e smoothing desligado. A sequência não introduz imagens externas.

Movimento, interações e comandos das modalidades ficam bloqueados durante o interlúdio. Espaço só avança as falas. Enter, Esc, movimento e Espaço nas cenas temporizadas não pulam os eventos essenciais. Repetição automática e teclas mantidas pressionadas são filtradas.

O tempo é medido em segundos, com deltaTime limitado e pausa da animação quando a página está oculta. Fundos, recortes e desenhos da nave ficam em cache.

## Save e presença no mapa

O estado continua na chave `zorp_ravok_event`, agora com versão 4:

- `ravokArrivalPending`: quarta medalha confirmada; interlúdio ainda não concluído.
- `ravokArrivalSeen`: marcado somente depois do fade final.
- Demais campos do encontro: `arrived`, `metK7`, `metRavok`, `k7Line` e `preludeSeen`.

Enquanto a chegada está pendente, a nave e os NPCs permanentes do evento ficam ocultos no mapa; a cutscene os apresenta por sua própria camada de desenho. Ao terminar, nave, marcas de pouso e K7 ficam disponíveis na clareira.

Depois de concluída, a chegada não repete ao carregar, revisitar a ilha ou conquistar outra medalha. Se a página fechar antes do fim, o save continua pendente e retoma a apresentação quando o jogador voltar ao Overworld. Saves antigos que já tinham quatro ou mais medalhas não recebem uma cutscene retroativa apenas por carregar.

K7 conserva as respostas vagas anteriores às oito medalhas: “Não me atrapalhe.”, “Ainda não é hora.”, “Volte para o nosso planeta.” e “Você não vai querer ver o que vem.”

## QA

Validação em Chrome real, em modo headless e perfil isolado. Os estados de progresso e os placares foram preparados para QA. Na sequência principal, a função real de conclusão da Arquearia confirmou a vitória e entregou a quarta medalha; não foram jogadas oito partidas completas.

Checklist solicitado:

1. **Três medalhas:** sem cutscene, nave ou K7 — aprovado.
2. **Quarta conquistada:** medalha presente no save oficial — aprovado.
3. **Início:** testados confirmação por Espaço e início automático após o resultado — aprovado.
4. **Pouso:** aproximação, contato, poeira e sombra observados — aprovado.
5. **K7:** saída e scan observados — aprovado.
6. **Ravok:** nenhuma saída; apenas a indicação dentro da nave — aprovado.
7. **Retorno:** volta à Ilha da Arquearia após o teste principal — aprovado.
8. **Presença permanente:** nave e K7 na Ilha da Escalada; acesso percorrido com teclado e conversa por E — aprovado.
9. **Reload:** estado concluído e presença mantidos — aprovado.
10. **Repetição:** reload e quinta medalha não reiniciam a cena — aprovado.

Verificações adicionais:

- Todas as doze etapas percorridas na execução automática completa.
- Tecla segurada desde o minigame não confirma a vitória; Espaço mantido na saída de K7 não avança sozinho a primeira fala.
- Coordenadas do jogador e frame da Arquearia permanecem congelados durante a cena; os inputs ficam limpos na saída.
- As três falas foram lidas e avançadas por tecla; a flag permaneceu falsa inclusive durante o fade final.
- Com oito medalhas, Ravok continua sendo revelado normalmente pelo evento existente.
- Oito adaptadores de resultado verificados no navegador, com estados preparados: nenhum reiniciou a partida ao confirmar a chegada, e todos registraram a ilha de retorno correta e uma posição livre de colisão.
- **22 testes automatizados aprovados**, incluindo transição salva, falha de gravação, proteção de input, início automático, sequência completa, save/load e compatibilidade com saves antigos.
- **Zero 404, falhas de requisição, TypeError, ReferenceError ou outros erros de execução/console** na execução principal. Os oito adaptadores também passaram sem erros de execução ou HTTP.

Na revisão visual foi encontrada e corrigida uma emenda de cor no mar quando a câmera mostrava área além da imagem da ilha. A cor de extensão agora é exatamente a usada pelo Overworld, e a sequência completa foi repetida depois da correção.

Na revisão final dos destinos, o ponto genérico de cancelamento do briefing da Escalada foi identificado sobre a base da montanha. A chegada passou a preservar a posição real do jogador antes da modalidade, em vez de reutilizar aquele ponto. Os oito retornos foram novamente conferidos contra os colisores reais das ilhas.

## Arquivos

Produção:

- `ravok_arrival.js`: controlador, cenas em Canvas, falas, áudio procedural opcional e proteção de input.
- `ravok_event.js`: flags de chegada no save, visibilidade durante o pouso e desenho compartilhado da nave.
- `medalhas_registry.js`: confirmação de gravação e totais no evento de medalha.
- `script.js`: integração com resultado, atualização, desenho e retorno às ilhas.
- `index.html`: carregamento e versões dos scripts.

Testes e documentação:

- `ravok_arrival.test.cjs`.
- `docs/ravok_arrival.md`.
- `docs/qa/ravok/browser_arrival.cjs`, `browser-arrival-results.json` e capturas `arrival-*.png`.
- `docs/qa/ravok/browser_arrival_gateways.cjs` e `browser-arrival-gateways.json`.

## Evidências

- [Resultado e quarta medalha pendente](qa/ravok/arrival-victory-pending.png)
- [Espaço](qa/ravok/arrival-space.png)
- [Passagem próxima da nave](qa/ravok/arrival-flyby.png)
- [Arquipélago](qa/ravok/arrival-archipelago.png)
- [Pouso](qa/ravok/arrival-landing.png)
- [K7 fora da nave](qa/ravok/arrival-k7_exit.png)
- [Primeira fala](qa/ravok/arrival-dialogue-0.png)
- [Última fala](qa/ravok/arrival-dialogue-2.png)
- [K7 permanente e interação](qa/ravok/arrival-k7-permanent.png)
- [Resultados da sequência completa](qa/ravok/browser-arrival-results.json)
- [Resultados dos oito adaptadores](qa/ravok/browser-arrival-gateways.json)
