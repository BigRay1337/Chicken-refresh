// Volume-Down-held tap trigger for cbDateNowChecked = false.

(function () {
  let volumeDownHeld = false;

  function setDateNowCheckedFalse() {
    if (!volumeDownHeld) return;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: false,
      },
    });
  }

  // Detect Volume Down when the browser exposes the media-key event.
  window.addEventListener("keydown", (event) => {
    if (event.key === "AudioVolumeDown" || event.code === "AudioVolumeDown") {
      volumeDownHeld = true;
      event.preventDefault();
    }
  }, true);

  window.addEventListener("keyup", (event) => {
    if (event.key === "AudioVolumeDown" || event.code === "AudioVolumeDown") {
      volumeDownHeld = false;
      event.preventDefault();
    }
  }, true);

  // Only a tap while Volume Down is held triggers false.
  window.addEventListener("click", () => {
    if (!volumeDownHeld) return;
    setDateNowCheckedFalse();
  }, true);

  // Also support touchscreen taps.
  window.addEventListener("touchend", () => {
    if (!volumeDownHeld) return;
    setDateNowCheckedFalse();
  }, true);
})();
