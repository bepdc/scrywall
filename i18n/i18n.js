"use strict";

/* =====================================================================
   i18n.js — caricamento dizionari, scelta lingua, t(), plurali, formati,
   applicazione al DOM (data-i18n / data-i18n-attr), selettore lingua.
   Nessuna dipendenza esterna, nessun passaggio di build.
   ===================================================================== */

// Lingue selezionabili dall'utente (nome nativo). "pseudo" NON è qui:
// resta accessibile solo esplicitamente via ?lang=pseudo (vedi requisito).
export const LANGUAGES = [
  { code: "it", name: "Italiano" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
];

// Bandierine come SVG inline (nessuna immagine esterna, nessun font emoji:
// su Windows i glifi bandiera non vengono renderizzati come immagini).
const FLAGS = {
  it: `<svg class="flag" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="16" fill="#fff"/><rect width="8" height="16" fill="#009246"/><rect x="16" width="8" height="16" fill="#ce2b37"/></svg>`,
  en: `<svg class="flag" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="16" fill="#00247d"/><polygon points="0,0 2.4,0 24,14 24,16 21.6,16 0,2" fill="#fff"/><polygon points="24,0 21.6,0 0,14 0,16 2.4,16 24,2" fill="#fff"/><polygon points="0,0 1.2,0 24,15 24,16 22.8,16 0,1" fill="#cf142b"/><polygon points="24,0 22.8,0 0,15 0,16 1.2,16 24,1" fill="#cf142b"/><rect x="9.6" width="4.8" height="16" fill="#fff"/><rect y="5.6" width="24" height="4.8" fill="#fff"/><rect x="10.8" width="2.4" height="16" fill="#cf142b"/><rect y="6.8" width="24" height="2.4" fill="#cf142b"/></svg>`,
  es: `<svg class="flag" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="16" fill="#aa151b"/><rect y="4" width="24" height="8" fill="#f1bf00"/></svg>`,
  "pt-BR": `<svg class="flag" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="16" fill="#009739"/><polygon points="12,1.5 22,8 12,14.5 2,8" fill="#fedd00"/><circle cx="12" cy="8" r="4.2" fill="#002776"/></svg>`,
  de: `<svg class="flag" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="16" fill="#ffce00"/><rect width="24" height="5.33" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#d00"/></svg>`,
  fr: `<svg class="flag" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="16" fill="#fff"/><rect width="8" height="16" fill="#0055a4"/><rect x="16" width="8" height="16" fill="#ef4135"/></svg>`,
};

const SUPPORTED_CODES = [...LANGUAGES.map((l) => l.code), "pseudo"];
const FALLBACK_LANG = "en";
const STORAGE_KEY = "scrywall.lang";

// Locale BCP-47 usato per Intl.NumberFormat/Intl.PluralRules per ciascuna lingua.
const INTL_LOCALE = {
  it: "it-IT",
  en: "en-US",
  es: "es-ES",
  "pt-BR": "pt-BR",
  de: "de-DE",
  fr: "fr-FR",
  pseudo: "en-US",
};

let currentLang = FALLBACK_LANG;
let currentDict = {};
let fallbackDict = {};

/* ---------- Risoluzione della lingua iniziale ---------- */

function matchSupported(tag) {
  if (!tag) return null;
  const low = tag.toLowerCase();
  const exact = SUPPORTED_CODES.find((c) => c.toLowerCase() === low);
  if (exact) return exact;
  const primary = low.split("-")[0];
  const byPrimary = SUPPORTED_CODES.find((c) => c.toLowerCase().split("-")[0] === primary);
  return byPrimary || null;
}

function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const m = matchSupported(saved);
    if (m) return m;
  } catch (_) { /* localStorage non disponibile */ }

  const params = new URLSearchParams(location.search);
  const fromQuery = matchSupported(params.get("lang"));
  if (fromQuery) return fromQuery;

  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const tag of langs) {
    const m = matchSupported(tag);
    // Il browser non deve mai far scattare la lingua finta "pseudo"
    if (m && m !== "pseudo") return m;
  }
  return FALLBACK_LANG;
}

/* ---------- Caricamento dizionari ---------- */

async function fetchDict(code) {
  const url = new URL(`./${code}.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`i18n: HTTP ${res.status} per ${code}.json`);
  return res.json();
}

/* ---------- Lookup e sostituzione placeholder ---------- */

function lookup(dict, key) {
  return key.split(".").reduce((o, part) => (o && typeof o === "object" ? o[part] : undefined), dict);
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (full, name) => (name in params ? String(params[name]) : full));
}

export function t(key, params) {
  let value = lookup(currentDict, key);
  if (value === undefined) value = lookup(fallbackDict, key);
  if (value === undefined) {
    console.warn(`i18n: chiave mancante "${key}"`);
    return "";
  }

  if (value && typeof value === "object") {
    const locale = INTL_LOCALE[currentLang] || INTL_LOCALE[FALLBACK_LANG];
    const n = params && typeof params.n === "number" ? params.n : 0;
    const category = new Intl.PluralRules(locale).select(n);
    value = value[category] ?? value.other ?? "";
  }

  return interpolate(String(value), params);
}

export function getLanguage() {
  return currentLang;
}

export function getLocale() {
  return INTL_LOCALE[currentLang] || INTL_LOCALE[FALLBACK_LANG];
}

export function formatNumber(n) {
  return new Intl.NumberFormat(getLocale()).format(n);
}

export function formatMoney(amount, currency) {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function currencySymbol(currency) {
  const parts = new Intl.NumberFormat(getLocale(), { style: "currency", currency }).formatToParts(0);
  const cur = parts.find((p) => p.type === "currency");
  return cur ? cur.value : currency;
}

/* ---------- Applicazione al DOM ---------- */

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });

  if (root === document || root.nodeType === 9) {
    document.documentElement.setAttribute("lang", currentLang === "pseudo" ? "en" : currentLang);
    document.documentElement.setAttribute("dir", "ltr");
  }
}

/* ---------- Selettore lingua (bandiera + nome nativo) ---------- */

const switches = []; // { container, trigger, list, open }

function setSwitchOpen(s, open) {
  s.open = open;
  s.list.hidden = !open;
  s.trigger.setAttribute("aria-expanded", String(open));
}

function closeAllSwitches() {
  switches.forEach((s) => setSwitchOpen(s, false));
}

function renderSwitch(s) {
  const label = t("common.languageLabel");
  s.trigger.setAttribute("aria-label", label);
  s.trigger.innerHTML = `${FLAGS[currentLang] || ""}<span class="lang-switch-code">${
    currentLang === "pseudo" ? "pseudo" : currentLang.toUpperCase()
  }</span>`;

  s.list.innerHTML = "";
  LANGUAGES.forEach(({ code, name }) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(code === currentLang));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-switch-option";
    btn.innerHTML = `${FLAGS[code] || ""}<span>${name}</span>`;
    btn.addEventListener("click", () => {
      setSwitchOpen(s, false);
      if (code !== currentLang) setLanguage(code);
    });

    li.appendChild(btn);
    s.list.appendChild(li);
  });
}

function populateSelectors() {
  switches.forEach(renderSwitch);
}

export function registerLanguageSwitch(container) {
  if (!container || switches.some((s) => s.container === container)) return;

  container.innerHTML = "";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "lang-switch-btn";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const list = document.createElement("ul");
  list.className = "lang-switch-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  container.append(trigger, list);

  const s = { container, trigger, list, open: false };
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !s.open;
    closeAllSwitches();
    setSwitchOpen(s, willOpen);
  });

  switches.push(s);
  renderSwitch(s);
}

document.addEventListener("click", closeAllSwitches);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllSwitches();
});

/* ---------- Cambio lingua ---------- */

export async function setLanguage(code) {
  const resolved = matchSupported(code) || FALLBACK_LANG;
  currentLang = resolved;
  try { localStorage.setItem(STORAGE_KEY, resolved); } catch (_) { /* ignorato */ }

  try {
    currentDict = resolved === FALLBACK_LANG ? fallbackDict : await fetchDict(resolved);
  } catch (err) {
    console.warn(`i18n: impossibile caricare "${resolved}.json", resto sul fallback`, err);
    currentDict = {};
  }

  applyTranslations(document);
  populateSelectors();
  document.dispatchEvent(new CustomEvent("scrywall:langchange", { detail: { lang: currentLang } }));
}

/* ---------- Avvio ---------- */

export async function initI18n() {
  try {
    fallbackDict = await fetchDict(FALLBACK_LANG);
  } catch (err) {
    console.warn("i18n: impossibile caricare il dizionario di riserva en.json", err);
    fallbackDict = {};
  }

  const lang = detectLanguage();
  currentLang = lang;
  try {
    currentDict = lang === FALLBACK_LANG ? fallbackDict : await fetchDict(lang);
  } catch (err) {
    console.warn(`i18n: impossibile caricare "${lang}.json", uso l'inglese`, err);
    currentDict = {};
  }

  applyTranslations(document);
  document.documentElement.classList.add("i18n-ready");
}
