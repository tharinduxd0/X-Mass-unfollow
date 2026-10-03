chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.sync.clear();
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.storage.sync.clear();

  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    await chrome.storage.sync.set({
      "twitter-mass-unfollow-reload-on-stopped": true
    });
    await chrome.storage.sync.set({ "twitter-mass-unfollow-timer": true });
    chrome.tabs.create({
      url: "options.html"
    });
  }

  chrome.action.disable();
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    const showAction = chrome.declarativeContent.ShowAction || chrome.declarativeContent.ShowPageAction;
    const rules = [
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              hostSuffix: ".x.com",
              pathContains: "following",
              schemes: ["https"]
            }
          })
        ],
        actions: [showAction ? new showAction() : new chrome.declarativeContent.ShowAction()]
      }
    ];
    chrome.declarativeContent.onPageChanged.addRules(rules);
  });
});
