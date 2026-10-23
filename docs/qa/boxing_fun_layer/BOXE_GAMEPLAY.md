# Boxe — combos, pressão e resposta

## Sistemas evoluídos

A arena, sprites normais, controles, colisão, perspectiva e estrutura de 100 HP/KO foram mantidos. A camada de gameplay aproveita a base 2.5D existente.

### Combos

- J → J → K: 3 acertos, 29 de dano total.
- J → K: 2 acertos, 21 de dano total.
- J → J → J: 3 acertos, 21 de dano total.
- O buffer de 12 passos aceita a próxima tecla sem exigir precisão de um único frame.
- Um leve conectado pode encadear o próximo golpe no início da recuperação. O pesado encadeado usa preparação de 8 passos, em vez dos 12 de um pesado isolado, para conseguir conectar dentro do hitstun.
- O contador e o bônus só avançam se o próximo contato ocorrer enquanto o alvo continua no hitstun causado pelo mesmo atacante. Golpes separados por uma abertura não são somados como se fossem combo.
- Bloqueio, erro, distância/profundidade inadequadas ou resposta tardia interrompem a continuidade. O terceiro acerto não pode ser cancelado em um quarto golpe; não existe combo infinito.

### Ritmo de golpes

- Hitstun do leve: 12 passos (200 ms); pesado: 18 (300 ms).
- Recuperação normal: leve 10 passos, pesado 18, além da preparação e contato.
- Errar adiciona 4 passos de recuperação no leve e 8 no pesado. O ciclo completo de um pesado errado é aproximadamente 0,7 segundo.
- Contra-ataque conectado acrescenta 4 passos de hitstun, sem imobilização longa.

### Guarda

- Segurar L continua reduzindo o dano base a 25%, com arredondamento: leve causa 2; pesado, 4. O recuo permanece.
- A barra existente indica pressão na guarda. Cada leve bloqueado acrescenta 18; pesado, 34.
- Manter a defesa acrescenta 0,28 de pressão por passo: mesmo sem receber golpes, a guarda quebra após cerca de 6 segundos contínuos.
- Soltar a guarda recupera 0,75 por passo; a pressão não desaparece instantaneamente ao tocar/soltar L.
- Ao quebrar, a guarda fica indisponível por 30 passos (0,5 segundo), com pose de stun, aviso visual e som. Parte do desgaste permanece.
- O ponto de extensão `BoxingSpecials.onBlocked(target)` já aplica pressão forte (72) para futuros especiais. Ele retorna se houve quebra; pressão menor que o limite também é aplicada. Nenhum golpe especial novo foi instalado nesta etapa.

### Esquiva e contra-ataque

- I executa uma esquiva de 18 passos, com deslocamento nos primeiros 8, cooldown de 40 e evasão apenas nas idades 3–10.
- O teste reconhece uma saída bem cronometrada da linha do golpe usando a posição de origem da esquiva. Um ataque que nunca ameaçou essa posição não concede contra-ataque gratuito.
- Esquivar um contato válido abre 32 passos para resposta. A partir da idade 10, um ataque buffered pode encerrar a recuperação da esquiva mais cedo.
- A resposta recebe +3 de dano e feedback CONTRA!, desde que realmente acerte. Alcance e profundidade continuam obrigatórios; não existe correção automática de posição/mira.
- Uma esquiva precoce, tardia ou sem ameaça não oferece os mesmos benefícios.

### Impacto

- Pausa real de contato, em tempo de simulação: leve 1 passo (~17 ms), pesado 2 (~33 ms), contra-ataque/quebra 3 (~50 ms), bloqueio 1.
- Ambos os lutadores pausam juntos; os comandos recebidos nesse intervalo permanecem pendentes. O efeito anterior de congelar apenas a pose foi removido para não somar travas artificiais.
- Shake leve, recuo, partículas curtas e avisos continuam integrados à apresentação existente. Os textos de esquiva/contra-ataque não se sobrepõem; a quebra usa um único aviso persistente.
- Sons nativos em Web Audio: impacto leve, pesado, bloqueio, esquiva, contra-ataque e quebra. Buffer de ruído criado uma vez, envelopes curtos, volume baixo, limite de 4 vozes e sem novos arquivos/dependências.

## Validação

56 testes integrados aprovados: 16 da base, 16 da camada nova e 24 do briefing. Incluem os três combos, interrupções, limite de acertos, hitstun real, recuperação, guarda por tempo/pressão, API de pressão especial, esquiva, contra-ataque imediato/tardio, alcance, profundidade, hit pause com input preservado e equivalência em 30/60/144 FPS.

No Chrome isolado, usando o jogo real e eventos de teclado enviados por automação:

- Os três combos produziram os danos e contagens esperados.
- Segurar L sem ataques quebrou a guarda; bloquear três pesados também quebrou, com 12 de dano residual acumulado.
- I seguido de J em uma esquiva válida evitou o pesado e causou 9 de dano de contra-ataque.
- A pausa de pesado manteve os mesmos frames de ataque e hitstun, preservando o próximo comando.
- Os sons foram reproduzidos, com limite de vozes respeitado e fontes encerradas após os efeitos.
- Uma luta completa com IA também chegou ao resultado por KO.
- 92 de 92 assets carregados; zero 404, TypeError, ReferenceError ou outros erros de JavaScript registrados.

O save normal do jogador não foi utilizado. Evidências finais: browser-results.json, integration-tests.txt e capturas dos combos, quebras e contra-ataque.

## Arquivos alterados

- boxing_arena.js: regras e relógios da camada de gameplay.
- boxing_presentation.js: sons curtos e remoção do freeze visual duplicado.
- boxing_arcade.test.cjs: combo da base atualizado para a janela real de conexão.
- boxing_fun.test.cjs: cobertura dos novos comportamentos.
- index.html: cache dos dois módulos atualizado.

Sprites, outras modalidades e lógica de saves/recompensas não foram alterados.
