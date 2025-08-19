# 🔧 DistilBERT MNLI Classifier Troubleshooting Guide

## ❌ Error: "DistilBERTMNLIClassifier is not defined"

### 🔍 **Cause**
This error occurs when the DistilBERT MNLI classifier JavaScript file is not properly loaded or accessible to the test page.

### 🛠️ **Solution Steps**

#### **Step 1: Verify File Structure**
Ensure your files are organized correctly:
```
AutoComplaint/
├── distilbert-test.html          # Test page
└── src/
    └── distilbert-mnli-classifier.js   # Classifier implementation
```

#### **Step 2: Use HTTP Server (Required)**
The test page **must** be served via HTTP(S), not opened as a local file (`file://`). This is because:
- ES6 modules require CORS headers
- @xenova/transformers needs proper module loading

**Start HTTP Server:**
```bash
cd /path/to/AutoComplaint
python3 -m http.server 8000
```

**Then open:** `http://localhost:8000/distilbert-test.html`

#### **Step 3: Check Browser Console**
Open browser Developer Tools (F12) and check for errors:

**Common Errors & Solutions:**

1. **"Failed to load module script"**
   - Solution: Use HTTP server, not file:// protocol

2. **"CORS policy blocking"**
   - Solution: Serve files from HTTP server

3. **"Pipeline function not available"**
   - Solution: Wait for transformers library to load

4. **"Network error loading transformers"**
   - Solution: Check internet connection

#### **Step 4: Verify Dependencies Load Order**
The test page loads dependencies in this order:
1. `@xenova/transformers` (ES6 module)
2. `distilbert-mnli-classifier.js` (regular script)
3. Test functions

### 🧪 **Testing Steps**

1. **Open test page via HTTP server**
2. **Check Model Information section** - should show loading status
3. **Open browser console** - check for error messages
4. **Try "Test Custom Text"** - should load model and classify

### 📊 **Expected Behavior**

**When working correctly:**
1. Page loads with "Ready to load DistilBERT MNLI model"
2. Clicking "Classify with DistilBERT MNLI" shows "Loading model..."
3. Model loads (may take 30-60 seconds first time)
4. Classification results appear with confidence scores

**Model Information section should show:**
- Model: DistilBERT MNLI Classifier
- Type: zero-shot-classification  
- Loaded: ✅
- Cache Size: X entries

### 🚨 **Quick Fixes**

#### **Fix 1: Ensure HTTP Server**
```bash
# Kill any existing server
pkill -f "python.*http.server"

# Start new server
cd /Users/Kabbinapriyanka/Documents/AutoComplaint
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/distilbert-test.html
```

#### **Fix 2: Check File Permissions**
```bash
# Ensure files are readable
chmod 644 distilbert-test.html
chmod 644 src/distilbert-mnli-classifier.js
```

#### **Fix 3: Clear Browser Cache**
- Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private mode

### 🔬 **Advanced Debugging**

#### **Check if Classifier Loads**
Add to browser console:
```javascript
// Check if class is defined
console.log('DistilBERTMNLIClassifier:', typeof DistilBERTMNLIClassifier);

// Check if pipeline is available
console.log('Pipeline:', typeof window.pipeline);

// Try creating instance
try {
  const classifier = new DistilBERTMNLIClassifier();
  console.log('Classifier created successfully:', classifier);
} catch (error) {
  console.error('Failed to create classifier:', error);
}
```

#### **Manual Model Test**
```javascript
// Test pipeline directly
async function testPipeline() {
  if (typeof window.pipeline === 'undefined') {
    console.error('Pipeline not available');
    return;
  }
  
  try {
    const classifier = await window.pipeline('zero-shot-classification', 'facebook/bart-large-mnli');
    const result = await classifier('This is a test order', ['order page', 'non-order page']);
    console.log('Pipeline test result:', result);
  } catch (error) {
    console.error('Pipeline test failed:', error);
  }
}

testPipeline();
```

### 🌐 **Network Requirements**

The test page requires internet access to download:
- `@xenova/transformers` library (~2MB)
- DistilBERT MNLI model (~270MB, cached after first download)

**First load may take 1-3 minutes** depending on internet speed.

### ✅ **Verification Checklist**

- [ ] Files served via HTTP (not file://)
- [ ] Browser console shows no errors
- [ ] Internet connection available
- [ ] JavaScript enabled in browser
- [ ] Developer tools show successful resource loading
- [ ] Model Information section shows ready status

### 🆘 **Still Having Issues?**

1. **Check browser compatibility** - Use Chrome, Firefox, or Safari (latest versions)
2. **Try different network** - Some networks block CDN resources
3. **Clear all cache** - Browser cache, DNS cache
4. **Disable extensions** - Some browser extensions interfere with ML libraries
5. **Check system resources** - Ensure sufficient RAM (4GB+ recommended)

---

**Last Updated:** January 2025  
**Compatible Browsers:** Chrome 90+, Firefox 88+, Safari 14+  
**Model Size:** ~270MB (cached locally after first download)
