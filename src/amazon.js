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
    
    // Check cache first
    if (classificationCache.has(url)) {
      const cached = classificationCache.get(url);
      if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        if (CONFIG.DEBUG_MODE) {
          console.log('📋 Using cached classification:', cached.result);
        }
        return cached.result.isOrder;
      }
    }
    
    // Ensure models are ready
    if (!modelsReady) {
      await initializeMLModels();
    }
    
    // Extract page content for classification
    const pageContent = extractPageText();
    
    // Try ML classification first
    let result;
    try {
      result = await isOrderPageML(pageContent);
    } catch (error) {
      console.warn('⚠️ ML classification unavailable, cannot proceed without ML models');
      return false;
    }
    
    // Cache the result
    classificationCache.set(url, {
      result,
      timestamp: Date.now()
    });
    
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
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (element.textContent) {
        content += element.textContent + ' ';
      }
    }
  }
  
  // Fallback to body if nothing specific found
  if (content.trim().length < 100) {
    content = document.body.textContent || '';
  }
  
  // Limit content length for ML processing
  return content.substring(0, 5000);
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
    // First check if this is an order page
    const isOrder = await isOrderPage();
    if (!isOrder) {
      console.log('⏭️ Not an order page, skipping extraction');
      return null;
    }
    
    console.log('📦 Extracting order information with ML...');
    
    // Ensure models are ready
    if (!modelsReady) {
      await initializeMLModels();
    }
    
    // Extract page content
    const pageContent = extractPageText();
    
    // Use ML extraction
    const orderInfo = await extractOrderInfoML(pageContent);
    
    if (orderInfo) {
      console.log('✅ Order extracted successfully:', orderInfo);
      return orderInfo;
    } else {
      console.warn('⚠️ No order information could be extracted');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Order extraction failed:', error);
    return null;
  }
}

/**
 * Initialize and run the main extraction process
 */
async function initializeExtraction() {
  try {
    console.log('🚀 Starting AutoComplaint ML extraction process...');
    
    // Initialize ML models
    await initializeMLModels();
    
    // Extract order information
    const extractedData = await extractOrderInfo();
    
    if (extractedData) {
      console.log('📦 Successfully extracted order data:', extractedData);
      
      // Save to chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ autoComplaintOrder: extractedData }, () => {
          if (chrome.runtime.lastError) {
            console.error('❌ Storage error:', chrome.runtime.lastError);
          } else {
            console.log('✅ Order data saved to storage');
          }
        });
      } else {
        console.log('📋 Order data extracted (no storage available):', extractedData);
      }
      
      return extractedData;
    } else {
      console.log('⚠️ No order data could be extracted from this page');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Extraction process failed:', error);
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
