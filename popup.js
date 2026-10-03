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
  reloadOnStoppedKey: "twitter-mass-unfollow-reload-on-stopped",
  delayKey: "twitter-mass-unfollow-delay"
};
var waitFor = async (duration = 1000) => new Promise((resolve) => setTimeout(resolve, duration));


(function() {
  let inProgress = false;
  const demoBtn = document.querySelector("#demo");
  const stopBtn = document.querySelector("#stop");
  const unFollowAllBtn = document.querySelector("#unfollow-all");
  const unFollowNotFollowingBtn = document.querySelector("#unfollow-not-following");
  const rerenderButtons = (reset) => {
    if (reset) {
      inProgress = false;
      unFollowAllBtn?.removeAttribute("disabled");
      unFollowNotFollowingBtn?.removeAttribute("disabled");
    } else {
      inProgress = true;
      unFollowAllBtn?.setAttribute("disabled", "true");
      unFollowNotFollowingBtn?.setAttribute("disabled", "true");
    }
  };
  window.addEventListener("load", async () => {
    const tab = await getCurrentTab();
    sendMessage({ type: "CHECK_IN_PROGRESS"  }).then((value) => {
      if (typeof value !== "boolean") {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["contentScript.js"]
        });
        return;
      }
      if (value)
        rerenderButtons();
    }).catch(() => {
      console.log("failed to inject content script");
    });
  });
  const init = (type) => {
    if (inProgress)
      return;
    rerenderButtons();
    sendMessage({ type });
  };
  const closeConfirmationModal = () => {
    document.getElementById('confirmationModal')?.classList.remove('active');
    window._pendingInit = null;
  };

  const showConfirmationModal = async (actionText, pendingAction) => {
    const tab = await getCurrentTab();
    const count = await new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tab.id, { type: "COUNT_FOLLOWINGS" }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(0);
            return;
          }
          resolve(response?.payload || 0);
        });
      } catch (error) {
        resolve(0);
      }
    });
    document.getElementById('confirmationCount').textContent = count;
    document.getElementById('confirmationText').textContent = actionText;
    window._pendingInit = pendingAction;
    document.getElementById('confirmationModal').classList.add('active');
  };
  demoBtn?.addEventListener("click", () => showConfirmationModal("demo accounts will be unfollowed", () => init("DEMO")));
  unFollowAllBtn?.addEventListener("click", () => {
    showConfirmationModal("all accounts will be unfollowed", () => init("UNFOLLOW_ALL"));
  });
  unFollowNotFollowingBtn?.addEventListener("click", () => showConfirmationModal("unreciprocated accounts will be unfollowed", () => init("UNFOLLOW_NOT_FOLLOWING")));
  stopBtn?.addEventListener("click", () => {
    rerenderButtons(true);
    sendMessage({ type: "STOP"  });
  });

  // Confirmation modal handlers
  document.getElementById('confirmAction')?.addEventListener('click', () => {
    if (window._pendingInit) {
      window._pendingInit();
      closeConfirmationModal();
    }
  });

  document.getElementById('cancelAction')?.addEventListener('click', closeConfirmationModal);
  document.getElementById('closeConfirmation')?.addEventListener('click', closeConfirmationModal);
  document.getElementById('confirmationModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmationModal')) {
      closeConfirmationModal();
    }
  });
})();


(function() {
  const modal = document.getElementById('settingsModal');
  const settingsOpenBtn = document.querySelector('.settings-open');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const settingsForm = document.getElementById('settingsForm');
  const usernamestextarea = document.getElementById('usernames');
  const timerCheckbox = document.getElementById('timer');
  const reloadCheckbox = document.getElementById('reload-on-stopped');
  const delayInput = document.getElementById('delay');


  settingsOpenBtn?.addEventListener('click', async () => {
    modal?.classList.add('active');

    const usernames = await storage.get(storage.whiteListedUsersKey) || '';
    const timerEnabled = await storage.get(storage.timerKey) ?? true;
    const reloadEnabled = await storage.get(storage.reloadOnStoppedKey) ?? true;
    const delay = await storage.get(storage.delayKey) ?? 200;

    usernamestextarea.value = usernames;
    timerCheckbox.checked = timerEnabled;
    reloadCheckbox.checked = reloadEnabled;
    delayInput.value = delay;
  });


  const closeModal = () => {
    modal?.classList.remove('active');
  };

  closeSettingsBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });


  settingsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernames = usernamestextarea.value;
    const timerEnabled = timerCheckbox.checked;
    const reloadEnabled = reloadCheckbox.checked;
    const delay = parseInt(delayInput.value) || 200;

    await storage.set(storage.whiteListedUsersKey, usernames);
    await storage.set(storage.timerKey, timerEnabled);
    await storage.set(storage.reloadOnStoppedKey, reloadEnabled);
    await storage.set(storage.delayKey, delay);

    closeModal();
  });


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeModal();
    }
  });
})();
