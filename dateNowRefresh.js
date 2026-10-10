(function () {
  const SWIPE_THRESHOLD_PX = 30;
  // Keep the existing swipe-up delay.
  const SWIPE_DELAY_MS = 2431;

  let cbDateNowChecked = true;
  let swipePending = false;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
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
    if (!event.changedTouches || event.changedTouches.length !== 1) {
      swipeStartX = null;
      swipeStartY = null;
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - swipeStartX;
    const deltaY = endY - swipeStartY;

    swipeStartX = null;
    swipeStartY = null;

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY) ||
      swipePending
    ) {
      return;
    }

    swipePending = true;

    // Turn Date.now off as soon as the swipe is detected.
    setDateNowChecked(false);

    // Restore it after the configured swipe-up delay, then refresh the game.
    setTimeout(() => {
      setDateNowChecked(true);
      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();