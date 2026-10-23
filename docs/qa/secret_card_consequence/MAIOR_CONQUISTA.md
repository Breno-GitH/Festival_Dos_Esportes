# A Maior Conquista — silêncio e consequência

## Apresentação

O final usa o mesmo componente EndingCard dos finais padrão e Férias Merecidas: moldura em pixel art, título no topo, retrato central, narrativa abaixo e comando SPACE no rodapé. A entrada progressiva, bloqueio do input herdado e saída com fade para o menu foram preservados.

- Card oficial: `card_zorp_MaiorConquista.png`, sem alteração no arquivo.
- Recorte preservado: x=892, y=141, largura=179, altura=217.
- Destino na resolução 450×300: x≈157,36, y=57, largura≈135,28, altura=164.
- Escala uniforme ≈0,75576; imageSmoothingEnabled=false.
- Fundo quase preto (#06050b), roxo escuro, moldura discreta e acentos vermelhos apagados.
- Cinco estrelas fracas, apenas uma com oscilação sutil de brilho; dois fragmentos distantes com deslocamento muito lento; um ponto vermelho discreto.
- Sem Ravok, medalhas adicionais, planeta animado, explosão, glow ou nova cena.

## Texto

FINAL SECRETO

A MAIOR CONQUISTA

Zorpzin conquistou todas as medalhas da Terra.

Mas, ao lado de Ravok, decidiu buscar algo que nenhuma medalha poderia representar.

Depois disso, os dois desapareceram no espaço.

[SPACE] CONTINUAR

A narrativa ocupa quatro linhas visuais, sem invadir o comando inferior.

## Prévia visual

A tela foi aberta em Chrome isolado, usando um save de desenvolvimento pronto para o card. A captura está em `a-maior-conquista.png`. Não houve nova execução completa da cutscene neste passe.

O registro `visual-preview.json` contém zero erros JavaScript, zero respostas HTTP com erro e zero requisições falhas. A prévia registrou zero vozes de áudio ativas. Os arquivos PNG dos três finais e os controladores das rotas/cutscenes permaneceram idênticos aos anteriores.

## Arquivos alterados

- `ending_card.js`: tema secreto, retrato maior e quebra de linha configurável, mantendo os valores anteriores dos demais temas.
- `index.html`: versão de cache do componente atualizada.
- `ending_card.test.cjs` e `ravok_outcome.test.cjs`: expectativas visuais existentes ajustadas ao novo tamanho e texto. A suíte não foi executada neste passe.

Não foram alterados requisitos, flags, saves, cutscenes anteriores ou lógica de encerramento.
