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

  // Toggle Date.now only after the game refresh has completed and the
  // follow-up document has loaded.
  if (getRefreshStage() === "website-refresh-pending") {
    const finishDateNowToggle = () => {
      if (getRefreshStage() !== "website-refresh-pending") return;
      setDateNowChecked(false);
      setDateNowChecked(true);
      setRefreshStage("");
    };
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
      const waitForFrames = () => {
        if (framesRemaining > 0) {
          framesRemaining -= 1;
          window.requestAnimationFrame(waitForFrames);
          return;
        }

        setAnimationFrameChecked(false);

        // Request the game refresh first. Date.now is toggled only after
        // the refreshed document finishes loading.
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

    // Preserve the existing delay, then reload the game without toggling Date.now first.
    setTimeout(() => {
      setRefreshStage("game-refresh-pending");
      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
