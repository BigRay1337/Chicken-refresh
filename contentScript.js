let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command === "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data && e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig
    });
  }
});

let port = null;

function checkExtension() {
  try {
    if (!chrome.runtime || !chrome.runtime.id) throw new Error("Extension unavailable");

    if (!port) {
      port = chrome.runtime.connect({name: "chick-plus-state"});
      port.onDisconnect.addListener(() => {
        port = null;
        window.postMessage({
          command: "setExtensionDateNowState",
          enabled: false
        });
      });
    }

    window.postMessage({
      command: "setExtensionDateNowState",
      enabled: true
    });
  } catch (e) {
    window.postMessage({
      command: "setExtensionDateNowState",
      enabled: false
    });
    return;
  }

  setTimeout(checkExtension, 250);
}

checkExtension();