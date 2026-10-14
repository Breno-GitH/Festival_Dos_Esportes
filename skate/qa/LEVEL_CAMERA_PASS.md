# Skate — revisão de pista, release e câmera

## Escopo

Revisão aplicada somente ao Skate. Cenário em Canvas procedural, uma única rota e sprites do Zorp preservados. A página de QA usa o mesmo curso e runtime do mini-game. Nenhum asset gráfico novo foi criado.

## Pista

- Percurso útil: 25.000 px, do spawn X=150 à chegada X=25.150.
- 13 blocos internos contínuos; três momentos principais e dez blocos de preparação/transição. Não há telas separadas.
- 22 rampas, 31 rails/arestas grindáveis e 12 gaps. Sem preenchimento com cones/lixeiras.
- Primeira cadeia: quatro rails com chão de recuperação.
- Cadeia principal sem chão: cinco rails de formas diferentes, quatro transfers, extensão de 2.160 px. Aproximadamente 8,5 s entre a primeira captura e a saída do último rail.
- Grande escada: 660 px de extensão horizontal e 420 px de desnível; 12 degraus. Corrimão com 680 px horizontais, aproximadamente 799 px ao longo da inclinação. Grind medido: 2,47 s.
- Gap da saída da escadaria: 185 px. Janela amostrada de release: X≈17.261–17.297, aproximadamente 135 ms na velocidade local. A janela exige execução; não se trata de garantia para qualquer ponto de entrada.
- Mega Gap: 895 px, imediatamente depois da rampa de 290 px de altura. Landing ampla e sem degrau oculto na conexão com o chão.
- Checkpoints: X=8.750 (34,4%) e X=17.650 (70%).

## Controles e lançamento

- Space press: Normal Jump imediato. Double Space: Ollie. Hold: Super Jump.
- Air + Hold perto de grindPath: captura. Sem Hold, não captura.
- Durante Grind, Hold mantém o contato; release lança imediatamente uma única vez.
- Impulso do release: velocidade vertical -650 px/s, mais contribuição da tangente limitada a ±100 px/s. A velocidade horizontal é preservada.
- Chegar ao fim do rail segurando não concede salto automático. O parser consome a intenção do salto anterior na captura, evitando um Super Jump atrasado que salvava o jogador sem novo input.
- Velocidade base da pista: 230–285 px/s. Na aproximação da Mega Ramp, a inclinação modifica moderadamente a velocidade; valores observados na rampa: aproximadamente 258–277 px/s, com avanço aéreo nominal de 280 px/s.
- Mega Air reutiliza o special air existente: D+Space sustenta por no máximo 2.550 ms; slow motion alvo 0,68 durante a janela inicial de 800 ms, com entrada/saída suaves. Uma tecla isolada ou soltura precoce não cruza o gap.

## Câmera e visual

- Zoom normal 0,72: aproximadamente 39% mais largura visível que em 1,0.
- Zorp ocupa aproximadamente 25,5–30% da largura, conforme a velocidade.
- Antecipação do terreno/rail: 160–260 px; suavização horizontal e compensação do atraso.
- Super Jump: zoom alvo até 0,62, com ajuste adicional para manter personagem e aterrissagem visíveis.
- Grande escada: 0,59. Mega Air: alvo 0,32, ajustado dinamicamente; observado 0,267 na região alta do arco.
- Deadzone vertical ampla e referência no terreno/landing. O personagem não é centralizado verticalmente durante o salto.
- Skyline, luzes discretas, silhuetas tropicais e estruturas com parallax; sem colisão decorativa. Rampas e rails têm suportes procedurais.
- Culling de detalhes do chão e geometria fora da tela. Nenhum recorte de sprite por frame foi acrescentado.

## Correções após playtests

### Primeira passagem

- Acrescentado um rail de ligação na cadeia inicial para ensinar o ritmo Hold → Release → Hold com recuperação segura.
- Reposicionados high rail, transfer final e rail curvo com base na trajetória real do novo release forte.
- Ajustada a altura do ledge avançado para captura plausível, sem exigir snap distante.
- Ampliado o gap da escadaria para exigir release; permanecer até o fim não salva a run.
- Corrigido o enquadramento da página de QA, que deformava verticalmente o Canvas.

### Segunda passagem e regressão final

- Corrigida a referência vertical da borda direita do gap: ela desenhava uma parede de perigo até o céu quando as margens tinham alturas diferentes.
- Removido o degrau de 40 px na landing do Mega Gap, que causava crash após cruzamento correto em algumas taxas de atualização.
- Corrigidos contatos de manual/grind sobre bancos e ledges: o chão de referência agora é o topo real; grind não conta uma aterrissagem a cada frame.
- Eliminado Super Jump atrasado no fim natural do rail, causado por uma intenção antiga de Hold ainda ativa.
- Reforçada a margem superior da câmera no Mega Air para manter Zorp abaixo do HUD e a landing visível.
- Reduzida a rampa intermediária de rooftop de 348 para 230 px de altura e seu gap para 280 px. A rampa gigante final mantém o papel de maior evento; a seção intermediária ganhou tolerância e melhor leitura.
- Retirada uma instrução de salto do replay que evitava indevidamente o contato com uma rampa média. Isso altera somente a sequência de teste.

O maior problema encontrado foi a combinação de transfers desenhados para o antigo impulso pequeno com contatos incorretos nas superfícies elevadas. A correção reposiciona a geometria de chegada e elimina contatos falsos, preservando o release forte solicitado.

## Evidência e limites da validação

- 111 testes automatizados passaram, sem falhas.
- Runs completas com atualização a 30, 60, 90 e 120 Hz passaram.
- Dez tentativas corretas da saída da grande escada passaram. Release cedo e ausência de release na janela falharam no gap.
- Mega Air: D+Space correto completa; sem input, só Space, só D e release precoce falham.
- Zero input: fail em 1,8 s. Hold infinito: fail em 1,8 s. Mash: fail em 23,7 s. Não há autoplay.
- Simulação completa final: 101,42 s de relógio de teste / 101,05 s de física, score 19.715. Perfil de sobrevivência: 101,15 s, score 17.074. Esses perfis são automatizados, não medições de habilidade humana.
- Duas runs completas renderizadas no navegador: aproximadamente 101,12 s e 101,08 s; 60 FPS registrados. Foram replays de eventos de teclado passando pelo runtime real, sem teleporte durante a run; não foram runs manuais humanas.
- A última conferência, depois do ajuste intermediário do rooftop, carregou corretamente, mostrou capturas de Grind e avançou até Street Objects. Porém a aba ficou limitada em segundo plano (1–2 FPS inicialmente; média de 5,3 FPS ao pausar). Não se usa essa medição como desempenho do jogo, nem se declara uma terceira run visual completa. A alteração final passou na regressão completa automatizada.
- A avaliação subjetiva de diversão e dificuldade humana continua limitada por esse modo de playtest. A linha é executável e repetível nos testes; isso não substitui feedback de jogadores.

## Arquivos de evidência

- `test-output.txt`: resultado da bateria final.
- `release-camera-full-run.json`: trajetória, inputs e transições da simulação final.
- `release-camera-cases.json`: resultados positivos e negativos.
- `../release_camera_pass.test.cjs`: regressões de release, escadaria, Mega Air e enquadramento.
- `../level_playtest.html`: reprodução visual e prática por seção, usando a implementação oficial.

O helper `serve_local.cjs` serve exclusivamente esta pasta em loopback para QA quando o servidor local habitual não estiver disponível.
