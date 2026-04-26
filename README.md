# features
`Badges & Cosmetics`

Custom gradient usernames (lobby, profile, in-game tab, ESC scoreboard, friends list)
Custom badge images next to usernames (discord linked, booster, custom badges from API)
Animated gradient support per player
Biotext badge overlay on profile cards (image + label in bottom-left corner)

`Mentions System`

WebSocket listener on `wss://chat.kirka.io` detecting pings by `#shortId` or `username`
Mentions panel accessible via MENTIONS tab in the inventory
Red badge counter on the MENTIONS tab and on the INVENTORY sidebar icon
Per-mention delete button and clear all
Persists across sessions via localStorage
Tab flashes gold on new mention (no toast popup)

`Chat Command Autocomplete`

Type `/` in chat to see a suggestion box with all available commands
Arrow keys, Tab, and Enter to navigate and select
Click a suggestion to apply it
Commands: `/inv, /hm, /locate, /flip, /myvotes, /gift, /topgifter, /mygift, /trade cancel, /trade bump, /trade accept, /trade offer my:`
Smart subcommand filtering typing /trade shows only trade subcommands
Dismisses automatically when a complete command is typed or Escape is pressed
Reattaches after SPA navigation

`Friends Page`

Friends sorted by badge tier: image badges → discord-linked only → no badges, with level tiebreaking within each tier
Quick Profile View widget below ADD FRIEND  type a short ID, press Enter or click VIEW PROFILE

`Lobby`

News cards (general, promotional, event, alert each toggleable)
Custom Discord button (Froke Discord)
Custom Smudgy Store button

`In-Game`

Gradient usernames + badges on the in-game player tab list
Gradient usernames + badges on the ESC scoreboard

`Server Browser`

Map preview images on server cards

`Game Visuals (toggleable)`

Hide chat box
Hide entire HUD (interface, crosshair, scores, hit indicators)
Skip loading screen
Custom hitmarker image URL
Custom kill icon image URL
Disable UI animations
Rave mode (continuous canvas hue rotation)
Hide spectate button
Hide lobby keybind reminder

`Custom CSS`

Raw CSS injection (textarea in popup, live apply/clear)
CSS stylesheet link injection (URL in popup, live apply/remove)
Default CSS tweaks (UI zoom, inventory hover button grid, server/menu sizing, hide daily rewards banner)

`Misc`

Shift+click a chat author name opens their profile
Right Shift key opens the extension popup
SPA navigation detection — all features survive page changes without reload
Badge data and user data cached in localStorage with refresh button in popup

`Popup Settings (popup.html + popup.js)`

Display: Badges, Gradients, Animations, Server Maps, Default CSS
Game Visuals: UI Animations, Rave Mode, Hide Chat, Hide Interface, Skip Loading, Hitmarker URL, Killicon URL
Lobby: Keybind Reminder, Spectate Button
News: General, Events, Promotional, Alerts
Custom CSS: Raw CSS, CSS Link
Data: Refresh badge data, Clear cache, live badge count + last updated time

# How To Install
Download the repo go to `github.com/OBS-Akuma/smudgy-Extension`, click the green Code button, then Download ZIP
Extract the ZIP unzip it somewhere easy to find, like your Desktop
Open Chrome extensions go to `chrome://extensions` in your address bar
Enable Developer Mode toggle it on in the top-right corner of the extensions page
Load the extension click Load unpacked, then select the extracted folder (the one containing manifest.json)
Done the extension icon should appear in your toolbar. Navigate to `kirka.io` and it will activate automatically


To update after pulling new files from GitHub:

Replace the files in your local folder with the new ones
Go back to `chrome://extensions` and click the "↻" refresh icon on the extension card


# feature images:
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/cdc0430a-acf5-4d19-96be-2c296a55f7dd" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/57365b59-89f0-49a7-91ba-dbc854244ec7" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/01e2681b-2a20-40a4-be91-fe6eb121daf8" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/c0476ec1-3f7a-4a81-8d00-cdb72300c69b" />
<img width="1919" height="911" alt="image" src="https://github.com/user-attachments/assets/fd1241ed-8627-41f0-b51f-82d3f4cc8019" />
<img width="575" height="784" alt="image" src="https://github.com/user-attachments/assets/1bc9cdf1-065c-4056-858d-714ce03e816f" />
<img width="775" height="570" alt="image" src="https://github.com/user-attachments/assets/322e04e1-f952-4d38-939f-7bb2e9d7039b" />
<img width="384" height="602" alt="image" src="https://github.com/user-attachments/assets/16593e74-b154-4792-bfd6-5543cc605c13" />
