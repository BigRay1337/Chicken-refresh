(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const REFRESH_PENDING_KEY = "__chicken_refresh_pending_date_now_false__";

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

  function markRefreshPending() {
    try {
      sessionStorage.setItem(REFRESH_PENDING_KEY, "1");
    } catch (_) {
      // Ignore storage errors; refresh still proceeds.
    }
  }

  function applyPendingDateNowDisable() {
    try {
      if (sessionStorage.getItem(REFRESH_PENDING_KEY) !== "1") return;
      sessionStorage.removeItem(REFRESH_PENDING_KEY);
    } catch (_) {
      // Continue without storage if unavailable.
    }

    setDateNowChecked(false);
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

  applyPendingDateNowDisable();
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

    markRefreshPending();
    window.location.reload();
  }, { passive: true });
})();
