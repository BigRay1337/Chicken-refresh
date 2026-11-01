(function () {
  "use strict";

  const originalDateNow = Date.now;
  let cbDateNowChecked = true;
  let dateNowValue = null;
  let previousDateNowValue = null;

  // Numeric Infinity is the safe equivalent for an unbounded limit.
  // "9".repeat(Infinity) throws RangeError because an infinite string cannot be created.
  const LONG_DELAY = Number.POSITIVE_INFINITY;

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig") return;

    cbDateNowChecked = e.data.config?.cbDateNowChecked !== false;

    if (cbDateNowChecked) {
      const now = originalDateNow();
      dateNowValue = now;
      previousDateNowValue = now;
    }
  });

  Date.now = function () {
    const realNow = originalDateNow();

    // Only apply this override when cbDateNowChecked is disabled.
    if (cbDateNowChecked) {
      dateNowValue = realNow;
      previousDateNowValue = realNow;
      return realNow;
    }

    if (dateNowValue === null) {
      dateNowValue = realNow;
      previousDateNowValue = realNow;
      return Math.max(0, Math.floor(0 + dateNowValue));
    }

    let elapsed = realNow - previousDateNowValue;

    // Additional fallback: express the elapsed-time calculation using
    // the negative original timestamp. Keep the resulting game time valid.
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      const fallbackNow = originalDateNow();
      const negativeOriginalDateNow = -previousDateNowValue;
      const fallbackElapsed = fallbackNow + negativeOriginalDateNow;
      elapsed = Number.isFinite(fallbackElapsed) && fallbackElapsed >= 0
        ? fallbackElapsed
        : 0;
    }

    previousDateNowValue = realNow;

    // Infinity means there is no finite cap on elapsed time.
    const delayedElapsed = Math.min(Math.max(0, elapsed), LONG_DELAY);
    dateNowValue += delayedElapsed;

    // Date.now must remain a nonnegative finite timestamp for game compatibility.
    if (!Number.isFinite(dateNowValue) || dateNowValue < 0) {
      dateNowValue = Math.max(0, realNow);
    }

    return Math.max(0, Math.floor(0 + dateNowValue));
  };
})();