# Férias Merecidas — card tropical

## Composição

- Mantido o arquivo oficial `zorp_feriasmerecidas.png`, sem editar pixels, pose, cadeira, roupa tropical, óculos, canudo ou coco.
- Recorte útil existente `[256,42,1007,1007]`, com escala uniforme e `imageSmoothingEnabled=false`.
- Arte em `156 × 156`, posição `(147,57)` no Canvas 450 × 300. Não há flutuação ou animação aplicada ao personagem.
- Título **FÉRIAS MERECIDAS** mantido no topo com tipografia local de pixels.
- Removida a placa escura atrás da arte desse final.
- Céu azul-claro em faixas de cor, horizonte laranja/amarelo, pequeno sol em degraus, oceano azul e rodapé em tom de areia. Todo o fundo é desenhado por Canvas, sem novos assets ou cenário complexo.
- Duas nuvens com deslocamento lento de até quatro pixels, seis linhas de água com movimento de até três pixels e três pequenos reflexos do sol. Sem partículas acumuladas, novas entidades ou animação do coco.

## Texto e final aberto

Narrativa:

“Depois de tantos desafios, Zorpzin decidiu que a Terra ainda tinha algo a oferecer.”

Fala preservada:

“Acho que vou ficar aqui por mais um tempo... eles não vão se importar hahaha”

A narrativa aparece em duas linhas, seguida pela fala em outras duas. Não existe texto dizendo quando ele voltou para casa. O monólogo da cutscene anterior foi preservado sem alteração.

Posições de leitura: narrativa em `y=228/239`, fala em `y=254/265`, `[SPACE] CONTINUAR` em `y=280`. Não há texto fora da moldura ou sobre o personagem.

## Integração

- O preset `ferias_merecidas` recebe a paleta clara, a fala e a posição de leitura próprias.
- A UI continua usando o componente compartilhado `EndingCard`, suas transições, o bloqueio de input e o fade de saída para o menu.
- Os requisitos, pagamento ao Capitão, save e flag de Férias permanecem nos mesmos controladores.
- O PNG de Férias e os PNGs dos outros finais permaneceram idênticos aos anteriores.
- O final padrão e o final secreto de Ravok não receberam alterações em seus temas ou apresentações.

## Conferência visual

A tela foi aberta em Chrome isolado para conferir a composição. A pose oficial aparece completa, com roupa tropical, cadeira e coco. A narrativa e a fala cabem no rodapé. A prévia não registrou erros no console ou no carregamento.

Arquivos alterados:

- `ending_card.js`: preset tropical, fundo leve por Canvas e suporte à fala abaixo da narrativa.
- `index.html`: versão de cache do componente.
- `ending_card.test.cjs`: expectativa de posição vertical de Férias atualizada; nenhuma nova suíte foi executada nesta etapa visual.

Evidências: `ferias-merecidas.png` e `visual-preview.json`.
