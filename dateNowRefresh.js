// Refresh the website immediately when Date.now is disabled.

(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  function refreshWebsite() {
    if (refreshScheduled) return;

    refreshScheduled = true;
    window.location.reload();
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Refresh immediately on the transition from enabled to disabled.
    if (enabled === false && previousEnabled === true) {
      refreshWebsite();
    }

    if (enabled === true) {
      refreshScheduled = false;
    }

    previousEnabled = enabled;
  });
})();
