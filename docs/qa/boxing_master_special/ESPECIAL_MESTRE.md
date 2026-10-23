# Especial do Mestre — carga e dash punch

## Comportamento entregue

- Barra independente de 0 a 100, inicialmente vazia. Enche com trocas de golpes e proximidade de combate. O próprio dash não devolve carga ao Mestre.
- Consome a barra inteira; cooldown mínimo de 12 segundos. A barra cheia sozinha não elimina o cooldown.
- IA decide na sua janela normal de observação. Prefere distância horizontal de 90–205 unidades, profundidade alinhada (até 9 unidades), disputa em andamento ou reversão de pressão. Não há sorteio de uso do especial.
- Com barra cheia, pode dar alguns passos reais para trás para preparar distância média. Respeita cordas e não teleporta.
- CHARGE: 36 passos a 60 Hz (0,6 segundo), três poses próprias e brilho pequeno na luva. Não avança nem causa dano nessa preparação.
- DASH: velocidade de 10 unidades por passo, até 220 de deslocamento, encerrado antes por contato ou limite do ringue. Direção e linha são registradas no início e não acompanham o jogador.
- Contato exige alcance da luva e diferença de profundidade de no máximo 11 unidades. O alcance percorrido é testado continuamente para não atravessar o adversário entre passos.
- Acerto: um único impacto, 28 de dano, recuo de 24 unidades (limitado pelas cordas), hitstun e feedback de golpe forte.
- Guarda: 14 de dano, quebra imediata da guarda e recuo significativo. Sair da linha ou usar I no momento correto é a resposta mais segura.
- RECOVERY: 20 passos após contato; 36 passos (0,6 segundo) após erro, com três poses de recuperação. Pode receber golpes e ser interrompido. A carga também é vulnerável.
- Esquiva evita o impacto sem retargeting: o Mestre termina o avanço na direção original. O counter contextual de seis socos do Zorp continua utilizável quando o golpe realmente está prestes a conectar.

## Arte e integração

Fonte exclusiva: `mestre_boxe3.0_especial.png`, RGB 1254 × 1254. O original permanece intacto.

Oito poses curadas, sem grade uniforme: `charge_stance`, `charge_low`, `charge_arm`, `dash_drive`, `dash_punch`, `recover_low`, `recover_knee`, `recover_ready`.

Os recortes acompanham a silhueta. As separações entre poses não cruzam pixels sólidos. A remoção do matte preto preserva os detalhes escuros internos do personagem; transparência é aplicada somente no cache de desenho. Não existe outline branco adicionado.

Todos os frames usam escala uniforme 0,47 dentro do canvas comum de 320 × 224, anchor dos pés em (160,210). O renderer aplica a mesma escala de profundidade dos sprites normais. `imageSmoothingEnabled = false` no recorte, cache e desenho.

Arquivos de implementação:

- `boxing_master_special.js`: recurso, estados, estratégia, preparação, avanço, recuperação, brilho, rastros e barra.
- `boxing_master_special_atlas.js`: bounds e máscaras de origem das oito poses.
- `boxing_arena.js`: integração do controlador de cada lutador, contato do dash, dano/guarda, render e QA snapshot.
- `index.html`: preload dos dois scripts novos e versão do renderer atualizada.
- `tools/prepare_boxing_master_special.py`: reconstrução reproduzível do atlas a partir do PNG original.
- `boxing_master_special.test.cjs`: 23 testes específicos, incluindo a compatibilidade com o especial do Zorp.

## Validação realizada

96 testes automatizados passaram: base do boxe, combos/defesa/esquiva, especial do Zorp, especial do Mestre e briefing.

Navegador real: Chrome com automação de teclado e inspeção do Canvas, em origem e perfil isolados. Os cenários direcionados usam posições e barras de desenvolvimento; a luta completa usa carga ganha durante o combate. O save normal do jogador não foi utilizado.

Resultados:

- Preparação completa sem dano antecipado; PNG e oito frames carregados.
- Acerto: Zorp 100 → 72 HP, apenas um impacto.
- Defesa: Zorp 100 → 86 HP e guarda quebrada.
- Movimento W durante preparação: 100 HP, dash erra a linha.
- I no momento correto: 100 HP e janela de contra-ataque.
- Erro seguido de aproximação física por A/S e golpe K: Mestre 100 → 86 HP, recuperação punida.
- Especial contextual do Zorp contra dash iminente: seis socos, Zorp sem dano e Mestre com 66 HP.
- IA ativa por alinhamento e pressão; outro cenário confirma recuo físico para distância média.
- Uma luta completa chegou ao resultado, vitória do Zorp, três especiais do Zorp e um dash do Mestre. O dash do Mestre falhou ao jogador sair da linha.
- Simulação consistente a 30, 60 e 144 FPS; pausa e documento oculto congelam carga/animação/cooldown.
- Zero respostas HTTP 404 ou outras falhas de carregamento; zero erros JavaScript, incluindo TypeError e ReferenceError, na sessão observada.

Evidências: `browser-results.json`, `integration-tests.txt`, `atlas-validation.json`, `atlas-preview.png` e capturas `master-*.png`.
