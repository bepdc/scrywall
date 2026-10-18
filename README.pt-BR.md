<div align="center">

[🇮🇹 Italiano](README.md) · [🇬🇧 English](README.en.md) · [🇪🇸 Español](README.es.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · 🇧🇷 **Português (Brasil)**

</div>

<div align="center">

# 👁️ Scrywall

**Muitas telas, um só olhar.**

Um painel de vídeos do YouTube e lives da Twitch em uma única página.
Todos começam juntos e mudos: você ativa o áudio, um de cada vez.

![Stack](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-e3b95f?style=flat-square)
![Zero dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-8fb4ff?style=flat-square)
![Sem build](https://img.shields.io/badge/build-nenhum-7be0c3?style=flat-square)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-9146ff?style=flat-square)

</div>

---

## ✨ O que faz

*Scry*: ver lugares distantes em uma bola de cristal. O Scrywall é a mesma ideia, mas com um painel de telas: você cola os links, aperta um botão e acompanha tudo ao mesmo tempo.

- 🧱 **Grade automática.** Todos os quadros têm o mesmo tamanho, e o site escolhe sozinho a disposição que melhor aproveita a tela. Se houver vídeos demais para caber, passa a rolar.
- 🔇 **Tudo mudo, áudio por vez.** Os vídeos começam sem som. O botão em cada quadro ativa o áudio de apenas um, e os outros ficam mudos automaticamente.
- ⤢ **Botão dedicado para ampliar.** Cada quadro tem seu próprio botão: ele amplia o vídeo e alinha os outros em uma coluna lateral; o mesmo botão (ou a tecla `Esc`) reduz de novo.
- 🎬 **Controles nativos do player.** Play, pausa e avanço são os controles reais do YouTube/Twitch, usáveis diretamente em cada quadro, mesmo pequeno.
- 🖐️ **Arraste para reordenar.** Mantenha pressionado o cabeçalho de um quadro e arraste sobre outro para trocarem de posição.
- ✎ **Gerencie tudo pelo painel.** Adicione um vídeo pela barra no topo, edite um link com o lápis ou remova com o ✕ (com "Desfazer" por alguns segundos), sem nunca mexer nos vídeos que já estão tocando.
- ⌨️ **Atalhos de teclado.** `k` play/pausa, `j`/`l` volta/avança 10s, `m` mudo, `,`/`.` pequenos ajustes, no vídeo sobre o qual o mouse está.
- 🔁 **Loop ajustável.** Os vídeos do YouTube recomeçam sozinhos ao terminar; dá pra desativar com um clique na barra do topo.
- 🌍 **Interface em 6 idiomas.** Italiano, inglês, espanhol, francês, alemão e português (Brasil), detectado automaticamente pelo navegador ou escolhido manualmente.
- 🟥🟪 **YouTube e Twitch juntos.** Vídeos, lives, Shorts e transmissões da Twitch no mesmo painel.
- 🏷️ **Título fora do vídeo.** Acima de cada quadro fica o título do vídeo, então ele nunca cobre a imagem. Na Twitch, aparece o nome do canal.
- 🔗 **Link para compartilhar.** Quem monta o painel copia um link, e quem abre vê os mesmos vídeos. Sem conta, sem servidor.
- ☕🍺 **Doações.** Um botão "Buy me a coffee or a beer" com valores rápidos ou livres, via PayPal.me.

## 🚀 Testar localmente

Não precisa instalar nada nem compilar. Mas precisa de um servidor local, porque a Twitch se recusa a iniciar a partir de `file://`.

```bash
# a partir da pasta do projeto
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

> **Nota:** ao abrir `index.html` com duplo clique (endereço `file://`), os players do YouTube e da Twitch podem se recusar a iniciar. Use sempre o servidor local.

## 🧙 Como usar

1. Cole um link do YouTube ou da Twitch em uma linha. A linha vazia no final se preenche para o próximo link.
2. Aperte **▶ Mostrar todos os vídeos**.
3. Ative o áudio com o botão 🔇/🔊 de um quadro: ele desliga sozinho nos outros.
4. Aperte **⤢** em um quadro para ampliá-lo, **⤡** (ou `Esc`) para voltar à grade. Arraste o cabeçalho de um cartão sobre outro para trocarem de posição.
5. Pelo painel você também pode: **+ Adicionar vídeo** pela barra do topo, **✎** para editar um link, **✕** para removê-lo (com "Desfazer"), ou o modo **Selecionar** para remover vários de uma vez.
6. Aperte **🔗 Compartilhar** para copiar um link já com os vídeos dentro.

### Links aceitos

| Tipo | Exemplos |
|---|---|
| YouTube | `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, ou só o ID de 11 caracteres |
| Twitch | `twitch.tv/nomedocanal` (também nas variantes mobile e popout) |

## 🔗 Como funciona o link compartilhado

Tudo fica na parte depois do `#` do endereço, então **nunca passa por nenhum servidor**:

```
https://seudominio.com/#v=dQw4w9WgXcQ,t:nomedocanal,aBcDeFgHiJk
```

- um ID de 11 caracteres é um vídeo do YouTube;
- `t:nome` é um canal da Twitch.

## 🛠️ Por baixo dos panos

- HTML, CSS e JavaScript puros, em três arquivos separados. Sem framework, sem bundler.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) e [Twitch Embed](https://dev.twitch.tv/docs/embed/) para os players.
- Um algoritmo de grade que testa todas as combinações de colunas e linhas e escolhe a que dá os maiores quadros, mantendo a proporção 16:9.
- Os controles do player são os nativos: a visualização em grade mantém uma camada fina de segurança que impede ativar o áudio de mais de um vídeo ao mesmo tempo, enquanto uma verificação em segundo plano mantém o estado do site sincronizado com o estado real do player, em vez de forçá-lo.
- Arrastar para reordenar nunca move o iframe no DOM (isso o recarregaria do zero): só a ordem visual muda, via CSS.
- Os links salvos ficam no `localStorage` do seu navegador. Sem rastreamento, sem cookies.

## ⚠️ Coisas para saber

- **Quantos vídeos?** Depende do seu computador e da sua conexão, não do site: cada quadro é um player de verdade baixando um fluxo de vídeo real. Uma conexão doméstica normal aguenta alguns quadros bem, mas com muitos vídeos juntos o navegador começa a sofrer.
- **Alguns vídeos não incorporam.** Se o autor desativou a incorporação, o YouTube mostra um erro naquele quadro e o resto do painel continua funcionando.
- **A Twitch não expõe os títulos das lives.** Por isso aparece o nome do canal.
- **Autoplay.** Pelas regras dos navegadores, os vídeos sempre começam mudos: o áudio só ativa depois do seu clique.

## 🤝 Aviso legal

O Scrywall é um projeto independente e **não é afiliado nem endossado pelo YouTube, Google ou Twitch**. Os vídeos são exibidos pelos players oficiais incorporáveis e continuam sendo propriedade de seus respectivos donos.

## ☕🍺 Apoio

O site é gratuito. Se ele for útil pra você, pode me pagar um café ou uma cerveja pelo botão dentro do site.

---

<div align="center">

*Olhe longe. Olhe tudo.* 👁️

</div>
