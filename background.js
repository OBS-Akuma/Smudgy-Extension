// background.js - Kirka Badges extension

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-popup") {
    openNonResizablePopup();
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "openPopup") {
    openNonResizablePopup();
  }
});

function openNonResizablePopup() {
  // First try to open the default popup
  chrome.action.openPopup().catch(() => {
    // Fallback: create non-resizable popup window
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 340,
      height: 580,
      focused: true,
      resizable: false  // This prevents resizing
    });
  });
}

// Optional: Handle when extension icon is clicked normally
chrome.action.onClicked.addListener((tab) => {
  openNonResizablePopup();
});