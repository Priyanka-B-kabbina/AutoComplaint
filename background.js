
// Background service worker for AutoComplaint Chrome Extension
// Currently minimal - reserved for future features like notifications or persistent messaging

chrome.runtime.onInstalled.addListener(() => {
  console.log('AutoComplaint extension installed');
});
