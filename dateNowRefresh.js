// Refresh the website when Date.now is disabled.

(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  function refreshWebsite() {
    if (refreshScheduled) return;

    refreshScheduled = true;
    window.location.reload();
    refreshScheduled = false;
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
      // Use browser scheduling rather than a fixed numeric delay.
      window.setTimeout(function () {
        refreshWebsite();
      });
    }

    if (enabled === true) {
      refreshScheduled = false;
    }

    previousEnabled = enabled;
  });
})();
