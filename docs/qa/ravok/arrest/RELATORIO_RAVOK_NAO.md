# Ravok = NÃO — prisão e continuidade da campanha

Implementado e validado em 22/10/2026.

## Fluxo implementado

1. Escolher NÃO inicia o diálogo: “Não.” / “Você não entendeu.” / “Entendi perfeitamente.”
2. Zorp confronta o motivo do retorno de Ravok. Ravok reage furioso e se aproxima da rampa da nave. K7 recomenda partida imediata.
3. Zorp usa o comunicador. “TRANSMITINDO COORDENADAS...” acompanha uma transmissão curta.
4. A câmera sobe, três luzes aparecem no céu e se revelam como naves oficiais. Os cascos claros, luzes ciano e brasões as distinguem da nave de Ravok.
5. As autoridades cercam a clareira. Os motores de Ravok tentam iniciar. K7 informa: “ROTA DE FUGA BLOQUEADA.”
6. Um pulso tecnológico desliga as luzes, cabine e motores da nave, sem destruí-la.
7. Um oficial aparece por holograma, identifica Ravok Noxaris e lê integralmente a acusação pedida.
8. Ravok diz que Zorp poderia ser lembrado para sempre. Zorp responde: “Eu já tenho oito coisas para lembrar desta viagem.” Os oito ícones oficiais das medalhas aparecem brevemente.
9. K7 encerra o protocolo e entra na nave desativada. Ravok é contido e levado por um campo de custódia. As autoridades retiram a nave e seus equipamentos como evidência.
10. As naves desaparecem no céu; a câmera volta à projeção normal. Após um fade curto, Zorp recebe o controle na ilha da Escalada, na mesma posição lógica de onde iniciou a conversa.

São 30 tomadas, com 15 falas avançadas por novos toques de Espaço. Os trechos essenciais têm duração própria e não são pulados pela tecla. Na execução automatizada, com leitura mínima de 0,8 segundo por fala, o percurso durou 46.53 segundos. O tempo real varia conforme a leitura do jogador.

## Save e continuidade

- Chave existente: `zorp_ravok_event`, versão 7.
- `ravokChoice` permanece `"refuse"`.
- `ravokArrested = true` é gravado somente após a retirada das autoridades e o fade final, antes de liberar o controle.
- `ravokEndingCompleted` e `ravokBadEndingSeen` continuam falsos nesta rota.
- A recusa não cria ending card, créditos ou retorno ao menu. O ramo de aceitação mantém sua própria ending card e o encerramento da campanha.
- Falha de armazenamento mantém o evento bloqueado para tentar novamente, com rollback da flag de prisão; não há falsa conclusão.
- Após reload, a flag impede novos diálogos, reaparição e repetição da cutscene. Saves antigos que tinham concluído a antiga card de recusa são tratados como campanha aberta e encaminhados à nova prisão uma vez.

## Consequência na ilha

Ravok, K7 e a nave são removidos de desenho, prompts e colisões. Restam discretas marcas de pouso, grama achatada e pequenas pedras locais; a sombra da nave também é removida. Os quatro NPCs normais da Escalada continuam presentes. A geóloga pode ser o NPC focado ao caminhar pela antiga clareira, conforme sua área de interação já existente.

A apresentação usa os PNGs frontais já integrados, com escala uniforme e o mesmo renderizador de NPCs. As naves oficiais e o holograma são Canvas, sem novos PNGs. O casco oficial é rasterizado uma vez e reutilizado. Smoothing permanece desligado.

## QA real no navegador

Chrome headless real, eventos de teclado via CDP, servidor e perfil isolados. O relógio das cenas não foi acelerado. Oito medalhas, conversa anterior concluída e 100 moedas foram preparados como fixtures; este QA não consistiu em conquistar as oito medalhas novamente. O save do endereço habitual do jogador não foi alterado.

Verificado:

- NÃO escolhido pelo menu existente, sem segunda confirmação de aceitação.
- Movimento bloqueado na conversa e nas tomadas; teclas seguradas não pulam falas.
- Todas as 15 falas, incluindo a acusação completa, dentro dos limites do painel.
- Transmissão, chegada, cerco, desativação, holograma, oito medalhas, custódia e retirada da nave.
- Retorno à Escalada sem card nem menu, com posição preservada e movimento real restaurado.
- Medalhas e saldo preservados durante a prisão.
- Flag persistente após reload; nave e ambos os NPCs ausentes; colisores e prompts do evento removidos.
- Pelo E da nave central, despedida e confirmação de embarque: **o final padrão iniciou em `FINAL_CUTSCENE`**, com `EndingCinematic.active = true`.
- Pelo E do Capitão, oferta e pagamento normais: **Férias Merecidas iniciou em `FERIAS_MERECIDAS`**. A exigência existente de oito medalhas e 100 moedas foi mantida.
- Regressão completa do ramo SIM até sua card, persistência e menu, após a atualização do controlador compartilhado.
- **33/33 testes locais aprovados**, incluindo chegada da quarta medalha, escolhas, prisão, reload, falhas de save e aceitação.
- **Zero erros de console/execução, zero HTTP 404 ou outras respostas HTTP de erro e zero falhas de carregamento**, nos percursos testados. Inclui zero TypeError e ReferenceError.

Performance medida na recusa: média **60.02 FPS**, 2793 frames; mediana 16.70 ms e percentil 95 16.70 ms. Medição local deste ambiente, sem garantia de desempenho igual em outros dispositivos.

## Arquivos alterados

- `ravok_arrest.js` — novo filme de prisão, falas, autoridades, holograma, efeitos, retirada e retorno visual.
- `ravok_outcome.js` — separa o evento de recusa do final de aceitação, coordena falas e gravação e retorna ao Overworld.
- `ravok_event.js` — flag, migração, remoção dos NPCs/nave/colisões e marcas residuais.
- `script.js` — captura da clareira limpa e callback de retorno à Escalada.
- `index.html` — carregamento e versões de cache.
- `ravok_event.test.cjs` e `ravok_outcome.test.cjs` — cobertura atualizada.

## Evidências

- `browser_arrest.cjs` e `browser-arrest-results.json` — percurso e resultados de prisão, reload, controle e acesso aos finais.
- `browser_accept_regression.cjs` e `browser-accept-regression-results.json` — regressão do ramo SIM.
- `arrest-encirclement.png`, `arrest-officer_charges.png`, `arrest-medals.png`, `arrest-authorities_depart.png` — cena.
- `arrest-returned-overworld.png`, `arrest-reloaded-clearing.png` — estado persistente da ilha.
- `arrest-standard-ending-started.png`, `arrest-vacation-started.png` — entrada nos finais existentes.

Os scripts de navegador usam servidor local na porta 8813 e depuração do Chrome na porta 9293. Não devem ser executados contra um perfil com o save pessoal do jogador.
