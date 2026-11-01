let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: false,
  cbRequestAnimationFrameChecked: false,
};

function normalizeSpeedConfig(config) {
  const parsedSpeed = Number(config && config.speed);
  return {
    speed: Number.isFinite(parsedSpeed) && parsedSpeed >= 0 ? parsedSpeed : 0,
    cbSetIntervalChecked: !!(config && config.cbSetIntervalChecked),
    cbSetTimeoutChecked: !!(config && config.cbSetTimeoutChecked),
    cbPerformanceNowChecked: !!(config && config.cbPerformanceNowChecked),
    cbDateNowChecked: !!(config && config.cbDateNowChecked),
    cbRequestAnimationFrameChecked: !!(config && config.cbRequestAnimationFrameChecked),
  };
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!request || !request.command) return;

  if (request.command === "setSpeedConfig" && request.config) {
    speedConfig = normalizeSpeedConfig(request.config);
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    }, "*");
  } else if (request.command === "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (!e.data || e.data.command !== "getSpeedConfig") return;

  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  }, "*");
});