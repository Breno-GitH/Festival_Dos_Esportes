# Basquete — bola presa nos cantos

## Causa reproduzida

A bola podia chegar a X=9/441; os jogadores só caminham entre X=54 e X=396. No chão, a bola nesses cantos ficava a aproximadamente 49,7 unidades do centro de coleta mais próximo, acima do alcance de 28. O atrito eliminava sua velocidade e ela permanecia inacessível indefinidamente.

Outra reprodução: a bola exatamente sobre a extremidade superior arredondada da tabela podia se equilibrar em Y≈140,3, fora do alcance do salto normal. Os subpassos de colisão mantinham uma oscilação minúscula sem deslocamento útil. O Mestre também só caminhava ao tentar recuperar uma bola solta, sem usar seu salto existente.

## Correção física

- Quadra com oito bordas: paredes laterais, teto abaixo do HUD, chão e quatro cantos chanfrados. Os cortes inferiores têm 30 unidades; os superiores, 24.
- As bordas participam da mesma detecção contínua dos aros/tabelas: resolve-se o primeiro contato e simula-se o tempo restante. Não há reposição ao simplesmente chegar perto da parede.
- Os chanfros inferiores levam o centro de uma bola apoiada ao intervalo X≈51,65–398,35, alcançável pelos jogadores em seus limites existentes. O alcance de coleta não foi aumentado.
- Restituição de 0,65 nas bordas; velocidade normal mínima de saída de 1,25 somente em contato efetivo com parede/chanfro. Chão mantém restituição de 0,58 e permite repouso normal em área acessível.
- O Mestre pode usar seu salto normal para uma bola solta alta, quando a posição realmente permite recuperá-la. Sem mudança de altura, alcance ou velocidade do personagem.

## Segurança gradual

1. A bola precisa estar livre, lenta, perto de borda/aro/tabela e geometricamente fora do alcance que um jogador conseguiria obter andando e saltando. Estar distante da posição atual dos jogadores não basta.
2. Após **2 segundos contínuos**, aplica-se um pequeno impulso para dentro e para cima, sem mudar sua posição.
3. Se permanecer novamente parada e inacessível por **mais 3 segundos**, pisca por **0,24 s** e volta a X=225, Y=223, livre e sem dono. Há 0,6 s de bloqueio de coleta compartilhado para a disputa recomeçar.
4. Se voltar a ser alcançável ou for coletada, o procedimento é cancelado. Uma bola em movimento não recebe reposição.

A ajuda não concede pontos: uma flag bloqueia cestas causadas pelo impulso até uma nova posse/jogada legítima. O helper não modifica cronômetro, placar, jogadores, especiais, identificador da jogada ou progresso. Bolas após cesta aguardando a reposição normal não acionam essa recuperação.

Diagnóstico disponível em `basketball1v1.diagnostics().recovery`. O debug de colisões existente, desligado por padrão, também mostra bordas e limites dos jogadores.

## Validação no Chrome real

O jogo completo executou seu loop normal de atualização e desenho em Chrome headless. Os cenários definiram condições iniciais; não reposicionaram a bola durante o voo. A coleta pelo Zorp usou eventos reais A/D do navegador. Isso é QA automatizado no navegador, sem alegação de playtest humano.

**16 cenários aprovados:** quatro cantos; atrás das duas cestas; lateral das duas tabelas; bola equilibrada sobre cada tabela; falha deliberada do impulso; bola parada acessível; coleta pelo Zorp nos dois limites; coleta pelo Mestre; salto do Mestre para recuperar uma bola alta.

- Cantos, regiões atrás das cestas e laterais das tabelas: recuperação física, **zero reposições e zero impulsos do detector**.
- Topos das tabelas: um impulso após aproximadamente **2,00–2,02 s**, sem reposição neutra.
- Último recurso: testado desativando somente a força do impulso na configuração de QA, para simular uma tentativa malsucedida. A física continuou rodando; houve piscar e reposição neutra após **5,26 s**, com `owner=null`, em (225,223).
- Placar inicial 11×7 preservado nos cenários de recuperação; cronômetro continuou diminuindo. No teste de IA, o Mestre coletou a bola e depois marcou uma cesta legítima, confirmada pelo sensor normal.
- Bola acessível parada não foi movida pelo detector. Zorp recuperou nos dois extremos e o Mestre recuperou por movimento/salto normais.
- **Zero 404, TypeError, ReferenceError, exceções de execução e falhas de carregamento.**

**14 regressões adicionais no Chrome aprovadas:** Swoosh nas duas cestas, aro e dentro, tabela e dentro nos dois lados, rim-out, lateral, rede, entrada por baixo, vários contatos, arremessos reais por J de 2/3 e enterrada. Nenhuma pontuação duplicada. Swoosh mantém 2/3 pontos e feedback especial.

**78 testes automatizados aprovados**, incluindo os 28 testes anteriores de aro e pontuação. Cobertura em 30/60/120/144 Hz, ambos os cantos inferiores e superiores, penetrações iniciais, alcance, recuperação gradual, neutralidade, ausência de cesta causada por ajuda e varredura de **286 posições** por toda a quadra/tabelas. Todas terminaram alcançáveis sem reposição neutra.

## Arquivos

- `basketball_court_physics.js`: geometria, alcance e segurança.
- `basketball_hoop_physics.js`: bordas na colisão contínua; apoio estável no chão; bloqueio de pontuação da recuperação.
- `basketball_1v1.js`: integração, salto de coleta da IA, piscar e diagnóstico.
- `index.html`: carregamento e versões de cache.
- `basketball_court_physics.test.cjs`: testes novos.
- `docs/qa/basketball_recovery/`: testes, trajetórias, capturas e regressões.

Evidências: [16 cenários no Chrome](qa/basketball_recovery/browser-results.json), [14 regressões de cesta](qa/basketball_recovery/hoop-regression/browser-results.json), [testes automatizados](qa/basketball_recovery/unit-tests.txt), [colisores](qa/basketball_recovery/court-debug.png), [coleta pelo Zorp](qa/basketball_recovery/keyboard-left-end.png).
