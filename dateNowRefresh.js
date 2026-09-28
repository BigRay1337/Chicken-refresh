(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const REENABLE_DELAY_MS = 200;

  let cbDateNowChecked = true;
  let reenableTimer = null;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        speed: 0,
        cbSetIntervalChecked: true,
        cbSetTimeoutChecked: false,
        cbPerformanceNowChecked: false,
        cbDateNowChecked: enabled,
        cbRequestAnimationFrameChecked: false,
      },
    });
  }

  function handleSwipeUp() {
    // Disable the extension, then re-enable it after 200 ms.
    setDateNowChecked(false);

    if (reenableTimer !== null) {
      clearTimeout(reenableTimer);
    }

    reenableTimer = setTimeout(() => {
      reenableTimer = null;

      // Do not re-enable if the extension was toggled off meanwhile.
      if (!cbDateNowChecked) {
        setDateNowChecked(true);
      }
    }, REENABLE_DELAY_MS);
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (
      event.data.command === "setSpeedConfig" &&
      typeof event.data.config?.cbDateNowChecked === "boolean"
    ) {
      const enabled = event.data.config.cbDateNowChecked;

      // The extension toggle is authoritative. When toggled off,
      // keep cbDateNowChecked false and cancel any pending re-enable.
      if (!enabled) {
        cbDateNowChecked = false;

        if (reenableTimer !== null) {
          clearTimeout(reenableTimer);
          reenableTimer = null;
        }
      } else {
        cbDateNowChecked = true;
      }
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
