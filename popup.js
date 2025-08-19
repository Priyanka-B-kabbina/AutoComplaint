document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup DOM loaded');
  initializeTabs();
  await setupButtons();
  await loadSavedData();
});

// Initialize tab functionality
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const content = document.getElementById(`${tab.dataset.tab}-tab`);
      if (content) {
        content.classList.add('active');
      }
    });
  });
}

// Load saved data from storage
async function loadSavedData() {
  try {
    const result = await chrome.storage.local.get([
      'autoComplaintOrderUniversal',
      'autoComplaintOrder'
    ]);
    
    console.log('Storage result:', result);
    
    const data = result.autoComplaintOrder || result.autoComplaintOrderUniversal;
    if (data) {
      console.log('Found data:', data);
      fillFormWithSavedData(data);
    } else {
      console.log('No data found in storage');
    }
  } catch (error) {
    console.error('Error loading saved data:', error);
  }
}

// Fill form with saved data
function fillFormWithSavedData(data) {
  const form = document.getElementById('orderForm');
  if (!form) return;
  
  console.log('Filling form with data:', data);
  
  // Map ML keys to form field names
  const mapping = {
    orderId: 'orderId',
    productName: 'productName',
    productValue: 'price',
    sellerName: 'company',
    location: 'dealerInfo',
    orderDate: 'orderDate',
    deliveryDate: 'deliveryDate',
    productCategory: 'category',
    // Add more mappings as needed
  };

  Object.entries(mapping).forEach(([mlKey, formKey]) => {
    if (data[mlKey]) {
      const input = form.elements[formKey] || document.getElementById(formKey);
      if (input) {
        input.value = data[mlKey];
        console.log(`Set ${formKey} from ${mlKey}: ${data[mlKey]}`);
      }
    }
  });

  // Fallback: fill any direct matches not already set
  Object.entries(data).forEach(([key, value]) => {
    const input = form.elements[key] || document.getElementById(key);
    if (input && value && !input.value) {
      input.value = value;
      console.log(`Set ${key}: ${value}`);
    }
  });
}

// Setup page-specific buttons
async function setupButtons() {
  const saveOrderBtn = document.getElementById('saveOrderBtn');
  const fillInBtn = document.getElementById('fillInBtn');
  
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const currentUrl = tabs[0].url;
    
    const isEcommerceSite = /amazon\.|flipkart\.|myntra\.|paytm\.|snapdeal\.|shopclues\.|meesho\.|ajio\.|nykaa\.|tatacliq\.|bigbasket\.|grofers\./i.test(currentUrl);
    const isGrievancePortal = /consumerhelpline\.gov\.in|consumer\.nic\.in|edca\.gov\.in/i.test(currentUrl);
    const isTestPage = /test\.html/i.test(currentUrl) || currentUrl.includes('diagnostic.html');
    
    if (isEcommerceSite && saveOrderBtn) {
      saveOrderBtn.style.display = 'inline-block';
      if (fillInBtn) fillInBtn.style.display = 'none';
      saveOrderBtn.addEventListener('click', handleSaveOrder);
    } else if ((isGrievancePortal || isTestPage) && fillInBtn) {
      if (saveOrderBtn) saveOrderBtn.style.display = 'none';
      fillInBtn.style.display = 'inline-block';
      fillInBtn.addEventListener('click', handleFillIn);
    } else {
      showGuidance();
    }
  } catch (error) {
    console.error('Error setting up buttons:', error);
    showGuidance();
  }
}

// Handle save order button click
async function handleSaveOrder() {
  try {
    const form = document.getElementById('orderForm');
    if (!form) throw new Error('Form not found');
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    await chrome.storage.local.set({ autoComplaintOrder: data });
    showToast('Order details saved successfully!');
  } catch (error) {
    console.error('Error saving order:', error);
    showToast('Error saving order details', 'error');
  }
}

// Handle fill in button click
async function handleFillIn() {
  const fillInBtn = document.getElementById('fillInBtn');
  if (!fillInBtn) return;
  
  try {
    fillInBtn.disabled = true;
    fillInBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Filling...';
    
    const form = document.getElementById('orderForm');
    if (!form) throw new Error('Form not found');
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    await chrome.storage.local.set({ autoComplaintOrder: data });
    
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    await chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fillGrievanceForm',
      data: data
    });
    
    showToast('Filling grievance form...');
  } catch (error) {
    console.error('Error filling form:', error);
    showToast('Error filling form. Please try again.', 'error');
  } finally {
    fillInBtn.disabled = false;
    fillInBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Fill Grievance Form';
  }
}

// Show guidance for unsupported pages
function showGuidance() {
  const container = document.querySelector('.container');
  const actionButtons = document.querySelector('.action-buttons');
  
  if (actionButtons) {
    actionButtons.style.display = 'none';
  }
  
  if (container) {
    const guidance = document.createElement('div');
    guidance.className = 'guidance';
    guidance.innerHTML = `
      <p class="guidance-text">
        <i class="fa-solid fa-info-circle"></i>
        To use AutoComplaint:
        <ol>
          <li>Go to your e-commerce order page</li>
          <li>Save the order details</li>
          <li>Go to the consumer grievance portal</li>
          <li>Click "Fill Grievance Form"</li>
        </ol>
      </p>
    `;
    container.appendChild(guidance);
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

