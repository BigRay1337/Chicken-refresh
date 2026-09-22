// Refresh the website when Date.now is disabled.
// Keeps the existing 0 ms / 1000 ms alternating delay sequence.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;
  let useLongDelay = false;

  function refreshWebsite() {
    if (refreshScheduled) return;

    refreshScheduled = true;

    // Reload the current website while preserving the current URL.
    window.location.reload();

    // Fallback reset in case reload is prevented.
    window.setTimeout(function () {
      refreshScheduled = false;
    }, 1000);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    if (enabled === false && previousEnabled === true) {
      // Refresh in the sequence: 0 ms, then 1000 ms, then repeat.
      const refreshDelay = useLongDelay ? 1000 : 0;
      useLongDelay = !useLongDelay;

      window.setTimeout(function () {
        refreshWebsite();
      }, refreshDelay);
    }

    if (enabled === true) {
      refreshScheduled = false;
    }

    previousEnabled = enabled;
  });
})();
