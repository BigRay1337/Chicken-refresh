function isGameRefreshPending() {
  try {
    return window.sessionStorage.getItem("__chickenRefreshDateNowPending") === "1";
  } catch (_) {
    return false;
  }
}

let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: !isGameRefreshPending(),
  cbRequestAnimationFrameChecked: false,
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "setSpeedConfig") {
    const requestedDateNowChecked = request.config?.cbDateNowChecked !== false;

    speedConfig = {
      speed: Number(request.config?.speed) || 0,
      cbSetIntervalChecked: !!request.config?.cbSetIntervalChecked,
      cbSetTimeoutChecked: !!request.config?.cbSetTimeoutChecked,
      cbPerformanceNowChecked: !!request.config?.cbPerformanceNowChecked,
      // The pending-refresh flag takes priority until the refreshed document
      // finishes loading, even if another settings message asks for true.
      cbDateNowChecked: isGameRefreshPending() ? false : requestedDateNowChecked,
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
  if (!e.data || e.data.command !== "getSpeedConfig") return;

  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
});
