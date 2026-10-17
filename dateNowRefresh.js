(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 4321;
  const REFRESH_PENDING_KEY = "__chickenRefreshDateNowPending";

  let cbDateNowChecked = true;
  let cbRequestAnimationFrameChecked = false;

  function setSpeedConfig(changes) {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked,
        cbRequestAnimationFrameChecked,
        ...changes,
      },
    });
  }

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;
    setSpeedConfig({ cbDateNowChecked: enabled });
  }

  function setAnimationFrameChecked(enabled) {
    cbRequestAnimationFrameChecked = enabled;
    setSpeedConfig({ cbRequestAnimationFrameChecked: enabled });
  }

  function takePendingRefreshFlag() {
    try {
      const pending = window.sessionStorage.getItem(REFRESH_PENDING_KEY) === "1";
      if (pending) window.sessionStorage.removeItem(REFRESH_PENDING_KEY);
      return pending;
    } catch (_) {
      return false;
    }
  }

  // After the refreshed game document loads, turn animation-frame control off,
  // disable Date.now, then re-enable Date.now 3 ms later.
  if (takePendingRefreshFlag()) {
    window.addEventListener("load", () => {
      setAnimationFrameChecked(false);
      setDateNowChecked(false);
      setDateNowChecked(true);
    }, { once: true });
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.command === "setSpeedConfig") {
      if (typeof event.data.config?.cbDateNowChecked === "boolean") {
        cbDateNowChecked = event.data.config.cbDateNowChecked;
      }
      if (typeof event.data.config?.cbRequestAnimationFrameChecked === "boolean") {
        cbRequestAnimationFrameChecked =
          event.data.config.cbRequestAnimationFrameChecked;
      }
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

    // Enable animation-frame control immediately when an upward swipe is detected.
    setAnimationFrameChecked(true);

    // Keep the existing swipe delay, then refresh the game document.
    setTimeout(() => {
      try {
        window.sessionStorage.setItem(REFRESH_PENDING_KEY, "1");
      } catch (_) {
        // If sessionStorage is unavailable, still perform the game refresh.
      }

      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();