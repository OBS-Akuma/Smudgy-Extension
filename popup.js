// popup.js — Smudgy Client extension popup

const statusDot  = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const badgeCount = document.getElementById("badge-count");

// ─── Element refs ─────────────────────────────────────────────────────────────

const toggleBadges          = document.getElementById("toggle-badges");
const toggleGradients       = document.getElementById("toggle-gradients");
const toggleAnimations      = document.getElementById("toggle-animations");
const toggleServerMaps      = document.getElementById("toggle-server-maps");
const toggleDefaultCSS      = document.getElementById("toggle-default-css");
const toggleUIAnimations    = document.getElementById("toggle-ui-animations");
const toggleRaveMode        = document.getElementById("toggle-rave-mode");
const toggleHideChat        = document.getElementById("toggle-hide-chat");
const toggleHideInterface   = document.getElementById("toggle-hide-interface");
const toggleSkipLoading     = document.getElementById("toggle-skip-loading");
const toggleLobbyKeybind    = document.getElementById("toggle-lobby-keybind");
const toggleSpectateButton  = document.getElementById("toggle-spectate-button");

const btnRefresh        = document.getElementById("btn-refresh");
const btnClear          = document.getElementById("btn-clear");

const rawCssInput       = document.getElementById("raw-css");
const cssLinkInput      = document.getElementById("css-link");
const applyRawCssBtn    = document.getElementById("apply-raw-css");
const clearRawCssBtn    = document.getElementById("clear-raw-css");
const applyCssLinkBtn   = document.getElementById("apply-css-link");
const removeCssLinkBtn  = document.getElementById("remove-css-link");

const hitmarkerLinkInput = document.getElementById("hitmarker-link");
const applyHitmarkerBtn  = document.getElementById("apply-hitmarker");
const killiconLinkInput  = document.getElementById("killicon-link");
const applyKilliconBtn   = document.getElementById("apply-killicon");

// ─── Load settings from storage ───────────────────────────────────────────────

chrome.storage.local.get([
  "kb_badges",
  "kb_gradients",
  "kb_animations",
  "kb_server_maps",
  "kb_default_css",
  "kb_ui_animations",
  "kb_rave_mode",
  "kb_hide_chat",
  "kb_hide_interface",
  "kb_skip_loading",
  "kb_lobby_keybind_reminder",
  "kb_spectate_button",
  "kb_hitmarker_link",
  "kb_killicon_link",
  "kb_badge_count",
  "kb_last_fetch",
  "kb_raw_css",
  "kb_css_link"
], (result) => {
  toggleBadges.checked         = result.kb_badges         !== false;
  toggleGradients.checked      = result.kb_gradients      !== false;
  toggleAnimations.checked     = result.kb_animations     !== false;

  if (toggleServerMaps)     toggleServerMaps.checked     = result.kb_server_maps           !== false;
  if (toggleDefaultCSS)     toggleDefaultCSS.checked     = result.kb_default_css           !== false;
  if (toggleUIAnimations)   toggleUIAnimations.checked   = result.kb_ui_animations         !== false;
  if (toggleRaveMode)       toggleRaveMode.checked       = result.kb_rave_mode             === true;
  if (toggleHideChat)       toggleHideChat.checked       = result.kb_hide_chat             === true;
  if (toggleHideInterface)  toggleHideInterface.checked  = result.kb_hide_interface        === true;
  if (toggleSkipLoading)    toggleSkipLoading.checked    = result.kb_skip_loading          === true;
  if (toggleLobbyKeybind)   toggleLobbyKeybind.checked   = result.kb_lobby_keybind_reminder !== false;
  if (toggleSpectateButton) toggleSpectateButton.checked = result.kb_spectate_button       !== false;

  if (result.kb_raw_css)         rawCssInput.value        = result.kb_raw_css;
  if (result.kb_css_link)        cssLinkInput.value       = result.kb_css_link;
  if (result.kb_hitmarker_link)  hitmarkerLinkInput.value = result.kb_hitmarker_link;
  if (result.kb_killicon_link)   killiconLinkInput.value  = result.kb_killicon_link;

  const count = result.kb_badge_count;
  if (count !== undefined) {
    badgeCount.textContent = count;
    badgeCount.style.display = "inline-flex";
    setStatus("active", `Loaded ${count} badge profiles`);
  } else {
    setStatus("loading", "No data cached yet");
  }

  if (result.kb_last_fetch && count !== undefined) {
    const ago = Math.round((Date.now() - result.kb_last_fetch) / 60000);
    setStatus("active", `${count} profiles · updated ${ago < 1 ? "just now" : ago + "m ago"}`);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(state, text) {
  statusDot.className = "status-dot" + (state === "loading" ? " loading" : state === "error" ? " error" : "");
  statusText.textContent = text;
}

function saveSetting(key, value) {
  chrome.storage.local.set({ [key]: value });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url?.startsWith("https://kirka.io")) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "setting_changed", key, value }).catch(() => {});
    }
  });
}

function sendMessage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url?.startsWith("https://kirka.io")) {
      chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => {});
    }
  });
}

// ─── Toggle listeners ────────────────────────────────────────────────────────

toggleBadges.addEventListener("change",      () => saveSetting("kb_badges",      toggleBadges.checked));
toggleGradients.addEventListener("change",   () => saveSetting("kb_gradients",   toggleGradients.checked));
toggleAnimations.addEventListener("change",  () => saveSetting("kb_animations",  toggleAnimations.checked));

if (toggleServerMaps)
  toggleServerMaps.addEventListener("change",     () => saveSetting("kb_server_maps",            toggleServerMaps.checked));
if (toggleDefaultCSS)
  toggleDefaultCSS.addEventListener("change",     () => saveSetting("kb_default_css",            toggleDefaultCSS.checked));
if (toggleUIAnimations)
  toggleUIAnimations.addEventListener("change",   () => saveSetting("kb_ui_animations",          toggleUIAnimations.checked));
if (toggleRaveMode)
  toggleRaveMode.addEventListener("change",       () => saveSetting("kb_rave_mode",              toggleRaveMode.checked));
if (toggleHideChat)
  toggleHideChat.addEventListener("change",       () => saveSetting("kb_hide_chat",              toggleHideChat.checked));
if (toggleHideInterface)
  toggleHideInterface.addEventListener("change",  () => saveSetting("kb_hide_interface",         toggleHideInterface.checked));
if (toggleSkipLoading)
  toggleSkipLoading.addEventListener("change",    () => saveSetting("kb_skip_loading",           toggleSkipLoading.checked));
if (toggleLobbyKeybind)
  toggleLobbyKeybind.addEventListener("change",   () => saveSetting("kb_lobby_keybind_reminder", toggleLobbyKeybind.checked));
if (toggleSpectateButton)
  toggleSpectateButton.addEventListener("change", () => saveSetting("kb_spectate_button",        toggleSpectateButton.checked));

// ─── Hitmarker & Killicon ────────────────────────────────────────────────────

if (applyHitmarkerBtn) {
  applyHitmarkerBtn.addEventListener("click", () => {
    const link = hitmarkerLinkInput.value.trim();
    saveSetting("kb_hitmarker_link", link);
    setStatus("active", link ? "Hitmarker applied" : "Hitmarker cleared");
  });
}

if (applyKilliconBtn) {
  applyKilliconBtn.addEventListener("click", () => {
    const link = killiconLinkInput.value.trim();
    saveSetting("kb_killicon_link", link);
    setStatus("active", link ? "Killicon applied" : "Killicon cleared");
  });
}

// ─── Refresh badge data ──────────────────────────────────────────────────────

btnRefresh.addEventListener("click", () => {
  setStatus("loading", "Fetching badge data...");
  btnRefresh.disabled = true;
  btnRefresh.textContent = "FETCHING...";

  fetch("https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/badge.json")
    .then(r => r.json())
    .then(data => {
      const count = data.length;
      chrome.storage.local.set({ kb_badge_count: count, kb_last_fetch: Date.now() });
      badgeCount.textContent = count;
      badgeCount.style.display = "inline-flex";
      setStatus("active", `Refreshed — ${count} profiles loaded`);
      sendMessage({ type: "refresh" });
    })
    .catch(() => {
      setStatus("error", "Failed to fetch — check connection");
    })
    .finally(() => {
      btnRefresh.disabled = false;
      btnRefresh.textContent = "↻ REFRESH BADGE DATA";
    });
});

// ─── Clear cache ──────────────────────────────────────────────────────────────

btnClear.addEventListener("click", () => {
  chrome.storage.local.remove(["kb_badge_count", "kb_last_fetch"]);
  badgeCount.style.display = "none";
  setStatus("loading", "Cache cleared");
});

// ─── News toggles ─────────────────────────────────────────────────────────────

const newsToggles = {
  "toggle-news-general":     "kb_news_general",
  "toggle-news-event":       "kb_news_event",
  "toggle-news-promotional": "kb_news_promotional",
  "toggle-news-alert":       "kb_news_alert",
};

chrome.storage.local.get(Object.values(newsToggles), (result) => {
  Object.entries(newsToggles).forEach(([elemId, storageKey]) => {
    const el = document.getElementById(elemId);
    if (el) el.checked = result[storageKey] !== false;
  });
});

Object.entries(newsToggles).forEach(([elemId, storageKey]) => {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.addEventListener("change", () => {
    chrome.storage.local.set({ [storageKey]: el.checked });
    sendMessage({ type: "news_settings_changed" });
  });
});

// ─── Custom CSS ───────────────────────────────────────────────────────────────

applyRawCssBtn.addEventListener("click", () => {
  const css = rawCssInput.value;
  chrome.storage.local.set({ kb_raw_css: css });
  sendMessage({ type: "apply_raw_css", css });
  setStatus("active", "Raw CSS applied");
});

clearRawCssBtn.addEventListener("click", () => {
  rawCssInput.value = "";
  chrome.storage.local.remove("kb_raw_css");
  sendMessage({ type: "clear_raw_css" });
  setStatus("active", "Raw CSS cleared");
});

applyCssLinkBtn.addEventListener("click", () => {
  const link = cssLinkInput.value.trim();
  if (!link) { setStatus("error", "Please enter a CSS URL"); return; }
  chrome.storage.local.set({ kb_css_link: link });
  sendMessage({ type: "apply_css_link", link });
  setStatus("active", "CSS link applied");
});

removeCssLinkBtn.addEventListener("click", () => {
  cssLinkInput.value = "";
  chrome.storage.local.remove("kb_css_link");
  sendMessage({ type: "remove_css_link" });
  setStatus("active", "CSS link removed");
});