(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 4321;
  const WEBSITE_REFRESH_FRAME_DELAY = 7;
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

  function getRefreshStage() {
    try {
      return window.sessionStorage.getItem(REFRESH_PENDING_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setRefreshStage(stage) {
    try {
      if (stage) {
        window.sessionStorage.setItem(REFRESH_PENDING_KEY, stage);
      } else {
        window.sessionStorage.removeItem(REFRESH_PENDING_KEY);
      }
    } catch (_) {
      // Continue with the game refresh even if sessionStorage is unavailable.
    }
  }

  // If the refresh was requested by the previous document, keep Date.now
  // disabled while this refreshed document is loading.
  if (getRefreshStage() === "website-refresh-pending") {
    setDateNowChecked(false);

    let finished = false;
    const finishDateNowToggle = () => {
      if (finished || getRefreshStage() !== "website-refresh-pending") return;
      finished = true;
      setDateNowChecked(true);
      setRefreshStage("");
    };

    // Re-enable Date.now only once the refreshed document has loaded.
    window.addEventListener("pageshow", finishDateNowToggle, { once: true });
    window.addEventListener("load", finishDateNowToggle, { once: true });
    if (document.readyState === "complete") {
      window.setTimeout(finishDateNowToggle, 0);
    }
  }

  if (getRefreshStage() === "game-refresh-pending") {
    let websiteRefreshRequested = false;

    const finishGameRefresh = () => {
      if (websiteRefreshRequested || getRefreshStage() !== "game-refresh-pending") {
        return;
      }
      websiteRefreshRequested = true;

      let framesRemaining = WEBSITE_REFRESH_FRAME_DELAY;
      let dateNowDisabled = false;
      const waitForFrames = () => {


        if (framesRemaining > 0) {
          framesRemaining -= 1;
          window.requestAnimationFrame(waitForFrames);
          return;
        }

        setAnimationFrameChecked(false);

        // Disable Date.now at the end of the game refresh. The refreshed
        // document re-enables it after its load/pageshow event.
        setDateNowChecked(false);
        setRefreshStage("website-refresh-pending");
        window.postMessage({ command: "chickenRefreshWebsite" });
      };

      window.requestAnimationFrame(waitForFrames);
    };

    // pageshow also covers documents restored from the back/forward cache.
    window.addEventListener("pageshow", finishGameRefresh, { once: true });
    window.addEventListener("load", finishGameRefresh, { once: true });

    // Covers cases where this script runs after the document has completed.
    if (document.readyState === "complete") {
      window.setTimeout(finishGameRefresh, 0);
    }
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

    // Preserve the existing delay and refresh sequence.
    setTimeout(() => {
      setRefreshStage("game-refresh-pending");
      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
