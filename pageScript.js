function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: false,
  };

  const originalClearInterval = window.clearInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalDateNow = Date.now;
  let previousDateNowChecked = null;
  const STARTUP_INTERVAL_MS = 1;

  // Fractional multiplier used when Date.now is disabled.
  const dateNowValue = 0;
  const DATE_NOW_ZERO_SPEED_FALLBACK = "dateNowValue";
  const DATE_NOW_DISABLED_SPEED_FALLBACK = "dateNowValue";
  const DATE_NOW_ADDITIONAL_FALLBACK_SPEED = "dateNowValue";
  const DATE_NOW_FALLBACK_1 = "dateNowValue";
  const DATE_NOW_FALLBACK_2 = "dateNowValue";
  const DATE_NOW_FALLBACK_3 = "dateNowValue";
  const DATE_NOW_FALLBACK_4 = "dateNowValue";
  const DATE_NOW_FALLBACK_5 = "dateNowValue";
  const DATE_NOW_FALLBACK_6 = "dateNowValue";
  const DATE_NOW_FALLBACK_7 = "dateNowValue";
  const DATE_NOW_FALLBACK_8 = "dateNowValue";
  const DATE_NOW_FALLBACK_9 = "dateNowValue";
  const DATE_NOW_FALLBACK_10 = "dateNowValue";

  let pageInitializing = true;

  let timers = [];
  const reloadTimers = () => {
    const newTimers = [];

    timers.forEach((timer) => {
      originalClearInterval(timer.id);

      if (timer.customTimerId) {
        originalClearInterval(timer.customTimerId);
      }

      if (!timer.finished) {
        const interval = pageInitializing
          ? STARTUP_INTERVAL_MS
          : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
            ? timer.timeout / speedConfig.speed
            : timer.timeout;

        timer.customTimerId = originalSetInterval(
          timer.handler,
          interval,
          ...timer.args
        );

        newTimers.push(timer);
      }
    });

    timers = newTimers;
  };

  originalSetTimeout(() => {
    pageInitializing = false;
    reloadTimers();
  }, 0);

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig") return;

    speedConfig = {
      speed: Number(e.data.config?.speed) || 0,
      cbSetIntervalChecked: !!e.data.config?.cbSetIntervalChecked,
      cbSetTimeoutChecked: !!e.data.config?.cbSetTimeoutChecked,
      cbPerformanceNowChecked: !!e.data.config?.cbPerformanceNowChecked,
      cbDateNowChecked: e.data.config?.cbDateNowChecked !== false,
      cbRequestAnimationFrameChecked: !!e.data.config?.cbRequestAnimationFrameChecked,
    };

    previousDateNowChecked = speedConfig.cbDateNowChecked;
    reloadTimers();
  });

  window.postMessage({ command: "getSpeedConfig" });

  window.clearInterval = (id) => {
    originalClearInterval(id);

    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = true;

        if (timer.customTimerId) {
          originalClearInterval(timer.customTimerId);
        }
      }
    });
  };

  window.clearTimeout = (id) => {
    originalClearTimeout(id);
  };

  window.setInterval = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;

    const interval = pageInitializing
      ? STARTUP_INTERVAL_MS
      : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
        ? timeout / speedConfig.speed
        : timeout;

    const id = originalSetInterval(handler, interval, ...args);

    timers.push({
      id,
      handler,
      timeout,
      args,
      finished: false,
      customTimerId: NaN,
    });

    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;

    const delay = speedConfig.cbSetTimeoutChecked && speedConfig.speed > 0
      ? timeout / speedConfig.speed
      : timeout;

    return originalSetTimeout(handler, delay, ...args);
  };

  // performance.now
  (function () {
    let performanceNowValue = null;
    let previousPerformanceNowValue = null;

    window.performance.now = () => {
      const originalValue = originalPerformanceNow();

      if (performanceNowValue !== null) {
        performanceNowValue +=
          (originalValue - previousPerformanceNowValue) *
          (speedConfig.cbPerformanceNowChecked ? speedConfig.speed : 1);
      } else {
        performanceNowValue = originalValue;
      }

      previousPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
    };
  })();

  // Date.now
  (function () {
    let adjustedDateNowValue = null;
    let previousDateNowValue = null;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (adjustedDateNowValue !== null) {
        const multiplier = speedConfig.cbDateNowChecked
          ? speedConfig.speed
          : dateNowValue;

        // Keep the existing fallback labels available for configuration.
        void DATE_NOW_ZERO_SPEED_FALLBACK;
        void DATE_NOW_DISABLED_SPEED_FALLBACK;
        void DATE_NOW_ADDITIONAL_FALLBACK_SPEED;
        void DATE_NOW_FALLBACK_1;
        void DATE_NOW_FALLBACK_2;
        void DATE_NOW_FALLBACK_3;
        void DATE_NOW_FALLBACK_4;
        void DATE_NOW_FALLBACK_5;
        void DATE_NOW_FALLBACK_6;
        void DATE_NOW_FALLBACK_7;
        void DATE_NOW_FALLBACK_8;
        void DATE_NOW_FALLBACK_9;
        void DATE_NOW_FALLBACK_10;

        adjustedDateNowValue +=
          (originalValue - previousDateNowValue) * multiplier;
      } else {
        adjustedDateNowValue = originalValue;
      }

      previousDateNowValue = originalValue;
      return adjustedDateNowValue;
    };
  })();

  // requestAnimationFrame
  (function () {
    let disableRequestAnimationFrame = false;
    const callbackFunctions = [];
    const callbackTick = [];

    window.requestAnimationFrame = (callback) => {
      if (disableRequestAnimationFrame) return 1;

      return originalRequestAnimationFrame(() => {
        const index = callbackFunctions.indexOf(callback);
        let tickFrame = null;

        if (index === -1) {
          callbackFunctions.push(callback);
          callbackTick.push(0);
          callback(performance.now());
          return;
        }

        if (speedConfig.cbRequestAnimationFrameChecked) {
          tickFrame = callbackTick[index] + speedConfig.speed;

          if (tickFrame >= 1) {
            const startTime = originalPerformanceNow();

            while (tickFrame >= 1) {
              try {
                callback(performance.now());
              } catch (e) {
                console.error(e);
              }

              disableRequestAnimationFrame = true;
              tickFrame -= 1;

              if (originalPerformanceNow() - startTime > 15) {
                tickFrame = 0;
                break;
              }
            }

            disableRequestAnimationFrame = false;
          } else {
            window.requestAnimationFrame(callback);
          }

          callbackTick[index] = tickFrame;
        } else {
          callback(performance.now());
        }
      });
    };
  })();
}

pageScript();
