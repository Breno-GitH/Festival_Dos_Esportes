# NPCs da Escalada — integração 2.0

## Resultado

Os quatro NPCs de `ILHA_ESCALADA` agora usam exclusivamente os personagens frontais de `npcs_escalada2.0.png`. Não foi redesenhada a ilha. As posições, os IDs, as falas, os prompts, as missões e o acesso ao minigame foram preservados.

## Personagens e recortes

Coordenadas dos recortes em pixels na folha original: `[x, y, largura, altura]`. Os recortes foram medidos pelos pixels de cada figura, sem dividir a folha em células iguais.

- **Geóloga** — ID `geologa_escalada`; posição `(365, 176)`; altura visível de 44 unidades; recorte `[27, 269, 304, 496]`; chave `climb_v2_geologa`.
- **Mestre da Escalada** — ID `ilha_escalada_mestre_da_escalada`; posição `(225, 168)`; altura visível de 50 unidades; recorte `[443, 256, 276, 509]`; chave `climb_v2_mestre`.
- **Chef de acampamento** — ID `ilha_escalada_chef_de_acampamento`; posição `(112, 224)`; altura visível de 44 unidades; recorte `[1196, 275, 280, 492]`; chave `climb_v2_chef`.
- **Guia da trilha** — ID `ilha_escalada_guia_de_trilha`; posição `(87, 166)`; altura visível de 44 unidades; recorte `[799, 271, 310, 495]`; chave `climb_v2_guia`.

Todos mantêm footprint físico de **18 × 8**, independente do tamanho do desenho e das margens transparentes. A área de interação continua sendo **58 × 62** para o Mestre e **44 × 48** para os demais, com o deslocamento vertical original de 14.

## Proporções, transparência e desenho

- A altura útil de cada personagem determina uma única escala aplicada igualmente aos dois eixos. Não há achatamento, alongamento, rotação ou inversão horizontal.
- As âncoras são calculadas no centro dos pés, na base visível do personagem. As sombras nos pés são as mesmas do desenho padronizado do Overworld.
- `imageSmoothingEnabled = false` durante o preparo do recorte e durante o desenho.
- O contorno claro externo da fonte é removido por máscaras de transparência, calculadas previamente e aplicadas uma vez ao Canvas em cache. Os pixels claros internos das roupas, olhos e equipamentos ficam protegidos pelo contorno escuro do personagem.
- Três pequenos resíduos claros enclausurados no contorno do cabelo da geóloga receberam máscaras locais adicionais. Apenas os pixels neutros claros desses pontos são apagados.
- Os pixels mantidos conservam o RGBA original. A folha PNG original não foi alterada nem reexportada; nenhum arquivo antigo foi apagado.
- A limpeza foi conferida sobre fundos verde e escuro. A análise das quatro máscaras encontrou zero pixels claros externos conectados restantes segundo o critério de detecção.
- Cada figura tem uma chave explícita e um cache independente. O renderizador não escolhe o primeiro personagem da folha nem substitui silenciosamente por um sprite antigo.
- As versões dos scripts no HTML foram atualizadas para evitar cache de código antigo.

## Separação do minigame

O Overworld usa `imgMestreEscaladaOverworld`, associado à folha nova e à chave `climb_v2_mestre`.

A imagem `imgMestreEscalada`, usada pela apresentação do cume dentro do minigame, permanece intacta. O desenho do minigame, seus sprites de Zorp, controles, física, câmeras, checkpoints, final e medalha não foram modificados.

As treze entradas de geometria dos demais NPCs do catálogo continuam idênticas às anteriores. O código de desenho da ilha e o CSS também permaneceram idênticos.

## Validação no navegador

Chrome real em modo headless, com teclado por CDP, perfil de teste separado e cache desativado. **29 verificações aprovadas de 29**, em HTTP e `file://`.

Verificado:

- entrada pela conexão da Arquearia e saída normal da ilha;
- caminhada até os quatro NPCs usando o código real de colisões;
- quatro personagens distintos, com recortes e caches próprios;
- comparação dos IDs, posições, textos, alturas, footprints e áreas de interação com a auditoria anterior;
- escalas X e Y iguais, ausência de rotação/inversão e smoothing desativado;
- âncora dos pés coincidindo exatamente com a posição lógica de cada NPC;
- prompts e conversas de guia, chef e geóloga;
- prompt do Mestre, E para abrir tutorial e Espaço para iniciar a Escalada existente;
- retorno à ilha após resultado de derrota controlado e permanência dos quatro visuais novos;
- colisões nos corpos, trilha e ponte livres;
- ausência de carregamento dos antigos sprites de guia, geóloga e chef;
- separação do asset do Mestre usado no minigame;
- moedas, medalhas e flags de progresso preservadas. Conversar com a geóloga aceita sua missão já existente, como antes;
- aproximadamente **60 FPS** na ilha, em amostra de 120 intervalos de animação;
- **zero 404, falhas de carregamento, TypeError, ReferenceError ou avisos/erros de console** nos percursos testados.

O teste de retorno usou uma derrota controlada pela função de resultado existente. Não foi uma run completa até o cume, pois esta alteração se limita aos visuais dos NPCs no Overworld. O save real do jogador não foi utilizado.

## Arquivos alterados ou adicionados

- `script.js` — preload e associação dos quatro NPCs aos recortes novos.
- `overworld_visuals.js` — seleção explícita da geometria por personagem.
- `index.html` — versões de cache dos scripts envolvidos.
- `overworld_assets/npc_geometry.js` e `overworld_assets/npc_geometry.json` — catálogo atualizado.
- `overworld_assets/climb_npcs_v2_geometry.json` — recortes, âncoras e máscaras dos quatro personagens.
- `tools/prepare_climb_overworld_npc_geometry.py` — geração reproduzível dos recortes e máscaras, sem alterar a fonte.
- `tools/prepare_overworld_npc_metadata.py` — incorpora as quatro geometrias novas ao catálogo.
- `docs/climb_overworld_npcs_v2.md` — este relatório.

## Revisão visual final

**A ilha está visualmente pronta no escopo dos quatro NPCs.** Mestre, geóloga, chef e guia mantêm a mesma família visual, proporções originais, poses frontais estáticas, nitidez e recortes completos.

Foi corrigido um pequeno desalinhamento do chef: a ponta do bastão participava do cálculo horizontal da base. A âncora passou de `[121.5, 491]` para `[136, 491]`, calculada pelos dois calçados. Isso desloca somente o desenho cerca de **1,31 unidade lógica** para alinhar os pés à sombra e à posição física `(112, 224)`. O personagem não foi reposicionado no cadastro; colisão e interação permanecem iguais.

A geração dos metadados agora identifica os dois componentes principais dos calçados na faixa inferior, excluindo a ponta separada do bastão. Os resultados dos outros três personagens e de todos os NPCs de outras ilhas ficaram idênticos. A altura permanece **50** no Mestre e **44** nos demais, conforme o padrão do Overworld.

Conferência final no Chrome real, com perfil isolado e cache desativado: **31 verificações aprovadas de 31**, incluindo HTTP e `file://`, caminhada, colisões, quatro prompts/conversas, acesso à Escalada e retorno por derrota controlada. Os centros dos calçados coincidem com as quatro posições lógicas; a sombra mantém o mesmo deslocamento de 1 unidade em todos. Os recortes preservam margem transparente de 5 pixels em cada lado. Aproximadamente 60 FPS; zero 404, TypeError, ReferenceError ou erros/avisos de console. A inspeção ampliada em fundos verde e escuro não mostrou contorno branco ou deformação residual.

Nesta revisão foram atualizados os dois geradores de geometria, os três arquivos de metadados, a versão de cache do catálogo em `index.html` e este relatório. Nenhum PNG, outra ilha, código do minigame ou asset de outro esporte foi alterado.
