# Checkpoints da Escalada

## Plataformas

Os dois patamares existentes continuam nos mesmos lugares e com o mesmo desenho:

- passo 34, apoio 37, altitude 2.406;
- passo 72, apoio 93, altitude 5.328.

A superfície plana tem 84 unidades de largura. O centro dos pés pode andar
60 unidades: são reservadas 12 unidades em cada borda. Os limites fazem parte
dos dados de cada apoio (`platform`), independentes das margens do PNG.

## Entrada e segurança

Contato válido requer mãos próximas da borda (tolerância de 11 unidades) e X
dentro da área acessível. Uma aterrissagem por cima também é válida, com
tolerância de 9 unidades. Encostar no corpo/lateral da pedra não confirma nada.

`CHECKPOINT_HANG` (160 ms) → `CHECKPOINT_PULL_UP` (660 ms) → `STANDING`.
A posição inicial é preservada e interpolada até a superfície, sem reposicionar
o personagem instantaneamente. Aterrissar por cima usa uma subida curta.

Somente depois da confirmação física dos pés dentro dos limites são atualizados
`checkpointHoldId`, `checkpointAltura`, pontuação, coleta e recuperação de vidas.
O respawn guarda também a posição segura e o enquadramento usados na confirmação.

Durante entrada e descanso, objetos do Mestre continuam seu movimento sem
atingir Zorp, e novos lançamentos aguardam a saída da plataforma.

## Controles e animações

- A/D: caminhada a 100 unidades por segundo, limitada à plataforma.
- Parado/limite: `CHECKPOINT_IDLE` com âncora nos pés.
- Andando: `CHECKPOINT_WALK_LEFT` / `CHECKPOINT_WALK_RIGHT`.
- W/Espaço, com uma nova pressão: preparação de 90 ms, `CHECKPOINT_JUMP`,
  depois `JUMP`/`FALL` conforme a física aérea existente.
- Nenhum comando de salto fica pendente durante a subida da borda.

A câmera mantém X e altitude na entrada, descanso e preparação. O tracking
normal retoma ao iniciar o salto. O zoom existente não foi alterado.

## QA

Chrome real isolado, sem cache, com entradas de teclado automatizadas e
capturas de tela inspecionadas visualmente. Testados nos dois patamares:

- aproximação a partir do apoio anterior;
- HANG e quatro frames de PULL_UP antes de ficar em pé;
- checkpoint ainda não coletado durante HANG;
- Espaço mantido durante a subida sem causar novo salto ao concluir;
- caminhada A/D, idle nos limites e impossibilidade de sair andando;
- câmera fixa enquanto descansa e retomada no próximo salto;
- saída até o apoio seguinte usando o impulso aéreo existente;
- perda controlada de vida e respawn no ponto seguro confirmado.

Também validados contato lateral inválido, aterrissagem por cima e tempo físico
equivalente a 30/60/144 Hz. Carregamento testado via HTTP e file://, sem 404,
TypeError, ReferenceError ou warnings na execução registrada. Os dois testes
de checkpoint registraram aproximadamente 60 FPS.

Regressões adicionais: interromper a entrada do segundo checkpoint preserva
o primeiro como respawn; projéteis existentes continuam se movendo durante
o descanso sem causar dano; três saltos comuns, subida física no cume,
diálogo, medalha e retorno ao overworld continuam funcionando. Os testes
usaram um perfil de navegador isolado, sem alterar o save do jogador.
