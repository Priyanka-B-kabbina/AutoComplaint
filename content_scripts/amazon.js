// DEPRECATED: This file is no longer used. All logic is now in src/amazon.js and bundled via Webpack.
// The code below is kept for reference only. Do not edit or use.

// Amazon Order Data Extraction Content Script
/*
console.log('AutoComplaint content script loaded');

import nlp from 'compromise';
import nlpDates from 'compromise-dates';

nlp.extend(nlpDates);

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
  // Order ID
  let orderId = '';
  const orderIdLabel = Array.from(document.querySelectorAll('b')).find(b => /Order (Number|#)/i.test(b.textContent));
  if (orderIdLabel) {
    orderId = orderIdLabel.textContent.match(/Order (?:Number|#)\s*([\d-]+)/i)?.[1] || '';
  }

  // Order Date
  let orderDate = '';
  const orderDateLabel = Array.from(document.querySelectorAll('b')).find(b => /Order Placed/i.test(b.textContent));
  if (orderDateLabel) {
    orderDate = orderDateLabel.parentElement?.nextElementSibling?.textContent.trim() || '';
  }

  // Product Name (from 'Items Ordered')
  let productName = '';
  const itemsOrderedLabel = Array.from(document.querySelectorAll('b')).find(b => /Items Ordered/i.test(b.textContent));
  if (itemsOrderedLabel) {
    // Usually the next <b> or <a> in the same row or next row
    let candidate = itemsOrderedLabel.closest('tr')?.nextElementSibling?.querySelector('b, a');
    if (!candidate) {
      // Try within the same row
      candidate = itemsOrderedLabel.parentElement?.querySelector('a, b');
    }
    if (candidate) productName = candidate.textContent.trim();
  }

  // Price (from the same row as product or 'Order Total')
  let price = '';
  const priceCell = Array.from(document.querySelectorAll('td')).find(td => /₹[\d,]+/.test(td.textContent));
  if (priceCell) price = priceCell.textContent.match(/₹[\d,]+/)[0];

  // Seller Name (from 'Sold by')
  let sellerName = '';
  const soldByLabel = Array.from(document.querySelectorAll('td')).find(td => /Sold by/i.test(td.textContent));
  if (soldByLabel) {
    sellerName = soldByLabel.nextElementSibling?.textContent.trim() || '';
  }

  // Product Image (if present in the items ordered row)
  let productImage = '';
  if (itemsOrderedLabel) {
    const img = itemsOrderedLabel.closest('tr')?.nextElementSibling?.querySelector('img');
    if (img) productImage = img.src;
  }

  // Delivery Date (if present)
  let deliveryDate = '';
  const deliveryLabel = Array.from(document.querySelectorAll('td')).find(td => /Delivery Date/i.test(td.textContent));
  if (deliveryLabel) {
    deliveryDate = deliveryLabel.nextElementSibling?.textContent.trim() || '';
  }

  // Brand: first word of product name
  const brand = productName ? productName.split(' ')[0] : '';
  // Product Category: guess from product name
  let productCategory = '';
  if (productName.toLowerCase().includes('earbud')) productCategory = 'Earbuds';
  else if (productName.toLowerCase().includes('phone')) productCategory = 'Phone';
  else if (productName.toLowerCase().includes('laptop')) productCategory = 'Laptop';

  return {
    orderId,
    productName,
    brand,
    productCategory,
    price,
    orderDate,
    deliveryDate,
    sellerName,
    productImage
  };
}

function extractDynamicDetails() {
  // Use only the main content area (exclude header/footer/nav/aside)
  let main = document.querySelector('main') || document.body;
  // Remove header/footer/aside/nav from main
  for (const sel of ['header','footer','aside','nav']) {
    for (const el of main.querySelectorAll(sel)) el.remove();
  }
  const elements = getVisibleElements(main);

  // Product Image: largest visible image
  const productImgEl = getLargestImage(elements);
  const productImage = productImgEl ? productImgEl.src : '';

  // Product Name: boldest/largest visible text
  const productName = getBoldestText(elements);

  // Price: first ₹-prefixed value
  const price = getFirstPrice(elements);

  // Order ID, Order Date, Delivery Date: regex from visible text
  const allText = elements.map(el => el.innerText).join('\n');
  const orderId = getFirstMatch(/Order number[\s:]*([\d-]+)/i, allText) ||
                  getFirstMatch(/Order #[\s:]*([\d-]+)/i, allText) ||
                  getFirstMatch(/Order ID[\s:]*([\d-]+)/i, allText);
  let orderDate = getFirstMatch(/Order placed[\s:]*([\dA-Za-z ,]+)/i, allText) ||
                  getFirstMatch(/Ordered on[\s:]*([\dA-Za-z ,]+)/i, allText);
  if (orderDate) orderDate = orderDate.split(/Order number|Order ID|\n|\r/)[0].trim();
  let deliveryDate = getFirstMatch(/Delivered[\s:]*([\dA-Za-z ,]+)/i, allText) ||
                     getFirstMatch(/Arriving[\s:]*([\dA-Za-z ,]+)/i, allText) ||
                     getFirstMatch(/Expected delivery[\s:]*([\dA-Za-z ,]+)/i, allText);
  if (deliveryDate) deliveryDate = deliveryDate.split(/Order number|Order ID|\n|\r/)[0].trim();

  // Brand: first word of product name
  const brand = productName ? productName.split(' ')[0] : '';
  // Product Category: guess from product name
  let productCategory = '';
  if (productName.toLowerCase().includes('earbud')) productCategory = 'Earbuds';
  else if (productName.toLowerCase().includes('phone')) productCategory = 'Phone';
  else if (productName.toLowerCase().includes('laptop')) productCategory = 'Laptop';

  // Seller Name: look for text near 'Sold by' or 'Seller' in allText
  let sellerName = '';
  const sellerMatch = allText.match(/Sold by\s*([\w\s,&]+)/i) || allText.match(/Seller\s*([\w\s,&]+)/i);
  if (sellerMatch) sellerName = sellerMatch[1].trim();

  // Debug logs
  console.log('AutoComplaint: productName candidate:', productName);
  console.log('AutoComplaint: productImage candidate:', productImage);
  console.log('AutoComplaint: price candidate:', price);
  console.log('AutoComplaint: orderId candidate:', orderId);
  console.log('AutoComplaint: orderDate candidate:', orderDate);
  console.log('AutoComplaint: deliveryDate candidate:', deliveryDate);
  console.log('AutoComplaint: sellerName candidate:', sellerName);

  return {
    orderId,
    orderDate,
    price,
    deliveryDate,
    productName,
    brand,
    productCategory,
    sellerName,
    productImage
  };
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

// Compromise-based NER extraction for order details
function getAllVisibleText() {
  return Array.from(document.querySelectorAll('body *'))
    .filter(el => el.offsetParent !== null && el.innerText)
    .map(el => el.innerText.trim())
    .filter(Boolean)
    .join('\n');
}

function extractOrderDetailsWithCompromise() {
  if (typeof window.nlp !== 'function') {
    setTimeout(extractOrderDetailsWithCompromise, 100);
    return;
  }

  const text = getAllVisibleText();
  const doc = window.nlp(text);

  console.log('Compromise version:', nlp.version);
  console.log('Doc object:', doc);
  console.log('Doc.dates:', typeof doc.dates);

  // Dates
  const dates = doc.dates().out('array');

  // Numbers (could be order IDs, prices, etc.)
  const numbers = doc.numbers().out('array');

  // Organizations (brands, sellers)
  const orgs = doc.organizations().out('array');

  // Price
  const price = text.match(/₹[\d,]+/g)?.[0];

  // Order ID
  const orderId = text.match(/Order\s*(ID|Number|#)[:\s]*([\d-]+)/i)?.[2];

  // Product Name (longest TitleCase phrase)
  const productName = doc.match('#TitleCase+').out('array').sort((a, b) => b.length - a.length)[0];

  // Seller Name (look for orgs near "Sold by")
  let sellerName = '';
  const soldByMatch = text.match(/Sold by\s*([^\n]+)/i);
  if (soldByMatch) sellerName = soldByMatch[1].trim();
  else if (orgs.length > 0) sellerName = orgs[0];

  // Brand
  let brand = '';
  // Try to find "Brand: ..." in text
  const brandMatch = text.match(/Brand[:\s]+([^\n]+)/i);
  if (brandMatch) brand = brandMatch[1].split(' ')[0].trim();
  else if (orgs.length > 0) brand = orgs[0];
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
    sellerName
  };
  console.log('AutoComplaint compromise NER order data:', compromiseOrderData);
  // Optionally, store or use this data as needed
  chrome.storage.local.set({ autoComplaintOrderCompromise: compromiseOrderData });
}

if (window.location.href.includes('/gp/your-account/order-details') || window.location.href.includes('/gp/legacy/css/summary/print.html')) {
  const orderData = extractOrderDetails();
  console.log('AutoComplaint extracted order data:', orderData);
  chrome.storage.local.set({ autoComplaintOrder: orderData });
}

// Run compromise-based extraction after page load
extractOrderDetailsWithCompromise();

const doc = nlp('I ordered on 15 June 2025 and it was delivered on 16 June.');
console.log('Doc.dates:', typeof doc.dates); // Should be 'function'
console.log('Extracted dates:', doc.dates().out('array')); */