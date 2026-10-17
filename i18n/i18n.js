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

/* ---------- Selettore lingua ---------- */

const selectEls = [];

function populateSelectors() {
  selectEls.forEach((select) => {
    select.innerHTML = "";
    LANGUAGES.forEach(({ code, name }) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = name;
      select.appendChild(opt);
    });
    // Se la lingua attiva è "pseudo" (solo via ?lang=pseudo) il selettore
    // non ha quell'opzione: mostriamo semplicemente nessuna selezione coerente.
    select.value = LANGUAGES.some((l) => l.code === currentLang) ? currentLang : "";
    select.addEventListener("change", () => setLanguage(select.value));
  });
}

export function registerLanguageSelect(select) {
  if (!select || selectEls.includes(select)) return;
  selectEls.push(select);
  populateSelectors();
}

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
