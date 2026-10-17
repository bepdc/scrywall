"use strict";

const STORAGE_KEY = "palantirtube.links";

const els = {
  setup: document.getElementById("setup"),
  topbar: document.getElementById("topbar"),
  wall: document.getElementById("wall"),
  links: document.getElementById("links"),
  msg: document.getElementById("msg"),
  toast: document.getElementById("toast"),
  btnStart: document.getElementById("btn-start"),
  btnGrid: document.getElementById("btn-grid"),
  btnMuteAll: document.getElementById("btn-mute-all"),
  btnShare: document.getElementById("btn-share"),
  btnEdit: document.getElementById("btn-edit"),
};

const state = {
  ids: [],            // ID dei video attualmente nel muro
  tiles: [],          // { el, player, ready, muteBtn, videoId }
  focusedIndex: null, // null = modalità griglia
  audioIndex: null,   // quale video ha l'audio attivo
};

/* ---------- Utilità ---------- */

const ID_RE = /^[\w-]{11}$/;

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

/* ---------- Costruzione del muro ---------- */

async function startWall(ids) {
  await loadYouTubeApi();

  destroyWall();
  state.ids = ids.slice();

  // L'URL nella barra degli indirizzi diventa già il link da condividere
  history.replaceState(null, "", "#v=" + state.ids.join(","));

  ids.forEach((videoId, i) => {
    const tileEl = document.createElement("div");
    tileEl.className = "tile";
    tileEl.innerHTML = `
      <div id="player-${i}"></div>
      <div class="shield"></div>
      <div class="bar">
        <span class="label">CAM ${String(i + 1).padStart(2, "0")}</span>
        <button class="mute" type="button" title="Attiva/disattiva audio">🔇</button>
      </div>
    `;
    els.wall.appendChild(tileEl);

    const tile = {
      el: tileEl,
      ready: false,
      videoId,
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

  els.setup.classList.add("hidden");
  els.topbar.classList.remove("hidden");
  els.wall.classList.remove("hidden");
  showGrid();
}

function destroyWall() {
  state.tiles.forEach((t) => {
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

function focusTile(index) {
  state.focusedIndex = index;
  els.wall.classList.add("focus");
  els.wall.style.setProperty("--side-count", Math.max(state.tiles.length - 1, 1));
  state.tiles.forEach((t, i) => t.el.classList.toggle("focused", i === index));
  window.scrollTo({ top: 0 });
}

function showGrid() {
  state.focusedIndex = null;
  els.wall.classList.remove("focus");
  els.wall.style.removeProperty("--side-count");
  state.tiles.forEach((t) => t.el.classList.remove("focused"));
}

/* ---------- Eventi UI ---------- */

els.btnStart.addEventListener("click", () => {
  const lines = els.links.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ids = [];
  const bad = [];

  lines.forEach((line) => {
    const id = extractVideoId(line);
    if (id) ids.push(id);
    else bad.push(line);
  });

  if (!ids.length) {
    els.msg.textContent = "Nessun link YouTube valido. Hai incollato la lista della spesa?";
    return;
  }

  els.msg.textContent = bad.length
    ? `Ignorati ${bad.length} link non validi.`
    : "";

  try { localStorage.setItem(STORAGE_KEY, els.links.value); } catch (_) {}
  startWall(ids);
});

els.btnGrid.addEventListener("click", showGrid);
els.btnMuteAll.addEventListener("click", () => setAudio(null));
els.btnShare.addEventListener("click", copyShareLink);

els.btnEdit.addEventListener("click", () => {
  // Rimette nel box i link attuali (utile anche a chi è arrivato da un link condiviso)
  if (state.ids.length) {
    els.links.value = state.ids
      .map((id) => `https://www.youtube.com/watch?v=${id}`)
      .join("\n");
  }
  destroyWall();
  els.topbar.classList.add("hidden");
  els.wall.classList.add("hidden");
  els.setup.classList.remove("hidden");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.focusedIndex !== null) showGrid();
});

// Se qualcuno incolla un altro link con hash mentre la pagina è già aperta
window.addEventListener("hashchange", () => {
  const ids = getIdsFromHash();
  if (ids.length && ids.join(",") !== state.ids.join(",")) startWall(ids);
});

/* ---------- Avvio ---------- */

(function init() {
  // Ultimi link inseriti a mano su questo browser
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) els.links.value = saved;
  } catch (_) {}

  // Se l'URL contiene dei video (link condiviso), parte direttamente il muro
  const ids = getIdsFromHash();
  if (ids.length) startWall(ids);
})();
