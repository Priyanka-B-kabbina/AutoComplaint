console.log('AutoComplaint: Enhanced order extraction loaded');

// Detect if this is likely an order details/invoice page
function isOrderDetailsPage() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();

  const keywords = [
    'order details', 'order summary', 'order information', 'order number',
    'invoice', 'purchase details', 'order id', 'order date', 'order total',
    'your order', 'order confirmation', 'order placed', 'order status'
  ];

  return keywords.some(kw => url.includes(kw) || title.includes(kw) || bodyText.includes(kw));
}

// Get all visible text content from page
function getAllVisibleText() {
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

// Enhanced regex-based extraction patterns
function extractWithPatterns(text) {
  const patterns = {
    orderId: [
      /order\s*(?:id|number|#)\s*:?\s*([A-Z0-9\-]{10,})/gi,
      /(?:order|invoice)\s*#?\s*([0-9\-]{10,})/gi,
      /([0-9]{3}-[0-9]{7}-[0-9]{7})/g, // Amazon format
    ],
    productName: [
      /<title>([^|]+)/i,
      /product\s*name\s*:?\s*([^\n]+)/gi,
      /item\s*:?\s*([^\n]+)/gi
    ],
    price: [
      /₹\s*([0-9,]+\.?[0-9]*)/g,
      /total\s*:?\s*₹?\s*([0-9,]+\.?[0-9]*)/gi,
      /amount\s*:?\s*₹?\s*([0-9,]+\.?[0-9]*)/gi
    ],
    brand: [
      /brand\s*:?\s*([A-Za-z\s]+)/gi,
      /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
    ],
    orderDate: [
      /order\s*(?:placed|date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /placed\s*on\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/gi
    ],
    deliveryDate: [
      /delivered\s*(?:on)?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /delivery\s*date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/gi
    ]
  };

  const extracted = {};

  for (const [field, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        let value = matches[0];
        if (regex.source.includes('(')) {
          const execResult = regex.exec(text);
          if (execResult && execResult[1]) {
            value = execResult[1].trim();
          }
        }
        extracted[field] = value;
        break;
      }
    }
  }

  return extracted;
}

// Smart DOM-based extraction
function extractFromDOM() {
  const selectors = {
    orderId: [
      '[data-testid*="order"]',
      '[class*="order-id"]',
      '[id*="order"]',
      'span:contains("Order")',
      'div:contains("Order #")'
    ],
    productName: [
      'h1[data-automation-id="product-title"]',
      'h1#productTitle',
      '.product-title',
      'h1, h2, h3'
    ],
    price: [
      '.a-price-whole',
      '[class*="price"]',
      '.total-price',
      '.amount'
    ],
    brand: [
      '[data-automation-id="brand-name"]',
      '.brand',
      '.manufacturer'
    ]
  };

  const extracted = {};

  Object.entries(selectors).forEach(([field, selectorList]) => {
    for (const selector of selectorList) {
      try {
        let element;
        if (selector.includes(':contains(')) {
          // Handle pseudo-selector manually
          const text = selector.match(/:contains\("([^"]+)"\)/)?.[1];
          if (text) {
            element = Array.from(document.querySelectorAll(selector.split(':')[0]))
              .find(el => el.textContent.includes(text));
          }
        } else {
          element = document.querySelector(selector);
        }

        if (element && element.textContent.trim()) {
          extracted[field] = element.textContent.trim();
          break;
        }
      } catch (e) {
        continue;
      }
    }
  });

  return extracted;
}

// Classify product category with simple keyword matching
function classifyProductCategory(productName) {
  if (!productName) return 'Others';

  const text = productName.toLowerCase();
  const categories = {
    'Electronics': ['phone', 'laptop', 'tablet', 'headphone', 'speaker', 'camera', 'tv'],
    'Clothing': ['shirt', 't-shirt', 'dress', 'jean', 'trouser', 'jacket'],
    'Footwear': ['shoe', 'sandal', 'sneaker', 'boot'],
    'Home & Kitchen': ['appliance', 'cookware', 'furniture'],
    'Beauty': ['makeup', 'skincare', 'perfume', 'cosmetic'],
    'Books': ['book', 'novel', 'textbook']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return 'Others';
}

// Enhanced multi-source fusion with confidence scoring
function fuseDataSources(sources) {
  const fusedData = {};
  const confidenceScores = {};

  // Define confidence weights for different extraction methods
  const methodWeights = {
    dom: 0.8,        // DOM extraction - highest confidence
    pattern: 0.6,    // Pattern matching - medium confidence
    ml: 0.9,         // ML model extraction - highest confidence (when available)
    fallback: 0.3    // Fallback methods - lowest confidence
  };

  // Fusion logic for each field
  const fields = ['orderId', 'productName', 'brand', 'price', 'orderDate', 'deliveryDate', 'sellerName', 'trackingNumber'];
  
  fields.forEach(field => {
    let bestValue = '';
    let bestConfidence = 0;
    let sourceInfo = [];

    // Evaluate each source
    sources.forEach(source => {
      if (source.data[field] && source.data[field].trim()) {
        const confidence = calculateFieldConfidence(field, source.data[field], source.method);
        const weightedConfidence = confidence * methodWeights[source.method];
        
        sourceInfo.push({
          method: source.method,
          value: source.data[field],
          confidence: weightedConfidence
        });

        if (weightedConfidence > bestConfidence) {
          bestValue = source.data[field];
          bestConfidence = weightedConfidence;
        }
      }
    });

    fusedData[field] = bestValue;
    confidenceScores[field] = {
      value: bestValue,
      confidence: bestConfidence,
      sources: sourceInfo
    };
  });

  return { fusedData, confidenceScores };
}

// Calculate confidence score for a specific field and value
function calculateFieldConfidence(field, value, method) {
  let confidence = 0.5; // Base confidence

  // Field-specific confidence rules
  switch (field) {
    case 'orderId':
      if (/^[A-Z0-9\-]{10,}$/.test(value)) confidence += 0.3;
      if (value.length >= 15) confidence += 0.2;
      break;
    case 'price':
      if (/^\d+[,.]?\d*$/.test(value.replace(/[₹$]/g, ''))) confidence += 0.4;
      break;
    case 'productName':
      if (value.length > 10 && value.length < 200) confidence += 0.3;
      if (!/^\s*$/.test(value)) confidence += 0.2;
      break;
    case 'brand':
      if (/^[A-Za-z\s&]+$/.test(value) && value.length > 2) confidence += 0.3;
      break;
  }

  // Method-specific adjustments
  if (method === 'dom' && value.includes('›')) confidence -= 0.1; // Navigation breadcrumbs
  if (method === 'pattern' && value.includes(':')) confidence += 0.1; // Structured data

  return Math.min(confidence, 1.0);
}

// Main extraction function with multi-source fusion
async function extractOrderDetails() {
  if (!isOrderDetailsPage()) {
    console.log('Not an order details page. Skipping extraction.');
    return;
  }

  console.log('Starting enhanced multi-source extraction...');

  // Get page text
  const pageText = getAllVisibleText();
  const htmlContent = document.body.innerHTML;

  // Extract using multiple methods (sources)
  const sources = [
    {
      method: 'dom',
      data: extractFromDOM()
    },
    {
      method: 'pattern', 
      data: extractWithPatterns(pageText + ' ' + document.title)
    },
    {
      method: 'fallback',
      data: {
        productName: document.title.split('|')[0].trim(),
        brand: extractBrandFromMeta(),
        price: extractPriceFromMeta()
      }
    }
  ];

  // Apply multi-source fusion
  const { fusedData, confidenceScores } = fuseDataSources(sources);

  // Create final data structure
  const finalData = {
    detectedSite: window.location.hostname,
    orderDetailsPageUrl: window.location.href,
    orderId: fusedData.orderId || '',
    productName: fusedData.productName || '',
    brand: fusedData.brand || '',
    price: fusedData.price || '',
    orderDate: fusedData.orderDate || '',
    deliveryDate: fusedData.deliveryDate || '',
    sellerName: fusedData.sellerName || '',
    trackingNumber: fusedData.trackingNumber || '',
    productImage: '',
    productCategory: '',
    // Add fusion metadata
    _fusionMetadata: {
      confidenceScores: confidenceScores,
      extractionSources: sources.length,
      overallConfidence: calculateOverallConfidence(confidenceScores)
    }
  };

  // Get product image
  const productImages = Array.from(document.images).filter(img => 
    img.width > 100 && img.height > 100 && 
    !img.src.includes('logo') && !img.src.includes('icon')
  );
  if (productImages.length > 0) {
    finalData.productImage = productImages[0].src;
  }

  // Classify product
  finalData.productCategory = classifyProductCategory(finalData.productName);

  // Helper function to extract brand from meta tags
function extractBrandFromMeta() {
  const metaBrand = document.querySelector('meta[property="product:brand"]') || 
                   document.querySelector('meta[name="brand"]');
  return metaBrand ? metaBrand.getAttribute('content') : '';
}

// Helper function to extract price from meta tags
function extractPriceFromMeta() {
  const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                   document.querySelector('meta[name="price"]');
  return metaPrice ? metaPrice.getAttribute('content') : '';
}

// Calculate overall confidence score
function calculateOverallConfidence(confidenceScores) {
  const scores = Object.values(confidenceScores).map(item => item.confidence);
  const validScores = scores.filter(score => score > 0);
  
  if (validScores.length === 0) return 0;
  
  const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  return Math.round(average * 100) / 100; // Round to 2 decimal places
}

  console.log('Multi-source extraction completed:', finalData);
  console.log('Fusion metadata:', finalData._fusionMetadata);
  console.log('Saving to storage with key: autoComplaintOrderUniversal');

  // Save to storage
  try {
    chrome.storage.local.set({ autoComplaintOrderUniversal: finalData }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
      } else {
        console.log('Data successfully saved to storage');

        // Verify save by reading back
        chrome.storage.local.get(['autoComplaintOrderUniversal'], (result) => {
          console.log('Verification - data in storage:', result);
        });
      }
    });
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }

  return finalData;
}

// Run extraction when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractOrderDetails);
} else {
  extractOrderDetails();
}

// Also run when URL changes (for SPAs)
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    setTimeout(extractOrderDetails, 1000); // Delay to allow page to load
  }
});

observer.observe(document.body, { childList: true, subtree: true });