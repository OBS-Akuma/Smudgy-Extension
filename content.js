// ═══════════════════════════════════════════════════════════════════════════════
//  Smudgy Client — combined.js
//  Badges page, Discord/Smudgy buttons, player badges/gradients, lobby news,
//  biotext overlay, mentions, custom fonts, chat autocomplete, subnames,
//  friends pin system, spectate buttons, friends search, server maps
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_URL = "https://kirka.io/";

// ─── Shared state ─────────────────────────────────────────────────────────────

let customizations = null;
let currentUser    = null;
let fontData       = null;
let badgesData     = [];
let subnamesData   = null;
let bioTextData    = null;

let injectedDefaultStyleElement = null;
let addedStyles                 = null;
let serverMapInterval           = null;
let gameInterval                = null;
let friendsInterval             = null;

// Badges page guard
let isApplied = false;

// Subnames state
let subnameIsProcessing = false;
let subnameInterval     = null;

// BioText state
let activeBioTextBadgeId  = null;
let isBioTextProcessing   = false;
let bioTextPeriodicInterval = null;

// Mentions state
let myShortId          = null;
let myUsername         = null;
let mentions           = [];
let ws                 = null;
let mentionsTab        = null;
let reconnectAttempts  = 0;
const maxReconnectAttempts = 20;
let inventoryObserver  = null;

// Pin state
let pinnedUsers     = new Set();
let pinnedUsersList = [];

// Chat command state
let cmdChatInput     = null;
let cmdSuggestionBox = null;
let cmdSelectedIndex = -1;

// Font state
const loadedFonts = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function observeForElement(selector, callback, target = document.body) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches(selector)) callback(node);
            node.querySelectorAll(selector).forEach(el => callback(el));
          }
        });
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
}

function getCustomsForId(shortId) {
  if (!customizations || !shortId) return null;
  return customizations.find(c => c.shortId === shortId) || null;
}

function makeSafeImgSrc(src) {
  if (!src) return "";
  if (src.startsWith("/") || /^[A-Za-z]:[\\/]/.test(src)) {
    const fp = src.replace(/\\/g, "/");
    return `file://${fp.startsWith("/") ? "" : "/"}${fp}`;
  }
  return src;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function createBadgesContainer(shortId) {
  const div = document.createElement("div");
  div.style.cssText = "display: flex; gap: 0.25rem; align-items: center;";
  div.className = "kirka-badges";
  div.dataset.shortId = shortId;
  return div;
}

function addBadgeImg(container, src, height = "22px") {
  const safeSrc = makeSafeImgSrc(src);
  if ([...container.children].some(img => img.src === safeSrc)) return;
  const img = document.createElement("img");
  img.src = safeSrc;
  img.style.cssText = `height: ${height}; width: auto;`;
  container.appendChild(img);
}

function populateBadges(container, customs, height = "22px") {
  if (customs.discord) addBadgeImg(container, "https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/linked.webp", height);
  if (customs.booster) addBadgeImg(container, "https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/booster.webp", height);
  if (customs.badges?.length) customs.badges.forEach(badge => addBadgeImg(container, badge, height));
}

function injectFontAwesome() {
  if (document.getElementById("kb-font-awesome")) return;
  const link = document.createElement("link");
  link.id = "kb-font-awesome";
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
  document.head.appendChild(link);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════

function injectStyles() {
  if (document.getElementById("kirka-badges-styles")) return;
  const style = document.createElement("style");
  style.id = "kirka-badges-styles";
  style.textContent = `
    @keyframes kirka-badges-gradient {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .kirka-badges { display: flex; gap: 0.25rem; align-items: center; }
    .kirka-badges img { object-fit: contain; }
  `;
  document.head.appendChild(style);
}

function applyDefaultCSS() {
  if (injectedDefaultStyleElement) { injectedDefaultStyleElement.remove(); injectedDefaultStyleElement = null; }
  const defaultCSS = `
.content>.store>.content>#carousel .slider-container.swiper-container-horizontal .slider-touch .slider-wrapper .slide.slider-item .character-card-cont img {
    transition: transform 0.2s ease, filter 0.1s ease;
}
.content>.store>.content>#carousel .slider-container.swiper-container-horizontal .slider-touch .slider-wrapper .slide.slider-item .character-card-cont .character-card:hover img {
    filter: drop-shadow(0 0 3px white); transform: scale(1.03)
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .text-1.header .v-popover { display: none }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .text-1.header {
    display: flex; justify-content: center; font-family: Omnitrinx;
    text-transform: uppercase; letter-spacing: 3px; position: relative; overflow: hidden;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .text-1.header::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(45deg, #cc0000, #cc0, #cc0000); background-size: 400% 400%;
    animation: headerGradientFlow 8s ease-in-out infinite; filter: blur(10px); z-index: -2;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .text-1.header::after {
    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.49); backdrop-filter: blur(10px); z-index: -1;
}
@keyframes headerGradientFlow {
    0% { background-position: 0% 50%; } 25% { background-position: 100% 0%; }
    50% { background-position: 100% 100%; } 75% { background-position: 0% 100%; }
    100% { background-position: 0% 50%; }
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont { overflow: hidden; border-radius: 0 !important }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.EPIC,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.MYTHICAL {
    width: 100%; display: flex; justify-content: center; align-items: center;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.EPIC:before,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.MYTHICAL::before {
    content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(120deg, transparent, rgba(234, 106, 106, .74), transparent);
    animation: shineSwipe 1.7s infinite; z-index: 0
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.EPIC:before {
    background: linear-gradient(120deg, transparent, rgba(211, 106, 234, .74), transparent);
}
@keyframes shineSwipe { 0% { left: -100%; } 100% { left: 100%; } }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.EPIC:after,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .grad-weapon.MYTHICAL::after {
    content: ""; position: absolute; background: var(--cp-grey); width: 95%; height: 90%
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .name-change {
    font-family: Omnitrinx; letter-spacing: 2px; opacity: 0.6;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .rarity-weapon {
    font-family: Omnitrinx; letter-spacing: 2px; left: 0.55rem; top: 0.4rem;
    background: rgba(0, 0, 0, .7); padding: 2px 6px; font-size: 0.9rem;
    clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont img {
    transition: transform 0.2s ease, filter 0.1s ease; transform: translate(0, -0.5rem)
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont:hover img {
    transform: translate(0, -0.78rem) scale(1.05); filter: drop-shadow(0 0 2px white);
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .weapon-skin {
    font-family: Omnitrinx; letter-spacing: 2px; background: rgba(0, 0, 0, .7);
    padding: 2px 6px; font-size: 0.94rem;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 15% 100%, 0 70%); right: 0.5rem;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont:hover .weapon-skin { display: none }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .weapon-price svg { display: none }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .weapon-price {
    font-family: Belikan; font-size: 1.25rem; right: 0.5rem; top: 0.3rem; height: fit-content;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 15% 100%, 0 70%); letter-spacing: 2px;
    background: rgba(0, 0, 0, .7); padding: 2px 17px 2px 6px; display: none;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .weapon-price::after {
    content: ""; width: 10px; height: 10px; background: var(--cp-blue); transform: rotate(45deg);
    position: absolute; bottom: 0.65rem; right: 0.3rem;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont:hover .weapon-price { display: block }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body .hover,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .skin {
    background: #fff0 !important; flex-direction: row; gap: 0rem; height: fit-content;
    bottom: 0.5rem !important; position: absolute !important; top: unset; padding: 0 0.6rem;
    transform: translateY(10rem); transition: transform 0.2s ease; display: flex;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body:hover .hover,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont:hover .skin { transform: translateY(0); }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body .button.buy-btn,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body .button.inspect-btn,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .skin .button.buy-skin-weapon,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .skin .button.inspect-skin-weapon {
    width: 100%; height: 2rem; background: rgba(0, 0, 0, .51) !important;
    backdrop-filter: blur(8px); font-family: Belikan; letter-spacing: 2px;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body .button.buy-btn:hover,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .skin .button.buy-skin-weapon:hover { background: var(--cp-yellow2) !important }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body .button.inspect-btn:hover,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .weapons-cont .weapon-cont .skin .button.inspect-skin-weapon:hover { background: var(--cp-blue2) !important }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY {
    border-radius: 0; position: relative; overflow: hidden; transition: all 0.3s ease-in-out;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL {
    background: linear-gradient(135deg, #330000, #660000, #cc0000, #ff4444, #cc0000, #660000);
    background-size: 400% 400%; animation: mythicalGlow 4s ease-in-out infinite;
    border: 6px solid #c5061e; box-shadow: 0 0 20px rgba(204, 0, 0, 0.5);
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY {
    background: linear-gradient(135deg, #946f00, #c79f00, #baba00, #c79f00, #ba8c00, #946300);
    background-size: 400% 400%; animation: legendaryGlow 3s ease-in-out infinite;
    border: 6px solid #ffb72d; box-shadow: 0 0 20px rgba(255, 204, 0, 0.5);
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL:hover {
    transform: scale(1.02); box-shadow: 0 0 30px rgba(204, 0, 0, 0.8); animation-duration: 2s;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY:hover {
    transform: scale(1.02); box-shadow: 0 0 30px rgba(255, 204, 0, 0.8); animation-duration: 1.5s;
}
@keyframes mythicalGlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes legendaryGlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY .name-body,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL .name-body {
    width: 100%; height: 2.1rem; left: 0; bottom: 0; font-family: Omnitrinx; letter-spacing: 2px;
    text-shadow: -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black;
    font-size: 1.75rem; background: rgba(0, 0, 0, .46);
    clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%); backdrop-filter: blur(2px); transition: all 0.3s ease;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .rarity-body {
    width: 100%; left: 0; top: 0; font-family: Omnitrinx; letter-spacing: 2px;
    text-shadow: -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black;
    font-size: 1.5rem; background: rgba(0, 0, 0, .46);
    clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%); backdrop-filter: blur(2px); transition: all 0.3s ease; height: 2rem;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .price {
    display: none; width: 100%; left: 0; top: 0; font-family: Omnitrinx; letter-spacing: 2px;
    text-shadow: -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black;
    background: rgba(0, 0, 0, .46); clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%);
    backdrop-filter: blur(2px); transition: all 0.3s ease; height: 2rem;
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .price svg { display: none }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .price .price-value { font-size: 1.3rem; }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .price .price-value::after {
    content: ""; width: 10px; height: 10px; background: var(--cp-blue);
    transform: rotate(45deg) translate(-56%, -60%); top: 56%; left: 60%; position: absolute
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY:hover .name-body,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL:hover .name-body,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL:hover .rarity-body,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY:hover .rarity-body { display: none }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL:hover img,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY:hover img {
    transform: translate(0, -0.78rem) scale(1.05); filter: drop-shadow(0 0 4px #000);
}
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.MYTHICAL:hover .price,
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body.LEGENDARY:hover .price { display: flex; justify-content: center; }
.content>.store>.content>#carouselBundles .slider-wrapper .bundle .skin-body .hover { background: #f000 }
.nickname { display: flex !important; align-items: center !important; flex-wrap: nowrap !important; white-space: nowrap !important; overflow: visible !important; }
.kirka-nickname-span { white-space: nowrap !important; display: inline-block !important; }
.kirka-badges { display: inline-flex !important; flex-shrink: 0 !important; white-space: nowrap !important; }
.head-right { white-space: nowrap !important; }
.you-head { flex-wrap: nowrap !important; }
.left-icons, .left-interface, .right-interface, .play-content, .logo, .team-section, .invite-right, .invite-left1, .invite-left2, .invite-btn { zoom: 0.70; }
.left-icons { height: 1430px !important; }
.soc-group:has(.svg-icon--__gamepad__) {
    background: linear-gradient(135deg, #1A8E50 0%, #2aae60 50%, #0e6e3a 100%) !important;
    border: none !important; box-shadow: 0 4px 15px rgba(26, 142, 80, 0.3) !important; transition: all 0.3s ease !important;
}
.weapon-skin .rar-skin, .body-skin .rar-skin, .chest .rar-skin {
    position: absolute; bottom: 0; left: 0; right: 0; top: unset; height: 4px; width: 100%;
}
.weapon-skin .subj-img, .body-skin .subj-img, .chest .subj-img { transition: transform 0.3s ease; }
.weapon-skin:hover .subj-img, .body-skin:hover .subj-img, .chest:hover .subj-img { transform: rotate(20deg); }
.weapon-skin .item-name, .body-skin .item-name, .chest .item-name { position: absolute; bottom: 8px; left: 8px; top: unset; right: unset; }
.weapon-skin, .body-skin, .chest { position: relative; overflow: hidden; }
.hover-btns-group {
    display: flex !important; justify-content: center !important; align-items: center !important;
    position: absolute !important; inset: 0 !important;
}
.chest .hover-btns-group { flex-direction: row !important; gap: 8px !important; }
.weapon-skin .hover-btns-group, .body-skin .hover-btns-group {
    display: grid !important; grid-template-columns: 1fr 1fr !important;
    grid-template-rows: 1fr 1fr !important; position: absolute !important; inset: 0 !important;
}
.take-btn { grid-column: 1 !important; grid-row: 1 !important; }
.market-btn { grid-column: 2 !important; grid-row: 1 !important; }
.sell-btn { grid-column: 1 !important; grid-row: 2 !important; }
.inspect-btn { grid-column: 2 !important; grid-row: 2 !important; }
.servers { width: 90vw !important; height: 80vh !important; max-height: unset !important; max-width: unset !important; }
.menu { width: 90vw !important; height: 80vh !important; max-height: unset !important; max-width: unset !important; }
.daily-rewards-btn, .special-message-home { display: none !important; }
  `;
  injectedDefaultStyleElement = document.createElement("style");
  injectedDefaultStyleElement.id = "kirka-default-css";
  injectedDefaultStyleElement.textContent = defaultCSS;
  document.head.appendChild(injectedDefaultStyleElement);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchData() {
  try {
    const token = localStorage.getItem("token");
    const [badgeData, userData] = await Promise.all([
      fetch("https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/badge.json").then(r => r.json()),
      token ? fetch("https://api2.kirka.io/api/wNmwWMn/wWWnwmM", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()) : Promise.resolve(null)
    ]);
    customizations = badgeData;
    badgesData = badgeData;
    if (!fontData) fontData = badgeData;
    currentUser = userData?.statusCode === 401 ? null : userData;
    localStorage.setItem("juice-customizations", JSON.stringify(customizations));
    if (currentUser) localStorage.setItem("current-user", JSON.stringify(currentUser));
  } catch (err) {
    const stored = localStorage.getItem("juice-customizations");
    if (stored) { customizations = JSON.parse(stored); badgesData = customizations; if (!fontData) fontData = customizations; }
    const storedUser = localStorage.getItem("current-user");
    if (storedUser) currentUser = JSON.parse(storedUser);
  }
}

async function fetchBioTextData() {
  try {
    const r = await fetch("https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/biotext.json");
    if (!r.ok) throw new Error();
    bioTextData = await r.json();
    return true;
  } catch { return false; }
}

async function fetchSubnamesData() {
  try {
    const r = await fetch("https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/subnames.json");
    if (!r.ok) throw new Error();
    subnamesData = await r.json();
    return true;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CUSTOM FONT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

async function loadUserFont(shortId, fontUrl) {
  if (loadedFonts.has(shortId)) return loadedFonts.get(shortId);
  const fontFamily = `custom-font-${shortId.toLowerCase()}`;
  if (document.querySelector(`style[data-font-user="${shortId}"]`)) { loadedFonts.set(shortId, fontFamily); return fontFamily; }
  const style = document.createElement("style");
  style.setAttribute("data-font-user", shortId);
  if (fontUrl.includes("fonts.googleapis.com/css")) {
    try {
      const css = await fetch(fontUrl).then(r => r.text());
      style.textContent = css.replace(/font-family: ['"]([^'"]+)['"]/g, `font-family: '${fontFamily}'`);
    } catch { return null; }
  } else {
    let format = "truetype";
    if (fontUrl.endsWith(".woff2")) format = "woff2";
    else if (fontUrl.endsWith(".woff")) format = "woff";
    else if (fontUrl.endsWith(".otf")) format = "opentype";
    style.textContent = `@font-face { font-family: '${fontFamily}'; src: url('${fontUrl}') format('${format}'); font-weight: normal; font-style: normal; font-display: swap; }`;
  }
  document.head.appendChild(style);
  loadedFonts.set(shortId, fontFamily);
  return fontFamily;
}

function applyFontToElement(element, shortId) {
  if (!fontData || !shortId) return;
  const userData = fontData.find(u => u.shortId === shortId);
  if (!userData?.font) return;
  loadUserFont(shortId, userData.font).then(fontFamily => {
    if (!fontFamily || element.dataset.customFontApplied === shortId) return;
    element.style.fontFamily = `'${fontFamily}', 'Belikan', 'Omnitrinx', sans-serif`;
    element.style.display = "inline-block";
    element.style.transform = "scaleY(0.85)";
    element.style.transformOrigin = "center center";
    element.dataset.customFontApplied = shortId;
  });
}

function applyAllFonts() {
  if (!fontData) return;
  // Lobby
  const avatarEl = document.querySelector(".avatar-info .username");
  const shortIdCard = avatarEl?.textContent.trim().split("#")[1] || null;
  if (shortIdCard) {
    const ln = document.querySelector(".team-section .heads .nickname") || document.querySelector(".heads .head-right .nickname") || document.querySelector(".heads .nickname");
    if (ln && ln.dataset.customFontApplied !== shortIdCard) applyFontToElement(ln, shortIdCard);
  }
  // Profile
  const profile = document.querySelector(".tab-content > .profile-cont > .profile");
  if (profile) {
    const sidRaw = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim();
    if (sidRaw) {
      const sid = sidRaw.split("#")[1];
      const nick = profile.querySelector(".nickname");
      let textSpan = nick?.querySelector(".kirka-nickname-span");
      if (!textSpan && nick) {
        const tn = nick.firstChild;
        if (tn?.nodeType === Node.TEXT_NODE) { textSpan = document.createElement("span"); textSpan.className = "kirka-nickname-span"; textSpan.textContent = tn.textContent; nick.replaceChild(textSpan, tn); }
      }
      if (textSpan && textSpan.dataset.customFontApplied !== sid) applyFontToElement(textSpan, sid);
    }
  }
  // In-game tab
  document.querySelectorAll(".desktop-game-interface .player-cont").forEach(player => {
    const nick = player.querySelector(".nickname");
    const sidEl = player.querySelector(".short-id");
    if (nick && sidEl) { const sid = sidEl.innerText.replace("#", ""); if (sid && nick.dataset.customFontApplied !== sid) applyFontToElement(nick, sid); }
  });
  // ESC
  document.querySelectorAll(".esc-interface .player-cont").forEach(player => {
    const pn = player.querySelector(".player-name");
    if (!pn) return;
    const nick = pn.querySelector(".nickname");
    const sidEl = nick?.querySelector(".short-id");
    if (nick && sidEl) { const sid = sidEl.innerText.replace("#", ""); if (sid && nick.dataset.customFontApplied !== sid) applyFontToElement(nick, sid); }
  });
  // Friends
  document.querySelectorAll(".friend").forEach(friend => {
    const nick = friend.querySelector(".nickname");
    const sidEl = friend.querySelector(".friend-id");
    if (nick && sidEl?.innerText && nick.dataset.customFontApplied !== sidEl.innerText) applyFontToElement(nick, sidEl.innerText);
  });
  // Leaderboard
  document.querySelectorAll(".leaderboard .player-name, .rankings .player-name").forEach(player => {
    const sidEl = player.querySelector(".short-id, [data-short-id]");
    const nick = player.querySelector(".nickname, .username");
    if (nick && sidEl) { const sid = sidEl.innerText.replace("#", "") || sidEl.getAttribute?.("data-short-id"); if (sid && nick.dataset.customFontApplied !== sid) applyFontToElement(nick, sid); }
  });
}

function setupFontObservers() {
  new MutationObserver(() => setTimeout(applyAllFonts, 100)).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"]
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BADGE / GRADIENT CUSTOMIZATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function applyGradient(el, gradient, animated = false) {
  el.style.background = `linear-gradient(${gradient.rot}, ${gradient.stops.join(", ")})`;
  el.style.backgroundClip = "text";
  el.style.webkitBackgroundClip = "text";
  el.style.color = "transparent";
  el.style.webkitTextFillColor = "transparent";
  el.style.fontWeight = "700";
  el.style.textShadow = gradient.shadow || "0 0 0 transparent";
  if (animated) { el.style.backgroundSize = "200% 200%"; el.style.animation = "kirka-badges-gradient 3s linear infinite"; }
}

function applyLobbyCustomizations() {
  if (!customizations) return;
  const avatarEl = document.querySelector(".avatar-info .username");
  const shortIdCard = avatarEl?.textContent.trim().split("#")[1] || null;
  const lobbyNickname = document.querySelector(".team-section .heads .nickname") || document.querySelector(".heads .head-right .nickname") || document.querySelector(".heads .nickname");
  if (!lobbyNickname || !shortIdCard) return;
  const customs = getCustomsForId(shortIdCard);
  if (!customs) return;
  lobbyNickname.style.display = "flex";
  lobbyNickname.style.alignItems = "flex-end";
  lobbyNickname.style.gap = "0.25rem";
  lobbyNickname.style.overflow = "unset";
  if (customs.gradient) applyGradient(lobbyNickname, customs.gradient, customs.animated);
  else { lobbyNickname.style.color = ""; lobbyNickname.style.background = ""; }
  if (lobbyNickname.querySelector(".kirka-badges")) return;
  const badgesElem = createBadgesContainer(shortIdCard);
  badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; width: 0;";
  lobbyNickname.appendChild(badgesElem);
  populateBadges(badgesElem, customs, "32px");
}

function applyProfileCustomizations() {
  if (!customizations) return;
  const profile = document.querySelector(".tab-content > .profile-cont > .profile");
  if (!profile) return;
  const shortIdRaw = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim();
  if (!shortIdRaw) return;
  const shortId = shortIdRaw.split("#")[1];
  const nickname = profile.querySelector(".nickname");
  if (!nickname) return;
  const textNode = nickname.firstChild;
  if (textNode?.nodeType === Node.TEXT_NODE) {
    const span = document.createElement("span");
    span.className = "kirka-nickname-span";
    span.textContent = textNode.textContent;
    nickname.replaceChild(span, textNode);
  }
  nickname.style.cssText += "display: flex; align-items: flex-end; gap: 0.25rem; overflow: unset !important;";
  const customs = getCustomsForId(shortId);
  if (!customs) return;
  const span = nickname.querySelector(".kirka-nickname-span");
  if (span && customs.gradient) { span.style.display = "inline-block"; applyGradient(span, customs.gradient, customs.animated); }
  let badgesElem = nickname.querySelector(".kirka-badges");
  if (!badgesElem) { badgesElem = createBadgesContainer(shortId); nickname.appendChild(badgesElem); } else badgesElem.innerHTML = "";
  populateBadges(badgesElem, customs, "32px");
}

function applyTabCustomizations() {
  document.querySelectorAll(".desktop-game-interface .player-cont").forEach(player => {
    const playerLeft = player.querySelector(".player-left");
    const nickname = player.querySelector(".nickname");
    const shortId = player.querySelector(".short-id")?.innerText.replace("#", "");
    if (!shortId || !customizations) { player.querySelector(".kirka-badges")?.remove(); if (nickname) nickname.style = ""; return; }
    const customs = getCustomsForId(shortId);
    if (!customs) { playerLeft?.querySelector(".kirka-badges")?.remove(); if (nickname) nickname.style = ""; return; }
    let badgesElem = player.querySelector(".kirka-badges");
    if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
      badgesElem?.remove();
      badgesElem = createBadgesContainer(shortId);
      badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
      if (nickname) nickname.style = "overflow: unset;";
      if (playerLeft) { playerLeft.style = "width: 0;"; playerLeft.insertBefore(badgesElem, playerLeft.lastChild); }
    } else badgesElem.innerHTML = "";
    if (customs.gradient && nickname) { nickname.style.display = "inline-block"; applyGradient(nickname, customs.gradient, customs.animated); }
    else if (nickname) nickname.style = "overflow: unset;";
    populateBadges(badgesElem, customs, "22px");
  });
}

function applyEscCustomizations() {
  document.querySelectorAll(".esc-interface .player-cont").forEach(player => {
    const playerLeft = player.querySelector(".player-left");
    const playerIds = player.querySelector(".player-name");
    if (!playerIds) return;
    const nickname = playerIds.querySelector(".nickname");
    if (!nickname) return;
    const shortIdElem = nickname.querySelector(".short-id");
    const shortId = shortIdElem?.innerText.replace("#", "");
    if (!shortId || !customizations) { player.querySelector(".kirka-badges")?.remove(); nickname.style = ""; return; }
    const customs = getCustomsForId(shortId);
    if (!customs) { playerLeft?.querySelector(".kirka-badges")?.remove(); nickname.style = ""; return; }
    let badgesElem = player.querySelector(".kirka-badges");
    if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
      badgesElem?.remove();
      badgesElem = createBadgesContainer(shortId);
      badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
      nickname.style = "overflow: unset;";
      if (playerLeft) playerLeft.style = "width: 0;";
      nickname.insertBefore(badgesElem, shortIdElem);
    } else badgesElem.innerHTML = "";
    if (customs.gradient) {
      nickname.style.display = "flex"; nickname.style.flexDirection = "row";
      applyGradient(nickname, customs.gradient, customs.animated);
      if (shortIdElem) { shortIdElem.style.background = "none"; shortIdElem.style.webkitBackgroundClip = "unset"; shortIdElem.style.color = ""; shortIdElem.style.textShadow = "none"; }
    }
    populateBadges(badgesElem, customs, "22px");
  });
}

function applyFriendsCustomizations() {
  if (!customizations) return;
  document.querySelectorAll(".friend").forEach(friend => {
    const shortId = friend.querySelector(".friend-id")?.innerText;
    if (!shortId) return;
    const customs = getCustomsForId(shortId);
    if (!customs) return;
    const nickname = friend.querySelector(".nickname");
    if (!nickname) return;
    nickname.style.display = "flex"; nickname.style.alignItems = "flex-end"; nickname.style.gap = "0.25rem"; nickname.style.overflow = "unset";
    if (customs.gradient) { applyGradient(nickname, customs.gradient, customs.animated); nickname.style.maxWidth = "min-content"; }
    let badgesElem = nickname.querySelector(".kirka-badges");
    if (badgesElem?.dataset.shortId === shortId) return;
    if (badgesElem) badgesElem.remove();
    badgesElem = createBadgesContainer(shortId);
    badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; width: 0;";
    nickname.appendChild(badgesElem);
    populateBadges(badgesElem, customs, "18px");
  });
}

function observeShortIds() {
  document.querySelectorAll(".desktop-game-interface .player-cont").forEach(player => {
    const shortIdElem = player.querySelector(".short-id");
    if (!shortIdElem || shortIdElem.dataset.kbObserver) return;
    shortIdElem.dataset.kbObserver = "true";
    new MutationObserver(() => applyTabCustomizations()).observe(shortIdElem, { characterData: true, subtree: true, childList: true });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBNAME SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

async function injectProfileSubname() {
  const valueElement = document.querySelector(".card-profile .copy-cont .value");
  if (!valueElement) return;
  const text = valueElement.textContent.trim();
  const currentId = text.startsWith("#") ? text.substring(1) : text;
  if (!currentId) return;
  const subname = subnamesData?.find(item => item.id === currentId)?.subname;
  if (!subname) return;
  const existing = valueElement.parentNode.querySelector(".kirka-subname-profile");
  if (existing && existing.textContent === ` (${subname})`) return;
  if (existing) existing.remove();
  const span = document.createElement("span");
  span.className = "kirka-subname-profile";
  span.textContent = ` (${subname})`;
  span.style.cssText = "color: #888888 !important; font-size: 0.9rem !important; font-weight: normal !important; display: inline-block !important; margin-left: 4px !important;";
  valueElement.insertAdjacentElement("afterend", span);
}

async function injectFriendSubnames() {
  for (const friend of document.querySelectorAll(".friend")) {
    const friendIdEl = friend.querySelector(".friend-desc .friend-id");
    if (!friendIdEl) continue;
    const shortId = friendIdEl.textContent.trim();
    if (!shortId) continue;
    const subname = subnamesData?.find(item => item.id === shortId)?.subname;
    if (!subname) continue;
    const parent = friendIdEl.parentNode;
    const existing = parent.querySelector(".kirka-subname-friend");
    if (existing && existing.textContent === ` (${subname})`) continue;
    if (existing) existing.remove();
    const span = document.createElement("span");
    span.className = "kirka-subname-friend";
    span.textContent = ` (${subname})`;
    span.style.cssText = "color: #888888 !important; font-size: 0.8rem !important; font-weight: normal !important; display: inline-block !important; margin-left: 4px !important;";
    friendIdEl.insertAdjacentElement("afterend", span);
  }
}

async function injectAllSubnames() {
  if (!subnamesData) { await fetchSubnamesData(); if (!subnamesData) return; }
  if (subnameIsProcessing) return;
  subnameIsProcessing = true;
  try {
    if (location.href.includes("/profile/")) await injectProfileSubname();
    if (location.href.includes("/friends")) await injectFriendSubnames();
  } catch (e) {}
  subnameIsProcessing = false;
}

function startSubnamePersistence() {
  if (subnameInterval) clearInterval(subnameInterval);
  subnameInterval = setInterval(() => {
    if (location.href.includes("/profile/") || location.href.includes("/friends")) injectAllSubnames();
  }, 500);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BIOTEXT BADGE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function getCurrentProfileShortId() {
  const el = document.querySelector(".tab-content .profile-cont .card-profile .copy-cont .value");
  if (el) { const t = el.textContent.trim(); return t.startsWith("#") ? t.substring(1) : t; }
  return location.href.match(/\/profile\/(?:%23)?([A-Z0-9]+)/i)?.[1] || null;
}

async function injectBioTextBadge() {
  if (!bioTextData) { await fetchBioTextData(); if (!bioTextData) return; }
  if (isBioTextProcessing || !location.href.includes("/profile/")) { activeBioTextBadgeId = null; return; }
  const currentId = getCurrentProfileShortId();
  if (!currentId) return;
  const badgeInfo = bioTextData.find(item => item.shortid === currentId);
  if (!badgeInfo) {
    if (activeBioTextBadgeId !== null) {
      document.querySelector(".tab-content .profile-cont .profile .kirka-biotext-badge")?.remove();
      activeBioTextBadgeId = null;
    }
    return;
  }
  if (activeBioTextBadgeId === currentId) return;
  isBioTextProcessing = true;
  try {
    const pc = document.querySelector(".tab-content .profile-cont"); if (!pc) { isBioTextProcessing = false; return; }
    const profile = pc.querySelector(".profile"); if (!profile) { isBioTextProcessing = false; return; }
    profile.querySelector(".kirka-biotext-badge")?.remove();
    if (getComputedStyle(profile).position !== "relative") profile.style.position = "relative";
    const div = document.createElement("div");
    div.className = "kirka-biotext-badge";
    div.style.cssText = "position: absolute; bottom: 1rem; left: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; z-index: 100; pointer-events: none; background: rgba(0,0,0,0.5); padding: 0.25rem 0.75rem; border-radius: 20px; backdrop-filter: blur(4px);";
    const safeText = escapeHtml(badgeInfo.text);
    div.innerHTML = `<img src="${badgeInfo.image}" style="height:1rem;width:auto;border-radius:50%;" onerror="this.style.display='none'" /><span style="font-size:0.85rem;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${safeText}</span>`;
    profile.appendChild(div);
    activeBioTextBadgeId = currentId;
  } catch (e) {}
  isBioTextProcessing = false;
}

function watchBioTextDOMChanges() {
  let debounceTimer = null;
  new MutationObserver((mutations) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && ((node.matches?.(".profile-cont,.profile,.tab-content")) || node.querySelector?.(".profile-cont,.profile"))) { shouldCheck = true; break; }
          }
        }
      }
      if (shouldCheck && location.href.includes("/profile/")) setTimeout(() => injectBioTextBadge(), 150);
    }, 100);
  }).observe(document.body, { childList: true, subtree: true });
}

function startBioTextPeriodicCheck() {
  if (bioTextPeriodicInterval) clearInterval(bioTextPeriodicInterval);
  bioTextPeriodicInterval = setInterval(() => {
    if (location.href.includes("/profile/") && bioTextData) {
      const pc = document.querySelector(".tab-content .profile-cont");
      if (pc && bioTextData.find(i => i.shortid === getCurrentProfileShortId())) injectBioTextBadge();
    }
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MENTIONS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchMyUserData() {
  try {
    const token = localStorage.getItem("token"); if (!token) return false;
    const r = await fetch("https://api2.kirka.io/api/wNmwWMWn", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return false;
    const data = await r.json(); myShortId = data.wMWWm; myUsername = data.wNmnw; return true;
  } catch { return false; }
}

function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) return;
  ws = new WebSocket("wss://chat.kirka.io");
  ws.onopen = () => { reconnectAttempts = 0; const token = localStorage.getItem("token"); if (token) ws.send(JSON.stringify({ type: "auth", token })); };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 2 && data.user && data.message && data.user.shortId !== myShortId && isPingingMe(data.message)) addMention(data.user.name, data.user.shortId, data.message);
    } catch (e) {}
  };
  ws.onerror = () => {};
  ws.onclose = () => { if (reconnectAttempts < maxReconnectAttempts) { reconnectAttempts++; setTimeout(connectWebSocket, Math.min(1000 * reconnectAttempts, 10000)); } };
}

function isPingingMe(message) {
  if (!myShortId && !myUsername) return false;
  if (myShortId && message.includes(`#${myShortId}`)) return true;
  if (myUsername && message.toLowerCase().includes(`@${myUsername.toLowerCase()}`)) return true;
  return false;
}

function addMention(author, shortId, message) {
  mentions.unshift({ id: Date.now(), author, shortId, message: message.substring(0, 200), time: new Date().toLocaleTimeString() });
  if (mentions.length > 100) mentions = mentions.slice(0, 100);
  localStorage.setItem("kirka-mentions", JSON.stringify(mentions));
  renderMentionsPanel(); updateMentionBadge();
  if (mentionsTab) { mentionsTab.style.transition = "background 0.3s"; mentionsTab.style.background = "rgba(255,185,20,0.3)"; setTimeout(() => { if (mentionsTab) mentionsTab.style.background = ""; }, 500); }
}

function deleteMention(id) {
  mentions = mentions.filter(m => m.id !== id);
  localStorage.setItem("kirka-mentions", JSON.stringify(mentions));
  renderMentionsPanel(); updateMentionBadge();
}

function updateMentionBadge() {
  const titleDiv = document.querySelector(".mentions-tab .title");
  if (titleDiv) {
    titleDiv.querySelector(".mention-badge")?.remove();
    if (mentions.length > 0) { const badge = document.createElement("span"); badge.className = "mention-badge"; badge.textContent = mentions.length; badge.style.cssText = "background:#ef4444;color:white;border-radius:10px;padding:0 6px;margin-left:8px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;"; titleDiv.appendChild(badge); }
  }
  const inventoryBtn = document.querySelector(".icon-btn.INVENTORY");
  if (!inventoryBtn) return;
  const wrapper = inventoryBtn.querySelector(".wrapper");
  if (wrapper) wrapper.style.position = "relative";
  let badge = inventoryBtn.querySelector(".kirka-inventory-mention-badge");
  if (mentions.length === 0) { badge?.remove(); return; }
  if (!badge) { badge = document.createElement("span"); badge.className = "kirka-inventory-mention-badge"; badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;border-radius:10px;padding:0 5px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;z-index:999;pointer-events:none;"; (wrapper || inventoryBtn).appendChild(badge); }
  badge.textContent = mentions.length > 99 ? "99+" : mentions.length;
}

function addMentionsStyles() {
  if (document.querySelector("#kirka-mentions-styles")) return;
  const style = document.createElement("style"); style.id = "kirka-mentions-styles";
  style.textContent = `
    .daily-rewards-btn, .special-message-home { display: none !important; }
    .kirka-mentions-panel { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;max-width:90vw;height:550px;max-height:80vh;background:#1a1a2e;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 10px 40px rgba(0,0,0,0.5);z-index:10000;display:none;flex-direction:column;overflow:hidden; }
    .kirka-mentions-panel .panel-header { display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#0f0f1a;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0; }
    .kirka-mentions-panel .panel-header h3 { margin:0;color:#ffb914;font-size:18px;font-weight:600; }
    .kirka-mentions-panel .panel-actions { display:flex;gap:12px;align-items:center; }
    .kirka-mentions-panel .kirka-button { position:relative;display:inline-flex;align-items:center;justify-content:center;padding:6px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;background:var(--blue-4,#2a3a6e);color:white; }
    .kirka-mentions-panel .kirka-button::before { content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0) 50%);pointer-events:none; }
    .kirka-mentions-panel .kirka-button-danger { background:var(--red-5,#8b2c2c); }
    .kirka-mentions-panel .kirka-button-danger:hover { background:var(--red-4,#a33a3a);transform:translateY(-1px); }
    .kirka-mentions-panel .kirka-button:hover { transform:translateY(-1px);filter:brightness(1.05); }
    .kirka-mentions-panel .panel-close { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#aaa;cursor:pointer;padding:6px 12px;transition:all 0.2s;font-weight:600; }
    .kirka-mentions-panel .panel-close:hover { background:rgba(255,255,255,0.1);color:white; }
    .kirka-mentions-panel .mentions-list-container { flex:1;overflow-y:auto;padding:16px; }
    .kirka-mentions-panel .mention-item { background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-left:3px solid #ffb914;transition:background 0.2s; }
    .kirka-mentions-panel .mention-item:hover { background:rgba(255,255,255,0.06); }
    .kirka-mentions-panel .mention-author { font-weight:600;color:#ffb914; }
    .kirka-mentions-panel .mention-shortid { font-size:11px;color:#666; }
    .kirka-mentions-panel .mention-time { font-size:11px;color:#555; }
    .kirka-mentions-panel .mention-message { font-size:13px;color:#ccc;word-break:break-word;margin-top:6px; }
    .kirka-mentions-panel .delete-mention { background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600; }
    .kirka-mentions-panel .delete-mention:hover { background:rgba(239,68,68,0.3);transform:translateY(-1px); }
    .kirka-mentions-panel .empty-state { text-align:center;padding:40px;color:#666; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar { width:6px; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-track { background:rgba(255,255,255,0.05);border-radius:3px; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2);border-radius:3px; }
    @keyframes mentionSlideIn { from{opacity:0;transform:translate(-50%,-48%);} to{opacity:1;transform:translate(-50%,-50%);} }
    .kirka-mentions-panel.show { animation:mentionSlideIn 0.2s ease; }
  `;
  document.head.appendChild(style);
}

function createMentionsTab() {
  if (document.querySelector(".mentions-tab")) return;
  const tabBar = document.querySelector(".inventory .tab-bar"); if (!tabBar) return;
  mentionsTab = document.createElement("div");
  mentionsTab.className = "tab mentions-tab"; mentionsTab.setAttribute("data-v-0c2b2d3b", "");
  const titleDiv = document.createElement("div"); titleDiv.className = "title"; titleDiv.setAttribute("data-v-0c2b2d3b", ""); titleDiv.textContent = "MENTIONS";
  mentionsTab.appendChild(titleDiv); mentionsTab.style.cursor = "pointer";
  mentionsTab.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggleMentionsPanel(); });
  const endTab = tabBar.querySelector(".tab.end");
  if (endTab) tabBar.insertBefore(mentionsTab, endTab); else tabBar.appendChild(mentionsTab);
  updateMentionBadge();
}

function createMentionsPanelEl() {
  document.querySelector(".kirka-mentions-panel")?.remove();
  const panel = document.createElement("div"); panel.className = "kirka-mentions-panel";
  panel.innerHTML = `<div class="panel-header"><h3>📬 Mentions</h3><div class="panel-actions"><button class="kirka-button kirka-button-danger" id="panel-clear-all">CLEAR ALL</button><button class="panel-close" id="panel-close">CLOSE</button></div></div><div class="mentions-list-container"></div>`;
  document.body.appendChild(panel);
  document.getElementById("panel-close")?.addEventListener("click", () => { panel.style.display = "none"; });
  document.getElementById("panel-clear-all")?.addEventListener("click", () => { if (confirm("Clear all mentions?")) { mentions = []; localStorage.setItem("kirka-mentions", "[]"); renderMentionsPanel(); updateMentionBadge(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.style.display === "flex") panel.style.display = "none"; });
  document.addEventListener("click", (e) => { if (panel.style.display === "flex" && !panel.contains(e.target) && e.target !== mentionsTab && !mentionsTab?.contains(e.target)) panel.style.display = "none"; });
  return panel;
}

function renderMentionsPanel() {
  const panel = document.querySelector(".kirka-mentions-panel"); if (!panel) return;
  const lc = panel.querySelector(".mentions-list-container"); if (!lc) return;
  if (!mentions.length) { lc.innerHTML = '<div class="empty-state">No mentions yet</div>'; return; }
  lc.innerHTML = "";
  mentions.forEach(mention => {
    const item = document.createElement("div"); item.className = "mention-item";
    item.innerHTML = `<div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;"><span class="mention-author">${escapeHtml(mention.author)}</span><span class="mention-shortid">#${escapeHtml(mention.shortId)}</span><span class="mention-time">${mention.time}</span></div><div class="mention-message">${escapeHtml(mention.message)}</div></div><button class="delete-mention" data-id="${mention.id}">✕ DELETE</button>`;
    lc.appendChild(item);
  });
  lc.querySelectorAll(".delete-mention").forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); deleteMention(parseInt(btn.dataset.id)); }; });
}

function toggleMentionsPanel() {
  let panel = document.querySelector(".kirka-mentions-panel");
  if (!panel) panel = createMentionsPanelEl();
  if (panel.style.display === "flex") { panel.style.display = "none"; }
  else { renderMentionsPanel(); panel.style.display = "flex"; panel.classList.add("show"); setTimeout(() => panel.classList.remove("show"), 200); }
}

async function initMentions() {
  addMentionsStyles();
  await fetchMyUserData();
  const saved = localStorage.getItem("kirka-mentions");
  if (saved) { try { mentions = JSON.parse(saved); } catch (e) {} }
  if (myShortId) connectWebSocket();
  if (inventoryObserver) inventoryObserver.disconnect();
  inventoryObserver = new MutationObserver(() => { const tb = document.querySelector(".inventory .tab-bar"); if (tb && !document.querySelector(".mentions-tab")) createMentionsTab(); });
  inventoryObserver.observe(document.body, { childList: true, subtree: false });
  const chk = setInterval(() => { if (document.querySelector(".inventory .tab-bar")) createMentionsTab(); updateMentionBadge(); if (document.querySelector(".mentions-tab") && document.querySelector(".icon-btn.INVENTORY")) clearInterval(chk); }, 500);
  setTimeout(() => clearInterval(chk), 15000);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHAT COMMAND AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

const chatCommands = {
  "/inv": { description: "Check inventory", category: "Info" },
  "/hm": { description: "How much (check item price)", category: "Trade" },
  "/locate": { description: "Locate player/items", category: "Info" },
  "/flip": { description: "Flip items", category: "Trade" },
  "/trade cancel": { description: "Cancel current trade", category: "Trade" },
  "/trade bump": { description: "Bump trade offer", category: "Trade" },
  "/trade accept": { description: "Accept trade offer", category: "Trade" },
  "/trade offer my:": { description: "Offer trade (my: [items])", category: "Trade" },
  "/myvotes": { description: "Check your votes", category: "Info" },
  "/gift": { description: "Gift items to player", category: "Gift" },
  "/topgifter": { description: "Top gifters leaderboard", category: "Gift" },
  "/mygift": { description: "Check your gifts", category: "Gift" }
};

function addChatCommandStyles() {
  if (document.getElementById("cmd-suggestion-styles")) return;
  const style = document.createElement("style"); style.id = "cmd-suggestion-styles";
  style.textContent = `#cmd-suggestion-box{animation:kirkaFadeIn 0.12s ease-out;}@keyframes kirkaFadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}} .kirka-cmd-suggestion:hover{background:#2a2f3e!important;border-left-color:#4caf50!important;} #cmd-suggestion-box::-webkit-scrollbar{width:6px;} #cmd-suggestion-box::-webkit-scrollbar-track{background:#0f1117;border-radius:3px;} #cmd-suggestion-box::-webkit-scrollbar-thumb{background:#2a2f3e;border-radius:3px;} #cmd-suggestion-box::-webkit-scrollbar-thumb:hover{background:#4caf50;}`;
  document.head.appendChild(style);
}

function cmdIsCompleteCommand(inputText) {
  const multiWord = ["/trade cancel", "/trade bump", "/trade accept", "/trade offer my:"];
  for (const cmd of multiWord) { if (inputText.toLowerCase().startsWith(cmd.toLowerCase() + " ") || inputText.toLowerCase() === cmd.toLowerCase()) return true; }
  const match = inputText.match(/^\/([a-z]+)(?:\s|$)/i);
  if (!match) return false;
  return chatCommands.hasOwnProperty("/" + match[1].toLowerCase());
}

function cmdGetMatching(inputText) {
  const inputLower = inputText.toLowerCase();
  if (inputLower === "/trade ") return ["/trade cancel", "/trade bump", "/trade accept", "/trade offer my:"];
  if (inputLower.startsWith("/trade ")) { const after = inputLower.substring(7); return ["cancel", "bump", "accept", "offer my:"].filter(c => c.startsWith(after)).map(c => "/trade " + c); }
  const match = inputText.match(/^\/([a-z]*)/i); if (!match) return [];
  const prefix = match[1].toLowerCase();
  const singles = Object.keys(chatCommands).filter(c => !c.includes(" "));
  return prefix ? singles.filter(c => c.toLowerCase().startsWith("/" + prefix)) : singles;
}

function cmdRenderSuggestion(cmd, index) {
  const selected = index === cmdSelectedIndex;
  return `<div class="kirka-cmd-suggestion" data-cmd="${cmd}" style="padding:8px 12px;cursor:pointer;transition:all 0.08s linear;border-left:2px solid ${selected ? "#4caf50" : "transparent"};background:${selected ? "#2a2f3e" : "transparent"};margin:0;"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;"><div style="flex:1;"><span style="color:#4caf50;font-weight:600;font-size:13px;">${cmd}</span><span style="color:#6b7280;font-size:11px;margin-left:8px;">${chatCommands[cmd]?.category || "Command"}</span><div style="color:#9ca3af;font-size:11px;margin-top:2px;">${chatCommands[cmd]?.description || "Execute command"}</div></div><div style="color:#4caf50;font-size:10px;opacity:${selected ? "1" : "0.5"};border:1px solid #2a2f3e;padding:2px 6px;border-radius:3px;background:#0f1117;">↵</div></div></div>`;
}

function cmdHighlight() {
  document.querySelectorAll(".kirka-cmd-suggestion").forEach((el, idx) => {
    const on = idx === cmdSelectedIndex;
    el.style.background = on ? "#2a2f3e" : "transparent";
    el.style.borderLeftColor = on ? "#4caf50" : "transparent";
    if (on) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function cmdApply(cmd) { if (!cmdChatInput) return; cmdChatInput.value = cmd + " "; cmdChatInput.focus(); cmdHide(); cmdChatInput.dispatchEvent(new Event("input", { bubbles: true })); }
function cmdHide() { if (cmdSuggestionBox) cmdSuggestionBox.style.display = "none"; cmdSelectedIndex = -1; }

function cmdUpdateSuggestions(inputText) {
  if (cmdIsCompleteCommand(inputText)) { cmdHide(); return; }
  const cmdsToShow = inputText.toLowerCase() === "/trade" ? ["/trade cancel", "/trade bump", "/trade accept", "/trade offer my:"] : cmdGetMatching(inputText);
  if (!cmdsToShow.length) { cmdHide(); return; }
  if (!cmdSuggestionBox) { cmdSuggestionBox = document.createElement("div"); cmdSuggestionBox.id = "cmd-suggestion-box"; Object.assign(cmdSuggestionBox.style, { position: "fixed", background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: "4px", padding: "4px 0", zIndex: "10000", maxHeight: "320px", overflowY: "auto", minWidth: "260px", boxShadow: "0 4px 12px rgba(0,0,0,0.6)", display: "none" }); document.body.appendChild(cmdSuggestionBox); }
  const rect = cmdChatInput.getBoundingClientRect();
  cmdSuggestionBox.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  cmdSuggestionBox.style.left = `${rect.left}px`;
  cmdSuggestionBox.style.width = `${rect.width}px`;
  cmdSuggestionBox.style.display = "block";
  cmdSuggestionBox.innerHTML = cmdsToShow.map((cmd, i) => cmdRenderSuggestion(cmd, i)).join("");
  cmdSuggestionBox.querySelectorAll(".kirka-cmd-suggestion").forEach((el, idx) => {
    el.addEventListener("mouseenter", () => { cmdSelectedIndex = idx; cmdHighlight(); });
    el.addEventListener("click", () => cmdApply(el.getAttribute("data-cmd")));
  });
}

function initChatCommands() {
  const input = document.querySelector("input#WwMnw, input[placeholder*='MESSAGE']");
  if (!input || input === cmdChatInput) return;
  cmdChatInput = input;
  const handleKeyDown = (e) => {
    if (!cmdSuggestionBox || cmdSuggestionBox.style.display !== "block") return;
    const sugs = document.querySelectorAll(".kirka-cmd-suggestion"); if (!sugs.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex + 1) % sugs.length; cmdHighlight(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex - 1 + sugs.length) % sugs.length; cmdHighlight(); }
    else if (e.key === "Tab" || (e.key === "Enter" && cmdSelectedIndex >= 0)) { e.preventDefault(); const cmd = sugs[cmdSelectedIndex]?.getAttribute("data-cmd"); if (cmd) cmdApply(cmd); }
    else if (e.key === "Escape") { e.preventDefault(); cmdHide(); }
  };
  const handleInput = () => { const v = cmdChatInput.value; if (v.startsWith("/") && !cmdIsCompleteCommand(v)) cmdUpdateSuggestions(v); else cmdHide(); };
  const handleKeyPress = (e) => {
    if (e.key !== "Enter") return;
    const msg = cmdChatInput.value.trim(); if (!msg.startsWith("/")) { cmdHide(); return; }
    const multiWord = ["/trade cancel", "/trade bump", "/trade accept", "/trade offer my:"];
    let matchedKey = multiWord.find(mc => msg.toLowerCase().startsWith(mc.toLowerCase()));
    if (!matchedKey) { const single = msg.split(" ")[0].toLowerCase(); if (chatCommands[single]) matchedKey = single; }
    if (matchedKey) { e.preventDefault(); cmdHide(); setTimeout(() => { cmdChatInput.value = ""; }, 10); } else cmdHide();
  };
  cmdChatInput.addEventListener("keydown", handleKeyDown);
  cmdChatInput.addEventListener("input", handleInput);
  cmdChatInput.addEventListener("keypress", handleKeyPress);
  document.addEventListener("click", (e) => { if (cmdSuggestionBox && !cmdSuggestionBox.contains(e.target) && e.target !== cmdChatInput) cmdHide(); });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOBBY NEWS
// ═══════════════════════════════════════════════════════════════════════════════

async function lobbyNews() {
  if (document.querySelector("#lobby-news")) return;
  const leftInterface = document.querySelector("#app #left-interface") || document.querySelector(".left-interface") || document.querySelector("#left-interface");
  if (!leftInterface) return;
  let news;
  try { news = await fetch("https://raw.githubusercontent.com/OBS-Akuma/smudgy-client/refs/heads/main/Api/news.json").then(r => r.json()); } catch { return; }
  if (!news?.length) return;

  if (!document.getElementById("lobby-news-styles")) {
    const s = document.createElement("style"); s.id = "lobby-news-styles";
    s.textContent = `
      #lobby-news { width:250px;position:absolute;display:flex;flex-direction:column;gap:0.25rem;top:178px;left:148px;pointer-events:auto;z-index:10; }
      .kb-news-card { width:100%;border:4px solid #3e4d7c;border-bottom:4px solid #26335b;border-top:4px solid #4d5c8b;background-color:#3b4975;display:flex;flex-direction:row;position:relative;align-items:stretch; }
      .kb-news-card.banner { flex-direction:column; }
      .kb-news-card.has-link { cursor:pointer; }
      .kb-news-card img.news-img { object-fit:cover;object-position:center;flex-shrink:0; }
      .kb-news-card img.news-img.banner { width:100%;max-height:7.5rem; }
      .kb-news-card img.news-img.side { width:4rem;max-height:4rem; }
      .kb-news-badge { position:absolute;top:0;right:0;padding:0.15rem 0.25rem;font-size:0.75rem;font-weight:600;color:#fff;border-radius:0 0 0 0.25rem; }
      .kb-news-badge.live { background:#4dbf4d; }
      .kb-news-badge.new { background:#e24f4f; }
      .kb-news-content { padding:0.5rem;display:flex;flex-direction:column;gap:0.25rem;flex:1;min-width:0;text-align:left; }
      .kb-news-title { font-size:1.2rem;font-weight:600;color:#ffb914;margin:0;display:block; }
      .kb-news-text { font-size:0.9rem;color:#fff;margin:0;display:block;word-wrap:break-word; }
    `;
    document.head.appendChild(s);
  }

  const container = document.createElement("div"); container.id = "lobby-news";
  leftInterface.appendChild(container);
  news.forEach(item => {
    const card = document.createElement("div");
    card.className = "kb-news-card" + (item.imgType === "banner" ? " banner" : "") + (item.link ? " has-link" : "");
    container.appendChild(card);
    if (item.img) { const img = document.createElement("img"); img.src = item.img; img.className = "news-img " + (item.imgType === "banner" ? "banner" : "side"); card.appendChild(img); }
    if (item.live) { const b = document.createElement("span"); b.className = "kb-news-badge live"; b.innerText = "LIVE"; card.appendChild(b); }
    else if (item.updatedAt && item.updatedAt > Date.now() - 432000000) { const b = document.createElement("span"); b.className = "kb-news-badge new"; b.innerText = "NEW"; card.appendChild(b); }
    const content = document.createElement("div"); content.className = "kb-news-content";
    const title = document.createElement("span"); title.className = "kb-news-title"; title.innerText = item.title; content.appendChild(title);
    if (item.content) { const t = document.createElement("span"); t.className = "kb-news-text"; t.innerText = item.content; content.appendChild(t); }
    card.appendChild(content);
    if (item.link) card.onclick = () => { if (item.link.startsWith("https://kirka.io/")) window.location.href = item.link; else window.open(item.link, "_blank"); };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DISCORD / SMUDGY BUTTONS
// ═══════════════════════════════════════════════════════════════════════════════

function juiceDiscordButton() {
  if (document.querySelector("#juice-discord-btn")) return;
  const tryInject = () => {
    const btns = document.querySelectorAll(".card-cont.soc-group"); const btn = btns[1]; if (!btn) return false;
    const discordBtn = btn.cloneNode(true); discordBtn.id = "juice-discord-btn"; discordBtn.className = "card-cont soc-group";
    discordBtn.style.cssText = "background: linear-gradient(135deg, #1A8E50 0%, #2aae60 50%, #0e6e3a 100%) !important; border: none !important; box-shadow: 0 4px 15px rgba(26, 142, 80, 0.3) !important; cursor: pointer;";
    const textSoc = discordBtn.querySelector(".text-soc");
    if (textSoc?.children.length >= 2) { textSoc.children[0].innerText = "Froke"; textSoc.children[1].innerText = "DISCORD"; }
    const svg = discordBtn.querySelector("svg");
    if (svg) { const i = document.createElement("i"); i.className = "fab fa-discord"; i.style.cssText = "font-size: 48px; margin: 3.2px 1.6px 0 1.6px"; svg.replaceWith(i); }
    discordBtn.onclick = () => window.open("https://discord.gg/H338BfU4vT", "_blank");
    btn.replaceWith(discordBtn); return true;
  };
  if (!tryInject()) { const obs = observeForElement(".card-cont.soc-group", () => { if (tryInject()) obs.disconnect(); }); }
}

function juiceSmudgyButton() {
  if (document.querySelector("#juice-smudgy-btn")) return;
  const tryInject = () => {
    const btns = document.querySelectorAll(".card-cont.soc-group"); const btn = btns[2]; if (!btn) return false;
    const smudgyBtn = btn.cloneNode(true); smudgyBtn.id = "juice-smudgy-btn"; smudgyBtn.className = "card-cont soc-group";
    smudgyBtn.style.cssText = "background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff4500 100%) !important; border: none !important; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3) !important; cursor: pointer;";
    const textSoc = smudgyBtn.querySelector(".text-soc");
    if (textSoc?.children.length >= 2) { textSoc.children[0].innerText = "SMUDGY"; textSoc.children[1].innerText = "STORE"; }
    const svg = smudgyBtn.querySelector("svg");
    if (svg) { const img = document.createElement("img"); img.src = "https://www.smudgy.store/uploads/icon.png"; img.style.cssText = "width: 32px; height: 32px; margin: 6px; object-fit: contain"; svg.replaceWith(img); }
    smudgyBtn.onclick = () => window.open("https://www.smudgy.store", "_blank");
    btn.replaceWith(smudgyBtn); return true;
  };
  if (!tryInject()) { const obs = observeForElement(".card-cont.soc-group", () => { if (tryInject()) obs.disconnect(); }); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BADGES PAGE DASHBOARD (/badges)
// ═══════════════════════════════════════════════════════════════════════════════

// Button [0] — navigates to /badges with Smudgy icon + green gradient
const fixDiscordButton = () => {
  const btn = document.querySelectorAll(".card-cont.soc-group")[0];
  if (!btn) return;
  const parentLink = btn.closest("a");
  if (parentLink) parentLink.parentNode.replaceChild(btn, parentLink);
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.style.setProperty("background", "linear-gradient(135deg, #1A8E50 0%, #2aae60 50%, #0e6e3a 100%)", "important");
  newBtn.style.setProperty("background-color", "transparent", "important");
  newBtn.style.setProperty("border", "none", "important");
  newBtn.style.setProperty("box-shadow", "0 4px 15px rgba(26, 142, 80, 0.3)", "important");
  newBtn.style.setProperty("transition", "all 0.3s ease", "important");
  newBtn.classList.remove("orange", "discord", "reddit", "blue");
  const svgElement = newBtn.querySelector("svg");
  if (svgElement) { const img = document.createElement("img"); img.src = "https://www.smudgy.store/uploads/icon.png"; img.style.cssText = "width:48px;height:48px;border-radius:12px;object-fit:cover;pointer-events:none;"; svgElement.replaceWith(img); }
  const iconEl = newBtn.querySelector(".soc-icon, i");
  if (iconEl) { const img = document.createElement("img"); img.src = "https://www.smudgy.store/uploads/icon.png"; img.style.cssText = "width:48px;height:48px;border-radius:12px;object-fit:cover;"; iconEl.replaceWith(img); }
  newBtn.addEventListener("mouseenter", () => { newBtn.style.transform = "translateY(-2px)"; newBtn.style.boxShadow = "0 6px 20px rgba(26, 142, 80, 0.4)"; });
  newBtn.addEventListener("mouseleave", () => { newBtn.style.transform = "translateY(0)"; newBtn.style.boxShadow = "0 4px 15px rgba(26, 142, 80, 0.3)"; });
  newBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); const newUrl = "/badges"; window.history.pushState({}, "", newUrl); window.dispatchEvent(new PopStateEvent("popstate")); window.dispatchEvent(new CustomEvent("urlchange", { detail: { url: newUrl } })); return false; };
  newBtn.style.cursor = "pointer";
};

function navigateToProfile(shortId) {
  if (!shortId) return;
  isApplied = false;
  const closeBtn = document.querySelector("[data-v-da7c34da].close");
  if (closeBtn) closeBtn.click();
  setTimeout(() => {
    const newUrl = `/profile/${shortId}`;
    window.history.pushState({}, "", newUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new CustomEvent("urlchange", { detail: { url: newUrl } }));
  }, 100);
}

function renderBadges() {
  const badgesContainer = document.getElementById("badges-list");
  if (!badgesContainer) return;
  if (!badgesData?.length) { badgesContainer.innerHTML = '<div class="badges-placeholder"><div class="badge-message">No Badges Available</div><div class="badge-submessage">Check back later!</div></div>'; return; }
  const validUsers = badgesData.filter(user => user.shortId);
  if (!validUsers.length) { badgesContainer.innerHTML = '<div class="badges-placeholder"><div class="badge-message">No Users Found</div></div>'; return; }
  let html = "";
  validUsers.forEach(user => {
    let badgeStripStyle = user.gradient
      ? `background:linear-gradient(${user.gradient.rot || "0deg"},${(user.gradient.stops || ["#ffb914", "#ff9d00"]).join(",")});${user.gradient.shadow ? `box-shadow:${user.gradient.shadow};` : ""}`
      : "background:linear-gradient(262.54deg,#202639 9.46%,#223163 100.16%);";
    let badgesInner = "";
    let hasAny = false;
    if (user.discord?.trim()) { badgesInner += `<div class="badge-item"><img src="https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/linked.webp" alt="Discord Linked" class="badge-image" title="${escapeHtml(user.discord)}" loading="lazy" /></div>`; hasAny = true; }
    if (user.booster === true) { badgesInner += `<div class="badge-item"><img src="https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/booster.webp" alt="Booster" class="badge-image" title="Booster" loading="lazy" /></div>`; hasAny = true; }
    if (user.badges?.length) { user.badges.forEach(b => { badgesInner += `<div class="badge-item"><img src="${b}" alt="Badge" class="badge-image" loading="lazy" /></div>`; }); hasAny = true; }
    if (!hasAny) badgesInner = '<span class="no-badges-message">No badges</span>';
    html += `<div class="user-badge-card" data-shortid="${escapeHtml(user.shortId)}"><div class="card-userid text-2">${escapeHtml(user.shortId)}</div><div class="card-badge-strip" style="${badgeStripStyle}">${badgesInner}</div></div>`;
  });
  badgesContainer.innerHTML = html;
  badgesContainer.querySelectorAll(".user-badge-card").forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => { if (e.target.closest("a")) return; const shortId = card.getAttribute("data-shortid"); if (shortId) navigateToProfile(shortId); });
  });
}

async function matchKATStyle() {
  if (!window.location.pathname.includes("/badges")) {
    isApplied = false;
    const contentDiv = document.querySelector("[data-v-112b925e].content");
    if (contentDiv?.querySelector(".tabs-container")) { contentDiv.innerHTML = ""; contentDiv.removeAttribute("style"); }
    document.querySelector("[data-v-112b925e].container")?.removeAttribute("style");
    document.querySelector("[data-v-112b925e].background")?.removeAttribute("style");
    return;
  }
  if (isApplied) return;
  isApplied = true;
  if (!badgesData?.length) {
    try { const r = await fetch("https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/badge.json"); badgesData = await r.json(); if (!customizations) { customizations = badgesData; fontData = badgesData; } } catch (e) { badgesData = customizations || []; }
  }
  const background = document.querySelector("[data-v-112b925e].background");
  if (background) { background.style.position = "fixed"; background.style.top = "0"; background.style.left = "0"; background.style.right = "0"; background.style.bottom = "0"; background.style.backgroundColor = "transparent"; background.style.zIndex = "9999"; }
  const container = document.querySelector("[data-v-112b925e].container");
  if (container) { container.style.position = "absolute"; container.style.top = "50%"; container.style.left = "50%"; container.style.transform = "translate(-50%,-50%)"; container.style.width = "90%"; container.style.maxWidth = "1200px"; container.style.height = "85%"; container.style.backgroundColor = "#1a1a2e"; container.style.borderRadius = "12px"; container.style.display = "flex"; container.style.flexDirection = "column"; container.style.overflow = "hidden"; }
  const contentDiv = document.querySelector("[data-v-112b925e].content");
  if (!contentDiv) return;
  contentDiv.style.flex = "1"; contentDiv.style.overflowY = "auto"; contentDiv.style.padding = "20px";
  contentDiv.innerHTML = `
    <style>
      .tabs-container{font-family:'Exo 2',sans-serif;max-width:1200px;margin:0 auto;}
      .tab-header{display:flex;flex-wrap:wrap;gap:0;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);}
      .tab-header .tab{font-family:'Exo 2',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:10px 18px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color 0.2s ease,border-color 0.2s ease;white-space:nowrap;user-select:none;}
      .tab-header .tab:hover{color:rgba(255,255,255,0.75);}
      .tab-header .tab.active{color:#ffb914;border-bottom:2px solid #ffb914;}
      .tab-content{display:none;animation:fadeIn 0.3s ease;}
      .tab-content.active{display:block;}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
      .juice.options{max-width:800px;margin:0 auto;}
      .option-group{margin-bottom:20px;background:linear-gradient(262.54deg,#202639 9.46%,#223163 100.16%);border-radius:10px;overflow:hidden;border:solid 0.15rem #ffb914;transition:all 0.3s ease;}
      .option-group:hover{transform:translateY(-2px);box-shadow:0 0 0.7rem rgba(255,185,20,0.25);}
      .about-top{display:flex;padding:20px;gap:15px;align-items:center;}
      .about-top.header{background:linear-gradient(135deg,rgba(32,38,57,0.8) 0%,rgba(34,49,99,0.8) 100%);}
      .about-top.compact{padding:15px 20px;}
      .about-top img{width:60px;height:60px;border-radius:12px;object-fit:cover;border:solid 0.1rem #ffb914;}
      .about-top.compact img{width:45px;height:45px;}
      .about-info{flex:1;}
      .about-info .title{font-size:20px;font-weight:600;color:#ffb914;display:block;margin-bottom:8px;}
      .about-info.compact .title{font-size:16px;margin-bottom:5px;}
      .about-more{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}
      .about-more>div:first-child{color:#888;font-size:12px;}
      .about-buttons{display:flex;gap:10px;}
      .about-buttons a{position:relative;display:flex;align-items:center;justify-content:center;width:35px;height:35px;background:linear-gradient(262.54deg,#202639 9.46%,#223163 100.16%);border-radius:8px;color:#fff;text-decoration:none;transition:all 0.3s ease;border:solid 0.1rem #ffb914;}
      .about-buttons a:hover{transform:translateY(-2px);box-shadow:0 0 0.7rem rgba(255,185,20,0.3);}
      .about-buttons a.about-juice.alt{width:auto;padding:0 12px;gap:8px;}
      .about-buttons a.about-juice.alt p{margin:0;font-size:13px;}
      .about-buttons a img{width:20px;height:20px;border-radius:4px;}
      .about-buttons a i{font-size:18px;}
      .about-discord i{color:#5865F2;}
      .custom-border{position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#ffb914,transparent);transform:scaleX(0);transition:transform 0.3s ease;}
      .about-buttons a:hover .custom-border{transform:scaleX(1);}
      .badges-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;}
      .user-badge-card{display:flex;flex-direction:column;background:#161b2e;cursor:pointer;transition:background 0.15s ease;overflow:hidden;}
      .user-badge-card:hover{background:#1e2540;}
      .card-userid{padding:10px 14px 8px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 0.15s ease;}
      .user-badge-card:hover .card-userid{color:#ffb914;}
      .card-badge-strip{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:6px 14px 10px;min-height:44px;}
      .badge-item{flex:0 0 auto;transition:transform 0.2s ease;}
      .badge-item:hover{transform:scale(1.15);}
      .badge-image{width:30px;height:30px;object-fit:contain;border-radius:4px;display:block;pointer-events:none;}
      .no-badges-message{color:rgba(255,255,255,0.2);font-size:11px;}
      .badges-placeholder{text-align:center;padding:60px 20px;}
      .badge-message{font-size:15px;color:#ffb914;margin-bottom:8px;}
      .badge-submessage{font-size:13px;color:rgba(255,255,255,0.35);}
      .loading-spinner{text-align:center;padding:50px;}
      .spinner{border:2px solid rgba(255,185,20,0.2);border-top:2px solid #ffb914;border-radius:50%;width:32px;height:32px;animation:spin 0.8s linear infinite;margin:0 auto 12px;}
      @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      @media(max-width:768px){.badges-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));}}
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <div class="tabs-container">
      <div class="tab-header">
        <div class="text-2 tab active" data-tab="tools">Tools &amp; Info</div>
        <div class="text-2 tab" data-tab="badges">Badges</div>
      </div>
      <div class="tab-content active" id="tools-tab">
        <div id="about-client" class="juice options">
          <div class="option-group"><div class="about-top header"><img src="https://www.smudgy.store/uploads/icon.png" /><div class="about-info"><span class="title">Smudgy Client</span><div class="about-more"><div><span class="author">Froked by Akuma (console.dev)</span></div><div class="about-buttons"><a href="https://kirka.io/profile/NUGGET" class="about-kirka"><img src="https://kirka.io/favicon.ico" /><div class="custom-border"></div></a><a href="https://discord.gg/H338BfU4vT" target="_blank" class="about-discord"><i class="fab fa-discord"></i><div class="custom-border"></div></a><a href="https://sillimons.fun" target="_blank"><i class="fas fa-globe"></i><div class="custom-border"></div></a><a href="https://github.com/OBS-Akuma/smudgy-client" target="_blank" class="about-github"><i class="fab fa-github"></i><div class="custom-border"></div></a></div></div></div></div></div>
          <div class="option-group"><div class="about-top compact"><img src="https://www.smudgy.store/uploads/icon.png" /><div class="about-info compact"><span class="title">Froke Tools</span><div class="about-more"><div></div><div class="about-buttons"><a href="https://smudgy.store" class="about-juice alt"><i class="fas fa-arrow-up-right-from-square"></i><p>View</p><div class="custom-border"></div></a></div></div></div></div></div>
          <div class="option-group"><div class="about-top compact"><img src="https://sillimons.fun/favicon.svg" /><div class="about-info compact"><span class="title">Sillimons Tools</span><div class="about-more"><div></div><div class="about-buttons"><a href="https://sillimons.fun" class="about-juice alt"><i class="fas fa-arrow-up-right-from-square"></i><p>View</p><div class="custom-border"></div></a></div></div></div></div></div>
          <div class="option-group"><div class="about-top compact"><img src="https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/booster.webp" /><div class="about-info compact"><span class="title">Patch Notes</span><div class="about-more"><div></div><div class="about-buttons"><a href="https://freaksforever.xyz/patch-notes" class="about-juice alt"><i class="fas fa-arrow-up-right-from-square"></i><p>View</p><div class="custom-border"></div></a></div></div></div></div></div>
        </div>
      </div>
      <div class="tab-content" id="badges-tab">
        <div id="badges-list" class="badges-grid"><div class="loading-spinner"><div class="spinner"></div><div class="badge-message">Loading badges...</div></div></div>
      </div>
    </div>
  `;
  const tabs = contentDiv.querySelectorAll(".tab-header .tab");
  const tabContents = contentDiv.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      tabs.forEach(t => t.classList.remove("active")); tabContents.forEach(c => c.classList.remove("active"));
      tab.classList.add("active"); document.getElementById(`${tabId}-tab`).classList.add("active");
      if (tabId === "badges") renderBadges();
    });
  });
  renderBadges();
  const namePage = document.querySelector("[data-v-da7c34da].name-page");
  if (namePage && !namePage.textContent.trim()) namePage.textContent = "Dashboard";
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SERVER MAP IMAGES
// ═══════════════════════════════════════════════════════════════════════════════

async function handleServers() {
  try {
    const mapImages = await fetch("https://raw.githubusercontent.com/OBS-Akuma/imgdata/main/maps/full_mapimages.json").then(r => r.json());
    Object.keys(mapImages).forEach(item => { if (!mapImages[item].includes("https")) mapImages[item] = "https://raw.githubusercontent.com/OBS-Akuma/imgdata/main" + mapImages[item]; });
    const replaceMapImages = () => {
      document.querySelectorAll(".server").forEach(server => {
        const mapElement = server.querySelector(".map");
        if (mapElement) { const mn = mapElement.innerText.split("_").pop(); if (mapImages[mn]) { server.style.backgroundImage = `url(${mapImages[mn]})`; server.style.backgroundSize = "cover"; server.style.backgroundPosition = "center"; } else server.style.backgroundImage = "none"; }
      });
    };
    replaceMapImages();
    if (serverMapInterval) clearInterval(serverMapInterval);
    serverMapInterval = setInterval(() => { if (!window.location.href.startsWith(`${BASE_URL}servers/`)) { clearInterval(serverMapInterval); serverMapInterval = null; return; } replaceMapImages(); }, 250);
  } catch (err) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FRIENDS PIN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function loadPinnedUsers() {
  const saved = localStorage.getItem("friendsList_pinned_v2");
  if (saved) { try { pinnedUsersList = JSON.parse(saved); pinnedUsers = new Set(pinnedUsersList); } catch (e) {} }
}

function savePinnedUsers() { try { localStorage.setItem("friendsList_pinned_v2", JSON.stringify(pinnedUsersList)); } catch (e) {} }
function isPinned(friendId) { return pinnedUsers.has(friendId); }

function togglePin(friendId) {
  if (pinnedUsers.has(friendId)) { pinnedUsers.delete(friendId); const idx = pinnedUsersList.indexOf(friendId); if (idx > -1) pinnedUsersList.splice(idx, 1); }
  else { pinnedUsers.add(friendId); pinnedUsersList.push(friendId); }
  savePinnedUsers(); sortFriendsList(); updateAllPinButtons(); return isPinned(friendId);
}

function updateAllPinButtons() {
  document.querySelectorAll(".friend-pin-btn").forEach(btn => { const id = btn.getAttribute("data-friend-id"); if (id) btn.innerHTML = getPinSvg(isPinned(id)); });
}

function getPinSvg(isPinnedFlag) {
  return isPinnedFlag
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff4d4d"/><stop offset="100%" stop-color="#ff0000"/></linearGradient></defs><path d="M12 22C12 22 19 15.5 19 10.5C19 6.35786 15.6421 3 11.5 3C7.35786 3 4 6.35786 4 10.5C4 15.5 12 22 12 22Z" fill="url(#pinGradient)" stroke="#b30000" stroke-width="1.2" stroke-linejoin="round"/><circle cx="11.5" cy="10.5" r="3" fill="#ffffff" stroke="#ff4d4d" stroke-width="1"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><path d="M12 22C12 22 19 15.5 19 10.5C19 6.35786 15.6421 3 11.5 3C7.35786 3 4 6.35786 4 10.5C4 15.5 12 22 12 22Z" fill="none" stroke="#888888" stroke-width="1.5" stroke-linejoin="round"/><circle cx="11.5" cy="10.5" r="3" fill="none" stroke="#888888" stroke-width="1.2"/></svg>';
}

function addPinButton(friendElement, friendId) {
  if (friendElement.querySelector(".friend-pin-btn")) return;
  const friendRight = friendElement.querySelector(".friend-right"); if (!friendRight) return;
  const addDelete = friendRight.querySelector(".add-delete"); if (!addDelete) return;
  if (addDelete.querySelector(".add")) return;
  const pinBtn = document.createElement("div");
  pinBtn.className = "friend-pin-btn"; pinBtn.setAttribute("data-friend-id", friendId);
  pinBtn.style.cssText = "cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:4px;transition:all 0.2s ease;background-color:transparent;margin-right:8px;vertical-align:middle;";
  pinBtn.innerHTML = getPinSvg(isPinned(friendId));
  pinBtn.addEventListener("mouseenter", () => { pinBtn.style.transform = "scale(1.1)"; });
  pinBtn.addEventListener("mouseleave", () => { pinBtn.style.transform = "scale(1)"; });
  pinBtn.addEventListener("click", (e) => { e.stopPropagation(); pinBtn.innerHTML = getPinSvg(togglePin(friendId)); });
  const deleteBtn = addDelete.querySelector(".delete");
  if (deleteBtn) addDelete.insertBefore(pinBtn, deleteBtn);
}

function getFriendId(friendElement) {
  return friendElement.querySelector(".friend-id")?.textContent.trim() || null;
}

function sortFriendsList() {
  const listContainer = document.querySelector(".friends .allo .list"); if (!listContainer) return;
  const friends = Array.from(listContainer.querySelectorAll(".friend")); if (!friends.length) return;
  const pinned = [], unpinned = [];
  friends.forEach(f => { const id = getFriendId(f); if (id && isPinned(id)) pinned.push(f); else unpinned.push(f); });
  const sorted = [...pinned, ...unpinned];
  let needsReorder = false;
  for (let i = 0; i < sorted.length; i++) { if (listContainer.children[i] !== sorted[i]) { needsReorder = true; break; } }
  if (needsReorder) sorted.forEach(f => listContainer.appendChild(f));
}

function processFriendsList() {
  const listContainer = document.querySelector(".friends .allo .list"); if (!listContainer) return;
  listContainer.querySelectorAll(".friend").forEach(friend => { const id = getFriendId(friend); if (id) addPinButton(friend, id); });
  sortFriendsList();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SPECTATE BUTTON + FRIENDS SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function addSpectateButton(div) {
  if (div.nextElementSibling?.classList.contains("spectate-eye")) return;
  const match = div.textContent.match(/\[(.*?)\]/); const code = match?.[1]; if (!code) return;
  const eyeDiv = document.createElement("div"); eyeDiv.className = "spectate-eye";
  eyeDiv.innerHTML = '<i class="fa-solid fa-eye"></i>';
  eyeDiv.style.cssText = "cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-left:8px;padding:4px;background:#2f3957;border-radius:4px;color:#ffb914;transition:all 0.2s ease;";
  eyeDiv.addEventListener("mouseenter", () => { eyeDiv.style.background = "#3e4d7c"; eyeDiv.style.transform = "scale(1.05)"; });
  eyeDiv.addEventListener("mouseleave", () => { eyeDiv.style.background = "#2f3957"; eyeDiv.style.transform = "scale(1)"; });
  div.insertAdjacentElement("afterend", eyeDiv);
  eyeDiv.addEventListener("click", async (e) => {
    e.stopPropagation();
    document.querySelector(".home")?.click();
    setTimeout(() => {
      document.querySelector(".join-btn")?.click();
      setTimeout(() => {
        const input = document.querySelector(".input");
        if (input) { input.value = code; input.dispatchEvent(new Event("input", { bubbles: true })); document.querySelector(".btn:nth-child(2)")?.click(); }
      }, 500);
    }, 500);
  });
}

function addSpectateButtons() {
  document.querySelectorAll(".online").forEach(div => { if (div.textContent.trim().toLowerCase().includes("in game")) addSpectateButton(div); });
}

function createSearchFilter() {
  const addFriends = document.querySelector(".friends > .add-friends"); if (!addFriends || addFriends.querySelector(".search-friends")) return;
  const searchFriends = document.createElement("div"); searchFriends.className = "search-friends";
  searchFriends.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;margin-top:1.5rem;padding:0 1rem;";
  searchFriends.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;width:100%;"><span style="color:#fff;">Search Friends</span><span style="color:#888;font-size:0.75rem;">Press Enter to search</span></div><input type="text" placeholder="ENTER USERNAME OR ID" class="search-input" style="border:.125rem solid #202639;outline:none;background:#2f3957;width:100%;height:2.875rem;padding-left:.5rem;box-sizing:border-box;font-weight:600;font-size:1rem;color:#f2f2f2;box-shadow:0 1px 2px rgba(0,0,0,.4),inset 0 0 8px rgba(0,0,0,.4);border-radius:.25rem;"/>';
  addFriends.appendChild(searchFriends);
  searchFriends.querySelector(".search-input").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".friend").forEach(friend => {
      const nick = friend.querySelector(".nickname")?.innerText.toLowerCase() || "";
      const sid = friend.querySelector(".friend-id")?.innerText.toLowerCase() || "";
      friend.style.display = (nick.includes(query) || sid.includes(query)) ? "flex" : "none";
    });
  });
}

function reinitializeFriends() {
  if (!window.location.href.includes("/friends")) return;
  document.querySelectorAll(".spectate-eye").forEach(btn => btn.remove());
  addSpectateButtons(); createSearchFilter();
  const fc = document.querySelector(".friends > .content > .allo");
  if (fc) new MutationObserver(() => addSpectateButtons()).observe(fc, { childList: true, subtree: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

function handleLobby() {
  injectFontAwesome();
  setTimeout(() => { applyLobbyCustomizations(); juiceDiscordButton(); juiceSmudgyButton(); lobbyNews(); }, 500);
  observeForElement(".heads .nickname", applyLobbyCustomizations);
  observeForElement(".heads .head-right", applyLobbyCustomizations);
  observeForElement(".player-cont", applyLobbyCustomizations);
  observeForElement("#team-section", applyLobbyCustomizations);
  observeForElement("#left-interface", () => lobbyNews());
}

function handleInGame() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    if (!document.querySelector(".desktop-game-interface")) { clearInterval(gameInterval); gameInterval = null; return; }
    observeShortIds(); applyTabCustomizations();
    document.querySelectorAll(".desktop-game-interface .player-list").forEach(list => {
      if (list.dataset.kbObserver) return; list.dataset.kbObserver = "true";
      new MutationObserver(() => { observeShortIds(); applyTabCustomizations(); }).observe(list, { childList: true, subtree: false });
    });
  }, 1000);
  observeForElement(".esc-interface", () => applyEscCustomizations());
}

function handleProfile() {
  activeBioTextBadgeId = null;
  const tryApply = () => {
    if (document.querySelector(".tab-content .statistics")) { applyProfileCustomizations(); injectBioTextBadge(); }
    else setTimeout(tryApply, 50);
  };
  tryApply();
  observeForElement(".tab-content", () => { setTimeout(() => { applyProfileCustomizations(); activeBioTextBadgeId = null; injectBioTextBadge(); }, 100); });
}

function handleFriends() {
  if (friendsInterval) clearInterval(friendsInterval);
  loadPinnedUsers();
  reinitializeFriends();
  const checkInterval = setInterval(() => {
    const lc = document.querySelector(".friends .allo .list");
    if (lc) {
      clearInterval(checkInterval); processFriendsList(); createSearchFilter();
      const obs = new MutationObserver(() => processFriendsList());
      obs.observe(lc, { childList: true, subtree: true });
      const fc = document.querySelector(".friends"); if (fc) obs.observe(fc, { childList: true, subtree: true });
    }
  }, 500);
  setTimeout(() => clearInterval(checkInterval), 30000);
  friendsInterval = setInterval(() => {
    if (!window.location.href.startsWith(`${BASE_URL}friends`)) { clearInterval(friendsInterval); friendsInterval = null; return; }
    applyFriendsCustomizations(); addSpectateButtons(); processFriendsList();
  }, 500);
}

function routeCurrentPage() {
  const url = window.location.href;
  if (url === BASE_URL || url === `${BASE_URL}#` || url === BASE_URL.slice(0, -1)) handleLobby();
  if (url.startsWith(`${BASE_URL}games`)) handleInGame();
  if (url.startsWith(`${BASE_URL}profile/`)) handleProfile();
  if (url.startsWith(`${BASE_URL}friends`)) handleFriends();
  if (url.startsWith(`${BASE_URL}servers/`)) handleServers();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SPA URL CHANGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    activeBioTextBadgeId = null;
    routeCurrentPage();
    setTimeout(initChatCommands, 600);
    setTimeout(applyAllFonts, 500);
    setTimeout(injectAllSubnames, 300);
    setTimeout(injectAllSubnames, 800);
  }
}).observe(document.body, { childList: true, subtree: true });

const _pushState = history.pushState.bind(history);
history.pushState = (...args) => {
  _pushState(...args);
  activeBioTextBadgeId = null;
  setTimeout(() => { routeCurrentPage(); setTimeout(initChatCommands, 600); setTimeout(applyAllFonts, 500); setTimeout(injectAllSubnames, 300); }, 200);
};
window.addEventListener("popstate", () => {
  activeBioTextBadgeId = null;
  setTimeout(() => { routeCurrentPage(); setTimeout(initChatCommands, 600); setTimeout(applyAllFonts, 500); setTimeout(injectAllSubnames, 300); }, 200);
});

// Badges page URL watcher (polls until DOM is ready)
setInterval(() => {
  if (window.location.pathname.includes("/badges") && !isApplied) {
    const contentDiv = document.querySelector("[data-v-112b925e].content");
    if (contentDiv) { matchKATStyle(); fixDiscordButton(); }
  }
  if (!window.location.pathname.includes("/badges")) fixDiscordButton();
}, 300);

// Shift+click profile navigation
document.addEventListener("click", (e) => {
  if (e.shiftKey && e.target.classList.contains("author-name")) {
    setTimeout(() => { navigator.clipboard.readText().then(text => { window.location.href = `${BASE_URL}profile/${text.replace("#", "")}`; }).catch(() => {}); }, 250);
  }
});

window.addEventListener("beforeunload", savePinnedUsers);

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  injectStyles();
  applyDefaultCSS();
  await Promise.all([fetchData(), fetchBioTextData(), fetchSubnamesData()]);
  setupFontObservers();
  watchBioTextDOMChanges();
  startBioTextPeriodicCheck();
  startSubnamePersistence();
  await initMentions();
  addChatCommandStyles();
  initChatCommands();
  applyAllFonts();
  routeCurrentPage();
  fixDiscordButton();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

console.log("Smudgy Client — combined.js loaded");
