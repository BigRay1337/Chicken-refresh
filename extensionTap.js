// Runs only on the extension popup page.
(function () {
  function triggerActiveTabRefreshIfDisabled() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) return;

      chrome.tabs.sendMessage(
        tab.id,
        { command: "tapRefreshIfDateNowDisabled" },
        () => {
          // The active tab may not have the content script available.
          void chrome.runtime.lastError;
        }
      );
    });
  }

  document.addEventListener("click", () => {
    // Let the popup's checkbox state update first.
    window.setTimeout(triggerActiveTabRefreshIfDisabled, 50);
  }, true);
})();
