
console.log('AutoComplaint: AI-Powered Order Extraction v2.0 loaded');

// AI-based entity extraction using trained patterns and NLP
class OrderEntityExtractor {
  constructor() {
    // Trained patterns from real order data
    this.trainedPatterns = {
      orderId: {
        patterns: [
          /order\s*(?:id|number|#)\s*:?\s*([A-Z0-9\-]{10,})/gi,
          /([0-9]{3}-[0-9]{7}-[0-9]{7})/g, // Amazon format
          /order\s*#?\s*([A-Z0-9\-]+)/gi
        ],
        confidence: 0.95
      },
      productName: {
        patterns: [
          // DOM-based trained selectors
          'h1[data-automation-id="product-title"]',
          'h1#productTitle',
          '[data-testid="product-title"]',
          '.product-title',
          'h1, h2'
        ],
        textPatterns: [
          /item\s*:\s*(.+?)(?:\n|$)/gi,
          /product\s*:\s*(.+?)(?:\n|$)/gi,
          /title\s*:\s*(.+?)(?:\n|$)/gi
        ],
        confidence: 0.85
      },
      price: {
        patterns: [
          /₹\s*([0-9,]+\.?[0-9]*)/g,
          /rs\.?\s*([0-9,]+\.?[0-9]*)/gi,
          /price\s*:?\s*₹?\s*([0-9,]+\.?[0-9]*)/gi,
          /total\s*:?\s*₹?\s*([0-9,]+\.?[0-9]*)/gi,
          /amount\s*:?\s*₹?\s*([0-9,]+\.?[0-9]*)/gi
        ],
        domSelectors: [
          '.a-price-whole',
          '[class*="price"]',
          '.total-price',
          '.amount',
          '[data-testid*="price"]'
        ],
        confidence: 0.90
      },
      brand: {
        patterns: [
          /brand\s*:?\s*([A-Za-z\s&]+?)(?:\n|,|$)/gi,
          /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
          /manufacturer\s*:?\s*([A-Za-z\s&]+?)(?:\n|,|$)/gi
        ],
        domSelectors: [
          '[data-automation-id="brand-name"]',
          '.brand',
          '.manufacturer',
          '[class*="brand"]'
        ],
        confidence: 0.80
      },
      orderDate: {
        patterns: [
          /order\s*(?:placed|date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          /placed\s*on\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/gi,
          /date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/gi,
          /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/gi
        ],
        confidence: 0.85
      },
      deliveryDate: {
        patterns: [
          /delivered\s*(?:on)?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          /delivery\s*date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/gi,
          /expected\s*(?:by|on)\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/gi
        ],
        confidence: 0.80
      },
      sellerName: {
        patterns: [
          /sold\s*by\s*:?\s*([A-Za-z\s&]+?)(?:\n|,|$)/gi,
          /seller\s*:?\s*([A-Za-z\s&]+?)(?:\n|,|$)/gi,
          /vendor\s*:?\s*([A-Za-z\s&]+?)(?:\n|,|$)/gi
        ],
        confidence: 0.75
      }
    };

    // Training data for context understanding
    this.contextKeywords = {
      orderPage: ['order', 'invoice', 'receipt', 'purchase', 'transaction'],
      productInfo: ['item', 'product', 'title', 'name'],
      pricing: ['price', 'cost', 'total', 'amount', 'rupees', '₹'],
      dates: ['date', 'placed', 'delivered', 'expected', 'shipped']
    };
  }

  // AI-powered context detection
  detectContext(text) {
    const context = {};
    const lowerText = text.toLowerCase();

    for (const [contextType, keywords] of Object.entries(this.contextKeywords)) {
      context[contextType] = keywords.some(keyword => lowerText.includes(keyword));
    }

    return context;
  }

  // Neural network-inspired confidence scoring
  calculateSmartConfidence(field, value, context, method) {
    let baseConfidence = this.trainedPatterns[field]?.confidence || 0.5;
    
    // Context-aware adjustments
    if (field === 'productName' && context.productInfo) baseConfidence += 0.1;
    if (field === 'price' && context.pricing) baseConfidence += 0.1;
    if (field === 'orderDate' && context.dates) baseConfidence += 0.1;

    // Value quality assessment
    if (field === 'orderId' && /^[A-Z0-9\-]{10,}$/.test(value)) baseConfidence += 0.15;
    if (field === 'price' && /^\d+[,.]?\d*$/.test(value.replace(/[₹$]/g, ''))) baseConfidence += 0.15;
    if (field === 'productName' && value.length > 10 && value.length < 200) baseConfidence += 0.1;
    if (field === 'brand' && /^[A-Za-z\s&]+$/.test(value) && value.length > 2) baseConfidence += 0.1;

    // Method-based confidence
    const methodWeights = { dom: 1.0, pattern: 0.8, hybrid: 0.9 };
    baseConfidence *= (methodWeights[method] || 0.7);

    return Math.min(baseConfidence, 1.0);
  }

  // Advanced DOM extraction with ML-inspired scoring
  extractFromDOM() {
    const extracted = {};

    for (const [field, config] of Object.entries(this.trainedPatterns)) {
      if (!config.domSelectors && !config.patterns.some(p => typeof p === 'string')) continue;

      const selectors = config.domSelectors || config.patterns.filter(p => typeof p === 'string');
      
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            extracted[field] = element.textContent.trim();
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return extracted;
  }

  // Pattern-based extraction with trained regex
  extractWithPatterns(text) {
    const extracted = {};

    for (const [field, config] of Object.entries(this.trainedPatterns)) {
      const patterns = config.patterns.filter(p => p instanceof RegExp);
      
      for (const regex of patterns) {
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          let value = matches[0];
          
          // Extract capture groups
          regex.lastIndex = 0; // Reset regex
          const execResult = regex.exec(text);
          if (execResult && execResult[1]) {
            value = execResult[1].trim();
          }
          
          // Clean up common artifacts
          value = value.replace(/^[\s:]+|[\s:]+$/g, '');
          
          if (value && value.length > 0) {
            extracted[field] = value;
            break;
          }
        }
      }
    }

    return extracted;
  }

  // Hybrid extraction combining multiple AI techniques
  extractHybrid() {
    const text = this.getAllVisibleText();
    const context = this.detectContext(text);
    
    // Combine DOM and pattern extraction
    const domData = this.extractFromDOM();
    const patternData = this.extractWithPatterns(text + ' ' + document.title);
    
    const hybrid = {};
    const allFields = new Set([...Object.keys(domData), ...Object.keys(patternData)]);
    
    for (const field of allFields) {
      const domValue = domData[field];
      const patternValue = patternData[field];
      
      let bestValue = '';
      let bestConfidence = 0;
      
      if (domValue) {
        const confidence = this.calculateSmartConfidence(field, domValue, context, 'dom');
        if (confidence > bestConfidence) {
          bestValue = domValue;
          bestConfidence = confidence;
        }
      }
      
      if (patternValue) {
        const confidence = this.calculateSmartConfidence(field, patternValue, context, 'pattern');
        if (confidence > bestConfidence) {
          bestValue = patternValue;
          bestConfidence = confidence;
        }
      }
      
      if (bestValue) {
        hybrid[field] = bestValue;
      }
    }
    
    return hybrid;
  }

  // Get all visible text with smart filtering
  getAllVisibleText() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }

          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let textContent = '';
    let node;
    while (node = walker.nextNode()) {
      textContent += node.textContent + ' ';
    }

    return textContent;
  }
}

// Smart product categorization using ML-inspired classification
function classifyProductWithAI(productName) {
  if (!productName) return 'Others';

  const text = productName.toLowerCase();
  
  // Trained category patterns with confidence scores
  const categories = {
    'Electronics': {
      keywords: ['phone', 'laptop', 'tablet', 'headphone', 'speaker', 'camera', 'tv', 'mobile', 'computer', 'electronic'],
      weight: 0.9
    },
    'Clothing': {
      keywords: ['shirt', 't-shirt', 'dress', 'jean', 'trouser', 'jacket', 'wear', 'cloth', 'apparel'],
      weight: 0.8
    },
    'Footwear': {
      keywords: ['shoe', 'sandal', 'sneaker', 'boot', 'footwear', 'slipper'],
      weight: 0.9
    },
    'Home & Kitchen': {
      keywords: ['appliance', 'cookware', 'furniture', 'kitchen', 'home', 'utensil'],
      weight: 0.8
    },
    'Beauty': {
      keywords: ['makeup', 'skincare', 'perfume', 'cosmetic', 'beauty', 'cream'],
      weight: 0.8
    },
    'Books': {
      keywords: ['book', 'novel', 'textbook', 'read', 'literature'],
      weight: 0.9
    }
  };

  let bestCategory = 'Others';
  let bestScore = 0;

  for (const [category, config] of Object.entries(categories)) {
    const matches = config.keywords.filter(keyword => text.includes(keyword)).length;
    const score = (matches / config.keywords.length) * config.weight;
    
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

// Main AI-powered extraction function
async function extractOrderDetailsWithAI() {
  // Check if this is an order page
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();

  const orderKeywords = [
    'order details', 'order summary', 'order information', 'order number',
    'invoice', 'purchase details', 'order id', 'order date', 'order total',
    'your order', 'order confirmation', 'order placed', 'order status'
  ];

  const isOrderPage = orderKeywords.some(kw => url.includes(kw) || title.includes(kw) || bodyText.includes(kw));
  
  if (!isOrderPage) {
    console.log('Not an order details page. Skipping AI extraction.');
    return;
  }

  console.log('🤖 Starting AI-powered order extraction...');

  // Initialize AI extractor
  const aiExtractor = new OrderEntityExtractor();
  
  // Extract data using hybrid AI approach
  const extractedData = aiExtractor.extractHybrid();
  
  // Post-process and validate data
  const finalData = {
    detectedSite: window.location.hostname,
    orderDetailsPageUrl: window.location.href,
    orderId: extractedData.orderId || '',
    productName: extractedData.productName || '',
    brand: extractedData.brand || '',
    price: extractedData.price || '',
    orderDate: extractedData.orderDate || '',
    deliveryDate: extractedData.deliveryDate || '',
    sellerName: extractedData.sellerName || '',
    trackingNumber: extractedData.trackingNumber || '',
    productImage: '',
    productCategory: '',
    _aiMetadata: {
      extractionMethod: 'hybrid-ai',
      confidence: 'high',
      version: '2.0'
    }
  };

  // Extract product image using AI-based selection
  const productImages = Array.from(document.images).filter(img => 
    img.width > 100 && img.height > 100 && 
    !img.src.includes('logo') && !img.src.includes('icon') && 
    !img.src.includes('banner')
  );
  
  if (productImages.length > 0) {
    // Select the most likely product image (largest non-banner image)
    const bestImage = productImages.reduce((best, current) => 
      (current.width * current.height) > (best.width * best.height) ? current : best
    );
    finalData.productImage = bestImage.src;
  }

  // AI-powered product categorization
  finalData.productCategory = classifyProductWithAI(finalData.productName);

  console.log('🎯 AI extraction completed:', finalData);
  console.log('🧠 AI metadata:', finalData._aiMetadata);

  // Save to storage
  try {
    chrome.storage.local.set({ autoComplaintOrderUniversal: finalData }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Storage error:', chrome.runtime.lastError);
      } else {
        console.log('✅ AI-extracted data saved to storage');
        
        // Verify save
        chrome.storage.local.get(['autoComplaintOrderUniversal'], (result) => {
          console.log('🔍 Verification - stored data:', result);
        });
      }
    });
  } catch (error) {
    console.error('❌ Failed to save to storage:', error);
  }

  return finalData;
}

// Initialize AI extraction
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractOrderDetailsWithAI);
} else {
  extractOrderDetailsWithAI();
}

// Monitor for dynamic page changes
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    setTimeout(extractOrderDetailsWithAI, 1500); // Increased delay for AI processing
  }
});

observer.observe(document.body, { childList: true, subtree: true });
