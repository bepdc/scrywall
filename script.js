"use strict";

/* =====================================================================
   ⚙️  CONFIGURAZIONE
   Metti qui il tuo link PayPal.me (vedi istruzioni nella chat).
   Esempio: "https://paypal.me/mariorossi"
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


const STORAGE_KEY = "palantirtube.links";
const ID_RE = /^[\w-]{11}$/;

// Parametri del layout automatico
const GAP = 8;        // spazio tra i video (px)
const PAD = 8;        // margine esterno del muro (px)
const MIN_W = 240;    // larghezza minima di un video: sotto questa soglia si scorre la pagina
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
};

const state = {
  ids: [],            // ID dei video attualmente nel muro
  tiles: [],          // { el, player, ready, muteBtn, labelEl, videoId, dead, errored }
  focusedIndex: null, // null = modalità griglia
  audioIndex: null,   // quale video ha l'audio attivo
};

/* ---------- Utilità ---------- */

function extractVideoId(raw) {
  const text = raw.trim();
  if (!text) return null;

  // ID nudo
  if (ID_RE.test(text)) return text;

  let url;
  try {
    url = new URL(text.startsWith("http") ? text : "https://" + text);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_RE.test(id) ? id : null;
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;

    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    if (m) return m[1];
  }
  return null;
}

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
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

function formatMoney(amount) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: DONATION_CURRENCY,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function paypalUrl(amount) {
  const base = PAYPAL_ME_URL.replace(/\/+$/, "");
  if (amount == null) return base; // nessun importo: sceglie l'utente su PayPal
  const a = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${base}/${a}${DONATION_CURRENCY}`;
}

// null = campo vuoto, NaN = importo non valido, altrimenti il numero
function parseAmount(text) {
  const t = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  const v = parseFloat(t);
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
    a.textContent = `${emoji} ${formatMoney(amount)}`;
    els.donateOptions.appendChild(a);
  });

  const parts = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: DONATION_CURRENCY,
  }).formatToParts(0);
  const cur = parts.find((p) => p.type === "currency");
  els.donateCurrency.textContent = cur ? cur.value : DONATION_CURRENCY;
}

function openDonateDialog() {
  els.donateMsg.textContent = "";
  els.donateDialog.showModal();
}

function goCustomDonation() {
  const amount = parseAmount(els.donateInput.value);
  if (Number.isNaN(amount)) {
    els.donateMsg.textContent = "Importo non valido: scrivi ad esempio 3,50";
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
  input.placeholder = "Incolla un link YouTube…";
  input.value = value;
  input.autocomplete = "off";
  input.spellcheck = false;

  const del = document.createElement("button");
  del.type = "button";
  del.className = "row-del";
  del.textContent = "✕";
  del.title = "Rimuovi questo link";
  del.setAttribute("aria-label", "Rimuovi questo link");

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
  const ok = v !== "" && extractVideoId(v) !== null;
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

/* ---------- Link condivisibile (gli ID stanno nell'hash dell'URL) ---------- */

function getIdsFromHash() {
  const m = location.hash.match(/[#&]v=([\w,-]+)/);
  if (!m) return [];
  return m[1].split(",").filter((id) => ID_RE.test(id));
}

function buildShareUrl() {
  return location.origin + location.pathname + "#v=" + state.ids.join(",");
}

async function copyShareLink() {
  if (!state.ids.length) return;
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copiato negli appunti");
  } catch {
    // Fallback se il browser non permette l'accesso agli appunti
    window.prompt("Copia il link:", url);
  }
}

/* ---------- Titoli dei video ---------- */

function updateTitle(tile) {
  try {
    const data = tile.player.getVideoData();
    if (data && data.title) {
      tile.labelEl.textContent = data.title;
      tile.labelEl.title = data.title;
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

function describeError(code) {
  switch (code) {
    case 100: return "Video non trovato o privato";
    case 101:
    case 150: return "Incorporamento disattivato dall'autore";
    case 153: return "Errore 153: apri il sito via http(s), non da file://";
    default:  return "Errore di riproduzione";
  }
}

/* ---------- Costruzione del muro ---------- */

async function startWall(ids) {
  await loadYouTubeApi();

  destroyWall();
  state.ids = ids.slice();

  // L'URL nella barra degli indirizzi diventa già il link da condividere
  history.replaceState(null, "", "#v=" + state.ids.join(","));

  // Prima si mostra il muro, così le misure per il layout sono reali
  els.setup.classList.add("hidden");
  els.topbar.classList.remove("hidden");
  els.wall.classList.remove("hidden");

  ids.forEach((videoId, i) => {
    const tileEl = document.createElement("div");
    tileEl.className = "tile";
    tileEl.innerHTML = `
      <div id="player-${i}"></div>
      <div class="shield"></div>
      <div class="bar">
        <span class="label">Caricamento…</span>
        <button class="mute" type="button" title="Attiva/disattiva audio">🔇</button>
      </div>
    `;
    els.wall.appendChild(tileEl);

    const tile = {
      el: tileEl,
      ready: false,
      dead: false,
      errored: false,
      videoId,
      labelEl: tileEl.querySelector(".label"),
      muteBtn: tileEl.querySelector(".mute"),
      player: null,
    };

    tile.player = new YT.Player(`player-${i}`, {
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
        onError: (e) => {
          tile.errored = true;
          tile.el.classList.add("is-error");
          tile.labelEl.textContent = describeError(e.data);
        },
      },
    });

    // Click sul video: lo porta in primo piano
    tileEl.querySelector(".shield").addEventListener("click", () => focusTile(i));

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
    try { t.player.destroy(); } catch (_) { /* pazienza */ }
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
      if (on) {
        t.player.unMute();
        t.player.setVolume(100);
      } else {
        t.player.mute();
      }
    }
    t.muteBtn.textContent = on ? "🔊" : "🔇";
    t.el.classList.toggle("has-audio", on);
  });
}

/* ---------- Layout ---------- */

// Griglia automatica: prova tutte le combinazioni colonne/righe e sceglie quella
// che rende i video più grandi possibile (tutti uguali, tutti visibili senza scorrere).
function layoutGrid() {
  if (state.focusedIndex !== null || !state.tiles.length) return;

  const n = state.tiles.length;
  const W = els.wall.clientWidth - PAD * 2;
  const top = els.wall.offsetTop;
  const H = window.innerHeight - top - PAD * 2;
  if (W <= 0 || H <= 0) return;

  let bestCols = 1;
  let bestW = 0;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const wByWidth = (W - GAP * (cols - 1)) / cols;
    const wByHeight = ((H - GAP * (rows - 1)) / rows) * RATIO;
    const w = Math.min(wByWidth, wByHeight);
    if (w > bestW) {
      bestW = w;
      bestCols = cols;
    }
  }

  let fits = true;
  if (bestW < MIN_W) {
    // Troppi video per stare tutti in una schermata: dimensione minima e pagina scorrevole
    fits = false;
    bestCols = Math.max(1, Math.min(n, Math.floor((W + GAP) / (MIN_W + GAP))));
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
  const ids = [];
  let bad = 0;

  lines.forEach((line) => {
    const id = extractVideoId(line);
    if (id) ids.push(id);
    else bad++;
  });

  if (!ids.length) {
    els.msg.textContent = "Nessun link YouTube valido. Hai incollato la lista della spesa?";
    return;
  }

  els.msg.textContent = bad ? `Ignorati ${bad} link non validi.` : "";

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch (_) {}
  startWall(ids);
});

els.btnGrid.addEventListener("click", showGrid);
els.btnMuteAll.addEventListener("click", () => setAudio(null));
els.btnShare.addEventListener("click", copyShareLink);

els.btnEdit.addEventListener("click", () => {
  // Rimette nelle righe i link attuali (utile anche a chi è arrivato da un link condiviso)
  if (state.ids.length) {
    populateRows(state.ids.map((id) => `https://www.youtube.com/watch?v=${id}`));
  }
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
  const ids = getIdsFromHash();
  if (ids.length && ids.join(",") !== state.ids.join(",")) startWall(ids);
});

/* ---------- Avvio ---------- */

(function init() {
  buildDonateDialog();

  // Ultimi link inseriti a mano su questo browser (più la riga vuota in fondo)
  populateRows(loadSavedLinks());

  // Se l'URL contiene dei video (link condiviso), parte direttamente il muro
  const ids = getIdsFromHash();
  if (ids.length) startWall(ids);
})();
