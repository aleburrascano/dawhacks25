chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "searchYouTube",
    title: "Search YouTube for this text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchYouTube") {
    const selectedText = info.selectionText;
    const url = chrome.runtime.getURL(
      `youtube-viewer.html?query=${encodeURIComponent(selectedText)}`
    );
    chrome.windows.create({
      url: url,
      type: "popup",
      width: 600,
      height: 500,
    });
  }
});
