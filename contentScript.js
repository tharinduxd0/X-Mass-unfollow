var nullKey = Symbol("null");
var keyCounter = 0;

class ManyKeysMap extends Map {
  constructor() {
    super();
    this._objectHashes = new WeakMap;
    this._symbolHashes = new Map;
    this._publicKeys = new Map;
    const [pairs] = arguments;
    if (pairs === null || pairs === undefined) {
      return;
    }
    if (typeof pairs[Symbol.iterator] !== "function") {
      throw new TypeError(typeof pairs + " is not iterable (cannot read property Symbol(Symbol.iterator))");
    }
    for (const [keys, value] of pairs) {
      this.set(keys, value);
    }
  }
  _getPublicKeys(keys, create = false) {
    if (!Array.isArray(keys)) {
      throw new TypeError("The keys parameter must be an array");
    }
    const privateKey = this._getPrivateKey(keys, create);
    let publicKey;
    if (privateKey && this._publicKeys.has(privateKey)) {
      publicKey = this._publicKeys.get(privateKey);
    } else if (create) {
      publicKey = [...keys];
      this._publicKeys.set(privateKey, publicKey);
    }
    return { privateKey, publicKey };
  }
  _getPrivateKey(keys, create = false) {
    const privateKeys = [];
    for (let key of keys) {
      if (key === null) {
        key = nullKey;
      }
      const hashes = typeof key === "object" || typeof key === "function" ? "_objectHashes" : typeof key === "symbol" ? "_symbolHashes" : false;
      if (!hashes) {
        privateKeys.push(key);
      } else if (this[hashes].has(key)) {
        privateKeys.push(this[hashes].get(key));
      } else if (create) {
        const privateKey = `@@mkm-ref-${keyCounter++}@@`;
        this[hashes].set(key, privateKey);
        privateKeys.push(privateKey);
      } else {
        return false;
      }
    }
    return JSON.stringify(privateKeys);
  }
  set(keys, value) {
    const { publicKey } = this._getPublicKeys(keys, true);
    return super.set(publicKey, value);
  }
  get(keys) {
    const { publicKey } = this._getPublicKeys(keys);
    return super.get(publicKey);
  }
  has(keys) {
    const { publicKey } = this._getPublicKeys(keys);
    return super.has(publicKey);
  }
  delete(keys) {
    const { publicKey, privateKey } = this._getPublicKeys(keys);
    return Boolean(publicKey && super.delete(publicKey) && this._publicKeys.delete(privateKey));
  }
  clear() {
    super.clear();
    this._symbolHashes.clear();
    this._publicKeys.clear();
  }
  get [Symbol.toStringTag]() {
    return "ManyKeysMap";
  }
  get size() {
    return super.size;
  }
}


function pDefer() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}


class Node {
  value;
  next;
  constructor(value) {
    this.value = value;
  }
}

class Queue {
  #head;
  #tail;
  #size;
  constructor() {
    this.clear();
  }
  enqueue(value) {
    const node = new Node(value);
    if (this.#head) {
      this.#tail.next = node;
      this.#tail = node;
    } else {
      this.#head = node;
      this.#tail = node;
    }
    this.#size++;
  }
  dequeue() {
    const current = this.#head;
    if (!current) {
      return;
    }
    this.#head = this.#head.next;
    this.#size--;
    return current.value;
  }
  clear() {
    this.#head = undefined;
    this.#tail = undefined;
    this.#size = 0;
  }
  get size() {
    return this.#size;
  }
  *[Symbol.iterator]() {
    let current = this.#head;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}


var cache = new ManyKeysMap;
var isDomReady = (target) => ["interactive", "complete"].includes((target.ownerDocument ?? target).readyState);
function elementReady(selector, {
  target = document,
  stopOnDomReady = true,
  waitForChildren = true,
  timeout = Number.POSITIVE_INFINITY,
  predicate
} = {}) {
  const cacheKeys = [selector, stopOnDomReady, timeout, waitForChildren, target];
  const cachedPromise = cache.get(cacheKeys);
  if (cachedPromise) {
    return cachedPromise;
  }
  let rafId;
  const deferred = pDefer();
  const { promise } = deferred;
  cache.set(cacheKeys, promise);
  const stop = (element) => {
    cancelAnimationFrame(rafId);
    cache.delete(cacheKeys, promise);
    deferred.resolve(element);
  };
  if (timeout !== Number.POSITIVE_INFINITY) {
    setTimeout(stop, timeout);
  }
  (function check() {
    const element = getMatchingElement({ target, selector, predicate });
    if (isDomReady(target) && (stopOnDomReady || element)) {
      stop(element ?? undefined);
      return;
    }
    let current = element;
    while (current) {
      if (!waitForChildren || current.nextSibling) {
        stop(element);
        return;
      }
      current = current.parentElement;
    }
    rafId = requestAnimationFrame(check);
  })();
  return Object.assign(promise, { stop: () => stop() });
}
function getMatchingElement({ target, selector, predicate } = {}) {
  if (predicate) {
    const elements = target.querySelectorAll(selector);
    return [...elements].find((element) => predicate(element));
  }
  return target.querySelector(selector);
}


var $ = {
  one(selector) {
    return document.querySelector(selector);
  },
  many(selector) {
    return document.querySelectorAll(selector);
  },
  create(tag) {
    return document.createElement(tag);
  }
};
var getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};
var waitForElement = async (selector) => {
  const element = await elementReady(selector, { stopOnDomReady: false });
  return element;
};
var sendMessage = async (msg) => {
  const tab = await getCurrentTab();
  const tabId = tab.id;
  if (!tabId)
    return;
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      if (chrome.runtime.lastError)
        reject(chrome.runtime.lastError);
      if (response)
        resolve(response.payload);
      reject("No response");
    });
  }).catch(console.log);
};
var isExtensionPage = (url = location.href) => {
  return /https:\/\/(.*\.)?x\.com\/.*\/following/.test(url);
};
var storage = {
  set: async (key, value) => {
    return chrome.storage.sync.set({ [key]: value }).then(() => value).catch(console.log);
  },
  get: async (key) => {
    return chrome.storage.sync.get(key).then((result) => result[key]).catch(console.log);
  },
  timerKey: "twitter-mass-unfollow-timer",
  whiteListedUsersKey: "twitter-mass-unfollow-whitelisted",
  reloadOnStoppedKey: "twitter-mass-unfollow-reload-on-stopped"
};
var waitFor = async (duration = 1000) => new Promise((resolve) => setTimeout(resolve, duration));


var html = document.querySelector("html");
var unFollowedUsers = [];
var timerHandler = null;
var previousScrollHeight = 0;
var inProgress = false;
var isPaused = false;


var tmuWrapper = $.create("div");
tmuWrapper.style.cssText = `
  position: fixed;
  right: 20px;
  bottom: 70px;
  z-index: 10;
  visibility: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`.trim();

var progressCard = $.create("div");
progressCard.style.cssText = `
  background: linear-gradient(135deg, #1d9bf0 0%, #0f7ad9 100%);
  color: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 32px rgba(29, 155, 240, 0.3);
  width: 280px;
  backdrop-filter: blur(10px);
`.trim();

var progressLabel = $.create("div");
progressLabel.style.cssText = `
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.9;
  margin-bottom: 8px;
`.trim();
progressLabel.textContent = "Unfollowing";

var progressCount = $.create("div");
progressCount.style.cssText = `
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 12px;
`.trim();
progressCount.textContent = "0";

var progressBar = $.create("div");
progressBar.style.cssText = `
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
`.trim();

var progressFill = $.create("div");
progressFill.style.cssText = `
  height: 100%;
  width: 0%;
  background: white;
  border-radius: 3px;
  transition: width 0.3s ease;
`.trim();
progressBar.appendChild(progressFill);

var progressStatus = $.create("div");
progressStatus.style.cssText = `
  font-size: 11px;
  opacity: 0.85;
  font-weight: 500;
`.trim();
progressStatus.textContent = "Processing...";

progressCard.appendChild(progressLabel);
progressCard.appendChild(progressCount);
progressCard.appendChild(progressBar);
progressCard.appendChild(progressStatus);
tmuWrapper.appendChild(progressCard);
document.body.appendChild(tmuWrapper);

var showContentInDOM = () => {
  tmuWrapper.style.visibility = "visible";
};

var updateProgressDisplay = (count, total) => {
  progressCount.textContent = count;
  if (total > 0) {
    const percentage = Math.min((count / total) * 100, 100);
    progressFill.style.width = percentage + "%";
    progressStatus.textContent = total ? `${count} / ${total}` : `${count} accounts unfollowed`;
  }
};

var getFollowingsContainer = () => {
  return $.one("section[role=region] div") || $.one("main div") || document.body;
};
var getFollowingButtons = () => {
  const selector = [
    "button[data-testid$='-unfollow']",
    "button[data-testid*='unfollow']",
    "button[data-testid*='following']",
    "button[aria-label*='Following']",
    "button[aria-label*='Unfollow']",
    "button[aria-label*='Following @']",
    "button[aria-label*='Unfollow @']"
  ].join(", ");

  const buttons = Array.from(document.querySelectorAll(selector));
  const uniqueButtons = [];
  const seen = new Set();

  for (const button of buttons) {
    const label = (button.getAttribute("aria-label") || "").toLowerCase();
    const testId = (button.getAttribute("data-testid") || "").toLowerCase();
    const isLikelyFollowButton = label.includes("following") || label.includes("unfollow") || testId.includes("following") || testId.includes("unfollow");
    const key = button.closest("article, li, div") ?? button;

    if (isLikelyFollowButton && !seen.has(key)) {
      seen.add(key);
      uniqueButtons.push(button);
    }
  }

  return uniqueButtons;
};
var getUsername = (followingBtn) => {
  const ariaLabel = followingBtn.getAttribute("aria-label") || "";
  const usernameMatch = ariaLabel.match(/@([A-Za-z0-9_]+)/i);
  if (usernameMatch) return usernameMatch[1].toLowerCase();

  const link = followingBtn.closest("article")?.querySelector("a[href*='/']") || followingBtn.closest("a");
  const href = link?.getAttribute("href") || "";
  const hrefMatch = href.match(/\/([A-Za-z0-9_]+)(?:\?.*)?$/);
  return hrefMatch ? hrefMatch[1].toLowerCase() : "";
};
var filterFollowings = async (followings, unFollowNotFollowing) => {
  const whitelistedUsers = await storage.get(storage.whiteListedUsersKey);
  const normalizedWhitelist = Array.isArray(whitelistedUsers)
    ? whitelistedUsers.map((user) => String(user).trim().toLowerCase())
    : String(whitelistedUsers || "").split(",").map((user) => user.trim().toLowerCase()).filter(Boolean);

  const accountsToUnFollow = followings.filter((followingBtn) => {
    const username = getUsername(followingBtn);
    if (!username) return true;
    if (!normalizedWhitelist.length) return true;
    return !normalizedWhitelist.includes(username);
  });

  return unFollowNotFollowing ? accountsToUnFollow.filter((following) => {
    const card = followingBtnToCard(following);
    const text = (card?.textContent || "").toLowerCase();
    const hasFollowIndicator = !!card?.querySelector('[data-testid="userFollowIndicator"]');
    return !hasFollowIndicator && !text.includes("follows you");
  }) : accountsToUnFollow;
};
var followingBtnToCard = (followingBtn) => {
  return followingBtn.closest("article") || followingBtn.closest("div[role='article']") || followingBtn.parentElement?.parentElement || followingBtn.parentElement;
};
var confirmUnFollow = async () => {
  const confirmUnFollowButton = await waitForElement("[data-testid=confirmationSheetDialog] button[data-testid=confirmationSheetConfirm], [data-testid='confirmationSheetConfirm'], [role='button'][data-testid$='confirm']");
  if (!confirmUnFollowButton) {
    inProgress = false;
    console.log("confirm unfollow button not found");
    return;
  }
  confirmUnFollowButton.click();
};
var unFollow = async (followingButtons = [], demo, delay) => {
  const actualDelay = delay ?? 200;
  for (const followingButton of followingButtons) {
    if (!inProgress) break;
    while (isPaused) {
      await waitFor(100);
    }
    const username = getUsername(followingButton);
    if (!unFollowedUsers.includes(username)) {
      unFollowedUsers.push(username);
      updateProgressDisplay(unFollowedUsers.length, 0);
      if (demo) {
        const [element] = Array.from(followingButton.querySelectorAll("span")).splice(-1);
        if (element)
          element.textContent = "Follow";
      } else {
        followingButton.click();
        await confirmUnFollow();
      }
      await waitFor(actualDelay);
    }
  }
};
var scrollFollowingList = async (options) => {
  const { shouldUnFollowNotFollowingOnly = false, isDemo = false, delay = 200 } = options || {};
  if (previousScrollHeight !== html.scrollHeight && inProgress && isExtensionPage()) {
    previousScrollHeight = html.scrollHeight;
    const followingsContainer = getFollowingsContainer();
    const followings = getFollowingButtons();
    const accountsToUnfollow = await filterFollowings(followings, shouldUnFollowNotFollowingOnly);
    await unFollow(accountsToUnfollow, isDemo, delay);
    if (followingsContainer) {
      const scrollBy = followingsContainer.clientHeight;
      html.scroll({
        top: followingsContainer.offsetHeight + scrollBy,
        behavior: "smooth"
      });
    }
    await waitFor(3000);
    scrollFollowingList({
      shouldUnFollowNotFollowingOnly,
      isDemo,
      delay
    });
  }
};
var abort = async () => {
  if (!inProgress)
    return;
  inProgress = false;
  if (timerHandler)
    clearInterval(timerHandler);


  progressLabel.textContent = "✓ Completed";
  progressStatus.textContent = `Unfollowed ${unFollowedUsers.length} accounts`;
  progressCard.style.background = "linear-gradient(135deg, #0d8a5d 0%, #0a6b4a 100%)";

  await waitFor(2000);

  const shouldReload = await storage.get(storage.reloadOnStoppedKey);
  if (shouldReload)
    window.location.reload();

  tmuWrapper.style.visibility = "hidden";

  unFollowedUsers = [];
  progressLabel.textContent = "Unfollowing";
  progressStatus.textContent = "Processing...";
  progressCard.style.background = "linear-gradient(135deg, #1d9bf0 0%, #0f7ad9 100%)";
};
var startTimer = () => {
  storage.get(storage.timerKey).then((autoStop) => {
    if (autoStop) {
      timerHandler = setTimeout(() => abort(), 1000 * 60);
    }
  });
};
var run = async (options) => {
  const { shouldUnFollowNotFollowingOnly = false, isDemo = false } = options || {};
  if (inProgress)
    return;
  inProgress = true;
  unFollowedUsers = [];
  updateProgressDisplay(0, 0);
  showContentInDOM();
  const delay = await storage.get(storage.delayKey) ?? 200;
  scrollFollowingList({
    shouldUnFollowNotFollowingOnly,
    isDemo,
    delay
  });
  startTimer();
};
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  try {
    switch (message.type) {
      case "UNFOLLOW_ALL" :
        run();
        return;
      case "UNFOLLOW_NOT_FOLLOWING" :
        run({ shouldUnFollowNotFollowingOnly: true });
        return;
      case "DEMO" :
        run({ isDemo: true });
        return;
      case "STOP" :
        abort();
        return;
      case "PAUSE" :
        isPaused = true;
        progressLabel.textContent = "⏸ Paused";
        return;
      case "RESUME" :
        isPaused = false;
        progressLabel.textContent = "◾ Unfollowing";
        return;
      case "COUNT_FOLLOWINGS" :
        const followings = getFollowingButtons();
        reply({ payload: followings.length });
        return;
      case "CHECK_IN_PROGRESS" :
        reply({ payload: previousScrollHeight !== 0 && inProgress });
        return;
      default:
        break;
    }
  } catch (error) {
    console.log(error);
  }
});
window.addEventListener("beforeunload", () => abort());
document.body.addEventListener("click", () => {
  if (!isExtensionPage() && inProgress)
    abort();
});
