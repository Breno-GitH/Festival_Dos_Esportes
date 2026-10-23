# Mestre do Boxe — percepção limitada e comportamento variado

## Ajustes realizados

- Observação de poses e posições com atraso de 12–21 passos de simulação (200–350 ms). A decisão se atualiza a cada 6–10 passos (100–167 ms); entre decisões a leitura permanece congelada. Nenhum botão do jogador é consultado pela IA.
- Histórico limitado a 48 amostras e sem retroceder no tempo. Não existe cálculo da futura trajetória do Zorp.
- Planos de aproximação, pressão, cautela, guarda, esquiva, reposicionamento e preparação do especial. Os planos têm durações e escolhas variadas, em vez de um sorteio de ação por frame.
- O Mestre escolhe primeiro o tipo de golpe e se aproxima do alcance correspondente. O contato continua usando as mesmas distâncias e tolerâncias de profundidade da física existente.
- Os erros surgem da leitura atrasada, dos compromissos de ataque/carga e da movimentação do Zorp. Não foi adicionada uma regra de “errar automaticamente” por porcentagem.
- A pressão é lembrada a partir dos golpes sofridos. Depois de uma sequência, o Mestre pode guardar, esquivar ou sair da linha; não consegue cancelar hitstun nem escapar de um combo válido.
- Após um bloqueio, há uma pequena preparação de resposta de 6–10 passos. Após uma esquiva bem-sucedida, ele pode tentar aproveitar a janela de contra-ataque que já existe no combate.
- A pressão ofensiva pode incluir um follow-up planejado de dois golpes. A mesma física exige contato e autoriza o cancelamento; o Mestre não ganha combos infinitos.
- Com HP baixo, a seleção favorece pressão. Com vantagem de HP, aumenta a frequência de planos cautelosos.
- O dash usa as mesmas observações atrasadas para escolher a oportunidade. Com até 35 HP, barra cheia, pressão sofrida e alinhamento percebido, o Mestre pode tentar uma virada a partir de 58 unidades, em vez de aguardar somente a distância média habitual. A carga continua interrompível e a trajetória permanece comprometida.
- Dano, alcance físico, duração da carga, colisões, controles e sprites foram preservados. Somente o momento e a estratégia de uso das ações foram ajustados.

## Validação automatizada

111 testes passaram: combate base, combos, defesa/esquiva, os dois especiais, briefing e 15 testes de IA.

Foram concluídas 60 lutas com sementes reproduzíveis, 12 por política de jogador:

- Parado: 12 vitórias do Mestre.
- Somente guarda: 12 vitórias do Mestre.
- Pressão ofensiva simples: Zorp venceu 7; Mestre venceu 5.
- Defesa reativa com ataques espaçados: Zorp venceu 2; Mestre venceu 10.
- Reposicionamento, combos, esquivas e especial: Zorp venceu 11; Mestre venceu 1.

Essas políticas são bots de teste; os resultados descrevem essas estratégias simuladas. Todas as 60 lutas chegaram ao resultado, sem travamentos. As 36 disputadas registraram 20 vitórias do Zorp e 16 do Mestre.

Contagens observadas do Mestre nas 60 lutas:

- Golpes leves: 309.
- Golpes pesados: 466.
- Entradas em guarda: 220.
- Esquivas: 121.
- Especiais: 32.
- Golpes que terminaram sem contato: 64.

Também foram validados: ausência de reação a input invisível, atraso mínimo de observação, guarda tardia contra golpe rápido, erros de alcance por reposicionamento, respeito a hitstun/recuperação, agressividade com HP baixo, memória limitada e comportamento consistente a 30/60/144 FPS.

## Navegador real

Chrome com automação de teclado, em perfil e origem isolados, sem usar o save normal do jogador.

- Briefing congela IA e carga.
- Um cenário dirigido confirma que o Mestre escolhe o especial após observação atrasada e erra quando Zorp sai da linha durante a carga.
- Quatro lutas completas: pressão, defesa reativa, jogo tático e guarda passiva. As três primeiras terminaram com vitória do Zorp; a guarda passiva terminou com vitória do Mestre.
- Na luta de guarda passiva, o Mestre conquistou a barra durante a própria luta e usou o especial uma vez, sem preenchimento forçado.
- Golpes leves/pesados, guarda, esquiva, reposicionamento e especial observados. Na luta passiva também houve golpes no vazio e bloqueios, sem pontuação ou dano inventados.
- Zero 404, falhas de carregamento, TypeError, ReferenceError ou outros erros JavaScript na sessão observada.

## Arquivos

- `boxing_arena.js`: percepção, planos, respostas, estatísticas de QA e integração com a física existente.
- `boxing_master_special.js`: critério de tentativa de virada com HP baixo.
- `index.html`: versões de cache atualizadas.
- `boxing_master_ai.test.cjs` e `boxing_ai_harness.cjs`: testes de percepção e lutas com sementes reproduzíveis.
- `boxing_master_special.test.cjs`: expectativas atualizadas para observar o atraso de reação antes de preparar o dash.
- `tools/qa_boxing_ai.cjs`: reprodução das 60 lutas.

Evidências: `integration-tests.txt`, `simulation-results.json`, `browser-results.json` e capturas `ai-*.png`.
