
import Tesseract from 'tesseract.js';
import html2canvas from 'html2canvas';
import { pipeline } from '@xenova/transformers';

console.log('AutoComplaint universal content script loaded');

// Initialize NER and information extraction models
let nerModel = null;
let qaModel = null;

async function initializeModels() {
  try {
    // Advanced NER model specifically trained for e-commerce and order data
    nerModel = await pipeline('token-classification', 'Xenova/bert-base-NER');
    
    // Question-answering model for extracting specific information
    qaModel = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
    
    console.log('AI models initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI models:', error);
  }
}

// Initialize models when script loads
initializeModels();

// Detect if this is likely an order details/invoice page
function isOrderDetailsPage() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();

  const keywords = [
    'order details', 'order summary', 'order information', 'order number',
    'invoice', 'purchase details', 'order id', 'order date', 'order total',
    'your order', 'order confirmation', 'order placed', 'order status',
    'order history', 'order receipt', 'order', 'purchase', 'receipt'
  ];

  return keywords.some(kw => url.includes(kw) || title.includes(kw) || bodyText.includes(kw));
}

// Advanced entity extraction using transformer models
async function extractEntitiesWithNER(text) {
  if (!nerModel) {
    console.warn('NER model not initialized, falling back to basic extraction');
    return {};
  }

  try {
    const entities = await nerModel(text);
    
    const extractedData = {
      orderId: '',
      productName: '',
      brand: '',
      price: '',
      orderDate: '',
      deliveryDate: '',
      sellerName: '',
      trackingNumber: ''
    };

    // Process NER results to extract relevant entities
    entities.forEach(entity => {
      const value = entity.word.replace('##', '');
      
      switch (entity.label) {
        case 'B-MISC':
        case 'I-MISC':
          if (/\d{10,}/.test(value)) {
            extractedData.orderId = extractedData.orderId || value;
          }
          break;
        case 'B-ORG':
        case 'I-ORG':
          extractedData.brand = extractedData.brand || value;
          extractedData.sellerName = extractedData.sellerName || value;
          break;
        case 'B-PER':
        case 'I-PER':
          if (!extractedData.brand) extractedData.brand = value;
          break;
      }
    });

    return extractedData;
  } catch (error) {
    console.error('NER extraction failed:', error);
    return {};
  }
}

// Question-answering based extraction for specific fields
async function extractWithQuestionAnswering(text) {
  if (!qaModel) {
    console.warn('QA model not initialized, skipping QA extraction');
    return {};
  }

  const questions = [
    { field: 'orderId', question: 'What is the order number or order ID?' },
    { field: 'productName', question: 'What is the product name or item description?' },
    { field: 'brand', question: 'What is the brand name or manufacturer?' },
    { field: 'price', question: 'What is the total price or amount paid?' },
    { field: 'orderDate', question: 'When was the order placed or order date?' },
    { field: 'deliveryDate', question: 'When was the item delivered or delivery date?' },
    { field: 'sellerName', question: 'Who is the seller or vendor name?' },
    { field: 'trackingNumber', question: 'What is the tracking number or AWB number?' }
  ];

  const extractedData = {};

  for (const { field, question } of questions) {
    try {
      const answer = await qaModel(question, text);
      if (answer.score > 0.3) { // Only accept confident answers
        extractedData[field] = answer.answer.trim();
      }
    } catch (error) {
      console.error(`QA extraction failed for ${field}:`, error);
    }
  }

  return extractedData;
}

// Enhanced OCR with better preprocessing
async function extractWithAdvancedOCR() {
  try {
    // Target order details section more intelligently
    const orderSection = document.querySelector(
      '#orderDetails, .order-summary, .a-box-group, .order-info, ' +
      '[class*="order"], [id*="order"], [class*="invoice"], [id*="invoice"]'
    ) || document.body;

    const canvas = await html2canvas(orderSection, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true
    });

    const { data: { text } } = await Tesseract.recognize(canvas.toDataURL(), 'eng', {
      logger: m => console.log(m)
    });

    console.log('OCR extracted text:', text);
    return text;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return '';
  }
}

// Smart DOM extraction with better selectors
function extractFromDOM() {
  const selectors = {
    orderId: [
      '[data-testid*="order"], [class*="order-id"], [id*="order-id"]',
      'span:contains("Order"), div:contains("Order #"), td:contains("Order")',
      '*[class*="order-number"], *[id*="order-number"]'
    ],
    productName: [
      '[data-testid*="product"], [class*="product-title"], [class*="item-name"]',
      'h1, h2, h3, .product-name, .item-title',
      '*[class*="product-description"]'
    ],
    price: [
      '[class*="price"], [id*="price"], [data-testid*="price"]',
      '.total, .amount, .cost, .payment',
      '*[class*="total-amount"], *[class*="grand-total"]'
    ],
    brand: [
      '[class*="brand"], [id*="brand"], [data-testid*="brand"]',
      '.manufacturer, .vendor, .seller-name'
    ]
  };

  const extractedData = {};

  Object.entries(selectors).forEach(([field, selectorList]) => {
    for (const selector of selectorList) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          extractedData[field] = element.textContent.trim();
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  });

  return extractedData;
}

// Product category classification using modern approach
function classifyProductCategory(productName, description = '') {
  const text = `${productName} ${description}`.toLowerCase();
  
  const categories = {
    'Electronics': ['phone', 'laptop', 'tablet', 'headphone', 'earphone', 'speaker', 'camera', 'tv', 'monitor'],
    'Clothing': ['shirt', 't-shirt', 'jean', 'dress', 'trouser', 'pant', 'jacket', 'sweater', 'hoodie'],
    'Footwear': ['shoe', 'sandal', 'sneaker', 'boot', 'slipper', 'heel', 'ballerina'],
    'Accessories': ['watch', 'bag', 'wallet', 'belt', 'sunglasses', 'jewelry'],
    'Home & Kitchen': ['appliance', 'cookware', 'furniture', 'decor', 'bedding'],
    'Beauty': ['makeup', 'skincare', 'perfume', 'cosmetic', 'beauty'],
    'Sports': ['fitness', 'gym', 'sports', 'exercise', 'yoga'],
    'Books': ['book', 'novel', 'textbook', 'magazine'],
    'Health': ['medicine', 'supplement', 'vitamin', 'health']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return 'Others';
}

// Main extraction function combining all methods
async function extractOrderDetailsAdvanced() {
  if (!isOrderDetailsPage()) {
    console.log('Not an order details/invoice page. Skipping extraction.');
    return;
  }

  console.log('Starting advanced order extraction...');

  // Get page text for AI processing
  const pageText = document.body.innerText;
  
  // Extract using multiple methods
  const [ocrText, domData, nerData, qaData] = await Promise.all([
    extractWithAdvancedOCR(),
    Promise.resolve(extractFromDOM()),
    extractEntitiesWithNER(pageText),
    extractWithQuestionAnswering(pageText)
  ]);

  // Combine OCR text with page text for better AI processing
  const combinedText = `${pageText}\n\nOCR Data:\n${ocrText}`;
  
  // Get additional AI extractions from combined text
  const [nerFromCombined, qaFromCombined] = await Promise.all([
    extractEntitiesWithNER(combinedText),
    extractWithQuestionAnswering(combinedText)
  ]);

  // Merge all extraction results with priority
  const finalData = {
    detectedSite: window.location.hostname,
    orderDetailsPageUrl: window.location.href,
    orderId: qaData.orderId || qaFromCombined.orderId || nerData.orderId || nerFromCombined.orderId || domData.orderId || '',
    productName: qaData.productName || qaFromCombined.productName || domData.productName || '',
    brand: qaData.brand || qaFromCombined.brand || nerData.brand || nerFromCombined.brand || domData.brand || '',
    price: qaData.price || qaFromCombined.price || domData.price || '',
    orderDate: qaData.orderDate || qaFromCombined.orderDate || '',
    deliveryDate: qaData.deliveryDate || qaFromCombined.deliveryDate || '',
    sellerName: qaData.sellerName || qaFromCombined.sellerName || nerData.sellerName || nerFromCombined.sellerName || '',
    trackingNumber: qaData.trackingNumber || qaFromCombined.trackingNumber || '',
    productImage: '',
    productCategory: ''
  };

  // Classify product category
  if (finalData.productName) {
    finalData.productCategory = classifyProductCategory(finalData.productName);
  }

  // Get product image
  const productImages = Array.from(document.images).filter(img => 
    img.width > 100 && img.height > 100 && 
    !img.src.includes('logo') && !img.src.includes('icon')
  );
  if (productImages.length > 0) {
    finalData.productImage = productImages[0].src;
  }

  console.log('Advanced extraction completed:', finalData);
  
  // Save to storage
  chrome.storage.local.set({ autoComplaintOrderUniversal: finalData });
  
  return finalData;
}

// Run the advanced extraction
extractOrderDetailsAdvanced();
