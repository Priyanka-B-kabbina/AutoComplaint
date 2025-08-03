AutoComplaint Chrome Extension
============================

AutoComplaint is a Chrome extension that streamlines the process of filing consumer complaints on the Indian National Consumer Helpline (https://consumerhelpline.gov.in/) by automatically extracting order details from e-commerce sites (like Amazon and Shopmistry) and auto-filling the grievance portal form.

----------------------------

FEATURES
--------
- Order Extraction: Extracts order details (Order ID, Product Name, Brand, Price, Dates, etc.) from supported e-commerce order/invoice pages using DOM parsing, OCR, and NLP.
- Image Upload: Lets users attach up to 3 images (e.g., invoices, product photos) as evidence, with previews.
- Smart Storage: Saves extracted order data and images in Chrome local storage for later use.
- Auto-Fill Grievance Portal: On the consumer portal, fills in the complaint form with a single click, handling Select2 dropdowns, datepickers, and conditional fields.
- Modern Popup UI: Context-aware popup shows "Save Order Data" on e-commerce sites and "Fill In" on the grievance portal, with a clean, modern look and toast notifications.
- Robust Site Detection: Supports Amazon, Shopmistry, and can be extended to other e-commerce platforms.
- No Manual Copy-Paste: Reduces friction and errors in filing complaints.

----------------------------

WORKFLOW
--------
1. On E-commerce Sites (Amazon, Shopmistry, etc.):
   - Navigate to your order details or invoice page.
   - Click the AutoComplaint extension icon.
   - The popup displays a form pre-filled with extracted order details.
   - Review/edit the details, upload up to 3 images if needed.
   - Click SAVE ORDER DATA. Data is stored in Chrome local storage.

2. On the Grievance Portal:
   - Go to https://consumerhelpline.gov.in/ and open the complaint form.
   - Click the AutoComplaint extension icon.
   - The popup shows a FILL IN button (the form is hidden for clarity).
   - Click FILL IN. The extension auto-fills the portal form with your saved order data, including handling Select2 dropdowns, datepickers, and conditional fields.

3. Under the Hood:
   - Content Scripts: 
     - src/amazon.js runs on e-commerce sites, extracting order data using DOM, OCR (Tesseract.js), and image classification (MobileNet).
     - content_scripts/consumer_portal.js runs on the grievance portal, listening for the "Fill In" message and filling the form.
   - Popup UI: 
     - popup.html and popup.js provide a modern, context-aware interface for saving and filling data.
   - Storage: 
     - Uses chrome.storage.local to persist order data and images.
   - Messaging: 
     - Popup sends messages to content scripts to trigger extraction or autofill actions.

----------------------------

FILE STRUCTURE
--------------
AutoComplaint/
  assets/                # Extension icons
  background.js          # (Empty, reserved for future use)
  content_scripts/
    amazon.js            # (Legacy, not used)
    consumer_portal.js   # Autofill logic for grievance portal
  dist/
    amazon.bundle.js     # Webpack bundle for e-commerce extraction
  manifest.json          # Chrome extension manifest (v3)
  package.json           # NPM dependencies and scripts
  popup.css              # Popup UI styles
  popup.html             # Popup UI markup
  popup.js               # Popup UI logic and messaging
  src/
    amazon.js            # Main extraction logic for e-commerce sites
  utils/
    image_compress.js    # (Empty, reserved for future use)
  webpack.config.js      # Webpack build config

----------------------------

INSTALLATION & USAGE
--------------------
1. Clone or Download this repository.
2. Install Dependencies:
   npm install
3. Build the Extension:
   npm run build
   This creates dist/amazon.bundle.js.
4. Load in Chrome:
   - Go to chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked" and select the AutoComplaint directory.
5. Use:
   - Visit an order page on Amazon or Shopmistry, click the extension, review, and save.
   - Visit the grievance portal, click the extension, and click "Fill In".

----------------------------

TECHNOLOGIES USED
-----------------
- JavaScript (ES6+)
- Chrome Extensions API (Manifest v3)
- Tesseract.js (OCR for extracting text from images/screenshots)
- TensorFlow.js + MobileNet (Image classification for product category)
- Compromise NLP (Natural language processing for entity extraction)
- html2canvas (Screenshotting DOM sections for OCR)
- Webpack (Bundling scripts)
- Select2, jQuery (Handled in the portal for autofill)

----------------------------

PERMISSIONS
-----------
- activeTab, storage, scripting
- Host permissions for amazon.in and consumerhelpline.gov.in

----------------------------

KNOWN LIMITATIONS
-----------------
- Only supports Amazon, Shopmistry, and similar sites (regex-based detection).
- Extraction accuracy depends on page structure and OCR quality.
- Only works on the Indian National Consumer Helpline portal.
- Image compression is not yet implemented.

----------------------------

10 THINGS TO IMPROVE
--------------------
1. Add More E-commerce Sites: Extend extraction logic and site detection for Flipkart, Myntra, Ajio, etc.
2. Robust Image Compression: Implement image compression in utils/image_compress.js to reduce upload size.
3. Background Script Enhancements: Use background.js for advanced features like notifications, analytics, or persistent messaging.
4. Error Handling & User Feedback: Show clear error messages if extraction or autofill fails, and guide the user to fix issues.
5. Field Mapping UI: Let users map extracted fields to portal fields if auto-mapping fails.
6. Multi-Order Support: Allow saving and managing multiple orders, not just the latest one.
7. Cloud Sync: Optionally sync saved orders/images to the cloud for backup and multi-device use.
8. Accessibility Improvements: Ensure the popup and autofill logic are accessible (ARIA, keyboard navigation, color contrast).
9. Internationalization (i18n): Support other languages and consumer portals.
10. Automated Testing: Add unit and integration tests for extraction, storage, and autofill logic.

----------------------------

CONTRIBUTING
------------
Pull requests and suggestions are welcome! Please open an issue for bugs or feature requests.

----------------------------

LICENSE
-------
MIT 