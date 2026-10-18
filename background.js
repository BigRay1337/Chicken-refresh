// Extension service worker.
chrome.runtime.onInstalled.addListener((details) => {
  // Preserve the existing donation-page behavior on install/update.
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

// Reload the whole tab from the extension context. This avoids relying on a
// cross-origin game frame being allowed to reload window.top itself.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.command !== "chickenRefreshWebsite") return;

  const tabId = sender.tab?.id;
  if (typeof tabId !== "number") {
    sendResponse({ ok: false, error: "No sender tab is available." });
    return;
  }

  chrome.tabs.reload(tabId, {}, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      sendResponse({ ok: false, error: error.message });
      return;
    }
    sendResponse({ ok: true });
  });

  return true;
});
