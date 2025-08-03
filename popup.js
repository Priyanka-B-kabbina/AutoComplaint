const form = document.getElementById('orderForm');
const imageDrop = document.getElementById('imageDrop');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');

let images = [];
const MAX_IMAGES = 3;
const MAX_SIZE_MB = 5;

function populateForm() {
  chrome.storage.local.get([
    'autoComplaintOrderUniversal',
    'autoComplaintOrderOCR',
    'autoComplaintOrderNER',
    'autoComplaintOrderCompromise',
    'autoComplaintOrder'
  ], (result) => {
    let data = result.autoComplaintOrderUniversal || result.autoComplaintOrderOCR || result.autoComplaintOrderNER || result.autoComplaintOrderCompromise || result.autoComplaintOrder;
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

// Image upload handlers
imageDrop.addEventListener('click', () => imageUpload.click());

imageDrop.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageDrop.classList.add('dragover');
});
imageDrop.addEventListener('dragleave', () => imageDrop.classList.remove('dragover'));
imageDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  imageDrop.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});
imageUpload.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(fileList) {
  for (let file of fileList) {
    if (images.length >= MAX_IMAGES) break;
    if (!file.type.startsWith('image/')) continue;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;
    images.push(file);
  }
  renderImagePreview();
}

function renderImagePreview() {
  imagePreview.innerHTML = '';
  images.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'img-thumb';
      div.innerHTML = `<img src="${e.target.result}" alt="evidence"><button data-idx="${idx}" class="delete-img">&times;</button>`;
      imagePreview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

imagePreview.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-img')) {
    const idx = parseInt(e.target.getAttribute('data-idx'));
    images.splice(idx, 1);
    renderImagePreview();
  }
});

// Save data on submit
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {};
  Array.from(form.elements).forEach((el) => {
    if (el.name) data[el.name] = el.value;
  });
  // Store order data and images in local storage (images as base64 for MVP)
  const imagePromises = images.map(file => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  }));
  Promise.all(imagePromises).then((base64Images) => {
    data.images = base64Images;
    chrome.storage.local.set({ autoComplaintOrder: data }, () => {
      alert('Order data saved! Open the consumer portal to auto-fill your complaint.');
      window.close();
    });
  });
}); 

// Enhanced seller name extraction
if (!sellerName) {
  // Look for a line before "Leave seller feedback"
  for (let i = 1; i < lines.length; i++) {
    if (/leave seller feedback/i.test(lines[i])) {
      // The previous line may be the seller name
      const possibleSeller = lines[i - 1].trim();
      // Exclude product name or empty lines
      if (possibleSeller && possibleSeller !== productName && !/earbud|phone|laptop|bluetooth|truly wireless|buds|headphone|watch/i.test(possibleSeller)) {
        sellerName = possibleSeller;
        break;
      }
    }
  }
}

// Utility: Detect site type
function getSiteType(url) {
  if (/consumerhelpline\.gov\.in/i.test(url)) return 'grievance';
  if (/amazon|flipkart|shopify|myntra|ajio|meesho|snapdeal|tatacliq|nykaa|paytm|pharmeasy|bigbasket|grofers|jiomart|reliance|shopmistry/i.test(url)) return 'ecom';
  return 'other';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function showActionButton() {
  const actionSection = document.getElementById('actionSection');
  const form = document.getElementById('orderForm');
  if (!actionSection) return;
  actionSection.innerHTML = '';
  chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    const siteType = getSiteType(url);
    if (siteType === 'ecom') {
      if (form) form.style.display = '';
      const btn = document.createElement('button');
      btn.textContent = 'Save Order Data';
      btn.className = 'main-action-btn';
      btn.onclick = (e) => {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        showToast('Order data saved!');
      };
      actionSection.appendChild(btn);
    } else if (siteType === 'grievance') {
      if (form) form.style.display = 'none';
      const btn = document.createElement('button');
      btn.textContent = 'Fill In';
      btn.className = 'main-action-btn';
      btn.onclick = async (e) => {
        e.preventDefault();
        chrome.tabs.sendMessage(tabs[0].id, { action: 'fill_grievance_form' });
        showToast('Attempting to fill the form...');
      };
      actionSection.appendChild(btn);
    } else {
      if (form) form.style.display = '';
      actionSection.textContent = 'Not a supported site.';
    }
  });
}

document.addEventListener('DOMContentLoaded', showActionButton);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fill_grievance_form') {
    console.log('Received fill_grievance_form message');
    autofillGrievancePortal();
  }
});

async function autofillGrievancePortal() {
  console.log('Autofill triggered');
  // ...rest of your code...
} 