// pageScript.js
// Runs in the page's MAIN world. Keep native browser timing available while
// the page initializes; apply only the timing overrides selected in the popup.
(function () {
  "use strict";

  if (window.__chickenPageScriptInstalled) return;
  window.__chickenPageScriptInstalled = true;

  const nativeDateNow = Date.now.bind(Date);
  const nativePerformanceNow = window.performance && window.performance.now
    ? window.performance.now.bind(window.performance)
    : null;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeRequestAnimationFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : null;

  let config = {
    speed: 1,
    cbSetIntervalChecked: false,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: false,
    cbRequestAnimationFrameChecked: false
  };

  const wallStart = nativeDateNow();
  const monoStart = nativePerformanceNow ? nativePerformanceNow() : 0;
  let lastDateNow = wallStart;
  let lastPerformanceNow = monoStart;

  function getSpeed() {
    const value = Number(config.speed);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 1000) : 1;
  }

  function scaledElapsed(elapsed) {
    return elapsed * getSpeed();
  }

  function updateConfig(next) {
    if (!next || typeof next !== "object") return;
    config = Object.assign({}, config, next);
    // A zero or invalid speed must never freeze page startup. Treat it as
    // native speed so games can finish loading and initialize their timers.
    if (!Number.isFinite(Number(config.speed)) || Number(config.speed) <= 0) {
      config.speed = 1;
    }
  }

  Date.now = function () {
    if (!config.cbDateNowChecked || getSpeed() === 1) {
      const value = nativeDateNow();
      lastDateNow = Math.max(lastDateNow, value);
      return value;
    }
    const value = wallStart + scaledElapsed(nativeDateNow() - wallStart);
    lastDateNow = Math.max(lastDateNow, value);
    return lastDateNow;
  };

  if (nativePerformanceNow) {
    try {
      Object.defineProperty(window.performance, "now", {
        configurable: true,
        value: function () {
          if (!config.cbPerformanceNowChecked || getSpeed() === 1) {
            const value = nativePerformanceNow();
            lastPerformanceNow = Math.max(lastPerformanceNow, value);
            return value;
          }
          const value = monoStart + scaledElapsed(nativePerformanceNow() - monoStart);
          lastPerformanceNow = Math.max(lastPerformanceNow, value);
          return lastPerformanceNow;
        }
      });
    } catch (error) {
      // Some browsers expose a non-configurable Performance.now method.
    }
  }

  window.setTimeout = function (callback, delay) {
    if (!config.cbSetTimeoutChecked || typeof callback !== "function") {
      return nativeSetTimeout.apply(window, arguments);
    }
    const args = Array.prototype.slice.call(arguments, 2);
    const ms = Math.max(0, Number(delay) || 0);
    const adjusted = ms === 0 ? 0 : Math.max(1, ms / getSpeed());
    return nativeSetTimeout(function () {
      callback.apply(window, args);
    }, adjusted);
  };

  window.setInterval = function (callback, delay) {
    if (!config.cbSetIntervalChecked || typeof callback !== "function") {
      return nativeSetInterval.apply(window, arguments);
    }
    const args = Array.prototype.slice.call(arguments, 2);
    const ms = Math.max(0, Number(delay) || 0);
    // Never create a zero-ms interval: it can monopolize the main thread and
    // prevent a game canvas from rendering.
    const adjusted = Math.max(1, (ms || 1) / getSpeed());
    return nativeSetInterval(function () {
      callback.apply(window, args);
    }, adjusted);
  };

  if (nativeRequestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      if (!config.cbRequestAnimationFrameChecked || typeof callback !== "function") {
        return nativeRequestAnimationFrame(callback);
      }
      return nativeRequestAnimationFrame(function (timestamp) {
        // Preserve the browser's real RAF cadence. Only adjust the timestamp;
        // scheduling RAF at an artificial rate can stall rendering/game load.
        const adjusted = monoStart + scaledElapsed(timestamp - monoStart);
        callback(adjusted);
      });
    };
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;
    if (event.data.command === "setSpeedConfig") {
      updateConfig(event.data.config);
    } else if (event.data.command === "getSpeedConfig") {
      window.postMessage({
        command: "pageScriptReady"
      }, "*");
    }
  });

  // Ask the isolated content script for the current popup configuration.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
