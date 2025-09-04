import { load as yamlLoad } from 'js-yaml';

const listeners = new Set();
let catalogs = null; // { en: {...}, ja: {...} }
// Minimal built-in EN fallback so tests and offline builds still render
// essential labels when network fetch is unavailable (e.g., JSDOM).
const FALLBACK_CATALOGS = {
  en: {
    app: { title: 'Sheet-to-JSON Mapper' },
    controls: {
      confirm_next: 'Confirm & Next',
      undo: 'Undo',
      show_merged_shadow: 'Show shadow text in merged cells'
    },
    dialogs: { ok: 'OK', dismiss: 'Dismiss' },
    errors: {
      load_schema_title: 'Failed to load schema',
      load_schema_message: 'Unable to fetch the schema URL.',
      confirm_title: 'Confirm failed',
      confirm_message: 'Unable to confirm the current mapping.',
      undo_title: 'Undo failed',
      undo_message: 'Unable to undo the last action.',
      update_failed_title: 'Update failed',
      update_failed_message: 'Unable to update the setting.'
    }
  },
  ja: {}
};

// In non-browser/test environments without fetch, prime fallback catalogs
try { if (typeof fetch === 'undefined') catalogs = FALLBACK_CATALOGS; } catch (_) {}
let locale = 'en';

function getLocale() {
  return locale;
}

function onChange(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emitChange() {
  listeners.forEach((cb) => {
    try { cb(locale); } catch (_) { /* ignore */ }
  });
  try {
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { locale } }));
  } catch (_) { /* ignore */ }
}

function detectLocale() {
  try {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('lang') || '').toLowerCase();
    if (q === 'ja' || q === 'en') return q;
  } catch (_) { /* ignore */ }
  try {
    const nav = (navigator && navigator.language) || '';
    if (/^ja/i.test(nav)) return 'ja';
  } catch (_) { /* ignore */ }
  return 'en';
}

async function fetchYaml(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('YAML fetch failed: ' + res.status);
  const text = await res.text();
  return yamlLoad(text) || {};
}

function setDeep(obj, path, val) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
}

function normalize(raw) {
  // Detect key-centric: top-level values are objects with en/ja
  const topKeys = Object.keys(raw || {});
  const looksKeyCentric = topKeys.every((k) => {
    const v = raw[k];
    return v && typeof v === 'object' && ('en' in v || 'ja' in v);
  });
  if (!looksKeyCentric) {
    // Assume locale-centric { en: {...}, ja: {...} }
    return raw || {};
  }
  const result = { en: {}, ja: {} };
  topKeys.forEach((k) => {
    const entry = raw[k] || {};
    if (entry.en != null) setDeep(result.en, k, entry.en);
    if (entry.ja != null) setDeep(result.ja, k, entry.ja);
  });
  return result;
}

async function loadCatalogs() {
  // Try relative to current page first (works under subpaths),
  // then absolute root, then dev path.
  const tries = [
    'i18n/messages.yaml',
    '/i18n/messages.yaml',
    'src/i18n/messages.yaml'
  ];
  let lastErr;
  for (const url of tries) {
    try {
      const raw = await fetchYaml(url);
      return normalize(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to load i18n catalog');
}

function getDict() {
  if (!catalogs) return {};
  return catalogs[locale] || catalogs.en || {};
}

function lookup(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function interpolate(str, params) {
  if (!params) return String(str);
  return String(str).replace(/\{([^}]+)\}/g, (_, key) => {
    const val = params[key];
    if (val == null) return '';
    // Ensure only plain text is produced
    return String(val);
  });
}

function t(key, params) {
  const dict = getDict();
  let val = lookup(dict, key);
  if (val == null && catalogs && catalogs.en) {
    val = lookup(catalogs.en, key);
  }
  if (val == null) return `[${key}]`;
  return interpolate(val, params);
}

async function setLocale(next) {
  const norm = next === 'ja' ? 'ja' : 'en';
  if (norm === locale) return;
  locale = norm;
  try {
    document.documentElement.lang = norm;
  } catch (_) { /* ignore */ }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', norm);
    window.history.replaceState({}, '', url.toString());
  } catch (_) { /* ignore */ }
  emitChange();
}

async function init() {
  try {
    catalogs = await loadCatalogs();
  } catch (err) {
    // Fallback gracefully in non-browser/test environments without fetch
    catalogs = FALLBACK_CATALOGS;
    try { console.warn('i18n: using fallback catalogs', err); } catch (_) {}
  }
  locale = detectLocale();
  try { document.documentElement.lang = locale; } catch (_) { /* ignore */ }
  emitChange();
}

export const i18n = { init, t, setLocale, getLocale, onChange };
export { t, setLocale, getLocale, onChange };
