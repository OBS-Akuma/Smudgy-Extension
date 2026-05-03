

---

> **Don't Forget to join the [Discord server meow](https://discord.gg/RPRamwfGFh)**

# Smudgy Client

A powerful browser extension for Kirka.io that adds badges, mentions, custom fonts, chat autocomplete, game visual toggles, and much more.

---

## Features

### Badges & Cosmetics
- Custom gradient usernames (lobby, profile, in-game tab, ESC scoreboard, friends list)
- Custom badge images next to usernames (Discord linked, booster, custom badges from API)
- Animated gradient support per player
- Biotext badge overlay on profile cards (image + label in bottom-left corner)

### Mentions System
- WebSocket listener on `wss://chat.kirka.io` detecting pings by `#shortId` or `@username`
- Mentions panel accessible via **MENTIONS** tab in the inventory
- Red badge counter on the MENTIONS tab and on the INVENTORY sidebar icon
- Per-mention delete button and clear all functionality
- Persists across sessions via localStorage
- Tab flashes gold on new mention (no intrusive popups)

### Chat Command Autocomplete
- Type `/` in chat to see a suggestion box with all available commands
- Arrow keys, Tab, and Enter to navigate and select suggestions
- Click any suggestion to apply it
- **Supported commands:** `/inv`, `/hm`, `/locate`, `/flip`, `/myvotes`, `/gift`, `/topgifter`, `/mygift`, `/trade cancel`, `/trade bump`, `/trade accept`, `/trade offer my:`
- Smart subcommand filtering  typing `/trade` shows only trade subcommands
- Dismisses automatically when a complete command is typed or Escape is pressed
- Reattaches after SPA navigation

### Friends Page
- Friends sorted by badge tier (image badges → Discord-linked only → no badges)
- Level tiebreaking within each tier
- Quick Profile View widget below ADD FRIEND  type a short ID, press Enter or click VIEW PROFILE

### Lobby
- News cards (General, Promotional, Event, Alert  each toggleable via settings)
- Custom Discord button (Froke Discord server)
- Custom Smudgy Store button

### In-Game
- Gradient usernames + badges on the in-game player tab list
- Gradient usernames + badges on the ESC scoreboard

### Server Browser
- Map preview images on server cards

### Game Visuals (Toggleable via popup)
- Hide chat box
- Hide entire HUD (interface, crosshair, scores, hit indicators)
- Skip loading screen
- Custom hitmarker image URL
- Custom kill icon image URL
- Disable UI animations
- Rave mode (continuous canvas hue rotation)
- Hide spectate button
- Hide lobby keybind reminder

### Custom CSS
- Raw CSS injection (textarea in popup, live apply/clear)
- CSS stylesheet link injection (URL in popup, live apply/remove)
- Default CSS tweaks (UI zoom, inventory hover button grid, server/menu sizing, hide daily rewards banner)

### Misc
- **Shift+click** a chat author name → opens their profile
- **Right Shift key** opens the extension popup
- SPA navigation detection  all features survive page changes without reload
- Badge data and user data cached in localStorage with refresh button in popup

---

## Popup Settings (`popup.html` + `popup.js`)

| Category | Options |
|----------|---------|
| **Display** | Badges, Gradients, Animations, Server Maps, Default CSS |
| **Game Visuals** | UI Animations, Rave Mode, Hide Chat, Hide Interface, Skip Loading, Hitmarker URL, Killicon URL |
| **Lobby** | Keybind Reminder, Spectate Button |
| **News** | General, Events, Promotional, Alerts |
| **Custom CSS** | Raw CSS, CSS Link |
| **Data** | Refresh badge data, Clear cache  live badge count + last updated time |

---

## How To Install

1. **Download the repo**  
   Go to [github.com/OBS-Akuma/smudgy-Extension](https://github.com/OBS-Akuma/smudgy-Extension), click the green **Code** button, then **Download ZIP**

2. **Extract the ZIP**  
   Unzip it somewhere easy to find, like your Desktop

3. **Open Chrome extensions**  
   Go to `chrome://extensions` in your address bar

4. **Enable Developer Mode**  
   Toggle it on in the top-right corner of the extensions page

5. **Load the extension**  
   Click **Load unpacked**, then select the extracted folder (the one containing `manifest.json`)

6. **Done!**  
   The extension icon should appear in your toolbar. Navigate to `kirka.io` and it will activate automatically

---

## How To Update

After pulling new files from GitHub:

1. Replace the files in your local folder with the new ones
2. Go back to `chrome://extensions`
3. Click the **"↻" refresh icon** on the extension card

---

## Feature Images

<img width="1919" height="1025" alt="image" src="https://github.com/user-attachments/assets/5bfd0f12-d4b3-418f-b075-48822ffbb90d" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/57365b59-89f0-49a7-91ba-dbc854244ec7" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/01e2681b-2a20-40a4-be91-fe6eb121daf8" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/c0476ec1-3f7a-4a81-8d00-cdb72300c69b" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/fd1241ed-8627-41f0-b51f-82d3f4cc8019" />
<img width="575" height="784" alt="image" src="https://github.com/user-attachments/assets/1bc9cdf1-065c-4056-858d-714ce03e816f" />
<img width="775" height="570" alt="image" src="https://github.com/user-attachments/assets/322e04e1-f952-4d38-939f-7bb2e9d7039b" />
<img width="373" height="596" alt="image" src="https://github.com/user-attachments/assets/639f3929-19c9-458c-a44c-6dfb382d4d61" />
<img width="490" height="385" alt="image" src="https://github.com/user-attachments/assets/46acf20e-0d28-4769-9750-1941fe548e52" />

---

## Known Bugs

<img width="374" height="462" alt="image" src="https://github.com/user-attachments/assets/b1978e9f-aaf5-4169-a1cc-437530e6e4d1" />
<img width="890" height="100" alt="image" src="https://github.com/user-attachments/assets/55f7b803-aa0e-4b69-949c-704549d7373e" />
<img width="453" height="680" alt="image" src="https://github.com/user-attachments/assets/5fbd3986-492b-476d-8c49-263b206c808c" />
<img width="1159" height="980" alt="image" src="https://github.com/user-attachments/assets/f34f6f94-dfe8-4669-9e7b-d4eb76f7046c" />

---
