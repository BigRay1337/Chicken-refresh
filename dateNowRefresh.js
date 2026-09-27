(function () {
  const DISABLE_DELAY_MS = 150;
  const SWIPE_THRESHOLD_PX = 30;

  let cbDateNowChecked = true;
  let disableTimer = null;

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
    if (disableTimer !== null) {
      clearTimeout(disableTimer);
      disableTimer = null;
    }

    setDateNowChecked(true);

    disableTimer = setTimeout(() => {
      disableTimer = null;
      setDateNowChecked(false);
    }, DISABLE_DELAY_MS);
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

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    handleSwipeUp();
  }, { passive: true });

  window.postMessage({ command: "getSpeedConfig" });

  let refreshStartX = null;
  let refreshStartY = null;

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;

    refreshStartX = event.touches[0].clientX;
    refreshStartY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (refreshStartX === null || refreshStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - refreshStartX;
    const deltaY = endY - refreshStartY;

    refreshStartX = null;
    refreshStartY = null;

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    window.location.reload();
  }, { passive: true });
})();