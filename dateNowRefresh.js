// Detect the game's upward-swipe refresh gesture. Keep Date.now enabled while
// the refresh produces network/DOM activity, then disable it after requests
// finish and the page has been quiet. This does not reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const QUIET_WINDOW_MS = 750;
  const MIN_REFRESH_WINDOW_MS = 750;
  const CHECK_INTERVAL_MS = 50;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeDateNow = Date.now.bind(Date);
  const nativeFetch = typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;
  const NativeXHR = window.XMLHttpRequest;

  let latestConfig = null;
  let savedConfigBeforeSwipe = null;
  let rafRefreshPending = false;
  let refreshPageLoaded = document.readyState === "complete";
  const RAF_REFRESH_SESSION_KEY = "__chicken_raf_refresh_pending";
  const RAF_REFRESH_CONFIG_KEY = "__chicken_raf_refresh_config";

  try {
    rafRefreshPending = sessionStorage.getItem(RAF_REFRESH_SESSION_KEY) === "1";
    if (rafRefreshPending) {
      sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
      const savedConfig = sessionStorage.getItem(RAF_REFRESH_CONFIG_KEY);
      if (savedConfig) {
        savedConfigBeforeSwipe = JSON.parse(savedConfig);
        sessionStorage.removeItem(RAF_REFRESH_CONFIG_KEY);
      }
    }
  } catch (error) {
    // Session storage may be unavailable in restricted browsing contexts.
  }

  function setRequestAnimationFrameEnabled(enabled) {
    if (!latestConfig) return;
    const nextConfig = Object.assign({}, latestConfig, {
      cbRequestAnimationFrameChecked: enabled
    });
    latestConfig = nextConfig;
    window.postMessage({ command: "setSpeedConfig", config: nextConfig }, "*");
  }

  let touchStartY = null;
  let refreshCheckActive = rafRefreshPending;
  let refreshActivitySeen = rafRefreshPending;
  let pendingRequests = 0;
  let refreshStartedAt = rafRefreshPending ? nativeDateNow() : 0;
  let lastActivityAt = refreshStartedAt;
  let domObserver = null;
  let pageLoadSeen = document.readyState === "complete";

  function markActivity() {
    if (!refreshCheckActive) return;
    refreshActivitySeen = true;
    lastActivityAt = nativeDateNow();
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
      if (refreshCheckActive && rafRefreshPending) {
        if (!savedConfigBeforeSwipe) savedConfigBeforeSwipe = Object.assign({}, data.config);
        latestConfig = Object.assign({}, data.config, {
          cbSetIntervalChecked: false,
          cbSetTimeoutChecked: false,
          cbPerformanceNowChecked: false,
          cbDateNowChecked: false,
          cbRequestAnimationFrameChecked: false
        });
        window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
      } else {
        latestConfig = data.config;
      }
    }
  });

  window.addEventListener("load", function () {
    refreshPageLoaded = true;
    if (rafRefreshPending) {
      refreshCheckActive = true;
      refreshActivitySeen = true;
      refreshStartedAt = nativeDateNow();
      lastActivityAt = refreshStartedAt;
      if (latestConfig) {
        latestConfig = Object.assign({}, latestConfig, {
          cbSetIntervalChecked: false,
          cbSetTimeoutChecked: false,
          cbPerformanceNowChecked: false,
          cbDateNowChecked: false,
          cbRequestAnimationFrameChecked: false
        });
        window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
      }
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

    // Record the 30 px swipe. RAF stays unfrozen during document loading,
    // is enabled after the refreshed document's load event and stays enabled
    // when refresh activity has settled.
    rafRefreshPending = true;
    refreshPageLoaded = false;
    try {
      sessionStorage.setItem(RAF_REFRESH_SESSION_KEY, "1");
    } catch (error) {
      // The current-page enable still works if session storage is unavailable.
    }

    if (latestConfig) {
      savedConfigBeforeSwipe = Object.assign({}, latestConfig);
      try {
        sessionStorage.setItem(RAF_REFRESH_CONFIG_KEY, JSON.stringify(savedConfigBeforeSwipe));
      } catch (error) {
        // The extension can still resume with its current in-memory settings.
      }
      const swipeConfig = Object.assign({}, latestConfig, {
        cbSetIntervalChecked: false,
        cbSetTimeoutChecked: false,
        cbPerformanceNowChecked: false,
        cbDateNowChecked: false,
        cbRequestAnimationFrameChecked: false
      });
      latestConfig = swipeConfig;
      window.postMessage({ command: "setSpeedConfig", config: swipeConfig }, "*");
    }

    // A swipe of at least 30 px refreshes the website after the config is set.
    refreshCheckActive = true;
    // Do not force a top-level reload here. Let the game's own swipe
    // handler refresh its state; reloading the document can leave canvas
    // games on a black screen.

    refreshActivitySeen = false;
    refreshStartedAt = nativeDateNow();
    lastActivityAt = refreshStartedAt;

    // Let the current touch event dispatch finish before checking for refresh
    // activity. If the document is still loading, wait for its load event too.
    nativeSetTimeout(checkRefreshCompletion, 0);
  }, { capture: false, passive: true });

  function checkRefreshCompletion() {
    if (!refreshCheckActive) return;

    const now = nativeDateNow();
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
      if (savedConfigBeforeSwipe) {
        latestConfig = Object.assign({}, savedConfigBeforeSwipe);
        window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
      }
      savedConfigBeforeSwipe = null;
      try {
        sessionStorage.removeItem(RAF_REFRESH_CONFIG_KEY);
      } catch (error) {
        // Ignore unavailable session storage.
      }
      rafRefreshPending = false;
      refreshCheckActive = false;
      return;
    }

    // Keep waiting while loading or while detectable refresh activity continues.
    // Canvas-only refreshes that produce no network/DOM signals cannot be
    // reliably distinguished from a swipe that did not refresh the game.
    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }
})();
