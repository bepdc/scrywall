"use strict";

import { initI18n, t, formatMoney, currencySymbol, registerLanguageSwitch } from "./i18n/i18n.js";

/* =====================================================================
   ⚙️  CONFIGURAZIONE
   ===================================================================== */
const PAYPAL_ME_URL = "https://paypal.me/bepdc94";

// Importi proposti nella finestra delle donazioni (più il campo "importo libero")
const DONATION_CURRENCY = "EUR";
const DONATION_OPTIONS = [
  { amount: 0.5, emoji: "☕" },
  { amount: 1,   emoji: "☕" },
  { amount: 2,   emoji: "🍺" },
  { amount: 5,   emoji: "🍻" },
];

const STORAGE_KEY = "scrywall.links";
const YT_ID_RE = /^[\w-]{11}$/;
const TW_RE = /^[A-Za-z0-9_]{3,25}$/;

// Pagine di twitch.tv che non sono canali
const TW_RESERVED = new Set([
  "videos", "directory", "downloads", "jobs", "turbo", "settings", "subscriptions",
  "friends", "wallet", "p", "store", "about", "login", "signup", "search", "embed",
  "moderator", "clips", "u", "team", "prime", "legal", "help", "inventory",
]);

// Parametri del layout automatico
const GAP = 8;             // spazio tra i video (px)
const PAD = 8;             // margine esterno del muro (px)
const HEAD_H = 34;         // altezza della riga col titolo, sopra ogni video (px)
const CHROME = HEAD_H + 2; // titolo + bordo del riquadro
const MIN_W = 240;         // larghezza minima di un riquadro: sotto questa soglia si scorre la pagina
const TWITCH_MIN_W = 534;  // con Twitch il video deve restare almeno 400x300 (534 x 9/16 = 300), sennò l'autoplay non parte
const RATIO = 16 / 9;

const els = {
  setup: document.getElementById("setup"),
  topbar: document.getElementById("topbar"),
  wall: document.getElementById("wall"),
  rows: document.getElementById("rows"),
  msg: document.getElementById("msg"),
  toast: document.getElementById("toast"),
  btnStart: document.getElementById("btn-start"),
  btnSelect: document.getElementById("btn-select"),
  btnRemoveSelected: document.getElementById("btn-remove-selected"),
  btnLoop: document.getElementById("btn-loop"),
  btnShare: document.getElementById("btn-share"),
  addPanel: document.getElementById("add-panel"),
  addInput: document.getElementById("add-input"),
  addConfirm: document.getElementById("add-confirm"),
  addMsg: document.getElementById("add-msg"),
  donateTop: document.getElementById("donate-top"),
  donateSetup: document.getElementById("donate-setup"),
  donateDialog: document.getElementById("donate-dialog"),
  donateClose: document.getElementById("donate-close"),
  donateOptions: document.getElementById("donate-options"),
  donateInput: document.getElementById("donate-custom-input"),
  donateGo: document.getElementById("donate-custom-go"),
  donateMsg: document.getElementById("donate-msg"),
  donateCurrency: document.getElementById("donate-currency"),
  langSwitchTopbar: document.getElementById("lang-switch-topbar"),
  langSwitchSetup: document.getElementById("lang-switch-setup"),
};

const state = {
  sources: [],        // [{ type: "yt" | "tw", id }] attualmente nel muro
  tiles: [],          // { el, src, player, ready, setMuted, muteBtn, labelEl, dead, errored }
  focusedIndex: null, // null = modalità griglia
  audioIndex: null,   // quale video ha l'audio attivo
  selecting: false,   // modalità selezione multipla per la rimozione
  loopEnabled: true,  // riparte da capo un video YouTube finito (B4)
};

// Ogni player ha bisogno di un id univoco: l'API di YouTube sostituisce il div
// con un iframe (non resta riutilizzabile), quindi dopo aggiunte/modifiche
// serve sempre un id nuovo, mai riciclato.
let slotSeq = 0;
function nextSlotId() {
  return `player-${slotSeq++}`;
}

/* ---------- Sorgenti (YouTube / Twitch) ---------- */

// Restituisce { type, id } oppure null se il testo non è un link valido
function extractSource(raw) {
  const text = raw.trim();
  if (!text) return null;

  // ID YouTube nudo
  if (YT_ID_RE.test(text)) return { type: "yt", id: text };

  let url;
  try {
    url = new URL(text.startsWith("http") ? text : "https://" + text);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");

  // ----- Twitch (solo dirette di un canale)
  if (host === "twitch.tv" || host === "go.twitch.tv" || host === "player.twitch.tv") {
    let name = null;
    if (host === "player.twitch.tv") {
      name = url.searchParams.get("channel");
    } else {
      const seg = url.pathname.split("/").filter(Boolean);
      name = seg[0] === "popout" ? seg[1] : seg[0];
    }
    if (!name) return null;
    name = name.toLowerCase();
    if (TW_RESERVED.has(name) || !TW_RE.test(name)) return null;
    return { type: "tw", id: name };
  }

  // ----- YouTube
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID_RE.test(id) ? { type: "yt", id } : null;
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v && YT_ID_RE.test(v)) return { type: "yt", id: v };

    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    if (m) return { type: "yt", id: m[1] };
  }
  return null;
}

// Forma compatta per il link condiviso: YouTube = ID, Twitch = "t:canale"
function keyOf(src) {
  return src.type === "tw" ? "t:" + src.id : src.id;
}

function sourceFromKey(key) {
  if (key.startsWith("t:")) {
    const name = key.slice(2).toLowerCase();
    return TW_RE.test(name) ? { type: "tw", id: name } : null;
  }
  return YT_ID_RE.test(key) ? { type: "yt", id: key } : null;
}

function sourceUrl(src) {
  return src.type === "tw"
    ? `https://www.twitch.tv/${src.id}`
    : `https://www.youtube.com/watch?v=${src.id}`;
}

/* ---------- Caricamento degli script dei player ---------- */

// Se lo script esterno è bloccato (adblock, rete lenta, firewall) a volte non
// scatta nemmeno l'evento onerror: senza un limite la promise resterebbe in
// sospeso per sempre e la pagina sembrerebbe bloccata, senza nessun errore visibile.
const API_LOAD_TIMEOUT = 10000;

// Una sola promise per script, anche se viene richiesta da più aggiunte in
// parallelo: senza cache si rischia di iniettare più volte lo stesso <script>.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(true);
    const timer = setTimeout(() => resolve(false), API_LOAD_TIMEOUT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      clearTimeout(timer);
      resolve(true);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => { clearTimeout(timer); resolve(false); };
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

let twApiPromise = null;
function loadTwitchApi() {
  if (twApiPromise) return twApiPromise;
  twApiPromise = new Promise((resolve) => {
    if (window.Twitch && window.Twitch.Player) return resolve(true);
    const timer = setTimeout(() => resolve(false), API_LOAD_TIMEOUT);
    const tag = document.createElement("script");
    tag.src = "https://player.twitch.tv/js/embed/v1.js";
    tag.onload = () => { clearTimeout(timer); resolve(Boolean(window.Twitch && window.Twitch.Player)); };
    tag.onerror = () => { clearTimeout(timer); resolve(false); }; // es. bloccato da un adblock
    document.head.appendChild(tag);
  });
  return twApiPromise;
}

const UNDO_TOAST_MS = 6000;
let toastTimer = null;

function showToast(text) {
  els.toast.innerHTML = "";
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

// Toast con un pulsante "Annulla": resta più a lungo, il tempo di cambiare idea.
function showUndoToast(text, onUndo) {
  els.toast.innerHTML = "";
  const span = document.createElement("span");
  span.textContent = text;
  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "toast-undo";
  undoBtn.textContent = t("manage.undo");
  undoBtn.addEventListener("click", () => {
    clearTimeout(toastTimer);
    els.toast.classList.remove("show");
    onUndo();
  });
  els.toast.append(span, undoBtn);
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), UNDO_TOAST_MS);
}

/* ---------- Donazioni (PayPal.me) ---------- */

function paypalUrl(amount) {
  const base = PAYPAL_ME_URL.replace(/\/+$/, "");
  if (amount == null) return base; // nessun importo: sceglie l'utente su PayPal
  const a = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${base}/${a}${DONATION_CURRENCY}`;
}

// null = campo vuoto, NaN = importo non valido, altrimenti il numero
function parseAmount(text) {
  const clean = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
  const v = parseFloat(clean);
  return v > 0 && v <= 1000 ? v : NaN;
}

function buildDonateDialog() {
  els.donateOptions.innerHTML = "";
  DONATION_OPTIONS.forEach(({ amount, emoji }) => {
    const a = document.createElement("a");
    a.className = "chip";
    a.href = paypalUrl(amount);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = `${emoji} ${formatMoney(amount, DONATION_CURRENCY)}`;
    els.donateOptions.appendChild(a);
  });

  els.donateCurrency.textContent = currencySymbol(DONATION_CURRENCY);
}

function openDonateDialog() {
  els.donateMsg.textContent = "";
  els.donateDialog.showModal();
}

function goCustomDonation() {
  const amount = parseAmount(els.donateInput.value);
  if (Number.isNaN(amount)) {
    els.donateMsg.textContent = t("donate.invalidAmount");
    return;
  }
  els.donateMsg.textContent = "";
  window.open(paypalUrl(amount), "_blank", "noopener");
}

/* ---------- Righe dei link ---------- */

function createRow(value = "") {
  const row = document.createElement("div");
  row.className = "row";

  const input = document.createElement("input");
  input.type = "text";
  input.setAttribute("data-i18n-attr", "placeholder:setup.linkPlaceholder");
  input.placeholder = t("setup.linkPlaceholder");
  input.value = value;
  input.autocomplete = "off";
  input.spellcheck = false;

  const del = document.createElement("button");
  del.type = "button";
  del.className = "row-del";
  del.textContent = "✕";
  del.setAttribute("data-i18n-attr", "title:setup.removeLink,aria-label:setup.removeLink");
  del.title = t("setup.removeLink");
  del.setAttribute("aria-label", t("setup.removeLink"));

  row.append(input, del);

  input.addEventListener("input", () => {
    // Se questa era l'ultima riga (vuota, pronta per il prossimo) e il testo
    // appena scritto/incollato è già un link valido, il cursore salta da solo
    // sulla nuova riga vuota: non serve più cliccarci sopra a mano.
    const wasLastEmpty = row.classList.contains("is-last-empty");
    validateRow(row);
    const becameValid = row.classList.contains("valid");
    ensureTrailingEmptyRow();
    if (wasLastEmpty && becameValid) {
      const next = row.nextElementSibling;
      if (next) next.querySelector("input").focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = row.nextElementSibling;
      if (next) next.querySelector("input").focus();
    }
  });

  input.addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return; // incolla normale

    // Più link incollati insieme: uno per riga
    e.preventDefault();
    let target = row;
    parts.forEach((p, i) => {
      if (i === 0 && input.value.trim() === "") {
        input.value = p;
        validateRow(row);
      } else {
        const r = createRow(p);
        target.after(r);
        validateRow(r);
        target = r;
      }
    });
    ensureTrailingEmptyRow();
    els.rows.lastElementChild.querySelector("input").focus();
  });

  del.addEventListener("click", () => {
    row.remove();
    ensureTrailingEmptyRow();
  });

  return row;
}

function validateRow(row) {
  const v = row.querySelector("input").value.trim();
  const ok = v !== "" && extractSource(v) !== null;
  row.classList.toggle("valid", ok);
  row.classList.toggle("invalid", v !== "" && !ok);
}

// Deve esserci sempre (e una sola) riga vuota in fondo, pronta per il prossimo link
function ensureTrailingEmptyRow() {
  const isEmpty = (r) => r.querySelector("input").value.trim() === "";

  while (
    els.rows.children.length > 1 &&
    isEmpty(els.rows.lastElementChild) &&
    isEmpty(els.rows.lastElementChild.previousElementSibling)
  ) {
    els.rows.lastElementChild.remove();
  }

  const last = els.rows.lastElementChild;
  if (!last || !isEmpty(last)) els.rows.appendChild(createRow());

  Array.from(els.rows.children).forEach((r) => r.classList.remove("is-last-empty"));
  els.rows.lastElementChild.classList.add("is-last-empty");
}

function populateRows(values) {
  els.rows.innerHTML = "";
  values.forEach((v) => {
    const r = createRow(v);
    els.rows.appendChild(r);
    validateRow(r);
  });
  ensureTrailingEmptyRow();
}

function collectLinks() {
  return Array.from(els.rows.querySelectorAll("input"))
    .map((i) => i.value.trim())
    .filter(Boolean);
}

function saveCurrentLinks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sources.map(sourceUrl))); } catch (_) {}
}

function loadSavedLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
    } catch (_) {
      // vecchio formato: testo con un link per riga
    }
    return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  } catch (_) {
    return [];
  }
}

/* ---------- Link condivisibile (le sorgenti stanno nell'hash dell'URL) ---------- */

function getSourcesFromHash() {
  const m = location.hash.match(/[#&]v=([\w,:-]+)/);
  if (!m) return [];
  return m[1].split(",").map(sourceFromKey).filter(Boolean);
}

function hashFor(sources) {
  return "#v=" + sources.map(keyOf).join(",");
}

function buildShareUrl() {
  return location.origin + location.pathname + hashFor(state.sources);
}

async function copyShareLink() {
  if (!state.sources.length) return;
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast(t("share.copied"));
  } catch {
    // Fallback se il browser non permette l'accesso agli appunti
    window.prompt(t("share.promptCopy"), url);
  }
}

/* ---------- Titoli dei video ---------- */

function setLabel(tile, text) {
  tile.labelEl.textContent = text;
  tile.labelEl.title = text;
}

function markError(tile, text) {
  tile.errored = true;
  tile.el.classList.add("is-error");
  setLabel(tile, text);
}


function updateTitle(tile) {
  try {
    const data = tile.player.getVideoData();
    if (data && data.title) {
      setLabel(tile, data.title);
      return true;
    }
  } catch (_) { /* il player non è ancora pronto */ }
  return false;
}

// Il titolo non è sempre disponibile subito: riprova per qualche secondo
function trackTitle(tile) {
  let tries = 0;
  const tick = () => {
    if (tile.dead || tile.errored) return;
    if (updateTitle(tile) || ++tries > 15) return;
    setTimeout(tick, 1000);
  };
  tick();
}

function describeYouTubeError(code) {
  switch (code) {
    case 100: return t("errors.youtubeNotFound");
    case 101:
    case 150: return t("errors.youtubeEmbedDisabled");
    case 153: return t("errors.youtubeFileProtocol");
    default:  return t("errors.youtubeGeneric");
  }
}

/* ---------- Creazione dei player ---------- */

function createYouTubeTile(tile, slotId) {
  if (!(window.YT && window.YT.Player)) {
    markError(tile, t("errors.youtubeUnavailable"));
    return;
  }

  const videoId = tile.src.id;
  tile.player = new YT.Player(slotId, {
    videoId,
    playerVars: {
      autoplay: 1,
      mute: 1,
      playsinline: 1,
      rel: 0,
      // Il loop NON si imposta qui (playerVars.loop+playlist): una volta
      // creato il player non è più modificabile, e il loop deve poter essere
      // disattivato a runtime dall'interruttore in topbar (B4). Si gestisce
      // a mano sotto, in onStateChange, quando il video finisce.
    },
    events: {
      onReady: (e) => {
        tile.ready = true;
        e.target.mute();
        e.target.playVideo();
        trackTitle(tile);
      },
      onStateChange: (e) => {
        if (!tile.errored) updateTitle(tile);
        // 0 = finito (YT.PlayerState.ENDED): si riparte da capo solo se il
        // loop è attivo, altrimenti resta fermo sull'ultimo frame.
        if (e.data === 0 && state.loopEnabled) {
          e.target.seekTo(0, true);
          e.target.playVideo();
          return;
        }
        // 1 = in riproduzione (YT.PlayerState.PLAYING): serve alla scorciatoia
        // "k" (B6) per sapere se deve metterlo in pausa o farlo ripartire,
        // tenendolo in sincrono anche quando lo stato cambia da solo (es. lo
        // metti in pausa dai controlli nativi del player, non dal sito).
        tile.playing = e.data === 1;
      },
      onError: (e) => markError(tile, describeYouTubeError(e.data)),
    },
  });

  tile.setMuted = (muted) => {
    if (muted) {
      tile.player.mute();
    } else {
      tile.player.unMute();
      tile.player.setVolume(100);
    }
  };

  tile.togglePlay = () => {
    try {
      if (tile.playing) tile.player.pauseVideo();
      else tile.player.playVideo();
    } catch (_) { /* player non pronto */ }
  };
}

function createTwitchTile(tile, slotId) {
  const channel = tile.src.id;
  setLabel(tile, channel); // Twitch non fornisce il titolo della diretta: si mostra il nome del canale

  if (!(window.Twitch && window.Twitch.Player)) {
    markError(tile, t("errors.twitchUnavailable", { channel }));
    return;
  }
  if (!location.hostname) {
    markError(tile, t("errors.twitchFileProtocol"));
    return;
  }

  const player = new Twitch.Player(slotId, {
    channel,
    parent: [location.hostname], // Twitch incorpora solo sul dominio dichiarato qui
    muted: true,
    autoplay: true,
    width: "100%",
    height: "100%",
  });
  tile.player = player;

  player.addEventListener(Twitch.Player.READY, () => { tile.ready = true; });
  player.addEventListener(Twitch.Player.OFFLINE, () => setLabel(tile, t("tile.offline", { channel })));
  player.addEventListener(Twitch.Player.ONLINE, () => setLabel(tile, channel));
  // L'icona play/pausa segue lo stato vero del player (non solo i nostri click).
  player.addEventListener(Twitch.Player.PLAY, () => { tile.playing = true; });
  player.addEventListener(Twitch.Player.PAUSE, () => { tile.playing = false; });

  tile.setMuted = (muted) => {
    player.setMuted(muted);
    if (!muted) player.setVolume(1);
  };

  // Una diretta non si "ferma e riprende da dove era": pausa/play qui significa
  // solo bloccare/ripartire lo streaming live, non c'è un punto da riprendere.
  tile.togglePlay = () => {
    try {
      if (tile.playing) player.pause();
      else player.play();
    } catch (_) { /* player non pronto */ }
  };
}

/* ---------- Costruzione di un singolo tile (usata sia all'avvio che per le aggiunte) ---------- */

// "Video attivo" per le scorciatoie da tastiera stile YouTube (B6): l'ultimo
// riquadro cliccato o passato col mouse, non il focus nativo dell'iframe
// (che un iframe cross-origin non lascia comunque rilevare da qui).
let activeTile = null;

// Icone "schermo intero" / "esci da schermo intero" vere (SVG), non simboli
// Unicode: quelli rendono in modo diverso da font a font e su certi sistemi
// restano illeggibili. currentColor le fa seguire il colore del pulsante.
const ICON_EXPAND = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zM5 10h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
const ICON_REDUCE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;

function createTile(src) {
  const slotId = nextSlotId();
  const tileEl = document.createElement("div");
  tileEl.className = "tile";
  tileEl.innerHTML = `
    <div class="tile-head">
      <button class="tile-select" type="button" data-i18n-attr="aria-label:manage.selectCheckbox" aria-label="${t("manage.selectCheckbox")}" aria-pressed="false">✓</button>
      <span class="badge ${src.type}" data-i18n-attr="title:tile.${src.type === "tw" ? "twitch" : "youtube"}" title="${t(src.type === "tw" ? "tile.twitch" : "tile.youtube")}"></span>
      <span class="label">${t("tile.loading")}</span>
      <button class="mute" type="button" data-i18n-attr="title:tile.muteToggle" title="${t("tile.muteToggle")}">🔇</button>
      <button class="tile-expand" type="button" data-i18n-attr="title:manage.expandTitle,aria-label:manage.expandTitle" title="${t("manage.expandTitle")}">${ICON_EXPAND}</button>
      <button class="tile-edit" type="button" data-i18n-attr="title:manage.editTitle,aria-label:manage.editTitle" title="${t("manage.editTitle")}">✎</button>
      <button class="tile-remove" type="button" data-i18n-attr="title:manage.removeTitle,aria-label:manage.removeTitle" title="${t("manage.removeTitle")}">✕</button>
      <div class="tile-edit-form">
        <input type="text" class="tile-edit-input" autocomplete="off" spellcheck="false">
        <button type="button" class="tile-edit-ok" title="${t("manage.editConfirm")}" aria-label="${t("manage.editConfirm")}">✓</button>
        <button type="button" class="tile-edit-cancel" title="${t("manage.editCancel")}" aria-label="${t("manage.editCancel")}">✕</button>
      </div>
    </div>
    <div class="tile-video">
      <div class="player-slot" id="${slotId}"></div>
    </div>
  `;

  const tile = {
    el: tileEl,
    src,
    slotId,
    ready: false,
    dead: false,
    errored: false,
    playing: true, // autoplay parte sempre già in riproduzione; usato dalle scorciatoie (k)
    labelEl: tileEl.querySelector(".label"),
    muteBtn: tileEl.querySelector(".mute"),
    expandBtn: tileEl.querySelector(".tile-expand"),
    editBtn: tileEl.querySelector(".tile-edit"),
    removeBtn: tileEl.querySelector(".tile-remove"),
    selectBtn: tileEl.querySelector(".tile-select"),
    editInput: tileEl.querySelector(".tile-edit-input"),
    player: null,
    setMuted: () => {},
    togglePlay: () => {},
  };

  // Il player NON si crea qui: l'API di YouTube/Twitch cerca l'elemento con
  // questo id nel documento reale (document.getElementById) nel momento stesso
  // in cui viene istanziata. Se il tile non è ancora stato appeso al muro, non
  // lo trova e il video non parte mai (il riquadro resta lì, vuoto). Il player
  // va creato dal chiamante solo DOPO aver fatto els.wall.appendChild(tile.el).

  // L'indice iniziale non basta: dopo una rimozione o un'aggiunta la posizione
  // del tile nell'array cambia, va ricalcolata ogni volta.
  const liveIndex = () => state.tiles.indexOf(tile);

  // "Video attivo" per le scorciatoie da tastiera (B6): passarci sopra col
  // mouse basta; in fase di capture, così arriva anche se poi un pulsante
  // interno ferma la propagazione (mute, espandi, ✕...).
  tileEl.addEventListener("mouseenter", () => { activeTile = tile; });
  tileEl.addEventListener("click", () => { activeTile = tile; }, true);

  // Drag & drop per riordinare (si prende per l'intestazione, non per il
  // video: lì sopra ci sono i controlli nativi del player, non vanno rubati).
  tileEl.querySelector(".tile-head").addEventListener("pointerdown", (ev) => {
    startTileDrag(tile, tileEl, ev);
  });

  // Click sul riquadro: non ingrandisce (causava ingrandimenti accidentali
  // mentre si cercava di premere audio/pausa, vedi A2; e un doppio click
  // sarebbe comunque in conflitto con i controlli nativi dentro l'iframe,
  // irraggiungibili dalla pagina per motivi di sicurezza cross-origin).
  // Serve solo a selezionare, se la modalità selezione multipla è attiva.
  // Per ingrandire c'è solo il pulsante dedicato (tile-expand), niente
  // ambiguità con quello che succede dentro il video.
  tileEl.addEventListener("click", (ev) => {
    if (suppressNextClick) { suppressNextClick = false; return; } // era un trascinamento, non un click
    if (ev.target.closest(".mute, .tile-expand, .tile-edit, .tile-remove, .tile-select, .tile-edit-form")) return;
    if (tileEl.classList.contains("editing")) return;
    if (state.selecting) toggleSelected(tile);
  });

  // Click sul pulsante audio: audio solo su questo
  tile.muteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const idx = liveIndex();
    setAudio(state.audioIndex === idx ? null : idx);
  });

  // Ingrandisce, o se è già il video in primo piano lo riduce (A3): lo stesso
  // pulsante diventa "riduci" quando il tile è quello ingrandito.
  tile.expandBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleExpand(tile);
  });

  tile.selectBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleSelected(tile);
  });

  tile.editBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    startEditTile(tile);
  });

  tile.removeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const idx = liveIndex();
    const src = tile.src;
    removeTiles([idx]);
    showUndoToast(t("manage.removedToast"), () => restoreTileAt(idx, src));
  });

  tile.editInput.addEventListener("click", (ev) => ev.stopPropagation());
  tile.editInput.addEventListener("keydown", (ev) => {
    ev.stopPropagation();
    if (ev.key === "Enter") {
      ev.preventDefault();
      commitEditTile(tile);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      cancelEditTile(tile);
    }
  });
  tileEl.querySelector(".tile-edit-ok").addEventListener("click", (ev) => {
    ev.stopPropagation();
    commitEditTile(tile);
  });
  tileEl.querySelector(".tile-edit-cancel").addEventListener("click", (ev) => {
    ev.stopPropagation();
    cancelEditTile(tile);
  });

  return tile;
}

// Da chiamare solo dopo che tile.el è già stato appeso al muro (vedi il
// commento in createTile): crea davvero il player YouTube/Twitch sullo slot.
function initTilePlayer(tile) {
  if (tile.src.type === "tw") createTwitchTile(tile, tile.slotId);
  else createYouTubeTile(tile, tile.slotId);
}

/* ---------- Drag & drop (riordino) ----------
   Il nodo trascinato non si stacca mai dal DOM: resta lì, si muove solo via
   CSS transform, quindi il video dentro continua a vedersi e a suonare per
   tutto il trascinamento (esattamente il motivo per cui l'app non ricarica
   mai gli iframe spostando nodi). L'ordine vero cambia solo al rilascio,
   tramite --order (vedi syncTileOrder), mai spostando nodi nel DOM. */

let dragCtx = null;       // { tile, tileEl, pointerId, startX, startY, overTile, moved }
let suppressNextClick = false;

function startTileDrag(tile, tileEl, ev) {
  if (ev.button !== 0) return; // solo tasto sinistro / tap singolo
  if (state.selecting || state.focusedIndex !== null) return;
  if (tileEl.classList.contains("editing")) return;
  if (ev.target.closest("button, input")) return; // non rubare il click ai controlli dell'intestazione

  dragCtx = {
    tile,
    tileEl,
    pointerId: ev.pointerId,
    startX: ev.clientX,
    startY: ev.clientY,
    overTile: null,
    moved: false,
  };
  window.addEventListener("pointermove", onTileDragMove);
  window.addEventListener("pointerup", onTileDragEnd, { once: true });
  window.addEventListener("pointercancel", onTileDragEnd, { once: true });
}

function onTileDragMove(ev) {
  if (!dragCtx) return;
  const dx = ev.clientX - dragCtx.startX;
  const dy = ev.clientY - dragCtx.startY;

  if (!dragCtx.moved) {
    if (Math.hypot(dx, dy) < 6) return; // sotto la soglia: potrebbe essere solo un click
    dragCtx.moved = true;
    dragCtx.tileEl.classList.add("dragging");
  }

  dragCtx.tileEl.style.transition = "none";
  dragCtx.tileEl.style.transform = `translate(${dx}px, ${dy}px)`;

  // Il riquadro trascinato intercetterebbe se stesso: lo si esclude un attimo.
  dragCtx.tileEl.style.pointerEvents = "none";
  const under = document.elementFromPoint(ev.clientX, ev.clientY);
  dragCtx.tileEl.style.pointerEvents = "";

  const overEl = under && under.closest(".tile");
  const overTile = overEl && !overEl.classList.contains("tile-ghost")
    ? state.tiles.find((t) => t.el === overEl)
    : null;
  const candidate = overTile !== dragCtx.tile ? overTile : null;

  if (candidate === dragCtx.overTile) return;
  // Il riquadro bersaglio non si sposta più (era lì che nascevano gli
  // "spasmi": animare un transform su un riquadro con un iframe dentro è
  // terreno instabile nei browser). Un bordo marcato basta a far capire dove
  // finirebbe il video trascinato se lo lasci qui — niente da ricompositare.
  if (dragCtx.overTile) dragCtx.overTile.el.classList.remove("drop-target");
  dragCtx.overTile = candidate;
  if (dragCtx.overTile) dragCtx.overTile.el.classList.add("drop-target");
}

// FLIP (First-Last-Invert-Play): il riquadro appare ancora dov'era un attimo
// prima, poi scivola da solo al posto vero. Senza, lo scambio sembrerebbe un
// salto secco invece che un movimento.
function flipTile(el, fromRect) {
  const toRect = el.getBoundingClientRect();
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  el.style.transition = "none";
  el.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
  el.getBoundingClientRect(); // forza il reflow prima di animare, altrimenti non parte
  requestAnimationFrame(() => {
    el.style.transition = "transform .2s ease";
    el.style.transform = "";
  });
}

function swapTilePositions(tileA, tileB) {
  const rectA = tileA.el.getBoundingClientRect();
  const rectB = tileB.el.getBoundingClientRect();

  const a = state.tiles.indexOf(tileA);
  const b = state.tiles.indexOf(tileB);
  [state.tiles[a], state.tiles[b]] = [state.tiles[b], state.tiles[a]];
  [state.sources[a], state.sources[b]] = [state.sources[b], state.sources[a]];
  if (state.audioIndex === a) state.audioIndex = b;
  else if (state.audioIndex === b) state.audioIndex = a;
  syncTileOrder();
  history.replaceState(null, "", hashFor(state.sources));
  saveCurrentLinks();

  // Tolgono subito la trasformazione "a mano": da qui in poi la posizione la
  // decide il CSS (--order, già aggiornato da syncTileOrder).
  tileA.el.style.transition = "none";
  tileA.el.style.transform = "";
  tileB.el.style.transition = "none";
  tileB.el.style.transform = "";

  flipTile(tileA.el, rectA);
  flipTile(tileB.el, rectB);
}

function onTileDragEnd() {
  window.removeEventListener("pointermove", onTileDragMove);
  window.removeEventListener("pointerup", onTileDragEnd);
  window.removeEventListener("pointercancel", onTileDragEnd);
  if (!dragCtx) return;

  const { tile, tileEl, overTile, moved } = dragCtx;
  tileEl.classList.remove("dragging");
  if (overTile) overTile.el.classList.remove("drop-target");

  if (moved) {
    suppressNextClick = true;
    if (overTile) swapTilePositions(tile, overTile);
    else { tileEl.style.transition = "transform .15s ease"; tileEl.style.transform = ""; }
  }

  dragCtx = null;
}

/* ---------- Selezione multipla ---------- */

function toggleSelected(tile) {
  const on = !tile.el.classList.contains("selected");
  tile.el.classList.toggle("selected", on);
  tile.selectBtn.setAttribute("aria-pressed", String(on));
  updateRemoveSelectedButton();
}

function selectedTiles() {
  return state.tiles.filter((t) => t.el.classList.contains("selected"));
}

function updateRemoveSelectedButton() {
  const n = selectedTiles().length;
  els.btnRemoveSelected.classList.toggle("hidden", !state.selecting || n === 0);
  els.btnRemoveSelected.textContent = t("manage.removeSelected", { n });
}

function setSelecting(on) {
  state.selecting = on;
  els.wall.classList.toggle("selecting", on);
  els.btnSelect.textContent = t(on ? "manage.selectModeOn" : "manage.selectMode");
  state.tiles.forEach((tl) => {
    if (!on) {
      tl.el.classList.remove("selected");
      tl.selectBtn.setAttribute("aria-pressed", "false");
    }
  });
  updateRemoveSelectedButton();
}

/* ---------- Modifica di un video già inserito ---------- */

function startEditTile(tile) {
  if (tile.el.classList.contains("editing")) return;
  state.tiles.forEach((t) => { if (t !== tile) cancelEditTile(t); });
  tile.el.classList.add("editing");
  tile.editInput.value = sourceUrl(tile.src);
  tile.editInput.focus();
  tile.editInput.select();
}

function cancelEditTile(tile) {
  tile.el.classList.remove("editing");
}

function commitEditTile(tile) {
  const newSrc = extractSource(tile.editInput.value.trim());
  if (!newSrc) {
    showToast(t("manage.editInvalid"));
    return;
  }
  tile.el.classList.remove("editing");
  replaceTileSource(tile, newSrc);
}

// Sostituisce la sorgente di un tile già presente senza toccare gli altri:
// distrugge solo il player di questo riquadro e ne crea uno nuovo al suo posto.
function replaceTileSource(tile, newSrc) {
  const idx = state.tiles.indexOf(tile);
  if (idx === -1) return;

  teardownPlayer(tile);
  tile.dead = false;
  tile.ready = false;
  tile.errored = false;
  tile.playing = true;
  tile.el.classList.remove("is-error");
  tile.src = newSrc;
  state.sources[idx] = newSrc;

  const slotId = nextSlotId();
  const videoBox = tile.el.querySelector(".tile-video");
  videoBox.innerHTML = `<div class="player-slot" id="${slotId}"></div>`;

  const badge = tile.el.querySelector(".badge");
  badge.className = `badge ${newSrc.type}`;
  const badgeTitle = t(newSrc.type === "tw" ? "tile.twitch" : "tile.youtube");
  badge.title = badgeTitle;

  setLabel(tile, t("tile.loading"));

  (async () => {
    if (newSrc.type === "tw") {
      await loadTwitchApi();
      if (!tile.dead) createTwitchTile(tile, slotId);
    } else {
      await loadYouTubeApi();
      if (!tile.dead) createYouTubeTile(tile, slotId);
    }
    // Se questo tile aveva l'audio attivo, lo si ridà al nuovo player appena è pronto.
    const reapplyAudio = () => {
      if (tile.dead) return;
      if (tile.ready) {
        try { setAudio(state.audioIndex); } catch (_) { /* pazienza */ }
        return;
      }
      setTimeout(reapplyAudio, 300);
    };
    setTimeout(reapplyAudio, 300);
  })();

  history.replaceState(null, "", hashFor(state.sources));
  saveCurrentLinks();

  if (state.focusedIndex !== null) applyFocusLayout();
  else layoutGrid();

  showToast(t("manage.editedToast"));
}

/* ---------- Aggiunta di un video senza reinizializzare gli altri ---------- */

async function addSource(src) {
  if (src.type === "tw") await loadTwitchApi();
  else await loadYouTubeApi();

  const tile = createTile(src);
  els.wall.appendChild(tile.el);
  initTilePlayer(tile);
  tile.el.style.setProperty("--order", state.tiles.length);
  state.tiles.push(tile);
  state.sources.push(src);

  history.replaceState(null, "", hashFor(state.sources));
  saveCurrentLinks();

  if (state.focusedIndex !== null) applyFocusLayout();
  else layoutGrid();
}

// Rimette un video rimosso alla sua posizione originale (pulsante "Annulla"
// del toast): l'indice viene limitato alla lunghezza attuale, nel caso nel
// frattempo lo stato sia cambiato ancora. Se il muro era già tornato alla
// schermata iniziale (era l'ultimo video), lo si rimostra.
async function restoreTileAt(index, src) {
  if (src.type === "tw") await loadTwitchApi();
  else await loadYouTubeApi();

  const tile = createTile(src);
  els.wall.appendChild(tile.el);
  initTilePlayer(tile);

  const at = Math.min(index, state.tiles.length);
  state.tiles.splice(at, 0, tile);
  state.sources.splice(at, 0, src);
  if (state.focusedIndex !== null && state.focusedIndex >= at) state.focusedIndex++;
  if (state.audioIndex !== null && state.audioIndex >= at) state.audioIndex++;
  syncTileOrder();

  history.replaceState(null, "", hashFor(state.sources));
  saveCurrentLinks();

  if (els.wall.classList.contains("hidden")) {
    els.setup.classList.add("hidden");
    els.topbar.classList.remove("hidden");
    els.wall.classList.remove("hidden");
    showAddBar();
    els.wall.style.setProperty("--head-h", HEAD_H + "px");
  }

  if (state.focusedIndex !== null) applyFocusLayout();
  else layoutGrid();
}

async function restoreEntries(entries) {
  for (const entry of entries) {
    await restoreTileAt(entry.index, entry.src);
  }
}

/* ---------- Rimozione di uno o più video senza reinizializzare gli altri ---------- */

function teardownPlayer(tile) {
  tile.dead = true; // ferma i loop (titolo, mute forzato) legati al player precedente
  try { if (tile.src.type === "yt" && tile.player) tile.player.destroy(); } catch (_) { /* pazienza */ }
  tile.player = null;
}

function removeTiles(indexes) {
  const sorted = [...new Set(indexes)].filter((i) => i != null && i >= 0).sort((a, b) => b - a);
  if (!sorted.length) return;

  let removedFocused = false;
  sorted.forEach((i) => {
    const tile = state.tiles[i];
    if (!tile) return;
    teardownPlayer(tile);
    tile.el.remove();
    state.tiles.splice(i, 1);
    state.sources.splice(i, 1);

    if (state.focusedIndex === i) removedFocused = true;
    else if (state.focusedIndex !== null && state.focusedIndex > i) state.focusedIndex--;
    if (state.audioIndex === i) state.audioIndex = null;
    else if (state.audioIndex !== null && state.audioIndex > i) state.audioIndex--;
  });
  if (removedFocused) state.focusedIndex = null;

  history.replaceState(null, "", hashFor(state.sources));
  saveCurrentLinks();

  if (!state.tiles.length) {
    // Nessun video rimasto: si torna alla schermata iniziale.
    destroyWall();
    els.topbar.classList.add("hidden");
    els.wall.classList.add("hidden");
    hideAddBar();
    els.setup.classList.remove("hidden");
    populateRows([]);
    return;
  }

  updateRemoveSelectedButton();
  if (removedFocused) showGrid();
  else if (state.focusedIndex !== null) applyFocusLayout();
  else layoutGrid();
}

/* ---------- Costruzione / aggiornamento del muro (sempre per diff) ---------- */

// Chiave con cui si riconosce "lo stesso video" tra la lista vecchia e quella
// nuova: stesso identificativo del link condiviso.
function sourceKey(src) {
  return keyOf(src);
}

// Punto d'ingresso unico per mostrare un elenco di sorgenti: avvio da zero,
// link condiviso incollato a muro già aperto, o rinvio dalla schermata
// "Modifica link". Non ricrea mai tutto: confronta con l'elenco attuale e
// riusa i tile invariati (stesso player, stessa posizione nel DOM), aggiorna
// solo quelli cambiati, aggiunge i nuovi, rimuove solo quelli tolti.
async function applyWall(sources) {
  const needYT = sources.some((s) => s.type === "yt");
  const needTW = sources.some((s) => s.type === "tw");
  await Promise.all([
    needYT ? loadYouTubeApi() : null,
    needTW ? loadTwitchApi() : null,
  ]);

  // Chi c'era prima, pescabile per valore (stesso tipo+id): può essercene più
  // di uno uguale, quindi una coda per chiave.
  const pool = new Map();
  state.tiles.forEach((tile) => {
    const key = sourceKey(tile.src);
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key).push(tile);
  });

  const oldFocusedTile = state.focusedIndex !== null ? state.tiles[state.focusedIndex] : null;
  const oldAudioTile = state.audioIndex !== null ? state.tiles[state.audioIndex] : null;

  const newTiles = sources.map((src) => {
    const queue = pool.get(sourceKey(src));
    const reused = queue && queue.length ? queue.shift() : null;
    if (reused) return reused; // stesso video: nessun tocco al player

    const tile = createTile(src);
    els.wall.appendChild(tile.el);
    initTilePlayer(tile);
    return tile;
  });

  // Chi resta nel pool non è più nella lista nuova: va rimosso per davvero.
  pool.forEach((queue) => queue.forEach((tile) => {
    teardownPlayer(tile);
    tile.el.remove();
  }));

  state.tiles = newTiles;
  state.sources = sources.slice();
  syncTileOrder();

  state.focusedIndex = oldFocusedTile ? state.tiles.indexOf(oldFocusedTile) : -1;
  if (state.focusedIndex === -1) state.focusedIndex = null;
  state.audioIndex = oldAudioTile ? state.tiles.indexOf(oldAudioTile) : -1;
  if (state.audioIndex === -1) state.audioIndex = null;

  // L'URL nella barra degli indirizzi diventa già il link da condividere
  history.replaceState(null, "", hashFor(state.sources));
  saveCurrentLinks();

  if (!state.tiles.length) {
    els.topbar.classList.add("hidden");
    els.wall.classList.add("hidden");
    hideAddBar();
    els.setup.classList.remove("hidden");
    populateRows([]);
    return;
  }

  // Prima si mostra il muro, così le misure per il layout sono reali
  els.setup.classList.add("hidden");
  els.topbar.classList.remove("hidden");
  els.wall.classList.remove("hidden");
  showAddBar();
  els.wall.style.setProperty("--head-h", HEAD_H + "px");

  if (state.focusedIndex !== null) applyFocusLayout();
  else showGrid();
}

function destroyWall() {
  state.tiles.forEach((t) => teardownPlayer(t));
  state.tiles = [];
  state.focusedIndex = null;
  state.audioIndex = null;
  ghostEl = null; // era già figlio di #wall: innerHTML="" se ne occupa
  els.wall.innerHTML = "";
  setSelecting(false);
}

/* ---------- Audio ---------- */

let audioSyncPausedUntil = 0;

function setAudio(index) {
  state.audioIndex = index;
  state.tiles.forEach((t, i) => {
    const on = i === index;
    if (t.ready) {
      try { t.setMuted(!on); } catch (_) { /* player non pronto */ }
    }
    t.muteBtn.textContent = on ? "🔊" : "🔇";
    t.el.classList.toggle("has-audio", on);
  });
  // mute()/unMute() sono asincroni (postMessage verso l'iframe): per una
  // manciata di millisecondi isMuted() può ancora rispondere con lo stato
  // vecchio. Senza questa pausa, syncAudioState() qui sotto legge quel
  // valore non ancora aggiornato, lo scambia per un'azione nativa
  // dell'utente e rimbalza l'audio da solo, anche nello stesso giro.
  audioSyncPausedUntil = Date.now() + 500;
}

// Pausa e avanzamento sono quelli nativi del player (YouTube/Twitch): niente
// overlay propri, niente ".shield" a bloccare i click sull'iframe. Ma i
// controlli nativi includono anche play/mute/volume, quindi ogni riquadro è
// nativamente smutabile in qualsiasi momento: la regola "un solo audio alla
// volta" non si può più far rispettare bloccando i click, va mantenuta
// leggendo lo stato vero del player e sincronizzando quello del sito.
//
// L'IFrame API non offre un evento "volume cambiato": prima si forzava il
// muto a ogni giro, combattendo l'utente se usava il controllo nativo (es.
// il tasto "m" di YouTube). Ora invece si legge lo stato vero di OGNI
// riquadro e si allinea quello del sito, nell'unica direzione che conta:
// - il riquadro con l'audio ma mutato nativamente → il sito smette di
//   considerarlo "attivo";
// - un riquadro senza audio ma smutato nativamente → diventa lui il nuovo
//   audio attivo, e setAudio() si occupa come sempre di mutare gli altri.
function syncAudioState() {
  if (Date.now() < audioSyncPausedUntil) return;
  state.tiles.forEach((tile, i) => {
    if (tile.dead || !tile.ready || !tile.player) return;
    try {
      const isMuted = tile.src.type === "yt" ? tile.player.isMuted() : tile.player.getMuted();
      if (i === state.audioIndex && isMuted) setAudio(null);
      else if (i !== state.audioIndex && !isMuted) setAudio(i);
    } catch (_) { /* player non pronto */ }
  });
}

setInterval(syncAudioState, 200);

/* ---------- Layout ---------- */

// Griglia automatica: prova tutte le combinazioni colonne/righe e sceglie quella
// che rende i riquadri più grandi possibile (tutti uguali, tutti visibili senza scorrere).
function layoutGrid() {
  if (state.focusedIndex !== null || !state.tiles.length) return;

  const n = state.tiles.length;
  const hasTwitch = state.sources.some((s) => s.type === "tw");
  const minW = hasTwitch ? TWITCH_MIN_W : MIN_W;

  // Non si legge più els.wall.clientWidth: ora che il muro ha una larghezza
  // CSS calcolata da --cols/--tile-w (per centrare le righe), il suo clientWidth
  // rifletterebbe la misura del giro precedente invece dello spazio reale
  // disponibile (es. dopo un resize). Si misura la larghezza del viewport.
  const W = document.documentElement.clientWidth - PAD * 2;
  const top = els.wall.offsetTop;
  const H = window.innerHeight - top - PAD * 2;
  if (W <= 0 || H <= 0) return;

  let bestCols = 1;
  let bestW = 0;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const wByWidth = (W - GAP * (cols - 1)) / cols;
    // l'altezza di un riquadro = titolo + video 16:9
    const wByHeight = ((H - GAP * (rows - 1)) / rows - CHROME) * RATIO;
    const w = Math.min(wByWidth, wByHeight);
    if (w > bestW) {
      bestW = w;
      bestCols = cols;
    }
  }

  let fits = true;
  if (bestW < minW) {
    // Troppi video per stare tutti in una schermata: dimensione minima e pagina scorrevole
    fits = false;
    bestCols = Math.max(1, Math.min(n, Math.floor((W + GAP) / (minW + GAP))));
    bestW = (W - GAP * (bestCols - 1)) / bestCols;
  }

  els.wall.style.setProperty("--cols", bestCols);
  els.wall.style.setProperty("--tile-w", Math.floor(bestW) + "px");
  els.wall.style.minHeight = fits ? (window.innerHeight - top) + "px" : "";
}

function updateMainHeight() {
  const h = window.innerHeight - els.wall.offsetTop - PAD * 2;
  const mainH = Math.max(h, 240);
  els.wall.style.setProperty("--main-h", mainH + "px");

  // Misura 16:9 esatta per il video ingrandito (vedi il commento in CSS su
  // .wall.focus .tile.focused .tile-video): si calcola qui, non si lascia
  // al player, sennò aggiunge lui le barre nere per conto suo.
  const tile = state.focusedIndex !== null ? state.tiles[state.focusedIndex] : null;
  if (!tile) return;
  const availW = tile.el.clientWidth;
  const availH = mainH - HEAD_H;
  if (availW <= 0 || availH <= 0) return;
  const w = Math.min(availW, availH * RATIO);
  els.wall.style.setProperty("--focus-w", Math.floor(w) + "px");
  els.wall.style.setProperty("--focus-h", Math.floor(w / RATIO) + "px");
}

// Il tile in primo piano "libera" la sua posizione nella colonna laterale:
// agli altri tile viene assegnata una riga fissa (il loro indice originale),
// così l'ordine non cambia mai cambiando il video in evidenza.
let ghostEl = null;

function removeGhost() {
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
}

// Riquadro vuoto e tratteggiato nella posizione lasciata libera dal tile in primo piano.
function placeGhost(index) {
  removeGhost();
  ghostEl = document.createElement("div");
  ghostEl.className = "tile tile-ghost";
  ghostEl.setAttribute("aria-hidden", "true");
  ghostEl.style.setProperty("--row", String(index + 1));
  ghostEl.innerHTML = `<div class="tile-head"></div><div class="tile-video"></div>`;
  els.wall.appendChild(ghostEl);
}

// Il pulsante "espandi" diventa "riduci" (icona + testo) sul tile ingrandito:
// è anche l'icona ben visibile sul video grande richiesta in A3.
function updateExpandButtons() {
  state.tiles.forEach((tile, i) => {
    const isFocused = i === state.focusedIndex;
    tile.expandBtn.innerHTML = isFocused ? ICON_REDUCE : ICON_EXPAND;
    const label = t(isFocused ? "manage.reduceTitle" : "manage.expandTitle");
    tile.expandBtn.title = label;
    tile.expandBtn.setAttribute("aria-label", label);
  });
}

// Riga fissa per ogni tile (indice attuale) + segnaposto vuoto al posto del
// tile in primo piano. Richiamabile anche dopo un riordino, senza riaprire
// la modalità focus da zero (niente scroll in cima non richiesto).
function applyFocusLayout() {
  els.wall.style.setProperty("--side-count", state.tiles.length);
  state.tiles.forEach((t, i) => {
    t.el.style.setProperty("--row", String(i + 1));
    t.el.classList.toggle("focused", i === state.focusedIndex);
  });
  updateExpandButtons();
  placeGhost(state.focusedIndex);
}

function toggleExpand(tile) {
  const idx = state.tiles.indexOf(tile);
  if (idx === -1) return;
  if (state.focusedIndex === idx) showGrid();
  else focusTile(idx);
}

function focusTile(index) {
  state.focusedIndex = index;
  els.wall.classList.add("focus");
  els.wall.style.minHeight = "";
  applyFocusLayout();
  updateMainHeight();
  window.scrollTo({ top: 0 });
}

function showGrid() {
  state.focusedIndex = null;
  els.wall.classList.remove("focus");
  els.wall.style.removeProperty("--side-count");
  els.wall.style.removeProperty("--main-h");
  els.wall.style.removeProperty("--focus-w");
  els.wall.style.removeProperty("--focus-h");
  removeGhost();
  state.tiles.forEach((t) => {
    t.el.classList.remove("focused");
    t.el.style.removeProperty("--row");
  });
  updateExpandButtons();
  layoutGrid();
}

// L'ordine visivo in griglia segue questa proprietà CSS, non la posizione nel
// DOM: un nodo che contiene un iframe, se spostato con appendChild/insertBefore,
// viene rimosso e reinserito e il player si ricarica da capo. Usata da
// applyWall() (diff dei link) e da restoreTileAt() (Annulla rimozione) per
// rimettere un tile al posto giusto senza mai spostarlo davvero nel DOM.
function syncTileOrder() {
  state.tiles.forEach((t, i) => t.el.style.setProperty("--order", i));
}

/* ---------- Eventi UI ---------- */

els.btnStart.addEventListener("click", () => {
  const lines = collectLinks();
  const sources = [];
  let bad = 0;

  lines.forEach((line) => {
    const src = extractSource(line);
    if (src) sources.push(src);
    else bad++;
  });

  if (!sources.length) {
    els.msg.textContent = t("setup.noValidLinks");
    return;
  }

  els.msg.textContent = bad ? t("setup.ignoredLinks", { n: bad }) : "";

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch (_) {}
  applyWall(sources);
});


function updateLoopButton() {
  els.btnLoop.textContent = t(state.loopEnabled ? "toolbar.loopOn" : "toolbar.loopOff");
  els.btnLoop.setAttribute("aria-pressed", String(state.loopEnabled));
}

els.btnLoop.addEventListener("click", () => {
  state.loopEnabled = !state.loopEnabled;
  updateLoopButton();
});
els.btnShare.addEventListener("click", copyShareLink);

/* ---------- Aggiungere un video direttamente dal muro ---------- */

// La barra è sempre pronta per il prossimo link, visibile insieme alla topbar:
// niente pulsante che la apre o la chiude (showAddBar/hideAddBar seguono topbar).
function showAddBar() {
  els.addPanel.classList.remove("hidden");
}

function hideAddBar() {
  els.addPanel.classList.add("hidden");
  els.addMsg.textContent = "";
}

function submitAddPanel() {
  const parts = els.addInput.value.split(/\s+/).filter(Boolean);
  if (!parts.length) return;

  let added = 0, bad = 0;
  parts.forEach((p) => {
    const src = extractSource(p);
    if (src) { addSource(src); added++; } else bad++;
  });

  if (added) {
    showToast(t("manage.addedToast", { n: added }));
    els.addInput.value = "";
    els.addMsg.textContent = bad ? t("setup.ignoredLinks", { n: bad }) : "";
  } else {
    els.addMsg.textContent = t("manage.addInvalid");
  }
  els.addInput.focus();
}

els.addConfirm.addEventListener("click", submitAddPanel);
els.addInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter") {
    e.preventDefault();
    submitAddPanel();
  }
});

/* ---------- Selezione multipla e rimozione dal muro ---------- */

els.btnSelect.addEventListener("click", () => setSelecting(!state.selecting));
els.btnRemoveSelected.addEventListener("click", () => {
  const tiles = selectedTiles();
  if (!tiles.length) return;
  const n = tiles.length;
  const entries = tiles
    .map((tl) => ({ index: state.tiles.indexOf(tl), src: tl.src }))
    .sort((a, b) => a.index - b.index);
  removeTiles(entries.map((e) => e.index));
  showUndoToast(t("manage.removedSelectedToast", { n }), () => restoreEntries(entries));
  setSelecting(false);
});

// Donazioni
els.donateTop.addEventListener("click", openDonateDialog);
els.donateSetup.addEventListener("click", openDonateDialog);
els.donateClose.addEventListener("click", () => els.donateDialog.close());
els.donateGo.addEventListener("click", goCustomDonation);
els.donateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    goCustomDonation();
  }
});
// Click fuori dalla finestra (sullo sfondo scuro) = chiudi
els.donateDialog.addEventListener("click", (e) => {
  if (e.target === els.donateDialog) els.donateDialog.close();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || els.donateDialog.open) return;
  const editingTile = state.tiles.find((tl) => tl.el.classList.contains("editing"));
  if (editingTile) { cancelEditTile(editingTile); return; }
  if (state.selecting) { setSelecting(false); return; }
  if (state.focusedIndex !== null) showGrid();
});

// Scorciatoie stile YouTube (B6), pilotate via API sul "video attivo" (vedi
// sopra), non sul focus nativo dell'iframe (cross-origin, non rilevabile).
function isTypingTarget(el) {
  if (!el) return false;
  // Un campo può restare "focused" mentre la sua schermata viene nascosta
  // (es. l'input dell'ultima riga nel setup, lasciato a fuoco apposta per il
  // prossimo link, vedi B5): se è dentro un contenitore nascosto da noi con
  // .hidden, non conta più, altrimenti le scorciatoie resterebbero bloccate
  // anche col muro ben visibile e aperto.
  if (el.closest(".hidden")) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

// getCurrentTime/seekTo non hanno un vero "fotogramma successivo": 1/30s è
// un'approssimazione (il passo dipende dal framerate reale del video).
function nudgeTime(tile, deltaSeconds) {
  if (tile.src.type !== "yt" || tile.dead || !tile.ready || !tile.player) return;
  try {
    const target = Math.max(0, tile.player.getCurrentTime() + deltaSeconds);
    tile.player.seekTo(target, true);
  } catch (_) { /* player non pronto */ }
}

document.addEventListener("keydown", (e) => {
  if (isTypingTarget(document.activeElement) || els.donateDialog.open) return;
  if (!activeTile || activeTile.dead) return;

  switch (e.key) {
    case "k":
      e.preventDefault();
      activeTile.togglePlay();
      break;
    case "j":
      e.preventDefault();
      nudgeTime(activeTile, -10);
      break;
    case "l":
      e.preventDefault();
      nudgeTime(activeTile, 10);
      break;
    case "m": {
      e.preventDefault();
      const idx = state.tiles.indexOf(activeTile);
      if (idx !== -1) setAudio(state.audioIndex === idx ? null : idx);
      break;
    }
    case ",":
      e.preventDefault();
      nudgeTime(activeTile, -1 / 30);
      break;
    case ".":
      e.preventDefault();
      nudgeTime(activeTile, 1 / 30);
      break;
  }
});

window.addEventListener("resize", () => {
  if (state.focusedIndex === null) layoutGrid();
  else updateMainHeight();
});

// Se qualcuno incolla un altro link con hash mentre la pagina è già aperta
window.addEventListener("hashchange", () => {
  const sources = getSourcesFromHash();
  if (sources.length && hashFor(sources) !== hashFor(state.sources)) applyWall(sources);
});

// Cambiare lingua non deve interrompere video/audio: solo gli importi
// delle donazioni (formattati col locale) vanno rigenerati.
document.addEventListener("scrywall:langchange", buildDonateDialog);

/* ---------- Avvio ---------- */

await initI18n();
if (els.langSwitchTopbar) registerLanguageSwitch(els.langSwitchTopbar);
if (els.langSwitchSetup) registerLanguageSwitch(els.langSwitchSetup);

buildDonateDialog();

// Ultimi link inseriti a mano su questo browser (più la riga vuota in fondo)
populateRows(loadSavedLinks());

// Se l'URL contiene dei video (link condiviso), parte direttamente il muro
const sources = getSourcesFromHash();
if (sources.length) applyWall(sources);
