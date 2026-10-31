chrome.runtime.onInstalled.addListener((_0xc5) => {

  if (_0xc5.reason === "install" || _0xc5.reason === "update") {

    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});
