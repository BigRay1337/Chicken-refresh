(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 4321;
  const REFRESH_PENDING_KEY = "__chickenRefreshDateNowPending";
  const REFRESH_TOP_PAGE_COMMAND = "__chickenRefreshTopPage";

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

  // The top frame handles a request from a refreshed game frame. Using
  // postMessage avoids trying to access a cross-origin top.location from
  // inside the game iframe.
  window.addEventListener("message", (event) => {
    if (window !== window.top) return;
    if (event.source === window) return;
    if (event.data?.command !== REFRESH_TOP_PAGE_COMMAND) return;

    window.location.reload();
  });

  // After the game document refreshes, restore settings and ask the top frame
  // to reload the website. The top frame then reinitializes swipe detection.
  if (takePendingRefreshFlag()) {
    window.addEventListener("load", () => {
      setAnimationFrameChecked(false);
      setDateNowChecked(false);

      if (window.top !== window) {
        window.top.postMessage({ command: REFRESH_TOP_PAGE_COMMAND }, "*");
      }
      // If this is already the top-level document, its reload was the website refresh.
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

    // Keep the existing delay, refresh the game document, then refresh the website.
    setTimeout(() => {
      try {
        window.sessionStorage.setItem(REFRESH_PENDING_KEY, "1");
      } catch (_) {
        // If sessionStorage is unavailable, still perform the game refresh.
      }

      setDateNowChecked(false);
      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
