// Swipe up refreshes first, then disables Date.now 3000 ms after the refreshed page loads.

(function () {
  const SWIPE_THRESHOLD_PX = 80;
  const POST_REFRESH_DISABLE_DELAY_MS = 1;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

  function toggleDateNowDisabledThenEnabled() {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: false,
      },
    });

    window.setTimeout(() => {
      window.postMessage({
        command: "setSpeedConfig",
        config: {
          cbDateNowChecked: true,
        },
      });
    }, 1000);
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

    // The refresh has already happened. Wait 1900 ms, then toggle Date.now off and back on.
    window.setTimeout(() => {
      toggleDateNowDisabledThenEnabled();
    }, POST_REFRESH_DISABLE_DELAY_MS);
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {
      // If sessionStorage is unavailable, the page still refreshes normally.
    }

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

    // Only count a predominantly vertical upward swipe.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaX) > Math.abs(deltaY)) return;

    refreshAfterSwipe();
  }, { passive: true });

  handlePendingSwipe();
})();
);
