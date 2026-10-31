// A single upward swipe toggles the game pause. No tab reload is performed.
(function () {
  "use strict";

  const SWIPE_UP_THRESHOLD_PX = 30;
  let touchStartY = null;

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStartY = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
  }, { capture: true, passive: true });

  // Bubble phase allows the game's own touchend handler to run first.
  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const distance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (distance >= SWIPE_UP_THRESHOLD_PX) {
      window.postMessage({ command: "chickenSwipeUp" }, "*");
    }
  }, { capture: false, passive: true });
})();
