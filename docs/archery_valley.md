# Arquearia — Vale da Cachoeira

## Apresentação

A arena do minigame é desenhada em Canvas, em 450 × 300, com câmera fixa.
O cenário possui céu e nuvens, duas cadeias de montanhas distantes, paredões
verdes, floresta nas encostas, uma grande cachoeira central, rio que se abre
em direção ao observador, pedras/pequenas ilhas e uma plataforma seca de tiro.
Não usa nem copia arte de outro jogo.

O terreno, a vegetação, as rochas e a plataforma são desenhados uma vez em um
canvas auxiliar. A cada frame essa camada é reutilizada. Sobre ela são desenhados:

- 38 pequenos reflexos/correntes descendo o rio;
- 4 ondulações próximas ao pé da cachoeira;
- 16 filetes de água caindo;
- 10 partículas de respingo;
- 6 pequenas massas de névoa com baixa opacidade;
- 3 pássaros distantes, 4 folhas e 2 borboletas nas margens.

São 83 elementos animados com quantidade fixa, sem emissores que acumulem objetos.
Todos são exclusivamente visuais. Os pássaros decorativos são pequenos e
dessaturados, não carregam alvos e não participam de colisão ou pontuação.
Não há movimento da câmera nem parallax que desloque a área jogável.

A cachoeira desemboca no rio e possui brilho, faixas de água, espuma e névoa.
Um recorte acompanha a borda da plataforma para impedir que os reflexos animados
sejam desenhados sobre a área seca. Vegetação, rochas e ilhas ficam abaixo dos
alvos, flechas e arqueiros na ordem de desenho.

## Integração com a partida

- Zorp e Mestre continuam usando os atlas 2.0 de costas/cima, sem espelhamento.
- A plataforma contém todos os pés possíveis dentro dos bounds atuais.
- Foram adicionadas sombras pequenas nos pés e marcações discretas no piso.
- As antigas bandeiras e placas de pista da arena foram substituídas por detalhes
  menores nas margens. Os mesmos assets continuam disponíveis na ilha do Overworld.
- O placar foi colocado em três painéis menores, liberando o céu e evitando a
  sobreposição dos números com a interface externa no enquadramento testado.
- O fundo antigo não é desenhado nem pré-carregado. Seu arquivo e registro no
  catálogo foram preservados.

Não foram alterados movimentos, velocidades, cooldown, IA, alvos, caminhos,
colisões, pontuação, medalha, duração ou fluxo de entrada/retorno do minigame.
Nenhuma outra ilha ou minigame recebeu alterações nesta etapa.

## Arquivos

- Criado `archery_valley.js`: composição, cache do terreno e animações ambientais.
- Modificado `script.js`: desenho da arena, piso, sombras, painéis do placar e
  diagnóstico visual da Arquearia.
- Modificado `index.html`: carrega o novo módulo e atualiza as versões necessárias.
- Modificado `archery_asset_registry.js`: deixa de pré-carregar o fundo antigo.
- Criado este relatório.

## Validação no navegador

Chrome real em modo headless, save isolado, teclas automatizadas e cache
desativado. Endereço testado: `http://localhost/2025/Festival_Dos_Esportes/`.
As capturas foram inspecionadas visualmente. Não se trata de uma run humana manual.

17 verificações aprovadas:

1. E no Mestre abre o minigame pelo fluxo normal.
2. Ambiente novo e câmera fixa ativos.
3. Sprites 2.0 carregados, de costas e sem espelhamento.
4. Bounds, velocidade de flecha, cooldown e duração originais preservados.
5. Plataforma cobre todos os pontos possíveis dos pés.
6. Cachoeira e rio apresentam movimento entre instantes diferentes.
7. Água animada não invade o espaço de tiro.
8. WASD continua funcionando.
9. Espaço continua disparando imediatamente para cima.
10. Os alvos dourados e seus caminhos existentes continuam funcionando.
11. Orçamento visual permanece fixo e leve.
12. Partida completa de 55 segundos, com acertos dos dois arqueiros e resultado.
13. Desempenho próximo de 60 FPS.
14. Espaço no resultado retorna à ilha de Arquearia.
15. A imagem da arena antiga não é requisitada.
16. Nenhum 404 ou falha de carregamento no teste.
17. Nenhum TypeError, ReferenceError ou warning da página no teste.

A partida completa terminou em 1183 × 458: 86 disparos e 36 acertos do jogador;
19 disparos e 10 acertos do Mestre. Zero violações de bounds, NaN ou draw inválido.

Média do contador da partida: 60,22 FPS. Uma amostra adicional de 300 frames em
PLAYING mediu 60,00 FPS, p95 de 16,8 ms e máximo de 17,1 ms. O ambiente isolado
levou aproximadamente 0,18 ms por desenho em um teste de 120 chamadas. Esses são
resultados desta máquina; capturas e carregamento causaram quedas pontuais durante
a sessão e não há garantia de 60 FPS em qualquer dispositivo.
