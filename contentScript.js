let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "setSpeedConfig") {
    speedConfig = {
      speed: Number(request.config?.speed) || 0,
      cbSetIntervalChecked: !!request.config?.cbSetIntervalChecked,
      cbSetTimeoutChecked: !!request.config?.cbSetTimeoutChecked,
      cbPerformanceNowChecked: !!request.config?.cbPerformanceNowChecked,
      cbDateNowChecked: request.config?.cbDateNowChecked !== false,
      cbRequestAnimationFrameChecked: !!request.config?.cbRequestAnimationFrameChecked,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });

    sendResponse({ ok: true });
  } else if (request.command === "getSpeedConfig") {
    sendResponse(speedConfig);
  }

  return true;
});

window.addEventListener("message", (e) => {
  if (!e.data) return;

  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
    return;
  }

  // Bridge page-world refresh requests to the extension service worker.
  // The page-world script cannot call chrome.runtime directly.
  if (e.data.command === "chickenRefreshWebsite") {
    chrome.runtime.sendMessage({ command: "chickenRefreshWebsite" });
  }
});
