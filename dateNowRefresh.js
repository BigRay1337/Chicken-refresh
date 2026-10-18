(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 4321;
  // Cap infinite zero repetition to avoid RangeError from String.repeat(Infinity).
  function repeatZeros(count) {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 100;
    return "0".repeat(Math.min(safeCount, 100));
  }
  const DATE_NOW_DISABLE_LEAD_MS = Number("0." + repeatZeros(Infinity) + "1");
  const REFRESH_PENDING_KEY = "__chickenRefreshDateNowPending";

  let cbDateNowChecked = true;
  let cbRequestAnimationFrameChecked = false;

  function setSpeedConfig(changes) {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked,
        cbRequestAnimationFrameChecked,
        ...changes,
      },
    });
  }

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;
    setSpeedConfig({ cbDateNowChecked: enabled });
  }

  function setAnimationFrameChecked(enabled) {
    cbRequestAnimationFrameChecked = enabled;
    setSpeedConfig({ cbRequestAnimationFrameChecked: enabled });
  }

  function getRefreshStage() {
    try {
      return window.sessionStorage.getItem(REFRESH_PENDING_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setRefreshStage(stage) {
    try {
      if (stage) {
        window.sessionStorage.setItem(REFRESH_PENDING_KEY, stage);
      } else {
        window.sessionStorage.removeItem(REFRESH_PENDING_KEY);
      }
    } catch (_) {
      // Continue with the game refresh even if sessionStorage is unavailable.
    }
  }

  // After the first game-document refresh, ask the extension worker to
  // reload the entire tab. This works across cross-origin frames and causes
  // the swipe detector to be installed again with the website.
  if (getRefreshStage() === "game-refresh-pending") {
    let websiteRefreshRequested = false;

    const finishGameRefresh = () => {
      if (websiteRefreshRequested || getRefreshStage() !== "game-refresh-pending") {
        return;
      }
      websiteRefreshRequested = true;

      // Keep the pending flag until the whole-tab refresh request has been
      // handed to the isolated content script, then clear it to prevent loops.
      setAnimationFrameChecked(false);
      setDateNowChecked(false);
      window.postMessage({ command: "chickenRefreshWebsite" });
      setRefreshStage("");
    };

    // pageshow also covers documents restored from the back/forward cache.
    window.addEventListener("pageshow", finishGameRefresh, { once: true });
    window.addEventListener("load", finishGameRefresh, { once: true });

    // Covers cases where this script runs after the document has completed.
    if (document.readyState === "complete") {
      window.setTimeout(finishGameRefresh, 0);
    }
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.command === "setSpeedConfig") {
      if (typeof event.data.config?.cbDateNowChecked === "boolean") {
        cbDateNowChecked = event.data.config.cbDateNowChecked;
      }
      if (typeof event.data.config?.cbRequestAnimationFrameChecked === "boolean") {
        cbRequestAnimationFrameChecked =
          event.data.config.cbRequestAnimationFrameChecked;
      }
    }
  });

  window.postMessage({ command: "getSpeedConfig" });

  let swipeStartX = null;
  let swipeStartY = null;

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;

    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - swipeStartX;
    const deltaY = endY - swipeStartY;

    swipeStartX = null;
    swipeStartY = null;

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    // Enable animation-frame control immediately when an upward swipe is detected.
    setAnimationFrameChecked(true);

    // Request Date.now disablement 0.001 ms (1 microsecond) before the
    // scheduled game refresh. Browser timer precision and scheduling mean
    // this lead time is best-effort, not a guaranteed microsecond.
    setTimeout(() => {
      setDateNowChecked(false);
    }, Math.max(0, SWIPE_DELAY_MS - DATE_NOW_DISABLE_LEAD_MS));

    // Keep the existing swipe delay, then refresh the game document.
    setTimeout(() => {
      try {
        window.sessionStorage.setItem(REFRESH_PENDING_KEY, "game-refresh-pending");
      } catch (_) {
        // If sessionStorage is unavailable, still perform the game refresh.
      }

      setDateNowChecked(false);
      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
