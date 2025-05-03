// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: "searchYouTube",
    title: "Search YouTube for this text",
    contexts: ["selection"],
  });
});

// Handle browser action button click
chrome.action.onClicked.addListener((tab) => {
  // Get the last search query from storage
  chrome.storage.local.get(["lastSearchQuery"], (result) => {
    const query = result.lastSearchQuery || "";

    // Set and open the popup
    chrome.action.setPopup({
      popup: `youtube-viewer.html?query=${encodeURIComponent(query)}`,
    });

    // Open the popup
    chrome.action.openPopup();
  });
});

// Handle context menu item click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "searchYouTube") {
    const selectedText = info.selectionText;

    // Save the selected text for later use
    chrome.storage.local.set({ lastSearchQuery: selectedText });

    // Set the popup URL with the query parameter
    chrome.action.setPopup({
      popup: `youtube-viewer.html?query=${encodeURIComponent(selectedText)}`,
    });

    // Open the popup
    chrome.action.openPopup();
  }
});
