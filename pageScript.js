// Date.now speed controller for the MAIN world.
(function () {
  "use strict";

  const originalDateNow = Date.now.bind(Date);
  const originalPerformanceNow = performance.now.bind(performance);
  const nativeSetInterval = window.setInterval.bind(window);

  let speedConfig = {
    speed: 0,
    cbDateNowChecked: true
  };

  // Keep a moving anchor so changing the checkbox or speed never causes
  // Date.now() to jump backwards or forwards.
  let dateNowAnchor = originalDateNow();
  let performanceAnchor = originalPerformanceNow();

  function getDateNowSpeed() {
    // Checked: use the speed selected in the extension (including 0).
    if (speedConfig.cbDateNowChecked) {
      const selectedSpeed = Number(speedConfig.speed);
      return Number.isFinite(selectedSpeed) ? selectedSpeed : 0;
    }

    // Unchecked: return to the real clock rate so time can advance normally.
    return 1;
  }

  function controlledDateNow() {
    const elapsed = originalPerformanceNow() - performanceAnchor;
    return dateNowAnchor + elapsed * getDateNowSpeed();
  }

  function applyNextConfig(nextConfig) {
    if (!nextConfig || typeof nextConfig !== "object") return;

    // First preserve the current clock value, then apply the new settings.
    dateNowAnchor = controlledDateNow();
    performanceAnchor = originalPerformanceNow();

    if (Object.prototype.hasOwnProperty.call(nextConfig, "speed")) {
      const selectedSpeed = Number(nextConfig.speed);
      if (Number.isFinite(selectedSpeed)) {
        speedConfig.speed = selectedSpeed;
      }
    }

    if (Object.prototype.hasOwnProperty.call(nextConfig, "cbDateNowChecked")) {
      speedConfig.cbDateNowChecked = Boolean(nextConfig.cbDateNowChecked);
    }

    keepDateNowControlled();
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

  // Re-apply if the game replaces Date.now during an in-game transition.
  nativeSetInterval(keepDateNowControlled, 100);

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig") return;
    applyNextConfig(data.config);
  });

  window.postMessage({ command: "getSpeedConfig" }, "*");
})();