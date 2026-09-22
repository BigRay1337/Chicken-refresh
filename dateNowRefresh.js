// Combine website refresh with a force-refresh of the detected Java/HTML5 game.
// Sequence on a Date.now disable transition: force-refresh game at 0 ms,
// then reload the website at 1000 ms. The 0 -> 1000 ms delay is preserved.
(function () {
  let previousEnabled = null;
  let refreshCycleScheduled = false;
  let nextRefreshDelay = 0;

  function forceRefreshGame() {
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], ' +
      'embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      const replacement = applet.cloneNode(true);
      applet.parentNode.replaceChild(replacement, applet);
      return true;
    }

    const frame = Array.from(document.querySelectorAll("iframe")).find(function (f) {
      const value = ((f.src || "") + " " + (f.id || "") + " " +
        (typeof f.className === "string" ? f.className : "") + " " +
        (f.title || "")).toLowerCase();

      return value.includes("java") ||
             value.includes("applet") ||
             value.includes("game");
    });

    if (frame && frame.parentNode) {
      const src = frame.getAttribute("src");

      if (src) {
        frame.src = "about:blank";
        window.setTimeout(function () {
          frame.src = src;
        }, 2);
      } else {
        frame.parentNode.replaceChild(frame.cloneNode(true), frame);
      }

      return true;
    }

    return false;
  }

  function refreshWebsite() {
    // Full website refresh after the 1000 ms delay.
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

    if (enabled === false && previousEnabled === true) {
      if (refreshCycleScheduled) {
        previousEnabled = enabled;
        return;
      }

      refreshCycleScheduled = true;

      // Preserve the 0 -> 1000 ms sequence.
      const gameDelay = nextRefreshDelay;
      const websiteDelay = gameDelay === 0 ? 1000 : 0;
      nextRefreshDelay = nextRefreshDelay === 0 ? 1000 : 0;

      // Force-refresh the game first.
      window.setTimeout(function () {
        forceRefreshGame();
      }, gameDelay);

      // Then refresh the complete website after the long delay.
      window.setTimeout(function () {
        refreshWebsite();
      }, websiteDelay);
    }

    if (enabled === true) {
      refreshCycleScheduled = false;
    }

    previousEnabled = enabled;
  });
})();
