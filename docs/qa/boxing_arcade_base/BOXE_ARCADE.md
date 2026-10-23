# Boxe — base arcade livre em 2.5D

## Implementação

A arena, os sprites normais oficiais 3.0 e os anchors dos lutadores foram aproveitados. A base anterior já possuía movimento em profundidade; o combate foi consolidado com o novo mapeamento, combos e término por vida, removendo os antigos dash, ataque carregado, burst automático, recuperação de HP e finalização cinematográfica da lógica ativa.

### Controles

- A/D: mover horizontalmente.
- W/S: mover em profundidade no piso.
- J: golpe leve, um comando por pressionamento.
- K: golpe pesado.
- Segurar L: defesa; movimento reduzido, dano residual e recuo preservados.
- I: esquiva direcional curta; sem direção, sai da linha do adversário.
- O: ponto de extensão reservado para especial. Nenhum especial foi instalado nesta etapa; apertar O não cria golpe, dano ou invulnerabilidade.
- R: reiniciar após o resultado; Escape retorna pela rota existente.

### Combate

- Ambos iniciam com 100 HP. Ao atingir zero ocorre KO, pequena pausa de 0,8 s e resultado. Não há recuperação de vida. O vencedor mantém as recompensas existentes.
- Simulação fixa de 60 passos por segundo, dirigida por deltaTime. Movimentos, animações e janelas não aceleram em telas de 120/144 Hz.
- Colisão dos corpos no piso, separação iterativa nas cordas e limites trapezoidais do ringue. Profundidade participa da colisão e da distância.
- Os dois lutadores se orientam um para o outro; o golpe mantém sua direção e linha de profundidade comprometidas no início. Não segue o adversário magicamente.
- Leve: 6 de dano, alcance 52, preparação de 6 passos; pesado: 14 de dano, alcance 63, preparação de 12 passos, maior recuo e recuperação. Errar o pesado deixa 12 passos extras de abertura.
- Defesa reduz o dano base a 25%, arredondado: leve causa 2; pesado, 4. Pressão acumulada pode abrir a guarda por 36 passos. Bloquear ainda causa recuo.
- Esquiva: duração de 22 passos; proteção apenas nas idades 3–10; cooldown de 44 passos. Fora da janela, o lutador pode sofrer o golpe. Uma evasão de contato real abre pequena oportunidade de contra-ataque.
- Combos: buffer de 12 passos, até 3 acertos. Um leve conectado pode encadear outro leve ou pesado na recuperação. J → J → K causa 6 + 7 + 16 quando todos acertam. Erro, defesa adversária ou dano recebido interrompem a sequência. Não existe cancelamento livre de pesado errado.
- Contatos simultâneos são avaliados antes do recuo/dano; um KO duplo termina em empate, sem escolher vencedor aleatório.
- IA usa os mesmos golpes, colisões, defesa e esquiva. Percebe posições/ameaças por decisões espaçadas, aproxima-se e muda de linha. Não usa os especiais antigos.
- Briefing, dicas de controles e as falas instrutivas do treinador/árbitro foram atualizados. A estrutura visual dos outros esportes permaneceu intacta.

## Validação

16 testes da base e 24 testes do briefing: 40 aprovados. Cobrem vida inicial, colisão nos quatro cantos, sobreposição junto à parede, alcance, profundidade, defesa, pressão, esquiva bem e mal cronometrada, anti-spam, combo, recuperação de erro, orientação, especial vazio, vitória, derrota, reinício, KO duplo e pausa. O movimento foi comparado em 30, 60 e 144 FPS.

No Chrome isolado, com o jogo real e eventos de teclado enviados por automação:

- Briefing aparece, mantém a luta parada e inicia corretamente.
- WASD move os lutadores; todos os cantos respeitam os limites.
- Segurar J e repetir keydown não gera metralhadora de golpes.
- Leve tira 6 e pesado tira 14, com recuo maior no pesado.
- Distância excessiva e diferença de profundidade fazem os golpes errarem.
- L reduz o dano e soltar a tecla encerra a guarda; I usa a animação de esquiva normal.
- O não executa nenhum especial.
- Combo verificado no runtime real por passos controlados.
- Duas lutas completas com IA e controle do jogador por eventos de teclado: primeira vitória de Zorp com 33 HP; segunda vitória do Mestre com 4 HP. Essas duas execuções confirmam os dois fluxos, sem representar uma avaliação estatística de balanceamento.
- A versão final encerra os efeitos de dano após KO; não fica um halo de impacto permanente no resultado.
- 92 de 92 assets carregados, nenhum caminho falhou. Zero 404, TypeError, ReferenceError ou outros erros de JavaScript registrados.

O save normal do jogador não foi utilizado. Os cenários de QA usam um navegador e origem locais isolados.

## Arquivos

- boxing_arena.js: combate, colisões, combos, relógio e estrutura de especiais.
- boxing_presentation.js: amostragem nítida da arena/cordas, sem smoothing.
- script.js: novo mapeamento e textos instrutivos do boxe.
- pre_game_brief_configs.js: controles reais do boxe.
- index.html: versões de cache.
- boxing_arcade.test.cjs: testes da base.

Nenhum PNG foi substituído ou alterado. Nenhuma mecânica de outra modalidade foi editada.
