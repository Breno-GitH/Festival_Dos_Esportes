# Jukebox — arranjos diferentes e player no Overworld

Entrega: 25/10/2026. Projeto: `C:/xampp/htdocs/2025/Festival_Dos_Esportes`.

## Música

As quatro composições procedurais foram rearranjadas. Cada uma possui melodia autoral de quatro compassos, progressão harmônica, baixo, timbre e desenho rítmico próprios, em lugar de oito notas tocadas com o mesmo ritmo/instrumento.

- **Feira Viajante:** 108 BPM, 4/4 com swing; melodia saltitante, acordes em contratempo, baixo caminhante e percussão leve.
- **Festival dos Campeões:** 136 BPM, 4/4 reto; melodia de fanfarra arcade, timbre de onda quadrada filtrada, baixo pulsante e bateria mais marcada.
- **Brisa do Arquipélago:** 82 BPM, 6/8; frases longas, timbre senoidal suave, arpejos e percussão discreta para sensação de balanço.
- **Trilha da Montanha:** 94 BPM, 3/4; motivo mais espaçado, timbre de triângulo filtrado, baixo grave e pulsos de tom.

Tudo continua sendo sintetizado localmente por WebAudio, sem arquivos de áudio novos ou dependências externas. Ruído de percussão é criado uma vez e reutilizado. Agendamento usa pequena janela à frente do relógio de áudio, um único timer e limite de vozes; fontes e filtros são desconectados ao terminar. Atrasos de execução não enfileiram dezenas de notas antigas.

## Player junto às moedas

Ao iniciar uma faixa pela jukebox da nave, aparece um pequeno painel à esquerda do contador de moedas, no mesmo grupo da interface superior:

- Nome da música em execução.
- Indicador “JUKEBOX · TOCANDO” ou “JUKEBOX · SEM SOM”.
- Botão de próxima faixa, percorrendo somente músicas já desbloqueadas.
- Botão de silenciar/reativar o som, com ícone, tooltip e estado acessível.
- Pequenas barras decorativas; elas param quando a música está silenciada.

Fechar o menu da jukebox agora **mantém a faixa tocando durante a exploração**. Trocar de ilha também mantém a seleção. Silenciar atua no ganho mestre, sem reiniciar nem trocar de música; pular mantém o estado de mute.

Durante minigames, cutscenes e eventos importantes, a música pausa e o painel fica oculto. Ao voltar ao Overworld, a faixa selecionada retoma. Entrar no menu principal encerra a reprodução. Reload preserva a compra e os temas ouvidos, mas não inicia música automaticamente. Seleção e mute da sessão não alteram moedas, itens ou progresso do save.

Botões funcionam por mouse, toque e teclado. Seus eventos não acionam movimento/interação; depois da ativação, o foco retorna ao Canvas. O painel respeita as áreas do cabeçalho em telas menores e as opções de movimento reduzido do navegador.

## Verificação

**44/44 testes automatizados passaram**, reunindo nove testes novos de música e as regressões do Comerciante, mapa e mochila. Foram verificados: arranjos distintos, compra/desbloqueio, skip autorizado, timer único, limite/limpeza de vozes, mute, pausa/retorno, encerramento no menu, ausência de avalanche após atraso e saída segura se WebAudio não existir.

**12 verificações completas no Chrome passaram**, mais uma verificação adicional de teclado:

1. Sem música iniciada, não aparece player nem há autoplay.
2. Fluxo real F → equipamentos → jukebox → tocar → fechar mantém a faixa e exibe o painel ao lado das moedas.
3. As quatro faixas geram sinal real de áudio; pular atualiza o nome e percorre a sequência.
4. Mute reduz a saída efetivamente a silêncio; reativação mantém a faixa e devolve foco ao jogo.
5. Movimento funciona imediatamente após clicar nos botões.
6. Troca de ilha mantém música/painel.
7. Minigame pausa, limpa vozes e oculta o player; retorno retoma.
8. Cinemática pausa e posterior retorno retoma.
9. Layout validado em larguras 600, 450 e 360 pixels, sem sair da tela nem sobrepor o contador de moedas.
10. Menu encerra música e libera as vozes.
11. Reload conserva jukebox adquirida e temas desbloqueados, sem tocar sozinho.
12. Nenhum erro de execução ou carregamento na versão integrada.
13. Espaço/Enter nativos nos botões executam mute/skip, sem acionar Espaço do Overworld nem abrir conversa.

O sinal real de WebAudio foi medido com um analisador: as quatro faixas produziram saída não nula; depois de silenciar, RMS ficou abaixo de 0,00001. Essa é uma validação técnica de reprodução/controle, não um relato de audição humana. Detalhes estão em `browser-qa.json`.

Chrome executado em perfil/origem isolados. A campanha usada no teste foi preparada apenas nesse perfil, sem acessar ou modificar o save do navegador do usuário. ZERO 404, ZERO TypeError, ZERO ReferenceError e nenhum aviso/erro de console nas sessões finais registradas.

## Arquivos

- `merchant_music.js`: quatro arranjos e ciclo de reprodução/pausa/skip/mute.
- `jukebox_player.js`: novo painel, botões e isolamento dos eventos de entrada.
- `merchant_campaign.js`: fechar interface deixa a música tocando; mensagem acompanha faixa/mute atual.
- `index.html`: painel junto às moedas, novo script e versões de cache.
- `style.css`: aparência do player e adaptação do cabeçalho a telas menores.
- `script.js`: atualização do player e contexto de Overworld/cena/menu.
- `jukebox_music.test.cjs`: testes novos.

Nenhum sprite, minigame, preço, condição de desbloqueio ou estrutura de save foi alterado. A remoção anterior da imagem de vitória da Escalada foi preservada. Capturas e resultados dos testes estão nesta pasta; versões anteriores dos cinco arquivos substituídos ficam em `before/`.
