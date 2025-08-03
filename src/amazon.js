// =================== DEPRECATED: Old Extraction Logic ===================
/*
import nlp from 'compromise';
import nlpDates from 'compromise-dates';
import nlpNumbers from 'compromise-numbers';

nlp.extend(nlpDates);
nlp.extend(nlpNumbers);

// ...any other compromise-based or old extraction code...

function extractOrderDetailsWithCompromise() {
  // ...old code...
}
*/
// =================== END DEPRECATED ===================

// Only keep helpers and new NER logic below

import Tesseract from 'tesseract.js';
import html2canvas from 'html2canvas';
import * as mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs';

console.log('AutoComplaint universal content script loaded');

// Heuristic: Detect if this is likely an order details/invoice page
function isOrderDetailsPage() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();
  // Look for common order/invoice keywords
  const keywords = [
    'order details', 'order summary', 'order information', 'order number',
    'invoice', 'purchase details', 'order id', 'order date', 'order total',
    'your order', 'order confirmation', 'order placed', 'order status',
    'order history', 'order receipt', 'order', 'purchase', 'receipt'
  ];
  return keywords.some(kw => url.includes(kw) || title.includes(kw) || bodyText.includes(kw));
}

// Generic DOM-based extraction for order details
function extractOrderDetailsFromDOM() {
  const result = {
    detectedSite: window.location.hostname,
    orderDetailsPageUrl: window.location.href,
    orderId: '',
    productName: '',
    brand: '',
    productCategory: '',
    price: '',
    orderDate: '',
    deliveryDate: '',
    productImage: '',
    trackingNumber: ''
  };
  // Helper: Find text near a label
  function findValueByLabel(labels) {
    const labelRegex = new RegExp(labels.map(l => l.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|'), 'i');
    const elements = Array.from(document.querySelectorAll('body *')).filter(el => el.children.length === 0 && el.innerText && labelRegex.test(el.innerText));
    for (const el of elements) {
      // Try next sibling
      if (el.nextElementSibling && el.nextElementSibling.innerText && el.nextElementSibling.innerText.length < 100) {
        return el.nextElementSibling.innerText.trim();
      }
      // Try parent
      if (el.parentElement && el.parentElement.innerText && el.parentElement.innerText.length < 200) {
        const match = el.parentElement.innerText.match(/: ?(.{3,100})/);
        if (match) return match[1].trim();
      }
      // Try extracting from label itself
      const match = el.innerText.match(/: ?(.{3,100})/);
      if (match) return match[1].trim();
    }
    return '';
  }
  // Try to extract common fields
  result.orderId = findValueByLabel(['Order ID', 'Order Number', 'Order #', 'Order no', 'Order Ref', 'Order Reference']);
  // Also try to match "Order #12345" anywhere in the visible text
  if (!result.orderId) {
    const orderIdMatch = document.body.innerText.match(/Order\s*#(\d+)/i);
    if (orderIdMatch) result.orderId = orderIdMatch[1];
  }
  result.productName = findValueByLabel(['Product', 'Item', 'Product Name', 'Item Name', 'Description']);
  result.price = findValueByLabel(['Total', 'Order Total', 'Amount', 'Price', 'Grand Total', 'Paid', 'Subtotal']);
  result.orderDate = findValueByLabel(['Order Date', 'Date of Order', 'Placed on', 'Ordered on', 'Purchase Date']);
  result.deliveryDate = findValueByLabel(['Delivery Date', 'Delivered on', 'Arriving', 'Expected delivery']);
  result.trackingNumber = findValueByLabel(['Tracking Number', 'Tracking ID', 'AWB', 'Shipment Number']);
  // Brand and category: try to guess from product name
  if (result.productName) {
    result.brand = result.productName.split(' ')[0];
    const nameLower = result.productName.toLowerCase();
    if (nameLower.includes('earbud')) result.productCategory = 'Earbuds';
    else if (nameLower.includes('phone')) result.productCategory = 'Phone';
    else if (nameLower.includes('laptop')) result.productCategory = 'Laptop';
    else if (nameLower.includes('watch')) result.productCategory = 'Watch';
    else if (nameLower.includes('headphone')) result.productCategory = 'Headphones';
    else if (nameLower.includes('shoe')) result.productCategory = 'Shoes';
    else if (nameLower.includes('bag')) result.productCategory = 'Bag';
    else if (nameLower.includes('shirt')) result.productCategory = 'Shirt';
    else if (nameLower.includes('jean')) result.productCategory = 'Jeans';
    else if (nameLower.includes('t-shirt')) result.productCategory = 'T-shirt';
  }
  // Product image: first large image on page
  const imgs = Array.from(document.images).filter(img => img.width > 100 && img.height > 100);
  if (imgs.length > 0) result.productImage = imgs[0].src;
  return result;
}
  

// OCR extraction for order details (robust, generic, cleaned up)
async function extractOrderDetailsWithOCR() {
  // Try to target the main order details section for Amazon
  let ocrTarget = document.body;
  let section = null;
  // Try common Amazon order details selectors
  section = document.querySelector('#orderDetails, .order-summary, .a-box-group, .yohtmlc-order-details, .order-info, .order-summary-box');
  if (!section) {
    // Try a large visible box with lots of text
    const candidates = Array.from(document.querySelectorAll('div, section')).filter(el => el.innerText && el.innerText.length > 100 && el.offsetParent !== null);
    if (candidates.length > 0) {
      section = candidates.sort((a, b) => b.innerText.length - a.innerText.length)[0];
    }
  }
  if (section) {
    ocrTarget = section;
    console.log('Using specific order details section for OCR:', ocrTarget);
  } else {
    console.log('Falling back to document.body for OCR');
  }

  const canvas = await html2canvas(ocrTarget);
  const dataUrl = canvas.toDataURL('image/png');
  const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');

  // Debug: Log the raw OCR output
  console.log('OCR raw text:', text);

  // Split and clean lines (robust, minimal filtering)
  let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log('OCR cleaned lines:', lines);

  // --- Order ID ---
  let orderId = '';
  for (const line of lines) {
    const match = line.match(/Order\s*[#:]?\s*([\d-]+)/i);
    if (match) {
      orderId = match[1].replace(/\s+/g, ''); // Remove spaces
      break;
    }
  }

  // --- Product Name ---
  let productName = '';
  for (const line of lines) {
    // Skip lines that look like price, code, or thank you
    if (
      /\d{4,}/.test(line) || // long numbers (likely codes)
      /\b(thank you|subtotal|shipping|total|tax|amount|price|free|order|invoice|date|window|feedback|return|track|package|cart|account|summary|payment|method|support|handed|resident|item|grand|balance|number|id|reference|details|placed|hello|search|gift|cards|kindle|ebooks|prime|music|live)\b/i.test(line) ||
      /\d{1,2} [A-Za-z]+ \d{4}/.test(line) // date
    ) {
      continue;
    }
    // Looks like a product name: contains at least 2 words, mostly alphabetic
    if (line.split(' ').length >= 2 && /[a-zA-Z]{3,}/.test(line)) {
      productName = line;
      break;
    }
  }

  // --- Brand ---
  let brand = '';
  if (productName) brand = productName.split(' ')[0];

  // --- Price ---
  let price = '';
  for (const line of lines) {
    const match = line.match(/(₹|\$|¥|INR)?[\s]*[\d,.]{3,}/);
    if (match) {
      price = match[0].replace(/\s+/g, '');
      // Add currency if missing
      if (!/₹|\$|¥|INR/.test(price) && /₹|\$|¥|INR/.test(line)) {
        price = (line.match(/₹|\$|¥|INR/) || [''])[0] + price;
      }
      break;
    }
  }

  // --- Tracking Number ---
  let trackingNumber = '';
  for (let i = 0; i < lines.length - 1; i++) {
    if (/tracking number|tracking id|awb|shipment number/i.test(lines[i])) {
      const candidate = lines[i + 1].replace(/\D/g, '');
      if (candidate.length >= 8) {
        trackingNumber = lines[i + 1];
        break;
      }
    }
  }

  // --- Dates (Order/Delivery) ---
  let orderDate = '';
  let deliveryDate = '';
  for (const line of lines) {
    // Match date patterns like '15 June 2025' or '16 June'
    const dateMatch = line.match(/\b(\d{1,2} [A-Za-z]+( \d{4})?)\b/);
    if (dateMatch) {
      if (!orderDate) orderDate = dateMatch[0];
      else if (!deliveryDate) deliveryDate = dateMatch[0];
    }
  }

  // --- Product Category ---
  let productCategory = '';
  if (productName) {
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('earbud')) productCategory = 'Earbuds';
    else if (nameLower.includes('phone')) productCategory = 'Phone';
    else if (nameLower.includes('laptop')) productCategory = 'Laptop';
    else if (nameLower.includes('watch')) productCategory = 'Watch';
    else if (nameLower.includes('headphone')) productCategory = 'Headphones';
    else if (nameLower.includes('shoe')) productCategory = 'Shoes';
    else if (nameLower.includes('bag')) productCategory = 'Bag';
    else if (nameLower.includes('shirt')) productCategory = 'Shirt';
    else if (nameLower.includes('jean')) productCategory = 'Jeans';
    else if (nameLower.includes('t-shirt')) productCategory = 'T-shirt';
    else if (nameLower.includes('ballerina')) productCategory = 'Ballerinas';
  }

  // --- Seller Name ---
  let sellerName = '';
  // Not available in this sample, but could add logic for future cases

  return {
    detectedSite: window.location.hostname,
    orderDetailsPageUrl: window.location.href,
    orderId,
    productName,
    brand,
    productCategory,
    price,
    orderDate,
    deliveryDate,
    productImage: '', // Not available from OCR
    sellerName,
    trackingNumber
  };
}

// Main universal extraction logic: OCR first, then fill missing fields from DOM
async function extractOrderDetailsUniversal() {
  if (!isOrderDetailsPage()) {
    console.log('Not an order details/invoice page. Skipping extraction.');
    return;
  }

  // 1. Extract with OCR
  let ocrData = await extractOrderDetailsWithOCR();
  // 2. Extract with DOM
  let domData = extractOrderDetailsFromDOM();

  // 3. Fallback: fill missing fields from DOM
  let finalData = { ...ocrData };
  Object.keys(domData).forEach(key => {
    if (!finalData[key] || finalData[key].trim() === '') {
      finalData[key] = domData[key];
      if (domData[key]) {
        console.log(`[Fallback] Filled "${key}" from DOM:`, domData[key]);
      }
    }
  });

  // 4. Save and log
  console.log('AutoComplaint extracted order data (OCR primary, DOM fallback):', finalData);
  chrome.storage.local.set({ autoComplaintOrderUniversal: finalData });
}

// Run the universal extraction
extractOrderDetailsUniversal();

// =================== DEPRECATED: Old DOM-based Extraction Logic ===================
// The following functions are kept for reference but are not used. Use only the compromise-based NER logic below.
/*
function getVisibleElements(root = document.body) {
  // Recursively collect all visible elements
  let elements = [];
  function traverse(node) {
    if (node.nodeType !== 1) return; // element only
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
    elements.push(node);
    for (const child of node.children) traverse(child);
  }
  traverse(root);
  return elements;
}

function getLargestImage(elements) {
  let maxArea = 0, bestImg = null;
  for (const el of elements) {
    if (el.tagName === 'IMG' && el.src && el.width * el.height > maxArea) {
      maxArea = el.width * el.height;
      bestImg = el;
    }
  }
  return bestImg;
}

function getBoldestText(elements) {
  let best = {el: null, weight: 0, size: 0, text: ''};
  for (const el of elements) {
    if (el.children.length > 0) continue; // skip containers
    const text = el.innerText?.trim();
    if (!text || text.length < 3) continue;
    const style = window.getComputedStyle(el);
    const weight = parseInt(style.fontWeight) || (style.fontWeight === 'bold' ? 700 : 400);
    const size = parseFloat(style.fontSize);
    // Prefer bold, large, and not all uppercase
    if ((weight > best.weight) || (weight === best.weight && size > best.size)) {
      best = {el, weight, size, text};
    }
  }
  return best.text;
}

function getFirstPrice(elements) {
  for (const el of elements) {
    const text = el.innerText?.trim();
    if (text && text.match(/₹[\d,]+/)) {
      return text.match(/₹[\d,]+/)[0];
    }
  }
  return '';
}

function getFirstMatch(regex, text) {
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractPrintSummaryDetails() {
  // ... old code ...
}

function extractDynamicDetails() {
  // ... old code ...
}

function extractOrderDetails() {
  if (window.location.href.includes('/gp/legacy/css/summary/print.html')) {
    // Use print summary extraction
    return extractPrintSummaryDetails();
  } else {
    // Use dynamic extraction for other pages
    return extractDynamicDetails();
  }
}
*/
// =================== END DEPRECATED ===================

// Compromise-based NER extraction for order details
function extractOrderDetailsWithCompromise() {
  const text = getAllVisibleText();
  //const doc = nlp(text);

  // Dates
  const dates = doc.dates().out('array');

  // Numbers (could be order IDs, prices, etc.)
  const numbers = doc.numbers().out('array');

  // Organizations (brands, sellers) - fallback to regex or other logic since plugin does not exist
  // const orgs = doc.organizations().out('array');
  // Instead, try to extract organizations using regex or context if needed
  const orgs = [];
  
  // Price
  const price = text.match(/₹[\d,]+/g)?.[0];

  // Order ID
  const orderId = text.match(/Order\s*(ID|Number|#)[:\s]*([\d-]+)/i)?.[2];

  // Product Name (longest TitleCase phrase)
  const productName = doc.match('#TitleCase+').out('array').sort((a, b) => b.length - a.length)[0];

  // Brand
  let brand = '';
  // Try to find "Brand: ..." in text
  const brandMatch = text.match(/Brand[:\s]+([^\n]+)/i);
  if (brandMatch) brand = brandMatch[1].split(' ')[0].trim();
  // else if (orgs.length > 0) brand = orgs[0];
  else if (productName) brand = productName.split(' ')[0];

  // Product Category (simple keyword matching)
  let productCategory = '';
  if (productName) {
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('earbud')) productCategory = 'Earbuds';
    else if (nameLower.includes('phone')) productCategory = 'Phone';
    else if (nameLower.includes('laptop')) productCategory = 'Laptop';
    else if (nameLower.includes('shoe')) productCategory = 'Shoes';
    else if (nameLower.includes('watch')) productCategory = 'Watch';
    // Add more categories as needed
  }

  // Log or use the extracted info
  const compromiseOrderData = {
    orderId,
    productName,
    brand,
    productCategory,
    price,
    dates,
    sellerName: ''
  };
  console.log('AutoComplaint compromise NER order data:', compromiseOrderData);
  // Optionally, store or use this data as needed
  chrome.storage.local.set({ autoComplaintOrderCompromise: compromiseOrderData });
}


// Only run on relevant Amazon order pages
if (
  window.location.href.includes('/gp/your-account/order-details') ||
  window.location.href.includes('/gp/legacy/css/summary/print.html')
) {
  const text = getAllVisibleText();
  // runNER(text); // (NER logic removed)
  // Only OCR logic remains
}

// Example: OCR on an image element
// Tesseract.recognize(
//   imageElement, // or a base64 string, or a URL
//   'eng'
// ).then(({ data: { text } }) => {
//   console.log('OCR result:', text);
//   // Post-process text to extract fields
// });

function populateForm() {
  chrome.storage.local.get(['autoComplaintOrderOCR', 'autoComplaintOrderNER', 'autoComplaintOrderCompromise', 'autoComplaintOrder'], (result) => {
    let data = result.autoComplaintOrderOCR || result.autoComplaintOrderNER || result.autoComplaintOrderCompromise || result.autoComplaintOrder;
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        const input = document.getElementById(key);
        if (input) input.value = value || '';
      });
    }
  });
}

// Poll for data every second, up to 5 times
let attempts = 0;
const maxAttempts = 5;
const interval = setInterval(() => {
  populateForm();
  attempts++;
  if (attempts >= maxAttempts) clearInterval(interval);
}, 1000);

// Debug: Print all elements containing "Sold by" or "Track package"
Array.from(document.querySelectorAll('span, div, td, a')).forEach(el => {
  if (/sold by|track package/i.test(el.textContent)) {
    console.log('DEBUG: Element with text:', el.textContent, 'HTML:', el.outerHTML);
  }
});

// Debug: Print all possible seller profile links
Array.from(document.querySelectorAll('a')).forEach(a => {
  if (/\/sp\?|\/gp\/aag\/main/.test(a.href)) {
    console.log('DEBUG: Possible seller link:', a.textContent, a.href);
  }
});

async function classifyProductImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = async () => {
      try {
        const model = await mobilenet.load();
        const predictions = await model.classify(img);
        resolve(predictions[0]?.className || '');
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
  });
}

function mapLabelToCategory(label) {
  if (/shoe/i.test(label)) return 'Shoes';
  if (/laptop/i.test(label)) return 'Laptop';
  if (/phone|cellular/i.test(label)) return 'Phone';
  if (/headphone/i.test(label)) return 'Headphones';
  if (/bag/i.test(label)) return 'Bag';
  if (/shirt/i.test(label)) return 'Shirt';
  if (/jean/i.test(label)) return 'Jeans';
  if (/t-shirt/i.test(label)) return 'T-shirt';
  if (/watch/i.test(label)) return 'Watch';
  if (/earbud/i.test(label)) return 'Earbuds';
  if (/ballerina/i.test(label)) return 'Ballerinas';
  return label;
}

