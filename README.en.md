<div align="center">

[🇮🇹 Italiano](README.md) · 🇬🇧 **English** · [🇪🇸 Español](README.es.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇧🇷 Português (Brasil)](README.pt-BR.md)

</div>

<div align="center">

# 👁️ Scrywall

**Many screens, one glance.**

A wall of YouTube videos and Twitch streams on a single page.
They all start together, muted — you turn the audio on yourself, one at a time.

![Stack](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-e3b95f?style=flat-square)
![Zero dependencies](https://img.shields.io/badge/dependencies-zero-8fb4ff?style=flat-square)
![No build](https://img.shields.io/badge/build-none-7be0c3?style=flat-square)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-9146ff?style=flat-square)

</div>

---

## ✨ What it does

*Scry*: to see distant places in a crystal ball. Scrywall is the same idea, but with a wall of screens: paste the links, press a button, and keep an eye on everything at once.

- 🧱 **Automatic grid.** Every tile is the same size, and the site picks the layout that makes the best use of the screen on its own. Too many videos to fit? It switches to a scrollable layout.
- 🔇 **Everything muted, audio in turns.** Videos start without sound. The button on each tile turns on audio for just that one, muting the others automatically.
- ⤢ **Dedicated expand button.** Each tile has its own button: it enlarges the video with the others lined up in a side column, and the same button (or the `Esc` key) shrinks it back.
- 🎬 **Native player controls.** Play, pause and seeking are the real YouTube/Twitch ones, usable directly on every tile, even a small one.
- 🖐️ **Drag to reorder.** Press and hold a tile's header and drag it onto another to swap their positions.
- ✎ **Manage everything from the wall.** Add a video from the bar at the top, edit a link with the pencil icon or remove it with ✕ (with an "Undo" toast for a few seconds), without ever touching the videos already playing.
- ⌨️ **Keyboard shortcuts.** `k` play/pause, `j`/`l` seek back/forward 10s, `m` mute, `,`/`.` small nudges — on whichever tile you're hovering.
- 🔁 **Adjustable loop.** YouTube videos restart on their own when they end; turn it off with one click from the top bar.
- 🌍 **Interface in 6 languages.** Italian, English, Spanish, French, German and Portuguese (Brazil), auto-detected from the browser or picked by hand.
- 🟥🟪 **YouTube and Twitch together.** Videos, livestreams, Shorts and Twitch streams on the same wall.
- 🏷️ **Title outside the video.** Each tile shows its title above the video, so it never covers the picture. Twitch shows the channel name instead.
- 🔗 **Shareable link.** Whoever sets up the wall copies a link, and whoever opens it sees the same videos. No accounts, no server.
- ☕🍺 **Donations.** A "Buy me a coffee or a beer" button with quick amounts or a custom one, via PayPal.me.

## 🚀 Try it locally

No install, no build step. You do need a local server though, since Twitch refuses to start from `file://`.

```bash
# from the project folder
python -m http.server 8000
```

Then open `http://localhost:8000`.

> **Note:** double-clicking `index.html` (a `file://` address) can make the YouTube and Twitch players refuse to start. Always use the local server.

## 🧙 How to use it

1. Paste a YouTube or Twitch link into a row. The empty one at the bottom fills in for the next link.
2. Press **▶ Show all videos**.
3. Turn on audio with the 🔇/🔊 button on a tile — it turns off by itself on the others.
4. Press **⤢** on a tile to enlarge it, **⤡** (or `Esc`) to go back to the grid. Drag a card's header onto another to swap their positions.
5. From the wall you can also: **+ Add video** from the top bar, **✎** to edit a link, **✕** to remove it (with "Undo"), or **Select** mode to remove several at once.
6. Press **🔗 Share** to copy a link with the videos already inside.

### Accepted links

| Type | Examples |
|---|---|
| YouTube | `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, or just the 11-character ID |
| Twitch | `twitch.tv/channelname` (mobile and popout variants too) |

## 🔗 How the shared link works

Everything lives in the part after the `#` in the address, so it **never goes through any server**:

```
https://yourdomain.com/#v=dQw4w9WgXcQ,t:channelname,aBcDeFgHiJk
```

- an 11-character ID is a YouTube video;
- `t:name` is a Twitch channel.

## 🛠️ Under the hood

- Plain HTML, CSS and JavaScript, in three separate files. No framework, no bundler.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) and [Twitch Embed](https://dev.twitch.tv/docs/embed/) for the players.
- A grid algorithm that tries every column/row combination and picks the one with the biggest tiles, keeping the 16:9 ratio.
- Player controls are the native ones: grid view keeps a thin safety layer that stops you from unmuting more than one video at once, while a background check keeps the site's state in sync with the player's real state instead of forcing it.
- Drag-to-reorder never moves the iframe in the DOM (that would reload it from scratch): only the visual order changes, via CSS.
- Saved links stay in your browser's `localStorage`. No tracking, no cookies.

## ⚠️ Things to know

- **How many videos?** That depends on your computer and connection, not the site: every tile is a real player streaming real video. A normal home connection handles a handful fine, but the browser starts to struggle with a lot of videos at once.
- **Some videos won't embed.** If the uploader disabled embedding, YouTube shows an error in that tile and the rest of the wall keeps working.
- **Twitch doesn't expose stream titles.** That's why the channel name is shown instead.
- **Autoplay.** Browser rules mean videos always start muted; audio only turns on after you click.

## 🤝 Disclaimer

Scrywall is an independent project and is **not affiliated with or endorsed by YouTube, Google or Twitch**. Videos are shown through the official embeddable players and remain the property of their respective owners.

## ☕🍺 Support

The site is free. If you find it useful, you can buy me a coffee or a beer from the button inside the site.

---

<div align="center">

*Watch far. Watch all.* 👁️

</div>
