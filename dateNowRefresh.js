// Swipe up (30 px) disables Date.now, then refreshes the page.

(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

  function disableDateNow() {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false },
    });
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {}

    // Disable first, then refresh immediately.
    disableDateNow();
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

    // Upward swipe of at least 30 px, with no dominant horizontal movement.
    if (deltaY >= -SWIPE_THRESHOLD_PX || Math.abs(deltaX) > Math.abs(deltaY)) return;

    refreshAfterSwipe();
  }, { passive: true });
})();
