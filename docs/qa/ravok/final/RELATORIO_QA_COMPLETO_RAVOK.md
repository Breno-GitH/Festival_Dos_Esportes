# QA completo — rota secreta de Ravok

Data: 22/10/2026. **Resultado final: 30/30 etapas aprovadas; 34/34 testes locais aprovados.**

Nenhuma cena nova foi adicionada. Foram testados a progressão completa, o encontro de oito medalhas e os dois ramos, com revisão das capturas.

## Método e limites

Chrome real em modo headless, com renderização Canvas e eventos de teclado via CDP. Servidor e perfil isolados; o save do jogador no endereço habitual não foi alterado. Os relógios dos filmes não foram acelerados.

Medalhas foram preparadas pelo registro oficial. A quarta foi confirmada pelo resultado real da Arquearia (`finishArcoRound`), com pontuações preparadas. Não foram jogados oito minigames completos para conquistar as medalhas durante este QA. As duas decisões foram testadas em fixtures independentes; não se trocou uma decisão já persistida na mesma campanha. Os dois finais existentes foram validados até o início, e não assistidos integralmente novamente.

## Resultado de cada etapa

1. **APROVADO — 0–3 medalhas: Ravok não aparece.** Verificados 0, 1, 2 e 3 medalhas: sem nave, K7, Ravok, colisores ou chegada ativa.

2. **APROVADO — Quarta medalha: chegada acontece uma vez.** Vitória preparada na Arquearia chamou finishArcoRound; a quarta medalha foi salva antes da chegada. Reload e quinta/sétima/oitava medalhas não repetiram a cutscene.

3. **APROVADO — Nave e K7 permanecem na Escalada.** Nave desenhada e sólida, K7 acessível por navegação real com teclado; ambos persistem depois de reload.

4. **APROVADO — Ravok continua dentro da nave.** A chegada só mostra K7 saindo. O sprite exterior de Ravok não fica visível com quatro medalhas.

5. **APROVADO — K7 possui apenas diálogos vagos.** Quatro respostas curtas verificadas; nenhuma explica Ravok, armamento ou proposta.

6. **APROVADO — Ravok não oferece proposta antes de oito.** Com quatro e sete medalhas, interagir com Ravok retorna nulo; aproximar-se não inicia saída ou conversa.

7. **APROVADO — Reload mantém a progressão.** Nave e K7 continuam no local, Ravok continua oculto, e a chegada não reinicia.

8. **APROVADO — Com oito medalhas, Ravok sai da nave.** Registradas abertura da porta, posições intermediárias da saída e pausa diante do jogador. Movimento ficou bloqueado.

9. **APROVADO — Conversa completa inicia.** Todas as 29 falas foram percorridas em ordem, incluindo a objeção de Zorp e a lei intergaláctica; textos cabem no painel.

10. **APROVADO — Proposta aparece ao fim da conversa.** Menu AJUDAR RAVOK? aparece depois de PROTOCOLO DISPONÍVEL; a seleção inicial é NÃO, sem gravar decisão antecipada.

11. **APROVADO — Escolhas SIM e NÃO funcionam.** Ambas as escolhas foram acionadas pelos controles reais, em fixtures independentes da mesma versão do jogo.

12. **APROVADO — SIM exige confirmação extra.** Confirmação inicia em NÃO. Cancelar volta à escolha; somente um novo input na opção SIM salva accept.

13. **APROVADO — Duas naves decolam.** Revisados embarques separados, plano das duas decolagens e ambas as naves nas nuvens, atmosfera e espaço.

14. **APROVADO — Arma aparece.** Mecanismo abre na nave de Ravok, carrega e dispara; não há nave ou arma adicional criada por este QA.

15. **APROVADO — Destruição distante e não gráfica.** Câmera fixa no espaço; Terra como disco distante. Clarão encobre a transição para fragmentos abstratos. Sem pessoas, cidades, vítimas ou destruição de superfície em detalhe.

16. **APROVADO — Final secreto aparece.** Ending card e os três parágrafos pedidos foram exibidos dentro dos limites do painel.

17. **APROVADO — SIM volta ao menu.** Espaço fecha a card e salva a conclusão. Reload na card a restaura; continuar depois de concluir não libera o Overworld.

18. **APROVADO — Zorp recusa.** A rota NÃO começa com a recusa e mantém todas as 15 falas previstas.

19. **APROVADO — Autoridades são chamadas.** Comunicador, transmissão de coordenadas, três naves oficiais e cerco observados no navegador.

20. **APROVADO — Ravok é preso.** Nave desativada sem destruição, acusação integral pelo holograma, custódia e retirada de Ravok/K7/equipamentos.

21. **APROVADO — NÃO não exibe ending card.** Todas as fases da recusa foram acompanhadas; nenhuma card, crédito ou menu foi aberto.

22. **APROVADO — Jogador recupera controle.** Retorno na mesma posição lógica da conversa, seguido de movimento real por teclado.

23. **APROVADO — Ravok permanece removido.** Após reload e retorno à ilha, Ravok, K7 e nave continuam ausentes. Não há prompts ou colisores deles; NPCs normais permanecem.

24. **APROVADO — Save registra prisão.** ravokArrested permanece true e ravokEndingCompleted permanece false; a campanha continua aberta.

25. **APROVADO — Final padrão continua disponível.** E na nave central iniciou a despedida; confirmação de embarque iniciou o final padrão. Este QA verificou sua entrada, sem repetir esse filme inteiro.

26. **APROVADO — Férias Merecidas continua disponível.** Interação com Capitão, oferta, pagamento existente de 100 moedas e início da viagem funcionaram após a prisão.

27. **APROVADO — Cutscenes bloqueiam movimento.** Teclas de movimento/ação foram pressionadas durante chegada, saída, proposta, SIM e NÃO. Posição e frame do minigame ficaram congelados até a liberação prevista.

28. **APROVADO — Diálogo avança corretamente.** Três falas da chegada, 29 da proposta e 15 da recusa avançaram por novos toques. Segurar Espaço não pulou falas ou tomadas essenciais.

29. **APROVADO — Escolha rejeita input duplicado.** Testados keydown repetido, repeat=true e duplicado com repeat=false sem keyup; nenhum confirmou uma escolha adicional.

30. **APROVADO — Espaço de avanço não seleciona SIM.** O Espaço da última fala foi mantido ao abrir o menu. Mesmo mudando o destaque para SIM, o toque antigo não selecionou nem confirmou SIM; a decisão só veio em novos inputs.

## Flags validadas

- **ravokArrivalSeen:** false de 0–3 medalhas e durante a chegada; true apenas após o fade final e a gravação bem-sucedida. Mantida após reload e novas medalhas.
- **ravokChoice:** null durante a conversa/menu; `accept` só depois de SIM confirmado duas vezes; `refuse` após NÃO. Valor persiste ao recarregar.
- **ravokBadEndingSeen:** false durante o filme e na leitura da ending card; true ao confirmar Espaço para sair da card. Continua false no ramo NÃO.
- **ravokArrested:** false antes/durante a prisão; true na conclusão e antes de liberar o controle. Persiste após reload. Continua false no ramo SIM.
- **ravokEndingCompleted:** true somente no final de aceitação; false depois da prisão, mantendo a campanha aberta.

As flags são armazenadas na chave existente `zorp_ravok_event`, versão 7. O JSON `qa-final-summary.json` inclui os saves observados antes da decisão, depois do SIM e depois do NÃO.

## Bug encontrado e corrigido

**Falha ao gravar a conclusão da chegada.** Antes da correção, uma recusa de `localStorage.setItem` deixava `ravokArrivalSeen=true` somente na memória e liberava o Overworld, embora o save continuasse pendente. Reproduzido por teste local e corrigido:

- A conclusão faz rollback das flags se a gravação falhar.
- A cutscene aguarda no fade final já existente, com movimento bloqueado e mensagem para tentar novamente.
- Um novo Espaço tenta salvar novamente. Somente o sucesso libera o controle e incrementa a conclusão.
- No Chrome, foi injetada uma falha apenas nessa escrita; a cena aguardou, gravou ao tentar novamente e não repetiu após reload.

Arquivos de produção modificados neste QA: `ravok_event.js`, `ravok_arrival.js` e versões de cache em `index.html`. Cobertura ampliada em `ravok_arrival.test.cjs`. Não houve alteração das cenas, das rotas, dos outros finais ou dos minigames.

## Gatilhos pelos oito minigames

- **pingpong: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_PINGPONG` e posição de retorno acessível.
- **basquete: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_BASQUETE` e posição de retorno acessível.
- **corrida: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_CORRIDA` e posição de retorno acessível.
- **skate: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_SKATE` e posição de retorno acessível.
- **arco: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_ARCO` e posição de retorno acessível.
- **escalada: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_ESCALADA` e posição de retorno acessível.
- **boxe: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_ESQUI` e posição de retorno acessível.
- **surf: aprovado.** Resultado preservado; chegada inicia por confirmação; destino `ILHA_SURF` e posição de retorno acessível.

Esses oito testes usam estados de resultado preparados; não são oito runs esportivas completas.

## Erros e performance

Na execução final de progressão, SIM, NÃO e oito adaptadores: **zero HTTP 404, zero TypeError, zero ReferenceError, zero outros erros de execução/console, zero respostas HTTP de erro e zero falhas de carregamento.**

- Rota SIM: 60.00 FPS em média, 3118 frames; mediana 16.70 ms.
- Rota NÃO: 60.02 FPS em média, 2793 frames; mediana 16.70 ms.

Medições deste ambiente, sem garantia de desempenho igual em outros dispositivos.

Duas tentativas iniciais registraram uma falha transitória de conexão de asset cada (Basquete e logo), sem 404. Os arquivos responderam HTTP 200. O servidor isolado passou a usar conexões HTTP/1.1 persistentes e a rotina de QA passou a esperar o fim dos preloads antes de reload; a repetição completa final terminou sem falhas. Esses registros iniciais foram preservados, sem alterar os assets ou seus carregadores no jogo.

## Evidências e reprodução

- `browser_progression_full.cjs` / `browser-progression-results.json`: 0–8 medalhas, chegada, retry de save, navegação, saída, 29 falas e input.
- `browser_accept_full.cjs` / `browser-accept-regression-results.json`: SIM completo, card, flags e menu.
- `browser_arrest_full.cjs` / `browser-arrest-results.json`: NÃO completo, prisão, reload, controle e início dos finais existentes.
- `browser_gateways.cjs` / `browser-arrival-gateways.json`: oito adaptadores de resultado.
- `unit-tests-final.txt`: resultado dos 34 testes locais instalados no projeto.
- `qa-final-summary.json`: as 30 verificações e snapshots das flags.
- `browser-progression-initial-results.json` e `browser-progression-second-results.json`: registros das duas tentativas iniciais com falhas de conexão do ambiente de QA.
- Capturas `qa-*.png`, `accept-*.png` e `arrest-*.png`: estados observados nesta execução.

Os scripts usam servidor isolado na porta 8814 e Chrome com depuração na porta 9294; `qa_server.py` configura o servidor. Não executar contra o perfil com save pessoal do jogador.
