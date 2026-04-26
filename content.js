// ═══════════════════════════════════════════════════════════════════════════════
//  Kirka Badges — content.js
//  Features: player badges/gradients, lobby news, Discord button, Smudgy button,
//             biotext custom badge overlay on profiles, mentions system
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

// Fetch user data for mentions
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
        console.log(`[Kirka Mentions] User: ${myUsername} (${myShortId})`);
        return true;
    } catch (error) {
        console.error('[Kirka Mentions] Failed to fetch user data:', error);
        return false;
    }
}

// Connect to WebSocket with auto-reconnect
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    ws = new WebSocket('wss://chat.kirka.io');
    
    ws.onopen = () => {
        console.log('[Kirka Mentions] WebSocket connected');
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
    
    ws.onerror = (error) => {
        console.error('[Kirka Mentions] WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('[Kirka Mentions] WebSocket disconnected');
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * reconnectAttempts, 10000);
            console.log(`[Kirka Mentions] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            setTimeout(() => connectWebSocket(), delay);
        } else {
            console.log('[Kirka Mentions] Max reconnect attempts reached');
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
    
    // Flash the tab instead of showing a toast notification
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
        try {
            mentions = JSON.parse(saved);
        } catch(e) {}
    }
}

function updateMentionBadge() {
    // Update the in-panel tab badge (inventory tab bar)
    const titleDiv = document.querySelector('.mentions-tab .title');
    if (titleDiv) {
        const existingBadge = titleDiv.querySelector('.mention-badge');
        if (existingBadge) existingBadge.remove();
        
        if (mentions.length > 0) {
            const badge = document.createElement('span');
            badge.className = 'mention-badge';
            badge.textContent = mentions.length;
            badge.style.cssText = `
                background: #ef4444;
                color: white;
                border-radius: 10px;
                padding: 0 6px;
                margin-left: 8px;
                font-size: 11px;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 18px;
                height: 18px;
            `;
            titleDiv.appendChild(badge);
        }
    }

    // Update the inventory icon badge (top-right of the INVENTORY sidebar button)
    updateInventoryIconBadge();
}

function updateInventoryIconBadge() {
    const inventoryBtn = document.querySelector('.icon-btn.INVENTORY');
    if (!inventoryBtn) return;

    // Ensure the wrapper is position:relative so the badge can anchor to it
    const wrapper = inventoryBtn.querySelector('.wrapper');
    if (wrapper) {
        wrapper.style.position = 'relative';
    }

    let badge = inventoryBtn.querySelector('.kirka-inventory-mention-badge');

    if (mentions.length === 0) {
        if (badge) badge.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'kirka-inventory-mention-badge';
        badge.style.cssText = `
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ef4444;
            color: white;
            border-radius: 10px;
            padding: 0 5px;
            font-size: 10px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 16px;
            height: 16px;
            z-index: 999;
            pointer-events: none;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            line-height: 1;
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
        .kirka-mentions-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-width: 90vw;
            height: 550px;
            max-height: 80vh;
            background: #1a1a2e;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 10000;
            display: none;
            flex-direction: column;
            overflow: hidden;
        }
        .kirka-mentions-panel .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #0f0f1a;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        .kirka-mentions-panel .panel-header h3 {
            margin: 0;
            color: #ffb914;
            font-size: 18px;
            font-weight: 600;
        }
        .kirka-mentions-panel .panel-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .kirka-mentions-panel .kirka-button {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 14px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--blue-4, #2a3a6e);
            color: white;
            overflow: hidden;
        }
        .kirka-mentions-panel .kirka-button::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%);
            pointer-events: none;
        }
        .kirka-mentions-panel .kirka-button-danger {
            background: var(--red-5, #8b2c2c);
        }
        .kirka-mentions-panel .kirka-button-danger:hover {
            background: var(--red-4, #a33a3a);
            transform: translateY(-1px);
        }
        .kirka-mentions-panel .kirka-button:hover {
            transform: translateY(-1px);
            filter: brightness(1.05);
        }
        .kirka-mentions-panel .kirka-button:active {
            transform: translateY(0);
        }
        .kirka-mentions-panel .panel-close {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: #aaa;
            cursor: pointer;
            padding: 6px 12px;
            transition: all 0.2s;
            font-weight: 600;
        }
        .kirka-mentions-panel .panel-close:hover {
            background: rgba(255,255,255,0.1);
            color: white;
            border-color: rgba(255,255,255,0.2);
        }
        .kirka-mentions-panel .mentions-list-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        .kirka-mentions-panel .mention-item {
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            border-left: 3px solid #ffb914;
            transition: background 0.2s;
        }
        .kirka-mentions-panel .mention-item:hover {
            background: rgba(255,255,255,0.06);
        }
        .kirka-mentions-panel .mention-author {
            font-weight: 600;
            color: #ffb914;
        }
        .kirka-mentions-panel .mention-shortid {
            font-size: 11px;
            color: #666;
        }
        .kirka-mentions-panel .mention-time {
            font-size: 11px;
            color: #555;
        }
        .kirka-mentions-panel .mention-message {
            font-size: 13px;
            color: #ccc;
            word-break: break-word;
            margin-top: 6px;
        }
        .kirka-mentions-panel .delete-mention {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .kirka-mentions-panel .delete-mention:hover {
            background: rgba(239, 68, 68, 0.3);
            transform: translateY(-1px);
        }
        .kirka-mentions-panel .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar { width: 6px; }
        .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
        .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        .kirka-mentions-panel .mentions-list-container::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        @keyframes mentionSlideIn {
            from { opacity: 0; transform: translate(-50%, -48%); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        .kirka-mentions-panel.show {
            animation: mentionSlideIn 0.2s ease;
        }
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
            console.log('[Kirka Mentions] Inventory reopened, re-adding tab...');
            createMentionsTab();
        }
    });
    
    // Only watch direct children of body — avoids subtree performance hit
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
    if (!panel) {
        panel = createMentionsPanelEl();
    }
    
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
    console.log('[Kirka Mentions] Initializing...');
    addMentionsStyles();
    
    await fetchMyUserData();
    loadMentions();
    
    if (myShortId) connectWebSocket();
    
    watchForInventory();
    
    // Poll for inventory tab bar and inventory icon badge together
    const checkInventory = setInterval(() => {
        if (document.querySelector('.inventory .tab-bar')) {
            createMentionsTab();
        }
        updateInventoryIconBadge();

        // Stop polling once both are found
        if (document.querySelector('.mentions-tab') && document.querySelector('.icon-btn.INVENTORY')) {
            clearInterval(checkInventory);
            console.log('[Kirka Mentions] Tab and icon badge ready!');
        }
    }, 500);
    
    setTimeout(() => clearInterval(checkInventory), 15000);

    // SPA navigation: re-apply tab + icon badge on URL change
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
    console.log('[Kirka] Loaded biotext badge data for', data.length, 'users');
    return true;
  } catch (error) {
    console.error('[Kirka] Failed to load biotext badge data:', error);
    return false;
  }
}

function getBioTextBadgeInfo(shortId) {
  if (!bioTextData || !shortId) return null;
  return bioTextData.find(item => item.shortid === shortId) || null;
}

function getCurrentProfileShortId() {
  const badgesContainer = document.querySelector('.kirka-badges');
  if (badgesContainer && badgesContainer.getAttribute('data-short-id')) {
    return badgesContainer.getAttribute('data-short-id');
  }

  const valueElement = document.querySelector('.card-profile .copy-cont .value');
  if (valueElement) {
    const text = valueElement.textContent.trim();
    if (text.startsWith('#')) return text.substring(1);
    return text;
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

    if (getComputedStyle(profile).position !== 'relative') {
      profile.style.position = 'relative';
    }

    const div = document.createElement('div');
    div.className = 'kirka-biotext-badge';
    div.style.cssText = `
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      z-index: 100;
      pointer-events: none;
      background: rgba(0,0,0,0.5);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    `;

    const safeText = (() => {
      const d = document.createElement('div');
      d.textContent = badgeInfo.text;
      return d.innerHTML;
    })();

    div.innerHTML = `
      <img src="${badgeInfo.image}" style="height:1rem;width:auto;border-radius:50%;" onerror="this.style.display='none'" />
      <span style="font-size:0.85rem;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${safeText}</span>
    `;

    profile.appendChild(div);
    activeBioTextBadgeId = currentId;
    console.log(`[Kirka] ✅ Biotext badge added for ${currentId}: "${badgeInfo.text}"`);
    isBioTextProcessing = false;
    return true;
  } catch (error) {
    console.error('[Kirka] Error injecting biotext badge:', error);
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
  tabObserver.observe(profileContent, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
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
  bioTextObservers.forEach(observer => {
    try { observer.disconnect(); } catch(e) {}
  });
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
    currentUser = userData?.statusCode === 401 ? null : userData;

    localStorage.setItem("juice-customizations", JSON.stringify(customizations));
    if (currentUser) localStorage.setItem("current-user", JSON.stringify(currentUser));
  } catch (err) {
    console.warn("[Kirka Badges] Failed to fetch data:", err);
    const stored = localStorage.getItem("juice-customizations");
    if (stored) customizations = JSON.parse(stored);
    const storedUser = localStorage.getItem("current-user");
    if (storedUser) currentUser = JSON.parse(storedUser);
  }
}

// ─── Load Settings ────────────────────────────────────────────────────────────

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      "kb_server_maps", 
      "kb_default_css",
      "kb_hitmarker_link",
      "kb_killicon_link",
      "kb_ui_animations",
      "kb_rave_mode",
      "kb_lobby_keybind_reminder",
      "kb_spectate_button",
      "kb_hide_chat",
      "kb_hide_interface",
      "kb_skip_loading"
    ], (result) => {
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
      
      if (settings.defaultCSS) {
        applyDefaultCSS();
      } else {
        removeDefaultCSS();
      }
      
      applyGameStyles();
      resolve();
    });
  });
}

// ─── Game Styles ──────────────────────────────────────────────────────────────

function applyGameStyles() {
  if (addedStyles) {
    addedStyles.remove();
    addedStyles = null;
  }
  
  const styles = [];
  
  if (settings.hitmarker_link !== "")
    styles.push(
      `.hitmark { content: url(${formatLink(settings.hitmarker_link)}) !important; }`
    );
  
  if (settings.killicon_link !== "")
    styles.push(`.animate-cont::before { content: ""; 
    background: url(${formatLink(settings.killicon_link)}); width: 10rem; height: 10rem; margin-bottom: 2rem; display: inline-block; background-position: center; background-size: contain; background-repeat: no-repeat; }
    .animate-cont svg { display: none; }`);
  
  if (!settings.ui_animations)
    styles.push(
      "* { transition: none !important; animation: none !important; }"
    );
  
  if (settings.rave_mode)
    styles.push(
      "canvas { animation: rotateHue 1s linear infinite !important; }"
    );
  
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

function formatLink(link) {
  return link;
}

// ─── Default CSS ──────────────────────────────────────────────────────────────

function applyDefaultCSS() {
  if (injectedDefaultStyleElement) {
    injectedDefaultStyleElement.remove();
    injectedDefaultStyleElement = null;
  }
  
  const defaultCSS = `

.nickname {
  display: flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: visible !important;
}

.kirka-nickname-span {
  white-space: nowrap !important;
  display: inline-block !important;
}

.kirka-badges {
  display: inline-flex !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
}

.head-right {
  white-space: nowrap !important;
}

.you-head {
  flex-wrap: nowrap !important;
}
.left-icons, .left-interface, .right-interface, .play-content, .logo, .team-section, .invite-right, .invite-left1, .invite-left2, .invite-btn {
  zoom: 0.70;
}
.left-icons {
  height: 1430px !important;
}

.soc-group:has(.svg-icon--__gamepad__) {
  background: linear-gradient(135deg, #1A8E50 0%, #2aae60 50%, #0e6e3a 100%) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(26, 142, 80, 0.3) !important;
  transition: all 0.3s ease !important;
}

.weapon-skin .rar-skin,
.body-skin .rar-skin,
.chest .rar-skin {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  top: unset;
  height: 4px;
  width: 100%;
}

.weapon-skin .subj-img,
.body-skin .subj-img,
.chest .subj-img {
  transition: transform 0.3s ease;
}

.weapon-skin:hover .subj-img,
.body-skin:hover .subj-img,
.chest:hover .subj-img {
  transform: rotate(20deg);
}

.weapon-skin .item-name,
.body-skin .item-name,
.chest .item-name {
  position: absolute;
  bottom: 8px;
  left: 8px;
  top: unset;
  right: unset;
}

.weapon-skin,
.body-skin,
.chest {
  position: relative;
  overflow: hidden;
}

.hover-btns-group {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  grid-template-rows: 1fr 1fr !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

.take-btn {
  grid-column: 1 !important;
  grid-row: 1 !important;
}

.market-btn {
  grid-column: 2 !important;
  grid-row: 1 !important;
}

.sell-btn {
  grid-column: 1 !important;
  grid-row: 2 !important;
}

.inspect-btn {
  grid-column: 2 !important;
  grid-row: 2 !important;
}
/* Default - center single button */
.hover-btns-group {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  position: absolute !important;
  inset: 0 !important;
}

/* Chest - side by side */
.chest .hover-btns-group {
  flex-direction: row !important;
  gap: 8px !important;
}

/* Multiple buttons - grid layout */
.weapon-skin .hover-btns-group,
.body-skin .hover-btns-group {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  grid-template-rows: 1fr 1fr !important;
  position: absolute !important;
  inset: 0 !important;
}

.take-btn {
  grid-column: 1 !important;
  grid-row: 1 !important;
}

.market-btn {
  grid-column: 2 !important;
  grid-row: 1 !important;
}

.sell-btn {
  grid-column: 1 !important;
  grid-row: 2 !important;
}

.inspect-btn {
  grid-column: 2 !important;
  grid-row: 2 !important;
}
.servers {
    width: 90vw !important;
    height: 80vh !important;
    max-height: unset !important;
    max-width: unset !important;
}
.menu {
    width: 90vw !important;
    height: 80vh !important;
    max-height: unset !important;
    max-width: unset !important;
}
.daily-rewards-btn,
.special-message-home {
    display: none !important;
}
  `;
  
  injectedDefaultStyleElement = document.createElement("style");
  injectedDefaultStyleElement.id = "kirka-default-css";
  injectedDefaultStyleElement.textContent = defaultCSS;
  document.head.appendChild(injectedDefaultStyleElement);
  console.log("[Kirka Badges] Default CSS applied");
}

function removeDefaultCSS() {
  if (injectedDefaultStyleElement) {
    injectedDefaultStyleElement.remove();
    injectedDefaultStyleElement = null;
    console.log("[Kirka Badges] Default CSS removed");
  }
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

// ─── Custom CSS Handlers ─────────────────────────────────────────────────────

function applyRawCSS(css) {
  if (injectedStyleElement) {
    injectedStyleElement.remove();
  }
  
  if (css && css.trim()) {
    injectedStyleElement = document.createElement("style");
    injectedStyleElement.id = "kirka-custom-css";
    injectedStyleElement.textContent = css;
    document.head.appendChild(injectedStyleElement);
    console.log("[Kirka Badges] Raw CSS applied");
  }
}

function clearRawCSS() {
  if (injectedStyleElement) {
    injectedStyleElement.remove();
    injectedStyleElement = null;
    console.log("[Kirka Badges] Raw CSS cleared");
  }
}

function applyCSSLink(link) {
  if (injectedLinkElement) {
    injectedLinkElement.remove();
  }
  
  if (link && link.trim()) {
    injectedLinkElement = document.createElement("link");
    injectedLinkElement.id = "kirka-custom-link";
    injectedLinkElement.rel = "stylesheet";
    injectedLinkElement.href = link;
    document.head.appendChild(injectedLinkElement);
    console.log("[Kirka Badges] CSS link applied:", link);
  }
}

function removeCSSLink() {
  if (injectedLinkElement) {
    injectedLinkElement.remove();
    injectedLinkElement = null;
    console.log("[Kirka Badges] CSS link removed");
  }
}

async function loadCustomCSS() {
  const result = await chrome.storage.local.get(["kb_raw_css", "kb_css_link"]);
  if (result.kb_raw_css) {
    applyRawCSS(result.kb_raw_css);
  }
  if (result.kb_css_link) {
    applyCSSLink(result.kb_css_link);
  }
}

// ─── Lobby Customizations ─────────────────────────────────────────────────────

function applyLobbyCustomizations() {
  if (!settings.customizations || !customizations) return;

  // Handle all player-cont blocks in the lobby (team section + any other lobby slots)
  const playerConts = document.querySelectorAll(".team-section .player-cont, #team-section .player-cont");

  playerConts.forEach(playerCont => {
    const headRight = playerCont.querySelector(".head-right");
    const lobbyNickname = headRight?.querySelector(".nickname");
    if (!lobbyNickname) return;

    // Try to get the shortId from a data attribute set by the game, or fall back to currentUser
    // The lobby player-cont doesn't expose shortId in the DOM directly, so we match by nickname text
    // For the logged-in player we can match via currentUser; for others we scan all customizations
    // by checking if the nickname text matches any known username in the badge data.
    let resolvedShortId = null;
    let resolvedCustoms = null;

    // First: check if this is the logged-in user's slot
    if (currentUser) {
      const nicknameText = lobbyNickname.childNodes[0]?.textContent?.trim() || lobbyNickname.textContent.trim();
      // Match by username (currentUser.name or nickname field)
      const currentName = currentUser.name || currentUser.wNmnw || currentUser.nickname || "";
      if (currentName && nicknameText === currentName) {
        resolvedShortId = currentUser.shortId || currentUser.wMWWm;
        resolvedCustoms = getCustomsForId(resolvedShortId);
      }
    }

    // If we couldn't match via currentUser, try matching nickname text against all badge entries
    if (!resolvedCustoms && customizations) {
      const nicknameText = lobbyNickname.childNodes[0]?.textContent?.trim() || lobbyNickname.textContent.trim();
      const match = customizations.find(c => c.name && c.name === nicknameText);
      if (match) {
        resolvedShortId = match.shortId;
        resolvedCustoms = match;
      }
    }

    // If still no match and this is the only player-cont, fall back to currentUser
    if (!resolvedCustoms && currentUser && playerConts.length === 1) {
      resolvedShortId = currentUser.shortId || currentUser.wMWWm;
      resolvedCustoms = getCustomsForId(resolvedShortId);
    }

    if (!resolvedCustoms || !resolvedShortId) return;

    lobbyNickname.style.cssText = "display: flex; align-items: center; gap: 0.25rem; overflow: unset !important;";

    if (resolvedCustoms.gradient) {
      lobbyNickname.style.background = `linear-gradient(${resolvedCustoms.gradient.rot}, ${resolvedCustoms.gradient.stops.join(", ")})`;
      lobbyNickname.style.webkitBackgroundClip = "text";
      lobbyNickname.style.backgroundClip = "text";
      lobbyNickname.style.webkitTextFillColor = "transparent";
      lobbyNickname.style.textShadow = resolvedCustoms.gradient.shadow || "0 0 0 transparent";
      lobbyNickname.style.fontWeight = "700";

      if (settings.animations && resolvedCustoms.animated) {
        lobbyNickname.style.backgroundSize = "200% 200%";
        lobbyNickname.style.animation = "kirka-badges-gradient 3s linear infinite";
      }
    }

    // Don't re-add badges if already present for the same shortId
    const existingBadges = lobbyNickname.querySelector(".kirka-badges");
    if (existingBadges && existingBadges.dataset.shortId === resolvedShortId) return;
    if (existingBadges) existingBadges.remove();

    const badgesElem = createBadgesContainer(resolvedShortId);
    badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; flex-shrink: 0;";
    lobbyNickname.appendChild(badgesElem);
    populateBadges(badgesElem, resolvedCustoms, "32px");
  });

  // Also handle the standalone heads block outside of player-cont (original fallback)
  const standaloneNickname =
    document.querySelector(".heads .head-right .nickname:not(.team-section .nickname):not(#team-section .nickname)");
  if (standaloneNickname && currentUser) {
    const resolvedShortId = currentUser.shortId || currentUser.wMWWm;
    const resolvedCustoms = getCustomsForId(resolvedShortId);
    if (!resolvedCustoms) return;

    standaloneNickname.style.cssText = "display: flex; align-items: center; gap: 0.25rem; overflow: unset !important;";

    if (resolvedCustoms.gradient) {
      standaloneNickname.style.background = `linear-gradient(${resolvedCustoms.gradient.rot}, ${resolvedCustoms.gradient.stops.join(", ")})`;
      standaloneNickname.style.webkitBackgroundClip = "text";
      standaloneNickname.style.backgroundClip = "text";
      standaloneNickname.style.webkitTextFillColor = "transparent";
      standaloneNickname.style.textShadow = resolvedCustoms.gradient.shadow || "0 0 0 transparent";
      standaloneNickname.style.fontWeight = "700";

      if (settings.animations && resolvedCustoms.animated) {
        standaloneNickname.style.backgroundSize = "200% 200%";
        standaloneNickname.style.animation = "kirka-badges-gradient 3s linear infinite";
      }
    }

    const existingBadges = standaloneNickname.querySelector(".kirka-badges");
    if (existingBadges && existingBadges.dataset.shortId === resolvedShortId) return;
    if (existingBadges) existingBadges.remove();

    const badgesElem = createBadgesContainer(resolvedShortId);
    badgesElem.style.cssText = "display: flex; gap: 0.25rem; align-items: center; flex-shrink: 0;";
    standaloneNickname.appendChild(badgesElem);
    populateBadges(badgesElem, resolvedCustoms, "32px");
  }
}

// ─── Profile Customizations ───────────────────────────────────────────────────

function applyProfileCustomizations() {
  if (!settings.customizations || !customizations) return;

  const profile = document.querySelector(".tab-content > .profile-cont > .profile");
  if (!profile) return;

  const shortIdRaw = profile.querySelector(".card-profile .copy-cont .value")?.textContent.trim();
  if (!shortIdRaw) return;
  const shortId = shortIdRaw.split("#")[1];

  const customs = getCustomsForId(shortId);
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

  if (!customs) return;

  const span = nickname.querySelector(".kirka-nickname-span");
  if (span && customs.gradient) {
    applyGradientToElement(span, customs.gradient, customs.animated);
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
    @keyframes pqvSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .profile-quick-view {
      margin-top: 20px;
    }
    .profile-quick-view .head-text {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--yellow, #ffb914);
    }
    .profile-quick-view .input {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .profile-quick-view .wrapper-input {
      flex: 1;
    }
    .profile-quick-view input {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }
    .profile-quick-view input:focus {
      border-color: var(--yellow, #ffb914);
      background: rgba(255,255,255,0.08);
    }
    .profile-quick-view input::placeholder {
      color: rgba(255,255,255,0.4);
    }
    .profile-quick-view .button.btn {
      background-color: var(--WwNnWwmM-1);
      --hover-color: var(--WwNnWwmM-2);
      --top: var(--WwNnWwmM-2);
      --bottom: var(--WwNnWwmM-3);
      padding: 10px 20px;
      white-space: nowrap;
      cursor: pointer;
    }
    .profile-quick-view .button.btn:hover {
      filter: brightness(1.05);
      transform: translateY(-1px);
    }
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

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') goToProfile(input.value);
  });

  const viewButton = document.createElement('button');
  viewButton.className = 'button btn';
  viewButton.style.cssText = `
    background-color: var(--WwNnWwmM-1);
    --hover-color: var(--WwNnWwmM-2);
    --top: var(--WwNnWwmM-2);
    --bottom: var(--WwNnWwmM-3);
  `;
  viewButton.innerHTML = `
    <div class="triangle"></div>
    <div class="text">VIEW PROFILE</div>
    <div class="WwNwmM">
      <div class="border-top border"></div>
      <div class="border-bottom border"></div>
    </div>
  `;
  viewButton.onclick = () => goToProfile(input.value);

  inputWrapper.appendChild(input);
  inputContainer.appendChild(inputWrapper);
  inputContainer.appendChild(viewButton);
  quickViewContainer.appendChild(header);
  quickViewContainer.appendChild(inputContainer);
  addFriendsContainer.appendChild(quickViewContainer);

  console.log('[Kirka Badges] Profile Quick View added');
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
    if (!src.includes(linkedBadgeUrl) && src !== '') {
      hasImageBadge = true;
      break;
    }
  }

  return hasImageBadge ? 2 : 1;
}

function sortFriendContainer(container) {
  if (!container) return;

  const items = Array.from(container.querySelectorAll('.friend'));
  if (items.length === 0) return;

  const priority2 = [];
  const priority1 = [];
  const priority0 = [];

  items.forEach(item => {
    const badgesDiv = item.querySelector('.kirka-badges');
    const hasAnyBadge = badgesDiv && badgesDiv.children.length > 0;

    if (!hasAnyBadge) {
      priority0.push(item);
      return;
    }

    const p = getFriendBadgePriority(item);
    if (p === 2) priority2.push(item);
    else priority1.push(item);
  });

  const sortByLevel = (a, b) => {
    const la = parseInt(a.querySelector('.level-amount')?.textContent || '0');
    const lb = parseInt(b.querySelector('.level-amount')?.textContent || '0');
    return lb - la;
  };

  priority2.sort(sortByLevel);
  priority1.sort(sortByLevel);
  priority0.sort(sortByLevel);

  [...priority2, ...priority1, ...priority0].forEach(item => container.appendChild(item));
}

function sortAllFriendContainers() {
  const seen = new Set();

  // Known containers
  ['.list', '.requests'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el && !seen.has(el)) { seen.add(el); sortFriendContainer(el); }
  });

  // Any parent of a .friend element not already covered
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

    nickname.style.cssText = `
      display: flex !important;
      align-items: flex-end !important;
      gap: 0.25rem !important;
      overflow: unset !important;
    `;

    if (customs.gradient) {
      nickname.style.cssText += `
        max-width: min-content !important;
        flex-direction: row !important;
        background: linear-gradient(${customs.gradient.rot}, ${customs.gradient.stops.join(", ")}) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        text-shadow: ${customs.gradient.shadow || "0 0 0 transparent"} !important;
        font-weight: 700 !important;
      `;
    }

    let badgesElem = nickname.querySelector(".kirka-badges");
    if (badgesElem && badgesElem.dataset.shortId === shortId) return;

    if (badgesElem) badgesElem.remove();
    badgesElem = createBadgesContainer(shortId);
    badgesElem.style.width = "0";
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
  } catch {
    return;
  }

  if (!news?.length) return;

  const categoryMap = {
    general:     showGeneral,
    promotional: showPromotional,
    event:       showEvent,
    alert:       showAlert,
  };

  news = news.filter(({ category }) => categoryMap[category]);
  if (!news.length) return;

  const container = document.createElement("div");
  container.id = "lobby-news";
  container.style.cssText = `
    width: 250px;
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    top: 178px;
    left: 148px;
    pointer-events: auto;
    z-index: 10;
  `;
  leftInterface.appendChild(container);

  news.forEach(item => {
    const card = document.createElement("div");
    card.className = "kb-news-card";
    card.style.cssText = `
      width: 100%;
      border: 4px solid #3e4d7c;
      border-bottom: 4px solid #26335b;
      border-top: 4px solid #4d5c8b;
      background-color: #3b4975;
      display: flex;
      position: relative;
      ${item.link ? "cursor: pointer;" : ""}
      ${item.imgType === "banner" ? "flex-direction: column;" : ""}
    `;
    container.appendChild(card);

    if (item.img && item.img !== "") {
      const img = document.createElement("img");
      img.src = item.img;
      img.style.cssText = `
        width: ${item.imgType === "banner" ? "100%" : "4rem"};
        max-height: ${item.imgType === "banner" ? "7.5rem" : "4rem"};
        object-fit: cover;
        object-position: center;
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
      if (item.link.startsWith("https://kirka.io/"))
        window.location.href = item.link;
      else
        window.open(item.link, "_blank");
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
      border: none !important;
      box-shadow: 0 4px 15px rgba(26, 142, 80, 0.3) !important;
      cursor: pointer;
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
    const obs = observeForElement(".card-cont.soc-group", () => {
      if (tryInject()) obs.disconnect();
    });
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
      border: none !important;
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3) !important;
      cursor: pointer;
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
    const obs = observeForElement(".card-cont.soc-group", () => {
      if (tryInject()) obs.disconnect();
    });
  }
}

// ─── Server Map Images ────────────────────────────────────────────────────────

let serverMapInterval = null;
let shiftClickHandler = null;

async function handleServers() {
  if (!settings.serverMaps) {
    console.log("[Kirka Badges] Server maps disabled");
    const servers = document.querySelectorAll(".server");
    servers.forEach(server => {
      server.style.backgroundImage = "";
    });
    return;
  }
  
  try {
    const mapImages = await fetch(
      "https://raw.githubusercontent.com/OBS-Akuma/imgdata/main/maps/full_mapimages.json"
    ).then((res) => res.json());

    Object.keys(mapImages).forEach((item) => {
      if (!mapImages[item].includes("https")) {
        mapImages[item] =
          "https://raw.githubusercontent.com/OBS-Akuma/imgdata/main" +
          mapImages[item];
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
        clearInterval(serverMapInterval);
        serverMapInterval = null;
      }
      if (settings.serverMaps) {
        replaceMapImages();
      }
    }, 250);
  } catch (err) {
    console.warn("[Kirka Badges] Failed to load server maps:", err);
  }
}

// ─── Shift+Click Profile Navigation ──────────────────────────────────────────

function setupShiftClickHandler() {
  if (shiftClickHandler) {
    document.removeEventListener("click", shiftClickHandler);
  }
  
  shiftClickHandler = (e) => {
    if (e.shiftKey && e.target.classList.contains("author-name")) {
      setTimeout(() => {
        navigator.clipboard.readText().then((text) => {
          window.location.href = `${BASE_URL}profile/${text.replace("#", "")}`;
          const username = e.target.innerText.replace(":", "");
          console.log(`[Kirka Badges] Loading ${username}'s profile...`);
        }).catch(() => {
          console.log("[Kirka Badges] Failed to read clipboard");
        });
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

function handleServersPage() {
  handleServers();
}

function handleInGame() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    if (!document.querySelector(".desktop-game-interface")) {
      clearInterval(gameInterval);
      gameInterval = null;
      return;
    }
    observeShortIds();
    applyTabCustomizations();

    document.querySelectorAll(".desktop-game-interface .player-list").forEach(list => {
      if (list.dataset.kbObserver) return;
      list.dataset.kbObserver = "true";
      new MutationObserver(() => {
        observeShortIds();
        applyTabCustomizations();
      }).observe(list, { childList: true, subtree: false });
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

  // Inject quick view immediately and on each tick if missing
  addProfileQuickViewStyles();
  setTimeout(() => addProfileQuickView(), 600);

  let sortDebounce = null;

  friendsInterval = setInterval(() => {
    if (!window.location.href.startsWith(`${BASE_URL}friends`)) {
      clearInterval(friendsInterval);
      friendsInterval = null;
      return;
    }
    applyFriendsCustomizations();
    addProfileQuickView();

    // Debounced sort — runs after badges have been applied
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
  }
}).observe(document.body, { childList: true, subtree: true });

const _pushState = history.pushState.bind(history);
history.pushState = (...args) => {
  _pushState(...args);
  activeBioTextBadgeId = null;
  setTimeout(routeCurrentPage, 200);
};
window.addEventListener("popstate", () => {
  activeBioTextBadgeId = null;
  setTimeout(routeCurrentPage, 200);
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  injectStyles();
  await loadSettings();

  await Promise.all([
    fetchData(),
    fetchBioTextData()
  ]);

  await loadCustomCSS();
  setupShiftClickHandler();

  watchBioTextDOMChanges();
  startBioTextPeriodicCheck();

  // Initialize mentions system
  await initMentions();

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
    Promise.all([fetchData(), fetchBioTextData()]).then(routeCurrentPage);
  }
  if (msg.type === "setting_changed") {
    if (msg.key === "kb_badges") settings.customizations = msg.value;
    if (msg.key === "kb_animations") settings.animations = msg.value;
    if (msg.key === "kb_server_maps") {
      settings.serverMaps = msg.value;
      if (window.location.href.startsWith(`${BASE_URL}servers/`)) {
        handleServers();
      }
    }
    if (msg.key === "kb_default_css") {
      settings.defaultCSS = msg.value;
      if (settings.defaultCSS) {
        applyDefaultCSS();
      } else {
        removeDefaultCSS();
      }
    }
    if (msg.key === "kb_hitmarker_link") {
      settings.hitmarker_link = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_killicon_link") {
      settings.killicon_link = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_ui_animations") {
      settings.ui_animations = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_rave_mode") {
      settings.rave_mode = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_lobby_keybind_reminder") {
      settings.lobby_keybind_reminder = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_spectate_button") {
      settings.spectate_button = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_hide_chat") {
      settings.hide_chat = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_hide_interface") {
      settings.hide_interface = msg.value;
      applyGameStyles();
    }
    if (msg.key === "kb_skip_loading") {
      settings.skip_loading = msg.value;
      applyGameStyles();
    }
    routeCurrentPage();
  }
  if (msg.type === "news_settings_changed") {
    document.getElementById("lobby-news")?.remove();
    lobbyNews();
  }
  if (msg.type === "apply_raw_css") {
    applyRawCSS(msg.css);
  }
  if (msg.type === "clear_raw_css") {
    clearRawCSS();
  }
  if (msg.type === "apply_css_link") {
    applyCSSLink(msg.link);
  }
  if (msg.type === "remove_css_link") {
    removeCSSLink();
  }
});

// ─── Right Shift Popup Handler ────────────────────────────────────────────────

function handleRightShift(e) {
  if (e.code === "ShiftRight") {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "openPopup" }).catch(() => {
      console.log("[Kirka Badges] Right Shift pressed - opening popup");
    });
  }
}

document.addEventListener("keydown", handleRightShift);
