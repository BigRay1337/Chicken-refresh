/*
 * Chicken-refresh page-world game hooks.
 * Settings arrive from contentScript.js through window.postMessage.
 * Keep native frame scheduling alive so games can still render/load; only
 * virtualize the timestamps and timer cadence selected in the options.
 */
(function () {
  "use strict";

  if (window.__chickenRefreshPageScriptInstalled) return;
  window.__chickenRefreshPageScriptInstalled = true;

  const native = {
    dateNow: Date.now.bind(Date),
    performanceNow: typeof performance !== "undefined" && performance.now
      ? performance.now.bind(performance)
      : null,
    setTimeout: window.setTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    requestAnimationFrame: window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : null
  };

  const config = {
    speed: 1,
    cbSetIntervalChecked: false,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: false,
    cbRequestAnimationFrameChecked: false
  };

  // Keep the negative epoch offset private to this closure. Date.now() starts
  // at elapsed time zero while the Date.now option is enabled.
  const originalDateNow = native.dateNow();
  const dateNowValue = -originalDateNow;

  const clock = {
    realDateStart: originalDateNow,
    virtualDateStart: -dateNowValue,
    realPerformanceStart: native.performanceNow ? native.performanceNow() : 0,
    virtualPerformanceStart: native.performanceNow ? native.performanceNow() : 0
  };

  function getSpeed() {
    const value = Number(config.speed);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 1000) : 0;
  }

  function virtualDateNow() {
    if (!config.cbDateNowChecked) return native.dateNow();
    return clock.virtualDateStart +
      (native.dateNow() - clock.realDateStart) * getSpeed();
  }

  function virtualPerformanceNow() {
    if (!native.performanceNow) return 0;
    if (!config.cbPerformanceNowChecked) return native.performanceNow();
    return clock.virtualPerformanceStart +
      (native.performanceNow() - clock.realPerformanceStart) * getSpeed();
  }

  function scaledDelay(delay) {
    const numeric = Math.max(0, Number(delay) || 0);
    const speed = getSpeed();
    if (speed === 0) return 2147483647;
    return Math.min(2147483647, numeric / speed);
  }

  // Preserve a live frame loop even at speed 0. A frozen RAF loop can prevent
  // canvas games from painting their initial frame and cause a black screen.
  if (native.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      return native.requestAnimationFrame(function (timestamp) {
        if (typeof callback !== "function") return;
        const frameTime = config.cbRequestAnimationFrameChecked
          ? (clock.virtualPerformanceStart +
             (timestamp - clock.realPerformanceStart) * getSpeed())
          : timestamp;
        callback.call(this, frameTime);
      });
    };
  }

  window.setTimeout = function (handler, delay) {
    const args = Array.prototype.slice.call(arguments, 2);
    const actualDelay = config.cbSetTimeoutChecked ? scaledDelay(delay) : delay;
    return native.setTimeout(function () {
      if (typeof handler === "function") handler.apply(window, args);
      else if (typeof handler === "string") (0, eval)(handler);
    }, actualDelay);
  };

  window.setInterval = function (handler, delay) {
    const args = Array.prototype.slice.call(arguments, 2);
    const actualDelay = config.cbSetIntervalChecked ? scaledDelay(delay) : delay;
    return native.setInterval(function () {
      if (typeof handler === "function") handler.apply(window, args);
      else if (typeof handler === "string") (0, eval)(handler);
    }, actualDelay);
  };

  Date.now = virtualDateNow;

  if (native.performanceNow) {
    try {
      Object.defineProperty(Performance.prototype, "now", {
        configurable: true,
        value: virtualPerformanceNow
      });
    } catch (error) {
      // Some browsers expose a non-configurable Performance.now.
    }
  }

  function applyConfig(next) {
    if (!next || typeof next !== "object") return;
    const previousSpeed = getSpeed();
    const nowDate = native.dateNow();
    const nowPerformance = native.performanceNow ? native.performanceNow() : 0;

    // Rebase clocks before changing speed to avoid jumps when options change.
    if (config.cbDateNowChecked) {
      clock.virtualDateStart += (nowDate - clock.realDateStart) * previousSpeed;
    } else {
      clock.virtualDateStart = nowDate;
    }
    clock.realDateStart = nowDate;

    if (config.cbPerformanceNowChecked && native.performanceNow) {
      clock.virtualPerformanceStart +=
        (nowPerformance - clock.realPerformanceStart) * previousSpeed;
    } else {
      clock.virtualPerformanceStart = nowPerformance;
    }
    clock.realPerformanceStart = nowPerformance;

    if (Object.prototype.hasOwnProperty.call(next, "speed")) {
      const speed = Number(next.speed);
      if (Number.isFinite(speed)) config.speed = speed;
    }

    [
      "cbSetIntervalChecked",
      "cbSetTimeoutChecked",
      "cbPerformanceNowChecked",
      "cbDateNowChecked",
      "cbRequestAnimationFrameChecked"
    ].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        config[key] = Boolean(next[key]);
      }
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;
    if (event.data.command === "setSpeedConfig") {
      applyConfig(event.data.config);
    } else if (event.data.command === "getSpeedConfig") {
      window.postMessage({
        command: "pageScriptReady",
        config: Object.assign({}, config)
      }, "*");
    }
  });

  // Ask the isolated content script to send its current settings. This also
  // handles pages where the MAIN-world script starts before the popup bridge.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
