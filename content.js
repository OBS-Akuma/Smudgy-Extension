// ═══════════════════════════════════════════════════════════════════════════════
//  Kirka Badges — content.js
//  Features: player badges/gradients, lobby news, Discord button, Smudgy button,
//             biotext custom badge overlay on profiles, mentions system,
//             custom font system (direct files + Google Fonts)
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_URL = "https://kirka.io/";

let customizations = null;
let currentUser = null;
let settings = { 
  customizations: true, 
  animations: true, 
  serverMaps: true, 
  defaultCSS: true,
  hitmarker_link: "",
  killicon_link: "",
  ui_animations: true,
  rave_mode: false,
  lobby_keybind_reminder: true,
  spectate_button: true,
  hide_chat: false,
  hide_interface: false,
  skip_loading: false
};

// ─── Custom CSS Variables ─────────────────────────────────────────────────────

let injectedStyleElement = null;
let injectedLinkElement = null;
let injectedDefaultStyleElement = null;
let addedStyles = null;

// ═══════════════════════════════════════════════════════════════════════════════
//  CUSTOM FONT SYSTEM — supports direct font files AND Google Fonts
// ═══════════════════════════════════════════════════════════════════════════════

let fontData = null;
let loadedFonts = new Map();

function isGoogleFontsUrl(url) {
  return url.includes('fonts.googleapis.com/css');
}

async function loadUserFont(shortId, fontUrl) {
  if (loadedFonts.has(shortId)) return loadedFonts.get(shortId);

  const fontFamily = `custom-font-${shortId.toLowerCase()}`;

  if (document.querySelector(`style[data-font-user="${shortId}"]`)) {
    loadedFonts.set(shortId, fontFamily);
    return fontFamily;
  }

  if (isGoogleFontsUrl(fontUrl)) {
    try {
      const response = await fetch(fontUrl);
      const css = await response.text();
      const modifiedCss = css.replace(/font-family: ['"]([^'"]+)['"]/g, `font-family: '${fontFamily}'`);
      const style = document.createElement('style');
      style.setAttribute('data-font-user', shortId);
      style.setAttribute('data-font-type', 'google');
      style.textContent = modifiedCss;
      document.head.appendChild(style);
    } catch (error) {
      return null;
    }
  } else {
    const style = document.createElement('style');
    style.setAttribute('data-font-user', shortId);
    style.setAttribute('data-font-type', 'direct');
    let format = 'truetype';
    if (fontUrl.endsWith('.woff2')) format = 'woff2';
    else if (fontUrl.endsWith('.woff')) format = 'woff';
    else if (fontUrl.endsWith('.otf')) format = 'opentype';
    style.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('${fontUrl}') format('${format}');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }

  loadedFonts.set(shortId, fontFamily);
  return fontFamily;
}

function getUserFont(shortId) {
  if (!fontData || !shortId) return null;
  const userData = fontData.find(u => u.shortId === shortId);
  if (userData && userData.font) {
    return loadUserFont(shortId, userData.font);
  }
  return null;
}

function applyFontToElement(element, shortId) {
  if (!shortId) return false;
  const fontFamilyPromise = getUserFont(shortId);
  if (!fontFamilyPromise) return false;
  fontFamilyPromise.then(fontFamily => {
    if (!fontFamily) return;
    if (element.dataset.customFontApplied === shortId) return;
    element.style.fontFamily = `'${fontFamily}', 'Belikan', 'Omnitrinx', sans-serif`;
    element.style.display = 'inline-block';
    element.style.transform = 'scaleY(0.85)';
    element.style.transformOrigin = 'center center';
    element.dataset.customFontApplied = shortId;
  });
  return true;
}

function applyLobbyFont() {
  const avatarUsernameEl = document.querySelector(".avatar-info .username");
  const shortIdCard = avatarUsernameEl?.textContent.trim().split("#")[1] || null;
  if (!shortIdCard) return;
  const lobbyNickname =
    document.querySelector(".team-section .heads .nickname") ||
    document.querySelector(".heads .head-right .nickname") ||
    document.querySelector(".heads .nickname");
  if (lobbyNickname && lobbyNickname.dataset.customFontApplied !== shortIdCard) {
    applyFontToElement(lobbyNickname, shortIdCard);
  }
}

function applyProfileFont() {
  const profile = document.querySelector(".tab-content > .profile-cont > .profile");
  if (!profile) return;
  const shortIdRaw = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim();
  if (!shortIdRaw) return;
  const shortId = shortIdRaw.split("#")[1];
  if (!shortId) return;
  const nickname = profile.querySelector(".nickname");
  if (!nickname) return;
  let textSpan = nickname.querySelector('.kirka-nickname-span');
  if (!textSpan) {
    const textNode = nickname.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      textSpan = document.createElement("span");
      textSpan.className = "kirka-nickname-span";
      textSpan.textContent = textNode.textContent;
      nickname.replaceChild(textSpan, textNode);
    }
  }
  const targetElement = textSpan || nickname;
  if (targetElement.dataset.customFontApplied !== shortId) {
    applyFontToElement(targetElement, shortId);
  }
}

function applyTabFonts() {
  const tabPlayers = document.querySelectorAll(".desktop-game-interface .player-cont");
  tabPlayers.forEach(player => {
    const nickname = player.querySelector(".nickname");
    const shortIdElem = player.querySelector(".short-id");
    if (nickname && shortIdElem) {
      const shortId = shortIdElem.innerText.replace("#", "");
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applyEscFonts() {
  const escPlayers = document.querySelectorAll(".esc-interface .player-cont");
  escPlayers.forEach(player => {
    const playerIds = player.querySelector(".player-name");
    if (!playerIds) return;
    const nickname = playerIds.querySelector(".nickname");
    const shortIdElem = nickname?.querySelector(".short-id");
    if (nickname && shortIdElem) {
      const shortId = shortIdElem.innerText.replace("#", "");
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applyFriendsFonts() {
  const friends = document.querySelectorAll(".friend");
  friends.forEach(friend => {
    const nickname = friend.querySelector(".nickname");
    const shortIdElem = friend.querySelector(".friend-id");
    if (nickname && shortIdElem) {
      const shortId = shortIdElem.innerText;
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applyLeaderboardFonts() {
  const leaderboardPlayers = document.querySelectorAll(".leaderboard .player-name, .rankings .player-name");
  leaderboardPlayers.forEach(player => {
    const shortIdElem = player.querySelector(".short-id, [data-short-id]");
    const nickname = player.querySelector(".nickname, .username");
    if (nickname && shortIdElem) {
      let shortId = shortIdElem.innerText.replace("#", "");
      if (!shortId && shortIdElem.getAttribute) {
        shortId = shortIdElem.getAttribute('data-short-id');
      }
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applyChatFonts() {
  const chatMessages = document.querySelectorAll(".chat-message .username, .message .author-name, .chat .author");
  chatMessages.forEach(username => {
    let shortId = null;
    const text = username.textContent;
    const hashMatch = text.match(/#([A-Z0-9]+)/i);
    if (hashMatch) shortId = hashMatch[1];
    if (shortId && username.dataset.customFontApplied !== shortId) {
      applyFontToElement(username, shortId);
    }
  });
}

function applyTeamFonts() {
  const teamPlayers = document.querySelectorAll(".team-player .name, .scoreboard .player-name");
  teamPlayers.forEach(player => {
    const shortIdElem = player.querySelector(".short-id");
    const nickname = player.querySelector(".nickname");
    if (nickname && shortIdElem) {
      const shortId = shortIdElem.innerText.replace("#", "");
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applySpectateFonts() {
  const spectateName = document.querySelector(".spectate-name, .spectating .player-name");
  if (spectateName) {
    const shortIdElem = spectateName.querySelector(".short-id");
    if (shortIdElem) {
      const shortId = shortIdElem.innerText.replace("#", "");
      if (shortId && spectateName.dataset.customFontApplied !== shortId) {
        applyFontToElement(spectateName, shortId);
      }
    }
  }
}

function applyTradeFonts() {
  const tradePlayers = document.querySelectorAll(".trade-participant .name, .trade-offer .player-name");
  tradePlayers.forEach(player => {
    const shortIdElem = player.querySelector(".short-id");
    const nickname = player.querySelector(".nickname");
    if (nickname && shortIdElem) {
      const shortId = shortIdElem.innerText.replace("#", "");
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applyPartyFonts() {
  const partyMembers = document.querySelectorAll(".party-member .name, .group .player-name");
  partyMembers.forEach(member => {
    const shortIdElem = member.querySelector(".short-id");
    const nickname = member.querySelector(".nickname");
    if (nickname && shortIdElem) {
      const shortId = shortIdElem.innerText.replace("#", "");
      if (shortId && nickname.dataset.customFontApplied !== shortId) {
        applyFontToElement(nickname, shortId);
      }
    }
  });
}

function applyAllFonts() {
  if (!fontData) return;
  applyLobbyFont();
  applyProfileFont();
  applyTabFonts();
  applyEscFonts();
  applyFriendsFonts();
  applyLeaderboardFonts();
  applyChatFonts();
  applyTeamFonts();
  applySpectateFonts();
  applyTradeFonts();
  applyPartyFonts();
}

function setupFontObservers() {
  const mainObserver = new MutationObserver(() => {
    setTimeout(applyAllFonts, 100);
  });
  mainObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MENTIONS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

let myShortId = null;
let myUsername = null;
let mentions = [];
let ws = null;
let mentionsPanel = null;
let mentionsTab = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 20;
let inventoryObserver = null;

async function fetchMyUserData() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const response = await fetch('https://api2.kirka.io/api/wNmwWMWn', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return false;
    const data = await response.json();
    myShortId = data.wMWWm;
    myUsername = data.wNmnw;
    return true;
  } catch (error) {
    return false;
  }
}

function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket('wss://chat.kirka.io');
  ws.onopen = () => {
    reconnectAttempts = 0;
    const token = localStorage.getItem('token');
    if (token) {
      ws.send(JSON.stringify({ type: 'auth', token: token }));
    }
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 2 && data.user && data.message) {
        const senderShortId = data.user.shortId;
        const senderName = data.user.name;
        const message = data.message;
        if (senderShortId !== myShortId && isPingingMe(message)) {
          addMention(senderName, senderShortId, message);
        }
      }
    } catch (e) {}
  };
  ws.onerror = () => {};
  ws.onclose = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      const delay = Math.min(1000 * reconnectAttempts, 10000);
      setTimeout(() => connectWebSocket(), delay);
    }
  };
}

function isPingingMe(message) {
  if (!myShortId && !myUsername) return false;
  if (myShortId && message.includes(`#${myShortId}`)) return true;
  if (myUsername && message.toLowerCase().includes(`@${myUsername.toLowerCase()}`)) return true;
  return false;
}

function addMention(author, shortId, message) {
  const mention = {
    id: Date.now(),
    author: author,
    shortId: shortId,
    message: message.substring(0, 200),
    time: new Date().toLocaleTimeString()
  };
  mentions.unshift(mention);
  if (mentions.length > 100) mentions = mentions.slice(0, 100);
  saveMentions();
  renderMentionsPanel();
  updateMentionBadge();
  if (mentionsTab) {
    mentionsTab.style.transition = 'background 0.3s';
    mentionsTab.style.background = 'rgba(255, 185, 20, 0.3)';
    setTimeout(() => {
      if (mentionsTab) mentionsTab.style.background = '';
    }, 500);
  }
}

function deleteMention(id) {
  mentions = mentions.filter(m => m.id !== id);
  saveMentions();
  renderMentionsPanel();
  updateMentionBadge();
}

function clearAllMentions() {
  if (confirm('Clear all mentions?')) {
    mentions = [];
    saveMentions();
    renderMentionsPanel();
    updateMentionBadge();
    const badge = document.querySelector('.mentions-tab .mention-badge');
    if (badge) badge.remove();
  }
}

function saveMentions() {
  localStorage.setItem('kirka-mentions', JSON.stringify(mentions));
}

function loadMentions() {
  const saved = localStorage.getItem('kirka-mentions');
  if (saved) {
    try { mentions = JSON.parse(saved); } catch(e) {}
  }
}

function updateMentionBadge() {
  const titleDiv = document.querySelector('.mentions-tab .title');
  if (titleDiv) {
    const existingBadge = titleDiv.querySelector('.mention-badge');
    if (existingBadge) existingBadge.remove();
    if (mentions.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'mention-badge';
      badge.textContent = mentions.length;
      badge.style.cssText = `
        background: #ef4444; color: white; border-radius: 10px; padding: 0 6px;
        margin-left: 8px; font-size: 11px; font-weight: 600; display: inline-flex;
        align-items: center; justify-content: center; min-width: 18px; height: 18px;
      `;
      titleDiv.appendChild(badge);
    }
  }
  updateInventoryIconBadge();
}

function updateInventoryIconBadge() {
  const inventoryBtn = document.querySelector('.icon-btn.INVENTORY');
  if (!inventoryBtn) return;
  const wrapper = inventoryBtn.querySelector('.wrapper');
  if (wrapper) wrapper.style.position = 'relative';
  let badge = inventoryBtn.querySelector('.kirka-inventory-mention-badge');
  if (mentions.length === 0) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'kirka-inventory-mention-badge';
    badge.style.cssText = `
      position: absolute; top: -4px; right: -4px; background: #ef4444; color: white;
      border-radius: 10px; padding: 0 5px; font-size: 10px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 16px; height: 16px; z-index: 999; pointer-events: none;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4); line-height: 1;
    `;
    (wrapper || inventoryBtn).appendChild(badge);
  }
  badge.textContent = mentions.length > 99 ? '99+' : mentions.length;
}

function addMentionsStyles() {
  if (document.querySelector('#kirka-mentions-styles')) return;
  const style = document.createElement('style');
  style.id = 'kirka-mentions-styles';
  style.textContent = `
    .daily-rewards-btn, .special-message-home { display: none !important; }
    #app>div.interface.text-2>div.background::before {
      content: "smu dgy"; font-family: 'pln'; letter-spacing: 5px;
      position: absolute !important; top: 50% !important; left: 48% !important;
      transform: translate(-48%, -50%) !important; font-size: 6.9rem; white-space: nowrap;
    }
    @font-face {
    font-family: 'pln';
    src: url('data:font/woff;charset=utf-8;base64,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AGUAZwBpAGgAagCKAGsAbQBsAG4AbwBxAHAAcgBzAJ4AdAB2AHUAdwB5AHgAmACLAHsAegB8AH0AoACiAKMAkgCTABAAlgCXAJkAlACVAJoAfgCDAJAAmwChAAAAAAABAAAEagABALoAKgAHBDIACABV/p0ACABW/rsAEgAfALkAEgAhAQkAEgBWAA8AIwBE/+wAIwBF/+IAIwBH/+IAIwBL/+IAIwBQ/+wAIwBR/+cAIwBS/+wAIwBT//EAIwBU/+cAIwBV/+wAIwBX/+wAKAAKAF8AKABLAG4AKABR//EAKACUAH0AKQBU/9MAKgBA/9MAKgBE/+IAKgBO/+IAKwBGAA8AMQBB/4MANABE/+IANABI/+IANABO/+IANQBA//EANQBO//EANQBQ//EANgAKAF8ANgBHAH0ANgBWAB4ANgBYAA8ANgBlAB4ANgBoAJsANgCUAIwANwBGAA8ANwBMAA8ANwBNAA8ANwBPAA8AOwBA/+IAOwBE/+IAOwBI/+IAOwBO/+IAQABGAA8AQABMAA8AQABPAA8AQABWAA8AQABZAAoAQQBF//sAQQBS/+cAQgBKAAoAQgBYAA8AQwBA//EAQwBB/5IARABA//EARABWAB4ARQAFAJsARQAIAKoARQAJAH0ARQAKAF8ARQANADwARQASAH0ARQAfAVQARQAhAisARQAiAe8ARQBBAFoARQBCAA8ARQBFAFAARQBGABQARQBHAFoARQBJAAUARQBKAF8ARQBLAH0ARQBMABQARQBNAA8ARQBOAA8ARQBPABQARQBTAFoARQBUAAoARQBVAA8ARQBWAB4ARQBYAA8ARQBZABkARQBoAFUARQBqAFoARQCCAIwARQCKAAoARQCLAA8ARQCUAH0ARQCVAFUARgBGAA8ARgBMAA8ARgBNAA8ARgBZAB4ARwBA//EARwBI/+wARwBO//EARwBU/+IASABGAA8ASABMAA8ASABR//EASQBTABQASgBPAA8ASgBWAB4ASwAIAC0ASwAiARgASwBPAA8ASwBWAA8ATABBAAoATABIAA8ATABMAA8ATABNAA8ATABPAA8ATABTAAoATgBF//YATgBL/+IATgBWAA8ATwBE//sATwBF//EATwBL/+wATwBR//YATwBT//YAUABU//EAUQBCAA8AUQBEAAoAUQBFAA8AUQBGAA8AUQBMAB4AUQBNAA8AUQBPAA8AUgBQ//YAUgBS//YAUgBT//EAUwAFAC0AUwAIAEsAUwAJAB4AUwAKABQAUwAN/9MAUwAR/9MAUwASAB4AUwAfAPUAUwAhAScAUwAiAWMAUwBA/7UAUwBC/8kAUwBD/8QAUwBE/8kAUwBHAA8AUwBI/78AUwBJ/9gAUwBN/8QAUwBO/8kAUwBP/8kAUwBQ/8QAUwBR/7UAUwBS/84AUwBTAB4AUwBU/84AUwBV/8QAUwBX/8QAUwBY/8kAUwBZ/9gAUwBoAC0AUwBqAB4AUwCCADwAUwCK/9gAUwCL/84AUwCUAB4AVABMAA8AVABNAA8AVABPAA8AVQCLAA8AVgBMAB4AVgBNAA8AVgCLAA8AWQBA//EAZQBF/+IAZwAiAVQAaAAiAUUAaABFAAoAagAiAXIAiwBL//EAAAAAABAAAACoCQsFAAQEAwcJBwoJAwYGBwcECAQEBwMHBwcHBwcHBwQEBQcEBwcHBwcHAwcHAwQHAwsHBwgHBwcDBwYKBwcHBgcGBwcHBwcEBwcEAwcECwcHBwcHBwQHBwsHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHAwcHBwcLBwcHBwcHBAcHBwcHBwcHBwcHBwcHBwcHBwAACgwFAAUFBAgKCAsKBAcHBwgECAQECAQICAgICAgICAQEBggECAgICAgIBAgIBAQIBAwICAkICAgECAcLCAgIBggGCAgICAgECAgEBAgEDAgICAgICAQICAwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBAgICAgMCAgICAgIBQgICAgICAgICAgICAgICAgICAAACw4GAAUFBAkLCQwLBAcHCAkECQQECQQJCQkJCQkJCQQEBggFCQkJCQkJBAkJBAUJBA4JCQkJCQkECQcMCQkJBwkHCQkJCQkECQkEBAkEDgkJCQkJCQUJCQ0JCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJBAkJCQkOCQkJCQkJBQkJCQkJCQkJCQkJCQkJCQkJCQAADA8GAAYGBQoMCg0MBQgICQoFCgUFCgUKCgoKCgoKCgUFBwkFCgoKCgoKBQoKBQUKBQ8KCgoKCgoECggNCgoKCAoHCgoKCgoFCgoFBQoFDwoKCgoKCgUKCg8KCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKBAoKCgoPCgoKCgoKBgoKCgoKCgoKCgoKCgoKCgoKCgAADRAHAAYGBQsNCw4NBQkJCgoFCwUFCwUKCgoLCwsLCwUFBwoGCwsKCgoKBQoLBQYLBRALCwsLCwsFCgkOCgsLCAsICwsKCwsFCwsFBQoFEAsLCwsLCwYLCxALCwsLCwsLCwsLCwsLCwsLCwoLCgsLCwsLCwsLCwsLCwsLCwsLCwsLCwsKCgsLBQsLCwsQCgsLCwsLBgsLCwsLCwsLCwsLCwsLCwsLCwAADhEHAAcHBQsODBAOBQkJCgsFDAUGDAULCwsLDAsMDAYGCAsGDAsLCwsLBQsMBQYMBREMDAwMDAwFCwkPCwwMCQwJDAwLCwsFCwwGBQsGEQsMCwwLDAYLCxELDAwMDAwMDAwMDAwMDAwMDAsMCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwLCwwMBQwMDAwRCwwMDAwMBwwMDAwMDAwMDAwMDAwMDAwMDAAADxMIAAcHBgwPDBEPBgoKCwwGDQYGDAYMDAwMDAwMDAYGCAsGDAwMDAwMBgwMBgYMBhMMDA0MDAwGDAoQDAwMCQwJDAwMDAwGDAwGBgwGEgwMDAwMDAcMDBIMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMBQwMDAwTDAwMDAwMBwwMDAwMDAwMDAwMDAwMDAwMDAAAEBQIAAgIBg0QDRIQBgsLDA0GDQYGDQYNDQ0NDQ0NDQYGCQwHDQ0NDQ0NBg0NBgcNBhQNDQ4NDQ0GDQsRDQ0NCg0KDQ0NDQ0GDQ0GBg0GFA0NDQ0NDQcNDRQNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NBg0NDQ0UDQ0NDQ0NCA0NDQ0NDQ0NDQ0NDQ0NDQ0NDQAAERUJAAgIBg4RDhMRBgsLDQ4HDgcHDgYODg4ODg4ODgcHCQ0HDg4ODg4OBg4OBwcOBxUODg8ODg4GDgsSDg4OCw4KDg4ODg4HDg4HBg4HFQ4ODg4ODggODhUODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODQ4OBg4ODg4VDg4ODg4OCA4ODg4ODg4ODg4ODg4ODg4ODgAAEhYJAAkJBw8SDxQSBwwMDQ4HDwcHDwcODg4PDw8PDwcHCg4IDw8ODg4OBw4PBwgPBxYPDw8PDw8HDgwTDg8PCw8LDw8ODw8HDw8HBw4HFg8PDw8PDwgPDxYPDw8PDw8PDw8PDw8PDw8PDw4PDg8PDw8PDw8PDw8PDw8PDw8PDw8PDw8ODg8PBg8PDw8WDg8PDw8PCQ8PDw8PDw8PDw8PDw8PDw8PDwAAExgKAAkJBw8TEBUTBw0NDg8HEAcIEAcPDw8QEA8QEAgICg4IEA8PDw8PBw8QBwgQBxcQEBAQEBAHDw0VDxAQDBAMEBAPDw8HDxAHBw8HFw8QEBAPEAgQDxcPEBAQEBAQEBAQEBAQEBAQEA8QDxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAPDxAQBxAQEBAYDxAQEBAQCRAQEBAQEBAQEBAQEBAQEBAQEAAAFBkKAAoKCBAUERYUCA0NDxAIEQgIEQgQEBAQERAREQgICw8JERAQEBAQCBARCAkRCBkREREREREHEA0WEBERDREMEREQEBAIEBEICBAIGRAREBEQEQkQEBgQERERERERERERERERERERERAREBEREREREREREREREREREREREREREREQEBERBxEREREZEBERERERChEREREREREREREREREREREREQAAFRoLAAoKCBEVERcVCA4ODxEIEggIEQgREREREREREQgIDBAJERERERERCBERCAkRCBoRERIREREIEQ4XERERDRENEREREREIEREICBEIGhEREREREQkRERoRERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERCBEREREaERERERERChEREREREREREREREREREREREQAAFhsLAAsLCBIWEhgWCA8PEBIJEgkJEggREhISEhISEgkJDBEJEhISEhISCBESCAkSCBsSEhMSEhIIEg8YERISDhIOEhISEhIJEhIJCBIJGxISEhISEgoSEhsSEhISEhISEhISEhISEhISEhESEhISEhISEhISEhISEhISEhISEhISEhIRERISCBISEhIbEhISEhISCxISEhISEhISEhISEhISEhISEgAAFx0MAAsLCRMXExoXCQ8PERMJEwkJEwkSExMTExMTEwkJDREKExMTExMTCRITCQoTCRwTExQTExMIEw8ZEhMTDhMOExMTExMJExMJCRMJHBMTExMTEwoTExwTExMTExMTExMTExMTExMTExITExMTExMTExMTExMTExMTExMTExMTExMSEhMTCBMTExMdExMTExMTCxMTExMTExMTExMTExMTExMTEwAAGB4MAAwMCRMYFBsYCRAQEhMJFAkKFAkTExMUFBQUFAoKDRIKFBQTExMTCRMUCQoUCR4UFBUUFBQJExAaExQUDxQPFBQTFBQJFBQJCRMJHRQUFBQUFAsUEx0TFBQUFBQUFBQUFBQUFBQUFBMUExQUFBQUFBQUFBQUFBQUFBQUFBQUFBQTExQUCRQUFBQeExQUFBQUDBQUFBQUFBQUFBQUFBQUFBQUFAAAAAACvQGQAAUAAQK8AooAAACPArwCigAAAcUAMgEDAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEFsdHMAQAAgIhID8P2CAAAD8AJ+AAAAAQAAAAEAAAirhdtfDzz1AAAD6AAAAACygd2VAAAAALKB3ZX/RP2CBbMD8AAAAAMAAgABAAAAAAABAAAD8P2CAAAE3P9E/YgFswABAAAAAAAAAAAAAAAAAAAApAABAAAApACDAAQAAAAAAAIACABAAAoAAAB2APgAAQAB');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
    
    .kirka-mentions-panel {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 500px; max-width: 90vw; height: 550px; max-height: 80vh;
      background: #1a1a2e; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5); z-index: 10000;
      display: none; flex-direction: column; overflow: hidden;
    }
    .kirka-mentions-panel .panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; background: #0f0f1a; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
    }
    .kirka-mentions-panel .panel-header h3 { margin: 0; color: #ffb914; font-size: 18px; font-weight: 600; }
    .kirka-mentions-panel .panel-actions { display: flex; gap: 12px; align-items: center; }
    .kirka-mentions-panel .kirka-button {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.2s ease; background: var(--blue-4, #2a3a6e); color: white; overflow: hidden;
    }
    .kirka-mentions-panel .kirka-button::before {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%); pointer-events: none;
    }
    .kirka-mentions-panel .kirka-button-danger { background: var(--red-5, #8b2c2c); }
    .kirka-mentions-panel .kirka-button-danger:hover { background: var(--red-4, #a33a3a); transform: translateY(-1px); }
    .kirka-mentions-panel .kirka-button:hover { transform: translateY(-1px); filter: brightness(1.05); }
    .kirka-mentions-panel .kirka-button:active { transform: translateY(0); }
    .kirka-mentions-panel .panel-close {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px; color: #aaa; cursor: pointer; padding: 6px 12px;
      transition: all 0.2s; font-weight: 600;
    }
    .kirka-mentions-panel .panel-close:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }
    .kirka-mentions-panel .mentions-list-container { flex: 1; overflow-y: auto; padding: 16px; }
    .kirka-mentions-panel .mention-item {
      background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; margin-bottom: 12px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
      border-left: 3px solid #ffb914; transition: background 0.2s;
    }
    .kirka-mentions-panel .mention-item:hover { background: rgba(255,255,255,0.06); }
    .kirka-mentions-panel .mention-author { font-weight: 600; color: #ffb914; }
    .kirka-mentions-panel .mention-shortid { font-size: 11px; color: #666; }
    .kirka-mentions-panel .mention-time { font-size: 11px; color: #555; }
    .kirka-mentions-panel .mention-message { font-size: 13px; color: #ccc; word-break: break-word; margin-top: 6px; }
    .kirka-mentions-panel .delete-mention {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444; cursor: pointer; padding: 4px 8px; border-radius: 6px;
      font-size: 12px; font-weight: 600; transition: all 0.2s;
    }
    .kirka-mentions-panel .delete-mention:hover { background: rgba(239, 68, 68, 0.3); transform: translateY(-1px); }
    .kirka-mentions-panel .empty-state { text-align: center; padding: 40px; color: #666; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar { width: 6px; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
    .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
    @keyframes mentionSlideIn {
      from { opacity: 0; transform: translate(-50%, -48%); }
      to   { opacity: 1; transform: translate(-50%, -50%); }
    }
    .kirka-mentions-panel.show { animation: mentionSlideIn 0.2s ease; }
  `;
  document.head.appendChild(style);
}

function createMentionsTab() {
  const existing = document.querySelector('.mentions-tab');
  if (existing) return existing;
  const tabBar = document.querySelector('.inventory .tab-bar');
  if (!tabBar) return null;
  mentionsTab = document.createElement('div');
  mentionsTab.className = 'tab mentions-tab';
  mentionsTab.setAttribute('data-v-0c2b2d3b', '');
  const titleDiv = document.createElement('div');
  titleDiv.className = 'title';
  titleDiv.setAttribute('data-v-0c2b2d3b', '');
  titleDiv.textContent = 'MENTIONS';
  mentionsTab.appendChild(titleDiv);
  mentionsTab.style.cursor = 'pointer';
  mentionsTab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMentionsPanel();
  });
  const endTab = tabBar.querySelector('.tab.end');
  if (endTab) {
    tabBar.insertBefore(mentionsTab, endTab);
  } else {
    tabBar.appendChild(mentionsTab);
  }
  updateMentionBadge();
  return mentionsTab;
}

function watchForInventory() {
  if (inventoryObserver) inventoryObserver.disconnect();
  inventoryObserver = new MutationObserver(() => {
    const tabBar = document.querySelector('.inventory .tab-bar');
    if (tabBar && !document.querySelector('.mentions-tab')) {
      createMentionsTab();
    }
  });
  inventoryObserver.observe(document.body, { childList: true, subtree: false });
}

function createMentionsPanelEl() {
  const existing = document.querySelector('.kirka-mentions-panel');
  if (existing) existing.remove();
  const panel = document.createElement('div');
  panel.className = 'kirka-mentions-panel';
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <h3>📬 Mentions</h3>
    <div class="panel-actions">
      <button class="kirka-button kirka-button-danger" id="panel-clear-all">CLEAR ALL</button>
      <button class="panel-close" id="panel-close">CLOSE</button>
    </div>
  `;
  panel.appendChild(header);
  const listContainer = document.createElement('div');
  listContainer.className = 'mentions-list-container';
  panel.appendChild(listContainer);
  document.body.appendChild(panel);
  document.getElementById('panel-close')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });
  document.getElementById('panel-clear-all')?.addEventListener('click', () => {
    if (confirm('Clear all mentions?')) {
      mentions = [];
      saveMentions();
      renderMentionsPanel();
      updateMentionBadge();
      const badge = document.querySelector('.mentions-tab .mention-badge');
      if (badge) badge.remove();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.style.display === 'flex') {
      panel.style.display = 'none';
    }
  });
  document.addEventListener('click', (e) => {
    if (panel.style.display === 'flex' &&
        !panel.contains(e.target) &&
        e.target !== mentionsTab &&
        !mentionsTab?.contains(e.target)) {
      panel.style.display = 'none';
    }
  });
  return panel;
}

function renderMentionsPanel() {
  const panel = document.querySelector('.kirka-mentions-panel');
  if (!panel) return;
  const listContainer = panel.querySelector('.mentions-list-container');
  if (!listContainer) return;
  if (mentions.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No mentions yet</div>';
    return;
  }
  listContainer.innerHTML = '';
  mentions.forEach(mention => {
    const item = document.createElement('div');
    item.className = 'mention-item';
    item.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
          <span class="mention-author">${escapeHtmlMentions(mention.author)}</span>
          <span class="mention-shortid">#${escapeHtmlMentions(mention.shortId)}</span>
          <span class="mention-time">${mention.time}</span>
        </div>
        <div class="mention-message">${escapeHtmlMentions(mention.message)}</div>
      </div>
      <button class="delete-mention" data-id="${mention.id}">✕ DELETE</button>
    `;
    listContainer.appendChild(item);
  });
  document.querySelectorAll('.delete-mention').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteMention(parseInt(btn.dataset.id));
    };
  });
}

function toggleMentionsPanel() {
  let panel = document.querySelector('.kirka-mentions-panel');
  if (!panel) panel = createMentionsPanelEl();
  if (panel.style.display === 'flex') {
    panel.style.display = 'none';
  } else {
    renderMentionsPanel();
    panel.style.display = 'flex';
    panel.classList.add('show');
    setTimeout(() => panel.classList.remove('show'), 200);
  }
}

function escapeHtmlMentions(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function initMentions() {
  addMentionsStyles();
  await fetchMyUserData();
  loadMentions();
  if (myShortId) connectWebSocket();
  watchForInventory();
  const checkInventory = setInterval(() => {
    if (document.querySelector('.inventory .tab-bar')) {
      createMentionsTab();
    }
    updateInventoryIconBadge();
    if (document.querySelector('.mentions-tab') && document.querySelector('.icon-btn.INVENTORY')) {
      clearInterval(checkInventory);
    }
  }, 500);
  setTimeout(() => clearInterval(checkInventory), 15000);
  let lastMentionsUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastMentionsUrl) {
      lastMentionsUrl = location.href;
      setTimeout(() => {
        if (document.querySelector('.inventory .tab-bar')) {
          createMentionsTab();
        }
        updateInventoryIconBadge();
      }, 500);
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: false });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHAT COMMAND AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

const chatCommands = {
  '/inv': { description: 'Check inventory', category: 'Info' },
  '/hm': { description: 'How much (check item price)', category: 'Trade' },
  '/locate': { description: 'Locate player/items', category: 'Info' },
  '/flip': { description: 'Flip items', category: 'Trade' },
  '/trade cancel': { description: 'Cancel current trade', category: 'Trade' },
  '/trade bump': { description: 'Bump trade offer', category: 'Trade' },
  '/trade accept': { description: 'Accept trade offer', category: 'Trade' },
  '/trade offer my:': { description: 'Offer trade (my: [items])', category: 'Trade' },
  '/myvotes': { description: 'Check your votes', category: 'Info' },
  '/gift': { description: 'Gift items to player', category: 'Gift' },
  '/topgifter': { description: 'Top gifters leaderboard', category: 'Gift' },
  '/mygift': { description: 'Check your gifts', category: 'Gift' }
};

let cmdChatInput    = null;
let cmdSuggestionBox = null;
let cmdSelectedIndex = -1;
let cmdScriptActive  = false;

function createCmdSuggestionBox() {
  const box = document.createElement('div');
  box.id = 'cmd-suggestion-box';
  Object.assign(box.style, {
    position: 'fixed', background: '#1a1f2e', border: '1px solid #2a2f3e',
    borderRadius: '4px', padding: '4px 0', zIndex: '10000', maxHeight: '320px',
    overflowY: 'auto', minWidth: '260px', boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'none'
  });
  return box;
}

function cmdIsCompleteCommand(inputText) {
  const multiWord = ['/trade cancel', '/trade bump', '/trade accept', '/trade offer my:'];
  for (const cmd of multiWord) {
    if (inputText.toLowerCase().startsWith(cmd.toLowerCase() + ' ') ||
        inputText.toLowerCase() === cmd.toLowerCase()) return true;
  }
  const match = inputText.match(/^\/([a-z]+)(?:\s|$)/i);
  if (!match) return false;
  return chatCommands.hasOwnProperty('/' + match[1].toLowerCase());
}

function cmdGetMatching(inputText) {
  const inputLower = inputText.toLowerCase();
  if (inputLower === '/trade ') return ['/trade cancel', '/trade bump', '/trade accept', '/trade offer my:'];
  if (inputLower.startsWith('/trade ')) {
    const after = inputLower.substring(7);
    return ['cancel', 'bump', 'accept', 'offer my:']
      .filter(c => c.startsWith(after))
      .map(c => '/trade ' + c);
  }
  const match = inputText.match(/^\/([a-z]*)/i);
  if (!match) return [];
  const prefix = match[1].toLowerCase();
  const singles = Object.keys(chatCommands).filter(c => !c.includes(' '));
  return prefix ? singles.filter(c => c.toLowerCase().startsWith('/' + prefix)) : singles;
}

function cmdRenderSuggestion(cmd, index) {
  const selected = index === cmdSelectedIndex;
  return `<div class="kirka-cmd-suggestion" data-cmd="${cmd}" style="
    padding: 8px 12px; cursor: pointer; transition: all 0.08s linear;
    border-left: 2px solid ${selected ? '#4caf50' : 'transparent'};
    background: ${selected ? '#2a2f3e' : 'transparent'}; margin: 0;">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div style="flex:1;">
        <span style="color:#4caf50; font-weight:600; font-size:13px;">${cmd}</span>
        <span style="color:#6b7280; font-size:11px; margin-left:8px;">${chatCommands[cmd]?.category || 'Command'}</span>
        <div style="color:#9ca3af; font-size:11px; margin-top:2px;">${chatCommands[cmd]?.description || 'Execute command'}</div>
      </div>
      <div style="color:#4caf50; font-size:10px; opacity:${selected ? '1' : '0.5'};
        border:1px solid #2a2f3e; padding:2px 6px; border-radius:3px; background:#0f1117;">↵</div>
    </div>
  </div>`;
}

function cmdAttachEvents() {
  document.querySelectorAll('.kirka-cmd-suggestion').forEach((el, idx) => {
    el.addEventListener('mouseenter', () => { cmdSelectedIndex = idx; cmdHighlight(); });
    el.addEventListener('click', () => cmdApply(el.getAttribute('data-cmd')));
  });
}

function cmdHighlight() {
  document.querySelectorAll('.kirka-cmd-suggestion').forEach((el, idx) => {
    const on = idx === cmdSelectedIndex;
    el.style.background = on ? '#2a2f3e' : 'transparent';
    el.style.borderLeftColor = on ? '#4caf50' : 'transparent';
    const key = el.querySelector('div:last-child');
    if (key) key.style.opacity = on ? '1' : '0.5';
    if (on) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function cmdApply(cmd) {
  if (!cmdChatInput) return;
  cmdChatInput.value = cmd + ' ';
  cmdChatInput.focus();
  cmdHide();
  cmdChatInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function cmdHide() {
  if (cmdSuggestionBox) cmdSuggestionBox.style.display = 'none';
  cmdSelectedIndex = -1;
}

function cmdPosition() {
  if (!cmdChatInput || !cmdSuggestionBox) return;
  const rect = cmdChatInput.getBoundingClientRect();
  cmdSuggestionBox.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  cmdSuggestionBox.style.left   = `${rect.left}px`;
  cmdSuggestionBox.style.width  = `${rect.width}px`;
}

function cmdUpdateSuggestions(inputText) {
  if (cmdIsCompleteCommand(inputText)) { cmdHide(); return; }
  const inputLower = inputText.toLowerCase();
  let cmdsToShow = [];
  if (inputLower === '/trade') {
    cmdsToShow = ['/trade cancel', '/trade bump', '/trade accept', '/trade offer my:'];
  } else {
    cmdsToShow = cmdGetMatching(inputText);
  }
  if (cmdsToShow.length === 0) { cmdHide(); return; }
  if (!cmdSuggestionBox) {
    cmdSuggestionBox = createCmdSuggestionBox();
    document.body.appendChild(cmdSuggestionBox);
  }
  cmdSuggestionBox.style.display = 'block';
  cmdPosition();
  cmdSuggestionBox.innerHTML = cmdsToShow.map((cmd, i) => cmdRenderSuggestion(cmd, i)).join('');
  cmdAttachEvents();
}

function cmdHandleKeyDown(e) {
  if (!cmdSuggestionBox || cmdSuggestionBox.style.display !== 'block') return;
  const sugs = document.querySelectorAll('.kirka-cmd-suggestion');
  if (!sugs.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex + 1) % sugs.length; cmdHighlight(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex - 1 + sugs.length) % sugs.length; cmdHighlight(); }
  else if (e.key === 'Tab' || (e.key === 'Enter' && cmdSelectedIndex >= 0)) {
    e.preventDefault();
    const cmd = sugs[cmdSelectedIndex]?.getAttribute('data-cmd');
    if (cmd) cmdApply(cmd);
  } else if (e.key === 'Escape') { e.preventDefault(); cmdHide(); }
}

function cmdHandleInput() {
  const value = cmdChatInput.value;
  if (value.startsWith('/') && !cmdIsCompleteCommand(value)) cmdUpdateSuggestions(value);
  else cmdHide();
}

function cmdHandleKeyPress(e) {
  if (e.key !== 'Enter') return;
  const message = cmdChatInput.value.trim();
  if (!message.startsWith('/')) { cmdHide(); return; }
  const multiWord = ['/trade cancel', '/trade bump', '/trade accept', '/trade offer my:'];
  let matchedKey = null;
  for (const mc of multiWord) {
    if (message.toLowerCase().startsWith(mc.toLowerCase())) { matchedKey = mc; break; }
  }
  if (!matchedKey) {
    const single = message.split(' ')[0].toLowerCase();
    if (chatCommands[single]) matchedKey = single;
  }
  if (matchedKey) {
    e.preventDefault();
    cmdHide();
    setTimeout(() => { cmdChatInput.value = ''; }, 10);
  } else {
    cmdHide();
  }
}

function cmdSetupListeners() {
  if (!cmdChatInput) return;
  cmdChatInput.removeEventListener('keydown',  cmdHandleKeyDown);
  cmdChatInput.removeEventListener('input',    cmdHandleInput);
  cmdChatInput.removeEventListener('keypress', cmdHandleKeyPress);
  cmdChatInput.addEventListener('keydown',  cmdHandleKeyDown);
  cmdChatInput.addEventListener('input',    cmdHandleInput);
  cmdChatInput.addEventListener('keypress', cmdHandleKeyPress);
}

function initChatCommands() {
  const input = document.querySelector('input#WwMnw, input[placeholder*="MESSAGE"]');
  if (input && input !== cmdChatInput) {
    cmdChatInput   = input;
    cmdScriptActive = true;
    cmdSetupListeners();
    document.addEventListener('click', (e) => {
      if (cmdSuggestionBox && !cmdSuggestionBox.contains(e.target) && e.target !== cmdChatInput) {
        cmdHide();
      }
    });
  } else if (!input) {
    cmdScriptActive = false;
  }
}

function addChatCommandStyles() {
  if (document.getElementById('cmd-suggestion-styles')) return;
  const style = document.createElement('style');
  style.id = 'cmd-suggestion-styles';
  style.textContent = `
    #cmd-suggestion-box { animation: kirkaFadeIn 0.12s ease-out; }
    @keyframes kirkaFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
    .kirka-cmd-suggestion { transition: all 0.08s linear; }
    .kirka-cmd-suggestion:hover { background: #2a2f3e !important; border-left-color: #4caf50 !important; }
    #cmd-suggestion-box::-webkit-scrollbar { width:6px; }
    #cmd-suggestion-box::-webkit-scrollbar-track { background:#0f1117; border-radius:3px; }
    #cmd-suggestion-box::-webkit-scrollbar-thumb { background:#2a2f3e; border-radius:3px; }
    #cmd-suggestion-box::-webkit-scrollbar-thumb:hover { background:#4caf50; }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BIOTEXT BADGE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const BIOTEXT_API = 'https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/biotext.json';
let bioTextData = null;
let activeBioTextBadgeId = null;
let isBioTextProcessing = false;
let bioTextObservers = [];
let bioTextPeriodicInterval = null;

async function fetchBioTextData() {
  try {
    const response = await fetch(BIOTEXT_API);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    bioTextData = data;
    return true;
  } catch (error) {
    return false;
  }
}

function getBioTextBadgeInfo(shortId) {
  if (!bioTextData || !shortId) return null;
  return bioTextData.find(item => item.shortid === shortId) || null;
}

function getCurrentProfileShortId() {
  const valueElement = document.querySelector('.tab-content .profile-cont .card-profile .copy-cont .value');
  if (valueElement) {
    const text = valueElement.textContent.trim();
    return text.startsWith('#') ? text.substring(1) : text;
  }
  const urlMatch = location.href.match(/\/profile\/(?:%23)?([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1];
  return null;
}

function removeExistingBioTextBadge(profile) {
  const existing = profile.querySelector('.kirka-biotext-badge');
  if (existing) { existing.remove(); return true; }
  return false;
}

async function injectBioTextBadge() {
  if (!bioTextData) {
    await fetchBioTextData();
    if (!bioTextData) return false;
  }
  if (isBioTextProcessing) return false;
  if (!location.href.includes('/profile/')) {
    if (activeBioTextBadgeId !== null) activeBioTextBadgeId = null;
    return false;
  }
  const currentId = getCurrentProfileShortId();
  if (!currentId) return false;
  const badgeInfo = getBioTextBadgeInfo(currentId);
  if (!badgeInfo) {
    if (activeBioTextBadgeId !== null) {
      const profileContainer = document.querySelector('.tab-content .profile-cont');
      if (profileContainer) {
        const profile = profileContainer.querySelector('.profile');
        if (profile) removeExistingBioTextBadge(profile);
      }
      activeBioTextBadgeId = null;
    }
    return false;
  }
  if (activeBioTextBadgeId === currentId) return true;
  isBioTextProcessing = true;
  try {
    const profileContainer = document.querySelector('.tab-content .profile-cont');
    if (!profileContainer) { isBioTextProcessing = false; return false; }
    const profile = profileContainer.querySelector('.profile');
    if (!profile) { isBioTextProcessing = false; return false; }
    removeExistingBioTextBadge(profile);
    if (getComputedStyle(profile).position !== 'relative') profile.style.position = 'relative';
    const div = document.createElement('div');
    div.className = 'kirka-biotext-badge';
    div.style.cssText = `
      position: absolute; bottom: 1rem; left: 1rem; display: inline-flex;
      align-items: center; gap: 0.5rem; z-index: 100; pointer-events: none;
      background: rgba(0,0,0,0.5); padding: 0.25rem 0.75rem; border-radius: 20px; backdrop-filter: blur(4px);
    `;
    const safeText = (() => { const d = document.createElement('div'); d.textContent = badgeInfo.text; return d.innerHTML; })();
    div.innerHTML = `
      <img src="${badgeInfo.image}" style="height:1rem;width:auto;border-radius:50%;" onerror="this.style.display='none'" />
      <span style="font-size:0.85rem;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${safeText}</span>
    `;
    profile.appendChild(div);
    activeBioTextBadgeId = currentId;
    isBioTextProcessing = false;
    return true;
  } catch (error) {
    isBioTextProcessing = false;
    return false;
  }
}

function watchBioTextProfileContent() {
  const profileContent = document.querySelector('.tab-content');
  if (!profileContent) return;
  const tabObserver = new MutationObserver(() => {
    activeBioTextBadgeId = null;
    setTimeout(() => injectBioTextBadge(), 100);
  });
  tabObserver.observe(profileContent, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  bioTextObservers.push(tabObserver);
}

function watchBioTextDOMChanges() {
  let debounceTimer = null;
  const domObserver = new MutationObserver((mutations) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if ((node.matches && node.matches('.profile-cont, .profile, .tab-content')) ||
                  (node.querySelector && node.querySelector('.profile-cont, .profile'))) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
      }
      if (shouldCheck && location.href.includes('/profile/')) {
        setTimeout(() => injectBioTextBadge(), 150);
      }
    }, 100);
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
  bioTextObservers.push(domObserver);
}

function startBioTextPeriodicCheck() {
  if (bioTextPeriodicInterval) clearInterval(bioTextPeriodicInterval);
  bioTextPeriodicInterval = setInterval(() => {
    if (location.href.includes('/profile/') && bioTextData) {
      const profileExists = document.querySelector('.tab-content .profile-cont');
      if (profileExists && getBioTextBadgeInfo(getCurrentProfileShortId())) {
        injectBioTextBadge();
      }
    }
  }, 3000);
}

function cleanupBioText() {
  bioTextObservers.forEach(observer => { try { observer.disconnect(); } catch(e) {} });
  bioTextObservers = [];
  if (bioTextPeriodicInterval) clearInterval(bioTextPeriodicInterval);
  activeBioTextBadgeId = null;
  isBioTextProcessing = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchData() {
  try {
    const token = localStorage.getItem("token");
    const [badgeData, userData] = await Promise.all([
      fetch("https://raw.githubusercontent.com/OBS-Akuma/KirkaBadges/refs/heads/main/Json/badge.json")
        .then(r => r.json()),
      token
        ? fetch("https://api2.kirka.io/api/wNmwWMn/wWWnwmM", {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json())
        : Promise.resolve(null)
    ]);
    customizations = badgeData;
    // Reuse fontData if already fetched, otherwise use the same badge.json data
    if (!fontData) fontData = badgeData;
    currentUser = userData?.statusCode === 401 ? null : userData;
    localStorage.setItem("juice-customizations", JSON.stringify(customizations));
    if (currentUser) localStorage.setItem("current-user", JSON.stringify(currentUser));
  } catch (err) {
    const stored = localStorage.getItem("juice-customizations");
    if (stored) { customizations = JSON.parse(stored); if (!fontData) fontData = customizations; }
    const storedUser = localStorage.getItem("current-user");
    if (storedUser) currentUser = JSON.parse(storedUser);
  }
}

// ─── Load Settings ────────────────────────────────────────────────────────────

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      "kb_badges", "kb_animations", "kb_server_maps", "kb_default_css",
      "kb_hitmarker_link", "kb_killicon_link", "kb_ui_animations", "kb_rave_mode",
      "kb_lobby_keybind_reminder", "kb_spectate_button", "kb_hide_chat",
      "kb_hide_interface", "kb_skip_loading"
    ], (result) => {
      settings.customizations = result.kb_badges !== false;
      settings.animations = result.kb_animations !== false;
      settings.serverMaps = result.kb_server_maps !== false;
      settings.defaultCSS = result.kb_default_css !== false;
      settings.hitmarker_link = result.kb_hitmarker_link || "";
      settings.killicon_link = result.kb_killicon_link || "";
      settings.ui_animations = result.kb_ui_animations !== false;
      settings.rave_mode = result.kb_rave_mode === true;
      settings.lobby_keybind_reminder = result.kb_lobby_keybind_reminder !== false;
      settings.spectate_button = result.kb_spectate_button !== false;
      settings.hide_chat = result.kb_hide_chat === true;
      settings.hide_interface = result.kb_hide_interface === true;
      settings.skip_loading = result.kb_skip_loading === true;
      if (settings.defaultCSS) { applyDefaultCSS(); } else { removeDefaultCSS(); }
      applyGameStyles();
      resolve();
    });
  });
}

// ─── Game Styles ──────────────────────────────────────────────────────────────

function applyGameStyles() {
  if (addedStyles) { addedStyles.remove(); addedStyles = null; }
  const styles = [];
  if (settings.hitmarker_link !== "")
    styles.push(`.hitmark { content: url(${formatLink(settings.hitmarker_link)}) !important; }`);
  if (settings.killicon_link !== "")
    styles.push(`.animate-cont::before { content: ""; background: url(${formatLink(settings.killicon_link)}); width: 10rem; height: 10rem; margin-bottom: 2rem; display: inline-block; background-position: center; background-size: contain; background-repeat: no-repeat; } .animate-cont svg { display: none; }`);
  if (!settings.ui_animations)
    styles.push("* { transition: none !important; animation: none !important; }");
  if (settings.rave_mode)
    styles.push("canvas { animation: rotateHue 1s linear infinite !important; }");
  if (!settings.lobby_keybind_reminder)
    styles.push("#juice-keybind-reminder { display: none; }");
  if (!settings.spectate_button)
    styles.push(".spectate-eye { display: none !important; }");
  if (settings.hide_chat)
    styles.push(".desktop-game-interface > #bottom-left > .chat { display: none !important; }");
  if (settings.hide_interface)
    styles.push(".desktop-game-interface, .crosshair-cont, .ach-cont, .hitme-cont, .sniper-mwNMW-cont, .team-score, .score { display: none !important; }");
  if (settings.skip_loading)
    styles.push(".loading-scene { display: none !important; }");
  if (styles.length > 0) {
    addedStyles = document.createElement("style");
    addedStyles.id = "kirka-game-styles";
    addedStyles.textContent = styles.join("");
    document.head.appendChild(addedStyles);
  }
}

function formatLink(link) { return link; }

// ─── Default CSS ──────────────────────────────────────────────────────────────

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

function removeDefaultCSS() {
  if (injectedDefaultStyleElement) { injectedDefaultStyleElement.remove(); injectedDefaultStyleElement = null; }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

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
    const filePath = src.replace(/\\/g, "/");
    return `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
  }
  return src;
}

function applyGradientToElement(el, gradient, animated = false) {
  el.style.display = "inline-block";
  el.style.background = `linear-gradient(${gradient.rot}, ${gradient.stops.join(", ")})`;
  el.style.backgroundClip = "text";
  el.style.webkitBackgroundClip = "text";
  el.style.color = "transparent";
  el.style.webkitTextFillColor = "transparent";
  el.style.fontWeight = "700";
  el.style.textShadow = gradient.shadow || "0 0 0 transparent";
  if (settings.animations && animated) {
    el.style.backgroundSize = "200% 200%";
    el.style.animation = "kirka-badges-gradient 3s linear infinite";
  }
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
  if (customs.discord) {
    addBadgeImg(container, "https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/linked.webp", height);
  }
  if (customs.booster) {
    addBadgeImg(container, "https://raw.githubusercontent.com/OBS-Akuma/KirkaSkins/refs/heads/main/img/booster.webp", height);
  }
  if (customs.badges?.length) {
    customs.badges.forEach(badge => addBadgeImg(container, badge, height));
  }
}

// ─── Inject CSS ───────────────────────────────────────────────────────────────

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

// ─── Custom CSS Handlers ──────────────────────────────────────────────────────

function applyRawCSS(css) {
  if (injectedStyleElement) injectedStyleElement.remove();
  if (css && css.trim()) {
    injectedStyleElement = document.createElement("style");
    injectedStyleElement.id = "kirka-custom-css";
    injectedStyleElement.textContent = css;
    document.head.appendChild(injectedStyleElement);
  }
}

function clearRawCSS() {
  if (injectedStyleElement) { injectedStyleElement.remove(); injectedStyleElement = null; }
}

function applyCSSLink(link) {
  if (injectedLinkElement) injectedLinkElement.remove();
  if (link && link.trim()) {
    injectedLinkElement = document.createElement("link");
    injectedLinkElement.id = "kirka-custom-link";
    injectedLinkElement.rel = "stylesheet";
    injectedLinkElement.href = link;
    document.head.appendChild(injectedLinkElement);
  }
}

function removeCSSLink() {
  if (injectedLinkElement) { injectedLinkElement.remove(); injectedLinkElement = null; }
}

async function loadCustomCSS() {
  const result = await chrome.storage.local.get(["kb_raw_css", "kb_css_link"]);
  if (result.kb_raw_css) applyRawCSS(result.kb_raw_css);
  if (result.kb_css_link) applyCSSLink(result.kb_css_link);
}

// ─── Lobby Customizations ─────────────────────────────────────────────────────

function applyLobbyCustomizations() {
  if (!settings.customizations || !customizations) return;
  const avatarUsernameEl = document.querySelector(".avatar-info .username");
  const shortIdCard = avatarUsernameEl?.textContent.trim().split("#")[1] || null;
  const lobbyNickname =
    document.querySelector(".team-section .heads .nickname") ||
    document.querySelector(".heads .head-right .nickname") ||
    document.querySelector(".heads .nickname");
  if (!lobbyNickname) return;
  if (!shortIdCard) return;
  const customs = getCustomsForId(shortIdCard);
  if (!customs) return;
  lobbyNickname.style.display = "inline-block";
  lobbyNickname.style.display = "flex";
  lobbyNickname.style.alignItems = "flex-end";
  lobbyNickname.style.gap = "0.25rem";
  lobbyNickname.style.overflow = "unset";
  if (customs.gradient) {
    lobbyNickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
    lobbyNickname.style.backgroundClip = "text";
    lobbyNickname.style.webkitBackgroundClip = "text";
    lobbyNickname.style.color = "transparent";
    lobbyNickname.style.fontWeight = "700";
    lobbyNickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
    if (settings.animations && customs.animated) {
      lobbyNickname.style.backgroundSize = "200% 200%";
      lobbyNickname.style.animation = "kirka-badges-gradient 3s linear infinite";
    }
  } else {
    lobbyNickname.style.color = "";
    lobbyNickname.style.background = "";
  }
  if (lobbyNickname.querySelector(".kirka-badges")) return;
  const badgesElem = createBadgesContainer(shortIdCard);
  badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; width: 0;";
  lobbyNickname.appendChild(badgesElem);
  populateBadges(badgesElem, customs, "32px");
}

// ─── Profile Customizations ───────────────────────────────────────────────────

function applyProfileCustomizations() {
  if (!settings.customizations || !customizations) return;
  const profile = document.querySelector(".tab-content > .profile-cont > .profile");
  if (!profile) return;
  const shortIdRaw = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim();
  if (!shortIdRaw) return;
  const shortId = shortIdRaw.split("#")[1];
  const nickname = profile.querySelector(".nickname");
  if (!nickname) return;
  const textNode = nickname.firstChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const span = document.createElement("span");
    span.className = "kirka-nickname-span";
    span.textContent = textNode.textContent;
    nickname.replaceChild(span, textNode);
  }
  nickname.style.cssText += "display: flex; align-items: flex-end; gap: 0.25rem; overflow: unset !important;";
  const customs = getCustomsForId(shortId);
  if (!customs) return;
  const span = nickname.querySelector(".kirka-nickname-span");
  if (span && customs.gradient) {
    span.style.display = "inline-block";
    span.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
    span.style.backgroundClip = "text";
    span.style.webkitBackgroundClip = "text";
    span.style.color = "transparent";
    span.style.fontWeight = "700";
    span.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
    if (settings.animations && customs.animated) {
      span.style.backgroundSize = "200% 200%";
      span.style.animation = "kirka-badges-gradient 3s linear infinite";
    }
  }
  let badgesElem = nickname.querySelector(".kirka-badges");
  if (!badgesElem) {
    badgesElem = createBadgesContainer(shortId);
    nickname.appendChild(badgesElem);
  } else {
    badgesElem.innerHTML = "";
  }
  populateBadges(badgesElem, customs, "32px");
}

// ─── In-Game Tab Customizations ───────────────────────────────────────────────

function applyTabCustomizations() {
  const tabPlayers = document.querySelectorAll(".desktop-game-interface .player-cont");
  tabPlayers.forEach(player => {
    const playerLeft = player.querySelector(".player-left");
    const nickname = player.querySelector(".nickname");
    const shortId = player.querySelector(".short-id")?.innerText.replace("#", "");
    if (!shortId || !settings.customizations || !customizations) {
      player.querySelector(".kirka-badges")?.remove();
      if (nickname) nickname.style = "";
      if (playerLeft) playerLeft.style = "";
      return;
    }
    const customs = getCustomsForId(shortId);
    if (!customs) {
      playerLeft?.querySelector(".kirka-badges")?.remove();
      if (nickname) nickname.style = "";
      if (playerLeft) playerLeft.style = "";
      return;
    }
    let badgesElem = player.querySelector(".kirka-badges");
    if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
      badgesElem?.remove();
      badgesElem = createBadgesContainer(shortId);
      badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
      nickname.style = "overflow: unset;";
      playerLeft.style = "width: 0;";
      playerLeft.insertBefore(badgesElem, playerLeft.lastChild);
    } else {
      badgesElem.innerHTML = "";
    }
    if (customs.gradient) {
      nickname.style.display = "inline-block";
      nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
      nickname.style.backgroundClip = "text";
      nickname.style.webkitBackgroundClip = "text";
      nickname.style.color = "transparent";
      nickname.style.fontWeight = "700";
      nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
      if (settings.animations && customs.animated) {
        nickname.style.backgroundSize = "200% 200%";
        nickname.style.animation = "kirka-badges-gradient 3s linear infinite";
      }
    } else {
      nickname.style = "overflow: unset;";
    }
    populateBadges(badgesElem, customs, "22px");
  });
}

// ─── ESC Screen Customizations ────────────────────────────────────────────────

function applyEscCustomizations() {
  const escPlayers = document.querySelectorAll(".esc-interface .player-cont");
  escPlayers.forEach(player => {
    const playerLeft = player.querySelector(".player-left");
    const playerIds = player.querySelector(".player-name");
    if (!playerIds) return;
    const nickname = playerIds.querySelector(".nickname");
    if (!nickname) return;
    const shortIdElem = nickname.querySelector(".short-id");
    const shortId = shortIdElem?.innerText.replace("#", "");
    if (!shortId || !settings.customizations || !customizations) {
      player.querySelector(".kirka-badges")?.remove();
      nickname.style = "";
      if (playerLeft) playerLeft.style = "";
      return;
    }
    const customs = getCustomsForId(shortId);
    if (!customs) {
      playerLeft?.querySelector(".kirka-badges")?.remove();
      nickname.style = "";
      if (playerLeft) playerLeft.style = "";
      return;
    }
    let badgesElem = player.querySelector(".kirka-badges");
    if (!badgesElem || badgesElem.dataset.shortId !== shortId) {
      badgesElem?.remove();
      badgesElem = createBadgesContainer(shortId);
      badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; margin-left: 0.25rem;";
      nickname.style = "overflow: unset;";
      if (playerLeft) playerLeft.style = "width: 0;";
      nickname.insertBefore(badgesElem, shortIdElem);
    } else {
      badgesElem.innerHTML = "";
    }
    if (customs.gradient) {
      nickname.style.display = "flex";
      nickname.style.flexDirection = "row";
      nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
      nickname.style.backgroundClip = "text";
      nickname.style.webkitBackgroundClip = "text";
      nickname.style.color = "transparent";
      nickname.style.fontWeight = "700";
      nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
      if (shortIdElem) {
        shortIdElem.style.background = "none";
        shortIdElem.style.webkitBackgroundClip = "unset";
        shortIdElem.style.backgroundClip = "unset";
        shortIdElem.style.color = "";
        shortIdElem.style.textShadow = "none";
      }
      if (settings.animations && customs.animated) {
        nickname.style.backgroundSize = "200% 200%";
        nickname.style.animation = "kirka-badges-gradient 3s linear infinite";
      }
    }
    populateBadges(badgesElem, customs, "22px");
  });
}

// ─── Profile Quick View ───────────────────────────────────────────────────────

function addProfileQuickViewStyles() {
  if (document.querySelector('#profile-quick-styles')) return;
  const style = document.createElement('style');
  style.id = 'profile-quick-styles';
  style.textContent = `
    @keyframes pqvSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .profile-quick-view { margin-top: 20px; }
    .profile-quick-view .head-text { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--yellow, #ffb914); }
    .profile-quick-view .input { display: flex; gap: 10px; align-items: center; }
    .profile-quick-view .wrapper-input { flex: 1; }
    .profile-quick-view input {
      width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white;
      font-size: 14px; outline: none; transition: all 0.2s;
    }
    .profile-quick-view input:focus { border-color: var(--yellow, #ffb914); background: rgba(255,255,255,0.08); }
    .profile-quick-view input::placeholder { color: rgba(255,255,255,0.4); }
    .profile-quick-view .button.btn {
      background-color: var(--WwNnWwmM-1); --hover-color: var(--WwNnWwmM-2);
      --top: var(--WwNnWwmM-2); --bottom: var(--WwNnWwmM-3); padding: 10px 20px; white-space: nowrap; cursor: pointer;
    }
    .profile-quick-view .button.btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
  `;
  document.head.appendChild(style);
}

function addProfileQuickView() {
  const addFriendsContainer = document.querySelector('.add-friends');
  if (!addFriendsContainer) return false;
  if (document.querySelector('.profile-quick-view')) return true;
  const quickViewContainer = document.createElement('div');
  quickViewContainer.className = 'profile-quick-view';
  const header = document.createElement('div');
  header.className = 'head-text';
  header.textContent = 'QUICK PROFILE VIEW';
  const inputContainer = document.createElement('div');
  inputContainer.className = 'input';
  const inputWrapper = document.createElement('label');
  inputWrapper.className = 'wrapper-input';
  inputWrapper.setAttribute('placeholder', 'ENTER SHORT ID');
  const input = document.createElement('input');
  input.className = 'input';
  input.placeholder = 'ENTER SHORT ID';
  input.setAttribute('data-auth-ext-processed', 'true');
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') goToProfile(input.value); });
  const viewButton = document.createElement('button');
  viewButton.className = 'button btn';
  viewButton.style.cssText = `background-color: var(--WwNnWwmM-1); --hover-color: var(--WwNnWwmM-2); --top: var(--WwNnWwmM-2); --bottom: var(--WwNnWwmM-3);`;
  viewButton.innerHTML = `<div class="triangle"></div><div class="text">VIEW PROFILE</div><div class="WwNwmM"><div class="border-top border"></div><div class="border-bottom border"></div></div>`;
  viewButton.onclick = () => goToProfile(input.value);
  inputWrapper.appendChild(input);
  inputContainer.appendChild(inputWrapper);
  inputContainer.appendChild(viewButton);
  quickViewContainer.appendChild(header);
  quickViewContainer.appendChild(inputContainer);
  addFriendsContainer.appendChild(quickViewContainer);
  return true;
}

function goToProfile(inputValue) {
  if (!inputValue || inputValue.trim() === '') return;
  let cleanId = inputValue.trim().replace(/^#/, '').replace(/[^A-Za-z0-9]/g, '');
  if (cleanId.length === 0) return;
  window.location.href = `/profile/${cleanId}`;
}

// ─── Friends Sorter ───────────────────────────────────────────────────────────

function getFriendBadgePriority(friend) {
  const badgesDiv = friend.querySelector('.kirka-badges');
  if (!badgesDiv) return 0;
  const badgeImages = badgesDiv.querySelectorAll('img');
  if (badgeImages.length === 0) return 0;
  const linkedBadgeUrl = 'linked.webp';
  let hasImageBadge = false;
  for (const img of badgeImages) {
    const src = img.src || '';
    if (!src.includes(linkedBadgeUrl) && src !== '') { hasImageBadge = true; break; }
  }
  return hasImageBadge ? 2 : 1;
}

function sortFriendContainer(container) {
  if (!container) return;
  const items = Array.from(container.querySelectorAll('.friend'));
  if (items.length === 0) return;
  const priority2 = [], priority1 = [], priority0 = [];
  items.forEach(item => {
    const badgesDiv = item.querySelector('.kirka-badges');
    const hasAnyBadge = badgesDiv && badgesDiv.children.length > 0;
    if (!hasAnyBadge) { priority0.push(item); return; }
    const p = getFriendBadgePriority(item);
    if (p === 2) priority2.push(item);
    else priority1.push(item);
  });
  const sortByLevel = (a, b) => {
    const la = parseInt(a.querySelector('.level-amount')?.textContent || '0');
    const lb = parseInt(b.querySelector('.level-amount')?.textContent || '0');
    return lb - la;
  };
  priority2.sort(sortByLevel); priority1.sort(sortByLevel); priority0.sort(sortByLevel);
  [...priority2, ...priority1, ...priority0].forEach(item => container.appendChild(item));
}

function sortAllFriendContainers() {
  const seen = new Set();
  ['.list', '.requests'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el && !seen.has(el)) { seen.add(el); sortFriendContainer(el); }
  });
  document.querySelectorAll('.friend').forEach(f => {
    const p = f.parentElement;
    if (p && !seen.has(p)) { seen.add(p); sortFriendContainer(p); }
  });
}

// ─── Friends Customizations ───────────────────────────────────────────────────

function applyFriendsCustomizations() {
  if (!settings.customizations || !customizations) return;
  const friends = document.querySelectorAll(".friend");
  friends.forEach(friend => {
    const shortId = friend.querySelector(".friend-id")?.innerText;
    if (!shortId) return;
    const customs = getCustomsForId(shortId);
    if (!customs) return;
    const nickname = friend.querySelector(".nickname");
    if (!nickname) return;
    nickname.style.display = "flex";
    nickname.style.alignItems = "flex-end";
    nickname.style.gap = "0.25rem";
    nickname.style.overflow = "unset";
    if (customs.gradient) {
      nickname.style.background = `linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")})`;
      nickname.style.backgroundClip = "text";
      nickname.style.webkitBackgroundClip = "text";
      nickname.style.color = "transparent";
      nickname.style.fontWeight = "700";
      nickname.style.textShadow = customs.gradient.shadow || "0 0 0 transparent";
      nickname.style.maxWidth = "min-content";
      nickname.style.overflow = "unset";
      if (settings.animations && customs.animated) {
        nickname.style.backgroundSize = "200% 200%";
        nickname.style.animation = "kirka-badges-gradient 3s linear infinite";
      }
    }
    let badgesElem = nickname.querySelector(".kirka-badges");
    if (badgesElem && badgesElem.dataset.shortId === shortId) return;
    if (badgesElem) badgesElem.remove();
    badgesElem = createBadgesContainer(shortId);
    badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; width: 0;";
    nickname.appendChild(badgesElem);
    populateBadges(badgesElem, customs, "18px");
  });
}

// ─── In-Game Short ID Observer ────────────────────────────────────────────────

function observeShortIds() {
  const tabPlayers = document.querySelectorAll(".desktop-game-interface .player-cont");
  tabPlayers.forEach(player => {
    const shortIdElem = player.querySelector(".short-id");
    if (!shortIdElem || shortIdElem.dataset.kbObserver) return;
    shortIdElem.dataset.kbObserver = "true";
    new MutationObserver(() => applyTabCustomizations()).observe(shortIdElem, {
      characterData: true, subtree: true, childList: true
    });
  });
}

// ─── Lobby News ───────────────────────────────────────────────────────────────

async function lobbyNews() {
  if (document.querySelector("#lobby-news")) return;
  const newsSettings = await new Promise(resolve => {
    chrome.storage.local.get(
      ["kb_news_general", "kb_news_promotional", "kb_news_event", "kb_news_alert"],
      r => resolve(r)
    );
  });
  const showGeneral     = newsSettings.kb_news_general     !== false;
  const showPromotional = newsSettings.kb_news_promotional !== false;
  const showEvent       = newsSettings.kb_news_event       !== false;
  const showAlert       = newsSettings.kb_news_alert       !== false;
  if (!showGeneral && !showPromotional && !showEvent && !showAlert) return;
  const leftInterface =
    document.querySelector("#app #left-interface") ||
    document.querySelector(".left-interface") ||
    document.querySelector("#left-interface");
  if (!leftInterface) return;
  let news;
  try {
    news = await fetch(
      "https://raw.githubusercontent.com/OBS-Akuma/smudgy-client/refs/heads/main/Api/news.json"
    ).then(r => r.json());
  } catch { return; }
  if (!news?.length) return;
  const categoryMap = { general: showGeneral, promotional: showPromotional, event: showEvent, alert: showAlert };
  news = news.filter(({ category }) => categoryMap[category]);
  if (!news.length) return;
  const container = document.createElement("div");
  container.id = "lobby-news";
  container.style.cssText = `
    width: 250px; position: absolute; display: flex; flex-direction: column;
    gap: 0.25rem; top: 178px; left: 148px; pointer-events: auto; z-index: 10;
  `;
  leftInterface.appendChild(container);
  news.forEach(item => {
    const card = document.createElement("div");
    card.className = "kb-news-card";
    card.style.cssText = `
      width: 100%; border: 4px solid #3e4d7c; border-bottom: 4px solid #26335b;
      border-top: 4px solid #4d5c8b; background-color: #3b4975; display: flex;
      position: relative; ${item.link ? "cursor: pointer;" : ""}
      ${item.imgType === "banner" ? "flex-direction: column;" : ""}
    `;
    container.appendChild(card);
    if (item.img && item.img !== "") {
      const img = document.createElement("img");
      img.src = item.img;
      img.style.cssText = `
        width: ${item.imgType === "banner" ? "100%" : "4rem"};
        max-height: ${item.imgType === "banner" ? "7.5rem" : "4rem"};
        object-fit: cover; object-position: center;
      `;
      card.appendChild(img);
    }
    if (item.live) {
      const badge = document.createElement("span");
      badge.innerText = "LIVE";
      badge.style.cssText = `position:absolute;top:0;right:0;background:#4dbf4d;color:#fff;padding:0.15rem 0.25rem;font-size:0.75rem;font-weight:600;border-radius:0 0 0 0.25rem;`;
      card.appendChild(badge);
    } else if (item.updatedAt && item.updatedAt > Date.now() - 432000000) {
      const badge = document.createElement("span");
      badge.innerText = "NEW";
      badge.style.cssText = `position:absolute;top:0;right:0;background:#e24f4f;color:#fff;padding:0.15rem 0.25rem;font-size:0.75rem;font-weight:600;border-radius:0 0 0 0.25rem;`;
      card.appendChild(badge);
    }
    const content = document.createElement("div");
    content.style.cssText = `padding:0.5rem;display:flex;flex-direction:column;gap:0.25rem;text-align:left;`;
    const title = document.createElement("span");
    title.innerText = item.title;
    title.style.cssText = `font-size:1.2rem;font-weight:600;color:#ffb914;margin:0;`;
    content.appendChild(title);
    if (item.content) {
      const text = document.createElement("span");
      text.innerText = item.content;
      text.style.cssText = `font-size:0.9rem;color:#fff;margin:0;`;
      content.appendChild(text);
    }
    card.appendChild(content);
    card.onclick = () => {
      if (!item.link) return;
      if (item.link.startsWith("https://kirka.io/")) window.location.href = item.link;
      else window.open(item.link, "_blank");
    };
  });
}

// ─── Discord Button ───────────────────────────────────────────────────────────

function juiceDiscordButton() {
  if (document.querySelector("#juice-discord-btn")) return;
  const tryInject = () => {
    const btns = document.querySelectorAll(".card-cont.soc-group");
    const btn = btns[1];
    if (!btn) return false;
    const discordBtn = btn.cloneNode(true);
    discordBtn.id = "juice-discord-btn";
    discordBtn.className = "card-cont soc-group";
    discordBtn.style.cssText = `
      background: linear-gradient(135deg, #1A8E50 0%, #2aae60 50%, #0e6e3a 100%) !important;
      border: none !important; box-shadow: 0 4px 15px rgba(26, 142, 80, 0.3) !important; cursor: pointer;
    `;
    const textSoc = discordBtn.querySelector(".text-soc");
    if (textSoc && textSoc.children.length >= 2) {
      textSoc.children[0].innerText = "Froke";
      textSoc.children[1].innerText = "DISCORD";
    }
    const svgElement = discordBtn.querySelector("svg");
    if (svgElement) {
      const i = document.createElement("i");
      i.className = "fab fa-discord";
      i.style.cssText = "font-size: 48px; margin: 3.2px 1.6px 0 1.6px";
      svgElement.replaceWith(i);
    }
    discordBtn.onclick = () => window.open("https://discord.gg/H338BfU4vT", "_blank");
    btn.replaceWith(discordBtn);
    return true;
  };
  if (!tryInject()) {
    const obs = observeForElement(".card-cont.soc-group", () => { if (tryInject()) obs.disconnect(); });
  }
}

// ─── Smudgy Button ───────────────────────────────────────────────────────────

function juiceSmudgyButton() {
  if (document.querySelector("#juice-smudgy-btn")) return;
  const tryInject = () => {
    const btns = document.querySelectorAll(".card-cont.soc-group");
    const btn = btns[2];
    if (!btn) return false;
    const smudgyBtn = btn.cloneNode(true);
    smudgyBtn.id = "juice-smudgy-btn";
    smudgyBtn.className = "card-cont soc-group";
    smudgyBtn.style.cssText = `
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff4500 100%) !important;
      border: none !important; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3) !important; cursor: pointer;
    `;
    const textSoc = smudgyBtn.querySelector(".text-soc");
    if (textSoc && textSoc.children.length >= 2) {
      textSoc.children[0].innerText = "SMUDGY";
      textSoc.children[1].innerText = "STORE";
    }
    const svgElement = smudgyBtn.querySelector("svg");
    if (svgElement) {
      const img = document.createElement("img");
      img.src = "https://www.smudgy.store/uploads/icon.png";
      img.style.cssText = "width: 32px; height: 32px; margin: 6px; object-fit: contain";
      svgElement.replaceWith(img);
    }
    smudgyBtn.onclick = () => window.open("https://www.smudgy.store", "_blank");
    btn.replaceWith(smudgyBtn);
    return true;
  };
  if (!tryInject()) {
    const obs = observeForElement(".card-cont.soc-group", () => { if (tryInject()) obs.disconnect(); });
  }
}

// ─── Server Map Images ────────────────────────────────────────────────────────

let serverMapInterval = null;
let shiftClickHandler = null;

async function handleServers() {
  if (!settings.serverMaps) {
    const servers = document.querySelectorAll(".server");
    servers.forEach(server => { server.style.backgroundImage = ""; });
    return;
  }
  try {
    const mapImages = await fetch(
      "https://raw.githubusercontent.com/OBS-Akuma/imgdata/main/maps/full_mapimages.json"
    ).then((res) => res.json());
    Object.keys(mapImages).forEach((item) => {
      if (!mapImages[item].includes("https")) {
        mapImages[item] = "https://raw.githubusercontent.com/OBS-Akuma/imgdata/main" + mapImages[item];
      }
    });
    const replaceMapImages = () => {
      const servers = document.querySelectorAll(".server");
      servers.forEach((server) => {
        const mapElement = server.querySelector(".map");
        if (mapElement) {
          let mapName = mapElement.innerText.split("_").pop();
          if (mapImages[mapName]) {
            server.style.backgroundImage = `url(${mapImages[mapName]})`;
            server.style.backgroundSize = "cover";
            server.style.backgroundPosition = "center";
          } else {
            server.style.backgroundImage = "none";
          }
        }
      });
    };
    replaceMapImages();
    if (serverMapInterval) clearInterval(serverMapInterval);
    serverMapInterval = setInterval(() => {
      if (!window.location.href.startsWith(`${BASE_URL}servers/`)) {
        clearInterval(serverMapInterval); serverMapInterval = null;
      }
      if (settings.serverMaps) replaceMapImages();
    }, 250);
  } catch (err) {}
}

// ─── Shift+Click Profile Navigation ──────────────────────────────────────────

function setupShiftClickHandler() {
  if (shiftClickHandler) document.removeEventListener("click", shiftClickHandler);
  shiftClickHandler = (e) => {
    if (e.shiftKey && e.target.classList.contains("author-name")) {
      setTimeout(() => {
        navigator.clipboard.readText().then((text) => {
          window.location.href = `${BASE_URL}profile/${text.replace("#", "")}`;
        }).catch(() => {});
      }, 250);
    }
  };
  document.addEventListener("click", shiftClickHandler);
}

function injectFontAwesome() {
  if (document.getElementById("kb-font-awesome")) return;
  const link = document.createElement("link");
  link.id = "kb-font-awesome";
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
  document.head.appendChild(link);
}

// ─── Page Routing ─────────────────────────────────────────────────────────────

let gameInterval = null;
let friendsInterval = null;

function handleLobby() {
  injectFontAwesome();
  setTimeout(() => {
    applyLobbyCustomizations();
    juiceDiscordButton();
    juiceSmudgyButton();
    lobbyNews();
  }, 500);
  observeForElement(".heads .nickname", applyLobbyCustomizations);
  observeForElement(".heads .head-right", applyLobbyCustomizations);
  observeForElement(".player-cont", applyLobbyCustomizations);
  observeForElement("#team-section", applyLobbyCustomizations);
  observeForElement("#left-interface", () => lobbyNews());
}

function handleServersPage() { handleServers(); }

function handleInGame() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    if (!document.querySelector(".desktop-game-interface")) {
      clearInterval(gameInterval); gameInterval = null; return;
    }
    observeShortIds();
    applyTabCustomizations();
    document.querySelectorAll(".desktop-game-interface .player-list").forEach(list => {
      if (list.dataset.kbObserver) return;
      list.dataset.kbObserver = "true";
      new MutationObserver(() => { observeShortIds(); applyTabCustomizations(); })
        .observe(list, { childList: true, subtree: false });
    });
  }, 1000);
  observeForElement(".esc-interface", () => applyEscCustomizations());
}

function handleProfile() {
  activeBioTextBadgeId = null;
  setTimeout(() => {
    const tryApply = () => {
      if (document.querySelector(".tab-content .statistics")) {
        applyProfileCustomizations();
        injectBioTextBadge();
        watchBioTextProfileContent();
      } else {
        setTimeout(tryApply, 50);
      }
    };
    tryApply();
  }, 0);
  observeForElement(".tab-content", () => {
    setTimeout(() => {
      applyProfileCustomizations();
      activeBioTextBadgeId = null;
      injectBioTextBadge();
    }, 100);
  });
}

function handleFriends() {
  if (friendsInterval) clearInterval(friendsInterval);
  addProfileQuickViewStyles();
  setTimeout(() => addProfileQuickView(), 600);
  let sortDebounce = null;
  friendsInterval = setInterval(() => {
    if (!window.location.href.startsWith(`${BASE_URL}friends`)) {
      clearInterval(friendsInterval); friendsInterval = null; return;
    }
    applyFriendsCustomizations();
    addProfileQuickView();
    if (sortDebounce) clearTimeout(sortDebounce);
    sortDebounce = setTimeout(() => sortAllFriendContainers(), 400);
  }, 500);
}

function routeCurrentPage() {
  const url = window.location.href;
  if (url === BASE_URL || url === `${BASE_URL}#` || url === BASE_URL.slice(0, -1)) handleLobby();
  if (url.startsWith(`${BASE_URL}games`)) handleInGame();
  if (url.startsWith(`${BASE_URL}profile/`)) handleProfile();
  if (url.startsWith(`${BASE_URL}friends`)) handleFriends();
  if (url.startsWith(`${BASE_URL}servers/`)) handleServersPage();
}

// ─── URL Change Detection (SPA) ───────────────────────────────────────────────

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    activeBioTextBadgeId = null;
    routeCurrentPage();
    setTimeout(initChatCommands, 600);
    setTimeout(applyAllFonts, 500);
  }
}).observe(document.body, { childList: true, subtree: true });

const _pushState = history.pushState.bind(history);
history.pushState = (...args) => {
  _pushState(...args);
  activeBioTextBadgeId = null;
  setTimeout(() => { routeCurrentPage(); setTimeout(initChatCommands, 600); setTimeout(applyAllFonts, 500); }, 200);
};
window.addEventListener("popstate", () => {
  activeBioTextBadgeId = null;
  setTimeout(() => { routeCurrentPage(); setTimeout(initChatCommands, 600); setTimeout(applyAllFonts, 500); }, 200);
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  injectStyles();
  await loadSettings();

  await Promise.all([
    fetchData(),
    fetchBioTextData()
  ]);

  // fontData is populated by fetchData() via the same badge.json endpoint
  setupFontObservers();

  await loadCustomCSS();
  setupShiftClickHandler();

  watchBioTextDOMChanges();
  startBioTextPeriodicCheck();

  await initMentions();

  addChatCommandStyles();
  initChatCommands();

  applyAllFonts();
  routeCurrentPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ─── Extension Message Listener ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "refresh") {
    customizations = null;
    bioTextData = null;
    fontData = null;
    Promise.all([fetchData(), fetchBioTextData()]).then(() => { routeCurrentPage(); applyAllFonts(); });
  }
  if (msg.type === "setting_changed") {
    if (msg.key === "kb_badges") settings.customizations = msg.value;
    if (msg.key === "kb_animations") settings.animations = msg.value;
    if (msg.key === "kb_server_maps") {
      settings.serverMaps = msg.value;
      if (window.location.href.startsWith(`${BASE_URL}servers/`)) handleServers();
    }
    if (msg.key === "kb_default_css") {
      settings.defaultCSS = msg.value;
      if (settings.defaultCSS) { applyDefaultCSS(); } else { removeDefaultCSS(); }
    }
    if (msg.key === "kb_hitmarker_link") { settings.hitmarker_link = msg.value; applyGameStyles(); }
    if (msg.key === "kb_killicon_link") { settings.killicon_link = msg.value; applyGameStyles(); }
    if (msg.key === "kb_ui_animations") { settings.ui_animations = msg.value; applyGameStyles(); }
    if (msg.key === "kb_rave_mode") { settings.rave_mode = msg.value; applyGameStyles(); }
    if (msg.key === "kb_lobby_keybind_reminder") { settings.lobby_keybind_reminder = msg.value; applyGameStyles(); }
    if (msg.key === "kb_spectate_button") { settings.spectate_button = msg.value; applyGameStyles(); }
    if (msg.key === "kb_hide_chat") { settings.hide_chat = msg.value; applyGameStyles(); }
    if (msg.key === "kb_hide_interface") { settings.hide_interface = msg.value; applyGameStyles(); }
    if (msg.key === "kb_skip_loading") { settings.skip_loading = msg.value; applyGameStyles(); }
    routeCurrentPage();
  }
  if (msg.type === "news_settings_changed") {
    document.getElementById("lobby-news")?.remove();
    lobbyNews();
  }
  if (msg.type === "apply_raw_css") applyRawCSS(msg.css);
  if (msg.type === "clear_raw_css") clearRawCSS();
  if (msg.type === "apply_css_link") applyCSSLink(msg.link);
  if (msg.type === "remove_css_link") removeCSSLink();
});

// ─── Right Shift Popup Handler ────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  if (e.code === "ShiftRight") {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "openPopup" }).catch(() => {});
  }
});
