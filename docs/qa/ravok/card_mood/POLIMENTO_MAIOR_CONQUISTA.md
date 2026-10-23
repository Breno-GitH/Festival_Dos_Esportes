# A Maior Conquista — polimento da tela final

## Apresentação

- Fundo quase preto, estrelas fixas esparsas e pequenos fragmentos em tons de vinho/roxo. Sem confete, pulsação ou música de vitória.
- Retrato oficial preservado, sem alteração no PNG: `card_zorp_MaiorConquista.png`. Recorte medido `[892, 141, 179, 217]`, com margem de segurança para antenas, rosto e roupa.
- Escala uniforme `0.65`: imagem `116.35 × 141.05`, posição `x=166.825, y=17` no Canvas de `450 × 300`. Bottom do recorte em `158.05`.
- Identificação `FINAL SECRETO`, título `A MAIOR CONQUISTA` desenhado com alfabeto local de pixels 5×7 e três frases curtas, com quebra automática. O título não depende de carregar uma fonte externa.
- Ordem de entrada: preto → retrato → identificação → título → narrativa. Entrada completa em 1,8 segundo. `[SPACE] CONTINUAR` aparece após a apresentação.
- Áudio da rota permanece em silêncio na tela. Identificador próprio: `ravok_maior_conquista`.

## Entrada, saída e save

- Bloqueio inicial de 700 ms, exigência de keydown novo e confirmação liberada somente depois da apresentação completa ser realmente desenhada.
- O tempo de carregamento do PNG não consome o tempo da apresentação. Carregamento falho não libera o encerramento.
- Espaço que vinha segurado da cena anterior e repetições automáticas não encerram a tela.
- Confirmar salva `ravokBadEndingSeen=true` e `ravokEndingCompleted=true` somente após a apresentação visível. Uma falha de escrita mantém a tela e permite tentar novamente.
- Depois da confirmação: fade de 800 ms para preto → menu principal. A campanha aceita não retorna ao Overworld.
- Recarregar antes da confirmação restaura o card; recarregar depois preserva a conclusão. Aba oculta pausa a progressão e o fade.

## Validação realizada

- **39/39 testes automatizados aprovados**, incluindo chegada, escolhas, prisão, card oficial, carregamento falho, erro de save, tab oculta e bloqueio de Espaço.
- **Chrome real, rota SIM completa**, em servidor local com origem e save de QA isolados. Filme executado no tempo normal; captura das 20 etapas até o card.
- Retrato primeiro, título depois e texto depois confirmados. Escala uniforme, smoothing desligado, recorte íntegro e zero pixels brancos residuais na borda do retrato.
- Keydown mantido desde o fade anterior não encerrou a tela. Nova confirmação entrou em `CARD_FADE_OUT`, manteve a cena durante o fade e somente depois abriu o menu.
- Reload antes e depois da confirmação validado. Flag falsa antes de continuar, verdadeira depois da apresentação e confirmação, persistida no save.
- Zero erros no console, zero HTTP >=400 e zero falhas de requisição no teste completo.
- Medição do teste completo: **59,88 FPS médios**, mediana **16,7 ms**, percentil 95 **16,8 ms**. Resultado deste ambiente local, não garantia para todos os dispositivos.
- PNG oficial, lógica de progresso e filme de prisão preservados. Nenhuma alteração nas apresentações do final padrão ou de Férias Merecidas.

## Arquivos alterados

- `ravok_bad_ending.js`: composição, escala, fundo, título em pixels, textos e entrada por etapas.
- `ravok_outcome.js`: reconhecimento de apresentação real, bloqueio de entrada e fade de saída.
- `index.html`: versões dos dois scripts atualizadas para renovar o cache.
- `ravok_outcome.test.cjs`: cobertura do fluxo novo e atualização dos testes de apresentação.

Evidências: `accept-ending-card.png`, `card-portrait-first.png`, `card-title-reveal.png`, `card-exit-fade.png`, `accept-menu.png`, `browser-mood-card-results.json` e `unit-tests.txt`.
