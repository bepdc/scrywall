<div align="center">

🇮🇹 **Italiano** · [🇬🇧 English](README.en.md) · [🇪🇸 Español](README.es.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇧🇷 Português (Brasil)](README.pt-BR.md)

</div>

<div align="center">

# 👁️ Scrywall

**Tanti schermi, un solo sguardo.**

Un muro di video YouTube e dirette Twitch in una sola pagina.
Tutti insieme, tutti muti, l'audio lo accendi tu: uno alla volta.

![Stack](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-e3b95f?style=flat-square)
![Zero dipendenze](https://img.shields.io/badge/dipendenze-zero-8fb4ff?style=flat-square)
![Nessun build](https://img.shields.io/badge/build-nessuno-7be0c3?style=flat-square)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-9146ff?style=flat-square)

</div>

---

## ✨ Cosa fa

*Scry* (inglese): guardare luoghi lontani in una sfera di cristallo. Scrywall è la stessa idea, ma con un muro di schermi: incolli i link, premi un bottone e tieni d'occhio tutto insieme.

- 🧱 **Griglia automatica.** Tutti i riquadri hanno la stessa dimensione e il sito sceglie da solo la disposizione che sfrutta meglio lo schermo. Se i video sono troppi per stare tutti, passa allo scorrimento.
- 🔇 **Tutto muto, audio a turni.** I video partono senza audio. Con il pulsante su ogni riquadro attivi l'audio di uno solo, e le altre sorgenti restano mute automaticamente.
- ⤢ **Pulsante per ingrandire.** Ogni riquadro ha un bottone dedicato: lo ingrandisce mettendo gli altri in una colonna a destra, e lo stesso bottone (o il tasto `Esc`) lo riduce di nuovo.
- 🎬 **Controlli nativi del player.** Play, pausa e avanzamento sono quelli veri di YouTube/Twitch, utilizzabili direttamente su ogni riquadro, anche piccolo.
- 🖐️ **Trascina per riordinare.** Tieni premuta l'intestazione di un riquadro e trascinalo su un altro per scambiarli di posto.
- ✎ **Gestisci tutto dal muro.** Aggiungi un video dalla barra in alto, modifica un link con la matita o rimuovilo con la ✕ (con "Annulla" per qualche secondo) senza mai toccare gli altri video già in riproduzione.
- ⌨️ **Scorciatoie da tastiera.** `k` play/pausa, `j`/`l` indietro/avanti di 10s, `m` muto, `,`/`.` piccoli aggiustamenti, sul video su cui passi col mouse.
- 🔁 **Loop regolabile.** I video YouTube ripartono da soli quando finiscono; si disattiva con un click dalla barra in alto.
- 🌍 **Interfaccia in 6 lingue.** Italiano, inglese, spagnolo, francese, tedesco e portoghese (Brasile), rilevata automaticamente dal browser o selezionabile a mano.
- 🟥🟪 **YouTube e Twitch insieme.** Video, live, Shorts e dirette Twitch nello stesso muro.
- 🏷️ **Titolo fuori dal video.** Sopra ogni riquadro c'è il titolo del video, così non copre l'immagine. Per Twitch viene mostrato il nome del canale.
- 🔗 **Link da condividere.** Chi prepara il muro copia un link, e chi lo apre vede gli stessi video. Niente account, niente server.
- ☕🍺 **Donazioni.** Un pulsante "Buy me a coffee or a beer" con importi rapidi o libero, tramite PayPal.me.

## 🚀 Provalo in locale

Non servono installazioni né comandi di build. Serve però un server locale, perché Twitch rifiuta di partire da `file://`.

```bash
# dalla cartella del progetto
python -m http.server 8000
```

Poi apri `http://localhost:8000`.

> **Nota:** aprendo `index.html` con un doppio click (indirizzo `file://`) i player di YouTube e Twitch possono rifiutarsi di partire. Usa sempre il server locale.

## 🧙 Come usarlo

1. Incolla un link YouTube o Twitch in una riga. Quella vuota in fondo si riempie al prossimo link.
2. Premi **▶ Mostra tutti i video**.
3. Accendi l'audio con il pulsante 🔇/🔊 di un riquadro: si spegne da solo sugli altri.
4. Premi **⤢** su un riquadro per ingrandirlo, **⤡** (o `Esc`) per tornare alla griglia. Trascina l'intestazione di una card su un'altra per scambiarle di posto.
5. Dal muro puoi anche: **+ Aggiungi video** dalla barra in alto, **✎** per modificare un link, **✕** per rimuoverlo (con "Annulla"), o la modalità **Seleziona** per rimuoverne più di uno insieme.
6. Premi **🔗 Condividi** per copiare il link con i video già dentro.

### Link accettati

| Tipo | Esempi |
|---|---|
| YouTube | `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, o il solo ID di 11 caratteri |
| Twitch | `twitch.tv/nomecanale` (anche nelle varianti mobile e popout) |

## 🔗 Come funziona il link condiviso

Tutto sta nella parte dopo il `#` dell'indirizzo, quindi **non passa mai da nessun server**:

```
https://tuodominio.it/#v=dQw4w9WgXcQ,t:nomecanale,aBcDeFgHiJk
```

- un ID di 11 caratteri è un video YouTube;
- `t:nome` è un canale Twitch.

## 🛠️ Sotto il cofano

- HTML, CSS e JavaScript puri, in tre file separati. Nessun framework, nessun bundler.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) e [Twitch Embed](https://dev.twitch.tv/docs/embed/) per i player.
- Algoritmo di griglia che prova tutte le combinazioni di colonne e righe e sceglie quella con i riquadri più grandi, mantenendo il formato 16:9.
- I comandi del player sono quelli nativi: in griglia resta un sottile livello di sicurezza che impedisce di smutare più video insieme, mentre un controllo in background tiene sincronizzato lo stato del sito con quello reale del player invece di forzarlo.
- Il trascinamento per riordinare non sposta mai l'iframe nel DOM (altrimenti si ricaricherebbe da capo): cambia solo l'ordine visivo via CSS.
- I link salvati restano nel `localStorage` del tuo browser. Nessun tracciamento, nessun cookie.

## ⚠️ Cose da sapere

- **Quanti video?** Dipende dal tuo computer e dalla tua connessione, non dal sito: ogni riquadro è un player vero che scarica un flusso video. Con una connessione domestica normale e pochi riquadri va bene, ma con tanti video insieme il browser comincia a faticare.
- **Alcuni video non si incorporano.** Se l'autore ha disattivato l'incorporamento, YouTube mostra un errore nel riquadro e il resto del muro continua a funzionare.
- **Twitch non espone i titoli delle dirette.** Per questo compare il nome del canale.
- **Autoplay.** Per le regole dei browser i video partono sempre muti: l'audio si attiva solo dopo un tuo click.

## 🤝 Disclaimer

Scrywall è un progetto indipendente e **non è affiliato né approvato da YouTube, Google o Twitch**. I video vengono mostrati con i player ufficiali incorporabili e restano dei rispettivi proprietari.

## ☕🍺 Supporto

Il sito è gratuito. Se ti è utile, puoi offrirmi un caffè o una birra dal pulsante dentro il sito.

---

<div align="center">

*Guarda lontano. Guarda tutto.* 👁️

</div>
