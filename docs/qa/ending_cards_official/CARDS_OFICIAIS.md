# Ending cards oficiais — Ilha dos Campeões

## Integração

Os três arquivos são carregados de seus nomes reais na raiz do projeto. Nenhum PNG foi alterado ou apagado.

### De Volta para Casa

- Arquivo: `zorp_finalpadrao.png?v=1.0.0_official_ending_card`.
- Imagem inteira: `1254 × 1254`, sem cortes na composição oficial.
- Caixa disponível: `136 × 118`. Escala: `min(136/1254,118/1254) = 0.09409888357`.
- Destino no Canvas de 450 × 300: `x=166, y=34, largura=118, altura=118`.
- A pose antiga `climbAssets.zorp.victory[0]`, derivada dos sprites da Escalada, saiu do card e da configuração do encerramento. Os sprites da modalidade foram preservados.

### Férias Merecidas

- Arquivo: `zorp_feriasmerecidas.png?v=1.0.0_official_ending_card`.
- PNG: `1448 × 1086`. Recorte útil: `[256,42,1007,1007]`.
- Bounds visíveis com alpha >8: `[262,48,1257,1043]`. Margem de seis pixels; Zorp, antenas, bebida, pés e cadeira permanecem inteiros. O recorte remove margens transparentes e resíduos de alpha quase invisíveis fora da arte, sem editar o arquivo.
- Caixa disponível: `148 × 126`. Escala: `min(148/1007,126/1007) = 0.12512413108`.
- Destino: `x=162, y≈38, largura=126, altura=126`. A oscilação vertical preexistente de até 0,55 px foi mantida.
- `zorpzin_ferias.png` e `CaptainRoute.preparePose()` deixaram de fornecer a imagem do card. Continuam na cutscene anterior, cuja apresentação não foi modificada.

### A Maior Conquista

- Arquivo: `card_zorp_MaiorConquista.png?v=1.0.0_official_secret_card`.
- Spritesheet: `1536 × 1024`. Mantido o retrato oficial já integrado, com sourceRect `[892,141,179,217]`.
- Caixa disponível: `116.35 × 141.05`. Escala calculada: `min(116.35/179,141.05/217) = 0.65`.
- Destino: `x=166.825, y=17, largura≈116.35, altura=141.05`.
- Preservados o retrato de Zorp, a composição sombria, o título em pixels, a entrada gradual, o silêncio e o fade para o menu. Não utiliza retratos dos outros finais.

## Preload e exclusividade

- `ending_card.js` carrega os cards padrão e Férias uma vez e mantém superfícies recortadas em cache. `EndingCard.assetsReady` permite aguardar os dois preloads.
- Identificadores fixos: `true_ending → zorp_finalpadrao.png`, `ferias_merecidas → zorp_feriasmerecidas.png`.
- `ravok_bad_ending.js` mantém o preload exclusivo de `card_zorp_MaiorConquista.png`, associado a `ravok_maior_conquista`.
- Nenhum card usa callbacks de retratos antigos como fallback. IDs desconhecidos não recebem a imagem de outro final.
- Todos os draws dos retratos, incluindo a preparação de cache, usam `imageSmoothingEnabled=false`. Largura e altura sempre derivam da mesma escala.
- `index.html` atualiza as versões dos scripts modificados. Os dois assets novos também possuem querystrings próprias de versão.

## Fluxo preservado

- Padrão: `EndingCinematic.finish() → ENDING_CARD`, tema `champion`; mantém o texto, o fade de entrada de 650 ms e a confirmação por Espaço. `AdventureIntro.endingSeen` continua sendo gravado no mesmo momento em `zorp_festival_story`.
- Férias: `MONOLOGUE → CaptainRoute.showEndingCard() → ENDING_CARD`, tema `vacation`; mantém texto, input, transição e `FestivalWallet.completeVacation()`/`feriasVistas` em `zorp_festival_wallet`.
- Ravok: `RavokOutcome → CARD → CARD_FADE_OUT → menu`; mantém revelação de 1,8 s, bloqueio inicial de 700 ms, keydown novo, fade de 800 ms e `ravokBadEndingSeen` em `zorp_ravok_event`.
- Nenhuma mudança nos requisitos, diálogos, formatos de save, medalhas ou desbloqueios. A alteração em `ending_cinematic.js` e `captain_route.js` remove apenas o fornecedor visual antigo do card. Em `script.js`, remove apenas a configuração do retrato antigo.

## Validação

- **48/48 testes automatizados aprovados**: identidade dos assets, caches separados, escala uniforme, crop, smoothing, ausência de fallback, fluxos e flags existentes; inclui regressão da rota Ravok.
- **Chrome real em origem e perfil de QA isolados**. Os três cards foram forçados separadamente em modo de desenvolvimento, pelo estado final de cada controlador. Este teste foca os cards; não reproduz as cutscenes anteriores.
- Para cada card: fonte oficial correta, apenas um retrato principal renderizado, zero mistura de arquivos, proporção correta, zero pixels brancos na borda externa, texto preservado e Espaço retornando ao menu.
- Flags corretas por rota: padrão somente `endingSeen`; Férias somente `feriasVistas`; Ravok somente `ravokBadEndingSeen`/conclusão secreta após confirmação. Nenhum outro final foi marcado indevidamente.
- Zero erros no console, zero HTTP >=400, zero falhas de requisição.
- Os PNGs oficiais e os módulos de progresso, economia, introdução e controle da rota Ravok permanecem idênticos aos anteriores.

## Arquivos modificados

- `ending_card.js`: preload, cache, seleção por ID e desenho proporcional dos dois novos cards.
- `ending_cinematic.js`: retirada da pose antiga do card padrão.
- `captain_route.js`: retirada da pose antiga do card Férias.
- `ravok_bad_ending.js`: escala proporcional calculada, sem alteração visual da composição.
- `script.js`: remoção da referência exclusiva ao retrato antigo da Escalada no final padrão.
- `index.html`: versões de cache.
- `ending_card.test.cjs`: nove testes novos dos cards oficiais.
- `ravok_outcome.test.cjs`: tolerância numérica apropriada para a dimensão calculada.

Capturas: `true_ending.png`, `ferias_merecidas.png`, `ravok_maior_conquista.png`. Resultados detalhados: `browser-official-ending-cards.json` e `unit-tests.txt`.
