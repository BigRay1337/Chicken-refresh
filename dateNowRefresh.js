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
      // Continue restoring Date.now even if sessionStorage is unavailable.
    }

    // Only toggle Date.now after the refreshed document has loaded.
    // Leave it enabled during the refresh itself, then restore it on the next
    // animation frame so the post-refresh false state can be applied first.
    setDateNowChecked(false);
    requestAnimationFrame(() => setDateNowChecked(true));
  }

  // Do not disable Date.now before or during the refresh. Wait until the
  // refreshed document is complete, then apply the brief false -> true toggle.
  if (isRefreshPending()) {
    if (document.readyState === "complete") {
      finishRefreshTransition();
    } else {
      window.addEventListener("load", finishRefreshTransition, { once: true });
    }
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

    // Preserve the existing delay, then refresh first.
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
