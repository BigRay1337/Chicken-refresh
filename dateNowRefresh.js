(function () {
  const REENABLE_DELAY_MS = 0;
  const SWIPE_THRESHOLD_PX = 60;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

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

  function handlePendingSwipe() {
    let pending = false;

    try {
      pending = sessionStorage.getItem(SWIPE_PENDING_KEY) === "true";
      if (pending) sessionStorage.removeItem(SWIPE_PENDING_KEY);
    } catch (e) {
      pending = false;
    }

    if (!pending) return;

    setDateNowChecked(false);

    setDateNowChecked(true);
  }

  function refreshNow() {
    window.location.reload();
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {}

    setDateNowChecked(false);
    refreshNow();
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.command === "setSpeedConfig" &&
        typeof event.data.config?.cbDateNowChecked === "boolean") {
      cbDateNowChecked = event.data.config.cbDateNowChecked;
      return;
    }

    if (event.data.command === "dateNowRefreshFromTap" &&
        cbDateNowChecked === false) {
      refreshNow();
    }
  });

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

    if (deltaY > -SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) > Math.abs(deltaY)) return;

    refreshAfterSwipe();
  }, { passive: true });

  window.postMessage({ command: "getSpeedConfig" });
  handlePendingSwipe();
})();
