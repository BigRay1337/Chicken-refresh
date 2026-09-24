// Refresh immediately and as fast as the browser permits when Date.now is disabled.

(function () {
  let previousEnabled = null;

  function refreshWebsite() {
    // No timer, animation frame, or artificial delay.
    window.location.reload();
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    // A separate refresh command lets the swipe handler disable Date.now
    // without coupling the refresh itself to the swipe logic.
    if (data.command === "refreshDateNow") {
      refreshWebsite();
      return;
    }

    if (data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Fire the reload directly on the true -> false transition.
    if (enabled === false && previousEnabled === true) {
      refreshWebsite();
    }

    previousEnabled = enabled;
  });
})();
