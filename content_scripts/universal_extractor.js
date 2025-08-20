/**
 * AutoComplaint Universal Extractor
 * Lightweight ML-based order detection for all e-commerce sites
 */

// Import the main ML extraction logic
import { initializeExtraction } from '../src/universal-extractor.js';

console.log('🚀 AutoComplaint Universal Extractor v7.0 - ML-Based');

// Initialize extraction when the script loads
async function startUniversalExtraction() {
  try {
    console.log('� Starting universal order extraction...');
    
    // Run the main extraction logic
    const result = await initializeExtraction();
    
    if (result) {
      console.log('✅ Universal extraction completed:', result);
      
      // Notify popup/background script
      try {
        chrome.runtime.sendMessage({
          type: 'EXTRACTION_COMPLETE',
          data: result,
          url: window.location.href
        });
      } catch (error) {
        console.warn('⚠️ Could not send message to extension:', error);
      }
    } else {
      console.log('ℹ️ No order data found on this page');
    }
    
  } catch (error) {
    console.error('❌ Universal extraction failed:', error);
  }
}

// Start extraction immediately if page is ready, otherwise wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startUniversalExtraction);
} else {
  startUniversalExtraction();
}

// Watch for navigation changes in SPAs
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('� URL changed, re-running extraction...');
    setTimeout(startUniversalExtraction, 1000);
  }
});

observer.observe(document.body, { 
  subtree: true, 
  childList: true 
});

// Make extraction function available for manual testing
if (typeof window !== 'undefined') {
  window.AutoComplaintUniversalExtractor = {
    startUniversalExtraction,
    lastUrl
  };
}

// Listen for extraction requests from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractOrderData') {
    console.log('📥 Received extraction request');
    
    // Use async function with sendResponse
    (async () => {
      try {
        const result = await initializeExtraction();
        sendResponse({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('❌ Requested extraction failed:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    // Return true to indicate we will respond asynchronously
    return true;
  }
});
