<div align="center">

[🇮🇹 Italiano](README.md) · [🇬🇧 English](README.en.md) · [🇪🇸 Español](README.es.md) · [🇫🇷 Français](README.fr.md) · 🇩🇪 **Deutsch** · [🇧🇷 Português (Brasil)](README.pt-BR.md)

</div>

<div align="center">

# 👁️ Scrywall

**Viele Bildschirme, ein einziger Blick.**

Eine Wand aus YouTube-Videos und Twitch-Streams auf einer einzigen Seite.
Sie starten alle zusammen und stumm – den Ton schaltest du selbst ein, einen nach dem anderen.

![Stack](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-e3b95f?style=flat-square)
![Keine Abhängigkeiten](https://img.shields.io/badge/Abh%C3%A4ngigkeiten-keine-8fb4ff?style=flat-square)
![Kein Build](https://img.shields.io/badge/Build-keiner-7be0c3?style=flat-square)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-9146ff?style=flat-square)

</div>

---

## ✨ Was es macht

*Scry*: entfernte Orte in einer Kristallkugel sehen. Scrywall ist dieselbe Idee, nur mit einer Wand aus Bildschirmen: Links einfügen, einen Knopf drücken und alles gleichzeitig im Blick behalten.

- 🧱 **Automatisches Raster.** Alle Kacheln sind gleich groß, und die Seite wählt selbst die Anordnung, die den Bildschirm am besten nutzt. Passen zu viele Videos nicht hinein, wird gescrollt.
- 🔇 **Alles stumm, Ton reihum.** Videos starten ohne Ton. Mit dem Knopf an jeder Kachel aktivierst du den Ton genau einer davon, die anderen bleiben automatisch stumm.
- ⤢ **Eigener Button zum Vergrößern.** Jede Kachel hat ihren eigenen Button: Er vergrößert das Video und reiht die anderen in einer Seitenspalte auf; derselbe Button (oder die `Esc`-Taste) macht es wieder rückgängig.
- 🎬 **Native Player-Steuerung.** Play, Pause und Vorspulen sind die echten YouTube/Twitch-Steuerelemente, direkt auf jeder Kachel nutzbar – auch auf kleinen.
- 🖐️ **Ziehen zum Umsortieren.** Kopfzeile einer Kachel gedrückt halten und auf eine andere ziehen, um die Positionen zu tauschen.
- ✎ **Alles direkt von der Wand aus verwalten.** Video über die Leiste oben hinzufügen, einen Link mit dem Stift-Symbol bearbeiten oder mit ✕ entfernen (mit "Rückgängig" für ein paar Sekunden) – ohne die bereits laufenden Videos je anzutasten.
- ⌨️ **Tastenkürzel.** `k` Play/Pause, `j`/`l` 10s zurück/vor, `m` stumm, `,`/`.` kleine Schritte – auf dem Video, über dem gerade die Maus steht.
- 🔁 **Einstellbare Wiederholung.** YouTube-Videos starten nach dem Ende von selbst neu; mit einem Klick in der oberen Leiste abschaltbar.
- 🌍 **Oberfläche in 6 Sprachen.** Italienisch, Englisch, Spanisch, Französisch, Deutsch und Portugiesisch (Brasilien) – automatisch vom Browser erkannt oder manuell wählbar.
- 🟥🟪 **YouTube und Twitch zusammen.** Videos, Livestreams, Shorts und Twitch-Streams auf derselben Wand.
- 🏷️ **Titel außerhalb des Videos.** Über jeder Kachel steht der Videotitel, sodass er das Bild nie verdeckt. Bei Twitch wird stattdessen der Kanalname angezeigt.
- 🔗 **Teilbarer Link.** Wer die Wand zusammenstellt, kopiert einen Link, und wer ihn öffnet, sieht dieselben Videos. Kein Konto, kein Server.
- ☕🍺 **Spenden.** Ein "Buy me a coffee or a beer"-Button mit schnellen oder freien Beträgen, über PayPal.me.

## 🚀 Lokal ausprobieren

Keine Installation, kein Build-Schritt nötig. Ein lokaler Server ist allerdings nötig, weil Twitch sich weigert, von `file://` aus zu starten.

```bash
# aus dem Projektordner
python -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

> **Hinweis:** Beim Öffnen von `index.html` per Doppelklick (`file://`-Adresse) können sich die YouTube- und Twitch-Player weigern zu starten. Immer den lokalen Server verwenden.

## 🧙 So wird's benutzt

1. Einen YouTube- oder Twitch-Link in eine Zeile einfügen. Die leere Zeile unten füllt sich für den nächsten Link nach.
2. **▶ Alle Videos anzeigen** drücken.
3. Ton mit dem 🔇/🔊-Button an einer Kachel einschalten – er schaltet sich bei den anderen automatisch ab.
4. **⤢** an einer Kachel drücken, um sie zu vergrößern, **⤡** (oder `Esc`), um zum Raster zurückzukehren. Kopfzeile einer Karte auf eine andere ziehen, um die Positionen zu tauschen.
5. Von der Wand aus geht außerdem: **+ Video hinzufügen** über die obere Leiste, **✎** zum Bearbeiten eines Links, **✕** zum Entfernen (mit "Rückgängig"), oder der Modus **Auswählen**, um mehrere auf einmal zu entfernen.
6. **🔗 Teilen** drücken, um einen Link mit den bereits enthaltenen Videos zu kopieren.

### Akzeptierte Links

| Typ | Beispiele |
|---|---|
| YouTube | `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, oder nur die 11-stellige ID |
| Twitch | `twitch.tv/kanalname` (auch Mobil- und Popout-Varianten) |

## 🔗 So funktioniert der geteilte Link

Alles steckt im Teil nach dem `#` in der Adresse, läuft also **nie über irgendeinen Server**:

```
https://deinedomain.de/#v=dQw4w9WgXcQ,t:kanalname,aBcDeFgHiJk
```

- eine 11-stellige ID ist ein YouTube-Video;
- `t:name` ist ein Twitch-Kanal.

## 🛠️ Unter der Haube

- Reines HTML, CSS und JavaScript, in drei getrennten Dateien. Kein Framework, kein Bundler.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) und [Twitch Embed](https://dev.twitch.tv/docs/embed/) für die Player.
- Ein Raster-Algorithmus, der alle Spalten-/Zeilen-Kombinationen durchprobiert und die mit den größten Kacheln wählt, bei gleichbleibendem 16:9-Format.
- Die Player-Steuerung ist die native: Die Rasteransicht behält eine dünne Sicherheitsschicht, die verhindert, dass mehr als ein Video gleichzeitig stummgeschaltet entfernt wird, während eine Hintergrundprüfung den Zustand der Seite mit dem echten Zustand des Players abgleicht, statt ihn zu erzwingen.
- Ziehen zum Umsortieren verschiebt das iframe nie im DOM (das würde es komplett neu laden): Nur die visuelle Reihenfolge ändert sich, per CSS.
- Gespeicherte Links bleiben im `localStorage` deines Browsers. Kein Tracking, keine Cookies.

## ⚠️ Wissenswertes

- **Wie viele Videos?** Hängt von deinem Rechner und deiner Verbindung ab, nicht von der Seite: Jede Kachel ist ein echter Player, der einen echten Videostream lädt. Eine normale Heimverbindung schafft ein paar Kacheln locker, aber bei vielen Videos gleichzeitig fängt der Browser an zu kämpfen.
- **Manche Videos lassen sich nicht einbetten.** Hat der Urheber die Einbettung deaktiviert, zeigt YouTube in dieser Kachel einen Fehler, der Rest der Wand funktioniert trotzdem weiter.
- **Twitch zeigt keine Stream-Titel.** Deshalb wird stattdessen der Kanalname angezeigt.
- **Autoplay.** Wegen der Browser-Regeln starten Videos immer stumm: Der Ton aktiviert sich erst nach einem Klick.

## 🤝 Haftungsausschluss

Scrywall ist ein unabhängiges Projekt und **weder mit YouTube, Google noch Twitch verbunden oder von ihnen anerkannt**. Videos werden über die offiziellen einbettbaren Player angezeigt und bleiben Eigentum ihrer jeweiligen Inhaber.

## ☕🍺 Unterstützung

Die Seite ist kostenlos. Wenn sie dir nützlich ist, kannst du mir über den Button auf der Seite einen Kaffee oder ein Bier spendieren.

---

<div align="center">

*Weit sehen. Alles sehen.* 👁️

</div>
