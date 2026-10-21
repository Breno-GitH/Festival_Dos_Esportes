# Arquearia 2.0 — integração e validação

## Escopo

Somente sprites e apresentação dos arqueiros. Arena, área de movimento, controles,
velocidade das flechas, cooldown, IA, pontuação, duração da partida e entrega da
medalha continuam com as regras anteriores. O Mestre do Overworld mantém o seu
asset próprio (`arqueiro_overworld.png`). Nenhum PNG antigo foi apagado.

## Atlas

- Fontes: `zorp_arquearia2.0.png` e `mestre_arquearia2.0.png`, intactas.
- 44 frames por personagem, 88 no total.
- Dois atlas transparentes de 1536 × 1440, em `archery_assets/v2/`.
- Cada frame ocupa canvas de 192 × 240; anchor dos pés `[96, 228]`.
- Escala uniforme no jogo: `0.46`, sem ajuste por pose.
- Orientação única `BACK_UP`, sem espelhamento, rotação ou mira lateral.
- `imageSmoothingEnabled = false` no renderizador.
- Margem de segurança de 4 pixels nos sourceRects.
- Recortes encontrados por componentes dos pixels visíveis dentro das linhas de
  ações. Não foi usada divisão uniforme da folha em células para extrair corpos.
- Fundo branco conectado removido por flood-fill; vazios fechados do arco são
  isolados sem apagar a roupa branca, cabelos ou contornos escuros.

O manifesto JSON registra, para cada um dos 88 frames: `sourceRect` na folha,
`sourceAnchor`, `atlasRect`, `contentRect`, anchor normalizado e orientação.
As células uniformes existem apenas no atlas de saída.

## Estados e ligação à lógica atual

- `IDLE` — 4 frames: espera/tutorial.
- `READY` — 4: preparação visual enquanto aguarda.
- `WALK_UP` — 4: pequenos passos de posicionamento em WASD, mantendo as costas.
- `RAISE_BOW` — 4: erguer o arco durante a preparação.
- `DRAW_BOWSTRING` — 4: puxar a corda durante a preparação.
- `AIM` — 4: postura de mira para cima; Mestre usa seu alvo atual da IA existente.
- `RELEASE_SHOT` — 4: evento real de criação da flecha.
- `RECOVERY` — 4: recuperação visual após o disparo.
- `HIT_REACTION` — 3: reação ao acertar o alvo; a folha mostra gesto de sucesso.
- `MISS_REACTION` — 3: erro já detectado pela simulação e derrota na partida.
- `VICTORY` — 6: vencedor no resultado, executa uma vez e segura a última pose.

As animações usam segundos decorridos, independentes do refresh. A preparação
visual não acrescenta carga obrigatória: Espaço continua disparando imediatamente
quando o cooldown existente permite. Um disparo novo pode interromper a pose
anterior, preservando a responsividade e a cadência originais.

## Particularidades e correções dos recortes

- As folhas identificam explicitamente todos os 11 grupos; não houve ação
  inventada ou classificação silenciosa de pose lateral.
- No Mestre, os frames RECOVERY 2 e 3 encostam pelo contorno. Foram separados no
  vale de pixels em `x = 629`, sem apagar uma faixa entre os personagens.
- A janela de busca de RELEASE_SHOT começa em `y = 608` para preservar toda a
  ponta da flecha do terceiro frame do Mestre.
- A moldura inferior do título VICTORY foi excluída completamente; uma pequena
  sobra de borda identificada na inspeção ampliada também foi removida.
- Flechas, brilhos e sinais de reação realmente presentes na arte foram mantidos.
- HIT_REACTION não cria um sistema de dano: representa o acerto do alvo, pois a
  Arquearia atual não possui dano recebido pelos arqueiros.

## Limpeza

88 entradas de personagens antigos foram removidas dos manifestos compartilhados.
Os 89 registros de cenário, alvos, props, flechas e efeitos foram preservados,
comparados antes/depois por hash de seu conteúdo. O registro compartilhado agora
carrega 70 desses assets usados em runtime; os arqueiros usam somente os dois
atlas novos. O preparador antigo deixou de exportar personagens obsoletos.
Não existe fallback de personagem antigo.

## QA executado

Chrome real em modo headless, perfil de teste isolado, teclado automatizado por
CDP, cache desativado e inspeção das capturas. Não foi uma run humana manual.
Os testes também abriram o endereço Apache `http://localhost/2025/Festival_dos_Esportes/`
e o caminho `file:///C:/xampp/htdocs/2025/Festival_Dos_Esportes/index.html`.

18 verificações finais aprovadas:

1. Ilha e prompt do Mestre carregam.
2. E no Mestre abre o tutorial pelo fluxo existente.
3. Os dois atlas carregam, sem falha.
4. Assets compartilhados permanecem válidos.
5. Idle, preparação, levantar arco, puxar corda e mira aparecem no jogo.
6. WASD mantém movimento e usa passos de costas.
7. Disparo continua imediato, sem carga nova.
8. Release, recovery e erro aparecem após um disparo real.
9. Os 88 frames têm pixels, transparência nas bordas e anchors corretos.
10. Acerto real exibe HIT_REACTION e pontua pelo sistema existente.
11. Partida completa de 55 segundos termina normalmente.
12. Vitória usa os frames novos.
13. Espaço retorna à ilha.
14. Overworld continua ativo após o retorno.
15. Preview mostra as 22 combinações de personagem/ação.
16. Nenhum personagem antigo é requisitado.
17. Nenhum 404 ou falha de carregamento no teste.
18. Nenhum TypeError, ReferenceError ou warning da página no teste.

Duas partidas completas foram executadas. A segunda terminou em 940 × 683:
83 disparos e 31 acertos de Zorp; 21 disparos e 16 acertos do Mestre. Nenhuma
violação dos bounds, NaN ou draw inválido foi registrada. Média medida de cerca
de 60 FPS; capturas e automação causaram quedas pontuais, portanto a média não é
uma garantia de desempenho em qualquer máquina.

Uma leitura inicial de HIT_REACTION ocorreu depois de a pose terminar. O teste
foi ajustado para observar a reação dentro de sua janela e passou na repetição;
não foi necessário modificar a regra de acerto.

## Arquivos desta etapa

Modificados:

- `index.html` — carregamento do manifesto/renderizador e versões de cache.
- `script.js` — hooks visuais, desenho e diagnóstico da Arquearia.
- `archery_asset_registry.js` — retirada do carregamento de personagens antigos.
- `archery_assets/archery_assets_manifest.js` e `.json` — apenas assets compartilhados.
- `tools/prepare_archery_assets.ps1` — preparador compartilhado sem personagens antigos.

Criados:

- `archery_characters_v2.js`.
- `tools/prepare_archery_v2.py`.
- `archery_assets/v2/zorp_atlas.png` e `master_atlas.png`.
- `archery_assets/v2/characters_manifest.js` e `.json`.
- `docs/archery_sprite_atlas.html` — preview, pausa e seleção de frame.
- `docs/archery_zorp_v2_preview.png` e `archery_master_v2_preview.png`.
- `docs/archery_v2_mapping.md` — sourceRects completos.
- Este relatório.

Os arquivos oficiais adicionados pelo usuário não foram alterados.
