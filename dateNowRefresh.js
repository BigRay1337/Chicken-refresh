(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 4321;
  const REFRESH_PENDING_KEY = "__chickenRefreshDateNowPending";

  let cbDateNowChecked = true;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
  }

  function isRefreshPending() {
    try {
      return window.sessionStorage.getItem(REFRESH_PENDING_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function finishRefreshTransition() {
    try {
      window.sessionStorage.removeItem(REFRESH_PENDING_KEY);
    } catch (_) {
      // Continue disabling Date.now even if sessionStorage is unavailable.
    }

    // The swipe phase keeps Date.now enabled; once the refreshed document
    // starts, switch it off and leave it off until the next qualifying swipe.
    setDateNowChecked(false);
  }

  // Disable Date.now only after the game/page refresh begins.
  if (isRefreshPending()) {
    finishRefreshTransition();
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (
      event.data.command === "setSpeedConfig" &&
      typeof event.data.config?.cbDateNowChecked === "boolean"
    ) {
      cbDateNowChecked = event.data.config.cbDateNowChecked;
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

    // Keep Date.now enabled from the swipe-up animation frame through
    // the existing swipe delay. The refreshed document disables it afterward.
    requestAnimationFrame(() => setDateNowChecked(true));

    setTimeout(() => {
      try {
        window.sessionStorage.setItem(REFRESH_PENDING_KEY, "1");
      } catch (_) {
        // If sessionStorage is unavailable, still perform the game refresh.
      }

      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
