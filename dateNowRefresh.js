(function () {
  const REENABLE_DELAY_MS = 1000;
  const TAP_PENDING_KEY = "chickenDateNowTapRefreshPending";

  let cbDateNowChecked = true;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
  }

  function handlePendingTap() {
    let pending = false;

    try {
      pending = sessionStorage.getItem(TAP_PENDING_KEY) === "true";
      if (pending) sessionStorage.removeItem(TAP_PENDING_KEY);
    } catch (e) {
      pending = false;
    }

    if (!pending) return;

    setDateNowChecked(false);

    window.setTimeout(() => {
      setDateNowChecked(true);
    }, REENABLE_DELAY_MS);
  }

  function refreshAfterTap() {
    try {
      sessionStorage.setItem(TAP_PENDING_KEY, "true");
    } catch (e) {}

    setDateNowChecked(false);
    window.location.reload();
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.command === "setSpeedConfig" &&
        typeof event.data.config?.cbDateNowChecked === "boolean") {
      cbDateNowChecked = event.data.config.cbDateNowChecked;
      return;
    }

    if (event.data.command === "dateNowRefreshFromTap" &&
        cbDateNowChecked === false) {
      refreshAfterTap();
    }
  });

  window.postMessage({ command: "getSpeedConfig" });
  handlePendingTap();
})();
