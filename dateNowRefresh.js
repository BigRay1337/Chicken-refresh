// Swipe up: disable Date.now immediately, refresh immediately, then re-enable it 1000 ms after the refreshed page loads.

(function () {
  const SWIPE_THRESHOLD_PX = 60;
  const REENABLE_DELAY_MS = 1000;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

  function setDateNowChecked(enabled) {
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

    // Keep Date.now disabled immediately after the refresh.
    setDateNowChecked(false);

    // Re-enable it exactly 1000 ms after the refreshed page loads.
    window.setTimeout(() => {
      setDateNowChecked(true);
    }, REENABLE_DELAY_MS);
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {
      // Continue with the refresh if sessionStorage is unavailable.
    }

    // Disable Date.now immediately, then refresh immediately.
    setDateNowChecked(false);
    window.location.reload();
  }

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

    // Only a predominantly vertical upward swipe triggers the refresh.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaX) > Math.abs(deltaY)) return;

    refreshAfterSwipe();
  }, { passive: true });

  handlePendingSwipe();
})();
