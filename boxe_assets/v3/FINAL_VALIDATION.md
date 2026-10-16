# Boxe 3.0 — validação final após limpeza

Foram removidos 509 arquivos exclusivos de boxe sem uso, liberando 38.936.088 bytes. O inventário e o SHA-256 de cada arquivo estão em `../cleanup_audit.json`.

## Resultado dos testes no navegador

- [x] 1. Entrada pelo Mestre no overworld abre o boxe em READY e inicia a luta.
- [x] 2. Zorp utiliza exclusivamente recortes de `zorp_boxe3.0.png`.
- [x] 3. Mestre utiliza exclusivamente recortes de `mestre_boxe3.0.png`.
- [x] 4. Juiz utiliza exclusivamente recortes de `juiz_boxe3.0.png`.
- [x] 5. Os 91 sprites ativos têm margem transparente e anchor correto; inspeção visual não encontrou cortes.
- [x] 6. Idle e passos aparecem corretamente, com proporções coerentes.
- [x] 7. J e K mostram poses distintas de soco da frente e cross/outro braço. A anatomia esquerda/direita não é rotulada pela fonte.
- [x] 8. SHIFT mostra a guarda e reduz o dano do jab de 6 para 2 HP.
- [x] 9. ESPAÇO mostra a esquiva; o golpe evitado não causou dano e abriu a janela de counter.
- [x] 10. L executa o gancho atual, com preparação, pose de golpe e arco de impacto. A fonte não possui sequência exclusiva inequívoca de gancho/uppercut.
- [x] 11. Acertos exibem reação de dano e reduzem HP (J: 6, K: 12, L: 17).
- [x] 12. Poses machucadas são selecionadas em 60 e 20 HP; a postura saudável aparece em 100 HP.
- [x] 13. Knockdown interrompe o combate e leva à queda; a primeira recuperação retornou com 30 HP.
- [x] 14. Juiz aproxima, observa agachado durante a contagem e sinaliza o resultado.
- [x] 15. Vitória do Zorp, finalização e medalha funcionam; vitória do Mestre mostra sua comemoração e a derrota do Zorp.
- [x] 16. Zero respostas HTTP 404; nenhum dos 509 arquivos removidos foi requisitado.
- [x] 17. Zero TypeError no jogo.
- [x] 18. Zero ReferenceError no jogo.
- [x] 19. Zero warnings relevantes e zero erros de console do boxe.
- [x] 20. Saída para a ilha, aproximação do NPC e reentrada funcionam. R reinicia corretamente tanto após vitória quanto após derrota.

Foram executados 300 desenhos de frames e direções, além de testes com teclado no loop real do navegador. As quedas foram aceleradas reduzindo HP antes do golpe; a contagem, a recuperação, os dois resultados e a finalização ocorreram normalmente. O ambiente bloqueou a fonte externa do Google já existente; nenhum recurso de boxe falhou.

## O que foi removido

- 112 sprites/fontes, retratos, efeitos e telas antigos na raiz, incluindo as três folhas 2.0 e apresentações anteriores.
- 336 arquivos de recortes, previews, cópia de arena e manifestos anteriores ao conjunto atual.
- 59 recortes 3.0 sem referência em nenhuma ação atual, incluindo poses ambíguas que não entravam no jogo.
- Duas ferramentas antigas de preparação. Não há comando alternativo regenerando versões obsoletas.

## O que foi preservado e corrigido

- Três folhas oficiais 3.0 como entradas do preparador; 91 recortes ativos, seus manifests e prévias atuais.
- Arena atual, quatro NPCs, saco de pancadas e medalhas utilizados no fluxo do jogo.
- Preparador 3.0 corrigido para exportar apenas os frames usados. O validador antigo foi atualizado para o catálogo 3.0 e verifica a ausência de exports soltos.
- Documentação e auditorias antigas foram atualizadas. Somente a versão do manifest foi alterada no index (3.0.1), pois os PNGs usados e a lógica do combate não mudaram.

## Arquivos alterados

- `index.html`: versão do catálogo.
- `tools/prepare_boxing_sprites_v3.py`: exportação apenas de poses utilizadas.
- `tools/validate_boxe_assets.ps1`: validação do formato atual.
- `boxe_assets/v3/boxing_v3_manifest.json`, `boxing_v3_manifest.js`, `validation.json` e três previews JPG: somente os frames ativos.
- `boxe_assets/v3/preview.html`, `MAPPING.md`, `browser_qa.json` e este relatório.
- `boxe_assets/boxe_integration_audit.json` e `boxe_assets/cleanup_audit.json`.

`script.js`, `boxing_arena.js`, os controles, o combate, o overworld e os outros minigames não precisaram de alterações nesta limpeza.
