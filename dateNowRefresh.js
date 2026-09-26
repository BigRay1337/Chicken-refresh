(function () {
  const REENABLE_DELAY_MS = 275;
  const SWIPE_THRESHOLD_PX = 30;

  let cbDateNowChecked = true;
  let reenableTimer = null;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
  }

  function handleSwipeUp() {
    if (reenableTimer !== null) {
      clearTimeout(reenableTimer);
      reenableTimer = null;
    }

    // Keep Date.now disabled until the 275 ms delay expires.
    setDateNowChecked(false);

    reenableTimer = setTimeout(() => {
      reenableTimer = null;

      // Re-enable immediately after the delay.
      setDateNowChecked(true);
    }, REENABLE_DELAY_MS);
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

    // Require a predominantly upward swipe of at least 30 px.
    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    handleSwipeUp();
  }, { passive: true });

  window.postMessage({ command: "getSpeedConfig" });
})();