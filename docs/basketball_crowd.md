# Basquete — torcida procedural

> Registro da primeira integração. O acabamento atual e o placar eletrônico estão no [relatório de polimento](basketball_crowd_polish.md).

## Público e imagem antiga

**66 espectadores**, em **3 fileiras de 22**. Cabeça, corpo, cabelo, orelhas/antenas, roupa, braços e pés são retângulos de pixels. Há variações de altura, espécie, paleta, pose, fase de movimento e atraso de reação. O público distante é menor e possui menos detalhes.

A torcida antiga estava embutida em `basketball_assets/exported/basketball/arena/arena_basketball_background.png`, derivado de `skate_sprites/Arena_Basquete.png`. Não existia um PNG exclusivo de torcida no renderer ativo.

O renderer agora lê desse PNG **somente as regiões externas à faixa Y=95–186** da tela lógica 450×300: teto/placar acima e barreira/quadra abaixo. A faixa intermediária é reconstruída completamente por Canvas, incluindo assentos, degraus, corrimãos e espectadores. Nenhum pixel da torcida antiga é amostrado. Não existe fallback de público por PNG. Os arquivos físicos foram preservados; o PNG continua necessário para a arquitetura/quadra, não para desenhar espectadores.

## Animação e reações

- **IDLE:** balanço de um pixel, piscadas, acenos e palmas ocasionais com ritmos individuais.
- **RIM:** expectativa breve ao tocar o aro, limitada para não disparar a cada subpasso físico.
- **STEAL / BLOCK:** reação ligada ao roubo/toco realmente registrado, inclusive bloqueio de enterrada.
- **BASKET / THREE / SWOOSH:** intensidade crescente para cesta normal, três pontos e cesta limpa.
- **COMEBACK / CLUTCH:** reação maior à troca de liderança e a cestas nos últimos dez segundos.
- **TENSION:** agitação gradual quando restam até dez segundos e a diferença é de até três pontos.
- **VICTORY:** braços levantados, palmas, pequenos pulos e 28 partículas de confete. A animação continua na tela de resultado e volta suavemente ao idle.

Regiões à esquerda favorecem principalmente Zorp; à direita, o Mestre, com torcedores neutros e preferências variadas. O grupo do autor do lance comemora com mais força. Pequenos atrasos individuais evitam sincronização perfeita.

O tempo usa deltaTime em segundos. O gerador de aparência tem seed própria e não consome a aleatoriedade da partida. Há no máximo oito reações simultâneas e 28 partículas, com expiração automática. As poses são compartilhadas e feitas com formas simples.

Toda a torcida usa coordenadas inteiras e `imageSmoothingEnabled=false`, com clip limitado à arquibancada. É desenhada antes dos aros, jogadores, bola e HUD. Não possui colisores nem altera física, pontuação, cronômetro, alcance, IA, medalhas ou save. A tela de resultado ganhou apenas um escurecimento menos forte para deixar a comemoração visível.

## Validação

**13 cenários aprovados no Chrome real**, com loop completo do jogo: idle; cesta normal de 2; cesta de 3 por evento real da tecla J; Swoosh; Mestre marcando; partida apertada; cesta nos segundos finais; virada; rim-out; roubo; bloqueio; vitória de Zorp; vitória do Mestre. As demais situações usam condições iniciais controladas e as funções reais de física/eventos. Não é uma amostra de playtest humano.

O teste observou as chamadas de `drawImage`: o PNG da arena foi usado apenas em dois recortes, sempre excluindo a faixa de público. Capturas de idle, reações e resultados foram inspecionadas. Os grupos de torcida reagiram mais fortemente ao seu próprio jogador.

**FPS medido na sessão:** aproximadamente **60 FPS** nos 13 cenários. Médias observadas entre **59,99 e 60,00 FPS**; desenho da torcida entre **1,3 e 1,5 ms por frame**, aproximadamente. Medição do loop via `requestAnimationFrame` e do renderer via `performance.now()` em Chrome headless.

**Zero 404, TypeError, ReferenceError, exceções de execução ou falhas de carregamento.**

**94 testes automatizados aprovados**, incluindo os 78 testes anteriores de física/cestas e 16 novos da torcida. Cobertura de deltaTime em 30/60/120/144 Hz, preferências por lado, intensidades, tempos, expiração, limites de efeitos, recortes da imagem e isolamento da aleatoriedade do jogo.

## Arquivos desta etapa

- `basketball_crowd.js`: público, arquibancadas, recortes do cenário e reações.
- `basketball_1v1.js`: ligação aos lances, atualização e ordem de desenho.
- `index.html`: carregamento do módulo e versão de cache.
- `basketball_crowd.test.cjs`: testes novos.
- `basketball_court_physics.test.cjs`: carrega o novo módulo no ambiente simulado de regressão.
- `docs/qa/basketball_crowd/`: resultados, métricas e capturas.

Evidências: [13 cenários e FPS](qa/basketball_crowd/browser-results.json), [94 testes](qa/basketball_crowd/unit-tests.txt), [idle](qa/basketball_crowd/idle-start.png), [Swoosh](qa/basketball_crowd/swoosh-reaction.png), [vitória](qa/basketball_crowd/victory-zorp-reaction.png).
