# QA final — Arquearia 2.0

Data: 20/10/2026.

## Resultado

39 de 39 verificações aprovadas, mais 17 verificações complementares. Uma vitória e uma derrota completas executadas no Chrome real. Nenhuma alteração em código de produção ou assets foi necessária nesta rodada.

## Método e limites

- Chrome em modo headless, Canvas real, perfil e save de teste separados, cache desativado, capturas de tela e monitoramento de rede/console.
- A URL do XAMPP recusou conexão. Os arquivos do projeto foram servidos temporariamente em `http://127.0.0.1:8787/`. Isso valida a aplicação, mas não confirma disponibilidade/configuração do Apache na URL habitual.
- Entrada pela ilha, interação com E, início com Espaço, resultado, retorno e movimento no overworld foram exercitados no navegador.
- A derrota usou comandos de teclado pouco eficazes. A vitória usou o controlador de movimento/disparo de QA já existente (`archeryQaAuto`), sem alterar placares ou forçar vitória. Ambas rodaram os 60 segundos completos, em tempo real. Não foi uma sessão de jogo manual humana.
- Casos raros e limites geométricos foram reproduzidos separadamente no navegador com cenários controlados. Testes exaustivos de trajetórias usam os módulos reais, sem substituir colisão ou pontuação.
- A inspeção visual foi feita nas capturas da partida, dos resultados, do pássaro antes/depois do acerto e da galeria de tiro dos dois personagens.

## Partidas completas

### Derrota

- Zorp **144 × 2.544 Mestre**; 17 flechas de Zorp e 37 do Mestre.
- 60 segundos de partida, seguidos da resolução das flechas em voo. O intervalo medido até terminar a coleta/retorno foi 61,642 segundos.
- Vitória falsa, empate falso, nenhuma medalha concedida ou salva.
- Quatro fases visitadas; 10, 15, 19 e 23 entradas de alvos, respectivamente.
- Resultado legível; Espaço retornou a `ILHA_ARCO`; movimento funcionou após a volta.

### Vitória

- Zorp **2.008 × 1.416 Mestre**; 58 flechas de Zorp e 27 do Mestre.
- 60 segundos de partida, seguidos da resolução das flechas em voo.
- Vitória verdadeira; medalha ausente durante PLAYING/RESOLVING e entregue somente após a resolução.
- Mestre errou 8 flechas nesta partida.
- Quatro fases visitadas; 10, 16, 20 e 27 entradas de alvos, respectivamente.
- Medalha `arco` persistiu após reload; nenhuma das outras sete medalhas oficiais foi desbloqueada.
- Espaço retornou a `ILHA_ARCO`; movimento funcionou e uma nova interação abriu o tutorial com placares zerados.

## Checklist obrigatório

### Sprites

1. **APROVADO — Zorp 2.0:** arquivo original carregou; manifest aponta para `zorp_arquearia2.0.png`. O jogo usa seu atlas derivado, sem desenhar a folha inteira.
2. **APROVADO — Mestre 2.0:** arquivo original carregou; manifest aponta para `mestre_arquearia2.0.png`, com atlas derivado em runtime.
3. **APROVADO — Costas durante tiros:** grupos de preparação, corda, mira e disparo usam orientação `BACK_UP`; confirmado também nas capturas.
4. **APROVADO — Sem mira lateral:** nenhum espelhamento ou rotação artificial foi observado em mais de 14 mil desenhos de personagens nas duas partidas.
5. **APROVADO — Animações:** preparação, disparo, recuperação, erro e vitória apareceram. Os 88 recortes foram desenhados individualmente, com transparência e anchors consistentes; a galeria de tiro foi inspecionada visualmente.

### Arena

6. **APROVADO — Vale:** montanhas, vegetação, plataforma seca e vale aparecem em câmera fixa.
7. **APROVADO — Cachoeira:** comparação entre dois instantes registrou 1.673 pixels animados na região da queda d'água.
8. **APROVADO — Rio:** correnteza/reflexos animam; 1.265 pixels mudaram na amostra do rio, sem alterar a amostra da plataforma seca.
9. **APROVADO — Leitura:** alvos ficam à frente do cenário. A cobertura na nascente serve à entrada natural; HUD e vegetação não encobriram a disputa observada.

### Alvos no rio

10. **APROVADO — Entrada:** 189 combinações de tamanho, velocidade, entrada e trajetória começaram ocultas e entraram no campo válido.
11. **APROVADO — Saída:** as mesmas 189 combinações percorreram o trajeto e saíram completamente.
12. **APROVADO — Sem teleporte:** trajetórias duplicadas produziram posições idênticas; nenhum erro de contenção no rio. Passo máximo normal de 1,30 pixel por tick.
13. **APROVADO — Lentos:** tiro real atingiu alvo em movimento; 46 pontos no caso observado.
14. **APROVADO — Médios:** tiro real atingiu alvo em movimento; 49 pontos no caso observado.
15. **APROVADO — Rápidos:** tiro real atingiu alvo em movimento; 38 pontos no caso observado. Esses valores refletem tipo, velocidade e zona de impacto de cada caso.

### Pássaros

16. **APROVADO — Alvo carregado:** disco pequeno claramente pendurado abaixo do transportador.
17. **APROVADO — Hitbox no disco:** colisões contra corpo, asa e corda não acertaram. Flecha no disco pontuou 78; flecha na asa pontuou zero.
18. **APROVADO — Continua voando:** após o acerto, reação breve e estado `FLYING_EMPTY`; trajeto preservado até sair da arena, sem queda ou explosão do pássaro.

### Explosivos

19. **APROVADO — Detonação:** flecha acionou explosão, efeitos e pontuação.
20. **APROVADO — Raio:** raio de 62 pixels. Alvo de raio 14 tangente a 76 pixels foi atingido; outro a 76,02 pixels permaneceu intacto.
21. **APROVADO — Combo:** caso de quatro alvos produziu 170 pontos, incluindo 40 de bônus, com feedback de combo.
22. **APROVADO — Reação em cadeia:** três explosivos detonaram uma vez cada, atingindo quatro alvos. Cem tentativas de reaplicar o acerto não aumentaram pontos ou eventos.
23. **APROVADO — Segurança:** Zorp e Mestre próximos não sofreram alteração de posição/reação pela área. Apenas entidades de alvo válidas participaram; o pássaro transportador permaneceu separado do disco.

### Dourado

24. **APROVADO — Raridade:** planejamento de 10 mil partidas manteve máximo de dois dourados e intervalo mínimo de 15 segundos; ausência nas ondas normais. Oportunidade tardia em 6.521 amostras e de clímax em 9.002; 352 não tiveram dourado.
25. **APROVADO — Dificuldade:** variantes pequenas, rápidas e previsíveis: raios de 7–8 pixels, velocidades de 2,30–2,40 pixels/tick. Janela observada de cerca de 1,9–3,7 segundos conforme rota.
26. **APROVADO — Pontuação:** testes com flechas deram 245 no centro, 170 no anel interno, 155 no externo e zero fora. Dourado de pássaro deu 270 no centro.

### IA

27. **APROVADO — Reação:** primeira percepção no tick 19 e primeiro disparo no 63 no cenário medido; sequência visível READY → RAISE → DRAW → AIM → RELEASE.
28. **APROVADO — Pode errar:** alvo que acelerou suavemente após a trava de mira escapou; o controle com trajetória anterior foi acertado. Houve oito erros reais do Mestre na partida vencida por Zorp.
29. **APROVADO — Sem aimbot:** sensores não consultaram propriedades de futuro/rota proibidas; mira usou amostras antigas e permaneceu sujeita à reação e precisão limitadas. É evidência dos cenários medidos, não prova de balanceamento para todo nível de jogador.
30. **APROVADO — Explosivos:** Mestre escolheu sozinho o explosivo de um cenário com alvos próximos, disparou e atingiu três alvos; 101 pontos, incluindo 15 de combo.

### Partida

31. **APROVADO — 60 segundos:** ambas as partidas alcançaram 3.600 ticks, sem encurtar o relógio; resolução posterior de pelo menos 24 ticks.
32. **APROVADO — Progressão:** fases 0/1/2/3 em ordem; introdução sem explosivos, rápidos e mais alvos nas fases seguintes; contagem 5, 4, 3, 2, 1 sem bloquear a partida.
33. **APROVADO — Placar:** placares visuais e valores de resultado coincidiram; ambos os competidores pontuaram.
34. **APROVADO — Resultado:** maior placar produziu vitória de Zorp em uma partida e do Mestre na outra, sem forçar os resultados.
35. **APROVADO — Medalha:** somente a vitória entregou a medalha correta, após resolver a partida; save e reload confirmados. `arco` e `arquearia` são aliases da mesma medalha; o save registra apenas o ID canônico `arco`.
36. **APROVADO — Retorno:** ambos os resultados voltaram à ilha do Arco; movimento e nova entrada no minigame funcionaram.

### Erros

37. **APROVADO — Zero 404:** nenhum HTTP >= 400 ou falha de carregamento na sessão monitorada. Assets prontos, zero falhas e zero desenhos inválidos.
38. **APROVADO — Zero TypeError:** nenhuma ocorrência na sessão monitorada.
39. **APROVADO — Zero ReferenceError:** nenhuma ocorrência na sessão monitorada. Também não houve outros erros ou warnings de console registrados.

## Performance e áudio

- Médias instrumentadas: **60,15 FPS** na derrota e **60,18 FPS** na vitória.
- Houve amostras mínimas de aproximadamente 9–10 FPS durante a coleta com capturas/instrumentação. Portanto, estes testes não demonstram 60 FPS constantes nem substituem medição em janela visível no equipamento do jogador.
- Limite de seis vozes de áudio respeitado. Na derrota, 233 fontes iniciadas e encerradas; na vitória, 346. Nenhuma voz ficou ativa ao final.
- Sem travamento nas duas partidas e nos retornos observados.

## Problemas e correções desta rodada

- Nenhum defeito de produção reproduzido que exigisse mudar gameplay, sprites ou arena.
- Corrigida apenas a asserção do teste de medalha: ela inicialmente confundia o alias `arquearia` com medalha adicional. Nova leitura do navegador confirmou exatamente uma das oito medalhas oficiais desbloqueada e persistência correta. A evidência anterior foi preservada no histórico de correções do JSON.
- XAMPP indisponível no endereço habitual; usado servidor temporário para realizar o teste real, sem alterar configuração do projeto.

## Arquivos e evidências

Arquivo adicionado ao projeto: `docs/archery_final_qa.md` (este relatório). Nenhum arquivo de produção alterado por esta rodada; hashes dos 12 arquivos de código/manifest monitorados permaneceram iguais.

Artefatos externos de QA, preservados em `C:/Users/Usuario/.codex/visualizations/2026/10/09/01a1223f-5e07-7c72-9211-5e97ab434100/`:

- `archery_complete_qa.cjs`: execução completa e cenários controlados.
- `archery_complete_followup.cjs`: revalidação do ID canônico da medalha.
- `archery_complete_qa_report.json`: 39 verificações, 17 extras, telemetria, rede, erros, hashes e histórico da correção de asserção.
- Capturas `archery_complete_*`: galeria de tiros, pássaros, explosivo, dourado, fases das partidas, resultados e retornos ao overworld.

O save usado pertence exclusivamente ao perfil temporário de QA; o progresso do jogador não foi usado para fabricar resultados.
