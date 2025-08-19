// ==UserScript==
// Enhanced auto-fill grievance portal form - v3.0 Grievance Form Optimized
// ==/UserScript==

(function() {
  console.log('🚀 Enhanced Consumer Portal Auto-Fill v3.0 loaded - Grievance Form Optimized');

  // Enhanced field mappings for grievance forms
  const fieldMappings = {
    // Company/Seller Information
    company: [
      'select[name*="company"]',
      'select[name*="seller"]', 
      'select[name*="brand"]',
      'input[name*="company"]',
      'input[name*="seller"]',
      '#company-select',
      '.company-dropdown'
    ],
    
    // Product Value/Price
    productValue: [
      'select[name*="product"][name*="value"]',
      'select[name*="price"]',
      'select[name*="amount"]',
      'input[name*="value"]',
      'input[name*="price"]',
      'input[name*="amount"]',
      '#product-value-select',
      '.product-value-dropdown'
    ],
    
    // Purchase City
    purchaseCity: [
      'select[name*="city"]',
      'select[name*="purchase"][name*="city"]',
      'input[name*="city"]',
      '#city-select',
      '.city-dropdown'
    ],
    
    // Category
    category: [
      'select[name*="category"]',
      'select[name*="product"][name*="category"]',
      '#category-select',
      '.category-dropdown'
    ],
    
    // Sector/Industry
    sectorIndustry: [
      'select[name*="sector"]',
      'select[name*="industry"]',
      'select[name*="business"]',
      '#sector-select',
      '#industry-select',
      '.sector-dropdown'
    ],
    
    // Dealer Information
    dealerInfo: [
      'textarea[name*="dealer"]',
      'textarea[name*="seller"]',
      'textarea[name*="contact"]',
      'input[name*="dealer"]',
      'input[name*="seller"]',
      '#dealer-info',
      '.dealer-textarea'
    ],
    
    // Customer Details
    customerName: [
      'input[name*="customer"][name*="name"]',
      'input[name*="consumer"][name*="name"]',
      'input[name*="name"]',
      '#customer-name',
      '#consumer-name'
    ],
    
    email: [
      'input[type="email"]',
      'input[name*="email"]',
      '#email',
      '.email-input'
    ],
    
    phone: [
      'input[type="tel"]',
      'input[name*="phone"]',
      'input[name*="mobile"]',
      'input[name*="contact"]',
      '#phone',
      '#mobile'
    ],
    
    // Order Details
    orderId: [
      'input[name*="order"][name*="id"]',
      'input[name*="order"][name*="number"]',
      'input[name*="reference"]',
      'textarea[name*="order"]',
      '#order-id',
      '#order-number'
    ],
    
    productName: [
      'input[name*="product"][name*="name"]',
      'textarea[name*="product"]',
      'input[name*="item"]',
      '#product-name',
      '.product-input'
    ]
  };

  // Enhanced dropdown setting with intelligent matching
  function setDropdown(selector, value, fieldType) {
    const select = document.querySelector(selector);
    if (!select || !value) return { success: false, reason: 'No select element or value' };
    
    console.log(`🎯 Setting dropdown ${fieldType}:`, value);
    
    const searchValue = value.toString().toLowerCase().trim();
    
    // Strategy 1: Exact match
    for (const option of select.options) {
      if (option.text.trim().toLowerCase() === searchValue) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Exact match found for ${fieldType}`);
        return { success: true, method: 'exact', selectedText: option.text };
      }
    }
    
    // Strategy 2: Partial match
    for (const option of select.options) {
      if (option.text.toLowerCase().includes(searchValue) || searchValue.includes(option.text.toLowerCase())) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Partial match found for ${fieldType}:`, option.text);
        return { success: true, method: 'partial', selectedText: option.text };
      }
    }
    
    // Strategy 3: Smart matching for specific field types
    if (fieldType === 'productValue') {
      const numericValue = parseFloat(value.replace(/[₹,]/g, ''));
      if (numericValue) {
        for (const option of select.options) {
          const optionText = option.text.toLowerCase();
          if (optionText.includes('above') && numericValue > 50000) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, method: 'range', selectedText: option.text };
          }
        }
      }
    }
    
    // Strategy 4: If "Other" option exists, select it
    for (const option of select.options) {
      if (option.text.toLowerCase().includes('other')) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Look for associated text input that appears after selecting "Other"
        setTimeout(() => {
          const textInput = document.querySelector('input[type="text"]:not([style*="display: none"])');
          if (textInput && textInput.offsetParent !== null) {
            textInput.value = value;
            textInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`✅ Selected "Other" and filled text for ${fieldType}`);
          }
        }, 500);
        
        return { success: true, method: 'other', selectedText: option.text };
      }
    }
    
    console.log(`⚠️ No suitable option found for ${fieldType}:`, value);
    return { success: false, reason: 'No suitable option found' };
  }

  // Enhanced text field setting
  function setTextField(selector, value, fieldType) {
    const element = document.querySelector(selector);
    if (!element || !value) return { success: false, reason: 'No element or value' };
    
    console.log(`📝 Setting text field ${fieldType}:`, value);
    
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return { success: true, value: value };
  }

  // Enhanced form filling function
  async function fillGrievanceForm(orderData) {
    console.log('🎯 Starting enhanced grievance form filling with data:', orderData);
    
    const results = {};
    const fillableFields = [
      'company', 'productValue', 'purchaseCity', 'category', 'sectorIndustry',
      'dealerInfo', 'customerName', 'email', 'phone', 'orderId', 'productName'
    ];
    
    for (const fieldType of fillableFields) {
      const value = orderData[fieldType];
      if (!value) {
        results[fieldType] = { success: false, reason: 'No data available' };
        continue;
      }
      
      const selectors = fieldMappings[fieldType] || [];
      let filled = false;
      
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (!element || element.offsetParent === null) continue; // Skip hidden elements
          
          let result;
          if (element.tagName === 'SELECT') {
            result = setDropdown(selector, value, fieldType);
          } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            result = setTextField(selector, value, fieldType);
          }
          
          if (result && result.success) {
            results[fieldType] = { 
              ...result, 
              selector: selector,
              fieldType: fieldType
            };
            filled = true;
            break;
          }
        } catch (error) {
          console.warn(`Error filling ${fieldType} with selector ${selector}:`, error);
        }
      }
      
      if (!filled) {
        results[fieldType] = { 
          success: false, 
          reason: 'No suitable field found',
          searchedSelectors: selectors,
          value: value
        };
      }
    }
    
    // Generate summary
    const successful = Object.values(results).filter(r => r.success).length;
    const total = fillableFields.length;
    
    const summary = {
      total: total,
      successful: successful,
      failed: total - successful,
      successRate: `${Math.round((successful / total) * 100)}%`,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Enhanced form filling completed:', { summary, results });
    
    return { summary, results };
  }

  // Main enhanced autofill function
  async function autofillGrievancePortal() {
    console.log('🚀 Enhanced autofill triggered on grievance portal');
    
    try {
      // Show notification
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #4CAF50; color: white; padding: 12px 20px;
        border-radius: 6px; font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s ease;
      `;
      toast.textContent = 'Filling form with enhanced order details...';
      document.body.appendChild(toast);
      
      // Auto-remove toast
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }
      }, 4000);
    } catch (e) {
      console.warn('Toast notification failed:', e);
    }

    return new Promise((resolve, reject) => {
      // Retrieve enhanced order data
      chrome.storage.local.get([
        'autoComplaintOrderUniversal',
        'autoComplaintOrderOCR', 
        'autoComplaintOrderNER',
        'autoComplaintOrderCompromise',
        'autoComplaintOrder'
      ], async (result) => {
        try {
          if (chrome.runtime.lastError) {
            throw new Error(`Storage error: ${chrome.runtime.lastError.message}`);
          }

          let data = result.autoComplaintOrderUniversal || 
                    result.autoComplaintOrderOCR || 
                    result.autoComplaintOrderNER || 
                    result.autoComplaintOrderCompromise || 
                    result.autoComplaintOrder;
          
          if (!data) {
            throw new Error('No order data found in storage');
          }

          console.log('🎯 Retrieved enhanced order data:', data);

          // Use enhanced form filling
          const fillResult = await fillGrievanceForm(data);
          
          // Update toast with results
          const toast = document.querySelector('[style*="background: #4CAF50"]');
          if (fillResult.summary.successful > 0) {
            console.log(`✅ Successfully filled ${fillResult.summary.successful}/${fillResult.summary.total} fields`);
            
            if (toast) {
              toast.style.background = '#4CAF50';
              toast.textContent = `✅ Filled ${fillResult.summary.successful}/${fillResult.summary.total} fields successfully!`;
            }
            
            resolve(fillResult);
          } else {
            console.warn('⚠️ No fields could be auto-filled');
            
            if (toast) {
              toast.style.background = '#FF9800';
              toast.textContent = '⚠️ Could not auto-fill any fields - manual entry required';
            }
            
            resolve(fillResult);
          }
          
        } catch (error) {
          console.error('❌ Enhanced autofill failed:', error);
          
          const toast = document.querySelector('[style*="background: #4CAF50"]');
          if (toast) {
            toast.style.background = '#f44336';
            toast.textContent = '❌ Auto-fill failed - ' + error.message;
          }
          
          reject(error);
        }
      });
    });
  }

  // Listen for messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'fillForm') {
        console.log('📨 Received enhanced fillForm message');
        
        autofillGrievancePortal()
          .then((result) => {
            console.log('✅ Enhanced autofill completed successfully');
            sendResponse({
              success: true, 
              message: `Filled ${result.summary.successful}/${result.summary.total} fields`,
              result: result
            });
          })
          .catch((error) => {
            console.error('❌ Enhanced autofill failed:', error);
            let userMessage = 'Failed to fill form';
            
            if (error.message.includes('No order data')) {
              userMessage = 'No order data found. Please save order details from an e-commerce site first.';
            } else if (error.message.includes('Storage error')) {
              userMessage = 'Storage access failed. Please check extension permissions.';
            }
            
            sendResponse({
              success: false, 
              message: userMessage,
              error: error.message
            });
          });
      }
      
      return true; // Keep message channel open for async response
    });
  }

  // Make fillGrievanceForm available globally for fallback injection
  window.fillGrievanceForm = fillGrievanceForm;
  window.autofillGrievancePortal = autofillGrievancePortal;

  console.log('🎯 Enhanced Consumer Portal Auto-Fill ready - grievance form optimized');
})();
