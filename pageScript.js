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

  // Date.now: checked=true freezes at speed 0; checked=false uses finite fallback speed 0.371.
  // dateNowValue remains finite; if an update becomes invalid, fall back to the last finite value.
  (function () {
    let dateNowValue = null;
    let previousDateNowValue = null;
    let lastFiniteDateNowValue = null;
    const FALLBACK_DATE_NOW_SPEED = 0.371;
    const CHECKED_DATE_NOW_SPEED = 0;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (!Number.isFinite(originalValue)) {
        return Math.floor(
          Number.isFinite(lastFiniteDateNowValue)
            ? lastFiniteDateNowValue
            : 0
        );
      }

      if (!Number.isFinite(dateNowValue)) {
        dateNowValue = originalValue;
      }
      if (!Number.isFinite(lastFiniteDateNowValue)) {
        lastFiniteDateNowValue = dateNowValue;
      }

      if (previousDateNowValue !== null) {
        const elapsed = originalValue - previousDateNowValue;
        const selectedSpeed = speedConfig.cbDateNowChecked
          ? CHECKED_DATE_NOW_SPEED
          : FALLBACK_DATE_NOW_SPEED;
        const nextDateNowValue = dateNowValue + elapsed * selectedSpeed;

        if (Number.isFinite(nextDateNowValue)) {
          dateNowValue = nextDateNowValue;
          lastFiniteDateNowValue = nextDateNowValue;
        } else {
          dateNowValue = lastFiniteDateNowValue;
        }
      }

      previousDateNowValue = originalValue;

      if (!Number.isFinite(dateNowValue)) {
        dateNowValue = Number.isFinite(lastFiniteDateNowValue)
          ? lastFiniteDateNowValue
          : originalValue;
      }

      return Math.floor(dateNowValue);
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
