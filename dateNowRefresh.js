// Swipe up is the only trigger: refresh first, wait 1900 ms, disable Date.now,
// then re-enable it 1000 ms later. There is no watcher for cbDateNowChecked.

(function () {
  const SWIPE_THRESHOLD_PX = 80;
  const POST_REFRESH_DISABLE_DELAY_MS = 1900;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

  function toggleDateNowDisabledThenEnabled() {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false },
    });

    window.setTimeout(() => {
      window.postMessage({
        command: "setSpeedConfig",
        config: { cbDateNowChecked: true },
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

    // The swipe already caused the refresh. Start the 1900 ms delay after reload.
    window.setTimeout(toggleDateNowDisabledThenEnabled, POST_REFRESH_DISABLE_DELAY_MS);
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {
      // Continue with the refresh if sessionStorage is unavailable.
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

    // Upward swipe only; ignore downward and horizontal swipes.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaX) > Math.abs(deltaY)) return;

    refreshAfterSwipe();
  }, { passive: true });

  handlePendingSwipe();
})();
