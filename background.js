// Background service worker for AutoComplaint Chrome Extension
// Currently minimal - reserved for future features like notifications or persistent messaging

chrome.runtime.onInstalled.addListener(() => {
  console.log('AutoComplaint extension installed');
  
  // Initialize storage with empty order data
  chrome.storage.local.get(['autoComplaintOrder'], (result) => {
    if (!result.autoComplaintOrder) {
      chrome.storage.local.set({ autoComplaintOrder: {} });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveOrderData') {
    chrome.storage.local.set({ autoComplaintOrder: message.data }, () => {
      sendResponse({ success: true });
    });
    return true; // Will respond asynchronously
  }
});

// Handle errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reportError') {
    console.error('AutoComplaint Error:', message.error);
    // Could add error reporting or analytics here
    sendResponse({ received: true });
  }
});
