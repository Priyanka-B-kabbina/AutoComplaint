// ==UserScript==
// Auto-fill grievance portal form with extracted order details
// ==/UserScript==

(function() {
  // Utility: Wait for an element to appear (resolves with null on timeout)
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      function check() {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) {
          console.warn('Timeout waiting for', selector);
          return resolve(null); // resolve with null instead of rejecting
        }
        setTimeout(check, 100);
      }
      check();
    });
  }

  // Utility: Set dropdown (select) by best match (case-insensitive, partial match fallback)
  function setDropdown(selector, value) {
    const select = document.querySelector(selector);
    if (!select) return;
    let found = false;
    // Try exact match first
    for (const option of select.options) {
      if (option.text.trim().toLowerCase() === value.trim().toLowerCase()) {
        select.value = option.value;
        found = true;
        break;
      }
    }
    // Try partial match
    if (!found) {
      for (const option of select.options) {
        if (option.text.toLowerCase().includes(value.trim().toLowerCase())) {
          select.value = option.value;
          found = true;
          break;
        }
      }
    }
    // If not found, optionally add as new option (if allowed)
    if (!found) {
      const newOption = new Option(value, value, true, true);
      select.add(newOption);
      select.value = value;
    }
    // Trigger change event
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Utility: Set date field (input[type="date"] or text)
  function setDateField(selector, dateStr) {
    const input = document.querySelector(selector);
    if (!input) return;
    input.value = dateStr;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Utility: Set text field
  function setTextField(selector, value) {
    const input = document.querySelector(selector);
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Main autofill logic (vanilla JS)
  async function autofillGrievancePortal() {
    console.log('Autofill triggered on grievance portal (vanilla JS)');
    // Show a toast in the page (if possible)
    try {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = 'Form autofill triggered!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2200);
    } catch (e) {}
    // Get extracted order data from chrome.storage
    chrome.storage.local.get([
      'autoComplaintOrderUniversal',
      'autoComplaintOrderOCR',
      'autoComplaintOrderNER',
      'autoComplaintOrderCompromise',
      'autoComplaintOrder'
    ], async (result) => {
      let data = result.autoComplaintOrderUniversal || result.autoComplaintOrderOCR || result.autoComplaintOrderNER || result.autoComplaintOrderCompromise || result.autoComplaintOrder;
      if (!data) return;
      // Map extracted fields to portal selectors (update these as needed)
      // Grievance Type
      setDropdown('#grievanceType', 'Grievance');
      // Grievance Classification
      if (data.productName || data.productCategory) {
        setDropdown('#grievanceClassification', 'Goods');
      } else {
        setDropdown('#grievanceClassification', 'Services');
      }
      // State and City (best match)
      if (data.state) setDropdown('#state', data.state);
      if (data.purchaseCity) setDropdown('#purchaseCity', data.purchaseCity);
      // Sector/Industry
      if (data.detectedSite && /amazon|flipkart|shopify|myntra|ajio|meesho|snapdeal|tatacliq|nykaa|paytm|pharmeasy|bigbasket|grofers|jiomart|reliance/i.test(data.detectedSite)) {
        setDropdown('#sectorIndustry', 'E-Commerce');
      } else if (data.brand) {
        setDropdown('#sectorIndustry', 'Others');
        // Wait for textbox to appear and fill brand
        waitForElement('#brandName').then((el) => {
          if (el) setTextField('#brandName', data.brand);
          else console.warn('#brandName not found, skipping...');
        });
      }
      // Order ID, Product Name, etc.
      if (data.orderId) setTextField('#orderId', data.orderId);
      if (data.productName) setTextField('#productName', data.productName);
      if (data.brand) setTextField('#brand', data.brand);
      if (data.productCategory) setTextField('#productCategory', data.productCategory);
      if (data.price) setTextField('#price', data.price);
      if (data.orderDate) setDateField('#orderDate', data.orderDate);
      if (data.deliveryDate) setDateField('#deliveryDate', data.deliveryDate);
      if (data.sellerName) setTextField('#sellerName', data.sellerName);
      if (data.trackingNumber) setTextField('#trackingNumber', data.trackingNumber);
      if (data.orderDetailsPageUrl) setTextField('#orderDetailsPageUrl', data.orderDetailsPageUrl);
      // Handle conditional fields (e.g., company)
      if (data.company) {
        setDropdown('#company', data.company);
      }
      // If company is blank, clear the field
      if (!data.company) {
        const company = document.querySelector('#company');
        if (company) company.value = '';
      }
    });
  }

  // Listen for message from popup to trigger autofill
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'fill_grievance_form') {
      autofillGrievancePortal().then(() => {
        sendResponse({status: 'done'});
      });
      // Return true to indicate async response
      return true;
    }
  });
})(); 