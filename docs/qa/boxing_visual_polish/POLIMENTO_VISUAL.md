# Boxe — HUD, leitura de estados e impacto

## HUD compartilhado

- Dois painéis organizados para Zorp e Mestre, com o mesmo layout e identidade de cor.
- Nomes, HP numérico, barras de vida segmentadas e uma faixa curta que mostra a vida recém-perdida antes de desaparecer.
- Indicador de resistência da guarda: cheio quando saudável, esvaziando conforme a pressão sobe, com alerta de cor perto da quebra.
- Barras de especial dos dois lutadores com porcentagem, carga pronta, tecla O do Zorp, uso ativo e tempo restante de recarga.
- O HUD antigo dos módulos de especial deixou de ser renderizado; o desenho ficou centralizado em `boxing_presentation.js`.
- Placa central “BOXE / ATÉ O KO”. Não foi criado cronômetro, pois o combate atual termina por HP/nocaute.

## Estados e especiais

- Linha de estado própria para cada lutador: defendendo, stun, guarda quebrada, esquiva, recuperação, contra-ataque, especial pronto e nocaute.
- Escudo pequeno na guarda, com brilho de bloqueio e alerta quando a resistência está baixa.
- Estrelas discretas para stun e escudo partido para quebra da guarda.
- Especial do Zorp identificado como weave ou counter, com progresso real da sequência de seis socos.
- Carga e dash do Mestre identificados no painel. Pequenas marcas no chão comunicam a linha comprometida do golpe durante a carga.
- As poses e os rastros existentes dos especiais foram preservados.

## Combos e impactos

- Contadores de combo para os dois lados abaixo do ringue, exibidos apenas quando há mais de um contato conectado e o contador da luta ainda está válido.
- Pequeno pulso ao aumentar o combo. O contador não é repetido sobre o rosto do lutador.
- Golpes leves: rastro fino e impacto curto, de poucos pixels.
- Golpes pesados e finais especiais: rastro mais firme e impacto maior, limitado para manter as silhuetas legíveis.
- Bloqueios mantêm sua cor própria; quebra de guarda mantém partículas e alerta, sem texto grande sobre o personagem.
- Números de dano e avisos curtos têm contorno escuro para leitura sobre a arena.

## Câmera, juiz e escopo

- Enquadramento mantém o ringue inteiro visível. A câmera acompanha o centro da luta em até 3 pixels na horizontal e 1 na vertical, com suavização.
- Tremor curto em golpes fortes, limitado no desenho a aproximadamente 2 pixels após arredondamento. O HUD permanece imóvel.
- O juiz continua como ambientação, com o mesmo sprite, escala e ordem de profundidade. Não participa das colisões.
- Nenhum ajuste de dano, controles, IA, hitstun, cooldown ou colisão. A parte de simulação de `boxing_arena.js` foi preservada integralmente.
- Nenhum novo asset de personagem ou arena. Recortes, proporções e nitidez dos sprites foram mantidos.

## Inspeção no navegador e fluidez

Inspeção visual em Chrome isolado, usando a resolução real de 450 × 300. As composições de HUD, guarda, stun, quebra, carga do Mestre, dash e counter do Zorp foram observadas; uma troca curta usou o caminho normal de teclado.

- Fonte dos dois especiais carregada e pronta.
- Sem 404 ou outras falhas de carregamento.
- Sem TypeError, ReferenceError ou outros erros JavaScript na sessão observada.
- Luta normal: aproximadamente 60,0 FPS em 180 quadros; percentil 95 do intervalo de quadro: 16,8 ms.
- Com efeitos ativos: aproximadamente 60,0 FPS em 180 quadros; percentil 95: 16,7 ms.
- Nenhum intervalo acima de 25 ms nessas amostras.

Não foram adicionadas nem executadas suítes de testes nesta etapa visual. As capturas e a observação de desempenho estão registradas em `visual-inspection.json` e `boxing-*.png`.

## Arquivos alterados

- `boxing_presentation.js`: HUD, estados, combo, impactos e câmera visual.
- `boxing_arena.js`: chamadas de desenho compartilhadas e reposicionamento do aviso de resultado.
- `boxing_zorp_special.js` e `boxing_master_special.js`: remoção dos HUDs separados e exposição do estado de carregamento do asset ao HUD compartilhado.
- `index.html`: atualização das versões de cache.
