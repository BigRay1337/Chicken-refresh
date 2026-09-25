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
  } else if (request.command === "tapRefreshIfDateNowDisabled") {
    if (speedConfig.cbDateNowChecked === false) {
      window.postMessage({
        command: "dateNowRefreshFromTap",
      });
      sendResponse({ ok: true, triggered: true });
    } else {
      sendResponse({ ok: true, triggered: false });
    }
  }

  return true;
});

window.addEventListener("message", (e) => {
  if (!e.data || e.data.command !== "getSpeedConfig") return;

  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
});
