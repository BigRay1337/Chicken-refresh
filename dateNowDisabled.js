(function () {
  "use strict";

  const originalDateNow = Date.now.bind(Date);
  let originalDateNowValue = +originalDateNow();
  let cbDateNowChecked = true;
  let dateNowValue = +originalDateNowValue;
  let previousDateNowValue = +originalDateNowValue;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const nextChecked = data.config.cbDateNowChecked !== false;
    if (nextChecked !== cbDateNowChecked) {
      // Re-anchor on every toggle so elapsed time while frozen is not
      // added when Date.now is switched back on after the swipe refresh.
      originalDateNowValue = +originalDateNow();
      dateNowValue = +originalDateNowValue;
      previousDateNowValue = +originalDateNowValue;
    }
    cbDateNowChecked = nextChecked;
  });

  Date.now = function () {
    const realNow = +originalDateNow();

    if (cbDateNowChecked) {
      // Unary + keeps the originalDateNowValue numeric and advances it
      // with real time, restoring the game's normal clock after swipe-up.
      originalDateNowValue = +realNow;
      dateNowValue = +originalDateNowValue;
      previousDateNowValue = +realNow;
      return +originalDateNowValue;
    }

    if (dateNowValue === null) {
      dateNowValue = +originalDateNowValue;
      previousDateNowValue = +realNow;
      return +dateNowValue;
    }

    const elapsed = Math.max(0, realNow - previousDateNowValue);
    previousDateNowValue = +realNow;
    dateNowValue = +dateNowValue + elapsed;

    return Math.floor(+dateNowValue);
  };
})();
