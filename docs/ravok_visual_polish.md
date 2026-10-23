# Ravok — integração visual da clareira secreta

## Resultado

A clareira do canto superior direito da Ilha da Escalada ganhou sinais discretos de pouso, com as cores do solo e das rochas locais. A montanha permanece o elemento dominante da ilha. O pouso é indicado por desgaste do terreno e pelos apoios da nave, sem plataforma luminosa ou efeitos grandes.

## Mudanças visuais e objetos adicionados

- Três áreas irregulares de grama comprimida/terra exposta, em verde-oliva, cinza e marrom próximos da paleta existente.
- Quatro marcas curtas de arrasto, alinhadas com os apoios da nave.
- Duas pequenas depressões sob os pés metálicos, com uma borda clara de terra comprimida.
- Seis pedras pequenas e achatadas nas extremidades da clareira.
- Cinco pequenos grupos de grama amassada, além de pontos claros de textura mineral.
- Sombra de contato da nave separada do casco e integrada ao chão.

Todos os detalhes são desenhos por Canvas. As pedras novas são pequenos fragmentos no chão, sem volume de obstáculo. O acesso pelo sul permanece aberto. O terreno novo ocupa uma superfície transparente de 102 × 74 pixels, desenhada em `(318,53)`; somente parte dessa superfície possui pixels visíveis.

## Composição e personagens

- Nave: origem `(321,40)`, desenho de 94 × 63 pixels.
- Ravok: pés em `(350,114)`.
- K7: pés em `(396,113)`.
- Ambos mantêm 44 pixels de altura útil, anchor bottom-center e a mesma escala uniforme usada antes deste passe.
- Ravok mantém escala X/Y de `0,333333`; K7, `0,261905`. Os recortes e as máscaras de transparência existentes foram preservados.
- Inspeção visual dos estados com quatro e oito insígnias: personagens reconhecíveis, sem achatamento, corte de partes ou halo branco observado.

## Camadas

O cache da Ilha da Escalada foi dividido em terreno e cenário. A ordem passou a ser:

1. Terreno da ilha.
2. Marcas de pouso, fragmentos, grama comprimida e sombra da nave.
3. Montanha, árvores e equipamentos do acampamento.
4. Casco da nave, NPCs e jogador, ordenados pela coordenada de profundidade.
5. Interface existente.

Essa separação impede que uma marca de solo apague uma árvore ou rocha já desenhada. A sombra deixou de acompanhar a camada elevada do casco e fica abaixo dos personagens. A nave continua com profundidade `96`; K7 e Ravok usam as posições dos pés (`113` e `114`). Zorp entra nessa mesma ordenação conforme se move.

As superfícies são criadas uma vez e reutilizadas. Não há sorteio de decoração a cada quadro. O desenho mantém `imageSmoothingEnabled = false`, e as bordas do novo solo são rasterizadas em coordenadas inteiras.

## Colisões e aproximação

Os novos detalhes são decalques visuais, sem acrescentar bloqueios à passagem.

Foram conferidos os dois volumes físicos existentes da nave:

- Corpo: `(341,64)`, tamanho `53 × 31`.
- Parte lateral: `(330,76)`, tamanho `77 × 15`.

K7 e Ravok continuam usando footprint de `18 × 8`, separado do tamanho visual, e área de interação de `44 × 48`, com o deslocamento vertical padrão de `14` pixels.

Na tentativa de caminhar para dentro da frente da nave, Zorp parou em aproximadamente `(370,104)`. A hitbox dos pés permaneceu fora do casco, e o próximo passo para cima foi bloqueado. A rota para conversar com cada NPC e o retorno ao caminho principal foram percorridos com eventos de teclado no navegador.

## Progressão preservada e conferida

- Zero a três insígnias: sem nave, NPCs do evento, colisores ou marcas de pouso.
- Quatro a sete: marcas de pouso, nave fechada e K7.
- Oito: mesma clareira, porta aberta, Ravok e K7.
- Interações por E continuam funcionando; a conversa de Ravok abre e pode ser fechada com Esc.
- Save/load mantém a presença e os contatos já realizados.

## Validação no navegador

Teste em Chrome real, em modo headless, com perfil isolado e estados de medalhas preparados para QA. A navegação usou o movimento e as colisões reais do jogo, com entradas de teclado. Foram percorridas oito rotas: entrada da ilha até K7, aproximação do casco, retorno a K7, aproximação de Ravok, passagem diante da porta, saída da clareira, retorno ao caminho central e chegada ao Mestre da Escalada.

Resultados:

- Acesso e retorno aprovados nas oito rotas.
- Interação com K7 e Ravok aprovada.
- Entrada no briefing da Escalada e retorno à ilha aprovados.
- Geometrias de ambos os NPCs válidas, escalas X/Y iguais e cantos transparentes nos recortes.
- Nenhuma ocorrência no diagnóstico de renderização do overworld.
- Noventa quadros consecutivos comparados na região estática da clareira: zero mudanças de pixels, sem flicker detectado.
- Ordem dos três passes de fundo confirmada: terreno → pouso → cenário.
- Medição de 120 intervalos de animação: aproximadamente **60 FPS**, com percentil 95 de **16,8 ms**. Medição local, não uma garantia para todos os dispositivos.
- **Zero respostas HTTP com erro, zero falhas de requisição e zero erros de execução/console**, incluindo TypeError e ReferenceError.
- **15 testes automatizados do evento aprovados**, incluindo visibilidade, persistência, conversa e reutilização da superfície de pouso.

## Arquivos modificados

Produção:

- `ravok_event.js`: camada de solo em cache; sombra retirada do desenho do casco.
- `climb_island.js`: separação entre terreno e cenário para inserir os decalques na ordem correta.
- `script.js`: ligação da camada de pouso ao desenho da Ilha da Escalada.
- `index.html`: versões dos três scripts atualizadas para renovação de cache.

Testes e documentação:

- `ravok_event.test.cjs`.
- `docs/ravok_visual_polish.md`.
- `docs/qa/ravok/browser_polish.cjs` e `browser-polish-results.json`.
- Capturas em `docs/qa/ravok/polish-*.png`.

## Evidências

- [Ilha integrada com Ravok e K7](qa/ravok/polish-integrated.png)
- [Estado com quatro insígnias](qa/ravok/polish-four-medals.png)
- [Aproximação da porta](qa/ravok/polish-door-approach.png)
- [Bloqueio físico do casco](qa/ravok/polish-ship-front.png)
- [Passagem de saída da clareira](qa/ravok/polish-clearance.png)
- [Resultados completos do navegador](qa/ravok/browser-polish-results.json)

Conclusão: a nave agora possui contato visual com o terreno, enquanto a clareira mantém a escala, a circulação e o acabamento da Ilha da Escalada.
