# Card oficial — A MAIOR CONQUISTA

Integrado em 22/10/2026.

## Asset e recorte

- Arquivo real: `card_zorp_MaiorConquista.png`, na raiz do projeto, RGBA, 1536×1024.
- O arquivo contém vários grupos de sprites e três retratos grandes. Foi escolhido o primeiro retrato frontal grande, com expressão contida e reflexo no olho.
- Source rect: **x=892, y=141, largura=179, altura=217**. Não é uma divisão uniforme da folha.
- Os pixels principais do retrato estão em x=898..1064 e y=147..351. O recorte mantém seis pixels de margem nas antenas, rosto e jaqueta; não inclui rótulos, molduras ou retratos vizinhos.
- O PNG original foi preservado, inclusive transparência e detalhes. Não houve edição de RGB/alpha, criação de outline ou exportação de outro PNG.

## Integração e composição

- Preload exclusivo do módulo de aceitação em `ravok_bad_ending.js`, com `new Image`, caminho real e versão `?v=1.0.0_official_secret_card`.
- Cache Canvas de 179×217 criado uma vez, ao primeiro desenho da card. A tela usa somente esse retrato como imagem principal.
- Na resolução interna 450×300: canto superior esquerdo **(171,3; 22)**, destino **107,4×130,2 pixels**; centro horizontal x=225.
- Escala uniforme: **0,60 em X e Y (60%)**. `imageSmoothingEnabled=false` tanto no cache quanto no desenho final.
- Fundo cósmico escuro com estrelas discretas. Título em y=178, três parágrafos a partir de y=200 e instrução de Espaço em y=278.
- Após a partida das naves: fade preto de 1,6 s → intervalo preto de **0,55 s** → retrato aparece com fade curto → título e texto abaixo → Espaço retorna ao menu.
- O carregamento não usa card padrão, imagem de férias ou sprite de vitória como fallback. Se o arquivo falhar, há aviso e nova tentativa do mesmo arquivo; o menu e a flag de conclusão aguardam seu carregamento.

## QA real no Chrome

Servidor HTTP/1.1 e perfil isolados, com teclado real via CDP e sem acelerar a cutscene. Oito medalhas e a conversa anterior concluída foram preparados como fixtures; este teste não consistiu em jogar novamente os oito esportes. O save do jogador não foi alterado.

Validado:

- Escolha SIM, segunda confirmação e sequência inteira até o novo card: embarques separados, decolagem das duas naves, arma, disparo, fragmentos distantes, silêncio, partida e fade.
- Intervalo preto confirmado por leitura dos pixels centrais do Canvas.
- Arquivo carregado com sucesso; source rect real registrado no `drawImage`.
- Um único cache criado. Todos os desenhos observados do retrato ocorreram no estado CARD da rota accept.
- Destino com escala X/Y idêntica, smoothing desligado e todos os textos dentro da tela.
- Bounds visíveis no cache: **[6, 6, 173, 211]**; rosto e antenas têm margem. **Zero pixels brancos na borda externa** no critério de pixels brancos opacos adjacentes à transparência; os reflexos internos do olho foram mantidos.
- Revisão visual da captura em resolução nativa: sem rosto/antenas cortados, deformação ou moldura branca.
- Espaço volta ao menu. Reload antes de fechar restaura a card; a flag `ravokBadEndingSeen` só é salva ao sair da tela.
- Recusa completa testada novamente; iniciou também o final padrão pela nave central e Férias Merecidas pelo Capitão. O cache do retrato oficial permaneceu não criado nesses três contextos.
- `ending_card.js`, `ending_cinematic.js`, `captain_route.js`, `ravok_arrest.js` e o PNG original mantêm os mesmos hashes anteriores à integração. Não se repetiram integralmente os dois outros filmes até suas respectivas cards; sua inicialização e os renderizadores preservados foram verificados.
- **36/36 testes locais aprovados**, incluindo geometria do recorte, cache, erro de carregamento sem fallback e regressão de save/rotas.
- **Zero 404, TypeError, ReferenceError, outros erros de console/execução ou falhas de carregamento** durante os percursos executados.
- Rota SIM: **60.00 FPS** em média neste ambiente.

## Arquivos alterados

- `ravok_bad_ending.js`: preload, cache e composição da card, metadados do recorte e pausa preta.
- `ravok_outcome.js`: confirmação de saída aguarda o carregamento do card oficial.
- `index.html`: versões de cache dos dois módulos.
- `ravok_outcome.test.cjs`: cobertura do novo asset.

## Evidências

- `accept-ending-card.png`: tela final observada na rota completa.
- `official-card-preview.png`: prévia em resolução nativa.
- `browser_card_full.cjs` / `browser-official-card-results.json`: roteiro e medições da rota SIM.
- `browser_other_routes.cjs` / `browser-arrest-results.json`: exclusividade e regressão dos outros caminhos.
- `browser_card_preview.cjs` / `card-preview-results.json`: análise do recorte e da borda.
- `unchanged-assets-before.json`: hashes dos arquivos preservados.
- `unit-tests.txt`: 36 testes locais aprovados.

Scripts usam servidor isolado na porta 8815 e depuração do Chrome na porta 9295. Não executar contra o perfil com save pessoal.
