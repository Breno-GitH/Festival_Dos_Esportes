# Escalada — ligação entre lógica e animação

Implementação: `climb_sprites.js`. Os eventos de `script.js` notificam a camada
visual depois que as regras existentes autorizam a ação. A animação não escreve
em posição, velocidade, colisões, vidas, checkpoints, medalhas ou controles.

## Estados e grupos utilizados

- **GRABBED parado:** `CLIMB_IDLE` → `idle_01–04`, de costas.
- **GRABBED com alcance lateral A/D:** `CLIMB_SIDE` → `side_grip_03`,
  espelhado para a mão oposta, com o corpo ancorado.
- **Apoio móvel / deslocamento de agarrada:** `CLIMB_MOVE` →
  `transfer_01`, `transfer_03`, `transfer_04`, priorizando costas/3/4 traseiro.
- **GRABBING durante recuperação:** `HANG` → `lower_grip_01–03`.
- **Contato confirmado com apoio/borda:** `CLIMB_HOLD` → `edge_wait_01–04`.
- **AIRBORNE após salto autorizado:** `JUMP` → `jump_01–04`.
  As poses seguem início, subida, ápice e descida; esquerda usa espelhamento.
  O salto vertical não aplica rotação artificial ao personagem.
- **Perda de apoio / queda:** `FALL` → `fall_01–03`.
- **Checkpoint alcançado:** os estados físicos `CHECKPOINT_HANG` e
  `CHECKPOINT_PULL_UP` usam `HANG` (`lower_grip_01–03`) → `PULL_UP`
  (`pull_up_01–04`) → `CHECKPOINT_IDLE` (`checkpoint_01`). A entrada move o
  corpo até a superfície, bloqueia controles por 820 ms e só então confirma
  o respawn. Implementação física isolada em `climb_checkpoints.js`.
- **Cume:** o estado lógico `HANG` usa `CLIMB_HOLD`; a subida física já
  existente inicia `PULL_UP` e depois `CLIMB_CORNER`. A pose final só se
  estabiliza em pé após a lógica real confirmar `stood`.
- **SUMMIT_STANDING / revelação / diálogo:** `CHECKPOINT_IDLE`.
- **MEDAL:** ainda em pé, entrega real pelo sistema oficial, com medalha
  desenhada separadamente em Canvas por 700 ms.
- **CELEBRATE:** `VICTORY` → `victory_01–04` → `victory_01`.
  Toca uma vez a 5 fps e mantém a pose final até o resultado. Os quatro PNGs
  contêm apenas Zorp, sem os sinais laranja da folha. Comemoração por 2,5 s.
- **Dano recebido:** reação curta `HIT` → `hurt_01–03`; perder o apoio
  continua levando a `FALL`.

`CHECKPOINT_WALK_LEFT/RIGHT` seguem o deslocamento real de A/D dentro da
plataforma. Ao atingir o limite, a velocidade zera e retorna para idle, mesmo
mantendo a tecla. Pés usam a mesma âncora em todas as poses em pé.

Saída do checkpoint: `CHECKPOINT_JUMP_READY` usa a preparação de `JUMP` por
90 ms; o lançamento usa `CHECKPOINT_JUMP` por 140 ms e passa para `JUMP`/`FALL`
conforme a velocidade. O impulso e o controle aéreo existentes são preservados.
`TIRED` continua preparado sem introduzir stamina.

## Transições por eventos

- `jump`: limpa a transição visual anterior e inicia `JUMP` imediatamente.
- `drop`: cancela a pose presa e inicia a apresentação de queda.
- `reach`: distingue aproximação normal de uma agarrada durante a descida.
- `grip`: confirma contato e monta a sequência adequada.
- `hit`: inicia a reação visual curta ao dano real.
- `checkpoint_begin` / `checkpoint_stand`: limpam transições antigas ao
  começar a subida física da borda e ao terminar de ficar em pé.
- A comemoração depende da confirmação física do cume, do diálogo concluído
  e da entrega da medalha; alcançar apenas uma altura não a autoriza.
- Reinício/respawn: limpa o relógio e as transições da tentativa anterior.

Recuperação normal: **FALL → HANG → CLIMB_HOLD → estado preso atual**.
Timers antigos de dano não fazem a apresentação voltar a `FALL` após a
agarrada já ter sido confirmada.

## Tempo e contato

- Relógio em segundos: `deltaTime = (agora - instanteAnterior) / 1000`.
- HANG de recuperação: **140 ms**; contato confirmado: **180 ms**.
- Checkpoint: HANG **160 ms**, PULL_UP **660 ms**. O contorno de borda
  `CLIMB_CORNER` continua reservado ao cume e às transições largas anteriores.
- Mistura entre poses: **80 ms**.
- No cume, a última pose de contato aguarda a confirmação física de pé,
  sem conceder vitória antecipada e sem usar contadores de frames para
  selecionar os sprites.
- Mãos/corpo ficam fixos na referência do apoio; a pose em pé usa os pés.
  A última parte do contorno transfere a âncora para o apoio dos pés.
- Checkpoint move o corpo fisicamente até a superfície e transfere a âncora
  da pose de pull-up para os pés antes de liberar caminhada/salto.
- Câmera fixa na entrada, descanso e preparação; volta ao tracking ao lançar.

## Validação

Testes em Chrome real com entradas de teclado automatizadas e revisão visual:

- três saltos reais consecutivos na subida e alcance para os dois lados;
- perda automática do apoio de gelo e recuperação em uma pedra inferior,
  preservando as três vidas;
- ambos os checkpoints (passos 34 e 72): captura, quatro frames de pull-up,
  pose em pé, caminhada para ambos os lados e limites físicos;
- controle bloqueado durante entrada, sem salto automático ao segurar Espaço;
- salto real até o próximo apoio, câmera estável e respawn seguro;
- subida física no cume, revelação, vitória, medalha e retorno ao overworld;
- equivalência do relógio de animação com passos de 30, 60 e 144 Hz;
- ausência de requisições do sprite antigo e de erros de carregamento/JavaScript.

O debug F8 continua desativado por padrão. O atlas completo e seus recortes
podem ser consultados em `climb_sprite_atlas.html` e `climb_zorp_v2_atlas.md`.
