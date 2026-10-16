# Boxe — sprites oficiais 3.0

Fontes: `zorp_boxe3.0.png`, `mestre_boxe3.0.png` e `juiz_boxe3.0.png`, na raiz do projeto.
O jogo carrega apenas recortes derivados dessas folhas em `boxe_assets/v3/`.
As três folhas 3.0 são preservadas como entradas do preparador. As fontes e os recortes obsoletos foram excluídos após auditoria de referências; não existe fallback antigo.

## Recorte e alinhamento

- As folhas possuem 49 poses do Zorp, 48 do Mestre e 53 do Juiz. Somente as 32, 35 e 24 imagens usadas pelas ações são exportadas: 91 PNGs ao todo.
- Canvas transparente de 320 × 224 px, contato bottom-center em (160, 210).
- A mesma escala-base de 0,72 é aplicada às três fontes. Pés/suporte corporal definem o anchor; a extensão da luva não desloca o personagem.
- Separações seguem os pixels transparentes entre as poses, inclusive quando os retângulos visíveis se sobrepõem. Não há grade uniforme presumida.
- As fontes já possuem alpha. Nenhum preto de olho, cabelo, roupa ou contorno foi apagado.
- `validation.json` registra os contatos na folha e as poses excluídas da exportação. Os recortes ambíguos e os demais quadros sem uso foram removidos do disco e do catálogo.

## Zorp

Notação: `2.3` significa terceira pose da segunda linha visual, também nomeada `r02_f03`.

- Idle: 1.1 → 1.2 → 1.3 → 1.4.
- Andar: 1.7 → 1.8 → 2.1 → 2.2.
- Jab / soco da frente: 2.2 → 2.3 → 2.7.
- Cross / soco de trás: 2.2 → 2.4 → 2.5 → 2.7.
- Hook: preparação compacta 2.6 → golpe 2.5 → retorno 2.7.
- Defesa: 3.1 → 3.2 → 3.8.
- Esquiva: 3.3 → 3.5 → 3.7.
- Reação de dano: 4.1 → 4.3 → 4.4.
- Stun: 4.2 → 5.3.
- Queda: 4.3 → 4.4 → 5.4 → 5.5.
- Levantar: 5.5 → 5.6 → 5.7 → 4.8 → 6.10, terminando na guarda machucada.
- Vitória: 5.1, com os dois braços levantados. Derrota: 5.5, deitado.
- Idle machucado: 6.4 com HP até 67%; 6.10 com HP até 34%.
- Dash existente: 2.6 → 2.4 → 2.5 → 2.7, acompanhado pelos efeitos já usados pelo combate.

## Mestre

- Idle: 1.1 → 1.2 → 1.3 → 1.4.
- Andar: 1.8 → 2.1 → 2.2 → 2.3.
- Jab: 2.3 → 2.4 → 2.7. Cross: 2.3 → 2.5 → 2.7.
- Hook: preparação compacta 2.6 → golpe 2.5 → retorno 2.7.
- Defesa: 3.1 → 3.2 → 3.8. Esquiva: 3.3 → 3.5 → 3.7.
- Reação de dano: 4.1 → 4.2 → 4.3. Stun: 4.2 → 4.3.
- Queda: 4.3 → 4.4 → 4.5 → 4.6.
- Levantar: 4.6 → 4.7 → 4.8 → 6.10, terminando na guarda machucada.
- Vitória: 5.1 → 5.2 → 5.3. Derrota: 4.6, deitado.
- Idle machucado: 6.4 → 6.5 → 6.6 até 67% de HP; 6.8 → 6.9 → 6.10 até 34%.
- Golpe carregado existente: 2.6 → 2.3 → 2.5 → 2.7. Recurso anti-pressão: 3.1 → 3.8.

## Juiz

- Idle/observação: 1.1 → 1.2 → 1.3.
- Aproximação/passos: 1.6 → 1.7 → 1.8 → 1.9 → 1.10.
- Início/separação: 2.1 → 2.4 → 2.5 → 2.1.
- Preparação da contagem: 3.1 → 3.3 → 4.1.
- Contagem: observação agachada 4.1 → 4.2 → 4.4 → 4.5, sem mostrar números com os dedos. Os números 1–10 continuam no HUD existente.
- Continuação: 2.2 → 2.3 → 2.7.
- KO/parada: 3.8 → 5.1 → 5.2.
- Resultado: 5.2 → 5.3, gesto de indicação. O juiz se orienta visualmente para a luta, sem entrar em hit detection.

## Limitações documentadas da fonte

- As folhas não trazem rótulos anatômicos de jab esquerdo/direito. `jab_left` e `jab_right` são aliases visuais do jab/cross já existentes, inferidos da postura; não criam novos controles.
- Não há uma sequência inequívoca exclusiva de gancho/uppercut ou dash. Esses estados usam as poses reais de preparação, golpe e retorno descritas acima, sem inventar frames. O combate e seus efeitos de trajetória permanecem iguais.
- Dez poses do Zorp e duas do Mestre têm contato entre botas/poses vizinhas que torna a separação menos confiável. Permanecem nas folhas originais; seus recortes não são exportados. As ações usam alternativas limpas.
- Quatro poses do juiz parecem compartilhar mãos levantadas com a pose vizinha. Permanecem nas folhas originais e não são exportadas ou usadas como sinal individual de vitória.

## Limpeza das dependências obsoletas

- Foram removidos 509 arquivos sem uso (38.936.088 bytes): 112 sprites antigos da raiz, 336 arquivos de versões anteriores em `boxe_assets`, 59 recortes 3.0 sem uso e duas ferramentas de preparação antigas.
- `script.js` e `boxing_arena.js` continuam usando apenas o catálogo 3.0. Não foi necessário alterar controles, combate ou o overworld.
- O preparador 3.0 exporta somente quadros presentes nas ações atuais. O validador confere o catálogo, os arquivos, os anchors e a ausência das fontes 2.0.
- A versão de cache do manifest passou a 3.0.1 porque seu conteúdo foi reduzido aos 91 frames ativos. As imagens usadas não mudaram.
- Foram preservados a arena atual, os NPCs, o saco de pancadas e as medalhas utilizados no fluxo do jogo.
- `../cleanup_audit.json` contém a lista exata de cada arquivo removido, tamanho e SHA-256, além das dependências preservadas.

A prévia interativa é `boxe_assets/v3/preview.html`. Os manifests JSON/JS contêm todos os caminhos, bounds de origem, anchors e sequências completas.

## Validação no navegador

- 92/92 recursos do boxe carregados: 91 imagens únicas de personagens 3.0 e a arena.
- 300 verificações de desenho dos frames das ações, nos dois sentidos, sem imagens ausentes.
- 91 imagens ativas verificadas quanto a margem transparente e anchor; nenhuma inconsistência detectada.
- Zero requisições 2.0, zero respostas 404 e zero exceções JavaScript.
- Entrada pelo NPC, movimento com profundidade, J/K/L, variações por HP, contagem, levantar, KO, finalização, medalha e retorno à ilha verificados.
- A fonte externa do Google já existente foi bloqueada pelo ambiente de testes; nenhum asset do boxe falhou.
- Foi corrigida a prévia para não solicitar favicon inexistente. A recuperação termina em guarda machucada, sem trocar para uma pose saudável antes do retorno à luta.

O relatório detalhado é `browser_qa.json`. As condições de knockdown foram aceleradas reduzindo HP antes do golpe; o golpe, a contagem, a recuperação e a finalização passaram pelo loop real do navegador.
