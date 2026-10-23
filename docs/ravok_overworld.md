# Encontro secreto de Ravok — Ilha da Escalada

## Local e composição

Cena: **ILHA_ESCALADA**, clareira superior direita, ao lado da encosta e afastada do caminho central. A entrada continua pela ponte sul, passa pelo acampamento e segue pelo lado direito da montanha.

- Nave: origem do desenho **(321, 40)**, área visual **94×63 px**, casco em perspectiva 3/4 com cockpit, asas, motores, apoios e porta. Desenhada por Canvas e armazenada em cache, com uma versão para porta fechada e outra aberta.
- K7: **(396, 113)**, id `k7`.
- Ravok: **(350, 114)**, id `ravok`.

As coordenadas dos NPCs correspondem à base dos pés, com anchor bottom-center. A nave participa da ordenação por profundidade antes dos NPCs, que aparecem à frente do casco. A bandeira, montanha, acampamento e posições dos quatro NPCs anteriores foram preservados.

O teste encontrou uma passagem apertada entre a árvore superior direita e a montanha. A árvore passou de (400,134) para **(407,128)**, com sua colisão acompanhando a mudança, de (395,128,10,8) para **(402,122,10,8)**. Nenhuma rota do minigame foi alterada.

Somente na Ilha da Escalada, após a chegada da nave, o aviso de objetivo das oito medalhas aparece no canto superior esquerdo. Isso evita que o aviso cubra o cockpit e Ravok.

## Estados e gatilho aprovado

O gatilho confirmado pelo usuário é conquistar **quatro medalhas** do registro oficial. Aliases, como esqui/boxe, não contam duas vezes.

- **A — DORMANT:** antes da chegada, com 0–3 medalhas. Nave e NPCs não são desenhados e não possuem colisão ou interação invisível.
- **B — LANDED:** ao conquistar a quarta medalha, a nave pousada e K7 aparecem. Ravok permanece dentro. K7 usa somente frases curtas e vagas, sem explicar o evento ou sua condição futura.
- **C — RAVOK_PRESENT:** com as oito medalhas, a porta aparece aberta e Ravok fica fora da nave. K7 permanece e muda sua fala para indicar que Ravok está esperando.

As conversas usam o sistema existente de prompts e caixa de diálogo. K7 responde por **E/Espaço**. Ravok inicia uma conversa de preparação em nove falas, avançada por **E/Espaço/Enter**. Não há escolha definitiva de final nesta etapa.

## Progresso

`RavokEvent` centraliza as regras. A chave exclusiva de localStorage é `zorp_ravok_event`, contendo:

- `arrived`: chegada já ativada pela quarta medalha;
- `metK7`: jogador já conversou com K7;
- `metRavok`: jogador já conversou com Ravok.
- `k7Line`: índice da próxima frase curta de K7, preservado após recarga.
- `preludeSeen`: conversa de preparação de Ravok lida até a última fala.

A versão atual do registro é 3 e aceita os saves das versões anteriores. A chegada é gravada imediatamente quando o sistema oficial concede a quarta insígnia, pelo evento `festival:medal-unlocked`. O mesmo evento atualiza a presença de Ravok assim que a oitava é concedida, sem exigir reentrada. A sincronização inicial também reconhece saves antigos com o progresso necessário. O polling existente do Overworld continua como reconciliação de segurança.

`ravokAvailable` e o estado C são derivados das oito medalhas atuais; uma flag de conversa salva não concede esse acesso sozinha. O reset existente do Festival já remove chaves com prefixo `zorp` e recarrega a página, cobrindo também este evento.

O evento não escreve moedas, medalhas ou flags dos finais atuais.

## Sprites e escala

Ambos os arquivos fornecidos são spritesheets opacas com fundo preto. Foram selecionadas apenas as primeiras poses frontais, medidas pelos pixels úteis, sem grade uniforme:

- `Ravok.png`: sourceRect **[158,15,84,136]**, conteúdo útil 80×132, escala uniforme **1/3**, altura útil em tela **44 px**.
- `K7.png`: sourceRect **[37,66,99,172]**, conteúdo útil 95×168, escala uniforme **44/168 ≈ 0,261905**, altura útil em tela **44 px**.

Os recortes incluem margem de segurança e mais 2 px de padding no cache. Antenas, equipamentos e pés permanecem inteiros. Não há flip, rotação ou oscilação artificial.

O gerador `tools/prepare_ravok_geometry.py` cria máscaras por flood-fill do preto externo conectado às bordas. O renderizador aplica essas máscaras uma única vez em seu cache Canvas. Os PNGs originais não são regravados. Olhos/contornos pretos internos e partes brancas legítimas de K7 são preservados. Não há remoção global de branco, matte branco ou outline acrescentado.

O desenho reutiliza o pipeline proporcional do Overworld: uma única escala X/Y, `imageSmoothingEnabled = false`, bottom-center e sombra padrão nos pés. Não existe fallback para sprites antigos.

## Colisões e interação

A nave possui dois volumes sólidos sobrepostos acompanhando seu casco:

- corpo: **(341,64,53,31)**;
- asas/casco inferior: **(330,76,77,15)**.

Os dois NPCs usam a mesma footprint física dos demais NPCs locais: **18×8 px**. A zona padrão de interação é **44×48 px**, com offset vertical de 14 px. A presença controla desenho, colisão e interação, impedindo NPCs invisíveis bloqueando a clareira nos estados anteriores.

## QA realizado

Chrome real, com perfil e servidor isolados. As medalhas foram configuradas no estado de QA para testar as três etapas, sem jogar novamente os oito minigames. A navegação usa colisões reais e eventos de teclado, sem teleportes durante os percursos.

1. Estado A validado com 0 e 3 medalhas: área sem nave ou NPCs.
2. Estado B validado com 4 e 7 medalhas: somente K7 fora da nave.
3. Caminho completo da entrada sul até a zona de K7 percorrido pelo teclado.
4. Prompt e fala de K7 validados com E.
5. Colisão da nave testada tentando caminhar para dentro do casco; Zorp foi bloqueado fisicamente em y≈103,6.
6. Estado C validado com 8 medalhas: Ravok e K7 presentes.
7. Acesso, prompt e fala de Ravok validados com E.
8. Retorno da clareira ao acampamento e ao Mestre original percorrido pelo teclado.
9. Entrada no briefing da Escalada e retorno à ilha por ESC aprovados.
10. Três conversas repetidas com Ravok por Espaço aprovadas: saldo intacto, nenhuma cutscene/final disparado.
11. Flags de chegada e conversa preservadas após recarregar com o save de QA completo.
12. Recortes aprovados pelo validador de geometria. Escala X/Y idêntica, cantos transparentes, detalhes pretos internos e brancos de K7 preservados.
13. Capturas dos estados A, B e C inspecionadas: sem folhas inteiras, textos da folha, deformação ou halo branco.
14. **Zero erros de execução, zero respostas HTTP com erro e zero problemas registrados no renderizador de NPCs.**

Também passaram **5 testes unitários** de presença, colisão condicional, persistência, limiar de quatro/oito medalhas e preservação do caminho central.

## Arquivos

Novos arquivos de produção:

- `ravok_event.js`: evento, preload dos dois PNGs, estados, nave Canvas, colisão e conversas;
- `ravok_npc_geometry.js` e `ravok_npc_geometry.json`: recortes, anchors e máscaras dos dois personagens.

Arquivos existentes alterados:

- `script.js`: registro dos NPCs, presença condicional, interação, colisão e ordenação visual;
- `overworld_visuals.js`: suporte a geometria explícita dos NPCs do evento;
- `climb_island.js`: pequeno deslocamento da árvore e de sua colisão;
- `index.html`: carregamento dos módulos e versões de cache.
- `medalhas_registry.js`: notificação após a concessão oficial de uma nova insígnia, sem alterar a lógica da conquista.

Ferramentas/evidências:

- `tools/prepare_ravok_geometry.py`;
- `ravok_event.test.cjs`;
- `docs/qa/ravok/`.

## Capturas e resultados

- [Antes do evento](qa/ravok/ravok-A-before.png)
- [Nave e K7](qa/ravok/ravok-B-landed.png)
- [Ravok disponível](qa/ravok/ravok-C-area.png)
- [Conversa no navegador](qa/ravok/ravok-browser-conversation.png)
- [Estados, percursos, geometria e recarga](qa/ravok/browser-ravok-results.json)
- [Conversas repetidas por Espaço](qa/ravok/browser-ravok-space-results.json)

## Progressão consolidada e falas provisórias

O jogador não recebe diálogo automático, grande explicação ou interrupção ao conquistar a quarta insígnia. O estado passa de DORMANT para LANDED e é salvo no mesmo fluxo da concessão. A descoberta permanece opcional na clareira da Escalada.

Enquanto Ravok está dentro, K7 alterna uma frase por interação:

1. “Não me atrapalhe.”
2. “Ainda não é hora.”
3. “Volte para o nosso planeta.”
4. “Você não vai querer ver o que vem.”

A alternância ocorre somente ao conversar; ler ou caminhar não troca a frase. A nave e K7 persistem após sair da ilha e recarregar. Uma flag antiga inconsistente não torna o evento visível abaixo de quatro medalhas reais.

### Testes desta consolidação

- Save e recarga com zero medalhas: nada visível.
- Três medalhas concedidas pela função oficial e recarga: estado DORMANT, sem NPCs do evento.
- Quarta medalha concedida pela função oficial fora da Escalada: flag `arrived=true` gravada imediatamente, antes de qualquer frame de atualização do Overworld.
- Duas entradas pela ligação norte da Arquearia, usando teclado real: nave e K7 presentes, Ravok ausente.
- Três falas por E, recarga e quarta fala por Espaço: sequência e `metK7` persistentes.
- Quinta medalha e repetição de uma insígnia já conquistada: chegada não dispara novamente e o registro do evento permanece intacto.
- Nenhuma conversa automática ou final iniciado.
- **Nove testes unitários aprovados.**
- **Zero erros de execução, falhas de requisição ou respostas HTTP com erro no Chrome.**

As conquistas foram acionadas pela API oficial em um perfil isolado de QA; não foi necessário completar quatro partidas inteiras para testar a transição.

- [Resultado da progressão no navegador](qa/ravok/browser-progression-results.json)
- [Ilha após a quarta insígnia](qa/ravok/progression-fourth-insignia.png)
- [K7 com fala misteriosa](qa/ravok/progression-k7-mystery.png)

## Conversa de preparação com oito insígnias

Ravok aparece automaticamente ao conquistar a oitava insígnia. Se Zorpzin estiver em outro mapa, ele já o encontrará fora da nave na próxima visita. A presença não inicia a conversa sozinha: o jogador precisa se aproximar e interagir. K7 permanece em (396,113), Ravok em (350,114), ambos com a pose frontal e a geometria já aprovadas.

Falas implementadas, em ordem:

1. **RAVOK:** “Oito insígnias, Zorpzin. Você finalmente se provou digno. Junte-se a mim.”
2. **ZORPZIN:** “Juntar a você? Para quê?”
3. **RAVOK:** “Vamos destruir a Terra. Com a sua habilidade, ninguém poderá nos impedir.”
4. **ZORPZIN:** “Não. Isso viola a lei intergaláctica e os princípios da nossa raça.”
5. **ZORPZIN:** “Eu conheci este povo. Não vou ajudar você a destruir o lar deles.”
6. **RAVOK:** “Foi por sua habilidade que esperei. Juntos, podemos ir muito além dessas competições.”
7. **ZORPZIN:** “Você chama destruição de conquista?”
8. **RAVOK:** “Há outro caminho, Zorpzin. Minha proposta continua de pé. Pense antes de aceitar... ou recusar.”
9. **ZORPZIN:** “Eu ouvi sua proposta. A decisão será minha.”

A caixa de diálogo existente exibe o nome de quem fala, o texto e o contador de etapas. O jogador avança no próprio ritmo com E, Espaço ou Enter. A tecla usada para abrir precisa ser solta antes de avançar; repeat não pula falas. O controle de movimento fica bloqueado durante a leitura. ESC encerra a conversa, permitindo retomá-la desde a primeira fala depois.

`preludeSeen` é salvo somente após avançar a última fala. `metRavok` continua indicando que houve contato. Um save antigo com `metRavok=true` não marca a nova conversa como concluída. Nenhuma flag de aceitação/recusa é criada, não há cobrança ou recompensa e nenhum final é disparado. Conversar novamente permite reler a preparação.

### QA da conversa

- Chrome real, perfil isolado e conquista pela API oficial, sem repetir oito partidas inteiras.
- Com sete insígnias: somente K7 fora da nave; Ravok não pode ser acionado.
- Oitava conquistada na própria ilha: Ravok aparece no mesmo mapa, sem reentrada, e a conversa não começa automaticamente.
- Interação real por E inicia a fala 1. E repetido/segurado e movimento não pulam o texto nem deslocam Zorpzin.
- As nove falas percorridas alternando E, Espaço e Enter; todos os textos cabem na caixa existente.
- Último Espaço mantido pressionado fecha a conversa sem reabri-la.
- K7 permanece presente e conversável após a preparação.
- NPCs sem sobreposição entre si, fora dos volumes físicos da nave e com escala X/Y idêntica.
- ESC e nova interação aprovados; estado concluído preservado após recarga, sem reabertura automática.
- Moedas e rotas dos finais atuais permanecem intactas.
- **14 testes unitários aprovados; zero exceções de execução, respostas HTTP com erro ou falhas de requisição no navegador.**

Arquivos de produção alterados nesta etapa: `ravok_event.js`, `script.js` e `index.html`. Testes e documentação: `ravok_event.test.cjs`, este relatório e `docs/qa/ravok/`.

- [Resultado da conversa no navegador](qa/ravok/browser-prelude-results.json)
- [Sete insígnias: Ravok dentro](qa/ravok/prelude-seven-medals.png)
- [Oito insígnias: Ravok fora](qa/ravok/prelude-eight-medals.png)
- [Proposta de Ravok](qa/ravok/prelude-ravok-proposal.png)
- [Objeção de Zorpzin](qa/ravok/prelude-zorpzin-objection.png)
- [Possibilidade futura de aceitar ou recusar](qa/ravok/prelude-future-choice.png)
