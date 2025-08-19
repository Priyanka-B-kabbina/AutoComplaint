/**
 * AutoComplaint Extension - ML-Based Order Extraction
 * Uses trained ML models for order detection and information extraction
 */

console.log('AutoComplaint: ML-Based Order Extraction v7.0');

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
  classifier: null,
  extractor: null,
  ner: null,
  embeddings: null
};

let modelsReady = false;
const classificationCache = new Map();

/**
 * Initialize the order classifier
 */
async function initializeClassifier() {
  if (classifierReady) return orderClassifier;
  
  try {
    console.log('� Initializing Order Classifier...');
    orderClassifier = new LightweightOrderClassifier();
    
    // Try to load ML model, fallback to rules if unavailable
    const modelUrl = `${CONFIG.MODEL_SERVER_URL}/model.json`;
    await orderClassifier.loadModel(modelUrl);
    
    classifierReady = true;
    console.log('✅ Order Classifier initialized successfully');
    
    return orderClassifier;
    
  } catch (error) {
    console.warn('⚠️ Classifier initialization warning:', error.message);
    
    // Still initialize with fallback
    if (!orderClassifier) {
      orderClassifier = new LightweightOrderClassifier();
      await orderClassifier.loadModel(); // No URL = fallback mode
    }
    
    classifierReady = true;
    console.log('✅ Order Classifier initialized with fallback rules');
    
    return orderClassifier;
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
    
    // Ensure classifier is ready
    if (!classifierReady) {
      await initializeClassifier();
    }
    
    // Classify the page
    const result = await orderClassifier.classifyPage();
    
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
        method: result.method,
        details: result.pageChecks || result.details
      });
    }
    
    // Apply confidence thresholds
    const threshold = result.method === 'ml' ? CONFIG.CONFIDENCE_THRESHOLD : CONFIG.FALLBACK_THRESHOLD;
    const isOrder = result.isOrder && result.confidence >= threshold;
    
    if (isOrder) {
      console.log(`✅ Order page detected with ${(result.confidence * 100).toFixed(1)}% confidence (${result.method})`);
    }
    
    return isOrder;
    
  } catch (error) {
    console.error('❌ Order page classification failed:', error);
    
    // Ultimate fallback - simple URL/title check
    return simpleOrderPageDetection();
  }
}

/**
 * Simple fallback order page detection
 */
function simpleOrderPageDetection() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  
  const orderKeywords = ['order', 'invoice', 'receipt', 'confirmation', 'purchase', 'transaction'];
  
  for (const keyword of orderKeywords) {
    if (url.includes(keyword) || title.includes(keyword)) {
      console.log('🔧 Fallback detection: Found order keyword');
      return true;
    }
  }
  
  return false;
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
 * Extract order information from the page
 */
async function extractOrderInfo() {
  try {
    // First check if this is an order page
    const isOrder = await isOrderPage();
    if (!isOrder) {
      console.log('⏭️ Not an order page, skipping extraction');
      return null;
    }
    
    console.log('📦 Extracting order information...');
    
    // Enhanced extraction with multiple strategies
    const extractors = [
      extractAmazonOrder,
      extractGenericOrder,
      extractFromStructuredData,
      extractFromMetadata
    ];
    
    for (const extractor of extractors) {
      try {
        const orderInfo = await extractor();
        if (orderInfo && orderInfo.orderId) {
          console.log('✅ Order extracted successfully:', orderInfo);
          return orderInfo;
        }
      } catch (error) {
        console.warn(`⚠️ Extractor ${extractor.name} failed:`, error.message);
      }
    }
    
    console.warn('⚠️ No order information could be extracted');
    return null;
    
  } catch (error) {
    console.error('❌ Order extraction failed:', error);
    return null;
  }
}

/**
 * Extract Amazon-specific order information
 */
async function extractAmazonOrder() {
  try {
    console.log('🛒 Running Amazon-specific extraction...');
    
    const orderInfo = {
      orderId: '',
      orderUrl: window.location.href,
      productName: '',
      productValue: '',
      productCategory: '',
      productImage: '',
      sellerName: '',
      orderDate: '',
      deliveryDate: '',
      trackingNumber: '',
      customerDetails: {},
      extractionMethod: 'amazon-specific'
    };

    // Extract order ID from various Amazon selectors
    const orderIdSelectors = [
      '[data-test-id*="order"]',
      '.order-id',
      '#orderDetails',
      '.a-color-secondary:contains("Order")',
      'span:contains("Order #")',
      'span:contains("Order Number")'
    ];

    for (const selector of orderIdSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText;
        const match = text.match(/(?:order|#)\s*([A-Z0-9-]{5,})/i);
        if (match) {
          orderInfo.orderId = match[1];
          break;
        }
      }
    }

    // Extract product information
    const productNameSelectors = [
      '#productTitle',
      '.product-title',
      'h1[data-automation-id="product-title"]',
      '.a-size-large.product-title-word-break'
    ];

    for (const selector of productNameSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        orderInfo.productName = (element.textContent || element.innerText).trim();
        break;
      }
    }

    // Extract price
    const priceSelectors = [
      '.a-price-whole',
      '.a-color-price',
      '[data-automation-id="product-price"]',
      '.a-price.a-text-price.a-size-medium.apexPriceToPay'
    ];

    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        orderInfo.productValue = (element.textContent || element.innerText).trim();
        break;
      }
    }

    // Extract product image
    const imageSelectors = [
      '#landingImage',
      '.a-dynamic-image',
      '[data-automation-id="product-image"]'
    ];

    for (const selector of imageSelectors) {
      const element = document.querySelector(selector);
      if (element && element.src) {
        orderInfo.productImage = element.src;
        break;
      }
    }

    // Extract seller information
    const sellerSelectors = [
      '#sellerProfileTriggerId',
      '.a-color-secondary:contains("Sold by")',
      '[data-automation-id="seller-name"]'
    ];

    for (const selector of sellerSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        orderInfo.sellerName = (element.textContent || element.innerText).replace(/sold by/i, '').trim();
        break;
      }
    }

    console.log('🛒 Amazon extraction result:', orderInfo);
    return orderInfo.orderId ? orderInfo : null;

  } catch (error) {
    console.error('❌ Amazon extraction error:', error);
    return null;
  }
}

/**
 * Extract generic order information
 */
async function extractGenericOrder() {
  try {
    console.log('🔍 Running generic extraction...');
    
    const text = document.body.innerText || document.body.textContent;
    
    const orderInfo = {
      orderId: '',
      orderUrl: window.location.href,
      productName: '',
      productValue: '',
      orderDate: '',
      extractionMethod: 'generic'
    };

    // Generic order ID patterns
    const orderIdMatch = text.match(/(?:order|invoice|receipt|confirmation)?\s*(?:#|number|id)?\s*:?\s*([A-Z0-9-]{5,})/i);
    if (orderIdMatch) {
      orderInfo.orderId = orderIdMatch[1];
    }

    // Generic price patterns
    const priceMatch = text.match(/(?:total|amount|price|cost)\s*:?\s*(?:rs|inr|₹|\$|€|£)?\s*([\d,]+\.?\d*)/i);
    if (priceMatch) {
      orderInfo.productValue = priceMatch[0];
    }

    // Generic date patterns
    const dateMatch = text.match(/(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i);
    if (dateMatch) {
      orderInfo.orderDate = dateMatch[0];
    }

    // Generic product name (first heading)
    const heading = document.querySelector('h1, h2, .product-title, .item-name');
    if (heading) {
      orderInfo.productName = (heading.textContent || heading.innerText).trim();
    }

    console.log('🔍 Generic extraction result:', orderInfo);
    return orderInfo.orderId ? orderInfo : null;

  } catch (error) {
    console.error('❌ Generic extraction error:', error);
    return null;
  }
}

/**
 * Extract from structured data (JSON-LD, microdata)
 */
async function extractFromStructuredData() {
  try {
    console.log('📊 Running structured data extraction...');
    
    // Look for JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        
        // Check for Order schema
        if (data['@type'] === 'Order' || data.orderNumber) {
          return {
            orderId: data.orderNumber || data.identifier,
            orderUrl: window.location.href,
            productName: data.orderedItem?.name,
            productValue: data.orderTotal?.value,
            orderDate: data.orderDate,
            extractionMethod: 'structured-data'
          };
        }
        
        // Check for Product schema
        if (data['@type'] === 'Product') {
          return {
            productName: data.name,
            productValue: data.offers?.price,
            productImage: data.image,
            extractionMethod: 'structured-data'
          };
        }
        
      } catch (parseError) {
        console.warn('⚠️ Failed to parse JSON-LD:', parseError);
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Structured data extraction error:', error);
    return null;
  }
}

/**
 * Extract from page metadata
 */
async function extractFromMetadata() {
  try {
    console.log('🏷️ Running metadata extraction...');
    
    const orderInfo = {
      extractionMethod: 'metadata'
    };

    // Check meta tags
    const metaTags = document.querySelectorAll('meta[property], meta[name]');
    
    for (const meta of metaTags) {
      const property = meta.getAttribute('property') || meta.getAttribute('name');
      const content = meta.getAttribute('content');
      
      if (property && content) {
        if (property.includes('order') || property.includes('product')) {
          if (property.includes('title') || property.includes('name')) {
            orderInfo.productName = content;
          }
          if (property.includes('price') || property.includes('amount')) {
            orderInfo.productValue = content;
          }
          if (property.includes('image')) {
            orderInfo.productImage = content;
          }
        }
      }
    }

    return Object.keys(orderInfo).length > 1 ? orderInfo : null;
    
  } catch (error) {
    console.error('❌ Metadata extraction error:', error);
    return null;
  }
}

/**
 * Initialize and run the main extraction process
 */
async function initializeExtraction() {
  try {
    console.log('� Starting AutoComplaint extraction process...');
    
    // Initialize the classifier
    await initializeClassifier();
    
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
      console.log('� Page URL changed, re-running extraction...');
      setTimeout(initializeExtraction, 1000); // Small delay for page to load
    }
  });
  
  observer.observe(document.body, { 
    subtree: true, 
    childList: true 
  });
}

// Initialize the extension
console.log('🏁 AutoComplaint extension loaded, starting extraction...');
startExtraction();
watchForPageChanges();

// Export functions for use by other modules
export { 
  initializeExtraction, 
  extractOrderInfo, 
  isOrderPage, 
  initializeClassifier 
};

// Expose functions for testing/debugging
if (typeof window !== 'undefined') {
  window.AutoComplaint = {
    extractOrderInfo,
    isOrderPage,
    initializeClassifier,
    initializeExtraction,
    CONFIG
  };
}
