// Freeze game callbacks without editing the game's own source.
// The game starts normally so its scripts and swipe handlers can initialize.
// After load, callbacks are held until the user performs an upward swipe.
(function () {
  "use strict";

  if (window !== window.top) return;
  if (window.__chickenFreezeControllerInstalled) return;
  window.__chickenFreezeControllerInstalled = true;

  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCAF = window.cancelAnimationFrame.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeDateNow = Date.now.bind(Date);
  const nativePerformanceNow = window.performance && window.performance.now
    ? window.performance.now.bind(window.performance)
    : null;

  let frozen = false;
  let frozenDateNow = 0;
  let dateNowLocked = false;
  let frozenPerformanceNow = 0;
  let rafQueue = [];
  let nextRafId = 1;
  const rafRecords = new Map();
  const timerRecords = new Map();

  function freezeGame() {
    if (frozen) return;
    frozen = true;
    frozenDateNow = nativeDateNow();
    frozenPerformanceNow = nativePerformanceNow ? nativePerformanceNow() : 0;
    window.postMessage({ command: "chickenFreezeState", frozen: true }, "*");
  }

  function runCallback(callback, context, args) {
    if (typeof callback === "function") return callback.apply(context, args);
    return undefined;
  }

  function unfreezeGame() {
    if (!frozen) return;
    frozen = false;
    // After the swipe-up action, keep Date.now() at a fixed value while
    // allowing animation frames and timers to resume normally.
    frozenDateNow = nativeDateNow();
    dateNowLocked = true;
    window.postMessage({ command: "chickenFreezeState", frozen: false }, "*");

    const pendingFrames = rafQueue;
    rafQueue = [];
    for (const frame of pendingFrames) {
      rafRecords.delete(frame.id);
      if (frame.cancelled) continue;
      try { frame.callback.call(window, nativePerformanceNow ? nativePerformanceNow() : nativeDateNow()); }
      catch (error) { nativeSetTimeout(function () { throw error; }, 0); }
    }

    for (const record of timerRecords.values()) {
      if (!record.pending || record.cancelled) continue;
      record.pending = false;
      if (record.interval) continue;
      record.cancelled = true;
      timerRecords.delete(record.id);
      try { runCallback(record.callback, window, record.args); }
      catch (error) { nativeSetTimeout(function () { throw error; }, 0); }
    }
  }

  // Hold animation-frame callbacks. The game's next frame is not scheduled
  // until its current callback runs, so the animation loop naturally pauses.
  window.requestAnimationFrame = function (callback) {
    if (!frozen) return nativeRAF(callback);
    const id = nextRafId++;
    const entry = { id: id, callback: callback, cancelled: false };
    rafRecords.set(id, entry);
    rafQueue.push(entry);
    return id;
  };

  window.cancelAnimationFrame = function (id) {
    const entry = rafRecords.get(id);
    if (entry) {
      entry.cancelled = true;
      rafRecords.delete(id);
      return;
    }
    nativeCAF(id);
  };

  // Timers still count down natively, but their callbacks are held while
  // frozen. Intervals coalesce missed ticks to one callback on resume.
  window.setTimeout = function (callback, delay) {
    if (!frozen || typeof callback !== "function") {
      return nativeSetTimeout.apply(window, arguments);
    }
    const args = Array.prototype.slice.call(arguments, 2);
    const record = { id: null, callback: callback, args: args, interval: false, pending: false, cancelled: false };
    record.id = nativeSetTimeout(function () {
      if (record.cancelled) return;
      if (frozen) {
        record.pending = true;
        timerRecords.set(record.id, record);
      } else {
        runCallback(callback, window, args);
      }
    }, delay);
    timerRecords.set(record.id, record);
    return record.id;
  };

  window.clearTimeout = function (id) {
    const record = timerRecords.get(id);
    if (record) {
      record.cancelled = true;
      timerRecords.delete(id);
    }
    nativeClearTimeout(id);
  };

  window.setInterval = function (callback, delay) {
    if (typeof callback !== "function") return nativeSetInterval.apply(window, arguments);
    const args = Array.prototype.slice.call(arguments, 2);
    const record = { id: null, callback: callback, args: args, interval: true, pending: false, cancelled: false };
    record.id = nativeSetInterval(function () {
      if (record.cancelled) return;
      if (frozen) {
        if (!record.pending) {
          record.pending = true;
          timerRecords.set(record.id, record);
        }
      } else {
        runCallback(callback, window, args);
      }
    }, delay);
    return record.id;
  };

  window.clearInterval = function (id) {
    const record = timerRecords.get(id);
    if (record) {
      record.cancelled = true;
      timerRecords.delete(id);
    }
    nativeClearInterval(id);
  };

  // Keep elapsed-time checks from jumping forward while the game is paused.
  Date.now = function () {
    return (frozen || dateNowLocked) ? frozenDateNow : nativeDateNow();
  };

  if (nativePerformanceNow) {
    try {
      Object.defineProperty(window.performance, "now", {
        configurable: true,
        value: function () {
          return frozen ? frozenPerformanceNow : nativePerformanceNow();
        }
      });
    } catch (error) {
      // Some browsers expose a non-configurable Performance.now property.
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "chickenSwipeUp") return;
    if (frozen) unfreezeGame();
    else freezeGame();
  });

  function freezeAfterLoad() {
    freezeGame();
  }

  if (document.readyState === "complete") {
    nativeSetTimeout(freezeAfterLoad, 0);
  } else {
    window.addEventListener("load", freezeAfterLoad, { once: true });
  }
})();
