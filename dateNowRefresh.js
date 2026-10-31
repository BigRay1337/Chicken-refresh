(function () {
  const _0xa1 = 30;
  const _0xa2 = 750;
  const _0xa3 = 750;
  const _0xa4 = 50;
  const _0xa5 = window.setTimeout.bind(window);
  const _0xa6 = Date.now.bind(Date);
  const _0xa7 = typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;
  const _0xa8 = window.XMLHttpRequest;

  let _0xa9 = null;
  let _0xaa = false;
  let _0xab = document.readyState === "complete";
  const _0xac = "__chicken_raf_refresh_pending";

  try {
    _0xaa = sessionStorage.getItem(_0xac) === "1";
    if (_0xaa) sessionStorage.removeItem(_0xac);
  } catch (error) {

  }

  function _0xb5(enabled) {
    if (!_0xa9) return;
    const nextConfig = Object.assign({}, _0xa9, {
      cbRequestAnimationFrameChecked: enabled
    });
    _0xa9 = nextConfig;
    window.postMessage({ command: "setSpeedConfig", config: nextConfig }, "*");
  }

  let _0xad = null;
  let _0xae = _0xaa;
  let _0xaf = _0xaa;
  let _0xb0 = 0;
  let _0xb1 = _0xaa ? _0xa6() : 0;
  let _0xb2 = _0xb1;
  let _0xb3 = null;
  let _0xb4 = document.readyState === "complete";

  function _0xb6() {
    if (!_0xae) return;
    _0xaf = true;
    _0xb2 = _0xa6();
  }

  window.addEventListener("load", function () {
    _0xb4 = true;
    _0xb6();
  }, { once: true });

  document.addEventListener("readystatechange", function () {
    if (document.readyState === "complete") {
      _0xb4 = true;
      _0xb6();
    }
  });

  if (_0xa7) {
    window.fetch = function () {
      _0xb0 += 1;
      _0xb6();
      let _0xc2;
      try {
        _0xc2 = _0xa7.apply(this, arguments);
      } catch (error) {
        _0xb0 = Math.max(0, _0xb0 - 1);
        _0xb6();
        throw error;
      }
      return _0xc2.then(
        function (response) {
          _0xb0 = Math.max(0, _0xb0 - 1);
          _0xb6();
          return response;
        },
        function (error) {
          _0xb0 = Math.max(0, _0xb0 - 1);
          _0xb6();
          throw error;
        }
      );
    };
  }

  if (_0xa8 && _0xa8.prototype) {
    const originalOpen = _0xa8.prototype.open;
    const originalSend = _0xa8.prototype.send;

    _0xa8.prototype.open = function () {
      this.__dateNowRefreshTracked = false;
      return originalOpen.apply(this, arguments);
    };

    _0xa8.prototype.send = function () {
      if (!this.__dateNowRefreshTracked) {
        this.__dateNowRefreshTracked = true;
        _0xb0 += 1;
        _0xb6();

        const finish = () => {
          if (!this.__dateNowRefreshTracked) return;
          this.__dateNowRefreshTracked = false;
          _0xb0 = Math.max(0, _0xb0 - 1);
          _0xb6();
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
          _0xb0 = Math.max(0, _0xb0 - 1);
          _0xb6();
        }
        throw error;
      }
    };
  }

  function _0xb7() {
    if (_0xb3 || !document.documentElement) return;
    _0xb3 = new MutationObserver(function () {
      _0xb6();
    });
    _0xb3.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
  }

  if (document.documentElement) {
    _0xb7();
  } else {
    document.addEventListener("DOMContentLoaded", _0xb7, { once: true });
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      _0xa9 = data.config;
      if (_0xaa) {

        _0xb5(_0xab);
      }
    }
  });

  window.addEventListener("load", function () {
    _0xab = true;
    if (_0xaa) {
      _0xb5(true);

      _0xae = true;
      _0xaf = true;
      _0xb1 = _0xa6();
      _0xb2 = _0xb1;
      _0xa5(checkRefreshCompletion, _0xa4);
    }
  }, { once: true });

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      _0xad = null;
      return;
    }
    _0xad = event.touches[0].clientY;
  }, { capture: true, passive: true });

  window.addEventListener("touchend", function (event) {
    if (_0xad === null || !event.changedTouches || !event.changedTouches.length) {
      _0xad = null;
      return;
    }

    const _0xb8 = _0xad - event.changedTouches[0].clientY;
    _0xad = null;

    if (_0xb8 < _0xa1 || _0xae) {
      return;
    }

    _0xaa = true;
    _0xab = false;
    try {
      sessionStorage.setItem(_0xac, "1");
    } catch (error) {

    }

    if (_0xa9) {
      const swipeConfig = Object.assign({}, _0xa9, {
        cbDateNowChecked: false,
        cbRequestAnimationFrameChecked: false
      });
      _0xa9 = swipeConfig;
      window.postMessage({ command: "setSpeedConfig", config: swipeConfig }, "*");
    }

    _0xae = true;
    _0xa5(function () {
      window.location.reload();
    }, 50);

    _0xaf = false;
    _0xb1 = _0xa6();
    _0xb2 = _0xb1;

    _0xa5(checkRefreshCompletion, 0);
  }, { capture: false, passive: true });

  function checkRefreshCompletion() {
    if (!_0xae) return;

    const now = _0xa6();
    const _0xb9 = now - _0xb1 >= _0xa3;
    const _0xba = now - _0xb2 >= _0xa2;
    const _0xbb = _0xb4 || document.readyState === "complete";

    if (
      _0xb9 &&
      _0xbb &&
      _0xaf &&
      _0xb0 === 0 &&
      _0xba
    ) {

      _0xb5(false);
      _0xb5(true);
      _0xaa = false;

      if (_0xa9) {
        const disabledConfig = Object.assign({}, _0xa9, {
          cbDateNowChecked: false
        });
        _0xa9 = disabledConfig;
        window.postMessage({ command: "setSpeedConfig", config: disabledConfig }, "*");

        const enabledConfig = Object.assign({}, disabledConfig, {
          cbDateNowChecked: true
        });
        _0xa9 = enabledConfig;
        window.postMessage({ command: "setSpeedConfig", config: enabledConfig }, "*");
      }
      _0xae = false;
      return;
    }

    _0xa5(checkRefreshCompletion, _0xa4);
  }
})();
