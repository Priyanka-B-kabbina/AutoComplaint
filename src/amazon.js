/**
 * AutoComplaint Extension - ML-Based Order Extraction with DistilBERT MNLI
 * Uses DistilBERT MNLI model for order detection and ML models for extraction
 */

console.log('AutoComplaint: DistilBERT MNLI + ML Extraction v7.1');

// Import DistilBERT MNLI Classifier
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
  MODEL_SERVER_URL: 'http://localhost:3001',
  CONFIDENCE_THRESHOLD: 0.7,
  DEBUG_MODE: true,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// ML Models
let models = {
  distilbertClassifier: null, // DistilBERT MNLI for classification
  extractor: null,
  ner: null,
  embeddings: null
};

let modelsReady = false;
const classificationCache = new Map();

/**
 * Initialize ML models for order detection and extraction
 */
async function initializeMLModels() {
  if (modelsReady) return models;
  
  try {
    console.log('🤖 Initializing ML models with DistilBERT MNLI...');
    
    // 1. DistilBERT MNLI Order Page Classifier (PRIMARY)
    console.log('🧠 Loading DistilBERT MNLI classifier...');
    try {      if (!ClassifierClass) {
        throw new Error('DistilBERT MNLI Classifier not available');
      }

      models.distilbertClassifier = new ClassifierClass();
      await models.distilbertClassifier.loadModel();
      console.log('✅ DistilBERT MNLI classifier loaded successfully');
    } catch (error) {
      console.error('❌ DistilBERT MNLI classifier failed to load:', error.message);
      throw error; // Don't continue without primary classifier
    }
    
    // Load additional models from training suite server
    const modelBaseUrl = `${CONFIG.MODEL_SERVER_URL}/models`;
    
    // 1. Order Page Classifier
    console.log('📊 Loading order page classifier...');
    try {
      const classifierResponse = await fetch(`${modelBaseUrl}/classifier`);
      if (classifierResponse.ok) {
        models.classifier = await classifierResponse.json();
        console.log('✅ Order classifier loaded');
      } else {
        console.warn('⚠️ Could not load classifier from server');
      }
    } catch (error) {
      console.warn('⚠️ Classifier server unavailable:', error.message);
    }
    
    // 2. Information Extractor Model
    console.log('🔍 Loading information extractor...');
    try {
      const extractorResponse = await fetch(`${modelBaseUrl}/extractor`);
      if (extractorResponse.ok) {
        models.extractor = await extractorResponse.json();
        console.log('✅ Information extractor loaded');
      }
    } catch (error) {
      console.warn('⚠️ Extractor server unavailable:', error.message);
    }
    
    // 3. Named Entity Recognition
    console.log('🏷️ Loading NER model...');
    if (typeof pipeline !== 'undefined') {
      try {
        models.ner = await pipeline('token-classification', 'Xenova/bert-base-multilingual-cased');
        console.log('✅ NER model loaded');
      } catch (error) {
        console.warn('⚠️ NER model loading failed:', error.message);
      }
    }
    
    // 4. Text Embeddings  
    console.log('🧠 Loading embeddings model...');
    if (typeof loadUSE !== 'undefined') {
      try {
        models.embeddings = await loadUSE();
        console.log('✅ Embeddings model loaded');
      } catch (error) {
        console.warn('⚠️ Embeddings model loading failed:', error.message);
      }
    }
    
    modelsReady = true;
    console.log('🎉 ML models initialization completed');
    
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
  console.log('📄 TEXT EXTRACTION - Starting page text extraction');
  
  // Focus on main content areas
  const selectors = [
    'main',
    '[role="main"]',
    '.order',
    '.invoice', 
    '.receipt',
    '.confirmation',
    '.order-details',
    '.order-summary'
  ];
  
  let content = '';
  const elementsFound = {};
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elementsFound[selector] = elements.length;
    
    for (const element of elements) {
      if (element.textContent) {
        const elementText = element.textContent.trim();
        if (elementText.length > 10) { // Only include meaningful text
          content += elementText + ' ';
          console.log(`📄 TEXT EXTRACTION - Found content in ${selector}: ${elementText.slice(0, 100)}...`);
        }
      }
    }
  }
  
  console.log('📄 TEXT EXTRACTION - Elements found per selector:', elementsFound);
  console.log('📄 TEXT EXTRACTION - Content from selectors length:', content.length);
  
  // Fallback to body if nothing specific found
  if (content.trim().length < 100) {
    console.log('📄 TEXT EXTRACTION - Content too short, falling back to body text');
    content = document.body.textContent || '';
    console.log('📄 TEXT EXTRACTION - Body text length:', content.length);
  }
  
  // Limit content length for ML processing
  const finalContent = content.substring(0, 5000);
  console.log('📄 TEXT EXTRACTION - Final content length (truncated):', finalContent.length);
  console.log('📄 TEXT EXTRACTION - Final content preview:', finalContent.slice(0, 300));
  
  return finalContent;
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
 * ML-based order information extraction
 */
async function extractOrderInfoML(pageContent) {
  try {
    if (!models.extractor) {
      throw new Error('Extractor model not available');
    }
    
    console.log('🔍 Starting ML-based information extraction...');
    
    // Send to extraction API
    const response = await fetch(`${CONFIG.MODEL_SERVER_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: pageContent,
        url: window.location.href 
      })
    });
    
    if (!response.ok) {
      throw new Error('Extraction API error');
    }
    
    const extractedData = await response.json();
    
    // Enhance with NER if available
    if (models.ner) {
      const entities = await models.ner(pageContent);
      extractedData.entities = entities;
    }
    
    // Add semantic similarity scores if embeddings available
    if (models.embeddings) {
      const embeddings = await models.embeddings.embed([pageContent]);
      extractedData.embeddings = await embeddings.array();
    }
    
    extractedData.extractionMethod = 'ml';
    extractedData.timestamp = new Date().toISOString();
    extractedData.orderUrl = window.location.href;
    
    console.log('✅ ML extraction completed:', extractedData);
    return extractedData;
    
  } catch (error) {
    console.error('❌ ML extraction failed:', error);
    throw error;
  }
}

/**
 * Extract order information from the page using ML
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
