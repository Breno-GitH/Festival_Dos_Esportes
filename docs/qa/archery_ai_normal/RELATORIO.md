# Arquearia — IA do Mestre em dificuldade NORMAL

## Implementação

- Arquivo principal: `archery_master_ai.js`; cache atualizado em `index.html`.
- `archery_master_normal.test.cjs`: 11 testes focados na IA. Total com a regressão da arena: 31 testes aprovados.
- Progressão leve: `masterSkill` 0,50 → 0,60. A consistência de mira permanece entre 0,70 e 0,74.
- Reação diferente por tentativa, usando observações atrasadas. Não há acesso a rotas, spawns futuros, teclas de Zorp ou correção da flecha em voo.
- O ruído de mira e de previsão é amostrado uma vez por tentativa. O Mestre escolhe uma região da face do alvo, com dispersão física; não recebe HIT/MISS por sorteio.
- Alvos pequenos, rápidos, curvos, de pássaro, dourados ou distantes têm dispersão maior.
- A escolha ponderada considera valor, alcance, dificuldade, tempo restante e corredor provável de tiro de Zorp. Duas alternativas legíveis podem ser escolhidas, em vez de selecionar sempre o máximo.
- O Mestre reconhece combos simples com até dois vizinhos observados do explosivo. O dourado tem interesse moderado e não garante tentativa ou acerto.
- Sequência preservada: OBSERVE → DECIDING → READY → RAISE_BOW → DRAW_BOWSTRING → AIM → RELEASE_SHOT → RECOVERY.
- Após travar a mira em AIM, a saída permanece comprometida mesmo se o alvo escapar. Perder o alvo durante a preparação exige nova decisão.
- Arena, pontuação, colisão contínua, duração, spawns, controles e sprites permanecem nos arquivos anteriores.

## Parâmetros finais

- Unidade interna: passos da simulação fixa de 60 Hz, independente do FPS de apresentação.
- `reactionDelay`: 21–39 passos, 350–650 ms. Centro da faixa passa de 31 para 28 passos; variação ±8 com limites. Não acumula variação de uma tentativa para outra.
- `decisionDelay` / `decisionTime`: centro 18 → 16 passos, com variação ±4; faixa total 12–22 passos = 200–367 ms.
- `accuracy`: 0,70 → 0,74. É um fator de consistência da mira, não uma probabilidade de atribuir ponto.
- `predictionError`: 0,075 → 0,055; dispersão gaussiana na estimativa da velocidade. Confiança da extrapolação limitada a 0,65–0,97.
- `aimError`: base 4 → 3,5 px, somada à dificuldade e a um ponto de mira que pode variar até ±45% do raio na face.
- `shotCooldown`: centro 50 → 46 passos, variação ±6; faixa total 40–56 passos = 667–933 ms. A decisão, a animação e o reposicionamento também compõem o intervalo real entre tiros.
- READY 9, RAISE 11, DRAW 13, AIM 16 → 14, RELEASE 8, RECOVERY 21 passos.
- Leitura visual a cada 6 passos; velocidade de deslocamento 3,20 px/passo; sem aceleração artificial no fim.
- Erro de avaliação de candidatos: ±24%, preservado até o final. Escolha ponderada entre no máximo dois candidatos com pelo menos 60% do valor do melhor candidato avaliado.
- Limite de memória de eventos: 600 registros para auditar a partida inteira.

## Cinco partidas completas no navegador

Playtest automatizado em Chrome real, numa instância isolada. Cada partida usou os 60 segundos normais, resolução das flechas após o apito, briefing e retorno à ilha. O save pessoal não foi usado. O mesmo controlador de Zorp foi mantido nas cinco partidas: movimentação por entradas A/D e disparo por nova entrada de Space, sem teleporte, alteração de hitbox ou pontuação automática. Ele estima movimento a partir de posições observadas; não lê rotas futuras.

Acertos abaixo são flechas que fizeram contato direto. Os alvos adicionais da explosão aparecem separadamente no registro original; não inflam a taxa de acerto por flecha.

- Partida 1: Zorp **1085** × Mestre **539**. Mestre: 21 flechas; 11 acertos diretos; 10 erros; 3 moscas; 1 explosivo atingido diretamente; 0 dourados atingidos. Alvos totais do Mestre, contando explosões: 15. Duração medida: 60.41 s, mais a entrada/saída.

- Partida 2: Zorp **908** × Mestre **252**. Mestre: 18 flechas; 7 acertos diretos; 11 erros; 1 mosca; 0 explosivos atingidos diretamente; 0 dourados atingidos. Alvos totais do Mestre, contando explosões: 7. Duração medida: 60.41 s, mais a entrada/saída.

- Partida 3: Zorp **596** × Mestre **717**. Mestre: 21 flechas; 12 acertos diretos; 9 erros; 3 moscas; 2 explosivos atingidos diretamente; 0 dourados atingidos. Alvos totais do Mestre, contando explosões: 18. Duração medida: 60.42 s, mais a entrada/saída.

- Partida 4: Zorp **790** × Mestre **371**. Mestre: 17 flechas; 8 acertos diretos; 9 erros; 1 mosca; 1 explosivo atingido diretamente; 0 dourados atingidos. Alvos totais do Mestre, contando explosões: 10. Duração medida: 60.40 s, mais a entrada/saída.

- Partida 5: Zorp **572** × Mestre **674**. Mestre: 16 flechas; 7 acertos diretos; 9 erros; 4 moscas; 2 explosivos atingidos diretamente; 1 dourado atingido. Alvos totais do Mestre, contando explosões: 13. Duração medida: 60.44 s, mais a entrada/saída.

Resumo do lote: Mestre venceu 2/5, acertou 45/93 flechas (48.4%), com 12 moscas (12.9% dos disparos). Isso descreve este controlador e esta amostra, não garante uma taxa para jogadores humanos.

## Calibração adicional

36 partidas simuladas com a versão final: 12 contra controlador fraco, 12 contra intermediário e 12 contra um controlador preciso. As políticas foram mantidas fixas durante a comparação; não há ajuste por placar na IA.

- Controlador fraco: Mestre venceu 11/12; médias Zorp 418.7 × Mestre 662.8.
- Controlador intermediário: Mestre venceu 4/12; médias Zorp 676.0 × Mestre 484.1.
- Controlador preciso: Mestre venceu 0/12; médias Zorp 2207.7 × Mestre 325.2.
- Alvos fáceis: grandes e lentos: 90/127 flechas acertaram fisicamente (70.9%). A classificação usa o alvo pretendido no momento do tiro; interferência do outro competidor também pode causar erros.
- Alvos médios: 155/280 flechas acertaram fisicamente (55.4%). A classificação usa o alvo pretendido no momento do tiro; interferência do outro competidor também pode causar erros.
- Alvos difíceis: pequenos, rápidos, pássaros ou dourados: 102/230 flechas acertaram fisicamente (44.3%). A classificação usa o alvo pretendido no momento do tiro; interferência do outro competidor também pode causar erros.

## Validação e limites

- Desempenho observado: 60.00 FPS numa janela de 180 quadros durante gameplay.
- Erros de console/execução: 0. Respostas HTTP ≥400: 0. Falhas de carregamento não canceladas: 0.
- Cinco briefings pausados e cinco partidas com frame final 3600; todas as flechas tiveram acerto ou erro resolvido.
- Nenhum NaN ou violação de limite de movimentação.
- Regressão de colisão contínua, primeiro alvo, pássaro, explosivo, dourado, pontuação e simulação equivalente a 30/60/144 FPS aprovada.
- Nenhum resultado foi forçado: os controladores apenas movimentam e disparam, e a física decide os acertos.
- Há variação de placar por oportunidades de explosão e dourado. A amostra automatizada avalia consistência mecânica; a sensação de dificuldade humana ainda depende de quem joga.

## Arquivos desta etapa

- Runtime: `archery_master_ai.js`, `index.html` (versão do cache).
- Testes: `archery_master_normal.test.cjs`.
- Evidências: `docs/qa/archery_ai_normal/browser-results.json`, `policy-simulations.json`, capturas e este relatório.

Verificação adicional: o projeto integrado foi recarregado diretamente do diretório real, sem sobreposição de arquivos. Briefing pausado e primeiro disparo do Mestre validados; zero erros. Hashes e verificação de arquivos preservados em `integration.json`.
