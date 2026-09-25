// Swipe up refreshes the page first. After the refreshed page loads,
// Date.now is disabled immediately, then re-enabled after 1000 ms.

(function () {
  const SWIPE_THRESHOLD_PX = 80;
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

    // The refresh completed. Disable Date.now immediately on the new page.
    setDateNowChecked(false);

    // Re-enable Date.now exactly 1000 ms later.
    window.setTimeout(() => {
      setDateNowChecked(true);
    }, 1000);
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {
      // The refresh still proceeds if sessionStorage is unavailable.
    }

    // Refresh first. The false/true toggle happens after the refreshed page loads.
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

    // Only trigger on a predominantly upward swipe.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaX) > Math.abs(deltaY)) return;

    refreshAfterSwipe();
  }, { passive: true });

  handlePendingSwipe();
})();
