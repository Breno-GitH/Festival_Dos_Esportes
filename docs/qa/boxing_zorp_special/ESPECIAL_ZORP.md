# Especial do Zorp — weave contextual

## Como ficou no jogo

O ativa o especial quando a barra está em 100% e o cooldown terminou. A ativação consome a barra inteira e inicia cooldown de 3 segundos. Ataque em andamento, hitstun, guarda quebrada, recovery ou falta do asset impedem a ativação sem gastar carga.

### Uso normal: avanço oscilante e final forte

- Zorp alterna poses próprias de agachamento e retorno da folha especial, avançando fisicamente em X por 42 passos (~0,7 segundo).
- O avanço é lento, respeita o piso e as colisões. Não reposiciona o Mestre, não teleporta e não corrige profundidade automaticamente.
- Depois do weave, executa uma preparação curta e um soco final: 26 de dano, recuo de 18 pixels antes dos limites da arena e impacto maior que o pesado comum.
- O Mestre pode defender parcialmente: o dano cai para 7 e a guarda recebe 72 de pressão. Se já estiver desgastada, pode quebrar.
- A versão normal não dá invulnerabilidade geral. Zorp pode ser interrompido; fora de alcance ou de linha, o soco erra e deixa 12 passos extras (~0,2 s) de recovery.

### Uso counter: leitura, esquiva e seis socos

- A versão counter só é escolhida se há um ataque real do adversário em direção a Zorp, dentro de alcance e profundidade, a até 6 passos (~100 ms) de contato ou ainda na janela ativa.
- Zorp primeiro usa as poses de weave para evitar aquele ataque específico. A sequência não é concedida apenas por apertar O: a evasão do contato precisa ser confirmada.
- Se a ameaça for cancelada antes de acontecer, não há seis socos gratuitos; o especial termina em recuperação.
- Após a esquiva confirmada, Zorp aproxima-se fisicamente e executa direita → esquerda → direita → esquerda → direita → esquerda.
- Cada contato é calculado pelo mesmo sistema de alcance e profundidade. Os cinco primeiros causam 5; o último, 9: total de 34 quando os seis conectam.
- Após o primeiro acerto, o hitstun é renovado entre os socos. O Mestre não consegue agir no meio da sequência. O último tem maior recuo e impacto.
- Um KO encerra a sequência antes de atingir um personagem já derrotado. Não há dano em cadáver nem travamento permanente.

### Barra e ritmo

- A barra começa vazia em cada luta e aparece abaixo do HUD de Zorp. Em 100%, sem cooldown, muda de cor e mostra O ESPECIAL PRONTO.
- Enche com golpes comuns acertados, golpes recebidos, bloqueios e trocas próximas; também há ganho lento durante combate ativo a distância de luta.
- Valores de base: acerto leve +8; pesado +12; receber dano concede 0,65×dano +3; bloqueio próprio +3; golpe próprio bloqueado +4; erro próximo +1,5; atividade próxima +2,1 por segundo.
- Os golpes do próprio especial não recarregam a barra; ela também não recarrega durante sua execução. Briefing, pausa, resultado e distância excessiva não dão carga passiva.
- Segurar O ou repetir o input não cria novas ativações. A carga e o cooldown continuam sendo validados pelo ponto de extensão existente.

### Visual

- Arquivo oficial utilizado: zorp_boxe3.0_especial.png, encontrado em RGB, 1254×1254, com matte preto. O PNG original não foi regravado.
- Foram selecionadas sete poses úteis, por bounds reais e separadores que seguem os vazios entre figuras. Não foi usada uma grade uniforme.
- O fundo preto ligado à borda é excluído por máscaras de origem; detalhes pretos internos, como olhos e roupa, são preservados. Restos desconectados de poses vizinhas são excluídos.
- As poses problemáticas da última fileira e uma pose com contato de bota foram deixadas fora do runtime.
- O atlas contém sourceRects, pontos de contato dos pés e tiras do PNG original. O Canvas monta e guarda cada frame uma única vez, sem leitura de pixels durante o jogo.
- Todos os frames usam escala uniforme 0,52 na preparação para o mesmo canvas 320×224 dos sprites normais, anchor (160,210), seguida da mesma escala visual do lutador. Antenas, luvas e pés permanecem completos.
- Não há espelhamento para falsificar mãos: as poses complementares de soco são alternadas; apenas o facing normal do combate orienta Zorp para o adversário.
- Até três sombras de movimento discretas são desenhadas por código. O último soco recebe som e impacto próprios, mantendo a pausa de contato curta.

## QA

73 testes integrados aprovados: 32 da base/gameplay, 17 do especial e 24 do briefing. Incluem acerto, defesa, erro de profundidade/distância, interrupção, contexto do counter, ameaça cancelada, seis contatos alternados, hitstun entre golpes, cooldown, consumo e ganhos de carga, falta de asset, KO e equivalência em 30/60/144 FPS.

No navegador real, com origem/perfil isolados e teclado enviado por automação:

- Briefing carregou com o novo comando O.
- Barra vazia impediu ativação; acerto, dano recebido e combate próximo recarregaram.
- Normal acertando: Mestre 100 → 74.
- Normal defendido: Mestre 100 → 93.
- Normal fora da profundidade: Mestre permaneceu com 100; recovery de erro observado.
- Counter: Zorp permaneceu com 100; Mestre 100 → 66; ordem R/L/R/L/R/L confirmada; hitstun positivo em todos os contatos.
- Sete superfícies transparentes validadas: cantos alpha zero, sem folha inteira, anchor comum e sem caixa preta. Escala e ausência de resíduos revisadas visualmente.
- Uma luta completa com IA também terminou por KO, usando recarga e ativações durante a luta.
- Zero 404, TypeError, ReferenceError ou outras falhas de JavaScript/carregamento registradas.

Os cenários do especial usam carga completa em fixtures controladas para testar cada contexto; os ganhos naturais são validados separadamente e também na luta completa. O save normal do jogador não foi utilizado.

## Arquivos

- boxing_zorp_special.js: lógica contextual, carga, preload, cache, seleção de poses e sombras.
- boxing_zorp_special_atlas.js: mapa dos sete recortes e máscaras de origem.
- boxing_arena.js: integração com contatos, interrupção, HUD e estado do combate.
- boxing_presentation.js: som e intensidade do golpe final.
- pre_game_brief_configs.js: comando O e dica de timing.
- index.html: carregamento e versões de cache.
- boxing_special.test.cjs: cobertura do especial.
- tools/prepare_boxing_zorp_special.py: geração reproduzível do atlas, máscaras e prévia a partir do PNG original.

O mapa completo dos sourceRects está em atlas-validation.json; capturas e registros em browser-results.json e integration-tests.txt.
