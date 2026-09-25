// Swipe up: refresh immediately, then after the refreshed page loads wait 1900 ms,
// set cbDateNowChecked to false, and set it back to true 1000 ms later.
// There is no watcher that reacts to cbDateNowChecked becoming false.

(function () {
  const SWIPE_THRESHOLD_PX = 80;
  const POST_REFRESH_DELAY_MS = 1900;
  const REENABLE_DELAY_MS = 1000;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

  let swipeStartX = null;
  let swipeStartY = null;

  function setDateNowChecked(value) {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: value,
      },
    });
  }

  function runAfterRefresh() {
    let pending = false;

    try {
      pending = sessionStorage.getItem(SWIPE_PENDING_KEY) === "true";
      if (pending) sessionStorage.removeItem(SWIPE_PENDING_KEY);
    } catch (e) {
      pending = false;
    }

    if (!pending) return;

    // Refresh already happened. Wait 1900 ms before disabling Date.now spoofing.
    window.setTimeout(() => {
      setDateNowChecked(false);

      // Re-enable it 1000 ms after disabling it.
      window.setTimeout(() => {
        setDateNowChecked(true);
      }, REENABLE_DELAY_MS);
    }, POST_REFRESH_DELAY_MS);
  }

  function refreshFromSwipeUp() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {
      // Continue with the refresh even if sessionStorage is unavailable.
    }

    // Refresh immediately. The false/true sequence is handled after reload.
    window.location.reload();
  }

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

    // Only a predominantly upward swipe triggers the refresh.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaX) >= Math.abs(deltaY)) {
      return;
    }

    refreshFromSwipeUp();
  }, { passive: true });

  // On a normal load this does nothing. After a swipe-triggered reload,
  // it runs the 1900 ms -> false -> 1000 ms -> true sequence.
  runAfterRefresh();
})();
