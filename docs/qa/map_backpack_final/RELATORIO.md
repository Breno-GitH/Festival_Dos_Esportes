# Mapa, mochila e progressão geográfica — entrega final

Data: 25/10/2026. Projeto: `C:/xampp/htdocs/2025/Festival_Dos_Esportes`.

## Resultado

Sistema existente mantido e completado. As nove regiões registram exploração física, mapa distingue descoberta de vitória, mochila preserva compras e teletransporte exige destino descoberto e confirmação. Nenhum minigame, diálogo de missão, preço, requisito de final ou sprite foi substituído nesta etapa.

## Estado persistente

Carteira continua em `localStorage['zorp_festival_wallet']`, agora versão 5. Dentro de `commerce`:

```js
islandVisited: {
  central: true,
  pingpong: false,
  basketball: false,
  running: false,
  skate: false,
  archery: false,
  climbing: false,
  boxing: false,
  surf: false
},
inventory: {
  islandMap: false,
  teleporter: false,
  questScanner: false,
  recordsModule: false,
  finalDestinationsChart: false,
  jukebox: false,
  shipCustomizer: false
}
```

São apenas identificadores e booleanos. Imagens, objetos de renderização e funções não são serializados no inventário. Registros, modalidades jogadas, temas ouvidos, estilo da nave e flags do Comerciante continuam no mesmo estado de comércio; moedas, missões, recompensa coletada e Capitão continuam na carteira existente.

Saves anteriores com `purchasedItems` e `visitedIslands` são convertidos preservando seu conteúdo. Esses nomes antigos continuam disponíveis como consultas derivadas para compatibilidade; não são gravados como outra cópia de inventário/visitas. Atualizações parciais não apagam descobertas ou itens já adquiridos. Uma falha ao salvar compra ou descoberta restaura o estado anterior em memória; descoberta pode ser tentada novamente na atualização seguinte.

`FestivalProgress` centraliza descoberta, dados públicos do mapa e destinos encontrados. `FestivalSave.snapshot()` reúne a visão da campanha. Os registros compatíveis de medalhas (`zorp_esportes_medalhas`), história (`zorp_festival_story`) e Ravok (`zorp_ravok_event`) continuam com suas autoridades originais; não foi criada uma segunda cópia desses estados na carteira. Mapa e Carta consultam essas autoridades diretamente.

## Descoberta

`FestivalProgress.discoverScene(scene)` aceita somente as nove regiões do Overworld. A travessia física chama essa função antes de qualquer interação com NPC ou entrada em minigame, persistindo a descoberta no mesmo quadro. Nenhuma medalha, missão ou conversa é necessária.

Entradas repetidas não regravam a descoberta nem apagam dados. Renderizações usadas para capturar fundos de cutscene não concedem visitas. Para saves antigos, medalhas existentes continuam servindo como evidência de uma ilha previamente explorada, conforme a migração que já existia.

## Mochila, mapa e bloqueio de controles

- B abre a mochila no Overworld; B/Esc fecha e limpa entradas acumuladas.
- Item Mapa na mochila ou M abre o mapa, depois da compra.
- M sem o item mostra “Você ainda não possui um mapa.”.
- Mochila e mapa suspendem movimento, interação com NPC e entrada em minigame.
- M/B não abrem interfaces nos oito minigames nem durante cenas importantes e diálogos.
- Uma cena importante que se ativa recebe prioridade e fecha uma interface aberta.

Mapa tem nove regiões, conexões coerentes com as travessias, ícones dos esportes e cabeça verde de Zorp no local atual. “VOCÊ ESTÁ AQUI” identifica a região independentemente da seleção do menu. Ilhas desconhecidas ficam escuras, com “???”, sem medalha, esporte ou missão expostos. Ilhas conhecidas exibem nome, ícone e “VISITOU”; check dourado e “VENCEU O MESTRE” distinguem medalha de exploração.

Loja na Ilha Central só recebe ícone após chegada concluída e desbloqueio real do Comerciante. Desenho usa Canvas, coordenadas inteiras e suavização desligada; não há assets novos nem fontes externas.

## Teletransporte

Sem Teletransportador, mapa é consulta. Com o item, selecionar uma região visitada abre “VIAJAR PARA ESTA ILHA?”. A opção inicial é CANCELAR. Viajar exige confirmação explícita.

Tanto interface quanto função de viagem bloqueiam regiões desconhecidas. Propriedade do item, descoberta e destino são verificados novamente no momento de concluir o fade. Se a posição deixou de ser válida, a viagem é cancelada sem mover Zorp.

Cada região possui `fastTravelSpawn`, separado da entrada convencional:

- Central: (225, 225).
- Ping-Pong: (350, 235).
- Basquete: (225, 220).
- Maratona: (225, 238).
- Skate: (245, 230).
- Arquearia: (226, 231).
- Escalada: (225, 238).
- Boxe: (269, 228), cena compatível `ILHA_ESQUI`.
- Surf: (225, 230).

O resolvedor considera colisão real, área de interação e distância mínima de 56 pixels a NPC visível. Se necessário procura pequenos deslocamentos ao redor do ponto; se nenhum servir, bloqueia. Os nove pontos declarados passaram sem deslocamento nos testes. Também foi verificada conectividade entre cada destino e a entrada da ilha pelo solo navegável.

## Scanner, recordes e Carta

Scanner comprado acrescenta somente o estado público da missão da ilha selecionada e já visitada: DISPONÍVEL, EM ANDAMENTO ou CONCLUÍDA. Objetivos continuam dependendo de conversa com o NPC; uma medalha não muda o estado de missão artificialmente.

Módulo de Recordes mantém a telemetria existente dos oito minigames. Explorar uma ilha não cria recorde de uma modalidade nunca jogada. No fluxo testado, Ping-Pong apresentou os 50 pontos reais da tela de resultado; Surf apenas explorado não apareceu como jogado.

Carta permanece uma interface separada, sem X no mapa comum. Preserva as três pistas da Central, Surf e Escalada sem revelar Ravok, Capitão ou soluções. Marcas começam apagadas, ganham legibilidade com a progressão e ficam claras com oito medalhas. Marca da Escalada também reage a `ravokArrivalSeen`.

“Destino encontrado.” só corresponde ao final efetivamente visto: `AdventureIntro.endingSeen`, `FestivalWallet.feriasVistas` ou `RavokEvent.ravokBadEndingSeen`. Prisão de Ravok não equivale a um final visto e não revela os outros destinos.

## Correções desta etapa

1. Descoberta salva na própria travessia, antes de outro sistema assumir a atualização.
2. Inventário e visitas canônicos com migração dos nomes antigos e proteção contra apagamento por atualização parcial.
3. Marcador do jogador independente do destino selecionado.
4. Medalhas separadas de visitas no mapa; dados de ilhas desconhecidas ocultos.
5. Scanner ligado aos estados reais de missão.
6. Pontos próprios de chegada, verificação de NPC/colisão e revalidação durante fade.
7. Viagem bloqueada fora do Overworld e durante eventos importantes.
8. Prioridade de entrada para cutscenes, incluindo saída de Ravok e conversa da nave.
9. Carta com progressão discreta e destinos encontrados individualmente.

## Validação

### Automatizada

224/224 testes passaram: 20 novos de mapa/mochila e regressões do Comerciante, NPCs, Ping-Pong, briefing, Boxe/rounds, Arquearia, corrida, chegada/desfecho de Ravok e ending cards. Evidência: `regression-tests.tap`.

Novos testes incluem defaults, migração v4, descoberta das nove regiões sem medalhas, persistência imediata/idempotente, rollback de falha de armazenamento, proteção contra perda de flags, mapa/Scanner, propriedade e confirmação de viagem, bloqueio de posição que ficou inválida, nove spawns, prioridades de cena, save/load e destinos da Carta.

### Navegador

Chrome headless em perfil e origem locais isolados. O save do navegador do usuário não foi lido nem alterado. Foram usados eventos reais de teclado e o código de atualização/renderização do jogo. Para obter a primeira medalha, foi preparado um resultado de partida de Ping-Pong e executado o fluxo existente de confirmação e retorno; não foi jogada manualmente uma partida inteira. A chegada do Comerciante foi executada em tempo real.

21 verificações do fluxo completo passaram, mais 6 verificações adicionais:

1. Campanha nova: somente Central visitada; sete itens ausentes; loja invisível.
2. Travessia física para Ping-Pong sem medalha/missão/conversa; save imediato.
3. M bloqueado sem compra.
4. Mochila bloqueia movimentação e fecha por Esc.
5. Primeira medalha confirmada; chegada, montagem, placa e persistência do Comerciante.
6. Compra real do Mapa pela interface; mapa, marcador, medalha e loja corretos.
7. Consulta não viaja sem Teletransportador.
8. Segunda descoberta física em Surf atualiza localização e visita sem medalha.
9. Scanner mostra missão disponível/em andamento/concluída, oculta ilhas não visitadas.
10. Teletransporte para Escalada não visitada bloqueado pela interface e API.
11. Confirmação inicia em CANCELAR; viagem confirmada usa fade e solo livre.
12. Travessias físicas registram os nove estados independentes.
13. Teletransporte aos nove pontos: sem colisão, NPC próximo ou entrada automática em minigame.
14. Carta separada; sete compras somam 145 moedas e deixam 100 das 245 de teste para o Capitão.
15. Recordes refletem modalidade jogada, sem registro fictício por exploração.
16. E na mochila usa o item selecionado e não conversa com NPC nem abre minigame.
17. M/B bloqueados nos oito minigames e cinematic importante.
18. Cinematic recebe prioridade sobre mapa aberto.
19. Trocas de cena e reload preservam visitas, itens, missão, medalha, moedas e Comerciante, sem repetir chegada.
20. Migração real de save v4 preserva 73 moedas, compras, Surf visitado, recompensa coletada e recorde.
21. Nenhum erro de carregamento ou execução.
22. Caminho navegável dos nove destinos até as respectivas entradas, usando colisões reais.
23. Capturar visualmente ilhas não concede descoberta falsa.
24. Uma única atualização de travessia já grava o novo estado, sem esperar o próximo quadro.
25. Fechar mochila limpa entradas, sem movimento/interação atrasados.
26. Capturas e menus não reiniciam campanha.
27. Verificações extras também sem erros de execução ou carregamento.

Versão integrada: aproximadamente 59 FPS na amostra de 120 quadros, próxima de 60 FPS. Pré-integração: aproximadamente 60 FPS. Isso mede a sessão automatizada local e não constitui garantia em todo hardware.

ZERO 404, ZERO TypeError e ZERO ReferenceError nas sessões registradas. Nenhuma perda de progresso nos saves novos, migrados e recarregados testados. Arquivos de Ravok, Capitão, missões/NPCs e animação do Comerciante foram conferidos por hash e permaneceram iguais aos anteriores a esta etapa.

## Arquivos

Modificados: `merchant_config.js`, `festival_economy.js`, `merchant_campaign.js`, `merchant_ui.js`, `script.js`, `index.html`.

Adicionados: `festival_progress.js`, `festival_map_art.js`, `map_backpack_harness.cjs`, `map_backpack.test.cjs`.

Preloads/versionamento foram atualizados somente para os scripts envolvidos. Nenhum PNG foi acrescentado, editado ou apagado. Evidências e capturas estão nesta pasta; cópias anteriores dos seis arquivos modificados ficam em `before/`.
