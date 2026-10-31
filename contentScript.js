let _0xc1 = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

chrome.runtime.onMessage.addListener(function (_0xc2, _0xc3, _0xc4) {
  if (_0xc2.command == "setSpeedConfig") {
    _0xc1 = _0xc2.config;
    window.postMessage(_0xc2);
  } else if (_0xc2.command == "getSpeedConfig") {
    _0xc4(_0xc1);
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: _0xc1,
    });
  }
});;
