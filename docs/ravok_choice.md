# Ravok — saída da nave, proposta e decisão

## Condições e saída

O encontro exige `ravokArrivalSeen = true`, oito medalhas oficiais e aproximação da nave na Ilha da Escalada. Com sete medalhas, Ravok permanece oculto e sua proposta não pode ser iniciada. Ter oito medalhas sem ter concluído a primeira chegada também não abre o encontro.

Antes de sair, Ravok não é desenhado como NPC parado no mapa. Ao alcançar a área de aproximação em frente à nave, acontece uma sequência de aproximadamente 3,9 segundos:

1. Porta abre: 0,9 s.
2. Ravok sai pela porta e caminha até sua posição: 2,2 s.
3. Pequena pausa com destaque das medalhas: 0,8 s.

O sprite sai de `(368,89)` e chega a `(350,114)`, usando interpolação suave e recuo contínuo da oclusão da porta. A escala é uniforme; a pequena mudança de tamanho representa a saída da profundidade da nave. Ao fim, volta aos 44 pixels de altura útil do Overworld. O jogador fica parado em uma região segura durante a saída.

K7 continua em `(396,113)`. A nave continua em `(321,40)`. O desenho e os colisores gerais da ilha foram preservados. O NPC fixo de Ravok só é habilitado depois da animação terminar; a animação e o NPC estático nunca são desenhados ao mesmo tempo.

`Ravok.png` mantém o recorte frontal `[158,15,84,136]`, margem e máscara de transparência existentes. Não foi criada uma versão deformada do PNG. Escala uniforme, bottom-center e smoothing desligado continuam em uso.

A flag `ravokExited` é gravada ao concluir a saída. Uma recarga posterior pode mostrar Ravok já fora porque a saída já foi apresentada; uma saída interrompida permanece pendente.

## Conversa

E/Espaço abre a interação padrão com Ravok. Depois disso, Espaço avança individualmente os **29 trechos** do roteiro fornecido, incluindo a fala completa sobre as leis fundamentais da espécie. A preparação antiga de nove falas foi substituída.

A conversa apresenta o passado de Ravok, seu fracasso, o ressentimento e a proposta. Não utiliza as palavras “GOOD”, “BAD” ou “FINAL RUIM” para orientar a decisão.

Os textos usam um painel de Canvas com quebra automática de linha, autor identificado e fonte de 10 pixels. A fala longa sobre a lei cabe sem truncamento. O cenário e os personagens permanecem visíveis acima do painel.

Um save com `preludeSeen` da conversa antiga não pula o roteiro novo: `ravokProposalSeen` registra especificamente a leitura da nova proposta.

## Escolha e proteção de input

Ao avançar a fala de K7, aparece **AJUDAR RAVOK?**, com **NÃO** selecionado inicialmente.

- W/S ou setas escolhem.
- E/Espaço confirmam.
- NÃO registra `ravokChoice = "refuse"` e entra imediatamente no confronto.
- SIM abre uma segunda tela, também iniciada em NÃO, com o texto exato: **“Esta decisão encerrará sua jornada na Terra.”**
- Confirmar SIM na segunda tela registra `ravokChoice = "accept"` e inicia o outro ramo.
- Escolher NÃO ou usar Esc na segunda tela retorna à escolha anterior, sem gravar uma decisão.
- Esc na escolha principal permite sair sem escolher. Ao conversar novamente, a proposta já lida pode retornar à escolha, novamente iniciada em NÃO.

Teclas mantidas pressionadas e repetição automática não avançam falas nem atravessam as duas confirmações. A tecla de abertura do diálogo precisa ser solta. Os controles de movimento ficam bloqueados durante a saída, a conversa, a escolha e as cutscenes.

## Encaminhamentos implementados

Não havia cutscenes desses ramos no projeto. Foram adicionadas duas sequências curtas em `ravok_outcome.js`, sem minigame ou novo sistema de combate.

### Recusa

**CONFRONTATION → DISARM → CUSTODY → RESOLVE → FADE → CARD**

Zorpzin impede o ataque, K7 detecta violação de protocolo e aciona a contenção. Ravok aparece em uma pequena cela de energia e a custódia intergaláctica é confirmada. A sequência dura aproximadamente 12,6 segundos e fecha com a card **A VERDADEIRA VITÓRIA**.

### Aceitação confirmada

**PACT → BOARD → LAUNCH → ORBIT → FADE → CARD**

Zorpzin, Ravok e K7 embarcam, a nave parte e o ataque é apresentado do espaço, com a Terra escurecendo. A sequência dura aproximadamente 13,8 segundos e fecha com a card **O PREÇO DA ESCOLHA**.

Os títulos e a identificação de final só aparecem depois da decisão e da cutscene. Espaço na card retorna ao menu inicial. Os desenhos usam Canvas e os recortes existentes dos personagens; não há assets externos novos.

## Persistência

Chave: **`zorp_ravok_event`**, versão 5. Os campos anteriores da chegada e dos contatos foram mantidos. Os novos campos são:

- `ravokExited`: saída de Ravok concluída.
- `ravokProposalSeen`: roteiro novo lido até a escolha.
- `ravokChoice`: `null`, `"accept"` ou `"refuse"`.
- `ravokChoicePosition`: posição de Zorpzin no momento da decisão, para retomar a composição correta da cutscene após recarga.
- `ravokEndingCompleted`: conclusão do ramo escolhido.

A decisão é gravada **antes** do encaminhamento. A conclusão permanece falsa durante toda a cutscene e só é gravada depois do último fade. Se a página fechar no meio do ramo, a escolha continua salva e o mesmo ramo retoma quando o jogador volta ao Overworld. Um ramo concluído não é executado novamente ao carregar.

Se a decisão não puder ser salva, a escolha permanece aberta e nenhuma cutscene começa. Se a gravação final falhar, o jogo oferece nova tentativa e não informa uma conclusão falsa.

## QA realizado

Chrome real em modo headless, com perfil isolado e progresso preparado para teste. A navegação até a clareira e as interações utilizaram os controles reais. Não foram jogadas oito partidas para montar cada caso.

- **Sete medalhas:** sem saída, sem NPC de Ravok e sem proposta — aprovado.
- **Oitava medalha pela API oficial:** Ravok continua dentro até a aproximação — aprovado.
- **Aproximação:** caminho percorrido por teclado desde a entrada da ilha — aprovado.
- **Saída:** porta, posições intermediárias, chegada e persistência; jogador parado durante a animação — aprovado.
- **Conversa:** 29 falas, incluindo a lei completa; todas cabem no painel — aprovado.
- **Tecla segurada:** interação de abertura e repetições não pulam falas — aprovado.
- **Escolha principal:** NÃO inicial, W/S e setas — aprovado.
- **SIM:** abre segunda confirmação em NÃO; repetição da tecla não aceita; cancelar volta à escolha sem gravar — aprovado.
- **NÃO:** grava `refuse` e começa diretamente em CONFRONTATION — aprovado.
- **SIM confirmado:** grava `accept` e começa no ramo correspondente — aprovado.
- **Recusa completa:** custódia, fade, flag final e retorno ao menu — aprovado.
- **Aceitação interrompida:** reload antes do fim conserva `accept`, preserva a posição de origem e retoma o mesmo ramo sem marcar conclusão — aprovado.
- **Aceitação completa:** embarque, decolagem, órbita, fade, flag final e menu — aprovado.
- **Reload após cada final:** escolha e conclusão preservadas, sem replay automático — aprovado.
- **Sprites:** geometrias válidas, escalas X/Y iguais e pés fora dos volumes da nave; sem problemas no diagnóstico de renderização — aprovado.
- **25 testes automatizados aprovados**, incluindo regressão da primeira chegada, sete/oito medalhas, sequência de saída, confirmações, save/load e falhas de gravação.
- **Zero 404, TypeError, ReferenceError, outros erros de execução/console ou falhas de requisição** na execução completa dos dois ramos.

## Arquivos modificados

Produção:

- `ravok_event.js`: roteiro, saída, menus, persistência e desenho do encontro.
- `ravok_outcome.js`: novo controlador e apresentação dos dois ramos.
- `script.js`: integração de update, desenho, sprites recortados e menu.
- `index.html`: carregamento do módulo e versões de cache.

Testes e documentação:

- `ravok_event.test.cjs`.
- `ravok_outcome.test.cjs`.
- `docs/ravok_choice.md`.
- `docs/qa/ravok/browser_choice.cjs`, `browser-choice-results.json` e capturas `proposal-*.png` / `outcome-*.png`.

## Evidências

- [Sete medalhas](qa/ravok/proposal-seven-medals.png)
- [Saída de Ravok em andamento](qa/ravok/proposal-ravok-exiting.png)
- [Ravok e K7 fora da nave](qa/ravok/proposal-ravok-outside.png)
- [Lei da espécie, sem truncamento](qa/ravok/proposal-line-19.png)
- [Escolha principal](qa/ravok/proposal-choice-default.png)
- [Segunda confirmação](qa/ravok/proposal-confirmation.png)
- [Custódia de Ravok](qa/ravok/outcome-refuse-custody.png)
- [Desfecho da aceitação](qa/ravok/outcome-accept-orbit.png)
- [Resultado completo do navegador](qa/ravok/browser-choice-results.json)
