// Detect the game's upward-swipe refresh gesture. Keep Date.now frozen while
// the refreshed document loads, then restore the real clock when refresh work
// has settled. This does not reload the browser tab except for the game's
// existing swipe-refresh behavior.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const QUIET_WINDOW_MS = 750;
  const MIN_REFRESH_WINDOW_MS = 750;
  const CHECK_INTERVAL_MS = 50;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeNow = window.performance && typeof window.performance.now === "function"
    ? window.performance.now.bind(window.performance)
    : Date.now.bind(Date);
  const nativeFetch = typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;
  const NativeXHR = window.XMLHttpRequest;

  let latestConfig = null;
  let rafRefreshPending = false;
  let refreshPageLoaded = document.readyState === "complete";
  const RAF_REFRESH_SESSION_KEY = "__chicken_raf_refresh_pending";

  try {
    rafRefreshPending = sessionStorage.getItem(RAF_REFRESH_SESSION_KEY) === "1";
    if (rafRefreshPending) sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
  } catch (error) {
    // Session storage may be unavailable in restricted browsing contexts.
  }

  function updateConfig(changes) {
    if (!latestConfig) return;
    latestConfig = Object.assign({}, latestConfig, changes);
    window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
  }

  function setRequestAnimationFrameEnabled(enabled) {
    updateConfig({ cbRequestAnimationFrameChecked: enabled });
  }

  function setDateNowEnabled(enabled) {
    updateConfig({ cbDateNowChecked: enabled });
  }

  let touchStartY = null;
  let refreshCheckActive = rafRefreshPending;
  let refreshActivitySeen = rafRefreshPending;
  let pendingRequests = 0;
  let refreshStartedAt = rafRefreshPending ? nativeNow() : 0;
  let lastActivityAt = refreshStartedAt;
  let domObserver = null;
  let pageLoadSeen = document.readyState === "complete";

  function markActivity() {
    if (!refreshCheckActive) return;
    refreshActivitySeen = true;
    lastActivityAt = nativeNow();
  }

  window.addEventListener("load", function () {
    pageLoadSeen = true;
    markActivity();
  }, { once: true });

  document.addEventListener("readystatechange", function () {
    if (document.readyState === "complete") {
      pageLoadSeen = true;
      markActivity();
    }
  });

  if (nativeFetch) {
    window.fetch = function () {
      pendingRequests += 1;
      markActivity();
      let request;
      try {
        request = nativeFetch.apply(this, arguments);
      } catch (error) {
        pendingRequests = Math.max(0, pendingRequests - 1);
        markActivity();
        throw error;
      }
      return request.then(
        function (response) {
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
          return response;
        },
        function (error) {
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
          throw error;
        }
      );
    };
  }

  if (NativeXHR && NativeXHR.prototype) {
    const originalOpen = NativeXHR.prototype.open;
    const originalSend = NativeXHR.prototype.send;

    NativeXHR.prototype.open = function () {
      this.__dateNowRefreshTracked = false;
      return originalOpen.apply(this, arguments);
    };

    NativeXHR.prototype.send = function () {
      if (!this.__dateNowRefreshTracked) {
        this.__dateNowRefreshTracked = true;
        pendingRequests += 1;
        markActivity();

        const finish = () => {
          if (!this.__dateNowRefreshTracked) return;
          this.__dateNowRefreshTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        };

        this.addEventListener("loadend", finish, { once: true });
        this.addEventListener("error", finish, { once: true });
        this.addEventListener("abort", finish, { once: true });
      }

      try {
        return originalSend.apply(this, arguments);
      } catch (error) {
        if (this.__dateNowRefreshTracked) {
          this.__dateNowRefreshTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        }
        throw error;
      }
    };
  }

  function observePage() {
    if (domObserver || !document.documentElement) return;
    domObserver = new MutationObserver(function () {
      markActivity();
    });
    domObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
  }

  if (document.documentElement) {
    observePage();
  } else {
    document.addEventListener("DOMContentLoaded", observePage, { once: true });
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      latestConfig = data.config;
      if (rafRefreshPending) {
        // Preserve the refresh state when the isolated-world config arrives
        // after the document-start scripts have already executed.
        setRequestAnimationFrameEnabled(refreshPageLoaded);
        setDateNowEnabled(false);
      }
    }
  });

  window.addEventListener("load", function () {
    refreshPageLoaded = true;
    if (rafRefreshPending) {
      setRequestAnimationFrameEnabled(true);
      setDateNowEnabled(false);
      refreshCheckActive = true;
      refreshActivitySeen = true;
      refreshStartedAt = nativeNow();
      lastActivityAt = refreshStartedAt;
      nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
    }
  }, { once: true });

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStartY = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
  }, { capture: true, passive: true });

  // Bubble phase lets the game's touchend handler initiate its refresh first.
  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const swipeUpDistance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (swipeUpDistance < SWIPE_UP_THRESHOLD_PX || refreshCheckActive) {
      return;
    }

    rafRefreshPending = true;
    refreshPageLoaded = false;
    try {
      sessionStorage.setItem(RAF_REFRESH_SESSION_KEY, "1");
    } catch (error) {
      // The current-page enable still works if session storage is unavailable.
    }

    if (latestConfig) {
      latestConfig = Object.assign({}, latestConfig, {
        cbDateNowChecked: false,
        cbRequestAnimationFrameChecked: false
      });
      window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
    }

    refreshCheckActive = true;
    nativeSetTimeout(function () {
      window.location.reload();
    }, 50);

    refreshActivitySeen = false;
    refreshStartedAt = nativeNow();
    lastActivityAt = refreshStartedAt;
    nativeSetTimeout(checkRefreshCompletion, 0);
  }, { capture: false, passive: true });

  function checkRefreshCompletion() {
    if (!refreshCheckActive) return;

    const now = nativeNow();
    const minimumRefreshWindowPassed = now - refreshStartedAt >= MIN_REFRESH_WINDOW_MS;
    const quietLongEnough = now - lastActivityAt >= QUIET_WINDOW_MS;
    const documentLoaded = pageLoadSeen || document.readyState === "complete";

    if (
      minimumRefreshWindowPassed &&
      documentLoaded &&
      refreshActivitySeen &&
      pendingRequests === 0 &&
      quietLongEnough
    ) {
      // Restore both APIs only after the refreshed page has settled.
      setRequestAnimationFrameEnabled(true);
      setDateNowEnabled(true);
      rafRefreshPending = false;
      refreshCheckActive = false;
      return;
    }

    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }
})();
