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

// Main extraction function
async function extractOrderDetails() {
  if (!isOrderDetailsPage()) {
    console.log('Not an order details page. Skipping extraction.');
    return;
  }

  console.log('Starting order extraction...');

  // Get page text
  const pageText = getAllVisibleText();
  const htmlContent = document.body.innerHTML;

  // Extract using multiple methods
  const patternData = extractWithPatterns(pageText + ' ' + document.title);
  const domData = extractFromDOM();

  // Merge results with priority to DOM data
  const finalData = {
    detectedSite: window.location.hostname,
    orderDetailsPageUrl: window.location.href,
    orderId: domData.orderId || patternData.orderId || '',
    productName: domData.productName || patternData.productName || document.title.split('|')[0].trim(),
    brand: domData.brand || patternData.brand || '',
    price: domData.price || patternData.price || '',
    orderDate: patternData.orderDate || '',
    deliveryDate: patternData.deliveryDate || '',
    sellerName: patternData.sellerName || '',
    trackingNumber: patternData.trackingNumber || '',
    productImage: '',
    productCategory: ''
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

  console.log('Extraction completed:', finalData);
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