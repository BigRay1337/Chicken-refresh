// background.js
const api = globalThis.browser ?? globalThis.chrome;

api.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    api.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    }).catch(() => {});
  }
});
