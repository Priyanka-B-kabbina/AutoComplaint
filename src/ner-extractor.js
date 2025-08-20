/**
 * AutoComplaint - NER-based Universal E-commerce Order Extraction
 * Uses Named Entity Recognition for intelligent extraction across all e-commerce platforms
 */

// Configuration - Using OOB models only (no training-suite dependency)
const NER_CONFIG = {
  MODEL_SERVER_URL: null,  // No server - using OOB models only
  CONFIDENCE_THRESHOLD: 0.5,
  TIMEOUT: 10000,
  STANDALONE_MODE: true,   // Always standalone with OOB models
  USE_HUGGINGFACE: true,   // Use Hugging Face models
  USE_BROWSER_NER: true    // Use browser-compatible NER libraries
};

/**
 * Main NER-based extraction function
 * Calls the training-suite for entity predictions, then handles extraction logic
 */
export async function extractOrderInfoWithNER(text, url = '') {
  const extracted = {
    orderId: '',
    productName: '',
    productValue: '',
    orderDate: '',
    deliveryDate: '',
    sellerName: '',
    trackingNumber: '',
    customerDetails: {},
    extractionMethod: 'ner-based',
    confidence: 0,
    url: url,
    domain: url ? new URL(url).hostname : 'unknown',
    extractedFields: [],
    nerEntities: {},
    serverAvailable: false
  };

  try {
    console.log('🧠 Starting NER-based extraction for domain:', extracted.domain);

    // Step 1: Get NER entities using OOB models
    const nerEntities = await getNEREntitiesFromOOB(text);
    
    if (nerEntities && !nerEntities.error) {
      extracted.nerEntities = nerEntities;
      extracted.serverAvailable = false; // Using OOB models
      console.log('✅ NER entities extracted using OOB models:', nerEntities);
      
      // Step 2: Use NER entities for intelligent extraction
      await extractOrderIdFromNER(text, extracted, nerEntities);
      await extractProductNameFromNER(text, extracted, nerEntities);
      await extractPriceFromNER(text, extracted, nerEntities);
      await extractDatesFromNER(text, extracted, nerEntities);
      await extractSellerFromNER(text, extracted, nerEntities);
      await extractContactInfoFromNER(text, extracted, nerEntities);
      await extractCustomEntitiesFromNER(text, extracted, nerEntities);
      
    } else {
      console.log('⚠️ OOB extraction failed, falling back to basic patterns');
      // Fallback to basic pattern-based extraction
      await fallbackLocalExtraction(text, extracted);
    }

    // Step 3: Calculate confidence
    calculateConfidence(extracted);

    console.log('✅ NER extraction completed:', {
      fieldsFound: extracted.extractedFields.length,
      confidence: extracted.confidence.toFixed(3),
      oobModelsUsed: true
    });

    return extracted;

  } catch (error) {
    console.error('❌ NER extraction error:', error);
    extracted.error = error.message;
    
    // Fallback to local extraction on error
    try {
      await fallbackLocalExtraction(text, extracted);
    } catch (fallbackError) {
      console.error('❌ Fallback extraction also failed:', fallbackError);
    }
    
    return extracted;
  }
}

/**
 * Get NER entities using OOB models (browser-compatible)
 * Uses built-in regex patterns + basic NLP for entity extraction
 */
async function getNEREntitiesFromOOB(text) {
  try {
    console.log('🔍 Using OOB NER models for entity extraction...');
    
    // Extract entities using regex patterns and basic NLP
    const entities = {
      organizations: extractOrganizations(text),
      money: extractMoney(text),
      dates: extractDates(text),
      emails: extractEmails(text),
      phoneNumbers: extractPhoneNumbers(text),
      numbers: extractNumbers(text),
      products: extractProducts(text),
      orderIds: extractOrderIds(text),
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ OOB NER extraction completed:', entities);
    return entities;

  } catch (error) {
    console.error('❌ Failed to extract entities with OOB models:', error);
    return { error: error.message };
  }
}

/**
 * Extract Order ID using NER entities and context
 */
async function extractOrderIdFromNER(text, extracted, entities) {
  console.log('🔍 NER Order ID extraction...');
  
  // Enhanced patterns with NER context
  const orderIdPatterns = [
    /order[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /invoice[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /confirmation[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /reference[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /transaction[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi
  ];
  
  let bestOrderId = null;
  let maxScore = 0;
  
  for (const pattern of orderIdPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      let score = 0.4;
      const matchText = match[0].toLowerCase();
      const orderId = match[1];
      
      // Context scoring
      if (matchText.includes('order')) score += 0.5;
      if (matchText.includes('invoice')) score += 0.4;
      if (matchText.includes('confirmation')) score += 0.3;
      
      // ID quality scoring
      if (orderId.length >= 8) score += 0.3;
      if (/[A-Z]/.test(orderId) && /\d/.test(orderId)) score += 0.2;
      if (orderId.includes('-')) score += 0.1;
      
      // NER context bonus: check if near organizations
      if (entities.organizations && entities.organizations.length > 0) {
        const orgContext = entities.organizations.some(org => 
          Math.abs(text.toLowerCase().indexOf(orderId.toLowerCase()) - 
                  text.toLowerCase().indexOf(org.toLowerCase())) < 200
        );
        if (orgContext) score += 0.2;
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestOrderId = orderId;
      }
    }
  }
  
  if (bestOrderId && maxScore > NER_CONFIG.CONFIDENCE_THRESHOLD) {
    extracted.orderId = bestOrderId;
    extracted.confidence += 0.3;
    extracted.extractedFields.push('orderId');
    console.log('✅ Order ID found via NER:', bestOrderId);
  }
}

/**
 * Extract Product Name using NER entities
 */
async function extractProductNameFromNER(text, extracted, entities) {
  console.log('🔍 NER Product Name extraction...');
  
  let productCandidates = [];
  
  // Method 1: Use NER nouns with product keywords
  if (entities.nouns && entities.nouns.length > 0) {
    const productKeywords = ['product', 'item', 'book', 'phone', 'laptop', 'shirt', 'shoes', 'watch', 'bag'];
    
    for (const noun of entities.nouns) {
      if (noun.length > 5 && noun.length < 100) {
        let score = 0.1;
        
        // Score based on product keywords
        for (const keyword of productKeywords) {
          if (noun.toLowerCase().includes(keyword)) {
            score += 0.4;
            break;
          }
        }
        
        // Context scoring around purchase verbs
        if (/(?:buy|bought|purchase|order)/.test(text.toLowerCase())) {
          const buyIndex = text.toLowerCase().search(/(?:buy|bought|purchase|order)/);
          const nounIndex = text.toLowerCase().indexOf(noun.toLowerCase());
          if (Math.abs(buyIndex - nounIndex) < 100) {
            score += 0.3;
          }
        }
        
        productCandidates.push({ name: noun, score });
      }
    }
  }
  
  // Method 2: Look for quoted text (often product names)
  const quotedText = text.match(/"([^"]{5,100})"/g);
  if (quotedText) {
    for (const quoted of quotedText) {
      const cleanQuoted = quoted.replace(/"/g, '');
      productCandidates.push({ name: cleanQuoted, score: 0.6 });
    }
  }
  
  // Method 3: Look for title case text
  const titleCasePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\b/g;
  const titleMatches = [...text.matchAll(titleCasePattern)];
  for (const match of titleMatches) {
    if (match[1].length > 5 && match[1].length < 100) {
      productCandidates.push({ name: match[1], score: 0.4 });
    }
  }
  
  // Find the best product candidate
  if (productCandidates.length > 0) {
    const bestProduct = productCandidates.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    if (bestProduct.score > 0.3) {
      extracted.productName = bestProduct.name.trim();
      extracted.confidence += 0.2;
      extracted.extractedFields.push('productName');
      console.log('✅ Product name found via NER:', bestProduct.name);
    }
  }
}

/**
 * Extract Price using NER money entities
 */
async function extractPriceFromNER(text, extracted, entities) {
  console.log('🔍 NER Price extraction...');
  
  if (entities.money && entities.money.length > 0) {
    let bestPrice = null;
    let maxScore = 0;
    
    for (const moneyEntity of entities.money) {
      let score = 0.3; // Base score for NER-detected money
      
      // Context analysis
      const moneyIndex = text.toLowerCase().indexOf(moneyEntity.toLowerCase());
      const contextBefore = text.substring(Math.max(0, moneyIndex - 50), moneyIndex).toLowerCase();
      
      // Context scoring
      if (contextBefore.includes('total')) score += 0.5;
      if (contextBefore.includes('price')) score += 0.4;
      if (contextBefore.includes('cost')) score += 0.3;
      if (contextBefore.includes('amount')) score += 0.3;
      if (contextBefore.includes('paid')) score += 0.4;
      
      // Avoid shipping/tax prices
      if (contextBefore.includes('shipping') || contextBefore.includes('tax')) score -= 0.3;
      
      if (score > maxScore) {
        maxScore = score;
        bestPrice = moneyEntity;
      }
    }
    
    if (bestPrice && maxScore > 0.4) {
      extracted.productValue = bestPrice;
      extracted.confidence += 0.25;
      extracted.extractedFields.push('productValue');
      console.log('✅ Price found via NER:', bestPrice);
    }
  }
}

/**
 * Extract Dates using NER date entities
 */
async function extractDatesFromNER(text, extracted, entities) {
  console.log('🔍 NER Date extraction...');
  
  if (entities.dates && entities.dates.length > 0) {
    let orderDate = null;
    let deliveryDate = null;
    
    for (const dateEntity of entities.dates) {
      const dateIndex = text.toLowerCase().indexOf(dateEntity.toLowerCase());
      const contextBefore = text.substring(Math.max(0, dateIndex - 30), dateIndex).toLowerCase();
      
      // Classify date type based on context
      if (contextBefore.includes('order') || contextBefore.includes('purchase') || 
          contextBefore.includes('placed') || contextBefore.includes('confirmed')) {
        if (!orderDate) orderDate = dateEntity;
      } else if (contextBefore.includes('delivery') || contextBefore.includes('shipping') || 
                 contextBefore.includes('arrive') || contextBefore.includes('expected')) {
        if (!deliveryDate) deliveryDate = dateEntity;
      } else if (!orderDate) {
        orderDate = dateEntity; // Default to order date
      }
    }
    
    if (orderDate) {
      extracted.orderDate = orderDate;
      extracted.confidence += 0.2;
      extracted.extractedFields.push('orderDate');
      console.log('✅ Order date found via NER:', orderDate);
    }
    
    if (deliveryDate) {
      extracted.deliveryDate = deliveryDate;
      extracted.confidence += 0.15;
      extracted.extractedFields.push('deliveryDate');
      console.log('✅ Delivery date found via NER:', deliveryDate);
    }
  }
}

/**
 * Extract Seller using NER organization entities
 */
async function extractSellerFromNER(text, extracted, entities) {
  console.log('🔍 NER Seller extraction...');
  
  if (entities.organizations && entities.organizations.length > 0) {
    let bestSeller = null;
    let maxScore = 0;
    
    for (const org of entities.organizations) {
      let score = 0.3; // Base score for NER-detected organization
      
      const orgIndex = text.toLowerCase().indexOf(org.toLowerCase());
      const contextBefore = text.substring(Math.max(0, orgIndex - 50), orgIndex).toLowerCase();
      const contextAfter = text.substring(orgIndex, Math.min(text.length, orgIndex + 50)).toLowerCase();
      
      // Context scoring for seller identification
      if (contextBefore.includes('sold by') || contextAfter.includes('seller')) score += 0.5;
      if (contextBefore.includes('from') || contextBefore.includes('by')) score += 0.3;
      if (contextBefore.includes('brand') || contextBefore.includes('manufacturer')) score += 0.4;
      
      // Known e-commerce platforms bonus
      const ecommercePlatforms = ['amazon', 'flipkart', 'myntra', 'ebay', 'etsy'];
      if (ecommercePlatforms.some(platform => org.toLowerCase().includes(platform))) {
        score += 0.2;
      }
      
      if (score > maxScore && org.length > 2 && org.length < 50) {
        maxScore = score;
        bestSeller = org;
      }
    }
    
    if (bestSeller && maxScore > 0.4) {
      extracted.sellerName = bestSeller;
      extracted.confidence += 0.15;
      extracted.extractedFields.push('sellerName');
      console.log('✅ Seller found via NER:', bestSeller);
    }
  }
}

/**
 * Extract Contact Information using NER
 */
async function extractContactInfoFromNER(text, extracted, entities) {
  console.log('🔍 NER Contact info extraction...');
  
  if (entities.emails && entities.emails.length > 0) {
    extracted.customerDetails.email = entities.emails[0];
    extracted.confidence += 0.1;
    extracted.extractedFields.push('email');
    console.log('✅ Email found via NER:', entities.emails[0]);
  }
  
  if (entities.phoneNumbers && entities.phoneNumbers.length > 0) {
    extracted.customerDetails.phone = entities.phoneNumbers[0];
    extracted.confidence += 0.1;
    extracted.extractedFields.push('phone');
    console.log('✅ Phone found via NER:', entities.phoneNumbers[0]);
  }
}

/**
 * Extract Custom E-commerce Entities
 */
async function extractCustomEntitiesFromNER(text, extracted, entities) {
  console.log('🔍 Custom E-commerce entity extraction...');
  
  // Extract tracking numbers
  const trackingPatterns = [
    /(?:tracking|awb|shipment)\s*(?:number|id|code)?\s*:?\s*([A-Z0-9]{8,25})/gi,
    /track\s*:?\s*([A-Z0-9]{8,25})/gi
  ];
  
  for (const pattern of trackingPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      extracted.trackingNumber = matches[0][1];
      extracted.confidence += 0.1;
      extracted.extractedFields.push('trackingNumber');
      console.log('✅ Tracking number found:', matches[0][1]);
      break;
    }
  }
  
  // Extract quantities using NER numbers
  if (entities.numbers && entities.numbers.length > 0) {
    const quantityPattern = /(\d+)\s*(item|items|piece|pieces|qty|quantity)/gi;
    const qtyMatches = [...text.matchAll(quantityPattern)];
    if (qtyMatches.length > 0) {
      extracted.quantity = qtyMatches[0][0];
      extracted.confidence += 0.05;
      extracted.extractedFields.push('quantity');
      console.log('✅ Quantity found:', qtyMatches[0][0]);
    }
  }
  
  // Extract addresses using NER places
  if (entities.places && entities.places.length > 0) {
    extracted.customerDetails.address = entities.places.join(', ');
    extracted.confidence += 0.05;
    extracted.extractedFields.push('address');
    console.log('✅ Address found via NER:', entities.places.join(', '));
  }
}

/**
 * Fallback local extraction when server is unavailable
 */
async function fallbackLocalExtraction(text, extracted) {
  console.log('⚠️ Using fallback local extraction...');
  extracted.extractionMethod = 'local-fallback';
  
  // Basic regex patterns for essential fields
  const patterns = {
    orderId: [/order[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi, /invoice[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi],
    price: [/([\$₹£€¥]\s*[\d,]+\.?\d*)/g, /total[:\s]*([\d,]+\.?\d*)/gi],
    email: [/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g],
    date: [/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g]
  };
  
  // Simple pattern matching
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    for (const pattern of fieldPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        if (field === 'orderId' && !extracted.orderId) {
          extracted.orderId = matches[0][1];
          extracted.extractedFields.push('orderId');
        } else if (field === 'price' && !extracted.productValue) {
          extracted.productValue = matches[0][1];
          extracted.extractedFields.push('productValue');
        } else if (field === 'email' && !extracted.customerDetails.email) {
          extracted.customerDetails.email = matches[0][1];
          extracted.extractedFields.push('email');
        } else if (field === 'date' && !extracted.orderDate) {
          extracted.orderDate = matches[0][0];
          extracted.extractedFields.push('orderDate');
        }
        break;
      }
    }
  }
  
  extracted.confidence = extracted.extractedFields.length * 0.1;
}

/**
 * Calculate final confidence score
 */
function calculateConfidence(extracted) {
  // Bonus for multiple fields found
  if (extracted.extractedFields.length >= 3) extracted.confidence += 0.1;
  if (extracted.extractedFields.length >= 5) extracted.confidence += 0.1;
  
  // Server availability bonus
  if (extracted.serverAvailable) extracted.confidence += 0.05;
  
  // Domain-specific confidence adjustment
  const knownEcomDomains = ['amazon', 'flipkart', 'myntra', 'ebay', 'etsy', 'shopify'];
  if (knownEcomDomains.some(domain => extracted.domain.includes(domain))) {
    extracted.confidence += 0.05;
  }
  
  // Ensure confidence stays within bounds
  extracted.confidence = Math.min(1.0, Math.max(0.0, extracted.confidence));
}

/**
 * OOB Entity Extraction Functions
 * Using regex patterns for browser-compatible NER
 */

function extractOrganizations(text) {
  const patterns = [
    /\b(amazon|flipkart|myntra|ebay|etsy|shopify|walmart|target|alibaba|aliexpress)\b/gi,
    /\b([A-Z][a-z]+ (?:Inc|Corp|Ltd|LLC|Company|Co|Store|Shop|Market|Mart))\b/g,
    /(?:sold by|shipped by|from)\s+([A-Z][a-zA-Z\s]{2,30})/gi
  ];
  
  const orgs = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => orgs.push(match[1] || match[0]));
  });
  
  return [...new Set(orgs)].slice(0, 10); // Remove duplicates, limit to 10
}

function extractMoney(text) {
  const patterns = [
    /[\$₹£€¥]\s*[\d,]+\.?\d*/g,
    /[\d,]+\.?\d*\s*[\$₹£€¥]/g,
    /(?:rs|inr|usd|eur|gbp|jpy)\s*[\.\s]?\s*[\d,]+\.?\d*/gi,
    /(?:total|price|amount|cost|value)\s*:?\s*([\$₹£€¥]?\s*[\d,]+\.?\d*)/gi
  ];
  
  const money = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => money.push(match[1] || match[0]));
  });
  
  return [...new Set(money)].slice(0, 5);
}

function extractDates(text) {
  const patterns = [
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/gi,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi
  ];
  
  const dates = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => dates.push(match[0]));
  });
  
  return [...new Set(dates)].slice(0, 5);
}

function extractEmails(text) {
  const pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  return [...text.matchAll(pattern)].map(match => match[0]).slice(0, 3);
}

function extractPhoneNumbers(text) {
  const patterns = [
    /(?:\+91|0)?\s*[6789]\d{9}/g,  // Indian numbers
    /(?:\+1)?\s*\d{10}/g,          // US numbers
    /(?:\+44)?\s*\d{10,11}/g       // UK numbers
  ];
  
  const phones = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => phones.push(match[0]));
  });
  
  return [...new Set(phones)].slice(0, 3);
}

function extractNumbers(text) {
  const patterns = [
    /\b\d{6,20}\b/g,  // Long numbers (could be order IDs, tracking numbers)
    /\b[A-Z]{2,4}\d{6,15}\b/g,  // Alphanumeric codes
    /\b\d+\.\d{2}\b/g  // Decimal numbers (prices)
  ];
  
  const numbers = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => numbers.push(match[0]));
  });
  
  return [...new Set(numbers)].slice(0, 10);
}

function extractProducts(text) {
  const patterns = [
    /(?:product|item)\s*(?:name|title)?\s*:?\s*([^\n\r]{10,100})/gi,
    /(?:bought|purchased|ordered)\s*:?\s*([^\n\r]{10,100})/gi,
    /<h1[^>]*>([^<]{10,100})<\/h1>/gi,
    /(?:you\s*(?:bought|ordered))\s*:?\s*([^\n\r]{10,100})/gi
  ];
  
  const products = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const product = (match[1] || match[0]).trim()
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ');
      if (product.length >= 10 && product.length <= 100) {
        products.push(product);
      }
    });
  });
  
  return [...new Set(products)].slice(0, 5);
}

function extractOrderIds(text) {
  const patterns = [
    /order[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /invoice[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /confirmation[#\s]*:?\s*([A-Z0-9\-]{6,25})/gi,
    /order\s*(?:number|id)\s*:?\s*([A-Z0-9\-]{6,25})/gi,
    /\b([A-Z]{2,4}[\-]?\d{8,15})\b/g,
    /\b(\d{10,15})\b/g
  ];
  
  const orderIds = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const id = match[1] || match[0];
      if (id.length >= 6 && id.length <= 25) {
        orderIds.push(id);
      }
    });
  });
  
  return [...new Set(orderIds)].slice(0, 5);
}
export default { extractOrderInfoWithNER };
