(function () {
  // A literal "infinite 9's" delay cannot be passed to setTimeout.
  // Chain the largest supported timeout so the timer remains pending
  // for an effectively indefinite period.
  const MAX_TIMER_MS = 2147483647;
  const SWIPE_THRESHOLD_PX = 30;

  let cbDateNowChecked = true;
  let disableTimer = null;
  let disableTimerGeneration = 0;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
  }

  function startInfiniteDelayThenDisable(generation) {
    disableTimer = setTimeout(() => {
      if (generation !== disableTimerGeneration) return;
      startInfiniteDelayThenDisable(generation);
    }, MAX_TIMER_MS);
  }

  function handleSwipeUp() {
    disableTimerGeneration++;

    if (disableTimer !== null) {
      clearTimeout(disableTimer);
      disableTimer = null;
    }

    const generation = disableTimerGeneration;

    // Swipe starts the timer. cbDateNowChecked is NOT changed yet.
    startInfiniteDelayThenDisable(generation);

    // The timer above intentionally never reaches a normal completion.
    // This callback is kept separate so the state changes only when
    // an explicit timer-expiration condition is reached.
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