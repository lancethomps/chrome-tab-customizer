import { OPTIONS_DEFAULTS } from "./utils";

const OPTIONS = Object.assign({}, OPTIONS_DEFAULTS);
let CurrentTabIndex: number[] = [];
let TabIdsInActivatedOrder: (number | undefined)[][] = [];
let FromOnRemoved = 0;
let FromOnCreated = 0;
let FromPopupAttaching = 0;
let TabSwapMode = 0;
let ActiveWindowId = -1;
let LastActiveWindowId = -1;
let PopupWindowId = -1;
let ExternalFucusWindowId = -1;
let ExternalFucosDate = 0;
let PendingPopup: any = null;

chrome.storage.sync.get(OPTIONS_DEFAULTS, (items) => Object.assign(OPTIONS, items));
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    let storageChange = changes[key];
    (OPTIONS as any)[key] = storageChange.newValue;
    console.log(`Updated OPTIONS value: ${key}=${storageChange.newValue}`);
  }
});

chrome.windows.getAll({
  populate: false
}, function (windows) {
  for (let i = 0; i < windows.length; i++) {
    let windowId = windows[i].id;
    TabIdsInActivatedOrder[windowId] = [];
    if (windows[i].focused) {
      ActiveWindowId = windowId;
    }
    chrome.tabs.query({windowId: windowId}, function (tabs) {
      let tab = tabs[0];
      CurrentTabIndex[tab.windowId] = tab.index;
      TabIdsInActivatedOrder[tab.windowId].push(tab.id);
    });
  }
});

chrome.tabs.onCreated.addListener(function (tab) {
  if (FromOnRemoved == 1) {
    FromOnRemoved = 0;
    TabSwapMode = 1;
    return;
  }
  let windowId;
  let index = -1;
  if (OPTIONS.popUpAsTab && tab.windowId == PopupWindowId && ActiveWindowId > 0 && !isExceptionUrl(tab.url, OPTIONS.popUpAsTabExceptions)) {
    windowId = ActiveWindowId;
    TabIdsInActivatedOrder[tab.windowId].push(tab.id);
    index = CurrentTabIndex[windowId] + 1;
  } else {
    windowId = tab.windowId;
  }
  PopupWindowId = -1;
  if (TabIdsInActivatedOrder[windowId].length == 0) {
    return;
  }
  switch (OPTIONS.tabOpenPos) {
    case "first":
      index = 0;
      break;
    case "last":
      index = 9999;
      break;
    case "right":
      index = CurrentTabIndex[windowId] + 1;
      break;
    case "left":
      index = CurrentTabIndex[windowId];
      break;
  }
  if (index != -1 && tab.id != null) {
    if (windowId == tab.windowId) {
      chrome.tabs.move(tab.id, {
        index: index
      });
    } else {
      if (tab.url == "") {
        PendingPopup = {
          "tabId": tab.id,
          "windowId": windowId,
          "index": index
        };
        return;
      }
      chrome.tabs.move(tab.id, {
        windowId: windowId,
        index: index
      });
      FromPopupAttaching = 1;
      chrome.tabs.update(tab.id, {
        selected: true
      }, function (tab) {
        FromPopupAttaching = 0;
      });
    }
  }
  processNewTabActivation(tab, windowId);
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url != null && PendingPopup && tab.id == PendingPopup.tabId) {
    if (!isExceptionUrl(tab.url, OPTIONS.popUpAsTabExceptions)) {
      if (tab.id != null) {
        chrome.tabs.move(tab.id, {
          windowId: PendingPopup.windowId,
          index: PendingPopup.index
        });
      }
      processNewTabActivation(tab, PendingPopup.windowId);
    }
    PendingPopup = undefined;
  }
});
chrome.tabs.onRemoved.addListener(function (tabId) {
  FromOnRemoved = 1;
  chrome.windows.getCurrent(function (window) {
    updateActivedTabOnRemoved(window.id, tabId);
  });
});
chrome.tabs.onMoved.addListener(function (tabId, moveInfo) {
  chrome.tabs.getSelected(moveInfo.windowId, function (tab) {
    CurrentTabIndex[tab.windowId] = tab.index;
  });
});
chrome.tabs.onSelectionChanged.addListener(function (tabId, selectInfo) {
  if (FromOnCreated == 1) {
    FromOnCreated = 0;
    return;
  }
  if (FromOnRemoved == 1) {
    FromOnRemoved = 0;
    return;
  }
  if (FromPopupAttaching == 1) {
    FromPopupAttaching = 0;
    return;
  }
  updateActiveTabInfo(tabId);
});
chrome.tabs.onDetached.addListener(function (tabId, detachInfo) {
  FromOnRemoved = 1;
  updateActivedTabOnRemoved(detachInfo.oldWindowId, tabId);
});
chrome.windows.onCreated.addListener(function (window) {
  CurrentTabIndex[window.id] = 0;
  TabIdsInActivatedOrder[window.id] = [];
  if (window.type == "popup") {
    PopupWindowId = window.id;
    if (ActiveWindowId == window.id || !(ActiveWindowId > 0)) {
      ActiveWindowId = LastActiveWindowId;
      LastActiveWindowId = -1;
    }
  }
});
chrome.windows.onRemoved.addListener(function (windowId) {
  delete CurrentTabIndex[windowId];
  delete TabIdsInActivatedOrder[windowId];
  if (windowId == ActiveWindowId) {
    ActiveWindowId = -1;
  }
});
chrome.windows.onFocusChanged.addListener(function (windowId) {
  if (ActiveWindowId > 0) {
    LastActiveWindowId = ActiveWindowId;
  }
  ActiveWindowId = windowId;
  if (ExternalFucusWindowId > 0) {
    let diff = new Date().getTime() - ExternalFucosDate;
    if (ExternalFucusWindowId == windowId && diff < 500) {
      chrome.windows.update(windowId, {
        focused: false
      });
    }
  }
});

function processNewTabActivation(tab: chrome.tabs.Tab, windowId: number) {
  if (tab.id == null) {
    return;
  }
  switch (OPTIONS.newTabAction) {
    case "foreground":
      chrome.tabs.update(tab.id, {
        selected: true
      });
      break;
    case "background":
      if (tab.url && tab.url.match(/^chrome/)) {
        break;
      }
      let activateTabId = TabIdsInActivatedOrder[windowId]
        [TabIdsInActivatedOrder[windowId].length - 1];
      if (activateTabId == undefined) {
        break;
      }
      FromOnCreated = 1;
      chrome.tabs.update(activateTabId, {
        selected: true
      }, function (tab) {
        FromOnCreated = 0;
      });
      break;
    default:
      if (PendingPopup && tab.id == PendingPopup.tabId) {
        chrome.tabs.update(tab.id, {
          selected: true
        });
      }
      break;
  }
}

function updateActiveTabInfo(tabId: number) {
  chrome.tabs.get(tabId, function (tab) {
    if (tab == undefined)
      return;
    let windowId = tab.windowId;
    CurrentTabIndex[windowId] = tab.index;
    if (TabIdsInActivatedOrder[windowId] == undefined) {
      TabIdsInActivatedOrder[windowId] = [];
    }
    if (TabIdsInActivatedOrder[windowId]
      [TabIdsInActivatedOrder[windowId].length - 1] != tabId) {
      if (TabIdsInActivatedOrder[windowId].indexOf(tabId) != -1) {
        TabIdsInActivatedOrder[windowId].splice(TabIdsInActivatedOrder[windowId].indexOf(tabId), 1);
      }
      TabIdsInActivatedOrder[windowId].push(tabId);
    }
  });
}

function updateActivedTabOnRemoved(windowId: number, tabId: number) {
  let activeTabRemoved;
  if (TabIdsInActivatedOrder[windowId]
    [TabIdsInActivatedOrder[windowId].length - 1] === tabId) {
    activeTabRemoved = true;
  } else {
    activeTabRemoved = false;
  }
  if (TabIdsInActivatedOrder[windowId].indexOf(tabId) != -1) {
    TabIdsInActivatedOrder[windowId].splice(TabIdsInActivatedOrder[windowId].indexOf(tabId), 1);
  }
  FromOnRemoved = 0;
  if (!activeTabRemoved) {
    chrome.tabs.getSelected(windowId, function (tab) {
      if (tab == undefined)
        return;
      CurrentTabIndex[windowId] = tab.index;
    });
    return;
  }
  if (TabSwapMode == 1) {
    TabSwapMode = 0;
    return;
  }
  switch (OPTIONS.tabCloseAction) {
    case "first":
      activateTabByIndex(windowId, 0);
      break;
    case "last":
      activateTabByIndex(windowId, 9999);
      break;
    case "right":
      activateTabByIndex(windowId, CurrentTabIndex[windowId]);
      break;
    case "left":
      activateTabByIndex(windowId, CurrentTabIndex[windowId] - 1);
      break;
    case "order":
      let activateTabId = TabIdsInActivatedOrder[windowId]
        [TabIdsInActivatedOrder[windowId].length - 1];
      if (activateTabId != null) {
        chrome.tabs.update(activateTabId, {
          selected: true
        });
        updateActiveTabInfo(activateTabId);
      }
      break;
    default:
      chrome.tabs.getSelected(windowId, function (tab) {
        if (tab.id != null) {
          updateActiveTabInfo(tab.id);
        }
      });
      break;
  }
}

function activateTabByIndex(windowId: number, tabIndex: number) {
  chrome.windows.getAll({
    populate: true
  }, function (windows) {
    for (let i = 0; i < windows.length; i++) {
      if (windows[i].id == windowId) {
        let tabs = windows[i].tabs;
        if (!tabs || tabs.length == 0) {
          break;
        }
        let tab;
        if (tabs.length - 1 <= tabIndex) {
          tab = tabs[tabs.length - 1];
        } else {
          tab = tabs[tabIndex] || tabs[0];
        }
        if (tab.id == null) {
          break;
        }
        chrome.tabs.update(tab.id, {
          selected: true
        });
        updateActiveTabInfo(tab.id);
        break;
      }
    }
  });
}

function isExceptionUrl(url: string | undefined, exceptionString: string) {
  if (!url) {
    return false;
  }
  let exceptions = exceptionString.split('\n');
  for (let exception of exceptions) {
    let re = new RegExp(exception);
    if (url.search(re) != -1) {
      return true;
    }
  }
  return false;
}