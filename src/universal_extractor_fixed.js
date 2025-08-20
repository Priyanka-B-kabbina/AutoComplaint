/**
 * Universal ML-based order information extraction
 * Works across all e-commerce platforms using adaptive patterns and selectors
 */
async function extractOrderInfoML(pageContent) {
  try {
    console.log('🔍 UNIVERSAL EXTRACTION - Starting universal ML-based information extraction...');
    console.log('🔍 UNIVERSAL EXTRACTION - Domain:', window.location.hostname);
    console.log('🔍 UNIVERSAL EXTRACTION - Content length:', pageContent.length);
    
    const extractedData = {};
    
    // Phase 1: Universal selector-based extraction
    console.log('📋 PHASE 1 - Universal selector-based extraction...');
    
    const universalSelectors = {
      orderId: [
        // Order ID patterns
        '[class*="order"]', '[id*="order"]',
        '[class*="invoice"]', '[id*="invoice"]',
        '[class*="receipt"]', '[id*="receipt"]',
        '[data-field*="order"]', '[data-id*="order"]',
        'span[class*="number"]', 'div[class*="number"]',
        'strong', 'b', 'em', '.highlight'
      ],
      total: [
        // Price/total patterns
        '[class*="total"]', '[id*="total"]',
        '[class*="amount"]', '[id*="amount"]',
        '[class*="price"]', '[id*="price"]',
        '[class*="cost"]', '[id*="cost"]',
        '[class*="grand"]', '[class*="final"]',
        'span[class*="money"]', 'div[class*="money"]',
        '.currency', '.payment-amount'
      ],
      customerName: [
        // Customer/buyer information
        '[class*="customer"]', '[id*="customer"]',
        '[class*="buyer"]', '[id*="buyer"]',
        '[class*="user"]', '[id*="user"]',
        '[class*="name"]', '[id*="name"]',
        '[class*="shipping"]', '[id*="shipping"]',
        '[class*="billing"]', '[id*="billing"]'
      ],
      date: [
        // Date patterns
        '[class*="date"]', '[id*="date"]',
        '[class*="time"]', '[id*="time"]',
        '[class*="ordered"]', '[id*="ordered"]',
        '[class*="purchase"]', '[id*="purchase"]',
        'time', '[datetime]', '.timestamp'
      ],
      items: [
        // Product/item patterns
        '[class*="product"]', '[id*="product"]',
        '[class*="item"]', '[id*="item"]',
        '[class*="goods"]', '[id*="goods"]',
        '[class*="title"]', '[id*="title"]',
        'h1', 'h2', 'h3', 'h4', 'h5',
        '.product-title', '.item-title', '.product-name'
      ],
      seller: [
        // Seller/vendor patterns
        '[class*="seller"]', '[id*="seller"]',
        '[class*="vendor"]', '[id*="vendor"]',
        '[class*="merchant"]', '[id*="merchant"]',
        '[class*="store"]', '[id*="store"]',
        '[class*="brand"]', '[id*="brand"]'
      ],
      quantity: [
        // Quantity patterns
        '[class*="quantity"]', '[id*="quantity"]',
        '[class*="qty"]', '[id*="qty"]',
        '[class*="count"]', '[id*="count"]',
        '[class*="amount"]', '[id*="amount"]',
        'input[type="number"]', '.spinner'
      ]
    };
    
    // Extract each field using universal selectors
    for (const [fieldName, fieldSelectors] of Object.entries(universalSelectors)) {
      console.log(`🔍 FIELD EXTRACTION - Searching for ${fieldName}...`);
      
      let fieldValues = new Set(); // Use Set to avoid duplicates
      
      for (const selector of fieldSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          
          for (const element of elements) {
            if (!element.textContent || !element.textContent.trim()) continue;
            
            let text = element.textContent.trim();
            
            // Apply field-specific cleaning and validation
            const cleanedValue = cleanFieldValue(text, fieldName);
            if (cleanedValue && cleanedValue.length > 0) {
              if (fieldName === 'items') {
                // For items, collect multiple values
                if (cleanedValue.length > 5 && cleanedValue.length < 200) {
                  fieldValues.add(cleanedValue);
                }
              } else {
                // For other fields, we want the best match
                fieldValues.add(cleanedValue);
              }
            }
          }
          
          // If we found values for this field, break to avoid redundancy
          if (fieldValues.size > 0 && fieldName !== 'items') break;
          
        } catch (error) {
          console.warn(`📋 SELECTOR ERROR - Error with selector ${selector}:`, error.message);
        }
      }
      
      // Store the extracted values
      if (fieldValues.size > 0) {
        if (fieldName === 'items') {
          extractedData[fieldName] = Array.from(fieldValues).slice(0, 10); // Limit to 10 items
        } else {
          // For single-value fields, pick the best candidate
          extractedData[fieldName] = selectBestFieldValue(Array.from(fieldValues), fieldName);
        }
        console.log(`✅ FIELD FOUND - ${fieldName}:`, extractedData[fieldName]);
      }
    }
    
    // Phase 2: Enhanced regex pattern extraction from page content
    console.log('📋 PHASE 2 - Enhanced regex pattern extraction...');
    
    const enhancedPatterns = {
      orderId: [
        /order[#\s]*:?\s*([A-Z0-9\-]{6,20})/gi,
        /invoice[#\s]*:?\s*([A-Z0-9\-]{6,20})/gi,
        /receipt[#\s]*:?\s*([A-Z0-9\-]{6,20})/gi,
        /transaction[#\s]*:?\s*([A-Z0-9\-]{6,20})/gi,
        /reference[#\s]*:?\s*([A-Z0-9\-]{6,20})/gi
      ],
      total: [
        /total[:\s]*[₹$€£¥]?([\d,]+\.?\d*)/gi,
        /amount[:\s]*[₹$€£¥]?([\d,]+\.?\d*)/gi,
        /grand\s*total[:\s]*[₹$€£¥]?([\d,]+\.?\d*)/gi,
        /final\s*amount[:\s]*[₹$€£¥]?([\d,]+\.?\d*)/gi,
        /[₹$€£¥]([\d,]+\.?\d*)/g
      ],
      email: [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})/g
      ],
      phone: [
        /(?:\+91[-\s]?)?[6789]\d{9}/g,
        /\+\d{1,3}[-\s]?\d{6,14}/g,
        /\(\d{3}\)[-\s]?\d{3}[-\s]?\d{4}/g
      ],
      date: [
        /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
        /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi
      ]
    };
    
    for (const [fieldName, patterns] of Object.entries(enhancedPatterns)) {
      if (!extractedData[fieldName]) { // Only extract if not already found
        for (const pattern of patterns) {
          const matches = pageContent.match(pattern);
          if (matches && matches.length > 0) {
            const cleanedValue = cleanFieldValue(matches[0], fieldName);
            if (cleanedValue) {
              extractedData[fieldName] = cleanedValue;
              console.log(`✅ PATTERN FOUND - ${fieldName}:`, extractedData[fieldName]);
              break;
            }
          }
        }
      }
    }
    
    // Phase 3: Content analysis for missing fields
    console.log('📋 PHASE 3 - Content analysis for missing fields...');
    
    // If we still don't have key fields, try content analysis
    if (!extractedData.orderId || !extractedData.total) {
      const contentAnalysis = analyzeContentForMissingFields(pageContent, extractedData);
      Object.assign(extractedData, contentAnalysis);
    }
    
    // Add metadata
    extractedData.extractionMethod = 'universal-adaptive-ml';
    extractedData.timestamp = new Date().toISOString();
    extractedData.orderUrl = window.location.href;
    extractedData.domain = window.location.hostname;
    extractedData.extractedFieldCount = Object.keys(extractedData).filter(key => 
      !['extractionMethod', 'timestamp', 'orderUrl', 'domain'].includes(key)
    ).length;
    
    console.log('✅ UNIVERSAL EXTRACTION - Extraction completed:', extractedData);
    console.log('📊 EXTRACTION SUMMARY:', {
      fieldsFound: extractedData.extractedFieldCount,
      method: extractedData.extractionMethod,
      hasOrderId: !!extractedData.orderId,
      hasTotal: !!extractedData.total,
      hasItems: !!extractedData.items?.length,
      domain: extractedData.domain
    });
    
    return extractedData;
    
  } catch (error) {
    console.error('❌ UNIVERSAL EXTRACTION ERROR - Extraction failed:', error);
    throw error;
  }
}

/**
 * Clean and validate field values based on field type
 */
function cleanFieldValue(text, fieldName) {
  if (!text || typeof text !== 'string') return null;
  
  text = text.trim();
  
  switch (fieldName) {
    case 'orderId':
      // Extract alphanumeric IDs, typically 6-20 characters
      const orderMatch = text.match(/[A-Z0-9\-]{6,20}/i);
      return orderMatch ? orderMatch[0] : null;
      
    case 'total':
      // Extract monetary amounts
      const amountMatch = text.match(/[₹$€£¥]?([\d,]+\.?\d*)/);
      return amountMatch ? amountMatch[0] : null;
      
    case 'email':
      // Validate email format
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/);
      return emailMatch ? emailMatch[0] : null;
      
    case 'phone':
      // Extract phone numbers
      const phoneMatch = text.match(/[\d\+\-\(\)\s]{10,}/);
      return phoneMatch ? phoneMatch[0].replace(/[^\d\+]/g, '') : null;
      
    case 'date':
      // Extract date patterns
      const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/);
      return dateMatch ? dateMatch[0] : null;
      
    case 'customerName':
      // Clean up names (remove titles, numbers)
      const nameMatch = text.match(/[A-Za-z\s]{2,50}/);
      return nameMatch ? nameMatch[0].trim() : null;
      
    case 'items':
      // Clean product names
      if (text.length > 5 && text.length < 200) {
        return text.replace(/[^\w\s\-]/g, '').trim();
      }
      return null;
      
    default:
      return text.length > 1 && text.length < 500 ? text : null;
  }
}

/**
 * Select the best value from multiple candidates for a field
 */
function selectBestFieldValue(values, fieldName) {
  if (!values || values.length === 0) return null;
  if (values.length === 1) return values[0];
  
  // Apply field-specific selection logic
  switch (fieldName) {
    case 'orderId':
      // Prefer longer, more complex IDs
      return values.sort((a, b) => b.length - a.length)[0];
      
    case 'total':
      // Prefer amounts with currency symbols
      const withCurrency = values.filter(v => /[₹$€£¥]/.test(v));
      return withCurrency.length > 0 ? withCurrency[0] : values[0];
      
    case 'customerName':
      // Prefer names with multiple words
      const multiWord = values.filter(v => v.includes(' '));
      return multiWord.length > 0 ? multiWord[0] : values[0];
      
    default:
      // Default: return first value
      return values[0];
  }
}

/**
 * Analyze content for missing critical fields using advanced pattern matching
 */
function analyzeContentForMissingFields(content, existingData) {
  const missingFields = {};
  
  // Look for order-like patterns if order ID is missing
  if (!existingData.orderId) {
    const orderPatterns = [
      /\b[A-Z]{2,3}[\-]?\d{6,}\b/g,
      /\b\d{10,15}\b/g,
      /\b[A-Z0-9]{8,15}\b/g
    ];
    
    for (const pattern of orderPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        missingFields.orderId = matches[0];
        console.log('📋 CONTENT ANALYSIS - Found potential order ID:', missingFields.orderId);
        break;
      }
    }
  }
  
  // Look for monetary amounts if total is missing
  if (!existingData.total) {
    const amountPatterns = [
      /[₹$€£¥]\s?[\d,]+\.?\d*/g,
      /\b\d{2,6}\.\d{2}\b/g
    ];
    
    for (const pattern of amountPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        missingFields.total = matches[0];
        console.log('📋 CONTENT ANALYSIS - Found potential total:', missingFields.total);
        break;
      }
    }
  }
  
  return missingFields;
}
