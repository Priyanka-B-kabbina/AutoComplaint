AutoComplaint Chrome Extension
============================

AutoComplaint is a Chrome extension that streamlines the process of filing consumer complaints on the Indian National Consumer Helpline (https://consumerhelpline.gov.in/) by automatically extracting order details from e-commerce sites (like Amazon and Shopmistry) and auto-filling the grievance portal form.

----------------------------

FEATURES
--------
- ML-Based Order Extraction: Uses machine learning models (DistilBERT MNLI zero-shot classification) to intelligently extract order details from e-commerce pages without rule-based fallbacks.
- Order Page Classification: DistilBERT MNLI classifies page content to identify order/invoice pages with high accuracy across different e-commerce platforms.
- Image Upload: Lets users attach up to 3 images (e.g., invoices, product photos) as evidence, with previews.
- Smart Storage: Saves extracted order data and images in Chrome local storage for later use.
- Auto-Fill Grievance Portal: On the consumer portal, fills in the complaint form with a single click, handling Select2 dropdowns, datepickers, and conditional fields.
- Modern Popup UI: Context-aware popup shows "Save Order Data" on e-commerce sites and "Fill In" on the grievance portal, with a clean, modern look and toast notifications.
- Extensible ML Architecture: Supports custom model training via the integrated training suite for improved extraction accuracy.
- No Manual Copy-Paste: Reduces friction and errors in filing complaints through intelligent automation.

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
   - ML-Based Architecture:
     - Uses DistilBERT MNLI (from @xenova/transformers) for zero-shot classification of order pages.
     - Vocabulary-based tokenization for consistent ML model input processing.
     - No rule-based or fallback logic - purely machine learning driven extraction.
   - Content Scripts: 
     - src/amazon.js runs on e-commerce sites, using ML models for order page classification and data extraction.
     - content_scripts/consumer_portal.js runs on the grievance portal, listening for the "Fill In" message and filling the form.
   - Training Suite:
     - Integrated training suite for custom model development and fine-tuning.
     - Support for custom ecommerce data training and NER-based extraction (future).
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
    amazon.js            # Main ML-based extraction logic for e-commerce sites
    distilbert-mnli-classifier.js  # DistilBERT MNLI zero-shot classifier
  training-suite/        # ML model training and development
    src/
      classifier.js      # Custom model training logic
    models/
      order-classifier/  # Order classification models and exports
  utils/
    image_compress.js    # (Empty, reserved for future use)
  webpack.config.js      # Webpack build config
  distilbert-test.html   # Test interface for DistilBERT MNLI classifier

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
- Machine Learning:
  - @xenova/transformers (DistilBERT MNLI zero-shot classification)
  - Vocabulary-based tokenization for ML model consistency
  - Custom training suite for model development
- Legacy Technologies (being phased out):
  - Tesseract.js (OCR for extracting text from images/screenshots)
  - TensorFlow.js + MobileNet (Image classification for product category)
  - Compromise NLP (Natural language processing for entity extraction)
- Utility Libraries:
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
- ML model loading time may cause initial delay on first use (models are cached after first load).
- Extraction accuracy depends on ML model training and page content structure.
- Currently optimized for English language content and Indian e-commerce sites.
- Only works on the Indian National Consumer Helpline portal.
- Requires internet connection for initial model downloads.

----------------------------

10 THINGS TO IMPROVE
--------------------
1. NER-Based Extraction: Implement Named Entity Recognition (NER) for more precise order detail extraction (Order ID, Product Name, Price, etc.).
2. Custom Model Training: Use the training suite to train custom models on specific ecommerce site data for improved accuracy.
3. Multi-Language Support: Extend ML models to support regional languages and international e-commerce platforms.
4. Advanced ML Pipeline: Implement model ensemble techniques and confidence scoring for extraction results.
5. Robust Image Compression: Implement image compression in utils/image_compress.js to reduce upload size.
6. Background Script Enhancements: Use background.js for model caching, pre-loading, and performance optimization.
7. Error Handling & User Feedback: Show clear error messages if ML extraction or autofill fails, with fallback guidance.
8. Field Mapping UI: Let users correct ML extraction results and map fields if auto-mapping fails.
9. Multi-Order Support: Allow saving and managing multiple orders with ML-based deduplication.
10. Performance Optimization: Implement model quantization, worker threads, and progressive loading for better performance.

----------------------------

CONTRIBUTING
------------
Pull requests and suggestions are welcome! Please open an issue for bugs or feature requests.

----------------------------

LICENSE
-------
MIT 