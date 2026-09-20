function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: false
  };

  const originalClearInterval = window.clearInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalDateNow = Date.now;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  const DATE_NOW_DISABLE_DELAY_MS = 1000;
  let extensionIsEnabled = true;
  let dateNowDisableTimer = null;

  window.addEventListener("message", (e) => {
    if (!e.data) return;

    if (e.data.command === "setSpeedConfig") {
      speedConfig = e.data.config || speedConfig;
    }

    if (e.data.command === "setExtensionDateNowState") {
      extensionIsEnabled = e.data.enabled === true;

      if (!extensionIsEnabled) {
        // CHICK+ behavior: leave Date.now spoofing active at 1x briefly,
        // then return it to normal operation without reloading the page.
        speedConfig.cbDateNowChecked = true;
        speedConfig.speed = 1;

        if (dateNowDisableTimer !== null) {
          originalClearTimeout(dateNowDisableTimer);
        }

        dateNowDisableTimer = originalSetTimeout(() => {
          dateNowDisableTimer = null;
          speedConfig.cbDateNowChecked = false;
        }, DATE_NOW_DISABLE_DELAY_MS);
      } else {
        if (dateNowDisableTimer !== null) {
          originalClearTimeout(dateNowDisableTimer);
          dateNowDisableTimer = null;
        }
        speedConfig.cbDateNowChecked = true;
      }
    }
  });

  window.postMessage({command: "getSpeedConfig"});

  // Date.now implementation preserved from the known CHICK+ behavior.
  (function () {
    let dateNowValue = null;
    let previusDateNowValue = null;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (dateNowValue !== null) {
        const multiplier =
          speedConfig.cbDateNowChecked ? speedConfig.speed : 1;

        dateNowValue +=
          (originalValue - previusDateNowValue) * multiplier;
      } else {
        dateNowValue = originalValue;
      }

      previusDateNowValue = originalValue;

      return Math.floor(0 + dateNowValue);
    };
  })();

  (function () {
    let performanceNowValue = null;
    let previusPerformanceNowValue = null;

    window.performance.now = () => {
      const originalValue = originalPerformanceNow();

      if (performanceNowValue !== null) {
        const multiplier =
          speedConfig.cbPerformanceNowChecked
            ? speedConfig.speed
            : 1;

        performanceNowValue +=
          (originalValue - previusPerformanceNowValue) * multiplier;
      } else {
        performanceNowValue = originalValue;
      }

      previusPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
    };
  })();

  let timers = [];

  window.setInterval = (handler, timeout, ...args) => {
    timeout = timeout || 0;

    const interval =
      speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
        ? timeout / speedConfig.speed
        : timeout;

    const id = originalSetInterval(handler, interval, ...args);
    timers.push({id, handler, timeout, args});
    return id;
  };

  window.clearInterval = (id) => {
    originalClearInterval(id);
    timers = timers.filter(t => t.id !== id);
  };

  window.setTimeout = (handler, timeout, ...args) => {
    timeout = timeout || 0;

    const delay =
      speedConfig.cbSetTimeoutChecked && speedConfig.speed > 0
        ? timeout / speedConfig.speed
        : timeout;

    return originalSetTimeout(handler, delay, ...args);
  };

  window.clearTimeout = (id) => {
    originalClearTimeout(id);
  };

  window.requestAnimationFrame = (callback) => {
    return originalRequestAnimationFrame((time) => {
      callback(time);
    });
  };
}

pageScript();