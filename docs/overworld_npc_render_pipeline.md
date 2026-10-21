# Renderização dos NPCs do Overworld — consolidação

## Escopo e diagnóstico

O trabalho desta etapa foi no pipeline de desenho, sem redesenhar ilhas, substituir PNGs ou alterar gameplay.

Não foi reproduzido stretch X/Y na versão de partida: os quatro NPCs novos da Escalada já usavam escala uniforme. Foram identificadas e corrigidas brechas concretas:

- o cache era indexado apenas pela `Image`, de modo que dois personagens usando a mesma instância de uma spritesheet podiam receber o mesmo recorte;
- o preparo não validava se o tamanho original do PNG correspondia ao atlas;
- recortes, máscaras, áreas úteis e âncoras não tinham validação estrutural antes de `drawImage`;
- o caminho de desenho do Basquete ainda calculava proporção por `image.width` e `image.height`, que são atributos alteráveis do elemento, em vez das dimensões naturais do PNG.

Não é possível atribuir com certeza o episódio antigo do Mestre da Arquearia a uma versão de código sem reproduzir aquele estado. O Mestre atual foi validado com o mesmo cálculo proporcional e as mesmas proteções aplicadas à Escalada.

## Pipeline consolidado

1. `drawNPC()` encaminha o desenho para os renderizadores do Overworld.
2. O atlas seleciona explicitamente o personagem. Uma folha com vários personagens exige `spriteKey`; uma seleção ambígua não usa silenciosamente o primeiro frame.
3. `validateOverworldNpcGeometry()` confere tamanho original contra `naturalWidth/naturalHeight`, limites do recorte, dimensão útil, padding, âncora dos pés e retângulos da máscara de alpha.
4. Dados incompatíveis são rejeitados antes do desenho, sem tentar encaixar o PNG em dimensões arbitrárias. A ocorrência fica disponível em `getOverworldDiagnostics().renderIssues` e gera um único aviso por problema.
5. A geometria válida é congelada para impedir alterações acidentais posteriores.
6. O cache separa cada geometria dentro de uma mesma `Image`. Trocar a origem ou as dimensões naturais invalida as superfícies antigas.
7. O recorte é copiado para um Canvas na proporção original. A máscara de alpha é aplicada uma única vez ao cache.
8. `overworldNpcDrawBounds()` calcula um único fator: **altura desejada / altura útil do personagem**. Esse fator multiplica largura e altura. A âncora é descontada nas mesmas unidades para apoiar os pés na posição lógica do NPC.
9. Tanto o preparo quanto o desenho usam `imageSmoothingEnabled = false`.

O Basquete usa o mesmo cálculo proporcional e a validação de frame, preservando sombra, enquadramento e arredondamento de posição anteriores. A comparação de pixels confirmou que sua aparência não mudou.

As hitboxes e áreas de interação continuam independentes da imagem, sem usar largura bruta do PNG, margens transparentes, cabelos ou equipamentos para definir colisão.

## Recortes da Escalada

Os quatro recortes já medidos pelos pixels foram preservados. Não há divisão em células uniformes nem desenho da folha inteira:

- Geóloga: `[27, 269, 304, 496]`, chave `climb_v2_geologa`, posição `(365, 176)`, altura útil em tela 44.
- Mestre: `[443, 256, 276, 509]`, chave `climb_v2_mestre`, posição `(225, 168)`, altura útil em tela 50.
- Chef: `[1196, 275, 280, 492]`, chave `climb_v2_chef`, posição `(112, 224)`, altura útil em tela 44.
- Guia: `[799, 271, 310, 495]`, chave `climb_v2_guia`, posição `(87, 166)`, altura útil em tela 44.

O formato é `[x, y, largura, altura]` em pixels da folha `npcs_escalada2.0.png`. As âncoras são bottom-center nos pés. Todos mantêm footprint físico de **18 × 8**. As áreas de interação continuam **58 × 62** no Mestre e **44 × 48** nos demais.

## Contorno branco

A limpeza específica da folha nova foi mantida: máscaras de alpha removem o matte claro externo e os pequenos resíduos identificados no cabelo da geóloga. As regiões claras internas de roupas, olhos e equipamentos são preservadas.

Não há aplicação global de color-key branco, outline novo ou filtro que modifique o desenho. O renderizador reutiliza os recortes limpos do cache, com as dimensões e máscaras validadas. Os PNGs originais e seus metadados não foram alterados nesta etapa.

## Mestre da Arquearia

O NPC `mestre_arco_overworld`, em `(225, 118)`, continua usando somente `mestre_arquearia2.0_overworld.png` no Overworld.

- Recorte `[330, 86, 666, 1078]`.
- Escala X = escala Y = `0,04664179104477612`.
- Base visual dos pés exatamente em `(225, 118)`.
- Prompt existente e interação que abre o tutorial preservados.
- Sprite do minigame e sua lógica não foram modificados.

O teste também alterou temporariamente os atributos `width` e `height` das imagens do Mestre da Arquearia, do Mestre da Escalada e do Basquete no perfil isolado: o desenho permaneceu idêntico, pois o cálculo usa dimensões naturais e geometria validada.

## Testes reais no navegador

Chrome real em modo headless, teclado por CDP, perfil de teste separado e cache desativado. **39 verificações aprovadas de 39**.

Na Escalada:

- acesso pela ponte da Arquearia, caminhada até cada NPC e saída da ilha;
- quatro personagens novos distintos, frontais, reconhecíveis e sem contorno branco na inspeção visual, incluindo ampliação em fundos verde e escuro;
- escalas X/Y iguais, sem rotação, inversão ou smoothing;
- pés coincidindo com posições lógicas e sombras preservadas;
- colisões dos corpos funcionando, caminho principal e ponte livres;
- prompts e conversas de guia, chef e geóloga;
- E abre tutorial da Escalada e Espaço inicia o minigame;
- resultado de derrota controlado retorna normalmente à ilha com os quatro NPCs corretos;
- smoke test equivalente em `file://`, sem depender de leitura de pixels da imagem durante o jogo;
- aproximadamente **60 FPS**, medidos em 120 intervalos de animação.

No pipeline global:

- comparação antes/depois dos desenhos dos **18 NPCs**: pixels idênticos;
- posições, alturas, falas, hitboxes e áreas de interação dos 18 preservadas;
- quatro personagens compartilhando deliberadamente uma única `Image`: quatro superfícies distintas, pixels corretos e cache reutilizado por recorte;
- troca da URL da imagem invalida o cache sem mudar os pixels corretos;
- validação rejeita tamanho de origem incompatível, crop negativo/fora da imagem, altura útil zero, âncora inválida, máscara fora dos limites e destino NaN;
- Mestre da Arquearia visitado no Overworld, prompt validado e tutorial aberto pela interação;
- Canvas conferido em viewports 1280 × 900, 900 × 900 e 600 × 900: `object-fit: contain`, `image-rendering: pixelated`, sem transformação CSS e sem esticar o conteúdo;
- **zero 404, falhas de carregamento, TypeError, ReferenceError ou avisos/erros de console** nos fluxos válidos testados.

O retorno da Escalada foi validado com derrota controlada pela função existente. Não houve run completa até o cume nesta etapa de renderização. O save real do jogador não foi utilizado.

## Integração de futuros PNGs

Registrar cada imagem/frame no atlas com tamanho de origem real, recorte útil, âncora dos pés e altura útil medida. Folhas com múltiplos personagens precisam de uma chave por personagem. Ao substituir a arte por outra resolução, regenerar a geometria antes de atualizar o preload. Um atlas incompatível é sinalizado; não há reaproveitamento silencioso de recorte antigo nem deformação para caber em uma caixa fixa.

## Arquivos modificados nesta etapa

- `overworld_visuals.js` — validação, cache por geometria, invalidação, imutabilidade, cálculo proporcional compartilhado e diagnóstico.
- `script.js` — `drawNPC()` delega o desenho e deixa de manter o cálculo duplicado.
- `index.html` — versões dos dois scripts atualizadas para evitar cache antigo.
- `docs/overworld_npc_render_pipeline.md` — este relatório.
