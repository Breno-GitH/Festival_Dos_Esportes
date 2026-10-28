# Skate — clareza dos controles e aprendizado contextual

Entrega: 28/10/2026. Projeto: `C:/xampp/htdocs/2025/Festival_Dos_Esportes`.

## Briefing

Mantido o componente compartilhado de briefing, com uma apresentação contextual para o Skate dentro da mesma moldura. Os outros sete esportes mantêm seus dados e layout anteriores.

O Skate avança automaticamente; não existe controle de direção manual neste runtime. Isso agora aparece explicitamente: “MOVIMENTO: Zorp avança sozinho.”.

Frase central destacada:

“NO SKATE, SPACE MUDA DE FUNÇÃO CONFORME O QUE ZORP ESTÁ FAZENDO.”

Seis cartões curtos usam teclas desenhadas por Canvas, com símbolos distintos de TOQUE, SEGURE e SOLTE:

- CHÃO: toque para pular.
- RAMPA: segure até o lançamento.
- NO AR, PERTO DO RAIL: segure para encaixar no grind.
- DURANTE O GRIND: segure para continuar.
- SAÍDA DO GRIND: solte para saltar fora.
- MEGA RAMPA / MEGA AIR: segure na rampa e continue no ar.

O Ollie de dois toques rápidos é mencionado discretamente. O briefing continua bloqueando física/cronômetro e usa o countdown existente. A tecla usada para confirmar não vaza como salto ou hold para a partida.

## Avisos durante a pista

O novo `SkateControlCoach` observa o runtime; não dirige Zorp nem injeta ações.

- Primeiro gap: TOQUE SPACE perto da borda.
- Aproximação da rampa: “AO CHEGAR À RAMPA, SEGURE SPACE.”; quando Zorp entra na zona real de aproximação, “AGORA, SEGURE SPACE ATÉ A SAÍDA.”. A distinção evita induzir um salto de chão antes da rampa.
- Preparação real da rampa: “BOA! MANTENHA SPACE ATÉ SAIR DA RAMPA.”.
- Primeiro rail próximo: “NO AR, SEGURE SPACE PERTO DO RAIL.”.
- Captura real: “GRIND! SOLTE SPACE PARA SALTAR DO RAIL.”.
- Saída deliberada: feedback curto de boa saída.
- Mega: reforço do mesmo hold na rampa e no ar.

Os avisos são pequenos, ficam fora do corpo do personagem e aparecem uma vez por categoria na tentativa. Depois que a ação é aprendida, suas instruções são suprimidas nas tentativas seguintes. Não há novas barras de carga, setas gigantes ou comandos exclusivos para tipos de rampa.

Mensagens grandes existem no briefing, no pause/controles e depois da falha, com a simulação parada. Durante a partida, apenas o aviso compacto é usado; não foi aplicada redução automática de velocidade para ensinar.

## Aprendizado e save

Persistência no save global existente `zorp_festival_wallet`, em `commerce.skateTutorial`:

```js
{
  skateTutorialJumpSeen: false,
  skateTutorialRampSeen: false,
  skateTutorialGrindSeen: false,
  skateTutorialGrindExitSeen: false,
  skateTutorialMegaSeen: false,
  attempts: 0,
  lastFailure: '',
  sameFailureCount: 0
}
```

As quatro flags solicitadas foram acrescentadas, mais uma para salto normal. Exibir a mensagem não marca a ação como aprendida: os estados são confirmados por salto real, lançamento segurado até a saída, captura real, `GRIND_OLLIE_OUT` e lançamento Mega seguido de pelo menos 350 ms de sustentação real.

Tentativa só é registrada quando a física começa, não ao abrir/reabrir briefing. Flags já aprendidas não são apagadas por atualizações parciais. Saves anteriores recebem valores padrão sem perder moedas, inventário, visitas ou missões. O estado não serializa imagens ou objetos de física.

## Diagnóstico das falhas

São utilizados eventos e dados existentes: posição, tempo físico, lançamento e sua qualidade, release curto em modo RAMPA, preparação da rampa, proximidade física de rail sem hold, captura/saída do grind e estado do Mega Air. Não foi criada chance artificial de falha.

Exemplos de dicas:

- Rampa com release precoce: “NAS RAMPAS, SEGURE SPACE ATÉ A SAÍDA.”.
- Passagem fisicamente próxima de rail sem hold: “NO AR, SEGURE SPACE PERTO DO RAIL.”.
- Fim do rail ainda segurando, seguido de queda: “SOLTE SPACE ANTES DO FIM DO RAIL.”.
- Mega fraco ou interrupção: “ENTRE COM VELOCIDADE E SEGURE SPACE NA RAMPA E NO MEGA AIR.”.
- Gap sem salto: “NO CHÃO, TOQUE SPACE PERTO DA BORDA.”.
- Sem evidência suficiente: convite neutro para consultar os controles no pause.

Uma mesma morte é registrada uma vez. Após três falhas consecutivas pelo mesmo motivo, a tela acrescenta explicação mais detalhada e o aviso contextual pode reaparecer. Uma mudança do motivo reinicia a contagem; concluir a run limpa a sequência. Nenhuma assistência muda atributos ou a física.

## Pause e leitura do cenário

P ou Esc abre o pause do Skate:

1. CONTINUAR.
2. CONTROLES.
3. VOLTAR À ILHA.

A tela CONTROLES reapresenta os seis cartões. Física, elapsed, posição, combo e tempos de sustentação não avançam durante a pausa. Confirmações do menu não viram salto/restart. Se o jogador pausa ainda segurando SPACE em um grind e continua mantendo a tecla, o hold é preservado ao retomar; soltar realmente continua produzindo o Super Jump Out normal.

Rampas recebem acento visual âmbar na superfície; rails, acento ciano. São traçados sobre os mesmos pontos de desenho existentes, sem novo collider. As placas de instrução do percurso foram traduzidas para SEGURE SPACE, SEGURE / SOLTE, SOLTE SPACE, ESCADARIA e ATERRISSE. Só os textos dessas placas mudaram no arquivo do curso.

O HUD agora mostra “SKATE · AVANÇO AUTOMÁTICO” e “SPACE: CONTEXTUAL · P / ESC: PAUSE”. A antiga linha longa em inglês deixava instrução e nome do trecho competindo no mesmo espaço.

## Dificuldade e física preservadas

Arquivos de física, parser de SPACE, traversal/grind, manobras, combos, colisões e desenho procedural permaneceram iguais por hash. Nenhum gap, rail, força, velocidade, altura, janela de captura ou Mega Ramp foi alterado.

Geometria serializada, amostras da curva de velocidade e simulação de referência antes/depois foram comparadas. Resultado idêntico:

- Fim em x = 25.849.
- 104,18 segundos de tempo físico.
- 19.567 pontos.
- 62 saltos.
- 39 aterrissagens.
- Mesmos lançamentos e hash do traçado da run.

A run completa no navegador, com o coach ativo, também terminou com esses mesmos valores e 20 lançamentos de rampa. A amostra de renderização registrou aproximadamente 60 FPS.

## QA

243/243 testes automatizados passaram: suíte completa do Skate, 16 testes novos do coach/save, briefing compartilhado e regressões de Comerciante, mapa, mochila e missões/NPCs. Um corte de texto detectado no fallback de compatibilidade do briefing foi corrigido antes da validação final.

12 verificações direcionadas de navegador passaram na versão integrada:

1. Briefing contextual e simulação congelada durante a leitura.
2. Confirmação e countdown sem salto/hold acumulado.
3. Primeiro gap, toque real e salto normal existente.
4. Rampa, preparação BOA e flag somente após lançamento real.
5. Captura, dica de SOLTE, pause/CONTROLES, hold preservado e saída real com Super Jump Out.
6. Mega com lançamento e sustentação reais.
7. Três releases precoces reais seguidos de queda: dica detalhada específica.
8. Rail próximo sem hold, seguido de queda: dica de captura.
9. Hold até o fim de rail e queda: dica de saída.
10. Reload conserva flags/histórico e não repete instrução já aprendida.
11. Pause permite saída explícita para a ilha.
12. Zero erros de execução ou carregamento.

Mais uma verificação fez a run inteira usando o piloto de teclado de QA, com coach ativo e física normal, comparando o resultado com a referência anterior. Esse piloto não é carregado pelo jogo oficial.

ZERO 404, TypeError, ReferenceError e erros/avisos de console nas sessões finais registradas. Perfil e origem locais isolados: o save do navegador do usuário não foi lido nem alterado.

**Limitação:** não foi realizado playtest com uma pessoa que nunca jogou. Os testes confirmam comportamento, comunicação exibida, persistência e ausência de alteração da dificuldade; não substituem observar a compreensão de um jogador iniciante real.

## Arquivos

Modificados: `festival_economy.js`, `pre_game_brief.js`, `pre_game_brief_configs.js`, `index.html`, `skate/skate_ollie_runtime.js` e, somente nos textos de placas, `skate/official_procedural_course.js`.

Novos: `skate/control_coach.js`, `skate/control_coach.test.cjs`, `skate/control_coach_save.test.cjs`.

Evidências nesta pasta: logs, capturas, baseline/integrated, hashes e cópias anteriores em `before/`.
