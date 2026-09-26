(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const FALSE_DELAY_MS = 275;
  const SWIPE_PENDING_KEY = "chickenDateNowSwipeRefreshPending";

  function setDateNowDisabled() {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: false,
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

    if (pending) {
      setDateNowDisabled();
    }
  }

  function refreshAfterSwipe() {
    try {
      sessionStorage.setItem(SWIPE_PENDING_KEY, "true");
    } catch (e) {}

    // Keep cbDateNowChecked false for 275 ms, then refresh while it is still false.
    setDateNowDisabled();

    window.setTimeout(() => {
      setDateNowDisabled();
      window.location.reload();
    }, FALSE_DELAY_MS);
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

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) return;

    refreshAfterSwipe();
  }, { passive: true });

  handlePendingSwipe();
})();
