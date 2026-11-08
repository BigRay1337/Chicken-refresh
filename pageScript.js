// Date.now speed controller for the MAIN world.
// TRUE uses the selected speed (including 0); FALSE uses the fallback
// multiplier so the game clock continues moving instead of remaining frozen.
(function () {
  "use strict";

  const originalDateNow = Date.now.bind(Date);
  const originalPerformanceNow = performance.now.bind(performance);
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

    // FALSE releases Date.now from the selected 0-speed freeze.
    dateNowValue = DATE_NOW_FALSE_SPEED_FALLBACK;
    return dateNowValue;
  }

  Date.now = function () {
    const elapsed = originalPerformanceNow() - originalStartPerformance;
    return originalStartDateNow + elapsed * getDateNowSpeed();
  };

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
  });

  // Ask the isolated content script for the current popup settings.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
