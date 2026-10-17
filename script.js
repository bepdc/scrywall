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
  btnGrid: document.getElementById("btn-grid"),
  btnMuteAll: document.getElementById("btn-mute-all"),
  btnShare: document.getElementById("btn-share"),
  btnEdit: document.getElementById("btn-edit"),
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
};

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

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(true);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(true);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => resolve(false);
    document.head.appendChild(tag);
  });
}

function loadTwitchApi() {
  return new Promise((resolve) => {
    if (window.Twitch && window.Twitch.Player) return resolve(true);
    const tag = document.createElement("script");
    tag.src = "https://player.twitch.tv/js/embed/v1.js";
    tag.onload = () => resolve(Boolean(window.Twitch && window.Twitch.Player));
    tag.onerror = () => resolve(false); // es. bloccato da un adblock
    document.head.appendChild(tag);
  });
}

let toastTimer = null;
function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
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
    validateRow(row);
    ensureTrailingEmptyRow();
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
      loop: 1,
      playlist: videoId, // necessario per far funzionare il loop
    },
    events: {
      onReady: (e) => {
        tile.ready = true;
        e.target.mute();
        e.target.playVideo();
        trackTitle(tile);
      },
      onStateChange: () => {
        if (!tile.errored) updateTitle(tile);
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

  tile.setMuted = (muted) => {
    player.setMuted(muted);
    if (!muted) player.setVolume(1);
  };
}

/* ---------- Costruzione del muro ---------- */

async function startWall(sources) {
  const needYT = sources.some((s) => s.type === "yt");
  const needTW = sources.some((s) => s.type === "tw");
  await Promise.all([
    needYT ? loadYouTubeApi() : null,
    needTW ? loadTwitchApi() : null,
  ]);

  destroyWall();
  state.sources = sources.slice();

  // L'URL nella barra degli indirizzi diventa già il link da condividere
  history.replaceState(null, "", hashFor(state.sources));

  // Prima si mostra il muro, così le misure per il layout sono reali
  els.setup.classList.add("hidden");
  els.topbar.classList.remove("hidden");
  els.wall.classList.remove("hidden");
  els.wall.style.setProperty("--head-h", HEAD_H + "px");

  sources.forEach((src, i) => {
    const slotId = `player-${i}`;
    const tileEl = document.createElement("div");
    tileEl.className = "tile";
    tileEl.innerHTML = `
      <div class="tile-head">
        <span class="badge ${src.type}" data-i18n-attr="title:tile.${src.type === "tw" ? "twitch" : "youtube"}" title="${t(src.type === "tw" ? "tile.twitch" : "tile.youtube")}"></span>
        <span class="label">${t("tile.loading")}</span>
        <button class="mute" type="button" data-i18n-attr="title:tile.muteToggle" title="${t("tile.muteToggle")}">🔇</button>
      </div>
      <div class="tile-video">
        <div class="player-slot" id="${slotId}"></div>
        <div class="shield"></div>
      </div>
    `;
    els.wall.appendChild(tileEl);

    const tile = {
      el: tileEl,
      src,
      ready: false,
      dead: false,
      errored: false,
      labelEl: tileEl.querySelector(".label"),
      muteBtn: tileEl.querySelector(".mute"),
      player: null,
      setMuted: () => {},
    };

    if (src.type === "tw") createTwitchTile(tile, slotId);
    else createYouTubeTile(tile, slotId);

    // Click sul riquadro (titolo o video): lo porta in primo piano
    tileEl.addEventListener("click", (ev) => {
      if (ev.target.closest(".mute")) return;
      if (state.focusedIndex === i) return;
      focusTile(i);
    });

    // Click sul pulsante audio: audio solo su questo
    tile.muteBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setAudio(state.audioIndex === i ? null : i);
    });

    state.tiles.push(tile);
  });

  showGrid();
}

function destroyWall() {
  state.tiles.forEach((t) => {
    t.dead = true;
    try { if (t.src.type === "yt") t.player.destroy(); } catch (_) { /* pazienza */ }
  });
  state.tiles = [];
  state.focusedIndex = null;
  state.audioIndex = null;
  els.wall.innerHTML = "";
}

/* ---------- Audio ---------- */

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
}

// I controlli nativi di YouTube/Twitch dentro l'iframe permettono di smutare o
// alzare il volume bypassando il pulsante del sito. L'IFrame API non offre un
// evento "volume cambiato", quindi si forza il muto a intervalli su ogni tile
// che il sito considera non attivo: solo il tile scelto col pulsante del sito
// resta libero di seguire il volume nativo di YouTube/Twitch.
function enforceMute() {
  state.tiles.forEach((t, i) => {
    if (t.dead || !t.ready || !t.player) return;
    if (state.audioIndex === i) return; // qui comanda il controllo nativo della piattaforma
    try {
      if (t.src.type === "yt") {
        if (!t.player.isMuted()) t.player.mute();
      } else if (t.src.type === "tw") {
        if (!t.player.getMuted()) t.player.setMuted(true);
      }
    } catch (_) { /* player non pronto */ }
  });
}

setInterval(enforceMute, 200);

/* ---------- Layout ---------- */

// Griglia automatica: prova tutte le combinazioni colonne/righe e sceglie quella
// che rende i riquadri più grandi possibile (tutti uguali, tutti visibili senza scorrere).
function layoutGrid() {
  if (state.focusedIndex !== null || !state.tiles.length) return;

  const n = state.tiles.length;
  const hasTwitch = state.sources.some((s) => s.type === "tw");
  const minW = hasTwitch ? TWITCH_MIN_W : MIN_W;

  const W = els.wall.clientWidth - PAD * 2;
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
  els.wall.style.setProperty("--main-h", Math.max(h, 240) + "px");
}

function focusTile(index) {
  state.focusedIndex = index;
  els.wall.classList.add("focus");
  els.wall.style.minHeight = "";
  els.wall.style.setProperty("--side-count", Math.max(state.tiles.length - 1, 1));
  updateMainHeight();
  state.tiles.forEach((t, i) => t.el.classList.toggle("focused", i === index));
  window.scrollTo({ top: 0 });
}

function showGrid() {
  state.focusedIndex = null;
  els.wall.classList.remove("focus");
  els.wall.style.removeProperty("--side-count");
  els.wall.style.removeProperty("--main-h");
  state.tiles.forEach((t) => t.el.classList.remove("focused"));
  layoutGrid();
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
  startWall(sources);
});

els.btnGrid.addEventListener("click", showGrid);
els.btnMuteAll.addEventListener("click", () => setAudio(null));
els.btnShare.addEventListener("click", copyShareLink);

els.btnEdit.addEventListener("click", () => {
  // Rimette nelle righe i link attuali (utile anche a chi è arrivato da un link condiviso)
  if (state.sources.length) populateRows(state.sources.map(sourceUrl));
  destroyWall();
  els.msg.textContent = "";
  els.topbar.classList.add("hidden");
  els.wall.classList.add("hidden");
  els.setup.classList.remove("hidden");
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
  if (e.key === "Escape" && state.focusedIndex !== null && !els.donateDialog.open) showGrid();
});

window.addEventListener("resize", () => {
  if (state.focusedIndex === null) layoutGrid();
  else updateMainHeight();
});

// Se qualcuno incolla un altro link con hash mentre la pagina è già aperta
window.addEventListener("hashchange", () => {
  const sources = getSourcesFromHash();
  if (sources.length && hashFor(sources) !== hashFor(state.sources)) startWall(sources);
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
if (sources.length) startWall(sources);
