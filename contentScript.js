let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

let swipeStartY = null;
const SWIPE_UP_THRESHOLD = 30;

document.addEventListener("touchstart", (event) => {
  if (event.touches.length > 0) {
    swipeStartY = event.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (swipeStartY === null || event.changedTouches.length === 0) return;

  const endY = event.changedTouches[0].clientY;
  const swipeDistance = swipeStartY - endY;
  swipeStartY = null;

  if (swipeDistance >= SWIPE_UP_THRESHOLD) {
    const disabledConfig = { ...speedConfig, cbDateNowChecked: false };
    speedConfig = disabledConfig;
    window.postMessage({
      command: "setSpeedConfig",
      config: disabledConfig,
    });

    const enabledConfig = { ...disabledConfig, cbDateNowChecked: true };
    speedConfig = enabledConfig;
    window.postMessage({
      command: "setSpeedConfig",
      config: enabledConfig,
    });
  }
}, { passive: true });
