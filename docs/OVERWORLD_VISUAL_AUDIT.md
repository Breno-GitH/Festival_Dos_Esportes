# Overworld — padronização visual e auditoria por ilha

## Resultado geral

Foram revisadas nove cenas: o Hub e oito ilhas esportivas. A ilha do Basquete
foi preservada como referência. As demais receberam uma base visual comum,
mantendo seus próprios esportes, personagens, marcos e conexões.

O padrão compartilhado usa a plataforma chanfrada do Basquete: base de
418 × 264 px, borda azul-marinho/ciano, luzes douradas discretas, conexões de
40 px, materiais com textura leve e espaço central livre. Chão de praia e campo
mantém textura natural; o quadriculado fica nos pisos construídos.

### NPCs e escala

- Basquete: mantidos os 54 px nominais do PNG, equivalentes a aproximadamente
  49,89 px de personagem visível. Sprite, posição, sombra e interação intactos.
- Sete outros Mestres: **50 px de conteúdo visível**, sem esticar proporções.
- Nove NPCs de apoio: **44 px de conteúdo visível**.
- Nas ilhas revisadas: âncora inferior central, margem de segurança de 2 px e
  sombra igual à referência. Não há processamento de pixels a cada frame.
- Colisão física dos NPCs revisados: **18 × 8 px nos pés**, independente de PNG,
  cabelo, antenas, braços ou acessórios. Interação separada: Mestres 58 × 62 px;
  demais NPCs 44 × 48 px, com offset vertical de 14 px.
- A camada de personagens usa ordenação pelos pés nas ilhas revisadas. A ordem
  de desenho original foi mantida no Basquete.
- As silhuetas dos NPCs foram verificadas sem sobreposição entre participantes.
- O catálogo mede pixels reais de 16 fontes existentes; nenhum sprite foi
  inventado ou redesenhado. O sprite do Basquete permanece fora desse catálogo.

## 1. Hub — `HUB`

**Antes:** pequena ilha circular de 190 px, caminhos retangulares cinzentos,
bancos ultrapassando a base e acabamento muito inferior ao das ilhas esportivas.

**Ajustes:** plataforma com a mesma extensão e recorte do Basquete; praça central
com emblema do festival; quatro caminhos de 40 px; bancos com assento/pernas,
canteiros integrados, juntas leves e iluminação do perímetro.

**Mantido:** função de ligação norte/sul/leste/oeste, Turista e Guia, seus diálogos
e as posições dos dois NPCs: (180,180) e (270,130).

**Removido/substituído:** base circular pequena, bancos como blocos sem suporte
e canteiros desconectados. Seus colisores agora acompanham a nova implantação.

**NPCs:** `npc_turista.png` e `npc_guia.png`, nominal 48 → 44 px visíveis;
âncoras e margens corrigidas pelo catálogo. Não existe Mestre nesta cena.
Hitboxes físicas e interação independentes. Prompt identifica quem fala;
o texto completo permanece legível depois de soltar E.

**Teste:** movimento, conversas, quatro saídas e quatro retornos aprovados;
os dois NPCs são alcançáveis a partir das quatro entradas.

## 2. Basquete — `ILHA_BASQUETE`

**Antes/referência:** plataforma chanfrada, quadra texturizada, bordas ciano,
luzes douradas, bom espaço de circulação e Mestre em escala legível.

**Ajustes:** nenhum ajuste visual, de NPC, prompt, colisão ou implantação.

**Mantido integralmente:** quadra, madeira, linhas, cestas, banners, bolas,
marcação do Mestre, água, conexão oeste e ordem original de desenho.
Nenhum elemento foi removido.

**Mestre:** `basketball_assets/exported/master_basket/idle/master_basket_idle_01.png`,
54 px nominais, (225,82), interação 62 × 62 px sem novo offset. Sem recorte novo.

**Teste:** comparação de captura com relógio e posição do jogador fixos confirmou
**igualdade pixel por pixel** com o estado anterior. Função de render, registro do
NPC e módulo do minigame também foram verificados. Entrada, início da partida e
retorno por Escape aprovados. A conexão com Skate funciona nos dois sentidos.

## 3. Boxe — `ILHA_ESQUI`

O identificador histórico `ILHA_ESQUI` continua sendo a ilha do **Boxe**; não foi
criada outra modalidade nem alterado o alias compartilhado de medalhas.

**Antes:** base retangular escura, faixas laterais muito saturadas, banner de
largura excessiva e NPCs de apoio quase do tamanho do Mestre. Árbitro e pugilista
ficavam muito próximos de elementos de treino.

**Ajustes:** fundação chanfrada, acabamento e iluminação comuns; piso emborrachado
mais harmônico; faixa de título compacta; marca de anfitrião. Árbitro deslocado
para (345,130) e pugilista para (98,186), com mais separação entre as silhuetas.

**Mantido:** ringue central e suas cordas, vão de acesso ao sul, sacos de pancada,
setores de treino/oficiais, troféu e conexão sul. Arena e combate do minigame
`JOGO_BOXE` não foram alterados.

**Removido:** enquadramento retangular antigo e banner excessivo. O preload do
antigo Mestre do Gelo, já sem uso, saiu do carregamento; o PNG foi preservado.

**Mestre:** `npc_mestre_novo.png`, 50 px visíveis, (225,110), escala preservada.
Treinador, Árbitro e Pugilista: 50 → 44 px. Novos footprints/interações do padrão
comum. O diálogo do Árbitro foi corrigido para explicar queda/contagem/KO,
em vez de afirmar que qualquer HP zero encerra imediatamente a luta.

**Teste:** quatro NPCs acessíveis pela entrada sul; três conversas, prompt do
Mestre, abertura de `JOGO_BOXE` e retorno à ilha aprovados.

**Correção de interação:** o alcance do Treinador podia interceptar uma conversa
com o Pugilista. Nas ilhas revisadas, entre candidatos válidos, a interação agora
escolhe o NPC mais próximo. A seleção original do Basquete foi preservada.

## 4. Ping-Pong — `ILHA_PINGPONG`

**Antes:** já havia uma plataforma chanfrada, mas o piso e as divisórias tinham
cores muito saturadas; o placar era redesenhado pelo renderer genérico como 00/00
por cima do placar detalhado da ilha.

**Ajustes:** base, luzes e ligação entre ilhas do padrão comum; piso verde menos
saturado, setor de competição azul harmônico e moldura do anfitrião.

**Mantido:** mesa, cavaletes, rede, raquetes, bolas, cesto, placar e área do Aprendiz;
saídas oeste para Hub e norte para Surf.

**Removido:** segundo desenho genérico do placar. O placar detalhado 11/09 da
própria ilha passou a ser a única apresentação.

**Mestre:** `npc_mestre_ping_pong.png`, 48 → 50 px visíveis; (225,80) → (225,105).
Aprendiz `npc_aprendiz.png`: 48 → 44 px, posição mantida (150,220).
Hitboxes/prompt seguem o padrão comum, com conversa persistente do Aprendiz.

**Teste:** os dois NPCs acessíveis por ambas as entradas; conversa, abertura de
`JOGO_PINGPONG` e retorno pelo fluxo de resultado + Espaço aprovados.

## 5. Skate — `ILHA_SKATE`

**Antes:** base cinza de skatepark destoava da moldura das demais ilhas. Rail,
ledge/banco e cones recebiam um segundo desenho genérico por cima do desenho
específico da ilha.

**Ajustes:** fundação/ciano/luzes comuns, concreto de tom mais harmônico, canteiros
com moldura, marca de anfitrião e pequeno acento ciano no rail.

**Mantido:** quarter-pipe, coping, deck, grafite, rail com pernas, ledge, skates,
dois cones e conexões norte/oeste/leste. A pista e a gameplay não mudaram.

**Removido:** desenhos duplicados do renderer genérico. Colisores continuam
existindo sem gerar uma segunda representação visual.

**Mestre:** `mestre_skate.png`, 54 → 50 px visíveis; (225,80) → (225,105).
Recorte medido [2,2,750,1364], sem distorção, com footprint/interação separados.
Prompt e nome foram corrigidos de `mestre_skate` para **MESTRE DO SKATE**.

**Teste:** acesso ao Mestre pelas três entradas, abertura de `JOGO_SKATE`, retorno
por Escape e conexões com Hub/Corrida/Basquete aprovados.

## 6. Arco e Flecha — `ILHA_ARCO`

**Antes:** gramado verde muito vivo, orla retangular e caminhos sem a linguagem
da plataforma de referência. O Mestre, com 72 px nominais, dominava a cena.

**Ajustes:** moldura comum, gramado mais natural, caminho de tom neutro/terroso,
marca do Mestre e placa de modalidade com acabamento de evento esportivo.

**Mantido:** alvos, bandeirolas, fardos, cavalete, caixa de flechas, arco apoiado;
entradas leste e norte e circulação central livre.

**Removido/substituído:** orla retangular e recorte manual antigo com grandes
margens. Não houve remoção dos recortes oficiais usados nos alvos do minigame.

**Mestre:** `arqueiro_overworld.png`, 72 → 50 px visíveis, posição mantida (225,118).
Recorte real [352,113,622,1081]; acessórios preservados. Interação antiga 58 × 76
com offset 12 → padrão 58 × 62 com offset 14. Footprint nos pés, separado do arco.
Prompt identifica o Mestre; instrução esportiva foi mantida.

**Teste:** acesso por leste e norte, abertura de `JOGO_ARCO`, retorno pelo fluxo
de resultado e conexões com Hub/Escalada aprovados.

## 7. Corrida — `ILHA_CORRIDA`

**Antes:** pista terracota muito saturada com curvas retangulares, borda verde
desconexa. Estação de água e pódio tinham colisores em posições diferentes do
desenho. O Mestre era grande, e o tratamento antigo apagava todos os pixels pretos.

**Ajustes:** base comum, tartan harmônico e raias com curvas; gramado suavizado,
placa/acolhimento do Mestre. Colisores da água e do pódio reposicionados para
(94,88,36,12) e (94,178,42,23), respectivamente.

**Mantido:** raias, infield, linha/pórtico de chegada, água, pódio, barreiras,
cones de demarcação e saída leste para Skate.

**Removido:** chroma-key indiscriminado e segundo desenho da estação de água.
O original é preservado; uma máscara de fundo conectada às bordas limpa somente
o fundo externo numa cópia em Canvas, preparada uma única vez.

**Mestre:** `skate_sprites/mestre_corrida_npc.png` (caminho histórico preservado),
62 → 50 px visíveis; (225,88) → (225,106). Recorte [309,96,635,1064]. Interação
78 × 68 → 58 × 62 com offset 14; footprint não inclui cabelo/efeitos.

**Teste:** acesso pela entrada leste, prompt, abertura de `JOGO_CORRIDA`, retorno
por Escape e ligação com Skate aprovados.

## 8. Escalada — `ILHA_ESCALADA`

**Antes:** terreno marrom/verde em blocos, rochas circulares e árvores triangulares
simples; Mestre muito alto na composição, sobrepondo portal/montanha.

**Ajustes:** fundação comum, solo mineral e vegetação harmônicos, rochas facetadas
com sombra e coníferas em camadas; trilha e área de recepção mais claras.

**Mantido:** montanhas, cumes, dois paredões com agarras/cordas, portal, trilha,
acampamento, equipamentos e entrada sul. Guia, Geóloga e Chef continuam presentes.

**Removido/substituído:** desenhos genéricos das rochas/árvores. Preloads de
Alpinista, Fotógrafo, Atleta, Iniciante e Guarda, todos sem referência de uso,
foram retirados; seus PNGs não foram apagados.

**Mestre:** `npc_mestre_escalada.png`, 48 → 50 px visíveis; (225,70) → (225,108).
Apoio: `npc_guia_trilha.png`, `npc_geologa.png`, `npc_chef.png`, todos 44 px;
posições preservadas. Footprints e prompts padronizados.

**Correção funcional:** Espaço pressionado no resultado podia retornar e reabrir
o jogo imediatamente. O overworld revisado exige uma nova borda de interação;
o código da escalada não foi alterado. Basquete mantém sua lógica anterior.

**Teste:** quatro NPCs acessíveis pela entrada sul, três conversas legíveis,
abertura de `JOGO_ESCALADA`, retorno por resultado + Espaço e conexão com Arco
aprovados, inclusive depois de soltar a tecla.

## 9. Surf — `ILHA_SURF`

**Antes:** boa identidade de praia, mas base, escala do Mestre (84 px) e props
grandes faziam a ilha parecer de outro conjunto visual.

**Ajustes:** plataforma litorânea com a mesma moldura do festival, areia sem grade
de concreto, deck de madeira compacto e conexão sul de 40 px. Palmeiras 112 →
80 px, guarda-sol 94 → 64, toalha 55 → 34, cooler 54 → 32 e placa 74 → 52.

**Mantido:** praia, areia, palmeiras, guarda-sol, toalha, cooler, placa, deck e
identidade do Mestre. O mar e o minigame Surf permanecem separados desta cena.

**Removido/substituído:** orla fora do padrão e deck/placa antigos; nenhum PNG de
praia foi excluído. Os pequenos colisores de apoio dos props foram preservados.

**Mestre:** `surf_assets/mestre_surfing_overworld.png`, 84 → 50 px visíveis;
(225,140) → (225,112). Recorte [12,12,541,1180]. Interação 46 × 70 com offset 8
→ padrão 58 × 62 com offset 14. Pés no deck, sem a margem transparente deslocar
o contato. Prompt identifica o Mestre e preserva sua instrução.

**Teste:** acesso pela entrada sul, abertura de `JOGO_SURF`, retorno por Escape e
ligação com Ping-Pong aprovados.

## Validação final e limites

- Chrome, endereço HTTP do projeto e reload sem cache.
- Nove cenas e 17 participantes carregados; oito entradas e retornos de minigame
  aprovados com eventos de teclado no navegador.
- Nove conversas de apoio verificadas após soltar E.
- 28 verificações de navegação entrada → NPC aprovadas, usando os colisores reais.
- 16 travessias entre ilhas aprovadas com movimento real.
- Basquete idêntico pixel por pixel; 85 funções protegidas do script e módulos
  dos minigames preservados por comparação de conteúdo.
- Zero 404, TypeError, ReferenceError, outras exceções ou warnings no teste HTTP.
- Aproximadamente 60 FPS no teste local do overworld.
- Os testes de retorno de Ping-Pong/Arco/Escalada usaram estados de resultado
  preparados para exercitar o fluxo existente; não equivalem a jogar partidas
  completas de todos os esportes.
- Persistem diferenças de traço das artes originais: Skate, Arco e Corrida são
  mais detalhados que alguns NPCs antigos. Escala, contato, paleta da ilha e
  acabamento foram unificados; redesenhar esses personagens ficou fora deste passe.
- Nenhuma arte de personagem foi inventada, nem foram apagados PNGs compartilhados.

## Arquivos modificados/gerados

- `script.js`: render das ilhas revisadas, cadastro de NPCs/props, desenho/ordem de
  personagens, footprints e interação. Função da ilha do Basquete preservada.
- `index.html`: catálogo/módulo visual do overworld e versão de cache do script.
- `overworld_visuals.js`: linguagem visual compartilhada, preparo/cache de sprites
  e geometria de NPCs, com exclusão explícita do Basquete.
- `overworld_assets/npc_geometry.js` e `.json`: metadados de pixels/âncoras/máscara.
- `tools/prepare_overworld_npc_metadata.py`: regeneração dos metadados sem editar PNGs.
- `tools/verify_overworld_qa.js`: auditoria atual sem depender de Git ou das regras
  antigas que congelavam ilhas que agora foram autorizadas para revisão.
- `overworld_assets/before_audit.json`, `baseline_reference.json`, `browser_qa.json`:
  estado anterior, referências protegidas e evidências de runtime.
- Este relatório e prévias comparativas em `docs/overworld_before.png` e
  `docs/overworld_after.png`, além da revisão de âncoras `docs/overworld_npcs.png`.

## Prévias

[Antes](overworld_before.png) · [Depois](overworld_after.png) · [NPCs e âncoras](overworld_npcs.png)

## Como conferir

Abra pelo XAMPP em `http://localhost/2025/Festival_dos_Esportes/`.
Execute `node tools/verify_overworld_qa.js` para conferir as referências e o
registro final. O relatório bruto registra os cenários controlados e os resultados;
o validador não substitui uma nova sessão no navegador após futuras mudanças.
