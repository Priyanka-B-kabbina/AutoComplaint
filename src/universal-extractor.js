/**
 * AutoComplaint Extension - Universal E-commerce Order Extraction
 * Universal, site-agnostic order page detection and data extraction using NER
 * Works on Amazon, eBay, Flipkart, Myntra, and other e-commerce sites
 */

console.log('AutoComplaint: Universal E-commerce Order Extractor v9.0 (NER-based)');

// Import NER-based extractor
import { extractOrderInfoWithNER } from './ner-extractor.js';

// Import DistilBERT MNLI Classifier for classification only
import DistilBERTMNLIClassifier from './distilbert-mnli-classifier.js';

// Also try global window fallback for browser environments
let ClassifierFallback = DistilBERTMNLIClassifier;
if (!ClassifierFallback && typeof window !== 'undefined') {
  ClassifierFallback = window.DistilBERTMNLIClassifier;
}

// Use the available classifier
const ClassifierClass = ClassifierFallback || DistilBERTMNLIClassifier;

// Global configuration
const CONFIG = {
  CONFIDENCE_THRESHOLD: 0.7,
  DEBUG_MODE: true,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// ML Models - Standalone approach (no external server)
let models = {
  distilbertClassifier: null // Only DistilBERT MNLI for classification
};

let modelsReady = false;
const classificationCache = new Map();

/**
 * Initialize ML models for order detection and extraction
 */
async function initializeMLModels() {
  if (modelsReady) return models;
  
  try {
    console.log('🤖 Initializing standalone DistilBERT MNLI classifier...');
    
    // Load DistilBERT MNLI Order Page Classifier (STANDALONE)
    console.log('🧠 Loading DistilBERT MNLI classifier...');
    try {
      if (!ClassifierClass) {
        throw new Error('DistilBERT MNLI Classifier not available');
      }

      models.distilbertClassifier = new ClassifierClass();
      await models.distilbertClassifier.loadModel();
      console.log('✅ DistilBERT MNLI classifier loaded successfully');
    } catch (error) {
      console.error('❌ DistilBERT MNLI classifier failed to load:', error.message);
      throw error; // Don't continue without primary classifier
    }
    
    modelsReady = true;
    console.log('� Standalone ML model initialization completed');
    
    return models;
    
  } catch (error) {
    console.error('❌ Failed to initialize ML models:', error);
    modelsReady = true; // Still mark as ready to allow processing
    return models;
  }
}

/**
 * DistilBERT MNLI-based order page classification
 */
async function isOrderPageML(pageContent) {
  try {
    if (!models.distilbertClassifier) {
      throw new Error('DistilBERT MNLI classifier not available');
    }
    
    console.log('🧠 Using DistilBERT MNLI for classification...');
    
    // Use DistilBERT MNLI classifier directly
    const result = await models.distilbertClassifier.classify(pageContent);
    
    console.log('🤖 DistilBERT MNLI Result:', {
      isOrder: result.isOrder,
      confidence: result.confidence.toFixed(3),
      topLabel: result.topLabel
    });
    
    return {
      isOrder: result.isOrder,
      confidence: result.confidence,
      method: 'distilbert-mnli',
      details: result
    };
    
  } catch (error) {
    console.error('❌ DistilBERT MNLI classification failed:', error.message);
    throw error;
  }
}

/**
 * Check if current page is an order page
 */
async function isOrderPage() {
  try {
    const url = window.location.href;
    console.log('🔍 ANALYSIS START - Checking if page is an order page');
    console.log('🔍 ANALYSIS - Current URL:', url);
    console.log('🔍 ANALYSIS - Page title:', document.title);
    console.log('🔍 ANALYSIS - Domain:', window.location.hostname);
    
    // Check cache first
    if (classificationCache.has(url)) {
      const cached = classificationCache.get(url);
      if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        console.log('📋 CACHE HIT - Using cached classification:', cached.result);
        return cached.result.isOrder;
      }
    }
    
    // Ensure models are ready
    if (!modelsReady) {
      console.log('🔄 MODELS - Initializing ML models...');
      await initializeMLModels();
    }
    
    // Extract page content for classification
    console.log('📄 CONTENT - Extracting page content...');
    const pageContent = extractPageText();
    console.log('📄 CONTENT - Extracted text length:', pageContent.length);
    console.log('📄 CONTENT - First 300 characters:', pageContent.slice(0, 300));
    
    // Try ML classification first
    let result;
    try {
      console.log('🤖 CLASSIFICATION - Starting ML classification...');
      result = await isOrderPageML(pageContent);
      console.log('🤖 CLASSIFICATION - ML result:', result);
    } catch (error) {
      console.error('❌ CLASSIFICATION - ML classification failed:', error);
      console.warn('⚠️ ML classification unavailable, cannot proceed without ML models');
      return false;
    }
    
    // Cache the result
    classificationCache.set(url, {
      result,
      timestamp: Date.now()
    });
    console.log('💾 CACHE - Result cached for future use');
    
    // Clean old cache entries
    cleanCache();
    
    // Log result
    if (CONFIG.DEBUG_MODE) {
      console.log('🎯 Page Classification Result:', {
        url: url.substring(0, 100),
        isOrder: result.isOrder,
        confidence: (result.confidence * 100).toFixed(1) + '%',
        method: result.method
      });
    }
    
    const isOrder = result.isOrder && result.confidence >= CONFIG.CONFIDENCE_THRESHOLD;
    
    if (isOrder) {
      console.log(`✅ Order page detected with ${(result.confidence * 100).toFixed(1)}% confidence`);
    }
    
    return isOrder;
    
  } catch (error) {
    console.error('❌ Order page classification failed:', error);
    return false;
  }
}

/**
 * Extract text content from page for ML processing
 */
function extractPageText() {
  console.log('📄 TEXT EXTRACTION - Starting universal, adaptive content extraction...');
  console.log('📄 TEXT EXTRACTION - Domain:', window.location.hostname);
  console.log('📄 TEXT EXTRACTION - Page title:', document.title);
  
  // Comprehensive list of elements to exclude (navigation, ads, etc.)
  const excludeSelectors = [
    'nav', 'header', 'footer', 'aside', 
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.navigation', '.nav', '.menu', '.header', '.footer', '.sidebar',
    '.advertisement', '.ad', '.ads', '.promo', '.promotion', '.banner',
    '.breadcrumb', '.breadcrumbs', '.tabs', '.tab', '.pagination',
    '.social-share', '.social', '.newsletter', '.subscription',
    '.cookie-notice', '.popup', '.modal', '.overlay', '.spinner',
    '.loading', '.skeleton', '.placeholder', '.tooltip',
    'script', 'style', 'noscript', 'iframe', 'embed', 'object'
  ];
  
  // Enhanced priority selectors for order content (universal patterns)
  const orderContentSelectors = [
    // Direct order/purchase identifiers
    '[class*="order"]', '[id*="order"]',
    '[class*="purchase"]', '[id*="purchase"]',
    '[class*="invoice"]', '[id*="invoice"]',
    '[class*="receipt"]', '[id*="receipt"]',
    '[class*="confirmation"]', '[id*="confirmation"]',
    '[class*="transaction"]', '[id*="transaction"]',
    
    // Order details and summaries
    '[class*="detail"]', '[id*="detail"]',
    '[class*="summary"]', '[id*="summary"]',
    '[class*="info"]', '[id*="info"]',
    
    // Shopping and checkout related
    '[class*="checkout"]', '[id*="checkout"]',
    '[class*="cart"]', '[id*="cart"]',
    '[class*="basket"]', '[id*="basket"]',
    
    // Payment and billing
    '[class*="payment"]', '[id*="payment"]',
    '[class*="billing"]', '[id*="billing"]',
    '[class*="shipping"]', '[id*="shipping"]'
  ];
  
  // Fallback content selectors
  const fallbackSelectors = [
    'main', '[role="main"]', '.main', '#main',
    '.content', '#content', '.main-content', '#main-content',
    '.container', '.wrapper', '.page', '.body-content',
    'article', 'section'
  ];
  
  let extractedContent = '';
  let contentSources = [];
  
  // Phase 1: Try order-specific selectors first
  console.log('📄 TEXT EXTRACTION - Phase 1: Searching order-specific content...');
  for (const selector of orderContentSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`📄 TEXT EXTRACTION - Found ${elements.length} elements for: ${selector}`);
        
        for (const element of elements) {
          // Skip if element is too small or likely irrelevant
          if (element.offsetHeight < 10 || element.offsetWidth < 10) continue;
          
          const cleanText = cleanElementText(element, excludeSelectors);
          if (cleanText.length > 30) { // Only consider substantial content
            extractedContent += cleanText + ' ';
            contentSources.push(selector);
            console.log(`📄 TEXT EXTRACTION - Added content from ${selector}: ${cleanText.slice(0, 100)}...`);
          }
        }
      }
    } catch (error) {
      console.warn(`📄 TEXT EXTRACTION - Error with selector ${selector}:`, error.message);
    }
  }
  
  // Phase 2: If minimal content found, try fallback selectors
  if (extractedContent.length < 200) {
    console.log('📄 TEXT EXTRACTION - Phase 2: Limited content found, trying fallback selectors...');
    
    for (const selector of fallbackSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`📄 TEXT EXTRACTION - Found ${elements.length} fallback elements for: ${selector}`);
          
          for (const element of elements) {
            const cleanText = cleanElementText(element, excludeSelectors);
            if (cleanText.length > 50) {
              extractedContent += cleanText + ' ';
              contentSources.push(selector);
              console.log(`📄 TEXT EXTRACTION - Added fallback content from ${selector}: ${cleanText.slice(0, 100)}...`);
              break; // Only take first substantial match for fallback
            }
          }
          
          if (extractedContent.length > 500) break; // Stop if we have enough content
        }
      } catch (error) {
        console.warn(`📄 TEXT EXTRACTION - Error with fallback selector ${selector}:`, error.message);
      }
    }
  }
  
  // Phase 3: Enhanced content analysis and filtering
  console.log('📄 TEXT EXTRACTION - Phase 3: Content analysis and filtering...');
  
  // Clean and normalize the extracted content
  extractedContent = cleanAndNormalizeText(extractedContent);
  
  // Phase 4: Ultimate fallback for very minimal content
  if (!extractedContent || extractedContent.length < 20) {
    console.warn('⚠️ TEXT EXTRACTION - Phase 4: Minimal content found, using enhanced fallback...');
    
    // Try to get any text from the page that might be relevant
    const bodyText = cleanElementText(document.body, excludeSelectors);
    const titleText = document.title || '';
    const urlText = window.location.href || '';
    
    // Combine available text sources
    extractedContent = `${titleText} ${bodyText} ${urlText}`.trim();
    extractedContent = cleanAndNormalizeText(extractedContent);
    contentSources.push('ultimate-fallback');
    
    // If still no content, provide a minimal default
    if (!extractedContent || extractedContent.length < 10) {
      extractedContent = `Page title: ${titleText || 'Unknown'} URL: ${urlText || 'Unknown'}`;
      console.warn('⚠️ TEXT EXTRACTION - Using minimal fallback content');
    }
  }
  
  // Limit content size for processing efficiency
  const maxLength = 8000; // Increased from 5000 for better extraction
  if (extractedContent.length > maxLength) {
    extractedContent = extractedContent.substring(0, maxLength);
    console.log(`📄 TEXT EXTRACTION - Content truncated to ${maxLength} characters`);
  }
  
  // Final analysis and reporting
  const orderKeywords = ['order', 'purchase', 'total', 'amount', 'price', 'date', 'customer', 'product', 'item', 'quantity', 'invoice', 'receipt', 'shipping', 'billing'];
  const foundKeywords = orderKeywords.filter(keyword => 
    extractedContent.toLowerCase().includes(keyword)
  );
  
  console.log('📄 TEXT EXTRACTION - Final content analysis:', {
    contentLength: extractedContent.length,
    contentSources: [...new Set(contentSources)],
    foundOrderKeywords: foundKeywords,
    keywordCount: foundKeywords.length,
    contentQuality: foundKeywords.length > 2 ? 'Good' : foundKeywords.length > 0 ? 'Fair' : 'Poor'
  });
  
  console.log('📄 TEXT EXTRACTION - Content preview (first 300 chars):', extractedContent.slice(0, 300));
  
  return extractedContent;
}

/**
 * Clean text from an element while excluding unwanted subelements
 */
function cleanElementText(element, excludeSelectors) {
  // Clone the element to avoid modifying the original DOM
  const clonedElement = element.cloneNode(true);
  
  // Remove excluded elements
  for (const excludeSelector of excludeSelectors) {
    const excludedElements = clonedElement.querySelectorAll(excludeSelector);
    excludedElements.forEach(el => el.remove());
  }
  
  // Get text content and clean it
  let text = clonedElement.textContent || '';
  
  // Remove excessive whitespace and normalize
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Advanced text cleaning and normalization
 */
function cleanAndNormalizeText(text) {
  console.log('📄 TEXT CLEANING - Starting advanced text cleanup...');
  
  // Remove excessive whitespace, tabs, newlines
  text = text.replace(/[\t\n\r\f\v]+/g, ' ');
  text = text.replace(/\s{2,}/g, ' ');
  
  // Remove empty parentheses, brackets
  text = text.replace(/\(\s*\)/g, '');
  text = text.replace(/\[\s*\]/g, '');
  text = text.replace(/\{\s*\}/g, '');
  
  // Remove repeated punctuation
  text = text.replace(/[.,;:!?]{2,}/g, '.');
  
  // Remove standalone single characters (except numbers and currency)
  text = text.replace(/\b[a-zA-Z]\b/g, '');
  
  // Remove excessive dots and dashes
  text = text.replace(/\.{2,}/g, '.');
  text = text.replace(/-{2,}/g, '-');
  
  // Clean up spaces around punctuation
  text = text.replace(/\s+([.,;:!?])/g, '$1');
  text = text.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1');
  
  // Final cleanup
  text = text.replace(/\s+/g, ' ').trim();
  
  console.log('📄 TEXT CLEANING - Text cleanup completed');
  return text;
}

/**
 * Clean old cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [url, entry] of classificationCache.entries()) {
    if (now - entry.timestamp > CONFIG.CACHE_DURATION) {
      classificationCache.delete(url);
    }
  }
}

/**
 * Main universal order information extraction using NER
 * Now calls the NER-based extractor instead of complex regex patterns
 */
async function extractOrderInfoML(pageContent) {
  console.log('� Starting NER-based universal order extraction...');
  console.log('📊 Content length:', pageContent.length);
  
  try {
    // Use the new NER-based extractor
    const result = await extractOrderInfoWithNER(pageContent, window.location.href);
    
    console.log('✅ NER extraction completed:', {
      fieldsFound: result.extractedFields.length,
      fields: result.extractedFields,
      confidence: result.confidence.toFixed(3),
      serverUsed: result.serverAvailable
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ NER extraction failed:', error);
    
    // Fallback to basic extraction
    return {
      orderId: '',
      productName: '',
      productValue: '',
      orderDate: '',
      deliveryDate: '',
      sellerName: '',
      trackingNumber: '',
      customerDetails: {},
      extractionMethod: 'error-fallback',
      confidence: 0,
      url: window.location.href,
      domain: window.location.hostname,
      extractedFields: [],
      error: error.message
    };
  }
}
/**
 * Extract order information from the page using NER-based ML
 */
async function extractOrderInfo() {
  try {
    console.log('🔍 ORDER CHECK - Verifying if page contains order information...');
    
    // First check if this is an order page
    const isOrder = await isOrderPage();
    console.log('🔍 ORDER CHECK - Is order page result:', isOrder);
    
    if (!isOrder) {
      console.log('⏭️ ORDER CHECK - Not an order page, skipping extraction');
      console.log('💡 ORDER CHECK - If this should be an order page, check the classification logic');
      return null;
    }
    
    console.log('📦 ORDER EXTRACTION - Starting ML-based order information extraction...');
    
    // Ensure models are ready
    if (!modelsReady) {
      console.log('🤖 MODEL CHECK - Models not ready, initializing...');
      await initializeMLModels();
    }
    
    // Extract page content
    console.log('📄 CONTENT PREP - Extracting page content for ML processing...');
    const pageContent = extractPageText();
    console.log('📄 CONTENT PREP - Content length:', pageContent.length);
    console.log('📄 CONTENT PREP - Content preview:', pageContent.slice(0, 200));
    
    // Use ML extraction
    console.log('🤖 ML EXTRACTION - Running ML-based order info extraction...');
    const orderInfo = await extractOrderInfoML(pageContent);
    console.log('🤖 ML EXTRACTION - Raw ML result:', orderInfo);
    
    if (orderInfo) {
      console.log('✅ ORDER SUCCESS - Order extracted successfully:', orderInfo);
      console.log('📊 ORDER SUMMARY - Extracted fields:', Object.keys(orderInfo));
      
      // Log specific fields for debugging
      if (orderInfo.orderId) console.log('📋 ORDER DETAIL - Order ID found:', orderInfo.orderId);
      if (orderInfo.total) console.log('💰 ORDER DETAIL - Total found:', orderInfo.total);
      if (orderInfo.items) console.log('📦 ORDER DETAIL - Items found:', orderInfo.items.length);
      if (orderInfo.date) console.log('📅 ORDER DETAIL - Date found:', orderInfo.date);
      
      return orderInfo;
    } else {
      console.warn('⚠️ ORDER EMPTY - No order information could be extracted');
      console.warn('💡 TROUBLESHOOT - Check if page has expected order elements or adjust selectors');
      return null;
    }
    
  } catch (error) {
    console.error('❌ ORDER ERROR - Order extraction failed:', error);
    console.error('❌ ORDER ERROR - Stack trace:', error.stack);
    return null;
  }
}

/**
 * Initialize and run the main extraction process
 */
async function initializeExtraction() {
  try {
    console.log('🚀 EXTRACTION START - AutoComplaint ML extraction process');
    console.log('🔍 EXTRACTION - Current URL:', window.location.href);
    console.log('🔍 EXTRACTION - Page title:', document.title);
    console.log('🔍 EXTRACTION - Domain:', window.location.hostname);
    console.log('🔍 EXTRACTION - Timestamp:', new Date().toISOString());
    
    // Analyze page structure first
    console.log('📋 PAGE ANALYSIS - Analyzing page structure...');
    const pageInfo = analyzePageStructure();
    console.log('📋 PAGE ANALYSIS - Results:', pageInfo);
    
    // Initialize ML models
    console.log('🤖 MODEL INIT - Initializing ML models...');
    await initializeMLModels();
    console.log('🤖 MODEL INIT - ML models ready');
    
    // Extract order information
    console.log('📦 DATA EXTRACTION - Starting order data extraction...');
    const extractedData = await extractOrderInfo();
    console.log('📦 DATA EXTRACTION - Raw extraction result:', extractedData);
    
    if (extractedData) {
      console.log('✅ EXTRACTION SUCCESS - Order data extracted:', extractedData);
      console.log('📊 EXTRACTION STATS - Fields found:', Object.keys(extractedData).length);
      console.log('📊 EXTRACTION STATS - Has order ID:', !!extractedData.orderId);
      console.log('📊 EXTRACTION STATS - Has total:', !!extractedData.total);
      console.log('📊 EXTRACTION STATS - Has items:', !!extractedData.items?.length);
      
      // Save to chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ autoComplaintOrder: extractedData }, () => {
          if (chrome.runtime.lastError) {
            console.error('❌ STORAGE ERROR:', chrome.runtime.lastError);
          } else {
            console.log('✅ STORAGE SUCCESS - Order data saved to chrome storage');
          }
        });
      } else {
        console.log('📋 STORAGE SKIP - Chrome storage not available, data extracted only');
      }
      
      return extractedData;
    } else {
      console.log('⚠️ EXTRACTION EMPTY - No order data could be extracted from this page');
      console.log('🔍 TROUBLESHOOT - Page might not be an order page or selectors need adjustment');
      return null;
    }
    
  } catch (error) {
    console.error('❌ EXTRACTION ERROR - Full extraction process failed:', error);
    console.error('❌ EXTRACTION ERROR - Stack trace:', error.stack);
    return null;
  }
}

/**
 * Run extraction when page is ready
 */
function startExtraction() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtraction);
  } else {
    // Page already loaded
    initializeExtraction();
  }
}

/**
 * Watch for URL changes (SPA navigation)
 */
function watchForPageChanges() {
  let lastUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('🔄 Page URL changed, re-running extraction...');
      setTimeout(initializeExtraction, 1000); // Small delay for page to load
    }
  });
  
  observer.observe(document.body, { 
    subtree: true, 
    childList: true 
  });
}

/**
 * Analyze page structure for debugging purposes
 */
function analyzePageStructure() {
  const analysis = {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    hasOrderKeywords: false,
    orderKeywords: [],
    elementCounts: {},
    hasOrderElements: false,
    orderElements: [],
    suspectedOrderPage: false
  };

  // Check for order-related keywords in title and URL
  const orderKeywords = ['order', 'purchase', 'receipt', 'invoice', 'confirmation', 'thank you', 'checkout'];
  const combinedText = (document.title + ' ' + window.location.href).toLowerCase();
  
  analysis.orderKeywords = orderKeywords.filter(keyword => combinedText.includes(keyword));
  analysis.hasOrderKeywords = analysis.orderKeywords.length > 0;

  // Check for order-related elements
  const orderSelectors = [
    '.order', '.order-details', '.order-summary', '.order-info',
    '.receipt', '.invoice', '.confirmation', '.purchase-summary',
    '[class*="order"]', '[id*="order"]', '[class*="receipt"]', '[id*="receipt"]'
  ];

  for (const selector of orderSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      analysis.orderElements.push({ selector, count: elements.length });
      analysis.elementCounts[selector] = elements.length;
    }
  }

  analysis.hasOrderElements = analysis.orderElements.length > 0;

  // Check common page elements
  analysis.elementCounts.headings = document.querySelectorAll('h1, h2, h3').length;
  analysis.elementCounts.forms = document.querySelectorAll('form').length;
  analysis.elementCounts.tables = document.querySelectorAll('table').length;
  analysis.elementCounts.lists = document.querySelectorAll('ul, ol').length;
  analysis.elementCounts.images = document.querySelectorAll('img').length;

  // Determine if this looks like an order page
  analysis.suspectedOrderPage = analysis.hasOrderKeywords || analysis.hasOrderElements;

  return analysis;
}

// Initialize the extension
console.log('🏁 AutoComplaint ML extension loaded, starting extraction...');
startExtraction();
watchForPageChanges();

// Export functions for use by other modules
export { 
  initializeExtraction, 
  extractOrderInfo, 
  isOrderPage, 
  initializeMLModels 
};

// Expose functions for testing/debugging
if (typeof window !== 'undefined') {
  window.AutoComplaint = {
    extractOrderInfo,
    isOrderPage,
    initializeMLModels,
    initializeExtraction,
    models,
    CONFIG
  };
}
