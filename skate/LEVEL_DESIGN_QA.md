# Skate — relatório da revisão de level design

## Resultado e escopo

Uma pista fixa de 25.000 unidades, de x=150 até x=25150, organizada em beats contínuos. O terreno de chegada continua depois do finish para evitar a aparência de um precipício. Não há rotas paralelas nem obstáculos do antigo runner. A geometria é declarada por código e continua totalmente fixa entre runs.

A revisão mudou o curso, seus colliders/paths de colocação e três detalhes de apresentação: culling pela largura completa dos props, renderização de rails à frente das estruturas e alinhamento visual dos props com a mesma altura usada pela colisão. Física, parser, controles, combo, medalha e outros minigames não foram reescritos.

## Inventário

- 21 rampas procedurais com surfacePath e launchProfile.
- 22 rails/bordas procedurais: retos, descendentes, ascendentes, curvos e ledges/bordas grindáveis.
- 16 props funcionais: 2 bancos, 3 ledges, 6 plataformas, 2 escadas e 3 blocos.
- 9 gaps: três hops curtos e seis zonas extensas de risco.
- Zero cones, lixeiras, placas ou barreiras de colisão.
- Nenhum sprite de cenário é usado pela pista oficial. Os arquivos antigos permanecem no disco apenas como material preservado e fixtures de auditoria.
- Checkpoint 1: x=8850, 34,8%, depois da Stair Rail. Checkpoint 2: x=17650, 70%, depois do Speed Release.

## Os dez beats

1. **Immediate Start — ~10 s.** Small kicker → Normal → landing → medium kicker/Ollie → rail amplo → hop curto. O primeiro rail recompensa captura; perder essa captura ainda permite andar no mesmo chão.
2. **First Transfer — ~9 s.** Rail A → Jump Out → capture B. B começa 70 px depois de A; falhar ainda oferece landing. O ledge seguinte transforma o fim da linha em outro pequeno salto.
3. **Ramp Rhythm — ~8 s.** Small kicker → long bank → bloco com borda → bowl. Altura excessiva perde a borda para score, mas continua a progressão. O bowl prepara o próximo setup.
4. **Bench Precision — ~5 s.** Kicker → Ollie → topo do banco → kicker → pipe. Topo seguro, lateral perigosa. A landing sobre o banco funciona sem depender de captura de Grind.
5. **Stair Rail — ~6 s.** Kicker → capture do handrail → Jump Out → landing. O path começa em x=7981; as escadas começam em x=8070. O corrimão aparece durante a aproximação da rampa, com cerca de um segundo de antecedência. Falhar na captura leva aos degraus fatais.
6. **Special Ramp — ~9 s com slow motion.** Pequena descida/setup → grande rampa → SPACE+D → soltar/transicionar → capture do rail de saída. Um ledge sob a parte final desse mesmo rail estabiliza a transição para No Floor; não há um segundo caminho de travessia.
7. **No Floor — ~12 s.** Flat A → elevado B → descendente C → curva alta D → pipe longo E. C → D exige Super; os demais transfers usam Grind Hop. São cinco Grinds e quatro transfers sem pouso. Abaixo de toda a cadeia não existe chão seguro.
8. **Speed Release — ~16 s.** Transição de madeira → hop curto → bank descendente → kicker → plataforma → ledge. A velocidade sobe gradualmente de 230 a 280. O hop e a entrada na plataforma dão decisões ao respiro; não há lixo urbano para desviar.
9. **Advanced Street — ~10 s.** Medium bank/Ollie → ledge → Super → high rail → handrail descendente → landing. O topo do ledge e sua borda representam o mesmo elemento da pista. Grind nessa borda é opcional; alcançar e capturar o high rail é obrigatório. Erro de altura/timing leva ao gap ou às escadas.
10. **Final Gauntlet — ~17 s.** Downhill/kicker → Ollie/capture descendente → Super/high rail → Hop/curva → plataforma → Normal hop/banco → launch block → big ramp/Super → último rail → Jump Out → final landing. O rail final foi colocado na região da trajetória em que a captura ainda é plausível.

## Transfers, risco e ritmo

Oito transfers obrigatórios e dois transfers opcionais para score. A maior cadeia estritamente sem chão contém cinco rails; o rail da Special Ramp pode conectar combo a essa cadeia. No replay de referência, A → saída de E dura 11,72 s; A → landing dura aproximadamente 12,37 s.

O validador usa forwardSpeed 230/280, Grind Hop 390, Super 650, gravity 1650 e capture radius 24, todos existentes. Nas saídas de referência, as janelas físicas dos transfers obrigatórios duram mais de 100 ms, além do buffer existente de 130 ms. Mesmo com saída 20 px adiantada há janelas com pelo menos 54 ms. Também foram completadas runs com captura 90 ms atrasada e saltos de chão deslocados em ±8 px.

As seis zonas extensas de risco são Stair Rail, Special Air, No Floor, High Rail/segunda escada, cadeia final e launch final. O primeiro transfer possui chão para recuperação. Bancos/ledges mantêm SAFE_TOP, GRINDABLE_EDGE quando existente e DANGEROUS_SIDE; degraus dos desafios mantêm DANGEROUS_STAIR_FALL. Suportes de rails continuam decorativos.

O maior intervalo de chão sem ramp/rail/prop/gap ativo é 2,96 s. Rails longos duram cerca de 3 s. Não foi acrescentado chão vazio para atingir a duração alvo.

## Correções da primeira rodada

- Gap inicial de 80 para 55 px, para dar margem ao Normal Jump.
- Rail B do primeiro transfer aproximado da trajetória real de saída de A.
- Saída da madeira alinhada com o terreno; antes havia uma subida descontínua que fazia Zorp atravessar a colisão e cair.
- Landing da plataforma na descida antecipada para receber o Ollie antes de sua trajetória ficar abaixo do topo.
- Aproximação do primeiro handrail final antecipada.
- Topo do banco final, gap anterior e bloco de saída reposicionados para permitir tanto landing normal quanto Grind.
- Ledge de preparação do high rail ampliado, mantendo uma janela de Super executável a partir do próprio topo.

## Correções da segunda rodada e confirmação final

- Entradas dos rails A/B/C/E de No Floor ampliadas/antecipadas, conservando as saídas, para tolerar timing de Jump Out.
- Rail de saída da Special Ramp baixado de -330 para -300; a sustentação curta varia alguns pixels com o timing de lançamento e agora tem margem real.
- Salto da big ramp final preparado em um segmento amplo da curva, em vez da junção abrupta de duas inclinações.
- Banco/plataforma final receberam uma margem maior na borda de takeoff.
- Props deixam de desaparecer enquanto Zorp ainda está sobre eles; rails são desenhados à frente das estruturas.
- Paths dos dois rails curvos traçados na barra neon visível. O crop chamado `cable-sag` mostra um pipe quase reto; sua colocação passou a usar esse formato real. O último rail foi antecipado para preservar a janela de captura após esse alinhamento.
- Área depois do finish estendida visualmente para uma chegada em chão contínuo.

O maior problema encontrado foi a diferença entre trajetória/colisão e leitura visual: transferências pareciam próximas, mas não correspondiam à saída real; em rails curvos o board seguia uma linha abaixo da barra. O curso agora usa paths alinhados aos pixels, e as aproximações foram recalculadas e jogadas novamente.

## Evidências e limites

- 77 testes de Skate/assets aprovados, incluindo dez capturas variadas e dez falhas da Stair Rail.
- Cinco perfis completos por eventos de teclado no runtime real: sobrevivência, linha de Grind, capturas atrasadas, exits antecipados e saltos de chão deslocados. Todos completaram, entre 101,98 e 102,63 s.
- Replay de sobrevivência: 102,30 s / 14.587 pontos. Replay da linha completa: 102,42 s / 18.768 pontos.
- Run completa renderizada no navegador, sem pausas: 102,04 s de simulação (~102,5 s incluindo slow motion), 19.546 pontos, combo máximo 8.166, ambos checkpoints, 21 capturas, zero crashes e FPS médio observado 60.
- Tentativa manual da Stair Rail, assistida por pausas de observação: salto → capture → Jump Out → landing → checkpoint. Uma tentativa com captura tardia falhou nos degraus, como previsto.
- Zero input, Hold permanente e mash falham antes de dez segundos. Perder um rail intermediário em No Floor também falha.

A run inteira do navegador foi um replay de inputs, não uma run humana. As tentativas manuais foram localizadas e tiveram pausas. Isso confirma execução, ritmo renderizado, leitura e repetibilidade; a curva de aprendizado subjetiva de primeira/segunda/terceira run ainda não foi medida com jogadores humanos.

Registros: `qa/browser-complete-run.json`, `qa/level-validation.json`, `qa/latest-run.json`. A página `level_playtest.html` é isolada e não é carregada pelo jogo oficial. O fixture não teleporta Zorp nem substitui a física durante as runs.
