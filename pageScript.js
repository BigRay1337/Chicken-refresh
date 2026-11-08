// Date.now speed controller for the MAIN world.
(function () {
  "use strict";

  const originalDateNow = Date.now.bind(Date);
  const originalPerformanceNow = performance.now.bind(performance);
  const nativeSetInterval = window.setInterval.bind(window);
  const DATE_NOW_FALSE_SPEED_FALLBACK = 0.3630;

  let speedConfig = {
    speed: 0,
    cbDateNowChecked: true
  };

  let dateNowValue = DATE_NOW_FALSE_SPEED_FALLBACK;
  const originalStartDateNow = originalDateNow();
  const originalStartPerformance = originalPerformanceNow();

  function getDateNowSpeed() {
    if (speedConfig.cbDateNowChecked) {
      const selectedSpeed = Number(speedConfig.speed);
      return Number.isFinite(selectedSpeed) ? selectedSpeed : 0;
    }

    dateNowValue = DATE_NOW_FALSE_SPEED_FALLBACK;
    return dateNowValue;
  }

  // Keep one stable clock origin for the lifetime of this document. When
  // speed is 0, Date.now() remains frozen at originalStartDateNow.
  function controlledDateNow() {
    const elapsed = originalPerformanceNow() - originalStartPerformance;
    return originalStartDateNow + elapsed * getDateNowSpeed();
  }

  function keepDateNowControlled() {
    if (Date.now !== controlledDateNow) {
      try {
        Date.now = controlledDateNow;
      } catch (error) {
        // Retry on the next watchdog tick if another script blocks assignment.
      }
    }
  }

  Date.now = controlledDateNow;

  // Some games replace Date.now during in-game transitions without reloading
  // the tab. Re-apply the same controller without resetting its frozen origin.
  nativeSetInterval(keepDateNowControlled, 100);

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const nextConfig = data.config;
    if (Object.prototype.hasOwnProperty.call(nextConfig, "speed")) {
      const selectedSpeed = Number(nextConfig.speed);
      speedConfig.speed = Number.isFinite(selectedSpeed) ? selectedSpeed : 0;
    }
    if (Object.prototype.hasOwnProperty.call(nextConfig, "cbDateNowChecked")) {
      speedConfig.cbDateNowChecked = Boolean(nextConfig.cbDateNowChecked);
    }

    keepDateNowControlled();
  });

  window.postMessage({ command: "getSpeedConfig" }, "*");
})();