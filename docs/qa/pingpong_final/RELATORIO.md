# Ping-Pong — passe visual final

24/10/2026. Refinamento sobre o minigame existente, com prioridade para madeira, textos legíveis, torcida e decoração.

## Madeira e iluminação

O piso verde foi removido. Toda a área de competição agora possui tábuas de madeira em tons quentes, juntas alternadas e poucos veios de contraste baixo. As marcações esportivas continuam discretas, pintadas sobre a madeira.

A mesa recebeu azul-petróleo mais claro. A arquibancada permanece mais escura, com luzes suaves e volumes em degraus, sem blur ou gradientes. Sombras de mesa, personagens, postes e bolas foram preservadas.

## Torcida e decoração

**60 espectadores: 36 humanos e 24 aliens.** São 48 nas arquibancadas do fundo, em três fileiras, e 12 nas galerias frontais protegidas. Eles não cobrem a área da mesa nem a circulação dos competidores.

Humanos possuem tons de pele, cabelo, penteados, roupas, bonés, faixas e óculos variados. Aliens possuem cores, formatos de cabeça, antenas, olhos e roupas variados. Não há outras espécies ou personagens aleatórios.

As identidades são geradas uma vez por um gerador local independente do RNG da partida e permanecem fixas. Seis poses por pessoa são desenhadas uma única vez em um atlas Canvas. Durante a partida são reutilizadas, com palmas, braços, conversas, olhares e inclinação corporal em tempos diferentes. Pés e escala permanecem constantes.

Reações específicas: rally longo, defesa difícil confirmada, multiball, Raquetada Global, ponto importante, virada, Match Point e vitória. Fãs de Zorp, do Mestre e neutros se misturam. Um toque comum não provoca comemoração geral.

Entre os blocos da torcida há uma placa física com emblema de ilha/torneio, raquetes cruzadas, bandeirolas, ferragens e detalhes dourados. Foram retiradas as legendas decorativas minúsculas.

## Fonte, placar e HUD

Uma fonte bitmap local de **5×7 pixels**, desenhada em coordenadas inteiras, substitui os textos miúdos suavizados da arena. Os números usam escala 2; intro e resultado usam títulos maiores. Não depende de fonte web e não usa redução de fonte para encaixar texto.

O placar é suspenso por suportes, com moldura, parafusos, painel escuro e LEDs. Mostra os **pontos reais**, nomes dos jogadores, PING-PONG e a meta atual. Atualiza junto da confirmação do ponto.

**MATCH POINT** aparece quando um jogador tem exatamente um ponto a menos que a meta. Há destaque discreto do lado correspondente e maior reação da torcida. Funciona também em 49–49, mantendo a regra atual de primeiro a 50.

O especial foi movido para a extremidade inferior esquerda. O rótulo final solicitado é **ESPECIAL**, com `[SPACE]`, barra pequena e brilho discreto quando pronto. Durante cooldown aparece RECARGA. Na direita ficam o número real de bolas e as luzes do multiball. O número de rally redundante foi removido do HUD; sua intensidade é percebida nos efeitos e na arena.

## Intro e transição de ponto

A intro reutiliza os **1,63 segundos da contagem existente**:

1. aproximadamente 0,4 segundo de visão livre da arena;
2. ZORP / VS / MESTRE DO PING-PONG;
3. START!

Física, bola e IA permanecem bloqueadas até o início normal. Foi adicionado apenas um callback opcional de desenho ao briefing; outras modalidades mantêm sua contagem anterior.

Após um ponto válido, o placar atualiza, surge brevemente PONTO ZORP/MESTRE e o jogo retoma o saque com a pausa e recuperação existentes. Não há reposicionamento forçado enquanto outras bolas continuam válidas no multiball.

## Vitória e medalha

A condição de vitória continua sendo alcançar a meta atual, 50. Ao confirmar o resultado, a física fica encerrada, a torcida comemora e os personagens usam poses oficiais existentes: Zorp alterna IDLE/HIT, o vencedor destaca a raquete e o perdedor retorna a IDLE. Não foi criado sprite artificial ou squash/stretch de personagem.

A medalha é concedida **depois de 90 passos de apresentação do resultado**, aproximadamente 1,5 segundo a 60 Hz. O placar final já está visível antes disso. A mesma tecla Space mantida anteriormente não pula a comemoração; é preciso soltar e pressionar novamente depois da liberação.

Derrota não concede medalha nem remove uma medalha já obtida. O retorno à ilha e as falas atuais foram preservados. Saves e outros finais continuam usando os sistemas existentes.

## Câmera e otimizações

O enquadramento da mesa e a escala dos personagens foram mantidos. Shake foi restringido à Raquetada Global, contato extremamente rápido e ponto final; uma rebatida rápida comum não move mais a câmera.

O fundo é um Canvas estático em cache. A torcida usa um único atlas de 60 pessoas × seis poses, com 60 blits por quadro. Identidades e geometria não são recriadas por frame. Permanecem os limites de contatos, partículas, rastros e saídas de bola, além de um único buffer de retenção visual.

## Mecânica preservada

- `pingpong_ball.js`, `pingpong_master_ai.js` e `pingpong_multiball.js` permanecem byte a byte iguais.
- Física ao vivo, movimento, raquetes, lançamento, quique obrigatório, aceleração, seleção da IA, emissão escalonada, Raquetada Global e confirmação de pontos não mudaram.
- Os únicos ajustes de fluxo são a aparência da contagem e a apresentação/entrega de medalha após a luta já encerrada.
- Código das outras cenas conferido sem alterações, exceto o callback opcional do briefing, cuja ausência mantém o comportamento anterior.

## QA

- Regressão de 18.000 passos com e sem desenho, incluindo os dois especiais, mantém estados físicos e consumo de RNG idênticos.
- Testes de fonte, personagens, atlas único, assincronia, limites da torcida, Match Point, virada, defesa difícil, ausência de shake comum, intro e medalha após comemoração aprovados.
- Testes antigos de feedback e briefing preservados.
- Chrome real com perfil/save isolados: 1, 3, 5 e 10 bolas; rally lento/extremo; Raquetada Global com dez bolas; Match Point; vitória antes da medalha; medalha após comemoração; Space mantido bloqueado; retorno à ilha; derrota sem medalha; emissão física do multiball.
- Vitória e derrota foram verificadas em cenários controlados do ponto final, com trajetórias e colisões reais. Um adversário imóvel foi usado na fixture de vitória para tornar o erro reproduzível; esse ajuste não existe no jogo entregue.
- Amostras de 180 frames com 1/3/5/10 bolas: aproximadamente **60 FPS** em todos os casos.
- Testes finais do navegador sem 404, TypeError, ReferenceError ou falha de rede.

## Arquivos

- Novos: `pingpong_pixel_font.js`, `pingpong_crowd.js`, `pingpong_arena_art.js`.
- Atualizados: `pingpong_presentation.js`, `pingpong_feedback.js`, `script.js`, `index.html`.
- `pre_game_brief.js`: callback opcional exclusivamente visual para a intro.
- Testes: `pingpong_final.test.cjs`, `pingpong_test_harness.cjs`, `pingpong_presentation.test.cjs`, `pingpong_feedback.test.cjs`.

Capturas e evidências: `final-*.png`, resultados dos testes, `browser-qa.json` e `mechanics-integrity.json` nesta pasta.

## Validação da versão integrada

**60 testes aprovados** na pasta final. No Chrome, **15 cenários aprovados**, sem falhas de rede ou exceções. O teste ativo de 181 frames teve entre oito e dez bolas válidas, pico de dez bolas e 16 partículas: **59,998 FPS**, com física e IA em execução. Foram conferidos também os quatro cenários visuais de 1/3/5/10 bolas. A captura final confirma o rótulo **ESPECIAL [SPACE]**. Hashes dos arquivos finais e integridade dos três módulos de mecânica conferidos novamente.
