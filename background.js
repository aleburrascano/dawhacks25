chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "showSelectedText",
      title: "Show selected text",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "showSelectedText") {
      const selectedText = info.selectionText;
      const url = chrome.runtime.getURL(`viewer.html?text=${encodeURIComponent(selectedText)}`);
      chrome.windows.create({
        url: url,
        type: "popup",
        width: 400,
        height: 300
      });
    }
  });
  